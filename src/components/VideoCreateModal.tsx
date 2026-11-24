import React, { useState } from 'react';
import { X, Film } from 'lucide-react';
import { Video, UploadStatus } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface VideoCreateModalProps {
  channelId: string;
  channelName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newVideo: Video) => void;
}

export const VideoCreateModal: React.FC<VideoCreateModalProps> = ({
  channelId,
  channelName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [videoDriveUrl, setVideoDriveUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailDriveUrl, setThumbnailDriveUrl] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('Draft');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const createdVideo = await api.createVideo(channelId, {
        name: name.trim(),
        video_drive_url: videoDriveUrl.trim(),
        title: title.trim(),
        description: description,
        tags: tags.trim(),
        thumbnail_drive_url: thumbnailDriveUrl.trim(),
        upload_status: uploadStatus,
      });

      showToast(`Created Video #${createdVideo.video_number}!`, 'success');
      onSuccess(createdVideo);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create video', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-brand-600" />
              <span>Add New Video</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adding to <strong className="text-slate-800 dark:text-slate-200">{channelName}</strong>. Sequential video number is assigned automatically.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Video Name (Required) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Video Name * (Required)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Masha Real Life"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Upload Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Upload Status
            </label>
            <select
              value={uploadStatus}
              onChange={(e) => setUploadStatus(e.target.value as UploadStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="Draft">Draft</option>
              <option value="Ready">Ready</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Published">Published</option>
            </select>
          </div>

          {/* YouTube Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                YouTube Title
              </label>
              <span className="text-[11px] text-slate-400">{title.length} / 100</span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Masha and the Bear in Real Life | Cartoon Characters"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* YouTube Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              YouTube Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Paste full description, hashtags, links..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* YouTube Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              YouTube Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="masha, cartoon, animation, mr bean"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Google Drive Video URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Google Drive Video Link
            </label>
            <input
              type="url"
              value={videoDriveUrl}
              onChange={(e) => setVideoDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          {/* Google Drive Thumbnail URL */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Google Drive Thumbnail Link
            </label>
            <input
              type="url"
              value={thumbnailDriveUrl}
              onChange={(e) => setThumbnailDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or image URL"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              {isSubmitting ? 'Saving Video...' : 'Save Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
