# Launch Readiness Audit — First Trip Edition

**Date:** February 14, 2026
**Goal:** Make this the best golf trip app in the world on its very first outing.

This audit identifies every gap between the current state and a flawless first-trip experience, ranked by the likelihood of ruining someone's weekend.

---

## Tier 1 — Trip-Killers (Fix before the van leaves)

These are bugs or UX gaps that would cause a group of buddies to give up and switch back to a group text.

### 1.1 tripStore.deleteTrip bypasses cascadeDelete

| Detail | |
|---|---|
| **Files** | `src/lib/stores/tripStore.ts:262-335`, `src/lib/services/cascadeDelete.ts` |
| **Problem** | `deleteTrip` in tripStore manually deletes from ~19 tables but misses `duesLineItems`, `paymentRecords`, and `syncQueueItems`. A proper `deleteTripCascade` function exists in `cascadeDelete.ts` and covers 30 tables, but tripStore doesn't call it. |
| **Impact** | Orphaned records accumulate in IndexedDB. If a user deletes a botched trip and starts over (very likely on a first trip), stale data from the old trip could leak into queries. |
| **Fix** | Replace the inline deletion block in `tripStore.deleteTrip` with a call to `deleteTripCascade(tripId)`. Delete the duplicated logic. Add a test confirming table parity. |

### 1.2 No offline sync feedback during scoring

| Detail | |
|---|---|
| **Files** | `src/app/score/page.tsx`, `public/sw.js`, `src/components/SyncStatusBadge.tsx` |
| **Problem** | The service worker supports background sync and IndexedDB persistence. But the scoring UI has zero indication of connection state. On a golf course with spotty signal (i.e. every golf course), users will enter scores, see no confirmation, and re-enter them — creating duplicates or losing confidence in the app. |
| **Impact** | Groups will stop trusting the app mid-round. This is the #1 "put the phone away" risk. |
| **Fix** | Surface `SyncStatusBadge` on the score entry screen. Show per-match sync state: "Saved locally", "Syncing...", "Synced". Add a manual "Retry sync" action. Toast on successful background sync. |

### 1.3 Captain mode is a mystery to first-time users

| Detail | |
|---|---|
| **Files** | `src/app/captain/page.tsx`, `src/lib/stores/uiStore.ts:144-220` |
| **Problem** | The entire trip setup flow (creating sessions, building lineups, locking matches) is gated behind captain mode, which requires a PIN. But there is no explanation of: what captain mode is, who should be captain, how to set/share the PIN, or what non-captains should expect. A first-time user opening the app sees "Enter your captain PIN" with no context. |
| **Impact** | The person who creates the trip doesn't know they need to enable captain mode. Non-captains think the app is empty. The setup stalls before it starts. |
| **Fix** | After trip creation, show a one-time "You're the Captain" explainer card. Auto-enable captain mode for the trip creator. Show non-captains a "Waiting for captain to set up sessions" state with the captain's name and a progress indicator. Add a "What is captain mode?" link in the captain PIN dialog. |

### 1.4 Session creation has no guard rails

| Detail | |
|---|---|
| **Files** | `src/app/lineup/new/`, `src/app/matchups/page.tsx`, `src/app/captain/page.tsx` |
| **Problem** | A captain can attempt to create a session with 0 players on a team, with unbalanced rosters, or with players not yet assigned to teams. The lineup builder doesn't enforce minimums. The path from "trip created" to "first session ready" is unclear — session creation is at `/lineup/new` which is not discoverable from `/matchups`. |
| **Impact** | The captain fumbles through setup at dinner the night before. Other players watch and lose confidence. |
| **Fix** | Enforce: both teams must have ≥2 players assigned before session creation is allowed. Add a "Create First Session" button directly on the matchups empty state. Show a setup progress bar: Players → Teams → Session → Ready to Score. |

### 1.5 Blank screens from `return null` in components

