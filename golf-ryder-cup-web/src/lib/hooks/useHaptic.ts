/**
 * useHaptic Hook — Premium Haptic Feedback System
 *
 * World-class tactile feedback for the best golf app experience.
 * Respects user preferences and device capabilities.
 * Provides nuanced patterns for different interaction contexts.
 *
 * iOS Safari Enhancement:
 * Since iOS Safari doesn't support the Vibration API, this hook
 * provides visual haptic feedback via CSS animations that simulate
 * the feel of haptic responses. The visual feedback is applied
 * to the element passed to triggerWithVisual().
 */

'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useUIStore } from '../stores';
import { useShallow } from 'zustand/shallow';

type HapticType =
  | 'light' // Subtle tap - selections, toggles
  | 'medium' // Standard tap - button presses
  | 'heavy' // Strong tap - important actions
  | 'success' // Celebration - score recorded, match won
  | 'error' // Alert - validation failed
  | 'warning' // Caution - destructive action
  | 'selection' // Quick tick - list selection
  | 'scorePoint' // Point scored - satisfying feedback
  | 'scoreWin' // Match won - victory celebration
  | 'scoreTie' // Halved hole - neutral feedback
  | 'navigation' // Page change - subtle transition
  | 'pull' // Pull to refresh - resistance feel
  | 'snap' // Snapping into place
  | 'delete' // Destructive action
  | 'teamA' // Team A scored (USA blue)
  | 'teamB'; // Team B scored (Europe burgundy)

// Map haptic types to CSS animation classes
const VISUAL_HAPTIC_CLASSES: Partial<Record<HapticType, string>> = {
  light: 'haptic-select',
  medium: 'haptic-press',
  heavy: 'haptic-press',
  success: 'haptic-success',
  error: 'haptic-error',
  warning: 'haptic-warning',
  selection: 'haptic-select',
  scorePoint: 'haptic-score-point',
  scoreWin: 'haptic-score-win',
  scoreTie: 'haptic-halved',
  navigation: 'haptic-navigate',
  snap: 'haptic-press',
  delete: 'haptic-delete',
  teamA: 'haptic-team-a',
  teamB: 'haptic-team-b',
};

// Animation duration map (ms) for cleanup timing
const ANIMATION_DURATIONS: Partial<Record<HapticType, number>> = {
  light: 150,
  medium: 150,
  heavy: 150,
  success: 500,
  error: 400,
  warning: 400,
  selection: 150,
  scorePoint: 500,
  scoreWin: 700,
  scoreTie: 300,
  navigation: 200,
  snap: 150,
  delete: 400,
  teamA: 400,
  teamB: 400,
};

/**
 * Check if device is iOS (doesn't support Vibration API)
 */
const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

/**
 * Check if Vibration API is supported
 */
const supportsVibration = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Premium haptic feedback hook
 * Returns both trigger function and pattern presets
 * Includes visual feedback fallback for iOS Safari
 */
