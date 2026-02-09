/**
 * Format Explainer — Inline rules sheet
 *
 * Tappable info icon that expands to show format rules.
 * Pulls data from the canonical FORMAT_CONFIGS.
 * Designed for players unfamiliar with a format.
 */

'use client';

import { useState, useCallback } from 'react';
import { Info, X, Users, Gauge, Trophy } from 'lucide-react';
import { FORMAT_CONFIGS } from '@/lib/types/matchFormats';
import type { MatchFormat } from '@/lib/types/matchFormats';

interface FormatExplainerProps {
  /** The format ID to explain */
  format: string;
  /** Compact mode: just the icon, no label */
  compact?: boolean;
  className?: string;
}

export function FormatExplainer({ format, compact = false, className }: FormatExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const config = FORMAT_CONFIGS[format as MatchFormat];
  if (!config) return null;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  const playersLabel =
    typeof config.playersPerTeam === 'number'
      ? `${config.playersPerTeam} per team`
      : `${config.playersPerTeam[0]}–${config.playersPerTeam[1]} per team`;

  return (
    <div className={className} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={handleToggle}
        className="press-scale"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: compact ? '4px' : 'var(--space-1) var(--space-2)',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          background: isOpen ? 'var(--masters)' : 'rgba(0, 103, 71, 0.08)',
          color: isOpen ? 'white' : 'var(--masters)',
          cursor: 'pointer',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          transition: 'all 150ms ease',
        }}
        aria-label={`How to play ${config.name}`}
      >
        <Info size={compact ? 14 : 12} />
        {!compact && <span>How to play</span>}
      </button>

      {/* Explainer Sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 70,
              background: 'transparent',
            }}
            onClick={handleToggle}
          />

          {/* Sheet */}
          <div
            style={{
              position: 'fixed',
              left: 'var(--space-4)',
              right: 'var(--space-4)',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              zIndex: 71,
              background: 'var(--canvas-raised)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--rule)',
              padding: 'var(--space-5)',
              maxHeight: '60vh',
              overflowY: 'auto',
              animation: 'slideUp 200ms ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div>
                <p
                  className="type-overline"
                  style={{
                    color: 'var(--masters)',
                    letterSpacing: '0.15em',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  FORMAT GUIDE
                </p>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    color: 'var(--ink)',
                  }}
                >
                  {config.name}
                </h3>
              </div>
              <button
                onClick={handleToggle}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--ink-tertiary)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <p
              className="type-body-sm"
              style={{
                color: 'var(--ink-secondary)',
                marginBottom: 'var(--space-4)',
                lineHeight: 1.6,
              }}
            >
              {config.description}
            </p>

            {/* Meta pills */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <MetaPill icon={<Users size={12} />} label={playersLabel} />
              <MetaPill icon={<Gauge size={12} />} label={config.complexity} />
              <MetaPill
                icon={<Trophy size={12} />}
                label={
                  config.scoringMode === 'both'
                    ? 'Net or Gross'
                    : config.scoringMode === 'net'
                      ? 'Net only'
                      : 'Gross only'
                }
              />
            </div>

            {/* Rules */}
            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 'var(--space-4)' }}>
              <p
                className="type-overline"
                style={{
                  letterSpacing: '0.12em',
                  color: 'var(--ink-tertiary)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                RULES
              </p>
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {config.rules.map((rule, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 'var(--space-3)',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(0, 103, 71, 0.08)',
                        color: 'var(--masters)',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="type-body-sm"
                      style={{ color: 'var(--ink)', lineHeight: 1.5 }}
                    >
                      {rule}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        background: 'rgba(0, 103, 71, 0.06)',
        color: 'var(--ink-secondary)',
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        textTransform: 'capitalize',
      }}
    >
      {icon}
      {label}
    </span>
  );
}
