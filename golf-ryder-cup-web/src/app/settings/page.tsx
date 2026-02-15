'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Settings, Target, Palette, Bell, Database, Info } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';

/**
 * SETTINGS PAGE
 *
 * Central hub for all app settings and preferences.
 */

interface SettingItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  href: string;
  color: string;
}

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'scoring',
    label: 'Scoring Rules',
    description: 'Match play point values',
    icon: Target,
    href: '/settings/scoring',
    color: 'var(--masters)',
  },
  {
    id: 'theme',
    label: 'Theme & Display',
    description: 'Light, dark, or outdoor mode',
    icon: Palette,
    href: '/settings/appearance',
    color: '#8b5cf6',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Tee time reminders and score alerts',
    icon: Bell,
    href: '/settings/notifications',
    color: '#f59e0b',
  },
  {
    id: 'backup',
    label: 'Backup & Restore',
    description: 'Export and import trips',
    icon: Database,
    href: '/settings/backup',
    color: '#06b6d4',
  },
  {
    id: 'about',
    label: 'About',
    description: 'App version and info',
    icon: Info,
    href: '/more',
    color: '#64748b',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useUIStore();

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Settings"
        subtitle="App preferences"
        icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.push('/more')}
      />

      <main className="container-editorial">
        {/* Current Theme Info */}
        <section className="section-sm">
          <div className="card p-[var(--space-4)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--masters)]">
                <Palette size={20} className="text-[var(--canvas)]" />
              </div>
              <div className="flex-1">
                <p className="type-title-sm">Current Theme</p>
                <p className="type-caption capitalize">{theme || 'outdoor'} mode</p>
              </div>
            </div>
          </div>
        </section>

        {/* Settings List */}
        <section className="section">
          <h2 className="type-overline mb-[var(--space-4)]">Preferences</h2>

          <div className="space-y-3">
            {SETTINGS_ITEMS.map((item) => (
              <Link key={item.id} href={item.href} className="match-row">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: `${item.color}20` }}
                >
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="type-meta">{item.description}</p>
                </div>
                <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />
              </Link>
            ))}
          </div>
        </section>

        {/* App Info */}
        <section className="section-sm">
          <div className="card p-[var(--space-4)] text-center">
            <p className="type-overline mb-[var(--space-2)] text-[var(--masters)]">
              Ryder Cup Tracker
            </p>
            <p className="type-caption">Version 1.0.0</p>
            <p className="type-micro mt-[var(--space-2)]">Made with care for golf trip enthusiasts</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
