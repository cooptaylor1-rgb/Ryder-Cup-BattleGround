/**
 * RecentlyClosedMatchBanner — post-match handoff on standings.
 *
 * Verifies the banner only shows when ?matchClosed=<id> is on the
 * URL, surfaces the correct winner copy, and links to recap +
 * (when applicable) the next incomplete match.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentlyClosedMatchBanner } from '@/components/standings/RecentlyClosedMatchBanner';

const replaceMock = vi.fn();
const useSearchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => useSearchParamsMock(),
}));

const useLiveQueryMock = vi.fn();
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => useLiveQueryMock(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    matches: { get: vi.fn() },
    holeResults: { where: vi.fn() },
  },
}));

// The banner's helpers ultimately get bypassed by the useLiveQuery
// mock returning a synthetic snapshot, but vitest still resolves the
// imports — so make them no-ops.
vi.mock('@/lib/services/scoringEngine', () => ({
  calculateMatchState: vi.fn(),
}));

vi.mock('@/components/scoring/match-scoring/matchScoringReport', () => ({
  findNextIncompleteMatch: vi.fn(),
}));

describe('RecentlyClosedMatchBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    useLiveQueryMock.mockReturnValue(null);
  });

  it('renders nothing when ?matchClosed is absent', () => {
    const { container } = render(<RecentlyClosedMatchBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the winner headline and recap link when the param is set', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('matchClosed=match-1'));
    useLiveQueryMock.mockReturnValue({
      match: { id: 'match-1', matchOrder: 3, sessionId: 'session-1' },
      matchState: {
        winningTeam: 'teamA',
        displayScore: '3 & 2',
      },
      nextMatch: undefined,
    });

    render(<RecentlyClosedMatchBanner />);

    expect(screen.getByText(/Match 3 just finished/i)).toBeInTheDocument();
    expect(screen.getByText(/USA wins/i)).toBeInTheDocument();
    expect(screen.getByText(/3 & 2/)).toBeInTheDocument();
    const recapLink = screen.getByRole('link', { name: /recap/i });
    expect(recapLink).toHaveAttribute('href', '/score/match-1/recap');
  });

  it('shows a "Next match" button when the session has another open match', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('matchClosed=match-1'));
    useLiveQueryMock.mockReturnValue({
      match: { id: 'match-1', matchOrder: 3, sessionId: 'session-1' },
      matchState: { winningTeam: 'teamB', displayScore: '2 UP' },
      nextMatch: { id: 'match-2', matchOrder: 4 },
    });

    render(<RecentlyClosedMatchBanner />);

    const nextBtn = screen.getByRole('button', { name: /Next match/i });
    fireEvent.click(nextBtn);
    expect(replaceMock).toHaveBeenCalledWith('/score/match-2');
  });

  it('clears the URL param when dismissed', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('matchClosed=match-1'));
    useLiveQueryMock.mockReturnValue({
      match: { id: 'match-1', matchOrder: 3, sessionId: 'session-1' },
      matchState: { winningTeam: 'halved', displayScore: 'AS' },
      nextMatch: undefined,
    });

    render(<RecentlyClosedMatchBanner />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss match-finished/i }));
    expect(replaceMock).toHaveBeenCalledWith('/standings');
  });

  it('renders the "Match halved" headline for a halved match', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('matchClosed=match-1'));
    useLiveQueryMock.mockReturnValue({
      match: { id: 'match-1', matchOrder: 5, sessionId: 'session-1' },
      matchState: { winningTeam: 'halved', displayScore: 'AS' },
      nextMatch: undefined,
    });

    render(<RecentlyClosedMatchBanner />);
    expect(screen.getByText(/Match halved/i)).toBeInTheDocument();
  });
});
