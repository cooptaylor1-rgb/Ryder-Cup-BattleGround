# UX Audit Report: Ryder Cup Tracker App

## Executive Summary

**Overall Grade: B-** — Functional foundation with significant flow friction. The app has solid technical bones and good visual polish, but suffers from navigation complexity, unclear hierarchy, and missing "in-the-moment" optimizations critical for on-course use.

---

## 1️⃣ Role-Based Walkthroughs

### A) Participant Flow

#### Journey: First Open → Onboarding → Finding Schedule → Finding Today's Match → Entering Score → Checking Standings

| Step | What Happens | Verdict |
|------|--------------|---------|
| **First Open** | Empty state with "No tournaments" shows QuickStartWizard button | 🟢 Good: Clear CTA exists |
| **Onboarding** | Must go to More → Create Profile OR wait for captain to add | 🔴 **Friction**: No guided onboarding for participants joining an existing trip |
| **Finding Schedule** | Bottom nav → Schedule shows "My Schedule" vs "All" tabs | 🟡 **Confusion**: Tab defaults to "My" but empty if not matched to player record by email |
| **Finding Today's Match** | Must navigate Schedule → find match → tap to score | 🔴 **Friction**: 3+ taps minimum. No "Your Match Today" hero card |
| **Entering Score** | Score page → select session → select match → score holes | 🟡 **Confusion**: Session selector is hidden below fold. Match list unclear which is "mine" |
| **Checking Standings** | Bottom nav → Standings | 🟢 **Delight**: Beautiful score display, team colors clear |

#### Friction Points Identified

1. **🔴 P0: No "My Match" shortcut** — Participant must navigate 3-4 screens to find their match
2. **🔴 P0: Identity not connected** — Schedule "My" tab is empty if email doesn't match player record exactly
3. **🟡 P1: Score page defaults to first session**, not "today's session" or "my match"
4. **🟡 P1: QuickScoreFAB exists** but only shows when match is "inProgress" — too late
5. **🔴 P0: No "I'm playing now" action** to start scoring without finding match first

---

### B) Captain Flow

#### Journey: Create Tournament → Add Players → Create Events → Enter Scores → Resolve Disputes → Lock Events

| Step | What Happens | Verdict |
|------|--------------|---------|
| **Create Tournament** | Home → "New" button → QuickStartWizard OR trip/new for templates | 🟢 Good: QuickStart is streamlined |
| **Add Players** | More → Captain Mode → Captain → Players page | 🔴 **Friction**: 4 navigations to add first player. Hidden behind captain mode. |
| **Assign Teams** | Players page → edit each player → select team | 🟡 **Confusion**: No bulk team assignment or draft mode visible |
| **Create Session/Lineup** | Matchups → "Create Lineup" (captain only) | 🟡 **Confusion**: Hidden unless captain mode enabled. Multi-step form. |
| **Enter Scores** | Score → Session → Match → hole-by-hole | 🟢 Good: Once in match, scoring is clean |
| **Correct Scores** | Same path + Undo button in header | 🟡 **Confusion**: Undo only works for last action. No edit history. |
| **Resolve Disputes** | Captain Manage page exists but buried | 🔴 **Friction**: No quick access from score page |
| **Lock Events** | Not implemented | 🔴 **Missing**: No session/match lock functionality |

#### Friction Points Identified

1. **🔴 P0: Captain mode toggle buried** — Must navigate to More, scroll to find toggle
2. **🔴 P0: No tournament setup wizard** — Captain must visit 3-4 pages to fully configure
3. **🟡 P1: Draft page exists** but disconnected from player add flow
4. **🟡 P1: No score correction audit trail** — "Who changed what when"
5. **🔴 P0: No session lock/unlock** — Risk of accidental edits to completed rounds

---

## 2️⃣ Flow-First UX Diagnosis

### Screen-by-Screen Analysis

