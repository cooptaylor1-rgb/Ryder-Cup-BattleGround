# UX Flow Audit Report — January 2026

**Date:** January 27, 2026
**Auditor:** Senior Product Designer / UX Engineer
**Scope:** User journey mapping, friction audit, error handling, simplification pass
**Status:** ✅ **IMPLEMENTED** — All P0/P1 recommendations shipped

---

## Executive Summary

The Golf Ryder Cup Tracker has evolved significantly since prior UX audits, with many P0 issues addressed (YourMatchCard, Join Trip flow, Captain toggle). Following this audit, **all 5 critical friction points have been resolved**:

1. ~~**Profile creation still requires 14 fields**~~ ✅ **FIXED:** Reduced to 3 essential fields (name + email + PIN)
2. ~~**Scoring mode selection is invisible**~~ ✅ **FIXED:** Added onboarding tooltip explaining swipe/buttons/strokes modes
3. ~~**Match deletion in edit mode lacks discoverability**~~ ✅ **FIXED:** Added hover tooltip to trash button
4. ~~**Bottom nav "More" is still a junk drawer**~~ ✅ **FIXED:** Reorganized into collapsible sections
5. ~~**Session creation requires too many decisions**~~ ✅ **FIXED:** Added "Quick Setup" with smart defaults

### Additional Improvements Implemented

- ✅ **Saving indicator** — Shows "Saving score..." during score submission
- ✅ **Extended undo window** — Increased from 5s to 8s for score correction
- ✅ **Duplicate email warning** — Prevents same email for multiple players
- ✅ **Format tooltips** — Explains each golf format (foursomes, fourball, etc.)

### What's Working Well

- ✅ **YourMatchCard** on home page — 1-tap to scoring, excellent implementation
- ✅ **Join Trip Modal** — Clear entry point for participants, good error handling
- ✅ **Captain Mode Toggle** in header — Visible without navigation
- ✅ **Empty states** — Beautiful illustrations, clear CTAs, no dead ends
- ✅ **Swipe scoring** — Gesture feedback is premium, haptics feel great
- ✅ **Offline handling** — Data saves locally, sync queue is visible
- ✅ **Error pages** — Golf-themed 404, clear recovery actions

---

## 1. User Journey Mapping

### Journey A: First-Time Participant (Joining Existing Trip)

| Step | Screen         | Actions                                 | Friction Level |
| ---- | -------------- | --------------------------------------- | -------------- |
| 1    | App Launch     | See empty state                         | 🟢 Low         |
| 2    | Home           | Tap "Join a Trip"                       | 🟢 Low         |
| 3    | Join Modal     | Enter 6-char code                       | 🟢 Low         |
| 4    | Profile Create | **3 fields:** Name, Email, PIN ✅ FIXED | 🟢 Low         |
| 5    | Home           | See trip, find "Your Match" card        | 🟢 Low         |
| 6    | Scoring        | Tap to score                            | 🟢 Low         |

**Decision Points:**

- Step 4: ~~User must decide to continue through 14 fields or abandon~~ **Now just 3 fields with option to add details later**

**Moments of Hesitation:**

- "Why do I need shirt size to join a golf round?"
- "Can I fill this out later?"

---

### Journey B: Returning User (Score Today's Match)

| Step | Screen     | Actions                    | Friction Level |
| ---- | ---------- | -------------------------- | -------------- |
| 1    | App Launch | See home with active trip  | 🟢 Low         |
| 2    | Home       | Tap "Your Match" card      | 🟢 Low         |
| 3    | Scoring    | See hole 1, swipe to score | 🟡 Medium      |
| 4    | Scoring    | Continue through 18 holes  | 🟢 Low         |

**Decision Points:**

- Step 3: User may not know swipe gestures exist — defaulting to tap buttons

**Moments of Hesitation:**

- "How do I enter actual stroke scores?" (answer: change mode, but where?)
- "Is there a faster way?" (answer: yes, swipe, but not explained)

