'use client';

import { AlertTriangle } from 'lucide-react';

export interface ValidationPanelProps {
  errors: string[];
  warnings: string[];
}

export function ValidationPanel({ errors, warnings }: ValidationPanelProps) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--error)] text-[var(--canvas)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Cannot publish</p>
              <ul className="mt-1 text-xs text-[color:var(--canvas)]/80 space-y-0.5">
                {errors.slice(0, 3).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-[var(--warning)] text-[var(--canvas)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Warnings</p>
              <ul className="mt-1 text-xs text-[color:var(--canvas)]/80 space-y-0.5">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
