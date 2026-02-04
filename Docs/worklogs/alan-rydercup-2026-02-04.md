# Worklog — Ryder Cup BattleGround — Alan — 2026-02-04 (ET)

> Branch: `main`
> Focus: Phase 1 — eliminate blank-screen states on user-facing routes.

## 2026-02-04

### Score route reliability + nav spine consistency
- `golf-ryder-cup-web/src/app/score/page.tsx`
  - Removed the implicit redirect-on-missing-trip behavior and replaced it with a clear `EmptyStatePremium` ("No trip selected") + action back to Home.
  - Replaced the legacy hardcoded bottom nav with the canonical `BottomNav` component (aligns with the new Today/Score/Standings/Journal/More spine).

### Bet detail: no more infinite "Loading" / redirect-on-missing-trip
- `golf-ryder-cup-web/src/app/bets/[betId]/page.tsx`
  - Replaced the ambiguous `Loading bet...` full-screen for `(!bet || !currentTrip)` with explicit states:
    - **No trip selected** → `EmptyStatePremium` + Back to Home CTA
    - **Loading** (Dexie query pending) → pulse loader
    - **Bet not found** (missing/invalid bet id) → `ErrorEmpty` + Back to Bets CTA
  - Prevents an infinite loading screen when a bet id is missing.

### Checks / gates
- Lobster checkpoint:
  - `pnpm -C golf-ryder-cup-web lint` ✅
  - `pnpm -C golf-ryder-cup-web typecheck` ✅
  - `git diff --stat` reviewed

### Next
- Sweep remaining user-facing routes that still gate on `return null` / redirect-to-home patterns.
- Continue Phase 1 checklist from `Docs/lobster/ALAN_IMPROVEMENT_PLAN.md`.
