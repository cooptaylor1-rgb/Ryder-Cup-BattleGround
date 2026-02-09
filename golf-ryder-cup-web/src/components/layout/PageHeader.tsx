'use client';

import type React from 'react';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  icon,
  onBack,
  rightSlot,
  iconContainerStyle,
  iconContainerClassName,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  iconContainerStyle?: React.CSSProperties;
  iconContainerClassName?: string;
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
              <ChevronLeft size={20} strokeWidth={1.25} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className={iconContainerClassName}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--masters)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  ...iconContainerStyle,
                }}
              >
                {icon}
              </div>
            )}

            <div className="min-w-0">
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </span>
              {subtitle && (
                <p className="type-caption truncate" style={{ marginTop: '1px' }}>
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
