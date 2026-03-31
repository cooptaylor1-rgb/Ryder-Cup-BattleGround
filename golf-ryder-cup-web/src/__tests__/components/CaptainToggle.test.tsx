import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CaptainToggle } from '@/components/ui/CaptainToggle';

const mockAccessStore = {
  isCaptainMode: false,
  enableCaptainMode: vi.fn(),
  disableCaptainMode: vi.fn(),
  captainPinHash: 'pbkdf2$existing-pin',
  resetCaptainPin: vi.fn(),
};

vi.mock('@/lib/stores', () => ({
  useAccessStore: () => mockAccessStore,
}));

describe('CaptainToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessStore.isCaptainMode = false;
    mockAccessStore.captainPinHash = 'pbkdf2$existing-pin';
    mockAccessStore.enableCaptainMode.mockResolvedValue(undefined);
  });

  it('opens an accessible dialog and surfaces invalid PIN errors', async () => {
    const user = userEvent.setup();
    mockAccessStore.enableCaptainMode.mockRejectedValue(new Error('Incorrect PIN'));

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
