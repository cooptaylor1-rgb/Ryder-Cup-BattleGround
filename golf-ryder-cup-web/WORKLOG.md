# WORKLOG — Ryder Cup Web Improvements

All times America/New_York.

## 2026-02-04
- 18:00 — Started NOW batch: Phase 1 sweep (blank-screen `return null`), PageHeader unification, token audit (RGB vars), Score page perf (holeResults index).
- 18:10 — Shipped batch: added `PageHeader` + migrated Score/Standings/Stats; Matchups now shows explicit empty state (no redirect); token audit added `--masters-rgb`/`--canvas-rgb` + `--masters-deep`; Score page perf indexed holeResults by matchId. (commit 7bef19b)

## 2026-02-05
- 01:25 — Shipped batch: added explicit signed-out empty states for Schedule + Score (with CTAs to `/login`) and included `BottomNav` for consistent navigation. (commit 85f9312)
- 01:40 — Shipped batch: spectator mode (`/spectator/[tripId]`) now distinguishes load failures vs not-found, with a Retry path; refresh errors no longer blank the previously-loaded view. (commit a288c13)
- 01:55 — Shipped batch: updated `/lineup/new` to use the shared `BottomNav` (replacing the custom nav) and added explicit premium empty states for **No trip selected** + **Captain Mode required** so navigation is always clear. (commit a8dc84c)
- 02:05 — Shipped batch: Complete Profile (`/profile/complete`) now renders explicit premium empty states (signed out + already onboarded) instead of auto-redirecting; added `BottomNav` to keep navigation clear. (commit 2bc0cf3)
- 03:45 — Shipped batch: Courses (`/courses`) and New Course (`/courses/new`) now include the standard premium wrapper (`pb-nav`) and `BottomNav`, including in the course database search modal, so navigation is always available. (commit 0b57d6f)
- 10:20 — Shipped batch: Scoring match detail (`/score/[matchId]`) now shows an explicit signed-out premium empty state (Sign In + Back to Score CTAs) and includes `BottomNav` so deep links aren’t dead ends when unauthenticated. (commit 278add9)
- 10:45 — Shipped batch: Standings Fun Stats tab now uses the standard `EmptyStatePremium` for the “No stats yet” state, with a clear CTA to start tracking Trip Stats. (commit e52f2b0)
- 10:55 — Shipped batch: Standings Fun Stats category sections now precompute displayable categories instead of `return null` inside `map()`, and fall back to the premium empty state if nothing renders (edge case). (commit 1de47dc)
- 11:20 — Shipped batch: Captain pages now render explicit premium empty states (no-trip / Captain Mode off) instead of auto-redirecting away, preventing confusing skeleton/blank-ish flashes. (commit 8e794b6)
- 17:15 — Shipped batch: Docs — added a dedicated `rg` sweep command for detecting top-level `return null;` blank-screen returns in route `page.tsx` files. (commit 21ec8be)
- 20:10 — Shipped batch: removed missing-trip auto-redirects on Social + Live; now uses consistent `EmptyStatePremium` + `BottomNav` so users land on a clear explanation + navigation. (commit 76198a5)
- 20:45 — Shipped batch: Achievements removed missing-trip auto-redirect; now shows a premium empty state with clear CTAs. (commit c3fdca6)
- 21:10 — Shipped batch: Stats hub uses a consistent premium empty state (no active trip) and includes `BottomNav`. (commit f798894)
- 21:35 — Shipped batch: Matchups uses a consistent premium empty state (no active trip) and includes `BottomNav`. (commit a09ca56)
- 22:05 — Shipped batch: updated Trip Stats + Trip Awards to use the standard premium page wrapper and added `BottomNav` so navigation is always clear (including no active trip / no stats yet). (commit 6dccf48)
- 22:30 — Shipped batch: Trip Settings (`/trip/[tripId]/settings`) now uses the standard premium wrapper + `BottomNav` and renders explicit loading/error/not-found states. (commit 4c70f5e)
- 23:05 — Shipped batch: hardened the per-trip Trip Awards route (`/trip/[tripId]/awards`) with the standard premium wrapper, `BottomNav`, and explicit loading/error/empty states. (commit 31e5a1b)
- 23:05 — Shipped batch: Backup & Restore (`/settings/backup`) now renders explicit loading/load-error/no-trips empty states + includes `BottomNav` (no silent failures). (commit 6604d23)
- 23:34 — Shipped batch: added `BottomNav` across the match scoring detail page (main + unavailable/error states) so there’s always a clear way to navigate back out. (commit 5455aea)
- 23:58 — Shipped batch: added `BottomNav` + standardized premium wrappers to Players + Standings (including no-trip and loading states). (commit 659edbb)
- 17:40 — Phase 1 (batch 63): sweep note: re-ran the strict `rg "^\s*return null;\s*$"` route scan and confirmed there are no remaining top-level `return null;` blank-screen returns in `src/app/**/page.tsx`; remaining `return null` hits in routes are limited to internal helpers/`useMemo` values (not user-facing blank screens).

