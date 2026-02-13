# Alan — Ryder Cup BattleGround Worklog — 2026-02-13

## 17:00 EST — Phase 2 — MatchStatusHeader: avoid silent gap when no match is resolved
- `MatchStatusHeader` (live-play): replaced the render-level `return null` when `statusData` can’t be derived with a compact “No match in progress” affordance that routes to `/schedule`.
- Prevents an unexplained blank gap at the top of screens when a trip exists but there’s no in-progress match for the default player.
- Lobster checkpoint: `lint` + `typecheck` ✅ (approval gate run)
- Commit + push ✅ (`d2acb8c`) (note: pre-push `typecheck` + `test` + `build` passed; build still reports existing CSS optimization warnings elsewhere)
