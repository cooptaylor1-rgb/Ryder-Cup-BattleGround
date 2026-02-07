import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Download, Plus, Save, Trash2, Share } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Masters-inspired button component with elegant styling and WCAG 2.2 compliant touch targets.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger', 'outline'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
      description: 'Button size (all meet 44px minimum touch target)',
    },
    isLoading: {
      control: 'boolean',
      description: 'Shows loading spinner',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Expands to full container width',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default button
export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

// All variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// All sizes
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus size={20} /></Button>
    </div>
  ),
};

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button leftIcon={<Plus size={18} />}>Add Player</Button>
      <Button rightIcon={<Download size={18} />}>Export PDF</Button>
      <Button leftIcon={<Save size={18} />} rightIcon={<Share size={18} />}>
        Save & Share
      </Button>
    </div>
  ),
};

// Loading states
export const Loading: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button isLoading>Loading...</Button>
      <Button isLoading loadingText="Saving...">Save</Button>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

// Full width
export const FullWidth: Story = {
  render: () => (
    <div className="w-80">
      <Button fullWidth>Full Width Button</Button>
    </div>
  ),
};

// Danger actions
export const DangerActions: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="danger" leftIcon={<Trash2 size={18} />}>
        Delete Match
      </Button>
      <Button variant="danger" size="icon">
        <Trash2 size={20} />
      </Button>
    </div>
  ),
};

// Real-world examples
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-surface-base rounded-xl">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-canvas">Score Entry</h3>
        <div className="flex gap-2">
          <Button variant="primary" size="lg">
            Submit Score
          </Button>
          <Button variant="secondary" size="lg">
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-canvas">Trip Actions</h3>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Share size={16} />}>
            Share Trip
          </Button>
          <Button variant="ghost">View Details</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold text-canvas">Destructive</h3>
        <Button variant="danger" leftIcon={<Trash2 size={16} />}>
          Leave Trip
        </Button>
      </div>
    </div>
  ),
};
