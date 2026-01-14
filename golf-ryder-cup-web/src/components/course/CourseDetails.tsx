/**
 * Course Details Component
 *
 * Displays comprehensive course information including:
 * - Course overview and location
 * - Tee information with ratings
 * - Weather conditions
 * - Hole-by-hole data
 * - Course map
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { WeatherWidget } from './WeatherWidget';
import type { GolfCourseAPICourse, GolfCourseAPITee } from '@/lib/services/golfCourseAPIService';
import { formatCourseLocation, getAllTees, inferTeeColor } from '@/lib/services/golfCourseAPIService';
import {
    MapPin,
    Flag,
    Ruler,
    Target,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Navigation,
    Star,
    Info,
} from 'lucide-react';

// ============================================
// HELPER
// ============================================

function inferTeeColor(teeName: string): string {
    const name = teeName.toLowerCase();
    if (name.includes('black') || name.includes('championship')) return '#000000';
    if (name.includes('blue') || name.includes('back')) return '#1565C0';
    if (name.includes('white') || name.includes('middle')) return '#FFFFFF';
    if (name.includes('gold') || name.includes('senior')) return '#FFD700';
    if (name.includes('red') || name.includes('forward')) return '#C62828';
    if (name.includes('green')) return '#2E7D32';
    if (name.includes('silver')) return '#9E9E9E';
    if (name.includes('orange')) return '#FF9800';
    return '#1565C0';
}

// ============================================
// MAIN COMPONENT
// ============================================

interface CourseDetailsProps {
    course: GolfCourseAPICourse;
    className?: string;
    onSelectTee?: (tee: GolfCourseAPITee) => void;
    selectedTeeId?: string;
}

export function CourseDetails({
    course,
    className,
    onSelectTee,
    selectedTeeId,
}: CourseDetailsProps) {
    const [showAllTees, setShowAllTees] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'scorecard' | 'weather'>('info');

    const tees = getAllTees(course);
    const displayTees = showAllTees ? tees : tees.slice(0, 4);
    const hasLocation = course.location.latitude && course.location.longitude;

    return (
        <div className={cn('space-y-6', className)}>
            {/* Course Header */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-masters-primary to-masters-primary-dark text-white">
                <h1 className="text-2xl font-bold mb-1">{course.course_name}</h1>
                <div className="text-white/80">{course.club_name}</div>

                <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{formatCourseLocation(course.location)}</span>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-3 mt-4">
                    {hasLocation && (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${course.location.latitude},${course.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <Navigation className="w-4 h-4" />
                            <span className="text-sm">Directions</span>
                        </a>
                    )}
                    <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(course.club_name + ' ' + course.course_name + ' tee times')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span className="text-sm">Book Tee Time</span>
                    </a>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2">
                {(['info', 'scorecard', 'weather'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            activeTab === tab
                                ? 'bg-masters-primary text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Info Tab */}
            {activeTab === 'info' && (
                <div className="space-y-4">
                    {/* Map */}
                    {hasLocation && (
                        <div className="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
                            <iframe
                                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${course.location.latitude},${course.location.longitude}&zoom=15&maptype=satellite`}
                                width="100%"
                                height="200"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title={`Map of ${course.course_name}`}
                            />
                        </div>
                    )}

                    {/* Tee Selection */}
                    <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium">Available Tees</h3>
                            {tees.length > 4 && (
                                <button
                                    onClick={() => setShowAllTees(!showAllTees)}
                                    className="flex items-center gap-1 text-sm text-masters-primary"
                                >
                                    {showAllTees ? 'Show less' : `Show all (${tees.length})`}
                                    {showAllTees ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            {displayTees.map((tee, index) => (
                                <TeeCard
                                    key={`${tee.tee_name}-${index}`}
                                    tee={tee}
                                    isSelected={selectedTeeId === `${tee.tee_name}-${tee.course_rating}`}
                                    onSelect={() => onSelectTee?.(tee)}
                                />
                            ))}
                        </div>

                        {tees.length === 0 && (
                            <div className="text-center py-8 text-surface-500">
                                <Info className="w-8 h-8 mx-auto mb-2" />
                                <p>No tee information available</p>
                            </div>
                        )}
                    </div>

                    {/* Course Stats */}
                    {tees.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 text-center">
                                <div className="text-2xl font-bold text-masters-primary">
                                    {tees[0].par_total}
                                </div>
                                <div className="text-sm text-surface-500">Par</div>
                            </div>
                            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 text-center">
                                <div className="text-2xl font-bold text-masters-primary">
                                    {tees[0].total_yards?.toLocaleString()}
                                </div>
                                <div className="text-sm text-surface-500">Yards</div>
                            </div>
                            <div className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 text-center">
                                <div className="text-2xl font-bold text-masters-primary">
                                    {tees[0].slope_rating}
                                </div>
                                <div className="text-sm text-surface-500">Slope</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Scorecard Tab */}
            {activeTab === 'scorecard' && (
                <ScorecardView tees={tees} />
            )}

            {/* Weather Tab */}
            {activeTab === 'weather' && hasLocation && (
                <WeatherWidget
                    latitude={course.location.latitude!}
                    longitude={course.location.longitude!}
                    courseName={course.course_name}
                />
            )}

            {activeTab === 'weather' && !hasLocation && (
                <div className="p-8 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 text-center">
                    <MapPin className="w-10 h-10 mx-auto mb-3 text-surface-400" />
                    <p className="text-surface-500">Location data not available for weather</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface TeeCardProps {
    tee: GolfCourseAPITee;
    isSelected?: boolean;
    onSelect?: () => void;
}

function TeeCard({ tee, isSelected, onSelect }: TeeCardProps) {
    const color = inferTeeColor(tee.tee_name);
    const isWhite = color === '#FFFFFF';

    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg transition-all',
                isSelected
                    ? 'bg-masters-primary/10 border-2 border-masters-primary'
                    : 'bg-surface-50 dark:bg-surface-800 border-2 border-transparent hover:border-surface-300 dark:hover:border-surface-600'
            )}
        >
            {/* Tee color indicator */}
            <div
                className={cn(
                    'w-8 h-8 rounded-full flex-shrink-0',
                    isWhite && 'border-2 border-surface-300'
                )}
                style={{ backgroundColor: color }}
            />

            {/* Tee info */}
            <div className="flex-1 text-left">
                <div className="font-medium">{tee.tee_name}</div>
                <div className="text-sm text-surface-500">
                    {tee.total_yards?.toLocaleString()} yards
                </div>
            </div>

            {/* Ratings */}
            <div className="text-right">
                <div className="text-sm font-medium">{tee.course_rating} / {tee.slope_rating}</div>
                <div className="text-xs text-surface-500">Rating / Slope</div>
            </div>

            {/* Selected indicator */}
            {isSelected && (
                <div className="w-6 h-6 rounded-full bg-masters-primary flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </button>
    );
}

interface ScorecardViewProps {
    tees: GolfCourseAPITee[];
}

function ScorecardView({ tees }: ScorecardViewProps) {
    const [selectedTee, setSelectedTee] = useState(tees[0]);

    if (!selectedTee || !selectedTee.holes) {
        return (
            <div className="p-8 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 text-center">
                <Target className="w-10 h-10 mx-auto mb-3 text-surface-400" />
                <p className="text-surface-500">Hole-by-hole data not available</p>
            </div>
        );
    }

    const frontNine = selectedTee.holes.slice(0, 9);
    const backNine = selectedTee.holes.slice(9, 18);

    return (
        <div className="space-y-4">
            {/* Tee selector */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {tees.filter(t => t.holes && t.holes.length > 0).map((tee, i) => {
                    const color = inferTeeColor(tee.tee_name);
                    return (
                        <button
                            key={i}
                            onClick={() => setSelectedTee(tee)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors',
                                selectedTee.tee_name === tee.tee_name
                                    ? 'bg-masters-primary text-white'
                                    : 'bg-surface-100 dark:bg-surface-800'
                            )}
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color === '#FFFFFF' && selectedTee.tee_name !== tee.tee_name ? '#ccc' : color }}
                            />
                            <span className="text-sm">{tee.tee_name}</span>
                        </button>
                    );
                })}
            </div>

            {/* Scorecard table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-100 dark:bg-surface-800">
                            <th className="px-3 py-2 text-left font-medium">Hole</th>
                            {[...Array(9)].map((_, i) => (
                                <th key={i} className="px-2 py-2 text-center font-medium w-10">
                                    {i + 1}
                                </th>
                            ))}
                            <th className="px-2 py-2 text-center font-medium bg-surface-200 dark:bg-surface-700">Out</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Front 9 Yardage */}
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                            <td className="px-3 py-2 text-surface-500">Yards</td>
                            {frontNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center">{hole.yardage}</td>
                            ))}
                            <td className="px-2 py-2 text-center font-medium bg-surface-50 dark:bg-surface-800">
                                {frontNine.reduce((sum, h) => sum + h.yardage, 0)}
                            </td>
                        </tr>
                        {/* Front 9 Handicap */}
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                            <td className="px-3 py-2 text-surface-500">Hdcp</td>
                            {frontNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center text-surface-400">{hole.handicap}</td>
                            ))}
                            <td className="px-2 py-2 text-center bg-surface-50 dark:bg-surface-800">-</td>
                        </tr>
                        {/* Front 9 Par */}
                        <tr className="bg-masters-primary/5">
                            <td className="px-3 py-2 font-medium">Par</td>
                            {frontNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center font-medium">{hole.par}</td>
                            ))}
                            <td className="px-2 py-2 text-center font-bold bg-masters-primary/10">
                                {frontNine.reduce((sum, h) => sum + h.par, 0)}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Back 9 */}
                <table className="w-full text-sm mt-4">
                    <thead>
                        <tr className="bg-surface-100 dark:bg-surface-800">
                            <th className="px-3 py-2 text-left font-medium">Hole</th>
                            {[...Array(9)].map((_, i) => (
                                <th key={i} className="px-2 py-2 text-center font-medium w-10">
                                    {i + 10}
                                </th>
                            ))}
                            <th className="px-2 py-2 text-center font-medium bg-surface-200 dark:bg-surface-700">In</th>
                            <th className="px-2 py-2 text-center font-medium bg-masters-primary text-white">Tot</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Back 9 Yardage */}
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                            <td className="px-3 py-2 text-surface-500">Yards</td>
                            {backNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center">{hole.yardage}</td>
                            ))}
                            <td className="px-2 py-2 text-center font-medium bg-surface-50 dark:bg-surface-800">
                                {backNine.reduce((sum, h) => sum + h.yardage, 0)}
                            </td>
                            <td className="px-2 py-2 text-center font-bold bg-masters-primary/10">
                                {selectedTee.total_yards}
                            </td>
                        </tr>
                        {/* Back 9 Handicap */}
                        <tr className="border-b border-surface-200 dark:border-surface-700">
                            <td className="px-3 py-2 text-surface-500">Hdcp</td>
                            {backNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center text-surface-400">{hole.handicap}</td>
                            ))}
                            <td className="px-2 py-2 text-center bg-surface-50 dark:bg-surface-800">-</td>
                            <td className="px-2 py-2 text-center bg-masters-primary/10">-</td>
                        </tr>
                        {/* Back 9 Par */}
                        <tr className="bg-masters-primary/5">
                            <td className="px-3 py-2 font-medium">Par</td>
                            {backNine.map((hole, i) => (
                                <td key={i} className="px-2 py-2 text-center font-medium">{hole.par}</td>
                            ))}
                            <td className="px-2 py-2 text-center font-bold bg-masters-primary/10">
                                {backNine.reduce((sum, h) => sum + h.par, 0)}
                            </td>
                            <td className="px-2 py-2 text-center font-bold bg-masters-primary text-white">
                                {selectedTee.par_total}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Export barrel
export { TeeCard, ScorecardView };
export default CourseDetails;
