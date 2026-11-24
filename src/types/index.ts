export type UploadStatus = 'Draft' | 'Ready' | 'Scheduled' | 'Published';

export type SortOption = 'newest' | 'oldest' | 'updated' | 'number_desc' | 'number_asc';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

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
  upload_status: UploadStatus;
  created_at: string;
  updated_at: string;
}

export interface BackupData {
  app: string;
  version: number;
  exported_at: string;
  channels: Channel[];
  videos: Video[];
}

