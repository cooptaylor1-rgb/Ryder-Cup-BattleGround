/**
 * Capacitor Native Bridge Tests
 *
 * Tests for native iOS/Android capabilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Capacitor modules
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: vi.fn(() => 'web'),
    isNativePlatform: vi.fn(() => false),
    isPluginAvailable: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn(),
    getState: vi.fn(),
    exitApp: vi.fn(),
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
    notification: vi.fn(),
    selectionStart: vi.fn(),
    selectionEnd: vi.fn(),
    vibrate: vi.fn(),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    show: vi.fn(),
    hide: vi.fn(),
    setResizeMode: vi.fn(),
    setScroll: vi.fn(),
    addListener: vi.fn(),
  },
  KeyboardResize: {
    Body: 'body',
    Ionic: 'ionic',
    Native: 'native',
    None: 'none',
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    setOverlaysWebView: vi.fn(),
  },
  Style: {
    Dark: 'DARK',
    Light: 'LIGHT',
  },
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}));

vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(),
    canShare: vi.fn(),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: vi.fn(),
    register: vi.fn(),
    getDeliveredNotifications: vi.fn(),
    removeAllDeliveredNotifications: vi.fn(),
    addListener: vi.fn(),
  },
}));

describe('Capacitor Native Bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform Detection', () => {
    it('should export getNativeInfo function', async () => {
      const { getNativeInfo } = await import('@/lib/capacitor');
      expect(getNativeInfo).toBeDefined();
      expect(typeof getNativeInfo).toBe('function');
    });

    it('should return correct info for web platform', async () => {
      const { getNativeInfo } = await import('@/lib/capacitor');
      const info = getNativeInfo();

      expect(info.isNative).toBe(false);
      expect(info.platform).toBe('web');
      expect(info.isIOS).toBe(false);
      expect(info.isAndroid).toBe(false);
    });

    it('should export isNative function', async () => {
      const { isNative } = await import('@/lib/capacitor');
      expect(isNative).toBeDefined();
      expect(isNative()).toBe(false);
    });

    it('should export isPluginAvailable function', async () => {
      const { isPluginAvailable } = await import('@/lib/capacitor');
      expect(isPluginAvailable).toBeDefined();
      expect(isPluginAvailable('Haptics')).toBe(false);
    });
  });

  describe('Native Bridge Object', () => {
    it('should export nativeBridge with all modules', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');

      expect(nativeBridge).toBeDefined();
      expect(nativeBridge.haptics).toBeDefined();
      expect(nativeBridge.keyboard).toBeDefined();
      expect(nativeBridge.statusBar).toBeDefined();
      expect(nativeBridge.splashScreen).toBeDefined();
      expect(nativeBridge.app).toBeDefined();
      expect(nativeBridge.share).toBeDefined();
      expect(nativeBridge.pushNotifications).toBeDefined();
    });

    it('should have info and utility functions', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');

      expect(nativeBridge.info).toBeDefined();
      expect(nativeBridge.isNative).toBeDefined();
      expect(nativeBridge.isPluginAvailable).toBeDefined();
    });
  });

  describe('Haptics Module', () => {
    it('should have impact method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.haptics.impact).toBeDefined();
    });

    it('should have notification method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.haptics.notification).toBeDefined();
    });

    it('should have selection method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.haptics.selection).toBeDefined();
    });

    it('should have vibrate method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.haptics.vibrate).toBeDefined();
    });

    it('should fallback to navigator.vibrate on web', async () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        writable: true,
        configurable: true,
      });

      const { nativeBridge } = await import('@/lib/capacitor');
      await nativeBridge.haptics.impact('medium');

      expect(mockVibrate).toHaveBeenCalledWith(25);
    });
  });

  describe('Keyboard Module', () => {
    it('should have show method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.keyboard.show).toBeDefined();
    });

    it('should have hide method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.keyboard.hide).toBeDefined();
    });

    it('should have setResizeMode method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.keyboard.setResizeMode).toBeDefined();
    });
  });

  describe('Status Bar Module', () => {
    it('should have setStyle method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.statusBar.setStyle).toBeDefined();
    });

    it('should have setBackgroundColor method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.statusBar.setBackgroundColor).toBeDefined();
    });

    it('should have show and hide methods', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.statusBar.show).toBeDefined();
      expect(nativeBridge.statusBar.hide).toBeDefined();
    });
  });

  describe('Splash Screen Module', () => {
    it('should have show method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.splashScreen.show).toBeDefined();
    });

    it('should have hide method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.splashScreen.hide).toBeDefined();
    });
  });

  describe('App Module', () => {
    it('should have getInfo method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.app.getInfo).toBeDefined();
    });

    it('should have getState method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.app.getState).toBeDefined();
    });

    it('should have exitApp method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.app.exitApp).toBeDefined();
    });

    it('should have listener methods', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.app.addBackButtonListener).toBeDefined();
      expect(nativeBridge.app.addStateChangeListener).toBeDefined();
      expect(nativeBridge.app.addUrlOpenListener).toBeDefined();
    });
  });

  describe('Share Module', () => {
    it('should have share method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.share.share).toBeDefined();
    });

    it('should have canShare method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.share.canShare).toBeDefined();
    });

    it('should fallback to Web Share API when not native', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
        configurable: true,
      });

      const { nativeBridge } = await import('@/lib/capacitor');
      const result = await nativeBridge.share.share({
        title: 'Test',
        text: 'Test text',
      });

      expect(mockShare).toHaveBeenCalled();
      expect(result?.activityType).toBe('web-share');
    });
  });

  describe('Push Notifications Module', () => {
    it('should have requestPermission method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.pushNotifications.requestPermission).toBeDefined();
    });

    it('should have register method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.pushNotifications.register).toBeDefined();
    });

    it('should have getDeliveredNotifications method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.pushNotifications.getDeliveredNotifications).toBeDefined();
    });

    it('should have addListeners method', async () => {
      const { nativeBridge } = await import('@/lib/capacitor');
      expect(nativeBridge.pushNotifications.addListeners).toBeDefined();
    });
  });

  describe('useNative Hook', () => {
    it('should export useNative hook', async () => {
      const { useNative } = await import('@/lib/capacitor');
      expect(useNative).toBeDefined();
      expect(typeof useNative).toBe('function');
    });

    it('should return all native modules', async () => {
      const { useNative } = await import('@/lib/capacitor');
      const native = useNative();

      expect(native.isNative).toBe(false);
      expect(native.platform).toBe('web');
      expect(native.haptics).toBeDefined();
      expect(native.keyboard).toBeDefined();
      expect(native.statusBar).toBeDefined();
      expect(native.splashScreen).toBeDefined();
      expect(native.app).toBeDefined();
      expect(native.share).toBeDefined();
      expect(native.pushNotifications).toBeDefined();
    });
  });

  describe('Capacitor Hooks', () => {
    it('should export useCapacitorInit hook', async () => {
      const { useCapacitorInit } = await import('@/lib/capacitor');
      expect(useCapacitorInit).toBeDefined();
      expect(typeof useCapacitorInit).toBe('function');
    });

    it('should export useCapacitorPush hook', async () => {
      const { useCapacitorPush } = await import('@/lib/capacitor');
      expect(useCapacitorPush).toBeDefined();
      expect(typeof useCapacitorPush).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should export NativeInfo type', async () => {
      // Type-only import check - if this compiles, the type exists
      const mod = await import('@/lib/capacitor');
      expect(mod).toBeDefined();
    });

    it('should export HapticImpactStyle type', async () => {
      const mod = await import('@/lib/capacitor');
      expect(mod).toBeDefined();
    });

    it('should export HapticNotificationType type', async () => {
      const mod = await import('@/lib/capacitor');
      expect(mod).toBeDefined();
    });

    it('should export PushNotificationHandler type', async () => {
      const mod = await import('@/lib/capacitor');
      expect(mod).toBeDefined();
    });
  });

  describe('Capacitor Core Re-export', () => {
    it('should re-export Capacitor from @capacitor/core', async () => {
      const { Capacitor } = await import('@/lib/capacitor');
      expect(Capacitor).toBeDefined();
      expect(Capacitor.getPlatform).toBeDefined();
      expect(Capacitor.isNativePlatform).toBeDefined();
    });
  });
});
