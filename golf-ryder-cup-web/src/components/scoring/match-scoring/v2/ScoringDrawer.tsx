/**
 * ScoringDrawer — Phase 1 peek-style bottom drawer.
 *
 * The cockpit got slimmer because everything secondary moved here. Three
 * tabs: Match (this card's holes), Standings (live session leaderboard),
 * Bets (presses + side bets). The drawer collapses to a 56px peek strip
 * that sits above the bottom nav and shows a one-line status pill.
 *
 * Drag the handle up to expand; drag down to collapse. Tap the strip to
 * toggle. Two-finger swipe-up anywhere also expands. Sheet is constrained
 * to the safe area so it doesn't ever clip behind the iOS home indicator.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { ChevronDown, ChevronUp, Coins, ListOrdered, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';
import { DrawerMatchTab } from './DrawerMatchTab';
import { DrawerStandingsTab } from './DrawerStandingsTab';
import { DrawerBetsTab } from './DrawerBetsTab';
import type { CockpitScoring, CockpitTeams, CockpitHandlers } from './types';
import type { Press } from '@/components/scoring';
import type { Match } from '@/lib/types/models';
import type { SideBet } from '@/lib/types/models';

type TabId = 'match' | 'standings' | 'bets';

const PEEK_HEIGHT = 72; // px — collapsed strip height (was 56; bumped so the
                        // drag handle and primary copy don't compete for space)
const EXPANDED_VH = 70; // 70% of viewport when expanded
const DRAG_THRESHOLD = 64;
/**
 * localStorage key for "user has opened the drawer at least once".
 * Once true, we stop showing the discoverability hint and let the
 * peek strip carry the live status info instead. Keyed broadly so a
 * captain on a multi-trip device doesn't see the hint twice.
 */
const HAS_USED_KEY = 'scoring-drawer-used';

interface ScoringDrawerProps {
  scoring: CockpitScoring;
  teams: CockpitTeams;
  handlers: Pick<CockpitHandlers, 'onJumpToHole' | 'onPress'>;
  presses: Press[];
  sideBets: SideBet[];
  match: Match;
  currentTripId?: string;
  currentPlayerIdForBets?: string;
  onSelectMatch: (matchId: string) => void;
}

