/**
 * Victory Modal Component
 *
 * Celebration screen for match and tournament victories featuring:
 * - Animated podium entrance
 * - Confetti burst sequences
 * - Score summary with number animations
 * - Winner spotlight with glow effects
 *
 * Features:
 * - Match win variant
 * - Tournament complete variant
 * - Team-themed celebrations
 * - Haptic feedback integration
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Star, ChevronRight, Share2, X } from 'lucide-react';
import { ConfettiBurst, GoldShimmer } from './ConfettiCannon';

// ============================================
// TYPES
// ============================================

export interface MatchResult {
  winner: 'A' | 'B' | 'tie';
  teamA: {
    name: string;
    players: string[];
    score: number;
  };
  teamB: {
    name: string;
    players: string[];
    score: number;
  };
  margin: string;
  holesPlayed: number;
}

export interface TournamentResult {
  winner: 'A' | 'B';
  teamAScore: number;
  teamBScore: number;
  mvp?: {
    name: string;
    points: number;
    avatarUrl?: string;
  };
  topPerformers: {
    name: string;
    stat: string;
    value: string;
  }[];
}

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: 'match' | 'tournament';
  matchResult?: MatchResult;
  tournamentResult?: TournamentResult;
  onShare?: () => void;
  onViewDetails?: () => void;
}

// ============================================
// VICTORY MODAL
// ============================================

export function VictoryModal({
  isOpen,
  onClose,
  variant,
  matchResult,
  tournamentResult,
  onShare,
  onViewDetails,
}: VictoryModalProps) {
  const [stage, setStage] = useState<'entering' | 'celebrating' | 'showing' | 'idle'>('entering');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStage('entering');
      const timer1 = setTimeout(() => setStage('celebrating'), 300);
      const timer2 = setTimeout(() => {
        setShowConfetti(true);
        setStage('showing');
      }, 600);
      const timer3 = setTimeout(() => setStage('idle'), 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setStage('entering');
      setShowConfetti(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const winnerTeam = variant === 'match'
    ? matchResult?.winner
    : tournamentResult?.winner;

  const teamColor = winnerTeam === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';
  const teamName = winnerTeam === 'A' ? 'USA' : 'Europe';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          stage === 'entering' ? 'opacity-0' : 'opacity-100'
        )}
        style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        onClick={onClose}
      />

      {/* Confetti Layer */}
      <ConfettiBurst
        trigger={showConfetti}
        theme={winnerTeam === 'A' ? 'usa' : 'europe'}
        pattern="explosion"
        particleCount={60}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-md rounded-3xl overflow-hidden transition-all',
          stage === 'entering' && 'opacity-0 scale-90',
          stage === 'celebrating' && 'opacity-100 scale-105',
          stage === 'showing' && 'opacity-100 scale-100',
          stage === 'idle' && 'opacity-100 scale-100'
        )}
        style={{
          background: 'var(--canvas)',
          transitionDuration: '400ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors"
          style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Team Color */}
        <div
          className="relative h-32 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${teamColor}40 0%, ${teamColor}20 100%)`,
          }}
        >
          {/* Glow Effect */}
          <div
            className="absolute inset-0 animate-pulse"
            style={{
              background: `radial-gradient(circle at center, ${teamColor}30 0%, transparent 70%)`,
            }}
          />

          {/* Trophy */}
          <GoldShimmer isActive={stage !== 'entering'}>
            <div
              className={cn(
                'relative transition-all duration-700',
                stage === 'entering' && 'opacity-0 -translate-y-4',
                stage !== 'entering' && 'opacity-100 translate-y-0'
              )}
            >
              <Trophy
                className="w-16 h-16"
                style={{ color: 'var(--warning)' }}
              />
            </div>
          </GoldShimmer>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Victory Text */}
          <div
            className={cn(
              'transition-all duration-500',
              stage === 'entering' && 'opacity-0 translate-y-4',
              stage !== 'entering' && 'opacity-100 translate-y-0'
            )}
            style={{ transitionDelay: '200ms' }}
          >
            <p
              className="text-sm font-medium uppercase tracking-wider mb-1"
              style={{ color: teamColor }}
            >
              {variant === 'match' ? 'Match Complete' : 'Tournament Champion'}
            </p>
            <h2
              className="text-3xl font-bold"
              style={{ color: 'var(--ink)' }}
            >
              {winnerTeam === 'tie' ? "It's a Tie!" : `${teamName} Wins!`}
            </h2>
          </div>

          {/* Score Display */}
          {variant === 'match' && matchResult && (
            <MatchScoreDisplay
              result={matchResult}
              stage={stage}
            />
          )}

          {variant === 'tournament' && tournamentResult && (
            <TournamentScoreDisplay
              result={tournamentResult}
              stage={stage}
            />
          )}

          {/* Actions */}
          <div
            className={cn(
              'flex gap-3 mt-6 transition-all duration-500',
              stage === 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
            style={{ transitionDelay: '600ms' }}
          >
            {onShare && (
              <button
                onClick={onShare}
                className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--ink-secondary)',
                  border: '1px solid var(--rule)',
                }}
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                style={{
                  background: 'var(--masters)',
                  color: 'white',
                }}
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MATCH SCORE DISPLAY
// ============================================

interface MatchScoreDisplayProps {
  result: MatchResult;
  stage: string;
}

function MatchScoreDisplay({ result, stage }: MatchScoreDisplayProps) {
  return (
    <div
      className={cn(
        'mt-6 p-4 rounded-2xl transition-all duration-500',
        stage === 'entering' && 'opacity-0 scale-95',
        stage !== 'entering' && 'opacity-100 scale-100'
      )}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
        transitionDelay: '300ms',
      }}
    >
      <div className="flex items-center justify-center gap-6">
        {/* Team A */}
        <div className="text-center">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--team-usa)' }}
          >
            {result.teamA.name}
          </p>
          <p
            className={cn(
              'text-4xl font-bold transition-all duration-300',
              result.winner === 'A' && 'animate-score-pop'
            )}
            style={{
              color: result.winner === 'A' ? 'var(--team-usa)' : 'var(--ink-secondary)',
            }}
          >
            {result.teamA.score}
          </p>
        </div>

        {/* Divider */}
        <div
          className="text-2xl font-light"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          –
        </div>

        {/* Team B */}
        <div className="text-center">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'var(--team-europe)' }}
          >
            {result.teamB.name}
          </p>
          <p
            className={cn(
              'text-4xl font-bold transition-all duration-300',
              result.winner === 'B' && 'animate-score-pop'
            )}
            style={{
              color: result.winner === 'B' ? 'var(--team-europe)' : 'var(--ink-secondary)',
            }}
          >
            {result.teamB.score}
          </p>
        </div>
      </div>

      {/* Margin */}
      <p
        className="mt-3 text-sm font-medium"
        style={{ color: 'var(--masters)' }}
      >
        {result.margin}
      </p>

      {/* Players */}
      <div
        className="mt-4 pt-4 grid grid-cols-2 gap-4 text-xs"
        style={{ borderTop: '1px solid var(--rule)' }}
      >
        <div>
          {result.teamA.players.map((player, i) => (
            <p key={i} style={{ color: 'var(--ink-secondary)' }}>{player}</p>
          ))}
        </div>
        <div>
          {result.teamB.players.map((player, i) => (
            <p key={i} style={{ color: 'var(--ink-secondary)' }}>{player}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// TOURNAMENT SCORE DISPLAY
// ============================================

interface TournamentScoreDisplayProps {
  result: TournamentResult;
  stage: string;
}

function TournamentScoreDisplay({ result, stage }: TournamentScoreDisplayProps) {
  return (
    <div
      className={cn(
        'mt-6 transition-all duration-500',
        stage === 'entering' && 'opacity-0',
        stage !== 'entering' && 'opacity-100'
      )}
      style={{ transitionDelay: '300ms' }}
    >
      {/* Final Score */}
      <div
        className="p-6 rounded-2xl mb-4"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
        }}
      >
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--team-usa)' }}
            >
              USA
            </p>
            <p
              className="text-5xl font-bold"
              style={{
                color: result.winner === 'A' ? 'var(--team-usa)' : 'var(--ink-secondary)',
              }}
            >
              {result.teamAScore}
            </p>
          </div>

          <div
            className="text-3xl font-light"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            –
          </div>

          <div className="text-center">
            <p
              className="text-sm font-medium mb-1"
              style={{ color: 'var(--team-europe)' }}
            >
              Europe
            </p>
            <p
              className="text-5xl font-bold"
              style={{
                color: result.winner === 'B' ? 'var(--team-europe)' : 'var(--ink-secondary)',
              }}
            >
              {result.teamBScore}
            </p>
          </div>
        </div>
      </div>

      {/* MVP */}
      {result.mvp && (
        <div
          className="p-4 rounded-xl flex items-center gap-3 mb-4"
          style={{
            background: 'linear-gradient(135deg, var(--warning) 0%, #D97706 100%)',
          }}
        >
          <Medal className="w-8 h-8 text-white" />
          <div className="flex-1 text-left">
            <p className="text-white/80 text-xs font-medium">MVP</p>
            <p className="text-white font-bold">{result.mvp.name}</p>
          </div>
          <p className="text-white font-bold text-xl">{result.mvp.points} pts</p>
        </div>
      )}

      {/* Top Performers */}
      {result.topPerformers.length > 0 && (
        <div className="space-y-2">
          {result.topPerformers.map((performer, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--surface)' }}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                <span style={{ color: 'var(--ink)' }}>{performer.name}</span>
              </div>
              <div className="text-right">
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--masters)' }}
                >
                  {performer.value}
                </span>
                <span
                  className="text-xs ml-1"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  {performer.stat}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// QUICK VICTORY TOAST
// ============================================

interface VictoryToastProps {
  isVisible: boolean;
  message: string;
  subMessage?: string;
  icon?: ReactNode;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export function VictoryToast({
  isVisible,
  message,
  subMessage,
  icon,
  onClose,
  duration = 4000,
  className,
}: VictoryToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 left-4 right-4 z-50 transition-all duration-500',
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      <div
        className="p-4 rounded-2xl shadow-lg flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)',
        }}
      >
        <div className="flex-shrink-0">
          {icon || <Trophy className="w-6 h-6 text-white" />}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{message}</p>
          {subMessage && (
            <p className="text-white/70 text-sm">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VictoryModal;
