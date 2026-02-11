/**
 * Live Score Notification Service
 *
 * Handles push notifications for live score updates:
 * - Team standings changes
 * - Match completions
 * - Your match updates
 * - Clinching scenarios
 *
 * Uses Web Push API when available, falls back to in-app notifications.
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useTripStore } from '@/lib/stores';
import { useUIStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateTeamStandings, calculateMagicNumber } from '@/lib/services/tournamentEngine';
import type { TeamStandings } from '@/lib/types/computed';
import { notifyLogger } from '@/lib/utils/logger';

interface ScoreNotificationOptions {
    enablePush?: boolean;
    enableSound?: boolean;
    enableVibration?: boolean;
    notifyOnStandingsChange?: boolean;
    notifyOnMatchComplete?: boolean;
    notifyOnYourMatch?: boolean;
    notifyOnClinch?: boolean;
}

const DEFAULT_OPTIONS: ScoreNotificationOptions = {
    enablePush: true,
    enableSound: true,
    enableVibration: true,
    notifyOnStandingsChange: true,
    notifyOnMatchComplete: true,
    notifyOnYourMatch: true,
    notifyOnClinch: true,
};

// Request push notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        notifyLogger.log('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

// Send a push notification
export function sendNotification(
    title: string,
    body: string,
    options?: {
        icon?: string;
        badge?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
        silent?: boolean;
        vibrate?: number[];
    }
): Notification | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return null;
    }

    const notification = new Notification(title, {
        body,
        icon: options?.icon || '/icons/icon-192x192.png',
        badge: options?.badge || '/icons/icon-72x72.png',
        tag: options?.tag,
        data: options?.data,
        requireInteraction: options?.requireInteraction || false,
        silent: options?.silent || false,
        // Note: vibrate is handled via navigator.vibrate() after showing notification
    });

    // Trigger vibration separately if supported
    if (options?.vibrate && 'vibrate' in navigator) {
        navigator.vibrate(options.vibrate);
    }

    return notification;
}

// Hook for live score notifications
export function useLiveScoreNotifications(
    options: ScoreNotificationOptions = DEFAULT_OPTIONS
) {
    const { currentTrip, teams } = useTripStore();
    const { showToast } = useUIStore();
    const previousStandings = useRef<TeamStandings | null>(null);
    const previousMatchResults = useRef<Map<string, string>>(new Map());

    // Get team names
    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');
    const teamAName = teamA?.name || 'USA';
    const teamBName = teamB?.name || 'Europe';

    // Watch for match completions
    const matches = useLiveQuery(
        async () => {
            if (!currentTrip) return [];
            const sessions = await db.sessions
                .where('tripId')
                .equals(currentTrip.id)
                .toArray();
            const sessionIds = sessions.map(s => s.id);
            return db.matches
                .where('sessionId')
                .anyOf(sessionIds)
                .toArray();
        },
        [currentTrip?.id],
        []
    );

    // Check for standings changes
    const checkStandingsChange = useCallback(async () => {
        if (!currentTrip || !options.notifyOnStandingsChange) return;

        try {
            const standings = await calculateTeamStandings(currentTrip.id);
            const magic = calculateMagicNumber(standings);

            if (previousStandings.current) {
                const prev = previousStandings.current;

                // Check if lead changed
                const prevLeader = prev.teamAPoints > prev.teamBPoints ? 'teamA' :
                    prev.teamAPoints < prev.teamBPoints ? 'teamB' : 'tied';
                const newLeader = standings.teamAPoints > standings.teamBPoints ? 'teamA' :
                    standings.teamAPoints < standings.teamBPoints ? 'teamB' : 'tied';

                if (prevLeader !== newLeader && newLeader !== 'tied') {
                    const leaderName = newLeader === 'teamA' ? teamAName : teamBName;
                    const score = `${standings.teamAPoints}-${standings.teamBPoints}`;

                    // Send notification
                    if (options.enablePush) {
                        sendNotification(
                            `${leaderName} takes the lead!`,
                            `Score: ${score}`,
                            {
                                tag: 'standings-change',
                                vibrate: [200, 100, 200],
                                data: { type: 'standings', standings },
                            }
                        );
                    }

                    // Also show toast
                    showToast('success', `${leaderName} takes the lead! ${score}`);

                    // Play sound if enabled
                    if (options.enableSound) {
                        playNotificationSound('lead-change');
                    }
                }

                // Check for clinch scenario
                if (options.notifyOnClinch && magic.teamAClinched) {
                    sendNotification(
                        `${teamAName} clinches the cup! 🏆`,
                        `Final: ${standings.teamAPoints}-${standings.teamBPoints}`,
                        {
                            tag: 'clinch',
                            requireInteraction: true,
                            vibrate: [200, 100, 200, 100, 200],
                        }
                    );
                } else if (options.notifyOnClinch && magic.teamBClinched) {
                    sendNotification(
                        `${teamBName} clinches the cup! 🏆`,
                        `Final: ${standings.teamAPoints}-${standings.teamBPoints}`,
                        {
                            tag: 'clinch',
                            requireInteraction: true,
                            vibrate: [200, 100, 200, 100, 200],
                        }
                    );
                }
            }

            previousStandings.current = standings;
        } catch (error) {
            notifyLogger.error('Failed to check standings:', error);
        }
    }, [currentTrip, options, teamAName, teamBName, showToast]);

    // Check for match completions
    useEffect(() => {
        if (!matches || !options.notifyOnMatchComplete) return;

        matches.forEach(match => {
            const prevResult = previousMatchResults.current.get(match.id);

            if (match.status === 'completed' && prevResult !== 'completed') {
                // Match just completed
                const resultText = match.result === 'teamAWin' ? `${teamAName} wins` :
                    match.result === 'teamBWin' ? `${teamBName} wins` : 'Halved';

                if (options.enablePush) {
                    sendNotification(
                        `Match Complete`,
                        `Match ${match.matchOrder}: ${resultText}`,
                        {
                            tag: `match-${match.id}`,
                            data: { type: 'match-complete', matchId: match.id },
                        }
                    );
                }

                showToast('info', `Match ${match.matchOrder}: ${resultText}`);
            }

            previousMatchResults.current.set(match.id, match.status);
        });

        // Also check standings after any match update
        checkStandingsChange();
    }, [matches, options, teamAName, teamBName, showToast, checkStandingsChange]);

    return {
        requestPermission: requestNotificationPermission,
        sendNotification,
    };
}

// Play notification sound
function playNotificationSound(type: 'lead-change' | 'match-complete' | 'your-match') {
    try {
        const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch (type) {
            case 'lead-change':
                // Triumphant sound
                oscillator.frequency.value = 523.25; // C5
                gainNode.gain.value = 0.15;
                oscillator.start();
                setTimeout(() => {
                    oscillator.frequency.value = 659.25; // E5
                }, 150);
                setTimeout(() => {
                    oscillator.frequency.value = 783.99; // G5
                }, 300);
                setTimeout(() => {
                    oscillator.stop();
                }, 500);
                break;

            case 'match-complete':
                // Short confirmation
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.start();
                setTimeout(() => oscillator.stop(), 150);
                break;

            case 'your-match':
                // Alert sound
                oscillator.frequency.value = 600;
                gainNode.gain.value = 0.15;
                oscillator.start();
                setTimeout(() => {
                    oscillator.frequency.value = 800;
                }, 100);
                setTimeout(() => oscillator.stop(), 200);
                break;
        }
    } catch (error) {
        notifyLogger.error('Failed to play notification sound:', error);
    }
}

// Component to request notification permission
export function NotificationPermissionBanner() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleEnable = async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result === 'granted') {
            setDismissed(true);
        }
    };

    if (dismissed || permission === 'granted' || permission === 'denied') {
        return null;
    }

    return (
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[var(--masters-subtle)]">
                    🔔
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold mb-1">Stay Updated</h3>
                    <p className="text-sm text-[var(--ink-tertiary)] mb-3">
                        Get notified when scores change, matches finish, or your team takes the lead.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={handleEnable} className="btn-primary press-scale px-4 text-sm">
                            Enable Notifications
                        </button>
                        <button onClick={() => setDismissed(true)} className="btn-ghost press-scale px-4 text-sm">
                            Not Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
