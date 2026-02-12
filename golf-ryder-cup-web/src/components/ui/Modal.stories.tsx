import type { Meta, StoryObj } from '@storybook/react';
import { Modal, ConfirmDialog } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { useState } from 'react';
import { AlertTriangle, Trash2, Share2 } from 'lucide-react';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Masters-inspired modal dialogs with focus management, animations, and accessibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    showCloseButton: {
      control: 'boolean',
    },
    closeOnOverlayClick: {
      control: 'boolean',
    },
    closeOnEscape: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Interactive modal demo
const ModalDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Match Complete"
        description="Round 1 • Four Ball"
      >
        <div className="py-4">
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-masters-green mb-2">2 & 1</div>
            <div className="text-[var(--ink-tertiary)]">USA wins the match</div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button variant="primary" fullWidth onClick={() => setIsOpen(false)}>
              View Details
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const Default: Story = {
  render: () => <ModalDemo />,
};

// Size variants
const SizeDemo = () => {
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null);
  return (
    <div className="flex gap-2">
      {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
        <Button key={s} onClick={() => setSize(s)} variant="outline">
          {s.toUpperCase()}
        </Button>
      ))}
      {size && (
        <Modal
          isOpen={true}
          onClose={() => setSize(null)}
          title={`${size.toUpperCase()} Modal`}
          description="This shows the modal size variant"
          size={size}
        >
          <p className="py-4 text-[var(--ink-secondary)]">
            Modal content with size: {size}
          </p>
          <Button onClick={() => setSize(null)} fullWidth>Close</Button>
        </Modal>
      )}
    </div>
  );
};

export const Sizes: Story = {
  render: () => <SizeDemo />,
};

// Confirm modal
const ConfirmDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="danger" leftIcon={<Trash2 size={16} />} onClick={() => setIsOpen(true)}>
        Delete Match
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={() => {
          alert('Match deleted!');
          setIsOpen(false);
        }}
        title="Delete Match"
        description="Are you sure you want to delete this match? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </>
  );
};

export const ConfirmDialogStory: Story = {
  render: () => <ConfirmDemo />,
};

// Form modal
const FormDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Player</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add New Player"
        size="md"
      >
        <div className="space-y-4">
          <Input label="Full Name" placeholder="John Smith" />
          <Input label="Handicap" type="number" placeholder="12.5" />
          <Input label="Email" type="email" placeholder="john@example.com" />
          <div className="flex gap-2 pt-4">
            <Button variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={() => { alert('Added!'); setIsOpen(false); }}>
              Add Player
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const FormDialogStory: Story = {
  render: () => <FormDemo />,
};

// Warning modal
const WarningDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Leave Trip
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Leave Trip?"
        size="sm"
      >
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gold/10 rounded-lg">
            <AlertTriangle className="text-gold" size={24} />
            <p className="text-sm text-[var(--ink-secondary)]">
              You will lose access to all match data and standings.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
              Stay
            </Button>
            <Button variant="danger" fullWidth onClick={() => setIsOpen(false)}>
              Leave Trip
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const WarningDialog: Story = {
  render: () => <WarningDemo />,
};

// Share modal
const ShareDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button leftIcon={<Share2 size={16} />} onClick={() => setIsOpen(true)}>
        Share Results
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Share Match Results"
        size="md"
      >
        <div className="py-4 space-y-4">
          <div className="p-4 bg-[var(--surface)] rounded-lg text-center">
            <div className="text-2xl font-bold text-masters-green mb-1">USA 15½</div>
            <div className="text-[var(--ink-tertiary)]">defeats</div>
            <div className="text-2xl font-bold text-error mt-1">EUR 12½</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">Copy Link</Button>
            <Button variant="outline">Share to X</Button>
            <Button variant="outline">Share to Facebook</Button>
            <Button variant="outline">Download Image</Button>
          </div>

          <Input
            label="Share Link"
            value="https://rydertracker.com/share/abc123"
            readOnly
          />
        </div>
      </Modal>
    </>
  );
};

export const ShareDialog: Story = {
  render: () => <ShareDemo />,
};
