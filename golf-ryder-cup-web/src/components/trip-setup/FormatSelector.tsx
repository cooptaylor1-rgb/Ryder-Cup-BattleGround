'use client';

/**
 * Format Selector Component
 *
 * A comprehensive UI for selecting golf match formats.
 * Organizes 35+ formats by category with search and filtering.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ChevronDown,
    ChevronRight,
    Users,
    Target,
    Coins,
    Trophy,
    Hash,
    Star,
    Info,
    Check,
    Repeat,
    GitMerge,
    Shuffle,
    Skull,
    GitFork,
    SunMedium,
    Split,
    Zap,
    Medal,
    Equal,
    ThumbsDown,
    Plus,
    DollarSign,
    Dog,
    Dices,
    Circle,
    Rabbit,
    Angry,
    RefreshCw,
    TrendingUp,
    Layers,
    Music,
    Settings,
    User,
    Filter,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    type MatchFormat,
    type FormatCategory,
    type FormatConfig,
    FORMAT_CONFIGS,
    getAllCategoriesWithFormats,
    getPopularFormats,
} from '@/lib/types/matchFormats';

// Icon mapping for formats
const FORMAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    User, Users, Target, Coins, Trophy, Hash, Star, Repeat,
    GitMerge, Shuffle, Skull, GitFork, SunMedium, Split, Zap,
    Medal, Equal, ThumbsDown, Plus, DollarSign, Dog, Dices,
    Circle, Rabbit, Angry, RefreshCw, TrendingUp, Layers, Music, Settings,
};

interface FormatSelectorProps {
    value: MatchFormat | null;
    onChange: (format: MatchFormat) => void;
    playerCount?: number;
    showPopular?: boolean;
    showSearch?: boolean;
    showFilters?: boolean;
    className?: string;
}

export function FormatSelector({
    value,
    onChange,
    playerCount: _playerCount,
    showPopular = true,
    showSearch = true,
    showFilters = true,
    className,
}: FormatSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<FormatCategory | null>('matchPlay');
    const [complexityFilter, setComplexityFilter] = useState<FormatConfig['complexity'] | 'all'>('all');
    const [showDetails, setShowDetails] = useState<MatchFormat | null>(null);

    // Get categories with formats
    const categories = useMemo(() => getAllCategoriesWithFormats(), []);
    const popularFormats = useMemo(() => getPopularFormats(6), []);

    // Filter formats based on search and complexity
    const filteredCategories = useMemo(() => {
        return categories.map(cat => ({
            ...cat,
            formats: cat.formats.filter(format => {
                // Search filter
                const matchesSearch = !searchQuery ||
                    format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    format.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    format.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    format.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

                // Complexity filter
                const matchesComplexity = complexityFilter === 'all' || format.complexity === complexityFilter;

                return matchesSearch && matchesComplexity;
            }),
        })).filter(cat => cat.formats.length > 0);
    }, [categories, searchQuery, complexityFilter]);

    const selectedFormat = value ? FORMAT_CONFIGS[value] : null;

    const getCategoryIcon = (category: FormatCategory) => {
        switch (category) {
            case 'matchPlay': return <Target className="w-4 h-4" />;
            case 'teamPlay': return <Users className="w-4 h-4" />;
            case 'pointsGame': return <Star className="w-4 h-4" />;
            case 'bettingGame': return <Coins className="w-4 h-4" />;
            case 'strokePlay': return <Hash className="w-4 h-4" />;
        }
    };

    const getFormatIcon = (iconName: string) => {
        const IconComponent = FORMAT_ICONS[iconName];
        return IconComponent ? <IconComponent className="w-4 h-4" /> : <Target className="w-4 h-4" />;
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Search and Filters */}
            {(showSearch || showFilters) && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {showSearch && (
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                            <input
                                type="text"
                                placeholder="Search formats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-masters-green"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {showFilters && (
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-surface-500" />
                            <select
                                value={complexityFilter}
                                onChange={(e) => setComplexityFilter(e.target.value as typeof complexityFilter)}
                                className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm"
                            >
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Popular Formats */}
            {showPopular && !searchQuery && (
                <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        Popular Formats
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {popularFormats.map(format => (
                            <button
                                key={format.id}
                                onClick={() => onChange(format.id)}
                                className={cn(
                                    'p-3 rounded-xl border-2 transition-all text-left',
                                    value === format.id
                                        ? 'border-masters-green bg-masters-green/5'
                                        : 'border-surface-200 dark:border-surface-700 hover:border-masters-green/50'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-white', format.color)}>
                                        {getFormatIcon(format.icon)}
                                    </div>
                                    <span className="font-medium text-sm">{format.shortName}</span>
                                </div>
                                <p className="text-xs text-surface-500 line-clamp-1">{format.description}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Format Display */}
            {selectedFormat && (
                <div className="p-4 rounded-xl bg-masters-green/5 border border-masters-green/20">
                    <div className="flex items-start gap-3">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0', selectedFormat.color)}>
                            {getFormatIcon(selectedFormat.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">{selectedFormat.name}</h3>
                                <Check className="w-5 h-5 text-masters-green" />
                            </div>
                            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                                {selectedFormat.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-medium',
                                    selectedFormat.complexity === 'beginner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                    selectedFormat.complexity === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                                    selectedFormat.complexity === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                )}>
                                    {selectedFormat.complexity}
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300">
                                    {typeof selectedFormat.playersPerTeam === 'number'
                                        ? `${selectedFormat.playersPerTeam} per team`
                                        : `${selectedFormat.playersPerTeam[0]}-${selectedFormat.playersPerTeam[1]} per team`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Categories Accordion */}
            <div className="space-y-2">
                {filteredCategories.map(({ category, name, formats }) => (
                    <div key={category} className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                            className="w-full flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-750 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {getCategoryIcon(category)}
                                <span className="font-medium">{name}</span>
                                <span className="text-xs text-surface-500 bg-surface-200 dark:bg-surface-700 px-2 py-0.5 rounded-full">
                                    {formats.length}
                                </span>
                            </div>
                            {expandedCategory === category ? (
                                <ChevronDown className="w-5 h-5 text-surface-400" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-surface-400" />
                            )}
                        </button>

                        <AnimatePresence>
                            {expandedCategory === category && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {formats.map(format => (
                                            <FormatCard
                                                key={format.id}
                                                format={format}
                                                isSelected={value === format.id}
                                                onSelect={() => onChange(format.id)}
                                                onShowDetails={() => setShowDetails(format.id)}
                                                getIcon={getFormatIcon}
                                            />
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* No Results */}
            {filteredCategories.length === 0 && (
                <div className="text-center py-8">
                    <Search className="w-10 h-10 mx-auto text-surface-400 mb-3" />
                    <p className="text-surface-500">No formats found</p>
                    <p className="text-sm text-surface-400">Try a different search term</p>
                </div>
            )}

            {/* Format Details Modal */}
            <AnimatePresence>
                {showDetails && (
                    <FormatDetailsModal
                        format={FORMAT_CONFIGS[showDetails]}
                        onClose={() => setShowDetails(null)}
                        onSelect={() => {
                            onChange(showDetails);
                            setShowDetails(null);
                        }}
                        isSelected={value === showDetails}
                        getIcon={getFormatIcon}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Format Card Component
interface FormatCardProps {
    format: FormatConfig;
    isSelected: boolean;
    onSelect: () => void;
    onShowDetails: () => void;
    getIcon: (name: string) => React.ReactNode;
}

function FormatCard({ format, isSelected, onSelect, onShowDetails, getIcon }: FormatCardProps) {
    return (
        <div
            className={cn(
                'relative p-3 rounded-xl border-2 transition-all cursor-pointer',
                isSelected
                    ? 'border-masters-green bg-masters-green/5'
                    : 'border-transparent bg-white dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600'
            )}
            onClick={onSelect}
        >
            <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0', format.color)}>
                    {getIcon(format.icon)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{format.shortName}</h4>
                        {isSelected && <Check className="w-4 h-4 text-masters-green" />}
                    </div>
                    <p className="text-xs text-surface-500 line-clamp-2 mt-0.5">{format.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                            format.complexity === 'beginner' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            format.complexity === 'intermediate' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                            format.complexity === 'advanced' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        )}>
                            {format.complexity}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onShowDetails();
                            }}
                            className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                            <Info className="w-3.5 h-3.5 text-surface-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Format Details Modal
interface FormatDetailsModalProps {
    format: FormatConfig;
    onClose: () => void;
    onSelect: () => void;
    isSelected: boolean;
    getIcon: (name: string) => React.ReactNode;
}

function FormatDetailsModal({ format, onClose, onSelect, isSelected, getIcon }: FormatDetailsModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-surface-800 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl"
            >
                {/* Header */}
                <div className={cn('p-6', format.color)}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white">
                            {getIcon(format.icon)}
                        </div>
                        <div className="flex-1 text-white">
                            <h2 className="text-xl font-bold">{format.name}</h2>
                            <p className="text-white/80 text-sm">{format.category.replace(/([A-Z])/g, ' $1').trim()}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[50vh]">
                    <p className="text-surface-600 dark:text-surface-300">{format.description}</p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700">
                            <p className="text-xs text-surface-500 mb-1">Players per Team</p>
                            <p className="font-semibold">
                                {typeof format.playersPerTeam === 'number'
                                    ? format.playersPerTeam
                                    : `${format.playersPerTeam[0]}-${format.playersPerTeam[1]}`}
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700">
                            <p className="text-xs text-surface-500 mb-1">Complexity</p>
                            <p className="font-semibold capitalize">{format.complexity}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700">
                            <p className="text-xs text-surface-500 mb-1">Scoring Type</p>
                            <p className="font-semibold capitalize">{format.scoringType.replace(/([A-Z])/g, ' $1')}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-700">
                            <p className="text-xs text-surface-500 mb-1">Handicap Method</p>
                            <p className="font-semibold capitalize">{format.handicapMethod.replace('-', ' ')}</p>
                        </div>
                    </div>

                    {/* Rules */}
                    <div>
                        <h3 className="font-semibold mb-2">Rules</h3>
                        <ul className="space-y-2">
                            {format.rules.map((rule, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
                                    <span className="w-5 h-5 rounded-full bg-masters-green/10 text-masters-green flex items-center justify-center flex-shrink-0 text-xs font-medium">
                                        {index + 1}
                                    </span>
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Tags */}
                    <div>
                        <h3 className="font-semibold mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                            {format.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-1 rounded-full text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-surface-200 dark:border-surface-700">
                    <button
                        onClick={onSelect}
                        className={cn(
                            'w-full py-3 rounded-xl font-semibold transition-all',
                            isSelected
                                ? 'bg-surface-100 dark:bg-surface-700 text-surface-600'
                                : 'bg-masters-green text-white hover:bg-masters-green/90'
                        )}
                    >
                        {isSelected ? 'Currently Selected' : 'Select This Format'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default FormatSelector;