| Screen | Primary Action | Is It Dominant? | Taps to Complete | Issues |
|--------|---------------|-----------------|------------------|--------|
| **Home** | View standings / Enter active match | ❌ Competing CTAs | 1-2 | Too much: Weather, Momentum, Side Bets, Quick Actions all compete |
| **Schedule** | Find my tee time | ⚠️ Tab system adds friction | 2 | "My" vs "All" tabs assume identity is connected |
| **Score (list)** | Pick my match to score | ❌ Session selector dominates | 2-3 | No visual indicator of "your match" |
| **Score (match)** | Enter hole result | ✅ Clear 3-button pattern | 1 | 🟢 This is well done |
| **Standings** | See who's winning | ✅ Score is hero | 0 | 🟢 Excellent |
| **Matchups** | See my opponent | ⚠️ Team rosters dominate | 1 | Missing "You're playing..." hero |
| **More** | Access settings/captain | ❌ 15+ items in list | N/A | Junk drawer syndrome |
| **Captain** | Manage tournament | ⚠️ Grid of 10 actions | 2+ | No priority hierarchy |

### Screens Trying to Do Too Much

1. **Home Page** — Has 7 distinct sections: Live Banner, Feature Card, Score Display, Quick Actions, Weather, Momentum, Side Bets. Reduce to 3 max.
2. **More Page** — 15+ items dumped together. Needs progressive disclosure.
3. **Captain Page** — 10-item action grid is overwhelming. Needs "What should I do now?" guidance.

### Missing "Next Obvious Action"

1. **After creating trip** → Lands on home, should prompt "Add players now?"
2. **After adding players** → No prompt to assign teams or create session
3. **After scoring a hole** → Good: auto-advances. But no "Match complete" celebration screen
4. **After session completes** → No prompt to start next session

### Flows Depending on Memory

1. **Finding captain mode** — Must remember it's in "More"
2. **Connecting identity** — Must remember to match email exactly
3. **Finding team draft** — Buried in Captain grid
4. **Editing past scores** — Must remember to navigate to specific match

---

## 3️⃣ UX Upgrade Proposals

### Navigation Simplification

| Change | Why | Risk | Priority |
|--------|-----|------|----------|
| **Add "My Match" card to Home** when user is in an active match | Eliminates 3+ taps to score | Low | P0 |
| **Move Captain toggle to header** (icon) instead of buried in More | Captains use it constantly | Low | P0 |
| **Collapse More into contextual actions** | Reduce cognitive load | Medium | P1 |
| **Add bottom sheet for quick score** when on Score list page | One-tap to "Score Match 3" | Low | P1 |

### Progressive Disclosure

| Change | Why | Risk | Priority |
|--------|-----|------|----------|
| **Hide Side Bets section** until first bet created | Reduces home page noise | Low | P1 |
| **Hide Weather widget** unless trip has course coordinates | Shows irrelevant data | Low | P1 |
| **Collapse Momentum cards** into single "Team Trend" chip | Two large cards → one line | Low | P1 |
| **Captain grid: Show top 4 actions**, expand for rest | 10 actions is overwhelming | Low | P0 |

### Now / Next / Later Hierarchy

| Change | Why | Risk | Priority |
|--------|-----|------|----------|
| **Home hero should be YOUR next action** not team score | "Your tee time: 1:30 PM, Hole 1" | Medium | P0 |
| **Score page: Highlight "Your Match"** with badge | Currently all matches look same | Low | P0 |
| **Captain page: Add "Needs Attention" section** | Show incomplete setup, disputes | Medium | P1 |
| **Schedule: Show countdown** to next tee time | "Tee off in 45 min" | Low | P1 |

### Captain-Only Controls (Never Confuse Participants)

| Change | Why | Risk | Priority |
|--------|-----|------|----------|
| **Add visual captain badge** to UI when captain mode active | Captains know they're "elevated" | Low | P1 |
| **Gray out captain-only buttons** for non-captains | Currently buttons are hidden entirely (confusing) | Low | P1 |
| **Captain actions in score page** (edit strokes) via long-press | Currently must navigate away | Medium | P1 |

---

## 4️⃣ Safety & Confidence Layer

### Destructive Actions Assessment