export function ScoringDrawer({
  scoring,
  teams,
  handlers,
  presses,
  sideBets,
  match,
  currentTripId,
  currentPlayerIdForBets,
  onSelectMatch,
}: ScoringDrawerProps) {
  const haptic = useHaptic();
  const reducedMotion = usePrefersReducedMotion();
  const dragControls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('match');

  // Discoverability: track whether the user has opened the drawer
  // before. Until they have, the peek strip shows a louder
  // "Pull up for standings & bets" call-to-action with an animated
  // chevron — the previous 1px-tall handle was invisible at arm's
  // length and most users never realized standings + bets sat behind
  // a swipe. Once they've expanded it once we trust they remember and
  // reclaim that real-estate for the live status pill.
  // The setState IS the intentional sync-from-localStorage here — the
  // React 19 set-state-in-effect rule's preferred "derive at render"
  // doesn't apply because we're reading a side-channel (localStorage).
  const [hasUsedDrawer, setHasUsedDrawer] = useState<boolean | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === 'undefined') {
      setHasUsedDrawer(true);
      return;
    }
    setHasUsedDrawer(window.localStorage.getItem(HAS_USED_KEY) === '1');
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  const markUsed = useCallback(() => {
    setHasUsedDrawer((current) => {
      if (current === true) return current;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HAS_USED_KEY, '1');
      }
      return true;
    });
  }, []);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape when expanded.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Two-finger swipe-up anywhere → expand. Disambiguates from single-touch
  // page scroll, which already works as expected.
  useEffect(() => {
    let startY: number | null = null;
    let startCount = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        startY = e.touches[0].clientY;
        startCount = e.touches.length;
      } else {
        startY = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY == null || startCount < 2 || e.touches.length < 2) return;
      const dy = startY - e.touches[0].clientY;
      if (dy > 60 && !expanded) {
        haptic.tap();
        setExpanded(true);
        markUsed();
        startY = null;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [expanded, haptic, markUsed]);

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y < -DRAG_THRESHOLD) {
      setExpanded(true);
      markUsed();
      haptic.tap();
    } else if (info.offset.y > DRAG_THRESHOLD) {
      setExpanded(false);
      haptic.tap();
    }
  };

  const togglePeek = () => {
    haptic.tap();
    setExpanded((v) => {
      const next = !v;
      if (next) markUsed();
      return next;
    });
  };

  const peekLabel = (() => {
    const { matchState } = scoring;
    const score =
      matchState.currentScore === 0
        ? 'All square'
        : matchState.currentScore > 0
          ? `${teams.teamAName} ${matchState.currentScore}UP`
          : `${teams.teamBName} ${Math.abs(matchState.currentScore)}UP`;
    const thru =
      matchState.holesPlayed === 0
        ? 'Opening tee'
        : `Thru ${matchState.holesPlayed}`;
    return `${score} · ${thru}`;
  })();

  const peekBets =
    sideBets.filter((b) => b.status === 'active').length +
    presses.filter((p) => p.status === 'active').length;

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <button
          type="button"
          aria-label="Close drawer"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-40 bg-[color:var(--ink)]/35 backdrop-blur-[2px]"
        />
      )}

      <motion.aside
        ref={drawerRef}
        role="region"
        aria-label="Match details, standings, and bets"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        animate={
          expanded
            ? { y: 0, height: `${EXPANDED_VH}vh` }
            : { y: 0, height: PEEK_HEIGHT }
        }
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 36,
          duration: reducedMotion ? 0 : undefined,
        }}
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden border-t border-[color:var(--rule)] bg-[var(--canvas-raised)] shadow-[0_-12px_36px_rgba(26,24,21,0.10)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          // Ensure the drawer never sits under iOS home gesture zone when
          // expanded — extra padding keeps content above it.
        }}
      >
        {/* Drag handle + peek strip.
            First-run state (hasUsedDrawer === false) is louder: the
            handle is gold, gently breathing, and the copy explicitly
            tells the user what's behind the drawer. Once they've
            opened it for the first time we revert to a status pill
            with the live score + bets — the drawer is then a known
            tool and the handle just needs to be visible, not selling.
            null state (SSR / not yet hydrated) renders the calmer
            second look so we don't flash the hint on every refresh. */}
        <button
          type="button"
          onClick={togglePeek}
          onPointerDown={(e) => dragControls.start(e)}
          aria-label={
            expanded
              ? 'Collapse match details'
              : hasUsedDrawer === false
                ? 'Pull up for standings, bets, and match details'
                : 'Expand match details, standings, and bets'
          }
          aria-expanded={expanded}
          className={cn(
            'relative flex h-[72px] shrink-0 items-center justify-between gap-3 px-4 text-left transition-colors',
            hasUsedDrawer === false &&
              !expanded &&
              'bg-[linear-gradient(180deg,var(--gold-subtle)_0%,var(--canvas-raised)_72%)]'
          )}
          style={{ touchAction: 'none' }}
        >
          {/* Drag handle — taller and team-toned for visibility.
              In first-run state the handle is gold and gently breathes;
              once used it settles to a calmer rule-strong fill. */}
          <span
            aria-hidden
            className={cn(
              'absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full transition-colors',
              hasUsedDrawer === false && !expanded
                ? 'bg-[var(--gold)]'
                : 'bg-[color:var(--rule-strong)]'
            )}
          />
          {hasUsedDrawer === false && !expanded && !reducedMotion && (
            <motion.span
              aria-hidden
              className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-[var(--gold)]"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: [0.6, 0.15, 0.6], scale: [1, 1.4, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          <div className="flex min-w-0 items-center gap-3 pt-3">
            {hasUsedDrawer === false && !expanded ? (
              <>
                <ChevronUp
                  size={18}
                  className="shrink-0 text-[var(--gold-dark)]"
                  aria-hidden
                />
                <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
                  Pull up for standings &amp; bets
                </span>
                {peekBets > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--canvas-raised)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gold-dark)]">
                    <Coins size={10} />
                    {peekBets}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  Match
                </span>
                <span className="truncate font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                  {peekLabel}
                </span>
                {peekBets > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gold-dark)]">
                    <Coins size={10} />
                    {peekBets} bet{peekBets === 1 ? '' : 's'}
                  </span>
                )}
              </>
            )}
          </div>

          <span className="pt-3 text-[var(--ink-tertiary)]">
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </button>

        {/* Tabs */}
        {expanded && (
          <>
            <div
              role="tablist"
              aria-label="Drawer tabs"
              className="flex shrink-0 items-stretch gap-1 border-b border-[color:var(--rule)] px-3 pb-2"
            >
              <DrawerTab
                id="match"
                active={activeTab === 'match'}
                icon={<Trophy size={14} />}
                label="Match"
                onClick={() => setActiveTab('match')}
              />
              <DrawerTab
                id="standings"
                active={activeTab === 'standings'}
                icon={<ListOrdered size={14} />}
                label="Standings"
                onClick={() => setActiveTab('standings')}
              />
              <DrawerTab
                id="bets"
                active={activeTab === 'bets'}
                icon={<Coins size={14} />}
                label="Bets"
                count={peekBets || undefined}
                onClick={() => setActiveTab('bets')}
              />
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
              role="tabpanel"
              aria-labelledby={`drawer-tab-${activeTab}`}
            >
              {activeTab === 'match' && (
                <DrawerMatchTab
                  scoring={scoring}
                  teams={teams}
                  onJumpToHole={(hole) => {
                    handlers.onJumpToHole(hole);
                    setExpanded(false);
                  }}
                />
              )}
              {activeTab === 'standings' && (
                <DrawerStandingsTab
                  rows={scoring.sessionLeaderboard}
                  activeMatchId={scoring.matchState.match.id}
                  teamAName={teams.teamAName}
                  teamBName={teams.teamBName}
                  teamAColor={teams.teamAColor}
                  teamBColor={teams.teamBColor}
                  onSelectMatch={(matchId) => {
                    onSelectMatch(matchId);
                    setExpanded(false);
                  }}
                />
              )}
              {activeTab === 'bets' && (
                <DrawerBetsTab
                  match={match}
                  matchState={scoring.matchState}
                  presses={presses}
                  sideBets={sideBets}
                  teams={teams}
                  currentHole={scoring.currentHole}
                  currentTripId={currentTripId}
                  currentPlayerIdForBets={currentPlayerIdForBets}
                  onPress={handlers.onPress}
                />
              )}
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}

function DrawerTab({
  id,
  active,
  icon,
  label,
  count,
  onClick,
}: {
  id: TabId;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      id={`drawer-tab-${id}`}
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        active
          ? 'bg-[var(--canvas-sunken)] text-[var(--ink)]'
          : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--gold-subtle)] px-1 text-[9px] font-semibold text-[var(--gold-dark)]">
          {count}
        </span>
      )}
    </button>
  );
}
