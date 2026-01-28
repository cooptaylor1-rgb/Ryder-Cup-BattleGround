/**
 * SwipeScorePanel Component Tests
 *
 * Tests for tap interactions, disabled states, and accessibility buttons.
 * Note: Swipe/drag gestures are tested via tap fallback buttons.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeScorePanel } from '@/components/scoring/SwipeScorePanel';
// HoleWinner type is used implicitly in the mock data

// Mock framer-motion to simplify testing
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<{ style?: object; className?: string }>) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: () => ({ get: () => 0, set: vi.fn(), on: () => vi.fn() }),
  useTransform: () => 0,
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// Mock haptic hook with all methods used by SwipeScorePanel
vi.mock('@/lib/hooks', () => ({
  useHaptic: () => ({
    tap: vi.fn(),
    select: vi.fn(),
    scorePoint: vi.fn(),
    impact: vi.fn(),
    trigger: vi.fn(),
    triggerWithVisual: vi.fn(),
    applyVisualFeedback: vi.fn(),
  }),
}));

// Mock swipe back protection hook
vi.mock('@/lib/hooks/useSwipeBackProtection', () => ({
  useSwipeBackProtection: vi.fn(),
}));

describe('SwipeScorePanel Component', () => {
  const defaultProps = {
    holeNumber: 5,
    teamAName: 'Team USA',
    teamBName: 'Team Europe',
    currentScore: 0,
    onScore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders hole number', () => {
      render(<SwipeScorePanel {...defaultProps} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Hole')).toBeInTheDocument();
    });

    it('renders team names on buttons', () => {
      render(<SwipeScorePanel {...defaultProps} />);
      expect(screen.getByText('Team USA')).toBeInTheDocument();
      expect(screen.getByText('Team Europe')).toBeInTheDocument();
    });

    it('renders halved button', () => {
      render(<SwipeScorePanel {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Hole halved' })).toBeInTheDocument();
    });

    it('renders custom team names', () => {
      render(<SwipeScorePanel {...defaultProps} teamAName="Eagles" teamBName="Hawks" />);
      expect(screen.getByText('Eagles')).toBeInTheDocument();
      expect(screen.getByText('Hawks')).toBeInTheDocument();
    });
  });

  describe('Score Display', () => {
    it('displays "AS" when score is 0 (all square)', () => {
      render(<SwipeScorePanel {...defaultProps} currentScore={0} />);
      expect(screen.getByText('AS')).toBeInTheDocument();
    });

    it('displays team A leading when score is positive', () => {
      render(<SwipeScorePanel {...defaultProps} currentScore={2} />);
      expect(screen.getByText('Team USA 2UP')).toBeInTheDocument();
    });

    it('displays team B leading when score is negative', () => {
      render(<SwipeScorePanel {...defaultProps} currentScore={-3} />);
      expect(screen.getByText('Team Europe 3UP')).toBeInTheDocument();
    });

    it('displays 1UP correctly', () => {
      render(<SwipeScorePanel {...defaultProps} currentScore={1} />);
      expect(screen.getByText('Team USA 1UP')).toBeInTheDocument();
    });
  });

  describe('Tap Buttons (Accessibility Fallback)', () => {
    it('calls onScore with teamA when Team A button is clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} />);

      fireEvent.click(screen.getByRole('button', { name: 'Team USA wins hole' }));
      expect(onScore).toHaveBeenCalledWith('teamA');
    });

    it('calls onScore with teamB when Team B button is clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} />);

      fireEvent.click(screen.getByRole('button', { name: 'Team Europe wins hole' }));
      expect(onScore).toHaveBeenCalledWith('teamB');
    });

    it('calls onScore with halved when Halved button is clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} />);

      fireEvent.click(screen.getByRole('button', { name: 'Hole halved' }));
      expect(onScore).toHaveBeenCalledWith('halved');
    });
  });

  describe('Disabled State', () => {
    it('does not call onScore when disabled and Team A clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} disabled />);

      fireEvent.click(screen.getByRole('button', { name: 'Team USA wins hole' }));
      expect(onScore).not.toHaveBeenCalled();
    });

    it('does not call onScore when disabled and Team B clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} disabled />);

      fireEvent.click(screen.getByRole('button', { name: 'Team Europe wins hole' }));
      expect(onScore).not.toHaveBeenCalled();
    });

    it('does not call onScore when disabled and Halved clicked', () => {
      const onScore = vi.fn();
      render(<SwipeScorePanel {...defaultProps} onScore={onScore} disabled />);

      fireEvent.click(screen.getByRole('button', { name: 'Hole halved' }));
      expect(onScore).not.toHaveBeenCalled();
    });

    it('disables all buttons when disabled prop is true', () => {
      render(<SwipeScorePanel {...defaultProps} disabled />);

      expect(screen.getByRole('button', { name: 'Team USA wins hole' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Team Europe wins hole' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Hole halved' })).toBeDisabled();
    });
  });

  describe('Existing Result Indicator', () => {
    it('shows checkmark when existingResult is teamA', () => {
      render(<SwipeScorePanel {...defaultProps} existingResult="teamA" />);
      // Check icon should be visible
      const checkContainer = document.querySelector('.w-8.h-8.rounded-full');
      expect(checkContainer).toBeInTheDocument();
    });

    it('shows checkmark when existingResult is teamB', () => {
      render(<SwipeScorePanel {...defaultProps} existingResult="teamB" />);
      const checkContainer = document.querySelector('.w-8.h-8.rounded-full');
      expect(checkContainer).toBeInTheDocument();
    });

    it('shows checkmark when existingResult is halved', () => {
      render(<SwipeScorePanel {...defaultProps} existingResult="halved" />);
      const checkContainer = document.querySelector('.w-8.h-8.rounded-full');
      expect(checkContainer).toBeInTheDocument();
    });

    it('does not show checkmark when existingResult is none', () => {
      render(<SwipeScorePanel {...defaultProps} existingResult="none" />);
      // Should not find the check indicator (it's in a specific position)
      const checkContainer = document.querySelector('.absolute.top-4.right-4 .w-8.h-8');
      expect(checkContainer).not.toBeInTheDocument();
    });

    it('does not show checkmark when no existingResult', () => {
      render(<SwipeScorePanel {...defaultProps} />);
      const checkContainer = document.querySelector('.absolute.top-4.right-4 .w-8.h-8');
      expect(checkContainer).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('all tap buttons have proper aria-labels', () => {
      render(<SwipeScorePanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Team USA wins hole' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Team Europe wins hole' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hole halved' })).toBeInTheDocument();
    });

    it('aria-labels use custom team names', () => {
      render(<SwipeScorePanel {...defaultProps} teamAName="Eagles" teamBName="Hawks" />);

      expect(screen.getByRole('button', { name: 'Eagles wins hole' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Hawks wins hole' })).toBeInTheDocument();
    });
  });

  describe('Different Hole Numbers', () => {
    it('displays hole 1', () => {
      render(<SwipeScorePanel {...defaultProps} holeNumber={1} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('displays hole 18', () => {
      render(<SwipeScorePanel {...defaultProps} holeNumber={18} />);
      expect(screen.getByText('18')).toBeInTheDocument();
    });
  });

  describe('Custom Colors', () => {
    it('accepts custom team colors', () => {
      render(<SwipeScorePanel {...defaultProps} teamAColor="#FF0000" teamBColor="#00FF00" />);

      // Component should render without errors
      expect(screen.getByText('Team USA')).toBeInTheDocument();
      expect(screen.getByText('Team Europe')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(<SwipeScorePanel {...defaultProps} className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
