/**
 * TripMemories Component — Phase 3: Social & Engagement
 *
 * Enhanced trip recap with rich memories:
 * - Key moment highlights with photos
 * - Achievement showcase
 * - Stats and records
 * - Team battle summary
 * - Share-worthy recap cards
 *
 * Designed to be the "year in review" for golf trips.
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
    Trophy,
    Star,
    TrendingUp,
    TrendingDown,
    Flame,
    Target,
    Calendar,
    MapPin,
    Share2,
    Download,
    ChevronLeft,
    ChevronRight,
    Medal,
    Crown,
    Zap,
} from 'lucide-react';
// cn import removed - unused
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export interface TripMemory {
    id: string;
    type: 'photo' | 'achievement' | 'stat' | 'moment' | 'quote';
    title: string;
    subtitle?: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
    timestamp: string;
    players?: { id: string; name: string; avatarUrl?: string }[];
}

export interface TripStats {
    totalHoles: number;
    birdies: number;
    pars: number;
    bogeys: number;
    doublePlus: number;
    bestScore: { player: string; score: number; course: string };
    longestPutt: { player: string; distance: number; hole: number };
    mostBirdies: { player: string; count: number };
    // Team battle
    usaPoints: number;
    europePoints: number;
}

export interface TripHighlight {
    id: string;
    type: 'epic_shot' | 'comeback' | 'close_match' | 'sweep' | 'rivalry';
    title: string;
    description: string;
    imageUrl?: string;
    matchId?: string;
}

export interface TripData {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    playerCount: number;
    matchCount: number;
    stats: TripStats;
    highlights: TripHighlight[];
    memories: TripMemory[];
    mvp: { id: string; name: string; avatarUrl?: string; points: number };
}

interface TripMemoriesProps {
    trip: TripData;
    onShare?: () => void;
    onExport?: () => void;
}

// Team colors
const TEAM_COLORS = {
    usa: '#0047AB',
    europe: '#8B0000',
};

// ============================================
// HERO SECTION
// ============================================

function HeroSection({ trip }: { trip: TripData }) {
    return (
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative h-[60vh] flex items-end justify-center pb-12 overflow-hidden"
        >
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(135deg, ${TEAM_COLORS.usa}20 0%, var(--surface) 50%, ${TEAM_COLORS.europe}20 100%)`,
                }}
            />

            {/* Masters-style pattern overlay */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: 'radial-gradient(circle, var(--masters) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />

            {/* Content */}
            <div className="relative z-10 text-center px-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="mb-4"
                >
                    <Trophy className="w-16 h-16 mx-auto" style={{ color: 'var(--masters)' }} />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-4xl font-bold mb-2"
                    style={{ color: 'var(--ink)' }}
                >
                    {trip.name}
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-center gap-4 text-sm"
                    style={{ color: 'var(--ink-tertiary)' }}
                >
                    <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {trip.location}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex items-center justify-center gap-6 mt-6"
                >
                    <div className="text-center">
                        <span className="block text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                            {trip.playerCount}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Players</span>
                    </div>
                    <div className="w-px h-8" style={{ background: 'var(--rule)' }} />
                    <div className="text-center">
                        <span className="block text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                            {trip.matchCount}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Matches</span>
                    </div>
                    <div className="w-px h-8" style={{ background: 'var(--rule)' }} />
                    <div className="text-center">
                        <span className="block text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                            {trip.stats.totalHoles}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Holes</span>
                    </div>
                </motion.div>
            </div>
        </motion.section>
    );
}

// ============================================
// TEAM BATTLE SECTION
// ============================================

