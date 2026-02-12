import type { Meta, StoryObj } from '@storybook/react';
import {
  EmptyState,
  NoMatchesEmpty,
  NoPlayersEmpty,
  NoStandingsEmpty,
  NoCoursesEmpty,
  NoScoresEmpty,
  NoSearchResultsEmpty,
  OfflineEmpty,
  ErrorEmpty,
} from './EmptyState';
import { Button } from './Button';
import { Calendar, Trophy } from 'lucide-react';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Empty state components with illustrations for various scenarios.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

// Basic empty state
export const Basic: Story = {
  args: {
    title: 'No items found',
    description: 'Try adjusting your search or filters.',
  },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
};

// With action
export const WithAction: Story = {
  args: {
    icon: Calendar,
    title: 'No trips scheduled',
    description: 'Plan your next golf adventure with friends.',
    action: {
      label: 'Create Trip',
      onClick: () => alert('Creating trip!'),
    },
  },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
};

// Premium empty states
export const NoMatches: Story = {
  render: () => (
    <div className="w-96">
      <NoMatchesEmpty onSetupMatchups={() => alert('Creating match!')} />
    </div>
  ),
};

export const NoPlayers: Story = {
  render: () => (
    <div className="w-96">
      <NoPlayersEmpty onAddPlayer={() => alert('Inviting players!')} />
    </div>
  ),
};

export const NoStandings: Story = {
  render: () => (
    <div className="w-96">
      <NoStandingsEmpty />
    </div>
  ),
};

export const NoCourses: Story = {
  render: () => (
    <div className="w-96">
      <NoCoursesEmpty onSearchCourses={() => alert('Adding course!')} />
    </div>
  ),
};

export const NoScores: Story = {
  render: () => (
    <div className="w-96">
      <NoScoresEmpty onStartScoring={() => alert('Entering scores!')} />
    </div>
  ),
};

export const NoSearchResults: Story = {
  render: () => (
    <div className="w-96">
      <NoSearchResultsEmpty query="Augusta" />
    </div>
  ),
};

// Error states
export const Offline: Story = {
  render: () => (
    <div className="w-96">
      <OfflineEmpty />
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="w-96">
      <ErrorEmpty
        message="Failed to load matches"
        onRetry={() => alert('Retrying...')}
      />
    </div>
  ),
};

// Gallery of all premium states
export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-8 p-8">
      <div className="p-4 border border-[var(--rule)] rounded-xl">
        <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-4">No Matches</h3>
        <NoMatchesEmpty onSetupMatchups={() => {}} />
      </div>
      <div className="p-4 border border-[var(--rule)] rounded-xl">
        <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-4">No Players</h3>
        <NoPlayersEmpty onAddPlayer={() => {}} />
      </div>
      <div className="p-4 border border-[var(--rule)] rounded-xl">
        <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-4">No Standings</h3>
        <NoStandingsEmpty />
      </div>
      <div className="p-4 border border-[var(--rule)] rounded-xl">
        <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-4">Offline</h3>
        <OfflineEmpty />
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};

// Custom empty state
export const CustomContent: Story = {
  render: () => (
    <div className="w-96">
      <EmptyState
        icon={Trophy}
        title="No tournaments yet"
        description="Create your first tournament to start tracking matches and standings."
      >
        <div className="mt-4 space-y-2">
          <Button variant="primary" fullWidth>
            Create Tournament
          </Button>
          <Button variant="ghost" fullWidth>
            Learn More
          </Button>
        </div>
      </EmptyState>
    </div>
  ),
};
