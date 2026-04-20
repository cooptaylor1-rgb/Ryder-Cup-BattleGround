/**
 * EnhancedTripWizard Component Tests
 *
 * Tests for multi-step form validation, navigation, and wizard flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnhancedTripWizard } from '@/components/trip-setup/EnhancedTripWizard';

// Clear wizard draft from sessionStorage before each test to prevent state
// leaking (the wizard persists data, current step, AND quick/full mode).
beforeEach(() => {
  sessionStorage.removeItem('trip-wizard-draft');
  sessionStorage.removeItem('trip-wizard-draft-step');
  sessionStorage.removeItem('trip-wizard-draft-mode');
});

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
        teamA: { name: 'Team USA', primary: '#1E3A5F', secondary: '#EBF0F5' },
        teamB: { name: 'Team Europe', primary: '#722F37', secondary: '#F5ECEE' },
    },
    DEFAULT_TEE_TIME_SETTINGS: { firstTeeTime: '08:00', interval: 10 },
}));

describe('EnhancedTripWizard Component', () => {
    const defaultProps = {
        onComplete: vi.fn(),
        onCancel: vi.fn(),
    };

    // Most of the original assertions were written against the 8-step Full
    // Setup flow. The wizard now defaults to 4-step Quick Setup, so force
    // Full mode for legacy tests that walk the full step list. Dedicated
    // quickMode tests live further down.
    const fullProps = { ...defaultProps, initialMode: 'full' as const };

    // The Basics step requires a trip name before the Next button is enabled
    // (the actual production validation gate). Any test that needs to advance
    // past Basics uses this pre-populated prop; the "disables Create Trip
    // when trip name is empty" test intentionally uses `fullProps`.
    const fullPropsWithName = {
        ...fullProps,
        initialData: { tripName: 'Test Trip' },
    };

    // Players (min 4) and Sessions (>=1 with matchCount > 0) also gate
    // navigation. Any test that walks all 8 steps needs all three gates
    // satisfied in initialData.
    const mockPlayers = [
        { id: '1', name: 'Player One', handicap: 10, team: 'A' as const },
        { id: '2', name: 'Player Two', handicap: 12, team: 'A' as const },
        { id: '3', name: 'Player Three', handicap: 14, team: 'B' as const },
        { id: '4', name: 'Player Four', handicap: 16, team: 'B' as const },
    ];
    const mockSessions = [
        {
            id: 's1',
            name: 'Day 1',
            dayOffset: 0,
            timeSlot: 'AM' as const,
            sessionType: 'singles' as const,
            matchCount: 4,
            pointsPerMatch: 1,
        },
    ];
    const fullPropsForReview = {
        ...fullProps,
        initialData: {
            tripName: 'Test Trip',
            players: mockPlayers,
            sessions: mockSessions,
        },
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

        it('shows step 1 of 8 in full mode', () => {
            render(<EnhancedTripWizard {...fullProps} />);
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
            render(<EnhancedTripWizard {...fullPropsWithName} />);

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('Session Builder')).toBeInTheDocument();
            });
        });

        it('shows Back button on second step', async () => {
            render(<EnhancedTripWizard {...fullPropsWithName} />);

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('Back')).toBeInTheDocument();
            });
        });

        it('navigates back when Back is clicked', async () => {
            render(<EnhancedTripWizard {...fullPropsWithName} />);

            // Go to step 2 (Session Builder — sessions come before the roster
            // now so captains can shape tee times before recruiting players).
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => {
                expect(screen.getByText('Session Builder')).toBeInTheDocument();
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
        it('updates step counter when navigating (full mode)', async () => {
            render(<EnhancedTripWizard {...fullPropsWithName} />);

            expect(screen.getByText('1 of 8')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Next'));

            await waitFor(() => {
                expect(screen.getByText('2 of 8')).toBeInTheDocument();
            });
        });

        it('renders 8 progress dots in full mode', () => {
            render(<EnhancedTripWizard {...fullProps} />);

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

    describe('Final Step (full mode)', () => {
        it('navigates to review step', async () => {
            render(<EnhancedTripWizard {...fullPropsForReview} />);

            // Navigate through all steps (full mode = 8 steps, so 7 Next clicks)
            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Review & Create')).toBeInTheDocument();
            });
        });

        it('shows Create Trip button on final step', async () => {
            render(<EnhancedTripWizard {...fullPropsForReview} />);

            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Create Trip')).toBeInTheDocument();
            });
        });

        it('disables Next on Basics when trip name is empty', () => {
            // The older version of this test walked to the review step and
            // checked Create Trip, but the Next button on Basics is already
            // disabled without a trip name, so the user can't even reach
            // Review. Assert the earlier gate directly — same intent.
            render(<EnhancedTripWizard {...fullProps} />);

            const nextButton = screen.getByText('Next').closest('button');
            expect(nextButton).toBeDisabled();
        });

        it('enables Create Trip button when trip name is entered', async () => {
            render(<EnhancedTripWizard {...fullPropsForReview} />);

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
            render(<EnhancedTripWizard {...fullPropsForReview} />);

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

    describe('Review Step Content (full mode)', () => {
        it('displays summary on review step', async () => {
            render(
                <EnhancedTripWizard
                    {...fullProps}
                    initialData={{
                        tripName: 'Summer Championship',
                        players: mockPlayers,
                        sessions: mockSessions,
                    }}
                />
            );

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
            render(<EnhancedTripWizard {...fullPropsForReview} />);

            for (let i = 0; i < 7; i++) {
                fireEvent.click(screen.getByText('Next'));
                await waitFor(() => { });
            }

            await waitFor(() => {
                expect(screen.getByText('Ready to create your trip!')).toBeInTheDocument();
            });
        });
    });

    describe('Quick Setup (default mode)', () => {
        it('defaults to 4 steps', () => {
            render(<EnhancedTripWizard {...defaultProps} />);
            expect(screen.getByText('1 of 4')).toBeInTheDocument();
            const progressDots = document.querySelectorAll('.flex.gap-1\\.5 button');
            expect(progressDots.length).toBe(4);
        });

        it('skips Courses / Scoring / Rules / Extras and lands on Review fourth', async () => {
            render(
                <EnhancedTripWizard
                    {...defaultProps}
                    initialData={{
                        tripName: 'Quick Trip',
                        players: mockPlayers,
                        sessions: mockSessions,
                    }}
                />
            );

            // Quick Setup order is Basics → Sessions → Players → Review.
            // Sessions come before players so captains can shape tee times
            // and formats before recruiting a roster.
            // Step 1 -> 2
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => expect(screen.getByText('Session Builder')).toBeInTheDocument());
            // Step 2 -> 3
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => expect(screen.getByText('Player Roster')).toBeInTheDocument());
            // Step 3 -> 4 (review, skipping Courses/Scoring/Rules/Extras)
            fireEvent.click(screen.getByText('Next'));
            await waitFor(() => expect(screen.getByText('Review & Create')).toBeInTheDocument());
        });

        it('toggles to Full mode when the user picks Full Setup', async () => {
            render(<EnhancedTripWizard {...defaultProps} />);

            fireEvent.click(screen.getByText('Full Setup'));

            await waitFor(() => {
                expect(screen.getByText('1 of 8')).toBeInTheDocument();
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
