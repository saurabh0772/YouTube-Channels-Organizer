import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Film, 
  Copy, 
  Check, 
  Calendar,
  X
} from 'lucide-react';
import { Channel, Video, SortOption, UploadStatus } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { useToast } from '../context/ToastContext';

interface ChannelViewProps {
  channel: Channel;
  videos: Video[];
  isLoading: boolean;
  onBack: () => void;
  onSelectVideo: (video: Video) => void;
  onOpenCreateModal: () => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  channel,
  videos,
  isLoading,
  onBack,
  onSelectVideo,
  onOpenCreateModal,
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
}) => {
  const { showToast } = useToast();
  const [copiedTitleId, setCopiedTitleId] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  const filteredVideos = videos.filter(video => {
    if (selectedStatusFilter !== 'ALL' && video.upload_status !== selectedStatusFilter) {
      return false;
    }
    return true;
  });

  const handleQuickCopyTitle = async (e: React.MouseEvent, video: Video) => {
    e.stopPropagation();
    const textToCopy = video.title || video.name;
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedTitleId(video.id);
      showToast('Copied Title!', 'copied');
      setTimeout(() => setCopiedTitleId(null), 1800);
    } else {
      showToast('Failed to copy', 'error');
    }
  };

  const getStatusBadge = (status: UploadStatus) => {
    switch (status) {
      case 'Published':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'Scheduled':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      case 'Ready':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Channel Header Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Back to Channels"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{channel.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {videos.length} {videos.length === 1 ? 'video entry' : 'video entries'} &bull; Newest created appear at top
            </p>
          </div>
        </div>

        {/* New Video Primary Button */}
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Video</span>
        </button>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search video name, title, or #..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            <option value="newest">Newest Created First</option>
            <option value="oldest">Oldest Created First</option>
            <option value="updated">Last Updated</option>
            <option value="number_desc">Video Number (High to Low)</option>
            <option value="number_asc">Video Number (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Upload Status Quick Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {['ALL', 'Draft', 'Ready', 'Scheduled', 'Published'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              selectedStatusFilter === status
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {status === 'ALL' ? 'All Videos' : status}
          </button>
        ))}
      </div>

      {/* Videos List (Google Drive style list with touch optimization) */}
      {isLoading && videos.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="h-20 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse border border-slate-200/50 dark:border-slate-800/50"></div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-14 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <Film className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {searchTerm || selectedStatusFilter !== 'ALL' ? 'No matching videos' : 'No videos in this channel yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || selectedStatusFilter !== 'ALL'
              ? 'Try adjusting your search query or filter.'
              : 'Add your first video to generate sequential numbers, save Drive links, and prepare titles & descriptions.'}
          </p>
          {!searchTerm && selectedStatusFilter === 'ALL' && (
            <button
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Video</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className="group relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-pointer select-none"
            >
              {/* Left Column: Number Badge & Name */}
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pr-3">
                {/* Number Badge */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 flex flex-col items-center justify-center shrink-0 text-brand-700 dark:text-brand-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500 leading-none">VID</span>
                  <span className="text-sm sm:text-base font-extrabold leading-tight">#{video.video_number}</span>
                </div>

                {/* Video Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {video.name}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(video.upload_status)}`}>
                      {video.upload_status}
                    </span>
                  </div>

                  {/* YouTube Title snippet */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                    {video.title || <span className="italic text-slate-400 dark:text-slate-600">No YouTube title set</span>}
                  </p>
                </div>
              </div>

              {/* Right Column: Date & Quick Actions */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(video.created_at)}
                </span>

                {/* Quick copy title button */}
                <button
                  onClick={(e) => handleQuickCopyTitle(e, video)}
                  className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    copiedTitleId === video.id
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Quick copy YouTube title"
                >
                  {copiedTitleId === video.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Copy Title</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
