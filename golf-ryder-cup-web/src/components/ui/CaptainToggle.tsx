/**
 * Captain Mode Toggle Component (P0-2)
 *
 * Header-mounted quick toggle for captain mode.
 * Eliminates navigation to "More" page for frequent captain operations.
 *
 * Features:
 * - Shield icon indicates captain status
 * - Tap to toggle (with PIN prompt for enable)
 * - Visual state: grayed = off, green = on
 */

'use client';

import { useState } from 'react';
import { Shield, ShieldCheck, X } from 'lucide-react';
import { useUIStore } from '@/lib/stores';

interface CaptainToggleProps {
    className?: string;
}

export function CaptainToggle({ className }: CaptainToggleProps) {
    const { isCaptainMode, enableCaptainMode, disableCaptainMode, captainPin } = useUIStore();
    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleToggle = () => {
        if (isCaptainMode) {
            disableCaptainMode();
        } else {
            // Show PIN modal to enable
            setShowPinModal(true);
            setPin('');
            setError('');
        }
    };

    const handleEnableCaptain = () => {
        if (pin.length < 4) {
            setError('PIN must be at least 4 digits');
            return;
        }

        // If there's an existing PIN, verify it; otherwise set new PIN
        if (captainPin && pin !== captainPin) {
            setError('Incorrect PIN');
            return;
        }

        enableCaptainMode(pin);
        setShowPinModal(false);
        setPin('');
    };

    return (
        <>
            <button
                onClick={handleToggle}
                className={`press-scale ${className || ''}`}
                style={{
                    padding: 'var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    background: isCaptainMode
                        ? 'rgba(var(--masters-rgb), 0.15)'
                        : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                aria-label={isCaptainMode ? 'Disable captain mode' : 'Enable captain mode'}
                title={isCaptainMode ? 'Captain Mode ON' : 'Enable Captain Mode'}
            >
                {isCaptainMode ? (
                    <ShieldCheck
                        size={20}
                        style={{ color: 'var(--masters)' }}
                        strokeWidth={2}
                    />
                ) : (
                    <Shield
                        size={20}
                        style={{ color: 'var(--ink-tertiary)' }}
                        strokeWidth={1.5}
                    />
                )}
            </button>

            {/* PIN Modal */}
            {showPinModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--space-4)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={() => setShowPinModal(false)}
                >
                    <div
                        style={{
                            background: 'var(--canvas)',
                            borderRadius: 'var(--radius-xl)',
                            padding: 'var(--space-6)',
                            width: '100%',
                            maxWidth: '320px',
                            boxShadow: 'var(--shadow-xl)',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Shield size={20} style={{ color: 'var(--masters)' }} />
                                <h3 className="type-title" style={{ margin: 0 }}>Captain Mode</h3>
                            </div>
                            <button
                                onClick={() => setShowPinModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 'var(--space-1)',
                                    color: 'var(--ink-tertiary)',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Description */}
                        <p className="type-caption" style={{ marginBottom: 'var(--space-4)', color: 'var(--ink-secondary)' }}>
                            {captainPin
                                ? 'Enter your captain PIN to unlock advanced controls.'
                                : 'Set a 4-digit PIN to enable captain mode. You\'ll need this PIN to re-enable captain mode later.'
                            }
                        </p>

                        {/* PIN Input */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <input
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={pin}
                                onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setPin(val);
                                    setError('');
                                }}
                                placeholder="Enter PIN"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-3) var(--space-4)',
                                    fontSize: 'var(--text-xl)',
                                    textAlign: 'center',
                                    letterSpacing: '0.5em',
                                    border: error ? '2px solid var(--error)' : '1px solid var(--rule)',
                                    borderRadius: 'var(--radius-lg)',
                                    background: 'var(--canvas-raised)',
                                    outline: 'none',
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        handleEnableCaptain();
                                    }
                                }}
                            />
                            {error && (
                                <p style={{ color: 'var(--error)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                onClick={() => setShowPinModal(false)}
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3)',
                                    background: 'var(--canvas-sunken)',
                                    border: '1px solid var(--rule)',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnableCaptain}
                                disabled={pin.length < 4}
                                className="btn-premium"
                                style={{
                                    flex: 1,
                                    padding: 'var(--space-3)',
                                    opacity: pin.length < 4 ? 0.5 : 1,
                                    cursor: pin.length < 4 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {captainPin ? 'Unlock' : 'Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CaptainToggle;
