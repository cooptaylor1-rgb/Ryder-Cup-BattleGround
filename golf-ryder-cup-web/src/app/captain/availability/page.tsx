'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  AttendanceCheckIn,
  type AttendeePlayer,
  type AttendanceStatus,
} from '@/components/captain';
import {
  Users,
  Shield,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';

/**
 * CAPTAIN AVAILABILITY / ATTENDANCE PAGE
 *
 * Track player arrivals and manage attendance before a round.
 * Real-time check-in with ETA tracking and no-show management.
 */

export default function AvailabilityPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Track attendance status locally (in production, this would be synced)
  const [attendanceMap, setAttendanceMap] = useState<Map<string, { status: AttendanceStatus; eta?: string }>>(
    new Map()
  );
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const sessionInitialized = React.useRef(false);

  // Note: avoid auto-redirects so we can render explicit empty states.
  // (We render them after hooks to comply with React Rules of Hooks.)

  // Get active/upcoming sessions (memoized for stable reference)
  const activeSessions = useMemo(() =>
    sessions.filter(s => s.status === 'inProgress' || s.status === 'scheduled'),
    [sessions]
  );

  // Auto-select first session when none selected
  useEffect(() => {
    if (!sessionInitialized.current && !selectedSession && activeSessions.length > 0) {
      sessionInitialized.current = true;
      // Defer state update to avoid setState-in-effect
      const timeoutId = setTimeout(() => setSelectedSession(activeSessions[0].id), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeSessions, selectedSession]);

  // Get team for a player
  const getPlayerTeam = useCallback((playerId: string): 'A' | 'B' => {
    const teamMember = teamMembers.find(tm => tm.playerId === playerId);
    if (!teamMember) return 'A';
    const team = teams.find(t => t.id === teamMember.teamId);
    return team?.color === 'europe' ? 'B' : 'A';
  }, [teamMembers, teams]);

  // Convert players to AttendeePlayer format
  const attendeePlayers: AttendeePlayer[] = players.map(player => {
    const attendance = attendanceMap.get(player.id);
    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      teamId: getPlayerTeam(player.id),
      handicapIndex: player.handicapIndex ?? 0,
      phone: undefined, // Would come from extended player profile
      email: player.email,
      avatarUrl: player.avatarUrl,
      status: attendance?.status || 'not-arrived',
      eta: attendance?.eta,
    };
  });

  // Handle status update
  const handleUpdateStatus = useCallback((playerId: string, status: AttendanceStatus, eta?: string) => {
    setAttendanceMap(prev => {
      const next = new Map(prev);
      next.set(playerId, { status, eta });
      return next;
    });

    const player = players.find(p => p.id === playerId);
    if (player) {
      const statusLabels: Record<AttendanceStatus, string> = {
        'checked-in': 'checked in',
        'en-route': 'marked en route',
        'not-arrived': 'marked as not arrived',
        'no-show': 'marked as no-show',
      };
      showToast('info', `${player.firstName} ${statusLabels[status]}`);
    }
  }, [players, showToast]);

  // Handle call/text
  const handleCall = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      // In production, this would initiate a phone call
      showToast('info', `Calling ${player.firstName}...`);
    }
  }, [players, showToast]);

  const handleText = useCallback((playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      // In production, this would open SMS
      showToast('info', `Opening text to ${player.firstName}...`);
    }
  }, [players, showToast]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    showToast('info', 'Refreshing attendance data...');
    // In production, this would sync with server
  }, [showToast]);

  const currentSession = sessions.find(s => s.id === selectedSession);

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to manage attendance."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Attendance."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Attendance"
        subtitle="Track player arrivals"
        icon={<Shield size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
        rightSlot={
          <button
            onClick={handleRefresh}
            className="p-2 press-scale"
            style={{
              color: 'var(--ink-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Refresh"
          >
            <RefreshCw size={20} strokeWidth={1.75} />
          </button>
        }
      />

      <main className="container-editorial">
        {/* Session Selector */}
        {activeSessions.length > 1 && (
          <section className="section">
            <label className="type-overline" style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
              Select Session
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
              {activeSessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${selectedSession === session.id
                    ? 'bg-masters text-white'
                    : 'bg-surface border border-rule'
                    }`}
                >
                  {session.name}
                  {session.status === 'inProgress' && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-white inline-block animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Attendance Check-In Component */}
        {players.length > 0 ? (
          <section className="section" style={{ marginTop: activeSessions.length > 1 ? 0 : undefined }}>
            <AttendanceCheckIn
              players={attendeePlayers}
              onUpdateStatus={handleUpdateStatus}
              onCall={handleCall}
              onText={handleText}
              onRefresh={handleRefresh}
              sessionName={currentSession?.name || 'Today\'s Session'}
              firstTeeTime={currentSession?.timeSlot === 'AM' ? '08:00' : '13:00'}
            />
          </section>
        ) : (
          <section className="section">
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Users size={32} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }} />
              <p className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>No Players</p>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Add players to track attendance
              </p>
              <Link
                href="/players"
                className="btn btn-primary inline-flex items-center gap-2"
              >
                Add Players
              </Link>
            </div>
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
