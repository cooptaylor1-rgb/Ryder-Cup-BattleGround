'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
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
  Zap,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';
import type { SessionType } from '@/lib/types';
import type { ScoringMode } from '@/lib/types/scoringFormats';
import { EmptyStatePremium } from '@/components/ui';

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

const logger = createLogger('lineup');

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
  // ========== MATCH PLAY FORMATS (Team-based) ==========
  {
    value: 'foursomes',
    label: 'Foursomes (Alternate Shot)',
    description: 'Partners take turns hitting the same ball - traditional Ryder Cup format',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🔄',
  },
  {
    value: 'fourball',
    label: 'Four-Ball (Best Ball)',
    description: 'Each player plays their own ball, best score on each team counts',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '⚡',
  },
  {
    value: 'singles',
    label: 'Match Play (Singles)',
    description: '1v1 head-to-head match play competition',
    playersPerTeam: 1,
    defaultMatches: 12,
    category: 'match_play',
    isTeamBased: true,
    icon: '🎯',
  },
  {
    value: 'pinehurst',
    label: 'Pinehurst (Chapman)',
    description: 'Both tee off, switch balls for 2nd shot, choose one ball to finish',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🔀',
  },
  {
    value: 'greensomes',
    label: 'Greensomes',
    description: 'Both tee off, choose best drive, alternate shots from there',
    playersPerTeam: 2,
    defaultMatches: 4,
    category: 'match_play',
    isTeamBased: true,
    icon: '🎪',
  },

  // ========== TEAM SCRAMBLE FORMATS ==========
  {
    value: 'scramble',
    label: 'Scramble',
    description: 'All players hit, pick best shot, all play from there - repeat',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '🤝',
  },
  {
    value: 'texas-scramble',
    label: 'Texas Scramble',
    description: 'Scramble with minimum drive requirements per player',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '🤠',
  },
  {
    value: 'shamble',
    label: 'Shamble',
    description: 'Scramble off the tee, then everyone plays their own ball',
    playersPerTeam: 4,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '🌟',
  },

  // ========== PROGRESSIVE/ROTATION FORMATS ==========
  {
    value: 'best-2-of-4',
    label: 'Best 2 of 4',
    description: 'Four players, best 2 net scores count on each hole',
    playersPerTeam: 4,
    defaultMatches: 1,
    category: 'match_play',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '✌️',
  },
  {
    value: 'cha-cha-cha',
    label: 'Cha-Cha-Cha',
    description: 'Best 1 score (1-6), best 2 (7-12), all 3 (13-18)',
    playersPerTeam: 3,
    defaultMatches: 1,
    category: 'match_play',
    isTeamBased: true,
    scoringMode: 'net',
    icon: '💃',
  },
  {
    value: 'six-six-six',
    label: 'Sixes (6-6-6)',
    description: 'Format changes every 6 holes: best ball, aggregate, alternate shot',
    playersPerTeam: 2,
    defaultMatches: 2,
    category: 'match_play',
    isTeamBased: true,
    icon: '6️⃣',
  },

  // ========== SIDE GAME / BETTING FORMATS ==========
  {
    value: 'skins',
    label: 'Skins',
    description: 'Win the hole outright to win a skin, ties carry over',
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
  {
    value: 'wolf',
    label: 'Wolf',
    description: 'Rotating wolf picks partner or goes lone wolf against the field',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    scoringMode: 'net',
    icon: '🐺',
  },
  {
    value: 'vegas',
    label: 'Las Vegas',
    description: 'Team scores create a number (4+5=45), lowest wins the difference',
    playersPerTeam: 2,
    defaultMatches: 2,
    category: 'side_game',
    isTeamBased: true,
    scoringMode: 'gross',
    icon: '🎰',
  },
  {
    value: 'bingo-bango-bongo',
    label: 'Bingo Bango Bongo',
    description: '3 points per hole: first on green, closest to pin, first in hole',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'side_game',
    isTeamBased: false,
    scoringMode: 'gross',
    icon: '🎉',
  },

  // ========== INDIVIDUAL / STROKE PLAY FORMATS ==========
  {
    value: 'stroke-play',
    label: 'Stroke Play',
    description: 'Traditional golf - lowest total gross strokes wins',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'gross',
    icon: '🏌️',
  },
  {
    value: 'net-stroke-play',
    label: 'Net Stroke Play',
    description: 'Stroke play with full handicap - lowest net score wins',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'net',
    icon: '📉',
  },
  {
    value: 'stableford',
    label: 'Stableford',
    description: 'Point-based scoring - earn points relative to par on each hole',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'net',
    icon: '📊',
  },
  {
    value: 'modified-stableford',
    label: 'Modified Stableford',
    description: 'Aggressive points - rewards eagles, penalizes bogeys',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'gross',
    icon: '⚡',
  },
  {
    value: 'bogey-golf',
    label: 'Bogey Golf (Par Competition)',
    description: 'Score vs par each hole: beat par (+1), match (0), lose (-1)',
    playersPerTeam: 1,
    defaultMatches: 1,
    category: 'individual',
    isTeamBased: false,
    scoringMode: 'net',
    icon: '🎯',
  },
];

