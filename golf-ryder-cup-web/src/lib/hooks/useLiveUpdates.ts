/**
 * useLiveUpdates Hook — Phase 5: Data Integration
 *
 * Real-time updates for live matches and trip data:
 * - Subscribe to match score changes
 * - Listen for player activity
 * - Handle reconnection gracefully
 * - Optimistic UI updates
 *
 * Powers the live experience across the app.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { createLogger } from '../utils/logger';

const logger = createLogger('LiveUpdates');

// ============================================
// TYPES
// ============================================

export type LiveUpdateType =
    | 'score_update'
    | 'match_complete'
    | 'match_started'
    | 'player_joined'
    | 'player_left'
    | 'chat_message'
    | 'reaction'
    | 'achievement'
    | 'photo_added'
    | 'standings_change';

export interface LiveUpdate<T = unknown> {
    id: string;
    type: LiveUpdateType;
    payload: T;
    timestamp: string;
    tripId: string;
    matchId?: string;
    playerId?: string;
}

export interface ScoreUpdatePayload {
    matchId: string;
    holeNumber: number;
    team1Score: number;
    team2Score: number;
    scoredBy: string;
}

export interface MatchCompletePayload {
    matchId: string;
    winner: 'team1' | 'team2' | 'halved';
    result: string;
    team1Points: number;
    team2Points: number;
}

export interface ReactionPayload {
    targetId: string;
    targetType: 'match' | 'photo' | 'achievement';
    emoji: string;
    playerId: string;
    playerName: string;
}

interface UseLiveUpdatesOptions {
    tripId: string;
    matchId?: string;
    onUpdate?: (update: LiveUpdate) => void;
    enabled?: boolean;
}

interface UseLiveUpdatesReturn {
    updates: LiveUpdate[];
    latestUpdate: LiveUpdate | null;
    isConnected: boolean;
    isReconnecting: boolean;
    connectionAttempts: number;
    subscribe: (types: LiveUpdateType[]) => void;
    unsubscribe: (types: LiveUpdateType[]) => void;
    clearUpdates: () => void;
}

// ============================================
// MOCK WEBSOCKET (replace with real implementation)
// ============================================

class MockWebSocket {
    private callbacks: Map<string, Set<(data: unknown) => void>> = new Map();
    private isConnected = true;

    on(event: string, callback: (data: unknown) => void) {
        if (!this.callbacks.has(event)) {
            this.callbacks.set(event, new Set());
        }
        this.callbacks.get(event)?.add(callback);
    }

    off(event: string, callback: (data: unknown) => void) {
        this.callbacks.get(event)?.delete(callback);
    }

    emit(event: string, data: unknown) {
        this.callbacks.get(event)?.forEach((cb) => cb(data));
    }

    close() {
        this.isConnected = false;
        this.emit('disconnect', {});
    }

    // Simulate incoming updates
    simulateUpdate(update: LiveUpdate) {
        this.emit('update', update);
    }
}

// Singleton mock socket
let mockSocket: MockWebSocket | null = null;

function getMockSocket(): MockWebSocket {
    if (!mockSocket) {
        mockSocket = new MockWebSocket();
    }
    return mockSocket;
}

// ============================================
// MAIN HOOK
// ============================================

export function useLiveUpdates({
    tripId,
    matchId,
    onUpdate,
    enabled = true,
}: UseLiveUpdatesOptions): UseLiveUpdatesReturn {
    const isOnline = useOnlineStatus();
    const [updates, setUpdates] = useState<LiveUpdate[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const [subscribedTypes, setSubscribedTypes] = useState<Set<LiveUpdateType>>(new Set());

    const socketRef = useRef<MockWebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onUpdateRef = useRef(onUpdate);
    const connectRef = useRef<(() => void) | null>(null);

    // Keep callback ref updated
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // Handle incoming update
    const handleUpdate = useCallback(
        (data: unknown) => {
            const update = data as LiveUpdate;
            // Filter by subscribed types
            if (subscribedTypes.size > 0 && !subscribedTypes.has(update.type)) {
                return;
            }

            // Filter by trip/match
            if (update.tripId !== tripId) return;
            if (matchId && update.matchId && update.matchId !== matchId) return;

            setUpdates((prev: LiveUpdate[]) => {
                // Dedupe by ID
                if (prev.some((u: LiveUpdate) => u.id === update.id)) return prev;

                // Keep last 100 updates
                const newUpdates = [update, ...prev].slice(0, 100);
                return newUpdates;
            });

            // Call callback
            onUpdateRef.current?.(update);
        },
        [tripId, matchId, subscribedTypes]
    );

    // Connect to socket
    const connect = useCallback(() => {
        if (!enabled || !isOnline) return;

        try {
            socketRef.current = getMockSocket();

            socketRef.current.on('update', handleUpdate);

            socketRef.current.on('connect', () => {
                setIsConnected(true);
                setIsReconnecting(false);
                setConnectionAttempts(0);
            });

            socketRef.current.on('disconnect', () => {
                setIsConnected(false);

                // Auto-reconnect
                if (enabled) {
                    setIsReconnecting(true);
                    const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        setConnectionAttempts((c: number) => c + 1);
                        connectRef.current?.();
                    }, delay);
                }
            });

            // Simulate connected
            setIsConnected(true);
        } catch (err) {
            logger.error('Socket connection error:', err);
            setIsConnected(false);
        }
    }, [enabled, isOnline, handleUpdate, connectionAttempts]);

    // Keep connect ref updated
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (socketRef.current) {
            socketRef.current.off('update', handleUpdate);
            socketRef.current.close();
            socketRef.current = null;
        }

        setIsConnected(false);
        setIsReconnecting(false);
    }, [handleUpdate]);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        if (enabled && isOnline) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, isOnline, connect, disconnect]);

    // Reconnect when coming back online
    useEffect(() => {
        if (isOnline && enabled && !isConnected && !isReconnecting) {
            connect();
        }
    }, [isOnline, enabled, isConnected, isReconnecting, connect]);

    // Subscribe to specific update types
    const subscribe = useCallback((types: LiveUpdateType[]) => {
        setSubscribedTypes((prev: Set<LiveUpdateType>) => {
            const next = new Set(prev);
            types.forEach((t) => next.add(t));
            return next;
        });
    }, []);

    // Unsubscribe from types
    const unsubscribe = useCallback((types: LiveUpdateType[]) => {
        setSubscribedTypes((prev: Set<LiveUpdateType>) => {
            const next = new Set(prev);
            types.forEach((t) => next.delete(t));
            return next;
        });
    }, []);

    // Clear updates
    const clearUpdates = useCallback(() => {
        setUpdates([]);
    }, []);

    return {
        updates,
        latestUpdate: updates[0] || null,
        isConnected,
        isReconnecting,
        connectionAttempts,
        subscribe,
        unsubscribe,
        clearUpdates,
    };
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Hook for live match score updates only
 */