| Detail | |
|---|---|
| **Files** | 195 instances across `.tsx` files — majority are in page-level components and data-dependent renders |
| **Problem** | Many components return `null` when data is loading or missing, producing a blank screen instead of a skeleton or empty state. On a first trip, where data is sparse and loading over poor connectivity, users will frequently see white screens. |
| **Impact** | "Is the app broken?" is the worst thing you can hear on a first trip. |
| **Fix** | Audit every page-level `return null`. Replace with: (a) `PageLoadingSkeleton` for loading states, (b) `EmptyStatePremium` for genuinely empty data, (c) error boundary fallback for failures. Priority targets: `/matchups`, `/score`, `/standings`, `/captain`. |

---

## Tier 2 — Confidence Killers (Fix to avoid eye-rolls)

These won't crash the trip, but they'll make the app feel half-baked.

### 2.1 No non-captain guidance

| Detail | |
|---|---|
| **Problem** | If you join a trip but aren't the captain, the home page shows your trip with no sessions, no matches, and no explanation. There's no "the captain is setting things up" messaging. |
| **Fix** | Add a "Your captain is setting up the trip" card with setup progress (players added, teams assigned, sessions created). Show it until the first session is created. |

### 2.2 Missing loading.tsx on key routes

| Detail | |
|---|---|
| **Files** | `/matchups`, `/captain`, `/score/[matchId]` lack `loading.tsx` |
| **Problem** | Next.js Suspense boundaries need `loading.tsx` to show skeletons during route transitions. Without them, transitions to these routes show nothing until data resolves. |
| **Fix** | Add `loading.tsx` with `PageLoadingSkeleton` to every route under `/app` that fetches data. |

### 2.3 No undo for scoring mistakes

| Detail | |
|---|---|
| **Problem** | If someone enters a wrong score for a completed hole, there's no obvious way to fix it. Scoring events are append-only, which is great for data integrity, but the UI doesn't expose an "edit last hole" or "reopen match" flow. On a first trip, scoring errors are guaranteed. |
| **Fix** | Add a "correct score" action for captains on completed holes (appends a correction event). Add a confirmation dialog before finalizing a match. |

### 2.4 Template picker doesn't explain templates

| Detail | |
|---|---|
| **Files** | `src/app/trip/new/page.tsx`, `src/lib/services/templateService.ts` |
| **Problem** | The template picker shows template names but doesn't describe what each one creates (how many sessions, what formats, how many players needed). A first-time user won't know if "Weekend Warrior" or "Classic Ryder Cup" is right for their group. |
| **Fix** | Add a description line and a "preview" showing session count, format types, and recommended player count for each template. |

### 2.5 Background tab polling wastes battery

| Detail | |
|---|---|
| **Files** | Live pages with polling intervals |
| **Problem** | The live score page polls for updates even when the tab/app is in the background. On a golf course where everyone's phone is in their pocket between holes, this drains battery unnecessarily. |
| **Fix** | Use `document.visibilityState` to pause polling when the app is backgrounded. Resume on `visibilitychange` event. |

### 2.6 Error messages are generic

| Detail | |
|---|---|
| **Files** | `src/app/error.tsx`, `src/app/global-error.tsx` |
| **Problem** | All errors show "Something went wrong" with a retry button. Network errors, validation errors, and data errors all look the same. On spotty course wifi, every timeout will feel like a bug. |
| **Fix** | Classify errors: network errors → "Check your connection and try again" with auto-retry. Validation errors → specific field messages. Data errors → "Try refreshing" with Sentry report. |

---

## Tier 3 — Polish (Fix to feel premium)

These separate "good app" from "best app in the world."

### 3.1 No in-app help or FAQ

| Detail | |
|---|---|
| **Problem** | There's no `/help` page, no `?` icon, no tooltip system. When someone asks "how do I add a side bet?" the answer is "figure it out." |
| **Fix** | Add a `/help` page with searchable FAQs covering: trip setup, scoring, captain mode, side games, and offline use. Add contextual `?` icons on complex screens. |

### 3.2 No quick-start walkthrough

| Detail | |
|---|---|
| **Problem** | First app open should feel like a concierge, not a blank canvas. There's no guided walkthrough explaining the core flow. |
| **Fix** | Add a 4-step coach mark overlay on first launch: (1) Create a trip, (2) Add your buddies, (3) Set up sessions, (4) Score on the course. Dismiss permanently after completion. |

### 3.3 Framer Motion full-bundle import

