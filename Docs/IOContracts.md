# Input/Output Contracts - Golf Ryder Cup App

This document comprehensively documents all input/output contracts in the Golf Ryder Cup App codebase, including form validations, API endpoints, database schemas, and type definitions.

---

## Table of Contents

1. [Form Inputs & Validation](#1-form-inputs--validation)
2. [API Endpoints](#2-api-endpoints)
3. [Supabase Database Contracts](#3-supabase-database-contracts)
4. [IndexedDB (Dexie) Contracts](#4-indexeddb-dexie-contracts)
5. [Store Interfaces](#5-store-interfaces)
6. [Type Definitions](#6-type-definitions)

---

## 1. Form Inputs & Validation

### 1.1 Profile Creation Form

**Location:** `src/app/profile/create/page.tsx`

#### Step 1: Basic Information

| Field | Type | Required | Validation | Error Message |
|-------|------|----------|------------|---------------|
| `firstName` | `string` | ✅ | Non-empty after trim | "First name is required" |
| `lastName` | `string` | ✅ | Non-empty after trim | "Last name is required" |
| `nickname` | `string` | ❌ | None | - |
| `email` | `string` | ✅ | Valid email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | "Email is required" / "Please enter a valid email" |
| `phoneNumber` | `string` | ❌ | None | - |

#### Step 2: Golf Information

| Field | Type | Required | Validation | Error Message |
|-------|------|----------|------------|---------------|
| `handicapIndex` | `string` (parsed as `number`) | ✅ | Number between -10 and 54 | "Handicap is required" / "Enter a valid handicap (-10 to 54)" |
| `ghin` | `string` | ❌ | None | - |
| `homeCourse` | `string` | ❌ | None | - |
| `preferredTees` | `'back' \| 'middle' \| 'forward' \| ''` | ❌ | Must be one of enum values | - |

#### Step 3: Trip Information

| Field | Type | Required | Validation | Error Message |
|-------|------|----------|------------|---------------|
| `shirtSize` | `'XS' \| 'S' \| 'M' \| 'L' \| 'XL' \| '2XL' \| '3XL' \| ''` | ❌ | Must be one of enum values | - |
| `dietaryRestrictions` | `string` | ❌ | None | - |
| `emergencyContactName` | `string` | ❌ | None | - |
| `emergencyContactPhone` | `string` | ❌ | None | - |
| `emergencyContactRelationship` | `string` | ❌ | None | - |

### 1.2 Login Form

**Location:** `src/app/login/page.tsx`

| Field | Type | Required | Validation | Error Message |
|-------|------|----------|------------|---------------|
| `email` | `string` | ✅ | Non-empty | "No account found with this email" |
| `pin` | `string` | ✅ | Must match stored PIN | "Invalid PIN" |

### 1.3 Side Bet Form

**Location:** `src/components/gamification/SideBets.tsx`

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `name` | `string` | ✅ | `''` | Non-empty |
| `type` | `SideBetType` | ✅ | `'skins'` | One of: `'skins' \| 'nassau' \| 'ctp' \| 'longdrive' \| 'custom'` |
| `pot` | `number` | ❌ | `0` | Number ≥ 0 |
| `description` | `string` | ❌ | `''` | None |

### 1.4 Course Creation Form

**Location:** `src/app/courses/new/page.tsx`

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | `string` | ✅ | Non-empty |
| `location` | `string` | ❌ | None |
| `rating` | `number` | ✅ | Valid decimal (e.g., 72.4) |
| `slope` | `number` | ✅ | Integer (typically 55-155) |
| `par` | `number` | ✅ | Typically 70-72 |
| `holePars` | `number[]` | ✅ | Array of 18 values, each 3-5 |
| `holeHandicaps` | `number[]` | ✅ | Array of 18 unique values 1-18 |

### 1.5 Input Component Props

**Location:** `src/components/ui/Input.tsx`

```typescript
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;        // Label text displayed above input
    hint?: string;         // Help text displayed below input
    error?: string;        // Error message (triggers error styling)
    leftIcon?: ReactNode;  // Icon on left side of input
    rightIcon?: ReactNode; // Icon on right side of input
    fullWidth?: boolean;   // Whether to take full width (default: true)
}
```

### 1.6 Validation Types

**Location:** `src/lib/types/computed.ts`

```typescript
interface ValidationError {
    field: string;        // Field name
    message: string;      // Error message
    isBlocking: boolean;  // Whether it prevents submission
}

interface ValidationWarning {
    field: string;        // Field name
    message: string;      // Warning message
    suggestion?: string;  // Optional suggestion for fix
}

interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
```

---

## 2. API Endpoints

### 2.1 Golf Course Search API

**Endpoint:** `GET /api/golf-courses/search`

#### Request Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | ✅ | Search query (min 2 characters) |
| `state` | `string` | ❌ | US state filter |
| `limit` | `number` | ❌ | Max results (default: 10) |

#### Response Shape

```typescript
// Success Response (200)
{
    success: true,
    results: CourseSearchResult[],
    total: number
}

interface CourseSearchResult {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    source: 'ghin' | 'rapidapi' | 'osm';
}
```

#### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ error: 'Search query must be at least 2 characters' }` | Query too short |
| 500 | `{ error: 'Failed to search courses', details: string }` | Server error |

### 2.2 Golf Course Details API

**Endpoint:** `GET /api/golf-courses/[courseId]`

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `courseId` | `string` (path) | ✅ | Course ID (format: `source-id`) |

#### Response Shape

```typescript
// Success Response (200)
{
    success: true,
    data: CourseDetailsResponse
}

interface CourseDetailsResponse {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    holes: HoleData[];
    teeSets: TeeSetData[];
    source: string;
}

interface HoleData {
    par: number;        // 3, 4, or 5
    handicap: number;   // 1-18
    yardage: number | null;
}

interface TeeSetData {
    name: string;
    color?: string;
    gender?: 'mens' | 'womens' | 'unisex';
    rating?: number;
    slope?: number;
    yardages: (number | null)[];
    totalYardage?: number;
}
```

#### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ error: 'Course ID is required' }` | Missing courseId |
| 500 | `{ error: 'Failed to fetch course details', details: string }` | Server error |

### 2.3 Golf Courses Proxy API

**Endpoint:** `GET /api/golf-courses`

#### Request Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | `string` | ✅ | One of: `'search'`, `'get'`, `'check'` |
| `q` | `string` | Required if `action=search` | Search query |
| `id` | `string` | Required if `action=get` | Course ID |

#### Response Shapes

```typescript
// Health Check (action=check)
{ configured: true }

// Error Responses
{ error: 'Golf Course API not configured', configured: false } // 503
{ error: 'Invalid Golf Course API key', configured: false }     // 401
{ error: 'Rate limit exceeded. Please try again later.' }       // 429
{ error: 'Invalid action. Use action=search&q=query or action=get&id=courseId' } // 400
```

### 2.4 Scorecard OCR API

**Endpoint:** `POST /api/scorecard-ocr`

#### Request Body

```typescript
interface RequestBody {
    image?: string;      // Single image base64 (backward compatible)
    mimeType?: string;   // MIME type for single image
    images?: ImageData[];// Multiple images
    provider?: 'claude' | 'openai' | 'auto'; // AI provider preference
}

interface ImageData {
    image: string;   // Base64 encoded image
    mimeType: string; // image/jpeg, image/png, etc.
    label?: string;  // Optional: 'front', 'back', 'ratings'
}
```

#### Response Shape

```typescript
// Success Response (200)
{
    success: true,
    data: ScorecardData,
    provider: 'claude' | 'openai' | 'demo',
    extractionStats?: {
        holesExtracted: number;
        teeSetsExtracted: number;
        hasRatings: boolean;
        hasSlopes: boolean;
    }
}

interface ScorecardData {
    courseName?: string;
    teeName?: string;
    rating?: number;
    slope?: number;
    holes: HoleData[];
    teeSets?: TeeSetData[];
}

interface TeeSetData {
    name: string;
    color?: string;
    rating?: number;
    slope?: number;
    yardages: (number | null)[];
}
```

#### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ error: 'No image provided' }` | Missing image |
| 400 | `{ error: 'PDF files are not supported...', suggestion: '...' }` | PDF uploaded |
| 500 | `{ error: 'Failed to extract scorecard data' }` | All AI providers failed |
| 500 | `{ error: 'Internal server error', details: string }` | Server error |

---

## 3. Supabase Database Contracts

### 3.1 Tables Overview

| Table | Description | Primary Key |
|-------|-------------|-------------|
| `trips` | Golf trip/event container | `UUID` |
| `players` | Golfer profiles | `UUID` |
| `teams` | Team definitions | `UUID` |
| `team_members` | Player-team associations | `UUID` |
| `sessions` | Ryder Cup sessions | `UUID` |
| `courses` | Golf course definitions | `UUID` |
| `tee_sets` | Course tee set configurations | `UUID` |
| `matches` | Match play matches | `UUID` |
| `hole_results` | Individual hole results | `UUID` |
| `photos` | Trip photos | `UUID` |
| `comments` | Social comments/trash talk | `UUID` |
| `side_bets` | Side bet tracking | `UUID` |
| `achievements` | Player achievements | `UUID` |
| `audit_log` | Captain action audit trail | `UUID` |

### 3.2 Table Schemas

#### `trips`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `name` | `TEXT` | NOT NULL | - |
| `start_date` | `DATE` | NOT NULL | - |
| `end_date` | `DATE` | NOT NULL | - |
| `location` | `TEXT` | | - |
| `notes` | `TEXT` | | - |
| `is_captain_mode_enabled` | `BOOLEAN` | | `FALSE` |
| `captain_name` | `TEXT` | | - |
| `share_code` | `TEXT` | UNIQUE | Auto-generated |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `players`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `first_name` | `TEXT` | NOT NULL | - |
| `last_name` | `TEXT` | NOT NULL | - |
| `email` | `TEXT` | | - |
| `handicap_index` | `DECIMAL(4,1)` | | - |
| `ghin` | `TEXT` | | - |
| `tee_preference` | `TEXT` | | - |
| `avatar_url` | `TEXT` | | - |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `teams`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `trip_id` | `UUID` | FK → trips(id) ON DELETE CASCADE, NOT NULL | - |
| `name` | `TEXT` | NOT NULL | - |
| `color` | `TEXT` | CHECK: `'usa'` or `'europe'`, NOT NULL | - |
| `color_hex` | `TEXT` | | - |
| `icon` | `TEXT` | | - |
| `notes` | `TEXT` | | - |
| `mode` | `TEXT` | CHECK: `'freeform'` or `'ryderCup'` | `'ryderCup'` |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `team_members`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `team_id` | `UUID` | FK → teams(id) ON DELETE CASCADE, NOT NULL | - |
| `player_id` | `UUID` | FK → players(id) ON DELETE CASCADE, NOT NULL | - |
| `sort_order` | `INTEGER` | | `0` |
| `is_captain` | `BOOLEAN` | | `FALSE` |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| **Constraint** | `UNIQUE(team_id, player_id)` | | |

#### `sessions`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `trip_id` | `UUID` | FK → trips(id) ON DELETE CASCADE, NOT NULL | - |
| `name` | `TEXT` | NOT NULL | - |
| `session_number` | `INTEGER` | NOT NULL | - |
| `session_type` | `TEXT` | CHECK: `'foursomes'`, `'fourball'`, `'singles'`, NOT NULL | - |
| `scheduled_date` | `DATE` | | - |
| `time_slot` | `TEXT` | CHECK: `'AM'` or `'PM'` | - |
| `points_per_match` | `DECIMAL(3,1)` | | `1.0` |
| `notes` | `TEXT` | | - |
| `status` | `TEXT` | CHECK: `'scheduled'`, `'inProgress'`, `'completed'` | `'scheduled'` |
| `is_locked` | `BOOLEAN` | | `FALSE` |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `courses`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `name` | `TEXT` | NOT NULL | - |
| `location` | `TEXT` | | - |
| `api_course_id` | `TEXT` | | - |
| `latitude` | `DECIMAL(10,7)` | | - |
| `longitude` | `DECIMAL(10,7)` | | - |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `tee_sets`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `course_id` | `UUID` | FK → courses(id) ON DELETE CASCADE, NOT NULL | - |
| `name` | `TEXT` | NOT NULL | - |
| `color` | `TEXT` | | - |
| `rating` | `DECIMAL(4,1)` | NOT NULL | - |
| `slope` | `INTEGER` | NOT NULL | - |
| `par` | `INTEGER` | NOT NULL | - |
| `hole_handicaps` | `INTEGER[]` | NOT NULL (18 elements) | - |
| `hole_pars` | `INTEGER[]` | | - |
| `yardages` | `INTEGER[]` | | - |
| `total_yardage` | `INTEGER` | | - |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `matches`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `session_id` | `UUID` | FK → sessions(id) ON DELETE CASCADE, NOT NULL | - |
| `course_id` | `UUID` | FK → courses(id) | - |
| `tee_set_id` | `UUID` | FK → tee_sets(id) | - |
| `match_order` | `INTEGER` | | `0` |
| `status` | `TEXT` | CHECK: `'scheduled'`, `'inProgress'`, `'completed'`, `'cancelled'` | `'scheduled'` |
| `start_time` | `TIMESTAMPTZ` | | - |
| `current_hole` | `INTEGER` | | `1` |
| `team_a_player_ids` | `UUID[]` | NOT NULL | - |
| `team_b_player_ids` | `UUID[]` | NOT NULL | - |
| `team_a_handicap_allowance` | `INTEGER` | | `0` |
| `team_b_handicap_allowance` | `INTEGER` | | `0` |
| `result` | `TEXT` | | `'notFinished'` |
| `margin` | `INTEGER` | | `0` |
| `holes_remaining` | `INTEGER` | | `0` |
| `notes` | `TEXT` | | - |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `hole_results`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `match_id` | `UUID` | FK → matches(id) ON DELETE CASCADE, NOT NULL | - |
| `hole_number` | `INTEGER` | CHECK: 1-18, NOT NULL | - |
| `winner` | `TEXT` | CHECK: `'teamA'`, `'teamB'`, `'halved'`, `'none'`, NOT NULL | - |
| `team_a_strokes` | `INTEGER` | | - |
| `team_b_strokes` | `INTEGER` | | - |
| `scored_by` | `UUID` | FK → players(id) | - |
| `notes` | `TEXT` | | - |
| `timestamp` | `TIMESTAMPTZ` | | `NOW()` |
| **Constraint** | `UNIQUE(match_id, hole_number)` | | |

#### `side_bets`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `trip_id` | `UUID` | FK → trips(id) ON DELETE CASCADE, NOT NULL | - |
| `match_id` | `UUID` | FK → matches(id) ON DELETE SET NULL | - |
| `bet_type` | `TEXT` | CHECK: `'skins'`, `'nassau'`, `'closest_to_pin'`, `'longest_drive'`, `'custom'`, NOT NULL | - |
| `name` | `TEXT` | NOT NULL | - |
| `amount` | `DECIMAL(10,2)` | | - |
| `winner_player_id` | `UUID` | FK → players(id) | - |
| `hole_number` | `INTEGER` | CHECK: 1-18 | - |
| `notes` | `TEXT` | | - |
| `created_at` | `TIMESTAMPTZ` | | `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | | `NOW()` |

#### `achievements`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `player_id` | `UUID` | FK → players(id) ON DELETE CASCADE, NOT NULL | - |
| `trip_id` | `UUID` | FK → trips(id) ON DELETE CASCADE, NOT NULL | - |
| `achievement_type` | `TEXT` | NOT NULL | - |
| `name` | `TEXT` | NOT NULL | - |
| `description` | `TEXT` | NOT NULL | - |
| `icon` | `TEXT` | NOT NULL | - |
| `earned_at` | `TIMESTAMPTZ` | | `NOW()` |
| **Constraint** | `UNIQUE(player_id, trip_id, achievement_type)` | | |

#### `audit_log`

| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| `id` | `UUID` | PK | `uuid_generate_v4()` |
| `trip_id` | `UUID` | FK → trips(id) ON DELETE CASCADE, NOT NULL | - |
| `action_type` | `TEXT` | NOT NULL | - |
| `timestamp` | `TIMESTAMPTZ` | | `NOW()` |
| `actor_name` | `TEXT` | NOT NULL | - |
| `summary` | `TEXT` | NOT NULL | - |
| `details` | `JSONB` | | - |
| `related_entity_id` | `TEXT` | | - |
| `related_entity_type` | `TEXT` | | - |

### 3.3 Foreign Key Relationships

```
trips
  ├── teams (trip_id)
  │     └── team_members (team_id)
  │           └── players (player_id)
  ├── sessions (trip_id)
  │     └── matches (session_id)
  │           └── hole_results (match_id)
  ├── photos (trip_id)
  ├── comments (trip_id)
  ├── side_bets (trip_id)
  ├── achievements (trip_id)
  └── audit_log (trip_id)

courses
  └── tee_sets (course_id)

matches → courses (course_id)
matches → tee_sets (tee_set_id)
```

### 3.4 Real-time Subscriptions

Tables enabled for real-time:
- `matches`
- `hole_results`
- `sessions`
- `comments`
- `photos`

---

## 4. IndexedDB (Dexie) Contracts

### 4.1 Database Schema

**Location:** `src/lib/db/index.ts`

#### Schema Version 5 (Current)

```typescript
class GolfTripDB extends Dexie {
    trips!: Table<Trip>;
    players!: Table<Player>;
    teams!: Table<Team>;
    teamMembers!: Table<TeamMember>;
    sessions!: Table<RyderCupSession>;
    matches!: Table<Match>;
    holeResults!: Table<HoleResult>;
    courses!: Table<Course>;
    teeSets!: Table<TeeSet>;
    courseProfiles!: Table<CourseProfile>;
    teeSetProfiles!: Table<TeeSetProfile>;
    scheduleDays!: Table<ScheduleDay>;
    scheduleItems!: Table<ScheduleItem>;
    tripStats!: Table<PlayerTripStat>;
    tripAwards!: Table<TripAward>;
    auditLog!: Table<AuditLogEntry>;
    banterPosts!: Table<BanterPost>;
    sideBets!: Table<SideBet>;
    scoringEvents!: Table<ScoringEvent>;
    syncMeta!: Table<SyncMetadata>;
}
```

### 4.2 Table Indexes

| Table | Indexes |
|-------|---------|
| `trips` | `id`, `name`, `startDate` |
| `players` | `id`, `tripId`, `name`, `handicapIndex` |
| `teams` | `id`, `tripId`, `name` |
| `teamMembers` | `id`, `teamId`, `playerId`, `[teamId+playerId]` |
| `sessions` | `id`, `tripId`, `scheduledDate`, `[tripId+scheduledDate]` |
| `matches` | `id`, `sessionId`, `status`, `[sessionId+matchOrder]` |
| `holeResults` | `id`, `matchId`, `holeNumber`, `[matchId+holeNumber]` |
| `courses` | `id`, `name` |
| `teeSets` | `id`, `courseId`, `[courseId+name]` |
| `courseProfiles` | `id`, `name` |
| `teeSetProfiles` | `id`, `courseProfileId`, `[courseProfileId+name]` |
| `scheduleDays` | `id`, `tripId`, `date`, `[tripId+date]` |
| `scheduleItems` | `id`, `scheduleDayId`, `startTime` |
| `tripStats` | `id`, `tripId`, `playerId`, `sessionId`, `statType`, `[tripId+playerId]`, `[tripId+statType]`, `[playerId+statType]` |
| `tripAwards` | `id`, `tripId`, `awardType`, `winnerId`, `[tripId+awardType]` |
| `auditLog` | `id`, `tripId`, `timestamp`, `actionType`, `[tripId+timestamp]` |
| `banterPosts` | `id`, `tripId`, `timestamp`, `[tripId+timestamp]` |
| `sideBets` | `id`, `tripId`, `status`, `[tripId+status]` |
| `scoringEvents` | `++localId`, `id`, `matchId`, `timestamp`, `synced`, `[matchId+timestamp]` |
| `syncMeta` | `key` |

### 4.3 Helper Functions

```typescript
// Clear all data
clearAllData(): Promise<void>

// Export all data as JSON
exportAllData(): Promise<Record<string, unknown[]>>

// Import data from JSON
importData(data: Record<string, unknown[]>): Promise<void>

// Get storage estimate
getStorageEstimate(): Promise<{ usage: number; quota: number; usagePercent: number }>

// Query helpers
getTripWithRelations(tripId: string): Promise<TripWithRelations | null>
getSessionWithMatches(sessionId: string): Promise<SessionWithMatches | null>
getMatchWithResults(matchId: string): Promise<MatchWithResults | null>
getTeamWithPlayers(teamId: string): Promise<TeamWithPlayers | null>
getScoringEventsForMatch(matchId: string): Promise<ScoringEvent[]>
getUnsyncedEvents(): Promise<ScoringEvent[]>
```

---

## 5. Store Interfaces

### 5.1 Trip Store

**Location:** `src/lib/stores/tripStore.ts`

#### State Shape

```typescript
interface TripState {
    // Core data
    currentTrip: Trip | null;
    teams: Team[];
    teamMembers: TeamMember[];
    players: Player[];
    sessions: RyderCupSession[];
    courses: Course[];
    teeSets: TeeSet[];

    // Loading states
    isLoading: boolean;
    error: string | null;
}
```

#### Actions

| Action | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `loadTrip` | `tripId: string` | `Promise<void>` | Load trip with all related data |
| `clearTrip` | - | `void` | Clear current trip from state |
| `createTrip` | `Omit<Trip, 'id' \| 'createdAt' \| 'updatedAt'>` | `Promise<Trip>` | Create new trip with default teams |
| `updateTrip` | `tripId: string, updates: Partial<Trip>` | `Promise<void>` | Update trip properties |
| `deleteTrip` | `tripId: string` | `Promise<void>` | Delete trip and all related data |
| `addPlayer` | `Omit<Player, 'id'>` | `Promise<Player>` | Add new player |
| `updatePlayer` | `playerId: string, updates: Partial<Player>` | `Promise<void>` | Update player |
| `removePlayer` | `playerId: string` | `Promise<void>` | Remove player |
| `assignPlayerToTeam` | `playerId: string, teamId: string` | `Promise<void>` | Assign player to team |
| `removePlayerFromTeam` | `playerId: string, teamId: string` | `Promise<void>` | Remove player from team |
| `addSession` | `Omit<RyderCupSession, 'id' \| 'createdAt' \| 'updatedAt'>` | `Promise<RyderCupSession>` | Create session |
| `updateSession` | `sessionId: string, updates: Partial<RyderCupSession>` | `Promise<void>` | Update session |

#### Selectors

| Selector | Parameters | Return |
|----------|------------|--------|
| `getTeamPlayers` | `teamId: string` | `Player[]` |
| `getTeamByColor` | `color: 'usa' \| 'europe'` | `Team \| null` |
| `getActiveSession` | - | `RyderCupSession \| null` |
| `getSessionMatches` | `sessionId: string` | `Promise<Match[]>` |

### 5.2 Scoring Store

**Location:** `src/lib/stores/scoringStore.ts`

#### State Shape

```typescript
interface ScoringState {
    // Active context
    activeMatch: Match | null;
    activeMatchState: MatchState | null;
    activeSession: RyderCupSession | null;
    currentHole: number;

    // Session data
    sessionMatches: Match[];
    matchStates: Map<string, MatchState>;

    // UI state
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
    lastSavedAt: Date | null;

    // Undo support
    undoStack: Array<{
        matchId: string;
        holeNumber: number;
        previousResult: HoleResult | null;
    }>;
}
```

#### Actions

| Action | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `loadSessionMatches` | `sessionId: string` | `Promise<void>` | Load all matches for session |
| `selectMatch` | `matchId: string` | `Promise<void>` | Select match for scoring |
| `clearActiveMatch` | - | `void` | Clear active match |
| `scoreHole` | `winner: HoleWinner, teamAScore?: number, teamBScore?: number` | `Promise<void>` | Record hole result |
| `undoLastHole` | - | `Promise<void>` | Undo last scored hole |
| `goToHole` | `holeNumber: number` | `void` | Navigate to specific hole |
| `nextHole` | - | `void` | Go to next hole |
| `prevHole` | - | `void` | Go to previous hole |
| `refreshMatchState` | `matchId: string` | `Promise<void>` | Refresh single match state |
| `refreshAllMatchStates` | - | `Promise<void>` | Refresh all match states |
| `isSessionLocked` | - | `boolean` | Check if session is locked |

### 5.3 Auth Store

**Location:** `src/lib/stores/authStore.ts`

#### State Shape

```typescript
interface AuthState {
    currentUser: UserProfile | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

interface UserProfile extends Omit<Player, 'createdAt' | 'updatedAt'> {
    isProfileComplete: boolean;
    phoneNumber?: string;
    nickname?: string;
    homeCourse?: string;
    preferredTees?: 'back' | 'middle' | 'forward';
    shirtSize?: 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
    dietaryRestrictions?: string;
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    createdAt: string;
    updatedAt: string;
}
```

#### Actions

| Action | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `login` | `email: string, pin: string` | `Promise<boolean>` | Login with email/PIN |
| `loginWithProfile` | `profile: UserProfile` | `void` | Direct login with profile |
| `logout` | - | `void` | Logout current user |
| `createProfile` | `Omit<UserProfile, 'id' \| 'createdAt' \| 'updatedAt' \| 'isProfileComplete'>` | `Promise<UserProfile>` | Create new profile |
| `updateProfile` | `updates: Partial<UserProfile>` | `Promise<void>` | Update profile |
| `checkExistingUser` | `email: string` | `Promise<UserProfile \| null>` | Check if user exists |
| `clearError` | - | `void` | Clear error state |

### 5.4 UI Store

**Location:** `src/lib/stores/uiStore.ts`

#### State Shape

```typescript
interface UIState {
    // Navigation
    activeTab: 'score' | 'matchups' | 'standings' | 'more';
    
    // Theme
    theme: 'light' | 'dark' | 'outdoor';
    isDarkMode: boolean;
    
    // Captain Mode
    isCaptainMode: boolean;
    captainPin: string | null;
    
    // Toasts
    toasts: Toast[];
    
    // Modals
    activeModal: Modal | null;
    
    // Connectivity
    isOnline: boolean;
    
    // Loading
    isGlobalLoading: boolean;
    globalLoadingMessage: string | null;
    
    // Scoring preferences
    scoringPreferences: ScoringPreferences;
}

interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

interface Modal {
    type: string;
    props?: Record<string, unknown>;
}
```

#### Persisted State

The following state is persisted to localStorage:
- `theme`
- `isDarkMode`
- `isCaptainMode`
- `captainPin`
- `scoringPreferences`

---

## 6. Type Definitions

### 6.1 Core Entity Types

**Location:** `src/lib/types/models.ts`

#### Primitive Types

```typescript
type UUID = string;
type ISODateString = string;
```

#### Match Status Types

```typescript
type MatchStatus = 'scheduled' | 'inProgress' | 'completed' | 'cancelled';

type MatchResultType =
    | 'teamAWin' | 'teamBWin' | 'halved' | 'notFinished' | 'incomplete'
    | 'oneUp' | 'twoAndOne' | 'threeAndTwo' | 'fourAndThree'
    | 'fiveAndFour' | 'sixAndFive';

type HoleWinner = 'teamA' | 'teamB' | 'halved' | 'none';
```

#### Session Types

```typescript
type SessionType = 'foursomes' | 'fourball' | 'singles';

type ExtendedSessionType =
    | SessionType
    // Match Play
    | 'greensomes' | 'pinehurst' | 'bloodsome' | 'modified-alternate'
    // Scramble
    | 'scramble-2' | 'scramble-3' | 'scramble-4' | 'texas-scramble' | 'florida-scramble' | 'shamble'
    // Points
    | 'stableford' | 'modified-stableford' | 'stroke-play' | 'medal' | 'par-competition'
    // Multi-Player
    | 'better-ball-3' | 'better-ball-4' | 'worst-ball' | 'aggregate'
    // Betting
    | 'skins' | 'nassau' | 'wolf' | 'vegas' | 'bingo-bango-bongo' | 'dots' | 'rabbit' | 'snake'
    // Hybrid
    | 'six-six-six' | 'round-robin' | 'cha-cha-cha' | 'irish-fourball' | 'waltz'
    | 'custom';
```

#### Team Mode

```typescript
type TeamMode = 'freeform' | 'ryderCup';
```

#### Audit Action Types

```typescript
type AuditActionType =
    | 'sessionCreated' | 'sessionLocked' | 'sessionUnlocked'
    | 'pairingCreated' | 'pairingEdited' | 'pairingDeleted'
    | 'lineupPublished' | 'matchStarted' | 'matchFinalized'
    | 'scoreEntered' | 'scoreEdited' | 'scoreUndone'
    | 'captainModeEnabled' | 'captainModeDisabled';
```

### 6.2 Trip Entity

```typescript
interface Trip {
    id: UUID;
    name: string;
    startDate: ISODateString;
    endDate: ISODateString;
    location?: string;
    notes?: string;
    isCaptainModeEnabled: boolean;
    captainName?: string;
    captainPin?: string;
    settings?: TripSettings;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

interface TripSettings {
    pointsToWin: number;
    totalMatches: number;
    allowSpectators: boolean;
    isPublic: boolean;
}
```

### 6.3 Player Entity

```typescript
interface Player {
    id: UUID;
    tripId?: UUID;
    firstName: string;
    lastName: string;
    email?: string;
    handicapIndex?: number;
    ghin?: string;
    teePreference?: string;
    avatarUrl?: string;
    team?: 'usa' | 'europe';
    joinedAt?: ISODateString;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
}
```

### 6.4 Team Entities

```typescript
interface Team {
    id: UUID;
    tripId: UUID;
    name: string;
    color: 'usa' | 'europe';
    colorHex?: string;
    icon?: string;
    notes?: string;
    mode: TeamMode;
    createdAt: ISODateString;
    updatedAt?: ISODateString;
}

interface TeamMember {
    id: UUID;
    teamId: UUID;
    playerId: UUID;
    sortOrder: number;
    isCaptain: boolean;
    createdAt: ISODateString;
}
```

### 6.5 Session Entity

```typescript
interface RyderCupSession {
    id: UUID;
    tripId: UUID;
    name: string;
    sessionNumber: number;
    sessionType: SessionType;
    scheduledDate?: ISODateString;
    timeSlot?: 'AM' | 'PM';
    pointsPerMatch?: number;
    notes?: string;
    status: 'scheduled' | 'inProgress' | 'completed';
    isLocked?: boolean;
    createdAt: ISODateString;
    updatedAt?: ISODateString;
}
```

### 6.6 Match Entity

```typescript
interface Match {
    id: UUID;
    sessionId: UUID;
    courseId?: UUID;
    teeSetId?: UUID;
    matchOrder: number;
    status: MatchStatus;
    startTime?: ISODateString;
    currentHole: number;
    teamAPlayerIds: UUID[];
    teamBPlayerIds: UUID[];
    teamAHandicapAllowance: number;
    teamBHandicapAllowance: number;
    result: MatchResultType;
    margin: number;
    holesRemaining: number;
    notes?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
```

### 6.7 Hole Result Entity

```typescript
interface HoleResult {
    id: UUID;
    matchId: UUID;
    holeNumber: number;
    winner: HoleWinner;
    teamAStrokes?: number;
    teamBStrokes?: number;
    teamAScore?: number;  // Alias
    teamBScore?: number;  // Alias
    scoredBy?: UUID;
    notes?: string;
    timestamp: ISODateString;
    // Audit trail
    lastEditedBy?: UUID;
    lastEditedAt?: ISODateString;
    editReason?: string;
    editHistory?: HoleResultEdit[];
}

interface HoleResultEdit {
    editedAt: ISODateString;
    editedBy: UUID;
    previousWinner: HoleWinner;
    newWinner: HoleWinner;
    reason?: string;
    isCaptainOverride?: boolean;
}
```

### 6.8 Course Entities

```typescript
interface Course {
    id: UUID;
    name: string;
    location?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

interface TeeSet {
    id: UUID;
    courseId: UUID;
    name: string;
    color?: string;
    rating: number;
    slope: number;
    par: number;
    holeHandicaps: number[];  // 18 elements, 1-18
    holePars?: number[];      // 18 elements, 3-5
    yardages?: number[];      // 18 elements
    totalYardage?: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}
```

### 6.9 Side Bet Entity

```typescript
type SideBetType = 'skins' | 'nassau' | 'ctp' | 'longdrive' | 'custom';
type SideBetStatus = 'active' | 'completed' | 'pending';

interface SideBet {
    id: UUID;
    tripId: UUID;
    type: SideBetType;
    name: string;
    description: string;
    status: SideBetStatus;
    pot?: number;
    winnerId?: UUID;
    hole?: number;
    participantIds: UUID[];
    createdAt: ISODateString;
    completedAt?: ISODateString;
}
```

### 6.10 Scoring Event Types

**Location:** `src/lib/types/events.ts`

```typescript
enum ScoringEventType {
    HoleScored = 'hole_scored',
    HoleEdited = 'hole_edited',
    HoleUndone = 'hole_undone',
    MatchStarted = 'match_started',
    MatchFinalized = 'match_finalized',
    MatchCancelled = 'match_cancelled',
}

interface ScoringEvent {
    localId?: number;           // Auto-increment for ordering
    id: UUID;                   // Global UUID
    matchId: UUID;
    eventType: ScoringEventType;
    timestamp: ISODateString;
    actorName: string;
    payload: ScoringEventPayload;
    synced: boolean;
    serverTimestamp?: ISODateString;
}
```

### 6.11 Computed/ViewModel Types

**Location:** `src/lib/types/computed.ts`

```typescript
interface MatchState {
    match: Match;
    holeResults: HoleResult[];
    currentScore: number;       // Positive = Team A leading
    teamAHolesWon: number;
    teamBHolesWon: number;
    holesPlayed: number;
    holesRemaining: number;
    isDormie: boolean;
    isClosedOut: boolean;
    status: MatchStatus;
    displayScore: string;       // e.g., "2 UP", "3&2", "AS"
    winningTeam: 'teamA' | 'teamB' | 'halved' | null;
}

interface TeamStandings {
    matchesPlayed: number;
    matchesRemaining: number;
    teamAPoints: number;
    teamBPoints: number;
    teamAProjected?: number;
    teamBProjected?: number;
    matchesCompleted: number;
    totalMatches: number;
    leader: 'teamA' | 'teamB' | null;
    margin: number;
    remainingMatches: number;
}

interface FairnessScore {
    score?: number;              // 0-100
    overallScore?: number;
    matchScore?: number;
    sessionScore?: number;
    strokesAdvantage?: number;
    advantageTeam?: string;
    drivers?: FairnessDriver[];
    suggestions?: string[];
}
```

### 6.12 Scoring Preferences

**Location:** `src/lib/types/scoringPreferences.ts`

```typescript
interface ScoringPreferences {
    oneHandedMode: boolean;
    preferredHand: 'left' | 'right';
    hapticFeedback: boolean;
    confirmCloseout: boolean;
    autoAdvance: boolean;
    alwaysShowUndo: boolean;
    buttonScale: 'normal' | 'large' | 'extra-large';
    swipeNavigation: boolean;
    quickScoreMode: boolean;
}
```

### 6.13 Trip Stats Types

**Location:** `src/lib/types/tripStats.ts`

```typescript
type TripStatCategory =
    | 'beverages' | 'golf_mishaps' | 'golf_highlights'
    | 'cart_chaos' | 'social' | 'money' | 'awards';

type TripStatType =
    // Beverages
    | 'beers' | 'cocktails' | 'shots' | 'waters' | 'cart_girl_visits' | 'cigars' | 'snacks'
    // Golf Mishaps
    | 'balls_lost' | 'sand_traps' | 'water_hazards' | 'mulligans' | 'club_throws' | 'whiffs' | 'shanks' | 'four_putts'
    // Golf Highlights
    | 'birdies' | 'eagles' | 'chip_ins' | 'longest_putt' | 'longest_drive' | 'closest_to_pin' | 'greens_in_regulation' | 'fairways_hit'
    // ...more

interface PlayerTripStat {
    id: UUID;
    tripId: UUID;
    playerId: UUID;
    sessionId?: UUID;
    statType: TripStatType;
    value: number;
    note?: string;
    timestamp: ISODateString;
    recordedBy?: UUID;
}
```

### 6.14 Captain Types

**Location:** `src/lib/types/captain.ts`

```typescript
// Validation
interface ValidationItem {
    id: string;
    severity: 'error' | 'warning' | 'info';
    category: ValidationCategory;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    autoFixable?: boolean;
}

interface PreFlightCheckResult {
    isReady: boolean;
    completionPercentage: number;
    errors: ValidationItem[];
    warnings: ValidationItem[];
    info: ValidationItem[];
    checkedAt: ISODateString;
}

// Bulk Import
interface PlayerImportRow {
    firstName: string;
    lastName: string;
    email?: string;
    handicapIndex?: number;
    ghin?: string;
    team?: 'A' | 'B';
    phone?: string;
}

interface BulkImportResult {
    success: boolean;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    validationResults: ImportValidationResult[];
    importedPlayers: Player[];
}

// Draft Mode
type DraftType = 'snake' | 'auction' | 'random' | 'captain_pick';
type DraftStatus = 'setup' | 'in_progress' | 'completed' | 'cancelled';

interface DraftConfig {
    id: UUID;
    tripId: UUID;
    type: DraftType;
    status: DraftStatus;
    roundCount: number;
    pickTimeSeconds?: number;
    auctionBudget?: number;
    draftOrder: UUID[];
    snakeReverse: boolean;
    createdAt: ISODateString;
}
```

---

## Appendix A: Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOLF_COURSE_API_KEY` | ❌ | Golf Course API key |
| `GHIN_API_KEY` | ❌ | USGA GHIN API key |
| `RAPIDAPI_KEY` | ❌ | RapidAPI key for course search |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic Claude API key for OCR |
| `OPENAI_API_KEY` | ❌ | OpenAI API key for OCR fallback |

## Appendix B: Error Messages Reference

### Authentication Errors

| Code | Message |
|------|---------|
| `AUTH_NO_ACCOUNT` | "No account found with this email" |
| `AUTH_INVALID_PIN` | "Invalid PIN" |
| `AUTH_DUPLICATE_EMAIL` | "An account with this email already exists" |
| `AUTH_LOGIN_FAILED` | "Login failed" |
| `AUTH_DATA_CORRUPTED` | "Login data corrupted. Please contact support." |

### Scoring Errors

| Code | Message |
|------|---------|
| `SCORE_SESSION_LOCKED` | "Session is finalized. Unlock to make changes." |
| `SCORE_SAVE_FAILED` | "Failed to save score" |
| `SCORE_UNDO_FAILED` | "Failed to undo" |
| `SCORE_MATCH_NOT_FOUND` | "Match not found" |

### Trip Errors

| Code | Message |
|------|---------|
| `TRIP_NOT_FOUND` | "Trip not found" |
| `TRIP_LOAD_FAILED` | "Failed to load trip" |

---

*Document generated: January 2026*
*Version: 1.0*
