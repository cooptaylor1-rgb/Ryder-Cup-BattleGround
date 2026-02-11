/**
 * Cart Tracker Component
 *
 * Allows players to share and view the location of the beverage/food cart.
 * Features:
 * - Report cart sighting with current hole
 * - See where cart was last spotted
 * - Time since last sighting
 * - Optional photo of cart location
 *
 * Makes the golf trip more social and convenient!
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Beer,
    MapPin,
    X,
    Coffee,
    Utensils,
} from 'lucide-react';
import { useTripStore, useUIStore } from '@/lib/stores';
import { uiLogger } from '@/lib/utils/logger';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { formatDistanceToNow } from 'date-fns';
import type { UUID, ISODateString } from '@/lib/types/models';

// Cart sighting type
export interface CartSighting {
    id: UUID;
    tripId: UUID;
    reportedBy: string;
    reportedByName: string;
    holeNumber: number;
    timestamp: ISODateString;
    cartType: 'beverage' | 'food' | 'both';
    note?: string;
    photoUrl?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
}

// Store cart sightings in banter posts with special type
const CART_POST_TYPE = 'cart_sighting';

// Hook to manage cart sightings
export function useCartTracker() {
    const { currentTrip, players } = useTripStore();
    const { showToast } = useUIStore();
    const { trigger } = useHaptic();

    // Get cart sightings from banter posts
    const sightings = useLiveQuery(
        async () => {
            if (!currentTrip) return [];

            // Get recent cart posts (last 4 hours)
            const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

            const posts = await db.banterPosts
                .where('tripId')
                .equals(currentTrip.id)
                .filter(p => p.postType === CART_POST_TYPE && p.timestamp > fourHoursAgo)
                .reverse()
                .sortBy('timestamp');

            // Convert to CartSighting format
            return posts.map(p => ({
                id: p.id,
                tripId: p.tripId,
                reportedBy: p.authorId || '',
                reportedByName: p.authorName,
                holeNumber: (p as unknown as { metadata?: { holeNumber: number } }).metadata?.holeNumber || 0,
                timestamp: p.timestamp,
                cartType: (p as unknown as { metadata?: { cartType: CartSighting['cartType'] } }).metadata?.cartType || 'beverage',
                note: p.content,
                photoUrl: (p as unknown as { metadata?: { photoUrl?: string } }).metadata?.photoUrl,
            })) as CartSighting[];
        },
        [currentTrip?.id],
        []
    );

    // Report a cart sighting
    const reportSighting = useCallback(async (
        holeNumber: number,
        cartType: CartSighting['cartType'] = 'beverage',
        note?: string
    ) => {
        if (!currentTrip) return;

        try {
            const reporter = players[0]; // In real app, use authenticated user

            const post = {
                id: crypto.randomUUID(),
                tripId: currentTrip.id,
                authorId: reporter?.id,
                authorName: reporter ? `${reporter.firstName} ${reporter.lastName}` : 'Anonymous',
                postType: CART_POST_TYPE,
                content: note || `${cartType === 'beverage' ? '🍺' : cartType === 'food' ? '🍔' : '🍺🍔'} Cart spotted!`,
                timestamp: new Date().toISOString(),
                metadata: {
                    holeNumber,
                    cartType,
                },
            };

            await db.banterPosts.add(post as unknown as Parameters<typeof db.banterPosts.add>[0]);

            trigger('success');
            showToast('success', `Cart location shared! Hole ${holeNumber}`);
        } catch (error) {
            uiLogger.error('Failed to report cart sighting:', error);
            showToast('error', 'Failed to share cart location');
        }
    }, [currentTrip, players, trigger, showToast]);

    // Get the most recent sighting
    const latestSighting = sightings[0] || null;

    // Get time since last sighting
    const timeSinceSighting = latestSighting
        ? formatDistanceToNow(new Date(latestSighting.timestamp), { addSuffix: true })
        : null;

    return {
        sightings,
        latestSighting,
        timeSinceSighting,
        reportSighting,
        hasSightings: sightings.length > 0,
    };
}

// Cart Tracker Mini Widget (shows in header/navbar)
export function CartTrackerMini() {
    const { latestSighting, timeSinceSighting } = useCartTracker();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!latestSighting) return null;

    return (
        <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105"
            style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: 'white',
            }}
        >
            <Beer size={16} />
            <span className="font-medium">Hole {latestSighting.holeNumber}</span>
            <span className="opacity-75 text-xs">{timeSinceSighting}</span>
        </button>
    );
}

// Full Cart Tracker Panel
interface CartTrackerPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CartTrackerPanel({ isOpen, onClose }: CartTrackerPanelProps) {
    const { sightings, reportSighting, latestSighting, timeSinceSighting: _timeSinceSighting } = useCartTracker();
    const [selectedHole, setSelectedHole] = useState<number>(1);
    const [selectedType, setSelectedType] = useState<CartSighting['cartType']>('beverage');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReport = async () => {
        setIsSubmitting(true);
        await reportSighting(selectedHole, selectedType, note || undefined);
        setNote('');
        setIsSubmitting(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] rounded-t-3xl max-h-[80vh] overflow-hidden border-t border-[var(--rule)]"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-[var(--surface-tertiary)]" />
                        </div>

                        {/* Header */}
                        <div className="px-4 pb-4 flex items-center justify-between border-b border-[var(--rule)]">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                                >
                                    <Beer size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-[var(--ink-primary)]">Cart Tracker</h2>
                                    <p className="text-sm text-[var(--ink-tertiary)]">
                                        {latestSighting
                                            ? `Last seen: Hole ${latestSighting.holeNumber}`
                                            : 'No recent sightings'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--surface-secondary)] transition-colors" aria-label="Close cart tracker">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                            {/* Report Section */}
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-[var(--ink-tertiary)] mb-3">
                                    SPOT THE CART
                                </h3>

                                {/* Hole Selector */}
                                <div className="mb-4">
                                    <label className="text-sm mb-2 block">Which hole?</label>
                                    <div className="grid grid-cols-9 gap-1">
                                        {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => (
                                            <button
                                                key={hole}
                                                onClick={() => setSelectedHole(hole)}
                                                className={`w-full aspect-square rounded-lg text-sm font-medium transition-all ${selectedHole === hole
                                                    ? 'bg-[var(--warning)] text-white scale-110'
                                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                                                    }`}
                                            >
                                                {hole}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Cart Type */}
                                <div className="mb-4">
                                    <label className="text-sm mb-2 block">What&apos;s on the cart?</label>
                                    <div className="flex gap-2">
                                        {[
                                            { type: 'beverage' as const, icon: Beer, label: 'Drinks' },
                                            { type: 'food' as const, icon: Utensils, label: 'Food' },
                                            { type: 'both' as const, icon: Coffee, label: 'Both' },
                                        ].map(({ type, icon: Icon, label }) => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${selectedType === type
                                                    ? 'bg-[var(--warning)] text-white'
                                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)]'
                                                    }`}
                                            >
                                                <Icon size={20} />
                                                <span className="text-xs">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Optional Note */}
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        placeholder="Add a note (optional)"
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--rule)] focus:ring-2 focus:ring-[var(--warning)] outline-none text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleReport}
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
                                >
                                    <MapPin size={20} />
                                    Share Cart Location
                                </button>
                            </div>

                            {/* Recent Sightings */}
                            {sightings.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--ink-tertiary)] mb-3">
                                        RECENT SIGHTINGS
                                    </h3>
                                    <div className="space-y-2">
                                        {sightings.slice(0, 5).map(sighting => (
                                            <div
                                                key={sighting.id}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)]"
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                                                    style={{ background: 'var(--canvas-sunken)' }}
                                                >
                                                    {sighting.cartType === 'beverage' ? '🍺' :
                                                        sighting.cartType === 'food' ? '🍔' : '🍺🍔'}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Hole {sighting.holeNumber}</span>
                                                        <span className="text-xs text-[var(--ink-tertiary)]">
                                                            {formatDistanceToNow(new Date(sighting.timestamp), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-[var(--ink-secondary)]">
                                                        {sighting.reportedByName}
                                                        {sighting.note && ` • ${sighting.note}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Safe area */}
                        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// Floating Cart Button (shown on live/scoring pages)
export function CartTrackerFAB() {
    const { latestSighting, timeSinceSighting } = useCartTracker();
    const [showPanel, setShowPanel] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowPanel(true)}
                className="fixed bottom-40 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all hover:scale-105"
                style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    color: 'white',
                }}
            >
                <Beer size={20} />
                {latestSighting ? (
                    <span className="text-sm">
                        Hole {latestSighting.holeNumber}
                        <span className="opacity-75 ml-1 text-xs">
                            {timeSinceSighting}
                        </span>
                    </span>
                ) : (
                    <span className="text-sm">Find Cart</span>
                )}
            </button>

            <CartTrackerPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
        </>
    );
}
