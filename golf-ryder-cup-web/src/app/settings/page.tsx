'use client';

import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Target,
  Palette,
  Bell,
  Database,
  Info,
} from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav } from '@/components/layout';

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
    description: 'System notification settings',
    icon: Bell,
    href: '/more#preferences',
    color: '#f59e0b',
  },
  {
    id: 'data',
    label: 'Data & Storage',
    description: 'Demo data, clear cache',
    icon: Database,
    href: '/more#data',
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
  const { theme } = useUIStore();

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/more"
              className="p-2 -ml-2 press-scale"
              style={{
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Settings size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                  Settings
                </span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  App preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {/* Current Theme Info */}
        <section className="section-sm">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--masters)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Palette size={20} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="type-title-sm">Current Theme</p>
                <p className="type-caption" style={{ textTransform: 'capitalize' }}>
                  {theme || 'outdoor'} mode
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Settings List */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
            Preferences
          </h2>

          <div className="space-y-3">
            {SETTINGS_ITEMS.map((item) => (
              <Link key={item.id} href={item.href} className="match-row">
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: `${item.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <item.icon size={18} style={{ color: item.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500 }}>{item.label}</p>
                  <p className="type-meta">{item.description}</p>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
              </Link>
            ))}
          </div>
        </section>

        {/* App Info */}
        <section className="section-sm">
          <div className="card text-center" style={{ padding: 'var(--space-4)' }}>
            <p
              className="type-overline"
              style={{ color: 'var(--masters)', marginBottom: 'var(--space-2)' }}
            >
              Ryder Cup Tracker
            </p>
            <p className="type-caption">Version 1.0.0</p>
            <p className="type-micro" style={{ marginTop: 'var(--space-2)' }}>
              Made with care for golf trip enthusiasts
            </p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
