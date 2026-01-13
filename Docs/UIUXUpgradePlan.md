# UI/UX Upgrade Plan - Golf Ryder Cup Web App

> **Design Philosophy**: Palantir-level restraint and clarity + Spotify-level fun micro-interactions
>
> **Risk Profile**: Conservative - no behavior changes, no rewrites, no flaky dependencies

---

## 1. Design System Overview

### 1.1 Design Tokens (`/src/lib/design-system/tokens.ts`)

A centralized token system that defines the visual language of the app:

| Category | Examples | Purpose |
|----------|----------|---------|
| **Colors** | `brand.primary`, `surface.base`, `text.secondary` | Consistent color palette |
| **Typography** | `fontFamily.sans`, `fontSize.lg`, `fontWeight.semibold` | Readable text hierarchy |
| **Spacing** | `spacing.1` (4px) through `spacing.10` (40px) | 4px base grid system |
| **Radii** | `radii.md` (8px), `radii.xl` (16px) | Rounded corners |
| **Shadows** | `shadows.card`, `shadows.glow` | Elevation & emphasis |
| **Motion** | `motion.duration.fast` (150ms), `motion.easing.spring` | Consistent animations |

### 1.2 Color Philosophy

**Dark mode first** - Layered surfaces, not pure black:

- `surface-base`: #0a0a0a (deepest)
- `surface-raised`: #141414 (cards)
- `surface-elevated`: #1a1a1a (modals)

**Team colors** (customizable per trip):

- USA: `#1565C0` (blue)
- Europe: `#C62828` (red)

**Semantic colors**:

- Success: Augusta Green `#006d35`
- Warning: Yellow `#FFD54F`
- Error: Red `#EF5350`

---

## 2. Component Library

### 2.1 New Components Created

| Component | Location | Purpose |
|-----------|----------|---------|
| `Button` | `/components/ui/Button.tsx` | Primary action component with 5 variants |
| `IconButton` | `/components/ui/IconButton.tsx` | Icon-only buttons with ARIA labels |
| `Card` | `/components/ui/Card.tsx` | Flexible container (default/elevated/outlined/ghost) |
| `SectionHeader` | `/components/ui/SectionHeader.tsx` | Section titles with optional icons/actions |
| `Badge` / `StatusBadge` | `/components/ui/Badge.tsx` | Status labels (inProgress/completed/scheduled/dormie) |
| `Modal` | `/components/ui/Modal.tsx` | Accessible modal with focus trap |
| `ConfirmDialog` | `/components/ui/Modal.tsx` | Safe destructive action confirmations |
| `Input` | `/components/ui/Input.tsx` | Text input with labels, hints, errors |
| `Tabs` | `/components/ui/Tabs.tsx` | Accessible tab navigation |
| `Tooltip` | `/components/ui/Tooltip.tsx` | Simple tooltip for icon buttons |
| `EmptyStateNew` | `/components/ui/EmptyStateNew.tsx` | Beautiful, instructive empty states |

### 2.2 Layout Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AppShellNew` | `/components/layout/AppShellNew.tsx` | Main layout orchestrator |
| `HeaderNew` | `/components/layout/HeaderNew.tsx` | Compact header with contextual actions |
| `BottomNavNew` | `/components/layout/BottomNavNew.tsx` | Mobile bottom navigation |
| `SidebarNav` | `/components/layout/SidebarNav.tsx` | Desktop rail navigation |

### 2.3 Component Variants & Props

**Button Variants**:

```tsx
<Button variant="primary" />  // Augusta green, high emphasis
<Button variant="secondary" /> // Subtle background
<Button variant="ghost" />     // Text only
<Button variant="outline" />   // Border only
<Button variant="danger" />    // Red, destructive actions
```

**Button Sizes**:

```tsx
<Button size="sm" />  // 36px height
<Button size="md" />  // 44px height (default, WCAG touch)
<Button size="lg" />  // 52px height
<Button size="icon" /> // Square, icon-only
```

**Card Variants**:

```tsx
<Card variant="default" />   // Raised surface
<Card variant="elevated" />  // Higher elevation, subtle border
<Card variant="outlined" />  // Border only, transparent bg
<Card variant="ghost" />     // No visual boundary
<Card interactive />         // Hover lift + click state
```

