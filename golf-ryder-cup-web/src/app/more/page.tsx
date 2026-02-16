'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore, useUIStore, useAuthStore } from '@/lib/stores';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';
import {
  ChevronRight,
  // Account & Auth
  User,
  LogIn,
  LogOut,
  // Trip & Management
  Shield,
  Lock,
  Unlock,
  MapPin,
  DollarSign,
  CalendarDays,
  // Social
  MessageSquare,
  BarChart3,
  Award,
  Coins,
  Trophy,
  // Settings
  Palette,
  Bell,
  Target,
  HardDrive,
  // Data
  Database,
  Trash2,
  // Info
  Heart,
  Info,
  HelpCircle,
} from 'lucide-react';
import { PageHeader, BottomNav } from '@/components/layout';

/**
 * MORE PAGE -- Organized Settings & Hub
 *
 * Clean, section-based layout with Trip Management, Social,
 * Settings, and Account groups. Uses the Fried Egg Golf
 * editorial design system.
 */

// ============================================
// TYPES
// ============================================

interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  badge?: string;
  badgeColor?: string;
  destructive?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

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

  // Handlers
  const handleEnableCaptainMode = async () => {
    if (captainPin.length < 4) return;
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
    if (adminPin.length < 4) return;
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
      createLogger('more').error('Failed to seed data', { error });
      showToast('error', 'Could not load demo data');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearData = async () => {
    try {
      await clearDemoData();
      clearTrip();
      setShowClearConfirm(false);
      showToast('info', 'All data cleared');
      router.push('/');
    } catch (error) {
      createLogger('more').error('Failed to clear data', { error });
      showToast('error', 'Could not clear data');
    }
  };

  const handleExitTrip = () => {
    clearTrip();
    setShowExitTripConfirm(false);
    router.push('/');
  };

  // ============================================
  // MENU SECTIONS
  // ============================================

  const tripManagementSection: MenuSection = {
    id: 'trip-management',
    title: 'Trip Management',
    items: [
      ...(isCaptainMode
        ? [
            {
              id: 'captain',
              label: 'Captain Dashboard',
              description: 'Lineups, settings & admin',
              icon: <Shield size={20} />,
              href: '/captain',
              badge: 'Active',
              badgeColor: 'var(--success)',
            },
          ]
        : []),
      {
        id: 'finances',
        label: 'Finances',
        description: 'Expenses & settling up',
        icon: <DollarSign size={20} />,
        href: '/finances',
      },
      {
        id: 'schedule',
        label: 'Schedule',
        description: 'Sessions & tee times',
        icon: <CalendarDays size={20} />,
        href: '/schedule',
      },
      {
        id: 'courses',
        label: 'Courses',
        description: 'View & add courses',
        icon: <MapPin size={20} />,
        href: '/courses',
      },
    ],
  };

  const socialSection: MenuSection = {
    id: 'social',
    title: 'Social',
    items: [
      {
        id: 'banter',
        label: 'Banter / Journal',
        description: 'Trip talk & memories',
        icon: <MessageSquare size={20} />,
        href: '/social',
      },
      {
        id: 'trip-stats',
        label: 'Trip Stats',
        description: 'Beverages, mishaps & more',
        icon: <BarChart3 size={20} />,
        href: '/trip-stats',
      },
      {
        id: 'awards',
        label: 'Awards',
        description: 'Badges & milestones',
        icon: <Award size={20} />,
        href: '/trip-stats/awards',
      },
      {
        id: 'bets',
        label: 'Bets & Side Games',
        description: 'Fun wagers & pools',
        icon: <Coins size={20} />,
        href: '/bets',
      },
      {
        id: 'recap',
        label: 'Trip Recap',
        description: 'Highlight reel & year in review',
        icon: <Trophy size={20} />,
        href: '/recap',
      },
      {
        id: 'help',
        label: 'Help & FAQ',
        description: 'How to score, captain mode & more',
        icon: <HelpCircle size={20} />,
        href: '/help',
      },
    ],
  };

  const settingsSection: MenuSection = {
    id: 'settings',
    title: 'Settings',
    items: [
      {
        id: 'appearance',
        label: 'Appearance',
        description: 'Theme & display',
        icon: <Palette size={20} />,
        href: '/settings/appearance',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        description: 'Alerts & reminders',
        icon: <Bell size={20} />,
        href: '/settings/notifications',
      },
      {
        id: 'scoring',
        label: 'Scoring Preferences',
        description: 'Rules & behavior',
        icon: <Target size={20} />,
        href: '/settings/scoring',
      },
      {
        id: 'backup',
        label: 'Backup & Export',
        description: 'Save your data',
        icon: <HardDrive size={20} />,
        href: '/settings/backup',
      },
    ],
  };

  const accountSection: MenuSection = {
    id: 'account',
    title: 'Account',
    items: [
      {
        id: 'profile',
        label: 'My Profile',
        description: 'View & edit your info',
        icon: <User size={20} />,
        href: '/profile',
      },
      {
        id: 'about',
        label: 'About',
        description: 'Version 1.1.0',
        icon: <Info size={20} />,
        // No href -- rendered inline with version info below
      },
    ],
  };

  // Developer tools (development only)
  const devToolsSection: MenuSection | null =
    process.env.NODE_ENV === 'development'
      ? {
          id: 'dev-tools',
          title: 'Developer Tools',
          items: [
            {
              id: 'demo',
              label: 'Load Demo Data',
              description: 'Try with sample trip',
              icon: <Database size={20} />,
              action: handleSeedData,
            },
            {
              id: 'clear-dev',
              label: 'Clear All Data',
              description: 'Start fresh',
              icon: <Trash2 size={20} />,
              action: () => setShowClearConfirm(true),
              destructive: true,
            },
          ],
        }
      : null;

  // Admin tools (only when admin mode is active)
  const adminToolsSection: MenuSection | null = isAdminMode
    ? {
        id: 'admin-tools',
        title: 'Admin Tools',
        items: [
          {
            id: 'admin-panel',
            label: 'Admin Panel',
            description: 'Delete trips & manage data',
            icon: <Shield size={20} />,
            href: '/admin',
            badge: 'Admin',
            badgeColor: 'var(--error)',
          },
          {
            id: 'clear-admin',
            label: 'Clear All Data',
            description: 'Start fresh',
            icon: <Trash2 size={20} />,
            action: () => setShowClearConfirm(true),
            destructive: true,
          },
        ],
      }
    : null;

  const allSections: MenuSection[] = [
    tripManagementSection,
    socialSection,
    settingsSection,
    accountSection,
    ...(devToolsSection ? [devToolsSection] : []),
    ...(adminToolsSection ? [adminToolsSection] : []),
  ];

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      {/* Header */}
      <PageHeader
        title="More"
        onBack={() => router.push('/')}
      />

      <main className="container-editorial pt-[var(--space-6)] pb-[var(--space-6)]">
        {/* Account Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--canvas-raised)] rounded-[var(--radius-lg)] p-[var(--space-5)] mb-[var(--space-6)] border border-[var(--rule)]"
        >
          {isAuthenticated && currentUser ? (
            <Link
              href="/profile"
              className="flex items-center gap-[var(--space-4)] no-underline text-inherit"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--canvas)] font-[var(--font-sans)] font-bold text-base bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
              >
                {currentUser.firstName?.[0] || '?'}
                {currentUser.lastName?.[0] || '?'}
              </div>
              <div className="flex-1">
                <p className="font-[var(--font-sans)] font-semibold text-base text-[var(--ink-primary)]">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mt-[2px]">
                  {currentUser.email}
                </p>
              </div>
              <ChevronRight size={20} className="text-[var(--ink-tertiary)]" />
            </Link>
          ) : (
            <div className="flex gap-[var(--space-3)]">
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-[var(--masters)] text-[var(--canvas)] rounded-[var(--radius-md)] font-[var(--font-sans)] font-semibold text-sm no-underline"
              >
                <LogIn size={18} />
                Sign In
              </Link>
              <Link
                href="/profile/create"
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-[var(--canvas-raised)] border border-[var(--rule)] text-[var(--ink-primary)] rounded-[var(--radius-md)] font-[var(--font-sans)] font-semibold text-sm no-underline"
              >
                <User size={18} />
                Create Profile
              </Link>
            </div>
          )}
        </motion.div>

        {/* Current Trip Card */}
        {currentTrip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[var(--radius-lg)] p-[var(--space-5)] mb-[var(--space-6)] text-[var(--canvas)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-[var(--font-sans)] text-[0.6875rem] font-semibold tracking-[0.1em] uppercase opacity-80 mb-1">
                  Current Trip
                </p>
                <p className="font-[var(--font-serif)] font-normal text-xl tracking-[-0.01em]">
                  {currentTrip.name}
                </p>
                <p className="font-[var(--font-sans)] text-sm opacity-90 mt-[6px]">
                  {new Date(currentTrip.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  &ndash;{' '}
                  {new Date(currentTrip.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowExitTripConfirm(true)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-[var(--radius-md)] border border-[color:var(--canvas)]/25 bg-[color:var(--canvas)]/15 text-[var(--canvas)] font-[var(--font-sans)] text-xs font-semibold cursor-pointer transition-colors hover:bg-[color:var(--canvas)]/25"
              >
                <LogOut size={14} />
                Exit
              </button>
            </div>
          </motion.div>
        )}

        {/* Captain Mode Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => (isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true))}
          className={`w-full flex items-center gap-[var(--space-4)] py-[var(--space-4)] px-[var(--space-5)] rounded-[var(--radius-lg)] mb-[var(--space-3)] cursor-pointer text-left ${
            isCaptainMode
              ? 'bg-[var(--maroon-subtle)] border-2 border-[var(--maroon)]'
              : 'bg-[var(--canvas-raised)] border border-[var(--rule)]'
          }`}
        >
          <div
            className={cn(
              'w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0',
              isCaptainMode
                ? 'text-[var(--canvas)] bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]'
                : 'text-[var(--ink-secondary)] bg-[var(--canvas-sunken)]'
            )}
          >
            {isCaptainMode ? <Unlock size={22} /> : <Lock size={22} />}
          </div>
          <div className="flex-1">
            <p
              className={`font-[var(--font-sans)] font-semibold ${
                isCaptainMode ? 'text-[var(--maroon-dark)]' : 'text-[var(--ink-primary)]'
              }`}
            >
              Captain Mode
            </p>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mt-[2px]">
              {isCaptainMode ? 'Enabled -- Full editing access' : 'Tap to unlock editing'}
            </p>
          </div>
          <Toggle enabled={isCaptainMode} color={isCaptainMode ? 'var(--maroon)' : undefined} />
        </motion.button>

        {/* Admin Mode Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => (isAdminMode ? disableAdminMode() : setShowAdminModal(true))}
          className={`w-full flex items-center gap-[var(--space-4)] py-[var(--space-4)] px-[var(--space-5)] rounded-[var(--radius-lg)] mb-[var(--space-8)] cursor-pointer text-left ${
            isAdminMode
              ? 'bg-[color:var(--error)]/12 border border-[color:var(--error)]/40'
              : 'bg-[var(--canvas-raised)] border border-[var(--rule)]'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
              isAdminMode ? 'bg-[var(--error)] text-[var(--canvas)]' : 'bg-[var(--canvas-sunken)] text-[var(--ink-secondary)]'
            }`}
          >
            <Shield size={22} />
          </div>
          <div className="flex-1">
            <p
              className={`font-[var(--font-sans)] font-semibold ${
                isAdminMode ? 'text-[var(--error)]' : 'text-[var(--ink-primary)]'
              }`}
            >
              Admin Mode
            </p>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mt-[2px]">
              {isAdminMode ? 'Enabled -- Data management access' : 'Delete trips & manage data'}
            </p>
          </div>
          <Toggle enabled={isAdminMode} color={isAdminMode ? 'var(--error)' : undefined} />
        </motion.button>

        {/* Organized Menu Sections */}
        {allSections.map((section, sectionIndex) => (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + sectionIndex * 0.05 }}
            className="mb-[var(--space-6)]"
          >
            {sectionIndex > 0 && <hr className="divider-subtle mb-[var(--space-5)]" />}
            <h2 className="type-overline font-[var(--font-sans)] mb-[var(--space-3)]">
              {section.title}
            </h2>

            <div className="bg-[var(--canvas-raised)] rounded-[var(--radius-lg)] border border-[var(--rule)] overflow-hidden">
              {section.items.map((item, index) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  isLast={index === section.items.length - 1}
                  isLoading={item.id === 'demo' && isSeeding}
                />
              ))}
            </div>
          </motion.section>
        ))}

        {/* About Section -- inline version info */}
        <hr className="divider-subtle" />
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--canvas-raised)] rounded-[var(--radius-lg)] p-[var(--space-6)] border border-[var(--rule)] mt-[var(--space-6)] mb-[var(--space-6)]"
        >
          <div className="flex items-center gap-[var(--space-4)] mb-[var(--space-4)]">
            <div
              className="w-[52px] h-[52px] rounded-[var(--radius-lg)] flex items-center justify-center text-[var(--canvas)] font-[var(--font-serif)] font-normal text-xl tracking-[-0.02em] shadow-[0_4px_12px_rgba(0,66,37,0.25)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
            >
              RC
            </div>
            <div>
              <p className="font-[var(--font-serif)] font-normal text-lg text-[var(--ink-primary)] tracking-[-0.01em]">
                Golf Ryder Cup
              </p>
              <p className="font-[var(--font-sans)] text-[0.8125rem] text-[var(--ink-tertiary)] mt-[2px]">
                Version 1.1.0
              </p>
            </div>
          </div>
          <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] leading-[1.6]">
            Offline-first match play scoring for your Ryder Cup format golf trip. Track scores,
            manage lineups, and celebrate with friends.
          </p>
          <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-t-[var(--rule)] flex items-center gap-2 text-[var(--ink-tertiary)] font-[var(--font-sans)] text-xs">
            <Heart size={14} className="text-[var(--error)]" />
            Made with love for golf
          </div>
        </motion.section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCaptainModal && (
          <Modal onClose={() => setShowCaptainModal(false)}>
            <h2 className="font-[var(--font-serif)] text-xl font-normal mb-2 text-[var(--ink-primary)]">
              Enable Captain Mode
            </h2>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mb-5 leading-normal">
              Enter a PIN to unlock captain features like editing lineups and managing players.
            </p>
            <input
              type="password"
              value={captainPin}
              onChange={(e) => setCaptainPin(e.target.value)}
              placeholder="Enter 4+ digit PIN"
              autoFocus
              className="w-full py-3.5 px-4 font-[var(--font-sans)] text-base rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCaptainModal(false);
                  setCaptainPin('');
                }}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEnableCaptainMode}
                disabled={captainPin.length < 4}
                className={`flex-1 p-3.5 rounded-[var(--radius-md)] border-none font-[var(--font-sans)] font-semibold ${
                  captainPin.length >= 4
                    ? 'bg-[var(--maroon)] text-[var(--canvas)] cursor-pointer'
                    : 'bg-[var(--rule)] text-[var(--ink-tertiary)] cursor-not-allowed'
                }`}
              >
                Enable
              </button>
            </div>
          </Modal>
        )}

        {showClearConfirm && (
          <Modal onClose={() => setShowClearConfirm(false)}>
            <div className="w-14 h-14 rounded-full bg-[var(--error-subtle)] flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-[var(--error)]" />
            </div>
            <h2 className="font-[var(--font-serif)] text-xl font-normal text-center mb-2 text-[var(--ink-primary)]">
              Clear All Data?
            </h2>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] text-center mb-5 leading-normal">
              This will permanently delete all trips, players, matches, and scores. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border-none bg-[var(--error)] text-[var(--canvas)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </Modal>
        )}

        {showExitTripConfirm && (
          <Modal onClose={() => setShowExitTripConfirm(false)}>
            <h2 className="font-[var(--font-serif)] text-xl font-normal mb-2 text-[var(--ink-primary)]">
              Exit Trip?
            </h2>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mb-5 leading-normal">
              You&apos;ll return to the trip selector. Your data is saved and you can return
              anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitTripConfirm(false)}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExitTrip}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border-none bg-[var(--masters)] text-[var(--canvas)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Exit Trip
              </button>
            </div>
          </Modal>
        )}

        {showAdminModal && (
          <Modal onClose={() => setShowAdminModal(false)}>
            <div className="w-14 h-14 rounded-full bg-[color:var(--error)]/12 flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-[var(--error)]" />
            </div>
            <h2 className="font-[var(--font-serif)] text-xl font-normal mb-2 text-center text-[var(--ink-primary)]">
              Enable Admin Mode
            </h2>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mb-5 text-center leading-normal">
              Admin mode allows you to delete trips, clean up data, and access advanced management
              features.
            </p>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter 4+ digit PIN"
              autoFocus
              className="w-full py-3.5 px-4 font-[var(--font-sans)] text-base rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminPin('');
                }}
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] text-[var(--ink-primary)] font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEnableAdminMode}
                disabled={adminPin.length < 4}
                className={`flex-1 p-3.5 rounded-[var(--radius-md)] border-none font-[var(--font-sans)] font-semibold ${
                  adminPin.length >= 4
                    ? 'bg-[var(--error)] text-[var(--canvas)] cursor-pointer'
                    : 'bg-[var(--rule)] text-[var(--ink-tertiary)] cursor-not-allowed'
                }`}
              >
                Enable
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function MenuItemRow({
  item,
  isLast,
  isLoading,
}: {
  item: MenuItem;
  isLast: boolean;
  isLoading?: boolean;
}) {
  const content = (
    <>
      <div
        className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
          item.destructive
            ? 'bg-[var(--error-subtle)] text-[var(--error)]'
            : 'bg-[var(--canvas-sunken)] text-[var(--ink-secondary)]'
        }`}
      >
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-[var(--font-sans)] font-medium text-[0.9375rem] ${
            item.destructive ? 'text-[var(--error)]' : 'text-[var(--ink-primary)]'
          }`}
        >
          {item.label}
        </p>
        {item.description && (
          <p className="font-[var(--font-sans)] text-[0.8125rem] text-[var(--ink-tertiary)] mt-[2px] leading-[1.4]">
            {item.description}
          </p>
        )}
      </div>
      {item.badge && (
        <span
          className="py-[3px] px-2 rounded-[6px] text-[var(--canvas)] font-[var(--font-sans)] text-[0.6875rem] font-semibold uppercase tracking-[0.04em] bg-[var(--badge-bg)]"
          style={{ '--badge-bg': item.badgeColor || 'var(--masters)' } as React.CSSProperties}
        >
          {item.badge}
        </span>
      )}
      {isLoading ? (
        <span className="font-[var(--font-sans)] text-[0.8125rem] text-[var(--ink-tertiary)]">
          Loading...
        </span>
      ) : item.href ? (
        <ChevronRight size={18} className="text-[var(--ink-tertiary)] shrink-0" />
      ) : null}
    </>
  );

  const itemClassName = `flex items-center gap-[var(--space-3)] py-[var(--space-4)] px-[var(--space-5)] w-full text-left no-underline text-inherit bg-transparent border-0 cursor-pointer transition-colors duration-150 ${
    !isLast ? 'border-b border-b-[var(--rule-faint)]' : ''
  }`;

  if (item.href) {
    return (
      <Link href={item.href} className={itemClassName}>
        {content}
      </Link>
    );
  }

  if (item.action) {
    return (
      <button onClick={item.action} className={itemClassName} disabled={isLoading}>
        {content}
      </button>
    );
  }

  // Inert row (e.g. About -- no link, no action)
  return (
    <div className={itemClassName}>
      {content}
    </div>
  );
}

function Toggle({ enabled, color }: { enabled: boolean; color?: string }) {
  return (
    <div
      className="w-12 h-7 rounded-[14px] relative transition-colors duration-200 shrink-0 bg-[var(--toggle-bg)]"
      style={{ '--toggle-bg': enabled ? color || 'var(--masters)' : 'var(--rule)' } as React.CSSProperties}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-6 h-6 rounded-full bg-[var(--surface-raised)] shadow-sm"
      />
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-[color:var(--ink)]/50 flex items-center justify-center p-6 z-[100]"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--canvas-raised)] rounded-[var(--radius-xl)] p-[var(--space-6)] w-full max-w-[360px] shadow-[0_20px_40px_rgba(0,0,0,0.25)] border border-[var(--rule)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
