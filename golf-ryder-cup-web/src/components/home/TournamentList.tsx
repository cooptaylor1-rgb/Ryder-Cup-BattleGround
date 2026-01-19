/**
 * Tournament List Component
 *
 * Displays a list of past tournaments with selection.
 */
'use client';

import { Trophy, MapPin, Calendar, ChevronRight, Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { NoTournamentsEmpty } from '@/components/ui';
import type { Trip } from '@/lib/types/models';

interface TournamentListProps {
    trips: Trip[];
    activeTrip: Trip | null | undefined;
    hasTrips: boolean;
    onSelectTrip: (tripId: string) => void;
    onCreateTrip: () => void;
    onJoinTrip: () => void;
}

export function TournamentList({
    trips,
    activeTrip,
    hasTrips,
    onSelectTrip,
    onCreateTrip,
    onJoinTrip,
}: TournamentListProps) {
    const pastTrips = trips.filter(t => t.id !== activeTrip?.id);

    return (
        <section className={activeTrip ? 'section-sm' : 'section'}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-6)',
                }}
            >
                <h2 className="type-overline" style={{ letterSpacing: '0.15em' }}>
                    {hasTrips ? 'Tournaments' : 'Get Started'}
                </h2>
                {hasTrips && (
                    <button
                        onClick={onCreateTrip}
                        className="btn-premium press-scale"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-4)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-sm)',
                        }}
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        New
                    </button>
                )}
            </div>

            {pastTrips.length > 0 ? (
                <div className="stagger-fast" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {pastTrips.map((trip, index) => (
                        <TournamentCard
                            key={trip.id}
                            trip={trip}
                            index={index}
                            onSelect={onSelectTrip}
                        />
                    ))}
                </div>
            ) : !activeTrip ? (
                <NoTournamentsEmpty
                    onCreateTrip={onCreateTrip}
                    onJoinTrip={onJoinTrip}
                />
            ) : null}
        </section>
    );
}

interface TournamentCardProps {
    trip: Trip;
    index: number;
    onSelect: (tripId: string) => void;
}

function TournamentCard({ trip, index, onSelect }: TournamentCardProps) {
    return (
        <button
            onClick={() => onSelect(trip.id)}
            className="card-premium press-scale stagger-item active:scale-[0.98]"
            style={{
                width: '100%',
                textAlign: 'left',
                animationDelay: `${index * 50}ms`,
                padding: 'var(--space-5)',
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderRadius: 'var(--radius-xl)',
            }}
        >
            {/* Tournament Icon */}
            <div
                style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}
            >
                <Trophy size={24} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p className="type-title" style={{ marginBottom: 'var(--space-2)', fontWeight: 700, fontSize: '17px' }}>
                    {trip.name}
                </p>
                <div className="type-caption" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '14px' }}>
                    {trip.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <MapPin size={14} strokeWidth={1.5} style={{ color: 'var(--masters)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.location}</span>
                        </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Calendar size={14} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)' }} />
                        {formatDate(trip.startDate, 'short')}
                    </span>
                </div>
            </div>
            <ChevronRight
                size={22}
                strokeWidth={1.5}
                style={{ color: 'var(--masters)', flexShrink: 0 }}
            />
        </button>
    );
}
