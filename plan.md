# Ryder Cup BattleGround — UI/UX Overhaul Plan

## Guiding Principles

- **Zero visual regression**: each phase must leave the app fully functional
- **Ship incrementally**: each phase is a single commit, independently deployable
- **Design system first**: fix foundations before fixing pages
- **Remove before adding**: delete dead code, consolidate duplicates, then improve

---

## Phase 1: Layout Foundation — Kill the Dual Shell Problem

**Goal**: Every page uses one consistent shell. No more per-page `<BottomNav>`, no more double padding, no more competing Header vs PageHeader.

### 1A. Unify the app shell in `layout.tsx`

- Move `<BottomNav>` rendering into `layout.tsx` (it already has the `<main>` wrapper) so **no page** renders its own nav
- Remove the `<BottomNav />` calls from **every** page component: `HomePage`, `ScorePage`, `StandingsPage`, `MorePage`, `LoginPage`, `SchedulePage`, `SocialPage`, and all others
- Hide `<BottomNav>` on auth pages (`/login`, `/profile/create`, `/join`) by reading pathname in the layout or using a route group `(auth)` without nav

### 1B. Fix double bottom padding

- `layout.tsx` currently applies `pb-[calc(80px+env(safe-area-inset-bottom))]` on `<main>`
- Pages also apply `pb-nav` (which is `padding-bottom: calc(100px + env(safe-area-inset-bottom))`)
- **Fix**: Keep only the `layout.tsx` padding. Remove all `pb-nav` and `min-h-screen pb-nav` wrappers from page components. Adjust the layout padding value to match `pb-nav` (100px + safe area) since that's the correct clearance for the 72px nav + breathing room.

### 1C. Consolidate Header vs PageHeader

- `Header` (layout/Header.tsx) has route-based title detection, captain toggle, offline indicator — but is only used inside `AppShell` which pages don't use
- `PageHeader` (layout/PageHeader.tsx) is the one pages actually use, but it lacks offline indicator and captain toggle
- **Fix**: Merge `Header`'s useful features (offline indicator badge, captain toggle) into `PageHeader`. Delete `Header.tsx`. Update `AppShell` to use `PageHeader`.
- Since `PageHeader` is rendered per-page, and captain toggle + offline status are already in `layout.tsx` via other providers, the `PageHeader` just needs the offline badge for visual parity.

### 1D. Decide on AppShell

- `AppShell` renders its own `BottomNav`, `OfflineIndicator`, `ToastContainer`, `FloatingMyMatch`, `QuickStandingsOverlay`, `NotificationStack`, plus a global loading overlay
- `layout.tsx` already renders `OfflineIndicator`, `ToastContainer`, `QuickScoreFABv2`
- **Fix**: Move `AppShell`'s unique pieces (`FloatingMyMatch`, `QuickStandingsOverlay`, `NotificationStack`, global loading overlay) into `layout.tsx` (conditionally, when `currentTrip` exists). Then **delete `AppShell`** — it's an unused indirection layer now.

### 1E. Clean up dead state in removed components

- Remove `setMobileMenuOpen` dead state (was in `AppShell`)
- Remove unused `SidebarNav` if not being used on any page (verify desktop usage first — keep if desktop sidebar is desired)

**Files touched**: `layout.tsx`, `AppShell.tsx` (delete), `Header.tsx` (delete), `PageHeader.tsx`, every `page.tsx` that renders `<BottomNav />`

---

## Phase 2: Design System Consolidation — One Way to Do Everything

**Goal**: Single button system, single card system, single modal. No more CSS-class vs React-component duality.

### 2A. Unify button system

