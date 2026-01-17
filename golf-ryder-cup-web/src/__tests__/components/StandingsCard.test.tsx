/**
 * StandingsCard Component Tests
 *
 * Tests for score display, progress bars, magic number, and animations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StandingsCard } from '@/components/ui/StandingsCard';
import type { TeamStandings, MagicNumber } from '@/lib/types/computed';

describe('StandingsCard Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const defaultStandings: TeamStandings = {
        teamAPoints: 8,
        teamBPoints: 6,
        matchesCompleted: 10,
        totalMatches: 28,
        matchesPlayed: 10,
        matchesRemaining: 18,
        remainingMatches: 18,
        leader: 'teamA',
        margin: 2,
    };

    const defaultMagicNumber: MagicNumber = {
        teamA: 6.5,
        teamB: 8.5,
        teamANeeded: 7.5,
        teamBNeeded: 9.5,
        teamAClinched: false,
        teamBClinched: false,
        pointsToWin: 14.5,
        hasClinched: false,
    };

    describe('Rendering', () => {
        it('renders tournament standings header', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('Tournament Standings')).toBeInTheDocument();
        });

        it('renders match completion status', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('10 of 28 matches complete')).toBeInTheDocument();
        });

        it('renders default team names', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getAllByText('Team USA').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Team Europe').length).toBeGreaterThan(0);
        });

        it('renders custom team names', () => {
            render(
                <StandingsCard
                    standings={defaultStandings}
                    magicNumber={defaultMagicNumber}
                    teamAName="Eagles"
                    teamBName="Hawks"
                />
            );
            expect(screen.getAllByText('Eagles').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Hawks').length).toBeGreaterThan(0);
        });
    });

    describe('Score Display', () => {
        it('displays team scores after animation', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);

            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(screen.getByText('8')).toBeInTheDocument();
            expect(screen.getByText('6')).toBeInTheDocument();
        });

        it('displays half point scores correctly', () => {
            const standings = { ...defaultStandings, teamAPoints: 10.5, teamBPoints: 5.5 };
            render(<StandingsCard standings={standings} magicNumber={defaultMagicNumber} />);

            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(screen.getAllByText('10.5').length).toBeGreaterThan(0);
            expect(screen.getAllByText('5.5').length).toBeGreaterThan(0);
        });

        it('shows leader indicator for winning team', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('leads')).toBeInTheDocument();
        });

        it('shows margin when there is a leader', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('+2')).toBeInTheDocument();
        });

        it('shows "Tied" when no leader', () => {
            const tiedStandings = { ...defaultStandings, leader: null, margin: 0 };
            render(<StandingsCard standings={tiedStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('Tied')).toBeInTheDocument();
        });
    });

    describe('Progress Bars', () => {
        it('displays progress towards victory', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getAllByText(/\/14\.5 to win/).length).toBe(2);
        });
    });

    describe('Magic Number Section', () => {
        it('displays "Points to Clinch" section', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('Points to Clinch')).toBeInTheDocument();
        });

        it('displays points needed for each team', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('7.5')).toBeInTheDocument();
            expect(screen.getByText('9.5')).toBeInTheDocument();
        });

        it('displays "needs" label for each team', () => {
            render(<StandingsCard standings={defaultStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('Team USA needs')).toBeInTheDocument();
            expect(screen.getByText('Team Europe needs')).toBeInTheDocument();
        });

        it('shows checkmark when team has clinched', () => {
            const clinchedMagicNumber = { ...defaultMagicNumber, teamAClinched: true };
            render(<StandingsCard standings={defaultStandings} magicNumber={clinchedMagicNumber} />);

            expect(screen.getByText('✓')).toBeInTheDocument();
            expect(screen.getByText('Clinched!')).toBeInTheDocument();
        });

        it('shows clinched for both teams if both clinched', () => {
            const bothClinched = {
                ...defaultMagicNumber,
                teamAClinched: true,
                teamBClinched: true
            };
            render(<StandingsCard standings={defaultStandings} magicNumber={bothClinched} />);

            expect(screen.getAllByText('✓').length).toBe(2);
            expect(screen.getAllByText('Clinched!').length).toBe(2);
        });
    });

    describe('Score Calculation', () => {
        it('correctly calculates progress percentage for teamA at max', () => {
            const standings = { ...defaultStandings, teamAPoints: 14.5 };
            render(<StandingsCard standings={standings} magicNumber={defaultMagicNumber} />);

            act(() => {
                vi.advanceTimersByTime(200);
            });

            const progressBar = document.querySelector('.progress-premium-fill.team-usa');
            expect(progressBar).toHaveStyle({ width: '100%' });
        });
    });

    describe('Edge Cases', () => {
        it('handles zero points', () => {
            const zeroStandings = {
                ...defaultStandings,
                teamAPoints: 0,
                teamBPoints: 0,
                leader: null,
                margin: 0,
            };
            render(<StandingsCard standings={zeroStandings} magicNumber={defaultMagicNumber} />);

            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });

        it('handles all matches completed', () => {
            const completedStandings = {
                ...defaultStandings,
                matchesCompleted: 28,
                totalMatches: 28,
            };
            render(<StandingsCard standings={completedStandings} magicNumber={defaultMagicNumber} />);
            expect(screen.getByText('28 of 28 matches complete')).toBeInTheDocument();
        });

        it('handles large point values', () => {
            const largeStandings = {
                ...defaultStandings,
                teamAPoints: 99.5,
                teamBPoints: 88,
            };
            render(<StandingsCard standings={largeStandings} magicNumber={defaultMagicNumber} />);

            act(() => {
                vi.advanceTimersByTime(200);
            });

            expect(screen.getByText('99.5')).toBeInTheDocument();
            expect(screen.getByText('88')).toBeInTheDocument();
        });
    });
});
