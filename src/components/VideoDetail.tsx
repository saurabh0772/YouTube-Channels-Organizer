import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Save, 
  Trash2, 
  Film, 
  Image as ImageIcon, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Video, UploadStatus } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { getDriveThumbnailPreviewUrl, isValidUrl } from '../utils/drive';
import { useToast } from '../context/ToastContext';

interface VideoDetailProps {
  video: Video;
  onBack: () => void;
  onUpdate: (updatedVideo: Video) => void;
  onDelete: (videoId: string) => void;
}

export const VideoDetail: React.FC<VideoDetailProps> = ({
  video,
  onBack,
  onUpdate,
  onDelete,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(video.name);
  const [editDriveUrl, setEditDriveUrl] = useState(video.video_drive_url);
  const [editTitle, setEditTitle] = useState(video.title);
  const [editDescription, setEditDescription] = useState(video.description);
  const [editTags, setEditTags] = useState(video.tags);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState(video.thumbnail_drive_url);
  const [editStatus, setEditStatus] = useState<UploadStatus>(video.upload_status);

  // Copied state visual flashes
  const [copiedField, setCopiedField] = useState<'title' | 'description' | 'tags' | 'video_link' | 'thumb_link' | null>(null);

  // Thumbnail preview error state
  const [thumbError, setThumbError] = useState(false);

  const triggerCopy = async (
    text: string, 
    fieldName: 'title' | 'description' | 'tags' | 'video_link' | 'thumb_link', 
    label: string
  ) => {
    if (!text || !text.trim()) {
      showToast(`No ${label.toLowerCase()} to copy`, 'info');
      return;
    }

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(fieldName);
      showToast(`Copied ${label}!`, 'copied');
      setTimeout(() => setCopiedField(null), 1800);
    } else {
      showToast('Failed to copy text', 'error');
    }
  };

  const handleStartEdit = () => {
    setEditName(video.name);
    setEditDriveUrl(video.video_drive_url);
    setEditTitle(video.title);
    setEditDescription(video.description);
    setEditTags(video.tags);
    setEditThumbnailUrl(video.thumbnail_drive_url);
    setEditStatus(video.upload_status);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          video_drive_url: editDriveUrl.trim(),
          title: editTitle.trim(),
          description: editDescription,
          tags: editTags.trim(),
          thumbnail_drive_url: editThumbnailUrl.trim(),
          upload_status: editStatus,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onUpdate(data.video);
        setIsEditing(false);
        showToast('Video details updated', 'success');
      } else {
        showToast(data.error || 'Failed to update video', 'error');
      }
    } catch (err: any) {
      showToast('Network error while saving', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast('Video deleted', 'success');
        onDelete(video.id);
      } else {
        showToast(data.error || 'Failed to delete video', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting', 'error');
    } finally {
      setIsSubmitting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const previewThumbnailUrl = video.thumbnail_drive_url 
    ? getDriveThumbnailPreviewUrl(video.thumbnail_drive_url) || (isValidUrl(video.thumbnail_drive_url) ? video.thumbnail_drive_url : null)
    : null;

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

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Back to Channel Video List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-bold text-xs sm:text-sm border border-brand-200 dark:border-brand-800">
              #{video.video_number}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusBadge(video.upload_status)}`}>
              {video.upload_status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isEditing ? (
            <>
              <button
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold shadow-sm transition-colors"
              >
                <Edit3 className="w-4 h-4 text-brand-500" />
                <span>Edit Details</span>
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors"
                title="Delete video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW MODE: TAP-TO-COPY FIRST-CLASS PRODUCTIVITY INTERFACE */}
      {/* ======================================================== */}
      {!isEditing ? (
        <div className="space-y-5">
          {/* Helpful Tip */}
          <div className="bg-brand-50/70 dark:bg-brand-950/30 border border-brand-200/70 dark:border-brand-800/50 rounded-2xl p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm text-brand-900 dark:text-brand-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
              <span>Tap anywhere on the Title, Description, or Tags cards to instantly copy for YouTube upload.</span>
            </div>
          </div>

          {/* FIELD 1: VIDEO NAME */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Field 1: Video Name
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Video {video.video_number} - {video.name}
            </h2>
          </div>

          {/* FIELD 2: GOOGLE DRIVE VIDEO LINK */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field 2: Google Drive Video Link
              </span>
              <Film className="w-4 h-4 text-slate-400" />
            </div>

            {video.video_drive_url ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <span className="text-sm font-mono text-slate-600 dark:text-slate-300 truncate max-w-xl">
                  {video.video_drive_url}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={video.video_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Video</span>
                  </a>
                  <button
                    onClick={() => triggerCopy(video.video_drive_url, 'video_link', 'Drive Video Link')}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                      copiedField === 'video_link'
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {copiedField === 'video_link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'video_link' ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400 italic">No Google Drive video link provided yet.</p>
            )}
          </div>

          {/* FIELD 3: YOUTUBE TITLE (TAP ANYWHERE TO COPY) */}
          <div
            onClick={() => triggerCopy(video.title, 'title', 'Title')}
            className={`group relative rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer shadow-sm active:scale-[0.99] select-none ${
              copiedField === 'title'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field 3: YouTube Title
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                {copiedField === 'title' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100">
                    <Copy className="w-3.5 h-3.5" /> Tap to copy
                  </span>
                )}
              </div>
            </div>

            <div className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {video.title || <span className="italic text-slate-400 text-sm">Tap "Edit Details" to set YouTube Title</span>}
            </div>
          </div>

          {/* FIELD 4: YOUTUBE DESCRIPTION (TAP ANYWHERE TO COPY) */}
          <div
            onClick={() => triggerCopy(video.description, 'description', 'Description')}
            className={`group relative rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer shadow-sm active:scale-[0.99] select-none ${
              copiedField === 'description'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field 4: YouTube Description (Full Formatting)
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                {copiedField === 'description' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100">
                    <Copy className="w-3.5 h-3.5" /> Tap to copy
                  </span>
                )}
              </div>
            </div>

            {video.description ? (
              <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed break-words bg-slate-50/70 dark:bg-slate-800/50 p-3 sm:p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                {video.description}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400 italic">Tap "Edit Details" to add description with hashtags and emojis.</p>
            )}
          </div>

          {/* FIELD 5: YOUTUBE TAGS (TAP ANYWHERE TO COPY) */}
          <div
            onClick={() => triggerCopy(video.tags, 'tags', 'Tags')}
            className={`group relative rounded-2xl border transition-all p-4 sm:p-5 cursor-pointer shadow-sm active:scale-[0.99] select-none ${
              copiedField === 'tags'
                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-500'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field 5: YouTube Tags
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                {copiedField === 'tags' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100">
                    <Copy className="w-3.5 h-3.5" /> Tap to copy
                  </span>
                )}
              </div>
            </div>

            {video.tags ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {video.tags.split(',').map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400 italic">No tags entered yet.</p>
            )}
          </div>

          {/* FIELD 6: GOOGLE DRIVE THUMBNAIL LINK & PREVIEW */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Field 6: Google Drive Thumbnail Link & Preview
              </span>
              <ImageIcon className="w-4 h-4 text-slate-400" />
            </div>

            {video.thumbnail_drive_url ? (
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <span className="text-sm font-mono text-slate-600 dark:text-slate-300 truncate max-w-xl">
                    {video.thumbnail_drive_url}
                  </span>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={video.thumbnail_drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/50 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Thumbnail</span>
                    </a>
                    <button
                      onClick={() => triggerCopy(video.thumbnail_drive_url, 'thumb_link', 'Thumbnail Link')}
                      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        copiedField === 'thumb_link'
                          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {copiedField === 'thumb_link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedField === 'thumb_link' ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Thumbnail Image Render */}
                {previewThumbnailUrl && !thumbError ? (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-sm aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <img
                      src={previewThumbnailUrl}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                      onError={() => setThumbError(true)}
                    />
                  </div>
                ) : (
                  <div className="mt-2 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500">
                      Thumbnail link saved. (Direct thumbnail preview is unavailable or access requires login to Google Drive). Click "Open Thumbnail" above to view.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-400 italic">No thumbnail link provided yet.</p>
            )}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* EDIT MODE: COMFORTABLE FORM FIELDS FOR DESKTOP & MOBILE */
        /* ======================================================== */
        <form onSubmit={handleSaveEdit} className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Edit Video Metadata (Video #{video.video_number})
            </h2>

            {/* Video Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Video Name *
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Masha Real Life"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Upload Status */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Upload Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as UploadStatus)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published</option>
              </select>
            </div>

            {/* YouTube Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  YouTube Title
                </label>
                <span className="text-[11px] text-slate-400">{editTitle.length} / 100</span>
              </div>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Masha and the Bear in Real Life | Cartoon Characters"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              />
            </div>

            {/* YouTube Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                YouTube Description (Supports newlines, emojis, hashtags)
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={8}
                placeholder="Write or paste your YouTube video description, links, hashtags #animation..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
              />
            </div>

            {/* YouTube Tags */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                YouTube Tags (Comma separated)
              </label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="masha, cartoon, animation, mr bean"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Google Drive Video URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Google Drive Video URL
              </label>
              <input
                type="url"
                value={editDriveUrl}
                onChange={(e) => setEditDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            {/* Google Drive Thumbnail URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Google Drive Thumbnail URL
              </label>
              <input
                type="url"
                value={editThumbnailUrl}
                onChange={(e) => setEditThumbnailUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or image URL"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !editName.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Delete Video {video.video_number}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{video.name}"</strong>? This action cannot be undone. Its video number will never be reused, preserving sequence integrity.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
