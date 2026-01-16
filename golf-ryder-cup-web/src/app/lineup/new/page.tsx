'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import {
  LineupBuilder,
  calculateFairnessScore,
  type MatchSlot,
  type SessionConfig,
  type Player as LineupPlayer,
  type FairnessScore,
} from '@/components/captain';
import {
  ChevronLeft,
  Users,
  AlertTriangle,
  CheckCircle2,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
  Info,
} from 'lucide-react';
import type { SessionType } from '@/lib/types';
import type { ScoringMode } from '@/lib/types/scoringFormats';

/**
 * NEW SESSION / LINEUP PAGE
 *
 * Creates a new Ryder Cup session with lineup management.
 * Two-step flow:
 * 1. Session setup (name, type, date)
 * 2. Lineup builder (drag-drop player assignment)
 *
 * Supports multiple formats:
 * - Match Play: Foursomes, Fourball, Singles
 * - Side Games: Skins, Nassau
 * - Individual: Stableford, Scramble
 */

type FormatCategory = 'match_play' | 'side_game' | 'individual';

interface FormatOption {
  value: string;
  label: string;
  description: string;
  playersPerTeam: number;
  defaultMatches: number;
  category: FormatCategory;
  isTeamBased: boolean;
  scoringMode?: ScoringMode | 'both';
  icon: string;
  comingSoon?: boolean;
}

const ALL_FORMATS: FormatOption[] = [
  // Match Play Formats (Team-based)
  {
    value: 'foursomes',
    label: 'Foursomes',
    description: 'Alternate shot - partners take turns hitting the same ball',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🔄',
  },
  {
    value: 'fourball',
    label: 'Fourball',
    description: 'Best ball - each player plays their own ball, best score counts',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '⚡',
  },
  {
    value: 'singles',
    label: 'Singles',
    description: '1v1 match play - head to head competition',
    playersPerTeam: 1,
    defaultMatches: 12,
    category: 'match_play',
    isTeamBased: true,
    icon: '🎯',
  },
  // Side Game Formats
  {
    value: 'skins',
    label: 'Skins',
    description: 'Hole-by-hole competition - win the hole, win the skin',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    scoringMode: 'both',
    icon: '💰',
  },
  {
    value: 'nassau',
    label: 'Nassau',
    description: 'Three bets in one - front nine, back nine, and overall',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '🎲',
  },
  // Individual Formats
  {
    value: 'stableford',
    label: 'Stableford',
    description: 'Point-based scoring - earn points relative to par',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'net',
    icon: '📊',
  },
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'Team best ball - everyone hits, pick the best shot',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'individual',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '🤝',
  },
];

// Legacy type array for backward compatibility with existing SessionType
const SESSION_TYPES = ALL_FORMATS
  .filter(t => ['foursomes', 'fourball', 'singles'].includes(t.value))
  .map(t => ({
    value: t.value as SessionType,
    label: t.label,
    description: t.description,
    playersPerTeam: t.playersPerTeam,
    defaultMatches: t.defaultMatches,
  }));

const FORMAT_CATEGORIES: { value: FormatCategory; label: string; description: string }[] = [
  { value: 'match_play', label: 'Match Play', description: 'Traditional Ryder Cup formats' },
  { value: 'side_game', label: 'Side Games', description: 'Additional betting formats' },
  { value: 'individual', label: 'Individual', description: 'Stroke-based formats' },
];

type Step = 'setup' | 'lineup';

