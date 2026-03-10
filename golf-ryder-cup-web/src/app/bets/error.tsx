'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle, DollarSign, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BetsError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { feature: 'bets' } });
  }, [error]);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <main className="container-editorial flex min-h-screen items-center py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-[var(--space-4)] lg:grid-cols-[minmax(0,1.12fr)_18rem]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,240,241,0.99))] p-[var(--space-6)] shadow-[0_26px_54px_rgba(46,34,18,0.08)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[color:var(--error)]/10 text-[var(--error)]">
              <AlertTriangle size={24} />
            </div>

            <p className="mt-[var(--space-4)] type-overline tracking-[0.18em] text-[var(--maroon)]">
              Bets Board Interrupted
            </p>
            <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
              The side games room lost the board for a moment.
            </h1>
            <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
              Something went wrong while loading the bets view. The wager data should still be intact.
              This page just needs a cleaner route back into the room.
            </p>

            <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
              <Button variant="primary" leftIcon={<RefreshCw size={16} />} onClick={reset}>
                Try again
              </Button>
              <Link
                href="/bets"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:bg-[var(--surface)]"
              >
                Return to bets
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/65 bg-transparent px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink-secondary)] transition-transform duration-150 hover:scale-[1.02] hover:bg-[color:var(--surface)]/7 hover:text-[var(--ink)]"
              >
                Go home
              </Link>
            </div>

            {process.env.NODE_ENV === 'development' ? (
              <details className="mt-[var(--space-5)] overflow-hidden rounded-[1.5rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72">
                <summary className="cursor-pointer px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink-secondary)]">
                  Error details
                </summary>
                <pre className="overflow-auto border-t border-[color:var(--rule)]/60 px-[var(--space-4)] py-[var(--space-4)] text-xs leading-6 text-[var(--ink-tertiary)]">
                  {error.message}
                </pre>
              </details>
            ) : null}
          </section>

          <aside className="space-y-[var(--space-4)]">
            <div className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--maroon)]">
                <DollarSign size={18} />
              </div>
              <h2 className="mt-[var(--space-3)] text-lg font-semibold text-[var(--ink)]">
                Ledger note
              </h2>
              <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                Betting views break trust quickly when they feel provisional. That is why this route logs to Sentry automatically.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
              <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
                <Home size={16} />
                <span className="type-overline tracking-[0.15em]">Fallback</span>
              </div>
              <p className="mt-[var(--space-3)] text-sm leading-6 text-[var(--ink-secondary)]">
                Home is still the safest reset point if the games room refuses to settle.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
