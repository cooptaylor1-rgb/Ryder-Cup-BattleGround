# Release Notes

## v1.1.0 — Captain's Toolkit 🎖️

**Release Date**: January 2025  
**Minimum iOS**: 17.0  
**Build**: TBD

---

### 🎯 Overview

The **Captain's Toolkit** release transforms the Golf Ryder Cup App into the most reliable, delightful, and impossible-to-screw-up trip companion. This major update focuses on three pillars:

1. **Reliability** — Captain Mode prevents accidental edits during live scoring
2. **Efficiency** — Lineup Builder with auto-fill and fairness scoring
3. **Delight** — Magic numbers, countdowns, share cards, and notifications

---

### ✨ New Features

#### 👑 Captain Mode (P0.1)

**Session Locking**
- Lock sessions once pairings are finalized to prevent accidental changes
- Sessions auto-lock when any match begins scoring
- Unlocking requires a 1.5-second hold gesture (prevents drunk-taps!)
- Visual lock badge on all session cards

**Audit Trail**
- Complete log of all critical actions
- Tracks: session locks/unlocks, pairing edits, score changes, lineup publishes
- Filterable by action type
- Captain crown icon in toolbar for quick access

**Session Validation**
- Pre-start validation catches common errors:
  - Duplicate player assignments across matches
  - Players not on either team
  - Empty match slots
- Errors vs warnings distinction

#### 🎯 Lineup Builder (P0.2)

**Drag & Drop Interface**
- Visual player chips with team colors
- Drag players into match slots
- Flow layout for available players pool
- Lock individual matches when finalized

**Auto-Fill Magic**
- One-tap optimal lineup generation
- Considers handicap differences for fair pairings
- Generates format-appropriate pairings:
  - Singles: 1v1 matchups
  - Fourball/Foursomes: Partner pairings

**Fairness Score**
- 0-100 composite score for lineup quality
- Explainable drivers:
  - Handicap spread within teams
  - Overall handicap balance
  - Match competitiveness
- Visual indicator with expandable details

#### 🏠 Command Center Upgrade (P0.3)

**Countdown Timer**
- Live countdown to next tee time
- Format adapts: "2h 15m" → "5m 32s" → "NOW"
- Visual urgency with warning colors

**Magic Number Display**
- Points needed to clinch for each team
- Path to victory insight text
- Updates in real-time as results come in

**Live Matches Section**
- Shows all in-progress matches
- Quick tap to jump to scoring
- Match status and current hole

**Enhanced Captain Actions**
- Session state chips (Locked/Live/Open counts)
- Build Lineup quick action for next session
- Score Now, Standings, Matchups grid
- Contextual subtitles

**Champion Banner**
- Trophy animation when team clinches
- Winner announcement with gold styling

#### 📤 Share & Export (P1.B)

**Standings Share**
- One-tap share of current standings
- Includes scores, leader, magic number
- Formatted with golf emoji and hashtags

**Match Results Share**
- Share individual match outcomes
- Includes session type and result

**Session Results Share**
- Full session breakdown
- Individual match results with status emoji
- Overall standings update

#### 🔔 Local Notifications (P1.D)

**Tee Time Reminders**
- 30-minute and 10-minute pre-session alerts
- Actionable: View Lineup, Snooze
- Per-session scheduling

**Event Notifications**
- Match complete alerts
- Session locked alerts
- Configurable in Settings

**Notification Settings View**
- Authorization prompt handling
- Toggle notification types
- View/manage scheduled notifications
- Test notification (debug builds)

---

### 🔧 Technical Improvements

#### GitHub Actions CI
- Automated build and test on push/PR
- macOS 14 runner with Xcode 15.2
- SPM caching for faster builds
- SwiftLint integration
- Test results artifact upload
- Release build verification on main branch

#### New Services
- `CaptainModeService` — Session locking and validation
- `LineupAutoFillService` — Optimal pairing generation
- `ShareService` — Shareable content generation
- `NotificationService` — Local notification management

#### New Models
- `AuditLogEntry` — Audit trail entries with 15 action types

#### Enhanced Models
- `Trip` — Added captain mode properties, magic number computation
- `RyderCupSession` — Extended with `isLocked` property

---

### 📁 Files Added

**Models**
- `Models/AuditLogEntry.swift`

**Services**
- `Services/CaptainModeService.swift`
- `Services/LineupAutoFillService.swift`
- `Services/ShareService.swift`
- `Services/NotificationService.swift`

**Views**
- `Views/Captain/SessionLockView.swift`
- `Views/Captain/AuditLogView.swift`
- `Views/Lineup/LineupBuilderView.swift`
- `Views/Settings/NotificationSettingsView.swift`

**CI/CD**
- `.github/workflows/ci.yml`

**Documentation**
- `Docs/GapAnalysis.md`
- `ReleaseNotes.md`

---

### 📁 Files Modified

- `Models/Trip.swift` — Captain mode properties
- `GolfTripApp/GolfTripApp.swift` — Schema registration
- `Views/Matchups/MatchupsTabView.swift` — Captain Mode integration
- `Views/Home/HomeTabView.swift` — Command Center upgrade
- `README.md` — What's New section

---

### 🐛 Bug Fixes

- None (new features only in this release)

---

### 🔮 Coming Soon (v1.2)

- **P1.A Side Games** — Nassau, skins, closest-to-pin tracking
- **P1.C Draft Board** — Live snake draft with turn timers
- **P2 Weather Integration** — Real forecast data
- **P2 Photo Attachments** — Link photos to matches
- **P2 Banter Auto-Posts** — Auto-generated match result posts

---

### 📋 Migration Notes

No breaking changes. The new `AuditLogEntry` model is automatically added to the schema. Existing trips will have `isCaptainModeEnabled = false` by default.

---

### 🙏 Credits

Built with ❤️ for golf buddies everywhere.

**Tech Stack**
- SwiftUI + SwiftData
- iOS 17+ with @Observable macro
- UserNotifications framework
- GitHub Actions CI/CD
