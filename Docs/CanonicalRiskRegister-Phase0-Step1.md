# Canonical Risk Register — Phase 0 Step 1 (Re-baseline)

Date: 2026-03-02  
Owner: Engineering (Platform + App)  
Scope: Current repository state re-baseline against previous audit assertions.

## Purpose
This is the source-of-truth risk register for Phase 0 / Step 1 from the production quality plan. It supersedes stale findings where code has already changed and captures only currently validated risks.

## Validation Method
- Re-validated historical findings directly against current source files.
- Marked findings as `OPEN` or `CLOSED` with evidence lines.
- Added owner, target window, and verification criteria per item.

## Canonical Open Risks

| ID | Sev | Domain | Risk | Status | Owner | Target | Verification criteria |
|---|---|---|---|---|---|---|---|
| CRR-001 | P0 | Security | Supabase RLS policies on core tables are still `USING (true)` / `WITH CHECK (true)` and allow broad public CRUD. | OPEN | Platform | Week 1 | Replace permissive policies with trip membership/share-code predicates and add policy tests. |
| CRR-002 | P1 | Security/Integrity | Share-code generator uses `gen_random_bytes` but schema enables only `uuid-ossp`; `pgcrypto` extension missing. | OPEN | Platform | Week 1 | Add `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` migration and verify trip insert path. |
| CRR-003 | P1 | Realtime/Privacy | Realtime match subscription uses SQL subquery in filter string (`session_id=in.(SELECT...)`), which is likely unsupported by realtime filters. | OPEN | App | Week 2 | Pre-resolve session IDs and subscribe with concrete `in.(...)` list + integration test. |
| CRR-004 | P1 | Realtime/Privacy | Realtime subscription for `hole_results` is unscoped to trip/session and may over-broadcast updates. | OPEN | App | Week 2 | Add trip/session scoping and prove no cross-trip events in test harness. |
| CRR-005 | P1 | Correctness | Duplicate scoring logic path (`useMatchScoring.calculateMatchStatus`) can drift from canonical scoring engine. | OPEN | App | Week 3 | Refactor consumers to shared scoring contract; golden-vector consistency tests pass. |
| CRR-006 | P2 | Security/Abuse | API rate limiting is in-memory (`Map`) and not distributed across instances. | OPEN | Platform | Week 3 | Move to distributed limiter (edge/Redis) and validate behavior in multi-instance deployment. |
| CRR-007 | P2 | Security | CSP still allows `'unsafe-inline'` for scripts/styles, increasing XSS blast radius. | OPEN | Platform | Week 3 | Migrate toward nonce/hash CSP and keep dev/prod policies explicit. |

## Closed/Superseded Findings (Validated)

| Legacy finding | Current status | Evidence |
|---|---|---|
| Trip access auto-granted by `share_code` presence without supplied code | CLOSED — `verifyTripAccess` now requires matching `X-Share-Code` or authenticated trip membership; default deny. | `src/lib/utils/apiMiddleware.ts` |
| Undo logic selecting oldest event | CLOSED — undo path now sorts by timestamp and uses final element as latest event. | `src/lib/services/scoringEngine.ts` |
| Final-hole result shown as `1&0` | CLOSED — score formatting explicitly returns `1 UP` when `holesRemaining === 0`. | `src/lib/services/scoringEngine.ts` |
| Offline queue stub with random success | CLOSED — offline queue is Dexie-backed and wired to `tripSyncService`, not random-success simulation. | `src/lib/hooks/useOfflineQueue.ts` |

## Next Actions (Immediately after Step 1)
1. Convert all `OPEN` items above into tracked tickets with assignees and acceptance tests.
2. Execute CRR-001 and CRR-002 first (security + data integrity blockers).
3. Add this register to release gate review and update weekly.

## Evidence Index (direct file pointers)
- Permissive RLS policies: `golf-ryder-cup-web/supabase/schema.sql`
- Missing `pgcrypto` extension with `gen_random_bytes`: `golf-ryder-cup-web/supabase/schema.sql`
- Realtime filters/subscription scope: `golf-ryder-cup-web/src/lib/supabase/client.ts`
- Rate limiting implementation: `golf-ryder-cup-web/src/lib/utils/apiMiddleware.ts`
- CSP header directives: `golf-ryder-cup-web/next.config.ts`
- Canonical scoring engine: `golf-ryder-cup-web/src/lib/services/scoringEngine.ts`
- Alternate scoring logic path: `golf-ryder-cup-web/src/lib/hooks/useMatchScoring.ts`
- Offline queue implementation: `golf-ryder-cup-web/src/lib/hooks/useOfflineQueue.ts`