---

### Journey C: Captain (Day-of Setup)

| Step | Screen         | Actions                         | Friction Level     |
| ---- | -------------- | ------------------------------- | ------------------ |
| 1    | Home           | Enable Captain Mode             | 🟢 Low             |
| 2    | Home           | See "Get Your Trip Ready" guide | 🟢 Low             |
| 3    | Players        | Add 8 players                   | 🟠 **Medium-High** |
| 4    | Draft          | Assign to teams                 | 🟡 Medium          |
| 5    | Lineup/New     | Create session                  | 🔴 **High**        |
| 6    | Lineup Builder | Assign players to matches       | 🟡 Medium          |
| 7    | Session Page   | Start session                   | 🟢 Low             |

**Decision Points:**

- Step 3: Add one-by-one or use bulk mode? (bulk exists but needs discovery)
- Step 5: Choose from 15+ format options — analysis paralysis

**Moments of Hesitation:**

- "Which format is right for our group?"
- "How do I remove a match we don't need?" (answer: trash icon, but not obvious)

---

### Journey D: Power User (Fast Scoring)

| Step | Screen     | Actions             | Friction Level      |
| ---- | ---------- | ------------------- | ------------------- |
| 1    | App Launch | Home loads          | 🟢 Low              |
| 2    | Home       | Tap QuickScoreFAB   | 🟢 Low (if visible) |
| 3    | Scoring    | Swipe left/right/up | 🟢 Low              |

**Friction Point:** QuickScoreFAB only visible when match is "inProgress" — power users want it always accessible.

---

## 2. UX Friction Audit

### 2.1 Unclear Labels & Terminology

| Location                                                                        | Issue                                                   | Recommendation                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [lineup/new/page.tsx](golf-ryder-cup-web/src/app/lineup/new/page.tsx)           | "Foursomes (Alternate Shot)" vs "Four-Ball (Best Ball)" | Add inline tooltips: "You and your partner share one ball"                      |
| [schedule/page.tsx](golf-ryder-cup-web/src/app/schedule/page.tsx)               | "My" vs "All" tabs                                      | Change to "Your Matches" vs "Full Schedule"                                     |
| [score/[matchId]/page.tsx](golf-ryder-cup-web/src/app/score/[matchId]/page.tsx) | Scoring mode buttons are icon-only                      | Add labels: "Swipe", "Tap", "Strokes", "Best Ball"                              |
| [more/page.tsx](golf-ryder-cup-web/src/app/more/page.tsx)                       | "Exit Trip" vs "Delete Trip" confusion                  | Clarify: "Switch to Different Trip" and show "Delete Trip" only in captain mode |

### 2.2 Too Many Required Actions

| Flow             | Current Steps               | Ideal Steps                            | Reduction |
| ---------------- | --------------------------- | -------------------------------------- | --------- |
| Profile creation | 14 fields, 3 screens        | 3 fields, 1 screen                     | 78%       |
| Session creation | 7 fields + match assignment | 2 fields (name, type) + smart defaults | 71%       |
| Player bulk add  | Modal per player            | Spreadsheet-style inline               | 60%       |

### 2.3 Non-Obvious Next Steps

| Screen                   | Issue                         | Fix                                                         |
| ------------------------ | ----------------------------- | ----------------------------------------------------------- |
| After trip creation      | Lands on home, no prompt      | Show "Add players now?" modal                               |
| After adding players     | No guidance                   | Show "Assign to teams?" prompt                              |
| After scoring final hole | Match ends but no celebration | Add match complete celebration + "View results" CTA         |
| Lineup edit mode         | Delete button is subtle       | Add contextual hint: "Tap trash to remove unwanted matches" |

### 2.4 Hidden UI Elements

