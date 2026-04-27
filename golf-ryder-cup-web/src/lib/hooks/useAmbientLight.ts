/**
 * useAmbientLight — Auto-trigger sunlight mode based on device sensor.
 *
 * Uses the experimental AmbientLightSensor API where available (mostly
 * Capacitor / Android in 2026), falling back gracefully on browsers
 * that don't expose it. When the sensor reports >= 8000 lux for ≥4
 * seconds, we flip the theme to "outdoor" so the cockpit is legible
 * in direct sun. We never auto-flip *back* — the user owns the off
 * switch (they're seeing more contrast than they want, presumably they
 * want it).
 *
 * Opt-in via prefs.scoringPreferences.outdoorAuto. Off by default to
 * avoid surprising people who set a theme intentionally.
 */

'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/stores/themeStore';

const BRIGHT_LUX_THRESHOLD = 8000;
const SUSTAIN_MS = 4000;

interface AmbientLightSensorLike {
  illuminance: number;
  start: () => void;
  stop: () => void;
  addEventListener: (type: 'reading' | 'error', listener: EventListener) => void;
  removeEventListener: (type: 'reading' | 'error', listener: EventListener) => void;
}

declare global {
  interface Window {
    AmbientLightSensor?: new () => AmbientLightSensorLike;
  }
}

export function useAmbientLight(enabled: boolean) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!window.AmbientLightSensor) return;
    if (theme === 'outdoor') return;

    let sensor: AmbientLightSensorLike | null = null;
    let brightSince: number | null = null;

    try {
      sensor = new window.AmbientLightSensor();
    } catch {
      return;
    }

    const onReading = () => {
      const lux = sensor?.illuminance ?? 0;
      if (lux >= BRIGHT_LUX_THRESHOLD) {
        if (brightSince == null) brightSince = Date.now();
        else if (Date.now() - brightSince >= SUSTAIN_MS) {
          setTheme('outdoor');
        }
      } else {
        brightSince = null;
      }
    };

    const onError = () => {
      sensor?.stop();
      sensor = null;
    };

    sensor.addEventListener('reading', onReading);
    sensor.addEventListener('error', onError);
    try {
      sensor.start();
    } catch {
      // Permissions not granted, etc.
    }

    return () => {
      sensor?.removeEventListener('reading', onReading);
      sensor?.removeEventListener('error', onError);
      try {
        sensor?.stop();
      } catch {
        // ignore
      }
    };
  }, [enabled, theme, setTheme]);
}
