import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from '@/components/PWAProvider';
import { PWABanners } from '@/components/PWABanners';
import { PWAUpdateToast } from '@/components/PWAUpdateToast';
import { IOSInstallPrompt } from '@/components/IOSInstallPrompt';
import { InstallBanner } from '@/components/InstallPrompt';
import { ToastContainer } from '@/components/ui/Toast';
import { KeyboardShortcutsProvider } from '@/components/ui/KeyboardShortcutsProvider';
import { AppOnboardingProvider } from '@/components/AppOnboardingProvider';
import { NotificationProvider } from '@/components/live-play';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { QuickScoreFAB } from '@/components/QuickScoreFAB';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { TripRehydrationProvider } from '@/components/TripRehydrationProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthGuard } from '@/components/AuthGuard';
import { CourseSyncInitializer } from '@/components/CourseSyncInitializer';
import { TripSyncInitializer } from '@/components/TripSyncInitializer';
import { CapacitorProvider } from '@/components/CapacitorProvider';
import { baseMetadata, viewport as baseViewport } from '@/lib/utils/metadata';

export const metadata: Metadata = {
  ...baseMetadata,
  title: {
    default: 'Golf Ryder Cup',
    template: '%s | Golf Ryder Cup',
  },
  description:
    'Track your Ryder Cup style golf trips with real-time scoring, team standings, and match play tracking.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ryder Cup',
  },
  keywords: [
    'golf',
    'ryder cup',
    'golf trip',
    'match play',
    'scoring',
    'golf tracker',
    'team golf',
    'golf handicap',
  ],
};

export const viewport: Viewport = {
  ...baseViewport,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="outdoor">
      <head>
        {/* iOS App Icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />

        {/* iOS Splash Screens - Generated for common device sizes */}
        {/* iPhone SE, 8, 7, 6s, 6 - 750x1334 @2x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        {/* iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus - 1242x2208 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone X, Xs, 11 Pro - 1125x2436 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone Xr, 11 - 828x1792 @2x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        {/* iPhone Xs Max, 11 Pro Max - 1242x2688 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 12 mini, 13 mini - 1080x2340 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1080x2340.png"
          media="(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 12, 12 Pro, 13, 13 Pro, 14 - 1170x2532 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 12 Pro Max, 13 Pro Max, 14 Plus - 1284x2778 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro - 1179x2556 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro Max, 15 Pro Max - 1290x2796 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 15, 15 Pro - 1179x2556 @3x (same as 14 Pro) */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        {/* iPhone 16 Pro - 1206x2622 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1206x2622.png"
          media="(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 16 Pro Max - 1320x2868 @3x */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/splash-1320x2868.png"
          media="(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* iOS Status Bar Style */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased">
        {/* Skip link for accessibility - keyboard users can skip to main content */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-3 focus:rounded-xl focus:bg-masters-green focus:text-white focus:font-semibold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <PWAProvider>
          <CapacitorProvider>
            <ThemeProvider>
              <ErrorBoundary
                variant="fullscreen"
                showDetails={process.env.NODE_ENV === 'development'}
              >
                <AuthGuard>
                  <TripRehydrationProvider>
                    <NotificationProvider>
                      <AppOnboardingProvider>
                        <main
                          id="main-content"
                          className="pb-[calc(80px+env(safe-area-inset-bottom,0px))]"
                        >
                          {children}
                        </main>
                      </AppOnboardingProvider>
                    </NotificationProvider>
                  </TripRehydrationProvider>
                </AuthGuard>
              </ErrorBoundary>
              <QuickScoreFAB />
              <OfflineIndicator />
              <CourseSyncInitializer />
              <TripSyncInitializer />
              <ToastContainer />
              <PWABanners />
              <PWAUpdateToast />
              <InstallBanner position="bottom" />
              <IOSInstallPrompt delay={45000} dismissDays={14} />
              <KeyboardShortcutsProvider />
            </ThemeProvider>
          </CapacitorProvider>
        </PWAProvider>
      </body>
    </html>
  );
}
