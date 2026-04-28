/**
 * ScoreInputPanel — locked / armed / commit behaviour.
 *
 * The cockpit's score-entry panel is the *one* place a scorer
 * commits a hole result. Once a hole is recorded, an accidental
 * tap should not silently overwrite it. These tests pin the
 * two-tap-to-change gate that protects against that:
 *
 *   • Tapping the already-recorded option is a no-op (no commit).
 *   • Tapping a different option arms a pending change but does
 *     not commit.
 *   • Tapping the same armed option a second time commits.
 *
 * On a fresh hole (no existing result) the gate is off and a
 * single tap commits — that path stays covered too.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ScoreInputPanel } from '@/components/scoring/match-scoring/v2/ScoreInputPanel';

// framer-motion: render plain divs and skip the motion-value plumbing.
// The test cares about the click-flow contract, not the gesture overlay.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onPanEnd: _onPanEnd,
      ...props
    }: React.PropsWithChildren<{
      style?: object;
      className?: string;
      drag?: unknown;
      dragConstraints?: unknown;
      dragElastic?: unknown;
      onPanEnd?: unknown;
    }>) => <div {...props}>{children}</div>,
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn(), on: () => vi.fn() }),
  useTransform: () => 0,
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('@/lib/hooks', () => ({
  useHaptic: () => ({
    tap: vi.fn(),
    select: vi.fn(),
    scorePoint: vi.fn(),
    warning: vi.fn(),
    impact: vi.fn(),
    trigger: vi.fn(),
    triggerWithVisual: vi.fn(),
    applyVisualFeedback: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/useSwipeBackProtection', () => ({
  useSwipeBackProtection: vi.fn(),
}));

const defaultProps = {
  teamAName: 'Magic City Mulligans',
  teamBName: 'Delco Divots',
  teamAColor: '#1E3A5F',
  teamBColor: '#722F37',
  onScore: vi.fn(),
};

describe('ScoreInputPanel — fresh hole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('commits a single tap when no result is recorded', () => {
    const onScore = vi.fn();
    render(<ScoreInputPanel {...defaultProps} onScore={onScore} />);

    const teamABtn = screen.getByRole('button', {
      name: /Magic City Mulligans wins this hole/i,
    });
    fireEvent.click(teamABtn);
    act(() => {
      vi.runAllTimers();
    });

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith('teamA');
  });
});

describe('ScoreInputPanel — already recorded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('does not commit when the recorded winner is tapped again', () => {
    const onScore = vi.fn();
    render(
      <ScoreInputPanel {...defaultProps} existingResult="teamA" onScore={onScore} />
    );

    const teamABtn = screen.getByRole('button', {
      name: /Magic City Mulligans wins this hole/i,
    });
    fireEvent.click(teamABtn);
    act(() => {
      vi.runAllTimers();
    });

    expect(onScore).not.toHaveBeenCalled();
  });

  it('arms a pending change on the first tap of a different winner', () => {
    const onScore = vi.fn();
    render(
      <ScoreInputPanel {...defaultProps} existingResult="teamA" onScore={onScore} />
    );

    const teamBBtn = screen.getByRole('button', {
      name: /Delco Divots wins this hole/i,
    });
    fireEvent.click(teamBBtn);

    expect(onScore).not.toHaveBeenCalled();
    // The panel surfaces the pending change in a polite live region
    // so screen readers announce it.
    expect(
      screen.getByText(/Tap Delco Divots again to change/i)
    ).toBeInTheDocument();
  });

  it('commits on the second tap of the armed winner', () => {
    const onScore = vi.fn();
    render(
      <ScoreInputPanel {...defaultProps} existingResult="teamA" onScore={onScore} />
    );

    const teamBBtn = screen.getByRole('button', {
      name: /Delco Divots wins this hole/i,
    });
    fireEvent.click(teamBBtn);
    // Skip the 250ms tap-debounce window before the second tap.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    fireEvent.click(teamBBtn);
    act(() => {
      vi.runAllTimers();
    });

    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith('teamB');
  });

  it('disarms the pending change after 3 seconds with no second tap', () => {
    const onScore = vi.fn();
    render(
      <ScoreInputPanel {...defaultProps} existingResult="teamA" onScore={onScore} />
    );

    const teamBBtn = screen.getByRole('button', {
      name: /Delco Divots wins this hole/i,
    });
    fireEvent.click(teamBBtn);
    expect(screen.queryByText(/Tap Delco Divots again/i)).toBeInTheDocument();

    // Advance past the 3s auto-disarm window.
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByText(/Tap Delco Divots again/i)).not.toBeInTheDocument();
    expect(onScore).not.toHaveBeenCalled();
  });

  it('switches the armed target if the user taps a different option mid-arm', () => {
    const onScore = vi.fn();
    render(
      <ScoreInputPanel {...defaultProps} existingResult="teamA" onScore={onScore} />
    );

    const teamBBtn = screen.getByRole('button', {
      name: /Delco Divots wins this hole/i,
    });
    const halveBtn = screen.getByRole('button', { name: /Halve this hole/i });

    fireEvent.click(teamBBtn);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Switch the armed target before the 3s window expires.
    fireEvent.click(halveBtn);

    expect(onScore).not.toHaveBeenCalled();
    expect(screen.queryByText(/Tap Halved again/i)).toBeInTheDocument();
  });
});
