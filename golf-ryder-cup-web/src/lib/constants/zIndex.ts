/**
 * Z-index scale.
 *
 * The app grew an ad-hoc z-index landscape across dozens of components —
 * `z-50`, `z-[70]`, `z-9999`, `z-[100]`, `z-[200]` — with no agreed
 * ordering. The result was overlays landing in the wrong stacking order
 * (e.g. iOS bottom sheets eating toasts, walkthrough steps covered by
 * modals).
 *
 * All new overlays should reference one of these tokens. Numbers leave
 * gaps so a future layer can slip between two without renumbering the
 * whole ladder.
 *
 * Ordering (lowest to highest):
 *   - sticky      : sticky headers / in-flow sticky bars.
 *   - nav         : fixed bottom nav, side nav.
 *   - overlay     : dimmed backdrop behind modals.
 *   - modal       : centred modal dialogs.
 *   - sheet       : bottom sheets / action sheets (above modals so they
 *                   can be invoked from within a modal).
 *   - popover     : popovers, tooltips, dropdown menus.
 *   - toast       : ephemeral toasts — always visible even during a
 *                   modal or sheet.
 *   - tour        : onboarding / first-launch walkthroughs — highest
 *                   app-level layer.
 *   - debug       : dev-only overlays (perf panel, replay indicator).
 */
export const zIndex = {
  sticky: 10,
  nav: 40,
  overlay: 50,
  modal: 60,
  sheet: 70,
  popover: 80,
  toast: 90,
  tour: 100,
  debug: 999,
} as const;

export type ZIndexKey = keyof typeof zIndex;
