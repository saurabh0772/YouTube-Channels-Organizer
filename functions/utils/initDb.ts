import { Env } from './types';

// Helper to ensure tables and initial 4 channels exist if not already migrated
export async function ensureDatabaseSchema(env: Env): Promise<void> {
  try {
    await env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS channels (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL COLLATE NOCASE,
          next_video_number INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY,
          channel_id TEXT NOT NULL,
          video_number INTEGER NOT NULL,
          name TEXT NOT NULL,
          video_drive_url TEXT NOT NULL DEFAULT '',
          title TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          tags TEXT NOT NULL DEFAULT '',
          thumbnail_drive_url TEXT NOT NULL DEFAULT '',
          upload_status TEXT NOT NULL DEFAULT 'Draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
          UNIQUE(channel_id, video_number)
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT
        )
      `),
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT NOT NULL,
          locked_until TEXT
        )
      `),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos (channel_id)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_videos_channel_created ON videos (channel_id, created_at DESC)'),
    ]);
  } catch (err) {
    console.error('Error during ensureDatabaseSchema:', err);
  }
}

