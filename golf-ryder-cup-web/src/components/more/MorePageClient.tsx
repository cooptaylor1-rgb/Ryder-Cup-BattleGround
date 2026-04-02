'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  BarChart3,
  Bell,
  CalendarDays,
  Coins,
  Database,
  DollarSign,
  HardDrive,
  Heart,
  HelpCircle,
  Lock,
  LogIn,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Shield,
  Trash2,
  Trophy,
  Unlock,
  User,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import {
  AccessPanel,
  formatTripRange,
  type MenuSection,
  MenuTile,
  MoreFactCard,
  ProfilePanel,
  TripPanel,
} from '@/components/more/MorePageSections';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { clearDemoData, seedDemoData } from '@/lib/db/seed';
import { useAuthStore, useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('more');

export default function MorePageClient() {
  const router = useRouter();
  const { currentTrip, loadTrip, clearTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, loadTrip: s.loadTrip, clearTrip: s.clearTrip })));
  const { currentUser, isAuthenticated } = useAuthStore();
  const {
    isCaptainMode,
    enableCaptainMode,
    disableCaptainMode,
    isAdminMode,
    enableAdminMode,
    disableAdminMode,
  } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode, enableCaptainMode: s.enableCaptainMode, disableCaptainMode: s.disableCaptainMode, isAdminMode: s.isAdminMode, enableAdminMode: s.enableAdminMode, disableAdminMode: s.disableAdminMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [showCaptainModal, setShowCaptainModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [captainPin, setCaptainPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExitTripConfirm, setShowExitTripConfirm] = useState(false);

  const handleEnableCaptainMode = async () => {
    if (captainPin.length < 4) {
      return;
    }

    try {
      await enableCaptainMode(captainPin);
      setShowCaptainModal(false);
      setCaptainPin('');
      showToast('success', 'Captain mode enabled');
    } catch {
      showToast('error', 'Incorrect captain PIN');
    }
  };

  const handleEnableAdminMode = async () => {
    if (adminPin.length < 4) {
      return;
    }

    try {
      await enableAdminMode(adminPin);
      setShowAdminModal(false);
      setAdminPin('');
      showToast('success', 'Admin mode enabled');
    } catch {
      showToast('error', 'Incorrect admin PIN');
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const tripId = await seedDemoData();
      await loadTrip(tripId);
      showToast('success', 'Demo data loaded');
    } catch (error) {
      logger.error('Failed to seed data', { error });
      showToast('error', 'Could not load demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    try {
      await clearDemoData();
      clearTrip();
      localStorage.removeItem('golf-trip-storage');
      window.location.href = '/';
    } catch (error) {
      logger.error('Failed to clear data', { error });
      showToast('error', 'Could not clear data');
    }
  };

  const handleExitTrip = () => {
    clearTrip();
    setShowExitTripConfirm(false);
    // Persist exit intent so TripRehydrationProvider won't auto-load after reload
    localStorage.removeItem('golf-trip-storage');
    sessionStorage.setItem('trip-exit-intent', '1');
    window.location.href = '/';
  };

  const primarySections: MenuSection[] = [
    {
      id: 'trip-tools',
      eyebrow: 'Trip Tools',
      title: 'Trip tools',
      description: 'Schedule, money, courses, and the trip details.',
      items: [
        ...(isCaptainMode
          ? [
              {
                id: 'captain',
                label: 'Captain command',
                description: 'Lineups, logistics, pairings, and captain controls.',
                icon: Shield,
                href: '/captain',
                badge: 'Active',
                tone: 'maroon' as const,
              },
            ]
          : []),
        {
          id: 'schedule',
          label: 'Schedule',
          description: 'Sessions, tee times, and the plan for the week.',
          icon: CalendarDays,
          href: '/schedule',
        },
        {
          id: 'finances',
          label: 'Finances',
          description: 'Charges, balances, and who still owes what.',
          icon: DollarSign,
          href: '/finances',
          tone: 'green',
        },
        {
          id: 'courses',
          label: 'Courses',
          description: 'Course details, setup, and where the matches are being played.',
          icon: MapPin,
          href: '/courses',
        },
      ],
    },
    {
      id: 'trip-story',
      eyebrow: 'Story And Noise',
      title: 'Trip activity',
      description: 'Chat, side games, stats, awards, and the recap.',
      items: [
        {
          id: 'social',
          label: 'Banter and journal',
          description: 'Trip talk, photos, and the running record of the week.',
          icon: MessageSquare,
          href: '/social',
        },
        {
          id: 'bets',
          label: 'Bets and side games',
          description: 'Friendly gambling, side pools, and trip-scale nonsense.',
          icon: Coins,
          href: '/bets',
          tone: 'green',
        },
        {
          id: 'trip-stats',
          label: 'Trip stats',
          description: 'The numbers that explain how the trip actually played out.',
          icon: BarChart3,
          href: '/trip-stats',
        },
        {
          id: 'awards',
          label: 'Awards',
          description: 'Badges, milestones, and the fun superlatives from the trip.',
          icon: Award,
          href: '/trip-stats/awards',
        },
        {
          id: 'recap',
          label: 'Trip recap',
          description: 'A clean look back once the matches are done.',
          icon: Trophy,
          href: '/recap',
        },
      ],
    },
    {
      id: 'app-support',
      eyebrow: 'Support And Preferences',
      title: 'Help and settings',
      description: 'Settings, appearance, notifications, backups, and help.',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          description: 'Manage display, scoring, alerts, and backup options.',
          icon: Palette,
          href: '/settings',
        },
        {
          id: 'appearance',
          label: 'Appearance',
          description: 'Theme and readability controls for bright days and tired eyes.',
          icon: Palette,
          href: '/settings/appearance',
        },
        {
          id: 'notifications',
          label: 'Notifications',
          description: 'Choose which reminders and alerts you actually want.',
          icon: Bell,
          href: '/settings/notifications',
        },
        {
          id: 'backup',
          label: 'Backup and export',
          description: 'Protection against the one phone that always dies at the wrong time.',
          icon: HardDrive,
          href: '/settings/backup',
        },
        {
          id: 'help',
          label: 'Help and FAQ',
          description: 'Answers for scoring, setup, and the questions that come up mid-trip.',
          icon: HelpCircle,
          href: '/help',
        },
      ],
    },
  ];

  const operatorSections: MenuSection[] = [
    ...(process.env.NODE_ENV === 'development'
      ? [
          {
            id: 'dev-tools',
            eyebrow: 'Development',
            title: 'Local testing tools.',
            description:
              'Shortcuts for loading or clearing local demo data while testing.',
            items: [
              {
                id: 'load-demo',
                label: 'Load demo data',
                description:
                  'Create a sample trip with enough data to test the app quickly.',
                icon: Database,
                action: handleSeedData,
                disabled: isSeeding,
                badge: isSeeding ? 'Loading' : undefined,
              },
              {
                id: 'clear-data',
                label: 'Clear all local data',
                description: 'Erase local test data and start fresh.',
                icon: Trash2,
                action: () => setShowClearConfirm(true),
                tone: 'danger' as const,
              },
            ],
          },
        ]
      : []),
    ...(isAdminMode
      ? [
          {
            id: 'admin-tools',
            eyebrow: 'Admin',
            title: 'Admin-only tools.',
            description:
              'Reserved for data cleanup and other high-impact actions.',
            items: [
              {
                id: 'admin-panel',
                label: 'Admin panel',
                description: 'Inspect and manage trips with elevated access.',
                icon: Shield,
                href: '/admin',
                badge: 'Admin',
                tone: 'danger' as const,
              },
              {
                id: 'clear-admin-data',
                label: 'Clear all data',
                description: 'Fully reset local trip data on this device.',
                icon: Trash2,
                action: () => setShowClearConfirm(true),
                tone: 'danger' as const,
              },
            ],
          },
        ]
      : []),
  ];

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}` || '?'
    : '?';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="More"
        subtitle={currentTrip?.name || 'Support, settings, and trip tools'}
        icon={<MoreHorizontal size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.push('/')}
        rightSlot={
          isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/profile')}
              leftIcon={<User size={14} />}
            >
              Profile
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/login')}
              leftIcon={<LogIn size={14} />}
            >
              Sign in
            </Button>
          )
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,240,0.99))] shadow-[0_26px_56px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">
                Support Hub
              </p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.25rem)] italic leading-[1.02] text-[var(--ink)]">
                Everything you might need between rounds.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Find trip tools, support, settings, and access controls in one place without
                digging through the rest of the app.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                {currentTrip ? (
                  <Button
                    variant="primary"
                    leftIcon={<CalendarDays size={16} />}
                    onClick={() => router.push('/schedule')}
                  >
                    Open schedule
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    leftIcon={<Trophy size={16} />}
                    onClick={() => router.push('/trip/new')}
                  >
                    Start a trip
                  </Button>
                )}
                <Button
                  variant="secondary"
                  leftIcon={<HelpCircle size={16} />}
                  onClick={() => router.push('/help')}
                >
                  Open help
                </Button>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <MoreFactCard
                label="Captain mode"
                value={isCaptainMode ? 'On' : 'Off'}
                detail={
                  isCaptainMode
                    ? 'Captain tools are available.'
                    : 'Captain tools stay locked until you turn them on.'
                }
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
              <MoreFactCard
                label="Main sections"
                value={primarySections.length}
                detail="The main places for trip tools, trip story, and support."
              />
              <MoreFactCard
                label="Trip status"
                value={currentTrip ? 'Loaded' : 'No trip'}
                detail={
                  currentTrip
                    ? 'Your current trip is open on this device.'
                    : 'Start or join a trip to unlock the full app.'
                }
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] space-y-[var(--space-4)]">
          <ProfilePanel
            isAuthenticated={isAuthenticated}
            currentUserName={
              currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : null
            }
            currentUserEmail={currentUser?.email || null}
            initials={initials}
          />

          {currentTrip ? (
            <TripPanel
              tripName={currentTrip.name}
              tripDates={formatTripRange(currentTrip.startDate, currentTrip.endDate)}
              tripLocation={currentTrip.location}
              onExit={() => setShowExitTripConfirm(true)}
            />
          ) : null}

          <AccessPanel
            isCaptainMode={isCaptainMode}
            isAdminMode={isAdminMode}
            onCaptainClick={() =>
              isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true)
            }
            onAdminClick={() => (isAdminMode ? disableAdminMode() : setShowAdminModal(true))}
            captainIcon={isCaptainMode ? <Unlock size={18} /> : <Lock size={18} />}
            adminIcon={<Shield size={18} />}
          />
        </section>

        {primarySections.map((section) => (
          <section
            key={section.id}
            className="mt-[var(--space-6)] rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]"
          >
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                {section.eyebrow}
              </p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                {section.title}
              </h2>
              <p className="mt-[var(--space-2)] max-w-[40rem] text-sm leading-7 text-[var(--ink-secondary)]">
                {section.description}
              </p>
            </div>

            <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <MenuTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {operatorSections.map((section) => (
          <section
            key={section.id}
            className="mt-[var(--space-6)] rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]"
          >
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                {section.eyebrow}
              </p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                {section.title}
              </h2>
              <p className="mt-[var(--space-2)] max-w-[40rem] text-sm leading-7 text-[var(--ink-secondary)]">
                {section.description}
              </p>
            </div>

            <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] md:grid-cols-2">
              {section.items.map((item) => (
                <MenuTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-[var(--space-6)] rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
          <div className="flex items-start gap-[var(--space-4)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] text-[var(--canvas)] shadow-[0_12px_24px_rgba(5,58,35,0.22)]">
              RC
            </div>
            <div>
              <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">
                Build Note
              </p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">
                Golf Ryder Cup
              </h2>
              <p className="mt-[var(--space-2)] max-w-[38rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Offline-first match play scoring for a serious buddies trip. The product is at its
                best when even the support and utility rooms feel like they belong to the same
                architect.
              </p>
              <div className="mt-[var(--space-4)] flex items-center gap-2 text-xs text-[var(--ink-tertiary)]">
                <Heart size={14} className="text-[var(--error)]" />
                Made for golf trips that deserve better than a spreadsheet.
              </div>
            </div>
          </div>
        </section>
      </main>

      <Modal
        isOpen={showCaptainModal}
        onClose={() => {
          setShowCaptainModal(false);
          setCaptainPin('');
        }}
        title="Enable captain mode"
        description="Use a PIN to unlock lineup editing, session changes, and the structural controls that belong to captains."
        size="sm"
      >
        <div className="space-y-[var(--space-4)] p-[var(--space-5)] pt-0">
          <input
            type="password"
            value={captainPin}
            onChange={(event) => setCaptainPin(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleEnableCaptainMode()}
            placeholder="Enter 4+ digit PIN"
            autoFocus
            className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
          />
          <div className="flex gap-[var(--space-3)]">
            <Button variant="ghost" className="flex-1" onClick={() => setShowCaptainModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={captainPin.length < 4}
              onClick={() => void handleEnableCaptainMode()}
            >
              Enable
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setAdminPin('');
        }}
        title="Enable admin mode"
        description="Admin mode keeps the destructive tools behind a second, more serious lock."
        size="sm"
      >
        <div className="space-y-[var(--space-4)] p-[var(--space-5)] pt-0">
          <input
            type="password"
            value={adminPin}
            onChange={(event) => setAdminPin(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void handleEnableAdminMode()}
            placeholder="Enter 4+ digit PIN"
            autoFocus
            className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
          />
          <div className="flex gap-[var(--space-3)]">
            <Button variant="ghost" className="flex-1" onClick={() => setShowAdminModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={adminPin.length < 4}
              onClick={() => void handleEnableAdminMode()}
            >
              Enable
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Clear all local data?"
        message="This removes trips, matches, scores, and demo data from this device."
        confirmLabel="Clear all"
        cancelLabel="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showExitTripConfirm}
        onClose={() => setShowExitTripConfirm(false)}
        onConfirm={handleExitTrip}
        title="Exit current trip?"
        message="You will return to the trip selector. The data remains saved, but this device will step out of the current trip context."
        confirmLabel="Exit trip"
        cancelLabel="Stay here"
        variant="warning"
      />
    </div>
  );
}
