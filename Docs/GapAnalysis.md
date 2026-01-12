# Gap Analysis - Captain's Toolkit Upgrade

**Date:** January 12, 2026  
**Version:** 1.1 Planning Document  
**Author:** Engineering Team

---

## Executive Summary

After comprehensive repo recon, the Golf Ryder Cup App has a solid foundation with SwiftUI + SwiftData (MVVM), good model design, and premium UX patterns. However, several gaps exist around **captain workflow safety**, **lineup building friction**, and **real-time tournament awareness**. This document outlines the top friction points, reliability risks, and delight opportunities with a prioritized implementation plan.

---

## Top 10 Friction Points

| # | Issue | Severity | Area |
|---|-------|----------|------|
| **F1** | No session lock to prevent mid-round pairing edits | 🔴 High | Captain Mode |
| **F2** | No drag-and-drop lineup builder - must manually edit each match | 🔴 High | Lineup |
| **F3** | Home tab lacks "Magic Number" and clinch scenarios | 🟡 Medium | Command Center |
| **F4** | No handicap preview in pairing flow | 🟡 Medium | Lineup |
| **F5** | Can't "auto-suggest" balanced pairings with one tap | 🟡 Medium | Lineup |
| **F6** | No fairness explainability beyond score (why is it unfair?) | 🟡 Medium | Lineup |
| **F7** | Banter feed requires manual posts for lineup announcements | 🟢 Low | Social |
| **F8** | No local tee time notifications | 🟢 Low | Awareness |
| **F9** | No side games (skins, Nassau, KP) support | 🟢 Low | Engagement |
| **F10** | No share/export for standings or trip recap | 🟢 Low | Sharing |

---

## Top 10 Reliability Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| **R1** | Duplicate player in same session not blocked | 🔴 High | Validation layer |
| **R2** | Session can be edited while match scoring is active | 🔴 High | Lock mechanism |
| **R3** | No audit trail for pairing changes or score edits | 🔴 High | Action log |
| **R4** | Missing hole handicaps silently cause incorrect strokes | 🔴 High | Pre-start validation |
| **R5** | Undo history limited to 5 steps, no persistence | 🟡 Medium | Expand + persist |
| **R6** | Player IDs stored as comma-separated strings (brittle parsing) | 🟡 Medium | Documented, acceptable |
| **R7** | No confirmation on finalizing match | 🟡 Medium | Add confirm dialog |
| **R8** | Team membership not validated against match pairings | 🟡 Medium | Cross-validation |
| **R9** | No data export/backup mechanism | 🟢 Low | Future iCloud sync |
| **R10** | Weather stub is hardcoded (no real data seam) | 🟢 Low | Clean seam exists |

---

## Top 10 Delight Wins

| # | Opportunity | Impact | Effort |
|---|-------------|--------|--------|
| **D1** | "Score Now" button on Home → instant deep link | 🔴 High | Low |
| **D2** | Big countdown timer to next tee time | 🔴 High | Low |
| **D3** | One-tap "Auto-Fill" lineup with fairness preview | 🔴 High | Medium |
| **D4** | Animated "Magic Number to Clinch" widget | 🟡 Medium | Low |
| **D5** | Captain quick actions: Lock/Unlock, Publish Lineup | 🟡 Medium | Medium |
| **D6** | Auto-generated Banter posts for lineup publish | 🟡 Medium | Low |
| **D7** | Share card for session results (image export) | 🟡 Medium | Medium |
| **D8** | "Path to Victory" scenarios on Standings | 🟡 Medium | Medium |
| **D9** | Skins/Nassau side games with ledger | 🟢 Low | High |
| **D10** | Local notifications for tee times | 🟢 Low | Medium |

---

## Prioritized Implementation Plan

### P0 - Captain's Toolkit Core (Must Ship)

#### P0.1 Captain Mode (Locks + Safe Editing)
**Effort:** 2-3 days | **Priority:** Critical

