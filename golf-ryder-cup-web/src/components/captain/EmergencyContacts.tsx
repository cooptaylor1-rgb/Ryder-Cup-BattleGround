'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown, Clock, MapPin, MessageSquare, Phone, Search, Shield, Star, Users } from 'lucide-react';

export interface ContactPlayer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  teamId: 'A' | 'B';
  teeTime?: string;
  isEmergencyContact?: boolean;
  notes?: string;
}

export interface VenueContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  isPrimary?: boolean;
}

interface EmergencyContactsProps {
  players: ContactPlayer[];
  venueContacts?: VenueContact[];
  teamAName?: string;
  teamBName?: string;
  onCall?: (playerId: string, phone: string) => void;
  onText?: (playerId: string, phone: string) => void;
  className?: string;
}

const DEFAULT_VENUE_CONTACTS: VenueContact[] = [
  { id: '1', name: 'Pro Shop', role: 'Golf Course', phone: '', isPrimary: true },
  { id: '2', name: 'Starter', role: 'First Tee', phone: '' },
  { id: '3', name: 'Course Marshal', role: 'On Course', phone: '' },
  { id: '4', name: 'Clubhouse', role: 'Main Building', phone: '' },
  { id: '5', name: '911', role: 'Emergency Services', phone: '911', isPrimary: true },
];

export function EmergencyContacts({
  players,
  venueContacts = DEFAULT_VENUE_CONTACTS,
  teamAName = 'Team A',
  teamBName = 'Team B',
  onCall,
  onText,
  className,
}: EmergencyContactsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'team' | 'tee-time' | 'alphabetical'>('team');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['venue', 'team-a', 'team-b']));

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();

    return players.filter(
      (player) =>
        player.firstName.toLowerCase().includes(query) ||
        player.lastName.toLowerCase().includes(query) ||
        player.phone.includes(query)
    );
  }, [players, searchQuery]);

  const groupedPlayers = useMemo(() => {
    const groups: Record<string, ContactPlayer[]> = {};

    if (groupBy === 'team') {
      groups['team-a'] = filteredPlayers.filter((player) => player.teamId === 'A');
      groups['team-b'] = filteredPlayers.filter((player) => player.teamId === 'B');
      return groups;
    }

    if (groupBy === 'tee-time') {
      filteredPlayers.forEach((player) => {
        const key = player.teeTime || 'unscheduled';
        groups[key] = [...(groups[key] || []), player];
      });
      return groups;
    }

    filteredPlayers.forEach((player) => {
      const key = player.lastName[0]?.toUpperCase() || '?';
      groups[key] = [...(groups[key] || []), player];
    });
    return groups;
  }, [filteredPlayers, groupBy]);

  const handleCall = (playerId: string, phone: string) => {
    if (onCall) {
      onCall(playerId, phone);
      return;
    }

    const link = document.createElement('a');
    link.href = `tel:${phone}`;
    link.click();
  };

  const handleText = (playerId: string, phone: string) => {
    if (onText) {
      onText(playerId, phone);
      return;
    }

    const link = document.createElement('a');
    link.href = `sms:${phone}`;
    link.click();
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const primaryVenueContact = venueContacts.find((contact) => contact.isPrimary && contact.phone) || null;

  const getGroupLabel = (groupId: string): string => {
    if (groupBy === 'team') {
      return groupId === 'team-a' ? teamAName : teamBName;
    }
    if (groupBy === 'tee-time') {
      return groupId === 'unscheduled' ? 'Unscheduled' : `${groupId} Tee Time`;
    }
    return groupId;
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.7rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] shadow-[0_18px_38px_rgba(41,29,17,0.05)]',
        className
      )}
    >
      <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-[var(--space-4)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
              <Phone size={22} />
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Contact Board</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                Keep the call tree short and visible.
              </h2>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                Search the roster, group by the lens that helps, and keep venue numbers close enough to matter.
              </p>
            </div>
          </div>

          <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <ContactMetric label="Roster" value={players.length} detail="Player contacts on file" tone="ink" />
            <ContactMetric label="Venue" value={venueContacts.length} detail="Course-side numbers" tone="maroon" />
          </div>
        </div>

        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search roster or phone"
              className="w-full rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 py-[0.9rem] pl-11 pr-4 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(['team', 'tee-time', 'alphabetical'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setGroupBy(option)}
                className={cn(
                  'rounded-full border px-[var(--space-3)] py-[var(--space-2)] text-sm font-semibold transition-all',
                  groupBy === option
                    ? 'border-[var(--maroon)] bg-[var(--maroon)] text-[var(--canvas)]'
                    : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)] hover:text-[var(--ink)]'
                )}
              >
                {option === 'tee-time' ? 'Tee Time' : option === 'alphabetical' ? 'A-Z' : 'Teams'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-[var(--space-4)] p-[var(--space-4)] xl:grid-cols-[minmax(0,1.1fr)_20rem]">
        <div className="space-y-[var(--space-4)]">
          <EmergencyActionRail
            primaryVenueContact={primaryVenueContact}
            onCall={handleCall}
          />

          <GroupPanel
            title="Venue & Course"
            badge={`${venueContacts.length}`}
            icon={<Shield size={18} />}
            expanded={expandedGroups.has('venue')}
            onToggle={() => toggleGroup('venue')}
          >
            <div className="space-y-3">
              {venueContacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  name={contact.name}
                  subtitle={contact.role}
                  phone={contact.phone}
                  isPrimary={contact.isPrimary}
                  onCall={() => handleCall(contact.id, contact.phone)}
                  onText={() => handleText(contact.id, contact.phone)}
                />
              ))}
            </div>
          </GroupPanel>

          {Object.entries(groupedPlayers)
            .filter(([, groupPlayers]) => groupPlayers.length > 0)
            .map(([groupId, groupPlayers]) => (
              <GroupPanel
                key={groupId}
                title={getGroupLabel(groupId)}
                badge={`${groupPlayers.length}`}
                icon={
                  groupBy === 'team' ? (
                    <Users size={18} />
                  ) : groupBy === 'tee-time' ? (
                    <Clock size={18} />
                  ) : (
                    <span className="text-sm font-semibold">{groupId}</span>
                  )
                }
                expanded={expandedGroups.has(groupId)}
                onToggle={() => toggleGroup(groupId)}
              >
                <div className="space-y-3">
                  {groupPlayers.map((player) => (
                    <ContactCard
                      key={player.id}
                      name={`${player.firstName} ${player.lastName}`}
                      subtitle={player.notes || (player.teeTime ? `Tee ${player.teeTime}` : undefined)}
                      phone={player.phone}
                      teamIndicator={player.teamId}
                      onCall={() => handleCall(player.id, player.phone)}
                      onText={() => handleText(player.id, player.phone)}
                    />
                  ))}
                </div>
              </GroupPanel>
            ))}
        </div>

        <aside className="space-y-[var(--space-4)]">
          <CaptainNote
            title="Use the board, not the thread"
            body="If the first emergency move requires searching old texts, the contact plan is already late."
            icon={<Phone size={18} />}
          />
          <CaptainNote
            title="Name the first call"
            body="One primary venue number keeps captains from scattering attention across the clubhouse, starter, and pro shop at the worst time."
            icon={<Star size={18} />}
            tone="maroon"
          />
        </aside>
      </div>
    </div>
  );
}

function ContactMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'ink' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.2rem] border p-[var(--space-4)]',
        tone === 'maroon'
          ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82'
      )}
    >
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.8rem] italic leading-none text-[var(--ink)]">{value}</p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function EmergencyActionRail({
  primaryVenueContact,
  onCall,
}: {
  primaryVenueContact: VenueContact | null;
  onCall: (playerId: string, phone: string) => void;
}) {
  return (
    <section className="rounded-[1.55rem] border border-[color:var(--error)]/18 bg-[linear-gradient(180deg,rgba(202,82,71,0.09),rgba(255,255,255,0.98))] p-[var(--space-4)]">
      <p className="type-overline tracking-[0.15em] text-[var(--error)]">Emergency Rail</p>
      <div className="mt-[var(--space-3)] grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onCall('911', '911')}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--error)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)]"
        >
          <Phone size={16} />
          Call 911
        </button>
        <button
          type="button"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Golf Course Location',
                text: 'Emergency - sharing course location',
              });
            }
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[color:var(--error)]/18 bg-[color:var(--canvas)]/84 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--error)]"
        >
          <MapPin size={16} />
          Share location
        </button>
      </div>
      {primaryVenueContact ? (
        <p className="mt-[var(--space-3)] text-sm text-[var(--ink-secondary)]">
          Primary venue line: <span className="font-semibold text-[var(--ink)]">{primaryVenueContact.name}</span>{' '}
          at <span className="font-semibold text-[var(--ink)]">{primaryVenueContact.phone}</span>
        </p>
      ) : null}
    </section>
  );
}

function GroupPanel({
  title,
  badge,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  badge: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/84 shadow-[0_16px_34px_rgba(41,29,17,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] text-left"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
            <p className="text-sm text-[var(--ink-secondary)]">{badge} contact{badge === '1' ? '' : 's'}</p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn('text-[var(--ink-tertiary)] transition-transform', expanded && 'rotate-180')}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[color:var(--rule)]/70 bg-[color:var(--surface-raised)]/55 px-[var(--space-4)] py-[var(--space-4)]">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function ContactCard({
  name,
  subtitle,
  phone,
  teamIndicator,
  isPrimary,
  onCall,
  onText,
}: {
  name: string;
  subtitle?: string;
  phone: string;
  teamIndicator?: 'A' | 'B';
  isPrimary?: boolean;
  onCall: () => void;
  onText: () => void;
}) {
  const hasPhone = phone.trim().length > 0;

  return (
    <div className="flex items-center justify-between gap-[var(--space-3)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/84 px-[var(--space-3)] py-[var(--space-3)]">
      <div className="flex min-w-0 items-center gap-[var(--space-3)]">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            teamIndicator === 'A' && 'bg-[color:var(--team-usa)]/20 text-[var(--team-usa)]',
            teamIndicator === 'B' && 'bg-[color:var(--team-europe)]/20 text-[var(--team-europe)]',
            !teamIndicator && isPrimary && 'bg-[color:var(--success)]/20 text-[var(--success)]',
            !teamIndicator && !isPrimary && 'bg-[color:var(--surface)] text-[var(--ink-tertiary)]'
          )}
        >
          {teamIndicator ? (
            <span className="text-sm font-semibold">
              {name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </span>
          ) : isPrimary ? (
            <Star size={18} />
          ) : (
            <Phone size={18} />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{name}</p>
          {subtitle ? <p className="text-sm text-[var(--ink-secondary)]">{subtitle}</p> : null}
          {hasPhone ? <p className="text-sm text-[var(--ink-tertiary)]">{phone}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onText}
          disabled={!hasPhone}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)] text-[var(--maroon)] disabled:opacity-35"
          aria-label={`Text ${name}`}
        >
          <MessageSquare size={16} />
        </button>
        <button
          type="button"
          onClick={onCall}
          disabled={!hasPhone}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--success)]/12 text-[var(--success)] disabled:opacity-35"
          aria-label={`Call ${name}`}
        >
          <Phone size={16} />
        </button>
      </div>
    </div>
  );
}

function CaptainNote({
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
        'rounded-[1.55rem] border p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.04)]',
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

export default EmergencyContacts;
