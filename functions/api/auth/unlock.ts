import { Env } from '../../utils/types';
import { jsonResponse, errorResponse } from '../../utils/response';
import { constantTimeCompare, generateRandomToken, sha256Hex } from '../../utils/crypto';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, createSessionCookie, getClientIP } from '../../utils/auth';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.DB) {
    return errorResponse('Database binding (DB) is missing. Check wrangler.toml or Cloudflare dashboard binding.', 500);
  }

  const clientIP = getClientIP(request);

  // 1. Check rate limiting
  const rateLimitStatus = await checkRateLimit(env, clientIP);
  if (!rateLimitStatus.allowed) {
    return errorResponse(
      `Too many failed attempts. Device temporarily locked. Please wait ${rateLimitStatus.waitMinutes} minute(s).`,
      429
    );
  }

  // 2. Parse request body
  let body: { passcode?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const enteredPasscode = (body.passcode || '').trim();
  if (!enteredPasscode) {
    return errorResponse('Passcode is required', 400);
  }

  // 3. Validate passcode
  // AUTH_PASSCODE can be set via Cloudflare secret or wrangler.toml.
  // In local test environments without secret set, defaults to 'admin123' with clear guidance.
  const configuredPasscode = (env.AUTH_PASSCODE || 'admin123').trim();

  const isValid = constantTimeCompare(enteredPasscode, configuredPasscode);

  if (!isValid) {
    const failureResult = await recordFailedAttempt(env, clientIP);
    if (failureResult.locked) {
      return errorResponse(
        `Incorrect passcode. Too many failed attempts. Device locked for ${failureResult.waitMinutes} minutes.`,
        429
      );
    }
    return errorResponse('Incorrect passcode. Please try again.', 401);
  }

  // 4. Reset rate limits on successful authentication
  await resetRateLimit(env, clientIP);

  // 5. Generate secure session token and hash
  const rawToken = generateRandomToken(32);
  const tokenHash = await sha256Hex(rawToken);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  try {
    // Ensure sessions table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked_at TEXT
      )
    `).run();

    await env.DB.prepare(
      'INSERT INTO sessions (token_hash, created_at, expires_at, revoked_at) VALUES (?, ?, ?, NULL)'
    )
      .bind(tokenHash, now.toISOString(), expiresAt)
      .run();
  } catch (err: any) {
    console.error('Session persistence error:', err);
    return errorResponse('Failed to create session in database', 500, err.message);
  }

  // 6. Return response with HttpOnly cookie
  const cookieHeader = createSessionCookie(rawToken);
  return jsonResponse(
    {
      success: true,
      message: 'Access granted. Device authorized.',
      expiresAt,
    },
    200,
    { 'Set-Cookie': cookieHeader }
  );
};