- [ ] Add `isCaptainModeEnabled` and `isSessionLocked` properties to Trip/Session
- [ ] Implement lock state machine: Auto-lock when any match starts scoring
- [ ] "Unlock requires confirm" with long-press + confirmation dialog
- [ ] Audit trail model (`AuditLogEntry`) for: pairing changes, score edits, lock/unlock
- [ ] Visual lock badges and "Editing disabled during live scoring" messaging
- [ ] Data integrity checks:
  - Block duplicate player in session
  - Validate team membership consistency
  - Require hole handicaps before session start

**Files to modify:**
- `Models/Trip.swift` - Add captain mode properties
- `Models/RyderCupSession.swift` - Lock state
- New `Models/AuditLogEntry.swift`
- New `Services/CaptainModeService.swift`
- `Views/Matchups/MatchupsTabView.swift` - Lock UI
- New `Views/Captain/CaptainModeView.swift`

#### P0.2 Lineup Builder (Fast, Draggable, Fairness-Aware)
**Effort:** 3-4 days | **Priority:** Critical

- [ ] New `LineupBuilderView` with two-column team layout
- [ ] Drag-and-drop player chips into match slots
- [ ] Handicap shown on each player chip
- [ ] "Auto-Fill" algorithm:
  - Optimize handicap balance
  - Minimize repeat pairings (use pairing history)
  - Minimize same opponents repeatedly
  - "Lock" players/pairs and re-run
- [ ] Fairness Score (0-100) with explainability:
  - Top 3 drivers: handicap gap, repeat pairings, lopsided matchups
  - "This session favors Team USA by ~0.8 strokes"
- [ ] "Preview strokes" per match
- [ ] "Publish Lineup" action → auto Banter post, pin to top

**Files to modify:**
- New `Views/Lineup/LineupBuilderView.swift`
- New `Views/Lineup/PlayerChipView.swift`
- New `Views/Lineup/FairnessScoreView.swift`
- New `Services/LineupAutoFillService.swift`
- `Services/TournamentEngine.swift` - Add pairing history tracking
- `Models/BanterPost.swift` - Add lineup publish helper

#### P0.3 Trip Command Center Upgrade (Home Tab)
**Effort:** 2 days | **Priority:** Critical

- [ ] Prominent "Next Up" card with big countdown timer
- [ ] Today's session status: not started / live / completed
- [ ] "Score Now" CTA deep links to active match
- [ ] Captain quick actions: Build Lineup, Publish, Lock/Unlock
- [ ] "Magic Number" to clinch + simple "Path to Victory" highlight
- [ ] Weather slot seam (stub with design placeholder)
- [ ] Performance: ViewModel-based, minimize view recomputation

**Files to modify:**
- `Views/Home/HomeTabView.swift` - Major upgrade
- New `ViewModels/HomeViewModel.swift`
- `Extensions/DesignSystem.swift` - Countdown timer component

---

### P1 - High-Impact Upgrades (Pick 2-3)

#### P1.A Side Games (Skins/Nassau/KP/Long Drive)
**Effort:** 4-5 days | **Priority:** High value, high effort

- [ ] New `SideGame` model with types: skins, nassau, kp, longDrive
- [ ] Skins per round (net or gross, configurable)
- [ ] Nassau (front/back/total) with presses
- [ ] KP/Long Drive entries (optional photo)
- [ ] Ledger: who owes who, settle-up summary
- [ ] Offline-first, big buttons, quick entry

**Files to create:**
- `Models/SideGame.swift`
- `Models/SideGameEntry.swift`
- `Views/SideGames/SideGamesTabView.swift`
- `Views/SideGames/SkinsView.swift`
- `Views/SideGames/NassauView.swift`
- `Views/SideGames/LedgerView.swift`
- `Services/SideGameEngine.swift`

#### P1.B Share/Export
**Effort:** 2-3 days | **Priority:** Medium effort, high delight

- [ ] One-tap share cards:
  - Overall standings
  - Session results
  - Player leaderboard
