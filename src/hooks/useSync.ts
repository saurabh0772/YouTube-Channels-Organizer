import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncStatus } from '../types';

interface UseSyncOptions {
  enabled?: boolean;
  pollIntervalMs?: number; // default 25,000ms (25 seconds)
  onSync: () => Promise<void>;
}

export function useSync({ enabled = true, pollIntervalMs = 25000, onSync }: UseSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const syncSeqRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  const executeSync = useCallback(async () => {
    if (!enabled || isSyncingRef.current) return;

    const currentSeq = ++syncSeqRef.current;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      await onSync();

      // Only update if this is still the newest active request
      if (currentSeq === syncSeqRef.current) {
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        // Return to idle status after 3 seconds
        setTimeout(() => {
          if (currentSeq === syncSeqRef.current) {
            setSyncStatus('idle');
          }
        }, 3000);
      }
    } catch (err) {
      if (currentSeq === syncSeqRef.current) {
        console.error('Sync failure:', err);
        setSyncStatus('error');
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, onSync]);

  // Sync on tab visibility change or window focus
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        executeSync();
      }
    };

    const handleFocus = () => {
      executeSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, executeSync]);

  // Periodic lightweight polling while tab is active
  useEffect(() => {
    if (!enabled || pollIntervalMs <= 0) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        executeSync();
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [enabled, pollIntervalMs, executeSync]);

  return {
    syncStatus,
    lastSyncedAt,
    triggerSync: executeSync,
  };
}