---

## 3. Safety Improvements

### 3.1 ConfirmDialog for Destructive Actions

**Before** (unsafe):

```tsx
const handleClearData = () => {
  if (!confirm('Delete all data?')) return; // Native alert, easily dismissed
  clearDemoData();
};
```

**After** (safe):

```tsx
<ConfirmDialog
  isOpen={showClearConfirm}
  onClose={() => setShowClearConfirm(false)}
  onConfirm={handleClearData}
  title="Clear All Data?"
  description="This will permanently delete all trips, players, and scores."
  confirmLabel="Clear All Data"
  variant="danger"
  confirmText="DELETE" // User must type this to confirm
/>
```

### 3.2 Type-to-Confirm for High-Risk Actions

For very destructive actions (e.g., clearing all data), users must type a specific word:

```tsx
<ConfirmDialog
  confirmText="DELETE" // Required text to enable confirm button
/>
```

---

## 4. Micro-Interactions

### 4.1 Animation Utilities (`/globals.css`)

| Class | Effect | Use Case |
|-------|--------|----------|
| `.hover-lift` | Slight Y translation + shadow on hover | Interactive cards |
| `.press-scale` | 0.97 scale on active | All buttons |
| `.focus-glow` | Green glow ring on focus | Form inputs |
| `.stagger-children` | Cascading fade-in for list items | Trip cards, match lists |
| `.shimmer` | Loading shimmer effect | Skeleton loaders |
| `.fade-in-scale` | Modal entrance animation | Modals, dialogs |
| `.toast-enter/exit` | Slide up/down for toasts | Notifications |
| `.number-pop` | Brief scale pop | Score changes |
| `.badge-live-pulse` | Pulsing ring for live status | In-progress badges |

### 4.2 Motion Tokens

```tsx
const motion = {
  duration: {
    instant: '50ms',  // Micro-feedback
    fast: '150ms',    // Most UI transitions
    normal: '250ms',  // Page transitions
    slow: '400ms',    // Complex animations
  },
  easing: {
    default: 'ease-out',
    spring: 'cubic-bezier(0.16, 1, 0.3, 1)', // Bouncy, organic feel
  },
};
```

### 4.3 Reduced Motion Support

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 5. Pages Upgraded

### 5.1 Home Page (`/app/page.tsx`)

- ✅ New `AppShellNew` layout
- ✅ Trip cards with `Card` component and `StatusBadge`
- ✅ Stagger animation on trip list
- ✅ `ConfirmDialog` for "Clear Data" action
- ✅ Skeleton loaders during data fetch

### 5.2 Score Page (`/app/score/page.tsx`)

- ✅ New `AppShellNew` layout
- ✅ Custom `MatchCardNew` component with team colors
- ✅ Session header card with status
- ✅ Proper loading skeletons
- ✅ Empty state with CTA

### 5.3 Standings Page (`/app/standings/page.tsx`)

- ✅ New `TeamStandingsCardNew` with progress bar
- ✅ Magic number display
- ✅ `LeaderboardEntry` with rank badges
- ✅ Stat cards with consistent styling
- ✅ Loading skeleton state

### 5.4 More Page (`/app/more/page.tsx`)

- ✅ `SettingRow` component for consistent list items
- ✅ `ToggleSwitch` component for preferences
- ✅ Safe `ConfirmDialog` for "Clear All Data"
- ✅ `Modal` for Captain Mode PIN entry
- ✅ Proper section organization

### 5.5 Players Page (`/app/players/page.tsx`)

- ✅ Team sections with colored indicators
- ✅ `PlayerRow` with avatar and actions
- ✅ `Modal` for add/edit player
- ✅ `ConfirmDialog` for delete confirmation
- ✅ Proper empty state

---

## 6. Accessibility (A11y)

### 6.1 Touch Targets

All interactive elements meet WCAG 2.2 minimum of 44x44px:

```css
.touch-target { min-height: 44px; min-width: 44px; }
.touch-target-lg { min-height: 56px; min-width: 56px; }
.touch-target-hero { min-height: 72px; min-width: 72px; }
```

