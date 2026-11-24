import { Env } from '../../utils/types';
import { jsonResponse } from '../../utils/response';
import { createClearSessionCookie, getCookie } from '../../utils/auth';
import { sha256Hex } from '../../utils/crypto';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const token = getCookie(request, 'hq_session');
  if (token && env.DB) {
    try {
      const tokenHash = await sha256Hex(token);
      await env.DB.prepare(
        'UPDATE sessions SET revoked_at = datetime("now") WHERE token_hash = ?'
      )
        .bind(tokenHash)
        .run();
    } catch (err) {
      console.error('Logout revocation error:', err);
    }
  }

  const clearCookieHeader = createClearSessionCookie();
  return jsonResponse(
    { success: true, message: 'Logged out successfully' },
    200,
    { 'Set-Cookie': clearCookieHeader }
  );
};

