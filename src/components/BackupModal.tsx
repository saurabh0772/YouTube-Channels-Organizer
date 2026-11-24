import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  X, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAll: () => Promise<void>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onRefreshAll,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await api.exportBackup();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      const filename = `youtube-content-hq-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Backup JSON downloaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export backup', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        if (!json || !Array.isArray(json.channels) || !Array.isArray(json.videos)) {
          setParseError('Invalid backup file. Missing channels or videos array.');
          setParsedData(null);
          return;
        }

        setParsedData(json);
      } catch (err) {
        setParseError('Invalid JSON file format.');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (!parsedData || isImporting) return;

    if (importMode === 'replace') {
      const confirmed = window.confirm(
        'WARNING: "Replace" mode will delete all current channels and videos in Cloudflare D1 before importing. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    setIsImporting(true);
    try {
      const result = await api.importBackup(parsedData, importMode);
      showToast(result.message || 'Data imported successfully', 'success');
      await onRefreshAll();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to import backup', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Backup & Restore
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export or restore all channel and video metadata as JSON.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* SECTION 1: EXPORT */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-brand-500" />
                <span>Export Metadata Backup</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download a complete JSON snapshot of all 4 channels and all videos.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                  <span>Preparing JSON...</span>
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4 text-brand-500" />
                  <span>Download JSON Backup</span>
                </>
              )}
            </button>
          </div>

          {/* SECTION 2: IMPORT */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-500" />
                <span>Restore from JSON Backup</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select a valid backup JSON file to import into Cloudflare D1.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 text-slate-600 dark:text-slate-400 text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-colors bg-white/50 dark:bg-slate-900/40"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span>{selectedFile ? selectedFile.name : 'Click to select JSON backup file'}</span>
            </button>

            {/* Validation Feedback */}
            {parseError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{parseError}</span>
              </div>
            )}

            {parsedData && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Valid backup: {parsedData.channels?.length || 0} channels, {parsedData.videos?.length || 0} videos.</span>
                </div>
              </div>
            )}

            {/* Mode selection: Merge vs Replace */}
            {parsedData && (
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Import Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      importMode === 'merge'
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold">Merge Mode</div>
                    <div className="text-[11px] opacity-75 mt-0.5">Keep existing records, add or update new ones.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`p-2.5 rounded-xl border text-left transition-colors ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-rose-600 dark:text-rose-400">Replace Mode</div>
                    <div className="text-[11px] opacity-75 mt-0.5">Wipe current database and restore backup exactly.</div>
                  </button>
                </div>
              </div>
            )}

            {/* Submit Import Button */}
            {parsedData && (
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={isImporting}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring data...</span>
                  </>
                ) : (
                  <span>Execute {importMode === 'replace' ? 'Replace' : 'Merge'} Import</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

