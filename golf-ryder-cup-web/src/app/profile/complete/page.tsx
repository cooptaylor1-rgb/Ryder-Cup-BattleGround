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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
    <div
      className="page-premium-enter texture-grain"
      style={{
        background: 'var(--canvas)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ---- HEADER ---- */}
      <header
        className="header-premium"
        style={{
          paddingTop: 'calc(var(--space-3) + env(safe-area-inset-top, 0px))',
          paddingBottom: 'var(--space-3)',
          paddingLeft: 'var(--space-5)',
          paddingRight: 'var(--space-5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="press-scale"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ink-secondary)',
            }}
            aria-label="Go back"
          >
            <ArrowLeft style={{ width: 20, height: 20 }} />
          </button>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'var(--text-lg)',
              fontWeight: 400,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            Complete Your Profile
          </h1>

          {/* Skip link */}
          <button
            onClick={handleSkip}
            className="press-scale"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2)',
              transition: 'color 200ms',
            }}
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* ---- MAIN CONTENT ---- */}
      <main
        style={{
          flex: 1,
          paddingBottom: 140,
        }}
      >
        <div className="container-editorial">
          {/* Welcome / Hero Block */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: 'var(--space-10)',
              paddingBottom: 'var(--space-8)',
            }}
          >
            <p
              className="type-overline"
              style={{
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.15em',
                marginBottom: 'var(--space-3)',
              }}
            >
              Complete Your Profile
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                fontWeight: 400,
                color: 'var(--ink)',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Almost There
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                color: 'var(--ink-secondary)',
                marginTop: 'var(--space-3)',
                lineHeight: 1.5,
              }}
            >
              Welcome, {currentUser.firstName}. A few more details help with
              trip&nbsp;planning and fair match&nbsp;pairing.
            </p>
          </div>

          {/* Thin rule divider */}
          <div
            style={{
              height: 1,
              background: 'var(--rule)',
              marginBottom: 'var(--space-6)',
            }}
          />

          {/* ---- ACCORDION SECTIONS ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* ======== GOLF PROFILE ======== */}
            <div
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('golf')}
                className="press-scale"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-5) var(--space-6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--masters-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Hash style={{ width: 18, height: 18, color: 'var(--masters)' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      Golf Profile
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-tertiary)',
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      Handicap, GHIN, home course
                    </p>
                  </div>
                </div>
                <ChevronDown
                  style={{
                    width: 20,
                    height: 20,
                    color: 'var(--ink-tertiary)',
                    transition: 'transform 200ms',
                    transform: expandedSection === 'golf' ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {expandedSection === 'golf' && (
                <div
                  style={{
                    padding: '0 var(--space-6) var(--space-6)',
                    borderTop: '1px solid var(--rule-faint)',
                    paddingTop: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                  }}
                >
                  <InputField
                    label="Handicap Index"
                    value={formData.handicapIndex}
                    onChange={(v) => updateField('handicapIndex', v)}
                    placeholder="12.5"
                    type="number"
                    icon={<Hash style={{ width: 18, height: 18 }} />}
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
                    icon={<Home style={{ width: 18, height: 18 }} />}
                  />

                  {/* Preferred Tees — option chips */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--ink-secondary)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      Preferred Tees
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                      {(['back', 'middle', 'forward'] as const).map((tee) => (
                        <button
                          key={tee}
                          type="button"
                          onClick={() => updateField('preferredTees', tee)}
                          className="press-scale"
                          style={{
                            padding: 'var(--space-3) var(--space-4)',
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
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            transition: 'all 150ms',
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

            {/* ======== PERSONAL DETAILS ======== */}
            <div
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('personal')}
                className="press-scale"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-5) var(--space-6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--gold-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <User style={{ width: 18, height: 18, color: 'var(--gold-dark)' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      Personal Details
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-tertiary)',
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      Nickname, phone number
                    </p>
                  </div>
                </div>
                <ChevronDown
                  style={{
                    width: 20,
                    height: 20,
                    color: 'var(--ink-tertiary)',
                    transition: 'transform 200ms',
                    transform: expandedSection === 'personal' ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {expandedSection === 'personal' && (
                <div
                  style={{
                    padding: '0 var(--space-6) var(--space-6)',
                    borderTop: '1px solid var(--rule-faint)',
                    paddingTop: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                  }}
                >
                  <InputField
                    label="Nickname"
                    value={formData.nickname}
                    onChange={(v) => updateField('nickname', v)}
                    placeholder="Big Hitter"
                    hint="What your buddies call you"
                    icon={<User style={{ width: 18, height: 18 }} />}
                  />
                  <InputField
                    label="Phone Number"
                    value={formData.phoneNumber}
                    onChange={(v) => updateField('phoneNumber', v)}
                    placeholder="(555) 123-4567"
                    type="tel"
                    icon={<Phone style={{ width: 18, height: 18 }} />}
                    hint="For trip coordination"
                  />
                </div>
              )}
            </div>

            {/* ======== TRIP PREFERENCES ======== */}
            <div
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('trip')}
                className="press-scale"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-5) var(--space-6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--maroon-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Shirt style={{ width: 18, height: 18, color: 'var(--maroon)' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      Trip Preferences
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-tertiary)',
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      Shirt size, dietary needs
                    </p>
                  </div>
                </div>
                <ChevronDown
                  style={{
                    width: 20,
                    height: 20,
                    color: 'var(--ink-tertiary)',
                    transition: 'transform 200ms',
                    transform: expandedSection === 'trip' ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {expandedSection === 'trip' && (
                <div
                  style={{
                    padding: '0 var(--space-6) var(--space-6)',
                    borderTop: '1px solid var(--rule-faint)',
                    paddingTop: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                  }}
                >
                  {/* Shirt Size — option chips */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--ink-secondary)',
                        marginBottom: 'var(--space-2)',
                      }}
                    >
                      Shirt Size
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                      {(['S', 'M', 'L', 'XL', '2XL', '3XL'] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => updateField('shirtSize', size)}
                          className="press-scale"
                          style={{
                            padding: 'var(--space-3) var(--space-2)',
                            borderRadius: 'var(--radius-md)',
                            border:
                              formData.shirtSize === size
                                ? '2px solid var(--masters)'
                                : '1px solid var(--rule)',
                            background:
                              formData.shirtSize === size
                                ? 'var(--masters-subtle)'
                                : 'var(--canvas-raised)',
                            color:
                              formData.shirtSize === size
                                ? 'var(--masters)'
                                : 'var(--ink-secondary)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 150ms',
                          }}
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
            <div
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => toggleSection('emergency')}
                className="press-scale"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-5) var(--space-6)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(166, 61, 64, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle style={{ width: 18, height: 18, color: 'var(--error)' }} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: 'var(--text-lg)',
                        color: 'var(--ink)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      Emergency Contact
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--ink-tertiary)',
                        margin: 0,
                        marginTop: 2,
                      }}
                    >
                      In case of emergency
                    </p>
                  </div>
                </div>
                <ChevronDown
                  style={{
                    width: 20,
                    height: 20,
                    color: 'var(--ink-tertiary)',
                    transition: 'transform 200ms',
                    transform: expandedSection === 'emergency' ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                />
              </button>

              {expandedSection === 'emergency' && (
                <div
                  style={{
                    padding: '0 var(--space-6) var(--space-6)',
                    borderTop: '1px solid var(--rule-faint)',
                    paddingTop: 'var(--space-5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-5)',
                  }}
                >
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
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--canvas)',
          borderTop: '1px solid var(--rule)',
          padding: 'var(--space-4) var(--space-5)',
          paddingBottom: 'max(var(--space-4), env(safe-area-inset-bottom))',
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <button
            onClick={handleSaveAndContinue}
            disabled={isSubmitting || isLoading}
            className="btn-premium press-scale"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4) var(--space-6)',
              fontSize: 'var(--text-base)',
              opacity: isSubmitting || isLoading ? 0.6 : 1,
              cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting || isLoading ? (
              <>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: 'var(--radius-full)',
                    animation: 'spin 0.6s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Saving...
              </>
            ) : (
              <>
                Save &amp; Continue
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>

          <button
            onClick={handleSkip}
            className="press-scale"
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 200ms',
            }}
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
      <label
        style={{
          display: 'block',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--ink-secondary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-tertiary)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
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
          style={{
            width: '100%',
            padding: icon
              ? 'var(--space-3) var(--space-4) var(--space-3) calc(var(--space-3) + 30px)'
              : 'var(--space-3) var(--space-4)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
            background: 'var(--canvas-raised)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-md)',
            outline: 'none',
            transition: 'border-color 200ms, box-shadow 200ms',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--masters)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 102, 68, 0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--rule)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>
      {hint && (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-tertiary)',
            margin: 0,
            marginTop: 'var(--space-1)',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