| Action | Current Protection | Needed | Priority |
|--------|-------------------|--------|----------|
| Delete player | Confirm modal | ✅ Sufficient | - |
| Delete trip | "Exit trip" only (doesn't delete) | ⚠️ Add true delete with PIN confirm | P1 |
| Clear all data | Confirm modal | ✅ Sufficient | - |
| Score hole wrong | Undo in header | 🔴 Undo disappears after navigation | P0 |
| Edit past score | No protection | 🔴 Add "You're editing hole 3 scored 2 hours ago" warning | P0 |

### Score Edit Provenance

**Current State**: No audit trail. Scores can be changed silently.

**Needed**:

```
Hole 3: USA Won
  Scored by Cooper T. at 2:34 PM
  Edited by Captain at 3:15 PM (reason: "Wrong hole recorded")
```

**Priority**: P0 — This is critical for dispute resolution.

### Captain Authority

| Feature | Status | Recommendation |
|---------|--------|----------------|
| Lock completed sessions | ❌ Missing | Add "Finalize Session" with unlock PIN |
| Override match result | ⚠️ Possible but no audit | Add "Captain Override" with required reason |
| Reopen closed match | ⚠️ No UI for this | Add to Captain Manage page |

### Offline/Failure States

| Scenario | Current Behavior | Recommendation |
|----------|-----------------|----------------|
| Offline during score | ✅ Saves to IndexedDB | Good |
| Sync conflict | ❌ Not handled | Show "Sync conflict" banner with resolution UI |
| API error on save | ⚠️ Silent failure | Show toast + retry button |
| Partial data load | ⚠️ Shows empty state | Show "Loading..." skeleton properly |

---

## 5️⃣ Flow Maps

### Participant Flow (Current vs Ideal)

```
CURRENT (7 steps to score):
┌──────────────────────────────────────────────────────────────┐
│ Open App → Home → Nav:Score → Session Selector → Match List  │
│ → Select Match → Score Page → Enter Score                    │
└──────────────────────────────────────────────────────────────┘

IDEAL (2 steps to score):
┌──────────────────────────────────────────────────────────────┐
│ Open App → Home shows "Your Match" card → Tap to Score       │
│ OR: QuickScoreFAB visible from ANY screen                    │
└──────────────────────────────────────────────────────────────┘
```

### Captain Flow (Current vs Ideal)

```
CURRENT (Setup requires 5+ separate navigations):
┌──────────────────────────────────────────────────────────────┐
│ Create Trip → Home → More → Captain Mode → Back → Home       │
│ → Captain → Players → Add... → Back → Draft → Back           │
│ → Lineup/New → Configure → Build → Save                      │
└──────────────────────────────────────────────────────────────┘

IDEAL (Guided wizard):
┌──────────────────────────────────────────────────────────────┐
│ Create Trip → "Add players now?" → Bulk add/import           │
│ → "Assign teams?" → Draft or manual → "Create first round?"  │
│ → Session builder → Done (back to Home with setup complete)  │
└──────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ Top 10 Flow Killers

| Rank | Issue | Impact | Fix Complexity |
|------|-------|--------|----------------|
| 1 | **No "My Match" hero on Home** | Every participant, every time | Low |
| 2 | **Captain mode buried in More** | Captains toggle 10+ times/day | Low |
| 3 | **Identity not auto-linked** | Schedule "My" tab empty | Medium |
| 4 | **Score page: No "your match" indicator** | Participants pick wrong match | Low |
| 5 | **No score edit audit trail** | Disputes unresolvable | Medium |
| 6 | **No session lock/finalize** | Accidental edits to past rounds | Medium |
| 7 | **Captain page: 10-item grid overwhelming** | Analysis paralysis | Low |
| 8 | **Home page: 7 sections competing** | No clear primary action | Low |
| 9 | **No onboarding for joining participant** | "What do I do?" moment | Medium |
| 10 | **Undo disappears after navigation** | Lost ability to fix mistakes | Medium |

---

## 7️⃣ P0 / P1 Fix List

### P0 — Must Fix (Ship Blockers)

| ID | Fix | Effort | Files Affected |
|----|-----|--------|----------------|
| P0-1 | Add "Your Match" hero card to Home when participant has active match | 2 hrs | `page.tsx` (home) |
| P0-2 | Move Captain Mode toggle to header (shield icon) | 1 hr | `layout.tsx`, `BottomNav.tsx` |
| P0-3 | Highlight "Your Match" in Score page with badge | 1 hr | `score/page.tsx` |
| P0-4 | Add score edit audit trail (who/when/what changed) | 4 hrs | `HoleResult` model, scoring UI |
| P0-5 | Persist undo stack across navigation | 2 hrs | `useScoringStore` |
| P0-6 | Add "Finalize Session" lock with captain PIN unlock | 3 hrs | `RyderCupSession` model, captain UI |
| P0-7 | Captain page: Top 4 priority actions, expandable grid | 1 hr | `captain/page.tsx` |

### P1 — Strongly Recommended

| ID | Fix | Effort | Files Affected |
|----|-----|--------|----------------|
| P1-1 | Auto-link user identity by email on first load | 3 hrs | `TripRehydrationProvider`, auth flow |
| P1-2 | Collapse Home to 3 sections max (Score, Your Match, Quick Actions) | 2 hrs | `page.tsx` (home) |
| P1-3 | Add captain setup wizard after trip creation | 4 hrs | New component |
| P1-4 | Add "Needs Attention" section to Captain page | 2 hrs | `captain/page.tsx` |
| P1-5 | Show "You're editing past data" warning on old scores | 1 hr | `score/[matchId]/page.tsx` |
| P1-6 | Add countdown to next tee time on Schedule | 1 hr | `schedule/page.tsx` |
| P1-7 | Captain badge in header when elevated | 30 min | Header component |
| P1-8 | Long-press score button for captain quick-edit | 2 hrs | Score components |

---

## 8️⃣ Concrete UI/UX Changes (Implementation Ready)

### Change 1: "Your Match" Hero Card (P0-1)

**Location**: Home page, below Live Banner, above team score

**Design**:

```
┌─────────────────────────────────────────────┐
│ 🏌️ YOUR MATCH                              │
│                                             │
│ Match 3 • Fourball                          │
│ You + Mike vs Dan + Steve                   │
│                                             │
│ Tee Time: 1:30 PM (in 45 min)              │
│                                             │
│ [ Enter Score → ]                           │
└─────────────────────────────────────────────┘
```

**Logic**: Show when `currentUserPlayer` is in a match with status `scheduled` or `inProgress`

### Change 2: Captain Mode Quick Toggle (P0-2)

**Location**: Header, right side

**Design**:

```
Current:  [Logo] Ryder Cup Tracker    [sparkles]
Proposed: [Logo] Ryder Cup Tracker    [shield 🔒]
```

- Shield icon grayed out = captain mode off
- Shield icon green with lock = captain mode on
- Tap toggles (with PIN prompt to enable)

### Change 3: "Your Match" Badge on Score List (P0-3)

**Location**: Score page match rows

**Design**:

```
Match 3   Cooper & Mike vs Dan & Steve   A/S
          ^^^^^^^^^^^^^^^^^^^^^^^^^^
          [ YOUR MATCH ] badge if user is Cooper or Mike
```

### Change 4: Score Edit Audit (P0-4)

**Data Model Addition**:

```typescript
interface HoleResultAudit {
  editedAt: ISODateString;
  editedBy: UUID; // player or captain
  previousWinner: HoleWinner;
  newWinner: HoleWinner;
  reason?: string; // required if captain override
}
```

**UI**: Show "Last edited by [name] at [time]" below hole result in history view

### Change 5: Session Lock (P0-6)

**UI**: Add to Captain Manage page

```
Session 1: Morning Foursomes
Status: Complete (4/4 matches)
[ Finalize Session 🔒 ]

After finalize:
Status: Finalized ✓
[ Unlock (Captain PIN required) ]
```

### Change 6: Simplified Captain Grid (P0-7)

**Current**: 10 equal-weight action cards
**Proposed**:

```
PRIORITY ACTIONS (always visible):
┌───────────┬───────────┐
│ Create    │ Manage    │
│ Lineup    │ Trip      │
├───────────┼───────────┤
│ Side Bets │ Messages  │
└───────────┴───────────┘

MORE ACTIONS (collapsed by default):
▼ Show More (6 items)
  - Attendance
  - Pre-Flight
  - Team Draft
  - Invitations
  - Cart Assignments
  - Contacts
```

---

## Summary

This app has strong bones: the scoring UI is excellent, the visual design is premium, and the offline-first architecture is correct. The core problems are **navigation complexity** and **missing in-the-moment shortcuts**.

The highest-impact fixes require minimal code:

1. Add "Your Match" card to Home
2. Surface captain toggle
3. Badge "your match" in lists
4. Add audit trail for scores

These 4 changes would materially improve the experience for both participants and captains.

**Recommendation**: Implement P0 fixes before next tournament use. Schedule P1 fixes for post-tournament iteration based on user feedback.
