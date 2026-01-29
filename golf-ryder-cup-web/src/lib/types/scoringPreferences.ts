/**
 * Scoring Preferences Types
 *
 * P2.3 - Scoring Ergonomics v2
 * One-handed mode with larger buttons and undo always visible
 */

export interface ScoringPreferences {
  /** Enable one-handed mode with larger buttons and bottom-positioned controls */
  oneHandedMode: boolean;
  /** Default hand for one-handed mode (affects button positioning) */
  preferredHand: 'left' | 'right';
  /** Enable haptic feedback on score entry */
  hapticFeedback: boolean;
  /** Confirm before recording match-ending score */
  confirmCloseout: boolean;
  /** Auto-advance to next hole after scoring */
  autoAdvance: boolean;
  /** Show undo button at all times (not just when available) */
  alwaysShowUndo: boolean;
  /** Button size multiplier for accessibility */
  buttonScale: 'normal' | 'large' | 'extra-large';
  /** Swipe gestures for navigation */
  swipeNavigation: boolean;
  /** Quick score mode - tap anywhere on team side to score */
  quickScoreMode: boolean;
  /** Optional sound effects on score entry */
  soundEffects: boolean;
}

export const DEFAULT_SCORING_PREFERENCES: ScoringPreferences = {
  oneHandedMode: false,
  preferredHand: 'right',
  hapticFeedback: true,
  confirmCloseout: true,
  autoAdvance: true,
  alwaysShowUndo: false,
  buttonScale: 'normal',
  swipeNavigation: false,
  quickScoreMode: false,
  soundEffects: false,
};

export const BUTTON_SCALE_SIZES = {
  normal: {
    height: 'h-16',
    text: 'text-lg',
    icon: 'w-6 h-6',
    padding: 'py-4 px-6',
  },
  large: {
    height: 'h-20',
    text: 'text-xl',
    icon: 'w-7 h-7',
    padding: 'py-5 px-8',
  },
  'extra-large': {
    height: 'h-24',
    text: 'text-2xl',
    icon: 'w-8 h-8',
    padding: 'py-6 px-10',
  },
};
