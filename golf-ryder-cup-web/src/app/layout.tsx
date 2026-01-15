import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from '@/components/PWAProvider';
import { PWABanners } from '@/components/PWABanners';
import { ToastContainer } from '@/components/ui/Toast';
import { AppOnboardingProvider } from '@/components/AppOnboardingProvider';
import { NotificationProvider } from '@/components/live-play';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { QuickScoreFAB } from '@/components/QuickScoreFAB';
import { OfflineIndicator } from '@/components/OfflineIndicator';

export const metadata: Metadata = {
  title: 'Ryder Cup Tracker',
  description: 'Track your Ryder Cup golf trip with offline-first scoring',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ryder Cup',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />
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
          <ErrorBoundary variant="fullscreen" showDetails={process.env.NODE_ENV === 'development'}>
            <NotificationProvider>
              <AppOnboardingProvider>
                <main id="main-content">
                  {children}
                </main>
              </AppOnboardingProvider>
            </NotificationProvider>
          </ErrorBoundary>
          <QuickScoreFAB />
          <OfflineIndicator />
          <ToastContainer />
          <PWABanners />
        </PWAProvider>
      </body>
    </html>
  );
}
