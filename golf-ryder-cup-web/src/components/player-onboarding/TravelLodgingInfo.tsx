'use client';

/**
 * Travel & Lodging Info
 *
 * Capture travel details for trip coordination:
 * - Flight info / arrival times
 * - Lodging preferences
 * - Roommate requests
 * - Transportation needs
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plane,
    Car,
    Home,
    ChevronDown,
    ChevronUp,
    Moon,
    Sun,
    Coffee,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface TravelInfo {
    // Arrival
    arrivalMethod: 'flying' | 'driving' | 'already-there';
    arrivalDate?: string;
    arrivalTime?: string;
    flightNumber?: string;
    arrivalAirport?: string;
    needsPickup: boolean;

    // Departure
    departureDate?: string;
    departureTime?: string;
    departureFlightNumber?: string;
    needsDropoff: boolean;

    // Lodging
    lodgingPreference: 'shared' | 'private' | 'no-preference';
    roommateRequest?: string;
    roomPreferences: string[];
    sleepSchedule: 'early-bird' | 'night-owl' | 'flexible';

    // Special needs
    specialRequests?: string;
}

interface TravelLodgingInfoProps {
    onInfoChange: (info: TravelInfo) => void;
    initialInfo?: Partial<TravelInfo>;
    tripStartDate?: string;
    tripEndDate?: string;
    teammates?: string[];
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const ROOM_PREFERENCES = [
    { id: 'quiet', label: 'Quiet room', emoji: '🤫' },
    { id: 'early-tee', label: 'Near lobby (early tee time)', emoji: '⏰' },
    { id: 'view', label: 'Course view', emoji: '🏌️' },
    { id: 'ground-floor', label: 'Ground floor', emoji: '🚪' },
    { id: 'balcony', label: 'Balcony', emoji: '🌅' },
];

// ============================================
// COMPONENT
// ============================================

export function TravelLodgingInfo({
    onInfoChange,
    initialInfo,
    tripStartDate,
    tripEndDate: _tripEndDate,
    teammates = [],
    className,
}: TravelLodgingInfoProps) {
    const [info, setInfo] = useState<TravelInfo>({
        arrivalMethod: 'flying',
        needsPickup: false,
        needsDropoff: false,
        lodgingPreference: 'no-preference',
        roomPreferences: [],
        sleepSchedule: 'flexible',
        ...initialInfo,
    });
    const [expandedSection, setExpandedSection] = useState<string | null>('arrival');

    const updateInfo = (updates: Partial<TravelInfo>) => {
        const newInfo = { ...info, ...updates };
        setInfo(newInfo);
        onInfoChange(newInfo);
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const toggleRoomPreference = (prefId: string) => {
        const current = info.roomPreferences || [];
        const newPrefs = current.includes(prefId)
            ? current.filter(p => p !== prefId)
            : [...current, prefId];
        updateInfo({ roomPreferences: newPrefs });
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div>
                <h3 className="font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                    <Plane className="w-5 h-5 text-blue-500" />
                    Travel & Lodging
                </h3>
                <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                    Help us coordinate logistics
                </p>
            </div>

            {/* Arrival Section */}
            <div className="card rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('arrival')}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-[var(--ink-primary)]">
                                Arrival Details
                            </div>
                            <div className="text-sm text-[var(--ink-secondary)]">
                                {info.arrivalMethod === 'flying' ? 'Flying in' :
                                    info.arrivalMethod === 'driving' ? 'Driving' : 'Already there'}
                            </div>
                        </div>
                    </div>
                    {expandedSection === 'arrival' ? (
                        <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    )}
                </button>

                <AnimatePresence>
                    {expandedSection === 'arrival' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 pt-0 space-y-4 border-t border-[var(--rule)] mt-0 pt-4">
                                {/* Arrival Method */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'flying', label: 'Flying', icon: Plane },
                                        { value: 'driving', label: 'Driving', icon: Car },
                                        { value: 'already-there', label: 'Local', icon: Home },
                                    ].map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => updateInfo({ arrivalMethod: value as TravelInfo['arrivalMethod'] })}
                                            className={cn(
                                                'p-3 rounded-xl border-2 text-center transition-all',
                                                info.arrivalMethod === value
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-[var(--rule)]'
                                            )}
                                        >
                                            <Icon className={cn(
                                                'w-5 h-5 mx-auto mb-1',
                                                info.arrivalMethod === value
                                                    ? 'text-blue-600'
                                                    : 'text-[var(--ink-tertiary)]'
                                            )} />
                                            <span className={cn(
                                                'text-sm font-medium',
                                                info.arrivalMethod === value
                                                    ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-[var(--ink-secondary)]'
                                            )}>
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Flying Details */}
                                {info.arrivalMethod === 'flying' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                    Arrival Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={info.arrivalDate || ''}
                                                    onChange={(e) => updateInfo({ arrivalDate: e.target.value })}
                                                    min={tripStartDate}
                                                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                    Arrival Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={info.arrivalTime || ''}
                                                    onChange={(e) => updateInfo({ arrivalTime: e.target.value })}
                                                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)]"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                    Flight # (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={info.flightNumber || ''}
                                                    onChange={(e) => updateInfo({ flightNumber: e.target.value.toUpperCase() })}
                                                    placeholder="AA1234"
                                                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                    Airport
                                                </label>
                                                <input
                                                    type="text"
                                                    value={info.arrivalAirport || ''}
                                                    onChange={(e) => updateInfo({ arrivalAirport: e.target.value.toUpperCase() })}
                                                    placeholder="ATL"
                                                    maxLength={3}
                                                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]"
                                                />
                                            </div>
                                        </div>

                                        {/* Need Pickup */}
                                        <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface)] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={info.needsPickup}
                                                onChange={(e) => updateInfo({ needsPickup: e.target.checked })}
                                                className="w-5 h-5 rounded border-[var(--rule)] text-blue-500 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-medium text-[var(--ink-primary)]">
                                                    I need airport pickup
                                                </div>
                                                <div className="text-sm text-[var(--ink-secondary)]">
                                                    Coordinate with other arrivals
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                {/* Driving Details */}
                                {info.arrivalMethod === 'driving' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                Arrival Date
                                            </label>
                                            <input
                                                type="date"
                                                value={info.arrivalDate || ''}
                                                onChange={(e) => updateInfo({ arrivalDate: e.target.value })}
                                                min={tripStartDate}
                                                className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                                ETA
                                            </label>
                                            <input
                                                type="time"
                                                value={info.arrivalTime || ''}
                                                onChange={(e) => updateInfo({ arrivalTime: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)]"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Lodging Section */}
            <div className="card rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection('lodging')}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Home className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-left">
                            <div className="font-medium text-[var(--ink-primary)]">
                                Lodging Preferences
                            </div>
                            <div className="text-sm text-[var(--ink-secondary)]">
                                Room & roommate preferences
                            </div>
                        </div>
                    </div>
                    {expandedSection === 'lodging' ? (
                        <ChevronUp className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    )}
                </button>

                <AnimatePresence>
                    {expandedSection === 'lodging' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 pt-0 space-y-4 border-t border-[var(--rule)] mt-0 pt-4">
                                {/* Room Preference */}
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'shared', label: 'Shared', emoji: '👥' },
                                        { value: 'private', label: 'Private', emoji: '🚪' },
                                        { value: 'no-preference', label: 'Either', emoji: '🤷' },
                                    ].map(({ value, label, emoji }) => (
                                        <button
                                            key={value}
                                            onClick={() => updateInfo({ lodgingPreference: value as TravelInfo['lodgingPreference'] })}
                                            className={cn(
                                                'p-3 rounded-xl border-2 text-center transition-all',
                                                info.lodgingPreference === value
                                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                    : 'border-[var(--rule)]'
                                            )}
                                        >
                                            <span className="text-2xl mb-1 block">{emoji}</span>
                                            <span className={cn(
                                                'text-sm font-medium',
                                                info.lodgingPreference === value
                                                    ? 'text-purple-700 dark:text-purple-300'
                                                    : 'text-[var(--ink-secondary)]'
                                            )}>
                                                {label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Roommate Request */}
                                {info.lodgingPreference === 'shared' && (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-1">
                                            Roommate Preference (optional)
                                        </label>
                                        {teammates.length > 0 ? (
                                            <select
                                                value={info.roommateRequest || ''}
                                                onChange={(e) => updateInfo({ roommateRequest: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)]"
                                            >
                                                <option value="">No preference</option>
                                                {teammates.map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={info.roommateRequest || ''}
                                                onChange={(e) => updateInfo({ roommateRequest: e.target.value })}
                                                placeholder="Enter teammate's name"
                                                className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Sleep Schedule */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                                        Sleep Schedule
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { value: 'early-bird', label: 'Early Bird', icon: Sun },
                                            { value: 'night-owl', label: 'Night Owl', icon: Moon },
                                            { value: 'flexible', label: 'Flexible', icon: Coffee },
                                        ].map(({ value, label, icon: Icon }) => (
                                            <button
                                                key={value}
                                                onClick={() => updateInfo({ sleepSchedule: value as TravelInfo['sleepSchedule'] })}
                                                className={cn(
                                                    'p-2 rounded-lg border-2 text-center transition-all text-sm',
                                                    info.sleepSchedule === value
                                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                        : 'border-[var(--rule)]'
                                                )}
                                            >
                                                <Icon className={cn(
                                                    'w-4 h-4 mx-auto mb-0.5',
                                                    info.sleepSchedule === value
                                                        ? 'text-purple-600'
                                                        : 'text-[var(--ink-tertiary)]'
                                                )} />
                                                <span className={cn(
                                                    'font-medium',
                                                    info.sleepSchedule === value
                                                        ? 'text-purple-700 dark:text-purple-300'
                                                        : 'text-[var(--ink-secondary)]'
                                                )}>
                                                    {label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Room Preferences */}
                                <div>
                                    <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                                        Room Preferences (optional)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {ROOM_PREFERENCES.map(pref => (
                                            <button
                                                key={pref.id}
                                                onClick={() => toggleRoomPreference(pref.id)}
                                                className={cn(
                                                    'px-3 py-2 rounded-full border text-sm transition-all flex items-center gap-1.5',
                                                    info.roomPreferences?.includes(pref.id)
                                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                                        : 'border-[var(--rule)] text-[var(--ink-secondary)]'
                                                )}
                                            >
                                                <span>{pref.emoji}</span>
                                                {pref.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Special Requests */}
            <div>
                <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                    Special Requests (optional)
                </label>
                <textarea
                    value={info.specialRequests || ''}
                    onChange={(e) => updateInfo({ specialRequests: e.target.value })}
                    placeholder="Any other travel or lodging notes..."
                    rows={2}
                    className="w-full p-3 rounded-xl border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-masters/30 ring-offset-2 ring-offset-[color:var(--canvas)]"
                />
            </div>
        </div>
    );
}

export default TravelLodgingInfo;
