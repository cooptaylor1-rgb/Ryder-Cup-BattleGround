/**
 * WeatherBanner — Rain Delay & Weather Awareness
 *
 * Shows current weather conditions and allows captains
 * to declare/lift rain delays. Visible to all players
 * when conditions warrant attention.
 */

'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';

// ============================================
// TYPES
// ============================================

export type DelayStatus = 'none' | 'weather-delay' | 'lightning-hold' | 'suspended' | 'resumed';

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
// ICON MAP
// ============================================

function WeatherIcon({ icon, size = 18 }: { icon?: string; size?: number }) {
  const props = { size, strokeWidth: 1.5 };
  switch (icon) {
    case 'sun':
      return <Sun {...props} />;
    case 'cloud-sun':
      return <CloudSun {...props} />;
    case 'cloud':
      return <Cloud {...props} />;
    case 'cloud-rain':
    case 'cloud-drizzle':
    case 'cloud-rain-wind':
      return <CloudRain {...props} />;
    case 'cloud-lightning':
      return <CloudLightning {...props} />;
    case 'wind':
      return <Wind {...props} />;
    default:
      return <CloudSun {...props} />;
  }
}

// ============================================
// DELAY CONFIG
// ============================================

const DELAY_CONFIGS: Record<
  DelayStatus,
  { label: string; bgColor: string; textColor: string; borderColor: string; icon: React.ReactNode }
> = {
  none: {
    label: 'Clear',
    bgColor: 'rgba(0, 103, 71, 0.06)',
    textColor: 'var(--masters)',
    borderColor: 'rgba(0, 103, 71, 0.15)',
    icon: <CheckCircle size={16} />,
  },
  'weather-delay': {
    label: 'Weather Delay',
    bgColor: 'rgba(161, 98, 7, 0.1)',
    textColor: 'var(--warning)',
    borderColor: 'rgba(161, 98, 7, 0.3)',
    icon: <CloudRain size={16} />,
  },
  'lightning-hold': {
    label: 'Lightning Hold',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    textColor: 'var(--error)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
    icon: <CloudLightning size={16} />,
  },
  suspended: {
    label: 'Play Suspended',
    bgColor: 'rgba(220, 38, 38, 0.1)',
    textColor: 'var(--error)',
    borderColor: 'rgba(220, 38, 38, 0.3)',
    icon: <Pause size={16} />,
  },
  resumed: {
    label: 'Play Resumed',
    bgColor: 'rgba(0, 103, 71, 0.08)',
    textColor: 'var(--success)',
    borderColor: 'rgba(0, 103, 71, 0.2)',
    icon: <Play size={16} />,
  },
};

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
  const { isCaptainMode } = useUIStore();

  const canControl = showCaptainControls && isCaptainMode;
  const config = DELAY_CONFIGS[delayStatus];
  const isActive = delayStatus !== 'none' && delayStatus !== 'resumed';

  const handleSetDelay = useCallback(
    (status: DelayStatus) => {
      onDelayChange?.(status, noteInput || undefined);
      setNoteInput('');
      setShowControls(false);
    },
    [onDelayChange, noteInput]
  );

  // Calculate delay duration
  const delayDuration = delayStartedAt
    ? Math.round((Date.now() - new Date(delayStartedAt).getTime()) / 60000)
    : 0;

  // Don't show banner when conditions are normal and no delay
  if (delayStatus === 'none' && !precipChance && !condition) {
    return null;
  }

  return (
    <div
      style={{
        background: isActive ? config.bgColor : 'var(--canvas-raised)',
        border: `1px solid ${isActive ? config.borderColor : 'var(--rule)'}`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-3) var(--space-4)',
        position: 'relative',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Weather icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-lg)',
            background: isActive ? `${config.textColor}15` : 'rgba(0, 103, 71, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? config.textColor : 'var(--ink-secondary)',
            flexShrink: 0,
          }}
        >
          {isActive ? config.icon : <WeatherIcon icon={weatherIcon} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isActive ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: config.textColor,
                  }}
                >
                  {config.label}
                </span>
                {delayDuration > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: config.textColor,
                      opacity: 0.7,
                      fontWeight: 500,
                    }}
                  >
                    {delayDuration}m
                  </span>
                )}
              </div>
              {delayNote && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--ink-secondary)',
                    marginTop: '2px',
                    lineHeight: 1.3,
                  }}
                >
                  {delayNote}
                </p>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {condition && (
                <span
                  style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {condition}
                </span>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '12px',
                  color: 'var(--ink-secondary)',
                }}
              >
                {temperature !== undefined && <span>{temperature}°F</span>}
                {windSpeed !== undefined && windSpeed > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Wind size={10} /> {windSpeed}mph
                  </span>
                )}
                {precipChance !== undefined && precipChance > 20 && (
                  <span
                    style={{
                      color: precipChance > 60 ? 'var(--warning)' : 'var(--ink-secondary)',
                      fontWeight: precipChance > 60 ? 600 : 400,
                    }}
                  >
                    {precipChance}% rain
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {canControl && (
            <button
              onClick={() => setShowControls(!showControls)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--ink-tertiary)',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Weather delay controls"
            >
              <ChevronDown
                size={16}
                style={{
                  transform: showControls ? 'rotate(180deg)' : 'none',
                  transition: 'transform 150ms',
                }}
              />
            </button>
          )}
          {onDismiss && !isActive && (
            <button
              onClick={onDismiss}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--ink-tertiary)',
              }}
              aria-label="Dismiss weather banner"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Captain controls panel */}
      {showControls && canControl && (
        <div
          style={{
            marginTop: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--rule)',
          }}
        >
          {/* Note input */}
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Optional note (e.g., 'Lightning in area')"
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--rule)',
              background: 'var(--canvas)',
              color: 'var(--ink)',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              marginBottom: 'var(--space-3)',
              outline: 'none',
            }}
          />

          {/* Delay buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {isActive ? (
              <button
                onClick={() => handleSetDelay('resumed')}
                style={{
                  flex: 1,
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--masters)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <Play size={14} /> Resume Play
              </button>
            ) : (
              <>
                <DelayButton
                  label="Weather Delay"
                  icon={<CloudRain size={12} />}
                  color="var(--warning)"
                  onClick={() => handleSetDelay('weather-delay')}
                />
                <DelayButton
                  label="Lightning"
                  icon={<CloudLightning size={12} />}
                  color="var(--error)"
                  onClick={() => handleSetDelay('lightning-hold')}
                />
                <DelayButton
                  label="Suspend"
                  icon={<AlertTriangle size={12} />}
                  color="var(--error)"
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

function DelayButton({
  label,
  icon,
  color,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${color}40`,
        background: `${color}10`,
        color,
        fontSize: '12px',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      {icon} {label}
    </button>
  );
}

export default WeatherBanner;
