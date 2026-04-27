import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScheduleTabSelector } from '@/components/schedule/SchedulePageSections';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    scroll: _scroll,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
    scroll?: boolean;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('ScheduleTabSelector', () => {
  it('keeps Full Schedule as a real link and uses the explicit click handler', () => {
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

    expect(fullScheduleTab).toHaveAttribute('href', '/schedule?view=all');
    fireEvent.click(fullScheduleTab);
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('keeps Your Matches as a real link and uses the explicit click handler', () => {
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

    expect(yourMatchesTab).toHaveAttribute('href', '/schedule');
    fireEvent.click(yourMatchesTab);
    expect(onSelectMy).toHaveBeenCalledTimes(1);
  });
});
