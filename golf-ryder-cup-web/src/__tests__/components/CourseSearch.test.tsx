import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CourseSearch } from '@/components/CourseSearch';
import type { GolfCourseAPICourse } from '@/lib/services/golfCourseAPIService';

const {
  mockUseLiveQuery,
  mockSearchCourses,
  mockGetCourseById,
  mockCheckConfigured,
  mockGetAllTees,
  mockConvertTee,
} = vi.hoisted(() => ({
  mockUseLiveQuery: vi.fn(),
  mockSearchCourses: vi.fn(),
  mockGetCourseById: vi.fn(),
  mockCheckConfigured: vi.fn(),
  mockGetAllTees: vi.fn(),
  mockConvertTee: vi.fn(),
}));

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: mockUseLiveQuery,
}));

vi.mock('@/lib/services/golfCourseAPIService', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/golfCourseAPIService')>(
    '@/lib/services/golfCourseAPIService'
  );

  return {
    ...actual,
    searchCourses: mockSearchCourses,
    getCourseById: mockGetCourseById,
    checkGolfCourseAPIConfigured: mockCheckConfigured,
    getAllTees: mockGetAllTees,
    convertAPITeeToTeeSet: mockConvertTee,
  };
});

const searchResult: GolfCourseAPICourse = {
  id: 'web-cabot-roost',
  club_name: 'Cabot Citrus Farms',
  course_name: 'Roost',
  location: {
    city: 'Brooksville',
    state: 'FL',
    country: 'United States',
  },
  source: 'web',
  website: 'https://cabot.com/citrusfarms/golf/roost/',
  description: 'A rolling Cabot course in Florida.',
};

const detailResult: GolfCourseAPICourse = {
  ...searchResult,
  description: 'Detailed course profile',
  sourcePageUrl: 'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf',
  dataCompleteness: 'basic',
  hasPlayableTeeData: false,
  sourceAssets: [
    {
      kind: 'scorecard',
      label: 'Scorecard PDF',
      url: 'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf',
    },
  ],
  missingFields: ['tee-data', 'hole-layout'],
  provenance: [
    {
      kind: 'scorecard-pdf',
      label: 'Linked scorecard PDF',
      url: 'https://cabot.com/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf',
      confidence: 'high',
    },
  ],
};

describe('CourseSearch', () => {
  beforeEach(() => {
    mockUseLiveQuery.mockReturnValue([]);
    mockCheckConfigured.mockResolvedValue(true);
    mockSearchCourses.mockResolvedValue([searchResult]);
    mockGetCourseById.mockResolvedValue(detailResult);
    mockGetAllTees.mockReturnValue([]);
    mockConvertTee.mockImplementation(() => ({
      name: 'Blue',
      color: '#1565C0',
      rating: 72.3,
      slope: 131,
      par: 72,
      yardage: 6543,
      holePars: Array(18).fill(4),
      holeHandicaps: Array.from({ length: 18 }, (_, index) => index + 1),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns to search view without submitting the parent form', async () => {
    const submitSpy = vi.fn();

    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSpy();
        }}
      >
        <CourseSearch onSelectCourse={vi.fn()} />
      </form>
    );

    await screen.findByText('Search Course Database');

    fireEvent.change(screen.getByPlaceholderText('Search by course name or city...'), {
      target: { value: 'cabot roost' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByRole('button', { name: /Roost/i });

    fireEvent.click(screen.getByRole('button', { name: /Roost/i }));

    await screen.findByRole('button', { name: '← Back to search' });

    fireEvent.click(screen.getByRole('button', { name: '← Back to search' }));

    await waitFor(() => {
      expect(screen.getByText('Search Course Database')).toBeInTheDocument();
    });

    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('shows extraction status and the extracted source link in detail view', async () => {
    render(<CourseSearch onSelectCourse={vi.fn()} />);

    await screen.findByText('Search Course Database');

    fireEvent.change(screen.getByPlaceholderText('Search by course name or city...'), {
      target: { value: 'cabot roost' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByRole('button', { name: /Roost/i });
    fireEvent.click(screen.getByRole('button', { name: /Roost/i }));

    await screen.findByText('Basic course profile only');
    expect(screen.getByText('Linked scorecard PDF')).toBeInTheDocument();
    expect(screen.getByText('Sources followed')).toBeInTheDocument();
    expect(screen.getByText(/Scorecard · Scorecard PDF/i)).toBeInTheDocument();
    expect(screen.getByText('Still missing')).toBeInTheDocument();
    expect(screen.getByText(/tee data, 18-hole layout/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View extracted source' })).toHaveAttribute(
      'href',
      detailResult.sourcePageUrl
    );
  });

  it('warns about duplicate library entries before import', async () => {
    mockUseLiveQuery.mockReturnValue([
      {
        id: 'existing-course-1',
        name: 'Roost',
        location: 'Brooksville, FL, United States',
        sourceUrl: 'https://cabot.com/citrusfarms/golf/roost/',
        canonicalKey: 'roost|brooksville|fl|united states|cabot.com',
        createdAt: '2026-03-20T10:00:00.000Z',
        updatedAt: '2026-03-20T10:00:00.000Z',
      },
    ]);

    render(<CourseSearch onSelectCourse={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText('Search Course Database');

    fireEvent.change(screen.getByPlaceholderText('Search by course name or city...'), {
      target: { value: 'cabot roost' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByRole('button', { name: /Roost/i });
    fireEvent.click(screen.getByRole('button', { name: /Roost/i }));

    await screen.findByText('This may already be in your course library');
    expect(screen.getByText(/Exact course \+ location match/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review existing library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import Anyway (No Tees)' })).toBeInTheDocument();
  });
});
