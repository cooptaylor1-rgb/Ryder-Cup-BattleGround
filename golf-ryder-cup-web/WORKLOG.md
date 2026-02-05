# WORKLOG — Ryder Cup Web Improvements

All times America/New_York.

## 2026-02-04
- 18:00 — Started NOW batch: Phase 1 sweep (blank-screen `return null`), PageHeader unification, token audit (RGB vars), Score page perf (holeResults index).
- 18:10 — Shipped batch: added `PageHeader` + migrated Score/Standings/Stats; matchups now shows explicit empty state (no redirect); token audit added `--masters-rgb`/`--canvas-rgb` + `--masters-deep`; Score page perf indexed holeResults by matchId. (commit 7bef19b)

## 2026-02-05
- 01:40 — Shipped batch: spectator mode (`/spectator/[tripId]`) now distinguishes load failures vs not-found, with a Retry path; refresh errors no longer blank the previously-loaded view. (commit a288c13)
- 01:55 — Shipped batch: updated `/lineup/new` to use the shared `BottomNav` (replacing the custom nav) and added explicit premium empty states for **No trip selected** + **Captain Mode required** so navigation is always clear. (commit a8dc84c)
- 02:05 — Shipped batch: Complete Profile (`/profile/complete`) now renders explicit premium empty states (signed out + already onboarded) instead of auto-redirecting; added `BottomNav` to keep navigation clear. (commit 2bc0cf3)
- 22:05 — Shipped batch: updated Trip Stats + Trip Awards to use the standard premium page wrapper and added `BottomNav` so navigation is always clear (including no active trip / no stats yet). (commit 6dccf48)
- 23:05 — Shipped batch: hardened the per-trip Trip Awards route (`/trip/[tripId]/awards`) with the standard premium wrapper, `BottomNav`, and explicit loading/error/empty states. (commit 31e5a1b)
- 23:34 — Shipped batch: added `BottomNav` across the match scoring detail page (main + unavailable/error states) so there’s always a clear way to navigate back out. (commit 5455aea)
- 23:58 — Shipped batch: added `BottomNav` + standardized premium wrappers to Players + Standings (including no-trip and loading states). (commit 659edbb)

## 2026-02-06
- 00:25 — Shipped batch: standardized `BottomNav` usage on More + Settings (More now includes `BottomNav`; Settings replaces the custom nav with the shared component). (commit df99c05)
- 00:55 — Shipped batch: standardized `BottomNav` usage on Bets + Bet Detail, replaced the custom nav with the shared component, and added explicit premium no-trip / loading / not-found states. (commit 256af68)
