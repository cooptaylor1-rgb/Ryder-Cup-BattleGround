'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  AnnouncementComposer,
  AnnouncementHistory,
  type Announcement,
} from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Megaphone,
  MessageSquare,
  Send,
  Users,
  Zap,
} from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { currentTrip, players, sessions } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, sessions: s.sessions })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showComposer, setShowComposer] = useState(false);

  const liveOrUpcomingSession = useMemo(
    () => sessions.find((session) => session.status === 'inProgress') ?? sessions.find((session) => session.status === 'scheduled') ?? null,
    [sessions]
  );
  const urgentCount = announcements.filter((announcement) => announcement.priority === 'urgent').length;
  const latestAnnouncement = announcements[0] ?? null;

  const handleSendAnnouncement = (
    data: Omit<Announcement, 'id' | 'createdAt' | 'sentAt' | 'author'>
  ) => {
    const timestamp = new Date().toISOString();
    const nextAnnouncement: Announcement = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      sentAt: timestamp,
      totalRecipients: players.length,
      readCount: 0,
      author: {
        name: 'Captain',
        role: 'captain',
      },
    };

    setAnnouncements((current) => [nextAnnouncement, ...current]);
    setShowComposer(false);
    showToast('success', 'Announcement sent!');
  };

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to send announcements." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access messages." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Messages"
        subtitle={currentTrip.name}
        icon={<MessageSquare size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        backFallback="/captain"
        rightSlot={
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="btn-premium flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)]"
          >
            <Send size={16} />
            New
          </button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Communications</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--ink)]">
                Publish one clear note instead of thirty drifting texts.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                The best captain messages feel decisive: one bulletin, one audience, one version of the day.
                Keep the updates here so the trip sounds organized even when conditions are moving.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => setShowComposer(true)} leftIcon={<Megaphone size={16} />}>
                  New bulletin
                </Button>
                <Link
                  href="/captain/availability"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/55 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Open availability
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <MessageFactCard icon={<Users size={18} />} label="Recipients" value={players.length} detail="Every player on the trip" />
              <MessageFactCard
                icon={<CalendarDays size={18} />}
                label="Next Session"
                value={liveOrUpcomingSession?.name || 'No session set'}
                detail={liveOrUpcomingSession ? 'Use it as your next bulletin anchor' : 'Messages still work without one'}
                valueClassName="font-sans text-[1rem] not-italic leading-[1.2]"
              />
              <MessageFactCard
                icon={<Zap size={18} />}
                label="Urgent Notes"
                value={urgentCount}
                detail={urgentCount > 0 ? 'High-priority bulletins sent' : 'No urgent bulletins yet'}
                tone={urgentCount > 0 ? 'maroon' : 'ink'}
              />
            </div>
          </div>

          {latestAnnouncement ? (
            <div className="border-t border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-4)]">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Latest Bulletin</p>
              <div className="mt-[var(--space-3)] rounded-[1.5rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/86 p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                    latestAnnouncement.priority === 'urgent'
                      ? 'bg-[color:var(--error)]/12 text-[var(--error)]'
                      : 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
                  )}>
                    {latestAnnouncement.priority === 'urgent' ? 'Urgent' : 'Broadcast'}
                  </span>
                  <span className="text-sm text-[var(--ink-tertiary)]">
                    {latestAnnouncement.category}
                  </span>
                </div>
                <h2 className="mt-[var(--space-3)] font-serif text-[1.8rem] italic text-[var(--ink)]">
                  {latestAnnouncement.title}
                </h2>
                <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                  {latestAnnouncement.message}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.2fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            {showComposer ? (
              <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-3)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
                <AnnouncementComposer
                  onSend={handleSendAnnouncement}
                  onCancel={() => setShowComposer(false)}
                  recipientCount={players.length}
                  captainName="Captain"
                />
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
              <div className="flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Dispatch Log</p>
                  <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                    Keep the messages sounding like one captain.
                  </h2>
                </div>

                {!showComposer ? (
                  <Button variant="secondary" onClick={() => setShowComposer(true)} leftIcon={<Send size={16} />}>
                    Start bulletin
                  </Button>
                ) : null}
              </div>

              <div className="mt-[var(--space-4)]">
                {announcements.length > 0 ? (
                  <AnnouncementHistory
                    announcements={announcements}
                    onViewDetails={(announcement) => {
                      showToast('info', `Viewing: ${announcement.title}`);
                    }}
                  />
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/74 p-[var(--space-7)] text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                      <Megaphone size={26} />
                    </div>
                    <h3 className="mt-[var(--space-4)] font-serif text-[1.7rem] italic text-[var(--ink)]">
                      No bulletins have gone out yet.
                    </h3>
                    <p className="mx-auto mt-[var(--space-2)] max-w-[30rem] type-body-sm text-[var(--ink-secondary)]">
                      Start with the one update everyone will actually need: lineup posted, tee time moved, or weather shifting.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setShowComposer(true)}
                      leftIcon={<Send size={16} />}
                      className="mt-[var(--space-5)]"
                    >
                      Send first bulletin
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-[var(--space-4)]">
            <MessageSidebarCard
              title="Good broadcast cadence"
              body="Lead with the schedule change, follow with the one action players need to take, then stop. The best captain notes do not meander."
              icon={<Megaphone size={18} />}
            />
            <MessageSidebarCard
              title="When to use urgent"
              body="Reserve the urgent tone for weather, routing changes, and anything that changes where people need to be. If everything is urgent, nothing is."
              icon={<Zap size={18} />}
              tone="maroon"
            />
            <MessageSidebarCard
              title="Roster reality"
              body={`${players.length} player${players.length === 1 ? '' : 's'} will receive the next bulletin. Keep that audience tight enough that the note still feels intentional.`}
              icon={<Users size={18} />}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function MessageFactCard({
  icon,
  label,
  value,
  detail,
  valueClassName,
  tone = 'ink',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  valueClassName?: string;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'maroon'
          ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className={cn('mt-[var(--space-3)] font-serif text-[1.9rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function MessageSidebarCard({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'maroon'
          ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">Captain Note</span>
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{body}</p>
    </div>
  );
}
