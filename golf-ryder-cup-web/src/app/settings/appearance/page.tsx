'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Palette, Moon, Sun, Mountain, Shield, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';
import { cn } from '@/lib/utils';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        checked ? 'bg-masters' : 'bg-surface-200'
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

export default function AppearanceSettingsPage() {
  const router = useRouter();
  const { theme, setTheme, autoTheme, setAutoTheme, accentTheme, setAccentTheme } = useUIStore();

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Appearance"
        subtitle="Theme & display"
        onBack={() => router.push('/settings')}
        icon={<Palette size={16} style={{ color: 'var(--color-accent)' }} />}
      />

      <main className="container-editorial">
        <section className="section">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Palette size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <p className="type-title-sm">Theme</p>
                <p className="type-caption">Choose the look that fits your round.</p>
              </div>
            </div>

            <div className="mt-5" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {(
                [
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'outdoor', label: 'Outdoor', icon: Mountain },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={cn('press-scale', isSelected ? 'btn-premium' : 'btn-ghost')}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: '10px 12px',
                    }}
                  >
                    <Icon size={16} />
                    <span className="type-body-sm" style={{ fontWeight: 650 }}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-sm">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="type-title-sm">Auto Theme</p>
            <p className="type-caption">Switches to dark at night.</p>

            <div
              className="mt-4"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <p className="type-body-sm" style={{ fontWeight: 650 }}>
                  Sunset Mode
                </p>
                <p className="type-caption">Automatically use dark after 7pm.</p>
              </div>
              <Toggle checked={autoTheme} onChange={setAutoTheme} />
            </div>
          </div>
        </section>

        <section className="section-sm">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <p className="type-title-sm">Accent Theme</p>
            <p className="type-caption">Choose your highlight color.</p>

            <div className="mt-5" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {(
                [
                  { value: 'masters', label: 'Masters', color: '#006747' },
                  { value: 'usa', label: 'Team USA', color: '#0047AB' },
                  { value: 'europe', label: 'Team Europe', color: '#8B0000' },
                ] as const
              ).map((option) => {
                const isSelected = accentTheme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccentTheme(option.value)}
                    className={cn('press-scale', isSelected ? 'btn-premium' : 'btn-ghost')}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-2)',
                      padding: '10px 12px',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: option.color,
                        display: 'inline-block',
                      }}
                    />
                    <span className="type-body-sm" style={{ fontWeight: 650 }}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section-sm">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <button
              type="button"
              onClick={() => router.push('/more')}
              className="press-scale"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-3)',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0,103,71,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Shield size={18} style={{ color: 'var(--masters)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p className="type-body-sm" style={{ fontWeight: 650 }}>
                    Back to More
                  </p>
                  <p className="type-caption">Manage account and devices</p>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--ink-secondary)' }} />
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
