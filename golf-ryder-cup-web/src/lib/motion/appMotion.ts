/**
 * App Motion System
 *
 * One place for every motion token. Before this file existed, every
 * component inlined its own spring config and durations drifted —
 * some modals bounced on a stiff spring, others on a gentle one,
 * some transitions were 200ms, others 450ms with no logic. This
 * file is the single source of truth.
 *
 * Three rules:
 *   1. If you're adding a new animation, use a token from here.
 *   2. If the token doesn't exist, add it here first, then use it.
 *   3. Always wrap with useAppMotion() so reduced-motion users get
 *      a tasteful, non-animated fallback automatically.
 *
 * Motion guidelines:
 *   - snappy   → tactile feedback (button press, score entry)
 *   - standard → everyday transitions (page enter, modal open)
 *   - gentle   → non-urgent settling (toast enter, progress bar)
 *   - exit     → dismissal (modal close, toast exit) — shorter than enter
 *
 * Durations in ms correspond to what framer-motion expects when we
 * use the tween variant. Spring variants don't take a duration —
 * they derive it from stiffness/damping.
 */

import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

// ============================================================
// SPRINGS — use for position / scale / layout animations
// ============================================================

export const springs = {
  /** Tactile feedback. Button press, score entry, tile selection. */
  snappy: {
    type: 'spring',
    stiffness: 420,
    damping: 30,
    mass: 0.8,
  },

  /** Default UI transitions. Modal open, page enter, card expand. */
  standard: {
    type: 'spring',
    stiffness: 280,
    damping: 28,
    mass: 1,
  },

  /** Slow settling. Toast enter, progress bar fill, soft reveals. */
  gentle: {
    type: 'spring',
    stiffness: 180,
    damping: 26,
    mass: 1.1,
  },
} as const satisfies Record<string, Transition>;

// ============================================================
// EASES — use for opacity / filter / non-position animations
// ============================================================

export const eases = {
  /** Standard enter. Most common case. */
  enter: {
    type: 'tween',
    duration: 0.2,
    ease: [0.2, 0.8, 0.2, 1], // easeOutExpo-ish
  },

  /** Standard exit. Shorter than enter — faster disappearance
      feels more responsive. */
  exit: {
    type: 'tween',
    duration: 0.14,
    ease: [0.4, 0, 1, 1], // easeIn
  },

  /** Emphatic enter. Celebratory moments — match complete, dormie
      transition. Use sparingly. */
  emphatic: {
    type: 'tween',
    duration: 0.35,
    ease: [0.34, 1.25, 0.5, 1], // slight overshoot
  },

  /** No-op transition. What useAppMotion() falls back to when the
      user prefers reduced motion. */
  instant: {
    type: 'tween',
    duration: 0,
  },
} as const satisfies Record<string, Transition>;

// ============================================================
// DURATIONS — for setTimeout / CSS-side timing values
// ============================================================

export const durations = {
  fast: 120,
  base: 200,
  slow: 400,
  emphatic: 600,
} as const;

// ============================================================
// REACT HOOK — the primary API
// ============================================================

export interface AppMotion {
  /** True if the user prefers reduced motion. Prefer using the
      token functions below instead of branching on this directly. */
  reduced: boolean;

  /** Returns the spring token, or `eases.instant` if reduced motion. */
  spring: (key: keyof typeof springs) => Transition;

  /** Returns the ease token, or `eases.instant` if reduced motion. */
  ease: (key: keyof typeof eases) => Transition;

  /** Returns a duration in ms, or 0 if reduced motion. */
  duration: (key: keyof typeof durations) => number;
}

/**
 * Primary hook. Call this in any component that animates. It
 * automatically returns instant/zero-duration fallbacks when the
 * user prefers reduced motion, so callers never have to branch.
 *
 * Example:
 *   const motion = useAppMotion();
 *   <motion.div transition={motion.spring('snappy')}>
 *
 * Example with exit:
 *   <motion.div
 *     initial={{ opacity: 0 }}
 *     animate={{ opacity: 1 }}
 *     exit={{ opacity: 0 }}
 *     transition={motion.ease('enter')}
 *   />
 */
export function useAppMotion(): AppMotion {
  const reduced = useReducedMotion() ?? false;

  return {
    reduced,
    spring: (key) => (reduced ? eases.instant : springs[key]),
    ease: (key) => (reduced ? eases.instant : eases[key]),
    duration: (key) => (reduced ? 0 : durations[key]),
  };
}
