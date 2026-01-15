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
        'fixed inset-0 z-50 flex items-end justify-center',
        'bg-black/60 backdrop-blur-sm',
        isExiting ? 'animate-fade-out' : 'animate-fade-in'
      )}
      onClick={handleDismiss}
    >
      <div
        className={cn(
          'w-full max-w-lg mx-4 mb-4 rounded-2xl overflow-hidden',
          isExiting ? 'animate-slide-down' : 'animate-slide-up'
        )}
        style={{
          background: 'var(--surface, #1A1814)',
          border: '1px solid var(--rule, #3A3530)',
          maxHeight: '80vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative p-6 text-center"
          style={{
            background: 'linear-gradient(180deg, var(--masters, #006747) 0%, transparent 100%)',
          }}
        >
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full transition-colors bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>

          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-white/15"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--ink, #F5F1E8)' }}
          >
            What's New
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            Check out the latest features and improvements
          </p>
        </div>

        {/* Features List */}
        <div
          className="p-4 space-y-2 overflow-y-auto"
          style={{ maxHeight: 'calc(80vh - 200px)' }}
        >
          {latestFeatures.map((feature, index) => (
            <div
              key={feature.id}
              className="flex items-start gap-4 p-4 rounded-xl transition-colors"
              style={{
                background: 'var(--surface-raised, #1E1C18)',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: feature.isNew
                    ? 'rgba(0, 103, 71, 0.2)'
                    : 'var(--surface, #1A1814)',
                  color: feature.isNew ? 'var(--masters, #006747)' : 'var(--ink-secondary, #B8B0A0)',
                }}
              >
                {feature.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className="font-semibold text-sm"
                    style={{ color: 'var(--ink, #F5F1E8)' }}
                  >
                    {feature.title}
                  </h3>
                  {feature.isNew && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        background: 'var(--masters, #006747)',
                        color: 'white',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                <p
                  className="text-xs"
                  style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
                >
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--rule, #3A3530)' }}>
          <button
            onClick={handleDismiss}
            className="w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'var(--masters, #006747)',
              color: 'white',
            }}
          >
            Got it, let's go!
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
        background: 'linear-gradient(135deg, rgba(0,103,71,0.15) 0%, rgba(0,103,71,0.05) 100%)',
        border: '1px solid rgba(0,103,71,0.3)',
      }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full transition-colors"
          style={{ color: 'var(--ink-tertiary, #807868)' }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(0,103,71,0.2)',
            color: 'var(--masters, #006747)',
          }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h3
            className="font-semibold text-sm mb-1"
            style={{ color: 'var(--ink, #F5F1E8)' }}
          >
            {title}
          </h3>
          <p
            className="text-xs mb-3"
            style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
          >
            {description}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: 'var(--masters, #006747)' }}
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
