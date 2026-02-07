'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import {
  Hash,
  Phone,
  ChevronDown,
  Shirt,
  Home,
  ArrowLeft,
  ArrowRight,
  User,
  AlertTriangle,
} from 'lucide-react';
import { BottomNav } from '@/components/layout';

/**
 * COMPLETE PROFILE PAGE
 *
 * Shown after initial account creation to prompt users
 * to add optional profile details like handicap, phone, etc.
 *
 * Fried Egg Editorial Design v3.0
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
  const searchParams = useSearchParams();
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

  const nextPath = searchParams?.get('next') || '/';

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
      const nextPath = searchParams?.get('next');
      router.push(nextPath || '/');
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
      const nextPath = searchParams?.get('next');
      router.push(nextPath || '/');
    } catch (err) {
      logger.error('Failed to skip onboarding', { error: err });
      router.push('/');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="Sign in to complete your profile"
            description="Finish onboarding after you sign in."
            action={{
              label: 'Sign In',
              onClick: () => router.push('/login'),
            }}
            secondaryAction={{
              label: 'Back to Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (currentUser?.hasCompletedOnboarding) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="You're all set"
            description="Your profile onboarding is already complete."
            action={{
              label: 'Continue',
              onClick: () => router.push(nextPath),
            }}
            secondaryAction={{
              label: 'Back to Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!currentUser) {
    // Auth store can be authenticated but still loading the current user payload.
    return <PageLoadingSkeleton title="Complete Your Profile" variant="form" />;
  }

  return (
    <div className="page-premium-enter texture-grain bg-canvas min-h-screen flex flex-col">
      {/* ---- HEADER ---- */}
      <header className="header-premium pt-[calc(var(--space-3)+env(safe-area-inset-top,0px))] pb-[var(--space-3)] px-[var(--space-5)]">
        <div className="flex items-center justify-between max-w-[600px] mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="press-scale flex items-center justify-center w-[40px] h-[40px] rounded-[var(--radius-md)] border-none bg-transparent cursor-pointer text-ink-secondary"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Title */}
          <h1 className="font-serif italic text-[length:var(--text-lg)] font-normal text-ink m-0">
            Complete Your Profile
          </h1>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="press-scale font-sans text-[length:var(--text-sm)] font-medium text-ink-tertiary bg-transparent border-none cursor-pointer p-[var(--space-2)] transition-colors duration-200"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* ---- MAIN CONTENT ---- */}
      <main className="flex-1 pb-[140px]">
        <div className="container-editorial">
          {/* Welcome / Hero Block */}
          <div className="text-center pt-[var(--space-10)] pb-[var(--space-8)]">
            <p className="type-overline text-ink-tertiary tracking-[0.15em] mb-[var(--space-3)]">
              Complete Your Profile
            </p>
            <h2 className="font-serif italic text-[length:clamp(2rem,5vw,2.75rem)] font-normal text-ink leading-[1.1] m-0">
              Almost There
            </h2>
            <p className="font-sans text-[length:var(--text-base)] text-ink-secondary mt-[var(--space-3)] leading-normal">
              Welcome, {currentUser.firstName}. A few more details help with
              trip&nbsp;planning and fair match&nbsp;pairing.
            </p>
          </div>

          {/* Thin rule divider */}
          <div className="h-px bg-rule mb-[var(--space-6)]" />

          {/* ---- ACCORDION SECTIONS ---- */}
          <div className="flex flex-col gap-[var(--space-4)]">
            {/* ======== GOLF PROFILE ======== */}
            <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('golf')}
                className="press-scale w-full flex items-center justify-between py-[var(--space-5)] px-[var(--space-6)] bg-transparent border-none cursor-pointer text-left"
              >
                <div className="flex items-center gap-[var(--space-4)]">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-full)] bg-masters-subtle flex items-center justify-center shrink-0">
                    <Hash className="w-[18px] h-[18px] text-masters" />
                  </div>
                  <div>
                    <p className="font-serif italic text-[length:var(--text-lg)] text-ink m-0 leading-[1.3]">
                      Golf Profile
                    </p>
                    <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 mt-[2px]">
                      Handicap, GHIN, home course
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-ink-tertiary transition-transform duration-200 shrink-0 ${expandedSection === 'golf' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'golf' && (
                <div className="pt-[var(--space-5)] px-[var(--space-6)] pb-[var(--space-6)] border-t border-rule-faint flex flex-col gap-[var(--space-5)]">
                  <InputField
                    label="Handicap Index"
                    value={formData.handicapIndex}
                    onChange={(v) => updateField('handicapIndex', v)}
                    placeholder="12.5"
                    type="number"
                    icon={<Hash className="w-[18px] h-[18px]" />}
                    hint="For fair match pairing"
                  />
                  <InputField
                    label="GHIN Number"
                    value={formData.ghin}
                    onChange={(v) => updateField('ghin', v)}
                    placeholder="1234567"
                    hint="Optional — for handicap verification"
                  />
                  <InputField
                    label="Home Course"
                    value={formData.homeCourse}
                    onChange={(v) => updateField('homeCourse', v)}
                    placeholder="Augusta National"
                    icon={<Home className="w-[18px] h-[18px]" />}
                  />

                  {/* Preferred Tees — option chips */}
                  <div>
                    <label className="block font-sans text-[length:var(--text-sm)] font-semibold text-ink-secondary mb-[var(--space-2)]">
                      Preferred Tees
                    </label>
                    <div className="grid grid-cols-3 gap-[var(--space-2)]">
                      {(['back', 'middle', 'forward'] as const).map((tee) => (
                        <button
                          key={tee}
                          type="button"
                          onClick={() => updateField('preferredTees', tee)}
                          className={`press-scale py-[var(--space-3)] px-[var(--space-4)] rounded-[var(--radius-md)] font-sans text-[length:var(--text-sm)] font-semibold capitalize cursor-pointer transition-all duration-150 ${
                            formData.preferredTees === tee
                              ? 'border-2 border-masters bg-masters-subtle text-masters'
                              : 'border border-rule bg-canvas-raised text-ink-secondary'
                          }`}
                        >
                          {tee}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ======== PERSONAL DETAILS ======== */}
            <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('personal')}
                className="press-scale w-full flex items-center justify-between py-[var(--space-5)] px-[var(--space-6)] bg-transparent border-none cursor-pointer text-left"
              >
                <div className="flex items-center gap-[var(--space-4)]">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-full)] bg-[var(--gold-subtle)] flex items-center justify-center shrink-0">
                    <User className="w-[18px] h-[18px] text-gold-dark" />
                  </div>
                  <div>
                    <p className="font-serif italic text-[length:var(--text-lg)] text-ink m-0 leading-[1.3]">
                      Personal Details
                    </p>
                    <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 mt-[2px]">
                      Nickname, phone number
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-ink-tertiary transition-transform duration-200 shrink-0 ${expandedSection === 'personal' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'personal' && (
                <div className="pt-[var(--space-5)] px-[var(--space-6)] pb-[var(--space-6)] border-t border-rule-faint flex flex-col gap-[var(--space-5)]">
                  <InputField
                    label="Nickname"
                    value={formData.nickname}
                    onChange={(v) => updateField('nickname', v)}
                    placeholder="Big Hitter"
                    hint="What your buddies call you"
                    icon={<User className="w-[18px] h-[18px]" />}
                  />
                  <InputField
                    label="Phone Number"
                    value={formData.phoneNumber}
                    onChange={(v) => updateField('phoneNumber', v)}
                    placeholder="(555) 123-4567"
                    type="tel"
                    icon={<Phone className="w-[18px] h-[18px]" />}
                    hint="For trip coordination"
                  />
                </div>
              )}
            </div>

            {/* ======== TRIP PREFERENCES ======== */}
            <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('trip')}
                className="press-scale w-full flex items-center justify-between py-[var(--space-5)] px-[var(--space-6)] bg-transparent border-none cursor-pointer text-left"
              >
                <div className="flex items-center gap-[var(--space-4)]">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-full)] bg-[var(--maroon-subtle)] flex items-center justify-center shrink-0">
                    <Shirt className="w-[18px] h-[18px] text-maroon" />
                  </div>
                  <div>
                    <p className="font-serif italic text-[length:var(--text-lg)] text-ink m-0 leading-[1.3]">
                      Trip Preferences
                    </p>
                    <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 mt-[2px]">
                      Shirt size, dietary needs
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-ink-tertiary transition-transform duration-200 shrink-0 ${expandedSection === 'trip' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'trip' && (
                <div className="pt-[var(--space-5)] px-[var(--space-6)] pb-[var(--space-6)] border-t border-rule-faint flex flex-col gap-[var(--space-5)]">
                  {/* Shirt Size — option chips */}
                  <div>
                    <label className="block font-sans text-[length:var(--text-sm)] font-semibold text-ink-secondary mb-[var(--space-2)]">
                      Shirt Size
                    </label>
                    <div className="grid grid-cols-4 gap-[var(--space-2)]">
                      {(['S', 'M', 'L', 'XL', '2XL', '3XL'] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateField('shirtSize', size)}
                          className={`press-scale py-[var(--space-3)] px-[var(--space-2)] rounded-[var(--radius-md)] font-sans text-[length:var(--text-sm)] font-semibold cursor-pointer transition-all duration-150 ${
                            formData.shirtSize === size
                              ? 'border-2 border-masters bg-masters-subtle text-masters'
                              : 'border border-rule bg-canvas-raised text-ink-secondary'
                          }`}
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

            {/* ======== EMERGENCY CONTACT ======== */}
            <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('emergency')}
                className="press-scale w-full flex items-center justify-between py-[var(--space-5)] px-[var(--space-6)] bg-transparent border-none cursor-pointer text-left"
              >
                <div className="flex items-center gap-[var(--space-4)]">
                  <div className="w-[40px] h-[40px] rounded-[var(--radius-full)] bg-[rgba(166,61,64,0.08)] flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-[18px] h-[18px] text-error" />
                  </div>
                  <div>
                    <p className="font-serif italic text-[length:var(--text-lg)] text-ink m-0 leading-[1.3]">
                      Emergency Contact
                    </p>
                    <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 mt-[2px]">
                      In case of emergency
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-ink-tertiary transition-transform duration-200 shrink-0 ${expandedSection === 'emergency' ? 'rotate-180' : ''}`}
                />
              </button>

              {expandedSection === 'emergency' && (
                <div className="pt-[var(--space-5)] px-[var(--space-6)] pb-[var(--space-6)] border-t border-rule-faint flex flex-col gap-[var(--space-5)]">
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
        </div>
      </main>

      {/* ---- FIXED BOTTOM BAR ---- */}
      <div className="fixed bottom-0 left-0 right-0 bg-canvas border-t border-rule py-[var(--space-4)] px-[var(--space-5)] pb-[max(var(--space-4),env(safe-area-inset-bottom))] z-30">
        <div className="max-w-[600px] mx-auto flex flex-col gap-[var(--space-3)]">
          <button
            onClick={handleSaveAndContinue}
            disabled={isSubmitting || isLoading}
            className={`btn-premium press-scale w-full flex items-center justify-center gap-[var(--space-2)] py-[var(--space-4)] px-[var(--space-6)] text-[length:var(--text-base)] ${
              isSubmitting || isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-[var(--radius-full)] animate-[spin_0.6s_linear_infinite] inline-block" />
                Saving...
              </>
            ) : (
              <>
                Save &amp; Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="press-scale w-full p-[var(--space-2)] font-sans text-[length:var(--text-sm)] font-medium text-ink-tertiary bg-transparent border-none cursor-pointer transition-colors duration-200"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Input Field Component — Fried Egg Editorial
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
    <div>
      <label className="block font-sans text-[length:var(--text-sm)] font-semibold text-ink-secondary mb-[var(--space-2)]">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-ink-tertiary flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full font-sans text-[length:var(--text-base)] text-ink bg-canvas-raised border border-rule rounded-[var(--radius-md)] outline-none transition-[border-color,box-shadow] duration-200 box-border focus:border-masters focus:shadow-[0_0_0_3px_rgba(0,102,68,0.08)] ${
            icon
              ? 'py-[var(--space-3)] pr-[var(--space-4)] pl-[calc(var(--space-3)+30px)]'
              : 'py-[var(--space-3)] px-[var(--space-4)]'
          }`}
        />
      </div>
      {hint && (
        <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)]">
          {hint}
        </p>
      )}
    </div>
  );
}