| Detail | |
|---|---|
| **Files** | 20+ files importing from `framer-motion` |
| **Problem** | Framer Motion v12 is ~40-50KB gzipped. All imports are from the main entry point. On slow course wifi, this adds noticeable load time. |
| **Fix** | Use `framer-motion/m` (mini) for simple animations. Lazy-load heavy animation components (celebrations, onboarding wizard). Audit which animations are actually visible on first load. |

### 3.4 No trip readiness score

| Detail | |
|---|---|
| **Problem** | After creating a trip, there's no dashboard showing "your trip is 60% ready — still need: team assignment, first session." The captain setup card helps but only appears under narrow conditions. |
| **Fix** | Add a persistent "Trip Readiness" progress bar on the home page that tracks: ≥8 players, balanced teams, ≥1 session created, course selected. Show 100% with a celebratory state. |

### 3.5 No share/invite flow for players

| Detail | |
|---|---|
| **Problem** | The app has share codes, but the flow of "captain creates trip → shares link → buddies join" isn't prominently surfaced. First-time captains won't know to go to settings to find the share code. |
| **Fix** | After trip creation, show a "Share with your group" card with a copy-to-clipboard link, QR code, and text message share button. Make this the #1 CTA after trip creation. |

### 3.6 Sentry DSN not configured

| Detail | |
|---|---|
| **Files** | `.env.example` — `NEXT_PUBLIC_SENTRY_DSN` is optional |
| **Problem** | Error tracking is wired up but not active without a DSN. On the first trip, if something breaks, you won't know about it until someone complains. |
| **Fix** | Set up a Sentry project and configure the DSN before launch. Enable performance monitoring for the scoring flow. |

### 3.7 No "end of trip" recap sharing

| Detail | |
|---|---|
| **Problem** | The recap service exists (`recapService.ts`), but there's no prominent "Trip Complete — Share Recap" moment. After the final match, the app should celebrate and make it dead simple to share results. |
| **Fix** | Auto-detect when all sessions are complete. Show a "Trip Complete" celebration screen. Generate a shareable image/card with final score, MVP, and memorable moments. |

---

## Tier 4 — Future Rounds (Post-first-trip backlog)

These matter for repeat use but won't affect the first trip.

| Item | Notes |
|---|---|
| Multi-device real-time sync (v2.0) | Currently offline-first with async sync. True real-time would let the whole group see scores live. |
| GHIN API integration | Auto-import handicaps instead of manual entry. |
| Weather integration | Show forecast for each round on the schedule page. |
| Photo sharing during round | Camera integration for hole-by-hole photos. |
| Player-to-player messaging | Direct messages between matched opponents. |
| Historical trip comparison | "This year vs. last year" stats. |

---

## Summary Scorecard

| Category | Grade | Notes |
|---|---|---|
| **Core scoring engine** | A | Match play logic is solid. 40+ formats. Event sourcing. |
| **Offline capability** | B+ | IndexedDB + SW + background sync. Missing UI feedback. |
| **First-time setup flow** | C+ | Works if you know what you're doing. No guidance otherwise. |
| **Data integrity** | B | Cascade delete gap. No scoring undo. |
| **Visual polish** | A- | Masters-inspired design. Premium feel. Some blank screens. |
| **Error handling** | B | Boundaries exist. Messages are too generic. |
| **Performance** | B | Framer Motion bundle. N+1 mitigated. Missing loading states. |
| **Documentation** | A | Excellent internal docs. No in-app help. |
| **Overall launch readiness** | B+ | Very close. Tier 1 items are the gap between "good" and "legendary." |

---

## Recommended Fix Order

If time is limited, fix in this order for maximum first-trip impact:

1. **1.3** Captain mode onboarding — unblocks the entire setup flow
2. **1.2** Offline sync feedback — builds trust during the round
3. **1.4** Session creation guard rails — prevents setup dead-ends
4. **1.5** Replace blank screens — prevents "is it broken?" moments
5. **1.1** Cascade delete fix — prevents data corruption on re-creation
6. **2.1** Non-captain guidance — helps the other 7-11 players
7. **2.4** Template descriptions — speeds up trip creation
8. **3.5** Share/invite flow — gets everyone into the app
9. **2.2** Loading states — smooths every page transition
10. **3.4** Trip readiness score — gives the captain confidence
