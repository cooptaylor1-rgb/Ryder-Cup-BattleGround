'use client';

import type React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useTripStore } from '@/lib/stores/tripStore';

export function PageHeader({
  title,
  subtitle,
  icon,
  onBack,
  rightSlot,
  iconContainerStyle,
  iconContainerClassName,
  hideSyncBadge = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
  iconContainerStyle?: React.CSSProperties;
  iconContainerClassName?: string;
  /**
   * Hide the global trip sync badge. Defaults to false so that every page
   * using PageHeader surfaces real-time sync state — critical during a live
   * event on flaky course Wi-Fi. Set true on screens that are intentionally
   * outside any trip context (e.g. landing, sign-in).
   */
  hideSyncBadge?: boolean;
}) {
  const currentTrip = useTripStore((state) => state.currentTrip);
  const showSyncBadge = !hideSyncBadge && Boolean(currentTrip);
  return (
    <header className="header-premium">
      <div className="container-editorial flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button
              type="button"
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

        {(showSyncBadge || rightSlot) && (
          <div className="flex shrink-0 items-center gap-2">
            {showSyncBadge ? <SyncStatusBadge /> : null}
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
}
