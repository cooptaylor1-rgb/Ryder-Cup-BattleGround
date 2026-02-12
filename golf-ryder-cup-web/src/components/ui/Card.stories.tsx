import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Masters-inspired card component with warm shadows and refined styling.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'ghost'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    interactive: {
      control: 'boolean',
    },
    selected: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// Default card
export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader title="Match Results" subtitle="Round 1 - Morning Session" />
      <CardContent>
        <p className="text-[var(--ink-secondary)]">
          View the complete results from this morning&apos;s matches.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

// All variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Card variant="default">
        <CardContent>Default Card</CardContent>
      </Card>
      <Card variant="elevated">
        <CardContent>Elevated Card</CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>Outlined Card</CardContent>
      </Card>
      <Card variant="ghost">
        <CardContent>Ghost Card</CardContent>
      </Card>
    </div>
  ),
};

// Interactive cards
export const Interactive: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Card interactive onClick={() => alert('Clicked!')}>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Click me</span>
            <span className="text-[var(--ink-tertiary)]">→</span>
          </div>
        </CardContent>
      </Card>
      <Card interactive selected>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Selected Card</span>
            <Badge variant="success">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

// Match card example
export const MatchCard: Story = {
  render: () => (
    <Card className="w-96" variant="elevated">
      <CardHeader title="Match #3" subtitle="Four Ball • Hole 12" action={<Badge variant="success">Live</Badge>} />
      <CardContent>
        <div className="flex justify-between items-center py-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--masters)]">2</div>
            <div className="text-sm text-[var(--ink-tertiary)]">USA</div>
          </div>
          <div className="text-[var(--ink-tertiary)]">UP</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error">1</div>
            <div className="text-sm text-[var(--ink-tertiary)]">EUR</div>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-[var(--ink-secondary)]">
          <span>Smith & Jones</span>
          <span>vs</span>
          <span>García & Müller</span>
        </div>
      </CardContent>
      <CardFooter className="border-t border-[var(--rule)] pt-4">
        <Button variant="primary" fullWidth>
          Enter Scores
        </Button>
      </CardFooter>
    </Card>
  ),
};

// Player card example
export const PlayerCard: Story = {
  render: () => (
    <Card className="w-72" interactive>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[var(--masters)] flex items-center justify-center text-white font-bold">
            JS
          </div>
          <div className="flex-1">
            <div className="font-semibold text-canvas">John Smith</div>
            <div className="text-sm text-[var(--ink-tertiary)]">Team USA • +3.2 HCP</div>
          </div>
          <Badge variant="primary">Captain</Badge>
        </div>
      </CardContent>
    </Card>
  ),
};

// Stats card
export const StatsCard: Story = {
  render: () => (
    <Card className="w-64" padding="lg">
      <div className="text-center">
        <div className="text-4xl font-bold text-[var(--masters)] mb-1">8½</div>
        <div className="text-sm text-[var(--ink-tertiary)] uppercase tracking-wide">
          Team Points
        </div>
      </div>
    </Card>
  ),
};

// Card grid
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-125">
      {['Match 1', 'Match 2', 'Match 3', 'Match 4'].map((match) => (
        <Card key={match} interactive variant="outlined">
          <CardContent>
            <div className="font-semibold">{match}</div>
            <div className="text-sm text-[var(--ink-tertiary)]">In Progress</div>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};
