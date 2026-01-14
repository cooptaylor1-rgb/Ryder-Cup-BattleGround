import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAProvider } from '@/components/PWAProvider';
import { PWABanners } from '@/components/PWABanners';
import { ToastContainer } from '@/components/ui/Toast';
import { AppOnboardingProvider } from '@/components/AppOnboardingProvider';
import { NotificationProvider } from '@/components/live-play';

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
        <PWAProvider>
          <NotificationProvider>
            <AppOnboardingProvider>
              {children}
            </AppOnboardingProvider>
          </NotificationProvider>
          <ToastContainer />
          <PWABanners />
        </PWAProvider>
      </body>
    </html>
  );
}
