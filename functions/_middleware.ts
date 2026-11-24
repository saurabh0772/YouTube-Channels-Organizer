import { Env } from './utils/types';
import { jsonResponse } from './utils/response';

// Cloudflare Pages middleware for security headers, CORS, and CSRF protection
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next } = context;

  // Handle preflight OPTIONS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Same-origin / CSRF verification for state-changing requests
  if (['POST', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('Origin');
    const host = request.headers.get('Host');
    const secFetchSite = request.headers.get('Sec-Fetch-Site');

    // If Sec-Fetch-Site is present, cross-site requests are rejected
    if (secFetchSite && secFetchSite === 'cross-site') {
      return jsonResponse({ success: false, error: 'Forbidden: Cross-site request rejected' }, 403);
    }

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        // Allow localhost and exact host match
        if (originUrl.host !== host && !originUrl.host.includes('localhost') && !originUrl.host.includes('127.0.0.1')) {
          return jsonResponse({ success: false, error: 'Forbidden: Invalid request origin' }, 403);
        }
      } catch {
        return jsonResponse({ success: false, error: 'Forbidden: Malformed origin' }, 403);
      }
    }
  }

  // Execute the request handler
  const response = await next();

  // Clone response to add security headers if not already present
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'DENY');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
};

