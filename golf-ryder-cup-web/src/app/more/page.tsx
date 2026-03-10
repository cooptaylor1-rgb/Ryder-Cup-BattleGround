'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
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
  LogOut,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Shield,
  Trash2,
  Trophy,
  Unlock,
  User,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { clearDemoData, seedDemoData } from '@/lib/db/seed';
import { useAuthStore, useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import { cn } from '@/lib/utils';

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  badge?: string;
  tone?: 'default' | 'green' | 'maroon' | 'danger';
  disabled?: boolean;
}

interface MenuSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: MenuItem[];
}

const logger = createLogger('more');

export default function MorePage() {
  const router = useRouter();
  const { currentTrip, loadTrip, clearTrip } = useTripStore();
  const { currentUser, isAuthenticated } = useAuthStore();
  const {
    isCaptainMode,
    enableCaptainMode,
    disableCaptainMode,
    isAdminMode,
    enableAdminMode,
    disableAdminMode,
    showToast,
  } = useUIStore();

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
      showToast('info', 'All data cleared');
      router.push('/');
    } catch (error) {
      logger.error('Failed to clear data', { error });
      showToast('error', 'Could not clear data');
    }
  };

  const handleExitTrip = () => {
    clearTrip();
    setShowExitTripConfirm(false);
    router.push('/');
  };

  const primarySections: MenuSection[] = [
    {
      id: 'trip-tools',
      eyebrow: 'Trip Tools',
      title: 'The rooms that keep the weekend moving.',
      description: 'Trip structure, money, schedule, and the practical work that has to stay within reach.',
      items: [
        ...(isCaptainMode
          ? [
              {
                id: 'captain',
                label: 'Captain command',
                description: 'Lineups, logistics, and the full competition desk.',
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
          description: 'Sessions, tee times, and the shape of the trip.',
          icon: CalendarDays,
          href: '/schedule',
        },
        {
          id: 'finances',
          label: 'Finances',
          description: 'Charges, balances, and settling up without the usual mess.',
          icon: DollarSign,
          href: '/finances',
          tone: 'green',
        },
        {
          id: 'courses',
          label: 'Courses',
          description: 'Course details, setup, and the places you are actually playing.',
          icon: MapPin,
          href: '/courses',
        },
      ],
    },
    {
      id: 'trip-story',
      eyebrow: 'Story And Noise',
      title: 'The social layer should still look curated.',
      description: 'Banter, side games, awards, and the bits of trip memory that make the app feel alive.',
      items: [
        {
          id: 'social',
          label: 'Banter and journal',
          description: 'Trip talk, photos, and the running record of the weekend.',
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
          description: 'The off-course numbers that turn into stories a year later.',
          icon: BarChart3,
          href: '/trip-stats',
        },
        {
          id: 'awards',
          label: 'Awards',
          description: 'Badges, milestones, and the ceremonial side of the recap.',
          icon: Award,
          href: '/trip-stats/awards',
        },
        {
          id: 'recap',
          label: 'Trip recap',
          description: 'The polished look back once the cup and the dust settle.',
          icon: Trophy,
          href: '/recap',
        },
      ],
    },
    {
      id: 'app-support',
      eyebrow: 'Support And Preferences',
      title: 'The utility layer should feel every bit as composed.',
      description: 'Appearance, notifications, backup, and the support pages people look for when the trip gets real.',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          description: 'The central utility room for display, rules, alerts, and backups.',
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
          description: 'The difference between useful reminders and background static.',
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
          description: 'The guidebook for scoring, captain logic, and support questions.',
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
            title: 'Tools for shaping the local build.',
            description: 'Useful when you are testing the app, invisible when you are just trying to use it.',
            items: [
              {
                id: 'load-demo',
                label: 'Load demo data',
                description: 'Spin up a sample trip with enough structure to test the app quickly.',
                icon: Database,
                action: handleSeedData,
                disabled: isSeeding,
                badge: isSeeding ? 'Loading' : undefined,
              },
              {
                id: 'clear-data',
                label: 'Clear all local data',
                description: 'Wipe the local sandbox and start from a clean sheet.',
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
            title: 'The sharp tools belong behind a second locked door.',
            description: 'Reserved for data cleanup and the destructive operations that should never feel casual.',
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
                description: 'A full reset for local trip data when the environment needs to be wiped.',
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
            <Button variant="outline" size="sm" leftIcon={<User size={14} />} onClick={() => router.push('/profile')}>
              Profile
            </Button>
          ) : (
            <Button variant="outline" size="sm" leftIcon={<LogIn size={14} />} onClick={() => router.push('/login')}>
              Sign in
            </Button>
          )
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,240,0.99))] shadow-[0_26px_56px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Support Hub</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.25rem)] italic leading-[1.02] text-[var(--ink)]">
                This is the hallway that connects the serious rooms.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
                More should not feel like the junk drawer of the app. It should be the clubhouse corridor:
                trip utilities in one direction, support in the other, and the keys to captain access close at hand.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                {currentTrip ? (
                  <Button variant="primary" leftIcon={<CalendarDays size={16} />} onClick={() => router.push('/schedule')}>
                    Open schedule
                  </Button>
                ) : (
                  <Button variant="primary" leftIcon={<Trophy size={16} />} onClick={() => router.push('/trip/new')}>
                    Start a trip
                  </Button>
                )}
                <Button variant="secondary" leftIcon={<HelpCircle size={16} />} onClick={() => router.push('/help')}>
                  Open help
                </Button>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <MoreFactCard label="Captain mode" value={isCaptainMode ? 'On' : 'Off'} detail={isCaptainMode ? 'Structural controls are unlocked.' : 'Lineups and management remain protected.'} valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
              <MoreFactCard label="Support rooms" value={primarySections.length} detail="The main support clusters kept close to the user." />
              <MoreFactCard label="Trip status" value={currentTrip ? 'Loaded' : 'No trip'} detail={currentTrip ? 'The current weekend is active in this device.' : 'Start or join a trip to unlock the full app.'} valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.14fr)_18rem]">
          <div className="space-y-[var(--space-4)]">
            <ProfilePanel
              isAuthenticated={isAuthenticated}
              currentUserName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : null}
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
              onCaptainClick={() => (isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true))}
              onAdminClick={() => (isAdminMode ? disableAdminMode() : setShowAdminModal(true))}
            />
          </div>

          <aside className="space-y-[var(--space-4)]">
            <SidebarNote
              title="Captain access should feel deliberate"
              body="The app gets better when structural tools live behind one clear threshold instead of leaking into every screen by default."
              icon={<Shield size={18} />}
              tone="maroon"
            />
            <SidebarNote
              title="Help belongs nearby"
              body="If a player hits a support question from here, the answer should feel one turn away instead of buried in a maze of utility rows."
              icon={<HelpCircle size={18} />}
            />
          </aside>
        </section>

        {primarySections.map((section) => (
          <section key={section.id} className="mt-[var(--space-6)] rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{section.eyebrow}</p>
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
          <section key={section.id} className="mt-[var(--space-6)] rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{section.eyebrow}</p>
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
              <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Build Note</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">
                Golf Ryder Cup
              </h2>
              <p className="mt-[var(--space-2)] max-w-[38rem] text-sm leading-7 text-[var(--ink-secondary)]">
                Offline-first match play scoring for a serious buddies trip. The product is at its best when even the support and utility rooms feel like they belong to the same architect.
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
            <Button variant="primary" className="flex-1" disabled={captainPin.length < 4} onClick={() => void handleEnableCaptainMode()}>
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
            <Button variant="danger" className="flex-1" disabled={adminPin.length < 4} onClick={() => void handleEnableAdminMode()}>
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
        message="This removes trips, matches, scores, and demo data from this device. It should feel like a deliberate reset because it is one."
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

function ProfilePanel({
  isAuthenticated,
  currentUserName,
  currentUserEmail,
  initials,
}: {
  isAuthenticated: boolean;
  currentUserName: string | null;
  currentUserEmail: string | null;
  initials: string;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      {isAuthenticated && currentUserName ? (
        <Link href="/profile" className="block">
          <div className="flex items-center gap-[var(--space-4)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] font-semibold text-[var(--canvas)] shadow-[0_12px_24px_rgba(5,58,35,0.2)]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Profile</p>
              <h2 className="mt-[var(--space-2)] text-lg font-semibold text-[var(--ink)]">
                {currentUserName}
              </h2>
              <p className="mt-[2px] truncate text-sm text-[var(--ink-secondary)]">{currentUserEmail}</p>
            </div>
          </div>
        </Link>
      ) : (
        <div>
          <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Account</p>
          <h2 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">
            Sign in when the trip deserves a durable identity.
          </h2>
          <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
            Local play still works, but signed-in users get a cleaner bridge between device state and the cloud-backed parts of the app.
          </p>
          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02]"
            >
              Sign in
            </Link>
            <Link
              href="/profile/create"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:bg-[var(--surface)]"
            >
              Create profile
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function TripPanel({
  tripName,
  tripDates,
  tripLocation,
  onExit,
}: {
  tripName: string;
  tripDates: string;
  tripLocation?: string;
  onExit: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.85rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] p-[var(--space-5)] text-[var(--canvas)] shadow-[0_22px_48px_rgba(5,58,35,0.2)]">
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[color:var(--canvas)]/72">Current Trip</p>
          <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--canvas)]">{tripName}</h2>
          <p className="mt-[var(--space-2)] text-sm leading-6 text-[color:var(--canvas)]/78">{tripDates}</p>
          {tripLocation ? <p className="mt-[var(--space-2)] text-sm text-[color:var(--canvas)]/74">{tripLocation}</p> : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
          leftIcon={<LogOut size={14} />}
          onClick={onExit}
        >
          Exit
        </Button>
      </div>
    </section>
  );
}

function AccessPanel({
  isCaptainMode,
  isAdminMode,
  onCaptainClick,
  onAdminClick,
}: {
  isCaptainMode: boolean;
  isAdminMode: boolean;
  onCaptainClick: () => void;
  onAdminClick: () => void;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Access Modes</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink)]">
        Unlock the structural tools on purpose.
      </h2>
      <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
        <ModeRow
          title="Captain mode"
          description={isCaptainMode ? 'Full lineup and trip editing access is active.' : 'Unlock lineups, sessions, and captain controls.'}
          icon={isCaptainMode ? <Unlock size={18} /> : <Lock size={18} />}
          enabled={isCaptainMode}
          tone="maroon"
          onClick={onCaptainClick}
        />
        <ModeRow
          title="Admin mode"
          description={isAdminMode ? 'Destructive and elevated tools are active.' : 'Reserve the dangerous tools for deliberate use only.'}
          icon={<Shield size={18} />}
          enabled={isAdminMode}
          tone="danger"
          onClick={onAdminClick}
        />
      </div>
    </section>
  );
}

function ModeRow({
  title,
  description,
  icon,
  enabled,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  tone: 'maroon' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-[var(--space-3)] rounded-[1.3rem] border px-[var(--space-4)] py-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01]',
        enabled
          ? tone === 'maroon'
            ? 'border-[var(--maroon-subtle)] bg-[color:var(--maroon)]/8'
            : 'border-[color:var(--error)]/25 bg-[color:var(--error)]/7'
          : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-[1rem]',
          enabled
            ? tone === 'maroon'
              ? 'bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)]'
              : 'bg-[var(--error)] text-[var(--canvas)]'
            : 'bg-[var(--surface-raised)] text-[var(--ink-secondary)]'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-[2px] text-sm leading-6 text-[var(--ink-secondary)]">{description}</p>
      </div>
      <ModeToggle enabled={enabled} tone={tone} />
    </button>
  );
}

function MenuTile({ item }: { item: MenuItem }) {
  const toneClassName = getTileToneClassName(item.tone || 'default');
  const Icon = item.icon;

  const content = (
    <>
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', toneClassName)}>
        <Icon size={18} />
      </div>
      <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-2)]">
        <h3 className="text-base font-semibold text-[var(--ink)]">{item.label}</h3>
        {item.badge ? (
          <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
            {item.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{item.description}</p>
      <p className="mt-[var(--space-4)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {item.action ? 'Run tool' : 'Open room'}
      </p>
    </>
  );

  const className = cn(
    'rounded-[1.55rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)] text-left shadow-[0_14px_32px_rgba(41,29,17,0.05)] transition-transform duration-150 hover:scale-[1.01] hover:bg-[var(--surface)]',
    item.disabled && 'cursor-wait opacity-70'
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.action} className={className} disabled={item.disabled}>
      {content}
    </button>
  );
}

function SidebarNote({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'maroon'
          ? 'border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,241,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
        {icon}
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}

function MoreFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function ModeToggle({
  enabled,
  tone,
}: {
  enabled: boolean;
  tone: 'maroon' | 'danger';
}) {
  return (
    <div
      className="relative h-7 w-12 shrink-0 rounded-[14px] transition-colors duration-200"
      style={{
        background: enabled
          ? tone === 'maroon'
            ? 'var(--maroon)'
            : 'var(--error)'
          : 'var(--rule)',
      }}
    >
      <div
        className="absolute top-[2px] h-6 w-6 rounded-full bg-[var(--surface-raised)] shadow-sm transition-transform duration-200"
        style={{ transform: `translateX(${enabled ? 22 : 2}px)` }}
      />
    </div>
  );
}

function getTileToneClassName(tone: MenuItem['tone']) {
  switch (tone) {
    case 'green':
      return 'bg-[color:var(--masters)]/12 text-[var(--masters)]';
    case 'maroon':
      return 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]';
    case 'danger':
      return 'bg-[color:var(--error)]/10 text-[var(--error)]';
    default:
      return 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]';
  }
}

function formatTripRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return 'Trip dates not set';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
