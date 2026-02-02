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

/**
 * MORE PAGE — Redesigned Hub
 *
 * Clean, organized access to all features, settings, and account management.
 * Groups related items together with clear visual hierarchy.
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
    <div
      className="pb-nav page-premium-enter"
      style={{ minHeight: '100vh', background: 'var(--canvas)' }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--canvas)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-secondary)',
              borderRadius: '8px',
            }}
          >
            <ChevronLeft size={20} />
          </button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>More</h1>
        </div>
      </header>

      <main style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* Account Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface-card)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '24px',
            border: '1px solid var(--rule)',
          }}
        >
          {isAuthenticated && currentUser ? (
            <Link
              href="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >
                {currentUser.firstName?.[0] || '?'}
                {currentUser.lastName?.[0] || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
                  {currentUser.email}
                </p>
              </div>
              <ChevronRight size={20} style={{ color: 'var(--ink-tertiary)' }} />
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href="/login"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--masters)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={18} />
                Sign In
              </Link>
              <Link
                href="/profile/create"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink-primary)',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
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
            style={{
              background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              color: 'white',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}
            >
              <div>
                <p style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '4px' }}>
                  CURRENT TRIP
                </p>
                <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>{currentTrip.name}</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '4px' }}>
                  {new Date(currentTrip.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  –{' '}
                  {new Date(currentTrip.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowExitTripConfirm(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <LogOut size={14} />
                Exit
              </button>
            </div>
          </motion.div>
        )}

        {/* Captain Mode Quick Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => (isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true))}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: isCaptainMode ? 'var(--masters-subtle)' : 'var(--surface-card)',
            border: isCaptainMode ? '2px solid var(--masters)' : '1px solid var(--rule)',
            borderRadius: '16px',
            marginBottom: '12px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isCaptainMode ? 'var(--masters)' : 'var(--surface-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCaptainMode ? 'white' : 'var(--ink-secondary)',
            }}
          >
            {isCaptainMode ? <Unlock size={22} /> : <Lock size={22} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>Captain Mode</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              {isCaptainMode ? 'Enabled — Full editing access' : 'Tap to unlock editing'}
            </p>
          </div>
          <Toggle enabled={isCaptainMode} />
        </motion.button>

        {/* Admin Mode Quick Toggle */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => (isAdminMode ? disableAdminMode() : setShowAdminModal(true))}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: isAdminMode ? 'rgba(220, 38, 38, 0.1)' : 'var(--surface-card)',
            border: isAdminMode ? '2px solid #dc2626' : '1px solid var(--rule)',
            borderRadius: '16px',
            marginBottom: '24px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: isAdminMode ? '#dc2626' : 'var(--surface-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAdminMode ? 'white' : 'var(--ink-secondary)',
            }}
          >
            <Shield size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: isAdminMode ? '#dc2626' : 'var(--ink-primary)' }}>
              Admin Mode
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              {isAdminMode ? 'Enabled — Data management access' : 'Delete trips & manage data'}
            </p>
          </div>
          <Toggle enabled={isAdminMode} color={isAdminMode ? '#dc2626' : undefined} />
        </motion.button>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.id] ?? true;
          const filteredItems = section.items.filter(
            (item) =>
              (!item.requiresTrip || currentTrip) && (!item.requiresCaptain || isCaptainMode)
          );

          if (filteredItems.length === 0) return null;

          return (
            <motion.section
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + sectionIndex * 0.05 }}
              style={{ marginBottom: '24px' }}
            >
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                <h2
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--ink-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {section.title}
                </h2>
                <ChevronDown
                  size={16}
                  style={{
                    color: 'var(--ink-tertiary)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        background: 'var(--surface-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--rule)',
                        overflow: 'hidden',
                      }}
                    >
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
        })}

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            background: 'var(--surface-card)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid var(--rule)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(0, 66, 37, 0.3)',
              }}
            >
              RC
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>Golf Ryder Cup</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>Version 1.1.0</p>
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
            Offline-first match play scoring for your Ryder Cup format golf trip. Track scores,
            manage lineups, and celebrate with friends.
          </p>
          <div
            style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--rule)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--ink-tertiary)',
              fontSize: '0.75rem',
            }}
          >
            <Heart size={14} style={{ color: 'var(--error)' }} />
            Made with love for golf
          </div>
        </motion.section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showCaptainModal && (
          <Modal onClose={() => setShowCaptainModal(false)}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Enable Captain Mode
            </h2>
            <p
              style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginBottom: '20px' }}
            >
              Enter a PIN to unlock captain features like editing lineups and managing players.
            </p>
            <input
              type="password"
              value={captainPin}
              onChange={(e) => setCaptainPin(e.target.value)}
              placeholder="Enter 4+ digit PIN"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--rule)',
                background: 'var(--surface-raised)',
                color: 'var(--ink-primary)',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowCaptainModal(false);
                  setCaptainPin('');
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rule)',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEnableCaptainMode}
                disabled={captainPin.length < 4}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: captainPin.length >= 4 ? 'var(--masters)' : 'var(--rule)',
                  color: captainPin.length >= 4 ? 'white' : 'var(--ink-tertiary)',
                  fontWeight: 600,
                  cursor: captainPin.length >= 4 ? 'pointer' : 'not-allowed',
                }}
              >
                Enable
              </button>
            </div>
          </Modal>
        )}

        {showClearConfirm && (
          <Modal onClose={() => setShowClearConfirm(false)}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--error-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Trash2 size={28} style={{ color: 'var(--error)' }} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '8px',
              }}
            >
              Clear All Data?
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--ink-secondary)',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              This will permanently delete all trips, players, matches, and scores. This cannot be
              undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rule)',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--error)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
            </div>
          </Modal>
        )}

        {showExitTripConfirm && (
          <Modal onClose={() => setShowExitTripConfirm(false)}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              Exit Trip?
            </h2>
            <p
              style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', marginBottom: '20px' }}
            >
              You&apos;ll return to the trip selector. Your data is saved and you can return
              anytime.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowExitTripConfirm(false)}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rule)',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExitTrip}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--masters)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Exit Trip
              </button>
            </div>
          </Modal>
        )}

        {showAdminModal && (
          <Modal onClose={() => setShowAdminModal(false)}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Shield size={28} style={{ color: '#dc2626' }} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                marginBottom: '8px',
                textAlign: 'center',
              }}
            >
              Enable Admin Mode
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--ink-secondary)',
                marginBottom: '20px',
                textAlign: 'center',
              }}
            >
              Admin mode allows you to delete trips, clean up data, and access advanced management
              features.
            </p>
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Enter 4+ digit PIN"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '1rem',
                borderRadius: '12px',
                border: '1px solid var(--rule)',
                background: 'var(--surface-raised)',
                color: 'var(--ink-primary)',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminPin('');
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rule)',
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEnableAdminMode}
                disabled={adminPin.length < 4}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: adminPin.length >= 4 ? '#dc2626' : 'var(--rule)',
                  color: adminPin.length >= 4 ? 'white' : 'var(--ink-tertiary)',
                  fontWeight: 600,
                  cursor: adminPin.length >= 4 ? 'pointer' : 'not-allowed',
                }}
              >
                Enable
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
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
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: item.destructive ? 'var(--error-subtle)' : 'var(--surface-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: item.destructive ? 'var(--error)' : 'var(--ink-secondary)',
          flexShrink: 0,
        }}
      >
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 500,
            color: item.destructive ? 'var(--error)' : 'var(--ink-primary)',
          }}
        >
          {item.label}
        </p>
        {item.description && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--ink-tertiary)',
              marginTop: '2px',
            }}
          >
            {item.description}
          </p>
        )}
      </div>
      {item.badge && (
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            background: item.badgeColor || 'var(--masters)',
            color: 'white',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {item.badge}
        </span>
      )}
      {isLoading ? (
        <span style={{ fontSize: '0.8125rem', color: 'var(--ink-tertiary)' }}>Loading…</span>
      ) : item.external ? (
        <ExternalLink size={18} style={{ color: 'var(--ink-tertiary)' }} />
      ) : item.href ? (
        <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
      ) : null}
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    width: '100%',
    textAlign: 'left',
    textDecoration: 'none',
    color: 'inherit',
    background: 'transparent',
    border: 'none',
    borderBottom: isLast ? 'none' : '1px solid var(--rule)',
    cursor: 'pointer',
  };

  if (item.href) {
    return (
      <Link href={item.href} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={item.action} style={style} disabled={isLoading}>
      {content}
    </button>
  );
}

function Toggle({ enabled, color }: { enabled: boolean; color?: string }) {
  return (
    <div
      style={{
        width: '48px',
        height: '28px',
        borderRadius: '14px',
        background: enabled ? color || 'var(--masters)' : 'var(--rule)',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          position: 'absolute',
          top: '2px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-card)',
          borderRadius: '20px',
          padding: '24px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
