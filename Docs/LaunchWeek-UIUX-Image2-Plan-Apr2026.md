# Launch-Week UI/UX Deep Dive Plan (Image 2.0 Assisted)

**Date:** April 22, 2026  
**Scope:** Visual and interaction polish only (no scoring/business-logic changes)  
**Constraint:** One week to launch, zero regressions tolerated

---

## 1) Executive Summary

The app already has a strong editorial visual foundation (tokenized palette, typography hierarchy, premium card/navigation language), but UI consistency is uneven across feature surfaces due to mixed legacy/new styling patterns and density differences between pages. The fastest launch-safe path is **a polish pass, not a redesign**:

1. Lock visual consistency tokens and a small set of reusable “page section” patterns.
2. Improve hierarchy and scanability on Home, Score, Standings, and Captain surfaces.
3. Tighten touch/contrast/focus states for outdoor and in-motion usage.
4. Use Image 2.0 for **before/after mock variants and visual QA boards** before coding.

This gives additive UX value without destabilizing core flows.

---

## 2) What We Observed in the Current App

### 2.1 Strong foundation already in place

- Design tokens are centralized in `globals.css` with typography, spacing, semantic color aliases, and motion primitives.
- Tailwind config extends those tokens and preserves compatibility aliases for older classes.
- Global nav shell is centralized with mobile bottom nav + desktop sidebar, reducing per-page nav drift.
- Home and Score surfaces already use editorial card and hierarchy patterns that can be expanded.

### 2.2 Launch-risk UX gaps (visual/interaction only)

1. **Style heterogeneity:** many surfaces still compose raw utility classes/legacy surface vars differently, producing inconsistent depth and rhythm.
2. **Information density variance:** some cards are elegantly sparse while others are packed, making page-to-page scanning feel uneven.
3. **Action emphasis drift:** primary actions are not always visually ranked consistently by urgency/frequency.
4. **Outdoor legibility risk:** subtle tertiary text and low-emphasis borders may be hard in bright daylight (golf-course reality).
5. **Microinteraction inconsistency:** some components have premium hover/focus/press behavior; others are static.

---

## 3) Launch-Week Strategy (No-Break Policy)

### Guardrails

- **No route architecture changes.**
- **No store/schema/business logic edits.**
- **No dependency additions.**
- **No mutation of scoring calculations or sync behaviors.**
- Visual changes gated behind existing components/tokens only.

### Delivery shape

- Ship in **small, reversible PRs** by surface area.
- Prefer class-level adjustments and shared component wrappers.
- For each change: screenshot diff + smoke test of core user paths.

---

## 4) Prioritized UI/UX Improvement Backlog

## P0 (Must do before launch)

### P0.1 Home “Today” hierarchy tightening

**Why:** This is first impression and daily command center.

**Changes**
- Normalize hero spacing and section rhythm to one spacing cadence.
- Ensure a single dominant CTA in each fold (avoid equal-weight competing actions).
- Improve secondary metadata contrast (trip state/date/location chips).

**Files to target**
- `src/components/home/HomePage.tsx`
- `src/components/home/HomeSharedComponents.tsx`
- `src/components/layout/PageHeader.tsx`

### P0.2 Score list scan speed improvement

**Why:** On-course scoring requires low cognitive load and fast target acquisition.

**Changes**
- Increase separation between match rows (status, teams, score delta).
- Standardize “Your Match” affordance treatment and reduce visual noise around non-user matches.
- Improve quick-action card prominence only when contextually relevant.

**Files to target**
- `src/components/scoring/score-page/ScorePageSections.tsx`
- `src/components/scoring/QuickScoreFABv2.tsx`

### P0.3 Navigation clarity polish (mobile-first)

**Why:** Most users will navigate via bottom nav under time pressure.

**Changes**
- Improve active-state differentiation (icon + label + background treatment).
- Validate hit targets and contrast in bright conditions.
- Add subtle badge hierarchy for urgent/live contexts only.

