/**
 * Capacitor Configuration
 *
 * Native iOS and Android app wrapper for Golf Ryder Cup PWA.
 * Enables App Store deployment with full native capabilities.
 */

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.golfrydercup.app',
  appName: 'Golf Ryder Cup',
  webDir: 'out',

  // Server configuration for development
  server: {
    // Use this for local development:
    // url: 'http://localhost:3000',
    // cleartext: true,

    // Android specific
    androidScheme: 'https',

    // iOS specific
    iosScheme: 'capacitor',
  },

  // iOS specific configuration
  ios: {
    // Use WebKit WKWebView
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,

    // Presentation style
    presentationStyle: 'fullScreen',

    // Background modes
    backgroundColor: '#1A1F2E',

    // Scheme for deep linking
    scheme: 'golfrydercup',
  },

  // Android specific configuration
  android: {
    // Appearance
    backgroundColor: '#1A1F2E',

    // Allow mixed content for development
    allowMixedContent: false,

    // Capture input
    captureInput: true,

    // WebView settings
    webContentsDebuggingEnabled: false,

    // Flavor
    flavor: 'production',

    // Build type
    buildOptions: {
      releaseType: 'APK',
    },
  },

  // Plugins configuration
  plugins: {
    // Splash screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#1A1F2E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },

    // Status bar
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A1F2E',
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },

    // Push notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Haptics - native vibration
    Haptics: {
      // Use native haptics
    },
  },

  // Logging
  loggingBehavior: 'none',

  // Cordova compatibility (for any legacy plugins)
  cordova: {},
};

export default config;
