import React, { useState, useEffect, useCallback } from 'react';
import { Channel, Video, SortOption } from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { useSync } from './hooks/useSync';
import { Navbar } from './components/Navbar';
import { PasscodeModal } from './components/PasscodeModal';
import { ChannelList } from './components/ChannelList';
import { ChannelView } from './components/ChannelView';
import { VideoDetail } from './components/VideoDetail';
import { VideoCreateModal } from './components/VideoCreateModal';
import { BackupModal } from './components/BackupModal';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // App navigation state
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Data state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);

  // Video list filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // Modals
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState<boolean>(false);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);

  // Load Channels
  const fetchChannels = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingChannels(true);
    try {
      const data = await api.getChannels();
      setChannels(data);

      // Keep selectedChannel in sync with updated video count
      if (selectedChannel) {
        const found = data.find(c => c.id === selectedChannel.id);
        if (found) {
          setSelectedChannel(found);
        }
      }
    } catch (err) {
      console.error('Error loading channels:', err);
    } finally {
      setIsLoadingChannels(false);
    }
  }, [isAuthenticated, selectedChannel]);

  // Load Videos for selected channel
  const fetchVideos = useCallback(async () => {
    if (!isAuthenticated || !selectedChannel) return;
    setIsLoadingVideos(true);
    try {
      const { channel, videos: list } = await api.getVideos(selectedChannel.id, searchTerm, sortOption);
      setSelectedChannel(channel);
      setVideos(list);

      // Keep selectedVideo in sync if currently viewing one
      if (selectedVideo) {
        const found = list.find(v => v.id === selectedVideo.id);
        if (found) {
          setSelectedVideo(found);
        }
      }
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [isAuthenticated, selectedChannel, searchTerm, sortOption, selectedVideo]);

  // Global Sync Handler
  const handleSync = useCallback(async () => {
    if (!isAuthenticated) return;
    if (selectedChannel) {
      await fetchVideos();
    }
    await fetchChannels();
  }, [isAuthenticated, selectedChannel, fetchVideos, fetchChannels]);

  // Hook for auto synchronization across devices
  const { syncStatus, lastSyncedAt, triggerSync } = useSync({
    enabled: isAuthenticated,
    pollIntervalMs: 25000, // 25s lightweight poll while page is active
    onSync: handleSync,
  });

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchChannels();
    }
  }, [isAuthenticated]);

  // Load videos whenever selected channel, search, or sort changes
  useEffect(() => {
    if (selectedChannel) {
      fetchVideos();
    }
  }, [selectedChannel?.id, searchTerm, sortOption]);

  // Navigation handlers
  const handleNavigateHome = () => {
    setSelectedVideo(null);
    setSelectedChannel(null);
    setSearchTerm('');
  };

  const handleNavigateChannel = () => {
    setSelectedVideo(null);
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setSelectedVideo(null);
    setSearchTerm('');
  };

  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleVideoCreated = (newVideo: Video) => {
    setVideos(prev => [newVideo, ...prev]);
    setSelectedVideo(newVideo); // Navigate straight to details for instant copying
    fetchChannels();
  };

  const handleVideoUpdated = (updatedVideo: Video) => {
    setSelectedVideo(updatedVideo);
    setVideos(prev => prev.map(v => (v.id === updatedVideo.id ? updatedVideo : v)));
  };

  const handleVideoDeleted = (deletedId: string) => {
    setSelectedVideo(null);
    setVideos(prev => prev.filter(v => v.id !== deletedId));
    fetchChannels();
  };

  const handleRefreshAll = async () => {
    await fetchChannels();
    if (selectedChannel) {
      await fetchVideos();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading YouTube Content HQ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Access Passcode Modal if unauthorized */}
      {!isAuthenticated && <PasscodeModal />}

      {/* Top Navbar */}
      <Navbar
        currentChannel={selectedChannel}
        currentVideo={selectedVideo}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onNavigateHome={handleNavigateHome}
        onNavigateChannel={handleNavigateChannel}
        onTriggerSync={triggerSync}
        onOpenBackup={() => setIsBackupOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* VIEW 1: HOME PAGE - CHANNELS */}
        {!selectedChannel && !selectedVideo && (
          <ChannelList
            channels={channels}
            isLoading={isLoadingChannels}
            onSelectChannel={handleSelectChannel}
            onRefreshChannels={fetchChannels}
          />
        )}

        {/* VIEW 2: CHANNEL VIDEO LIST */}
        {selectedChannel && !selectedVideo && (
          <ChannelView
            channel={selectedChannel}
            videos={videos}
            isLoading={isLoadingVideos}
            onBack={handleNavigateHome}
            onSelectVideo={handleSelectVideo}
            onOpenCreateModal={() => setIsCreateVideoOpen(true)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />
        )}

        {/* VIEW 3: VIDEO DETAILS (TAP-TO-COPY & EDIT) */}
        {selectedChannel && selectedVideo && (
          <VideoDetail
            video={selectedVideo}
            onBack={handleNavigateChannel}
            onUpdate={handleVideoUpdated}
            onDelete={handleVideoDeleted}
          />
        )}
      </main>

      {/* Add Video Modal */}
      {selectedChannel && (
        <VideoCreateModal
          channelId={selectedChannel.id}
          channelName={selectedChannel.name}
          isOpen={isCreateVideoOpen}
          onClose={() => setIsCreateVideoOpen(false)}
          onSuccess={handleVideoCreated}
        />
      )}

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onRefreshAll={handleRefreshAll}
      />
    </div>
  );
};

export default App;

