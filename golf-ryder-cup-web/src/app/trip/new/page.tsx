'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout';
import { TRIP_TEMPLATES, type TripTemplate } from '@/lib/types/templates';
import {
    createTripFromTemplate,
    previewTemplateTrip,
} from '@/lib/services/tripTemplateService';
import { useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';
import {
    Trophy,
    Zap,
    Target,
    Users,
    Sunset,
    Pencil,
    ChevronRight,
    Calendar,
    MapPin,
    Check,
    ArrowLeft,
} from 'lucide-react';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
    'classic-ryder-cup': <Trophy className="w-8 h-8" />,
    'weekend-warrior': <Zap className="w-8 h-8" />,
    'singles-showdown': <Target className="w-8 h-8" />,
    'partners-paradise': <Users className="w-8 h-8" />,
    '9-hole-popup': <Sunset className="w-8 h-8" />,
    'custom': <Pencil className="w-8 h-8" />,
};

type Step = 'select' | 'configure' | 'preview';

export default function NewTripPage() {
    const router = useRouter();
    const { showToast } = useUIStore();

    const [step, setStep] = useState<Step>('select');
    const [selectedTemplate, setSelectedTemplate] = useState<TripTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [tripName, setTripName] = useState('');
    const [startDate, setStartDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [location, setLocation] = useState('');
    const [captainName, setCaptainName] = useState('');
    const [teamAName, setTeamAName] = useState('Team USA');
    const [teamBName, setTeamBName] = useState('Team Europe');

    const handleTemplateSelect = (template: TripTemplate) => {
        setSelectedTemplate(template);
        setTripName(`${template.name} ${new Date().getFullYear()}`);
        setStep('configure');
    };

    const handleConfigure = () => {
        if (!tripName.trim()) {
            showToast('error', 'Please enter a trip name');
            return;
        }

        // Validate start date is not in the past (allow today)
        const selectedDate = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            showToast('error', 'Start date cannot be in the past');
            return;
        }

        // Validate team names are provided and different
        if (!teamAName.trim() || !teamBName.trim()) {
            showToast('error', 'Both team names are required');
            return;
        }
        if (teamAName.trim().toLowerCase() === teamBName.trim().toLowerCase()) {
            showToast('error', 'Team names must be different');
            return;
        }

        setStep('preview');
    };

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        setIsCreating(true);
        try {
            const result = await createTripFromTemplate(selectedTemplate.id, {
                tripName: tripName.trim(),
                startDate: new Date(startDate),
                location: location.trim() || undefined,
                captainName: captainName.trim() || undefined,
                teamAName: teamAName.trim(),
                teamBName: teamBName.trim(),
            });

            showToast('success', `${tripName} created`);
            router.push(`/?tripId=${result.trip.id}`);
        } catch (error) {
            createLogger('trip').error('Failed to create trip', { error });
            showToast('error', 'Could not create trip');
        } finally {
            setIsCreating(false);
        }
    };

    const preview = selectedTemplate
        ? previewTemplateTrip(selectedTemplate.id, {
            tripName,
            startDate: new Date(startDate),
        })
        : null;

    const handleBack = () => {
        if (step === 'preview') setStep('configure');
        else if (step === 'configure') setStep('select');
        else router.back();
    };

    return (
        <AppShell
            showNav={false}
            showBack={false}
            headerTitle={
                step === 'select'
                    ? 'New Trip'
                    : step === 'configure'
                        ? 'Configure Trip'
                        : 'Review & Create'
            }
            headerRight={
                step !== 'select' && (
                    <button onClick={handleBack} className="text-white hover:text-white/80">
                        Back
                    </button>
                )
            }
        >
            {/* Step: Select Template */}
            {step === 'select' && (
                <div className="p-4 space-y-4">
                    <p className="text-surface-500 dark:text-surface-400">
                        Choose a template to get started quickly, or create a custom trip.
                    </p>

                    <div className="space-y-3">
                        {TRIP_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => handleTemplateSelect(template)}
                                className={cn(
                                    'card w-full p-4 text-left',
                                    'hover:bg-surface-50 dark:hover:bg-surface-800',
                                    'transition-colors active:scale-[0.99]'
                                )}
                            >
                                <div className="flex gap-4">
                                    <div className={cn(
                                        'w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                                        template.id === 'custom'
                                            ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                                            : 'bg-augusta-green/10 text-augusta-green'
                                    )}>
                                        {TEMPLATE_ICONS[template.id]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold">{template.name}</h3>
                                            <ChevronRight className="w-5 h-5 text-surface-400" />
                                        </div>
                                        <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                                            {template.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {template.features.map((feature, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                                                >
                                                    {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step: Configure Trip */}
            {step === 'configure' && selectedTemplate && (
                <div className="p-4 space-y-6">
                    {/* Selected template badge */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-augusta-green/5 border border-augusta-green/20">
                        <span className="text-2xl">{selectedTemplate.icon}</span>
                        <div>
                            <p className="text-sm text-surface-500">Template</p>
                            <p className="font-semibold">{selectedTemplate.name}</p>
                        </div>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Trip Name *
                            </label>
                            <input
                                type="text"
                                value={tripName}
                                onChange={(e) => setTripName(e.target.value)}
                                placeholder="e.g., Myrtle Beach 2026"
                                className="input w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Location
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g., Myrtle Beach, SC"
                                className="input w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Captain Name
                            </label>
                            <input
                                type="text"
                                value={captainName}
                                onChange={(e) => setCaptainName(e.target.value)}
                                placeholder="Your name"
                                className="input w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">
                                    Team 1 Name
                                </label>
                                <input
                                    type="text"
                                    value={teamAName}
                                    onChange={(e) => setTeamAName(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">
                                    Team 2 Name
                                </label>
                                <input
                                    type="text"
                                    value={teamBName}
                                    onChange={(e) => setTeamBName(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Continue button */}
                    <button
                        onClick={handleConfigure}
                        className="btn-primary w-full"
                    >
                        Review Trip
                    </button>
                </div>
            )}

            {/* Step: Preview & Create */}
            {step === 'preview' && selectedTemplate && preview && (
                <div className="p-4 space-y-6">
                    {/* Trip summary */}
                    <div className="card p-4 space-y-3">
                        <h2 className="text-xl font-bold">{tripName}</h2>
                        <div className="flex flex-wrap gap-4 text-sm text-surface-500">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>
                                    {new Date(startDate).toLocaleDateString()} •{' '}
                                    {preview.days} {preview.days === 1 ? 'day' : 'days'}
                                </span>
                            </div>
                            {location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4" />
                                    <span>{location}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-surface-200 dark:border-surface-700">
                            <div className="flex-1 text-center">
                                <p className="text-2xl font-bold text-augusta-green">
                                    {preview.sessions.length}
                                </p>
                                <p className="text-xs text-surface-500">Sessions</p>
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-2xl font-bold text-augusta-green">
                                    {preview.totalMatches}
                                </p>
                                <p className="text-xs text-surface-500">Matches</p>
                            </div>
                            <div className="flex-1 text-center">
                                <p className="text-2xl font-bold text-augusta-green">
                                    {preview.totalPoints}
                                </p>
                                <p className="text-xs text-surface-500">Points</p>
                            </div>
                        </div>
                    </div>

                    {/* Teams */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="card p-3 border-l-4 border-team-usa">
                            <p className="text-sm text-surface-500">Team 1</p>
                            <p className="font-semibold">{teamAName}</p>
                        </div>
                        <div className="card p-3 border-r-4 border-team-europe">
                            <p className="text-sm text-surface-500">Team 2</p>
                            <p className="font-semibold">{teamBName}</p>
                        </div>
                    </div>

                    {/* Sessions preview */}
                    <div>
                        <h3 className="text-sm font-semibold text-surface-500 uppercase mb-2">
                            Sessions
                        </h3>
                        <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                            {preview.sessions.map((session, i) => (
                                <div key={i} className="p-3 flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{session.name}</p>
                                        <p className="text-sm text-surface-500">
                                            {session.date}
                                        </p>
                                    </div>
                                    <span className="text-sm text-surface-400">
                                        {session.matches} {session.matches === 1 ? 'match' : 'matches'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Create button */}
                    <button
                        onClick={handleCreate}
                        disabled={isCreating}
                        className={cn(
                            'btn-primary w-full flex items-center justify-center gap-2',
                            isCreating && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {isCreating ? (
                            <>Creating...</>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                Create Trip
                            </>
                        )}
                    </button>
                </div>
            )}
        </AppShell>
    );
}
