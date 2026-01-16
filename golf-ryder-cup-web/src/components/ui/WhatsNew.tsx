/**
 * What's New Component
 *
 * Shows new features and updates to returning users.
 * Designed to educate users about capabilities they might have missed.
 *
 * Features:
 * - Modal overlay with feature highlights
 * - Progressive disclosure of features
 * - Remembers which updates have been seen
 * - One-tap dismissal
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Sparkles,
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
        'bg-black/40 backdrop-blur-sm',
        isExiting ? 'animate-fade-out' : 'animate-fade-in'
      )}
      onClick={handleDismiss}
    >
      <div
        className={cn(
          'w-full max-w-md rounded-2xl overflow-hidden shadow-xl',
          isExiting ? 'animate-slide-down' : 'animate-slide-up'
        )}
        style={{
          background: 'var(--canvas-raised)',
          border: '1px solid var(--stroke-light)',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative p-6 text-center"
          style={{
            background: 'linear-gradient(180deg, var(--masters) 0%, var(--masters-deep) 50%, var(--canvas-warm) 100%)',
          }}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full transition-colors"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'var(--cream)' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--cream)' }}
          >
            <Sparkles className="w-7 h-7" />
          </div>

          <h2
            className="text-xl font-semibold mb-1"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif", color: 'var(--cream)' }}
          >
            What&apos;s New
          </h2>
          <p
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            Check out the latest features and improvements
          </p>
        </div>

        {/* Features List */}
        <div
          className="p-4 space-y-2 overflow-y-auto"
          style={{ maxHeight: 'calc(85vh - 220px)', background: 'var(--canvas)' }}
        >
          {latestFeatures.map((feature, index) => (
            <div
              key={feature.id}
              className="flex items-start gap-3 p-3 rounded-xl transition-colors"
              style={{
                background: 'var(--canvas-raised)',
                border: '1px solid var(--stroke-light)',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  background: feature.isNew
                    ? 'linear-gradient(135deg, var(--masters-soft) 0%, var(--canvas-warm) 100%)'
                    : 'var(--canvas)',
                  color: feature.isNew ? 'var(--masters)' : 'var(--ink-tertiary)',
                  border: feature.isNew ? 'none' : '1px solid var(--stroke-light)',
                }}
              >
                {feature.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className="font-medium text-sm"
                    style={{ color: 'var(--ink)' }}
                  >
                    {feature.title}
                  </h3>
                  {feature.isNew && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        background: 'var(--masters)',
                        color: 'var(--cream)',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--ink-secondary)' }}
                >
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--stroke-light)', background: 'var(--canvas-raised)' }}>
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 press-scale"
            style={{
              background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
              color: 'var(--cream)',
              boxShadow: '0 4px 14px rgba(22, 101, 52, 0.3)',
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
      className="relative p-4 rounded-xl"
      style={{
        background: 'linear-gradient(135deg, var(--masters-soft) 0%, var(--canvas-warm) 100%)',
        border: '1px solid var(--stroke-light)',
      }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full transition-colors"
          style={{ color: 'var(--ink-tertiary)' }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'var(--masters)',
            color: 'var(--cream)',
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h3
            className="font-medium text-sm mb-1"
            style={{ color: 'var(--ink)' }}
          >
            {title}
          </h3>
          <p
            className="text-xs mb-3 leading-relaxed"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {description}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: 'var(--masters)' }}
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