export function useLiveMatchScores(tripId: string, matchId: string) {
    const { updates, isConnected } = useLiveUpdates({
        tripId,
        matchId,
        enabled: true,
    });

    const scoreUpdates = updates.filter(
        (u): u is LiveUpdate<ScoreUpdatePayload> =>
            u.type === 'score_update' && u.matchId === matchId
    );

    const latestScore = scoreUpdates[0]?.payload || null;

    return {
        scoreUpdates,
        latestScore,
        isConnected,
    };
}

/**
 * Hook for match completion events
 */
export function useMatchCompletions(tripId: string) {
    const [completedMatches, setCompletedMatches] = useState<MatchCompletePayload[]>([]);

    const { updates: _updates } = useLiveUpdates({
        tripId,
        onUpdate: (update) => {
            if (update.type === 'match_complete') {
                setCompletedMatches((prev: MatchCompletePayload[]) => [
                    update.payload as MatchCompletePayload,
                    ...prev,
                ]);
            }
        },
    });

    return {
        completedMatches,
        latestCompletion: completedMatches[0] || null,
    };
}

/**
 * Hook for live reactions
 */
export function useLiveReactions(tripId: string, targetId?: string) {
    const [reactions, setReactions] = useState<ReactionPayload[]>([]);

    useLiveUpdates({
        tripId,
        onUpdate: (update) => {
            if (update.type === 'reaction') {
                const payload = update.payload as ReactionPayload;
                if (!targetId || payload.targetId === targetId) {
                    setReactions((prev: ReactionPayload[]) => [payload, ...prev].slice(0, 50));
                }
            }
        },
    });

    return {
        reactions,
        reactionCount: reactions.length,
    };
}

export default useLiveUpdates;
