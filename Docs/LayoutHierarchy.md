# Layout & Visual Hierarchy Specification

**Step 3 — Masters-Level Composed Layouts**

---

## Typography Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| **Display** | 48–56px | 400 (regular) | 1.0 | Team scores only |
| **Headline** | 24–28px | 400 | 1.2 | Current hole number, section titles |
| **Title** | 18px | 500 | 1.3 | Match labels, player names |
| **Body** | 14–15px | 400 | 1.5 | Supporting text, descriptions |
| **Caption** | 11–12px | 500 | 1.4 | Metadata, labels, overlines |

**Typeface Intent:**

- Display/Headline: Serif. Creates weight without shouting.
- Title/Body/Caption: Sans-serif. Functional, recedes.

---

## Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| **space-xs** | 4px | Inline gaps, icon-to-text |
| **space-sm** | 8px | Related elements within a group |
| **space-md** | 16px | Between groups within a section |
| **space-lg** | 24px | Between sections |
| **space-xl** | 40px | Major structural breaks |
| **space-2xl** | 64px | Page-level breathing room |

**Principle:** Space increases as relationship decreases. Tightly related items cluster. Unrelated items breathe.

---

## Screen 1: HOME / ENTRY

### Layout Description

**Container:**

- Max-width: 480px (centered)
- Horizontal padding: 20px
- Creates a reading column, not edge-to-edge sprawl

**Structure (top to bottom):**

```
┌────────────────────────────────────────┐
│  HEADER (fixed, minimal)               │  48px height
├────────────────────────────────────────┤
│                                        │
│  [space-xl: 40px]                      │
│                                        │
│  ┌────────────────────────────────┐    │
│  │     TEAM SCORE BLOCK           │    │  ← VISUAL ANCHOR
│  │     (asymmetric, dominant)     │    │
│  └────────────────────────────────┘    │
│                                        │
│  [space-lg: 24px]                      │
│                                        │
│  ──────────────────────────────────    │  ← Thin rule (1px)
│                                        │
│  [space-lg: 24px]                      │
│                                        │
│  MATCH LIST                            │  ← Secondary
│  (compact, subordinate)                │
│                                        │
│  [space-xl: 40px]                      │
│                                        │
└────────────────────────────────────────┘
```

---

### Team Score Block (Visual Anchor)

**Purpose:** Answer "who is winning" in under 1 second.

**Layout:**

```
            [caption: overline label]
                   TEAM A

    ┌─────────────────────────────────┐
    │                                 │
    │      7          │         5     │   ← Display type (56px)
    │                                 │
    │   [Team A]      │     [Team B]  │   ← Caption labels below
    │                                 │
    └─────────────────────────────────┘

              [thin progress bar]          ← Optional, 4px height
```

**Key decisions:**

- Scores are set in Display type, nothing else on screen approaches this size
- Vertical divider separates teams without enclosing them in boxes
- Team labels sit BELOW scores (not above) — score is primary, label is context
- No background colors. White space defines the block.
- Asymmetric tension: if scores differ, the larger number has more visual weight

**Why the eye moves correctly:**

1. Display type creates immediate focal point (team scores)
2. Eye naturally scans left-to-right across the score pair
3. Descending type size (56→12) guides eye downward to secondary content
4. Horizontal rule creates a "floor" before the match list

---

### Match List (Secondary)

**Purpose:** Show match-by-match state for users who want detail.

**Layout per row:**

```
┌─────────────────────────────────────────────┐
│  [Title: 18px]                    [Score]   │
│  Smith / Jones vs Adams / Brown    2 UP     │
│                                             │
│  [Caption: 11px]                            │
│  thru 14                                    │
└─────────────────────────────────────────────┘

[space-sm: 8px between rows]
```

**Key decisions:**

- NO cards. Rows are separated by spacing only.
- Player names flush left, score flush right (creates scannable column)
- Match progress ("thru 14") is tertiary — smallest type, muted weight
- Touch target: full row width, minimum 56px height

**Why this works:**

- Consistent left edge creates a strong vertical axis
- Right-aligned scores form a second axis — eye can scan the "score column" rapidly
- No visual ornamentation competing with data

---

### Tertiary: Tournament Context

**Location:** Above team score block, inline with header or as subtle overline.

```
[Caption: 11px, uppercase, letter-spaced]
BETHPAGE BLACK • DAY 2 OF 3
```

**Key decisions:**

- Smallest type on page
- Not styled as a "badge" or "chip"
- Integrated into flow, not called out

---

## Screen 2: SCORING (Match Detail)

### Layout Description

**Container:**

- Max-width: 400px (tighter than home — focused context)
- Horizontal padding: 20px
- Optimized for one-handed portrait use

**Structure (top to bottom):**

```
┌────────────────────────────────────────┐
│  HEADER (back button + match label)    │  48px
├────────────────────────────────────────┤
│                                        │
│  [space-lg: 24px]                      │
│                                        │
│  ┌────────────────────────────────┐    │
│  │     MATCH SCORE                │    │  Current score (secondary)
│  └────────────────────────────────┘    │
│                                        │
│  [space-md: 16px]                      │
│                                        │
│  ┌────────────────────────────────┐    │
│  │     HOLE INDICATOR             │    │  ← VISUAL ANCHOR
│  │     (Hole 14)                  │    │
│  └────────────────────────────────┘    │
│                                        │
│  [space-lg: 24px]                      │
│                                        │
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  │     SCORE BUTTONS              │    │  ← Primary action zone
│  │     (3 across)                 │    │
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  [space-md: 16px]                      │
│                                        │
│  [Undo]                                │  Tertiary
│                                        │
│  [space-xl: 40px]                      │
│                                        │
│  HOLE STRIP                            │  Progress (bottom)
│                                        │
└────────────────────────────────────────┘
```

