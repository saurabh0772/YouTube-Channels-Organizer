import { Channel, Video, BackupData, SortOption } from '../types';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or unauthorized
    window.dispatchEvent(new CustomEvent('hq-unauthorized'));
    throw new ApiError('Unauthorized. Please unlock with your passcode.', 401);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Server request failed', response.status, data.details);
  }

  return data as T;
}

export const api = {
  // Channels
  async getChannels(): Promise<Channel[]> {
    const res = await request<{ success: boolean; channels: Channel[] }>('/api/channels');
    return res.channels;
  },

  async createChannel(name: string): Promise<Channel> {
    const res = await request<{ success: boolean; channel: Channel }>('/api/channels', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return res.channel;
  },

  async updateChannel(id: string, name: string): Promise<Channel> {
    const res = await request<{ success: boolean; channel: Channel }>(`/api/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    return res.channel;
  },

  async deleteChannel(id: string): Promise<void> {
    await request(`/api/channels/${id}`, {
      method: 'DELETE',
    });
  },

  // Videos
  async getVideos(channelId: string, search = '', sort: SortOption = 'newest'): Promise<{ channel: Channel; videos: Video[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<{ success: boolean; channel: Channel; videos: Video[] }>(
      `/api/channels/${channelId}/videos${query}`
    );
    return { channel: res.channel, videos: res.videos };
  },

  async getVideo(id: string): Promise<Video> {
    const res = await request<{ success: boolean; video: Video }>(`/api/videos/${id}`);
    return res.video;
  },

  async createVideo(channelId: string, payload: Partial<Video>): Promise<Video> {
    const res = await request<{ success: boolean; video: Video }>(`/api/channels/${channelId}/videos`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.video;
  },

  async updateVideo(id: string, payload: Partial<Video>): Promise<Video> {
    const res = await request<{ success: boolean; video: Video }>(`/api/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.video;
  },

  async deleteVideo(id: string): Promise<void> {
    await request(`/api/videos/${id}`, {
      method: 'DELETE',
    });
  },

  // Backup & Restore
  async exportBackup(): Promise<BackupData> {
    const res = await request<{ success: boolean; backup: BackupData }>('/api/export');
    return res.backup;
  },

  async importBackup(backupData: any, mode: 'merge' | 'replace'): Promise<{ importedChannels: number; importedVideos: number; message: string }> {
    const res = await request<{ success: boolean; message: string; importedChannels: number; importedVideos: number }>(
      '/api/import',
      {
        method: 'POST',
        body: JSON.stringify({ backupData, mode }),
      }
    );
    return res;
  },
};

