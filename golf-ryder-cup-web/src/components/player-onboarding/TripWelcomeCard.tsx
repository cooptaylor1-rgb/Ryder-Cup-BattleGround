'use client';

/**
 * Trip Welcome Card
 *
 * Shows the invited player a beautiful overview of the trip they're joining.
 * Displays trip name, dates, location, captain info, and team roster preview.
 */

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    MapPin,
    Crown,
    Trophy,
    Flag,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface TripPreview {
    id: string;
    name: string;
    startDate: string;
    endDate?: string;
    location?: string;
    courseName?: string;
    captainName: string;
    captainAvatar?: string;
    teamAName: string;
    teamBName: string;
    teamAColor: string;
    teamBColor: string;
    playerCount: number;
    sessionsCount: number;
    yourTeam?: 'A' | 'B';
}

interface TripWelcomeCardProps {
    trip: TripPreview;
    invitedBy?: string;
    onContinue: () => void;
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function TripWelcomeCard({
    trip,
    invitedBy,
    onContinue,
    className,
}: TripWelcomeCardProps) {
    const formatDateRange = () => {
        const start = new Date(trip.startDate);
        const startStr = start.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });

        if (trip.endDate) {
            const end = new Date(trip.endDate);
            const endStr = end.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
            return `${startStr} - ${endStr}`;
        }

        return start.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const daysUntilTrip = () => {
        const start = new Date(trip.startDate);
        const today = new Date();
        const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'Today!';
        if (diff === 1) return 'Tomorrow!';
        if (diff < 0) return 'In progress';
        return `${diff} days away`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('space-y-6', className)}
        >
            {/* Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-masters via-masters/90 to-emerald-600 text-[var(--canvas)] shadow-xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <circle cx="5" cy="5" r="1" fill="currentColor" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative p-6 pb-8">
                    {/* Invitation Badge */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 mb-6"
                    >
                        <div className="px-3 py-1.5 rounded-full bg-[color:var(--canvas-raised)]/18 backdrop-blur-sm text-sm font-medium flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            You&apos;re invited!
                        </div>
                        <div className="px-3 py-1.5 rounded-full bg-[color:var(--canvas-raised)]/12 backdrop-blur-sm text-sm">
                            {daysUntilTrip()}
                        </div>
                    </motion.div>

                    {/* Trip Name */}
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-3xl font-bold mb-2"
                    >
                        {trip.name}
                    </motion.h1>

                    {/* Details Row */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-wrap gap-4 text-[color:var(--canvas-raised)]/90 text-sm"
                    >
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {formatDateRange()}
                        </span>
                        {trip.location && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                {trip.location}
                            </span>
                        )}
                    </motion.div>

                    {/* Stats Row */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex gap-6 mt-6 pt-6 border-t border-[color:var(--canvas-raised)]/18"
                    >
                        <div className="text-center">
                            <div className="text-2xl font-bold">{trip.playerCount}</div>
                            <div className="text-xs text-[color:var(--canvas-raised)]/70">Players</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{trip.sessionsCount}</div>
                            <div className="text-xs text-[color:var(--canvas-raised)]/70">Sessions</div>
                        </div>
                        {trip.courseName && (
                            <div className="flex-1 text-right">
                                <div className="text-sm font-medium truncate">{trip.courseName}</div>
                                <div className="text-xs text-[color:var(--canvas-raised)]/70">Course</div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Bottom Wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 fill-[var(--canvas)]">
                        <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
                        <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
                        <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
                    </svg>
                </div>
            </div>

            {/* Captain Card */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="card p-4"
            >
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {trip.captainAvatar ? (
                            <Image
                                src={trip.captainAvatar}
                                alt={trip.captainName}
                                width={56}
                                height={56}
                                className="w-14 h-14 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-linear-to-br from-gold-light to-gold-dark flex items-center justify-center">
                                <span className="text-xl font-bold text-[var(--canvas)]">
                                    {trip.captainName.split(' ').filter(n => n).map(n => n[0]).join('') || '?'}
                                </span>
                            </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gold flex items-center justify-center shadow-sm">
                            <Crown className="w-3.5 h-3.5 text-[var(--canvas)]" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-[var(--ink-tertiary)]">
                            {invitedBy ? 'Invited by' : 'Trip Captain'}
                        </div>
                        <div className="font-semibold text-[var(--ink-primary)]">
                            {invitedBy || trip.captainName}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Teams Preview */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="card overflow-hidden"
            >
                <div className="p-4 border-b border-[var(--rule)]">
                    <h3 className="font-semibold text-[var(--ink-primary)] flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-gold" />
                        The Competition
                    </h3>
                </div>
                <div className="grid grid-cols-2">
                    {/* Team A */}
                    <div
                        className={cn(
                            'p-4 text-center border-r border-[var(--rule)]',
                            trip.yourTeam === 'A' && 'ring-2 ring-inset ring-masters bg-masters/5'
                        )}
                    >
                        <div
                            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[color:var(--team-color)]"
                            style={{ '--team-color': trip.teamAColor } as CSSProperties}
                        >
                            <Flag className="w-6 h-6 text-[var(--canvas)]" />
                        </div>
                        <div className="font-semibold text-[var(--ink-primary)]">
                            {trip.teamAName}
                        </div>
                        {trip.yourTeam === 'A' && (
                            <div className="text-xs text-masters font-medium mt-1">
                                Your Team
                            </div>
                        )}
                    </div>

                    {/* Team B */}
                    <div
                        className={cn(
                            'p-4 text-center',
                            trip.yourTeam === 'B' && 'ring-2 ring-inset ring-masters bg-masters/5'
                        )}
                    >
                        <div
                            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center bg-[color:var(--team-color)]"
                            style={{ '--team-color': trip.teamBColor } as CSSProperties}
                        >
                            <Flag className="w-6 h-6 text-[var(--canvas)]" />
                        </div>
                        <div className="font-semibold text-[var(--ink-primary)]">
                            {trip.teamBName}
                        </div>
                        {trip.yourTeam === 'B' && (
                            <div className="text-xs text-masters font-medium mt-1">
                                Your Team
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Continue Button */}
            <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onContinue}
                className="w-full py-4 px-6 rounded-2xl bg-masters text-[var(--canvas)] font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-masters/30 hover:bg-masters/90 active:scale-[0.98] transition-all"
            >
                Set Up My Profile
                <ChevronRight className="w-5 h-5" />
            </motion.button>

            {/* Footer Note */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-center text-sm text-[var(--ink-tertiary)]"
            >
                Takes about 2 minutes to complete
            </motion.p>
        </motion.div>
    );
}

export default TripWelcomeCard;
