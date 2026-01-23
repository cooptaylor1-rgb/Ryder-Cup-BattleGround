'use client';

import React, { useState } from 'react';
import { Trip, Team, Player, RyderCupSession, Match, Course } from '@/lib/types';
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
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'needs-attention':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const renderActiveSection = () => {
    const currentSession = sessions[0];
    const sessionMatches = matches.filter(m => m.sessionId === currentSession?.id);
    // Find a course from the matches if available
    const firstMatchWithCourse = sessionMatches.find(m => m.courseId);
    const _currentCourse = firstMatchWithCourse
      ? courses.find(c => c.id === firstMatchWithCourse.courseId)
      : courses[0];

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
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sessions created yet</p>
            </div>
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
        return (
          <SmartPairingSuggestions
            players={players}
            teams={teams}
            sessions={sessions}
            matches={matches}
            currentSessionId={currentSession?.id}
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
            <div className="text-center py-8 text-gray-500">
              <Cloud className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sessions created yet</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {sessions.map(session => {
              // Find course from matches in this session
              const sessionMatches = matches.filter(m => m.sessionId === session.id);
              const matchWithCourse = sessionMatches.find(m => m.courseId);
              const course = matchWithCourse
                ? courses.find(c => c.id === matchWithCourse.courseId)
                : courses[0];
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
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Captain&apos;s Toolkit
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Everything you need to run your trip
            </p>
          </div>
        </div>
        {activeSection && (
          <button
            onClick={() => setActiveSection(null)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            ← Back to Tools
          </button>
        )}
      </div>

      {/* Active Section Content */}
      {activeSection ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-6">
          {renderActiveSection()}
        </div>
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
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all text-left flex items-center gap-4 group"
            >
              <div className={`p-3 rounded-lg ${item.status === 'needs-attention'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
                : item.status === 'complete'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                }`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  {getStatusIcon(item.status)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
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
