import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PreFlightChecklist } from '@/components/captain/PreFlightChecklist';
import type {
  Course,
  Match,
  Player,
  RyderCupSession,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types/models';

const now = '2026-03-22T12:00:00.000Z';

const trip: Trip = {
  id: 'trip-1',
  name: 'Ryder Cup Test',
  startDate: '2026-04-29',
  endDate: '2026-05-02',
  isCaptainModeEnabled: true,
  createdAt: now,
  updatedAt: now,
};

const teams: Team[] = [
  {
    id: 'team-usa',
    tripId: trip.id,
    name: 'Team USA',
    color: 'usa',
    mode: 'ryderCup',
    createdAt: now,
  },
  {
    id: 'team-europe',
    tripId: trip.id,
    name: 'Team Europe',
    color: 'europe',
    mode: 'ryderCup',
    createdAt: now,
  },
];

const players: Player[] = Array.from({ length: 8 }, (_, index) => {
  const isUsa = index < 4;
  return {
    id: `player-${index + 1}`,
    tripId: trip.id,
    firstName: isUsa ? `USA${index + 1}` : `EU${index - 3}`,
    lastName: 'Player',
    email: `player-${index + 1}@example.com`,
    handicapIndex: 10 + index,
    createdAt: now,
    updatedAt: now,
  };
});

const teamMembers: TeamMember[] = players.map((player, index) => ({
  id: `team-member-${player.id}`,
  teamId: index < 4 ? teams[0].id : teams[1].id,
  playerId: player.id,
  sortOrder: index,
  isCaptain: index === 0 || index === 4,
  createdAt: now,
}));

const session: RyderCupSession = {
  id: 'session-1',
  tripId: trip.id,
  name: 'Friday AM Foursomes',
  sessionNumber: 1,
  sessionType: 'foursomes',
  scheduledDate: '2026-04-29',
  timeSlot: 'AM',
  pointsPerMatch: 1,
  status: 'scheduled',
  createdAt: now,
};

const course: Course = {
  id: 'course-1',
  name: 'North Berwick',
  location: 'Scotland',
  createdAt: now,
  updatedAt: now,
};

const teeSet: TeeSet = {
  id: 'tee-1',
  courseId: course.id,
  name: 'Championship',
  rating: 72.4,
  slope: 133,
  par: 72,
  holeHandicaps: Array.from({ length: 18 }, (_, index) => index + 1),
  holePars: [4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 5, 3, 4, 4, 4, 3, 5],
  yardages: Array.from({ length: 18 }, (_, index) => 350 + index * 5),
  totalYardage: 6500,
  createdAt: now,
  updatedAt: now,
};

const matches: Match[] = [
  {
    id: 'match-1',
    sessionId: session.id,
    courseId: course.id,
    teeSetId: teeSet.id,
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: [players[0].id, players[1].id],
    teamBPlayerIds: [players[4].id, players[5].id],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: now,
    updatedAt: now,
  },
];

describe('PreFlightChecklist', () => {
  it('surfaces the next blocking fix before the full issue list', async () => {
    render(
      <PreFlightChecklist
        tripId={trip.id}
        trip={trip}
        players={[]}
        teams={[]}
        teamMembers={[]}
        sessions={[]}
        matches={[]}
        courses={[]}
        teeSets={[]}
      />
    );

    expect(await screen.findByText('Next fix')).toBeInTheDocument();
    expect(screen.getAllByText('Not enough players').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Add Players' })[0]).toHaveAttribute(
      'href',
      '/players'
    );
  });

  it('only announces success once for identical ready reruns', async () => {
    const user = userEvent.setup();
    const onAllClear = vi.fn();

    render(
      <PreFlightChecklist
        tripId={trip.id}
        trip={trip}
        players={players}
        teams={teams}
        teamMembers={teamMembers}
        sessions={[session]}
        matches={matches}
        courses={[course]}
        teeSets={[teeSet]}
        onAllClear={onAllClear}
      />
    );

    const rerunButton = await screen.findByTestId('preflight-rerun');

    await user.click(rerunButton);
    await user.click(rerunButton);

    await waitFor(() => {
      expect(onAllClear).toHaveBeenCalledTimes(1);
    });
  });
});
