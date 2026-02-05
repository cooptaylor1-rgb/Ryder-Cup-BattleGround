'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Palette, Moon, Sun, Mountain, Shield, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/lib/stores';
import { BottomNav } from '@/components/layout';
import { cn } from '@/lib/utils';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-12 h-7 rounded-full transition-colors',
        checked ? 'bg-augusta-green' : 'bg-gray-300'
      )}
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
  const { theme, setTheme, autoTheme, setAutoTheme, accentTheme, setAccentTheme } = useUIStore();

  return (
    <div className="min-h-screen pb-nav bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/settings" className="p-2 -m-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">Appearance</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-augusta-green" />
              Theme
            </h2>
            <p className="text-sm text-gray-500 mt-1">Choose the look that fits your round.</p>
          </div>
          <div className="p-4 flex gap-2">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'outdoor', label: 'Outdoor', icon: Mountain },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex-1 py-3 px-3 rounded-lg font-medium transition-colors border-2 text-sm flex items-center justify-center gap-2',
                    theme === option.value
                      ? 'border-augusta-green bg-augusta-green/5 text-augusta-green'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Auto Theme</h2>
            <p className="text-sm text-gray-500 mt-1">Switches to dark at night.</p>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Sunset Mode</p>
              <p className="text-sm text-gray-500">Automatically use dark after 7pm.</p>
            </div>
            <Toggle checked={autoTheme} onChange={setAutoTheme} />
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Accent Theme</h2>
            <p className="text-sm text-gray-500 mt-1">Choose your highlight color.</p>
          </div>
          <div className="p-4 flex gap-2">
            {(
              [
                { value: 'masters', label: 'Masters', color: '#006747' },
                { value: 'usa', label: 'Team USA', color: '#0047AB' },
                { value: 'europe', label: 'Team Europe', color: '#8B0000' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setAccentTheme(option.value)}
                className={cn(
                  'flex-1 py-3 px-3 rounded-lg font-medium transition-colors border-2 text-sm flex items-center justify-center gap-2',
                  accentTheme === option.value
                    ? 'border-augusta-green bg-augusta-green/5 text-augusta-green'
                    : 'border-gray-200 bg-gray-50 text-gray-600'
                )}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: option.color }} />
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm overflow-hidden">
          <Link
            href="/more"
            className="flex items-center justify-between p-4 text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-augusta-green" />
              <div>
                <div className="font-medium">Back to More</div>
                <div className="text-sm text-gray-500">Manage account and devices</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
