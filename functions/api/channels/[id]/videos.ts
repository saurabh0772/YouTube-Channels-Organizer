import { Env, Video, Channel } from '../../../utils/types';
import { jsonResponse, errorResponse } from '../../../utils/response';
import { requireAuth } from '../../../utils/auth';

// GET /api/channels/:id/videos - List videos in channel with search and sort
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const channelId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!channelId) {
    return errorResponse('Channel ID is required', 400);
  }

  const url = new URL(request.url);
  const search = (url.searchParams.get('search') || '').trim();
  const sort = (url.searchParams.get('sort') || 'newest').toLowerCase();

  // Validate channel existence
  const channel = await env.DB.prepare('SELECT id, name FROM channels WHERE id = ?')
    .bind(channelId)
    .first<Channel>();

  if (!channel) {
    return errorResponse('Channel not found', 404);
  }

  // Determine ORDER BY clause
  let orderByClause = 'created_at DESC';
  if (sort === 'oldest') {
    orderByClause = 'created_at ASC';
  } else if (sort === 'updated') {
    orderByClause = 'updated_at DESC';
  } else if (sort === 'number_desc') {
    orderByClause = 'video_number DESC';
  } else if (sort === 'number_asc') {
    orderByClause = 'video_number ASC';
  }

  try {
    let query: string;
    let bindings: any[];

    if (search) {
      const searchPattern = `%${search}%`;
      query = `
        SELECT * FROM videos 
        WHERE channel_id = ? 
          AND (name LIKE ? OR title LIKE ? OR CAST(video_number AS TEXT) LIKE ? OR tags LIKE ?)
        ORDER BY ${orderByClause}
      `;
      bindings = [channelId, searchPattern, searchPattern, searchPattern, searchPattern];
    } else {
      query = `SELECT * FROM videos WHERE channel_id = ? ORDER BY ${orderByClause}`;
      bindings = [channelId];
    }

    const { results } = await env.DB.prepare(query).bind(...bindings).all<Video>();

    return jsonResponse({
      success: true,
      channel,
      videos: results || [],
    });
  } catch (err: any) {
    console.error('Error fetching videos:', err);
    return errorResponse('Failed to fetch videos', 500, err.message);
  }
};

// POST /api/channels/:id/videos - Add new video to channel with auto sequential numbering
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const channelId = params.id as string;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  if (!channelId) {
    return errorResponse('Channel ID is required', 400);
  }

  let body: {
    name?: string;
    video_drive_url?: string;
    title?: string;
    description?: string;
    tags?: string;
    thumbnail_drive_url?: string;
    upload_status?: string;
  };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const name = (body.name || '').trim();
  if (!name) {
    return errorResponse('Video name is required', 400);
  }

  const videoDriveUrl = (body.video_drive_url || '').trim();
  const title = (body.title || '').trim();
  const description = body.description || '';
  const tags = (body.tags || '').trim();
  const thumbnailDriveUrl = (body.thumbnail_drive_url || '').trim();

  // Validate upload status
  const validStatuses = ['Draft', 'Ready', 'Scheduled', 'Published'];
  const uploadStatus = validStatuses.includes(body.upload_status || '')
    ? (body.upload_status as 'Draft' | 'Ready' | 'Scheduled' | 'Published')
    : 'Draft';

  try {
    // 1. Fetch channel and next_video_number
    const channel = await env.DB.prepare(
      'SELECT id, next_video_number FROM channels WHERE id = ?'
    )
      .bind(channelId)
      .first<{ id: string; next_video_number: number }>();

    if (!channel) {
      return errorResponse('Channel not found', 404);
    }

    const assignedNumber = channel.next_video_number || 1;
    const videoId = `vid_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    // 2. Insert video and increment next_video_number atomically in batch
    await env.DB.batch([
      env.DB.prepare(`
        INSERT INTO videos (
          id, channel_id, video_number, name, video_drive_url, 
          title, description, tags, thumbnail_drive_url, upload_status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        videoId,
        channelId,
        assignedNumber,
        name,
        videoDriveUrl,
        title,
        description,
        tags,
        thumbnailDriveUrl,
        uploadStatus,
        now,
        now
      ),
      env.DB.prepare(`
        UPDATE channels 
        SET next_video_number = next_video_number + 1, updated_at = ? 
        WHERE id = ?
      `).bind(now, channelId),
    ]);

    const createdVideo: Video = {
      id: videoId,
      channel_id: channelId,
      video_number: assignedNumber,
      name,
      video_drive_url: videoDriveUrl,
      title,
      description,
      tags,
      thumbnail_drive_url: thumbnailDriveUrl,
      upload_status: uploadStatus,
      created_at: now,
      updated_at: now,
    };

    return jsonResponse({ success: true, video: createdVideo }, 201);
  } catch (err: any) {
    console.error('Error creating video:', err);
    return errorResponse('Failed to create video', 500, err.message);
  }
};

