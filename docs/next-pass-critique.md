# Next Pass Critique: Surgical Fix Plan

## The Core Problem

The current UI is a **dark SaaS dashboard** pretending to be a golf app. It has:
- Heavy box/card framing everywhere
- Indistinct type hierarchy
- No editorial composition
- Scores that don't feel ceremonial
- Developer UI exposed on primary surfaces

This must be transformed into an **editorial tournament companion** where:
- Typography and whitespace carry structure
- Numbers are monumental
- Chrome is invisible
- The interface reads like a broadsheet, not an app

---

## Issue 1: Dark Dashboard Canvas (CRITICAL)

**What's wrong**: The `#1A1918` dark background with `#222120` cards creates stacked dark panels everywhere. This screams "developer dashboard."

**Why it breaks Masters**: The Masters app is light, airy, editorial. Golf is played outdoors in daylight. Dark mode should be an option, not the default.

**Fix**:
- `globals.css`: Flip to light canvas default (`#FAFAF8`) with warm undertones
- Keep dark mode as user preference only
- Remove surface layering (base → raised → card → elevated)

---

## Issue 2: Box/Card Framing Dominates Structure (CRITICAL)

**What's wrong**: Every piece of content is wrapped in `Card` component with borders, shadows, rounded corners. Home, Score, Standings - all boxes inside boxes.

**Why it breaks Masters**: Editorial layouts use whitespace and dividers, not frames. The Masters app uses subtle hairlines, not chunky borders.

**Fix**:
- `page.tsx` (Home): Remove card wrappers, use typography + dividers
- `score/page.tsx`: Remove MatchCard boxing, use simple rows
- `standings/page.tsx`: Remove TeamScoreCard boxing, use type hierarchy
- Delete or deprecate `Card` component usage on primary surfaces

---

## Issue 3: Home Lacks Editorial Lead (CRITICAL)

**What's wrong**: Home is a vertical list of trip cards. No headline state. No "what's happening now." No compositional hierarchy.

**Why it breaks Masters**: The Masters app opens with a clear state: who's leading, what's next. Home should be a front page with lead + supporting elements.

**Fix**:
- `page.tsx`: Rebuild as:
  - **Lead**: Active tournament headline with score state as hero
  - **Context**: Date, location, session as quiet meta
  - **Next**: What's happening next (next match/session)
  - **Archive**: Past trips as quiet list below

---

## Issue 4: Scores Don't Feel Ceremonial (CRITICAL)

**What's wrong**: Score numbers are small, styled with `text-2xl font-bold font-mono`. No visual weight. No alignment discipline.

**Why it breaks Masters**: Tournament leaderboards treat numbers as sacred. Large, optically aligned, consistent baseline. The score IS the interface.

**Fix**:
- Create `.score-display` class: 48-72px, tabular-nums, optical alignment
- `standings/page.tsx`: Team scores as hero typography
- `score/[matchId]/page.tsx`: Current score dominates the viewport
- Remove "thru X" clutter when not essential

---

## Issue 5: Typographic Hierarchy Weak/Uniform (CRITICAL)

**What's wrong**: Too many font sizes, weights, and styles. Everything fights for attention. No clear 4-role system.

**Why it breaks Masters**: Editorial design uses restraint. 4 roles max: Display (hero numbers), Headline (titles), Body (content), Meta (labels).

**Fix**:
- `globals.css`: Define exactly 4 type roles with clear size/weight
- Audit all pages for type consistency
- Remove `text-section`, `text-overline` redundancy
- Reserve bold for meaning, not decoration

---

## Issue 6: Spacing Rhythm Inconsistent

**What's wrong**: Mix of `pt-10`, `mb-4`, `space-y-10`, `gap-3`. No consistent baseline grid.

**Why it breaks Masters**: Editorial design uses repetition. 8px or 4px grid. Consistent vertical rhythm creates calm.

