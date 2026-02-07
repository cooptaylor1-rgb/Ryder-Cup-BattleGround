import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Search, Mail, Lock, User, DollarSign, Calendar } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Text input with consistent styling, labels, hints, errors, and icons.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    hint: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// Default input
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};

// With label
export const WithLabel: Story = {
  args: {
    label: 'Player Name',
    placeholder: 'Enter player name',
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};

// With hint
export const WithHint: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    hint: "We'll never share your email with anyone else.",
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};

// With error
export const WithError: Story = {
  args: {
    label: 'Handicap Index',
    placeholder: 'e.g., 12.5',
    error: 'Please enter a valid handicap between -5 and 54',
    defaultValue: '999',
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
};

// With icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        leftIcon={<Search />}
        placeholder="Search players..."
      />
      <Input
        leftIcon={<Mail />}
        placeholder="Email address"
        type="email"
      />
      <Input
        leftIcon={<Lock />}
        placeholder="Password"
        type="password"
      />
      <Input
        leftIcon={<User />}
        rightIcon={<span className="text-xs text-text-muted">@</span>}
        placeholder="Username"
      />
    </div>
  ),
};

// Different types
export const InputTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        label="Text"
        type="text"
        placeholder="Enter text"
      />
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        leftIcon={<Mail />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        leftIcon={<Lock />}
      />
      <Input
        label="Number"
        type="number"
        placeholder="0"
        leftIcon={<DollarSign />}
      />
      <Input
        label="Date"
        type="date"
        leftIcon={<Calendar />}
      />
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        label="Default"
        placeholder="Default input"
      />
      <Input
        label="Focused"
        placeholder="Click to focus"
        autoFocus
      />
      <Input
        label="Disabled"
        placeholder="Disabled input"
        disabled
        value="Cannot edit"
      />
      <Input
        label="With Error"
        placeholder="Error state"
        error="This field is required"
      />
    </div>
  ),
};

// Real-world examples
export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-surface-base rounded-xl w-96">
      <h3 className="text-lg font-semibold text-canvas">Player Registration</h3>

      <Input
        label="Full Name"
        leftIcon={<User />}
        placeholder="John Smith"
        hint="Enter your full name as it appears on your golf ID"
      />

      <Input
        label="Handicap Index"
        type="number"
        placeholder="12.5"
        hint="Enter your official USGA handicap"
      />

      <Input
        label="Email"
        type="email"
        leftIcon={<Mail />}
        placeholder="john@example.com"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="GHIN Number"
          placeholder="1234567"
        />
        <Input
          label="Home Course"
          placeholder="Augusta National"
        />
      </div>
    </div>
  ),
};

// Search input
export const SearchInput: Story = {
  render: () => (
    <div className="w-96">
      <Input
        leftIcon={<Search />}
        placeholder="Search courses, players, or trips..."
        className="bg-surface-card"
      />
    </div>
  ),
};