**Files to target**
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/NavigationShell.tsx`

### P0.4 Accessibility quick pass (high-value, low-risk)

**Why:** Launch-safe quality multiplier.

**Changes**
- Raise contrast for tertiary text in critical status contexts.
- Ensure all icon-only controls have robust labels and visible focus states.
- Verify 44px+ target sizes on critical action clusters.

**Files to target**
- `src/app/globals.css`
- shared button/icon components under `src/components/ui/`

---

## P1 (Should do if bandwidth remains)

### P1.1 Standings + Captain section visual unification

- Align card headers, stat tiles, and separators with Home/Score editorial language.
- Reduce duplicate badge styles into one status component vocabulary.

### P1.2 Skeleton/loading consistency

- Unify shimmer/skeleton cadence and shape language across major pages.
- Ensure loading states preserve layout stability (avoid jarring jumps).

### P1.3 Empty-state quality uplift

- Standardize one “headline + context + single best next action” pattern.
- Remove overly verbose empty-state copy where possible.

---

## 5) How to Use Image 2.0 Effectively (Without Risk)

Use Image 2.0 as a **pre-implementation design verification layer**:

1. Create **before/after mock comps** for Home, Score, Standings, Captain hub using real screenshot references.
2. Generate **3 visual variants max** per surface (Conservative / Balanced / Bold).
3. Pick one variant using a launch rubric:
   - Clarity at a glance
   - Tap confidence
   - Contrast outdoors
   - Perceived quality
4. Convert chosen variant to a **token/class diff checklist** before touching code.
5. Keep prompt outputs focused on “polish constraints” (no layout rewrites, no interaction model changes).

### Suggested prompt template

> “Using this screen as baseline, produce a launch-safe polish variant. Preserve IA, preserve all actions, no new components requiring logic. Improve hierarchy, contrast, spacing rhythm, and primary CTA emphasis for mobile outdoor readability.”

---

## 6) 7-Day Execution Plan

### Day 1 — Baseline + Visual QA Board
- Capture canonical screenshots for top 8 routes (Home, Score, Standings, Schedule, Captain, More, Profile, Settings).
- Build Image 2.0 variant board for top 4 high-traffic routes.

### Day 2 — Tokens + shared primitives
- Apply only global variable/class adjustments that improve consistency.
- Validate no regressions in dark/light and small/large devices.

### Day 3 — Home polish
- Implement approved Home hierarchy and CTA clarity changes.
- Smoke-test trip switch, invite, continue scoring banner.

### Day 4 — Score polish
- Implement row readability and quick-action improvements.
- Smoke-test score-entry launch paths and session switching.

### Day 5 — Nav + accessibility pass
- Bottom nav active/focus/contrast refinements.
- Run keyboard/touch checks for top flows.

### Day 6 — Standings/Captain visual alignment (if time)
- Apply low-risk style harmonization only.

### Day 7 — Freeze + regression verification
- Screenshot regression pass.
- Final bug scrub and launch lock.

---

## 7) Validation Checklist (Launch Gate)

Every UI PR must pass:

- [ ] No business-logic file changes.
- [ ] No data contract changes.
- [ ] All primary flows manually smoke-tested.
- [ ] Keyboard focus visible on interactive controls.
- [ ] Contrast acceptable for key labels and status states.
- [ ] Mobile viewport checks complete (small + large device classes).
- [ ] Screenshot comparison recorded for changed routes.

---

## 8) Success Metrics for This Week

Track these post-polish indicators:

1. **Task completion speed**
   - Time-to-open-correct-match from Home and Score screens.
2. **Navigation confidence**
   - Mis-tap rate in bottom nav (qualitative + analytics where available).
3. **Perceived quality**
   - Internal launch-team rating on clarity/visual polish (1–5 rubric).
4. **Stability**
   - Zero new P1 defects tied to UI changes.

---

## 9) Recommended PR Breakdown

1. `ui(polish): token/contrast/spacing normalization`
2. `ui(home): launch-week hierarchy and CTA polish`
3. `ui(score): match row readability and quick-action clarity`
4. `ui(nav): bottom navigation active/focus polish`
5. `ui(polish): standings/captain visual consistency pass`

Each PR should stay under ~300–400 LOC when possible for safe review.

---

## 10) Bottom Line

A full redesign one week before launch is high risk. A constrained **Image 2.0-assisted polish sprint** is the highest-return move: it improves perceived quality, clarity, and confidence while preserving core behavior and launch stability.