- The React `<Button>` component (`ui/Button.tsx`) is the canonical button. It has variants, sizes, loading states, icons, accessibility.
- **Keep**: `<Button>` component as the single API
- **Remove from globals.css**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.btn-sm` classes (~lines 917-1007)
- **Remove from globals.css**: `.btn-premium` class (~lines 743-767)
- **Migrate all usages**: Find every `className="btn btn-primary"`, `className="btn-premium"`, etc. and replace with `<Button variant="primary">` (or appropriate variant)
- **Add a `premium` variant** to `<Button>` if the pill-shaped full-rounded style is needed (maps to old `.btn-premium`)
- Audit: `ScorePage` line 307, `HomePage` line 511, `StandingsPage` line 346, and inline buttons in `MorePage`

### 2B. Unify card system

- The React `<Card>` component (`ui/Card.tsx`) has variants (default, elevated, outlined, ghost), padding sizes, interactive state, subcomponents (CardHeader, CardContent, CardFooter)
- **Keep**: `<Card>` component as the single API
- **Remove from globals.css**: `.card`, `.card-editorial`, `.card-premium`, `.card-captain`, `.card-interactive` classes
- **Migrate all usages**: Replace raw `className="card-editorial card-interactive"` divs with `<Card variant="default" interactive>` etc.
- **Add a `captain` variant** to `<Card>` for the maroon-accented captain cards
- Key files: `HomePage` (card-editorial, card-captain), `ScorePage` (card-editorial card-interactive), `StandingsPage` (card), `MorePage` (raw inline card styles)

### 2C. Unify modal system

- `ui/Modal.tsx` is the proper modal: portal, focus trap, escape key, body scroll lock, exit animation
- `MorePage` has an inline `Modal` function (lines 847-866): no portal, no focus trap, no scroll lock, no accessibility
- **Fix**: Delete the inline `Modal` from `MorePage`. Refactor `MorePage`'s `showCaptainModal`, `showClearConfirm`, `showExitTripConfirm`, `showAdminModal` to use `<Modal>` or `<ConfirmDialog>` from `ui/Modal.tsx`
- The clear-data and exit-trip confirmations map perfectly to `<ConfirmDialog>`
- The captain/admin PIN entry modals use `<Modal>` with custom content

### 2D. Clean up typography class redundancy

- `type-title-lg` is used in `StandingsPage:667` but never defined — define it or replace with `type-title`
- Audit for any other undefined utility classes

**Files touched**: `globals.css`, `Button.tsx`, `Card.tsx`, `MorePage`, `HomePage`, `ScorePage`, `StandingsPage`, all files using `.btn*` or `.card*` classes

---

## Phase 3: Navigation Alignment — Same App on Every Device

**Goal**: Mobile and desktop show the same 5 navigation destinations. No more Schedule-vs-Journal split.

### 3A. Align nav items

- **BottomNav** (mobile): Today, Score, Standings, Schedule, More
- **SidebarNav** (desktop): Today, Score, Standings, Journal, More
- These must match. Pick one set of 5.
- **Recommendation**: Today, Score, Standings, Schedule, More — because Schedule is more essential during active play. Journal/Social is accessible from the More page.
- **Update `SidebarNav`**: Change the 4th item from `{ href: '/social', label: 'Journal', icon: BookOpen }` to `{ href: '/schedule', label: 'Schedule', icon: CalendarDays }`

### 3B. Consider promoting Social/Journal

- Social/Banter is currently under More > Social. If the team feels it deserves top-level nav, swap Schedule for it in **both** navs. But the key fix is consistency.

**Files touched**: `SidebarNav.tsx`

---

## Phase 4: Accessibility & Contrast — WCAG AA Compliance

**Goal**: All text meets 4.5:1 contrast, tab interfaces are properly structured, keyboard navigation works.

### 4A. Fix contrast on tertiary text

- `--ink-tertiary: #A39E98` on `--canvas: #FAF8F5` = ~2.8:1 contrast (fails WCAG AA)
- **Fix**: Darken `--ink-tertiary` to `#8A8580` (~4.0:1) or `#7A7570` (~4.8:1, passes AA)
- Also check `--ink-faint` — it's decorative-only, which is fine, but audit that it's not used for meaningful text
- Check the outdoor theme override values similarly

### 4B. Fix tab interface ARIA

