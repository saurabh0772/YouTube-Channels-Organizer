import { Env, Channel, Video } from '../utils/types';
import { jsonResponse, errorResponse } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { ensureDatabaseSchema } from '../utils/initDb';

interface BackupPayload {
  mode: 'merge' | 'replace';
  backupData: {
    app?: string;
    version?: number;
    channels?: Channel[];
    videos?: Video[];
  };
}

// POST /api/import - Restore backup (Merge or Replace mode)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireAuth(request, env);
  if (!auth.authenticated) {
    return errorResponse(auth.error || 'Unauthorized', 401);
  }

  await ensureDatabaseSchema(env);

  let payload: BackupPayload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('Invalid JSON payload', 400);
  }

  const { mode, backupData } = payload;
  if (!backupData || !Array.isArray(backupData.channels) || !Array.isArray(backupData.videos)) {
    return errorResponse('Invalid backup structure. channels and videos arrays are required.', 400);
  }

  if (mode !== 'merge' && mode !== 'replace') {
    return errorResponse('Mode must be either "merge" or "replace"', 400);
  }

  try {
    if (mode === 'replace') {
      // In replace mode, wipe existing videos and channels cleanly
      await env.DB.batch([
        env.DB.prepare('DELETE FROM videos'),
        env.DB.prepare('DELETE FROM channels'),
      ]);
    }

    // Insert or update channels
    const channelStatements = backupData.channels.map((ch) => {
      const now = new Date().toISOString();
      return env.DB.prepare(`
        INSERT INTO channels (id, name, next_video_number, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          next_video_number = MAX(channels.next_video_number, excluded.next_video_number),
          updated_at = excluded.updated_at
      `).bind(
        ch.id || `ch_${crypto.randomUUID()}`,
        ch.name || 'Untitled Channel',
        ch.next_video_number || 1,
        ch.created_at || now,
        ch.updated_at || now
      );
    });

    if (channelStatements.length > 0) {
      await env.DB.batch(channelStatements);
    }

    // Insert or update videos
    const validStatuses = ['Draft', 'Ready', 'Scheduled', 'Published'];
    const videoStatements = backupData.videos.map((vid) => {
      const now = new Date().toISOString();
      const status = validStatuses.includes(vid.upload_status) ? vid.upload_status : 'Draft';
      return env.DB.prepare(`
        INSERT INTO videos (
          id, channel_id, video_number, name, video_drive_url,
          title, description, tags, thumbnail_drive_url, upload_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          video_drive_url = excluded.video_drive_url,
          title = excluded.title,
          description = excluded.description,
          tags = excluded.tags,
          thumbnail_drive_url = excluded.thumbnail_drive_url,
          upload_status = excluded.upload_status,
          updated_at = excluded.updated_at
      `).bind(
        vid.id || `vid_${crypto.randomUUID()}`,
        vid.channel_id,
        vid.video_number || 1,
        vid.name || 'Untitled Video',
        vid.video_drive_url || '',
        vid.title || '',
        vid.description || '',
        vid.tags || '',
        vid.thumbnail_drive_url || '',
        status,
        vid.created_at || now,
        vid.updated_at || now
      );
    });

    // Execute in batches to respect D1 statement limit
    const batchSize = 50;
    for (let i = 0; i < videoStatements.length; i += batchSize) {
      const slice = videoStatements.slice(i, i + batchSize);
      if (slice.length > 0) {
        await env.DB.batch(slice);
      }
    }

    // Recalculate next_video_number per channel if needed so new videos don't collide
    const channels = await env.DB.prepare('SELECT id FROM channels').all<{ id: string }>();
    if (channels.results) {
      for (const ch of channels.results) {
        const maxNumRes = await env.DB.prepare(
          'SELECT MAX(video_number) as max_num FROM videos WHERE channel_id = ?'
        )
          .bind(ch.id)
          .first<{ max_num: number | null }>();

        const currentMax = maxNumRes?.max_num || 0;
        await env.DB.prepare(
          'UPDATE channels SET next_video_number = MAX(next_video_number, ?) WHERE id = ?'
        )
          .bind(currentMax + 1, ch.id)
          .run();
      }
    }

    return jsonResponse({
      success: true,
      message: `Successfully imported ${backupData.channels.length} channel(s) and ${backupData.videos.length} video(s) using "${mode}" mode.`,
      importedChannels: backupData.channels.length,
      importedVideos: backupData.videos.length,
    });
  } catch (err: any) {
    console.error('Import error:', err);
    return errorResponse('Failed to import backup data', 500, err.message);
  }
};

