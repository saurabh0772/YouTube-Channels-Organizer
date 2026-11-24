import { Env, Video } from '../../utils/types';
import { jsonResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../utils/auth';

// GET /api/videos/:id - Fetch single video details
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const videoId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!videoId) {
    return errorResponse('Video ID is required', 400);
  }

  try {
    const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?')
      .bind(videoId)
      .first<Video>();

    if (!video) {
      return errorResponse('Video not found', 404);
    }

    return jsonResponse({ success: true, video });
  } catch (err: any) {
    console.error('Error fetching video:', err);
    return errorResponse('Failed to fetch video', 500, err.message);
  }
};

// PATCH /api/videos/:id - Update video metadata
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const videoId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!videoId) {
    return errorResponse('Video ID is required', 400);
  }

  let body: Partial<{
    name: string;
    video_drive_url: string;
    title: string;
    description: string;
    tags: string;
    thumbnail_drive_url: string;
    upload_status: 'Draft' | 'Ready' | 'Scheduled' | 'Published';
  }>;

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  try {
    const existing = await env.DB.prepare('SELECT * FROM videos WHERE id = ?')
      .bind(videoId)
      .first<Video>();

    if (!existing) {
      return errorResponse('Video not found', 404);
    }

    const name = body.name !== undefined ? body.name.trim() : existing.name;
    if (!name) {
      return errorResponse('Video name cannot be empty', 400);
    }

    const videoDriveUrl = body.video_drive_url !== undefined ? body.video_drive_url.trim() : existing.video_drive_url;
    const title = body.title !== undefined ? body.title.trim() : existing.title;
    const description = body.description !== undefined ? body.description : existing.description;
    const tags = body.tags !== undefined ? body.tags.trim() : existing.tags;
    const thumbnailDriveUrl = body.thumbnail_drive_url !== undefined ? body.thumbnail_drive_url.trim() : existing.thumbnail_drive_url;

    const validStatuses = ['Draft', 'Ready', 'Scheduled', 'Published'];
    const uploadStatus = body.upload_status && validStatuses.includes(body.upload_status)
      ? body.upload_status
      : existing.upload_status;

    const now = new Date().toISOString();

    // Preserve channel_id, video_number, and created_at!
    await env.DB.prepare(`
      UPDATE videos SET 
        name = ?,
        video_drive_url = ?,
        title = ?,
        description = ?,
        tags = ?,
        thumbnail_drive_url = ?,
        upload_status = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      name,
      videoDriveUrl,
      title,
      description,
      tags,
      thumbnailDriveUrl,
      uploadStatus,
      now,
      videoId
    ).run();

    const updated = await env.DB.prepare('SELECT * FROM videos WHERE id = ?')
      .bind(videoId)
      .first<Video>();

    return jsonResponse({ success: true, video: updated });
  } catch (err: any) {
    console.error('Error updating video:', err);
    return errorResponse('Failed to update video', 500, err.message);
  }
};

// DELETE /api/videos/:id - Delete video
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const videoId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!videoId) {
    return errorResponse('Video ID is required', 400);
  }

  try {
    const result = await env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(videoId).run();

    if (result.meta.changes === 0) {
      return errorResponse('Video not found', 404);
    }

    return jsonResponse({ success: true, message: 'Video deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting video:', err);
    return errorResponse('Failed to delete video', 500, err.message);
  }
};

