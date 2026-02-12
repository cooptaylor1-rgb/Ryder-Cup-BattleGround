import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import { Trophy, Star, Users, Zap, Clock, CheckCircle } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Masters-inspired badge component for status, categories, and metadata.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'error', 'info', 'usa', 'europe', 'live', 'gold'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    dot: {
      control: 'boolean',
    },
    pulse: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// Default badge
export const Default: Story = {
  args: {
    children: 'Default',
    variant: 'default',
  },
};

// All variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="usa">USA</Badge>
      <Badge variant="europe">Europe</Badge>
      <Badge variant="live">Live</Badge>
    </div>
  ),
};

// Sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
    </div>
  ),
};

// With dots
export const WithDots: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="success" dot>Active</Badge>
      <Badge variant="warning" dot>Pending</Badge>
      <Badge variant="error" dot>Offline</Badge>
      <Badge variant="live" dot pulse>Live Now</Badge>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="primary" icon={<Trophy size={12} />}>Champion</Badge>
      <Badge variant="warning" icon={<Star size={12} />}>Featured</Badge>
      <Badge variant="info" icon={<Users size={12} />}>Team</Badge>
      <Badge variant="success" icon={<CheckCircle size={12} />}>Verified</Badge>
    </div>
  ),
};

// Team badges
export const TeamBadges: Story = {
  render: () => (
    <div className="flex gap-4">
      <Badge variant="usa" size="md">Team USA</Badge>
      <Badge variant="europe" size="md">Team Europe</Badge>
    </div>
  ),
};

// Status badges
export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="live" dot pulse>Live</Badge>
        <span className="text-[var(--ink-tertiary)] text-sm">Match in progress</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="success" dot>Completed</Badge>
        <span className="text-[var(--ink-tertiary)] text-sm">Match finished</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="default">Scheduled</Badge>
        <span className="text-[var(--ink-tertiary)] text-sm">Starts at 8:00 AM</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="warning" dot>Paused</Badge>
        <span className="text-[var(--ink-tertiary)] text-sm">Weather delay</span>
      </div>
    </div>
  ),
};

// Pulse animation
export const PulseAnimation: Story = {
  render: () => (
    <div className="flex gap-4">
      <Badge variant="live" dot pulse>Live Match</Badge>
      <Badge variant="success" dot pulse>Recording</Badge>
      <Badge variant="error" dot pulse>Alert</Badge>
    </div>
  ),
};

// Real-world examples
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-surface-base rounded-xl">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-canvas">Player Card</h3>
        <div className="flex items-center gap-2">
          <span className="text-canvas">John Smith</span>
          <Badge variant="usa">USA</Badge>
          <Badge variant="primary" icon={<Trophy size={12} />}>MVP</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-canvas">Match Status</h3>
        <div className="flex items-center gap-3">
          <Badge variant="live" dot pulse>Live</Badge>
          <Badge variant="default" icon={<Clock size={12} />}>Hole 7</Badge>
          <Badge variant="success">2 UP</Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-canvas">Handicap Info</h3>
        <div className="flex gap-2">
          <Badge variant="info">+4.2 HCP</Badge>
          <Badge variant="warning" icon={<Zap size={12} />}>Hot Streak</Badge>
        </div>
      </div>
    </div>
  ),
};
