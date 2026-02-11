# Alan — Ryder Cup BattleGround Worklog — 2026-02-11

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
