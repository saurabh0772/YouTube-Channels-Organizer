export interface Env {
  DB: D1Database;
  AUTH_PASSCODE?: string;
  SESSION_SECRET?: string;
}

export interface Channel {
  id: string;
  name: string;
  next_video_number: number;
  created_at: string;
  updated_at: string;
  video_count?: number;
}

export interface Video {
  id: string;
  channel_id: string;
  video_number: number;
  name: string;
  video_drive_url: string;
  title: string;
  description: string;
  tags: string;
  thumbnail_drive_url: string;
  upload_status: 'Draft' | 'Ready' | 'Scheduled' | 'Published';
  created_at: string;
  updated_at: string;
}

export interface Session {
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

