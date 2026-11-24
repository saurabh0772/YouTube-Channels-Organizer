import React from 'react';
import { 
  Youtube, 
  Folder, 
  Film, 
  Sun, 
  Moon, 
  Lock, 
  RefreshCw, 
  Database,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { SyncStatus, Channel, Video } from '../types';

interface NavbarProps {
  currentChannel: Channel | null;
  currentVideo: Video | null;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  onNavigateHome: () => void;
  onNavigateChannel: () => void;
  onTriggerSync: () => void;
  onOpenBackup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentChannel,
  currentVideo,
  syncStatus,
  lastSyncedAt,
  onNavigateHome,
  onNavigateChannel,
  onTriggerSync,
  onOpenBackup,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { logout, isDefaultPasscode } = useAuth();

  const getSyncBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </span>
        );
      case 'synced':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Synced</span>
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span className="hidden sm:inline">Offline</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
            <span className="hidden md:inline">
              {lastSyncedAt ? `${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Ready'}
            </span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Logo & Breadcrumbs */}
          <div className="flex items-center min-w-0 space-x-1.5 sm:space-x-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base sm:text-lg tracking-tight hover:opacity-85 transition-opacity shrink-0"
              title="YouTube Content HQ - Home"
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm shadow-red-500/20">
                <Youtube className="w-5 h-5 fill-current" />
              </div>
              <span className="hidden md:inline-block">YouTube Content HQ</span>
              <span className="md:hidden">HQ</span>
            </button>

            {/* Breadcrumb Trail */}
            {(currentChannel || currentVideo) && (
              <div className="flex items-center text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mx-0.5 sm:mx-1" />
                {currentChannel && (
                  <button
                    onClick={onNavigateChannel}
                    className={`flex items-center gap-1 truncate hover:text-brand-600 dark:hover:text-brand-400 transition-colors ${
                      !currentVideo ? 'text-slate-900 dark:text-slate-100 font-semibold' : ''
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500 hidden sm:inline" />
                    <span className="truncate max-w-[100px] sm:max-w-[160px]">{currentChannel.name}</span>
                  </button>
                )}

                {currentVideo && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mx-0.5 sm:mx-1" />
                    <span className="text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-1 truncate max-w-[110px] sm:max-w-[200px]">
                      <Film className="w-3.5 h-3.5 shrink-0 text-brand-500 hidden sm:inline" />
                      <span className="truncate">#{currentVideo.video_number}</span>
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Sync, Theme, Lock */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Sync Status indicator & Refresh Trigger */}
            <button
              onClick={onTriggerSync}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Click to manually refresh data"
            >
              {getSyncBadge()}
              <RefreshCw
                className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${
                  syncStatus === 'syncing' ? 'animate-spin' : ''
                }`}
              />
            </button>

            {/* Backup & Restore Modal Button */}
            <button
              onClick={onOpenBackup}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Backup & Restore Data (JSON)"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Lock / Logout Button */}
            <button
              onClick={logout}
              className="flex items-center gap-1 p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Lock device / Log out session"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Warning banner if default passcode is active */}
      {isDefaultPasscode && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-1 text-center text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Local test mode: default passcode is <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900 px-1 rounded">admin123</code>. Configure <code className="font-mono">AUTH_PASSCODE</code> in production Cloudflare settings.</span>
        </div>
      )}
    </header>
  );
};

