'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { Button } from '@/components/ui';
import { GolfersIllustration } from '@/components/ui/illustrations';
import {
  User,
  Mail,
  Hash,
  Phone,
  ArrowLeft,
  Check,
  ChevronRight,
  Shirt,
  Home,
  AlertCircle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PROFILE CREATION PAGE
 *
 * Streamlined profile creation - only 3 essential fields required.
 * Additional details can be completed later in Profile settings.
 *
 * UX Improvement: Reduced from 14 fields across 3 steps to just 3 essential fields
 * to minimize abandonment risk for participants joining mid-trip.
 */

type Step = 'essential' | 'optional';

const logger = createLogger('profile');

interface FormData {
  // Essential (required)
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  confirmPin: string;

  // Optional (can complete later)
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

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  pin: '',
  confirmPin: '',
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
};

export default function CreateProfilePage() {
  const router = useRouter();
  const { createProfile, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<Step>('essential');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [showOptionalExpanded, setShowOptionalExpanded] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error when field is updated
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (error) {
      clearError();
    }
  };

  const validateEssential = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!formData.pin.trim()) {
      errors.pin = 'PIN is required';
    } else if (!/^\d{4}$/.test(formData.pin)) {
      errors.pin = 'PIN must be exactly 4 digits';
    }
    if (formData.pin !== formData.confirmPin) {
      errors.confirmPin = 'PINs do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBack = () => {
    if (step === 'optional') {
      setStep('essential');
    } else {
      router.push('/login');
    }
  };

  const handleContinueToOptional = () => {
    if (validateEssential()) {
      setStep('optional');
    }
  };

  const handleSubmit = async () => {
    if (!validateEssential()) return;

    setIsSubmitting(true);

    try {
      // Parse handicap, defaulting to undefined if empty or invalid
      const handicapValue = formData.handicapIndex.trim()
        ? parseFloat(formData.handicapIndex)
        : undefined;

      const profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete'> =
        {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          nickname: formData.nickname.trim() || undefined,
          email: formData.email.trim(),
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

      await createProfile(profileData, formData.pin);
      showToast('success', 'Welcome! Your profile is ready.');
      router.push('/');
    } catch (err) {
      logger.error('Failed to create profile', { error: err });
      showToast('error', 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = {
    essential: 'Create Account',
    optional: 'Optional Details',
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-masters/5 via-surface-50 to-surface-100 flex flex-col">
      {/* Header */}
      <header className="pt-safe-area-inset-top sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-surface-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-heading-sm font-semibold text-surface-900">{stepTitles[step]}</h1>
            <p className="text-caption text-surface-500">
              {step === 'essential' ? 'Just 3 fields to get started' : 'Add more details anytime'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-surface-100">
          <div
            className="h-full bg-masters transition-all duration-300"
            style={{ width: step === 'essential' ? '50%' : '100%' }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-32">
        <div className="max-w-md mx-auto">
          {/* Essential Fields (Required) */}
          {step === 'essential' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-masters/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-masters" />
                  </div>
                </div>
                <h2 className="text-heading-md font-semibold text-surface-900">Quick start</h2>
                <p className="text-body-sm text-surface-600 mt-1">
                  Just 3 fields — you can add more later
                </p>
              </div>

              <div className="space-y-4">
                {/* Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="First Name"
                    value={formData.firstName}
                    onChange={(v) => updateField('firstName', v)}
                    placeholder="John"
                    error={validationErrors.firstName}
                    required
                    autoFocus
                  />
                  <InputField
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(v) => updateField('lastName', v)}
                    placeholder="Smith"
                    error={validationErrors.lastName}
                    required
                  />
                </div>

                {/* Email */}
                <InputField
                  label="Email"
                  value={formData.email}
                  onChange={(v) => updateField('email', v)}
                  placeholder="john@example.com"
                  type="email"
                  error={validationErrors.email}
                  required
                  icon={<Mail className="w-5 h-5" />}
                  hint="Used for trip invites"
                />

                {/* PIN Section */}
                <div className="pt-4 border-t border-surface-200">
                  <h3 className="text-label-lg font-semibold text-surface-800 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-surface-500" />
                    Create Your PIN
                  </h3>
                  <p className="text-caption text-surface-500 mb-4">
                    You&apos;ll use this 4-digit PIN to log in
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <InputField
                      label="4-Digit PIN"
                      value={formData.pin}
                      onChange={(v) => updateField('pin', v.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      error={validationErrors.pin}
                      required
                      inputMode="numeric"
                      maxLength={4}
                    />
                    <InputField
                      label="Confirm PIN"
                      value={formData.confirmPin}
                      onChange={(v) => updateField('confirmPin', v.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      error={validationErrors.confirmPin}
                      required
                      inputMode="numeric"
                      maxLength={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Fields */}
          {step === 'optional' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <GolfersIllustration size="lg" />
                </div>
                <h2 className="text-heading-md font-semibold text-surface-900">Almost there!</h2>
                <p className="text-body-sm text-surface-600 mt-1">
                  Optional details for better trip experience
                </p>
              </div>

              {/* Golf Info - Collapsible */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowOptionalExpanded(!showOptionalExpanded)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-100 transition-colors"
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
                      showOptionalExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {showOptionalExpanded && (
                  <div className="space-y-4 pl-4 border-l-2 border-masters/20 ml-5 animate-in fade-in slide-in-from-top-2">
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

                {/* Trip Preferences - Preview */}
                <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Shirt className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-surface-900">Trip Preferences</p>
                      <p className="text-caption text-surface-500">
                        Shirt size, dietary needs, emergency contact
                      </p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-surface-200 text-surface-600">
                      Later
                    </span>
                  </div>
                  <p className="text-caption text-surface-400 mt-2 ml-13">
                    Complete in your profile settings before the trip
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 p-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto">
          {step === 'essential' ? (
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="w-full"
              >
                {isSubmitting || isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Create Account
                  </span>
                )}
              </Button>
              <button
                onClick={handleContinueToOptional}
                className="w-full py-2 text-sm text-surface-500 hover:text-masters transition-colors"
              >
                Add optional details first →
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" onClick={handleBack} className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="flex-1"
              >
                {isSubmitting || isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </span>
                )}
              </Button>
            </div>
          )}
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
  error?: string;
  hint?: string;
  required?: boolean;
  autoFocus?: boolean;
  icon?: React.ReactNode;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  maxLength?: number;
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  hint,
  required,
  autoFocus,
  icon,
  inputMode,
  maxLength,
}: InputFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-label-md text-surface-700 font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">{icon}</div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputMode={inputMode}
          maxLength={maxLength}
          className={cn(
            'w-full py-3 rounded-xl border bg-white',
            'text-body-md placeholder:text-surface-400',
            'focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters',
            'transition-all duration-200',
            icon ? 'pl-11 pr-4' : 'px-4',
            error ? 'border-red-300' : 'border-surface-200'
          )}
        />
      </div>
      {error && <p className="text-caption text-red-600">{error}</p>}
      {hint && !error && <p className="text-caption text-surface-500">{hint}</p>}
    </div>
  );
}
