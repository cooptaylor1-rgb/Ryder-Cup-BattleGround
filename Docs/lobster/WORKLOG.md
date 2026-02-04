# Ryder Cup BattleGround — Improvement Worklog (Lobster)

## 2026-02-04 09:30 EST — Phase 1 (batch 1)
- Schedule page: removed “indefinite skeleton” when no trip is selected; now shows a Premium empty state with a clear CTA back home.
- Schedule page: added explicit error empty state + retry for match loading failures (no more silent console-only failures).

## 2026-02-04 10:05 EST — Phase 1 (batch 2)
- Bet Detail page: eliminated a silent “missing linked match” section by distinguishing loading vs missing vs present match states and showing a clear inline warning instead of rendering nothing.

## 2026-02-04 11:55 EST — Phase 1 (batch 3)
- Match scoring page: removed a user-facing blank state by replacing `Suspense` `fallback={null}` (ScoreCelebration lazy load) with an explicit loading overlay.

## 2026-02-04 12:05 EST — Phase 1 (batch 4)
- Trip Stats: replaced the Category Leaders widget’s silent `return null` with an explicit “No leaders yet” card.
- Trip Awards: replaced silent `return null` winner showcase with an explicit “No award winners yet” state, and upgraded the “No active trip” screen to `EmptyStatePremium`.
