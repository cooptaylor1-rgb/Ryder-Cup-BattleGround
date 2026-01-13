# Information Architecture: Golf Ryder Cup App

**Version 1.0 — Authoritative Hierarchy Specification**

---

## Step 1: User Modes

### Mode 1: SCORING

**Mental State:** High adrenaline, divided attention. One hand on phone, one on club. Bright sunlight. Waiting for opponent to putt. 3 seconds to act.

**Success in 10 seconds:** Record who won the hole. Confirm it registered. Return phone to pocket.

---

### Mode 2: CHECKING

**Mental State:** Curious but passive. Walking between holes or sitting in cart. Wants to know "how are we doing?" without doing math.

**Success in 10 seconds:** See team score. Know if we're winning. Optionally see which matches matter.

---

### Mode 3: CAPTAINING

**Mental State:** Strategic, focused. Sitting down, probably indoors. Planning tomorrow's lineup or reviewing today's performance. Has time.

**Success in 10 seconds:** Not applicable — this mode tolerates complexity. Success = confidence that setup is correct before saving.

---

### Mode 4: REVIEWING

**Mental State:** Reflective, relaxed. Post-round or post-trip. Wants to relive moments, settle debates, see who performed.

**Success in 10 seconds:** Find the answer to "who beat who" or "what happened on hole 14."

---

## Step 2: Information Ranking

### SCORING Mode

