import React, { useState } from 'react';
import { 
  Folder, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Video as VideoIcon, 
  AlertTriangle,
  X
} from 'lucide-react';
import { Channel } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ChannelListProps {
  channels: Channel[];
  isLoading: boolean;
  onSelectChannel: (channel: Channel) => void;
  onRefreshChannels: () => Promise<void>;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  isLoading,
  onSelectChannel,
  onRefreshChannels,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editName, setEditName] = useState('');
  
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.createChannel(newChannelName.trim());
      showToast('Channel created successfully', 'success');
      setNewChannelName('');
      setIsCreateOpen(false);
      await onRefreshChannels();
    } catch (err: any) {
      showToast(err.message || 'Failed to create channel', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel || !editName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.updateChannel(editingChannel.id, editName.trim());
      showToast('Channel renamed successfully', 'success');
      setEditingChannel(null);
      await onRefreshChannels();
    } catch (err: any) {
      showToast(err.message || 'Failed to rename channel', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!deletingChannel || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.deleteChannel(deletingChannel.id);
      showToast('Channel deleted successfully', 'success');
      setDeletingChannel(null);
      await onRefreshChannels();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete channel', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            YouTube Channels
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select a channel folder to manage videos, Drive links, and copy metadata.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Channel</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search channels..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Channel Folders Grid (Google Drive inspired) */}
      {isLoading && channels.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse border border-slate-200/50 dark:border-slate-800/50"></div>
          ))}
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Folder className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-medium text-slate-900 dark:text-white">No channels found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {searchTerm ? 'No channels matched your search term.' : 'Get started by creating your first YouTube channel folder.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-3 text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredChannels.map(channel => (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-pointer text-left select-none"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
                  <Folder className="w-6 h-6 fill-amber-500/20 stroke-amber-600 dark:stroke-amber-400" />
                </div>

                {/* Dropdown / Action buttons */}
                <div
                  className="flex items-center space-x-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setEditingChannel(channel);
                      setEditName(channel.name);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Rename channel"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingChannel(channel)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete channel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {channel.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <VideoIcon className="w-3.5 h-3.5" />
                  <span>
                    {channel.video_count ?? 0} {channel.video_count === 1 ? 'video' : 'videos'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Channel */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Create New Channel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Add a new channel folder to organize your video metadata.
            </p>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. Science Shorts"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newChannelName.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rename Channel */}
      {editingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Rename Channel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Update the name of this channel folder.
            </p>

            <form onSubmit={handleRenameChannel} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editName.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {isSubmitting ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Channel Confirmation */}
      {deletingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Delete Channel?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{deletingChannel.name}"</strong>? All videos inside this channel folder will also be permanently deleted.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChannel(null)}
                className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Channel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
