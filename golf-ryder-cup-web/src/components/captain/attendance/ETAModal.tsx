/**
 * A modal dialog for picking an estimated arrival time for a player.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import type { AttendeePlayer } from './attendanceTypes';
import { ETA_OPTIONS } from './attendanceTypes';

interface ETAModalProps {
  player: AttendeePlayer;
  onSetETA: (eta: string) => void;
  onClose: () => void;
}

export function ETAModal({ player, onSetETA, onClose }: ETAModalProps) {
  const [customETA, setCustomETA] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[color:var(--ink)]/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close ETA picker"
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
      >
        <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div className="flex gap-[var(--space-3)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Arrival Window</p>
                <h3 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic leading-none text-[var(--ink)]">
                  {player.firstName} {player.lastName}
                </h3>
                <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                  Pick the cleanest estimate instead of writing a captain&apos;s note to yourself.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)]">
          <div className="grid gap-2 sm:grid-cols-2">
            {ETA_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSetETA(option.value)}
                className="rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 px-[var(--space-4)] py-[var(--space-3)] text-left text-sm font-semibold text-[var(--ink)] transition-all hover:border-[var(--maroon-subtle)] hover:bg-[color:var(--surface)]"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="rounded-[1.25rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)]">
            <label className="block text-sm font-semibold text-[var(--ink)]">Custom arrival note</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customETA}
                onChange={(event) => setCustomETA(event.target.value)}
                placeholder="e.g. 8:45 AM at the lot"
                className="flex-1 rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/88 px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customETA.trim()) onSetETA(customETA.trim());
                }}
                disabled={!customETA.trim()}
                className="rounded-xl bg-[var(--maroon)] px-[var(--space-4)] py-3 text-sm font-semibold text-[var(--canvas)] transition-all disabled:cursor-not-allowed disabled:opacity-45"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
