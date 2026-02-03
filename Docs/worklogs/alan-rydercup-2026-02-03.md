# Worklog — Ryder Cup BattleGround — Alan — 2026-02-03 (ET)

> Branch: `alan/ryder-phase0-next`
> Plan: execute Phase 0 → Phase 1 → Phase 2 end-to-end.

## 2026-02-03

### Context / directives
- Cooper authorized continuing beyond Phase 0 and opening PRs/pushing as needed.
- Goal: complete Phase 0 exit criteria, then Phase 1 (nav spine/Today), then Phase 2 (scoring reliability).

### Work completed (morning)
- Blank-screen cleanup + correctness lint reduction:
  - `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
    - Added explicit loading/error/missing-match UI (no more infinite “Loading…” when matchId is invalid or match was deleted).
    - Surface scoringStore `error` + `isLoading` in the UI and provide Retry/Back actions.
    - Removed one `react-hooks/set-state-in-effect` warning by initializing `showAdvancedTools` via `useState` initializer.
  - `golf-ryder-cup-web/src/app/captain/audit/page.tsx`
    - Replaced `return null` gating with `PageLoadingSkeleton` to avoid blank-screen flashes during redirects.

- Offline-first integrity test coverage:
  - Added `golf-ryder-cup-web/src/__tests__/purgeQueueForTrip.test.ts` verifying `purgeQueueForTrip(tripId)` removes persisted queue items (prevents sync-queue resurrection).

### Checks
- `pnpm -C golf-ryder-cup-web lint` (107 warnings, 0 errors)
- `pnpm -C golf-ryder-cup-web test src/__tests__/purgeQueueForTrip.test.ts` ✅

### Manual QA checklist (pending execution)
- Delete Match → verify: holeResults/scoringEvents removed; score page doesn’t show deleted match; opening `/score/[matchId]` shows “Match unavailable” (no blank screen).
- Delete Session → verify: all child matches + scoring removed; no orphan matches on Score/Schedule.
- Delete Trip → verify: trip disappears; sync queue contains only (optional) trip delete; no later reappearance.
- After each delete → refresh page / reopen app → confirm no “ghost scoring” rehydrates via queued updates.

### Next (Phase 0 remaining)
1) Replace remaining user-facing `return null` routes with consistent Loading/Empty/Error UI (target: schedule/trip-stats/spectator/etc.).
2) Reduce correctness-level lint warnings, focusing on:
   - `react-hooks/set-state-in-effect` (SyncStatusIndicator(s), Celebration, AnimatedCounter, scoring components)
   - `react-hooks/exhaustive-deps` where it reflects real bugs.
3) Run manual QA checklist once browser relay is available.
