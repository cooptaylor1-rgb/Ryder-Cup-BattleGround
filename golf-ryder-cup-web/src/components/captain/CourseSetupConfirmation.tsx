/**
 * Course Setup Confirmation
 *
 * Verify all course setup details before the round begins.
 * Final checklist to ensure everything is configured correctly.
 *
 * Features:
 * - Starting holes verification (shotgun vs. regular start)
 * - Pin positions confirmation
 * - Tee box selection
 * - Course routing (front 9, back 9, or custom)
 * - Special hole setup notes
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Flag,
    MapPin,
    CheckCircle2,
    Circle,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    Info,
    Calendar,
    Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type StartType = 'regular' | 'shotgun' | 'split-tee';

export type TeeBoxColor = 'black' | 'gold' | 'blue' | 'white' | 'red';

export interface HoleSetup {
    number: number;
    pinPosition: 'front' | 'middle' | 'back' | 'front-left' | 'front-right' | 'back-left' | 'back-right';
    par: number;
    distance: number;
    notes?: string;
    isStartingHole?: boolean;
}

export interface CourseSetupItem {
    id: string;
    category: 'general' | 'tees' | 'routing' | 'pins' | 'special';
    title: string;
    description: string;
    status: 'confirmed' | 'pending' | 'issue';
    value?: string;
    required: boolean;
}

interface CourseSetupConfirmationProps {
    courseName: string;
    startType?: StartType;
    selectedTees?: TeeBoxColor;
    holes?: HoleSetup[];
    items?: CourseSetupItem[];
    onConfirm?: (items: CourseSetupItem[]) => void;
    className?: string;
}

// ============================================
// DEFAULT SETUP ITEMS
// ============================================

function getDefaultSetupItems(
    startType: StartType,
    selectedTees: TeeBoxColor
): CourseSetupItem[] {
    return [
        {
            id: 'start-type',
            category: 'general',
            title: 'Start Type',
            description: 'How groups begin their rounds',
            status: 'pending',
            value: startType === 'regular' ? 'Regular Start (Hole 1)' :
                startType === 'shotgun' ? 'Shotgun Start' : 'Split Tee Start',
            required: true,
        },
        {
            id: 'tee-boxes',
            category: 'tees',
            title: 'Tee Box Selection',
            description: 'Selected tees for the round',
            status: 'pending',
            value: `${selectedTees.charAt(0).toUpperCase() + selectedTees.slice(1)} Tees`,
            required: true,
        },
        {
            id: 'scorecards',
            category: 'general',
            title: 'Scorecards Available',
            description: 'Physical scorecards at the pro shop',
            status: 'pending',
            required: true,
        },
        {
            id: 'cart-staging',
            category: 'general',
            title: 'Cart Staging',
            description: 'Carts positioned at starting holes',
            status: 'pending',
            required: true,
        },
        {
            id: 'pin-sheet',
            category: 'pins',
            title: 'Pin Sheet',
            description: 'Today\'s pin positions confirmed',
            status: 'pending',
            required: true,
        },
        {
            id: 'course-open',
            category: 'routing',
            title: 'Course Status',
            description: 'All holes open for play',
            status: 'pending',
            required: true,
        },
        {
            id: 'practice-facility',
            category: 'general',
            title: 'Practice Facility',
            description: 'Driving range and putting green open',
            status: 'pending',
            required: false,
        },
        {
            id: 'beverage-cart',
            category: 'special',
            title: 'Beverage Cart',
            description: 'On-course service scheduled',
            status: 'pending',
            required: false,
        },
    ];
}

// ============================================
// DEFAULT HOLE SETUP
// ============================================

function getDefaultHoles(): HoleSetup[] {
    return Array.from({ length: 18 }, (_, i) => ({
        number: i + 1,
        pinPosition: 'middle' as const,
        par: [3, 4, 5][i % 3],
        distance: 150 + (i % 5) * 50,
    }));
}

// ============================================
// SETUP ITEM CARD
// ============================================

interface SetupItemCardProps {
    item: CourseSetupItem;
    onToggle: () => void;
}

function SetupItemCard({ item, onToggle }: SetupItemCardProps) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/5"
            style={{
                background: item.status === 'confirmed' ? 'rgba(34, 197, 94, 0.1)' :
                    item.status === 'issue' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
                border: '1px solid rgba(128, 120, 104, 0.2)',
            }}
        >
            <div className="flex-shrink-0">
                {item.status === 'confirmed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : item.status === 'issue' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                    <Circle className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p
                        className={cn('font-medium', item.status === 'confirmed' && 'line-through')}
                        style={{ color: item.status === 'confirmed' ? 'var(--ink-muted)' : 'var(--ink)' }}
                    >
                        {item.title}
                    </p>
                    {item.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--canvas)', color: 'var(--ink-muted)' }}>
                            Required
                        </span>
                    )}
                </div>
                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                    {item.description}
                </p>
                {item.value && (
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--masters)' }}>
                        {item.value}
                    </p>
                )}
            </div>
        </button>
    );
}

// ============================================
// COURSE SETUP CONFIRMATION COMPONENT
// ============================================

export function CourseSetupConfirmation({
    courseName,
    startType = 'regular',
    selectedTees = 'white',
    holes = getDefaultHoles(),
    items: customItems,
    onConfirm,
    className,
}: CourseSetupConfirmationProps) {
    const [setupItems, setSetupItems] = useState<CourseSetupItem[]>(
        customItems || getDefaultSetupItems(startType, selectedTees)
    );
    const [showHoleDetails, setShowHoleDetails] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    // Group items by category
    const groupedItems = setupItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<string, CourseSetupItem[]>);

    const toggleItem = useCallback((itemId: string) => {
        setSetupItems(prev => {
            const updated = prev.map(item => {
                if (item.id === itemId) {
                    const newStatus = item.status === 'confirmed' ? 'pending' :
                        item.status === 'pending' ? 'confirmed' : 'pending';
                    return { ...item, status: newStatus as 'confirmed' | 'pending' | 'issue' };
                }
                return item;
            });
            return updated;
        });
    }, []);

    const confirmAll = useCallback(() => {
        setSetupItems(prev => {
            const updated = prev.map(item => ({ ...item, status: 'confirmed' as const }));
            onConfirm?.(updated);
            return updated;
        });
    }, [onConfirm]);

    const resetAll = useCallback(() => {
        setSetupItems(prev => prev.map(item => ({ ...item, status: 'pending' as const })));
    }, []);

    const confirmedCount = setupItems.filter(i => i.status === 'confirmed').length;
    const requiredCount = setupItems.filter(i => i.required).length;
    const requiredConfirmed = setupItems.filter(i => i.required && i.status === 'confirmed').length;
    const allRequiredConfirmed = requiredConfirmed === requiredCount;
    const progress = (confirmedCount / setupItems.length) * 100;

    const getCategoryLabel = (category: string): string => {
        switch (category) {
            case 'general': return 'General Setup';
            case 'tees': return 'Tee Boxes';
            case 'routing': return 'Course Routing';
            case 'pins': return 'Pin Positions';
            case 'special': return 'Special Arrangements';
            default: return category;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'general': return <CheckCircle2 className="w-5 h-5" />;
            case 'tees': return <Flag className="w-5 h-5" />;
            case 'routing': return <Navigation className="w-5 h-5" />;
            case 'pins': return <MapPin className="w-5 h-5" />;
            case 'special': return <Calendar className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Course Setup
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {courseName}
                        </p>
                    </div>
                    <button
                        onClick={resetAll}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Reset all"
                    >
                        <RefreshCw className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--ink-muted)' }}>
                            {confirmedCount}/{setupItems.length} items confirmed
                        </span>
                        <span
                            className="font-medium"
                            style={{ color: allRequiredConfirmed ? '#22c55e' : 'var(--ink)' }}
                        >
                            {requiredConfirmed}/{requiredCount} required
                        </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: allRequiredConfirmed ? '#22c55e' : 'var(--masters)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {allRequiredConfirmed ? (
                <div
                    className="p-3 flex items-center gap-2"
                    style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                >
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">
                        All required items confirmed - Ready to go!
                    </span>
                </div>
            ) : (
                <div
                    className="p-3 flex items-center gap-2"
                    style={{ background: 'rgba(251, 191, 36, 0.1)' }}
                >
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm text-amber-600">
                        {requiredCount - requiredConfirmed} required items still need confirmation
                    </span>
                </div>
            )}

            {/* Setup Items by Category */}
            <div className="flex-1 overflow-y-auto">
                {Object.entries(groupedItems).map(([category, items]) => {
                    const categoryConfirmed = items.filter(i => i.status === 'confirmed').length;
                    const isExpanded = expandedCategory === category || expandedCategory === null;

                    return (
                        <div key={category} className="border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                            <button
                                onClick={() => setExpandedCategory(isExpanded ? category : null)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    <span style={{ color: categoryConfirmed === items.length ? '#22c55e' : 'var(--masters)' }}>
                                        {getCategoryIcon(category)}
                                    </span>
                                    <div className="text-left">
                                        <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                            {getCategoryLabel(category)}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                            {categoryConfirmed}/{items.length} confirmed
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown
                                    className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-180')}
                                    style={{ color: 'var(--ink-muted)' }}
                                />
                            </button>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-2">
                                            {items.map(item => (
                                                <SetupItemCard
                                                    key={item.id}
                                                    item={item}
                                                    onToggle={() => toggleItem(item.id)}
                                                />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}

                {/* Hole Details */}
                <div className="border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <button
                        onClick={() => setShowHoleDetails(!showHoleDetails)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5"
                    >
                        <div className="flex items-center gap-3">
                            <Flag className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                            <div className="text-left">
                                <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                    Hole-by-Hole Setup
                                </p>
                                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                    {holes.length} holes configured
                                </p>
                            </div>
                        </div>
                        <ChevronDown
                            className={cn('w-5 h-5 transition-transform', showHoleDetails && 'rotate-180')}
                            style={{ color: 'var(--ink-muted)' }}
                        />
                    </button>

                    <AnimatePresence>
                        {showHoleDetails && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-3 gap-2">
                                        {holes.map(hole => (
                                            <div
                                                key={hole.number}
                                                className={cn(
                                                    'p-2 rounded-lg text-center',
                                                    hole.isStartingHole && 'ring-2 ring-[var(--masters)]'
                                                )}
                                                style={{
                                                    background: hole.isStartingHole ? 'var(--masters-muted)' : 'var(--surface)',
                                                }}
                                            >
                                                <p className="font-bold" style={{ color: 'var(--ink)' }}>
                                                    {hole.number}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                                    Par {hole.par}
                                                </p>
                                                <p className="text-xs" style={{ color: 'var(--masters)' }}>
                                                    {hole.pinPosition}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Confirm All Button */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <button
                    onClick={confirmAll}
                    disabled={allRequiredConfirmed && confirmedCount === setupItems.length}
                    className={cn(
                        'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    style={{
                        background: allRequiredConfirmed ? '#22c55e' : 'var(--masters)',
                        color: 'white',
                    }}
                >
                    {allRequiredConfirmed ? (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            All Set - Ready to Play!
                        </>
                    ) : (
                        <>
                            <CheckCircle2 className="w-5 h-5" />
                            Confirm All Items
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default CourseSetupConfirmation;
