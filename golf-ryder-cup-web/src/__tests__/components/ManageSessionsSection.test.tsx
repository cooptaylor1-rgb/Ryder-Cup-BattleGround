import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SessionManagementCard,
  type SessionWithMatches,
} from '@/components/captain/manage/ManageSessionsSection';
import type { Course, Match, RyderCupSession, TeeSet } from '@/lib/types/models';

const now = '2026-03-22T12:00:00.000Z';

function createSession(matches: Match[]): SessionWithMatches {
  const session: RyderCupSession = {
    id: 'session-1',
    tripId: 'trip-1',
    name: 'Friday AM Foursomes',
    sessionNumber: 1,
    sessionType: 'foursomes',
    status: 'scheduled',
    createdAt: now,
  };

  return {
    ...session,
    matches,
  };
}

function createMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    sessionId: 'session-1',
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['a1', 'a2'],
    teamBPlayerIds: ['b1', 'b2'],
    teamAHandicapAllowance: 0,
    teamBHandicapAllowance: 0,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const course: Course = {
  id: 'course-1',
  name: 'North Berwick',
  location: 'North Berwick, Scotland',
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
  holePars: Array.from({ length: 18 }, () => 4),
  holeHandicaps: Array.from({ length: 18 }, (_, index) => index + 1),
  yardages: Array.from({ length: 18 }, () => 400),
  totalYardage: 7200,
  createdAt: now,
  updatedAt: now,
};

function renderCard({
  matches,
  courses = [course],
  teeSets = [teeSet],
}: {
  matches: Match[];
  courses?: Course[];
  teeSets?: TeeSet[];
}) {
  return render(
    <SessionManagementCard
      session={createSession(matches)}
      courses={courses}
      teeSets={teeSets}
      isExpanded
      onToggle={vi.fn()}
      onSaveSession={vi.fn(async () => undefined)}
      onDeleteSession={vi.fn()}
      teamAName="Team USA"
      teamBName="Team Europe"
      getPlayerNames={() => 'Player A & Player B'}
      editingMatchId={null}
      onEditMatch={vi.fn()}
      onSaveMatch={vi.fn(async () => undefined)}
      onDeleteMatch={vi.fn()}
      isSubmitting={false}
    />
  );
}

describe('ManageSessionsSection', () => {
  it('shows Add or import courses when the library is empty', () => {
    renderCard({
      matches: [createMatch()],
      courses: [],
      teeSets: [],
    });

    expect(screen.getByText('Needs course')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add or import courses' })).toHaveAttribute(
      'href',
      '/courses'
    );
  });

  it('shows Needs tee when a course is assigned without a tee set', () => {
    renderCard({
      matches: [createMatch({ courseId: course.id })],
    });

    expect(screen.getByText('Needs tee')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set course & tee' })).toBeInTheDocument();
  });

  it('shows Ready for handicaps when a match has both course and tee', () => {
    renderCard({
      matches: [createMatch({ courseId: course.id, teeSetId: teeSet.id })],
    });

    expect(screen.getByText('Ready for handicaps')).toBeInTheDocument();
  });
});
