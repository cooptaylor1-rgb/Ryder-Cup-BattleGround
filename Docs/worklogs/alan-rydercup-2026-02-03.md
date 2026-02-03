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

### Additional work (08:20 ET)
- Correctness lint reduction (set-state-in-effect):
  - `src/components/SyncStatusIndicator.tsx`
    - Load lastSyncTime via `useState` initializer (no setState-in-effect).
    - Defer pulseAnimation toggles to avoid setState-in-effect.
  - `src/components/sync/SyncStatusIndicator.tsx`
    - Defer initial `checkPending()` kickoff and interval callback invocation.
  - `src/components/ui/Celebration.tsx`
    - Defer state updates on `show/active` effects via kickoff timers.
  - `src/components/ui/AnimatedCounter.tsx`
    - Move animation state initialization into first RAF tick.
    - Make `RollingDigit` pure (CSS transition driven by prop; no effect).

- Lint status:
  - `pnpm -C golf-ryder-cup-web lint`: **98 warnings** (down from 107), 0 errors.

### Blocker
- Unable to push to remote: `Permission to ... denied to cooperworkertaylor` (git push failed). Need Cooper to confirm correct remote credentials/access or adjust git remote.

### Additional work (08:45 ET)
- Correctness lint follow-ups:
  - `golf-ryder-cup-web/src/components/SyncStatusIndicator.tsx`
    - Fixed pulse timer cleanup to avoid leaked timeouts.
  - `golf-ryder-cup-web/src/components/ui/Celebration.tsx`
    - Deferred `AchievementBadge` state transitions via timers (avoids synchronous setState in effect body).

- Audit P1 maintainability refactor (route file slimming):
  - Extracted `/app/page.tsx` into `golf-ryder-cup-web/src/components/home/HomePage.tsx` and re-exported from `/app/page.tsx`.
  - Keeps the route file tiny while preserving behavior.

### Checks (post-refactor)
- `pnpm -C golf-ryder-cup-web typecheck` ✅
- `pnpm -C golf-ryder-cup-web test` ✅

### Next (continue audit plan beyond Phase 2)
1) P1 UX reliability: replace remaining user-facing `return null` routes with consistent Loading/Empty/Error UI (lineup/new, profile, captain/manage, etc.).
2) P1/P3 cleanup: reduce correctness-level lint warnings where they represent real performance risk:
   - `react-hooks/set-state-in-effect` (AchievementUnlock, ScoreCelebration, StrokeAlertBanner, OfflineIndicator, etc.).
3) P2 reliability: ensure all polling loops are visibility-aware (live + any other pages/services).
4) Run manual QA checklist once browser relay is available.
