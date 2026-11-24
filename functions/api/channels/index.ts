import { Env, Channel } from '../../utils/types';
import { jsonResponse, errorResponse } from '../../utils/response';
import { requireAuth } from '../../utils/auth';
import { ensureDatabaseSchema } from '../../utils/initDb';

// GET /api/channels - List all channels with video counts
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  await ensureDatabaseSchema(env);

  try {
    const query = `
      SELECT 
        c.id, 
        c.name, 
        c.next_video_number, 
        c.created_at, 
        c.updated_at,
        COUNT(v.id) AS video_count
      FROM channels c
      LEFT JOIN videos v ON c.id = v.channel_id
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `;

    const { results } = await env.DB.prepare(query).all<Channel>();

    return jsonResponse({
      success: true,
      channels: results || [],
    });
  } catch (err: any) {
    console.error('Error fetching channels:', err);
    return errorResponse('Failed to fetch channels', 500, err.message);
  }
};

// POST /api/channels - Create a new channel
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  await ensureDatabaseSchema(env);

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const name = (body.name || '').trim();
  if (!name) {
    return errorResponse('Channel name is required', 400);
  }

  const id = `ch_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      'INSERT INTO channels (id, name, next_video_number, created_at, updated_at) VALUES (?, ?, 1, ?, ?)'
    )
      .bind(id, name, now, now)
      .run();

    const createdChannel: Channel = {
      id,
      name,
      next_video_number: 1,
      created_at: now,
      updated_at: now,
      video_count: 0,
    };

    return jsonResponse({ success: true, channel: createdChannel }, 201);
  } catch (err: any) {
    console.error('Error creating channel:', err);
    return errorResponse('Failed to create channel', 500, err.message);
  }
};

