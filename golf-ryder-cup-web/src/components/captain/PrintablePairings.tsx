'use client';

import type { RyderCupSession, Match, Player, Team } from '@/lib/types/models';
import { SessionTypeDisplay } from '@/lib/types/models';
import { Printer } from 'lucide-react';

/**
 * PrintablePairings
 *
 * Print-optimized view of match pairings that captains can print
 * and post in the golf cart or clubhouse.
 *
 * Uses @media print CSS to produce a clean, ink-friendly layout
 * with team color dots, session groupings, and tee times.
 */

interface PrintablePairingsProps {
  sessions: RyderCupSession[];
  matches: Match[];
  players: Player[];
  teams: Team[];
  tripName: string;
}

function getPlayerName(playerId: string, players: Player[]): string {
  const player = players.find((p) => p.id === playerId);
  if (!player) return 'Unknown';
  return `${player.firstName} ${player.lastName}`;
}

function getTeamName(color: 'usa' | 'europe', teams: Team[]): string {
  const team = teams.find((t) => t.color === color);
  return team?.name ?? (color === 'usa' ? 'Team USA' : 'Team Europe');
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTeeTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function PrintablePairings({
  sessions,
  matches,
  players,
  teams,
  tripName,
}: PrintablePairingsProps) {
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateA = a.scheduledDate ?? '';
    const dateB = b.scheduledDate ?? '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return a.sessionNumber - b.sessionNumber;
  });

  const teamAName = getTeamName('usa', teams);
  const teamBName = getTeamName('europe', teams);

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide everything except print content */
          body > *:not(#__next),
          header,
          nav,
          .no-print,
          .header-premium,
          .bottom-nav,
          [data-bottom-nav],
          footer {
            display: none !important;
          }

          /* Reset page for print */
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
          }

          /* Print content fills page */
          .print-pairings {
            padding: 0 !important;
            max-width: 100% !important;
          }

          .print-pairings-header {
            border-bottom: 2px solid #000 !important;
            padding-bottom: 8pt !important;
            margin-bottom: 16pt !important;
          }

          .print-pairings-header h1 {
            font-size: 18pt !important;
            color: black !important;
          }

          .print-pairings-header p {
            color: #333 !important;
          }

          .print-session {
            page-break-inside: avoid;
            margin-bottom: 16pt !important;
          }

          .print-session-header {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            padding: 6pt 10pt !important;
            border: 1px solid #ccc !important;
          }

          .print-match-row {
            border: 1px solid #ddd !important;
            border-top: none !important;
            padding: 6pt 10pt !important;
          }

          .print-team-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            display: inline-block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-team-dot-usa {
            background: #002868 !important;
          }

          .print-team-dot-europe {
            background: #003399 !important;
          }

          /* Page setup */
          @page {
            margin: 0.5in;
            size: letter portrait;
          }
        }
      `}</style>

      <div className="print-pairings">
        {/* Header */}
        <div
          className="print-pairings-header"
          style={{
            borderBottom: '2px solid var(--rule)',
            paddingBottom: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--ink-primary)',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {tripName}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-secondary)',
              margin: 0,
              marginTop: 'var(--space-1)',
            }}
          >
            Match Pairings Sheet &middot; {formatDate(new Date().toISOString())}
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-4)',
              marginTop: 'var(--space-3)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-xs)',
              color: 'var(--ink-tertiary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="print-team-dot print-team-dot-usa"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--team-usa)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {teamAName}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                className="print-team-dot print-team-dot-europe"
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'var(--team-europe)',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              {teamBName}
            </span>
          </div>
        </div>

        {/* Print button - hidden in print */}
        <div className="no-print" style={{ marginBottom: 'var(--space-6)' }}>
          <button
            onClick={() => window.print()}
            className="btn-premium press-scale"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              background: 'var(--maroon)',
              color: 'var(--canvas)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Printer size={16} />
            Print Pairings
          </button>
        </div>

        {/* Sessions */}
        {sortedSessions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--ink-tertiary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <p style={{ fontSize: 'var(--text-base)' }}>No sessions found</p>
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
              Create sessions and build lineups to generate pairings.
            </p>
          </div>
        ) : (
          sortedSessions.map((session) => {
            const sessionMatches = matches
              .filter((m) => m.sessionId === session.id)
              .sort((a, b) => a.matchOrder - b.matchOrder);

            return (
              <div
                key={session.id}
                className="print-session"
                style={{ marginBottom: 'var(--space-6)' }}
              >
                {/* Session header */}
                <div
                  className="print-session-header"
                  style={{
                    background: 'var(--canvas-sunken)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                    border: '1px solid var(--rule)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-base)',
                          fontWeight: 700,
                          color: 'var(--ink-primary)',
                          margin: 0,
                        }}
                      >
                        {session.name}
                      </h2>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--ink-secondary)',
                          margin: 0,
                          marginTop: '2px',
                        }}
                      >
                        {SessionTypeDisplay[session.sessionType]}
                        {session.scheduledDate &&
                          ` \u2022 ${formatDate(session.scheduledDate)}`}
                        {session.timeSlot && ` \u2022 ${session.timeSlot}`}
                      </p>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--ink-tertiary)',
                      }}
                    >
                      {sessionMatches.length}{' '}
                      {sessionMatches.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>
                </div>

                {/* Match rows */}
                {sessionMatches.length === 0 ? (
                  <div
                    className="print-match-row"
                    style={{
                      padding: 'var(--space-4)',
                      border: '1px solid var(--rule)',
                      borderTop: 'none',
                      borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                      textAlign: 'center',
                      color: 'var(--ink-tertiary)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    No matches created yet
                  </div>
                ) : (
                  sessionMatches.map((match, index) => {
                    const isLast = index === sessionMatches.length - 1;
                    const teamANames = match.teamAPlayerIds.map((id) =>
                      getPlayerName(id, players)
                    );
                    const teamBNames = match.teamBPlayerIds.map((id) =>
                      getPlayerName(id, players)
                    );
                    const teeTime = formatTeeTime(match.teeTime);

                    return (
                      <div
                        key={match.id}
                        className="print-match-row"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          padding: 'var(--space-3) var(--space-4)',
                          border: '1px solid var(--rule)',
                          borderTop: 'none',
                          borderRadius: isLast
                            ? '0 0 var(--radius-md) var(--radius-md)'
                            : undefined,
                          background: 'var(--canvas-raised)',
                        }}
                      >
                        {/* Match order */}
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--ink-tertiary)',
                            width: '24px',
                            textAlign: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {match.matchOrder}
                        </span>

                        {/* Team A players */}
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            justifyContent: 'flex-end',
                            textAlign: 'right',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              color: 'var(--ink-primary)',
                              lineHeight: 1.3,
                            }}
                          >
                            {teamANames.join(' & ')}
                          </span>
                          <span
                            className="print-team-dot print-team-dot-usa"
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--team-usa)',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        </div>

                        {/* VS divider */}
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 700,
                            color: 'var(--ink-tertiary)',
                            padding: '0 var(--space-2)',
                            flexShrink: 0,
                          }}
                        >
                          vs
                        </span>

                        {/* Team B players */}
                        <div
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            className="print-team-dot print-team-dot-europe"
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--team-europe)',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-sm)',
                              fontWeight: 600,
                              color: 'var(--ink-primary)',
                              lineHeight: 1.3,
                            }}
                          >
                            {teamBNames.join(' & ')}
                          </span>
                        </div>

                        {/* Tee time */}
                        {teeTime && (
                          <span
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-xs)',
                              color: 'var(--ink-secondary)',
                              flexShrink: 0,
                              minWidth: '60px',
                              textAlign: 'right',
                            }}
                          >
                            {teeTime}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
