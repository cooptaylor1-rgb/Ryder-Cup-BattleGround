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
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
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
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
        <PageHeader
          title="Profile"
          subtitle={isAuthenticated ? 'Loading your profile\u2026' : undefined}
          icon={<User size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.push('/more')}
        />
        <main className="container-editorial pt-[var(--space-6)]">
          <div className="max-w-[28rem] mx-auto">
            {/* Profile Hero Skeleton */}
            <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden mb-[var(--space-6)]">
              <div className="bg-gradient-to-b from-canvas to-canvas-sunken py-[var(--space-8)] px-[var(--space-6)] flex flex-col items-center">
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
                className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]"
              >
                <Skeleton className="h-3 w-16 rounded-sm mb-2" />
                <Skeleton className="h-5 w-32 rounded mb-6" />
                <div className="flex flex-col gap-[var(--space-5)]">
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
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
      <PageHeader
        title="Profile"
        subtitle={isEditing ? 'Editing' : undefined}
        icon={<User size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="press-scale p-[var(--space-2)] mr-[-0.5rem] text-ink-secondary bg-transparent border-none cursor-pointer rounded-[var(--radius-md)]"
              aria-label="Edit profile"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="press-scale p-[var(--space-2)] mr-[-0.5rem] text-ink-secondary bg-transparent border-none cursor-pointer rounded-[var(--radius-md)]"
              aria-label="Cancel editing"
            >
              <X className="w-5 h-5" />
            </button>
          )
        }
      />

      <main className="container-editorial pt-[var(--space-6)]">
        <div className="max-w-[28rem] mx-auto">
          {/* ============================
              PROFILE HERO CARD
              ============================ */}
          <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden mb-[var(--space-6)]">
            <div className="bg-gradient-to-b from-canvas to-canvas-sunken pt-[var(--space-10)] px-[var(--space-6)] pb-[var(--space-8)] flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-[5.5rem] h-[5.5rem] rounded-[var(--radius-full)] bg-canvas-raised border-2 border-rule flex items-center justify-center mb-[var(--space-4)] shadow-card overflow-hidden">
                {currentUser.avatarUrl ? (
                  <NextImage
                    src={currentUser.avatarUrl}
                    alt={displayName}
                    width={88}
                    height={88}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="font-serif text-[clamp(1.75rem,5vw,2.25rem)] italic text-masters leading-none tracking-[-0.02em]">
                    {initials}
                  </span>
                )}
              </div>

              {/* Name */}
              <h2 className="font-serif text-[clamp(1.5rem,5vw,1.75rem)] italic font-normal text-ink leading-[1.2] tracking-[-0.01em] m-0">
                {currentUser.firstName} {currentUser.lastName}
              </h2>

              {/* Nickname */}
              {currentUser.nickname && (
                <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 pt-[var(--space-1)]">
                  &ldquo;{currentUser.nickname}&rdquo;
                </p>
              )}

              {/* Handicap Badge */}
              <div className="mt-[var(--space-5)] flex flex-col items-center gap-[var(--space-1)]">
                <span className="type-overline text-ink-tertiary tracking-[0.15em]">
                  Handicap
                </span>
                <span className="font-serif text-[clamp(2rem,6vw,2.5rem)] font-normal text-masters leading-none tracking-[-0.02em]">
                  {currentUser.handicapIndex?.toFixed(1) || '\u2014'}
                </span>
              </div>
            </div>
          </div>

          {/* ============================
              BASIC INFO SECTION
              ============================ */}
          <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
            <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
              Personal
            </span>
            <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-6)] leading-[1.2]">
              Basic Info
            </h3>

            <div className="flex flex-col gap-[var(--space-5)]">
              <ProfileField
                icon={<User className="w-4 h-4" />}
                label="First Name"
                value={formData.firstName || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, firstName: v }))}
              />
              <ProfileField
                icon={<User className="w-4 h-4" />}
                label="Last Name"
                value={formData.lastName || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, lastName: v }))}
              />
              <ProfileField
                icon={<User className="w-4 h-4" />}
                label="Nickname"
                value={formData.nickname || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, nickname: v }))}
              />
              <ProfileField
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={formData.email || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, email: v }))}
                type="email"
              />
              <ProfileField
                icon={<Phone className="w-4 h-4" />}
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
          <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
            <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
              On the Course
            </span>
            <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-6)] leading-[1.2]">
              Golf Profile
            </h3>

            <div className="flex flex-col gap-[var(--space-5)]">
              <ProfileField
                icon={<Hash className="w-4 h-4" />}
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
                icon={<Hash className="w-4 h-4" />}
                label="GHIN Number"
                value={formData.ghin || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, ghin: v }))}
              />
              <ProfileField
                icon={<Home className="w-4 h-4" />}
                label="Home Course"
                value={formData.homeCourse || ''}
                isEditing={isEditing}
                onChange={(v) => setFormData((prev) => ({ ...prev, homeCourse: v }))}
              />

              {/* Preferred Tees */}
              <div>
                <label className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)] text-[length:var(--text-xs)]">
                  Preferred Tees
                </label>
                {isEditing ? (
                  <div className="flex gap-[var(--space-2)]">
                    {(['back', 'middle', 'forward'] as const).map((tee) => (
                      <button
                        key={tee}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, preferredTees: tee }))}
                        className="press-scale flex-1 py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] font-sans text-[length:var(--text-sm)] font-semibold capitalize cursor-pointer transition-all duration-fast"
                        style={{
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
                        }}
                      >
                        {tee}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-[length:var(--text-base)] text-ink m-0 capitalize">
                    {formData.preferredTees || '\u2014'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* ============================
              TRIP DETAILS SECTION
              ============================ */}
          <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
            <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
              Logistics
            </span>
            <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-6)] leading-[1.2]">
              Trip Details
            </h3>

            <div className="flex flex-col gap-[var(--space-5)]">
              {/* Shirt Size */}
              <div>
                <label className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)] text-[length:var(--text-xs)]">
                  Shirt Size
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-6 gap-[var(--space-1)]">
                    {(['XS', 'S', 'M', 'L', 'XL', '2XL'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, shirtSize: size }))}
                        className="press-scale py-[var(--space-2)] px-0 rounded-[var(--radius-md)] font-sans text-[length:var(--text-xs)] font-semibold cursor-pointer transition-all duration-fast"
                        style={{
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
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="font-sans text-[length:var(--text-base)] text-ink m-0">
                    {formData.shirtSize || '\u2014'}
                  </p>
                )}
              </div>

              <ProfileField
                icon={<AlertCircle className="w-4 h-4" />}
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
          <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
            <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
              Safety
            </span>
            <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-6)] leading-[1.2]">
              Emergency Contact
            </h3>

            <div className="flex flex-col gap-[var(--space-5)]">
              <ProfileField
                icon={<User className="w-4 h-4" />}
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
                icon={<Phone className="w-4 h-4" />}
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
                icon={<User className="w-4 h-4" />}
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
              className="press-scale w-full p-[var(--space-4)] rounded-[var(--radius-lg)] border border-maroon bg-transparent text-maroon font-sans text-[length:var(--text-base)] font-semibold cursor-pointer flex items-center justify-center gap-[var(--space-2)] mb-[var(--space-6)] transition-[background] duration-fast hover:bg-[var(--maroon-subtle)]"
            >
              <LogOut className="w-5 h-5" />
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
        <div className="fixed inset-x-0 z-40 bg-canvas border-t border-rule p-[var(--space-4)] bottom-[calc(env(safe-area-inset-bottom,_0px)_+_80px)]">
          <div className="max-w-[28rem] mx-auto flex gap-[var(--space-3)]">
            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              className="press-scale shrink-0 py-[var(--space-3)] px-[var(--space-5)] rounded-[var(--radius-full)] border border-rule bg-canvas-raised text-ink-secondary font-sans text-[length:var(--text-sm)] font-semibold cursor-pointer min-h-touch transition-all duration-fast"
            >
              Cancel
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="btn-premium press-scale flex-1"
              style={{
                opacity: isSaving || isLoading ? 0.6 : 1,
                cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-[var(--space-2)]">
                  <span className="w-4 h-4 border-2 border-[color:var(--canvas)]/30 border-t-[color:var(--canvas)] rounded-[var(--radius-full)] animate-[spin_0.6s_linear_infinite]" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-[var(--space-2)]">
                  <Save className="w-4 h-4" />
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
      <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
        <span className="text-ink-faint">{icon}</span>
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
          className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-sans text-[length:var(--text-base)] text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)]"
        />
      ) : (
        <p className="font-sans text-[length:var(--text-base)] text-ink m-0 leading-[1.5]">
          {value || '\u2014'}
        </p>
      )}
    </div>
  );
}
