# Single Execution Board — Production Quality Program

Date: 2026-03-02  
Program Owner: Engineering + Product + Design  
Scope: Consolidated board for Phases 1–6 combining the phased plan, canonical risks, and UX audits into one executable backlog.

## How to use this board
- **Single source of execution truth** for what ships next.
- Each item must include **owner, acceptance criteria, verification command(s), and file touchpoints**.
- Work is considered done only when acceptance criteria are met and linked evidence is added.

---

## Program KPIs (release gates)
- **Trust:** Score/result parity across scoring, standings, spectator = 100% in contract tests.
- **Reliability:** Silent data-loss incidents = 0 in offline chaos suite.
- **Security:** P0 security findings open = 0.
- **Performance:** Score submit interaction p95 <= 300ms on target devices.
- **Operability:** Live-trip incident triage <= 15 minutes.
- **Delight:** Measurable uplift in score-flow speed and sharing engagement.

---

## Execution Board

| ID | Phase | Pri | Status | Work Item | Owner | Target | Acceptance Criteria (Done Definition) | Verification | Primary File Touchpoints |
|---|---|---|---|---|---|---|---|---|---|
| EB-01 | 1 | P0 | DONE | Replace permissive RLS with least-privilege policies | Platform | Week 1 | No permissive `USING (true)` / `WITH CHECK (true)` policies on core tables; policy tests added for authz matrix | `npm run -s test src/__tests__/schemaVerification.test.ts` + policy tests | `golf-ryder-cup-web/supabase/schema.sql`, `golf-ryder-cup-web/supabase/migrations/*` |
| EB-02 | 1 | P0 | DONE | Enforce distributed API rate limiting for write/sensitive routes | Platform | Week 2 | In-memory limiter removed for protected paths; distributed limiter active in production env; abuse tests pass | API integration tests + load test script | `golf-ryder-cup-web/src/lib/utils/apiMiddleware.ts`, `golf-ryder-cup-web/src/app/api/**` |
| EB-03 | 1 | P1 | DONE | Tighten CSP to nonce/hash strategy | Platform | Week 3 | Prod CSP removes unsafe inline directives where feasible; policy documented per env | Security header check in CI | `golf-ryder-cup-web/next.config.ts`, `Docs/SecurityNotes.md` |
| EB-04 | 2 | P0 | DONE | Complete scoring contract unification + golden vectors | App | Week 3 | All score computations route through canonical engine; cross-surface golden-vector tests pass (match, standings, spectator) | `npm run -s test` (scoring suites) | `golf-ryder-cup-web/src/lib/services/scoringEngine.ts`, `golf-ryder-cup-web/src/lib/hooks/useMatchScoring.ts`, `golf-ryder-cup-web/src/lib/services/spectatorService.ts` |
| EB-05 | 2 | P1 | DONE | Add edit provenance/audit trail for score mutations | App | Week 4 | Every create/update/delete score action records actor/time/reason; visible in dispute UI | Unit + integration tests for audit events | `golf-ryder-cup-web/src/lib/stores/scoringStore.ts`, `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`, `golf-ryder-cup-web/src/lib/types/*` |
| EB-06 | 3 | P0 | DONE | Add sync idempotency keys and conflict-safe write contracts | Platform + App | Week 5 | Duplicate submits are idempotent; conflict policy codified and test-covered | Sync integration tests + chaos suite | `golf-ryder-cup-web/src/lib/services/tripSyncService.ts`, `golf-ryder-cup-web/src/app/api/sync/scores/route.ts`, `golf-ryder-cup-web/src/lib/types/sync.ts` |
| EB-07 | 3 | P0 | TODO | Deliver user-facing sync conflict resolution UX | App + Design | Week 6 | Conflict banner + resolution path shipped; no silent overwrite behavior | E2E conflict scenario tests | `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx`, `golf-ryder-cup-web/src/components/**`, `golf-ryder-cup-web/src/lib/hooks/useOfflineQueue.ts` |
| EB-08 | 3 | P1 | TODO | Expand chaos test matrix (airplane mode, reconnect storm, tab kill) | QA + App | Week 6 | Nightly chaos suite implemented; failures block release candidate | `npm run -s test:chaos` / CI nightly | `golf-ryder-cup-web/tests/e2e/**`, `golf-ryder-cup-web/src/lib/services/realtimeSyncService.ts` |
| EB-09 | 4 | P0 | DONE | One-tap “My Match / Continue Scoring” entry | App + Design | Week 7 | If exactly one active match, score navigation deep-links directly; home hero + quick action visible above fold | Component tests + mobile UX validation | `golf-ryder-cup-web/src/app/page.tsx`, `golf-ryder-cup-web/src/app/score/page.tsx`, `golf-ryder-cup-web/src/components/layout/BottomNav.tsx` |
| EB-10 | 4 | P1 | DONE | Persist scoring mode preference per format | App | Week 7 | Fourball/foursomes/singles mode preferences persist and auto-apply | Unit tests + regression on score page | `golf-ryder-cup-web/src/lib/stores/uiStore.ts`, `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx` |
| EB-11 | 4 | P1 | DONE | Accessibility completion pass on critical flows | Design + App | Week 8 | WCAG touch target/label/focus requirements met for score/live/standings paths | a11y checks + manual screenreader smoke | `golf-ryder-cup-web/src/app/live/page.tsx`, `golf-ryder-cup-web/src/app/standings/page.tsx`, `golf-ryder-cup-web/src/app/score/[matchId]/page.tsx` |
| EB-12 | 5 | P0 | DONE | Complete telemetry coverage for critical workflows | App + Platform | Week 9 | Score/undo/sync/override/standings publish emit structured events with correlation IDs | Analytics tests + dashboard validation | `golf-ryder-cup-web/src/lib/services/analyticsService.ts`, `golf-ryder-cup-web/src/app/api/sync/scores/route.ts`, `golf-ryder-cup-web/src/lib/stores/scoringStore.ts` |
| EB-13 | 5 | P0 | DONE | Build release safety controls (canary, rollback, preflight) | Platform | Week 10 | Canary + feature flag + rollback runbook operational and exercised | Release simulation drill | `Docs/ProductionReadiness.md`, deployment config |
| EB-14 | 6 | P1 | TODO | Captain command center (“Needs Attention”) | Product + App | Week 11 | Captains see setup gaps, disputes, lock state, and next actions in one screen | UX tests + adoption telemetry | `golf-ryder-cup-web/src/app/captain/page.tsx`, `golf-ryder-cup-web/src/app/captain/manage/page.tsx` |
| EB-15 | 6 | P1 | TODO | Social recap + sharing growth loop | Product + App | Week 12 | Recap cards/awards/story export shipped; share funnel tracked end-to-end | Share flow tests + analytics review | `golf-ryder-cup-web/src/lib/services/shareCardService.ts`, `golf-ryder-cup-web/src/lib/services/recapService.ts`, `golf-ryder-cup-web/src/app/standings/page.tsx` |

---

## Active Sprint Slice (recommended next 2 weeks)
1. **EB-01, EB-02, EB-06, EB-09** as release-critical path.
2. Parallel discovery/design for **EB-05 and EB-07** (dispute + conflict UX).
3. Keep **EB-12** in lockstep so every critical change is observable at rollout.

## Weekly Operating Cadence
- **Mon:** Risk and KPI review, update statuses and blockers.
- **Wed:** Mid-sprint proof check against acceptance criteria.
- **Fri:** Evidence review (tests, dashboards, release checklist) and go/no-go.

## Status Taxonomy
- **TODO**: Not started
- **IN PROGRESS**: Actively being implemented
- **BLOCKED**: Waiting on dependency
- **DONE**: Acceptance criteria met with linked evidence