## 2026-02-06
- 00:25 — Shipped batch: standardized `BottomNav` usage on More + Settings (More now includes `BottomNav`; Settings replaces the custom nav with the shared component). (commit df99c05)
- 00:55 — Shipped batch: standardized `BottomNav` usage on Bets + Bet Detail, replaced the custom nav with the shared component, and added explicit premium no-trip / loading / not-found states. (commit 256af68)
- 01:10 — Shipped batch: Captain routes’ empty-state screens upgraded to the standard premium wrapper and include `BottomNav`, so navigation is always available even when Captain Mode is off / no trip is selected. (commit 65f183e)
- 03:45 — Shipped batch: Worklog sync — ensured the web worklog reflects the shipped Phase 1 improvements so in-repo history matches Lobster worklog. (commit b039ec6)
- 04:20 — Shipped batch: Achievements now uses the shared `BottomNav` (including no-trip and loading states). Settings subpages (Appearance/Scoring/Notifications) now include `BottomNav` + `pb-nav` so navigation is always available. (commit bb1f9e3)
- 04:45 — Shipped batch: app-level Not Found + route error pages standardized to the premium layout (`pb-nav` + texture) and now include `BottomNav` so recovery screens aren’t dead ends. (commit 6987064)
- 04:58 — Shipped batch: lint hygiene — removed unused imports (Players, Bets, Course library search API route). (commit 3770052)
- 05:35 — Shipped batch: added `BottomNav` to Login (`/login`) and Admin (`/admin`) so signed-out / access-gated screens still have clear navigation. (commit 9da832a)
- 06:05 — Shipped batch: lint hygiene — removed / underscored unused variables to reduce lint noise (New Lineup, Create Profile icons, PendingSyncIndicator catch). (commit 8b69976)
- 06:30 — Shipped batch: lint hygiene — removed an unused `eslint-disable-next-line react-hooks/preserve-manual-memoization` from `featureFlags.tsx` to reduce warning noise. (commit 971f463)
- 07:55 — Shipped batch: Profile now keeps `BottomNav` visible while editing by lifting the fixed “Save Changes” bar above the nav height (no dead-end edit mode). (commit b6a3f87)
- 08:20 — Shipped batch: More (`/more`) now shows an explicit premium empty state when every menu section is hidden by context (signed out / no trip / Captain-only tools), preventing a confusing “blank” hub. (commit 16f8a0a)
- 10:05 — Shipped batch: Profile Create (`/profile/create`) now includes the standard premium wrapper + `BottomNav`, and the fixed bottom actions are lifted above the nav height so onboarding screens aren’t dead ends. (commit 016fe81)
- 11:40 — Shipped batch: lint hygiene sweep — removed unused icon imports/vars, fixed hook deps in AuthGuard, and stabilized memo deps in Vegas side game card (reduces lint warnings without behavior changes).
- 12:15 — Shipped batch: Standings Fun Stats: removed `return null` usage inside the stat-type map (uses a reduce/push) to avoid silent render gaps and keep Phase 1 “no blank returns” consistent. (commit c185928)
- 12:45 — Shipped batch: Spectator Mode (`/spectator/[tripId]`) adds bottom padding so the fixed “Last updated” footer doesn’t cover the last section on smaller screens. (commit baee815)
- 13:15 — Shipped batch: `/lineup/new` precomputes and filters format categories instead of `return null` inside the format category map, preventing silent render gaps when filters hide a category. (commit 6087b1e)
- 13:45 — Shipped batch: Settings subpages (`/settings/appearance`, `/settings/scoring`) upgraded to the standard premium wrapper + shared `PageHeader` for consistent navigation and layout. Scoring toggles aligned to the actual `ScoringPreferences` keys (no orphan controls). (commit 7a45cc3)
- 14:01 — Shipped batch: Captain Bets winner selection no longer uses `return null` inside `map()` when a participant record is missing; we now prefilter so the UI never silently drops buttons. (commit 1f44b15)
- 14:35 — Shipped batch: Standings Fun Stats CTAs now use `router.push()` instead of `window.location.href` to avoid full page reloads and keep navigation consistent. (commit 3d2bac3)
- 15:55 — Shipped batch: Settings — Notifications (`/settings/notifications`) now uses the standard premium wrapper + shared `PageHeader` (removes bespoke sticky header) for consistent layout/navigation. (commit 354e05a)
- 16:25 — Shipped batch: Captain Bets winner selection buttons now prefilter with `flatMap()` instead of `return null` inside `map()`, avoiding silent render gaps if a participant record is missing. (commit 0805cd2)
- 16:45 — Shipped batch: Stableford scorecard score input buttons now prefilter valid values instead of `return null` inside `map()` to avoid silent render gaps and keep the Phase 1 “no null map returns” pattern consistent. (commit 22191a2)
