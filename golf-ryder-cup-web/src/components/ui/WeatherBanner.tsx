/**
 * WeatherBanner — Rain Delay & Weather Awareness
 *
 * Shows current weather conditions and allows captains
 * to declare/lift rain delays. Visible to all players
 * when conditions warrant attention.
 */

'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  CloudRain,
  CloudLightning,
  CloudSun,
  Sun,
  Cloud,
  Wind,
  AlertTriangle,
  CheckCircle,
  X,
  ChevronDown,
  Pause,
  Play,
  CloudSnow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';

// ============================================
// TYPES
// ============================================

export type DelayStatus = 'none' | 'weather-delay' | 'lightning-hold' | 'suspended' | 'resumed';

type DelayTone = 'success' | 'warning' | 'danger';

type ToneStyles = {
  container: string;
  iconContainer: string;
  label: string;
  duration: string;
};

interface WeatherBannerProps {
  /** Current delay status */
  delayStatus: DelayStatus;
  /** Weather condition description */
  condition?: string;
  /** Weather icon name from weatherService */
  weatherIcon?: string;
  /** Temperature in Fahrenheit */
  temperature?: number;
  /** Wind speed in mph */
  windSpeed?: number;
  /** Precipitation probability */
  precipChance?: number;
  /** Optional captain note about the delay */
  delayNote?: string;
  /** Time delay started */
  delayStartedAt?: string;
  /** Whether to show captain controls */
  showCaptainControls?: boolean;
  /** Callback when captain changes delay status */
  onDelayChange?: (status: DelayStatus, note?: string) => void;
  /** Callback to dismiss the banner */
  onDismiss?: () => void;
}

// ============================================
// DELAY CONFIG
// ============================================

const TONE_STYLES: Record<DelayTone, ToneStyles> = {
  success: {
    container:
      'border border-[color:var(--success)]/35 bg-[color:var(--success)]/12',
    iconContainer: 'bg-[color:var(--success)]/18 text-[var(--success)]',
    label: 'text-[var(--success)]',
    duration: 'text-[var(--success)] opacity-80',
  },
  warning: {
    container:
      'border border-[color:var(--warning)]/35 bg-[color:var(--warning)]/12',
    iconContainer: 'bg-[color:var(--warning)]/18 text-[var(--warning)]',
    label: 'text-[var(--warning)]',
    duration: 'text-[var(--warning)] opacity-80',
  },
  danger: {
    container:
      'border border-[color:var(--error)]/35 bg-[color:var(--error)]/12',
    iconContainer: 'bg-[color:var(--error)]/18 text-[var(--error)]',
    label: 'text-[var(--error)]',
    duration: 'text-[var(--error)] opacity-80',
  },
};

