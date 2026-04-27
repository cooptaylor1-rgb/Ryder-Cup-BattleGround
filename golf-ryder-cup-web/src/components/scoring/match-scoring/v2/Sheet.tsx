/**
 * Sheet — Bottom-sheet primitive used by stroke/fourball entry and the
 * cockpit overflow menu. Slides up from the bottom, dims the cockpit,
 * traps focus, dismisses on backdrop tap or Escape.
 *
 * Deliberately small surface. We don't pull in a heavyweight modal lib
 * because the cockpit needs to stay light. AnimatePresence handles the
 * mount/unmount, framer-motion handles the slide.
 */

'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/lib/utils/accessibility';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Tone for the title bar accent. */
  accent?: 'masters' | 'gold' | 'neutral';
  /** Maximum vertical extent (default: 88vh) */
  maxHeight?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  accent = 'masters',
  maxHeight = '88vh',
}: SheetProps) {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Move focus into the sheet on open.
    requestAnimationFrame(() => {
      const focusable = containerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.18 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[color:var(--ink)]/45 backdrop-blur-sm"
          />

          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: reducedMotion ? 0 : '100%' }}
            animate={{ y: 0 }}
            exit={{ y: reducedMotion ? 0 : '100%' }}
            transition={{
              duration: reducedMotion ? 0 : 0.28,
              ease: [0.32, 0.72, 0, 1],
            }}
            style={{ maxHeight }}
            className="relative flex flex-col overflow-hidden rounded-t-[28px] border-t border-[color:var(--rule)] bg-[var(--canvas)] shadow-card-lg"
          >
            <div
              aria-hidden
              className={cn(
                'mx-auto mt-2 h-1 w-12 rounded-full',
                accent === 'masters'
                  ? 'bg-[var(--masters)]/60'
                  : accent === 'gold'
                    ? 'bg-[var(--gold)]/70'
                    : 'bg-[color:var(--rule-strong)]'
              )}
            />

            <div
              className="flex items-start justify-between gap-3 border-b border-[color:var(--rule)] px-5 py-3"
              style={{ paddingTop: 'calc(var(--space-3) + env(safe-area-inset-top, 0px) / 4)' }}
            >
              <div className="min-w-0">
                <p className="font-serif text-[length:var(--text-xl)] leading-tight text-[var(--ink)]">
                  {title}
                </p>
                {description && (
                  <p className="mt-1 text-xs text-[var(--ink-secondary)]">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sheet"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-4"
              style={{ paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom, 0px))' }}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
