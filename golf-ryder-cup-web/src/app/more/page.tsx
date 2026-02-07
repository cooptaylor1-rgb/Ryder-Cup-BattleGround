'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore, useUIStore, useAuthStore } from '@/lib/stores';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import { createLogger } from '@/lib/utils/logger';
import {
  // Navigation & UI
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  // Account & Auth
  User,
  LogIn,
  LogOut,
  // Trip & Management
  Shield,
  Lock,
  Unlock,
  Users,
  MapPin,
  // Features
  Award,
  Camera,
  Coins,
  BarChart3,
  CalendarDays,
  Eye,
  ExternalLink,
  Sparkles,
  // Settings
  Palette,
  Bell,
  Target,
  // Data
  Database,
  Trash2,
  HardDrive,
  // Info
  Heart,
} from 'lucide-react';
import { BottomNav } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui';

/**
 * MORE PAGE -- Editorial Hub
 *
 * Clean, organized access to all features, settings, and account management.
 * Uses the Fried Egg Golf editorial design system with warm typography,
 * cream canvas, and clean list rows instead of grids.
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
  requiresTrip?: boolean;
  requiresCaptain?: boolean;
  external?: boolean;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    features: true,
    manage: true,
    settings: false,
    data: false,
    admin: true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

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

  const menuSections: MenuSection[] = [
    // Features & Activities
    {
      id: 'features',
      title: 'Features',
      items: [
        {
          id: 'achievements',
          label: 'Achievements',
          description: 'Badges & milestones',
          icon: <Award size={20} />,
          href: '/achievements',
          badge: 'New',
          badgeColor: 'var(--masters)',
        },
        {
          id: 'social',
          label: 'Social & Photos',
          description: 'Share memories',
          icon: <Camera size={20} />,
          href: '/social',
        },
        {
          id: 'bets',
          label: 'Side Bets',
          description: 'Fun wagers & pools',
          icon: <Coins size={20} />,
          href: '/bets',
          requiresTrip: true,
        },
        {
          id: 'trip-stats',
          label: 'Trip Stats',
          description: 'Beverages, mishaps & more',
          icon: <BarChart3 size={20} />,
          href: '/trip-stats',
          requiresTrip: true,
        },
        {
          id: 'schedule',
          label: 'Schedule',
          description: 'Sessions & tee times',
          icon: <CalendarDays size={20} />,
          href: '/schedule',
          requiresTrip: true,
        },
        {
          id: 'stats-hub',
          label: 'Stats',
          description: 'Trip tallies & awards',
          icon: <BarChart3 size={20} />,
          href: '/stats',
        },
        {
          id: 'live',
          label: 'Live Leaderboard',
          description: 'Real-time scores',
          icon: <Sparkles size={20} />,
          href: '/live',
          requiresTrip: true,
        },
      ],
    },
    // Management (Trip-specific)
    ...(currentTrip
      ? [
          {
            id: 'manage',
            title: 'Trip Management',
            items: [
              {
                id: 'captain-center',
                label: 'Captain Command',
                description: 'Lineups, settings & more',
                icon: <Shield size={20} />,
                href: '/captain',
                requiresCaptain: true,
                badge: isCaptainMode ? 'Active' : undefined,
                badgeColor: 'var(--success)',
              },
              {
                id: 'players',
                label: 'Players',
                description: 'Manage roster',
                icon: <Users size={20} />,
                href: '/players',
              },
              {
                id: 'courses',
                label: 'Courses',
                description: 'View & add courses',
                icon: <MapPin size={20} />,
                href: '/courses',
              },
              {
                id: 'spectator',
                label: 'Spectator Link',
                description: 'Share live scores',
                icon: <Eye size={20} />,
                href: `/spectator/${currentTrip.id}`,
                external: true,
              },
            ],
          },
        ]
      : []),
    // Settings
    {
      id: 'settings',
      title: 'Settings',
      items: [
        {
          id: 'scoring',
          label: 'Scoring Preferences',
          description: 'Rules & behavior',
          icon: <Target size={20} />,
          href: '/settings/scoring',
        },
        {
          id: 'notifications',
          label: 'Notifications',
          description: 'Alerts & reminders',
          icon: <Bell size={20} />,
          href: '/settings/notifications',
        },
        {
          id: 'appearance',
          label: 'Appearance',
          description: 'Theme & display',
          icon: <Palette size={20} />,
          href: '/settings/appearance',
        },
        {
          id: 'backup',
          label: 'Backup & Export',
          description: 'Save your data',
          icon: <HardDrive size={20} />,
          href: '/settings/backup',
        },
      ],
    },
    // Data & Developer (only show in development)
    ...(process.env.NODE_ENV === 'development'
      ? [
          {
            id: 'data',
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
                id: 'clear',
                label: 'Clear All Data',
                description: 'Start fresh',
                icon: <Trash2 size={20} />,
                action: () => setShowClearConfirm(true),
                destructive: true,
              },
            ],
          },
        ]
      : []),
    // Admin (only show when admin mode is enabled)
    ...(isAdminMode
      ? [
          {
            id: 'admin',
            title: 'Admin Tools',
            items: [
              {
                id: 'admin-panel',
                label: 'Admin Panel',
                description: 'Delete trips & manage data',
                icon: <Shield size={20} />,
                href: '/admin',
                badge: 'Admin',
                badgeColor: '#dc2626',
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
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--canvas)] border-b border-[var(--rule)]">
        <div className="container-editorial flex items-center gap-[var(--space-3)] py-[14px] px-0">
          <button
            onClick={() => router.push('/')}
            className="p-2 bg-transparent border-none cursor-pointer text-[var(--ink-secondary)] rounded-[var(--radius-md)] -ml-2"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <h1 className="font-[var(--font-serif)] text-[1.375rem] font-normal text-[var(--ink-primary)] tracking-[-0.01em]">
            More
          </h1>
        </div>
      </header>

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
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-[var(--font-sans)] font-bold text-base"
                style={{
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                }}
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
                className="flex-1 flex items-center justify-center gap-2 p-3 bg-[var(--masters)] text-white rounded-[var(--radius-md)] font-[var(--font-sans)] font-semibold text-sm no-underline"
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
            className="rounded-[var(--radius-lg)] p-[var(--space-5)] mb-[var(--space-6)] text-white"
            style={{ background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)' }}
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
                className="flex items-center gap-1.5 py-2 px-3 bg-white/15 border-none rounded-[var(--radius-md)] text-white font-[var(--font-sans)] text-xs font-semibold cursor-pointer"
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
            className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
              isCaptainMode ? 'text-white' : 'text-[var(--ink-secondary)]'
            }`}
            style={{
              background: isCaptainMode
                ? 'linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%)'
                : 'var(--canvas-sunken)',
            }}
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
              ? 'bg-[rgba(220,38,38,0.06)] border-2 border-[#dc2626]'
              : 'bg-[var(--canvas-raised)] border border-[var(--rule)]'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 ${
              isAdminMode ? 'bg-[#dc2626] text-white' : 'bg-[var(--canvas-sunken)] text-[var(--ink-secondary)]'
            }`}
          >
            <Shield size={22} />
          </div>
          <div className="flex-1">
            <p
              className={`font-[var(--font-sans)] font-semibold ${
                isAdminMode ? 'text-[#dc2626]' : 'text-[var(--ink-primary)]'
              }`}
            >
              Admin Mode
            </p>
            <p className="font-[var(--font-sans)] text-sm text-[var(--ink-secondary)] mt-[2px]">
              {isAdminMode ? 'Enabled -- Data management access' : 'Delete trips & manage data'}
            </p>
          </div>
          <Toggle enabled={isAdminMode} color={isAdminMode ? '#dc2626' : undefined} />
        </motion.button>

        {/* Menu Sections */}
        {(() => {
          const visibleSections = menuSections
            .map((section) => {
              const filteredItems = section.items.filter(
                (item) =>
                  (!item.requiresTrip || currentTrip) && (!item.requiresCaptain || isCaptainMode)
              );
              return { section, filteredItems };
            })
            .filter(({ filteredItems }) => filteredItems.length > 0);

          if (visibleSections.length === 0) {
            const emptyCopy = !isAuthenticated
              ? {
                  title: 'Sign in to continue',
                  description: 'Log in to access your account, trips, and settings.',
                  action: { label: 'Sign In', onClick: () => router.push('/login') },
                }
              : !currentTrip
                ? {
                    title: 'No trip selected',
                    description: 'Select or create a trip to unlock tournament tools and stats.',
                    action: { label: 'Go Home', onClick: () => router.push('/') },
                  }
                : {
                    title: 'Nothing to show yet',
                    description: 'More tools will appear here as your tournament fills in.',
                    action: { label: 'Go Home', onClick: () => router.push('/') },
                  };

            return (
              <div className="mt-[var(--space-6)]">
                <EmptyStatePremium
                  illustration="flag"
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                  action={emptyCopy.action}
                  variant="large"
                />
              </div>
            );
          }

          return visibleSections.map(({ section, filteredItems }, sectionIndex) => {
            const isExpanded = expandedSections[section.id] ?? true;

            return (
              <motion.section
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + sectionIndex * 0.05 }}
                className="mb-[var(--space-6)]"
              >
                {/* Section header with divider */}
                {sectionIndex > 0 && <hr className="divider-subtle mb-[var(--space-5)]" />}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full p-0 bg-transparent border-none cursor-pointer mb-[var(--space-3)]"
                >
                  <h2 className="type-overline font-[var(--font-sans)]">
                    {section.title}
                  </h2>
                  <ChevronDown
                    size={16}
                    className={`text-[var(--ink-tertiary)] transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[var(--canvas-raised)] rounded-[var(--radius-lg)] border border-[var(--rule)] overflow-hidden">
                        {filteredItems.map((item, index) => (
                          <MenuItemRow
                            key={item.id}
                            item={item}
                            isLast={index === filteredItems.length - 1}
                            isLoading={item.id === 'demo' && isSeeding}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          });
        })()}

        {/* About Section */}
        <hr className="divider-subtle" />
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[var(--canvas-raised)] rounded-[var(--radius-lg)] p-[var(--space-6)] border border-[var(--rule)] mt-[var(--space-6)] mb-[var(--space-6)]"
        >
          <div className="flex items-center gap-[var(--space-4)] mb-[var(--space-4)]">
            <div
              className="w-[52px] h-[52px] rounded-[var(--radius-lg)] flex items-center justify-center text-white font-[var(--font-serif)] font-normal text-xl tracking-[-0.02em] shadow-[0_4px_12px_rgba(0,66,37,0.25)]"
              style={{ background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)' }}
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
                    ? 'bg-[var(--maroon)] text-white cursor-pointer'
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
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border-none bg-[var(--error)] text-white font-[var(--font-sans)] font-semibold cursor-pointer"
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
                className="flex-1 p-3.5 rounded-[var(--radius-md)] border-none bg-[var(--masters)] text-white font-[var(--font-sans)] font-semibold cursor-pointer"
              >
                Exit Trip
              </button>
            </div>
          </Modal>
        )}

        {showAdminModal && (
          <Modal onClose={() => setShowAdminModal(false)}>
            <div className="w-14 h-14 rounded-full bg-[rgba(220,38,38,0.1)] flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-[#dc2626]" />
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
                    ? 'bg-[#dc2626] text-white cursor-pointer'
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
          className="py-[3px] px-2 rounded-[6px] text-white font-[var(--font-sans)] text-[0.6875rem] font-semibold uppercase tracking-[0.04em]"
          style={{ background: item.badgeColor || 'var(--masters)' }}
        >
          {item.badge}
        </span>
      )}
      {isLoading ? (
        <span className="font-[var(--font-sans)] text-[0.8125rem] text-[var(--ink-tertiary)]">
          Loading...
        </span>
      ) : item.external ? (
        <ExternalLink size={18} className="text-[var(--ink-tertiary)] shrink-0" />
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

  return (
    <button onClick={item.action} className={itemClassName} disabled={isLoading}>
      {content}
    </button>
  );
}

function Toggle({ enabled, color }: { enabled: boolean; color?: string }) {
  return (
    <div
      className="w-12 h-7 rounded-[14px] relative transition-colors duration-200 shrink-0"
      style={{ background: enabled ? color || 'var(--masters)' : 'var(--rule)' }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-6 h-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
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
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[100]"
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
