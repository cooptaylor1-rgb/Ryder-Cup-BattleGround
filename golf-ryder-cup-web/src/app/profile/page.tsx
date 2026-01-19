'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { Button, Card, CardContent, PageSkeleton, Skeleton } from '@/components/ui';
import { GolfersIllustration } from '@/components/ui/illustrations';
import {
    User,
    Mail,
    Phone,
    Hash,
    Home,
    Shirt,
    AlertCircle,
    Edit2,
    LogOut,
    ChevronLeft,
    X,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PROFILE PAGE
 *
 * View and edit user profile.
 * Accessible from settings or user menu.
 */

const logger = createLogger('profile');

export default function ProfilePage() {
    const router = useRouter();
    const { currentUser, isAuthenticated, updateProfile, logout, isLoading } = useAuthStore();
    const { showToast } = useUIStore();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Redirect if not logged in
    useEffect(() => {
        if (!isAuthenticated || !currentUser) {
            router.push('/login');
        } else {
            setFormData(currentUser);
        }
    }, [isAuthenticated, currentUser, router]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateProfile({
                ...formData,
                handicapIndex: formData.handicapIndex
                    ? parseFloat(String(formData.handicapIndex))
                    : undefined,
            });
            setIsEditing(false);
            showToast('success', 'Profile updated');
        } catch (err) {
            logger.error('Failed to save profile', { error: err });
            showToast('error', 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleCancel = () => {
        setFormData(currentUser || {});
        setIsEditing(false);
    };

    if (!currentUser) {
        return (
            <PageSkeleton>
                <div className="max-w-md mx-auto space-y-6">
                    {/* Profile Header Skeleton */}
                    <Card variant="elevated" className="overflow-hidden">
                        <div className="bg-gradient-to-br from-masters/20 to-masters/5 p-6 text-center">
                            <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
                            <Skeleton className="h-6 w-40 mx-auto mb-2" />
                            <Skeleton className="h-4 w-24 mx-auto mb-3" />
                            <Skeleton className="h-10 w-32 mx-auto rounded-full" />
                        </div>
                    </Card>
                    {/* Form Section Skeletons */}
                    <Card variant="default">
                        <CardContent className="p-4 space-y-4">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </PageSkeleton>
        );
    }

    const displayName = currentUser.nickname || currentUser.firstName;

    return (
        <div className="min-h-screen bg-gradient-to-b from-masters/5 via-surface-50 to-surface-100">
            {/* Header */}
            <header className="pt-safe-area-inset-top sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-surface-200">
                <div className="px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-lg hover:bg-surface-100 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-surface-600" />
                    </button>
                    <h1 className="text-heading-sm font-semibold text-surface-900">
                        My Profile
                    </h1>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 -mr-2 rounded-lg hover:bg-surface-100 transition-colors"
                        >
                            <Edit2 className="w-5 h-5 text-surface-600" />
                        </button>
                    ) : (
                        <button
                            onClick={handleCancel}
                            className="p-2 -mr-2 rounded-lg hover:bg-surface-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-surface-600" />
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-6 pb-32">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Profile Header Card */}
                    <Card variant="elevated" className="overflow-hidden">
                        <div className="bg-gradient-to-br from-masters/20 to-masters/5 p-6 text-center">
                            <div className="w-24 h-24 rounded-full bg-white mx-auto mb-4 flex items-center justify-center shadow-md">
                                {currentUser.avatarUrl ? (
                                    <img
                                        src={currentUser.avatarUrl}
                                        alt={displayName}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-4xl font-bold text-masters">
                                        {currentUser.firstName?.[0] || '?'}{currentUser.lastName?.[0] || '?'}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-heading-md font-semibold text-surface-900">
                                {currentUser.firstName} {currentUser.lastName}
                            </h2>
                            {currentUser.nickname && (
                                <p className="text-body-md text-surface-600">
                                    &ldquo;{currentUser.nickname}&rdquo;
                                </p>
                            )}
                            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm">
                                <Hash className="w-4 h-4 text-masters" />
                                <span className="text-heading-sm font-bold text-masters">
                                    {currentUser.handicapIndex?.toFixed(1) || '—'}
                                </span>
                                <span className="text-caption text-surface-600">handicap</span>
                            </div>
                        </div>
                    </Card>

                    {/* Basic Info Section */}
                    <Card variant="default">
                        <CardContent className="p-4">
                            <h3 className="text-label-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                <User className="w-4 h-4 text-surface-500" />
                                Basic Info
                            </h3>

                            <div className="space-y-4">
                                <ProfileField
                                    icon={<User className="w-4 h-4" />}
                                    label="First Name"
                                    value={formData.firstName || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, firstName: v }))}
                                />
                                <ProfileField
                                    icon={<User className="w-4 h-4" />}
                                    label="Last Name"
                                    value={formData.lastName || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, lastName: v }))}
                                />
                                <ProfileField
                                    icon={<User className="w-4 h-4" />}
                                    label="Nickname"
                                    value={formData.nickname || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, nickname: v }))}
                                />
                                <ProfileField
                                    icon={<Mail className="w-4 h-4" />}
                                    label="Email"
                                    value={formData.email || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, email: v }))}
                                    type="email"
                                />
                                <ProfileField
                                    icon={<Phone className="w-4 h-4" />}
                                    label="Phone"
                                    value={formData.phoneNumber || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, phoneNumber: v }))}
                                    type="tel"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Golf Info Section */}
                    <Card variant="default">
                        <CardContent className="p-4">
                            <h3 className="text-label-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                <GolfersIllustration size="sm" animated={false} />
                                Golf Profile
                            </h3>

                            <div className="space-y-4">
                                <ProfileField
                                    icon={<Hash className="w-4 h-4" />}
                                    label="Handicap Index"
                                    value={String(formData.handicapIndex || '')}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, handicapIndex: parseFloat(v) || undefined }))}
                                    type="number"
                                    min={-10}
                                    max={54}
                                    step={0.1}
                                />
                                <ProfileField
                                    icon={<Hash className="w-4 h-4" />}
                                    label="GHIN Number"
                                    value={formData.ghin || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, ghin: v }))}
                                />
                                <ProfileField
                                    icon={<Home className="w-4 h-4" />}
                                    label="Home Course"
                                    value={formData.homeCourse || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, homeCourse: v }))}
                                />

                                {/* Preferred Tees */}
                                <div className="space-y-2">
                                    <label className="text-label-sm text-surface-500 font-medium">
                                        Preferred Tees
                                    </label>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            {(['back', 'middle', 'forward'] as const).map((tee) => (
                                                <button
                                                    key={tee}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, preferredTees: tee }))}
                                                    className={cn(
                                                        "flex-1 py-2 px-3 rounded-lg border-2 font-medium capitalize text-sm transition-all",
                                                        formData.preferredTees === tee
                                                            ? "border-masters bg-masters/10 text-masters"
                                                            : "border-surface-200 text-surface-600 hover:border-surface-300"
                                                    )}
                                                >
                                                    {tee}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-body-md text-surface-900 capitalize">
                                            {formData.preferredTees || '—'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Trip Info Section */}
                    <Card variant="default">
                        <CardContent className="p-4">
                            <h3 className="text-label-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                <Shirt className="w-4 h-4 text-surface-500" />
                                Trip Details
                            </h3>

                            <div className="space-y-4">
                                {/* Shirt Size */}
                                <div className="space-y-2">
                                    <label className="text-label-sm text-surface-500 font-medium">
                                        Shirt Size
                                    </label>
                                    {isEditing ? (
                                        <div className="grid grid-cols-6 gap-1">
                                            {(['XS', 'S', 'M', 'L', 'XL', '2XL'] as const).map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, shirtSize: size }))}
                                                    className={cn(
                                                        "py-2 rounded-lg border-2 font-medium text-xs transition-all",
                                                        formData.shirtSize === size
                                                            ? "border-masters bg-masters/10 text-masters"
                                                            : "border-surface-200 text-surface-600 hover:border-surface-300"
                                                    )}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-body-md text-surface-900">
                                            {formData.shirtSize || '—'}
                                        </p>
                                    )}
                                </div>

                                <ProfileField
                                    icon={<AlertCircle className="w-4 h-4" />}
                                    label="Dietary Restrictions"
                                    value={formData.dietaryRestrictions || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({ ...prev, dietaryRestrictions: v }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Emergency Contact Section */}
                    <Card variant="default">
                        <CardContent className="p-4">
                            <h3 className="text-label-lg font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Emergency Contact
                            </h3>

                            <div className="space-y-4">
                                <ProfileField
                                    icon={<User className="w-4 h-4" />}
                                    label="Contact Name"
                                    value={formData.emergencyContact?.name || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({
                                        ...prev,
                                        emergencyContact: { ...prev.emergencyContact, name: v, phone: prev.emergencyContact?.phone || '', relationship: prev.emergencyContact?.relationship || '' }
                                    }))}
                                />
                                <ProfileField
                                    icon={<Phone className="w-4 h-4" />}
                                    label="Contact Phone"
                                    value={formData.emergencyContact?.phone || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({
                                        ...prev,
                                        emergencyContact: { ...prev.emergencyContact, phone: v, name: prev.emergencyContact?.name || '', relationship: prev.emergencyContact?.relationship || '' }
                                    }))}
                                    type="tel"
                                />
                                <ProfileField
                                    icon={<User className="w-4 h-4" />}
                                    label="Relationship"
                                    value={formData.emergencyContact?.relationship || ''}
                                    isEditing={isEditing}
                                    onChange={(v) => setFormData(prev => ({
                                        ...prev,
                                        emergencyContact: { ...prev.emergencyContact, relationship: v, name: prev.emergencyContact?.name || '', phone: prev.emergencyContact?.phone || '' }
                                    }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logout Button */}
                    {!isEditing && (
                        <button
                            onClick={handleLogout}
                            className={cn(
                                "w-full py-4 px-4 rounded-xl border border-red-200 bg-red-50",
                                "text-red-700 font-medium",
                                "hover:bg-red-100 transition-colors",
                                "flex items-center justify-center gap-2"
                            )}
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    )}
                </div>
            </main>

            {/* Fixed Save Button (when editing) */}
            {isEditing && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                    <div className="max-w-md mx-auto flex gap-3">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleCancel}
                            className="flex-shrink-0"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="flex-1"
                        >
                            {isSaving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// Profile Field Component
// ============================================

interface ProfileFieldProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    isEditing: boolean;
    onChange: (value: string) => void;
    type?: 'text' | 'email' | 'tel' | 'number';
    min?: number;
    max?: number;
    step?: number;
}

function ProfileField({
    icon,
    label,
    value,
    isEditing,
    onChange,
    type = 'text',
    min,
    max,
    step,
}: ProfileFieldProps) {
    return (
        <div className="space-y-1">
            <label className="text-label-sm text-surface-500 font-medium flex items-center gap-1.5">
                <span className="text-surface-400">{icon}</span>
                {label}
            </label>
            {isEditing ? (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                        "w-full py-2 px-3 rounded-lg border border-surface-200 bg-white",
                        "text-body-md placeholder:text-surface-400",
                        "focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters",
                        "transition-all duration-200"
                    )}
                />
            ) : (
                <p className="text-body-md text-surface-900">
                    {value || '—'}
                </p>
            )}
        </div>
    );
}
