# Golf Ryder Cup App — Feature Map

> **Document Version**: 1.0
> **Last Updated**: January 2026
> **Purpose**: Comprehensive mapping of all user-facing features, routes, and components

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Route Feature Matrix](#route-feature-matrix)
3. [Core Routes](#core-routes)
4. [Captain Routes](#captain-routes)
5. [Social & Community Routes](#social--community-routes)
6. [Trip Management Routes](#trip-management-routes)
7. [Scoring Routes](#scoring-routes)
8. [Settings & Profile Routes](#settings--profile-routes)
9. [State Management](#state-management)
10. [Reusable Components](#reusable-components)
11. [Authentication Flow](#authentication-flow)

---

## Application Overview

The Golf Ryder Cup App is a comprehensive golf trip management platform designed for Ryder Cup-style tournaments. It features:

- **Team-based competition** with USA vs Europe format
- **Real-time match scoring** with swipe gestures
- **Captain command center** for trip organization
- **Social features** for trash talk and photo sharing
- **Offline-first architecture** using Dexie.js (IndexedDB)
- **PWA capabilities** for mobile-native experience

### Design Philosophy

- Tournament names in warm serif typography
- Scores are monumental, owning the screen
- Masters-inspired green color palette
- Quick access to all features
- Premium, editorial design aesthetic

---

## Route Feature Matrix

| Route | Auth Required | Captain Mode | Offline Support | PWA Optimized |
|-------|---------------|--------------|-----------------|---------------|
| `/` (Home) | No | Toggle | ✅ | ✅ |
| `/login` | No | — | ❌ | ✅ |
| `/profile/create` | No | — | ❌ | ✅ |
| `/profile` | Yes | — | ✅ | ✅ |
| `/achievements` | Yes | — | ✅ | ✅ |
| `/bets` | Yes | — | ✅ | ✅ |
| `/captain/*` | Yes | Required | ✅ | ✅ |
| `/courses` | No | — | ✅ | ✅ |
| `/lineup/*` | Yes | Required | ✅ | ✅ |
| `/live` | Yes | — | ✅ | ✅ |
| `/matchups` | Yes | Toggle | ✅ | ✅ |
| `/more` | No | Toggle | ✅ | ✅ |
| `/players` | Yes | Toggle | ✅ | ✅ |
| `/schedule` | Yes | — | ✅ | ✅ |
| `/score/*` | Yes | — | ✅ | ✅ |
| `/settings/*` | No | — | ✅ | ✅ |
| `/social/*` | Yes | — | ✅ | ✅ |
| `/standings` | Yes | — | ✅ | ✅ |
| `/trip/*` | Yes | Toggle | ✅ | ✅ |
| `/trip-stats/*` | Yes | — | ✅ | ✅ |

---

## Core Routes

### `/` — Home Page (Dashboard)

**Purpose**: The ultimate golf trip dashboard providing quick access to all features and showing live tournament status.

| Aspect | Details |
|--------|---------|
| **Route** | `/` |
| **Auth Required** | No (enhanced for authenticated users) |
| **File** | `src/app/page.tsx` |

#### Key UI Elements

- Live match banner (when matches in progress)
- Team standings hero (monumental score display)
- "Your Match" card for current user
- Quick Start Wizard (for empty state)
- Feature cards grid (Live TV, Trip Stats, Social)
- Weather widget
- Captain mode toggle
- Bottom navigation bar

#### User Actions (CTAs)

- View live scores
- Access current user's match
- Toggle captain mode
- Navigate to all major features
- Start new trip (empty state)
- Load demo data

#### Data Dependencies

- `useTripStore`: currentTrip, players, teams, sessions
- `useAuthStore`: currentUser, isAuthenticated
- `useUIStore`: isCaptainMode
- `db.trips`: Local trip data
- `calculateTeamStandings()`: Live standings

#### States

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton loaders for trip data |
| **Empty** | QuickStartWizard with trip templates |
| **Error** | Error boundary with retry |
| **Live Match** | LiveMatchBanner prominently displayed |

---

### `/login` — Login Page

**Purpose**: Authentication entry point for returning users.

| Aspect | Details |
|--------|---------|
| **Route** | `/login` |
| **Auth Required** | No (redirects if authenticated) |
| **File** | `src/app/login/page.tsx` |

#### Key UI Elements

- Golf ball illustration header
- Email input with icon
- 4-digit PIN input (masked)
- Show/hide PIN toggle
- Sign In / New Account tabs
- Error messages display

#### User Actions (CTAs)

- Enter email and PIN
- Submit login form
- Navigate to profile creation
- Toggle PIN visibility

#### Data Dependencies

- `useAuthStore`: login, isAuthenticated, error, clearError

#### States

| State | Behavior |
|-------|----------|
| **Default** | Login form displayed |
| **Submitting** | Button loading state |
| **Error** | Error message below inputs |
| **Success** | Redirect to home |

---

### `/matchups` — Team Rosters & Sessions

**Purpose**: Display team compositions and session schedule.

| Aspect | Details |
|--------|---------|
| **Route** | `/matchups` |
| **Auth Required** | Yes (redirects to `/` if no trip) |
| **File** | `src/app/matchups/page.tsx` |

#### Key UI Elements

- Team rosters in two columns (USA vs Europe)
- Team badges with color identity
- Player names with handicap display
- Session list with navigation arrows
- Captain mode: "Manage Players" button

#### User Actions (CTAs)

- View team compositions
- Navigate to sessions
- Manage players (captain mode)
- Create new lineup (captain mode)

#### Data Dependencies

- `useTripStore`: currentTrip, sessions, teams, players, teamMembers
- `useUIStore`: isCaptainMode

#### States

| State | Behavior |
|-------|----------|
| **Empty Teams** | "No players" message per team |
| **No Sessions** | `NoSessionsPremiumEmpty` component |
| **Loading** | Skeleton loaders |

---

### `/players` — Player Management

**Purpose**: Add, edit, and assign players to teams.

| Aspect | Details |
|--------|---------|
| **Route** | `/players` |
| **Auth Required** | Yes |
| **File** | `src/app/players/page.tsx` |

#### Key UI Elements

- Player count in header
- Team sections (USA, Europe, Unassigned)
- Player rows with name, handicap
- Add player button (captain mode)
- Edit/Delete actions per player
- Add/Edit modal form

#### User Actions (CTAs)

- Add new player
- Edit player details
- Delete player
- Assign player to team
- Remove from team

#### Data Dependencies

- `useTripStore`: players, teams, teamMembers, addPlayer, updatePlayer, removePlayer
- `useUIStore`: isCaptainMode, showToast

#### States

| State | Behavior |
|-------|----------|
| **Empty** | `NoPlayersPremiumEmpty` component |
| **Edit Mode** | Modal with form |
| **Delete Confirm** | Confirmation dialog |

---

### `/standings` — Tournament Leaderboard

**Purpose**: Display team standings and individual player leaderboard.

| Aspect | Details |
|--------|---------|
| **Route** | `/standings` |
| **Auth Required** | Yes |
| **File** | `src/app/standings/page.tsx` |

#### Key UI Elements

- Hero score display (monumental typography)
- Team score comparison blocks
- Points to win indicator
- Magic number display
- Victory banner (when clinched)
- Individual player leaderboard
- Match record breakdown

#### User Actions (CTAs)

- View team standings
- View individual stats
- See magic number to clinch

#### Data Dependencies

- `useTripStore`: currentTrip, teams
- `calculateTeamStandings()`: Team points
- `calculateMagicNumber()`: Clinch calculation
- `calculatePlayerLeaderboard()`: Individual rankings

#### States

| State | Behavior |
|-------|----------|
| **Loading** | LoadingState skeleton |
| **Empty** | `NoStandingsPremiumEmpty` |
| **Victory** | Victory banner shown |

---

### `/live` — Jumbotron View

**Purpose**: TV-optimized view for displaying all matches in real-time, perfect for clubhouse display.

| Aspect | Details |
|--------|---------|
| **Route** | `/live` |
| **Auth Required** | Yes |
| **File** | `src/app/live/page.tsx` |

#### Key UI Elements

- Session name header
- Last updated timestamp
- Fullscreen toggle
- Sound toggle
- Refresh button
- Match grid (responsive 1-3 columns)
- Live match cards with scores

#### User Actions (CTAs)

- Toggle fullscreen mode
- Toggle sound
- Refresh scores
- Auto-refresh (30 second interval)

#### Data Dependencies

- `useTripStore`: currentTrip, players, getActiveSession
- `useScoringStore`: matchStates, loadSessionMatches
- `db.matches`: Match data

#### States

| State | Behavior |
|-------|----------|
| **No Matches** | "No live matches" empty state |
| **Active** | Auto-refreshing match grid |
| **Fullscreen** | Browser fullscreen mode |

---

### `/bets` — Side Bets & Games

**Purpose**: Track skins, nassaus, closest to pin, long drive, and custom side bets.

| Aspect | Details |
|--------|---------|
| **Route** | `/bets` |
| **Auth Required** | Yes |
| **File** | `src/app/bets/page.tsx` |

#### Key UI Elements

- Total pot summary card
- Active/Completed tabs
- Bet cards with type icon
- Quick create buttons by type
- Participant avatars
- Winner crown indicator

#### User Actions (CTAs)

- Create new bet (by type)
- View bet details
- Switch active/completed view
- Mark bet complete

#### Data Dependencies

- `useTripStore`: currentTrip, players
- `db.sideBets`: Side bet records

#### States

| State | Behavior |
|-------|----------|
| **Empty** | `NoBetsEmpty` component |
| **Active Tab** | Shows in-progress bets |
| **Completed Tab** | Shows settled bets |

---

### `/achievements` — Awards & Badges

**Purpose**: Track trip achievements, unlock badges, and celebrate memorable moments.

| Aspect | Details |
|--------|---------|
| **Route** | `/achievements` |
| **Auth Required** | Yes |
| **File** | `src/app/achievements/page.tsx` |

#### Key UI Elements

- Category filter tabs (All, Unlocked, Locked)
- Achievement cards with icons
- Rarity indicators (common, rare, epic, legendary)
- Progress bars for in-progress achievements
- Lock/unlock visual states
- Unlock timestamps

#### User Actions (CTAs)

- Filter by category
- View achievement details
- Track progress

#### Data Dependencies

- `useTripStore`: currentTrip
- `calculatePlayerStats()`: Real player statistics

#### States

| State | Behavior |
|-------|----------|
| **Empty** | No achievements message |
| **Unlocked** | Highlighted with timestamp |
| **In Progress** | Progress bar shown |
| **Locked** | Grayed out with lock icon |

---

### `/more` — Settings & Data

**Purpose**: Access to settings, data management, captain mode, and user account.

| Aspect | Details |
|--------|---------|
| **Route** | `/more` |
| **Auth Required** | No |
| **File** | `src/app/more/page.tsx` |

#### Key UI Elements

- Account section (login/profile links)
- Current trip info with exit option
- Captain mode toggle with PIN
- Theme selector (light/dark/auto)
- Scoring preferences toggles
- Data management (seed/clear demo)
- Trip Stats link

#### User Actions (CTAs)

- Sign in / Create profile
- Exit current trip
- Enable/disable captain mode (PIN protected)
- Change theme
- Toggle scoring preferences (haptics, celebrations)
- Load demo data
- Clear all data

#### Data Dependencies

- `useTripStore`: currentTrip, loadTrip, clearTrip
- `useAuthStore`: currentUser, isAuthenticated
- `useUIStore`: isCaptainMode, theme, scoringPreferences

#### States

| State | Behavior |
|-------|----------|
| **Logged Out** | Sign In / Create Profile links |
| **Logged In** | Profile card shown |
| **Captain Mode** | PIN entry modal |

---

### `/schedule` — Personal & Trip Schedule

**Purpose**: Display user's personal tee times and overall trip schedule by day.

| Aspect | Details |
|--------|---------|
| **Route** | `/schedule` |
| **Auth Required** | Yes |
| **File** | `src/app/schedule/page.tsx` |

#### Key UI Elements

- My Schedule / All tab switcher
- Day headers with date
- Session headers with time slots
- Tee time entries with match details
- User's match highlighting
- Estimated tee times

#### User Actions (CTAs)

- Switch between personal/all view
- Navigate to match details
- View session information

#### Data Dependencies

- `useTripStore`: currentTrip, sessions, players
- `useAuthStore`: currentUser, isAuthenticated
- `db.matches`: Match data

#### States

| State | Behavior |
|-------|----------|
| **Loading** | Skeleton loaders |
| **Empty** | No schedule message |
| **Personal Tab** | Only user's matches |
| **All Tab** | Complete schedule |

---

## Captain Routes

> **Note**: All captain routes require authentication AND captain mode enabled.

### `/captain` — Command Center

**Purpose**: Central hub for all captain operations with trip status overview and quick actions.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/page.tsx` |

#### Key UI Elements

- Trip readiness percentage gauge
- Readiness checklist items
- Quick actions grid (expandable)
- Session overview cards
- Unassigned players alert
- Team balance indicator

#### Quick Actions Grid

| Action | Description | Link |
|--------|-------------|------|
| Create Lineup | Build match pairings | `/lineup/new` |
| Manage Trip | Edit matches & strokes | `/captain/manage` |
| Pre-Flight | Review checklist | `/captain/checklist` |
| Messages | Send announcements | `/captain/messages` |
| Side Bets | Create & manage bets | `/captain/bets` |
| Attendance | Track player arrivals | `/captain/availability` |
| Team Draft | Assign players to teams | `/captain/draft` |
| Invitations | Manage trip invites | `/captain/invites` |
| Cart Assignments | Assign golf carts | `/captain/carts` |
| Contacts | Emergency & venue | `/captain/contacts` |

#### Data Dependencies

- `useTripStore`: currentTrip, sessions, teams, players, teamMembers
- `useUIStore`: isCaptainMode

---

### `/captain/availability` — Attendance Tracking

**Purpose**: Track player arrivals and manage attendance before rounds.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/availability` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/availability/page.tsx` |

#### Key UI Elements

- Session selector dropdown
- Attendance status list per player
- Check-in buttons (Checked In, En Route, Not Arrived, No Show)
- ETA input field
- Call/Text quick actions
- Refresh button

#### User Actions (CTAs)

- Select session
- Update player status
- Set ETA for en-route players
- Call or text player
- Refresh attendance data

#### Data Dependencies

- `useTripStore`: currentTrip, sessions, teams, players, teamMembers
- `useUIStore`: isCaptainMode, showToast

---

### `/captain/bets` — Side Bets Management

**Purpose**: Create and manage side bets with detailed configuration.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/bets` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/bets/page.tsx` |

#### Key UI Elements

- Bet type selector cards (Skins, CTP, Long Drive, Nassau, Custom)
- Create bet modal/form
- Active bets list
- Completed bets list
- Participant selection checkboxes
- Pot amount input
- Winner selection

#### User Actions (CTAs)

- Create new bet by type
- Edit existing bet
- Delete bet
- Select participants
- Set pot amount
- Declare winner
- Complete/settle bet

---

### `/captain/carts` — Cart Assignments

**Purpose**: Assign golf carts to players for each session.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/carts` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/carts/page.tsx` |

#### Key UI Elements

- Cart assignment manager component
- Player list by team
- Cart number inputs
- Drag-and-drop pairing (optional)
- Team color indicators

#### User Actions (CTAs)

- Assign players to carts
- Pair compatible players
- Save assignments

---

### `/captain/checklist` — Pre-Flight Checklist

**Purpose**: Comprehensive validation of trip setup before starting play.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/checklist` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/checklist/page.tsx` |

#### Key UI Elements

- PreFlightChecklist component
- Check items with status icons
- Quick fix links
- All Clear button
- Progress indicator

#### Checklist Items

- Players added (minimum count)
- Teams balanced
- Sessions created
- Courses configured
- Tee sets assigned
- Matches generated

---

### `/captain/contacts` — Emergency Contacts

**Purpose**: Emergency contacts and venue information for the trip.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/contacts` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/contacts/page.tsx` |

#### Key UI Elements

- Player contact list
- Venue contacts section
- Call/text buttons
- Contact cards with role

---

### `/captain/draft` — Team Draft

**Purpose**: Assign players to teams using various draft methods.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/draft` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/draft/page.tsx` |

#### Key UI Elements

- DraftBoard component
- Draft method selector (Snake, Random, Auto-Balance)
- Unassigned players pool
- Team columns
- Pick order indicator
- Handicap display

#### User Actions (CTAs)

- Select draft method
- Pick players in order
- Random assignment
- Auto-balance by handicap
- Complete draft

---

### `/captain/invites` — Invitation Management

**Purpose**: Manage trip invitations via QR codes and invite links.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/invites` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/invites/page.tsx` |

#### Key UI Elements

- QR code display
- Share code text
- Copy link button
- Share button (native share)
- Invitation list
- Revoke invite option

---

### `/captain/manage` — Trip Management

**Purpose**: Comprehensive trip management for editing sessions, matches, and player data.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/manage` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/manage/page.tsx` |

#### Key UI Elements

- Expandable session cards
- Match list per session
- Edit match modal
- Edit player handicap
- Delete match confirmation
- Status indicators (scheduled, in progress, completed)
- Stroke adjustments

#### User Actions (CTAs)

- Expand/collapse sessions
- Edit session details
- Edit match pairings
- Update player handicaps
- Delete matches
- Change match status

---

### `/captain/messages` — Announcements

**Purpose**: Send announcements and messages to trip participants.

| Aspect | Details |
|--------|---------|
| **Route** | `/captain/messages` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/captain/messages/page.tsx` |

#### Key UI Elements

- AnnouncementComposer component
- AnnouncementHistory list
- Message type selector
- Priority toggle
- Recipient count display
- Send confirmation

---

### `/captain/settings` — Captain Settings

**Purpose**: Captain-specific settings (if implemented).

---

## Scoring Routes

### `/score` — Match List

**Purpose**: View and select matches for scoring.

| Aspect | Details |
|--------|---------|
| **Route** | `/score` |
| **Auth Required** | Yes |
| **File** | `src/app/score/page.tsx` |

#### Key UI Elements

- Session header with status
- Session selector tabs
- Match rows with teams
- Score status indicators
- Current user's match highlight
- Match status (scheduled, in progress, complete)

#### User Actions (CTAs)

- Select session
- Navigate to match scoring
- View match status

#### Data Dependencies

- `useTripStore`: currentTrip, sessions, players
- `useScoringStore`: selectMatch
- `useAuthStore`: currentUser
- `calculateMatchState()`: Live match states

---

### `/score/[matchId]` — Match Scoring

**Purpose**: World-class scoring experience for individual matches.

| Aspect | Details |
|--------|---------|
| **Route** | `/score/[matchId]` |
| **Auth Required** | Yes |
| **File** | `src/app/score/[matchId]/page.tsx` |

#### Key UI Elements

- SwipeScorePanel (swipe gestures)
- HoleMiniMap (visual navigation)
- Score celebration animations
- Handicap stroke indicators
- Stroke alert banners
- Press tracker
- Undo banner
- Voice scoring button
- Quick photo capture
- Side bet reminders
- Weather alerts

#### User Actions (CTAs)

- Swipe to score holes (Team A/B wins, Halved)
- Navigate holes (prev/next, mini-map tap)
- Undo last score
- Voice score input
- Capture photos
- View handicap strokes
- Track presses

#### Data Dependencies

- `useScoringStore`: activeMatch, scoreHole, undoLastHole, goToHole
- `useTripStore`: players, teams, teeSets
- `useUIStore`: scoringPreferences
- `useMatchState()`: Live reactive updates

#### States

| State | Behavior |
|-------|----------|
| **Loading** | Match loading skeleton |
| **Scoring** | Active scoring interface |
| **Celebration** | Animated celebration overlay |
| **Match Complete** | Final score summary |

---

## Social & Community Routes

### `/social` — Trash Talk & Banter

**Purpose**: Social hub for trash talk, celebrations, and team banter.

| Aspect | Details |
|--------|---------|
| **Route** | `/social` |
| **Auth Required** | Yes |
| **File** | `src/app/social/page.tsx` |

#### Key UI Elements

- Tab bar (All, Photos, Highlights)
- Message feed (reverse chronological)
- Post cards with author avatar
- Quick reaction emoji buttons
- Message input with emoji picker
- Photos link button

#### User Actions (CTAs)

- Post message
- Add emoji reaction
- Navigate to photos
- View highlights

---

### `/social/photos` — Trip Photo Gallery

**Purpose**: Capture and share memories from the golf trip.

| Aspect | Details |
|--------|---------|
| **Route** | `/social/photos` |
| **Auth Required** | Yes |
| **File** | `src/app/social/photos/page.tsx` |

#### Key UI Elements

- Photo grid (grid/masonry toggle)
- Photo upload button
- Photo viewer modal
- Like count and button
- Caption display
- Download/share buttons

---

## Trip Management Routes

### `/trip/new` — Create New Trip

**Purpose**: Create a new golf trip using templates.

| Aspect | Details |
|--------|---------|
| **Route** | `/trip/new` |
| **Auth Required** | Yes |
| **File** | `src/app/trip/new/page.tsx` |

#### Key UI Elements

- Template selector cards
- Trip configuration form
- Team name inputs
- Date picker
- Location input
- Preview step
- Create button

#### Templates Available

| Template | Description |
|----------|-------------|
| Classic Ryder Cup | Full tournament format |
| Weekend Warrior | Condensed weekend format |
| Singles Showdown | 1v1 matches only |
| Partners Paradise | Team formats only |
| 9-Hole Popup | Quick play format |
| Custom | Build your own |

---

### `/trip/[tripId]/awards` — Trip Awards

**Purpose**: End-of-trip awards ceremony display.

---

### `/trip/[tripId]/settings` — Trip Settings

**Purpose**: Edit trip-specific settings.

---

### `/trip-stats` — Fun Trip Statistics

**Purpose**: Track fun statistics beyond golf scores (beverages, mishaps, cart chaos).

| Aspect | Details |
|--------|---------|
| **Route** | `/trip-stats` |
| **Auth Required** | Yes |
| **File** | `src/app/trip-stats/page.tsx` |

#### Key UI Elements

- Category tabs (beverages, mishaps, highlights, cart chaos, social, money)
- Stat cards with emoji icons
- Player increment/decrement buttons
- Quick track buttons
- Leader indicators
- Total counts

#### Categories

| Category | Example Stats |
|----------|---------------|
| Beverages | Beers, shots, water bottles |
| Golf Mishaps | Balls lost, mulligans, water hazards |
| Golf Highlights | Birdies, eagles, chip-ins |
| Cart Chaos | Near misses, stuck carts |
| Social | Jokes told, helpful acts |
| Money | Side bet winnings |

---

### `/trip-stats/awards` — Trip Awards Ceremony

**Purpose**: Vote for fun superlatives (MVP, best dressed, party animal).

| Aspect | Details |
|--------|---------|
| **Route** | `/trip-stats/awards` |
| **Auth Required** | Yes |
| **File** | `src/app/trip-stats/awards/page.tsx` |

#### Key UI Elements

- Award cards with emoji
- Suggested winner indication
- Player voting buttons
- Winner highlight

---

## Lineup & Session Routes

### `/lineup/new` — Create Session/Lineup

**Purpose**: Create new sessions and build match lineups.

| Aspect | Details |
|--------|---------|
| **Route** | `/lineup/new` |
| **Auth Required** | Yes + Captain Mode |
| **File** | `src/app/lineup/new/page.tsx` |

#### Key UI Elements

- Format category tabs (Match Play, Side Games, Individual)
- Format option cards
- Session configuration form
- LineupBuilder component
- Fairness score indicator
- Match slots grid
- Player drag-and-drop

#### Formats Supported

| Category | Formats |
|----------|---------|
| Match Play | Foursomes, Fourball, Singles |
| Side Games | Skins, Nassau |
| Individual | Stableford, Scramble |

---

### `/lineup/[sessionId]` — Edit Session Lineup

**Purpose**: Edit existing session lineup.

---

## Course Routes

### `/courses` — Course Library

**Purpose**: Manage golf course profiles and tee sets.

| Aspect | Details |
|--------|---------|
| **Route** | `/courses` |
| **Auth Required** | No |
| **File** | `src/app/courses/page.tsx` |

#### Key UI Elements

- Search input
- Course cards with tee sets
- Delete confirmation
- Database search button (if API configured)
- Scorecard upload button
- Add course button

#### User Actions (CTAs)

- Search courses
- Add new course
- Search external database
- Upload scorecard (OCR)
- Delete course

---

### `/courses/new` — Add New Course

**Purpose**: Create new course profile with manual or OCR entry.

| Aspect | Details |
|--------|---------|
| **Route** | `/courses/new` |
| **Auth Required** | No |
| **File** | `src/app/courses/new/page.tsx` |

#### Key UI Elements

- Course name/location form
- Tee set editor (multiple)
- Tee color picker
- Rating/slope inputs
- HoleDataEditor (18 holes)
- Scorecard upload (OCR)
- Save button

---

## Settings & Profile Routes

### `/settings` — Settings Hub

**Purpose**: Central hub for all app settings.

| Aspect | Details |
|--------|---------|
| **Route** | `/settings` |
| **Auth Required** | No |
| **File** | `src/app/settings/page.tsx` |

#### Settings Items

| Setting | Description |
|---------|-------------|
| Scoring Rules | Configure match play scoring |
| Theme & Display | Dark mode, outdoor mode |
| Notifications | Push notification preferences |
| Data & Storage | Manage offline data |
| About | App version and info |

---

### `/settings/scoring` — Scoring Settings

**Purpose**: Configure scoring rules and preferences.

---

### `/profile` — User Profile

**Purpose**: View and edit user profile.

| Aspect | Details |
|--------|---------|
| **Route** | `/profile` |
| **Auth Required** | Yes |
| **File** | `src/app/profile/page.tsx` |

#### Key UI Elements

- Profile header card with avatar
- Handicap badge
- Editable form fields
- Section cards (Basic Info, Golf Info)
- Logout button

#### User Actions (CTAs)

- Edit profile fields
- Update handicap
- Change avatar
- Logout

---

### `/profile/create` — Create Profile

**Purpose**: Multi-step profile creation wizard for new users.

| Aspect | Details |
|--------|---------|
| **Route** | `/profile/create` |
| **Auth Required** | No |
| **File** | `src/app/profile/create/page.tsx` |

#### Steps

| Step | Fields |
|------|--------|
| 1. Basic Info | First name, last name, nickname, email, phone |
| 2. Golf Info | Handicap, GHIN, home course, preferred tees |
| 3. Trip Info | Shirt size, dietary restrictions, emergency contact |

---

## State Management

### Stores Overview

The app uses **Zustand** for state management with persistence.

#### `useTripStore`

**Purpose**: Manages current trip context

| State | Type | Description |
|-------|------|-------------|
| `currentTrip` | `Trip \| null` | Active trip |
| `teams` | `Team[]` | USA/Europe teams |
| `teamMembers` | `TeamMember[]` | Player-team assignments |
| `players` | `Player[]` | All players |
| `sessions` | `RyderCupSession[]` | Match sessions |
| `courses` | `Course[]` | Golf courses |
| `teeSets` | `TeeSet[]` | Tee set configurations |

**Key Actions**: `loadTrip`, `createTrip`, `addPlayer`, `assignPlayerToTeam`, `addSession`

---

#### `useScoringStore`

**Purpose**: Active scoring session state

| State | Type | Description |
|-------|------|-------------|
| `activeMatch` | `Match \| null` | Current match being scored |
| `activeMatchState` | `MatchState \| null` | Computed match state |
| `currentHole` | `number` | Current hole (1-18) |
| `undoStack` | `Array` | Undo history |
| `matchStates` | `Map<string, MatchState>` | All match states |

**Key Actions**: `selectMatch`, `scoreHole`, `undoLastHole`, `goToHole`, `nextHole`, `prevHole`

---

#### `useUIStore`

**Purpose**: UI preferences and transient state

| State | Type | Description |
|-------|------|-------------|
| `isCaptainMode` | `boolean` | Captain mode toggle |
| `theme` | `'light' \| 'dark' \| 'auto'` | Color theme |
| `scoringPreferences` | `object` | Haptics, celebrations, etc. |

**Key Actions**: `enableCaptainMode`, `disableCaptainMode`, `setTheme`, `showToast`

---

#### `useAuthStore`

**Purpose**: Authentication and user profile

| State | Type | Description |
|-------|------|-------------|
| `currentUser` | `UserProfile \| null` | Logged in user |
| `isAuthenticated` | `boolean` | Auth status |
| `isLoading` | `boolean` | Auth loading state |

**Key Actions**: `login`, `logout`, `createProfile`, `updateProfile`

---

## Reusable Components

### UI Components (`/components/ui`)

| Component | Purpose |
|-----------|---------|
| `Button` | Standard button variants |
| `Card` | Content container cards |
| `Modal` | Dialog/modal overlays |
| `Toast` | Notification toasts |
| `Badge` | Status badges |
| `Input` | Form inputs |
| `Tabs` | Tab navigation |
| `Skeleton` | Loading skeletons |
| `EmptyState` | Empty state illustrations |
| `LiveMatchBanner` | Live match notification |
| `YourMatchCard` | User's current match card |
| `CaptainToggle` | Captain mode toggle |
| `QuickStartWizard` | New user onboarding |
| `WhatsNew` | Feature announcements |
| `SuccessConfetti` | Celebration animation |
| `VictoryModal` | Match victory celebration |

---

### Captain Components (`/components/captain`)

| Component | Purpose |
|-----------|---------|
| `LineupBuilder` | Drag-drop lineup creation |
| `DraftBoard` | Team draft interface |
| `AttendanceCheckIn` | Player check-in UI |
| `PreFlightChecklist` | Trip validation checklist |
| `AnnouncementComposer` | Message composer |
| `AnnouncementHistory` | Message history list |
| `CartAssignmentManager` | Cart pairing UI |
| `EmergencyContacts` | Contact list display |
| `InvitationManager` | QR/link invite management |
| `FairnessScoring` | Lineup fairness calculator |

---

### Scoring Components (`/components/scoring`)

| Component | Purpose |
|-----------|---------|
| `SwipeScorePanel` | Swipe gesture scoring |
| `HoleMiniMap` | Visual hole navigation |
| `ScoreCelebration` | Animated celebrations |
| `HandicapStrokeIndicator` | Stroke display |
| `StrokeAlertBanner` | Stroke notifications |
| `PressTracker` | Nassau press tracking |
| `MatchScorecard` | Full scorecard display |

---

### Layout Components (`/components/layout`)

| Component | Purpose |
|-----------|---------|
| `BottomNav` | Bottom navigation bar |
| `AppShell` | Page layout wrapper |

---

### Live Play Components (`/components/live-play`)

| Component | Purpose |
|-----------|---------|
| `VoiceScoring` | Voice input for scoring |
| `QuickPhotoCapture` | In-round photo capture |
| `SideBetReminder` | Side bet alerts |
| `WeatherAlerts` | Weather notifications |
| `StickyUndoBanner` | Undo action banner |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Opens App                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Check Auth Status    │
              │   (useAuthStore)       │
              └────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
   ┌─────────────────┐          ┌─────────────────┐
   │  Authenticated  │          │ Not Authenticated│
   └─────────────────┘          └─────────────────┘
            │                             │
            ▼                             ▼
   ┌─────────────────┐          ┌─────────────────┐
   │  Home Dashboard │          │  Home (Limited) │
   │  (Full Access)  │          │  or /login      │
   └─────────────────┘          └─────────────────┘
                                          │
                    ┌─────────────────────┴────────────────────┐
                    │                                          │
                    ▼                                          ▼
           ┌─────────────────┐                       ┌─────────────────┐
           │    /login       │                       │ /profile/create │
           │ (Email + PIN)   │                       │ (3-step wizard) │
           └─────────────────┘                       └─────────────────┘
                    │                                          │
                    └─────────────────────┬────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────┐
                               │   Authenticated │
                               │   Redirect to / │
                               └─────────────────┘
```

---

## Captain Mode Flow

```
┌─────────────────────────────────────────────────────────┐
│             User on /more Page                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Tap "Captain Mode"     │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Enter 4-digit PIN     │
              │  (Creates or validates)│
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  isCaptainMode = true  │
              └────────────────────────┘
                           │
                           ▼
   ┌───────────────────────────────────────────────────┐
   │           Captain Features Unlocked               │
   │  • /captain/* routes accessible                   │
   │  • Add/Edit players button visible                │
   │  • Manage button on matchups                      │
   │  • Create lineup available                        │
   │  • Trip management tools                          │
   └───────────────────────────────────────────────────┘
```

---

## Offline Support Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Dexie.js (IndexedDB)               │
├─────────────────────────────────────────────────────────┤
│  Tables:                                                │
│  • trips          - Trip configurations                 │
│  • teams          - Team definitions                    │
│  • teamMembers    - Player-team assignments             │
│  • players        - Player profiles                     │
│  • sessions       - Ryder Cup sessions                  │
│  • matches        - Individual matches                  │
│  • holeResults    - Hole-by-hole scores                 │
│  • courses        - Course profiles                     │
│  • teeSets        - Tee set configurations              │
│  • sideBets       - Side bet records                    │
│  • banterPosts    - Social posts                        │
│  • courseProfiles - Course library                      │
│  • teeSetProfiles - Tee set library                     │
│  • tripStats      - Fun statistics                      │
│  • tripAwards     - Award voting                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   useLiveQuery()       │
              │   (Reactive updates)   │
              └────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Zustand Stores       │
              │   (Persisted state)    │
              └────────────────────────┘
```

---

## Summary

The Golf Ryder Cup App provides a comprehensive feature set for managing golf trips:

### Player Features

- Personal schedule and match tracking
- Live scoring with gestures
- Achievement tracking
- Social trash talk and photos
- Trip statistics and awards

### Captain Features

- Full trip setup and management
- Team drafting and lineup building
- Player attendance tracking
- Announcement system
- Cart assignments
- Pre-flight checklists

### Technical Highlights

- Offline-first with IndexedDB
- PWA with service worker
- Real-time reactive queries
- Optimistic updates with undo
- Premium haptic feedback
- Voice scoring support

---

*Document generated January 2026*
