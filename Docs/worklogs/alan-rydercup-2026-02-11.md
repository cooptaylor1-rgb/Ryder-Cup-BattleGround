# Alan — Ryder Cup BattleGround Worklog — 2026-02-11

## 17:35 EST — Phase 2 — Courses page: premium token sweep
- `Courses` (`/courses`): replaced remaining legacy `bg-surface-card` / `border-surface-border` / `text-text-*` utilities with premium token-driven Tailwind and the shared `.card` surface.
- Updated course cards, search input, and quick action tiles to use `var(--surface-*)`, `var(--rule)`, and `var(--ink-*)` tokens so the page matches the premium shell.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`88f6b14`) (push pending)

## 17:10 EST — Phase 2 — CourseDetails: premium `.card` surfaces
- `CourseDetails`: migrated the map wrapper, tee list, course stats, and “missing data” placeholders off legacy `bg-surface-card`/`border-surface-*` utilities and onto the shared premium `.card` surface.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`190e2fc`) (note: pre-push `typecheck` + `test` + `build` passed; build still reports existing CSS optimization warnings elsewhere)

## 15:35 EST — Phase 2 — Backup + ScorecardScanner: tokenize `--masters-subtle`
- Backup & Restore (`/settings/backup`): removed the Tailwind class fallback form `bg-[var(--masters-subtle,rgba(...))]` and replaced it with `bg-[var(--masters-subtle)]` to avoid CSS optimizer warnings.
- `ScorecardScanner`: replaced the remaining inline `style={{ background/color: 'var(--masters-subtle/masters)' }}` usage with token-driven Tailwind classes (`bg-[var(--masters-subtle)]`, `text-[var(--masters)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`40f0fe4`) (note: pre-push `typecheck` + `test` + `build` passed; build still reports existing CSS optimization warnings elsewhere)

## 14:30 EST — Polish — Global error: token-driven ink + dark-mode gradient
- `src/app/global-error.tsx`: updated the global error page to use premium token-driven ink/surface/rule classes so it renders correctly in dark mode (removed hard-coded `text-surface-*` utilities).
- Added `dark:from-surface-900 dark:to-surface-950` to the background gradient.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`aab0a8b`)

## 08:50 EST — Phase 1 — ScorecardScanner: remove remaining shadcn border token
- `ScorecardScanner` (preview → “Add another image” dashed dropzone): replaced `border-muted-foreground/*` with premium token-driven Tailwind (`border-[color:var(--rule)]/40` + hover state) so theme borders remain consistent and token-driven.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`09b0122`) (note: pre-push `typecheck` + `test` + `build` passed; build emitted an existing CSS optimization warning)

## 06:55 EST — Phase 1 — Bets modals + Trip settings: premium token surfaces
- Bets (`/bets` + `/bets/[betId]`): migrated remaining bottom-sheet/confirm modal surfaces off shadcn `bg-background` / `bg-muted` and onto premium surfaces (`bg-[var(--surface-raised)]`, `border-[var(--rule)]`) with consistent hover states (`hover:bg-[var(--surface)]`).
- Trip settings (`/trip/[tripId]/settings`): replaced remaining `border-border` section dividers with premium `border-[var(--rule)]`.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`0db49c2`)

## 05:55 EST — Phase 1 — Predictions + Cart Tracker: premium token sweep
- `MatchPredictions`: migrated cards + bottom-sheet modal off shadcn tokens (`bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-muted-foreground`) onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`), keeping the Masters + team accents.
- `CartTracker`: migrated the bottom sheet, controls, and recent list off shadcn tokens onto premium tokens; standardized “selected” state to use the premium `var(--warning)` accent.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`f25f1de`) (note: pre-push `typecheck` + `test` + `build` passed; Next build emitted an existing CSS optimization warning for a `bg-[var(...)]` class)

## 05:35 EST — Phase 1 — Photo capture + skeleton: premium token sweep
- Photo capture context panel + actions (`PhotoCapture`): migrated off shadcn `bg-card` / `border-border` and hard-coded gray palette onto premium design tokens (`var(--surface-*)`, `var(--ink-*)`, `var(--rule)`, `var(--masters)`, `var(--success)`) with proper focus/hover states.
- `LiveMatchCardSkeleton`: migrated wrapper + header off shadcn tokens (`bg-card`, `border-border`, `bg-muted`) onto premium tokens.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d78e294`)

## 03:55 EST — Phase 1 — Switch app shell to QuickScoreFABv2 (remove legacy modal)
- App root layout now renders `QuickScoreFABv2` (enhanced premium quick-score control).
- Removed legacy `QuickScoreFAB` + `QuickScoreModal` (and the modal unit test) to avoid duplicate/unused scoring entrypoints.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7324079`)

## 03:25 EST — Phase 1 — Remove unused legacy sync status components
- Removed the unused legacy sync UI module at `src/components/sync/*` (deprecated in favor of the newer premium sync/offline indicators).
- Avoids confusion from two similarly-named `SyncStatusIndicator` implementations and reduces dead code.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`9ff91bf`)

## 21:05 EST — Phase 1 — Course UI: replace undefined success/warning subtle tokens
- Course Scorecard OCR (`ScorecardScanner`) and Hole Data Editor validation banner: removed reliance on undefined CSS vars (`--success-subtle`, `--warning-soft`).
- Replaced with token-driven Tailwind classes (`bg-[color:var(--success)]/15`, `bg-[color:var(--warning)]/10`, `text-[var(--success)]` / `text-[var(--warning)]`) and removed a few inline icon/text style props.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d05d52b`)

## 21:45 EST — Phase 2 — Live Scores: token-driven team accents
- Live Scores (`/live`): migrated the `PageHeader` icon accent off inline `style` onto token-driven Tailwind (`text-[var(--color-accent)]`).
- Live match cards: team dots and “winning team” highlight/score accents now use team CSS tokens via Tailwind (`bg-[var(--team-usa)]`, `bg-[color:var(--team-usa)]/15`, `text-[var(--team-usa)]`, etc.).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`7ce1119`)

## 22:10 EST — Phase 1 — Finances progress bar + New Trip header icon: token-driven Tailwind styles
- Finances (`/finances`): replaced the progress bar’s inline `background` style with token-driven Tailwind classes (`bg-[var(--success)]` or `bg-gradient-to-r from-[var(--masters)] to-[var(--masters-deep)]`), keeping only the dynamic `width` inline.
- New Trip (`/trip/new`): replaced the `PageHeader` icon inline color style with Tailwind token class (`text-[var(--color-accent)]`).
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`abe1197`)
