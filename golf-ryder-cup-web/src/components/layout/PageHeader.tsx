'use client';

import type React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useTripStore } from '@/lib/stores/tripStore';
import { useSmartBack } from '@/lib/hooks/useSmartBack';

/**
 * A single segment in a breadcrumb trail. When `href` is provided the segment
 * renders as a link; otherwise it renders as plain text (typically the last
 * segment, which represents the current page).
 */
export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

/**
 * Semantic icon-tone presets. Each maps to a consistent background
 * gradient + shadow so captain pages always look like captain pages,
 * admin always looks like admin, etc. Use `iconContainerClassName` as
 * an escape hatch for one-offs.
 */
export type PageHeaderIconTone = 'neutral' | 'captain' | 'admin' | 'action';

const ICON_TONE_CLASSES: Record<PageHeaderIconTone, string> = {
  /** Default — masters green. Used for general feature pages. */
  neutral:
    'bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] shadow-[var(--shadow-glow-green)]',
  /** Maroon/command — used for captain tools and captain sub-pages. */
  captain:
    'bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] shadow-[0_0_0_3px_rgba(114,47,55,0.10)]',
  /** Red/danger — used for admin and destructive contexts. */
  admin:
    'bg-[linear-gradient(135deg,var(--error)_0%,var(--maroon-dark)_100%)] shadow-[0_2px_8px_color-mix(in_srgb,var(--error)_30%,transparent)]',
  /** Masters green with extra glow — for active-play / scoring pages. */
  action:
    'bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] shadow-[var(--shadow-glow-green)]',
};

export function PageHeader({
  title,
  subtitle,
  icon,
  onBack,
  backFallback,
  breadcrumbs,
  rightSlot,
  iconTone,
  iconContainerStyle,
  iconContainerClassName,
  hideSyncBadge = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /**
   * Explicit back handler. When both `onBack` and `backFallback` are omitted,
   * no back button is rendered (preserves existing call sites that simply
   * don't want one, e.g. the home page).
   */
  onBack?: () => void;
  /**
   * Enables a consistent history-aware back button. When set, the back button
   * calls `router.back()` if there is in-app history, otherwise it navigates
   * to this fallback route. Prefer this over writing bespoke `onBack`
   * handlers on every page.
   *
   * Ignored when `onBack` is provided.
   */
  backFallback?: string;
  /**
   * Optional breadcrumb trail rendered below the title. The last segment
   * should typically omit `href` (it's the current page).
   *
   * Example: [{ label: 'Home', href: '/' }, { label: 'Captain', href: '/captain' }, { label: 'Manage' }]
   */
  breadcrumbs?: BreadcrumbSegment[];
  rightSlot?: React.ReactNode;
  /**
   * Semantic tone for the icon container. Maps to a consistent background
   * gradient and shadow. Takes precedence over the default green gradient
   * but is overridden by `iconContainerClassName` when both are set.
   *
   *   neutral  — masters green (default for feature pages)
   *   captain  — maroon (captain tools)
   *   admin    — red (destructive / admin contexts)
   *   action   — masters green with glow (scoring / live-play)
   */
  iconTone?: PageHeaderIconTone;
  /** @deprecated Prefer `iconTone` for new pages. Kept as an escape hatch. */
  iconContainerStyle?: React.CSSProperties;
  /** @deprecated Prefer `iconTone` for new pages. Kept as an escape hatch. */
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
  const smartBack = useSmartBack(backFallback ?? '/');
  const showSyncBadge = !hideSyncBadge && Boolean(currentTrip);

  // Resolve the back behavior. Explicit `onBack` wins; `backFallback` opts in
  // to smart history-aware back; no prop means no back button (home-style).
  const backHandler = onBack ?? (backFallback ? smartBack : null);

  return (
    <header className="header-premium">
      <div className="container-editorial flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {backHandler ? (
            <button
              type="button"
              onClick={backHandler}
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
                  'w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center shrink-0',
                  // Explicit className wins; otherwise fall back to the tone
                  // preset (or the default 'neutral' green gradient).
                  iconContainerClassName ?? ICON_TONE_CLASSES[iconTone ?? 'neutral']
                )}
                style={iconContainerStyle}
              >
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              <span className="type-overline tracking-[0.1em]">{title}</span>
              {subtitle ? <p className="type-caption truncate mt-[2px]">{subtitle}</p> : null}
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <nav
                  aria-label="Breadcrumb"
                  className="mt-[2px] flex items-center gap-1 overflow-hidden"
                >
                  <ol className="flex items-center gap-1 text-[11px] leading-none text-[var(--ink-tertiary)]">
                    {breadcrumbs.map((segment, idx) => {
                      const isLast = idx === breadcrumbs.length - 1;
                      return (
                        <li
                          key={`${segment.label}-${idx}`}
                          className="flex items-center gap-1 min-w-0"
                        >
                          {segment.href && !isLast ? (
                            <Link
                              href={segment.href}
                              className="truncate text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] no-underline"
                            >
                              {segment.label}
                            </Link>
                          ) : (
                            <span
                              className={cn(
                                'truncate',
                                isLast
                                  ? 'font-medium text-[var(--ink-secondary)]'
                                  : 'text-[var(--ink-tertiary)]'
                              )}
                              aria-current={isLast ? 'page' : undefined}
                            >
                              {segment.label}
                            </span>
                          )}
                          {!isLast ? (
                            <ChevronRight
                              size={11}
                              strokeWidth={1.75}
                              className="shrink-0 text-[var(--ink-faint)]"
                              aria-hidden="true"
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              ) : null}
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
