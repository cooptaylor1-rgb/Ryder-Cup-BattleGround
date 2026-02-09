/**
 * Template Picker — Fried Egg Editorial
 *
 * Displays a grid of trip template cards for quick tournament setup.
 * Built-in templates appear first, then any custom user-saved templates.
 * Includes a "Start from Scratch" option at the bottom.
 *
 * Layout: 1 column on mobile, 2 columns on tablet+.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Trophy,
  Users,
  Zap,
  ChevronRight,
  Layers,
  PenLine,
} from 'lucide-react';
import type { TripTemplate, TemplateConfig } from '@/lib/types/templates';
import {
  calculateTemplateTotalMatches,
  calculateTemplateDays,
} from '@/lib/types/templates';
import { getTemplates } from '@/lib/services/templateService';

// ============================================
// TYPES
// ============================================

interface TemplatePickerProps {
  /** Called when a template is selected */
  onSelect: (template: TripTemplate) => void;
  /** Called when the user wants to start from scratch */
  onCustom?: () => void;
  /** Currently selected template ID (if any) */
  selectedId?: string;
  className?: string;
}

// ============================================
// HELPERS
// ============================================

/** Format session type for display */
function formatSessionType(type: string): string {
  switch (type) {
    case 'foursomes':
      return 'Foursomes';
    case 'fourball':
      return 'Fourball';
    case 'singles':
      return 'Singles';
    default:
      return type;
  }
}

/** Build a human-readable duration string from a config */
function getDurationLabel(config: TemplateConfig): string {
  const days = calculateTemplateDays(config);
  if (days === 1) return '1 day';
  return `${days} days`;
}

// ============================================
// TEMPLATE CARD
// ============================================

function TemplateCard({
  template,
  isSelected,
  onSelect,
}: {
  template: TripTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { config } = template;
  const totalMatches = calculateTemplateTotalMatches(config);
  const days = calculateTemplateDays(config);
  const sessionCount = config.sessions.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: isSelected ? 'rgba(0, 77, 51, 0.04)' : 'var(--canvas-raised)',
        border: isSelected
          ? '2px solid var(--masters)'
          : '1px solid var(--rule)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'border-color 200ms ease, box-shadow 200ms ease',
        boxShadow: isSelected ? '0 0 0 3px rgba(0, 77, 51, 0.1)' : 'none',
      }}
    >
      {/* Header row: name + builtin badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--space-2)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '1.15rem',
            fontWeight: 400,
            color: 'var(--ink)',
            lineHeight: 1.3,
          }}
        >
          {template.name}
        </h3>
        {isSelected && (
          <span
            style={{
              flexShrink: 0,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'var(--masters)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: 'var(--ink-secondary)',
          }}
        >
          {template.description}
        </p>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--rule)',
        }}
      >
        <StatChip icon={<Calendar className="w-3.5 h-3.5" />} label={getDurationLabel(config)} />
        <StatChip
          icon={<Layers className="w-3.5 h-3.5" />}
          label={`${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}`}
        />
        <StatChip
          icon={<Trophy className="w-3.5 h-3.5" />}
          label={`${totalMatches} matches`}
        />
        {config.pointsToWin && (
          <StatChip
            icon={<Zap className="w-3.5 h-3.5" />}
            label={`${config.pointsToWin} to win`}
          />
        )}
      </div>

      {/* Session breakdown (collapsed preview) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-1)',
        }}
      >
        {config.sessions.map((session, idx) => (
          <span
            key={idx}
            style={{
              fontSize: '0.7rem',
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 77, 51, 0.06)',
              color: 'var(--masters)',
              whiteSpace: 'nowrap',
            }}
          >
            {session.timeSlot && `${session.timeSlot} `}
            {formatSessionType(session.sessionType)} ({session.matchCount})
          </span>
        ))}
      </div>

      {/* Use button / arrow */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'var(--space-2)',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--masters)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Use Template
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
        {days > 1 && (
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--ink-tertiary)',
            }}
          >
            {config.teamAName} vs {config.teamBName}
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================
// STAT CHIP
// ============================================

function StatChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.75rem',
        color: 'var(--ink-secondary)',
      }}
    >
      <span style={{ color: 'var(--ink-tertiary)' }}>{icon}</span>
      {label}
    </span>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TemplatePicker({
  onSelect,
  onCustom,
  selectedId,
  className,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getTemplates();
        if (!cancelled) {
          setTemplates(all);
        }
      } catch {
        // Silently fail; show empty state
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = useCallback(
    (template: TripTemplate) => {
      onSelect(template);
    },
    [onSelect]
  );

  // Split into builtin and custom
  const builtinTemplates = templates.filter((t) => t.isBuiltin);
  const customTemplates = templates.filter((t) => !t.isBuiltin);

  if (isLoading) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-8)',
          color: 'var(--ink-tertiary)',
          fontSize: '0.85rem',
        }}
      >
        Loading templates...
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Section: Built-in Templates */}
      {builtinTemplates.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-secondary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Tournament Formats
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, 1fr)',
              gap: 'var(--space-3)',
            }}
            className="template-grid"
          >
            {builtinTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onSelect={() => handleSelect(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section: Custom (user-saved) Templates */}
      {customTemplates.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-secondary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Your Templates
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, 1fr)',
              gap: 'var(--space-3)',
            }}
            className="template-grid"
          >
            {customTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedId === template.id}
                onSelect={() => handleSelect(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom / Start from Scratch option */}
      {onCustom && (
        <button
          type="button"
          onClick={onCustom}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            width: '100%',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            background: 'transparent',
            border: '1px dashed var(--rule)',
            color: 'var(--ink-secondary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            transition: 'border-color 200ms ease, color 200ms ease',
          }}
        >
          <PenLine className="w-4 h-4" />
          Start from Scratch
        </button>
      )}

      {/* Responsive grid styles */}
      <style>{`
        @media (min-width: 640px) {
          .template-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}

export default TemplatePicker;
