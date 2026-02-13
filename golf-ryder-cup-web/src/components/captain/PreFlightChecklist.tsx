'use client';

import React, { useState, useEffect } from 'react';
import {
  runPreFlightCheck,
  getPreFlightSummary,
  type PreFlightCheckResult,
} from '@/lib/services/preFlightValidationService';
import type {
  Trip,
  Player,
  Team,
  TeamMember,
  RyderCupSession,
  Match,
  Course,
  TeeSet,
} from '@/lib/types';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';

const logger = createLogger('PreFlight');

interface PreFlightChecklistProps {
  tripId: string;
  trip?: Trip;
  players?: Player[];
  teams?: Team[];
  teamMembers?: TeamMember[];
  sessions?: RyderCupSession[];
  matches?: Match[];
  courses?: Course[];
  teeSets?: TeeSet[];
  onAllClear?: () => void;
}

export function PreFlightChecklist({
  tripId,
  trip,
  players = [],
  teams = [],
  teamMembers = [],
  sessions = [],
  matches = [],
  courses = [],
  teeSets = [],
  onAllClear,
}: PreFlightChecklistProps) {
  const [result, setResult] = useState<PreFlightCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const runCheck = async () => {
    setLoading(true);
    try {
      // Create a minimal trip object if not provided
      const now = new Date().toISOString();
      const tripData: Trip = trip || {
        id: tripId,
        name: 'Trip',
        startDate: now,
        endDate: now,
        isCaptainModeEnabled: true,
        createdAt: now,
        updatedAt: now,
      };

      const checkResult = runPreFlightCheck(
        tripData,
        players,
        teams,
        teamMembers,
        sessions,
        matches,
        courses,
        teeSets
      );
      setResult(checkResult);

      // Auto-expand sections with issues
      const sectionsWithIssues = new Set<string>();
      [...checkResult.errors, ...checkResult.warnings].forEach((item) => {
        sectionsWithIssues.add(item.category);
      });
      setExpandedSections(sectionsWithIssues);

      if (checkResult.isReady && onAllClear) {
        onAllClear();
      }
    } catch (error) {
      logger.error('Pre-flight check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: runCheck is stable, only re-run on tripId change
  }, [tripId]);

  const toggleSection = (category: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--info)]" />
        <span className="ml-3 text-[var(--ink-secondary)]">Running pre-flight checks...</span>
      </div>
    );
  }

  if (!result) {
    return <div className="text-center p-8 text-[var(--error)]">Failed to run pre-flight checks</div>;
  }

  const summary = getPreFlightSummary(result);
  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div
        className={cn(
          'rounded-xl p-6 border-2 transition-colors',
          result.isReady
            ? 'bg-[color:var(--success)]/15 border-[color:var(--success)]/40'
            : 'bg-[color:var(--warning)]/15 border-[color:var(--warning)]/40'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {result.isReady ? (
              <Rocket className="w-10 h-10 text-[var(--success)]" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-[var(--warning)]" />
            )}
            <div>
              <h3 className="text-xl font-bold text-[var(--ink-primary)]">
                {result.isReady ? 'All Systems Go!' : 'Pre-Flight Review Needed'}
              </h3>
              <p className="text-sm text-[var(--ink-secondary)]">
                {summary.icon} {summary.message}
              </p>
            </div>
          </div>
          <button
            onClick={runCheck}
            className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
            title="Re-run checks"
          >
            <RefreshCw className="w-5 h-5 text-[var(--ink-tertiary)]" />
          </button>
        </div>

        {/* Completion Percentage */}
        <div className="mt-4 pt-4 border-t border-[var(--rule)]">
          <div className="flex justify-between text-sm text-[var(--ink-secondary)] mb-2">
            <span>Completion</span>
            <span>{result.completionPercentage}%</span>
          </div>
          <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                result.isReady ? 'bg-[color:var(--success)]/80' : 'bg-[color:var(--warning)]/80'
              )}
              style={{ width: `${result.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[var(--success)]" />
            <span className="text-sm text-[var(--ink-secondary)]">
              {result.info.length} Info
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
            <span className="text-sm text-[var(--ink-secondary)]">
              {result.warnings.length} Warnings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-[var(--error)]" />
            <span className="text-sm text-[var(--ink-secondary)]">
              {result.errors.length} Errors
            </span>
          </div>
        </div>
      </div>

      {/* Errors Section */}
      {result.errors.length > 0 && (
        <div className="border border-[color:var(--error)]/30 rounded-lg overflow-hidden">
          <div className="bg-[color:var(--error)]/15 px-4 py-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-[var(--error)]" />
            <span className="font-semibold text-[var(--error)]">
              Errors ({result.errors.length})
            </span>
          </div>
          <div className="p-4 space-y-2 bg-[var(--surface-secondary)]">
            {result.errors.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[color:var(--error)]/15 border border-[color:var(--error)]/30"
              >
                <p className="font-medium text-[var(--error)]">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-[color:var(--error)]/80 mt-1">{item.description}</p>
                )}
                {item.actionLabel && item.actionHref && (
                  <a
                    href={item.actionHref}
                    className="text-sm text-[var(--info)] mt-2 inline-block"
                  >
                    {item.actionLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {result.warnings.length > 0 && (
        <div className="border border-[color:var(--warning)]/30 rounded-lg overflow-hidden">
          <div className="bg-[color:var(--warning)]/15 px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />
            <span className="font-semibold text-[var(--warning)]">
              Warnings ({result.warnings.length})
            </span>
          </div>
          <div className="p-4 space-y-2 bg-[var(--surface-secondary)]">
            {result.warnings.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-[color:var(--warning)]/15 border border-[color:var(--warning)]/30"
              >
                <p className="font-medium text-[var(--warning)]">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-[color:var(--warning)]/80 mt-1">
                    {item.description}
                  </p>
                )}
                {item.actionLabel && item.actionHref && (
                  <a
                    href={item.actionHref}
                    className="text-sm text-[var(--info)] mt-2 inline-block"
                  >
                    {item.actionLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      {result.info.length > 0 && (
        <div className="border border-[var(--rule)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('info')}
            className="w-full bg-[var(--surface-secondary)] px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[var(--success)]" />
              <span className="font-semibold text-[var(--ink-primary)]">
                Passed Checks ({result.info.length})
              </span>
            </div>
            {expandedSections.has('info') ? (
              <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
            )}
          </button>
          {expandedSections.has('info') && (
            <div className="p-4 space-y-2 bg-[var(--surface-secondary)]">
              {result.info.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[color:var(--success)]/10 border border-[color:var(--success)]/30"
                >
                  <p className="text-[var(--success)]">{item.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PreFlightChecklist;
