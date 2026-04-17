'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * HOLE DATA EDITOR
 *
 * Edit par, handicap, and yardage for a tee set. Supports variable hole
 * counts (9-hole loops, 11/12-hole short courses, 18-hole full courses).
 * Displays in a compact scorecard format with a single "Holes" grid for
 * <= 9 holes or Front/Back splits for 10-18.
 */

export interface HoleData {
  par: number;
  handicap: number;
  yardage: number | null;
}

interface HoleDataEditorProps {
  holes: HoleData[];
  onChange: (holes: HoleData[]) => void;
  readonly?: boolean;
}

const MIN_HOLES = 1;
const MAX_HOLES = 18;

function defaultParForHole(index: number): number {
  return index % 3 === 2 ? 3 : index % 5 === 0 ? 5 : 4;
}

export function createDefaultHoles(count: number = 18): HoleData[] {
  const size = Math.max(MIN_HOLES, Math.min(MAX_HOLES, count));
  return Array.from({ length: size }, (_, i) => ({
    par: defaultParForHole(i),
    handicap: i + 1,
    yardage: null,
  }));
}

/**
 * Resize a holes array while preserving existing data. New holes fall back
 * to sensible defaults; handicaps are truncated to fit the new range.
 */
function resizeHoles(current: HoleData[], nextCount: number): HoleData[] {
  const size = Math.max(MIN_HOLES, Math.min(MAX_HOLES, nextCount));
  if (current.length === size) return current;

  if (current.length > size) {
    return current.slice(0, size).map((hole, i) => ({
      ...hole,
      // Keep handicap if it still fits, otherwise reassign by position.
      handicap: hole.handicap <= size ? hole.handicap : i + 1,
    }));
  }

  const additional = Array.from({ length: size - current.length }, (_, offset) => {
    const index = current.length + offset;
    return {
      par: defaultParForHole(index),
      handicap: index + 1,
      yardage: null,
    } satisfies HoleData;
  });
  return [...current, ...additional];
}

