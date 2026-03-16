'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageLoadingSkeleton } from '@/components/ui';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { buildMagicLinkRedirectPath, requestEmailSignInLink } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Hash,
  Home,
  Lock,
  Mail,
} from 'lucide-react';

type Step = 'essential' | 'optional';
type PreferredTee = 'back' | 'middle' | 'forward' | '';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  confirmPin: string;
  handicapIndex: string;
  ghin: string;
  homeCourse: string;
  preferredTees: PreferredTee;
}

const logger = createLogger('profile-create');

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  pin: '',
  confirmPin: '',
  handicapIndex: '',
  ghin: '',
  homeCourse: '',
  preferredTees: '',
};

export default function CreateProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createProfile, isAuthenticated, currentUser, isLoading, error, clearError, authEmail } =
    useAuthStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<Step>('essential');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGolfProfile, setShowGolfProfile] = useState(true);
  const [enableOfflinePin, setEnableOfflinePin] = useState(!isSupabaseConfigured);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  useEffect(() => {
    if (isAuthenticated && currentUser?.hasCompletedOnboarding) {
      const nextPath = searchParams?.get('next');
      router.push(nextPath || '/');
    }
  }, [currentUser, isAuthenticated, router, searchParams]);

  useEffect(() => {
    if (!authEmail) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      email: authEmail,
    }));
  }, [authEmail]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    if (error) {
      clearError();
    }
  };

  const validateEssential = () => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const requiresOfflinePin = !isSupabaseConfigured || enableOfflinePin;

    if (!formData.firstName.trim()) {
      nextErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      nextErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email';
    }

    if (requiresOfflinePin) {
      if (!/^\d{4}$/.test(formData.pin)) {
        nextErrors.pin = 'PIN must be exactly 4 digits';
      }

      if (formData.pin !== formData.confirmPin) {
        nextErrors.confirmPin = 'PINs do not match';
      }
    } else if (formData.pin || formData.confirmPin) {
      if (!/^\d{4}$/.test(formData.pin)) {
        nextErrors.pin = 'PIN must be exactly 4 digits';
      }

      if (formData.pin !== formData.confirmPin) {
        nextErrors.confirmPin = 'PINs do not match';
      }
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleBack = () => {
    if (step === 'optional') {
      setStep('essential');
      return;
    }

    const nextPath = searchParams?.get('next');
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/login${nextParam}`);
  };

  const handleSubmit = async () => {
    if (!validateEssential()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const handicapValue = formData.handicapIndex.trim()
        ? parseFloat(formData.handicapIndex)
        : undefined;

      const profileData: Omit<
        UserProfile,
        'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete' | 'hasCompletedOnboarding'
      > = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        handicapIndex:
          handicapValue !== undefined && !Number.isNaN(handicapValue) ? handicapValue : undefined,
        ghin: formData.ghin.trim() || undefined,
        homeCourse: formData.homeCourse.trim() || undefined,
        preferredTees: formData.preferredTees || undefined,
      };

      const profile = await createProfile(profileData, enableOfflinePin ? formData.pin : undefined);
      let successMessage = 'Profile created. You can add more details next.';

      if (isSupabaseConfigured && !authEmail) {
        try {
          await requestEmailSignInLink(
            profile.email ?? '',
            buildMagicLinkRedirectPath(searchParams?.get('next'))
          );
          successMessage = enableOfflinePin
            ? 'Profile created. Check your email to finish signing in.'
            : 'Profile created. Check your email to finish signing in. You can add a device PIN later from Profile.';
        } catch (signInLinkError) {
          logger.warn('Failed to send sign-in link after profile creation', {
            error: signInLinkError,
          });
          successMessage = enableOfflinePin
            ? 'Profile created. Use your device PIN for now and add email sign-in later.'
            : 'Profile created. Email sign-in is unavailable right now, but you can add a device PIN later from Profile.';
        }
      } else if (isSupabaseConfigured && !enableOfflinePin) {
        successMessage =
          'Profile created. You can add a device PIN later from Profile if you want offline access on this device.';
      }

      showToast('success', successMessage);
      const nextPath = searchParams?.get('next');
      const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
      router.push(`/profile/complete${nextParam}`);
    } catch (submissionError) {
      logger.error('Failed to create profile', { error: submissionError });
      showToast('error', 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !currentUser && !isAuthenticated) {
    return <PageLoadingSkeleton title="Create Account" variant="form" showBackButton={false} />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={step === 'essential' ? 'Create Account' : 'Optional Details'}
        onBack={handleBack}
        icon={
          step === 'essential' ? (
            <Mail size={16} className="text-[var(--masters)]" />
          ) : (
            <Hash size={16} className="text-[var(--masters)]" />
          )
        }
      />

      <main className="container-editorial pb-[calc(188px+env(safe-area-inset-bottom,0px))] pt-[var(--space-8)]">
        <div className="mx-auto max-w-[420px]">
          {step === 'essential' ? (
            <EssentialStep
              authEmail={authEmail}
              enableOfflinePin={enableOfflinePin}
              errors={validationErrors}
              formData={formData}
              isCloudMode={isSupabaseConfigured}
              onToggleOfflinePin={() => {
                setEnableOfflinePin((prev) => !prev);
                setValidationErrors((prev) => ({
                  ...prev,
                  pin: undefined,
                  confirmPin: undefined,
                }));
              }}
              updateField={updateField}
            />
          ) : (
            <OptionalStep
              expanded={showGolfProfile}
              formData={formData}
              onToggleExpanded={() => setShowGolfProfile((prev) => !prev)}
              updateField={updateField}
            />
          )}

          {error && (
            <div className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-[rgba(166,61,64,0.18)] bg-[rgba(166,61,64,0.08)] px-[var(--space-4)] py-[var(--space-3)]">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] z-40 border-t border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-5)] py-[var(--space-4)]">
        <div className="mx-auto max-w-[420px]">
          {step === 'essential' ? (
            <div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="btn-premium press-scale flex w-full items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-lg)] px-[var(--space-6)] py-[var(--space-4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting || isLoading ? 'Creating...' : 'Create Account'}
                {!isSubmitting && !isLoading && <ArrowRight size={16} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateEssential()) {
                    setStep('optional');
                  }
                }}
                className="mt-[var(--space-3)] w-full text-sm font-medium text-[var(--ink-tertiary)]"
              >
                Add optional golf details first
              </button>
            </div>
          ) : (
            <div className="flex gap-[var(--space-3)]">
              <button
                type="button"
                onClick={handleBack}
                className="press-scale flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-secondary)]"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="btn-premium press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-lg)] px-[var(--space-6)] py-[var(--space-4)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting || isLoading ? 'Creating...' : 'Complete Setup'}
                {!isSubmitting && !isLoading && <Check size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EssentialStep({
  authEmail,
  enableOfflinePin,
  errors,
  formData,
  isCloudMode,
  onToggleOfflinePin,
  updateField,
}: {
  authEmail?: string | null;
  enableOfflinePin: boolean;
  errors: Partial<Record<keyof FormData, string>>;
  formData: FormData;
  isCloudMode: boolean;
  onToggleOfflinePin: () => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  return (
    <section className="space-y-[var(--space-8)]">
      <div className="text-center">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">JOIN THE FIELD</p>
        <h1 className="mt-[var(--space-3)] font-serif text-[clamp(2rem,8vw,2.75rem)] italic leading-[1.05] text-[var(--ink)]">
          Create your account
        </h1>
        <p className="mt-[var(--space-3)] text-base text-[var(--ink-secondary)]">
          Start with the basics. You can add golf details next.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-[var(--space-4)]">
        <ProfileTextField
          autoFocus
          error={errors.firstName}
          label="First Name"
          onChange={(value) => updateField('firstName', value)}
          placeholder="John"
          required
          value={formData.firstName}
        />
        <ProfileTextField
          error={errors.lastName}
          label="Last Name"
          onChange={(value) => updateField('lastName', value)}
          placeholder="Smith"
          required
          value={formData.lastName}
        />
      </div>

      <ProfileTextField
        disabled={Boolean(authEmail)}
        error={errors.email}
        hint={authEmail ? 'Locked to your signed-in account email' : 'Used for invites and sign-in'}
        icon={<Mail className="h-5 w-5" />}
        label="Email"
        onChange={(value) => updateField('email', value)}
        placeholder="john@example.com"
        required
        type="email"
        value={formData.email}
      />

      <section className="rounded-[1.75rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_18px_36px_rgba(46,34,18,0.06)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <Lock className="h-4 w-4 text-[var(--ink-tertiary)]" />
          <h2 className="font-serif text-[var(--text-xl)] italic text-[var(--ink)]">
            {isCloudMode ? 'Offline access on this device' : 'Choose your device PIN'}
          </h2>
        </div>
        <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-tertiary)]">
          {isCloudMode
            ? 'Add a 4-digit PIN if you want to use this app on this device without email or internet access.'
            : 'Use this 4-digit PIN to open the app on this device when you are offline.'}
        </p>

        {isCloudMode && (
          <button
            type="button"
            onClick={onToggleOfflinePin}
            className={`press-scale mt-[var(--space-5)] inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold ${
              enableOfflinePin
                ? 'border-[color:rgba(0,102,68,0.18)] bg-[var(--masters-subtle)] text-[var(--masters)]'
                : 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]'
            }`}
          >
            <Check size={14} />
            {enableOfflinePin ? 'Offline PIN enabled' : 'Add offline PIN now'}
          </button>
        )}

        {enableOfflinePin ? (
          <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-4)]">
            <ProfileTextField
              error={errors.pin}
              inputMode="numeric"
              label="4-Digit PIN"
              maxLength={4}
              onChange={(value) => updateField('pin', value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              required={!isCloudMode || enableOfflinePin}
              value={formData.pin}
            />
            <ProfileTextField
              error={errors.confirmPin}
              inputMode="numeric"
              label="Confirm PIN"
              maxLength={4}
              onChange={(value) =>
                updateField('confirmPin', value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="••••"
              required={!isCloudMode || enableOfflinePin}
              value={formData.confirmPin}
            />
          </div>
        ) : (
          <div className="mt-[var(--space-5)] rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-4)] text-sm leading-6 text-[var(--ink-secondary)]">
            Skip this for now. You can add a device PIN later from Profile.
          </div>
        )}
      </section>
    </section>
  );
}

function OptionalStep({
  expanded,
  formData,
  onToggleExpanded,
  updateField,
}: {
  expanded: boolean;
  formData: FormData;
  onToggleExpanded: () => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}) {
  return (
    <section className="space-y-[var(--space-6)]">
      <div className="text-center">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">ALMOST THERE</p>
        <h1 className="mt-[var(--space-3)] font-serif text-[clamp(1.9rem,7vw,2.5rem)] italic leading-[1.05] text-[var(--ink)]">
          Add your golf details
        </h1>
        <p className="mt-[var(--space-3)] text-base text-[var(--ink-secondary)]">
          Add your handicap, GHIN, home course, and tees now, or come back later.
        </p>
      </div>

      <section className="rounded-[1.75rem] border border-[var(--rule)] bg-[var(--canvas-raised)] shadow-[0_18px_36px_rgba(46,34,18,0.06)]">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex w-full items-center justify-between gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)] text-left"
        >
          <div className="flex items-center gap-[var(--space-3)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--masters-subtle)] text-[var(--masters)]">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">Golf profile</p>
              <p className="text-sm text-[var(--ink-tertiary)]">Handicap, GHIN, home course, preferred tees</p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-[var(--ink-tertiary)] transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expanded && (
          <div className="space-y-[var(--space-5)] border-t border-[var(--rule)] px-[var(--space-5)] py-[var(--space-5)]">
            <ProfileTextField
              hint="Helps with pairings and scoring"
              icon={<Hash className="h-5 w-5" />}
              label="Handicap Index"
              onChange={(value) => updateField('handicapIndex', value)}
              placeholder="12.5"
              type="number"
              value={formData.handicapIndex}
            />
            <ProfileTextField
              hint="Optional, for official handicap verification"
              label="GHIN Number"
              onChange={(value) => updateField('ghin', value)}
              placeholder="1234567"
              value={formData.ghin}
            />
            <ProfileTextField
              icon={<Home className="h-5 w-5" />}
              label="Home Course"
              onChange={(value) => updateField('homeCourse', value)}
              placeholder="Augusta National"
              value={formData.homeCourse}
            />

            <div>
              <label className="mb-[var(--space-2)] block text-sm font-medium tracking-[0.02em] text-[var(--ink-secondary)]">
                Preferred Tees
              </label>
              <div className="grid grid-cols-3 gap-[var(--space-2)]">
                {(['back', 'middle', 'forward'] as const).map((tee) => {
                  const selected = formData.preferredTees === tee;

                  return (
                    <button
                      key={tee}
                      type="button"
                      onClick={() => updateField('preferredTees', tee)}
                      className={`press-scale rounded-[var(--radius-lg)] px-[var(--space-3)] py-[var(--space-3)] text-sm font-semibold capitalize transition-all ${
                        selected
                          ? 'border-2 border-[var(--masters)] bg-[var(--masters-subtle)] text-[var(--masters)]'
                          : 'border border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]'
                      }`}
                    >
                      {tee}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-[1.75rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,243,235,0.98))] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_18px_36px_rgba(46,34,18,0.05)]">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Later from Profile</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[var(--text-xl)] italic text-[var(--ink)]">
          You can add the rest later.
        </h2>
        <p className="mt-[var(--space-3)] text-sm leading-6 text-[var(--ink-secondary)]">
          Shirt size, dietary needs, and emergency contacts can wait until the next step or later from Profile.
        </p>
      </div>
    </section>
  );
}

function ProfileTextField({
  autoFocus = false,
  disabled = false,
  error,
  hint,
  icon,
  inputMode,
  label,
  maxLength,
  onChange,
  placeholder,
  required = false,
  type = 'text',
  value,
}: {
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'number';
  value: string;
}) {
  return (
    <div>
      <label className="mb-[var(--space-2)] block text-sm font-medium tracking-[0.02em] text-[var(--ink-secondary)]">
        {label}
        {required && <span className="ml-[2px] text-[var(--error)]">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]">
            {icon}
          </div>
        )}
        <input
          autoFocus={autoFocus}
          className={`w-full rounded-[var(--radius-lg)] border bg-[var(--canvas-raised)] px-4 py-[14px] text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink-faint)] focus:border-[var(--masters)] focus:shadow-[0_0_0_3px_rgba(0,102,68,0.12)] ${
            icon ? 'pl-11' : ''
          } ${
            disabled ? 'cursor-not-allowed bg-[var(--surface)] opacity-80' : ''
          } ${
            error ? 'border-[var(--error)]' : 'border-[var(--rule)]'
          }`}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
          type={type}
          value={value}
        />
      </div>
      {error ? (
        <p className="mt-[var(--space-1)] text-xs leading-5 text-[var(--error)]">{error}</p>
      ) : hint ? (
        <p className="mt-[var(--space-1)] text-xs leading-5 text-[var(--ink-tertiary)]">{hint}</p>
      ) : null}
    </div>
  );
}
