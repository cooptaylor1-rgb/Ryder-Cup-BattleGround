# Terminology

Canonical names for the concepts in this app. Every screen, button, error message, empty state, toast, and test fixture must use these exact words. If you need a new concept, add it here first, then use it.

**Why this matters:** Users don't read labels — they scan. Three different words for "the thing you tap to advance" triples the cognitive load on a captain already juggling 8 buddies and a first tee time. Pick one word and use it everywhere.

---

## Nouns

| Term | Meaning | Do not use |
|---|---|---|
| **Trip** | The overall competition — one weekend, one Ryder Cup, one buddies event. Has a name, dates, location, and a captain. | Tournament, Event, Competition |
| **Session** | A set of matches that happen together — typically half a day. A trip has 3-6 sessions. Has a format (Foursomes / Fourball / Singles). | Round, Day, Block |
| **Match** | A single head-to-head contest between two sides within a session. Has a winner, a score, and a lineup. | Game, Fixture |
| **Lineup** | The pairings for a session — who plays whom, in what order. This is the **editing** surface. | Pairings, Roster (roster = the full player pool) |
| **Matchups** | The public view of all matches across the trip. This is the **viewing** surface. | Schedule (schedule = dates/times), Draw |
| **Hole** | A single hole on the course. Scored as teamA / teamB / halved. | Point (a point is match-level) |
| **Score** | The state of a single hole, or the state of a match (e.g. "3 up thru 8"). | Result (result = final match outcome) |
| **Standings** | The running total of points across both teams. | Leaderboard (leaderboard = individual player stats) |
| **Captain** | The trip organizer who can lock sessions, edit lineups, and override scores. One captain per trip by default. | Admin, Organizer (Admin is a separate, rare role) |
| **Player** | Anyone participating in the trip. Has a name, a handicap, and is assigned to a team. | User (User is the app login — a player is a trip participant) |
| **Team** | The two sides. USA vs EUR by default, but custom names are allowed. | Side |

## Verbs — the forward-progression verb

The canonical phrase for "advance to the next step in a multi-step form" is:

> **Save and continue**

This reminds the user that their work is persisted before they move forward — important on flaky course Wi-Fi where a lost tap costs progress. Use this exact phrase on primary CTAs in:

- Trip creation wizard
- Lineup builder setup
- Any multi-step form that persists incremental state

Do **not** use:
- ~~"Continue to Lineup Builder"~~ — too wordy, doesn't confirm save
- ~~"Review Trip"~~ — ambiguous whether it saves
- ~~"Next"~~ — doesn't confirm save
- ~~"Next Step"~~ — doesn't confirm save

For single-shot actions (not multi-step), use the specific verb:

| Action | Verb |
|---|---|
| Persist a draft without advancing | **Save draft** |
| Make something public / final | **Publish** |
| Block further edits | **Lock** |
| Close a match as final | **Finalize match** |
| Enter a score | **Score** (as a verb: "Score hole 7") |
| Take back the last action | **Undo** |
| Fix an older score | **Edit** (not "correct" — edit is value-neutral) |

## Status words

Single-purpose labels for match/session state. Surface via the `state-pill` CSS variants.

| Status | Pill | When to show |
|---|---|---|
| **Upcoming** | `state-pill--upcoming` | Session is scheduled, no scores yet |
| **Live** | `state-pill--live` | At least one hole has been scored and the match isn't final |
| **Complete** | `state-pill--complete` | The match is final (all holes played or dormie closed out) |
| **Dormie** | `state-pill--dormie` | The leader can no longer lose (leading by the number of holes remaining) |
| **Locked** | `state-pill--danger` | Captain has locked the session from further edits |

## Error and empty-state voice

Two absolute rules:

1. **"Something went wrong" is banned.** If you're tempted to write it, you haven't finished classifying the error. Use `normalizeError` (`src/lib/utils/errorHandling.ts`) to produce a category, then write a category-specific message.
2. **Every empty state is a two-line card with a next action.** Line 1 = fact. Line 2 = verb + destination. Never leave a user at "No X yet."

Template:

> [Fact sentence]. [Verb-led next action] →

Examples:

- ✅ "The board is empty. Your captain is building the lineup — you'll see your matches here the moment they're ready." → (no next action because the user is waiting)
- ✅ "No matches scored yet. Open the scoring page to enter the first hole →"
- ❌ "No matches found."
- ❌ "Nothing to show."

## Success toast voice

- ≤ 5 words
- No exclamation points (except on match completion, which is its own celebration surface)
- Past tense confirms the action: "Lineup saved", "Session locked", "PIN updated"
- Don't congratulate people for routine work

## Button disabled state

When a primary CTA is disabled, **the button label becomes the reason**. Don't hide the reason 40px away in a helper text.

Examples:

- ✅ `disabled → "Add 2 more players"`
- ✅ `disabled → "Enter your 8-character code"`
- ❌ `disabled → "Save and continue" (greyed out, reason 80px above)`

This is enforced by review, not by lint. Consistency is on us.
