import { Env } from '../../utils/types';
import { jsonResponse } from '../../utils/response';
import { requireAuth } from '../../utils/auth';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.DB) {
    return jsonResponse({
      authenticated: false,
      configured: false,
      error: 'Database not bound',
    });
  }

  const auth = await requireAuth(request, env);

  const isDefaultPasscode = !env.AUTH_PASSCODE || env.AUTH_PASSCODE === 'admin123';

  return jsonResponse({
    authenticated: auth.authenticated,
    configured: true,
    isDefaultPasscode,
  });
};

