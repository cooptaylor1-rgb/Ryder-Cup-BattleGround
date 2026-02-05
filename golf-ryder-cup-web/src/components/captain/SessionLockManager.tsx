'use client';

/**
 * SessionLockManager - Captain Session Lock Controls
 *
 * Allows captains to:
 * - Lock/unlock sessions
 * - View lock status and reason
 * - See who locked the session
 * - View audit log of changes
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createSessionLock,
  isEditAllowed,
  requestUnlock,
} from '@/lib/services/sessionLockService';
import type { SessionLock, LockReason } from '@/lib/types/captain';
import type { UUID } from '@/lib/types/models';

interface SessionLockManagerProps {
  sessionId: UUID;
  sessionName: string;
  currentLock?: SessionLock;
  currentUserId: UUID;
  currentUserName: string;
  isCaptain?: boolean;
  onLockChange?: (lock: SessionLock) => void;
  compact?: boolean;
}

export function SessionLockManager({
  sessionId,
  sessionName,
  currentLock,
  currentUserId,
  currentUserName: _currentUserName,
  isCaptain = false,
  onLockChange,
  compact = false,
}: SessionLockManagerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<'lock' | 'unlock' | null>(null);
  const [lockReason, setLockReason] = useState<LockReason>('captain_locked');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const isLocked = currentLock?.isLocked || false;

  // Handle lock/unlock
  const handleLockToggle = useCallback(() => {
    if (isLocked) {
      // Request unlock
      const unlockResult = requestUnlock(currentLock!, currentUserId, 'Manual unlock');

      if (unlockResult.requiresConfirmation) {
        setPendingAction('unlock');
        setShowConfirm(true);
      } else {
        // Unlock directly
        const newLock = createSessionLock(sessionId, false);
        onLockChange?.(newLock);
      }
    } else {
      // Lock session
      setPendingAction('lock');
      setShowConfirm(true);
    }
  }, [isLocked, currentLock, currentUserId, sessionId, onLockChange]);

  // Confirm action
  const confirmAction = useCallback(() => {
    if (pendingAction === 'lock') {
      const newLock = createSessionLock(
        sessionId,
        true,
        lockReason,
        currentUserId,
        false
      );
      onLockChange?.(newLock);
    } else if (pendingAction === 'unlock') {
      const newLock = createSessionLock(sessionId, false);
      onLockChange?.(newLock);
    }

    setShowConfirm(false);
    setPendingAction(null);
  }, [pendingAction, sessionId, lockReason, currentUserId, onLockChange]);

  // Check edit permissions
  const canEditPairings = isEditAllowed(
    currentLock || { sessionId, isLocked: false, autoLocked: false },
    'pairing'
  );

  // Get lock status text
  const getLockStatusText = () => {
    if (!isLocked) return 'Unlocked';
    if (currentLock?.autoLocked) return 'Auto-locked (scoring in progress)';
    return 'Locked by captain';
  };

  // Format timestamp
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Compact mode
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleLockToggle}
          disabled={!isCaptain}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            isLocked
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          } ${!isCaptain ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
          title={isCaptain ? (isLocked ? 'Click to unlock' : 'Click to lock') : 'Only captains can change lock status'}
        >
          <span className="text-lg">{isLocked ? '🔒' : '🔓'}</span>
          <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
        </button>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {pendingAction === 'lock' ? 'Lock Session?' : 'Unlock Session?'}
                </h3>

                {pendingAction === 'unlock' && currentLock?.autoLocked && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                    ⚠️ Unlocking while scoring is in progress may cause data inconsistencies.
                  </p>
                )}

                {pendingAction === 'lock' && (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Lock Reason
                    </label>
                    <select
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value as LockReason)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="captain_locked">Manual lock by captain</option>
                      <option value="scoring_started">Scoring started</option>
                      <option value="lineup_published">Lineup published</option>
                      <option value="match_completed">Match completed</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAction}
                    className={`flex-1 py-2 rounded-lg font-medium text-white ${
                      pendingAction === 'unlock'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {pendingAction === 'lock' ? 'Lock Session' : 'Unlock Session'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full mode
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 ${isLocked ? 'bg-amber-500' : 'bg-green-500'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{isLocked ? '🔒' : '🔓'}</span>
            <div>
              <h2 className="text-xl font-bold text-white">Session Lock</h2>
              <p className={`text-sm ${isLocked ? 'text-amber-100' : 'text-green-100'}`}>
                {sessionName}
              </p>
            </div>
          </div>
          {isCaptain && (
            <button
              onClick={handleLockToggle}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors"
            >
              {isLocked ? 'Unlock' : 'Lock'}
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Lock Status */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <span className={`font-medium ${isLocked ? 'text-amber-600' : 'text-green-600'}`}>
            {getLockStatusText()}
          </span>
        </div>

        {/* Lock Time */}
        {currentLock?.lockedAt && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Locked At</span>
            <span className="text-gray-900 dark:text-white">
              {formatTime(currentLock.lockedAt)}
            </span>
          </div>
        )}

        {/* Edit Permissions */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-white">Edit Permissions</h4>
          <div className="space-y-2">
            {[
              { action: 'pairing' as const, label: 'Edit Pairings', icon: '👥' },
              { action: 'score' as const, label: 'Enter Scores', icon: '📝' },
              { action: 'settings' as const, label: 'Session Settings', icon: '⚙️' },
            ].map(({ action, label, icon }) => {
              const permission = isEditAllowed(
                currentLock || { sessionId, isLocked: false, autoLocked: false },
                action
              );
              return (
                <div
                  key={action}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    permission.allowed
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-gray-900 dark:text-white">{label}</span>
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      permission.allowed ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {permission.allowed ? '✓ Allowed' : '✕ Blocked'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning for blocked actions */}
        {!canEditPairings.allowed && canEditPairings.reason && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              ⚠️ {canEditPairings.reason}
            </p>
          </div>
        )}

        {/* Audit Log Toggle */}
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900
                   dark:hover:text-white flex items-center justify-center gap-2"
        >
          <span>📋</span>
          <span>{showAuditLog ? 'Hide Audit Log' : 'View Audit Log'}</span>
        </button>

        {/* Audit Log Placeholder */}
        <AnimatePresence>
          {showAuditLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Audit log shows all captain actions and changes.
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  Connect to Supabase to enable full audit tracking.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {pendingAction === 'lock' ? 'Lock Session?' : 'Unlock Session?'}
              </h3>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {pendingAction === 'lock'
                  ? 'Locking will prevent changes to pairings and settings until unlocked.'
                  : 'This will allow changes to pairings and settings.'}
              </p>

              {pendingAction === 'unlock' && currentLock?.autoLocked && (
                <p className="text-amber-600 dark:text-amber-400 text-sm mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  ⚠️ Unlocking while scoring is in progress may cause data inconsistencies.
                </p>
              )}

              {pendingAction === 'lock' && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Lock Reason (optional)
                  </label>
                  <select
                    value={lockReason}
                    onChange={(e) => setLockReason(e.target.value as LockReason)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="captain_locked">Manual lock by captain</option>
                    <option value="scoring_started">Scoring started</option>
                    <option value="lineup_published">Lineup published</option>
                    <option value="match_completed">Match completed</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className={`flex-1 py-2 rounded-lg font-medium text-white ${
                    pendingAction === 'unlock'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {pendingAction === 'lock' ? 'Lock Session' : 'Unlock Session'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SessionLockManager;
