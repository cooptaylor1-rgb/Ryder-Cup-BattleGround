/**
 * Captain announcement surfaces used by the messaging room.
 */

'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
} from '@/lib/types/logistics';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Megaphone,
  MessageCircle,
  Send,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';

export type { Announcement, AnnouncementCategory, AnnouncementPriority };

export interface AnnouncementTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  icon: ReactNode;
}

interface AnnouncementComposerProps {
  onSend: (announcement: Pick<Announcement, 'title' | 'message' | 'priority' | 'category'>) => void;
  onCancel?: () => void;
  recipientCount?: number;
  captainName?: string;
  className?: string;
}

interface AnnouncementHistoryProps {
  announcements: Announcement[];
  onViewDetails?: (announcement: Announcement) => void;
  className?: string;
}

const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'lineup-posted',
    name: 'Lineup Posted',
    title: 'Lineups Are Posted!',
    message: "Check the app to see tomorrow's pairings. Good luck everyone!",
    category: 'lineup',
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: 'tee-times',
    name: 'Tee Times',
    title: 'Tee Times Reminder',
    message: 'First group tees off at [TIME]. Please arrive 30 minutes early for warm-up.',
    category: 'schedule',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: 'weather-update',
    name: 'Weather Update',
    title: 'Weather Advisory',
    message: 'Weather conditions may affect play today. Stay tuned for updates.',
    category: 'weather',
    icon: <Cloud className="h-4 w-4" />,
  },
  {
    id: 'session-complete',
    name: 'Session Results',
    title: 'Session Complete!',
    message: 'All matches are in. Check standings for the latest scores.',
    category: 'results',
    icon: <Trophy className="h-4 w-4" />,
  },
  {
    id: 'location-change',
    name: 'Location Change',
    title: 'Location Update',
    message: 'There has been a change to our meeting location. Please check the details.',
    category: 'general',
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    id: 'urgent',
    name: 'Urgent Notice',
    title: 'Urgent: Please Read',
    message: '[Your urgent message here]',
    category: 'general',
    icon: <Zap className="h-4 w-4" />,
  },
];

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  general: 'General',
  schedule: 'Schedule',
  lineup: 'Lineup',
  weather: 'Weather',
  results: 'Results',
};

const CATEGORY_ICONS: Record<AnnouncementCategory, ReactNode> = {
  general: <MessageCircle className="h-5 w-5" />,
  schedule: <Calendar className="h-5 w-5" />,
  lineup: <Users className="h-5 w-5" />,
  weather: <Cloud className="h-5 w-5" />,
  results: <Trophy className="h-5 w-5" />,
};

