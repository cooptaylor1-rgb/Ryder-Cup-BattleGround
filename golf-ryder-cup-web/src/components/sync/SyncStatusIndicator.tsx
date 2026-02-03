'use client';

/**
 * SyncStatusIndicator - Real-time Sync Status Display
 *
 * Shows sync status with:
 * - Online/offline status
 * - Pending sync count
 * - Last sync time
 * - Active viewers (presence)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingScoringEvents, syncPendingScores } from '@/lib/services/backgroundSyncService';
import type { PlayerPresence } from '@/lib/services/realtimeSyncService';

interface SyncStatusIndicatorProps {
  tripId: string;
  presences?: PlayerPresence[];
  compact?: boolean;
  className?: string;
}

type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export function SyncStatusIndicator({
  tripId: _tripId,
  presences = [],
  compact = false,
  className = '',
}: SyncStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Check pending events
  const checkPending = useCallback(async () => {
    try {
      const pending = await getPendingScoringEvents();
      setPendingCount(pending.length);

      if (!isOnline) {
        setSyncStatus('offline');
      } else if (pending.length > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
      }
    } catch {
      // Silently handle errors
    }
  }, [isOnline]);

  // Manual sync
  const handleManualSync = useCallback(async () => {
    if (!isOnline) return;

    setSyncStatus('syncing');
    setSyncError(null);

    try {
      const result = await syncPendingScores();

      if (result.failed > 0) {
        setSyncError(`${result.failed} events failed to sync`);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      }

      setPendingCount(0);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Sync failed');
      setSyncStatus('error');
    }
  }, [isOnline]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('pending');
      // Auto-sync will happen via the handleManualSync effect dependency
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll for pending events
  useEffect(() => {
    const kickoff = setTimeout(() => {
      void checkPending();
    }, 0);
    const interval = setInterval(() => {
      void checkPending();
    }, 5000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(interval);
    };
  }, [checkPending]);

  // Get status icon
  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'synced':
        return '✓';
      case 'syncing':
        return '↻';
      case 'pending':
        return '↑';
      case 'offline':
        return '⊘';
      case 'error':
        return '!';
      default:
        return '?';
    }
  };

  // Get status color classes
  const getStatusColor = () => {
    switch (syncStatus) {
      case 'synced':
        return 'bg-green-500 text-white';
      case 'syncing':
        return 'bg-blue-500 text-white animate-pulse';
      case 'pending':
        return 'bg-amber-500 text-white';
      case 'offline':
        return 'bg-gray-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (syncStatus) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return `${pendingCount} pending`;
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Sync error';
      default:
        return 'Unknown';
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Compact mode
  if (compact) {
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`relative flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()} ${className}`}
        title={getStatusText()}
      >
        <span className={syncStatus === 'syncing' ? 'animate-spin' : ''}>
          {getStatusIcon()}
        </span>
        {pendingCount > 0 && syncStatus !== 'syncing' && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-[10px] flex items-center justify-center">
            {pendingCount}
          </span>
        )}

        {/* Expanded dropdown */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>

                {lastSyncTime && (
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                    <span>Last sync</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatTimeAgo(lastSyncTime)}
                    </span>
                  </div>
                )}

                {presences.length > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 text-xs">
                      {presences.length} online
                    </span>
                  </div>
                )}

                {syncStatus !== 'synced' && syncStatus !== 'syncing' && isOnline && (
                  <button
                    onClick={handleManualSync}
                    className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                  >
                    Sync Now
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  }

  // Full mode
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <span className="text-lg">📡</span>
          Sync Status
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()} {getStatusText()}
        </div>
      </div>

      {/* Status Details */}
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Connection</span>
          <span className={`flex items-center gap-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Pending Count */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Pending Changes</span>
          <span className={`font-medium ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>
            {pendingCount}
          </span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Last Sync</span>
          <span className="text-gray-900 dark:text-white">
            {lastSyncTime ? formatTimeAgo(lastSyncTime) : 'Never'}
          </span>
        </div>

        {/* Error Message */}
        {syncError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>
          </div>
        )}

        {/* Active Viewers */}
        {presences.length > 0 && (
          <div className="pt-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Active Viewers ({presences.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {presences.map((presence) => (
                <div
                  key={presence.playerId}
                  className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      presence.status === 'scoring'
                        ? 'bg-amber-500 animate-pulse'
                        : presence.status === 'online'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {presence.playerName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sync Button */}
        {syncStatus !== 'synced' && syncStatus !== 'syncing' && isOnline && (
          <button
            onClick={handleManualSync}
            className="w-full mt-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sync Now
          </button>
        )}

        {/* Syncing Animation */}
        {syncStatus === 'syncing' && (
          <div className="flex items-center justify-center py-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            />
            <span className="ml-2 text-blue-600 dark:text-blue-400">Syncing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncStatusIndicator;