function TeamBattleSection({ stats }: { stats: TripStats }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const total = stats.usaPoints + stats.europePoints;
    const usaPercent = total > 0 ? (stats.usaPoints / total) * 100 : 50;

    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="px-6 py-8"
        >
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--ink)' }}>
                The Battle
            </h2>

            <div className="max-w-md mx-auto">
                {/* Score Display */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                        <span className="text-4xl font-bold" style={{ color: TEAM_COLORS.usa }}>
                            {stats.usaPoints}
                        </span>
                        <span className="block text-sm font-semibold" style={{ color: TEAM_COLORS.usa }}>
                            🇺🇸 USA
                        </span>
                    </div>

                    <div className="flex-1 mx-4 relative">
                        {/* Progress Bar */}
                        <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
                            <motion.div
                                initial={{ width: '50%' }}
                                animate={isInView ? { width: `${usaPercent}%` } : {}}
                                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                                className="h-full rounded-l-full"
                                style={{ background: TEAM_COLORS.usa }}
                            />
                        </div>

                        {/* Divider */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={isInView ? { opacity: 1 } : {}}
                            transition={{ delay: 2 }}
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded"
                            style={{ left: `${usaPercent}%`, marginLeft: '-2px' }}
                        />
                    </div>

                    <div className="text-center">
                        <span className="text-4xl font-bold" style={{ color: TEAM_COLORS.europe }}>
                            {stats.europePoints}
                        </span>
                        <span className="block text-sm font-semibold" style={{ color: TEAM_COLORS.europe }}>
                            🇪🇺 EUR
                        </span>
                    </div>
                </div>

                {/* Winner Badge */}
                {stats.usaPoints !== stats.europePoints && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : {}}
                        transition={{ delay: 2, type: 'spring' }}
                        className="text-center"
                    >
                        <span
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold"
                            style={{
                                background: stats.usaPoints > stats.europePoints ? TEAM_COLORS.usa : TEAM_COLORS.europe,
                            }}
                        >
                            <Crown size={16} />
                            {stats.usaPoints > stats.europePoints ? 'USA Takes the Cup!' : 'Europe Takes the Cup!'}
                        </span>
                    </motion.div>
                )}
            </div>
        </motion.section>
    );
}

// ============================================
// STATS GRID SECTION
// ============================================

interface StatCardProps {
    icon: typeof Trophy;
    label: string;
    value: string | number;
    sublabel?: string;
    color: string;
    delay: number;
}

function StatCard({ icon: Icon, label, value, sublabel, color, delay }: StatCardProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay, duration: 0.5 }}
            className="p-4 rounded-xl text-center"
            style={{ background: `${color}10` }}
        >
            <Icon className="w-6 h-6 mx-auto mb-2" style={{ color }} />
            <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>
                {value}
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
                {label}
            </div>
            {sublabel && (
                <div className="text-xs mt-1" style={{ color }}>
                    {sublabel}
                </div>
            )}
        </motion.div>
    );
}

function StatsGridSection({ stats }: { stats: TripStats }) {
    return (
        <section className="px-6 py-8">
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--ink)' }}>
                By the Numbers
            </h2>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <StatCard
                    icon={Star}
                    label="Birdies"
                    value={stats.birdies}
                    color="#22C55E"
                    delay={0}
                />
                <StatCard
                    icon={Target}
                    label="Pars"
                    value={stats.pars}
                    color="#3B82F6"
                    delay={0.1}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Bogeys"
                    value={stats.bogeys}
                    color="#F59E0B"
                    delay={0.2}
                />
                <StatCard
                    icon={TrendingDown}
                    label="Double+"
                    value={stats.doublePlus}
                    color="#EF4444"
                    delay={0.3}
                />
            </div>
        </section>
    );
}

// ============================================
// RECORDS SECTION
// ============================================

interface RecordCardProps {
    icon: typeof Trophy;
    title: string;
    player: string;
    stat: string;
    color: string;
    delay: number;
}

function RecordCard({ icon: Icon, title, player, stat, color, delay }: RecordCardProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay, duration: 0.5 }}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
        >
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${color}20` }}
            >
                <Icon className="w-6 h-6" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
                    {title}
                </div>
                <div className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {player}
                </div>
            </div>
            <div
                className="px-3 py-1 rounded-lg font-bold text-sm shrink-0"
                style={{ background: `${color}20`, color }}
            >
                {stat}
            </div>
        </motion.div>
    );
}

function RecordsSection({ stats }: { stats: TripStats }) {
    return (
        <section className="px-6 py-8">
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--ink)' }}>
                Trip Records
            </h2>

            <div className="space-y-3 max-w-md mx-auto">
                <RecordCard
                    icon={Medal}
                    title="Best Round"
                    player={stats.bestScore.player}
                    stat={stats.bestScore.score > 0 ? `+${stats.bestScore.score}` : stats.bestScore.score.toString()}
                    color="var(--masters)"
                    delay={0}
                />
                <RecordCard
                    icon={Target}
                    title="Most Birdies"
                    player={stats.mostBirdies.player}
                    stat={`${stats.mostBirdies.count} 🐦`}
                    color="#22C55E"
                    delay={0.1}
                />
                <RecordCard
                    icon={Zap}
                    title="Longest Putt"
                    player={stats.longestPutt.player}
                    stat={`${stats.longestPutt.distance}'`}
                    color="#F59E0B"
                    delay={0.2}
                />
            </div>
        </section>
    );
}

