'use client';

import React, { useState, useEffect } from 'react';
import { runPreFlightCheck, getPreFlightSummary, type PreFlightCheckResult } from '@/lib/services/preFlightValidationService';
import type { Trip, Player, Team, TeamMember, RyderCupSession, Match, Course, TeeSet } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Loader2, RefreshCw, Rocket } from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';

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
  onAllClear
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
      [...checkResult.errors, ...checkResult.warnings].forEach(item => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const toggleSection = (category: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const _getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const _getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'fail':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-300">Running pre-flight checks...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center p-8 text-red-500">
        Failed to run pre-flight checks
      </div>
    );
  }

  const summary = getPreFlightSummary(result);
  const allItems = [...result.errors, ...result.warnings, ...result.info];
  const _categories = [...new Set(allItems.map(item => item.category))];

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className={`rounded-xl p-6 border-2 ${result.isReady
        ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
        : 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
        }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {result.isReady ? (
              <Rocket className="w-10 h-10 text-green-600" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {result.isReady ? 'All Systems Go!' : 'Pre-Flight Review Needed'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {summary.icon} {summary.message}
              </p>
            </div>
          </div>
          <button
            onClick={runCheck}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Re-run checks"
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Completion Percentage */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>Completion</span>
            <span>{result.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${result.isReady ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${result.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {result.info.length} Info
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {result.warnings.length} Warnings
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {result.errors.length} Errors
            </span>
          </div>
        </div>
      </div>

      {/* Errors Section */}
      {result.errors.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="font-semibold text-red-800 dark:text-red-200">
              Errors ({result.errors.length})
            </span>
          </div>
          <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
            {result.errors.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="font-medium text-red-800 dark:text-red-200">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">{item.description}</p>
                )}
                {item.actionLabel && item.actionHref && (
                  <a href={item.actionHref} className="text-sm text-blue-600 dark:text-blue-400 mt-2 inline-block">
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
        <div className="border border-yellow-200 dark:border-yellow-800 rounded-lg overflow-hidden">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">
              Warnings ({result.warnings.length})
            </span>
          </div>
          <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
            {result.warnings.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">{item.description}</p>
                )}
                {item.actionLabel && item.actionHref && (
                  <a href={item.actionHref} className="text-sm text-blue-600 dark:text-blue-400 mt-2 inline-block">
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
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('info')}
            className="w-full bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Passed Checks ({result.info.length})
              </span>
            </div>
            {expandedSections.has('info') ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {expandedSections.has('info') && (
            <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
              {result.info.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200">{item.title}</p>
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