export default function NewLineupPage() {
  const router = useRouter();
  const { currentTrip, teams, players, teamMembers, addSession } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const [step, setStep] = useState<Step>('setup');
  const [sessionName, setSessionName] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('fourball');
  const [scheduledDate, setScheduledDate] = useState('');
  const [firstTeeTime, setFirstTeeTime] = useState('08:00');
  const [teeTimeInterval, setTeeTimeInterval] = useState(10); // minutes between matches
  const [matchCount, setMatchCount] = useState(4);
  const [pointsPerMatch, setPointsPerMatch] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Generate tee times based on first tee time and interval
  const teeTimes = useMemo(() => {
    const times: string[] = [];
    if (!firstTeeTime) return times;

    const [hours, minutes] = firstTeeTime.split(':').map(Number);
    const baseTime = new Date();
    baseTime.setHours(hours, minutes, 0, 0);

    for (let i = 0; i < matchCount; i++) {
      const matchTime = new Date(baseTime.getTime() + i * teeTimeInterval * 60 * 1000);
      times.push(matchTime.toTimeString().slice(0, 5));
    }
    return times;
  }, [firstTeeTime, teeTimeInterval, matchCount]);

  // Get team players
  const getTeamPlayers = useCallback((teamId: string) => {
    const memberIds = teamMembers
      .filter(tm => tm.teamId === teamId)
      .map(tm => tm.playerId);
    return players.filter(p => memberIds.includes(p.id));
  }, [teamMembers, players]);

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];

  // Convert to LineupBuilder format
  const lineupTeamA: LineupPlayer[] = teamAPlayers.map(p => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'A' as const,
    avatarUrl: p.avatarUrl,
  }));

  const lineupTeamB: LineupPlayer[] = teamBPlayers.map(p => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'B' as const,
    avatarUrl: p.avatarUrl,
  }));

  const selectedType = ALL_FORMATS.find(t => t.value === sessionType) || ALL_FORMATS[0];

  // Session config for lineup builder
  const sessionConfig: SessionConfig = useMemo(() => ({
    id: 'new',
    name: sessionName || `New ${selectedType.label} Session`,
    type: sessionType,
    playersPerTeam: selectedType.playersPerTeam,
    matchCount,
    pointsPerMatch,
  }), [sessionName, sessionType, selectedType, matchCount, pointsPerMatch]);

  // Validation
  const canProceedToLineup = sessionName.trim().length > 0;
  const hasEnoughPlayers = teamAPlayers.length >= selectedType.playersPerTeam * matchCount &&
    teamBPlayers.length >= selectedType.playersPerTeam * matchCount;

  // Handle session type change
  const handleTypeChange = (type: SessionType) => {
    setSessionType(type);
    const typeInfo = SESSION_TYPES.find(t => t.value === type)!;
    setMatchCount(typeInfo.defaultMatches);
  };

  // All lineup players for fairness calculation
  const allLineupPlayers = useMemo(() => [...lineupTeamA, ...lineupTeamB], [lineupTeamA, lineupTeamB]);

  // Calculate fairness
  const calculateFairness = useCallback((matches: MatchSlot[]): FairnessScore => {
    // Convert to format expected by fairness calculator
    const pairings = matches.map(match => ({
      id: match.id,
      teamAPlayers: match.teamAPlayers,
      teamBPlayers: match.teamBPlayers,
    }));
    return calculateFairnessScore(pairings, allLineupPlayers);
  }, [allLineupPlayers]);

  // Auto-fill lineup
  const handleAutoFill = useCallback((): MatchSlot[] => {
    const shuffledA = [...lineupTeamA].sort(() => Math.random() - 0.5);
    const shuffledB = [...lineupTeamB].sort(() => Math.random() - 0.5);

    const matches: MatchSlot[] = [];
    for (let i = 0; i < matchCount; i++) {
      const teamAForMatch: LineupPlayer[] = [];
      const teamBForMatch: LineupPlayer[] = [];

      for (let j = 0; j < selectedType.playersPerTeam; j++) {
        const aIdx = i * selectedType.playersPerTeam + j;
        const bIdx = i * selectedType.playersPerTeam + j;

        if (shuffledA[aIdx]) teamAForMatch.push(shuffledA[aIdx]);
        if (shuffledB[bIdx]) teamBForMatch.push(shuffledB[bIdx]);
      }

      matches.push({
        id: `match-${i + 1}`,
        teamAPlayers: teamAForMatch,
        teamBPlayers: teamBForMatch,
      });
    }

    return matches;
  }, [lineupTeamA, lineupTeamB, matchCount, selectedType.playersPerTeam]);

  // Save lineup
  const handleSave = useCallback(async () => {
    showToast('info', 'Lineup saved as draft');
  }, [showToast]);

  // Publish lineup
  const handlePublish = useCallback(async (_matches: MatchSlot[]) => {
    if (!currentTrip) return;

    setIsCreating(true);
    try {
      // Derive AM/PM from first tee time for session record
      const [hours] = firstTeeTime.split(':').map(Number);
      const derivedTimeSlot: 'AM' | 'PM' = hours < 12 ? 'AM' : 'PM';

      // Create the session
      const session = await addSession({
        tripId: currentTrip.id,
        name: sessionName,
        sessionNumber: 1, // Will be calculated by store
        sessionType,
        scheduledDate: scheduledDate || undefined,
        timeSlot: derivedTimeSlot,
        pointsPerMatch,
        status: 'scheduled',
        isLocked: true,
      });

      // Note: Match tee times (teeTimes array) can be stored on individual matches
      // when the matches are created during lineup building

      showToast('success', 'Session created and lineup published!');

      // Navigate to the session view
      setTimeout(() => {
        router.push(`/lineup/${session.id}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to create session:', error);
      showToast('error', 'Failed to create session');
    } finally {
      setIsCreating(false);
    }
  }, [currentTrip, sessionName, sessionType, scheduledDate, firstTeeTime, pointsPerMatch, addSession, showToast, router]);

  if (!currentTrip || !isCaptainMode) {
    return null;
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === 'lineup' ? setStep('setup') : router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Users size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                  {step === 'setup' ? 'New Session' : 'Build Lineup'}
                </span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  {step === 'setup' ? 'Configure session settings' : sessionName}
                </p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${step === 'setup' ? 'bg-masters' : 'bg-ink-tertiary'}`}
            />
            <span
              className={`w-2 h-2 rounded-full ${step === 'lineup' ? 'bg-masters' : 'bg-ink-tertiary'}`}
            />
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {step === 'setup' ? (
          /* STEP 1: Session Setup */
          <>
            {/* Session Name */}
            <section className="section">
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Friday AM Fourball"
                className="input-field w-full"
                style={{
                  padding: 'var(--space-4)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 500,
                }}
              />
            </section>

            {/* Session Type */}
            <section className="section">
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-4)' }}>
                Format
              </label>

              {/* Format Categories */}
              {FORMAT_CATEGORIES.map(category => {
                const categoryFormats = ALL_FORMATS.filter(f => f.category === category.value);
                return (
                  <div key={category.value} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
                        {category.label}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--ink-tertiary)', opacity: 0.7 }}>
                        {category.description}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {categoryFormats.map(format => {
                        const isSelected = sessionType === format.value;
                        const isMatchPlay = ['foursomes', 'fourball', 'singles'].includes(format.value);

                        return (
                          <button
                            key={format.value}
                            onClick={() => {
                              if (isMatchPlay) {
                                handleTypeChange(format.value as SessionType);
                              } else {
                                // For non-match-play formats, still update state but show coming soon
                                setSessionType(format.value as SessionType);
                                const formatInfo = ALL_FORMATS.find(f => f.value === format.value);
                                if (formatInfo) setMatchCount(formatInfo.defaultMatches);
                              }
                            }}
                            className={`w-full text-left card transition-all ${isSelected ? 'ring-2 ring-masters' : ''} ${!isMatchPlay ? 'opacity-70' : ''}`}
                            style={{ padding: 'var(--space-4)' }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{format.icon}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="type-title-sm">{format.label}</p>
                                    {!isMatchPlay && (
                                      <span
                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{
                                          background: 'var(--canvas-sunken)',
                                          color: 'var(--ink-tertiary)',
                                        }}
                                      >
                                        Coming Soon
                                      </span>
                                    )}
                                    {format.scoringMode && (
                                      <span
                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                        style={{
                                          background: format.scoringMode === 'net' ? 'rgba(0, 103, 71, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                          color: format.scoringMode === 'net' ? 'var(--masters)' : '#3b82f6',
                                        }}
                                      >
                                        {format.scoringMode === 'net' ? 'Net' : format.scoringMode === 'both' ? 'Gross/Net' : 'Gross'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="type-caption" style={{ marginTop: '4px' }}>
                                    {format.description}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 size={20} style={{ color: 'var(--masters)' }} />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Match Count */}
            <section className="section">
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                Number of Matches
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={matchCount}
                  onChange={(e) => setMatchCount(parseInt(e.target.value) || 1)}
                  className="input-field w-24 text-center"
                  style={{ padding: 'var(--space-3)', fontSize: 'var(--text-lg)', fontWeight: 600 }}
                />
                <p className="type-caption">
                  matches ({matchCount * selectedType.playersPerTeam} players per team needed)
                </p>
              </div>
            </section>

            {/* Schedule */}
            <section className="section">
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-4)' }}>
                Schedule (Optional)
              </label>

              {/* Date picker */}
              <div className="mb-4">
                <label className="type-micro block mb-2">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="input-field w-full"
                  style={{ padding: 'var(--space-3)' }}
                />
              </div>

              {/* First Tee Time and Interval */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="type-micro block mb-2">First Tee Time</label>
                  <input
                    type="time"
                    value={firstTeeTime}
                    onChange={(e) => setFirstTeeTime(e.target.value)}
                    className="input-field w-full"
                    style={{ padding: 'var(--space-3)' }}
                  />
                </div>
                <div>
                  <label className="type-micro block mb-2">Interval (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={teeTimeInterval}
                    onChange={(e) => setTeeTimeInterval(parseInt(e.target.value) || 10)}
                    className="input-field w-full text-center"
                    style={{ padding: 'var(--space-3)' }}
                  />
                </div>
              </div>

              {/* Tee Time Preview */}
              {firstTeeTime && matchCount > 0 && (
                <div
                  className="card"
                  style={{
                    padding: 'var(--space-3)',
                    background: 'var(--canvas-sunken)',
                  }}
                >
                  <label className="type-micro block mb-2" style={{ color: 'var(--ink-tertiary)' }}>
                    Tee Times Preview
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {teeTimes.map((time, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--rule)',
                        }}
                      >
                        <span className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                          M{index + 1}
                        </span>
                        <span className="type-caption font-medium">{time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Points */}
            <section className="section">
              <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                Points per Match
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={pointsPerMatch}
                  onChange={(e) => setPointsPerMatch(parseFloat(e.target.value) || 1)}
                  className="input-field w-24 text-center"
                  style={{ padding: 'var(--space-3)', fontSize: 'var(--text-lg)', fontWeight: 600 }}
                />
                <p className="type-caption">
                  points ({matchCount * pointsPerMatch} total available)
                </p>
              </div>
            </section>

            {/* Player Requirements Warning */}
            {!hasEnoughPlayers && (
              <section className="section">
                <div
                  className="card"
                  style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                    <div>
                      <p className="type-title-sm" style={{ color: 'var(--warning)' }}>
                        Not Enough Players
                      </p>
                      <p className="type-caption" style={{ marginTop: '4px' }}>
                        Need {selectedType.playersPerTeam * matchCount} players per team.
                        Currently: Team A ({teamAPlayers.length}), Team B ({teamBPlayers.length})
                      </p>
                      <Link
                        href="/players"
                        className="type-meta inline-block mt-2"
                        style={{ color: 'var(--masters)' }}
                      >
                        Add players →
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Continue Button */}
            <section className="section">
              <button
                onClick={() => setStep('lineup')}
                disabled={!canProceedToLineup}
                className="btn btn-primary w-full"
                style={{
                  padding: 'var(--space-4)',
                  opacity: canProceedToLineup ? 1 : 0.5,
                }}
              >
                Continue to Lineup Builder
              </button>
            </section>
          </>
        ) : (
          /* STEP 2: Lineup Builder */
          <section className="section">
            <LineupBuilder
              session={sessionConfig}
              teamAPlayers={lineupTeamA}
              teamBPlayers={lineupTeamB}
              onSave={handleSave}
              onPublish={handlePublish}
              onAutoFill={handleAutoFill}
              calculateFairness={calculateFairness}
              isLocked={isCreating}
            />

            {!hasEnoughPlayers && (
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Info size={16} style={{ color: 'var(--warning)' }} />
                  <p className="type-caption" style={{ color: 'var(--warning)' }}>
                    Some match slots may be incomplete due to player count
                  </p>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
