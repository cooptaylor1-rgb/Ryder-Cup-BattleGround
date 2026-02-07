'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { useAuthStore, useUIStore, type UserProfile } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { EmptyStatePremium, Skeleton } from '@/components/ui';
import {
  User,
  Mail,
  Phone,
  Hash,
  Home,
  AlertCircle,
  Edit2,
  LogOut,
  X,
  Save,
} from 'lucide-react';
import { BottomNav, PageHeader } from '@/components/layout';

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

  // Initialize form when user data is available.
  // We avoid auto-redirects so users never hit a confusing blank/skeleton screen.
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setFormData(currentUser);
    }
  }, [isAuthenticated, currentUser]);

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

  if (!isAuthenticated && !isLoading) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="Sign in to view your profile"
            description="Your profile is tied to your account. Sign in to view and edit your details."
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

  if (!currentUser) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <PageHeader
          title="Profile"
          subtitle={isAuthenticated ? 'Loading your profile\u2026' : undefined}
          icon={<User size={16} style={{ color: 'var(--color-accent)' }} />}
          onBack={() => router.push('/more')}
        />
        <main className="container-editorial" style={{ paddingTop: 'var(--space-6)' }}>
          <div style={{ maxWidth: '28rem', marginLeft: 'auto', marginRight: 'auto' }}>
            {/* Profile Hero Skeleton */}
            <div
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginBottom: 'var(--space-6)',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(to bottom, var(--canvas), var(--canvas-sunken))',
                  padding: 'var(--space-8) var(--space-6)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Skeleton className="w-[5.5rem] h-[5.5rem] rounded-full mb-4" />
                <Skeleton className="h-6 w-40 rounded mb-2" />
                <Skeleton className="h-4 w-24 rounded mb-4" />
                <Skeleton className="h-10 w-20 rounded" />
              </div>
            </div>

            {/* Section Skeletons */}
            {[1, 2].map((i) => (
              <div
                key={i}
                style={{
                  background: 'var(--canvas-raised)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-6)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <Skeleton className="h-3 w-16 rounded-sm mb-2" />
                <Skeleton className="h-5 w-32 rounded mb-6" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <Skeleton className="h-2.5 w-20 rounded-sm mb-2" />
                      <Skeleton className="h-4 w-full rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const displayName = currentUser.nickname || currentUser.firstName;
  const initials = `${currentUser.firstName?.[0] || '?'}${currentUser.lastName?.[0] || '?'}`;

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <PageHeader
        title="Profile"
        subtitle={isEditing ? 'Editing' : undefined}
        icon={<User size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
        rightSlot={
          !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="press-scale"
              style={{
                padding: 'var(--space-2)',
                marginRight: '-0.5rem',
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              aria-label="Edit profile"
            >
              <Edit2 style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="press-scale"
              style={{
                padding: 'var(--space-2)',
                marginRight: '-0.5rem',
                color: 'var(--ink-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
              }}
              aria-label="Cancel editing"
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          )
        }
      />

      <main className="container-editorial" style={{ paddingTop: 'var(--space-6)' }}>
        <div style={{ maxWidth: '28rem', marginLeft: 'auto', marginRight: 'auto' }}>
          {/* ============================
              PROFILE HERO CARD
              ============================ */}
          <div
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(to bottom, var(--canvas), var(--canvas-sunken))',
                padding: 'var(--space-10) var(--space-6) var(--space-8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '5.5rem',
                  height: '5.5rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--canvas-raised)',
                  border: '2px solid var(--rule)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                }}
              >
                {currentUser.avatarUrl ? (
                  <NextImage
                    src={currentUser.avatarUrl}
                    alt={displayName}
                    width={88}
                    height={88}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
                      fontStyle: 'italic',
                      color: 'var(--masters)',
                      lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {initials}
                  </span>
                )}
              </div>

              {/* Name */}
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.5rem, 5vw, 1.75rem)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                {currentUser.firstName} {currentUser.lastName}
              </h2>

              {/* Nickname */}
              {currentUser.nickname && (
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--ink-tertiary)',
                    marginTop: 'var(--space-1)',
                    margin: 0,
                    paddingTop: 'var(--space-1)',
                  }}
                >
                  &ldquo;{currentUser.nickname}&rdquo;
                </p>
              )}

              {/* Handicap Badge */}
              <div
                style={{
                  marginTop: 'var(--space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--space-1)',
                }}
              >
                <span
                  className="type-overline"
                  style={{
                    color: 'var(--ink-tertiary)',
                    letterSpacing: '0.15em',
                  }}
                >
                  Handicap
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(2rem, 6vw, 2.5rem)',
                    fontWeight: 400,
                    color: 'var(--masters)',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {currentUser.handicapIndex?.toFixed(1) || '\u2014'}
                </span>
              </div>
            </div>
          </div>

          {/* ============================
              BASIC INFO SECTION
              ============================ */}
          <section
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span
              className="type-overline"
              style={{
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.15em',
                display: 'block',
                marginBottom: 'var(--space-2)',
              }}
            >
              Personal
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
                marginBottom: 'var(--space-6)',
                lineHeight: 1.2,
              }}
            >
              Basic Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <ProfileField
                icon={<User style={{ width: '1rem', height: '1rem' }} />}
                label="First Name"
                value={formData.firstName || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, firstName: v }))}
              />
              <ProfileField
                icon={<User style={{ width: '1rem', height: '1rem' }} />}
                label="Last Name"
                value={formData.lastName || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, lastName: v }))}
              />
              <ProfileField
                icon={<User style={{ width: '1rem', height: '1rem' }} />}
                label="Nickname"
                value={formData.nickname || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, nickname: v }))}
              />
              <ProfileField
                icon={<Mail style={{ width: '1rem', height: '1rem' }} />}
                label="Email"
                value={formData.email || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, email: v }))}
                type="email"
              />
              <ProfileField
                icon={<Phone style={{ width: '1rem', height: '1rem' }} />}
                label="Phone"
                value={formData.phoneNumber || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, phoneNumber: v }))}
                type="tel"
              />
            </div>
          </section>

          {/* ============================
              GOLF PROFILE SECTION
              ============================ */}
          <section
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span
              className="type-overline"
              style={{
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.15em',
                display: 'block',
                marginBottom: 'var(--space-2)',
              }}
            >
              On the Course
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
                marginBottom: 'var(--space-6)',
                lineHeight: 1.2,
              }}
            >
              Golf Profile
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <ProfileField
                icon={<Hash style={{ width: '1rem', height: '1rem' }} />}
                label="Handicap Index"
                value={String(formData.handicapIndex || '')}
                isEditing={isEditing}
                onChange={(v) =>
                  setFormData((prev) => ({ ...prev, handicapIndex: parseFloat(v) || undefined }))
                }
                type="number"
                min={-10}
                max={54}
                step={0.1}
              />
              <ProfileField
                icon={<Hash style={{ width: '1rem', height: '1rem' }} />}
                label="GHIN Number"
                value={formData.ghin || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, ghin: v }))}
              />
              <ProfileField
                icon={<Home style={{ width: '1rem', height: '1rem' }} />}
                label="Home Course"
                value={formData.homeCourse || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, homeCourse: v }))}
              />

              {/* Preferred Tees */}
              <div>
                <label
                  className="type-overline"
                  style={{
                    color: 'var(--ink-tertiary)',
                    letterSpacing: '0.15em',
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  Preferred Tees
                </label>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {(['back', 'middle', 'forward'] as const).map((tee) => (
                      <button
                        key={tee}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, preferredTees: tee }))}
                        className="press-scale"
                        style={{
                          flex: 1,
                          padding: 'var(--space-2) var(--space-3)',
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
                          transition: 'all 150ms ease',
                        }}
                      >
                        {tee}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-base)',
                      color: 'var(--ink)',
                      margin: 0,
                      textTransform: 'capitalize',
                    }}
                  >
                    {formData.preferredTees || '\u2014'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ============================
              TRIP DETAILS SECTION
              ============================ */}
          <section
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span
              className="type-overline"
              style={{
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.15em',
                display: 'block',
                marginBottom: 'var(--space-2)',
              }}
            >
              Logistics
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
                marginBottom: 'var(--space-6)',
                lineHeight: 1.2,
              }}
            >
              Trip Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Shirt Size */}
              <div>
                <label
                  className="type-overline"
                  style={{
                    color: 'var(--ink-tertiary)',
                    letterSpacing: '0.15em',
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  Shirt Size
                </label>
                {isEditing ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(6, 1fr)',
                      gap: 'var(--space-1)',
                    }}
                  >
                    {(['XS', 'S', 'M', 'L', 'XL', '2XL'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, shirtSize: size }))}
                        className="press-scale"
                        style={{
                          padding: 'var(--space-2) 0',
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
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-base)',
                      color: 'var(--ink)',
                      margin: 0,
                    }}
                  >
                    {formData.shirtSize || '\u2014'}
                  </p>
                )}
              </div>

              <ProfileField
                icon={<AlertCircle style={{ width: '1rem', height: '1rem' }} />}
                label="Dietary Restrictions"
                value={formData.dietaryRestrictions || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, dietaryRestrictions: v }))}
              />
            </div>
          </section>

          {/* ============================
              EMERGENCY CONTACT SECTION
              ============================ */}
          <section
            style={{
              background: 'var(--canvas-raised)',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <span
              className="type-overline"
              style={{
                color: 'var(--ink-tertiary)',
                letterSpacing: '0.15em',
                display: 'block',
                marginBottom: 'var(--space-2)',
              }}
            >
              Safety
            </span>
            <h3
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'var(--text-xl)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--ink)',
                margin: 0,
                marginBottom: 'var(--space-6)',
                lineHeight: 1.2,
              }}
            >
              Emergency Contact
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <ProfileField
                icon={<User style={{ width: '1rem', height: '1rem' }} />}
                label="Contact Name"
                value={formData.emergencyContact?.name || ''}
                isEditing={isEditing}
                onChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContact: {
                      ...prev.emergencyContact,
                      name: v,
                      phone: prev.emergencyContact?.phone || '',
                      relationship: prev.emergencyContact?.relationship || '',
                    },
                  }))
                }
              />
              <ProfileField
                icon={<Phone style={{ width: '1rem', height: '1rem' }} />}
                label="Contact Phone"
                value={formData.emergencyContact?.phone || ''}
                isEditing={isEditing}
                onChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContact: {
                      ...prev.emergencyContact,
                      phone: v,
                      name: prev.emergencyContact?.name || '',
                      relationship: prev.emergencyContact?.relationship || '',
                    },
                  }))
                }
                type="tel"
              />
              <ProfileField
                icon={<User style={{ width: '1rem', height: '1rem' }} />}
                label="Relationship"
                value={formData.emergencyContact?.relationship || ''}
                isEditing={isEditing}
                onChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContact: {
                      ...prev.emergencyContact,
                      relationship: v,
                      name: prev.emergencyContact?.name || '',
                      phone: prev.emergencyContact?.phone || '',
                    },
                  }))
                }
              />
            </div>
          </section>

          {/* ============================
              SIGN OUT BUTTON
              ============================ */}
          {!isEditing && (
            <button
              onClick={handleLogout}
              className="press-scale"
              style={{
                width: '100%',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--maroon)',
                background: 'transparent',
                color: 'var(--maroon)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-6)',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--maroon-subtle)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <LogOut style={{ width: '1.25rem', height: '1.25rem' }} />
              Sign Out
            </button>
          )}
        </div>
      </main>

      {/* ============================
          SAVE BAR (when editing)
          Keep BottomNav visible; lift save bar above nav height (80px).
          ============================ */}
      {isEditing && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            zIndex: 40,
            background: 'var(--canvas)',
            borderTop: '1px solid var(--rule)',
            padding: 'var(--space-4)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            paddingBottom: 'var(--space-4)',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              gap: 'var(--space-3)',
            }}
          >
            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              className="press-scale"
              style={{
                flexShrink: 0,
                padding: 'var(--space-3) var(--space-5)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--rule)',
                background: 'var(--canvas-raised)',
                color: 'var(--ink-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 150ms ease',
              }}
            >
              Cancel
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="btn-premium press-scale"
              style={{
                flex: 1,
                opacity: isSaving || isLoading ? 0.6 : 1,
                cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: 'var(--radius-full)',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Saving...
                </span>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                  }}
                >
                  <Save style={{ width: '1rem', height: '1rem' }} />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
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
    <div>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--ink-tertiary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <span style={{ color: 'var(--ink-faint)' }}>{icon}</span>
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
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--rule)',
            background: 'var(--canvas-raised)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
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
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            color: 'var(--ink)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {value || '\u2014'}
        </p>
      )}
    </div>
  );
}
