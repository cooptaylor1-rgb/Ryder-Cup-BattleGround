'use client';

import React, { useState } from 'react';
import { Trip, Team, Player, RyderCupSession, Match, Course } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { PreFlightChecklist } from './PreFlightChecklist';
import { BulkImportModal } from './BulkImportModal';
import { TeeTimeGenerator } from './TeeTimeGenerator';
import { DraftBoard } from './DraftBoard';
import { SmartPairingSuggestions } from './SmartPairingSuggestions';
import { SideBetsTracker } from './SideBetsTracker';
import { SessionWeatherPanel } from './SessionWeatherPanel';
import { captainLogger } from '@/lib/utils/logger';
import {
  Rocket,
  Users,
  Clock,
  Trophy,
  Lightbulb,
  DollarSign,
  Cloud,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface CaptainToolkitProps {
  trip: Trip;
  teams: Team[];
  players: Player[];
  sessions: RyderCupSession[];
  matches: Match[];
  courses: Course[];
  onDataUpdate: () => void;
}

type ToolkitSection =
  | 'preflight'
  | 'import'
  | 'draft'
  | 'teetimes'
  | 'pairings'
  | 'sidebets'
  | 'weather';

interface ToolkitItem {
  id: ToolkitSection;
  name: string;
  description: string;
  icon: React.ReactNode;
  status?: 'ready' | 'needs-attention' | 'complete';
}

export function CaptainToolkit({
  trip,
  teams,
  players,
  sessions,
  matches,
  courses,
  onDataUpdate,
}: CaptainToolkitProps) {
  const [activeSection, setActiveSection] = useState<ToolkitSection | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Determine tool status based on current data
  const getToolStatus = (toolId: ToolkitSection): 'ready' | 'needs-attention' | 'complete' | undefined => {
    switch (toolId) {
      case 'preflight':
        // Check if trip is properly set up
        if (players.length < 4 || teams.length < 2 || sessions.length === 0) {
          return 'needs-attention';
        }
        return 'ready';
      case 'import':
        return players.length === 0 ? 'needs-attention' : 'complete';
      case 'draft':
        // Check if all players are assigned to teams
        const unassignedPlayers = players.filter(p => {
          const isAssigned = matches.some(m =>
            m.teamAPlayerIds?.includes(p.id) || m.teamBPlayerIds?.includes(p.id)
          );
          return !isAssigned;
        });
        return unassignedPlayers.length > 0 ? 'needs-attention' : 'complete';
      case 'teetimes':
        return matches.length > 0 ? 'ready' : undefined;
      case 'pairings':
        return matches.length > 0 ? 'ready' : undefined;
      default:
        return 'ready';
    }
  };

  const toolkitItems: ToolkitItem[] = [
    {
      id: 'preflight',
      name: 'Pre-Flight Check',
      description: 'Verify trip setup before day one',
      icon: <Rocket className="w-5 h-5" />,
      status: getToolStatus('preflight'),
    },
    {
      id: 'import',
      name: 'Bulk Import Players',
      description: 'Import from CSV or paste names',
      icon: <Users className="w-5 h-5" />,
      status: getToolStatus('import'),
    },
    {
      id: 'draft',
      name: 'Team Draft',
      description: 'Draft or auto-balance teams',
      icon: <Trophy className="w-5 h-5" />,
      status: getToolStatus('draft'),
    },
    {
      id: 'teetimes',
      name: 'Tee Time Generator',
      description: 'Generate tee sheets for sessions',
      icon: <Clock className="w-5 h-5" />,
      status: getToolStatus('teetimes'),
    },
    {
      id: 'pairings',
      name: 'Smart Pairings',
      description: 'AI-powered pairing suggestions',
      icon: <Lightbulb className="w-5 h-5" />,
      status: getToolStatus('pairings'),
    },
    {
      id: 'sidebets',
      name: 'Side Bets & Expenses',
      description: 'Track skins, nassau, and trip costs',
      icon: <DollarSign className="w-5 h-5" />,
      status: 'ready',
    },
    {
      id: 'weather',
      name: 'Weather Forecast',
      description: 'Check conditions for each session',
      icon: <Cloud className="w-5 h-5" />,
      status: 'ready',
    },
  ];

  const getStatusIcon = (status?: 'ready' | 'needs-attention' | 'complete') => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-[var(--success)]" />;
      case 'needs-attention':
        return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
      default:
        return null;
    }
  };

  const renderActiveSection = () => {
    const currentSession = sessions[0];
    const sessionMatches = matches.filter(m => m.sessionId === currentSession?.id);
    switch (activeSection) {
      case 'preflight':
        return (
          <PreFlightChecklist
            tripId={trip.id}
            onAllClear={() => setActiveSection(null)}
          />
        );

      case 'draft':
        return (
          <DraftBoard
            players={players}
            teams={teams}
            onDraftComplete={(assignments) => {
              captainLogger.log('Draft complete:', assignments);
              onDataUpdate();
              setActiveSection(null);
            }}
          />
        );

      case 'teetimes':
        if (!currentSession) {
          return (
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions created yet"
              description="Add a session first, then you can generate tee times."
              variant="compact"
            />
          );
        }
        return (
          <TeeTimeGenerator
            session={currentSession}
            matches={sessionMatches}
            players={players}
            teams={teams}
            onSave={(teeSheet) => {
              captainLogger.log('Tee sheet saved:', teeSheet);
              onDataUpdate();
            }}
          />
        );

      case 'pairings':
        if (!currentSession) {
          return (
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions created yet"
              description="Create a session to unlock smart pairing suggestions."
              variant="compact"
            />
          );
        }
        return (
          <SmartPairingSuggestions
            players={players}
            teams={teams}
            sessions={sessions}
            matches={matches}
            currentSessionId={currentSession.id}
            onApplySuggestion={(suggestion) => {
              captainLogger.log('Applying suggestion:', suggestion);
              onDataUpdate();
            }}
          />
        );

      case 'sidebets':
        return (
          <SideBetsTracker
            tripId={trip.id}
            players={players}
            onUpdate={onDataUpdate}
          />
        );

      case 'weather':
        if (!currentSession) {
          return (
            <EmptyStatePremium
              illustration="calendar"
              title="No sessions created yet"
              description="Add a session to see the weather forecast for each day."
              variant="compact"
            />
          );
        }
        return (
          <div className="space-y-4">
            {sessions.map((session) => {
              // Find course from matches in this session
              const sessionMatches = matches.filter((m) => m.sessionId === session.id);
              const matchWithCourse = sessionMatches.find((m) => m.courseId);
              const course = matchWithCourse ? courses.find((c) => c.id === matchWithCourse.courseId) : courses[0];

              return (
                <SessionWeatherPanel
                  key={session.id}
                  session={session}
                  course={course}
                />
              );
            })}
          </div>
        );

      default:
        return (
          <EmptyStatePremium
            illustration="scorecard"
            title="No tool selected"
            description="Pick a tool from the Captain’s Toolkit to get started."
            variant="compact"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[var(--color-accent)]" />
          <div>
            <h2 className="text-xl font-bold text-[var(--ink-primary)]">Captain&apos;s Toolkit</h2>
            <p className="text-sm text-[var(--ink-tertiary)]">Everything you need to run your trip</p>
          </div>
        </div>
        {activeSection && (
          <button
            onClick={() => setActiveSection(null)}
            className="text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
          >
            ← Back to Tools
          </button>
        )}
      </div>

      {/* Active Section Content */}
      {activeSection ? (
        <div className="card p-6">{renderActiveSection()}</div>
      ) : (
        /* Tool Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {toolkitItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'import') {
                  setShowImportModal(true);
                } else {
                  setActiveSection(item.id);
                }
              }}
              className={cn(
                'p-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)] transition-all text-left flex items-center gap-4 group',
                'hover:bg-[var(--surface-raised)] hover:border-[color:var(--masters)]/50'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-lg',
                  item.status === 'needs-attention'
                    ? 'bg-[color:var(--warning)]/10 text-[var(--warning)]'
                    : item.status === 'complete'
                      ? 'bg-[color:var(--success)]/10 text-[var(--success)]'
                      : 'bg-[color:var(--color-accent)]/12 text-[var(--color-accent)]'
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--ink-primary)]">{item.name}</h3>
                  {getStatusIcon(item.status)}
                </div>
                <p className="text-sm text-[var(--ink-tertiary)]">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)] group-hover:text-[var(--color-accent)] transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        tripId={trip.id}
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={(result) => {
          captainLogger.log('Import complete:', result);
          onDataUpdate();
          setShowImportModal(false);
        }}
      />
    </div>
  );
}

export default CaptainToolkit;
