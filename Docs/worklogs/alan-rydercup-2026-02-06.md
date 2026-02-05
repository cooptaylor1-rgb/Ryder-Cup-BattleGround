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
