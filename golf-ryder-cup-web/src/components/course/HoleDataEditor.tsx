'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Check } from 'lucide-react';

/**
 * HOLE DATA EDITOR
 *
 * Edit par, handicap, and yardage for each of the 18 holes.
 * Displays in a compact scorecard format with front/back nine.
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

const DEFAULT_HOLES: HoleData[] = Array.from({ length: 18 }, (_, i) => ({
  par: i % 3 === 2 ? 3 : i % 5 === 0 ? 5 : 4,
  handicap: i + 1,
  yardage: null,
}));

export function createDefaultHoles(): HoleData[] {
  return DEFAULT_HOLES.map(h => ({ ...h }));
}

export function HoleDataEditor({ holes, onChange, readonly = false }: HoleDataEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const handicaps = holes.map(h => h.handicap);
    const uniqueHandicaps = new Set(handicaps);

    // Check for duplicate handicaps
    if (uniqueHandicaps.size !== 18) {
      errors.push('Each handicap (1-18) must appear exactly once');
    }

    // Check handicap range
    if (handicaps.some(h => h < 1 || h > 18)) {
      errors.push('Handicaps must be between 1 and 18');
    }

    // Check par values
    if (holes.some(h => h.par < 3 || h.par > 5)) {
      errors.push('Par must be 3, 4, or 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [holes]);

  // Calculated totals
  const totals = useMemo(() => {
    const front = holes.slice(0, 9);
    const back = holes.slice(9, 18);
    return {
      frontPar: front.reduce((sum, h) => sum + h.par, 0),
      backPar: back.reduce((sum, h) => sum + h.par, 0),
      totalPar: holes.reduce((sum, h) => sum + h.par, 0),
      frontYards: front.reduce((sum, h) => sum + (h.yardage || 0), 0),
      backYards: back.reduce((sum, h) => sum + (h.yardage || 0), 0),
      totalYards: holes.reduce((sum, h) => sum + (h.yardage || 0), 0),
    };
  }, [holes]);

  const updateHole = useCallback((index: number, field: keyof HoleData, value: number | null) => {
    const newHoles = [...holes];
    newHoles[index] = { ...newHoles[index], [field]: value };
    onChange(newHoles);
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
            Par {totals.totalPar} | {totals.totalYards > 0 ? `${totals.totalYards} yds` : 'No yardage'}
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--rule)' }}>
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

          {/* Front Nine */}
          <div className="mb-4">
            <h4 className="type-overline mb-2" style={{ color: 'var(--ink-tertiary)' }}>Front Nine</h4>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-card)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 500, width: '50px' }}>Hole</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <th key={n} style={{ padding: '8px 2px', textAlign: 'center', fontWeight: 500, width: '40px' }}>{n}</th>
                    ))}
                    <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)', width: '45px' }}>Out</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Par</td>
                    {holes.slice(0, 9).map((hole, i) => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i, 'par', '4', 3, 5)}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)' }}>
                      {totals.frontPar}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Hdcp</td>
                    {holes.slice(0, 9).map((hole, i) => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i, 'handicap', String(i + 1), 1, 18)}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', background: 'var(--masters-soft)' }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Yards</td>
                    {holes.slice(0, 9).map((hole, i) => (
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

          {/* Back Nine */}
          <div>
            <h4 className="type-overline mb-2" style={{ color: 'var(--ink-tertiary)' }}>Back Nine</h4>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-card)' }}>
                    <th style={{ padding: '8px 4px', textAlign: 'left', fontWeight: 500, width: '50px' }}>Hole</th>
                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(n => (
                      <th key={n} style={{ padding: '8px 2px', textAlign: 'center', fontWeight: 500, width: '40px' }}>{n}</th>
                    ))}
                    <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--masters-soft)', width: '45px' }}>In</th>
                    <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, background: 'var(--color-accent)', color: 'var(--masters-deep)', width: '45px' }}>Tot</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Par</td>
                    {holes.slice(9, 18).map((hole, i) => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i + 9, 'par', '4', 3, 5)}
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
                    {holes.slice(9, 18).map((hole, i) => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i + 9, 'handicap', String(i + 10), 1, 18)}
                      </td>
                    ))}
                    <td style={{ padding: '4px', textAlign: 'center', background: 'var(--masters-soft)' }}>-</td>
                    <td style={{ padding: '4px', textAlign: 'center', background: 'var(--color-accent)' }}>-</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px', fontWeight: 500 }}>Yards</td>
                    {holes.slice(9, 18).map((hole, i) => (
                      <td key={i} style={{ padding: '2px' }}>
                        {renderHoleInput(i + 9, 'yardage', '---')}
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

          {/* Quick Actions */}
          {!readonly && (
            <div className="mt-4 pt-3 flex gap-2" style={{ borderTop: '1px solid var(--rule)' }}>
              <button
                type="button"
                onClick={() => {
                  // Auto-distribute handicaps 1-18
                  const newHoles = holes.map((h, i) => ({
                    ...h,
                    handicap: i < 9
                      ? [1, 3, 5, 7, 9, 11, 13, 15, 17][i]
                      : [2, 4, 6, 8, 10, 12, 14, 16, 18][i - 9],
                  }));
                  onChange(newHoles);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: 'var(--space-2) var(--space-3)' }}
              >
                Auto Handicaps
              </button>
              <button
                type="button"
                onClick={() => {
                  // Reset to standard par 72
                  const newHoles = holes.map((h, i) => ({
                    ...h,
                    par: [4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5][i],
                  }));
                  onChange(newHoles);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: 'var(--space-2) var(--space-3)' }}
              >
                Standard Par 72
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HoleDataEditor;
