'use client';

import type React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

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
          {onBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 press-scale text-[var(--ink-secondary)] bg-transparent border-0 cursor-pointer rounded-[var(--radius-md)]"
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
          ) : null}

          <div className="flex items-center gap-3 min-w-0">
            {icon ? (
              <div
                className={cn(
                  'w-8 h-8 rounded-[var(--radius-md)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] flex items-center justify-center shadow-[var(--shadow-glow-green)] shrink-0',
                  iconContainerClassName
                )}
                style={iconContainerStyle}
              >
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              <span className="type-overline tracking-[0.1em]">{title}</span>
              {subtitle ? <p className="type-caption truncate mt-[2px]">{subtitle}</p> : null}
            </div>
          </div>
        </div>

        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