| Element                | Location                                                                                   | Issue                                               |
| ---------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Scoring mode switcher  | [score/[matchId]/page.tsx#L103](golf-ryder-cup-web/src/app/score/[matchId]/page.tsx#L103)  | Four modes exist but toggle is tiny icons in header |
| Bulk player add        | [players/page.tsx](golf-ryder-cup-web/src/app/players/page.tsx)                            | Button exists but labeled "+" — not discoverable    |
| Match delete in lineup | [LineupBuilder.tsx#L638](golf-ryder-cup-web/src/components/captain/LineupBuilder.tsx#L638) | Trash icon is small, no tooltip                     |
| Session lock/unlock    | [lineup/[sessionId]/page.tsx](golf-ryder-cup-web/src/app/lineup/[sessionId]/page.tsx)      | Lock icon in header — captains miss it              |

### 2.5 Memory-Dependent Flows

| Flow                 | Memory Required                | Fix                                             |
| -------------------- | ------------------------------ | ----------------------------------------------- |
| Captain PIN recovery | "What PIN did I set?"          | Show hint on PIN entry, or allow email recovery |
| Finding past matches | "Which session was yesterday?" | Add date to session cards                       |
| Score correction     | "Where do I edit hole 5?"      | Add "Edit" button per hole in match history     |

---

## 3. Error & Edge-Case Experience

### 3.1 Error Handling Matrix

| Scenario                        | Current Behavior                         | Grade   | Recommendation                                 |
| ------------------------------- | ---------------------------------------- | ------- | ---------------------------------------------- |
| Invalid share code              | Shows inline error "Failed to join trip" | 🟢 Good | -                                              |
| Network offline during score    | Saves locally, shows banner              | 🟢 Good | -                                              |
| Profile PIN mismatch            | Shows "PINs do not match"                | 🟢 Good | -                                              |
| Session with no players         | Shows "Cannot publish" warning           | 🟢 Good | -                                              |
| Delete match without confirm    | Shows confirmation dialog                | 🟢 Good | -                                              |
| Navigate away during score save | Score saved, no warning                  | 🟡 Ok   | Add "Saving..." indicator                      |
| Load trip with missing data     | Empty sections, no error                 | 🔴 Bad  | Show "Some data couldn't load"                 |
| Duplicate player email          | Silently succeeds                        | 🔴 Bad  | Warn: "Email already in use by another player" |

### 3.2 Recovery Path Clarity

| Error                        | Can User Recover?       | Recovery Path Clear?                    |
| ---------------------------- | ----------------------- | --------------------------------------- |
| Wrong score entered          | ✅ Yes                  | 🟡 Undo banner disappears too fast (8s) |
| Deleted match                | ✅ Yes (need to re-add) | 🔴 No indication data is gone           |
| Lost internet mid-sync       | ✅ Yes                  | ✅ Clear: "Will sync when online"       |
| Session accidentally started | ❌ No way to "un-start" | 🔴 Add "Revert to scheduled" option     |

### 3.3 System vs User Blame

| Message                               | Tone             | Recommendation                             |
| ------------------------------------- | ---------------- | ------------------------------------------ |
| "Failed to delete match"              | ⚠️ Blames action | ✅ "Couldn't delete right now. Try again?" |
| "Handicap must be between -10 and 54" | ⚠️ Blames user   | ✅ "Enter a handicap from -10 to 54"       |
| "Something went wrong"                | ✅ Blames system | Keep                                       |

---

## 4. Simplification Pass

### 4.1 Screens That Can Be Merged

| Current                 | Merge Into             | Rationale                                   |
| ----------------------- | ---------------------- | ------------------------------------------- |
| `/captain/draft`        | `/players`             | Draft is just team assignment — do inline   |
| `/captain/availability` | `/captain/checklist`   | Both are "ready to play?" checks            |
| `/trip-stats`           | `/standings` (new tab) | Stats and standings are conceptually linked |

### 4.2 Defaults That Can Be Pre-Selected

| Field            | Current                    | Smart Default              |
| ---------------- | -------------------------- | -------------------------- |
| Session date     | Empty                      | Today's date               |
| Session type     | Empty                      | "Four-Ball" (most popular) |
| Team names       | "Team USA" / "Team Europe" | Keep (good defaults)       |
| Match count      | Empty                      | 4 (standard four-ball day) |
| Points per match | Empty                      | 1                          |

### 4.3 Inputs That Can Be Inferred

| Input             | Currently Asked      | Can Infer From                          |
| ----------------- | -------------------- | --------------------------------------- |
| Player's team     | Manual selection     | "Add to same team as inviter"           |
| Session time slot | "AM" / "PM" dropdown | Current time (if before noon = AM)      |
| Course location   | Manual entry         | Trip location (with option to override) |

### 4.4 Steps That Can Be Deferred

| Step                | Currently Required | Can Defer To                     |
| ------------------- | ------------------ | -------------------------------- |
| Handicap on profile | Step 2             | First match (or never if casual) |
| Shirt size          | Step 3             | Before trip order deadline       |
| Emergency contact   | Step 3             | Before travel day                |
| Course selection    | Session creation   | Match start (or use default)     |

---

## 5. Information Hierarchy & Flow

### 5.1 Home Page Analysis

**Current Hierarchy (top to bottom):**

1. Header with Captain toggle ✅
2. YourMatchCard (if applicable) ✅
3. Live Match Banner (if live) ✅
4. Setup Guide (captain only) ✅
5. Team Score Hero ✅
6. Quick Actions (4 buttons)
7. Captain Tools (3 buttons, captain only)
8. Weather Widget
9. Momentum Cards (2)
10. Side Bets
11. Past Trips

**Issues:**

- Too many sections (11) — cognitive overload
- Weather appears before Momentum — but weather is less actionable
- Side Bets visible even when empty (for captains)

**Recommendation:**

1. Keep: Header, YourMatchCard, Live Banner, Team Score
2. Collapse: Quick Actions + Captain Tools into one "Actions" grid
3. Defer: Weather to "More" or a dedicated Course Info screen
4. Remove: Momentum cards (low utility vs space used)
5. Conditionally Show: Side Bets only when bets exist

### 5.2 Score Page Analysis

**Current Hierarchy:**

1. Header with back button ✅
2. Session selector (dropdown)
3. Match list (cards)

**Issues:**

- Session selector takes valuable space
- No visual distinction for "your" match
- All matches look identical

**Recommendation:**

1. Show "Your Match" at top with highlight
2. Collapse session selector into filter chip
3. Gray out completed matches

### 5.3 More Page Analysis

**Current:** 15+ items in flat list, grouped only by visual separators

**Issues:**

- "Where is X?" requires scrolling entire list
- Captain-only and participant items mixed
- Demo data tools shown to all users

**Recommendation:**

- Group into collapsible sections: "Account", "Trip Settings", "Captain Tools", "App Settings"
- Hide Captain section when not in captain mode
- Move "Seed Demo Data" to Developer settings (hide in production)

---

## 6. Trust & Confidence Check

### 6.1 Predictability Assessment

| Interaction          | Predictable? | Notes                                                       |
| -------------------- | ------------ | ----------------------------------------------------------- |
| Swipe to score       | ⚠️ Mostly    | Direction indicators help, but first-time users may not try |
| Tap buttons to score | ✅ Yes       | Clear team labels                                           |
| Captain mode toggle  | ✅ Yes       | Clear on/off state                                          |
| Undo score           | ⚠️ Partially | Banner auto-dismisses; position is good                     |
| Delete match         | ✅ Yes       | Confirmation dialog prevents accidents                      |

### 6.2 State Communication

| State   | Communicated? | How                               |
| ------- | ------------- | --------------------------------- |
| Loading | ✅ Yes        | Skeleton loaders                  |
| Saving  | ⚠️ Weak       | No explicit "Saving..." indicator |
| Success | ✅ Yes        | Toast notifications               |
| Failure | ✅ Yes        | Toast with error color            |
| Offline | ✅ Yes        | Persistent banner                 |
| Syncing | ✅ Yes        | Sync status badge                 |

### 6.3 "Magic" Without Explanation

| Feature               | Magic Level | Explanation Needed                                          |
| --------------------- | ----------- | ----------------------------------------------------------- |
| Auto-handicap strokes | High        | "Why did John get 2 strokes on this hole?" — tooltip needed |
| Fairness score        | Medium      | "How is this calculated?" — add info button                 |
| Match state sync      | Low         | Works invisibly — good                                      |

---

## 7. Recommendations Summary

### 🔴 Must-Fix (P0) — High Impact, Critical Path

1. **Reduce profile creation to 3 essential fields**
   - Files: [profile/create/page.tsx](golf-ryder-cup-web/src/app/profile/create/page.tsx)
   - Change: Step 1 only: Name, Email, Handicap. Add "Skip for now" on steps 2-3.

2. **Add scoring mode onboarding**
   - Files: [score/[matchId]/page.tsx](golf-ryder-cup-web/src/app/score/[matchId]/page.tsx)
   - Change: First-time tooltip: "Swipe left for USA, right for EUR, up for halved"

3. **Show "Saving..." during score submission**
   - Files: [SwipeScorePanel.tsx](golf-ryder-cup-web/src/components/scoring/SwipeScorePanel.tsx)
   - Change: Add loading overlay for 300ms after swipe

### 🟠 High-Leverage Improvements (P1)

4. **Add smart defaults to session creation**
   - Files: [lineup/new/page.tsx](golf-ryder-cup-web/src/app/lineup/new/page.tsx)
   - Change: "Quick Setup" button: auto-fills date=today, type=fourball, matches=4

5. **Highlight "Your Match" on score list**
   - Files: [score/page.tsx](golf-ryder-cup-web/src/app/score/page.tsx)
   - Change: Add green border + "You're playing" badge to user's match

6. **Add contextual hint for match deletion**
   - Files: [LineupBuilder.tsx](golf-ryder-cup-web/src/components/captain/LineupBuilder.tsx)
   - Change: Tooltip on trash icon: "Delete this match"

7. **Reorganize More page into collapsible sections**
   - Files: [more/page.tsx](golf-ryder-cup-web/src/app/more/page.tsx)
   - Change: Group items, collapse by default, show count of items per section

### 🟡 Nice-to-Have Polish (P2)

8. **Add match complete celebration screen**
   - Show final score, winner announcement, "Share result" CTA

9. **Add PIN recovery option**
   - Allow email-based PIN reset for captains

10. **Reduce home page sections from 11 to 6**
    - Remove Momentum cards, defer Weather, collapse action grids

---

## Appendix: Files Referenced

| File                                                                                 | Lines of Interest                   |
| ------------------------------------------------------------------------------------ | ----------------------------------- |
| [page.tsx](golf-ryder-cup-web/src/app/page.tsx)                                      | Home page — 1090 lines, 11 sections |
| [profile/create/page.tsx](golf-ryder-cup-web/src/app/profile/create/page.tsx)        | 14-field wizard                     |
| [score/[matchId]/page.tsx](golf-ryder-cup-web/src/app/score/[matchId]/page.tsx)      | Scoring modes at L103               |
| [lineup/new/page.tsx](golf-ryder-cup-web/src/app/lineup/new/page.tsx)                | 15+ format options                  |
| [LineupBuilder.tsx](golf-ryder-cup-web/src/components/captain/LineupBuilder.tsx)     | Delete button at L638               |
| [more/page.tsx](golf-ryder-cup-web/src/app/more/page.tsx)                            | 997 lines, 15+ items                |
| [SwipeScorePanel.tsx](golf-ryder-cup-web/src/components/scoring/SwipeScorePanel.tsx) | Swipe gestures                      |

---

**Report Complete.**
