import { Env, Channel, Video } from '../utils/types';
import { jsonResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../utils/auth';

// GET /api/export - Export full backup of channels and videos
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  try {
    const channelsRes = await env.DB.prepare('SELECT * FROM channels ORDER BY created_at ASC').all<Channel>();
    const videosRes = await env.DB.prepare('SELECT * FROM videos ORDER BY channel_id ASC, video_number ASC').all<Video>();

    const backup = {
      app: 'YouTube Content HQ',
      version: 1,
      exported_at: new Date().toISOString(),
      channels: channelsRes.results || [],
      videos: videosRes.results || [],
    };

    return jsonResponse({
      success: true,
      backup,
    });
  } catch (err: any) {
    console.error('Export error:', err);
    return errorResponse('Failed to export backup data', 500, err.message);
  }
};