| Priority | Information |
|----------|-------------|
| **Primary** | Current hole number. Three buttons: Team A / Halve / Team B. Current match score. |
| **Secondary** | Hole-by-hole progress strip. Undo button. Match status (dormie, closed out). |
| **Hidden** | Other matches. Player names (they know who's playing). Settings. Tournament standings. |

**Rationale:** During scoring, the user is a machine executing one task: record who won this hole. Every pixel not serving that task is noise.

---

### CHECKING Mode

| Priority | Information |
|----------|-------------|
| **Primary** | Team A score vs Team B score. Visual indicator of who's leading. |
| **Secondary** | Match-by-match breakdown. Which matches are in progress vs complete. |
| **Hidden** | Individual player stats. Historical data. Setup controls. Course information. |

**Rationale:** The user is not making decisions. They want a number and a feeling.

---

### CAPTAINING Mode

| Priority | Information |
|----------|-------------|
| **Primary** | Tomorrow's lineup grid. Available players. Match format (singles/foursomes). |
| **Secondary** | Player records/stats to inform decisions. Previous lineups. Session schedule. |
| **Hidden** | Live scores (different context). Hole-by-hole results. Developer tools. |

**Rationale:** This is the only mode where complexity is acceptable. The user has committed time.

---

### REVIEWING Mode

| Priority | Information |
|----------|-------------|
| **Primary** | Final scores by match. Winner declaration. |
| **Secondary** | Hole-by-hole results per match. Player leaderboard. Awards/superlatives. |
| **Hidden** | Active scoring controls. Lineup management. Future sessions. |

**Rationale:** The tournament is over. The data is immutable. Surface the narrative.

---

## Step 3: Screen Responsibility

| Screen | Assigned Mode | Notes |
|--------|---------------|-------|
| **Home** | CHECKING | Primary dashboard. Shows team score and active matches. Entry point. |
| **Score (list)** | CHECKING | List of matches for selection. Serves as router to scoring. |
| **Score (detail)** | SCORING | Single-match scoring interface. Nothing else. |
| **Standings** | CHECKING | Redundant with Home if Home shows score. See recommendation below. |
| **Matchups** | CAPTAINING | Lineup builder only. Hidden during active play unless user is captain. |
| **Players** | CAPTAINING | Roster management. Not relevant during rounds. |
| **Courses** | CAPTAINING | Course setup. Rarely accessed. |
| **More/Settings** | None (utility) | Configuration. Accessed intentionally. |
| **Trip creation** | CAPTAINING | Onboarding flow. One-time per tournament. |

### Conflicts & Recommendations

**Conflict 1: Home vs Standings**

Both screens serve CHECKING mode. Having two screens for "how are we doing" splits attention and creates navigation friction.

**Recommendation:** Merge. Standings content becomes the Home screen. "Standings" as a nav item is eliminated.

---

**Conflict 2: Score list vs Score detail**

The list screen serves as a router but provides no value once a match is selected. Users in SCORING mode don't care about other matches.

**Recommendation:** If only one match is active, skip the list entirely. Deep-link to the match in progress.

---

**Conflict 3: Players appears in nav for all users**

Player management is a CAPTAINING function. Non-captains have no use for this screen.

**Recommendation:** Remove from primary navigation. Access via Matchups or Settings only.

---

## Step 4: Deletion Pass

### UI Elements to Remove

| Element | Location | Reason |
|---------|----------|--------|
| "Session selector" tabs on Score list | Score screen | During a round, there's only one active session. Historical sessions are REVIEW mode. |
| Trophy icon in header | Home | Decorative. Adds no information. |
| "Tournament Companion" overline | Home header | Self-evident from context. |
| Player photos/avatars | Everywhere | Never implemented properly. Creates visual debt. Remove until high-quality. |
| "Tap to score" hint on match cards | Score list | Obvious affordance. Trust the user. |
| Captain badge in nav | Bottom nav | Move to header only. Saves space, reduces distraction. |
| One-handed mode toggle | Score detail | Deleted feature. Already removed in redesign. |
| Swipe navigation setting | Settings | Discoverable via natural gesture. Setting adds complexity. |

---

### Data to Hide by Default

| Data | Current Location | Recommendation |
|------|-----------------|----------------|
| Player handicap | Player cards, lineup | Show only during lineup creation, hide elsewhere |
| Match "thru X holes" | Standings | Show only on match detail. Standings needs score, not progress. |
| Session type label (singles/foursomes) | Score list | Visible to captain in lineup builder only |
| "Points to win" calculation | Standings header | Move to collapsed detail. Team score is primary. |
| Player email addresses | Player management | Never display in UI. Internal data only. |
| Match ID / timestamps | Everywhere | Developer concern, not user concern |

---

### Controls to Move Out of Primary Flows

| Control | Current Location | New Location | Reason |
|---------|-----------------|--------------|--------|
| "Load Demo Data" | Home | Settings > Developer | Pollutes production experience |
| "Clear Data" | Home | Settings > Developer > Danger Zone | Destructive action should require navigation |
| Course selector | Visible during round | Trip settings only | Course is set once per trip |
| Team color picker | Unknown | Trip creation only | Set once, never changed |
| Button scale preference | Settings | Remove entirely | Generous defaults eliminate need |
| Confirm closeout toggle | Settings | Remove entirely | Always confirm. No user should disable. |

---

## Summary Hierarchy

```
LEVEL 1: Team Score (1 glance)
   └── Who is winning? By how much?

LEVEL 2: Match States (5 seconds)
   └── Which matches are active? Which are decided?

LEVEL 3: Current Hole (during scoring only)
   └── What hole? Who won it?

LEVEL 4: Individual Performance (on request)
   └── Player leaderboard. Win/loss records.

LEVEL 5: Configuration (intentional navigation)
   └── Lineup. Roster. Settings. History.

LEVEL 6: Administration (buried)
   └── Developer tools. Data export. Danger zone.
```

---

## Navigation Recommendation

**Current:** Home | Score | Matchups | Standings | More

**Proposed:** Home | Score | Matches | More

- **Home** = Tournament standings (merged)
- **Score** = Active match scoring
- **Matches** = Lineup builder (captain mode, or view-only for players)
- **More** = Settings, history, players, courses

**Why 4 tabs, not 5:**

Five tabs create navigation anxiety. Four creates clarity. "Standings" and "Matchups" are both behind-the-scenes concepts. The user thinks: "How are we doing?" (Home) and "Who's playing who?" (Matches). Those are the mental models.

---

*This document represents the authoritative information hierarchy for the Golf Ryder Cup App. All screen designs, component decisions, and feature prioritization should reference this structure.*
