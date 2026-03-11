'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import {
  LineupBuilder,
  calculateFairnessScore,
  type MatchSlot,
  type SessionConfig,
  type FairnessScore,
} from '@/components/captain';
import { Users, Info } from 'lucide-react';
import type { SessionType } from '@/lib/types';
import { EmptyStatePremium } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { NewLineupSetupStep, LineupSetupFact } from './NewLineupSetupStep';
import {
  ALL_FORMATS,
  POPULAR_FORMATS,
  SESSION_TYPES,
  generateSessionName,
  getTodayDate,
} from './newLineupConfig';
import { getTeamPlayersForLineup, toLineupPlayers } from './lineupBuilderData';

type Step = 'setup' | 'lineup';

const logger = createLogger('lineup');

export default function NewLineupPageClient() {
  const router = useRouter();
  const { currentTrip, teams, players, teamMembers, addSession, sessions } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const defaultSessionName = useMemo(
    () => generateSessionName(sessions.length),
    [sessions.length]
  );

  const defaultDate = useMemo(() => {
    if (currentTrip?.startDate) {
      const tripStart = new Date(currentTrip.startDate);
      const today = new Date();
      return tripStart > today ? currentTrip.startDate : getTodayDate();
    }
    return getTodayDate();
  }, [currentTrip?.startDate]);

  const defaultTeeTime = useMemo(() => {
    const now = new Date();
    return now.getHours() < 11 ? '08:00' : '13:00';
  }, []);

  const [step, setStep] = useState<Step>('setup');
  const [sessionName, setSessionName] = useState(defaultSessionName);
  const [sessionType, setSessionType] = useState<SessionType>('fourball');
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [firstTeeTime, setFirstTeeTime] = useState(defaultTeeTime);
  const [teeTimeInterval, setTeeTimeInterval] = useState(10);
  const [matchCount, setMatchCount] = useState(4);
  const [pointsPerMatch, setPointsPerMatch] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllFormats, setShowAllFormats] = useState(false);

  const displayedFormats = useMemo(() => {
    if (showAllFormats) return ALL_FORMATS;
    return ALL_FORMATS.filter((format) => POPULAR_FORMATS.includes(format.value));
  }, [showAllFormats]);

  const teeTimes = useMemo(() => {
    if (!firstTeeTime) return [];

    const [hours, minutes] = firstTeeTime.split(':').map(Number);
    const baseTime = new Date();
    baseTime.setHours(hours, minutes, 0, 0);

    return Array.from({ length: matchCount }, (_, index) => {
      const matchTime = new Date(baseTime.getTime() + index * teeTimeInterval * 60 * 1000);
      return matchTime.toTimeString().slice(0, 5);
    });
  }, [firstTeeTime, teeTimeInterval, matchCount]);

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAPlayers = useMemo(
    () => getTeamPlayersForLineup(teamA?.id, teamMembers, players),
    [teamA?.id, teamMembers, players]
  );
  const teamBPlayers = useMemo(
    () => getTeamPlayersForLineup(teamB?.id, teamMembers, players),
    [teamB?.id, teamMembers, players]
  );
  const lineupTeamA = useMemo(() => toLineupPlayers(teamAPlayers, 'A'), [teamAPlayers]);
  const lineupTeamB = useMemo(() => toLineupPlayers(teamBPlayers, 'B'), [teamBPlayers]);

  const selectedType = ALL_FORMATS.find((format) => format.value === sessionType) || ALL_FORMATS[0];

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

  const canProceedToLineup = sessionName.trim().length > 0;
  const hasEnoughPlayers =
    teamAPlayers.length >= selectedType.playersPerTeam * matchCount &&
    teamBPlayers.length >= selectedType.playersPerTeam * matchCount;

  const handleTypeChange = useCallback((type: SessionType) => {
    setSessionType(type);
    const typeInfo =
      SESSION_TYPES.find((session) => session.value === type) ||
      ALL_FORMATS.find((format) => format.value === type);

    if (typeInfo) {
      setMatchCount(typeInfo.defaultMatches);
    }
  }, []);

  const allLineupPlayers = useMemo(
    () => [...lineupTeamA, ...lineupTeamB],
    [lineupTeamA, lineupTeamB]
  );

  const calculateFairness = useCallback(
    (matches: MatchSlot[]): FairnessScore => {
      const pairings = matches.map((match) => ({
        id: match.id,
        teamAPlayers: match.teamAPlayers,
        teamBPlayers: match.teamBPlayers,
      }));
      return calculateFairnessScore(pairings, allLineupPlayers);
    },
    [allLineupPlayers]
  );

  const handleAutoFill = useCallback((): MatchSlot[] => {
    const shuffledA = [...lineupTeamA].sort(() => Math.random() - 0.5);
    const shuffledB = [...lineupTeamB].sort(() => Math.random() - 0.5);

    return Array.from({ length: matchCount }, (_, matchIndex) => {
      const teamAForMatch = Array.from({ length: selectedType.playersPerTeam }, (_, playerIndex) => {
        return shuffledA[matchIndex * selectedType.playersPerTeam + playerIndex];
      }).filter(Boolean);

      const teamBForMatch = Array.from({ length: selectedType.playersPerTeam }, (_, playerIndex) => {
        return shuffledB[matchIndex * selectedType.playersPerTeam + playerIndex];
      }).filter(Boolean);

      return {
        id: `match-${matchIndex + 1}`,
        teamAPlayers: teamAForMatch,
        teamBPlayers: teamBForMatch,
      };
    });
  }, [lineupTeamA, lineupTeamB, matchCount, selectedType.playersPerTeam]);

  const handleSave = useCallback(async () => {
    showToast('info', 'Lineup saved as draft');
  }, [showToast]);

  const handlePublish = useCallback(
    async (_matches: MatchSlot[]) => {
      if (!currentTrip) return;

      setIsCreating(true);
      try {
        const [hours] = firstTeeTime.split(':').map(Number);
        const derivedTimeSlot: 'AM' | 'PM' = hours < 12 ? 'AM' : 'PM';

        const session = await addSession({
          tripId: currentTrip.id,
          name: sessionName,
          sessionNumber: 1,
          sessionType,
          scheduledDate: scheduledDate || undefined,
          timeSlot: derivedTimeSlot,
          pointsPerMatch,
          status: 'scheduled',
          isLocked: true,
        });

        showToast('success', 'Session created and lineup published!');

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="calendar"
            title="No trip selected"
            description="Pick a trip before creating a session lineup."
            action={{
              label: 'Back to Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain Mode required"
            description="Enable Captain Mode to create and publish session lineups."
            action={{
              label: 'Go to More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={step === 'setup' ? 'New Session' : 'Build Lineup'}
        subtitle={step === 'setup' ? 'Configure session settings' : sessionName}
        icon={<Users size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => (step === 'lineup' ? setStep('setup') : router.back())}
        rightSlot={
          <div className="flex items-center gap-2" aria-label="Progress">
            <span
              className={`h-2 w-2 rounded-full ${step === 'setup' ? 'bg-masters' : 'bg-ink-tertiary'}`}
            />
            <span
              className={`h-2 w-2 rounded-full ${step === 'lineup' ? 'bg-masters' : 'bg-ink-tertiary'}`}
            />
          </div>
        }
      />

      <main className="container-editorial">
        <section className="pt-[var(--space-8)]">
          <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-overline text-[var(--masters)]">
                  {step === 'setup' ? 'Session setup' : 'Lineup studio'}
                </p>
                <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
                  {sessionName || 'New session'}
                </h1>
                <p className="mt-[var(--space-2)] max-w-2xl text-sm text-[var(--ink-secondary)]">
                  Build the session the way a captain would actually think about it: choose the
                  format, confirm the roster depth, then shape the card.
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  step === 'setup'
                    ? 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
                    : 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
                }`}
              >
                {step === 'setup' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>

            <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
              <LineupSetupFact label="Format" value={selectedType.label.split('(')[0]!.trim()} />
              <LineupSetupFact label="Matches" value={matchCount} />
              <LineupSetupFact
                label="Roster"
                value={hasEnoughPlayers ? 'Ready' : 'Short'}
                note={`${teamAPlayers.length}-${teamBPlayers.length} players`}
              />
            </div>
          </div>
        </section>

        {step === 'setup' ? (
          <NewLineupSetupStep
            showAdvanced={showAdvanced}
            sessionName={sessionName}
            sessionType={sessionType}
            displayedFormats={displayedFormats}
            showAllFormats={showAllFormats}
            matchCount={matchCount}
            selectedType={selectedType}
            scheduledDate={scheduledDate}
            firstTeeTime={firstTeeTime}
            teeTimeInterval={teeTimeInterval}
            teeTimes={teeTimes}
            pointsPerMatch={pointsPerMatch}
            hasEnoughPlayers={hasEnoughPlayers}
            teamAPlayerCount={teamAPlayers.length}
            teamBPlayerCount={teamBPlayers.length}
            canProceedToLineup={canProceedToLineup}
            onToggleAdvanced={() => setShowAdvanced((prev) => !prev)}
            onQuickSetup={() => {
              setSessionType('fourball');
              setMatchCount(4);
              setPointsPerMatch(1);
              setStep('lineup');
            }}
            onSessionNameChange={setSessionName}
            onSelectFormat={handleTypeChange}
            onToggleShowAllFormats={() => setShowAllFormats((prev) => !prev)}
            onMatchCountChange={setMatchCount}
            onScheduledDateChange={setScheduledDate}
            onFirstTeeTimeChange={setFirstTeeTime}
            onTeeTimeIntervalChange={setTeeTimeInterval}
            onPointsPerMatchChange={setPointsPerMatch}
            onContinue={() => setStep('lineup')}
          />
        ) : (
          <section className="section">
            <div className="mb-[var(--space-5)]">
              <p className="type-overline text-[var(--ink-secondary)]">Build the card</p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                Drag players into place, keep an eye on fairness, and publish when the session
                feels right.
              </p>
            </div>
            <LineupBuilder
              session={sessionConfig}
              teamAPlayers={lineupTeamA}
              teamBPlayers={lineupTeamB}
              teamALabel={teamA?.name || 'USA'}
              teamBLabel={teamB?.name || 'Europe'}
              onSave={handleSave}
              onPublish={handlePublish}
              onAutoFill={handleAutoFill}
              calculateFairness={calculateFairness}
              isLocked={isCreating}
            />

            {!hasEnoughPlayers && (
              <div
                className="mt-4 rounded-xl p-4"
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
    </div>
  );
}
