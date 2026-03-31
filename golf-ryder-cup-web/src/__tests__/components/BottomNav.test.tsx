/**
 * BottomNav Component Tests
 *
 * Tests for navigation and active states.
 * BottomNav is now rendered once in NavigationShell (layout.tsx)
 * and no longer accepts badges or activeMatchId props.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from '@/components/layout/BottomNav';

// Mock useAccessStore
const mockAccessStore = {
  isCaptainMode: false,
};

vi.mock('@/lib/stores', () => ({
  useAccessStore: () => mockAccessStore,
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/');

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => mockPathname(),
}));

describe('BottomNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/');
    mockAccessStore.isCaptainMode = false;
  });

  describe('Rendering', () => {
    it('renders all navigation items', () => {
      render(<BottomNav />);

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Score')).toBeInTheDocument();
      expect(screen.getByText('Standings')).toBeInTheDocument();
      expect(screen.getByText('Schedule')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('renders with accessible navigation landmark', () => {
      render(<BottomNav />);
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
    });
  });

  describe('Navigation', () => {
    it('navigates to today when Today is clicked', () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText('Today'));
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('navigates to score when Score is clicked', () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText('Score'));
      expect(mockPush).toHaveBeenCalledWith('/score');
    });

    it('navigates to schedule when Schedule is clicked', () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText('Schedule'));
      expect(mockPush).toHaveBeenCalledWith('/schedule');
    });

    it('navigates to standings when Standings is clicked', () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText('Standings'));
      expect(mockPush).toHaveBeenCalledWith('/standings');
    });

    it('navigates to more when More is clicked', () => {
      render(<BottomNav />);
      fireEvent.click(screen.getByText('More'));
      expect(mockPush).toHaveBeenCalledWith('/more');
    });
  });

  describe('Active State', () => {
    it('marks Today as active when on root path', () => {
      mockPathname.mockReturnValue('/');
      render(<BottomNav />);

      const todayButton = screen.getByText('Today').closest('button');
      expect(todayButton).toHaveAttribute('aria-current', 'page');
    });

    it('marks Schedule as active on schedule paths', () => {
      mockPathname.mockReturnValue('/schedule');
      render(<BottomNav />);

      const scheduleButton = screen.getByText('Schedule').closest('button');
      expect(scheduleButton).toHaveAttribute('aria-current', 'page');
    });

    it('marks Score as active on score sub-paths', () => {
      mockPathname.mockReturnValue('/score/match-123');
      render(<BottomNav />);

      const scoreButton = screen.getByText('Score').closest('button');
      expect(scoreButton).toHaveAttribute('aria-current', 'page');
    });

    it('only one item is active at a time', () => {
      mockPathname.mockReturnValue('/standings');
      render(<BottomNav />);

      const activeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-current') === 'page');
      expect(activeButtons).toHaveLength(1);
    });
  });

  describe('Captain Mode Badge', () => {
    it('shows captain badge on More when captain mode is enabled', () => {
      mockAccessStore.isCaptainMode = true;
      render(<BottomNav />);

      const moreButton = screen.getByText('More').closest('button');
      expect(moreButton?.querySelector('svg.w-2\\.5')).toBeInTheDocument();
    });

    it('does not show captain badge when captain mode is disabled', () => {
      mockAccessStore.isCaptainMode = false;
      render(<BottomNav />);

      const moreButton = screen.getByText('More').closest('button');
      expect(moreButton?.querySelector('svg.w-2\\.5')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('all nav items are buttons', () => {
      render(<BottomNav />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('nav buttons have minimum touch target size', () => {
      render(<BottomNav />);
      const buttons = screen.getAllByRole('button');

      buttons.forEach((button) => {
        expect(button).toHaveClass('min-w-[56px]');
        expect(button).toHaveClass('min-h-[56px]');
      });
    });

    it('nav items have accessible aria-current for active state', () => {
      mockPathname.mockReturnValue('/');
      render(<BottomNav />);
      const todayButton = screen.getByText('Today').closest('button');
      expect(todayButton).toHaveAttribute('aria-current', 'page');
    });

    it('nav buttons have focus-visible ring', () => {
      render(<BottomNav />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('focus-visible:outline-none');
      });
    });
  });
});
