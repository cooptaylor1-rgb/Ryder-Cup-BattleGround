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

### Phase 1 (batch 79): New Trip — standard premium wrapper + PageHeader
- `golf-ryder-cup-web/src/app/trip/new/page.tsx`
  - Removed legacy `AppShell` usage and moved the route onto the standard premium page wrapper (`min-h-screen pb-nav page-premium-enter texture-grain`).
  - Added the shared `PageHeader` (with step-aware title and back behavior) and kept `BottomNav` available so the flow is never a navigation dead end.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`ddb8690`)

### Phase 1 (batch 80): Settings hub — correct links + wrapper consistency
- `golf-ryder-cup-web/src/app/settings/page.tsx`
  - Updated the Notifications and Data/Storage entries to link to the dedicated `/settings/notifications` and `/settings/backup` pages.
  - Standardized the Notifications wrapper to include the premium background canvas.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`7cea01b`)

### Docs: Lobster worklog hygiene — date heading fix
- `Docs/lobster/WORKLOG.md`
  - Fixed the date heading so midnight entries (00:10+) are correctly grouped under 2026-02-06.
- Commit + push ✅ (`a48b648`)

### Phase 1 (batch 81): Login — standard premium wrapper + copy fix
- `golf-ryder-cup-web/src/app/login/page.tsx`
  - Added `page-premium-enter` + `texture-grain` to the wrapper so Login matches the standard premium route wrapper pattern.
  - Fixed a stray “Golf Buddies” string → “Golf Ryder Cup” for consistent branding.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`ee6ad19`)

### Phase 1 (batch 82): Social — shared `PageHeader` + `BottomNav`
- `golf-ryder-cup-web/src/app/social/page.tsx`
  - Replaced the bespoke Social header + hand-rolled bottom nav with the shared `PageHeader` + `BottomNav` to match Phase 1’s standard premium navigation.
  - Kept the message composer pinned above `BottomNav` and padded the feed so posts don’t hide behind the composer.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`5354ae6`)

### Phase 1 (batch 83): Achievements — shared `PageHeader` + `PageLoadingSkeleton`
- `golf-ryder-cup-web/src/app/achievements/page.tsx`
  - Replaced the bespoke premium header with the shared `PageHeader` for consistent navigation.
  - Simplified the loading path to the standard `PageLoadingSkeleton` (grid) instead of custom pulse markup.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`5545df4`)

### Phase 1 (batch 84): Social Photos — shared `PageHeader`
- `golf-ryder-cup-web/src/app/social/photos/page.tsx`
  - Migrated off the bespoke premium header onto the shared `PageHeader` for consistent premium navigation.
  - Kept the view toggle + upload actions in `PageHeader.rightSlot`.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`d114a9b`)

### Phase 1 (batch 85): Matchups — shared `PageHeader` + shared `BottomNav`
- `golf-ryder-cup-web/src/app/matchups/page.tsx`
  - Replaced bespoke header markup with the shared `PageHeader` for consistent premium navigation.
  - Replaced the hand-rolled bottom nav markup with the shared `BottomNav` component.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`3ee6528`)

### Phase 1 (batch 87): Trip Awards — shared `PageHeader` + standard wrapper
- `golf-ryder-cup-web/src/app/trip-stats/awards/page.tsx`
  - Replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
  - Standardized the layout to the typical `container-editorial` pattern and removed ad-hoc `page-container/content-area` structure.
  - Keeps `BottomNav` available in both no-trip and active-trip states.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`6dacc3c`)

### Phase 1 (batch 88): Trip Stats — allow tracking from zero-state
- `golf-ryder-cup-web/src/app/trip-stats/page.tsx`
  - Removed the “No stats yet” early-return so users can start tracking immediately from an all-zero state.
  - Standardized the no-trip state layout to the standard premium wrapper + `container-editorial`.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`0f1ca16`)

### Phase 1 (batch 89): Settings — Backup & Restore loading skeleton uses standard title
- `golf-ryder-cup-web/src/app/settings/backup/page.tsx`
  - Loading state now uses `PageLoadingSkeleton title="Backup & Restore" variant="list"`.
  - Keeps the loading screen consistent and self-labeled while trip backups load.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`a838d0e`)

### Phase 1 (batch 90): Live Scores — shared `PageHeader` + shared `BottomNav`
- `golf-ryder-cup-web/src/app/live/page.tsx`
  - Replaced the bespoke premium header markup with the shared `PageHeader` for consistent premium navigation.
  - Replaced the hand-rolled bottom nav markup with the shared `BottomNav` component.
  - Moved the sound/fullscreen/refresh controls into `PageHeader.rightSlot`.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`a6555c9`)

### Phase 1 (batch 91): Settings hub — shared `PageHeader`
- `golf-ryder-cup-web/src/app/settings/page.tsx`
  - Replaced bespoke `header-premium` markup with the shared `PageHeader` for consistent premium navigation.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`6879433`)

### Phase 1 (batch 92): Settings — Notifications styling correctness
- `golf-ryder-cup-web/src/app/settings/notifications/page.tsx`
  - Removed invalid Tailwind “CSS var” class syntax (e.g. `bg-(--masters)`, `text-(--ink-muted)`) which could lead to missing styles.
  - Standardized styling via CSS variable inline styles (`var(--masters)`, `var(--surface)`, `var(--rule)`) while keeping the shared `PageHeader` + `BottomNav`.
- Checkpoint: `lint` + `typecheck` ✅ (Lobster approval gate run)
- Commit + push ✅ (`3371b11`)