- `StandingsPage` tab buttons have `role="tab"` and `aria-selected` — good
- **Missing**: Wrap the tab row in `role="tablist"`, add `role="tabpanel"` and `aria-labelledby` to the content sections
- Add `tabIndex={0}` to tab panels for keyboard focus
- Connect tabs to panels with `id` / `aria-controls` / `aria-labelledby`

### 4C. Horizontally scrollable areas need keyboard support

- Session selector in `ScorePage` (line 301): horizontal scroll of pill buttons
- Add left/right arrow key navigation within the scrollable container
- Or ensure tab key cycles through all visible pills (already works with buttons, just verify)

### 4D. Login page should not show BottomNav

- Already addressed in Phase 1A (nav hidden on auth routes), but verify the `/login`, `/profile/create`, `/profile/complete`, and `/join` routes all suppress nav

**Files touched**: `globals.css` (color tokens), `StandingsPage`, `ScorePage`, route group structure

---

## Phase 5: Performance & Polish — Buttery Smooth

**Goal**: Remove jank-causing patterns, optimize rendering, reduce unnecessary layers.

### 5A. Fix texture-grain z-index

- `.texture-grain::before` uses `z-index: 9999` — this sits above modals (z-50), toasts, and everything
- **Fix**: Lower to `z-index: 1` or remove `z-index` entirely (it's a decorative background, not interactive)
- Alternatively, make it `pointer-events: none` (already done) and use `z-index: 0`
- Verify it doesn't visually break (it's at 1.5% opacity, so layering shouldn't matter)

### 5B. Reduce MorePage animation overhead

- MorePage has 10+ simultaneous `motion.div` animations with staggered delays on every mount
- **Fix**: Replace with CSS `animation-delay` stagger using the existing `.stagger-fast .stagger-item` pattern from globals.css
- Or use `framer-motion`'s `LazyMotion` + `domAnimation` to reduce bundle size, and switch most of these to CSS transitions since they're simple opacity+translateY

### 5C. Debounce/throttle live queries during scoring

- `ScorePage` runs `useLiveQuery` on hole results that re-fires on every DB change
- During active scoring this can cause rapid re-renders
- **Fix**: Add a short debounce (100-200ms) or use Dexie's `liveQuery` with a throttle wrapper for the hole results query

### 5D. Fix hardcoded color fallbacks in AppShell

- `AppShell` (if kept, or any remnant) has `style={{ background: 'var(--canvas, #0F0D0A)' }}` — the fallback is dark-theme colors on a light-theme app
- **Fix**: Either remove the fallback (CSS variables are always defined) or fix the fallback to light-theme values (`#FAF8F5`)
- Same for `color: 'var(--ink, #F5F1E8)'` — should be `#1A1815` if a fallback is needed

### 5E. Fix hardcoded nav background

- `.nav-premium` in globals.css uses `rgba(255, 255, 255, 0.95)` — breaks in dark/outdoor themes
- **Fix**: Use `rgba(var(--canvas-rgb), 0.95)` to respect the current theme

**Files touched**: `globals.css`, `MorePage`, `ScorePage`, `AppShell.tsx` (if still exists)

---

## Phase 6: Styling Consistency — One Way to Write Styles

**Goal**: Establish and enforce a single styling pattern. Remove mixed inline styles + Tailwind + CSS classes within components.

### 6A. Establish the rule

- **Tailwind classes** for layout, spacing, responsive breakpoints
- **CSS custom properties** (`var(--masters)`, `var(--space-4)`) for design tokens referenced in Tailwind via `[var(--x)]` syntax
- **Design system CSS classes** only for complex multi-property patterns that can't be expressed in Tailwind (e.g., `.score-monumental`, `.live-indicator`, `.type-overline`)
- **No inline `style={}`** unless truly dynamic (e.g., `animationDelay` based on index)

### 6B. Refactor BottomNav

- Currently mixes Tailwind classes, inline `style={}` objects, and CSS custom properties
- **Fix**: Convert all inline styles to Tailwind classes. The active indicator bar, badge, label styles can all be Tailwind.

### 6C. Refactor MorePage inline font declarations

- Uses `font-[var(--font-sans)]` extensively — unnecessary since `body` already sets `font-family: var(--font-sans)`
- **Fix**: Remove all redundant `font-[var(--font-sans)]` declarations
- Same for explicit `text-[var(--ink-primary)]` when that's the default `color: var(--ink)` from body

### 6D. Refactor HomePage mixed patterns

- Uses CSS classes (`card-editorial`, `divider`, `container-editorial`) alongside Tailwind (`flex items-center gap-[var(--space-4)]`)
- After Phase 2 (card consolidation), migrate remaining CSS utility classes to Tailwind or component-based patterns

**Files touched**: `BottomNav.tsx`, `MorePage`, `HomePage`, coding guidelines/CLAUDE.md

---

## Phase 7: Dead Code Removal — Lighten the Codebase

**Goal**: Remove everything that's unused, unreferenced, or vestigial.

### 7A. Remove dead state and variables

- `HomePage:56` — `setShowWhatsNew` is called but the value is never read (destructured as `[, setShowWhatsNew]`)
- `AppShell:66` — `setMobileMenuOpen` is set but the value is never read
- `StandingsPage:1043` — `_LoadingState` component is prefixed with `_` indicating it's dead
- `HomePage:51` — `_currentTrip` is destructured but unused (prefixed with `_`)

### 7B. Remove unused imports

- Audit all page files for imports that aren't used after the refactors in Phases 1-6
- Specific: check if `useScoringStore` is actually used in files that import it

### 7C. Remove duplicate route coverage

- `/trip-stats/awards` and `/trip/[tripId]/awards` — investigate if both are needed or if one can redirect to the other
- `/settings/appearance` exists alongside scattered theme toggles — consolidate theme controls to one location

### 7D. Remove backwards-compatibility aliases

- `layout/index.ts` has legacy aliases — check if anything still uses them, remove if not
- `globals.css` has `.type-headline` marked as "backwards compatibility" alias — check usage, remove if unused

**Files touched**: Various page files, `globals.css`, barrel exports

---

## Phase 8: Information Architecture — Declutter the More Page

**Goal**: The More page should feel organized, not overwhelming. Promote key items, demote rarely-used ones.

### 8A. Simplify the More page sections

Current structure (20+ items across 6 sections) is too dense. Restructure to:

1. **Your Trip** (only when trip active): Captain Dashboard, Schedule, Finances
2. **Social & Fun**: Banter, Side Bets, Trip Stats, Awards, Recap
3. **Settings**: Appearance, Notifications, Scoring, Backup
4. **Account**: Profile, Help, About

Remove the standalone "Captain Mode" and "Admin Mode" toggle buttons from the top — move them into their respective sections or into a less prominent position.

### 8B. Add section collapsibility (optional enhancement)

- Social & Fun section could be collapsed by default if no active trip
- Settings could show a summary line instead of expanded items

### 8C. Move Help & FAQ to a more discoverable location

- Currently buried in the Social section (wrong category)
- Move to Account section or make it a floating help button

**Files touched**: `MorePage`

---

## Execution Order & Dependencies

```
Phase 1 (Layout Foundation)     ← Do first, biggest structural fix
  ↓
Phase 2 (Design System)         ← Depends on Phase 1 (fewer files to update)
  ↓
Phase 3 (Navigation)            ← Quick, independent
  ↓
Phase 4 (Accessibility)         ← Can run parallel to Phase 3
  ↓
Phase 5 (Performance)           ← After structural changes settle
  ↓
Phase 6 (Styling Consistency)   ← After systems are unified
  ↓
Phase 7 (Dead Code)             ← Cleanup after all refactors
  ↓
Phase 8 (IA Restructure)        ← Final polish, least critical
```

**Estimated scope**: ~30-40 files modified, ~3 files deleted, ~500 lines of CSS removed, ~200 lines of dead JS removed.
