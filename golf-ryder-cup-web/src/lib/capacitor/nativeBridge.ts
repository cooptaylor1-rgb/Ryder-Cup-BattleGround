/**
 * Capacitor Native Bridge
 *
 * Unified API for native device capabilities across iOS/Android.
 * Falls back gracefully to web APIs when running in browser.
 *
 * @example
 * import { nativeBridge } from '@/lib/capacitor';
 *
 * // Haptics
 * await nativeBridge.haptics.impact('medium');
 *
 * // Keyboard
 * await nativeBridge.keyboard.hide();
 *
 * // Share
 * await nativeBridge.share({ title: 'Match Results', text: 'USA wins!' });
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share, ShareOptions, ShareResult } from '@capacitor/share';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';

// ============================================
// TYPES
// ============================================

export interface NativeInfo {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
  isIOS: boolean;
  isAndroid: boolean;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface PushNotificationHandler {
  onRegistration?: (token: Token) => void;
  onRegistrationError?: (error: Error) => void;
  onPushReceived?: (notification: PushNotificationSchema) => void;
  onPushActionPerformed?: (action: ActionPerformed) => void;
}

// ============================================
// PLATFORM DETECTION
// ============================================

/**
 * Get information about the current platform
 */
export function getNativeInfo(): NativeInfo {
  const platform = Capacitor.getPlatform();
  return {
    isNative: Capacitor.isNativePlatform(),
    platform: platform as 'ios' | 'android' | 'web',
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
  };
}

/**
 * Check if running on native platform
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if a plugin is available
 */
export function isPluginAvailable(name: string): boolean {
  return Capacitor.isPluginAvailable(name);
}

// ============================================
// HAPTICS MODULE
// ============================================

const haptics = {
  /**
   * Trigger impact haptic feedback
   */
  async impact(style: HapticImpactStyle = 'medium'): Promise<void> {
    if (!isPluginAvailable('Haptics')) {
      // Fallback to web vibration
      if ('vibrate' in navigator) {
        const patterns: Record<HapticImpactStyle, number> = {
          light: 10,
          medium: 25,
          heavy: 50,
        };
        navigator.vibrate(patterns[style]);
      }
      return;
    }

    const styleMap: Record<HapticImpactStyle, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] });
  },

  /**
   * Trigger notification haptic feedback
   */
  async notification(type: HapticNotificationType = 'success'): Promise<void> {
    if (!isPluginAvailable('Haptics')) {
      if ('vibrate' in navigator) {
        const patterns: Record<HapticNotificationType, number[]> = {
          success: [50, 50, 50],
          warning: [100, 50, 100],
          error: [200, 100, 200],
        };
        navigator.vibrate(patterns[type]);
      }
      return;
    }

    const typeMap: Record<HapticNotificationType, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: typeMap[type] });
  },

  /**
   * Trigger selection haptic feedback
   */
  async selection(): Promise<void> {
    if (!isPluginAvailable('Haptics')) {
      if ('vibrate' in navigator) {
        navigator.vibrate(5);
      }
      return;
    }

    await Haptics.selectionStart();
    await Haptics.selectionEnd();
  },

  /**
   * Trigger vibration with custom pattern
   */
  async vibrate(duration: number = 300): Promise<void> {
    if (!isPluginAvailable('Haptics')) {
      if ('vibrate' in navigator) {
        navigator.vibrate(duration);
      }
      return;
    }

    await Haptics.vibrate({ duration });
  },
};

// ============================================
// KEYBOARD MODULE
// ============================================

const keyboard = {
  /**
   * Show the keyboard
   */
  async show(): Promise<void> {
    if (!isPluginAvailable('Keyboard')) return;
    await Keyboard.show();
  },

  /**
   * Hide the keyboard
   */
  async hide(): Promise<void> {
    if (!isPluginAvailable('Keyboard')) return;
    await Keyboard.hide();
  },

  /**
   * Set keyboard resize mode
   */
  async setResizeMode(mode: 'body' | 'ionic' | 'native' | 'none'): Promise<void> {
    if (!isPluginAvailable('Keyboard')) return;
    const modeMap: Record<string, KeyboardResize> = {
      body: KeyboardResize.Body,
      ionic: KeyboardResize.Ionic,
      native: KeyboardResize.Native,
      none: KeyboardResize.None,
    };
    await Keyboard.setResizeMode({ mode: modeMap[mode] });
  },

  /**
   * Set scroll assist
   */
  async setScroll(enabled: boolean): Promise<void> {
    if (!isPluginAvailable('Keyboard')) return;
    await Keyboard.setScroll({ isDisabled: !enabled });
  },

  /**
   * Add show listener
   */
  addShowListener(callback: () => void): void {
    if (!isPluginAvailable('Keyboard')) return;
    Keyboard.addListener('keyboardWillShow', callback);
  },

  /**
   * Add hide listener
   */
  addHideListener(callback: () => void): void {
    if (!isPluginAvailable('Keyboard')) return;
    Keyboard.addListener('keyboardWillHide', callback);
  },
};

// ============================================
// STATUS BAR MODULE
// ============================================

