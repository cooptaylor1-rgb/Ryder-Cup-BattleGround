import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium } from '@/components/ui';
import type { SessionType } from '@/lib/types';
import {
  ALL_FORMATS,
  FORMAT_CATEGORIES,
  POPULAR_FORMATS,
  getScoringMode,
  isSupportedSessionType,
  type FormatOption,
} from './newLineupConfig';

interface NewLineupSetupStepProps {
  isSessionMode: boolean;
  isSubmitting: boolean;
  showAdvanced: boolean;
  sessionName: string;
  sessionType: SessionType;
  displayedFormats: FormatOption[];
  showAllFormats: boolean;
  matchCount: number;
  selectedType: FormatOption;
  scheduledDate: string;
  firstTeeTime: string;
  teeTimeInterval: number;
  teeTimes: string[];
  pointsPerMatch: number;
  hasEnoughPlayers: boolean;
  teamAPlayerCount: number;
  teamBPlayerCount: number;
  canProceedToLineup: boolean;
  onToggleAdvanced: () => void;
  onQuickSetup: () => void;
  onQuickAddSession: () => void;
  onSessionNameChange: (value: string) => void;
  onSelectFormat: (value: string) => void;
  onToggleShowAllFormats: () => void;
  onMatchCountChange: (value: number) => void;
  onScheduledDateChange: (value: string) => void;
  onFirstTeeTimeChange: (value: string) => void;
  onTeeTimeIntervalChange: (value: number) => void;
  onPointsPerMatchChange: (value: number) => void;
  onAddSessionToQueue: () => void;
  onContinue: () => void;
  /** Practice-session toggle. When true, pointsPerMatch is forced to 0
   *  and the session is excluded from the cup leaderboard. */
  isPracticeSession: boolean;
  onPracticeSessionChange: (value: boolean) => void;
}

