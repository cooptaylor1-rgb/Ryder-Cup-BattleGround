/**
 * What's New Component — Fried Egg Editorial
 *
 * Shows new features and updates to returning users.
 * Clean editorial design: serif headings, warm canvas,
 * rule dividers, overline labels.
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Tv,
  MessageCircle,
  CloudSun,
  Trophy,
  Camera,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface Feature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isNew?: boolean;
}

const latestFeatures: Feature[] = [
  {
    id: 'live-jumbotron',
    icon: <Tv className="w-5 h-5" />,
    title: 'Live Jumbotron View',
    description: 'Watch live scoring updates on a big screen. Perfect for the clubhouse!',
    isNew: true,
  },
  {
    id: 'weather-integration',
    icon: <CloudSun className="w-5 h-5" />,
    title: 'Course Weather',
    description: 'Real-time weather conditions for your course. Plan your rounds better.',
    isNew: true,
  },
  {
    id: 'photo-sharing',
    icon: <Camera className="w-5 h-5" />,
    title: 'Photo Sharing',
    description: 'Capture and share your best moments. Tag holes and players.',
    isNew: true,
  },
  {
    id: 'side-bets',
    icon: <Zap className="w-5 h-5" />,
    title: 'Side Bets & Skins',
    description: 'Track closest to pin, long drive, and Nassau bets with your group.',
  },
  {
    id: 'achievements',
    icon: <Trophy className="w-5 h-5" />,
    title: 'Awards & Achievements',
    description: 'Unlock special achievements and earn bragging rights.',
  },
  {
    id: 'group-chat',
    icon: <MessageCircle className="w-5 h-5" />,
    title: 'Group Chat',
    description: 'Stay connected with your group. Trash talk responsibly!',
  },
];

const STORAGE_KEY = 'ryder-whats-new-seen';
const CURRENT_VERSION = '2.0.0';

interface WhatsNewProps {
  onDismiss?: () => void;
  forceShow?: boolean;
}

export function WhatsNew({ onDismiss, forceShow = false }: WhatsNewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // Check if user has seen this version
    if (typeof window !== 'undefined') {
      const seenVersion = localStorage.getItem(STORAGE_KEY);
      if (seenVersion !== CURRENT_VERSION) {
        // Small delay for smoother UX
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [forceShow]);

  const handleDismiss = () => {
    setIsExiting(true);
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        isExiting ? 'animate-fade-out' : 'animate-fade-in'
      )}
      style={{ background: 'rgba(15, 13, 10, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={handleDismiss}
    >
      <div
        className={cn(
          'w-full max-w-md overflow-hidden',
          isExiting ? 'animate-slide-down' : 'animate-slide-up'
        )}
        style={{
          background: 'var(--canvas)',
          border: '1px solid var(--rule)',
          borderRadius: 'var(--radius-xl)',
          maxHeight: '85vh',
          boxShadow: '0 24px 48px rgba(15, 13, 10, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-6) var(--space-6) var(--space-5)',
            borderBottom: '1px solid var(--rule)',
            position: 'relative',
          }}
        >
          <button
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: 'var(--space-4)',
              right: 'var(--space-4)',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--ink-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <p
            className="type-overline"
            style={{
              letterSpacing: '0.15em',
              color: 'var(--masters)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Latest Updates
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
              fontWeight: 400,
              color: 'var(--ink)',
              lineHeight: 1.2,
            }}
          >
            What&apos;s New
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--ink-secondary)',
              marginTop: 'var(--space-1)',
            }}
          >
            Fresh features for the field
          </p>
        </div>

        {/* Features List */}
        <div
          style={{
            maxHeight: 'calc(85vh - 250px)',
            overflowY: 'auto',
          }}
        >
          {latestFeatures.map((feature, index) => (
            <div
              key={feature.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-6)',
                borderBottom: index < latestFeatures.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: feature.isNew ? 'var(--masters)' : 'var(--canvas-raised)',
                  color: feature.isNew ? 'var(--canvas)' : 'var(--ink-tertiary)',
                  border: feature.isNew ? 'none' : '1px solid var(--rule)',
                }}
              >
                {feature.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '2px' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--ink)',
                    }}
                  >
                    {feature.title}
                  </h3>
                  {feature.isNew && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase' as const,
                        background: 'var(--masters)',
                        color: 'var(--canvas)',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    color: 'var(--ink-secondary)',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--rule)',
          }}
        >
          <button
            onClick={handleDismiss}
            className="btn-premium press-scale"
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              background: 'var(--masters)',
              color: 'var(--canvas)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 77, 51, 0.25)',
            }}
          >
            Got it, let&apos;s go!
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact feature card for inline display
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function FeatureCard({
  icon,
  title,
  description,
  action,
  onDismiss,
}: FeatureCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--canvas-raised)',
        border: '1px solid var(--rule)',
      }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: 'var(--space-2)',
            right: 'var(--space-2)',
            padding: 'var(--space-1)',
            color: 'var(--ink-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <div
          style={{
            flexShrink: 0,
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--masters)',
            color: 'var(--canvas)',
          }}
        >
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingRight: 'var(--space-6)' }}>
          <h3
            style={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--ink)',
              marginBottom: 'var(--space-1)',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: 'var(--ink-secondary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {description}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--masters)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {action.label}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage What's New visibility
 */
export function useWhatsNew() {
  const [hasSeenUpdate, setHasSeenUpdate] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seenVersion = localStorage.getItem(STORAGE_KEY);
      setHasSeenUpdate(seenVersion === CURRENT_VERSION);
    }
  }, []);

  const markAsSeen = () => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setHasSeenUpdate(true);
  };

  const resetSeen = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSeenUpdate(false);
  };

  return { hasSeenUpdate, markAsSeen, resetSeen };
}

export default WhatsNew;
