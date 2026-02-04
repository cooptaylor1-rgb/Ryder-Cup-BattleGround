'use client';

import type React from 'react';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  icon,
  onBack,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="header-premium">
      <div className="container-editorial flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 press-scale"
              style={{
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                {title}
              </span>
              {subtitle && (
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