### 6.2 Focus Management

- All interactive elements have visible focus states
- Modals trap focus and restore on close
- Escape key closes modals and dialogs
- `aria-label` required on all `IconButton` components

### 6.3 Screen Reader Support

- Semantic HTML throughout
- `role` attributes on custom components
- Status badges announce state changes
- Empty states are descriptive

---

## 7. Performance Considerations

### 7.1 No New Heavy Dependencies

The upgrade uses only existing dependencies:

- Tailwind CSS 4 (already installed)
- Lucide React (already installed)
- Zustand (already installed)

### 7.2 CSS-Only Animations

All micro-interactions use CSS animations/transitions:

- No JavaScript animation libraries
- Hardware-accelerated transforms
- Reduced motion media query support

### 7.3 Component Composition

New components are composable and tree-shakeable:

- Barrel exports for easy importing
- No circular dependencies
- Lazy loading preserved

---

## 8. Migration Path

### 8.1 For Existing Pages (Not Yet Upgraded)

1. Replace `AppShell` with `AppShellNew`
2. Replace `<div className="card">` with `<Card>`
3. Replace `confirm()` calls with `<ConfirmDialog>`
4. Use `SectionHeader` for section titles
5. Use `Button` for all buttons
6. Use `Input` for form fields

### 8.2 Example Migration

**Before**:

```tsx
<AppShell headerTitle="My Page">
  <div className="card p-4">
    <h2 className="text-lg font-semibold">Section</h2>
    <button className="btn-primary" onClick={handleAction}>
      Do Thing
    </button>
  </div>
</AppShell>
```

**After**:

```tsx
<AppShellNew headerTitle="My Page">
  <Card>
    <SectionHeader title="Section" />
    <Button variant="primary" onClick={handleAction}>
      Do Thing
    </Button>
  </Card>
</AppShellNew>
```

---

## 9. Future Enhancements

### 9.1 Planned (Not Yet Implemented)

- [ ] Toast notifications with undo support
- [ ] Skeleton variants for different content types
- [ ] Drag-and-drop lineup builder improvements
- [ ] Dark/light mode toggle animation
- [ ] Page transition animations

### 9.2 Nice-to-Have

- [ ] Confetti animation on match completion
- [ ] Score change sparkle effect
- [ ] Pull-to-refresh animation
- [ ] Gesture-based navigation

---

## 10. Testing

All existing tests continue to pass:

```
✓ src/__tests__/export.test.ts (21 tests)
✓ src/__tests__/awards.test.ts (16 tests)
✓ src/__tests__/templates.test.ts (12 tests)

Test Files: 3 passed (3)
Tests: 49 passed (49)
```

The upgrade is purely presentational - no business logic was changed.

---

## Appendix: File Changes Summary

### New Files Created

```
src/lib/design-system/
├── tokens.ts          # Design tokens
└── index.ts           # Barrel export

src/components/ui/
├── Button.tsx         # Button component
├── IconButton.tsx     # Icon button component
├── Card.tsx           # Card component
├── SectionHeader.tsx  # Section header component
├── Badge.tsx          # Badge & StatusBadge components
├── Modal.tsx          # Modal & ConfirmDialog components
├── Input.tsx          # Input component
├── Tabs.tsx           # Tabs component
├── Tooltip.tsx        # Tooltip component
└── EmptyStateNew.tsx  # New empty state designs

src/components/layout/
├── AppShellNew.tsx    # New app layout
├── HeaderNew.tsx      # New header
├── BottomNavNew.tsx   # New bottom nav
└── SidebarNav.tsx     # Desktop sidebar
```

### Files Modified

```
src/app/globals.css       # Added micro-interaction animations
tailwind.config.ts        # Added new color tokens
src/components/ui/index.ts    # Added new exports
src/components/layout/index.ts # Added new exports
src/app/page.tsx          # Upgraded home page
src/app/score/page.tsx    # Upgraded score page
src/app/standings/page.tsx # Upgraded standings page
src/app/more/page.tsx     # Upgraded more page
src/app/players/page.tsx  # Upgraded players page
```

---

*Last Updated: January 2025*
*Version: 1.1.0*
