/**
 * useCockpitShortcuts — Desktop keyboard shortcuts for the scoring cockpit.
 *
 * Power users want speed. The on-screen ScoreInputPanel already handles
 * a/A and b/B and ←/→ when focused; this hook adds *global* page-level
 * shortcuts that work regardless of focus:
 *
 *   p / [        previous hole
 *   n / ]        next hole
 *   1-9          jump to that hole on the front 9
 *   0            jump to hole 10
 *   Shift+1-9    jump to that hole on the back 9 (10-18)
 *   u            undo
 *   s            open scorecard
 *   ?            shortcut overlay (handled at app level)
 *
 * Disabled when the user is typing in any input/textarea/contenteditable.
 */

import { useEffect } from 'react';

interface ShortcutHandlers {
  onPrevHole: () => void;
  onNextHole: () => void;
  onJumpToHole: (hole: number) => void;
  onUndo: () => void;
  onOpenScorecard: () => void;
}

export function useCockpitShortcuts({
  onPrevHole,
  onNextHole,
  onJumpToHole,
  onUndo,
  onOpenScorecard,
}: ShortcutHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      ) {
        return;
      }
      // Don't hijack modifier shortcuts the OS owns.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'p':
        case 'P':
        case '[':
          e.preventDefault();
          onPrevHole();
          return;
        case 'n':
        case 'N':
        case ']':
          e.preventDefault();
          onNextHole();
          return;
        case 'u':
        case 'U':
          e.preventDefault();
          onUndo();
          return;
        case 's':
        case 'S':
          e.preventDefault();
          onOpenScorecard();
          return;
      }

      // Numbers — front nine on plain keys, back nine on shift.
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const hole = parseInt(e.key, 10);
        if (e.shiftKey) onJumpToHole(hole + 9);
        else onJumpToHole(hole);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        onJumpToHole(10);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrevHole, onNextHole, onJumpToHole, onUndo, onOpenScorecard]);
}
