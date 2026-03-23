'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { useAuthStore, useTripStore, useUIStore, type UserProfile } from '@/lib/stores';
import { claimTripPlayerForCurrentUser } from '@/lib/services/tripPlayerLinkService';
import { createLogger } from '@/lib/utils/logger';
import { assessTripPlayerLink, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { EmptyStatePremium, Skeleton } from '@/components/ui';
import {
  User,
  Mail,
  Phone,
  Hash,
  Home,
  Lock,
  AlertCircle,
  Edit2,
  LogOut,
  X,
  Save,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';

/**
 * PROFILE PAGE
 *
 * View and edit user profile.
 * Accessible from settings or user menu.
 */

const logger = createLogger('profile');

function readOfflinePinStatus(userId?: string): boolean {
  if (typeof window === 'undefined' || !userId) {
    return false;
  }

  const storedUsers = localStorage.getItem('golf-app-users');
  const parsedUsers = storedUsers
    ? (JSON.parse(storedUsers) as Record<string, { pin?: string | null }>)
    : {};
  return Boolean(parsedUsers[userId]?.pin?.trim());
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    currentUser,
    isAuthenticated,
    updateProfile,
    logout,
    isLoading,
    authEmail,
    authUserId,
    setOfflinePin,
  } = useAuthStore();
  const { currentTrip, players, loadTrip } = useTripStore();
  const { showToast, isCaptainMode } = useUIStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasOfflinePin, setHasOfflinePin] = useState(false);
  const [showOfflinePinForm, setShowOfflinePinForm] = useState(false);
  const [offlinePin, setOfflinePinValue] = useState('');
  const [confirmOfflinePin, setConfirmOfflinePin] = useState('');
  const [isSavingOfflinePin, setIsSavingOfflinePin] = useState(false);
  const [isClaimingTripPlayer, setIsClaimingTripPlayer] = useState(false);

  const currentIdentity = useMemo(
    () => withTripPlayerIdentity(currentUser, authUserId),
    [authUserId, currentUser]
  );
  const tripPlayerLink = useMemo(
    () => assessTripPlayerLink(players, currentIdentity, isAuthenticated),
    [currentIdentity, isAuthenticated, players]
  );
  const linkedTripPlayer = tripPlayerLink.player;

  // Initialize form when user data is available.
  // We avoid auto-redirects so users never hit a confusing blank/skeleton screen.
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setFormData(currentUser);
      try {
        setHasOfflinePin(readOfflinePinStatus(currentUser.id));
      } catch (error) {
        logger.warn('Failed to read offline PIN status', { error });
        setHasOfflinePin(false);
      }
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

  const handleSaveOfflinePin = async () => {
    if (!currentUser) {
      return;
    }

    if (!/^\d{4}$/.test(offlinePin)) {
      showToast('error', 'Offline PIN must be exactly 4 digits');
      return;
    }

    if (offlinePin !== confirmOfflinePin) {
      showToast('error', 'Offline PINs do not match');
      return;
    }

    setIsSavingOfflinePin(true);
    try {
      await setOfflinePin(offlinePin);
      setHasOfflinePin(true);
      setShowOfflinePinForm(false);
      setOfflinePinValue('');
      setConfirmOfflinePin('');
      showToast('success', hasOfflinePin ? 'Offline PIN updated' : 'Offline PIN saved');
    } catch (error) {
      logger.error('Failed to save offline PIN', { error });
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save offline PIN'
      );
    } finally {
      setIsSavingOfflinePin(false);
    }
  };

  const handleClaimTripPlayer = async (playerId: string, allowEmailMismatch = false) => {
    if (!currentTrip || !currentIdentity) {
      return;
    }

    setIsClaimingTripPlayer(true);
    try {
      const result = await claimTripPlayerForCurrentUser(
        currentTrip.id,
        playerId,
        players,
        currentIdentity,
        isAuthenticated,
        { allowEmailMismatch }
      );

      if (result.status === 'claimed-explicit' || result.status === 'linked-id') {
        await loadTrip(currentTrip.id);
        showToast('success', 'Trip roster entry linked');
        return;
      }

      if (result.status === 'link-conflict') {
        showToast('error', 'That roster entry is already tied to a different profile');
        return;
      }

      showToast('error', 'Unable to link this trip player');
    } catch (error) {
      logger.error('Failed to claim trip player', { error, tripId: currentTrip.id, playerId });
      showToast('error', 'Failed to link trip player');
    } finally {
      setIsClaimingTripPlayer(false);
    }
  };

  if (!isAuthenticated && !isLoading) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-canvas">
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
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-canvas">
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
      </div>
    );
  }

  const displayName = currentUser.nickname || currentUser.firstName;
  const initials = `${currentUser.firstName?.[0] || '?'}${currentUser.lastName?.[0] || '?'}`;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas">
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

          {currentTrip ? (
            <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
              <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
                Current Trip
              </span>
              <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-3)] leading-[1.2]">
                Roster Link
              </h3>
              <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mb-[var(--space-5)] leading-[1.6]">
                {linkedTripPlayer
                  ? `Your profile is linked to ${linkedTripPlayer.firstName} ${linkedTripPlayer.lastName} in ${currentTrip.name}.`
                  : `Connect your profile to the correct roster entry in ${currentTrip.name} so matches, schedule, and scoring resolve correctly.`}
              </p>

              {linkedTripPlayer ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--masters)]/25 bg-[var(--masters-subtle)] px-[var(--space-4)] py-[var(--space-4)]">
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--masters)] m-0">
                    Linked player
                  </p>
                  <p className="font-sans text-[length:var(--text-base)] text-ink m-0 mt-[var(--space-1)]">
                    {linkedTripPlayer.firstName} {linkedTripPlayer.lastName}
                    {linkedTripPlayer.team ? ` • ${linkedTripPlayer.team.toUpperCase()}` : ''}
                  </p>
                  <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-2)] leading-[1.5]">
                    This is the roster row the app will use for your matches, stats, and scoring.
                  </p>
                </div>
              ) : null}

              {!linkedTripPlayer && tripPlayerLink.status === 'claimable-name-match' ? (
                <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)]">
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
                    One likely roster match found
                  </p>
                  <p className="font-sans text-[length:var(--text-base)] text-ink m-0 mt-[var(--space-1)]">
                    {tripPlayerLink.candidates[0]?.firstName} {tripPlayerLink.candidates[0]?.lastName}
                  </p>
                  <button
                    type="button"
                    disabled={isClaimingTripPlayer}
                    onClick={() => {
                      const candidateId = tripPlayerLink.candidates[0]?.id;
                      if (candidateId) {
                        void handleClaimTripPlayer(candidateId);
                      }
                    }}
                    className="press-scale mt-[var(--space-4)] rounded-[var(--radius-full)] bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-2)] font-sans text-[length:var(--text-sm)] font-semibold text-[var(--canvas)] border-none"
                  >
                    {isClaimingTripPlayer ? 'Linking…' : 'Link This Roster Entry'}
                  </button>
                </div>
              ) : null}

              {!linkedTripPlayer &&
              (tripPlayerLink.status === 'ambiguous-email-match' ||
                tripPlayerLink.status === 'ambiguous-name-match') ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-[var(--space-4)] py-[var(--space-4)]">
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--warning)] m-0">
                    Multiple roster candidates found
                  </p>
                  <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mt-[var(--space-2)] leading-[1.6]">
                    {isCaptainMode
                      ? 'Choose the correct roster entry below to finish the link deliberately.'
                      : 'Captain mode is required to choose between multiple roster entries.'}
                  </p>
                  <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
                    {tripPlayerLink.candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-3)]"
                      >
                        <div>
                          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
                            {candidate.firstName} {candidate.lastName}
                          </p>
                          <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)]">
                            {candidate.email || 'No email on roster'}
                          </p>
                        </div>
                        {isCaptainMode ? (
                          <button
                            type="button"
                            disabled={isClaimingTripPlayer}
                            onClick={() => void handleClaimTripPlayer(candidate.id, true)}
                            className="press-scale rounded-[var(--radius-full)] border border-rule bg-canvas-raised px-[var(--space-3)] py-[var(--space-2)] font-sans text-[length:var(--text-xs)] font-semibold text-ink"
                          >
                            Link
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!linkedTripPlayer &&
              (tripPlayerLink.status === 'unresolved' || tripPlayerLink.status === 'missing-user') ? (
                <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)]">
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
                    No roster match found yet
                  </p>
                  <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mt-[var(--space-2)] leading-[1.6]">
                    Ask the captain to add you on the Players screen, or open captain mode and assign your roster entry there.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

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
                disabled={Boolean(authEmail)}
                hint={authEmail ? 'Managed by your signed-in account' : undefined}
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

          <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
            <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
              Access
            </span>
            <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-3)] leading-[1.2]">
              Offline Sign-In
            </h3>
            <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mb-[var(--space-4)] leading-[1.6]">
              Email sign-in stays your primary account access. Add a 4-digit PIN only if you want
              this device to keep working offline.
            </p>
            <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)] mb-[var(--space-4)]">
              <div className="flex items-start justify-between gap-[var(--space-3)]">
                <div>
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
                    {hasOfflinePin ? 'Offline PIN saved on this device' : 'Offline PIN not set'}
                  </p>
                  <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)] leading-[1.5]">
                    {hasOfflinePin
                      ? 'You can use your device PIN from the sign-in screen when email or network access is unavailable.'
                      : 'Without a PIN, this device will rely on your secure email sign-in link.'}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setShowOfflinePinForm((prev) => !prev)}
                    className="press-scale rounded-[var(--radius-full)] border border-rule bg-canvas-raised px-[var(--space-3)] py-[var(--space-2)] font-sans text-[length:var(--text-xs)] font-semibold text-ink-secondary"
                  >
                    {showOfflinePinForm ? 'Cancel' : hasOfflinePin ? 'Update PIN' : 'Add PIN'}
                  </button>
                )}
              </div>
            </div>

            {showOfflinePinForm && !isEditing && (
              <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
                    <Lock className="w-4 h-4 text-ink-faint" />
                    New PIN
                  </label>
                  <input
                    type="password"
                    value={offlinePin}
                    onChange={(e) => setOfflinePinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    maxLength={4}
                    className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-mono text-[length:var(--text-base)] tracking-[0.3em] text-center text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)]"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
                    <Lock className="w-4 h-4 text-ink-faint" />
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    value={confirmOfflinePin}
                    onChange={(e) =>
                      setConfirmOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    inputMode="numeric"
                    maxLength={4}
                    className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-mono text-[length:var(--text-base)] tracking-[0.3em] text-center text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)]"
                    placeholder="••••"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveOfflinePin}
                    disabled={isSavingOfflinePin}
                    className="btn-premium press-scale"
                    style={{
                      opacity: isSavingOfflinePin ? 0.6 : 1,
                      cursor: isSavingOfflinePin ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSavingOfflinePin ? 'Saving PIN...' : hasOfflinePin ? 'Update Offline PIN' : 'Save Offline PIN'}
                  </button>
                </div>
              </div>
            )}
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
  disabled?: boolean;
  hint?: string;
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
  disabled = false,
  hint,
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
          disabled={disabled}
          readOnly={disabled}
          className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-sans text-[length:var(--text-base)] text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-ink-secondary"
        />
      ) : (
        <p className="font-sans text-[length:var(--text-base)] text-ink m-0 leading-[1.5]">
          {value || '\u2014'}
        </p>
      )}
      {hint && (
        <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)] leading-[1.4]">
          {hint}
        </p>
      )}
    </div>
  );
}