**Fix**:
- Establish 8px grid: 8, 16, 24, 32, 48, 64
- Audit all spacing in Home, Score, Standings
- Remove arbitrary values

---

## Issue 7: AppShellNew Chrome Competes with Content

**What's wrong**: Heavy header with title + subtitle + back button + hamburger. Mobile bottom nav with large icons.

**Why it breaks Masters**: The Masters app has minimal chrome. Header is a thin bar. Navigation is understated.

**Fix**:
- `AppShellNew.tsx`: Reduce header height to 48px max
- Remove subtitle from header (put context in page content)
- Make bottom nav more compact, text-only or icon-only

---

## Issue 8: Developer Tools on Primary Surfaces

**What's wrong**: "Load Demo Data", "Clear Data" are prominent. Settings are exposed.

**Why it breaks Masters**: End users don't need dev tools. These should be buried.

**Fix**:
- Remove dev tools from Home entirely
- Move to More > Developer section
- Gate destructive actions behind confirmation

---

## Issue 9: "Tap to Score" Instructional Copy

**What's wrong**: Match cards say "Tap to score" at the bottom. This is training wheels.

**Why it breaks Masters**: Users figure out tap targets. Instructional copy wastes space and looks amateur.

**Fix**:
- `score/page.tsx`: Remove "Tap to score" hint
- Make tap targets obvious through affordance, not text

---

## Issue 10: Status Badges Overused

**What's wrong**: Every match has StatusBadge (Complete, Dormie, In Progress). Visual noise.

**Why it breaks Masters**: State should be communicated through position, type treatment, subtle color. Not chunky badges.

**Fix**:
- Remove StatusBadge from match list
- Use typography to indicate state (completed = lighter weight, in-progress = normal)
- Reserve badges for exceptional states only

---

## Issue 11: Team Color Bars Too Prominent

**What's wrong**: `border-l-[3px] border-team-usa` on every card section. Creates visual fragmentation.

**Why it breaks Masters**: Team affiliation is secondary to score. Color should be subtle, not structural.

**Fix**:
- Reduce team color indicators to small dots or subtle tint
- Use alignment (left/right) to indicate teams, not color bars

---

## Issue 12: Undo Not Always Visible

**What's wrong**: Undo is a small button that may be hidden or require scrolling.

**Why it breaks Masters**: Scoring is high-stakes. Undo must be always present, calm but confident.

**Fix**:
- `score/[matchId]/page.tsx`: Undo pinned in footer, always visible
- Toast-based undo for reversibility

---

## Issue 13: Modal Focus Trap Missing

**What's wrong**: Modals don't trap focus. Tab can escape to background.

**Why it breaks Masters**: Accessibility and polish. Focus trap is table stakes.

**Fix**:
- `Modal.tsx`: Add focus trap
- Escape key closes modals
- Aria labels on icon buttons

---

## Issue 14: Motion is Bouncy/Distracting

**What's wrong**: `active:scale-[0.995]` and various hover effects. Not harmful but not calm.

**Why it breaks Masters**: Motion should be invisible. Preserve context, don't celebrate interaction.

**Fix**:
- Remove scale transforms on tap
- Keep only subtle opacity/color transitions
- Respect `prefers-reduced-motion`

---

## Issue 15: Empty States Are Generic

**What's wrong**: "No matches found" with generic messaging.

**Why it breaks Masters**: Empty states are opportunities for guidance. Should be calm and helpful.

**Fix**:
- Write specific copy for each empty state
- Provide clear next action

---

## Execution Order

1. **Canvas flip**: Light background, remove box framing
2. **Type system**: 4 roles, ceremonial scores
3. **Home rebuild**: Editorial lead + next + archive
4. **Scoring rebuild**: Sacred action surface
5. **Standings rebuild**: Monumental ledger
6. **Safety**: Destructive action gates
7. **Motion**: Tighten and respect reduced-motion
8. **Polish**: Copy, spacing, edge cases
