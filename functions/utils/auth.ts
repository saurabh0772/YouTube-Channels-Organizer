import { Env } from './types';
import { sha256Hex } from './crypto';

const SESSION_COOKIE_NAME = 'hq_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days for authorized personal devices

// Parse cookies from Request
export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [k, v] = cookie.trim().split('=');
    if (k === name) {
      return decodeURIComponent(v || '');
    }
  }
  return null;
}

// Create HttpOnly, Secure, SameSite=Lax cookie header
export function createSessionCookie(token: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  // Use Lax for seamless multi-device usage while protecting against CSRF
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function createClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// Verify session from Request and D1 database
export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ authenticated: boolean; tokenHash?: string; error?: string }> {
  // Optional bypass check if no passcode is configured AND we are in local dev test mode
  // But default requires AUTH_PASSCODE.
  const token = getCookie(request, SESSION_COOKIE_NAME);
  if (!token) {
    return { authenticated: false, error: 'Unauthorized: No active session' };
  }

  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();

  try {
    const session = await env.DB.prepare(
      'SELECT token_hash, expires_at, revoked_at FROM sessions WHERE token_hash = ? AND revoked_at IS NULL'
    )
      .bind(tokenHash)
      .first<{ token_hash: string; expires_at: string; revoked_at: string | null }>();

    if (!session) {
      return { authenticated: false, error: 'Unauthorized: Session not found' };
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      return { authenticated: false, error: 'Unauthorized: Session expired' };
    }

    return { authenticated: true, tokenHash };
  } catch (err: any) {
    console.error('Session verification query error:', err);
    return { authenticated: false, error: 'Internal verification error' };
  }
}

// Client IP extractor for Cloudflare Pages / Workers
export function getClientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// Rate limit check for unlock endpoint (max 5 failed attempts per 15 min window)
export async function checkRateLimit(
  env: Env,
  ip: string
): Promise<{ allowed: boolean; waitMinutes?: number }> {
  const now = new Date();
  const key = `auth_${ip}`;

  try {
    const record = await env.DB.prepare(
      'SELECT key, attempts, last_attempt_at, locked_until FROM rate_limits WHERE key = ?'
    )
      .bind(key)
      .first<{ key: string; attempts: number; last_attempt_at: string; locked_until: string | null }>();

    if (record && record.locked_until) {
      const lockedUntilDate = new Date(record.locked_until);
      if (lockedUntilDate > now) {
        const waitMinutes = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / (60 * 1000));
        return { allowed: false, waitMinutes };
      }
    }
  } catch (err) {
    console.error('Rate limit read error:', err);
  }

  return { allowed: true };
}

export async function recordFailedAttempt(env: Env, ip: string): Promise<{ locked: boolean; waitMinutes?: number }> {
  const now = new Date();
  const key = `auth_${ip}`;
  const maxAttempts = 5;
  const lockWindowMinutes = 15;

  try {
    const record = await env.DB.prepare(
      'SELECT key, attempts, last_attempt_at, locked_until FROM rate_limits WHERE key = ?'
    )
      .bind(key)
      .first<{ key: string; attempts: number; last_attempt_at: string; locked_until: string | null }>();

    let attempts = (record?.attempts || 0) + 1;
    let lockedUntil: string | null = null;

    if (attempts >= maxAttempts) {
      const lockUntilDate = new Date(now.getTime() + lockWindowMinutes * 60 * 1000);
      lockedUntil = lockUntilDate.toISOString();
      await env.DB.prepare(
        'INSERT INTO rate_limits (key, attempts, last_attempt_at, locked_until) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET attempts = ?, last_attempt_at = ?, locked_until = ?'
      )
        .bind(key, attempts, now.toISOString(), lockedUntil, attempts, now.toISOString(), lockedUntil)
        .run();

      return { locked: true, waitMinutes: lockWindowMinutes };
    } else {
      await env.DB.prepare(
        'INSERT INTO rate_limits (key, attempts, last_attempt_at, locked_until) VALUES (?, ?, ?, NULL) ON CONFLICT(key) DO UPDATE SET attempts = ?, last_attempt_at = ?, locked_until = NULL'
      )
        .bind(key, attempts, now.toISOString(), attempts, now.toISOString())
        .run();

      return { locked: false };
    }
  } catch (err) {
    console.error('Rate limit record error:', err);
    return { locked: false };
  }
}

export async function resetRateLimit(env: Env, ip: string): Promise<void> {
  const key = `auth_${ip}`;
  try {
    await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?').bind(key).run();
  } catch (err) {
    console.error('Rate limit reset error:', err);
  }
}

