# Golf Trip App

A production-grade iOS mobile app for managing golf trips, built with SwiftUI and SwiftData. The app supports player profiles with USGA Handicap Index, course management, trip scheduling, team competitions, and comprehensive scoring with leaderboards.

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

### Course Setup Wizard ✨ NEW
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
- Team color selection
- Captain designation
- Drag-to-reorder roster
- Teams reusable across multiple tee times

### Formats & Scoring
- Multiple game formats:
  - Individual Stroke Play (Gross)
  - Individual Stroke Play (Net)
  - Stableford (Net Points)
  - 2-Person Best Ball (Net)
  - 4-Person Scramble

- Scoring features:
  - Per-hole score entry with large tap targets
  - Visual strokes-received indicators (orange dots)
  - Auto-calculated totals and net scores
  - Real-time gross/net/points display
  - Full scorecard summary view

### Event Scoring Tab
- Upcoming tee times requiring scores
- In-progress scorecards
- Completed scorecards with results
- Leaderboards with aggregation options:
  - Single Event
  - Day Totals
  - Trip Totals

## How to Run

### Requirements
- macOS with Xcode 15.0+
- iOS 17.0+ deployment target
- Swift 5.9+

### Steps
1. Open `GolfTripApp/GolfTripApp.xcodeproj` in Xcode
2. Select a simulator or connected device (iOS 17+)
3. Build and run (⌘R)

The app automatically seeds sample data on first launch:
- 8 sample players with various handicaps
- 4 courses with tee sets and hole handicaps (including 1 draft example)
- A sample trip with schedule
- Two teams in Ryder Cup mode

## Architecture Overview

### Pattern: MVVM with SwiftData
The app uses a clean MVVM architecture with SwiftData for persistence:

```
GolfTripApp/
├── GolfTripApp.swift          # App entry point, ModelContainer setup
├── Models/                     # SwiftData @Model entities
│   ├── Player.swift
│   ├── Course.swift
│   ├── TeeSet.swift
│   ├── Trip.swift
│   ├── ScheduleDay.swift
│   ├── ScheduleItem.swift
│   ├── Team.swift
│   ├── TeamMember.swift
│   ├── Group.swift
│   ├── GroupPlayer.swift
│   ├── Format.swift
│   ├── Scorecard.swift
│   ├── HoleScore.swift
│   └── TeamScore.swift
├── Views/                      # SwiftUI views organized by feature
│   ├── ContentView.swift       # Main tab navigation
│   ├── Player/                 # Player CRUD views
│   ├── Course/                 # Course and TeeSet views
│   ├── Trip/                   # Trip, Schedule, Groups views
│   ├── Teams/                  # Team management views
│   ├── Scoring/                # Scorecard, entry, results views
│   └── Settings/               # Settings and data management
├── Services/
│   ├── HandicapCalculator.swift  # Core handicap logic
│   └── SeedDataService.swift     # Sample data generation
└── Extensions/
    └── Color+Hex.swift           # Hex color support
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
Unit tests in `Tests/HandicapCalculatorTests.swift`:
- Course handicap calculations (various slopes/ratings)
- Strokes allocation (0, 18, 36 handicaps, plus-handicaps)
- Stableford points for all scoring scenarios
- Best ball team calculations
- Full round integration tests

Unit tests in `Tests/CourseWizardValidatorTests.swift`:
- Hole handicap validation (missing, duplicates, out-of-range)
- Hole pars validation (total mismatch, invalid values)
- Tee set basics validation (rating, slope, par ranges)
- Paste list parsing (spaces, commas, newlines, mixed formats)
- Default par generation for different totals

## Course Setup Wizard

### Architecture
The wizard uses a state-based MVVM pattern:

```
Views/CourseWizard/
├── CourseSetupWizardView.swift    # Main container with navigation
├── CourseWizardState.swift        # Observable state manager
├── WizardSteps1And2.swift         # Basic Info + Tee Set steps
├── WizardStep3HolePars.swift      # Optional hole pars entry
├── WizardStep4HoleHandicaps.swift # Required handicap rankings
└── WizardStep5Review.swift        # Summary and save

Services/
└── CourseWizardValidator.swift    # Pure validation functions
```

### Hole Handicap Input Modes

**1. Paste List Mode**
- Accepts multiple formats: `7 15 1 11...`, `7, 15, 1, 11...`, `H1: 7 H2: 15...`
- Robust parsing handles spaces, commas, semicolons, newlines, tabs
- Shows parsed values and warnings

**2. Quick Grid Mode**
- 9-hole toggle (Front/Back)
- Direct numeric entry per hole
- Visual indicators for duplicates and invalid values

**3. Rank by Hole Mode**
- Tap-to-assign interface
- Current rank highlighted
- Auto-advances to next unassigned rank
- Undo support

### Validation Service
`CourseWizardValidator` provides pure functions (easily testable):

```swift
// Validate hole handicaps
let result = CourseWizardValidator.validateHoleHandicaps([7, 15, 1, ...])
// Returns: HoleHandicapValidationResult with missing/duplicates/outOfRange

// Parse pasted text
let parsed = CourseWizardValidator.parseHandicapList("7, 15, 1, 11...")
// Returns: ParseResult with values and warnings

// Generate default pars
let pars = CourseWizardValidator.generateTypicalPars(for: 72)
// Returns: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]
```

## Teams & Event Scoring Model

### Teams
- **Team** entity with `mode` (freeform/ryderCup)
- **TeamMember** links players to teams with captain flag
- Teams scoped to trips for reuse across events
- Ryder Cup mode validates equal roster sizes

### Event Scoring
- **Scorecard** tracks status (draft/inProgress/final)
- **HoleScore** stores per-hole strokes per player/team
- **Format** defines game type and options
- Aggregation computed at runtime from completed scorecards

## Product Backlog (Future Features)

### High Priority
- [ ] Ryder Cup session scoring (match play format)
- [ ] Skins game tracking
- [ ] Nassau (front/back/total) betting
- [ ] Side games (closest to pin, long drive)

### Medium Priority
- [ ] iCloud sync across devices
- [ ] Live sharing (multiple phones scoring same round)
- [ ] Import handicaps from GHIN API
- [ ] Team vs Team match play scoring

### Lower Priority
- [ ] Push notifications for tee times
- [ ] PDF export / share leaderboard screenshot
- [ ] Apple Watch companion for quick scoring
- [ ] Course GPS integration
- [ ] Weather integration

## License

MIT License - Free to use and modify