---

### Match Score Block

**Purpose:** Context only. "Where do we stand?"

**Layout:**

```
        3 UP              ← Headline type (28px)

   [Team A]  vs  [Team B]  ← Caption (11px)
    thru 13
```

**Key decisions:**

- Single line for score state ("3 UP" or "AS")
- Player names NOT shown — user knows who's playing
- "thru X" provides context without competing for attention

---

### Hole Indicator (Visual Anchor)

**Purpose:** User must instantly know what hole they're scoring.

**Layout:**

```
                HOLE
                 14        ← Display type (48px), centered
```

**Key decisions:**

- Largest type on this screen
- Centered — breaks the left-alignment pattern intentionally to signal primacy
- "HOLE" as overline in caption size, separated by space-xs
- Nothing else at this size competes

**Why this works:**

- Breaking alignment pattern signals "this is different, this matters"
- Isolation (whitespace above and below) creates visual weight
- User can glance and know the state in <1 second

---

### Score Buttons (Primary Action Zone)

**Purpose:** Record who won the hole.

**Layout:**

```
┌────────────┐  [space-sm]  ┌────────────┐  [space-sm]  ┌────────────┐
│            │              │            │              │            │
│   TEAM A   │              │   HALVE    │              │   TEAM B   │
│            │              │            │              │            │
│            │              │            │              │            │
└────────────┘              └────────────┘              └────────────┘

    72px height minimum
    Equal width (1fr 1fr 1fr grid)
```

**Key decisions:**

- Three columns, equal weight
- Generous height (72px) — outdoor touch target
- Team names only, no secondary text within buttons
- Buttons are visually equal — no "default" or "primary" styling
- Space between buttons prevents mis-taps

**Typography within buttons:**

- Title weight (18px, 500)
- Centered horizontally and vertically
- ALL CAPS for scannability

---

### Undo Control

**Purpose:** Error recovery. Always accessible, never prominent.

**Layout:**

```
                [← Undo Last]     ← Body type (14px), centered
```

**Key decisions:**

- Centered to avoid competing with left-aligned content
- Small enough to not distract
- Large enough to tap (full width touch target)
- Text only, no icon required

---

### Hole Progress Strip

**Purpose:** Tertiary orientation. "Where have we been?"

**Layout:**

```
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│ 1│ 2│ 3│ 4│ 5│ 6│ 7│ 8│ 9│10│11│12│13│14│15│16│17│18│
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
        ▲                  ▲
    scored holes       current hole (larger/bold)
```

**Key decisions:**

- Fixed to bottom of scroll area
- Small indicators (28px circles)
- Current hole is visually distinct (bold number, or slight size increase)
- Horizontal scroll if needed on small screens
- Tappable for quick navigation (secondary gesture)

---

## Eye Movement Analysis

### Home Screen

```
ENTRY POINT: Center of screen (team scores)
           ↓
SCAN: Left score → Right score (comparison)
           ↓
DROP: Down to match list (detail on demand)
           ↓
SCAN: Left edge (names) → Right edge (scores)
           ↓
EXIT: Navigation at bottom
```

**Why it works:**

- Largest type is centered, capturing entry
- Horizontal scan for comparison (natural for scores)
- Vertical descent follows type size reduction
- Match list has strong left axis for rapid scanning

---

### Scoring Screen

```
ENTRY POINT: Hole number (centered, isolated)
           ↓
CONTEXT: Match score above (answered quickly)
           ↓
ACTION: Score buttons (three equal options)
           ↓
FALLBACK: Undo below (if needed)
           ↓
ORIENTATION: Hole strip at bottom (glanceable)
```

**Why it works:**

- Breaking center alignment signals "start here"
- Downward flow matches thumb reach (top of action zone)
- Three equal buttons prevent decision bias
- Undo is present but subordinate
- Hole strip provides closure without competing

---

## Anti-Patterns Avoided

| Pattern | Why Avoided |
|---------|-------------|
| **Cards everywhere** | Creates visual noise, implies interactivity where none exists |
| **Symmetric layouts** | Feel static, don't guide the eye |
| **Dashboard grids** | Suggest equal importance, which is false |
| **Hero sections** | Marketing pattern, not utility pattern |
| **Icon-heavy rows** | Icons compete with data |
| **Rounded everything** | Feels soft, not authoritative |
| **Centered everything** | Removes hierarchy, creates monotony |

---

## Validation Checklist

Before applying color:

- [ ] Can you identify the visual anchor in <1 second?
- [ ] Does the eye move top-to-bottom without jumping?
- [ ] Is there exactly ONE piece of information at Display size?
- [ ] Does whitespace separate sections, not decoration?
- [ ] Would removing any element break comprehension?
- [ ] Do touch targets feel generous without wasting space?

If any answer is "no" — revise before adding color.

---

*This document defines the spatial relationships and typographic hierarchy for the Golf Ryder Cup App. Color, when applied, should reinforce these decisions — not create new ones.*