export function AnnouncementComposer({
  onSend,
  onCancel,
  recipientCount = 0,
  captainName = 'Captain',
  className,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [category, setCategory] = useState<AnnouncementCategory>('general');
  const [showTemplates, setShowTemplates] = useState(true);

  const canSend = title.trim().length > 0 && message.trim().length > 0;

  const handleSelectTemplate = useCallback((template: AnnouncementTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
    setCategory(template.category);
    setPriority(template.id === 'urgent' ? 'urgent' : 'normal');
    setShowTemplates(false);
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;

    onSend({
      title: title.trim(),
      message: message.trim(),
      priority,
      category,
    });

    setTitle('');
    setMessage('');
    setPriority('normal');
    setCategory('general');
    setShowTemplates(true);
  }, [canSend, category, message, onSend, priority, title]);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,233,1))] shadow-[0_16px_34px_rgba(41,29,17,0.06)]',
        className
      )}
    >
      <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div className="flex gap-[var(--space-4)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)] shadow-[0_14px_30px_rgba(104,35,48,0.18)]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Broadcast Desk</p>
              <h3 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]">
                Write the note once.
              </h3>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                {recipientCount} player{recipientCount === 1 ? '' : 's'} will receive this bulletin.
              </p>
            </div>
          </div>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink)]"
              aria-label="Close composer"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      {showTemplates ? (
        <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="flex items-end justify-between gap-[var(--space-3)]">
            <div>
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Quick Starts</p>
              <p className="mt-[var(--space-1)] text-sm text-[var(--ink-secondary)]">
                Use a template when the moment matters more than the prose.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="text-sm font-semibold text-[var(--maroon)]"
            >
              Hide
            </button>
          </div>

          <div className="mt-[var(--space-4)] grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ANNOUNCEMENT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelectTemplate(template)}
                className="flex items-center gap-3 rounded-[1.1rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-[var(--space-3)] py-[var(--space-3)] text-left transition-all hover:border-[var(--maroon-subtle)] hover:bg-[color:var(--surface)]"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[0.95rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
                  {template.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--ink)]">{template.name}</span>
                  <span className="block truncate text-xs text-[var(--ink-secondary)]">{template.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.9fr)]">
          <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Tone</p>
            <div className="mt-[var(--space-3)] flex gap-2">
              <PriorityButton
                active={priority === 'normal'}
                label="Standard"
                onClick={() => setPriority('normal')}
              />
              <PriorityButton
                active={priority === 'urgent'}
                label="Urgent"
                icon={<Zap className="h-4 w-4" />}
                urgent
                onClick={() => setPriority('urgent')}
              />
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Category</p>
            <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_LABELS) as AnnouncementCategory[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={cn(
                    'rounded-full border px-3 py-2 text-sm font-semibold transition-all',
                    category === option
                      ? 'border-[var(--maroon)] bg-[var(--maroon)] text-[var(--canvas)]'
                      : 'border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 text-[var(--ink-secondary)] hover:text-[var(--ink)]'
                  )}
                >
                  {CATEGORY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="block text-sm font-semibold text-[var(--ink)]">Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Announcement title"
            className="mt-2 w-full rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-semibold text-[var(--ink)]">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write the one thing everyone needs to know."
            rows={5}
            className="mt-2 w-full resize-none rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
          />
        </label>

        {canSend ? (
          <div
            className={cn(
              'rounded-[1.35rem] border p-[var(--space-4)]',
              priority === 'urgent'
                ? 'border-[color:var(--error)]/18 bg-[linear-gradient(180deg,rgba(202,82,71,0.12),rgba(255,255,255,0.98))]'
                : 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[color:var(--canvas)]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                Preview
              </span>
              <span className="text-xs text-[var(--ink-tertiary)]">{CATEGORY_LABELS[category]}</span>
            </div>
            <p className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</p>
            <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{message}</p>
            <p className="mt-[var(--space-3)] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              {priority === 'urgent' ? 'Urgent bulletin' : 'Standard bulletin'} by {captainName}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold transition-transform duration-150',
            canSend
              ? 'bg-[var(--maroon)] text-[var(--canvas)] shadow-[0_14px_30px_rgba(104,35,48,0.20)] hover:scale-[1.01]'
              : 'bg-[color:var(--surface)] text-[var(--ink-tertiary)]'
          )}
        >
          <Send className="h-4 w-4" />
          Send Bulletin
        </button>
      </div>
    </div>
  );
}

function PriorityButton({
  active,
  label,
  icon,
  urgent = false,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  urgent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
        active && !urgent && 'bg-[var(--maroon)] text-[var(--canvas)] shadow-[0_12px_24px_rgba(104,35,48,0.16)]',
        active && urgent && 'bg-[var(--error)] text-[var(--canvas)] shadow-[0_12px_24px_rgba(202,82,71,0.16)]',
        !active && 'bg-[color:var(--canvas)]/72 text-[var(--ink-secondary)]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function AnnouncementHistory({
  announcements,
  onViewDetails,
  className,
}: AnnouncementHistoryProps) {
  if (announcements.length === 0) {
    return (
      <div
        className={cn(
          'rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/72 p-[var(--space-7)] text-center',
          className
        )}
      >
        <Megaphone className="mx-auto h-12 w-12 text-[var(--ink-tertiary)]" />
        <p className="mt-[var(--space-4)] font-serif text-[1.6rem] italic text-[var(--ink)]">
          No announcements yet
        </p>
        <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
          Send the first bulletin to establish the tone of the trip.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onClick={() => onViewDetails?.(announcement)}
        />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onClick,
}: {
  announcement: Announcement;
  onClick?: () => void;
}) {
  const urgent = announcement.priority === 'urgent';
  const timeSent = announcement.sentAt ? formatRelativeTime(announcement.sentAt) : 'Draft';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-[1.45rem] border p-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01]',
        urgent
          ? 'border-[color:var(--error)]/18 bg-[linear-gradient(180deg,rgba(202,82,71,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/88'
      )}
    >
      <div className="flex items-start gap-[var(--space-3)]">
        <div
          className={cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]',
            urgent ? 'bg-[color:var(--error)] text-[var(--canvas)]' : 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
          )}
        >
          {CATEGORY_ICONS[announcement.category]}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[color:var(--canvas)]/74 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
              {CATEGORY_LABELS[announcement.category]}
            </span>
            {urgent ? (
              <span className="rounded-full bg-[color:var(--error)]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--error)]">
                Urgent
              </span>
            ) : null}
          </div>

          <div className="mt-[var(--space-3)] flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className="font-serif text-[1.45rem] italic leading-tight text-[var(--ink)]">
                {announcement.title}
              </p>
              <p className="mt-[var(--space-2)] line-clamp-3 text-sm leading-6 text-[var(--ink-secondary)]">
                {announcement.message}
              </p>
            </div>
            <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              {timeSent}
            </span>
          </div>

          {announcement.readCount !== undefined && announcement.totalRecipients !== undefined ? (
            <div className="mt-[var(--space-3)] flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {announcement.readCount}/{announcement.totalRecipients} read
              </span>
            </div>
          ) : null}
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--ink-tertiary)]" />
      </div>
    </button>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default AnnouncementComposer;
