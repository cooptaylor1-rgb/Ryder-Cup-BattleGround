'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Database, HelpCircle, Palette, Settings, Target, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'green' | 'maroon' | 'gold' | 'ink';
}

const SETTING_ITEMS: SettingItem[] = [
  {
    id: 'scoring',
    label: 'Scoring rules',
    description: 'Point values, behavior, and round logic for the cup.',
    href: '/settings/scoring',
    icon: Target,
    tone: 'green',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, outdoor readability, and display polish.',
    href: '/settings/appearance',
    icon: Palette,
    tone: 'maroon',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Reminders, score alerts, and subtle interruption control.',
    href: '/settings/notifications',
    icon: Bell,
    tone: 'gold',
  },
  {
    id: 'backup',
    label: 'Backup and restore',
    description: 'Export trip data and protect the weekend from one bad device.',
    href: '/settings/backup',
    icon: Database,
    tone: 'ink',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme } = useUIStore(useShallow(s => ({ theme: s.theme })));

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Settings"
        subtitle="Device and app preferences"
        icon={<Settings size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
        onBack={() => router.push('/more')}
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<HelpCircle size={14} />} onClick={() => router.push('/help')}>
            Help
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] text-[var(--canvas)] shadow-[0_28px_64px_rgba(5,58,35,0.22)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/72">
                Utility Room
              </p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--canvas)]">
                Tune the app like it actually matters on the course.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                These are the controls that decide whether the app feels calm in a pocket, clear in
                bright sun, and trustworthy when the trip starts moving quickly.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button
                  variant="secondary"
                  className="border-[color:var(--canvas)]/16 bg-[var(--canvas)] text-[var(--masters)] hover:bg-[color:var(--canvas)]/92"
                  leftIcon={<Palette size={16} />}
                  onClick={() => router.push('/settings/appearance')}
                >
                  Adjust appearance
                </Button>
                <Button
                  variant="outline"
                  className="border-[color:var(--canvas)]/20 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
                  leftIcon={<Database size={16} />}
                  onClick={() => router.push('/settings/backup')}
                >
                  Open backups
                </Button>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <SettingsFactCard label="Current theme" value={(theme || 'outdoor').replace(/^\w/, (char) => char.toUpperCase())} detail="The visual mode your device is using now." />
              <SettingsFactCard label="Core controls" value={SETTING_ITEMS.length} detail="The four rooms that matter most on a golf trip." />
              <SettingsFactCard label="Support path" value="Help" detail="Open help for setup, scoring, and app questions." valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)]">
          <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_20px_44px_rgba(41,29,17,0.08)]">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Preference Boards</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                Choose the settings you need.
              </h2>
              <p className="mt-[var(--space-2)] max-w-[34rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Scoring, appearance, notifications, and backups all live here.
              </p>
            </div>

            <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] md:grid-cols-2">
              {SETTING_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="group rounded-[1.6rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)] shadow-[0_14px_32px_rgba(41,29,17,0.05)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--masters)]/24 hover:bg-[var(--surface)]"
                >
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', getToneClassName(item.tone))}>
                    <item.icon size={18} />
                  </div>
                  <h3 className="mt-[var(--space-3)] text-base font-semibold text-[var(--ink)]">
                    {item.label}
                  </h3>
                  <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                    {item.description}
                  </p>
                  <p className="mt-[var(--space-4)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)] transition-colors group-hover:text-[var(--masters)]">
                    Open setting
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SettingsFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
      <p className="type-overline tracking-[0.14em] text-[color:var(--canvas)]/72">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

function getToneClassName(tone: SettingItem['tone']) {
  switch (tone) {
    case 'green':
      return 'bg-[color:var(--masters)]/12 text-[var(--masters)]';
    case 'maroon':
      return 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]';
    case 'gold':
      return 'bg-[color:var(--warning)]/12 text-[var(--warning)]';
    default:
      return 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]';
  }
}
