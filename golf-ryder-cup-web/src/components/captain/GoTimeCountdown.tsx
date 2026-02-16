/**
 * Go Time Countdown
 *
 * Visible countdown timer to first tee with smart reminders.
 * Helps captains and players stay on schedule.
 *
 * Features:
 * - Large visual countdown display
 * - Milestone alerts (30 min, 15 min, 5 min, NOW)
 * - Integration with phone alarms
 * - Color-coded urgency states
 * - Multiple session countdowns
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Bell,
    BellOff,
    Play,
    Pause,
    RotateCcw,
    CheckCircle2,
    Volume2,
    VolumeX,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface CountdownSession {
    id: string;
    name: string;
    targetTime: Date;
    isActive: boolean;
}

export interface CountdownAlert {
    minutesBefore: number;
    label: string;
    played: boolean;
    sound?: boolean;
    vibrate?: boolean;
}

interface GoTimeCountdownProps {
    sessions?: CountdownSession[];
    onTimeUp?: (sessionId: string) => void;
    onAlertTriggered?: (sessionId: string, alert: CountdownAlert) => void;
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_ALERTS: CountdownAlert[] = [
    { minutesBefore: 30, label: '30 minutes to go', played: false, sound: true, vibrate: false },
    { minutesBefore: 15, label: '15 minutes to go', played: false, sound: true, vibrate: true },
    { minutesBefore: 5, label: '5 minutes to go!', played: false, sound: true, vibrate: true },
    { minutesBefore: 2, label: '2 minutes - gather at tee!', played: false, sound: true, vibrate: true },
    { minutesBefore: 0, label: 'GO TIME!', played: false, sound: true, vibrate: true },
];

// ============================================
// UTILITIES
// ============================================

function formatTime(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
    if (totalSeconds <= 0) {
        return { hours: 0, minutes: 0, seconds: 0 };
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return { hours, minutes, seconds };
}

function getUrgencyColor(minutesLeft: number): { bg: string; text: string; glow: string } {
    if (minutesLeft <= 0) {
        return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' };
    }
    if (minutesLeft <= 5) {
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', glow: 'rgba(239, 68, 68, 0.3)' };
    }
    if (minutesLeft <= 15) {
        return { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', glow: 'rgba(251, 191, 36, 0.3)' };
    }
    if (minutesLeft <= 30) {
        return { bg: 'rgba(251, 191, 36, 0.1)', text: '#f59e0b', glow: 'none' };
    }
    return { bg: 'var(--surface)', text: 'var(--masters)', glow: 'none' };
}

// ============================================
// COUNTDOWN DISPLAY
// ============================================

interface CountdownDisplayProps {
    hours: number;
    minutes: number;
    seconds: number;
    urgencyColor: { bg: string; text: string; glow: string };
    isRunning: boolean;
    label?: string;
}

function CountdownDisplay({ hours, minutes, seconds, urgencyColor, isRunning, label }: CountdownDisplayProps) {
    const padNumber = (n: number) => n.toString().padStart(2, '0');

    return (
        <div className="text-center">
            {label && (
                <p className="text-sm font-medium mb-2" style={{ color: urgencyColor.text }}>
                    {label}
                </p>
            )}
            <div
                className="inline-flex items-center justify-center rounded-2xl p-6 transition-all duration-500"
                style={{
                    background: urgencyColor.bg,
                    boxShadow: urgencyColor.glow !== 'none' ? `0 0 30px ${urgencyColor.glow}` : undefined,
                }}
            >
                <div className="flex items-baseline gap-1 font-mono">
                    {hours > 0 && (
                        <>
                            <motion.span
                                key={hours}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-5xl font-bold"
                                style={{ color: urgencyColor.text }}
                            >
                                {padNumber(hours)}
                            </motion.span>
                            <span className="text-2xl" style={{ color: urgencyColor.text }}>:</span>
                        </>
                    )}
                    <motion.span
                        key={minutes}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-bold"
                        style={{ color: urgencyColor.text }}
                    >
                        {padNumber(minutes)}
                    </motion.span>
                    <span className="text-2xl" style={{ color: urgencyColor.text }}>:</span>
                    <motion.span
                        key={seconds}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-bold tabular-nums"
                        style={{ color: urgencyColor.text }}
                    >
                        {padNumber(seconds)}
                    </motion.span>
                </div>
            </div>
            {isRunning && (
                <motion.div
                    className="mt-3 w-2 h-2 rounded-full mx-auto"
                    style={{ background: urgencyColor.text }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                />
            )}
        </div>
    );
}

// ============================================
// GO TIME COUNTDOWN
// ============================================

export function GoTimeCountdown({
    sessions = [],
    onTimeUp,
    onAlertTriggered,
    className,
}: GoTimeCountdownProps) {
    const [activeSessionId, setActiveSessionId] = useState<string | null>(
        sessions[0]?.id || null
    );
    const [alerts, setAlerts] = useState<CountdownAlert[]>(DEFAULT_ALERTS);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [showSettings, setShowSettings] = useState(false);

    const activeSession = useMemo(() =>
        sessions.find(s => s.id === activeSessionId),
        [sessions, activeSessionId]
    );

    // Calculate time left
    useEffect(() => {
        if (!activeSession || isPaused) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = Math.floor((activeSession.targetTime.getTime() - now.getTime()) / 1000);
            return Math.max(0, diff);
        };

        // Defer initial setState to avoid cascading renders
        const initialTimeoutId = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 0);

        const interval = setInterval(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);

            // Check for alerts
            const minutesLeft = Math.floor(newTimeLeft / 60);

            alerts.forEach((alert, idx) => {
                if (!alert.played && minutesLeft <= alert.minutesBefore && newTimeLeft > 0) {
                    // Trigger alert
                    setAlerts(prev => prev.map((a, i) =>
                        i === idx ? { ...a, played: true } : a
                    ));

                    if (soundEnabled && alert.sound) {
                        // Play sound
                        try {
                            const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                            const oscillator = audioContext.createOscillator();
                            const gainNode = audioContext.createGain();

                            oscillator.connect(gainNode);
                            gainNode.connect(audioContext.destination);

                            oscillator.frequency.value = 880;
                            oscillator.type = 'sine';
                            gainNode.gain.value = 0.1;

                            oscillator.start();
                            setTimeout(() => oscillator.stop(), 200);
                        } catch {
                            // Audio not supported
                        }
                    }

                    if (alert.vibrate && 'vibrate' in navigator) {
                        navigator.vibrate([200, 100, 200]);
                    }

                    onAlertTriggered?.(activeSession.id, alert);
                }
            });

            if (newTimeLeft === 0) {
                onTimeUp?.(activeSession.id);
            }
        }, 1000);

        return () => {
            clearTimeout(initialTimeoutId);
            clearInterval(interval);
        };
    }, [activeSession, isPaused, alerts, soundEnabled, onTimeUp, onAlertTriggered]);

    // Reset alerts when session changes
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setAlerts(DEFAULT_ALERTS.map(a => ({ ...a, played: false })));
        }, 0);
        return () => clearTimeout(timeoutId);
    }, [activeSessionId]);

    const { hours, minutes, seconds } = formatTime(timeLeft);
    const minutesLeft = Math.floor(timeLeft / 60);
    const urgencyColor = getUrgencyColor(minutesLeft);

    const handleReset = useCallback(() => {
        setAlerts(DEFAULT_ALERTS.map(a => ({ ...a, played: false })));
        setIsPaused(false);
    }, []);

    const toggleAlert = (index: number) => {
        setAlerts(prev => prev.map((a, i) =>
            i === index ? { ...a, sound: !a.sound, vibrate: !a.vibrate } : a
        ));
    };

    if (sessions.length === 0) {
        return (
            <div className={cn('p-8 text-center', className)}>
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--ink-muted)' }} />
                <p style={{ color: 'var(--ink-muted)' }}>No sessions scheduled</p>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Go Time
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {activeSession?.name || 'Select a session'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="p-2 rounded-lg hover:bg-[var(--canvas)]/10 transition-colors"
                        >
                            {soundEnabled ? (
                                <Volume2 className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                            ) : (
                                <VolumeX className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                            )}
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                showSettings ? 'bg-[var(--canvas)]/10' : ''
                            )}
                        >
                            <Settings className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Session Tabs */}
            {sessions.length > 1 && (
                <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <div className="flex gap-2 overflow-x-auto">
                        {sessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => setActiveSessionId(session.id)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors'
                                )}
                                style={{
                                    background: activeSessionId === session.id ? 'var(--masters-muted)' : 'var(--surface)',
                                    color: activeSessionId === session.id ? 'var(--masters)' : 'var(--ink)',
                                    border: '1px solid rgba(128, 120, 104, 0.2)',
                                }}
                            >
                                {session.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Countdown */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <AnimatePresence mode="wait">
                    {timeLeft > 0 ? (
                        <motion.div
                            key="countdown"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <CountdownDisplay
                                hours={hours}
                                minutes={minutes}
                                seconds={seconds}
                                urgencyColor={urgencyColor}
                                isRunning={!isPaused}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="go-time"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="text-6xl font-bold mb-4"
                                style={{ color: '#ef4444' }}
                            >
                                GO TIME!
                            </motion.div>
                            <p style={{ color: 'var(--ink-muted)' }}>Head to the first tee!</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Target Time */}
                {activeSession && (
                    <p className="mt-6 text-sm" style={{ color: 'var(--ink-muted)' }}>
                        First tee: {activeSession.targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-center gap-4">
                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className="p-4 rounded-full hover:bg-[var(--canvas)]/10 transition-colors"
                        style={{ background: 'var(--surface)' }}
                    >
                        {isPaused ? (
                            <Play className="w-6 h-6" style={{ color: 'var(--masters)' }} />
                        ) : (
                            <Pause className="w-6 h-6" style={{ color: 'var(--ink-muted)' }} />
                        )}
                    </button>
                    <button
                        onClick={handleReset}
                        className="p-4 rounded-full bg-[var(--surface)] hover:bg-[var(--canvas)]/10 transition-colors"
                    >
                        <RotateCcw className="w-6 h-6" style={{ color: 'var(--ink-muted)' }} />
                    </button>
                </div>
            </div>

            {/* Alert Settings */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t overflow-hidden border-[rgba(128,120,104,0.2)] bg-[var(--surface)]"
                    >
                        <div className="p-4">
                            <p className="text-sm font-medium mb-3 text-[var(--ink-muted)]">
                                Alert Schedule
                            </p>
                            <div className="space-y-2">
                                {alerts.map((alert, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--canvas)]"
                                    >
                                        <div className="flex items-center gap-3">
                                            {alert.played ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : alert.sound ? (
                                                <Bell className="w-4 h-4" style={{ color: 'var(--masters)' }} />
                                            ) : (
                                                <BellOff className="w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                                            )}
                                            <span className="text-sm text-[var(--ink)]">
                                                {alert.label}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => toggleAlert(idx)}
                                            className={cn(
                                                'px-2 py-1 rounded text-xs',
                                                alert.sound
                                                    ? 'bg-green-500/20 text-green-500'
                                                    : 'bg-gray-500/20 text-[var(--ink-muted)]'
                                            )}
                                        >
                                            {alert.sound ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default GoTimeCountdown;
