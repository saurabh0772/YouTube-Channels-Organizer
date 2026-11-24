import { Env, Channel } from '../../utils/types';
import { jsonResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../utils/auth';

// PATCH /api/channels/:id - Rename channel
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const channelId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!channelId) {
    return errorResponse('Channel ID is required', 400);
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const name = (body.name || '').trim();
  if (!name) {
    return errorResponse('Channel name cannot be empty', 400);
  }

  const now = new Date().toISOString();

  try {
    const result = await env.DB.prepare(
      'UPDATE channels SET name = ?, updated_at = ? WHERE id = ?'
    )
      .bind(name, now, channelId)
      .run();

    if (result.meta.changes === 0) {
      return errorResponse('Channel not found', 404);
    }

    const updated = await env.DB.prepare(
      'SELECT c.*, COUNT(v.id) AS video_count FROM channels c LEFT JOIN videos v ON c.id = v.channel_id WHERE c.id = ? GROUP BY c.id'
    )
      .bind(channelId)
      .first<Channel>();

    return jsonResponse({ success: true, channel: updated });
  } catch (err: any) {
    console.error('Error updating channel:', err);
    return errorResponse('Failed to update channel', 500, err.message);
  }
};

// DELETE /api/channels/:id - Delete channel and its videos
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const channelId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!channelId) {
    return errorResponse('Channel ID is required', 400);
  }

  try {
    // Delete videos first (to respect foreign key if cascades are disabled in SQLite instance)
    await env.DB.prepare('DELETE FROM videos WHERE channel_id = ?').bind(channelId).run();
    const result = await env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(channelId).run();

    if (result.meta.changes === 0) {
      return errorResponse('Channel not found', 404);
    }

    return jsonResponse({ success: true, message: 'Channel deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting channel:', err);
    return errorResponse('Failed to delete channel', 500, err.message);
  }
};

