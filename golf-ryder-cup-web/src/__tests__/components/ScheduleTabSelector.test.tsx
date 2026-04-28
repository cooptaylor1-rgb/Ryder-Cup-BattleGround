import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleTabSelector } from '@/components/schedule/SchedulePageSections';

describe('ScheduleTabSelector', () => {
  it('fires the explicit click handler when Full Schedule is tapped', () => {
    const onSelectAll = vi.fn();

    render(
      <ScheduleTabSelector
        selectedTab="my"
        myHref="/schedule"
        allHref="/schedule?view=all"
        onSelectAll={onSelectAll}
      />
    );

    const fullScheduleTab = screen.getByRole('tab', { name: /full schedule/i });

    // data-href is exposed for downstream tooling — actual navigation is
    // driven by the onClick handler below.
    expect(fullScheduleTab).toHaveAttribute('data-href', '/schedule?view=all');
    expect(fullScheduleTab).not.toBeDisabled();
    fireEvent.click(fullScheduleTab);
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('fires the explicit click handler when Your Matches is tapped', () => {
    const onSelectMy = vi.fn();

    render(
      <ScheduleTabSelector
        selectedTab="all"
        myHref="/schedule"
        allHref="/schedule?view=all"
        onSelectMy={onSelectMy}
      />
    );

    const yourMatchesTab = screen.getByRole('tab', { name: /your matches/i });

    expect(yourMatchesTab).toHaveAttribute('data-href', '/schedule');
    expect(yourMatchesTab).not.toBeDisabled();
    fireEvent.click(yourMatchesTab);
    expect(onSelectMy).toHaveBeenCalledTimes(1);
  });

  it('disables a tab when no handler is provided so dead taps are obvious', () => {
    render(
      <ScheduleTabSelector
        selectedTab="my"
        myHref="/schedule"
        allHref="/schedule?view=all"
      />
    );

    expect(screen.getByRole('tab', { name: /your matches/i })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /full schedule/i })).toBeDisabled();
  });
});
