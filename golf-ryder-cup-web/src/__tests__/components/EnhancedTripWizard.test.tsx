/**
 * EnhancedTripWizard Component Tests
 *
 * Tests for multi-step form validation, navigation, and wizard flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedTripWizard } from '@/components/trip-setup/EnhancedTripWizard';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: React.PropsWithChildren<{ className?: string }>) => (
            <div className={props.className}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

// Mock trip-setup components
vi.mock('@/components/trip-setup', () => ({
    SessionBuilder: ({ sessions, onSessionsChange }: { sessions: Array<unknown>; onSessionsChange: (s: Array<unknown>) => void }) => (
        <div data-testid="session-builder">
            <button onClick={() => onSessionsChange([{ id: '1', matchCount: 4, sessionType: 'singles', dayOffset: 0, timeSlot: 'AM', pointsPerMatch: 1 }])}>
                Add Session
            </button>
            <span>{sessions.length} sessions</span>
        </div>
    ),
    PlayerCountSelector: ({ playersPerTeam }: { playersPerTeam: number }) => (
        <div data-testid="player-count-selector">{playersPerTeam} players per team</div>
    ),
    CourseSelection: ({ selectedCourses, onCoursesChange }: { selectedCourses: Array<unknown>; onCoursesChange: (c: Array<unknown>) => void }) => (
        <div data-testid="course-selection">
            <button onClick={() => onCoursesChange([{ id: '1', name: 'Test Course' }])}>
                Add Course
            </button>
            <span>{selectedCourses.length} courses</span>
        </div>
    ),
    HandicapRules: () => <div data-testid="handicap-rules">Handicap Rules</div>,
    PointSystem: () => <div data-testid="point-system">Point System</div>,
    SideBetPresets: () => <div data-testid="side-bet-presets">Side Bet Presets</div>,
    ScoringFormatOptions: () => <div data-testid="scoring-format-options">Scoring Format Options</div>,
    TeamColorPicker: () => <div data-testid="team-color-picker">Team Color Picker</div>,
    TeeTimePreferences: () => <div data-testid="tee-time-preferences">Tee Time Preferences</div>,
    PlayerRosterImport: ({ players, onPlayersChange }: { players: Array<unknown>; onPlayersChange: (p: Array<unknown>) => void }) => (
        <div data-testid="player-roster-import">
            <button onClick={() => onPlayersChange([{ id: '1', name: 'Player 1', team: 'A' }, { id: '2', name: 'Player 2', team: 'B' }])}>
                Add Players
            </button>
            <span>{players.length} players</span>
        </div>
    ),
    DEFAULT_HANDICAP_SETTINGS: { useNetScoring: true, allowancePercent: 100 },
    DEFAULT_POINT_CONFIG: { win: 1, halve: 0.5, loss: 0 },
    DEFAULT_SCORING_SETTINGS: { defaultFormat: 'match-play' },
    DEFAULT_TEAM_COLORS: {
        teamA: { name: 'Team USA', primary: '#0047AB', secondary: '#E8F0FE' },
        teamB: { name: 'Team Europe', primary: '#8B0000', secondary: '#FEE8E8' },
    },
    DEFAULT_TEE_TIME_SETTINGS: { firstTeeTime: '08:00', interval: 10 },
}));

describe('EnhancedTripWizard Component', () => {
    const defaultProps = {
        onComplete: vi.fn(),
        onCancel: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Initial Rendering', () => {
        it('renders the first step (Basics)', () => {
            render(<EnhancedTripWizard {...defaultProps} />);
            expect(screen.getByText('Trip Basics')).toBeInTheDocument();
            expect(screen.getByText('Name, dates, and teams')).toBeInTheDocument();
        });

        it('shows step 1 of 8', () => {
            render(<EnhancedTripWizard {...defaultProps} />);
            expect(screen.getByText('1 of 8')).toBeInTheDocument();
        });

        it('renders trip name input', () => {
            render(<EnhancedTripWizard {...defaultProps} />);
            expect(screen.getByPlaceholderText('e.g., Myrtle Beach 2026')).toBeInTheDocument();
        });

        it('renders Cancel and Next buttons on first step', () => {
            render(<EnhancedTripWizard {...defaultProps} />);
            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Next')).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('navigates to next step when Next is clicked', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('Player Roster')).toBeInTheDocument();
            });
        });

        it('shows Back button on second step', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('Back')).toBeInTheDocument();
            });
        });

        it('navigates back when Back is clicked', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Go to step 2
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => {
                expect(screen.getByText('Player Roster')).toBeInTheDocument();
            });

            // Go back to step 1
            fireEvent.click(screen.getByText('Back'));
            await waitFor(() => {
                expect(screen.getByText('Trip Basics')).toBeInTheDocument();
            });
        });

        it('calls onCancel when Cancel is clicked', () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            fireEvent.click(screen.getByText('Cancel'));
            expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('Step Progress', () => {
        it('updates step counter when navigating', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            expect(screen.getByText('1 of 8')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('2 of 8')).toBeInTheDocument();
            });
        });

        it('renders 8 progress dots', () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // The progress dots container has buttons for each step
            const progressDots = document.querySelectorAll('.flex.gap-1\\.5 button');
            expect(progressDots.length).toBe(8);
        });
    });

    describe('Form Input', () => {
        it('allows entering trip name', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            const input = screen.getByPlaceholderText('e.g., Myrtle Beach 2026');
            await userEvent.type(input, 'Spring Golf Trip 2026');

            expect(input).toHaveValue('Spring Golf Trip 2026');
        });

        it('allows entering location', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            const input = screen.getByPlaceholderText('e.g., Myrtle Beach, SC');
            await userEvent.type(input, 'Pebble Beach, CA');

            expect(input).toHaveValue('Pebble Beach, CA');
        });

        it('allows entering team names', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            const team1Input = screen.getByPlaceholderText('Team USA');
            const team2Input = screen.getByPlaceholderText('Team Europe');

            await userEvent.clear(team1Input);
            await userEvent.type(team1Input, 'Eagles');

            await userEvent.clear(team2Input);
            await userEvent.type(team2Input, 'Hawks');

            expect(team1Input).toHaveValue('Eagles');
            expect(team2Input).toHaveValue('Hawks');
        });
    });

    describe('Final Step', () => {
        it('navigates to review step', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Navigate through all steps
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Review & Create')).toBeInTheDocument();
            });
        });

        it('shows Create Trip button on final step', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Navigate to final step
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Create Trip')).toBeInTheDocument();
            });
        });

        it('disables Create Trip button when trip name is empty', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Navigate to final step without entering trip name
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                const createButton = screen.getByText('Create Trip').closest('button');
                expect(createButton).toBeDisabled();
            });
        });

        it('enables Create Trip button when trip name is entered', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Enter trip name
            const input = screen.getByPlaceholderText('e.g., Myrtle Beach 2026');
            await userEvent.type(input, 'My Trip');

            // Navigate to final step
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                const createButton = screen.getByText('Create Trip').closest('button');
                expect(createButton).not.toBeDisabled();
            });
        });

        it('calls onComplete with data when Create Trip is clicked', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Enter trip name
            const input = screen.getByPlaceholderText('e.g., Myrtle Beach 2026');
            await userEvent.type(input, 'Test Trip');

            // Navigate to final step
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                fireEvent.click(screen.getByText('Create Trip'));
            });

            expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
            expect(defaultProps.onComplete).toHaveBeenCalledWith(
                expect.objectContaining({
                    tripName: 'Test Trip',
                })
            );
        });
    });

    describe('Initial Data', () => {
        it('uses initialData when provided', () => {
            const initialData = {
                tripName: 'Pre-filled Trip',
                location: 'Augusta, GA',
            };

            render(<EnhancedTripWizard {...defaultProps} initialData={initialData} />);

            expect(screen.getByPlaceholderText('e.g., Myrtle Beach 2026')).toHaveValue('Pre-filled Trip');
            expect(screen.getByPlaceholderText('e.g., Myrtle Beach, SC')).toHaveValue('Augusta, GA');
        });
    });

    describe('Review Step Content', () => {
        it('displays summary on review step', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Enter trip name
            const input = screen.getByPlaceholderText('e.g., Myrtle Beach 2026');
            await userEvent.type(input, 'Summer Championship');

            // Navigate to final step
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Summer Championship')).toBeInTheDocument();
                expect(screen.getByText('Players')).toBeInTheDocument();
                expect(screen.getByText('Days')).toBeInTheDocument();
                expect(screen.getByText('Sessions')).toBeInTheDocument();
                expect(screen.getByText('Matches')).toBeInTheDocument();
            });
        });

        it('displays "Ready to create your trip!" message', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            // Navigate to final step
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Ready to create your trip!')).toBeInTheDocument();
            });
        });
    });

    describe('Custom ClassName', () => {
        it('applies custom className', () => {
            const { container } = render(
                <EnhancedTripWizard {...defaultProps} className="custom-wizard-class" />
            );

            expect(container.firstChild).toHaveClass('custom-wizard-class');
        });
    });
});