export function NewLineupSetupStep({
  isSessionMode,
  isSubmitting,
  showAdvanced,
  sessionName,
  sessionType,
  displayedFormats,
  showAllFormats,
  matchCount,
  selectedType,
  scheduledDate,
  firstTeeTime,
  teeTimeInterval,
  teeTimes,
  pointsPerMatch,
  hasEnoughPlayers,
  teamAPlayerCount,
  teamBPlayerCount,
  canProceedToLineup,
  onToggleAdvanced,
  onQuickSetup,
  onQuickAddSession,
  onSessionNameChange,
  onSelectFormat,
  onToggleShowAllFormats,
  onMatchCountChange,
  onScheduledDateChange,
  onFirstTeeTimeChange,
  onTeeTimeIntervalChange,
  onPointsPerMatchChange,
  onAddSessionToQueue,
  onContinue,
  isPracticeSession,
  onPracticeSessionChange,
}: NewLineupSetupStepProps) {
  return (
    <>
      <section className="section">
        {/* Intentionally does not use the global `.card` class: `.card` pins
            background to var(--canvas-raised) (white) with higher layer
            precedence than inline styles, which blanked out the Masters-
            green gradient and left cream-on-white text invisible. Using
            Tailwind utilities + an inline gradient keeps the component
            self-contained. */}
        <div
          className="rounded-2xl border border-[color:var(--rule-faint)] p-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
            color: 'var(--canvas)',
          }}
        >
          <div className="mb-3 flex items-center gap-3">
            <Zap size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Quick Setup</span>
          </div>
          <p className="mb-4 text-sm opacity-90">
            Start with our recommended defaults. Most groups play Four-Ball with 4 matches.
          </p>
          <div className="space-y-3">
            {isSessionMode && (
              <button
                onClick={onQuickAddSession}
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[color:var(--canvas)] py-3 font-semibold text-[var(--masters)] transition-all hover:bg-[color:var(--canvas)]/92 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Adding session…' : 'Use Defaults & Add Session'}
              </button>
            )}
            <button
              onClick={onQuickSetup}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[color:var(--canvas)]/20 py-3 font-semibold transition-all hover:bg-[color:var(--canvas)]/30 backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use Defaults & Continue →
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onToggleAdvanced}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
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
              onChange={(event) => onSessionNameChange(event.target.value)}
              placeholder="e.g., Friday AM Fourball"
              className="input-field w-full"
              style={{
                padding: 'var(--space-4)',
                fontSize: 'var(--text-lg)',
                fontWeight: 500,
              }}
            />

            {/* Practice session toggle — lets Day 0 warm-up live on the
                same trip as Friday's Foursomes without polluting the
                cup leaderboard. */}
            <label
              className="mt-[var(--space-4)] flex items-start gap-[var(--space-3)] cursor-pointer rounded-[var(--radius-lg)] border p-[var(--space-4)] transition-colors"
              style={{
                borderColor: isPracticeSession
                  ? 'var(--masters)'
                  : 'var(--rule)',
                background: isPracticeSession
                  ? 'var(--masters-soft, rgba(0,102,68,0.08))'
                  : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={isPracticeSession}
                onChange={(event) => onPracticeSessionChange(event.target.checked)}
                className="mt-[2px] h-5 w-5 cursor-pointer accent-[var(--masters)]"
                aria-describedby="practice-session-hint"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">Practice round</div>
                <div
                  id="practice-session-hint"
                  className="mt-[2px] text-xs text-[var(--ink-tertiary)]"
                >
                  Runs on the trip but doesn&apos;t count toward the cup
                  leaderboard. Good for Thursday warm-up rounds before the
                  competition starts.
                </div>
              </div>
            </label>
          </section>

          <section className="section">
            <label
              className="type-overline"
              style={{ display: 'block', marginBottom: 'var(--space-4)' }}
            >
              Format
            </label>

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
              FORMAT_CATEGORIES
                .map((category) => ({
                  category,
                  formats: displayedFormats.filter((format) => format.category === category.value),
                }))
                .filter(({ formats }) => formats.length > 0)
                .map(({ category, formats }) => (
                  <div key={category.value} className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
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
                      {formats.map((format) => {
                        const isSelected = sessionType === format.value;
                        const isMatchPlay = isSupportedSessionType(format.value);
                        const scoringMode = getScoringMode(format.value);

                        return (
                          <button
                            key={format.value}
                            type="button"
                            onClick={() => {
                              if (isMatchPlay) {
                                onSelectFormat(format.value);
                              }
                            }}
                            disabled={!isMatchPlay}
                            className={`card w-full text-left transition-all ${isSelected ? 'ring-2 ring-masters' : ''} ${!isMatchPlay ? 'cursor-not-allowed opacity-70' : ''}`}
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
                                        className="rounded px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                          background: 'var(--canvas-sunken)',
                                          color: 'var(--ink-tertiary)',
                                        }}
                                      >
                                        Coming Soon
                                      </span>
                                    )}
                                    {scoringMode && (
                                      <span
                                        className="rounded px-2 py-0.5 text-[10px] font-medium"
                                        style={{
                                          background:
                                            scoringMode === 'net'
                                              ? 'rgba(0, 103, 71, 0.1)'
                                              : 'rgba(59, 130, 246, 0.1)',
                                          color:
                                            scoringMode === 'net'
                                              ? 'var(--masters)'
                                              : '#3b82f6',
                                        }}
                                      >
                                        {scoringMode === 'net'
                                          ? 'Net'
                                          : scoringMode === 'both'
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
                ))
            )}

            <div className="mt-4 text-center">
              <button
                onClick={onToggleShowAllFormats}
                className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm transition-colors hover:bg-[var(--surface-secondary)]"
                style={{ color: 'var(--masters)' }}
              >
                {showAllFormats ? 'Show Popular Only' : `Show All ${ALL_FORMATS.length} Formats`}
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showAllFormats ? 'rotate-180' : ''}`}
                />
              </button>
              {!showAllFormats && (
                <p className="mt-1 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  Showing {POPULAR_FORMATS.length} most popular formats
                </p>
              )}
            </div>
          </section>

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
                onChange={(event) => onMatchCountChange(parseInt(event.target.value, 10) || 1)}
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

          <section className="section">
            <label
              className="type-overline"
              style={{ display: 'block', marginBottom: 'var(--space-4)' }}
            >
              Schedule (Optional)
            </label>

            <div className="mb-4">
              <label className="type-micro mb-2 block">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(event) => onScheduledDateChange(event.target.value)}
                className="input-field w-full"
                style={{ padding: 'var(--space-3)' }}
              />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="type-micro mb-2 block">First Tee Time</label>
                <input
                  type="time"
                  value={firstTeeTime}
                  onChange={(event) => onFirstTeeTimeChange(event.target.value)}
                  className="input-field w-full"
                  style={{ padding: 'var(--space-3)' }}
                />
              </div>
              <div>
                <label className="type-micro mb-2 block">Interval (min)</label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={teeTimeInterval}
                  onChange={(event) =>
                    onTeeTimeIntervalChange(parseInt(event.target.value, 10) || 10)
                  }
                  className="input-field w-full text-center"
                  style={{ padding: 'var(--space-3)' }}
                />
              </div>
            </div>

            {firstTeeTime && matchCount > 0 && (
              <div
                className="card"
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--canvas-sunken)',
                }}
              >
                <label
                  className="type-micro mb-2 block"
                  style={{ color: 'var(--ink-tertiary)' }}
                >
                  Tee Times Preview
                </label>
                <div className="flex flex-wrap gap-2">
                  {teeTimes.map((time, index) => (
                    <div
                      key={`${time}-${index}`}
                      className="flex items-center gap-2 rounded-full px-3 py-1.5"
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
                onChange={(event) =>
                  onPointsPerMatchChange(parseFloat(event.target.value) || 1)
                }
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
                      Need {selectedType.playersPerTeam * matchCount} players per team. Currently:
                      Team A ({teamAPlayerCount}), Team B ({teamBPlayerCount})
                    </p>
                    <Link
                      href="/players"
                      className="type-meta mt-2 inline-block"
                      style={{ color: 'var(--masters)' }}
                    >
                      Add players →
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="section">
            <div className="grid gap-3 sm:grid-cols-2">
              {isSessionMode && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={onAddSessionToQueue}
                  disabled={!canProceedToLineup}
                  isLoading={isSubmitting}
                  loadingText="Adding Session"
                >
                  Add Session to Queue
                </Button>
              )}
              <Button
                variant="primary"
                fullWidth
                onClick={onContinue}
                disabled={!canProceedToLineup || isSubmitting}
              >
                Continue to Lineup Builder
              </Button>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export function LineupSetupFact({
  label,
  value,
  note,
  onClick,
}: {
  label: string;
  value: string | number;
  note?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center cursor-pointer transition-colors hover:bg-[var(--surface-secondary)] hover:border-[var(--masters)] active:bg-[var(--surface)]"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
      {note && <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">{note}</p>}
    </button>
  );
}
