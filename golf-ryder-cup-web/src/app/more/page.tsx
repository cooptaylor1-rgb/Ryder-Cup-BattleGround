'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore, useAuthStore } from '@/lib/stores';
import { seedDemoData, clearDemoData } from '@/lib/db/seed';
import {
    Users,
    MapPin,
    Shield,
    Vibrate,
    Database,
    Trash2,
    ChevronRight,
    LogOut,
    Lock,
    Unlock,
    Home,
    Target,
    Trophy,
    MoreHorizontal,
    ChevronLeft,
    X,
    User,
    LogIn,
    CalendarDays,
} from 'lucide-react';

/**
 * MORE PAGE - Settings & Data
 *
 * Editorial design with clean toggles and action rows
 */

export default function MorePage() {
    const router = useRouter();
    const { currentTrip, loadTrip, clearTrip } = useTripStore();
    const { currentUser, isAuthenticated } = useAuthStore();
    const {
        isCaptainMode,
        enableCaptainMode,
        disableCaptainMode,
        scoringPreferences,
        updateScoringPreference,
        showToast,
    } = useUIStore();

    const [showCaptainModal, setShowCaptainModal] = useState(false);
    const [captainPin, setCaptainPin] = useState('');
    const [isSeeding, setIsSeeding] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showExitTripConfirm, setShowExitTripConfirm] = useState(false);

    const handleEnableCaptainMode = () => {
        if (captainPin.length >= 4) {
            enableCaptainMode(captainPin);
            setShowCaptainModal(false);
            setCaptainPin('');
            showToast('success', 'Captain mode enabled');
        }
    };

    const handleSeedData = async () => {
        setIsSeeding(true);
        try {
            const tripId = await seedDemoData();
            await loadTrip(tripId);
            showToast('success', 'Demo data loaded');
        } catch (error) {
            console.error('Failed to seed data:', error);
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
            showToast('info', 'Data cleared');
            router.push('/');
        } catch (error) {
            console.error('Failed to clear data:', error);
            showToast('error', 'Could not clear data');
        }
    };

    const handleExitTrip = () => {
        clearTrip();
        setShowExitTripConfirm(false);
        router.push('/');
    };

    return (
        <div className="pb-nav page-premium-enter texture-grain" style={{ minHeight: '100vh', background: 'var(--canvas)' }}>
            {/* Premium Header */}
            <header className="header-premium">
                <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <button onClick={() => router.back()} className="press-scale" style={{ padding: 'var(--space-1)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-secondary)' }} aria-label="Back">
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: 'var(--shadow-glow-green)',
                            }}
                        >
                            <MoreHorizontal size={16} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <span className="type-overline" style={{ letterSpacing: '0.1em' }}>More</span>
                    </div>
                </div>
            </header>

            <main className="container-editorial">
                {/* Account Section */}
                <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Account</h2>
                    {isAuthenticated && currentUser ? (
                        <Link href="/profile" className="match-row">
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-full)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--masters)',
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                }}
                            >
                                {currentUser.firstName?.[0] || '?'}{currentUser.lastName?.[0] || '?'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 500 }}>{currentUser.firstName} {currentUser.lastName}</p>
                                <p className="type-meta">{currentUser.email}</p>
                            </div>
                            <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="match-row">
                                <LogIn size={18} style={{ color: 'var(--masters)' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>Sign In</p>
                                    <p className="type-meta">Access your profile and sync data</p>
                                </div>
                                <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                            </Link>
                            <Link href="/profile/create" className="match-row">
                                <User size={18} style={{ color: 'var(--ink-tertiary)' }} />
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500 }}>Create Profile</p>
                                    <p className="type-meta">Set up your golf profile for trips</p>
                                </div>
                                <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                            </Link>
                        </>
                    )}
                </section>

                <hr className="divider" />

                {/* Current Trip */}
                {currentTrip && (
                    <section className="section" style={{ paddingTop: 'var(--space-6)' }}>
                        <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Current Trip</h2>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <p style={{ fontWeight: 500 }}>{currentTrip.name}</p>
                                <p className="type-meta">
                                    {new Date(currentTrip.startDate).toLocaleDateString()} – {new Date(currentTrip.endDate).toLocaleDateString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExitTripConfirm(true)}
                                className="type-meta"
                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                <LogOut size={14} />
                                Exit
                            </button>
                        </div>
                    </section>
                )}

                {currentTrip && <hr className="divider" />}

                {/* Captain Mode */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Captain Mode</h2>
                    <button
                        onClick={() => isCaptainMode ? disableCaptainMode() : setShowCaptainModal(true)}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        {isCaptainMode ? <Unlock size={18} /> : <Lock size={18} />}
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500 }}>Captain Mode</p>
                            <p className="type-meta">{isCaptainMode ? 'Enabled – can edit lineups' : 'Disabled – view only'}</p>
                        </div>
                        <Toggle enabled={isCaptainMode} />
                    </button>

                    {/* Captain Command Center Link */}
                    {isCaptainMode && currentTrip && (
                        <Link href="/captain" className="match-row mt-2">
                            <Shield size={18} style={{ color: 'var(--masters)' }} />
                            <div className="flex-1">
                                <p style={{ fontWeight: 500 }}>Captain Command Center</p>
                                <p className="type-meta">Manage lineups, attendance, and more</p>
                            </div>
                            <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        </Link>
                    )}
                </section>

                <hr className="divider" />

                {/* Manage */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Manage</h2>
                    <Link href="/players" className="match-row">
                        <Users size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <span style={{ flex: 1 }}>Players</span>
                        <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                    </Link>
                    <Link href="/courses" className="match-row">
                        <MapPin size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <span style={{ flex: 1 }}>Courses</span>
                        <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                    </Link>
                </section>

                <hr className="divider" />

                {/* Scoring Preferences */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Scoring</h2>

                    <button
                        onClick={() => updateScoringPreference('hapticFeedback', !scoringPreferences.hapticFeedback)}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        <Vibrate size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500 }}>Haptic Feedback</p>
                            <p className="type-meta">Vibrate on score entry</p>
                        </div>
                        <Toggle enabled={scoringPreferences.hapticFeedback} />
                    </button>

                    <button
                        onClick={() => updateScoringPreference('autoAdvance', !scoringPreferences.autoAdvance)}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500 }}>Auto-Advance</p>
                            <p className="type-meta">Move to next hole after scoring</p>
                        </div>
                        <Toggle enabled={scoringPreferences.autoAdvance} />
                    </button>

                    <button
                        onClick={() => updateScoringPreference('confirmCloseout', !scoringPreferences.confirmCloseout)}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        <Shield size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500 }}>Confirm Match End</p>
                            <p className="type-meta">Ask before recording closeout</p>
                        </div>
                        <Toggle enabled={scoringPreferences.confirmCloseout} />
                    </button>
                </section>

                <hr className="divider" />

                {/* Data */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Data</h2>

                    <button
                        onClick={handleSeedData}
                        disabled={isSeeding}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        <Database size={18} style={{ color: 'var(--ink-tertiary)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500 }}>Load Demo Data</p>
                            <p className="type-meta">Create sample trip with players</p>
                        </div>
                        {isSeeding && <span className="type-meta">Loading…</span>}
                    </button>

                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="match-row"
                        style={{ width: '100%', textAlign: 'left' }}
                    >
                        <Trash2 size={18} style={{ color: 'var(--error)' }} />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 500, color: 'var(--error)' }}>Clear All Data</p>
                            <p className="type-meta">Delete everything and start fresh</p>
                        </div>
                    </button>
                </section>

                <hr className="divider" />

                {/* About */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>About</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--masters)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '18px'
                        }}>
                            RC
                        </div>
                        <div>
                            <p style={{ fontWeight: 500 }}>Golf Ryder Cup App</p>
                            <p className="type-meta">Version 1.0.0</p>
                        </div>
                    </div>
                    <p className="type-meta" style={{ marginTop: 'var(--space-3)' }}>
                        Offline-first match play scoring for your Ryder Cup format golf trip.
                    </p>
                </section>
            </main>

            {/* Bottom Navigation */}
            <nav className="nav-premium bottom-nav">
                <Link href="/" className="nav-item">
                    <Home size={20} />
                    <span>Home</span>
                </Link>
                <Link href="/schedule" className="nav-item">
                    <CalendarDays size={20} />
                    <span>Schedule</span>
                </Link>
                <Link href="/score" className="nav-item">
                    <Target size={20} />
                    <span>Score</span>
                </Link>
                <Link href="/matchups" className="nav-item">
                    <Users size={20} />
                    <span>Matches</span>
                </Link>
                <Link href="/standings" className="nav-item">
                    <Trophy size={20} />
                    <span>Standings</span>
                </Link>
                <Link href="/more" className="nav-item nav-item-active">
                    <MoreHorizontal size={20} />
                    <span>More</span>
                </Link>
            </nav>

            {/* Captain Mode Modal */}
            {showCaptainModal && (
                <div className="modal-backdrop" onClick={() => setShowCaptainModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                            <h2 className="type-headline">Enable Captain Mode</h2>
                            <button onClick={() => setShowCaptainModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                <X size={20} style={{ color: 'var(--ink-tertiary)' }} />
                            </button>
                        </div>
                        <p className="type-meta" style={{ marginBottom: 'var(--space-4)' }}>
                            Enter a PIN to unlock captain features like editing lineups and managing players.
                        </p>
                        <input
                            type="password"
                            value={captainPin}
                            onChange={(e) => setCaptainPin(e.target.value)}
                            placeholder="Enter 4+ digit PIN"
                            autoFocus
                            className="input"
                            style={{ marginBottom: 'var(--space-4)' }}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                onClick={() => { setShowCaptainModal(false); setCaptainPin(''); }}
                                className="btn btn-secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnableCaptainMode}
                                disabled={captainPin.length < 4}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                            >
                                Enable
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Data Confirmation */}
            {showClearConfirm && (
                <div className="modal-backdrop" onClick={() => setShowClearConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="type-headline" style={{ marginBottom: 'var(--space-3)' }}>Clear All Data?</h2>
                        <p className="type-body" style={{ marginBottom: 'var(--space-4)' }}>
                            This will permanently delete all trips, players, matches, and scores. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button onClick={handleClearData} className="btn btn-danger" style={{ flex: 1 }}>
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Trip Confirmation */}
            {showExitTripConfirm && (
                <div className="modal-backdrop" onClick={() => setShowExitTripConfirm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="type-headline" style={{ marginBottom: 'var(--space-3)' }}>Exit Trip?</h2>
                        <p className="type-body" style={{ marginBottom: 'var(--space-4)' }}>
                            You&apos;ll be taken back to the trip selector. Your data will be saved and you can return to this trip anytime.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button onClick={() => setShowExitTripConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button onClick={handleExitTrip} className="btn btn-primary" style={{ flex: 1 }}>
                                Exit Trip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Toggle Switch Component */
function Toggle({ enabled }: { enabled: boolean }) {
    return (
        <div
            style={{
                width: '44px',
                height: '26px',
                borderRadius: '13px',
                background: enabled ? 'var(--masters)' : 'var(--rule)',
                position: 'relative',
                transition: 'background var(--duration) var(--ease)',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '3px',
                    left: enabled ? '21px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left var(--duration) var(--ease)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
            />
        </div>
    );
}
