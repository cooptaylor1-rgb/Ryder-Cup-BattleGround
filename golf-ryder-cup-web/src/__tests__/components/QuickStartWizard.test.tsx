/**
 * QuickStartWizard Component Tests
 *
 * Tests that every wizard step has a visible Continue/Create button
 * and that the wizard overlays above the BottomNav (z-index).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickStartWizard } from '@/components/ui/QuickStartWizard';

describe('QuickStartWizard', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWizard() {
    return render(
      <QuickStartWizard onComplete={mockOnComplete} onCancel={mockOnCancel} />
    );
  }

  describe('Step navigation buttons', () => {
    it('step 1 (basics) shows Continue button', () => {
      renderWizard();

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('step 2 (dates) shows Continue button after advancing', () => {
      renderWizard();

      // Fill required field for step 1
      const nameInput = screen.getByPlaceholderText(/Annual Buddies Cup/);
      fireEvent.change(nameInput, { target: { value: 'Test Trip' } });

      // Advance to step 2
      fireEvent.click(screen.getByText('Continue'));

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('step 3 (teams) shows Continue button after advancing', () => {
      renderWizard();

      // Step 1: fill name and advance
      fireEvent.change(screen.getByPlaceholderText(/Annual Buddies Cup/), {
        target: { value: 'Test Trip' },
      });
      fireEvent.click(screen.getByText('Continue'));

      // Step 2: fill dates and advance
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dateInputs = screen.getAllByDisplayValue('');
      // Start date input
      fireEvent.change(dateInputs[0], { target: { value: today } });
      // End date input
      fireEvent.change(dateInputs[1], { target: { value: tomorrow } });
      fireEvent.click(screen.getByText('Continue'));

      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    it('step 4 (confirm) shows Create Trip button', () => {
      renderWizard();

      // Step 1: fill name
      fireEvent.change(screen.getByPlaceholderText(/Annual Buddies Cup/), {
        target: { value: 'Test Trip' },
      });
      fireEvent.click(screen.getByText('Continue'));

      // Step 2: fill dates
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dateInputs = screen.getAllByDisplayValue('');
      fireEvent.change(dateInputs[0], { target: { value: today } });
      fireEvent.change(dateInputs[1], { target: { value: tomorrow } });
      fireEvent.click(screen.getByText('Continue'));

      // Step 3: team names are pre-filled (USA/Europe), advance
      fireEvent.click(screen.getByText('Continue'));

      expect(screen.getByText('Create Trip')).toBeInTheDocument();
    });
  });

  describe('Overlay z-index', () => {
    it('wizard container has z-index above BottomNav (z-50)', () => {
      renderWizard();

      // The wizard root is the fixed overlay
      const wizard = screen.getByText('Continue').closest('[class*="fixed"]');
      expect(wizard).toBeTruthy();
      // z-[60] renders as class containing 'z-[60]'
      expect(wizard?.className).toMatch(/z-\[60\]/);
    });
  });

  describe('Cancel', () => {
    it('close button calls onCancel', () => {
      vi.useFakeTimers();
      renderWizard();

      // Click the X button (first button in the header)
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      vi.advanceTimersByTime(300);
      expect(mockOnCancel).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('Back navigation', () => {
    it('step 1 has no Back button', () => {
      renderWizard();

      // Only the X button and Continue button should exist in the footer/header
      const allButtons = screen.getAllByRole('button');
      const buttonTexts = allButtons.map(b => b.textContent);
      expect(buttonTexts.some(t => t?.includes('Back'))).toBe(false);
    });

    it('step 2 has a Back button', () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText(/Annual Buddies Cup/), {
        target: { value: 'Test Trip' },
      });
      fireEvent.click(screen.getByText('Continue'));

      // Back button is the ChevronLeft icon button
      const allButtons = screen.getAllByRole('button');
      // Should have at least 3 buttons: X, Back, Continue
      expect(allButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Validation', () => {
    it('Continue is disabled when name is empty on step 1', () => {
      renderWizard();

      const continueBtn = screen.getByText('Continue').closest('button');
      expect(continueBtn).toBeDisabled();
    });

    it('Continue is enabled when name is filled on step 1', () => {
      renderWizard();

      fireEvent.change(screen.getByPlaceholderText(/Annual Buddies Cup/), {
        target: { value: 'My Trip' },
      });

      const continueBtn = screen.getByText('Continue').closest('button');
      expect(continueBtn).not.toBeDisabled();
    });
  });
});
