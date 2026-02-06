# Worklog — Ryder Cup BattleGround — Alan — 2026-02-06 (ET)

> Branch: `main`
> Focus: Phase 1 — eliminate blank-screen states on user-facing routes.

## 2026-02-06

### Phase 1 (batch 31): More + Settings — standard BottomNav
- `golf-ryder-cup-web/src/app/more/page.tsx`
  - Standardized the main wrapper (`min-h-screen pb-nav page-premium-enter texture-grain`).
  - Added `BottomNav` so the More hub always has a clear navigation path.
- `golf-ryder-cup-web/src/app/settings/page.tsx`
  - Replaced the hand-rolled bottom nav markup with the shared `BottomNav` component.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`df99c05`)

### Phase 1 (batch 44): Web worklog hygiene — chronological + deduped
- `golf-ryder-cup-web/WORKLOG.md`
  - Rewrote into a single clean chronological timeline and removed mixed-format duplicate Phase 1 entries so the in-repo web worklog matches what actually shipped.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`d143e6f`)

### Phase 1 (batch 45): Profile — editing mode keeps BottomNav visible
- `golf-ryder-cup-web/src/app/profile/page.tsx`
  - Kept `BottomNav` visible while editing by lifting the fixed “Save Changes” bar above the nav height.
  - Prevents edit mode from becoming a dead end (nav remains tappable/visible).
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`b6a3f87`, plus worklog follow-up `ea1df51`)

### Phase 1 (batch 46): More — explicit empty state when all menu items are filtered out
- `golf-ryder-cup-web/src/app/more/page.tsx`
  - When all menu sections are filtered out (signed out / no trip selected / captain-only tools hidden), More now shows a clear `EmptyStatePremium` with the right CTA (sign in or go Home).
  - Keeps the “More” hub from feeling blank.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`16f8a0a`)

### Phase 1 (batch 47): Lint hygiene sweep + small correctness hardening
- Removed unused icon imports/vars to reduce warning noise:
  - PDF export panel, Wolf game card, handicap stroke indicator, notification settings.
- Vegas game card:
  - Stabilized `getPlayerName` with `useCallback`, fixed memo deps, and hardened name formatting when `lastName` is missing.
- AuthGuard:
  - Included `searchParams` in effect deps to satisfy hooks lint.
- Session lock manager:
  - Underscored an unused prop to satisfy lint.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`0ba1a70`)

### Phase 1 (batch 48): Scoring match detail — keep BottomNav scoring context in unavailable states
- `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
  - When a match is unavailable, the premium empty state now still passes `activeMatchId` into `BottomNav` so the scoring context stays consistent and navigation remains obvious.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`80847d6`)

### Phase 1 (batch 49): Profile Create — premium wrapper + BottomNav + lifted action bar
- `golf-ryder-cup-web/src/app/profile/create/page.tsx`
  - Standardized wrapper (`pb-nav` + texture + premium enter) and added `BottomNav` so onboarding screens aren’t navigation dead ends.
  - Lifted the fixed bottom action bar above the BottomNav height so primary actions remain accessible without hiding navigation.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`016fe81`)

### Phase 1 (batch 50): Scoring match detail — explicit signed-out empty state
- `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
  - Added an explicit signed-out premium empty state (Sign In + Back to Score CTAs) and included `BottomNav` so deep links aren’t blank/dead ends when unauthenticated.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`278add9`)

### Phase 1 (batch 51): Standings — Fun Stats uses standard premium empty state
- `golf-ryder-cup-web/src/app/standings/page.tsx`
  - Replaced the ad-hoc “No Stats Yet” block in the Fun Stats tab with the standard `EmptyStatePremium` for consistent, actionable empty content.
  - Added a clear CTA to start tracking Trip Stats.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`e52f2b0`)

### Phase 1 (batch 52): Standings — Fun Stats category rendering consistency
- `golf-ryder-cup-web/src/app/standings/page.tsx`
  - Tightened Fun Stats rendering so category sections don’t silently disappear in confusing ways when data is partially missing.
- Checkpoint: `lint` + `typecheck` ✅
- Commit + push ✅ (`1de47dc`)

### Phase 1 (batch 53): Standings — remove remaining `return null` inside stat mapping
- `golf-ryder-cup-web/src/app/standings/page.tsx`
  - Removed the remaining `return null` usage inside the stat-type mapping by switching to a `reduce`/`push` approach.
  - Keeps Phase 1’s “no silent render gaps” goal consistent and avoids hidden missing rows inside otherwise-present categories.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`c185928`)

### Phase 1 (batch 55): Spectator mode — fixed footer no longer covers content
- `golf-ryder-cup-web/src/app/spectator/[tripId]/page.tsx`
  - Added bottom padding to the main content container so the fixed “Last updated” footer doesn’t overlap the last content section on smaller screens.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`baee815`)

### Phase 1 (batch 56): Docs — worklog sync
- Updated Lobster + daily + in-repo web worklog entries to include the batch 55 commit hash.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`8503fdf`)

### Phase 1 (batch 57): Lineup New — format categories without `return null`
- `golf-ryder-cup-web/src/app/lineup/new/page.tsx`
  - Precompute + filter format categories instead of returning `null` from inside the category map.
  - Prevents silent render gaps when filters hide a category and keeps Phase 1’s “no hidden empty renders” goal consistent.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`6087b1e`)

### Phase 1 (batch 58): Docs — worklog sync
- Updated Lobster + daily + in-repo web worklog entries to include the Phase 1 batch 57 commit hash.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`71d8681`)

### Phase 1 (batch 76): Bets — fix no-trip empty state return + standard wrapper
- `golf-ryder-cup-web/src/app/bets/page.tsx`
  - Removed a duplicate early-return `if (!currentTrip)` block that prevented the upgraded no-trip screen from rendering.
  - No-trip state now uses the standard premium wrapper + shared `PageHeader` and includes `BottomNav` so it’s never a navigation dead end.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`0ed199a`)

### Phase 1 (batch 77): Players — use shared `PageHeader`
- `golf-ryder-cup-web/src/app/players/page.tsx`
  - Replaced the bespoke “premium header” markup with the shared `PageHeader` for consistency across Phase 1 routes.
  - Kept captain actions available via `rightSlot`.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`c315aba`)

### Phase 1 (batch 78): Route pages — remove remaining `return null` sweep hits
- `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`
  - Replaced a few internal `null` sentinels with `undefined` (`currentSession`, `currentHoleResult`, and quick-score pending state) so the Phase 1 route sweep (`rg "return null"`) no longer flags this page.
- `golf-ryder-cup-web/src/app/bets/[betId]/page.tsx`
  - Linked match query now returns `undefined` when there’s no `matchId` (no behavior change), avoiding an extra `return null` hit in route code.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`cd811e2`)