export function HoleDataEditor({ holes, onChange, readonly = false }: HoleDataEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const holeCount = holes.length;

  // Validation — scales with actual hole count instead of assuming 18.
  const validation = useMemo(() => {
    const errors: string[] = [];
    const handicaps = holes.map(h => h.handicap);
    const uniqueHandicaps = new Set(handicaps);

    if (uniqueHandicaps.size !== holeCount) {
      errors.push(`Each handicap (1-${holeCount}) must appear exactly once`);
    }

    if (handicaps.some(h => h < 1 || h > holeCount)) {
      errors.push(`Handicaps must be between 1 and ${holeCount}`);
    }

    if (holes.some(h => h.par < 3 || h.par > 6)) {
      errors.push('Par must be between 3 and 6');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [holes, holeCount]);

  // Front/back split — if <= 9 holes, render a single "Holes" grid.
  const splitIndex = holeCount > 9 ? 9 : holeCount;
  const hasBack = holeCount > 9;

  const totals = useMemo(() => {
    const front = holes.slice(0, splitIndex);
    const back = holes.slice(splitIndex);
    return {
      frontPar: front.reduce((sum, h) => sum + h.par, 0),
      backPar: back.reduce((sum, h) => sum + h.par, 0),
      totalPar: holes.reduce((sum, h) => sum + h.par, 0),
      frontYards: front.reduce((sum, h) => sum + (h.yardage || 0), 0),
      backYards: back.reduce((sum, h) => sum + (h.yardage || 0), 0),
      totalYards: holes.reduce((sum, h) => sum + (h.yardage || 0), 0),
    };
  }, [holes, splitIndex]);

  const updateHole = useCallback((index: number, field: keyof HoleData, value: number | null) => {
    const newHoles = [...holes];
    newHoles[index] = { ...newHoles[index], [field]: value };
    onChange(newHoles);
  }, [holes, onChange]);

  const handleHoleCountChange = useCallback((nextCount: number) => {
    onChange(resizeHoles(holes, nextCount));
  }, [holes, onChange]);

  const renderHoleInput = (index: number, field: keyof HoleData, placeholder: string, min?: number, max?: number) => {
    const value = holes[index][field];
    return (
      <input
        type="number"
        value={value === null ? '' : value}
        onChange={(e) => {
          const val = e.target.value === '' ? null : parseInt(e.target.value);
          updateHole(index, field, val as number | null);
        }}
        className="input"
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={readonly}
        style={{
          width: '100%',
          minWidth: field === 'yardage' ? '48px' : '36px',
          padding: '4px 2px',
          fontSize: '13px',
          textAlign: 'center',
        }}
      />
    );
  };

  const frontIndexes = Array.from({ length: splitIndex }, (_, i) => i);
  const backIndexes = hasBack
    ? Array.from({ length: holeCount - splitIndex }, (_, i) => splitIndex + i)
    : [];

  return (
    <div className="mt-4">
      {/* Toggle Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--rule)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="type-meta font-medium">Hole Details</span>
          {validation.isValid ? (
            <Check size={14} className="text-[var(--success)]" />
          ) : (
            <AlertCircle size={14} className="text-[var(--warning)]" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="type-micro text-[var(--ink-tertiary)]">
            {holeCount} holes · Par {totals.totalPar} | {totals.totalYards > 0 ? `${totals.totalYards} yds` : 'No yardage'}
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--rule)' }}>
          {/* Hole count selector */}
          {!readonly && (
            <div className="mb-4 flex items-center gap-3">
              <label className="type-meta font-medium" htmlFor="hole-count-input">
                Number of holes
              </label>
              <input
                id="hole-count-input"
                type="number"
                min={MIN_HOLES}
                max={MAX_HOLES}
                value={holeCount}
                onChange={(e) => {
                  const next = parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) handleHoleCountChange(next);
                }}
                className="input"
                style={{ width: '72px', padding: '4px 8px', fontSize: '14px', textAlign: 'center' }}
              />
              <span className="type-micro text-[var(--ink-tertiary)]">
                {holeCount === 18 ? 'Standard 18-hole course' : holeCount === 9 ? 'Nine-hole loop' : `${holeCount}-hole course`}
              </span>
            </div>
          )}

          {/* Validation Errors */}
          {!validation.isValid && (
            <div className="mb-4 rounded-lg border border-[color:var(--warning)] bg-[color:var(--warning)]/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--warning)]" />
                <div>
                  {validation.errors.map((error, i) => (
                    <p key={i} className="type-caption text-[var(--warning)]">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Front grid (or single grid for <=9 hole courses) */}
          <div className={hasBack ? 'mb-4' : ''}>
            <h4 className="type-overline mb-2" style={{ color: 'var(--ink-tertiary)' }}>
              {hasBack ? 'Front Nine' : 'Holes'}
            </h4>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-card)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 500, width: '50px' }}>Hole</th>
                    {frontIndexes.map(i => (
                      <th key={i} style={{ padding: '8px 2px', textAlign: 'center', fontWeight: 500, width: '40px' }}>{i + 1}</th>
                    ))}
                    <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)', width: '45px' }}>
                      {hasBack ? 'Out' : 'Tot'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Par</td>
                    {frontIndexes.map(i => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i, 'par', '4', 3, 6)}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)' }}>
                      {totals.frontPar}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Hdcp</td>
                    {frontIndexes.map(i => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i, 'handicap', String(i + 1), 1, holeCount)}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', background: 'var(--masters-soft)' }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Yards</td>
                    {frontIndexes.map(i => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i, 'yardage', '---')}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)' }}>
                      {totals.frontYards || '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Back grid (only when holeCount > 9) */}
          {hasBack && (
            <div>
              <h4 className="type-overline mb-2" style={{ color: 'var(--ink-tertiary)' }}>
                {holeCount === 18 ? 'Back Nine' : `Back ${backIndexes.length}`}
              </h4>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-card)' }}>
                      <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 500, width: '50px' }}>Hole</th>
                      {backIndexes.map(i => (
                        <th key={i} style={{ padding: '8px 2px', textAlign: 'center', fontWeight: 500, width: '40px' }}>{i + 1}</th>
                      ))}
                      <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)', width: '45px' }}>In</th>
                      <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--color-accent)', color: 'var(--masters-deep)', width: '45px' }}>Tot</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', fontWeight: 500 }}>Par</td>
                      {backIndexes.map(i => (
                        <td key={i} style={{ padding: '2px' }}>
                          {renderHoleInput(i, 'par', '4', 3, 6)}
                        </td>
                      ))}
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)' }}>
                        {totals.backPar}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--color-accent)', color: 'var(--masters-deep)' }}>
                        {totals.totalPar}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', fontWeight: 500 }}>Hdcp</td>
                      {backIndexes.map(i => (
                        <td key={i} style={{ padding: '2px' }}>
                          {renderHoleInput(i, 'handicap', String(i + 1), 1, holeCount)}
                        </td>
                      ))}
                      <td style={{ padding: '4px', textAlign: 'center', background: 'var(--masters-soft)' }}>-</td>
                      <td style={{ padding: '4px', textAlign: 'center', background: 'var(--color-accent)' }}>-</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', fontWeight: 500 }}>Yards</td>
                      {backIndexes.map(i => (
                        <td key={i} style={{ padding: '2px' }}>
                          {renderHoleInput(i, 'yardage', '---')}
                        </td>
                      ))}
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)' }}>
                        {totals.backYards || '-'}
                      </td>
                      <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--color-accent)', color: 'var(--masters-deep)' }}>
                        {totals.totalYards || '-'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {!readonly && (
            <div className="mt-4 pt-3 flex gap-2" style={{ borderTop: '1px solid var(--rule)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // Auto-distribute handicaps 1..N across the existing hole count.
                  // On an 18-hole course this produces the classic odd/even front/back
                  // split; on shorter courses it distributes sequentially.
                  const half = Math.ceil(holeCount / 2);
                  const newHoles = holes.map((h, i) => {
                    const handicap =
                      holeCount === 18
                        ? (i < 9
                            ? [1, 3, 5, 7, 9, 11, 13, 15, 17][i]!
                            : [2, 4, 6, 8, 10, 12, 14, 16, 18][i - 9]!)
                        : i < half
                          ? i * 2 + 1
                          : (i - half) * 2 + 2;
                    return { ...h, handicap };
                  });
                  onChange(newHoles);
                }}
              >
                Auto Handicaps
              </Button>
              {holeCount === 18 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const pars = [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5];
                    const newHoles = holes.map((h, i) => ({
                      ...h,
                      par: pars[i] ?? h.par,
                    }));
                    onChange(newHoles);
                  }}
                >
                  Standard Par 72
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HoleDataEditor;
