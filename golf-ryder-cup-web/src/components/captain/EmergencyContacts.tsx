/**
 * Emergency Contacts View
 *
 * Quick access to all player phone numbers in emergencies.
 * Essential for coordinating when players are spread across the course.
 *
 * Features:
 * - Searchable contact list
 * - One-tap call/text
 * - Group by team or tee time
 * - Important numbers (clubhouse, pro shop, course marshal)
 * - Emergency action buttons
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Phone,
    MessageSquare,
    Search,
    MapPin,
    Clock,
    Star,
    ChevronDown,
    Shield,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

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

// ============================================
// DEFAULT VENUE CONTACTS
// ============================================

const DEFAULT_VENUE_CONTACTS: VenueContact[] = [
    { id: '1', name: 'Pro Shop', role: 'Golf Course', phone: '', isPrimary: true },
    { id: '2', name: 'Starter', role: 'First Tee', phone: '' },
    { id: '3', name: 'Course Marshal', role: 'On Course', phone: '' },
    { id: '4', name: 'Clubhouse', role: 'Main Building', phone: '' },
    { id: '5', name: '911', role: 'Emergency Services', phone: '911', isPrimary: true },
];

// ============================================
// CONTACT CARD COMPONENT
// ============================================

interface ContactCardProps {
    name: string;
    subtitle?: string;
    phone: string;
    teamIndicator?: 'A' | 'B';
    isPrimary?: boolean;
    onCall: () => void;
    onText: () => void;
}

function ContactCard({
    name,
    subtitle,
    phone,
    teamIndicator,
    isPrimary,
    onCall,
    onText,
}: ContactCardProps) {
    const hasPhone = phone && phone.length > 0;

    return (
        <div
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{ background: 'var(--surface)' }}
        >
            <div className="flex items-center gap-3">
                {teamIndicator && (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                            background: teamIndicator === 'A' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: teamIndicator === 'A' ? '#ef4444' : '#3b82f6',
                        }}
                    >
                        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                )}
                {isPrimary && !teamIndicator && (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(34, 197, 94, 0.2)' }}
                    >
                        <Star className="w-5 h-5 text-green-500" />
                    </div>
                )}
                {!teamIndicator && !isPrimary && (
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--canvas)' }}
                    >
                        <Phone className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                    </div>
                )}
                <div>
                    <p className="font-medium" style={{ color: 'var(--ink)' }}>
                        {name}
                    </p>
                    {subtitle && (
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {subtitle}
                        </p>
                    )}
                    {hasPhone && (
                        <p className="text-sm font-mono" style={{ color: 'var(--ink-muted)' }}>
                            {phone}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onText}
                    disabled={!hasPhone}
                    className={cn(
                        'p-2 rounded-lg transition-colors',
                        hasPhone ? 'hover:bg-white/10' : 'opacity-30'
                    )}
                    style={{ background: 'var(--canvas)' }}
                >
                    <MessageSquare className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                </button>
                <button
                    onClick={onCall}
                    disabled={!hasPhone}
                    className={cn(
                        'p-2 rounded-lg transition-colors',
                        hasPhone ? 'hover:bg-green-500/20' : 'opacity-30'
                    )}
                    style={{ background: 'rgba(34, 197, 94, 0.15)' }}
                >
                    <Phone className="w-5 h-5 text-green-500" />
                </button>
            </div>
        </div>
    );
}

// ============================================
// EMERGENCY CONTACTS COMPONENT
// ============================================

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

    // Filter players by search
    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return players;
        const query = searchQuery.toLowerCase();
        return players.filter(
            p =>
                p.firstName.toLowerCase().includes(query) ||
                p.lastName.toLowerCase().includes(query) ||
                p.phone.includes(query)
        );
    }, [players, searchQuery]);

    // Group players
    const groupedPlayers = useMemo(() => {
        const groups: Record<string, ContactPlayer[]> = {};

        if (groupBy === 'team') {
            groups[`team-a`] = filteredPlayers.filter(p => p.teamId === 'A');
            groups[`team-b`] = filteredPlayers.filter(p => p.teamId === 'B');
        } else if (groupBy === 'tee-time') {
            filteredPlayers.forEach(player => {
                const key = player.teeTime || 'unscheduled';
                if (!groups[key]) groups[key] = [];
                groups[key].push(player);
            });
        } else {
            // Alphabetical
            filteredPlayers.forEach(player => {
                const letter = player.lastName[0].toUpperCase();
                if (!groups[letter]) groups[letter] = [];
                groups[letter].push(player);
            });
        }

        return groups;
    }, [filteredPlayers, groupBy]);

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const handleCall = (playerId: string, phone: string) => {
        if (onCall) {
            onCall(playerId, phone);
        } else {
            // Use standard DOM API for phone call link
            const link = document.createElement('a');
            link.href = `tel:${phone}`;
            link.click();
        }
    };

    const handleText = (playerId: string, phone: string) => {
        if (onText) {
            onText(playerId, phone);
        } else {
            // Use standard DOM API for SMS link
            const link = document.createElement('a');
            link.href = `sms:${phone}`;
            link.click();
        }
    };

    const getGroupLabel = (groupId: string): string => {
        if (groupBy === 'team') {
            return groupId === 'team-a' ? teamAName : teamBName;
        }
        if (groupBy === 'tee-time') {
            return groupId === 'unscheduled' ? 'Unscheduled' : `${groupId} Tee Time`;
        }
        return groupId; // Alphabetical
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Emergency Contacts
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {players.length} players • Quick access to everyone
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search players..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg"
                        style={{
                            background: 'var(--surface)',
                            color: 'var(--ink)',
                            border: '1px solid rgba(128, 120, 104, 0.2)',
                        }}
                    />
                </div>

                {/* Group By */}
                <div className="flex gap-2">
                    {(['team', 'tee-time', 'alphabetical'] as const).map(option => (
                        <button
                            key={option}
                            onClick={() => setGroupBy(option)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize'
                            )}
                            style={{
                                background: groupBy === option ? 'var(--masters-muted)' : 'var(--surface)',
                                color: groupBy === option ? 'var(--masters)' : 'var(--ink)',
                                border: '1px solid rgba(128, 120, 104, 0.2)',
                            }}
                        >
                            {option === 'tee-time' ? 'Tee Time' : option}
                        </button>
                    ))}
                </div>
            </div>

            {/* Emergency Actions */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Emergency Actions</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.location.href = 'tel:911'}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 text-white font-semibold"
                    >
                        <Phone className="w-4 h-4" />
                        Call 911
                    </button>
                    <button
                        onClick={() => {
                            // In a real app, this would send location to all players
                            if (navigator.share) {
                                navigator.share({
                                    title: 'Golf Course Location',
                                    text: 'Emergency - sharing course location',
                                });
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg"
                        style={{ background: 'var(--surface)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                    >
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="text-red-600">Share Location</span>
                    </button>
                </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto">
                {/* Venue Contacts */}
                <div className="border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <button
                        onClick={() => toggleGroup('venue')}
                        className="w-full flex items-center justify-between p-4"
                    >
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                            <span className="font-medium" style={{ color: 'var(--ink)' }}>Venue & Course</span>
                        </div>
                        <ChevronDown
                            className={cn('w-5 h-5 transition-transform', expandedGroups.has('venue') && 'rotate-180')}
                            style={{ color: 'var(--ink-muted)' }}
                        />
                    </button>
                    <AnimatePresence>
                        {expandedGroups.has('venue') && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 space-y-2">
                                    {venueContacts.map(contact => (
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
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Player Groups */}
                {Object.entries(groupedPlayers)
                    .filter(([, groupPlayers]) => groupPlayers.length > 0)
                    .map(([groupId, groupPlayers]) => (
                        <div key={groupId} className="border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                            <button
                                onClick={() => toggleGroup(groupId)}
                                className="w-full flex items-center justify-between p-4"
                            >
                                <div className="flex items-center gap-2">
                                    {groupBy === 'team' && (
                                        <div
                                            className="w-5 h-5 rounded-full"
                                            style={{ background: groupId === 'team-a' ? '#ef4444' : '#3b82f6' }}
                                        />
                                    )}
                                    {groupBy === 'tee-time' && (
                                        <Clock className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                    )}
                                    {groupBy === 'alphabetical' && (
                                        <div
                                            className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold"
                                            style={{ background: 'var(--surface)', color: 'var(--ink)' }}
                                        >
                                            {groupId}
                                        </div>
                                    )}
                                    <span className="font-medium" style={{ color: 'var(--ink)' }}>
                                        {getGroupLabel(groupId)}
                                    </span>
                                    <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                        ({groupPlayers.length})
                                    </span>
                                </div>
                                <ChevronDown
                                    className={cn('w-5 h-5 transition-transform', expandedGroups.has(groupId) && 'rotate-180')}
                                    style={{ color: 'var(--ink-muted)' }}
                                />
                            </button>
                            <AnimatePresence>
                                {expandedGroups.has(groupId) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-2">
                                            {groupPlayers.map(player => (
                                                <ContactCard
                                                    key={player.id}
                                                    name={`${player.firstName} ${player.lastName}`}
                                                    subtitle={player.notes}
                                                    phone={player.phone}
                                                    teamIndicator={player.teamId}
                                                    onCall={() => handleCall(player.id, player.phone)}
                                                    onText={() => handleText(player.id, player.phone)}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
            </div>
        </div>
    );
}

export default EmergencyContacts;
