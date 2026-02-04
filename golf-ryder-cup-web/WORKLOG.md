# WORKLOG — Ryder Cup Web Improvements

All times America/New_York.

## 2026-02-04
- 18:00 — Started NOW batch: Phase 1 sweep (blank-screen `return null`), PageHeader unification, token audit (RGB vars), Score page perf (holeResults index).
- 18:10 — Shipped batch: added `PageHeader` + migrated Score/Standings/Stats; matchups now shows explicit empty state (no redirect); token audit added `--masters-rgb`/`--canvas-rgb` + `--masters-deep`; Score page perf indexed holeResults by matchId. (commit 7bef19b)
