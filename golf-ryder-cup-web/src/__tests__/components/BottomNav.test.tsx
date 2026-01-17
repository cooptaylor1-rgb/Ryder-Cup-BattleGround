/**
 * BottomNav Component Tests
 *
 * Tests for navigation, badge display, and active states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav, NavBadges } from '@/components/layout/BottomNav';

// Mock useUIStore
const mockUIStore = {
    isCaptainMode: false,
};

vi.mock('@/lib/stores', () => ({
    useUIStore: () => mockUIStore,
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
        mockUIStore.isCaptainMode = false;
    });

    describe('Rendering', () => {
        it('renders all navigation items', () => {
            render(<BottomNav />);

            expect(screen.getByText('Home')).toBeInTheDocument();
            expect(screen.getByText('Schedule')).toBeInTheDocument();
            expect(screen.getByText('Score')).toBeInTheDocument();
            expect(screen.getByText('Stats')).toBeInTheDocument();
            expect(screen.getByText('Standings')).toBeInTheDocument();
            expect(screen.getByText('More')).toBeInTheDocument();
        });

        it('renders with accessible navigation landmark', () => {
            render(<BottomNav />);
            expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
        });
    });

    describe('Navigation', () => {
        it('navigates to home when Home is clicked', () => {
            render(<BottomNav />);
            fireEvent.click(screen.getByText('Home'));
            expect(mockPush).toHaveBeenCalledWith('/');
        });

        it('navigates to schedule when Schedule is clicked', () => {
            render(<BottomNav />);
            fireEvent.click(screen.getByText('Schedule'));
            expect(mockPush).toHaveBeenCalledWith('/schedule');
        });

        it('navigates to score when Score is clicked', () => {
            render(<BottomNav />);
            fireEvent.click(screen.getByText('Score'));
            expect(mockPush).toHaveBeenCalledWith('/score');
        });

        it('navigates to trip-stats when Stats is clicked', () => {
            render(<BottomNav />);
            fireEvent.click(screen.getByText('Stats'));
            expect(mockPush).toHaveBeenCalledWith('/trip-stats');
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
        it('marks Home as active when on root path', () => {
            mockPathname.mockReturnValue('/');
            render(<BottomNav />);

            const homeButton = screen.getByText('Home').closest('button');
            expect(homeButton).toHaveAttribute('aria-current', 'page');
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

            const activeButtons = screen.getAllByRole('button').filter(
                btn => btn.getAttribute('aria-current') === 'page'
            );
            expect(activeButtons).toHaveLength(1);
        });
    });

    describe('Badge Display', () => {
        it('displays badge count for home', () => {
            const badges: NavBadges = { home: 3 };
            render(<BottomNav badges={badges} />);

            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('displays badge count for schedule', () => {
            const badges: NavBadges = { schedule: 5 };
            render(<BottomNav badges={badges} />);

            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('displays multiple badges', () => {
            const badges: NavBadges = { home: 2, score: 1, standings: 4 };
            render(<BottomNav badges={badges} />);

            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument();
        });

        it('does not display badge when count is 0', () => {
            const badges: NavBadges = { home: 0 };
            render(<BottomNav badges={badges} />);

            expect(screen.queryByText('0')).not.toBeInTheDocument();
        });

        it('caps badge display at 99+', () => {
            const badges: NavBadges = { home: 150 };
            render(<BottomNav badges={badges} />);

            expect(screen.getByText('99+')).toBeInTheDocument();
        });

        it('badge has accessible label', () => {
            const badges: NavBadges = { home: 5 };
            render(<BottomNav badges={badges} />);

            expect(screen.getByLabelText('5 notifications')).toBeInTheDocument();
        });
    });

    describe('Captain Mode Badge', () => {
        it('shows captain badge on More when captain mode is enabled', () => {
            mockUIStore.isCaptainMode = true;
            render(<BottomNav />);

            // The Shield icon should be present
            const moreButton = screen.getByText('More').closest('button');
            expect(moreButton?.querySelector('svg.w-2\\.5')).toBeInTheDocument();
        });

        it('does not show captain badge when captain mode is disabled', () => {
            mockUIStore.isCaptainMode = false;
            render(<BottomNav />);

            // The Shield icon should not be present (only 6 nav icons)
            const moreButton = screen.getByText('More').closest('button');
            expect(moreButton?.querySelector('svg.w-2\\.5')).not.toBeInTheDocument();
        });

        it('shows notification badge instead of captain badge when both apply', () => {
            mockUIStore.isCaptainMode = true;
            const badges: NavBadges = { more: 3 };
            render(<BottomNav badges={badges} />);

            // Should show the number badge, not the captain shield
            expect(screen.getByText('3')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('all nav items are buttons', () => {
            render(<BottomNav />);
            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(6);
        });

        it('buttons have minimum touch target size', () => {
            render(<BottomNav />);
            const buttons = screen.getAllByRole('button');

            buttons.forEach(button => {
                expect(button).toHaveClass('min-w-[56px]');
                expect(button).toHaveClass('min-h-[56px]');
            });
        });
    });
});
