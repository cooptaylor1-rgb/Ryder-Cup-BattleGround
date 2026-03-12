import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaptainToggle } from '@/components/ui/CaptainToggle';

const mockUIStore = {
  isCaptainMode: false,
  enableCaptainMode: vi.fn(),
  disableCaptainMode: vi.fn(),
  captainPinHash: 'pbkdf2$existing-pin',
  resetCaptainPin: vi.fn(),
};

vi.mock('@/lib/stores', () => ({
  useUIStore: () => mockUIStore,
}));

describe('CaptainToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUIStore.isCaptainMode = false;
    mockUIStore.captainPinHash = 'pbkdf2$existing-pin';
    mockUIStore.enableCaptainMode.mockResolvedValue(undefined);
  });

  it('opens an accessible dialog and surfaces invalid PIN errors', async () => {
    const user = userEvent.setup();
    mockUIStore.enableCaptainMode.mockRejectedValue(new Error('Incorrect PIN'));

    render(<CaptainToggle />);

    await user.click(screen.getByRole('button', { name: /enable captain mode/i }));

    expect(screen.getByRole('dialog', { name: /captain mode/i })).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter PIN');
    await user.type(input, '1234');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect pin/i)).toBeInTheDocument();
    });
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