const statusBar = {
  /**
   * Set status bar style
   */
  async setStyle(style: 'dark' | 'light'): Promise<void> {
    if (!isPluginAvailable('StatusBar')) return;
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
  },

  /**
   * Set status bar background color
   */
  async setBackgroundColor(color: string): Promise<void> {
    if (!isPluginAvailable('StatusBar')) return;
    await StatusBar.setBackgroundColor({ color });
  },

  /**
   * Show status bar
   */
  async show(): Promise<void> {
    if (!isPluginAvailable('StatusBar')) return;
    await StatusBar.show();
  },

  /**
   * Hide status bar
   */
  async hide(): Promise<void> {
    if (!isPluginAvailable('StatusBar')) return;
    await StatusBar.hide();
  },

  /**
   * Set overlay (iOS only)
   */
  async setOverlaysWebView(overlay: boolean): Promise<void> {
    if (!isPluginAvailable('StatusBar')) return;
    await StatusBar.setOverlaysWebView({ overlay });
  },
};

// ============================================
// SPLASH SCREEN MODULE
// ============================================

const splashScreen = {
  /**
   * Hide splash screen
   */
  async hide(fadeOutDuration: number = 300): Promise<void> {
    if (!isPluginAvailable('SplashScreen')) return;
    await SplashScreen.hide({ fadeOutDuration });
  },

  /**
   * Show splash screen
   */
  async show(): Promise<void> {
    if (!isPluginAvailable('SplashScreen')) return;
    await SplashScreen.show({
      showDuration: 2000,
      autoHide: true,
    });
  },
};

// ============================================
// APP MODULE
// ============================================

const app = {
  /**
   * Get app info
   */
  async getInfo(): Promise<{ name: string; id: string; build: string; version: string } | null> {
    if (!isPluginAvailable('App')) return null;
    return App.getInfo();
  },

  /**
   * Get app state
   */
  async getState(): Promise<{ isActive: boolean } | null> {
    if (!isPluginAvailable('App')) return null;
    return App.getState();
  },

  /**
   * Exit app (Android only)
   */
  async exitApp(): Promise<void> {
    if (!isPluginAvailable('App')) return;
    await App.exitApp();
  },

  /**
   * Add back button listener (Android)
   */
  addBackButtonListener(callback: () => void): void {
    if (!isPluginAvailable('App')) return;
    App.addListener('backButton', callback);
  },

  /**
   * Add app state change listener
   */
  addStateChangeListener(callback: (state: { isActive: boolean }) => void): void {
    if (!isPluginAvailable('App')) return;
    App.addListener('appStateChange', callback);
  },

  /**
   * Add app URL open listener (deep links)
   */
  addUrlOpenListener(callback: (data: { url: string }) => void): void {
    if (!isPluginAvailable('App')) return;
    App.addListener('appUrlOpen', callback);
  },
};

// ============================================
// SHARE MODULE
// ============================================

const share = {
  /**
   * Share content
   */
  async share(options: ShareOptions): Promise<ShareResult | null> {
    if (!isPluginAvailable('Share')) {
      // Fallback to Web Share API
      if ('share' in navigator) {
        try {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url,
          });
          return { activityType: 'web-share' };
        } catch {
          return null;
        }
      }
      return null;
    }

    return Share.share(options);
  },

  /**
   * Check if sharing is available
   */
  async canShare(): Promise<boolean> {
    if (!isPluginAvailable('Share')) {
      return 'share' in navigator;
    }
    const result = await Share.canShare();
    return result.value;
  },
};

// ============================================
// PUSH NOTIFICATIONS MODULE
// ============================================

const pushNotifications = {
  /**
   * Request push notification permission
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!isPluginAvailable('PushNotifications')) {
      // Fallback to web notifications
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result as 'granted' | 'denied' | 'prompt';
      }
      return 'denied';
    }

    const result = await PushNotifications.requestPermissions();
    return result.receive;
  },

  /**
   * Register for push notifications
   */
  async register(): Promise<void> {
    if (!isPluginAvailable('PushNotifications')) return;
    await PushNotifications.register();
  },

  /**
   * Get delivered notifications
   */
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    if (!isPluginAvailable('PushNotifications')) return [];
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  },

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications(): Promise<void> {
    if (!isPluginAvailable('PushNotifications')) return;
    await PushNotifications.removeAllDeliveredNotifications();
  },

  /**
   * Add listeners for push notification events
   */
  addListeners(handlers: PushNotificationHandler): () => void {
    if (!isPluginAvailable('PushNotifications')) return () => {};

    const listeners: (() => void)[] = [];

    if (handlers.onRegistration) {
      const listener = PushNotifications.addListener('registration', handlers.onRegistration);
      listeners.push(() => listener.remove());
    }

    if (handlers.onRegistrationError) {
      const listener = PushNotifications.addListener('registrationError', (err) => {
        handlers.onRegistrationError?.(new Error(err.error));
      });
      listeners.push(() => listener.remove());
    }

    if (handlers.onPushReceived) {
      const listener = PushNotifications.addListener('pushNotificationReceived', handlers.onPushReceived);
      listeners.push(() => listener.remove());
    }

    if (handlers.onPushActionPerformed) {
      const listener = PushNotifications.addListener('pushNotificationActionPerformed', handlers.onPushActionPerformed);
      listeners.push(() => listener.remove());
    }

    return () => listeners.forEach((remove) => remove());
  },
};

// ============================================
// NATIVE BRIDGE EXPORT
// ============================================

export const nativeBridge = {
  info: getNativeInfo,
  isNative,
  isPluginAvailable,
  haptics,
  keyboard,
  statusBar,
  splashScreen,
  app,
  share,
  pushNotifications,
};

export default nativeBridge;

// ============================================
// REACT HOOK
// ============================================

/**
 * React hook for native capabilities
 */
export function useNative() {
  return {
    ...getNativeInfo(),
    haptics,
    keyboard,
    statusBar,
    splashScreen,
    app,
    share,
    pushNotifications,
  };
}
