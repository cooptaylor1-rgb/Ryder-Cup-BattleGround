# Design Philosophy: Masters Tournament Inspiration

> "Timeless, calm, elegant. Information-dense without feeling busy. Trusted under pressure. Quietly premium."

---

## The Guiding Principle

The Golf Ryder Cup App should feel like the **Masters Tournament app** — not a tech startup's dashboard, not a social media feed, and certainly not a dark mode Spotify clone. It should feel like something you'd find in the clubhouse at Augusta: considered, confident, and unapologetically traditional in the best sense.

This is a tool for adults tracking a competitive golf trip. Every design decision reflects that.

---

## What We Rejected

### ❌ Startup Dashboard Aesthetic

- No gradient buttons
- No bouncy animations
- No "gamified" engagement patterns
- No emoji-heavy UI

### ❌ Generic Dark UI

- Pure black backgrounds (#000000) create harsh contrast on mobile in outdoor sunlight
- Instead: warm charcoal surfaces (#1a1a1a, #202020, #2a2a2a)
- Subtle warmth reduces eye strain

### ❌ Over-Designed Touch Patterns

- Removed: "one-handed mode" with dramatically scaled buttons
- Removed: excessive button scaling preferences
- Instead: Consistently generous tap targets (minimum 44px) everywhere

### ❌ Busy Visual Hierarchy

- Removed: multiple competing accent colors
- Removed: decorative iconography
- Removed: text labels that duplicate obvious iconography
- Instead: minimal, purposeful color use

---

## What We Embraced

### ✅ The Masters Palette

```css
/* Primary */
--masters-green: #006747;        /* Augusta National's signature */
--masters-gold: #c9a227;         /* Championship gold, used sparingly */

/* Surfaces - Warm Charcoal, Not Pure Black */
--surface-base: #1a1a1a;
--surface-raised: #202020;
--surface-elevated: #262626;
--surface-card: #242424;

/* Team Colors - Restrained */
--team-a-color: #a63d3d;         /* USA - Burgundy, not fire-engine red */
--team-b-color: #2d5a8e;         /* Europe - Navy, not electric blue */
```

The gold (`--masters-gold`) appears only in moments of significance:

- Active tournament indicators
- Match completion celebrations
- Current hole highlight in scoring
- Section dividers

Never on buttons. Never as gradients. Never competing for attention.

### ✅ Typography That Carries the Design

```css
--font-display: 'Source Serif 4', Georgia, serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-score: 'JetBrains Mono', 'SF Mono', monospace;
```

- **Display font (serif)**: Headlines only. Creates quiet authority.
- **Body font (sans-serif)**: All interface text. Clean, readable.
- **Score font (monospace)**: Numbers align. Scores are glanceable.

### ✅ Generous Whitespace

Instead of filling every pixel:

- 20px (px-5) horizontal padding
- 24px (py-6) vertical rhythm
- Consistent 16px (gap-4) between cards
- 8px (gap-2) between related elements

Whitespace signals confidence. Cramped layouts signal anxiety.

### ✅ Information Density Through Hierarchy

The standings page shows more information than before, but feels calmer because:

1. **Clear visual hierarchy**: Team scores (huge) → match progress (medium) → individual stats (small)
2. **Consistent grid**: 3-column layouts for stats, not random arrangements
3. **Muted supporting information**: Labels are --text-tertiary, values are --text-primary
4. **Section separation through spacing**, not divider lines or background colors

---

## Screen-by-Screen Philosophy

### Home / Entry Experience

**Before**: Trophy hero with gradient overlay, flashy "Start Round" button, busy card layouts.

**After**: Editorial calm.

- Simple greeting at day-appropriate time
- Single accent color (gold bar) on active tournament
- Collapsible developer tools — they exist, but don't dominate
- Typography-driven layout

The question we asked: *"Would this feel at home on the cover of Golf Digest?"*

### Standings

**Before**: Dense data tables, competing badge colors, unclear hierarchy.

**After**: Leaderboard with presence.

- Team scores as hero typography (40px+)
- Visual representation of margin (not just numbers)
- Player leaders shown with minimal decoration
- Progress stats in a clean 3-column grid

The question we asked: *"Can you glance at this for 2 seconds and know who's winning?"*

### Scoring (Match Detail)

**Before**: One-handed mode complexity, aggressive button scaling, distracting animations.

**After**: Sacred simplicity.

- Three large buttons: Team A / Halve / Team B
- Hole progress strip with team-colored indicators
- Mandatory undo (always visible, never hidden)
- No unnecessary animation

This is the most-used screen under pressure. Every millisecond of decision-making friction is a design failure.

**The question we asked**: *"Can I use this with wet hands, in bright sunlight, after my opponent just sank a 40-foot putt?"*

---

## Color Usage Rules

### When to use --masters-green

- Primary buttons (only when action is "go forward")
- Navigation active states
- Positive confirmations
- Section icons

### When to use --masters-gold

- Active/live tournament indicators
- Match completion celebration
- Current hole indicator
- Trophy/award moments
- **Never on buttons**

### When to use team colors

- Team identifiers (dots, badges, labels)
- Score display when a team is ahead
- Score buttons in match scoring
- Card accent borders

### When to use white/gray text

```
--text-primary   (#f4f1e9): Primary content
--text-secondary (#b8b5a8): Supporting labels
--text-tertiary  (#6b6b6b): Metadata, hints
--text-disabled  (#4a4a4a): Unavailable actions
```

---

## Interaction Patterns

### Transitions

```css
--timing-fast: 150ms;
--timing-normal: 200ms;
--timing-slow: 300ms;
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
```

- Fast: hover states, focus rings
- Normal: page transitions, card expansions
- Slow: modals, full-screen transitions

### Touch Targets

- Minimum 44px × 44px for all interactive elements
- `.touch-target` utility class for minimum sizing
- `.touch-target-xl` for primary actions (56px)

### Haptic Feedback

- `light`: Navigation, hole changes
- `medium`: Score recording
- `warning`: Undo, destructive actions

---

## What "Quietly Premium" Means

1. **No announcements**: The design doesn't say "look how nice I am."
2. **No trends**: We didn't use the latest animation library or Framer Motion patterns.
3. **No shortcuts**: Every spacing value is intentional, not "looks about right."
4. **No apologies**: We removed features that didn't serve the core use case.

Premium is not about adding polish. It's about removing everything that isn't essential.

---

## Testing Your Changes

Before shipping any UI change, ask:

1. Would this feel at home at Augusta National?
2. Can I understand it in 2 seconds?
3. Does it work in bright sunlight with wet hands?
4. Am I adding decoration, or removing friction?

If the answer to any of these is "no" — reconsider.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/globals.css` | Design tokens, base styles, button system |
| `src/app/page.tsx` | Home/entry experience |
| `src/app/standings/page.tsx` | Leaderboard with presence |
| `src/app/score/[matchId]/page.tsx` | Sacred scoring flow |
| `src/components/layout/HeaderNew.tsx` | Refined header |
| `src/components/layout/BottomNavNew.tsx` | Clean navigation |
| `tailwind.config.ts` | Tailwind extensions |
| `src/lib/design-system/tokens.ts` | JavaScript token export |

---

*"The details are not the details. They make the design."*
— Charles Eames