- [ ] Consistent branding from DesignSystem
- [ ] Share image via ShareLink
- [ ] PDF "Trip Recap" (optional):
  - Teams/rosters
  - Session results
  - Final standings
  - Awards (MVP, best record, worst record)
- [ ] "Share after match final" prompt (dismissible)

**Files to modify:**
- `Views/Standings/StandingsTabView.swift` - Add share functionality
- New `Views/Share/ShareCardView.swift`
- New `Views/Share/TripRecapView.swift`
- New `Services/ShareCardRenderer.swift`

#### P1.C Draft Board
**Effort:** 3-4 days | **Priority:** Medium

- [ ] Draft Board screen with snake draft support
- [ ] Custom order option, timed picks optional
- [ ] Tracks picks and auto-updates teams/rosters
- [ ] Posts draft updates to Banter

**Files to create:**
- `Views/Draft/DraftBoardView.swift`
- `Models/DraftPick.swift`
- `Services/DraftService.swift`

#### P1.D Local Notifications for Tee Times
**Effort:** 1-2 days | **Priority:** Low effort, medium value

- [ ] Schedule local notifications: "Tee time in 45 minutes", "10 minutes"
- [ ] Opt-in per device
- [ ] Based on ScheduleItem times

**Files to create:**
- `Services/NotificationService.swift`
- `Views/Settings/NotificationSettingsView.swift`

---

### P2 - Future Enhancements

| Feature | Notes |
|---------|-------|
| iCloud Sync | SwiftData seams in place, needs CloudKit config |
| GHIN API Integration | Stub in Player model, clean seam |
| Apple Watch Companion | Quick scoring, standings glance |
| Live Activities | Lock screen standings |
| Widgets | Home screen standings widget |

---

## Architecture Recommendations

### Current Strengths
- Clean MVVM with SwiftData works well
- Design system with tokens is excellent
- ScoringEngine state machine is solid
- Test coverage for core engines

### Improvements Needed
1. **Introduce ViewModels** for complex screens (Home, Lineup Builder)
2. **Protocol-based services** for testability (e.g., `LineupServiceProtocol`)
3. **Data validation layer** that runs pre-session-start
4. **Audit log** for critical actions

### Performance Considerations
- Home tab should minimize `@Query` overhead - use ViewModel
- Lineup drag-drop needs smooth 60fps - use lightweight state
- SwiftData fetches should avoid N+1 (use `#Predicate` filters)

---

## Testing Strategy

### Unit Tests to Add
- [ ] LineupAutoFillService determinism
- [ ] Handicap allowances with edge cases (plus handicaps, huge deltas)
- [ ] Session lock state machine
- [ ] Duplicate player detection
- [ ] Fairness score calculation

### Integration Tests
- [ ] Full lineup → publish → lock → score → finalize flow
- [ ] Undo/redo across session boundaries

---

## Implementation Order

**Week 1:**
1. P0.1 Captain Mode (models + lock logic + UI)
2. P0.3 Command Center basic upgrades

**Week 2:**
3. P0.2 Lineup Builder (views + auto-fill)
4. P0.1 Audit trail integration

**Week 3:**
5. P1.B Share/Export (quick win)
6. P1.D Local Notifications (quick win)

**Week 4:**
7. P1.A Side Games (if time permits)
8. Polish, testing, documentation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to build lineup | < 60 seconds |
| Accidental pairing edits during live scoring | 0 |
| Tap count to score a hole | 1-2 taps |
| App crashes during tournament | 0 |
| Captain satisfaction ("feels like command center") | Qualitative feedback |

---

## Conclusion

The app has strong bones. The Captain's Toolkit upgrade focuses on **bulletproof safety** (locks, validation, audit), **speed** (lineup builder, auto-fill), and **awareness** (command center, magic numbers). P0 features address the most critical captain pain points. P1 features add polish and delight. This plan can ship in 3-4 weeks with focused execution.
