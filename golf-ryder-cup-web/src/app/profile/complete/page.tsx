'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { Button } from '@/components/ui';
import { GolfersIllustration } from '@/components/ui/illustrations';
import {
  Hash,
  Phone,
  ChevronRight,
  Shirt,
  Home,
  ArrowRight,
  Sparkles,
  User,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * COMPLETE PROFILE PAGE
 *
 * Shown after initial account creation to prompt users
 * to add optional profile details like handicap, phone, etc.
 */

const logger = createLogger('profile-complete');

interface FormData {
  nickname: string;
  phoneNumber: string;
  handicapIndex: string;
  ghin: string;
  homeCourse: string;
  preferredTees: 'back' | 'middle' | 'forward' | '';
  shirtSize: UserProfile['shirtSize'] | '';
  dietaryRestrictions: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, updateProfile, completeOnboarding, isLoading } =
    useAuthStore();
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState<FormData>({
    nickname: '',
    phoneNumber: '',
    handicapIndex: '',
    ghin: '',
    homeCourse: '',
    preferredTees: '',
    shirtSize: '',
    dietaryRestrictions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('golf');

  // Redirect if not logged in or already completed onboarding
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (currentUser?.hasCompletedOnboarding) {
      router.push('/');
    }
  }, [isAuthenticated, currentUser, router]);

  // Pre-fill with existing data
  useEffect(() => {
    if (currentUser) {
      setFormData({
        nickname: currentUser.nickname || '',
        phoneNumber: currentUser.phoneNumber || '',
        handicapIndex: currentUser.handicapIndex?.toString() || '',
        ghin: currentUser.ghin || '',
        homeCourse: currentUser.homeCourse || '',
        preferredTees: currentUser.preferredTees || '',
        shirtSize: currentUser.shirtSize || '',
        dietaryRestrictions: currentUser.dietaryRestrictions || '',
        emergencyContactName: currentUser.emergencyContact?.name || '',
        emergencyContactPhone: currentUser.emergencyContact?.phone || '',
        emergencyContactRelationship: currentUser.emergencyContact?.relationship || '',
      });
    }
  }, [currentUser]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSaveAndContinue = async () => {
    setIsSubmitting(true);

    try {
      const handicapValue = formData.handicapIndex.trim()
        ? parseFloat(formData.handicapIndex)
        : undefined;

      const updates: Partial<UserProfile> = {
        nickname: formData.nickname.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        handicapIndex:
          handicapValue !== undefined && !isNaN(handicapValue) ? handicapValue : undefined,
        ghin: formData.ghin.trim() || undefined,
        homeCourse: formData.homeCourse.trim() || undefined,
        preferredTees: formData.preferredTees || undefined,
        shirtSize: formData.shirtSize || undefined,
        dietaryRestrictions: formData.dietaryRestrictions.trim() || undefined,
        emergencyContact: formData.emergencyContactName
          ? {
              name: formData.emergencyContactName.trim(),
              phone: formData.emergencyContactPhone.trim(),
              relationship: formData.emergencyContactRelationship.trim(),
            }
          : undefined,
      };

      await updateProfile(updates);
      await completeOnboarding();
      showToast('success', 'Profile complete! Welcome aboard.');
      router.push('/');
    } catch (err) {
      logger.error('Failed to update profile', { error: err });
      showToast('error', 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding();
      showToast('info', 'You can complete your profile anytime in Settings.');
      router.push('/');
    } catch (err) {
      logger.error('Failed to skip onboarding', { error: err });
      router.push('/');
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-masters/5 via-surface-50 to-surface-100 flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-surface-200"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-heading-sm font-semibold text-surface-900">
                Complete Your Profile
              </h1>
              <p className="text-caption text-surface-500">
                Welcome, {currentUser.firstName}! Add a few more details.
              </p>
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-surface-500 hover:text-masters transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="h-1 bg-surface-100">
          <div className="h-full bg-masters transition-all duration-300" style={{ width: '66%' }} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-32">
        <div className="max-w-md mx-auto space-y-4">
          {/* Welcome Message */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <GolfersIllustration size="lg" />
            </div>
            <h2 className="text-heading-md font-semibold text-surface-900">
              Let&apos;s get you set up!
            </h2>
            <p className="text-body-sm text-surface-600 mt-1">
              These details help with trip planning and fair match pairing.
            </p>
          </div>

          {/* Golf Info Section */}
          <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('golf')}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-masters/10 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-masters" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-surface-900">Golf Profile</p>
                  <p className="text-caption text-surface-500">Handicap, GHIN, home course</p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'w-5 h-5 text-surface-400 transition-transform',
                  expandedSection === 'golf' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'golf' && (
              <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2">
                <InputField
                  label="Handicap Index"
                  value={formData.handicapIndex}
                  onChange={(v) => updateField('handicapIndex', v)}
                  placeholder="12.5"
                  type="number"
                  icon={<Hash className="w-5 h-5" />}
                  hint="For fair match pairing"
                />
                <InputField
                  label="GHIN Number"
                  value={formData.ghin}
                  onChange={(v) => updateField('ghin', v)}
                  placeholder="1234567"
                  hint="Optional - for handicap verification"
                />
                <InputField
                  label="Home Course"
                  value={formData.homeCourse}
                  onChange={(v) => updateField('homeCourse', v)}
                  placeholder="Augusta National"
                  icon={<Home className="w-5 h-5" />}
                />
                <div className="space-y-2">
                  <label className="block text-label-md text-surface-700 font-medium">
                    Preferred Tees
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['back', 'middle', 'forward'] as const).map((tee) => (
                      <button
                        key={tee}
                        type="button"
                        onClick={() => updateField('preferredTees', tee)}
                        className={cn(
                          'py-2.5 px-3 rounded-xl border-2 font-medium capitalize transition-all text-sm',
                          formData.preferredTees === tee
                            ? 'border-masters bg-masters/10 text-masters'
                            : 'border-surface-200 text-surface-600 hover:border-surface-300'
                        )}
                      >
                        {tee}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Personal Info Section */}
          <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('personal')}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-surface-900">Personal Details</p>
                  <p className="text-caption text-surface-500">Nickname, phone number</p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'w-5 h-5 text-surface-400 transition-transform',
                  expandedSection === 'personal' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'personal' && (
              <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2">
                <InputField
                  label="Nickname"
                  value={formData.nickname}
                  onChange={(v) => updateField('nickname', v)}
                  placeholder="Big Hitter"
                  hint="What your buddies call you"
                  icon={<User className="w-5 h-5" />}
                />
                <InputField
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChange={(v) => updateField('phoneNumber', v)}
                  placeholder="(555) 123-4567"
                  type="tel"
                  icon={<Phone className="w-5 h-5" />}
                  hint="For trip coordination"
                />
              </div>
            )}
          </div>

          {/* Trip Preferences Section */}
          <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('trip')}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <Shirt className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-surface-900">Trip Preferences</p>
                  <p className="text-caption text-surface-500">Shirt size, dietary needs</p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'w-5 h-5 text-surface-400 transition-transform',
                  expandedSection === 'trip' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'trip' && (
              <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="block text-label-md text-surface-700 font-medium">
                    Shirt Size
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['S', 'M', 'L', 'XL', '2XL', '3XL'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateField('shirtSize', size)}
                        className={cn(
                          'py-2.5 px-3 rounded-xl border-2 font-medium transition-all text-sm',
                          formData.shirtSize === size
                            ? 'border-orange-500 bg-orange-50 text-orange-600'
                            : 'border-surface-200 text-surface-600 hover:border-surface-300'
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <InputField
                  label="Dietary Restrictions"
                  value={formData.dietaryRestrictions}
                  onChange={(v) => updateField('dietaryRestrictions', v)}
                  placeholder="Vegetarian, gluten-free, etc."
                  hint="For meal planning"
                />
              </div>
            )}
          </div>

          {/* Emergency Contact Section */}
          <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('emergency')}
              className="w-full flex items-center justify-between p-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-surface-900">Emergency Contact</p>
                  <p className="text-caption text-surface-500">In case of emergency</p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  'w-5 h-5 text-surface-400 transition-transform',
                  expandedSection === 'emergency' && 'rotate-90'
                )}
              />
            </button>

            {expandedSection === 'emergency' && (
              <div className="px-4 pb-4 space-y-4 border-t border-surface-100 pt-4 animate-in fade-in slide-in-from-top-2">
                <InputField
                  label="Contact Name"
                  value={formData.emergencyContactName}
                  onChange={(v) => updateField('emergencyContactName', v)}
                  placeholder="Jane Doe"
                />
                <InputField
                  label="Contact Phone"
                  value={formData.emergencyContactPhone}
                  onChange={(v) => updateField('emergencyContactPhone', v)}
                  placeholder="(555) 123-4567"
                  type="tel"
                />
                <InputField
                  label="Relationship"
                  value={formData.emergencyContactRelationship}
                  onChange={(v) => updateField('emergencyContactRelationship', v)}
                  placeholder="Spouse, Parent, etc."
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSaveAndContinue}
            disabled={isSubmitting || isLoading}
            className="w-full"
          >
            {isSubmitting || isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Save &amp; Continue
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Input Field Component
// ============================================

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'number';
  hint?: string;
  icon?: React.ReactNode;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  icon,
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-label-md text-surface-700 font-medium">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full py-3 rounded-xl border bg-white',
            'text-body-md placeholder:text-surface-400',
            'focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters',
            'transition-all duration-200 border-surface-200',
            icon ? 'pl-11 pr-4' : 'px-4'
          )}
        />
      </div>
      {hint && <p className="text-caption text-surface-500">{hint}</p>}
    </div>
  );
}
