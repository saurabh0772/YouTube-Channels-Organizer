-- Cloudflare D1 Migration for YouTube Content HQ

-- Channels Table
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE,
  next_video_number INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Videos Table
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
  upload_status TEXT NOT NULL DEFAULT 'Draft' CHECK (upload_status IN ('Draft', 'Ready', 'Scheduled', 'Published')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
  UNIQUE(channel_id, video_number)
);

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos (channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_channel_created ON videos (channel_id, created_at DESC);

-- Sessions Table for secure device authorization
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- Rate limits table to prevent brute force attacks on unlock endpoint
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT NOT NULL,
  locked_until TEXT
);

-- Seed initial 4 channels if channels table is empty
INSERT OR IGNORE INTO channels (id, name, next_video_number, created_at, updated_at)
VALUES 
  ('ch_toon_rivora', 'Toon Rivora', 1, datetime('now'), datetime('now')),
  ('ch_techno_slayer', 'Techno Slayer', 1, datetime('now'), datetime('now')),
  ('ch_rule_breaker', 'Rule Breaker', 1, datetime('now'), datetime('now')),
  ('ch_ssc_vertex', 'SSC Vertex', 1, datetime('now'), datetime('now'));