// ============================================
// HIGHLIGHTS CAROUSEL
// ============================================

function HighlightsSection({ highlights }: { highlights: TripHighlight[] }) {
    const [current, setCurrent] = useState(0);
    const haptic = useHaptic();

    const next = () => {
        haptic.tap();
        setCurrent((c) => (c + 1) % highlights.length);
    };

    const prev = () => {
        haptic.tap();
        setCurrent((c) => (c - 1 + highlights.length) % highlights.length);
    };

    if (highlights.length === 0) return null;

    const highlight = highlights[current];

    return (
        <section className="py-8">
            <h2 className="text-xl font-bold text-center mb-6 px-6" style={{ color: 'var(--ink)' }}>
                Top Moments
            </h2>

            <div className="relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={highlight.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="px-6"
                    >
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--rule)',
                            }}
                        >
                            {/* Image placeholder */}
                            {highlight.imageUrl ? (
                                <div
                                    className="h-48 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${highlight.imageUrl})` }}
                                />
                            ) : (
                                <div
                                    className="h-48 flex items-center justify-center"
                                    style={{ background: 'var(--masters)20' }}
                                >
                                    <Flame className="w-12 h-12" style={{ color: 'var(--masters)' }} />
                                </div>
                            )}

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--ink)' }}>
                                    {highlight.title}
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                                    {highlight.description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                {highlights.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >
                            <ChevronLeft size={20} style={{ color: 'var(--ink)' }} />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                        >
                            <ChevronRight size={20} style={{ color: 'var(--ink)' }} />
                        </button>
                    </>
                )}
            </div>

            {/* Dots */}
            {highlights.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    {highlights.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                haptic.tap();
                                setCurrent(i);
                            }}
                            className="w-2 h-2 rounded-full transition-all"
                            style={{
                                background: i === current ? 'var(--masters)' : 'var(--rule)',
                                transform: i === current ? 'scale(1.3)' : 'scale(1)',
                            }}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ============================================
// MVP SECTION
// ============================================

function MVPSection({ mvp }: { mvp: TripData['mvp'] }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <motion.section
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="px-6 py-8"
        >
            <div
                className="rounded-2xl p-6 text-center overflow-hidden relative"
                style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                }}
            >
                {/* Shine effect */}
                <motion.div
                    className="absolute inset-0 opacity-30"
                    style={{
                        background: 'linear-gradient(135deg, transparent 40%, white 50%, transparent 60%)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />

                <Crown className="w-12 h-12 mx-auto mb-3 text-white" />
                <span className="text-white/80 text-sm uppercase tracking-wider font-semibold">
                    Trip MVP
                </span>

                {/* Avatar */}
                <div className="w-20 h-20 rounded-full mx-auto my-4 bg-white flex items-center justify-center text-3xl overflow-hidden">
                    {mvp.avatarUrl ? (
                        <img
                            src={mvp.avatarUrl}
                            alt={mvp.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={80}
                            height={80}
                        />
                    ) : (
                        '👑'
                    )}
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">
                    {mvp.name}
                </h3>
                <p className="text-white/80">
                    {mvp.points} total points
                </p>
            </div>
        </motion.section>
    );
}

// ============================================
// SHARE FOOTER
// ============================================

function ShareFooter({ onShare, onExport }: { onShare?: () => void; onExport?: () => void }) {
    const haptic = useHaptic();

    return (
        <section className="px-6 py-8 pb-24">
            <div className="flex gap-3 max-w-md mx-auto">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        haptic.press();
                        onShare?.();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white"
                    style={{ background: 'var(--masters)' }}
                >
                    <Share2 size={18} />
                    Share Recap
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        haptic.tap();
                        onExport?.();
                    }}
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
                >
                    <Download size={20} style={{ color: 'var(--ink)' }} />
                </motion.button>
            </div>
        </section>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TripMemories({ trip, onShare, onExport }: TripMemoriesProps) {
    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--surface-secondary, #F9FAFB)' }}
        >
            <HeroSection trip={trip} />
            <TeamBattleSection stats={trip.stats} />
            <StatsGridSection stats={trip.stats} />
            <RecordsSection stats={trip.stats} />
            <HighlightsSection highlights={trip.highlights} />
            <MVPSection mvp={trip.mvp} />
            <ShareFooter onShare={onShare} onExport={onExport} />
        </div>
    );
}

export default TripMemories;
