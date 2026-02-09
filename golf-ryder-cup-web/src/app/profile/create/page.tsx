'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { BottomNav } from '@/components/layout';
import { PageLoadingSkeleton } from '@/components/ui';
import {
  Mail,
  Hash,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Home,
  Lock,
} from 'lucide-react';

/**
 * PROFILE CREATION PAGE — Fried Egg Editorial
 *
 * Warm cream canvas, Instrument Serif display type,
 * generous whitespace, and confident restraint.
 *
 * Two steps:
 *  - essential: First name, last name, email, PIN (4-digit)
 *  - optional: Handicap, GHIN, home course, preferred tees, trip prefs
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

function CreateProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createProfile, isAuthenticated, currentUser, isLoading, error, clearError } =
    useAuthStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<Step>('essential');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [showOptionalExpanded, setShowOptionalExpanded] = useState(false);

  // Redirect if already logged in and completed onboarding
  useEffect(() => {
    if (isAuthenticated && currentUser?.hasCompletedOnboarding) {
      const nextPath = searchParams?.get('next');
      router.push(nextPath || '/');
    }
  }, [isAuthenticated, currentUser, router, searchParams]);

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
      const nextPath = searchParams?.get('next');
      const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
      router.push(`/login${nextParam}`);
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

      const profileData: Omit<
        UserProfile,
        'id' | 'createdAt' | 'updatedAt' | 'isProfileComplete' | 'hasCompletedOnboarding'
      > = {
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
      showToast('success', "Welcome! Let's complete your profile.");
      // Redirect to complete profile page to add optional details
      const nextPath = searchParams?.get('next');
      const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
      router.push(`/profile/complete${nextParam}`);
    } catch (err) {
      logger.error('Failed to create profile', { error: err });
      showToast('error', 'Failed to create profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col">
      {/* ---- HEADER ---- */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--canvas)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div
          className="container-editorial"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3) var(--space-5)',
          }}
        >
          <button
            onClick={handleBack}
            className="press-scale"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              marginLeft: '-8px',
              background: 'none',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              color: 'var(--ink-secondary)',
              transition: 'color 0.15s ease',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'var(--text-lg)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--ink)',
              flex: 1,
            }}
          >
            {step === 'essential' ? 'Create Account' : 'Optional Details'}
          </h1>
        </div>
        {/* Thin bottom rule */}
        <div style={{ height: '1px', background: 'var(--rule)' }} />
      </header>

      {/* ---- MAIN CONTENT ---- */}
      <main
        className="container-editorial"
        style={{
          flex: 1,
          paddingTop: 'var(--space-8)',
          paddingBottom: 'calc(180px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          {/* ============================================
              STEP 1: ESSENTIAL FIELDS
              ============================================ */}
          {step === 'essential' && (
            <div>
              {/* Hero section */}
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
                {/* Overline */}
                <p
                  className="type-overline"
                  style={{
                    color: 'var(--ink-tertiary)',
                    letterSpacing: '0.15em',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  JOIN THE FIELD
                </p>

                {/* Serif italic headline */}
                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(2rem, 8vw, 2.75rem)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    lineHeight: 1.1,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Create Your Account
                </h2>

                {/* Subtitle */}
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--ink-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Three fields to get started — add more later
                </p>
              </div>

              {/* Name fields */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                  marginBottom: 'var(--space-5)',
                }}
              >
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
              <div style={{ marginBottom: 'var(--space-5)' }}>
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
              </div>

              {/* PIN Section — separated by a rule */}
              <div
                style={{
                  borderTop: '1px solid var(--rule)',
                  paddingTop: 'var(--space-6)',
                  marginTop: 'var(--space-2)',
                }}
              >
                {/* Section heading in serif italic */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <Lock
                    className="w-4 h-4"
                    style={{ color: 'var(--ink-tertiary)' }}
                  />
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 400,
                      fontStyle: 'italic',
                      color: 'var(--ink)',
                    }}
                  >
                    Create Your PIN
                  </h3>
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--ink-tertiary)',
                    marginBottom: 'var(--space-5)',
                    lineHeight: 1.5,
                  }}
                >
                  You&apos;ll use this 4-digit PIN to log in
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-4)',
                  }}
                >
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
          )}

          {/* ============================================
              STEP 2: OPTIONAL FIELDS
              ============================================ */}
          {step === 'optional' && (
            <div>
              {/* Hero section */}
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
                <p
                  className="type-overline"
                  style={{
                    color: 'var(--ink-tertiary)',
                    letterSpacing: '0.15em',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  ALMOST THERE
                </p>

                <h2
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    lineHeight: 1.1,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Fine-Tune Your Profile
                </h2>

                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-base)',
                    color: 'var(--ink-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Optional details for a better trip experience
                </p>
              </div>

              {/* Golf Profile — collapsible section */}
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <button
                  type="button"
                  onClick={() => setShowOptionalExpanded(!showOptionalExpanded)}
                  className="press-scale"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-4) var(--space-5)',
                    background: 'var(--canvas-raised)',
                    border: '1px solid var(--rule)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--masters-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Hash className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-base)',
                          fontWeight: 600,
                          color: 'var(--ink)',
                        }}
                      >
                        Golf Profile
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--ink-tertiary)',
                        }}
                      >
                        Handicap, GHIN, home course
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className="w-5 h-5"
                    style={{
                      color: 'var(--ink-tertiary)',
                      transition: 'transform 0.2s ease',
                      transform: showOptionalExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    }}
                  />
                </button>

                {/* Expanded golf fields */}
                {showOptionalExpanded && (
                  <div
                    style={{
                      paddingTop: 'var(--space-5)',
                      paddingLeft: 'var(--space-5)',
                      marginLeft: 'var(--space-5)',
                      borderLeft: '2px solid var(--masters-subtle)',
                    }}
                  >
                    <div style={{ marginBottom: 'var(--space-5)' }}>
                      <InputField
                        label="Handicap Index"
                        value={formData.handicapIndex}
                        onChange={(v) => updateField('handicapIndex', v)}
                        placeholder="12.5"
                        type="number"
                        icon={<Hash className="w-5 h-5" />}
                        hint="For fair match pairing"
                      />
                    </div>

                    <div style={{ marginBottom: 'var(--space-5)' }}>
                      <InputField
                        label="GHIN Number"
                        value={formData.ghin}
                        onChange={(v) => updateField('ghin', v)}
                        placeholder="1234567"
                        hint="Optional — for handicap verification"
                      />
                    </div>

                    <div style={{ marginBottom: 'var(--space-5)' }}>
                      <InputField
                        label="Home Course"
                        value={formData.homeCourse}
                        onChange={(v) => updateField('homeCourse', v)}
                        placeholder="Augusta National"
                        icon={<Home className="w-5 h-5" />}
                      />
                    </div>

                    {/* Preferred Tees */}
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <label
                        style={{
                          display: 'block',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 500,
                          color: 'var(--ink-secondary)',
                          marginBottom: 'var(--space-2)',
                          letterSpacing: '0.02em',
                        }}
                      >
                        Preferred Tees
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 'var(--space-2)',
                        }}
                      >
                        {(['back', 'middle', 'forward'] as const).map((tee) => (
                          <button
                            key={tee}
                            type="button"
                            onClick={() => updateField('preferredTees', tee)}
                            className="press-scale"
                            style={{
                              padding: 'var(--space-3) var(--space-3)',
                              borderRadius: 'var(--radius-md)',
                              border:
                                formData.preferredTees === tee
                                  ? '2px solid var(--masters)'
                                  : '1px solid var(--rule)',
                              background:
                                formData.preferredTees === tee
                                  ? 'var(--masters-subtle)'
                                  : 'var(--canvas-raised)',
                              color:
                                formData.preferredTees === tee
                                  ? 'var(--masters)'
                                  : 'var(--ink-secondary)',
                              fontFamily: 'var(--font-sans)',
                              fontSize: 'var(--text-sm)',
                              fontWeight: formData.preferredTees === tee ? 600 : 500,
                              textTransform: 'capitalize',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {tee}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trip Preferences — teaser card */}
              <div
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  background: 'var(--canvas-raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--gold-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--gold)',
                      }}
                    >
                      +
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-base)',
                        fontWeight: 600,
                        color: 'var(--ink)',
                      }}
                    >
                      Trip Preferences
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-tertiary)',
                      }}
                    >
                      Shirt size, dietary needs, emergency contact
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--canvas-sunken)',
                      color: 'var(--ink-tertiary)',
                    }}
                  >
                    Later
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--ink-faint)',
                    marginTop: 'var(--space-2)',
                    paddingLeft: 'calc(40px + var(--space-3))',
                    lineHeight: 1.4,
                  }}
                >
                  Complete in your profile settings before the trip
                </p>
              </div>
            </div>
          )}

          {/* ---- ERROR DISPLAY ---- */}
          {error && (
            <div
              style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(166, 61, 64, 0.08)',
                border: '1px solid rgba(166, 61, 64, 0.2)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--error)',
                }}
              >
                {error}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ---- FIXED BOTTOM ACTION BAR ---- */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--canvas)',
          borderTop: '1px solid var(--rule)',
          padding: 'var(--space-4) var(--space-5)',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          {step === 'essential' ? (
            <div>
              {/* Primary action: Create Account */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="btn-premium press-scale"
                style={{
                  width: '100%',
                  padding: 'var(--space-4) var(--space-6)',
                  background:
                    isSubmitting || isLoading ? 'var(--rule)' : 'var(--masters)',
                  color: isSubmitting || isLoading ? 'var(--ink-tertiary)' : 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  transition: 'all 0.2s ease',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }}
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Secondary: add optional details */}
              <button
                onClick={handleContinueToOptional}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) 0',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--ink-tertiary)',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                Add optional details first &rarr;
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
              }}
            >
              {/* Back button */}
              <button
                onClick={handleBack}
                className="press-scale"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '52px',
                  flexShrink: 0,
                  padding: 'var(--space-4)',
                  background: 'var(--canvas-raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--ink-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Complete Setup button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isLoading}
                className="btn-premium press-scale"
                style={{
                  flex: 1,
                  padding: 'var(--space-4) var(--space-6)',
                  background:
                    isSubmitting || isLoading ? 'var(--rule)' : 'var(--masters)',
                  color: isSubmitting || isLoading ? 'var(--ink-tertiary)' : 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite',
                      }}
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default function CreateProfilePage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Loading account creation…" variant="form" showBackButton={false} />}>
      <CreateProfilePageContent />
    </Suspense>
  );
}

// ============================================
// InputField — Fried Egg Editorial Style
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
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--ink-secondary)',
          marginBottom: 'var(--space-2)',
          letterSpacing: '0.02em',
        }}
      >
        {label}
        {required && (
          <span style={{ color: 'var(--error)', marginLeft: '2px' }}>*</span>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-tertiary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputMode={inputMode}
          maxLength={maxLength}
          style={{
            width: '100%',
            padding: icon ? '14px 16px 14px 44px' : '14px 16px',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
            background: 'var(--canvas-raised)',
            border: error
              ? '1px solid var(--error)'
              : '1px solid var(--rule)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--masters)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,102,68,0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--rule)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
      {error && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--error)',
            marginTop: 'var(--space-1)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-tertiary)',
            marginTop: 'var(--space-1)',
            lineHeight: 1.4,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