export function useHaptic() {
  const { scoringPreferences } = useUIStore(useShallow(s => ({ scoringPreferences: s.scoringPreferences })));
  const cleanupTimers = useRef<Map<HTMLElement, NodeJS.Timeout>>(new Map());

  // Haptic patterns designed for premium feel
  // Times in ms, arrays are [vibrate, pause, vibrate, ...]
  const patterns = useMemo<Record<HapticType, number | number[]>>(
    () => ({
      // Basic interactions
      light: 8,
      medium: 20,
      heavy: 40,

      // Feedback states
      success: [15, 60, 15], // Quick double-tap
      error: [40, 30, 40, 30, 40], // Urgent triple-tap
      warning: [25, 50, 25], // Attention double-tap

      // Selection & navigation
      selection: 6, // Barely perceptible tick
      navigation: 12, // Subtle page transition

      // Golf-specific scoring feedback
      scorePoint: [20, 40, 30], // Satisfying point scored
      scoreWin: [15, 50, 25, 50, 35], // Victory celebration pattern
      scoreTie: 15, // Neutral halved

      // Gesture feedback
      pull: [5, 10, 8, 10, 10], // Resistance feel
      snap: 25, // Snapping into place
      delete: [30, 20, 50], // Destructive confirmation

      // Team-specific
      teamA: [20, 30, 25], // Team A win pulse
      teamB: [20, 30, 25], // Team B win pulse
    }),
    []
  );

  const intensityMultiplier = useMemo(() => {
    switch (scoringPreferences.hapticIntensity) {
      case 'low':
        return 0.6;
      case 'high':
        return 1.3;
      default:
        return 1;
    }
  }, [scoringPreferences.hapticIntensity]);

  const isHapticAllowed = useCallback(
    (type: HapticType) => {
      if (!scoringPreferences.hapticFeedback) return false;

      const scoreTypes: HapticType[] = [
        'scorePoint',
        'scoreWin',
        'scoreTie',
        'teamA',
        'teamB',
        'success',
      ];
      const navigationTypes: HapticType[] = ['navigation', 'selection', 'snap', 'pull', 'light'];
      const alertTypes: HapticType[] = ['warning', 'error', 'delete', 'heavy'];

      if (scoreTypes.includes(type)) return scoringPreferences.hapticsScore;
      if (navigationTypes.includes(type)) return scoringPreferences.hapticsNavigation;
      if (alertTypes.includes(type)) return scoringPreferences.hapticsAlerts;

      return true;
    },
    [
      scoringPreferences.hapticFeedback,
      scoringPreferences.hapticsScore,
      scoringPreferences.hapticsNavigation,
      scoringPreferences.hapticsAlerts,
    ]
  );

  const scalePattern = useCallback(
    (pattern: number | number[]) => {
      if (Array.isArray(pattern)) {
        return pattern.map((value) => Math.max(1, Math.round(value * intensityMultiplier)));
      }
      return Math.max(1, Math.round(pattern * intensityMultiplier));
    },
    [intensityMultiplier]
  );

  /**
   * Apply visual haptic feedback to an element
   * Used as fallback on iOS or when vibration fails
   */
  const applyVisualFeedback = useCallback((element: HTMLElement | null, type: HapticType) => {
    if (!element) return;

    const className = VISUAL_HAPTIC_CLASSES[type];
    if (!className) return;

    // Clear any existing animation on this element
    const existingTimer = cleanupTimers.current.get(element);
    if (existingTimer) {
      clearTimeout(existingTimer);
      // Remove all haptic classes
      Object.values(VISUAL_HAPTIC_CLASSES).forEach((cls) => {
        if (cls) element.classList.remove(cls);
      });
    }

    // Apply the animation class
    element.classList.add(className);

    // Remove class after animation completes
    const duration = ANIMATION_DURATIONS[type] || 400;
    const timer = setTimeout(() => {
      element.classList.remove(className);
      cleanupTimers.current.delete(element);
    }, duration);

    cleanupTimers.current.set(element, timer);
  }, []);

  /**
   * Trigger haptic feedback (vibration API)
   */
  const trigger = useCallback(
    (type: HapticType = 'light') => {
      if (!isHapticAllowed(type)) return;

      // Try vibration API first (Android, Capacitor)
      if (supportsVibration() && !isIOS()) {
        try {
          navigator.vibrate(scalePattern(patterns[type]));
        } catch {
          // Ignore errors - haptic is optional enhancement
        }
      }
    },
    [isHapticAllowed, patterns, scalePattern]
  );

  /**
   * Trigger haptic feedback with visual fallback
   * @param type - The type of haptic feedback
   * @param element - Optional element to apply visual feedback to
   */
  const triggerWithVisual = useCallback(
    (type: HapticType = 'light', element?: HTMLElement | null) => {
      if (!isHapticAllowed(type)) return;

      // Try vibration API (Android, Capacitor)
      if (supportsVibration() && !isIOS()) {
        try {
          navigator.vibrate(scalePattern(patterns[type]));
        } catch {
          // Fall through to visual feedback
        }
      }

      // Always apply visual feedback on iOS, or as enhancement on other platforms
      if (element) {
        applyVisualFeedback(element, type);
      }
    },
    [isHapticAllowed, patterns, scalePattern, applyVisualFeedback]
  );

  // Convenience methods for common interactions
  const haptics = useMemo(
    () => ({
      trigger,
      triggerWithVisual,
      applyVisualFeedback,
      isIOS: isIOS(),
      supportsVibration: supportsVibration(),
      // Quick access methods
      tap: () => trigger('light'),
      press: () => trigger('medium'),
      impact: () => trigger('heavy'),
      success: () => trigger('success'),
      error: () => trigger('error'),
      warning: () => trigger('warning'),
      select: () => trigger('selection'),
      navigate: () => trigger('navigation'),
      // Golf scoring
      scorePoint: () => trigger('scorePoint'),
      scoreWin: () => trigger('scoreWin'),
      scoreTie: () => trigger('scoreTie'),
      teamA: () => trigger('teamA'),
      teamB: () => trigger('teamB'),
      // Gestures
      pull: () => trigger('pull'),
      snap: () => trigger('snap'),
      delete: () => trigger('delete'),
      // Visual-enhanced versions
      scorePointVisual: (el?: HTMLElement | null) => triggerWithVisual('scorePoint', el),
      scoreWinVisual: (el?: HTMLElement | null) => triggerWithVisual('scoreWin', el),
      teamAVisual: (el?: HTMLElement | null) => triggerWithVisual('teamA', el),
      teamBVisual: (el?: HTMLElement | null) => triggerWithVisual('teamB', el),
      successVisual: (el?: HTMLElement | null) => triggerWithVisual('success', el),
      errorVisual: (el?: HTMLElement | null) => triggerWithVisual('error', el),
    }),
    [trigger, triggerWithVisual, applyVisualFeedback]
  );

  return haptics;
}

export default useHaptic;
