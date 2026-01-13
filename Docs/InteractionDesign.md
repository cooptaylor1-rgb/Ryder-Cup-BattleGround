# Interaction Design & Motion Restraint

## Philosophy

Motion in this application follows Masters Tournament broadcast principles: **subtle, purposeful, and invisible when done right**. Animation should never distract from the task at hand. Every transition exists to preserve context or provide feedback—nothing more.

> "The best animation is the one you don't notice." — Our design mandate

---

## The Motion Scale

### 1. Instant (0-50ms)

**Purpose:** Immediate physical feedback

| Interaction | Motion | Duration |
|------------|--------|----------|
| Button press | `scale(0.98)` | 50ms |
| Toggle switch | State change | 0ms |
| Checkbox/radio | State change | 0ms |

### 2. Fast (100-150ms)

**Purpose:** State acknowledgment, micro-feedback

| Interaction | Motion | Duration |
|------------|--------|----------|
| Hover states | Opacity, color | 150ms |
| Focus rings | Box-shadow | 150ms |
| Toast exit | Fade + translate | 150ms |
| Modal exit | Fade + scale(0.98) | 150ms |

### 3. Standard (180-200ms)

**Purpose:** Element transitions, reveals

| Interaction | Motion | Duration |
|------------|--------|----------|
| Toast enter | Fade + translateY(8px) | 200ms |
| Modal enter | Fade + scale(0.98→1) | 180ms |
| Score pop | Scale(1→1.02→1) | 200ms |
| Card hover lift | translateY(-1px) | 150ms |
| Page fade-in | Opacity only | 150ms |

### 4. Slow (250-300ms)

**Purpose:** Feature card reveals, emphasis

| Interaction | Motion | Duration |
|------------|--------|----------|
| Command card enter | Fade + translateY(8px) | 300ms |
| Stagger children | Fade + translateY(4px) | 200ms each, 30ms delay |

### 5. Ambient (2s+)

**Purpose:** Indicate "live" status, loading

| Element | Motion | Duration |
|---------|--------|----------|
| Live pulse | Opacity 1→0.7→1 | 2.5s infinite |
| Skeleton shimmer | Background position | 1.5s infinite |
| Glow pulse | Box-shadow intensity | 3s infinite |
| Breathe | Opacity + subtle scale | 4s infinite |

---

## What Animates

### ✓ Yes: Animate These

1. **Entry transitions**
   - Fade in new content
   - Subtle translate (4-8px max)
   - Modal backdrop + content

2. **Exit transitions**
   - Fade out removed content
   - Toasts sliding away
   - Modal dismissal

3. **State feedback**
   - Score changes (subtle pop)
   - Button press states
   - Toggle states

4. **Loading indicators**
   - Skeleton shimmers
   - Pulse animations
   - Progress indicators

5. **Ambient status**
   - "Live" badge pulse
   - Active match glow

### ✗ No: Never Animate These

1. **Page navigation**
   - No sliding pages
   - No route animations
   - Just instant swap with fade

2. **Data updates**
   - Scores update instantly
   - Standings recalculate instantly
   - No number counting animations

3. **Scroll**
   - Native momentum only
   - No scroll-linked animations
   - No parallax

4. **Layout shifts**
   - Content appears where it belongs
   - No items flying into position
   - No reflow animations

5. **User input**
   - Text appears instantly
   - Selections are immediate
   - No typewriter effects

---

## Easing Curves

```css
/* Primary curve - natural deceleration */
--ease-masters: cubic-bezier(0.25, 0.1, 0.25, 1);

/* For exits - slightly faster at start */
ease-out (native)

/* Never use */
/* bounce, elastic, spring, overshoot */
```

---

## Component Animation Reference

### Toast (Toast.tsx)

```
ENTER:
- Fade: 0 → 1
- TranslateY: 8px → 0
- Duration: 200ms
- Easing: --ease-masters

EXIT:
- Fade: 1 → 0
- TranslateY: 0 → 8px
- Duration: 150ms
- Easing: ease-out
```

**Position:** Bottom center, above bottom nav (mobile), bottom-8 (desktop)

**Styling:**

- Dark card background (`--surface-card`)
- Colored border accent by type (success/error/info/warning)
- Icon in accent color
- No filled backgrounds

### Modal (Modal.tsx)

```
BACKDROP ENTER:
- Fade: 0 → 1
- Blur: 0 → 4px
- Duration: 180ms

DIALOG ENTER:
- Fade: 0 → 1
- Scale: 0.98 → 1
- Duration: 180ms
- Easing: --ease-masters

EXIT (both):
- Reverse of enter
- Duration: 150ms
- Easing: ease-out
```

**Focus management:**

- Trap focus inside modal
- Return focus on close
- ESC to dismiss

### UndoToast (UndoToast.tsx)

```
Design:
- Tappable card with undo affordance
- Countdown timer visible
- Progress bar showing time remaining
- Auto-dismiss after 5s

Interaction:
- Tap anywhere to undo
- No dismiss X (tap to undo or wait)
- Gold accent border (action available)
```

### Score Pop

```
TRIGGER: Score button pressed
ANIMATION:
- Scale: 1 → 1.02 → 1
- Duration: 200ms
- Easing: --ease-masters

Note: Very subtle - barely perceptible
Purpose: Confirm tap registration
```

### Stagger Children

```
USAGE: Initial list reveals only
PATTERN:
- Each child: fade + translateY(4px)
- Duration: 200ms each
- Delay: 30ms between items
- Max items: 5 (after that, same delay)
```

---

## Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

When reduced motion is preferred:

- Animations complete instantly
- Transitions are instant
- Scroll snapping is disabled
- Focus still visible (no animation needed)

---

## Haptic Feedback (useHaptic)

Complements visual feedback on supported devices:

| Action | Haptic |
|--------|--------|
| Score button tap | Medium (15ms) |
| Halved button | Light (10ms) |
| Undo action | Warning pattern |
| Navigation | Light (10ms) |
| Error | Warning pattern |

---

## Implementation Checklist

When adding new interactions:

1. **Ask:** Does this need animation at all?
2. **If yes:** Which tier? (Instant/Fast/Standard/Slow/Ambient)
3. **Duration:** Use design system timing tokens
4. **Easing:** `--ease-masters` for enter, `ease-out` for exit
5. **Reduced motion:** Does it degrade gracefully?
6. **Haptics:** Complement with tactile feedback?

---

## Files Modified

| File | Changes |
|------|---------|
| `globals.css` | Refined all keyframes, reduced scale values, added exit animations |
| `Toast.tsx` | Design system colors, bottom-center position, refined motion |
| `Modal.tsx` | Exit animations, design system colors |
| `UndoToast.tsx` | NEW - Countdown undo affordance |
| `ui/index.ts` | Export UndoToast |

---

## Anti-Patterns to Avoid

1. **Bouncy animations** - No spring, elastic, or overshoot
2. **Delays without purpose** - If it can be instant, make it instant
3. **Gratuitous motion** - Every animation needs a reason
4. **Blocking transitions** - User should never wait for animation
5. **Parallax/scroll-jacking** - Native scroll only
6. **Number counting** - Scores appear, not count up
7. **Flying elements** - Items appear where they belong
8. **Slide-in pages** - Fade only, instant is fine

---

*This is a living document. Update as patterns evolve.*