const DELAY_CONFIGS: Record<DelayStatus, { label: string; tone: DelayTone; icon: ReactNode }> = {
  none: {
    label: 'Clear',
    tone: 'success',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  'weather-delay': {
    label: 'Weather Delay',
    tone: 'warning',
    icon: <CloudRain className="h-4 w-4" />,
  },
  'lightning-hold': {
    label: 'Lightning Hold',
    tone: 'danger',
    icon: <CloudLightning className="h-4 w-4" />,
  },
  suspended: {
    label: 'Play Suspended',
    tone: 'danger',
    icon: <Pause className="h-4 w-4" />,
  },
  resumed: {
    label: 'Play Resumed',
    tone: 'success',
    icon: <Play className="h-4 w-4" />,
  },
};

// ============================================
// ICON MAP
// ============================================

function WeatherIcon({ icon }: { icon?: string }) {
  const normalized = icon?.toLowerCase() ?? '';
  const commonProps = { strokeWidth: 1.5 } as const;

  if (normalized.includes('snow')) {
    return <CloudSnow {...commonProps} className="h-8 w-8 text-[color:var(--info)]/80" />;
  }

  switch (normalized) {
    case 'sun':
      return <Sun {...commonProps} className="h-8 w-8 text-[var(--gold)]" />;
    case 'cloud-sun':
      return <CloudSun {...commonProps} className="h-8 w-8 text-[var(--ink-tertiary)]" />;
    case 'cloud':
      return <Cloud {...commonProps} className="h-8 w-8 text-[var(--ink-tertiary)]" />;
    case 'cloud-rain':
    case 'cloud-drizzle':
    case 'cloud-rain-wind':
      return <CloudRain {...commonProps} className="h-8 w-8 text-[var(--info)]" />;
    case 'cloud-lightning':
      return <CloudLightning {...commonProps} className="h-8 w-8 text-[var(--warning)]" />;
    case 'wind':
      return <Wind {...commonProps} className="h-8 w-8 text-[var(--ink-tertiary)]" />;
    default:
      return <CloudSun {...commonProps} className="h-8 w-8 text-[var(--ink-tertiary)]" />;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function WeatherBanner({
  delayStatus,
  condition,
  weatherIcon,
  temperature,
  windSpeed,
  precipChance,
  delayNote,
  delayStartedAt,
  showCaptainControls = false,
  onDelayChange,
  onDismiss,
}: WeatherBannerProps) {
  const [showControls, setShowControls] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { isCaptainMode } = useUIStore();

  const canControl = showCaptainControls && isCaptainMode;
  const config = DELAY_CONFIGS[delayStatus];
  const toneStyle = TONE_STYLES[config.tone];
  const isActive = delayStatus !== 'none' && delayStatus !== 'resumed';

  const handleSetDelay = useCallback(
    (status: DelayStatus) => {
      onDelayChange?.(status, noteInput.trim() || undefined);
      setNoteInput('');
      setShowControls(false);
    },
    [noteInput, onDelayChange]
  );

  useEffect(() => {
    if (!delayStartedAt) return;

    // Keep the banner's duration indicator fresh without calling Date.now() during render.
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [delayStartedAt]);

  const delayDuration = delayStartedAt
    ? Math.round((nowMs - new Date(delayStartedAt).getTime()) / 60000)
    : 0;

  // Don't show banner when conditions are normal and no delay.
  // Note: values like 0 are meaningful (e.g., 0% precip), so we check for null/undefined.
  const hasAnyWeatherSignal =
    condition != null ||
    precipChance != null ||
    temperature != null ||
    windSpeed != null;

  if (delayStatus === 'none' && !hasAnyWeatherSignal) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative rounded-[var(--radius-xl)] px-[var(--space-4)] py-[var(--space-3)] transition-colors',
        isActive
          ? toneStyle.container
          : 'border border-[color:var(--rule)]/35 bg-[var(--canvas-raised)]'
      )}
    >
      {/* Main row */}
      <div className="flex items-center gap-[var(--space-3)]">
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[var(--ink-secondary)]',
            isActive
              ? toneStyle.iconContainer
              : 'bg-[color:var(--masters)]/12 text-[var(--ink-secondary)]'
          )}
        >
          {isActive ? config.icon : <WeatherIcon icon={weatherIcon} />}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {isActive ? (
            <>
              <div className="flex items-center gap-[var(--space-2)]">
                <span className={cn('font-sans text-sm font-semibold', toneStyle.label)}>
                  {config.label}
                </span>
                {delayDuration > 0 && (
                  <span className={cn('text-[11px] font-medium', toneStyle.duration)}>
                    {delayDuration}m
                  </span>
                )}
              </div>
              {delayNote && (
                <p className="mt-1 text-xs leading-tight text-[var(--ink-secondary)]">{delayNote}</p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-[var(--space-3)]">
              {condition && (
                <span className="font-sans text-sm font-medium text-[var(--ink-primary)]">
                  {condition}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-secondary)]">
                {temperature !== undefined && <span>{temperature}°F</span>}
                {windSpeed !== undefined && windSpeed > 0 && (
                  <span className="flex items-center gap-1">
                    <Wind className="h-3 w-3" />
                    {windSpeed}mph
                  </span>
                )}
                {precipChance !== undefined && precipChance > 20 && (
                  <span
                    className={cn(
                      'font-medium',
                      precipChance > 60
                        ? 'text-[var(--warning)]'
                        : 'text-[var(--ink-secondary)]'
                    )}
                  >
                    {precipChance}% rain
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {canControl && (
            <button
              type="button"
              onClick={() => setShowControls((prev) => !prev)}
              className="flex items-center rounded-md p-1 text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink-secondary)]"
              aria-label="Weather delay controls"
            >
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', showControls && 'rotate-180')}
              />
            </button>
          )}
          {onDismiss && !isActive && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center rounded-md p-1 text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink-secondary)]"
              aria-label="Dismiss weather banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Captain controls panel */}
      {showControls && canControl && (
        <div className="mt-[var(--space-3)] border-t border-[var(--rule)] pt-[var(--space-3)]">
          <label className="block">
            <span className="sr-only">Delay note</span>
            <input
              type="text"
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
              placeholder="Optional note (e.g., 'Lightning in area')"
              className="w-full rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)] text-[13px] font-sans text-[var(--ink)] placeholder:text-[var(--ink-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/35"
            />
          </label>

          <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
            {isActive ? (
              <button
                type="button"
                onClick={() => handleSetDelay('resumed')}
                className="flex flex-1 items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--masters)] px-[var(--space-3)] py-[var(--space-2)] font-sans text-xs font-semibold text-[var(--canvas)] transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/35"
              >
                <Play className="h-3.5 w-3.5" /> Resume Play
              </button>
            ) : (
              <>
                <DelayButton
                  label="Weather Delay"
                  icon={<CloudRain className="h-3.5 w-3.5" />}
                  variant="warning"
                  onClick={() => handleSetDelay('weather-delay')}
                />
                <DelayButton
                  label="Lightning"
                  icon={<CloudLightning className="h-3.5 w-3.5" />}
                  variant="danger"
                  onClick={() => handleSetDelay('lightning-hold')}
                />
                <DelayButton
                  label="Suspend"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  variant="danger"
                  onClick={() => handleSetDelay('suspended')}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DelayButtonProps {
  label: string;
  icon: ReactNode;
  variant: 'warning' | 'danger';
  onClick: () => void;
}

function DelayButton({ label, icon, variant, onClick }: DelayButtonProps) {
  const variantClasses =
    variant === 'warning'
      ? 'border-[color:var(--warning)]/35 bg-[color:var(--warning)]/12 text-[var(--warning)] hover:bg-[color:var(--warning)]/18'
      : 'border-[color:var(--error)]/35 bg-[color:var(--error)]/12 text-[var(--error)] hover:bg-[color:var(--error)]/18';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-md)] border px-[var(--space-3)] py-[var(--space-2)] font-sans text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/35',
        variantClasses
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default WeatherBanner;
