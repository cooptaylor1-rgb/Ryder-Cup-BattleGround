/**
 * Match Predictions System
 *
 * Allows players to make predictions before matches:
 * - Pick match winners
 * - Predict overall day outcome
 * - Leaderboard for accuracy
 * - "Called It!" badges
 *
 * Adds a fun competitive layer to spectating.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { uiLogger } from '@/lib/utils/logger';
import {
    Target,
    Check,
    X,
    Sparkles,
    Crown,
    Medal,
} from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/stores';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useHaptic } from '@/lib/hooks/useHaptic';
import type { UUID, ISODateString, Match } from '@/lib/types/models';

// Prediction types
export interface MatchPrediction {
    id: UUID;
    tripId: UUID;
    matchId: UUID;
    predictorId: UUID;
    predictorName: string;
    predictedWinner: 'teamA' | 'teamB' | 'halved';
    confidence?: 'low' | 'medium' | 'high';
    timestamp: ISODateString;
    isCorrect?: boolean;
    settled?: boolean;
}

export interface DayPrediction {
    id: UUID;
    tripId: UUID;
    date: string;
    predictorId: UUID;
    predictorName: string;
    teamAPoints: number;
    teamBPoints: number;
    timestamp: ISODateString;
    actualTeamAPoints?: number;
    actualTeamBPoints?: number;
    pointsEarned?: number;
    settled?: boolean;
}

export interface PredictionLeaderboard {
    playerId: UUID;
    playerName: string;
    correctPredictions: number;
    totalPredictions: number;
    accuracy: number;
    streak: number;
    badges: string[];
}

// Store predictions in a special table (or use banter posts)
const PREDICTION_POST_TYPE = 'prediction';

// Hook for predictions
export function usePredictions() {
    const { currentTrip, players } = useTripStore();
    const { showToast } = useUIStore();
    const { trigger } = useHaptic();

    // Get all predictions
    const predictions = useLiveQuery(
        async () => {
            if (!currentTrip) return [];

            const posts = await db.banterPosts
                .where('tripId')
                .equals(currentTrip.id)
                .filter(p => p.postType === PREDICTION_POST_TYPE)
                .toArray();

            return posts.map(p => {
                const metadata = (p as unknown as { metadata?: Record<string, unknown> }).metadata || {};
                return {
                    id: p.id,
                    tripId: p.tripId,
                    matchId: metadata.matchId as UUID,
                    predictorId: p.authorId || '',
                    predictorName: p.authorName,
                    predictedWinner: metadata.predictedWinner as MatchPrediction['predictedWinner'],
                    confidence: metadata.confidence as MatchPrediction['confidence'],
                    timestamp: p.timestamp,
                    isCorrect: metadata.isCorrect as boolean | undefined,
                    settled: metadata.settled as boolean | undefined,
                } as MatchPrediction;
            });
        },
        [currentTrip?.id],
        []
    );

    // Make a prediction
    const makePrediction = useCallback(async (
        matchId: UUID,
        predictedWinner: MatchPrediction['predictedWinner'],
        confidence?: MatchPrediction['confidence']
    ) => {
        if (!currentTrip) return;

        try {
            const predictor = players[0]; // Use authenticated user in real app

            // Check if already predicted this match
            const existing = predictions.find(
                p => p.matchId === matchId && p.predictorId === predictor?.id
            );

            if (existing) {
                showToast('warning', 'You already made a prediction for this match');
                return;
            }

            const winnerText = predictedWinner === 'teamA' ? 'Team USA' :
                predictedWinner === 'teamB' ? 'Team Europe' : 'Halved';

            const post = {
                id: crypto.randomUUID(),
                tripId: currentTrip.id,
                authorId: predictor?.id,
                authorName: predictor ? `${predictor.firstName} ${predictor.lastName}` : 'Anonymous',
                postType: PREDICTION_POST_TYPE,
                content: `🎯 Predicts ${winnerText}${confidence === 'high' ? ' (Lock 🔒)' : ''}`,
                timestamp: new Date().toISOString(),
                metadata: {
                    matchId,
                    predictedWinner,
                    confidence,
                    settled: false,
                },
            };

            await db.banterPosts.add(post as unknown as Parameters<typeof db.banterPosts.add>[0]);

            trigger('success');
            showToast('success', 'Prediction locked in!');
        } catch (error) {
            uiLogger.error('Failed to save prediction:', error);
            showToast('error', 'Failed to save prediction');
        }
    }, [currentTrip, players, predictions, trigger, showToast]);

    // Get predictions for a specific match
    const getMatchPredictions = useCallback((matchId: UUID) => {
        return predictions.filter(p => p.matchId === matchId);
    }, [predictions]);

    // Get user's prediction for a match
    const getUserPrediction = useCallback((matchId: UUID, userId?: UUID) => {
        const targetUserId = userId || players[0]?.id;
        return predictions.find(p => p.matchId === matchId && p.predictorId === targetUserId);
    }, [predictions, players]);

    // Calculate leaderboard
    const leaderboard: PredictionLeaderboard[] = (() => {
        const playerStats = new Map<UUID, PredictionLeaderboard>();

        predictions.forEach(pred => {
            if (!pred.settled || pred.isCorrect === undefined) return;

            const existing = playerStats.get(pred.predictorId) || {
                playerId: pred.predictorId,
                playerName: pred.predictorName,
                correctPredictions: 0,
                totalPredictions: 0,
                accuracy: 0,
                streak: 0,
                badges: [],
            };

            existing.totalPredictions++;
            if (pred.isCorrect) {
                existing.correctPredictions++;
            }
            existing.accuracy = Math.round((existing.correctPredictions / existing.totalPredictions) * 100);

            playerStats.set(pred.predictorId, existing);
        });

        return Array.from(playerStats.values())
            .sort((a, b) => b.correctPredictions - a.correctPredictions);
    })();

    return {
        predictions,
        makePrediction,
        getMatchPredictions,
        getUserPrediction,
        leaderboard,
    };
}

// Prediction Card for a Match
interface MatchPredictionCardProps {
    match: Match;
    teamAName: string;
    teamBName: string;
    teamAPlayers: string;
    teamBPlayers: string;
    onPredict?: (winner: MatchPrediction['predictedWinner']) => void;
    disabled?: boolean;
}

export function MatchPredictionCard({
    match,
    teamAName,
    teamBName,
    teamAPlayers,
    teamBPlayers,
    onPredict,
    disabled = false,
}: MatchPredictionCardProps) {
    const { getUserPrediction } = usePredictions();
    const userPrediction = getUserPrediction(match.id);
    const isLocked = match.status !== 'scheduled';

    return (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--rule)] p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--ink-tertiary)]">Match {match.matchOrder}</span>
                {userPrediction && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                        <Check size={12} className="inline mr-1" />
                        Predicted
                    </span>
                )}
            </div>

            <div className="space-y-2">
                {/* Team A */}
                <button
                    onClick={() => onPredict?.('teamA')}
                    disabled={disabled || isLocked || !!userPrediction}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all ${userPrediction?.predictedWinner === 'teamA'
                        ? 'ring-2 ring-[var(--team-usa)] bg-[color:var(--team-usa)]/10'
                        : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-[var(--team-usa)]" />
                        <div className="text-left">
                            <div className="font-medium">{teamAName}</div>
                            <div className="text-xs text-[var(--ink-tertiary)]">{teamAPlayers}</div>
                        </div>
                    </div>
                    {userPrediction?.predictedWinner === 'teamA' && (
                        <Target size={18} className="text-[var(--team-usa)]" />
                    )}
                </button>

                {/* Halved */}
                <button
                    onClick={() => onPredict?.('halved')}
                    disabled={disabled || isLocked || !!userPrediction}
                    className={`w-full py-2 px-4 rounded-lg text-sm transition-all ${userPrediction?.predictedWinner === 'halved'
                        ? 'ring-2 ring-[var(--ink-tertiary)] bg-[var(--surface-secondary)]'
                        : 'bg-[var(--surface-secondary)]/70 hover:bg-[var(--surface-tertiary)]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    Halved
                </button>

                {/* Team B */}
                <button
                    onClick={() => onPredict?.('teamB')}
                    disabled={disabled || isLocked || !!userPrediction}
                    className={`w-full py-3 px-4 rounded-xl flex items-center justify-between transition-all ${userPrediction?.predictedWinner === 'teamB'
                        ? 'ring-2 ring-[var(--team-europe)] bg-[color:var(--team-europe)]/10'
                        : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-[var(--team-europe)]" />
                        <div className="text-left">
                            <div className="font-medium">{teamBName}</div>
                            <div className="text-xs text-[var(--ink-tertiary)]">{teamBPlayers}</div>
                        </div>
                    </div>
                    {userPrediction?.predictedWinner === 'teamB' && (
                        <Target size={18} className="text-[var(--team-europe)]" />
                    )}
                </button>
            </div>

            {isLocked && !userPrediction && (
                <p className="text-xs text-[var(--ink-tertiary)] mt-3 text-center">
                    Match started - predictions locked
                </p>
            )}
        </div>
    );
}

// Predictions Leaderboard
export function PredictionsLeaderboard() {
    const { leaderboard } = usePredictions();

    if (leaderboard.length === 0) {
        return (
            <div className="text-center py-8 text-[var(--ink-tertiary)]">
                <Target size={40} className="mx-auto mb-2 opacity-50" />
                <p>No predictions settled yet</p>
                <p className="text-sm">Make predictions to compete!</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {leaderboard.map((entry, index) => (
                <div
                    key={entry.playerId}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                        index === 1 ? 'bg-gray-400/10 border-gray-400/30' :
                            index === 2 ? 'bg-orange-500/10 border-orange-500/30' :
                                'bg-[var(--surface-secondary)] border-[var(--rule)]'
                        }`}
                >
                    {/* Rank */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                        {index === 0 ? <Crown size={20} className="text-yellow-500" /> :
                            index === 1 ? <Medal size={20} className="text-gray-400" /> :
                                index === 2 ? <Medal size={20} className="text-orange-500" /> :
                                    index + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1">
                        <div className="font-medium">{entry.playerName}</div>
                        <div className="text-xs text-[var(--ink-tertiary)]">
                            {entry.correctPredictions}/{entry.totalPredictions} correct • {entry.accuracy}%
                        </div>
                    </div>

                    {/* Badges */}
                    {entry.correctPredictions >= 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600">
                            🎯 Hot Streak
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// Full Predictions Page/Modal
interface PredictionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PredictionsModal({ isOpen, onClose }: PredictionsModalProps) {
    const { currentTrip, sessions, players, teams } = useTripStore();
    const { makePrediction, predictions: _predictions } = usePredictions();
    const [selectedTab, setSelectedTab] = useState<'predict' | 'leaderboard'>('predict');
    const [matches, setMatches] = useState<Match[]>([]);

    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');

    // Load scheduled matches
    useEffect(() => {
        async function loadMatches() {
            if (!currentTrip) return;

            const sessionIds = sessions.map(s => s.id);
            const allMatches = await db.matches
                .where('sessionId')
                .anyOf(sessionIds)
                .filter(m => m.status === 'scheduled')
                .toArray();

            setMatches(allMatches);
        }
        loadMatches();
    }, [currentTrip, sessions]);

    const getPlayerNames = (playerIds: string[]) => {
        return playerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean)
            .map(p => p!.lastName)
            .join('/');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-[var(--rule)]"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-[var(--surface-tertiary)]" />
                        </div>

                        {/* Header */}
                        <div className="px-4 pb-4 flex items-center justify-between border-b border-[var(--rule)]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--masters-subtle)]">
                                    <Target size={20} className="text-[var(--masters)]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">Predictions</h2>
                                    <p className="text-sm text-[var(--ink-tertiary)]">
                                        Pick your winners
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surface-secondary)] transition-colors" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-4 pt-4 flex gap-2">
                            <button
                                onClick={() => setSelectedTab('predict')}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTab === 'predict'
                                    ? 'bg-[var(--masters)] text-white'
                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--ink-primary)]'
                                    }`}
                            >
                                Make Picks
                            </button>
                            <button
                                onClick={() => setSelectedTab('leaderboard')}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTab === 'leaderboard'
                                    ? 'bg-[var(--masters)] text-white'
                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--ink-primary)]'
                                    }`}
                            >
                                Leaderboard
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
                            {selectedTab === 'predict' ? (
                                matches.length > 0 ? (
                                    <div className="space-y-4">
                                        {matches.map(match => (
                                            <MatchPredictionCard
                                                key={match.id}
                                                match={match}
                                                teamAName={teamA?.name || 'USA'}
                                                teamBName={teamB?.name || 'Europe'}
                                                teamAPlayers={getPlayerNames(match.teamAPlayerIds)}
                                                teamBPlayers={getPlayerNames(match.teamBPlayerIds)}
                                                onPredict={(winner) => makePrediction(match.id, winner)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-[var(--ink-tertiary)]">
                                        <Sparkles size={40} className="mx-auto mb-2 opacity-50" />
                                        <p>No upcoming matches to predict</p>
                                    </div>
                                )
                            ) : (
                                <PredictionsLeaderboard />
                            )}
                        </div>

                        {/* Safe area */}
                        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
