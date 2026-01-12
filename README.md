# 🏆 The Ryder Cup Companion

**The world's best iOS app for buddies trip Ryder Cup tournaments.**

A premium Augusta-level golf trip companion built with SwiftUI and SwiftData for iOS 17+. Features match play scoring, team management, live standings, and a "Trip Command Center" that makes running a competitive golf trip legendary. Designed to be fast, delightful, and impossible to mess up after 3 beers.

![CI](https://github.com/your-org/Golf-Ryder-Cup-App/actions/workflows/ci.yml/badge.svg)

---

## 🆕 What's New in v1.1 — Captain's Toolkit

This release transforms the app into the most reliable, delightful, and impossible-to-screw-up Ryder Cup trip companion.

### 👑 Captain Mode (P0.1)
- **Session Locking**: Lock lineups once scoring begins — no more accidental edits
- **Auto-Lock**: Sessions auto-lock when any match starts scoring
- **Hold-to-Unlock**: 1.5-second press required to unlock (prevents drunk-taps)
- **Audit Log**: Track all critical actions (who changed what, when)
- **Validation**: Verify sessions before start — catch duplicate players, missing lineups

### 🎯 Lineup Builder (P0.2)
- **Drag & Drop Interface**: Visual pairing with player chips
- **Auto-Fill Magic**: One-tap optimal lineups based on handicaps
- **Fairness Score**: 0-100 rating with explainable drivers
- **Lock Individual Matches**: Finalize pairings match-by-match
- **Publish Lineup**: Notify everyone when lineup is locked

### 🏠 Trip Command Center Upgrade (P0.3)
- **Big Countdown Timer**: Live countdown to next tee time
- **Magic Number Display**: Points needed to clinch for each team
- **Live Matches Section**: Quick links to in-progress matches
- **Enhanced Captain Actions**: Build Lineup, Score Now, view session states
- **Champion Banner**: Celebration when a team clinches

### 📤 Share & Export (P1.B)
- **One-Tap Share Cards**: Share standings, match results, session summaries
- **Branded Text**: Ready-to-paste for group chats with #RyderCup hashtags
- **Match Results**: Share individual match outcomes instantly

### 🔔 Local Notifications (P1.D)
- **Tee Time Reminders**: 30-min and 10-min alerts before sessions
- **Match Complete Alerts**: Know when matches finish
- **Session Lock Alerts**: Know when lineups are locked
- **Snooze Support**: Remind me in 15 minutes

---

## ✨ Premium Features

### 🎯 Match Play Scoring (Bulletproof)
- **Massive 96pt buttons** - Easy tapping, even after drinks
- **Live status**: "Team A 2 UP with 5 to play"
- **Auto-detection**: Dormie, closed out, final results
- **5-step undo history** for corrections
- **Haptic feedback** on every interaction
- **Victory fireworks** with celebration animations

### 🎯 Sessions & Formats
- **Foursomes** (alternate shot) - partners take turns
- **Fourball** (best ball) - each plays own ball, best score counts
- **Singles** - 1v1 match play
- Configurable points per match (default: 1.0, championship: 1.5)

### 📊 Handicap Allowances
```swift
// Singles: 100% of course handicap difference
// Fourball: 90% off lowest handicap
// Foursomes: 50% of combined team handicap
```

### 🏅 Standings & Leaderboard
- **Big animated score display**: Team A 8.5 — Team B 5.5
- **Session breakdown** with points per session
- **Champion crowns** for top performers (gold/silver/bronze)
- **Performance badges**: Hot Streak, Clutch, Captain
- **Magic number** - points needed to clinch
- **Shareable branded cards** for bragging rights

## 🎨 Premium Design

The app features an Augusta National-inspired premium design system:

- **Dark mode first** - Premium feel, great in bright sunlight
- **Glass morphism** effects with depth layers
- **Team color glows** on scoring buttons
- **Animated momentum graphs**
- **Trophy animations** for victories
- **Smooth spring animations** throughout

## Navigation

The app uses a 6-tab layout optimized for "in the moment" use:

| Tab | Description |
|-----|-------------|
| **Home** | Trip Command Center - next match, today's schedule, captain actions |
| **Matchups** | Session list, match pairings, captain editing mode |
| **Score** | "Score Now" CTA, active matches, scoring interface |
| **Standings** | Live team scores, session breakdown, player leaderboard |
| **Teams** | Rosters, captain tools, pairing history |
| **More** | Banter feed, photos, players, courses, settings |

## Features

### Player Profiles
- Create/edit/delete players with full profile information
- USGA Handicap Index (decimal precision)
- Optional GHIN number for future integration
- Tee preference (Blue/White/etc.)
- Avatar photo support
- Player list with search and sort (by name or handicap)
- Course handicap preview for different course difficulties

### Courses
- Create/edit/delete courses
- Multiple tee sets per course with:
  - Rating and Slope
  - Par and total yardage
  - **Hole handicaps (1-18)** - Required for proper stroke allocation
  - Hole pars
- Course detail screen with complete hole handicap table

### Course Setup Wizard
A guided multi-step wizard to set up courses quickly (under 2 minutes on a phone):

**Entry Points:**
- Courses tab → "+ Add Course" → "Course Setup Wizard"
- Schedule item edit → "Create New Course" (returns with course pre-selected)

**5-Step Flow:**
1. **Basic Course Info** - Name (required), location, notes
2. **Tee Set Basics** - Name, rating, slope, par with quick-fill options
3. **Hole Pars** (Optional) - Skip, use defaults, or enter manually
4. **Hole Handicaps** (Required) - Three input modes:
   - **Paste List** - Parse numbers from any format
   - **Quick Grid** - Direct numeric entry
   - **Rank by Hole** - Tap holes to assign rankings
5. **Review & Save** - Summary with edit links

**Key Features:**
- Progress indicator showing current step
- Inline validation with clear error messages
- "Copy from existing tee set" for shared hole handicaps
- "Save Draft" anytime
- "Save & Add Another Tee Set" for multiple tees

### Trip & Schedule
- Create trips with name, dates, location, and notes
- Day-by-day schedule view
- Schedule items:
  - **Tee Times** - linked to course/tee set, with player groups
  - **Events** - dinners, travel, activities
- Groups for tee times with player assignments
- Quick navigation to upcoming events

### Teams
- Dedicated Teams tab for trip-based team management
- Two team modes:
  - **Freeform Teams** - any number of teams, flexible roster sizes
  - **Ryder Cup Sides** - exactly 2 teams with roster validation
- Team color selection (Team USA blue, Team Europe red)
- Captain and vice-captain designation
- Player stats: points earned, W-L-H record
- Pairing history matrix

### Banter Feed
- Post messages with emoji reactions
- Auto-generated posts for match results and lineup announcements
- Offline-first with local storage

### Photo Albums
- Per-day photo organization
- Attach photos to matches
- Memory lane recap view

## How to Run

### Requirements
- macOS with Xcode 15.0+
- iOS 17.0+ deployment target
- Swift 5.9+

### Steps
1. Open `GolfTripApp/GolfTripApp.xcodeproj` in Xcode
2. Select a simulator or connected device (iOS 17+)
3. Build and run (⌘R)

### Sample Ryder Cup Weekend
The app automatically seeds a full Ryder Cup experience on first launch:
- **8 players** with realistic handicaps (5.1 to 22.3)
- **4 courses** with complete tee sets
- **2 teams**: Team USA (4 players) vs Team Europe (4 players)
- **4 sessions**:
  - Day 1 AM: Morning Fourballs (2 matches, 2 points)
  - Day 1 PM: Afternoon Singles (4 matches, 4 points)
  - Day 2 AM: Morning Foursomes (2 matches, 2 points)
  - Day 2 PM: Championship Singles (4 matches, 6 points @ 1.5 each)
- **Total: 14 points available**, 7.5 to win

## Architecture Overview

### Pattern: MVVM with SwiftData
The app uses a clean MVVM architecture with SwiftData for persistence:

```
GolfTripApp/
├── GolfTripApp.swift          # App entry point, ModelContainer setup
├── Models/                     # SwiftData @Model entities (19 models)
│   ├── Player.swift
│   ├── Course.swift
│   ├── TeeSet.swift
│   ├── Trip.swift
│   ├── ScheduleDay.swift
│   ├── ScheduleItem.swift
│   ├── Team.swift
│   ├── TeamMember.swift
│   ├── RyderCupSession.swift   # NEW: Session management
│   ├── Match.swift             # NEW: Match play matches
│   ├── HoleResult.swift        # NEW: Per-hole match results
│   ├── BanterPost.swift        # NEW: Social feed
│   ├── TripPhoto.swift         # NEW: Photo albums
│   └── ...
├── Views/                      # SwiftUI views organized by feature
│   ├── ContentView.swift       # Main tab navigation
│   ├── Home/                   # Trip Command Center
│   ├── Matchups/               # Session & pairing management
│   ├── Score/                  # Match play scoring
│   ├── Standings/              # Live standings
│   ├── Teams/                  # Team management
│   ├── More/                   # Banter, photos, settings
│   └── ...
├── Services/
│   ├── HandicapCalculator.swift   # USGA handicap logic
│   ├── TournamentEngine.swift     # NEW: Pairings, points, rules
│   ├── ScoringEngine.swift        # NEW: Match play state machine
│   ├── CourseWizardValidator.swift
│   └── SeedDataService.swift
├── Extensions/
│   ├── DesignSystem.swift         # NEW: Design tokens & components
│   └── Color+Hex.swift
└── Docs/
    ├── UX-Spec.md                 # NEW: Full UX specification
    └── DesignSystem.md            # NEW: Design system documentation
```

### Data Model
```
Player ──┬── TeamMember ──── Team ──── Trip
         │                              │
         └── GroupPlayer ── Group ── ScheduleItem ── ScheduleDay
                                     │
                                     └── Scorecard ── HoleScore
                                              │
                                              └── Format

Trip ──┬── RyderCupSession ──── Match ──── HoleResult
       │
       ├── BanterPost
       └── TripPhoto
```

### Offline-First
- All data persisted locally with SwiftData
- No network dependency for MVP
- Designed for future iCloud sync (seams in place)

## Handicap Logic

### Location
`GolfTripApp/Services/HandicapCalculator.swift`

### Course Handicap Formula
```swift
CourseHandicap = round(HandicapIndex × (Slope ÷ 113) + (CourseRating - Par))
```

### Strokes Allocation
- Each hole gets `floor(CourseHandicap / 18)` base strokes
- Extra strokes (`CourseHandicap % 18`) go to hardest holes
- Hardest holes = lowest hole handicap numbers (1 is hardest)
- Negative handicaps (plus-handicaps): subtract strokes from hardest holes

### Stableford Points (Net)
| Net Score vs Par | Points |
|------------------|--------|
| Albatross or better | 5 |
| Eagle | 4 |
| Birdie | 3 |
| Par | 2 |
| Bogey | 1 |
| Double+ | 0 |

### Testing
Unit tests in `Tests/`:
- **HandicapCalculatorTests.swift**: Course handicap, strokes allocation, Stableford
- **CourseWizardValidatorTests.swift**: Validation and parsing
- **ScoringEngineTests.swift**: Match play state machine, undo manager
- **TournamentEngineTests.swift**: Handicap allowances, draft order

## Scoring Engine

### Match Play State Machine
```swift
// Calculate current match state
let state = ScoringEngine.calculateMatchState(holeResults: results)
// Returns: matchScore, holesPlayed, isDormie, isClosedOut, statusText
```

**States:**
- All Square
- Team A/B X UP through Y
- Dormie (X up with X to play)
- Closed Out (X&Y format)
- Final (X UP or Halved)

### Undo System
- 5-step undo history
- Records previous hole state
- Restores on undo

## Tournament Engine

### Handicap Allowances
```swift
// Singles: 100% difference
TournamentEngine.singlesStrokes(playerA: 18, playerB: 10)
// Returns: (8, 0) - Player A gets 8 strokes

// Fourball: 90% off lowest
TournamentEngine.fourballStrokes(teamA: [15, 10], teamB: [18, 12])
// Returns strokes for each player relative to lowest

// Foursomes: 50% combined
TournamentEngine.foursomesStrokes(teamA: [15, 10], teamB: [18, 8])
// Returns team strokes based on combined handicaps
```

### Pairing Validation
- Checks player counts per match
- Warns on duplicate players in session
- Calculates "fairness score" (0-100)

## Design System

See `/Docs/DesignSystem.md` for full specification:

### Color Tokens
- **Team USA**: #1565C0 (blue)
- **Team Europe**: #C62828 (red)
- **Primary**: Green with gold accents
- **Dark mode first** for premium feel

### Typography
- Score fonts: 72pt hero, 48pt large, 32pt medium (monospace)
- System SF Pro for body text
- Full Dynamic Type support

### Components
- BigScoreDisplay
- MatchStatusBadge
- HoleIndicatorDots
- AvatarView
- EmptyStateView

## Product Backlog (Future Features)

### High Priority
- [x] ~~Ryder Cup session scoring (match play format)~~
- [ ] Skins game tracking
- [ ] Nassau (front/back/total) betting
- [ ] Side games (closest to pin, long drive)

### Medium Priority
- [ ] iCloud sync across devices
- [ ] Live sharing (multiple phones scoring same round)
- [ ] Import handicaps from GHIN API
- [ ] Draft board (captain picks in real time)

### Lower Priority
- [ ] Push notifications for tee times
- [ ] PDF export / share leaderboard screenshot
- [ ] Apple Watch companion for quick scoring
- [ ] Live Activities for lock screen
- [ ] Widgets for standings
- [ ] Betting/side games ledger

## License

MIT License - Free to use and modify
