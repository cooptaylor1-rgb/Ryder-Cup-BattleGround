import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HoleMiniMap } from '@/components/scoring/HoleMiniMap';
import type { HoleResult } from '@/lib/types/models';

vi.mock('framer-motion', () => ({
  motion: {
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span {...props}>{children}</span>
    ),
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

const haptic = {
  select: vi.fn(),
  tap: vi.fn(),
};

vi.mock('@/lib/hooks', () => ({
  useHaptic: () => haptic,
}));

const holeResults: HoleResult[] = [
  {
    id: 'hole-1',
    matchId: 'match-1',
    holeNumber: 1,
    winner: 'teamA',
    timestamp: '2026-04-26T12:00:00.000Z',
  },
  {
    id: 'hole-2',
    matchId: 'match-1',
    holeNumber: 2,
    winner: 'teamB',
    timestamp: '2026-04-26T12:01:00.000Z',
  },
];

describe('HoleMiniMap', () => {
  it('uses valid color-mix styles when default team CSS variables are used', () => {
    render(<HoleMiniMap currentHole={3} holeResults={holeResults} onHoleSelect={vi.fn()} />);

    const teamAHole = screen.getByRole('button', { name: 'Go to hole 1, teamA' });
    const teamBHole = screen.getByRole('button', { name: 'Go to hole 2, teamB' });

    expect(teamAHole.getAttribute('style')).toContain(
      'color-mix(in srgb, var(--team-usa) 10%, transparent)'
    );
    expect(teamAHole.getAttribute('style')).toContain(
      'color-mix(in srgb, var(--team-usa) 20%, transparent)'
    );
    expect(teamBHole.getAttribute('style')).toContain(
      'color-mix(in srgb, var(--team-europe) 10%, transparent)'
    );
    expect(teamBHole.getAttribute('style')).toContain(
      'color-mix(in srgb, var(--team-europe) 20%, transparent)'
    );
  });

  it('keeps compact hole buttons large enough for mobile taps', () => {
    render(<HoleMiniMap currentHole={3} holeResults={[]} onHoleSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Go to hole 3, current hole' })).toHaveClass(
      'h-11',
      'w-11'
    );
  });

  it('selects holes from the compact card', () => {
    const onHoleSelect = vi.fn();
    render(<HoleMiniMap currentHole={3} holeResults={[]} onHoleSelect={onHoleSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to hole 4' }));

    expect(haptic.select).toHaveBeenCalled();
    expect(onHoleSelect).toHaveBeenCalledWith(4);
  });
});