// Legacy type array for backward compatibility with existing SessionType
const SESSION_TYPES = ALL_FORMATS.filter((t) =>
  ['foursomes', 'fourball', 'singles'].includes(t.value)
).map((t) => ({
  value: t.value as SessionType,
  label: t.label,
  description: t.description,
  playersPerTeam: t.playersPerTeam,
  defaultMatches: t.defaultMatches,
}));

// Popular formats shown by default (reduces analysis paralysis)
const POPULAR_FORMATS = ['fourball', 'foursomes', 'singles', 'skins'];

const FORMAT_CATEGORIES: { value: FormatCategory; label: string; description: string }[] = [
  { value: 'match_play', label: 'Match Play', description: 'Traditional Ryder Cup formats' },
  { value: 'side_game', label: 'Side Games', description: 'Additional betting formats' },
  { value: 'individual', label: 'Individual', description: 'Stroke-based formats' },
];

type Step = 'setup' | 'lineup';

// Helper to generate smart session name
function generateSessionName(tripStartDate: string | undefined, existingSessions: number): string {
  const sessionNum = existingSessions + 1;
  const dayNum = sessionNum <= 3 ? sessionNum : Math.ceil(sessionNum / 2);
  const timeSlot = sessionNum % 2 === 1 ? 'AM' : 'PM';
  return `Day ${dayNum} ${timeSlot}`;
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Format explanations for tooltips
const FORMAT_EXPLANATIONS: Record<string, string> = {
  foursomes:
    'Partners share one ball, taking turns hitting. Strategic and builds teamwork. Classic Ryder Cup format.',
  fourball:
    'Each player plays their own ball. Best score on each team wins the hole. Most popular for groups.',
  singles:
    'One-on-one matches. Individual skill determines outcome. Great for the final day drama.',
  pinehurst: 'Both tee off, then switch balls for second shot. Pick one ball to finish. Fun twist!',
  greensomes: 'Both tee off, choose best drive, then alternate from there. Best of both worlds.',
  scramble: 'All hit, pick the best, all play from there. Great for mixed skill levels.',
  skins: 'Win hole outright = win a skin. Ties carry over. High-stakes fun!',
  stableford:
    'Points for each hole based on score vs par. Rewards birdies, limits damage from blowup holes.',
};

export default function NewLineupPage() {
  const router = useRouter();
  const { currentTrip, teams, players, teamMembers, addSession, sessions } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Smart defaults based on existing trip data
  const defaultSessionName = useMemo(
    () => generateSessionName(currentTrip?.startDate, sessions.length),
    [currentTrip?.startDate, sessions.length]
  );

  const defaultDate = useMemo(() => {
    // Default to trip start date if trip exists and hasn't started, otherwise today
    if (currentTrip?.startDate) {
      const tripStart = new Date(currentTrip.startDate);
      const today = new Date();
      return tripStart > today ? currentTrip.startDate : getTodayDate();
    }
    return getTodayDate();
  }, [currentTrip?.startDate]);

  // Smart default tee time based on current time of day
  const defaultTeeTime = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    // If before 11am, default to morning tee time (8:00)
    // If after 11am, default to afternoon tee time (13:00)
    return currentHour < 11 ? '08:00' : '13:00';
  }, []);

  const [step, setStep] = useState<Step>('setup');
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [sessionType, setSessionType] = useState<SessionType>('fourball'); // Most common format
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [firstTeeTime, setFirstTeeTime] = useState(defaultTeeTime);
  const [teeTimeInterval, setTeeTimeInterval] = useState(10); // minutes between matches
  const [matchCount, setMatchCount] = useState(4);
  const [pointsPerMatch, setPointsPerMatch] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tooltipFormat, setTooltipFormat] = useState<string | null>(null);
  const [showAllFormats, setShowAllFormats] = useState(false);

  // Filter formats: show popular by default, all when expanded
  const displayedFormats = useMemo(() => {
    if (showAllFormats) return ALL_FORMATS;
    return ALL_FORMATS.filter((f) => POPULAR_FORMATS.includes(f.value));
  }, [showAllFormats]);

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
  const getTeamPlayers = useCallback(
    (teamId: string) => {
      const memberIds = teamMembers.filter((tm) => tm.teamId === teamId).map((tm) => tm.playerId);
      return players.filter((p) => memberIds.includes(p.id));
    },
    [teamMembers, players]
  );

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];

  // Convert to LineupBuilder format
  const lineupTeamA: LineupPlayer[] = teamAPlayers.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'A' as const,
    avatarUrl: p.avatarUrl,
  }));

  const lineupTeamB: LineupPlayer[] = teamBPlayers.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    handicapIndex: p.handicapIndex ?? 0,
    team: 'B' as const,
    avatarUrl: p.avatarUrl,
  }));

  const selectedType = ALL_FORMATS.find((t) => t.value === sessionType) || ALL_FORMATS[0];

  // Session config for lineup builder
  const sessionConfig: SessionConfig = useMemo(
    () => ({
      id: 'new',
      name: sessionName || `New ${selectedType.label} Session`,
      type: sessionType,
      playersPerTeam: selectedType.playersPerTeam,
      matchCount,
      pointsPerMatch,
    }),
    [sessionName, sessionType, selectedType, matchCount, pointsPerMatch]
  );

  // Validation - session name is pre-filled with smart default, so it's always valid
  const canProceedToLineup = sessionName.trim().length > 0;
  const hasEnoughPlayers =
    teamAPlayers.length >= selectedType.playersPerTeam * matchCount &&
    teamBPlayers.length >= selectedType.playersPerTeam * matchCount;

  // Handle session type change
  const handleTypeChange = (type: SessionType) => {
    setSessionType(type);
    const typeInfo = SESSION_TYPES.find((t) => t.value === type)!;
    setMatchCount(typeInfo.defaultMatches);
  };

  // All lineup players for fairness calculation
  const allLineupPlayers = useMemo(
    () => [...lineupTeamA, ...lineupTeamB],
    [lineupTeamA, lineupTeamB]
  );

  // Calculate fairness
  const calculateFairness = useCallback(
    (matches: MatchSlot[]): FairnessScore => {
      // Convert to format expected by fairness calculator
      const pairings = matches.map((match) => ({
        id: match.id,
        teamAPlayers: match.teamAPlayers,
        teamBPlayers: match.teamBPlayers,
      }));
      return calculateFairnessScore(pairings, allLineupPlayers);
    },
    [allLineupPlayers]
  );

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
  const handlePublish = useCallback(
    async (_matches: MatchSlot[]) => {
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
        logger.error('Failed to create session', { error });
        showToast('error', 'Failed to create session');
      } finally {
        setIsCreating(false);
      }
    },
    [
      currentTrip,
      sessionName,
      sessionType,
      scheduledDate,
      firstTeeTime,
      pointsPerMatch,
      addSession,
      showToast,
      router,
    ]
  );

  if (!currentTrip || !isCaptainMode) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <header className="header-premium">
          <div className="container-editorial flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg skeleton-pulse" />
            <div>
              <div className="w-32 h-3 rounded skeleton-pulse mb-1" />
              <div className="w-20 h-2 rounded skeleton-pulse" />
            </div>
          </div>
        </header>
        <main className="container-editorial" style={{ paddingTop: 'var(--space-4)' }}>
          <div className="card-luxury p-6 mb-4">
            <div className="w-40 h-5 rounded skeleton-pulse mb-4" />
            <div className="w-full h-10 rounded skeleton-pulse mb-3" />
            <div className="w-full h-10 rounded skeleton-pulse" />
          </div>
          <div className="card-luxury p-4 h-48 skeleton-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => (step === 'lineup' ? setStep('setup') : router.back())}
              className="p-2 -ml-2 press-scale"
              style={{
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
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
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
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
            {/* Quick Setup Card */}
            <section className="section">
              <div
                className="card"
                style={{
                  padding: 'var(--space-4)',
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  color: 'white',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Zap size={20} />
                  <span className="text-sm font-semibold uppercase tracking-wide">Quick Setup</span>
                </div>
                <p className="text-sm opacity-90 mb-4">
                  Start with our recommended defaults. Most groups play Four-Ball with 4 matches.
                </p>
                <button
                  onClick={() => {
                    setSessionType('fourball');
                    setMatchCount(4);
                    setPointsPerMatch(1);
                    setStep('lineup');
                  }}
                  className="w-full py-3 rounded-lg font-semibold transition-all hover:bg-white/30"
                  style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                >
                  Use Defaults & Continue →
                </button>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm inline-flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:bg-surface-100"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {showAdvanced ? 'Hide' : 'Customize'} session options
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </section>

            {showAdvanced && (
              <>
                {/* Session Name */}
                <section className="section">
                  <label
                    className="type-overline"
                    style={{ display: 'block', marginBottom: 'var(--space-3)' }}
                  >
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
                  <label
                    className="type-overline"
                    style={{ display: 'block', marginBottom: 'var(--space-4)' }}
                  >
                    Format
                  </label>

                  {/* Format Categories */}
                  {displayedFormats.length === 0 ? (
                    <div style={{ padding: 'var(--space-4) 0' }}>
                      <EmptyStatePremium
                        illustration="trophy"
                        title="No formats found"
                        description="Try adjusting your filters or toggling Advanced options."
                        variant="compact"
                      />
                    </div>
                  ) : (
                    FORMAT_CATEGORIES.map((category) => {
                      const categoryFormats = displayedFormats.filter(
                        (f) => f.category === category.value
                      );
                      // Don't render empty categories when filtering
                      if (categoryFormats.length === 0) return null;
                      return (
                      <div key={category.value} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <p
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{ color: 'var(--ink-tertiary)' }}
                          >
                            {category.label}
                          </p>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--ink-tertiary)', opacity: 0.7 }}
                          >
                            {category.description}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {categoryFormats.map((format) => {
                            const isSelected = sessionType === format.value;
                            const isMatchPlay = ['foursomes', 'fourball', 'singles'].includes(
                              format.value
                            );

                            return (
                              <button
                                key={format.value}
                                onClick={() => {
                                  if (isMatchPlay) {
                                    handleTypeChange(format.value as SessionType);
                                  } else {
                                    // For non-match-play formats, still update state but show coming soon
                                    setSessionType(format.value as SessionType);
                                    const formatInfo = ALL_FORMATS.find(
                                      (f) => f.value === format.value
                                    );
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
                                              background:
                                                format.scoringMode === 'net'
                                                  ? 'rgba(0, 103, 71, 0.1)'
                                                  : 'rgba(59, 130, 246, 0.1)',
                                              color:
                                                format.scoringMode === 'net'
                                                  ? 'var(--masters)'
                                                  : '#3b82f6',
                                            }}
                                          >
                                            {format.scoringMode === 'net'
                                              ? 'Net'
                                              : format.scoringMode === 'both'
                                                ? 'Gross/Net'
                                                : 'Gross'}
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
                  })
                  )}

                  {/* Show All / Show Less Formats toggle */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setShowAllFormats(!showAllFormats)}
                      className="text-sm inline-flex items-center gap-1 px-4 py-2 rounded-lg transition-colors hover:bg-surface-100"
                      style={{ color: 'var(--masters)' }}
                    >
                      {showAllFormats
                        ? 'Show Popular Only'
                        : `Show All ${ALL_FORMATS.length} Formats`}
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${showAllFormats ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {!showAllFormats && (
                      <p className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                        Showing {POPULAR_FORMATS.length} most popular formats
                      </p>
                    )}
                  </div>
                </section>

                {/* Match Count */}
                <section className="section">
                  <label
                    className="type-overline"
                    style={{ display: 'block', marginBottom: 'var(--space-3)' }}
                  >
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
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 600,
                      }}
                    />
                    <p className="type-caption">
                      matches ({matchCount * selectedType.playersPerTeam} players per team needed)
                    </p>
                  </div>
                </section>

                {/* Schedule */}
                <section className="section">
                  <label
                    className="type-overline"
                    style={{ display: 'block', marginBottom: 'var(--space-4)' }}
                  >
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
                      <label
                        className="type-micro block mb-2"
                        style={{ color: 'var(--ink-tertiary)' }}
                      >
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
                  <label
                    className="type-overline"
                    style={{ display: 'block', marginBottom: 'var(--space-3)' }}
                  >
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
                      style={{
                        padding: 'var(--space-3)',
                        fontSize: 'var(--text-lg)',
                        fontWeight: 600,
                      }}
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
                        <AlertTriangle
                          size={20}
                          style={{ color: 'var(--warning)', flexShrink: 0 }}
                        />
                        <div>
                          <p className="type-title-sm" style={{ color: 'var(--warning)' }}>
                            Not Enough Players
                          </p>
                          <p className="type-caption" style={{ marginTop: '4px' }}>
                            Need {selectedType.playersPerTeam * matchCount} players per team.
                            Currently: Team A ({teamAPlayers.length}), Team B ({teamBPlayers.length}
                            )
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
            )}
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
