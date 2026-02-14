/**
 * Announcement System Component
 *
 * Captain-to-players broadcast messaging system:
 * - Create and send announcements
 * - View announcement history
 * - Quick templates for common announcements
 * - Delivery status tracking
 *
 * Features:
 * - Rich text announcements
 * - Priority levels (normal/urgent)
 * - Template shortcuts
 * - Read receipts (conceptual)
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Megaphone,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Users,
  Calendar,
  Trophy,
  Cloud,
  MapPin,
  Zap,
  Bell,
  MessageCircle,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type AnnouncementPriority = 'normal' | 'urgent';
export type AnnouncementCategory = 'general' | 'schedule' | 'lineup' | 'weather' | 'results';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  createdAt: string;
  sentAt?: string;
  readCount?: number;
  totalRecipients?: number;
  author: {
    name: string;
    role: 'captain';
  };
}

export interface AnnouncementTemplate {
  id: string;
  name: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  icon: React.ReactNode;
}

interface AnnouncementComposerProps {
  onSend: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'sentAt' | 'author'>) => void;
  onCancel?: () => void;
  recipientCount?: number;
  captainName?: string;
  className?: string;
}

interface AnnouncementHistoryProps {
  announcements: Announcement[];
  onViewDetails?: (announcement: Announcement) => void;
  className?: string;
}

// ============================================
// TEMPLATES
// ============================================

const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: 'lineup-posted',
    name: 'Lineup Posted',
    title: 'Lineups Are Posted!',
    message: "Check the app to see tomorrow's pairings. Good luck everyone!",
    category: 'lineup',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'tee-times',
    name: 'Tee Times',
    title: 'Tee Times Reminder',
    message: 'First group tees off at [TIME]. Please arrive 30 minutes early for warm-up.',
    category: 'schedule',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: 'weather-update',
    name: 'Weather Update',
    title: 'Weather Advisory',
    message: 'Weather conditions may affect play today. Stay tuned for updates.',
    category: 'weather',
    icon: <Cloud className="w-5 h-5" />,
  },
  {
    id: 'session-complete',
    name: 'Session Results',
    title: 'Session Complete!',
    message: 'All matches are in. Check standings for the latest scores.',
    category: 'results',
    icon: <Trophy className="w-5 h-5" />,
  },
  {
    id: 'location-change',
    name: 'Location Change',
    title: 'Location Update',
    message: 'There has been a change to our meeting location. Please check the details.',
    category: 'general',
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    id: 'urgent',
    name: 'Urgent Notice',
    title: 'Urgent: Please Read',
    message: '[Your urgent message here]',
    category: 'general',
    icon: <AlertCircle className="w-5 h-5" />,
  },
];

// ============================================
// ANNOUNCEMENT COMPOSER
// ============================================

export function AnnouncementComposer({
  onSend,
  onCancel,
  recipientCount = 0,
  captainName = 'Captain',
  className,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [category, setCategory] = useState<AnnouncementCategory>('general');
  const [showTemplates, setShowTemplates] = useState(true);

  const canSend = title.trim().length > 0 && message.trim().length > 0;

  const handleSelectTemplate = useCallback((template: AnnouncementTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
    setCategory(template.category);
    setShowTemplates(false);
  }, []);

  const handleSend = useCallback(() => {
    if (!canSend) return;

    onSend({
      title: title.trim(),
      message: message.trim(),
      priority,
      category,
    });

    // Reset form
    setTitle('');
    setMessage('');
    setPriority('normal');
    setCategory('general');
    setShowTemplates(true);
  }, [title, message, priority, category, canSend, onSend]);

  return (
    <div
      className={cn('rounded-2xl overflow-hidden', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--rule)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--masters)', color: 'white' }}
          >
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              New Announcement
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              {recipientCount} player{recipientCount !== 1 ? 's' : ''} will receive this
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 rounded-lg"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="p-4" style={{ borderBottom: '1px solid var(--rule)' }}>
          <p
            className="text-xs font-medium uppercase tracking-wide mb-3"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            Quick Templates
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
            {ANNOUNCEMENT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors"
                style={{
                  background: 'var(--surface-raised)',
                  color: 'var(--ink-secondary)',
                }}
              >
                {template.icon}
                <span className="text-sm font-medium">{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Priority Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setPriority('normal')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
            )}
            style={{
              background: priority === 'normal' ? 'var(--masters)' : 'var(--surface-raised)',
              color: priority === 'normal' ? 'white' : 'var(--ink-secondary)',
            }}
          >
            Normal
          </button>
          <button
            onClick={() => setPriority('urgent')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
            )}
            style={{
              background: priority === 'urgent' ? 'var(--error)' : 'var(--surface-raised)',
              color: priority === 'urgent' ? 'white' : 'var(--ink-secondary)',
            }}
          >
            <Zap className="w-4 h-4" />
            Urgent
          </button>
        </div>

        {/* Title */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--ink)' }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title..."
            className="w-full px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
            }}
          />
        </div>

        {/* Message */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--ink)' }}
          >
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--ink)',
              border: '1px solid var(--rule)',
            }}
          />
        </div>

        {/* Preview */}
        {canSend && (
          <div
            className="p-4 rounded-xl"
            style={{
              background: priority === 'urgent' ? 'var(--error)' : 'var(--masters)',
              color: 'white',
            }}
          >
            <p className="text-xs font-medium uppercase tracking-wide mb-1 opacity-80">
              Preview
            </p>
            <p className="font-bold">{title}</p>
            <p className="text-sm mt-1 opacity-90">{message}</p>
            <p className="text-xs mt-2 opacity-70">
              — {captainName}
            </p>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          style={{
            background: canSend ? 'var(--masters)' : 'var(--surface-raised)',
            color: canSend ? 'white' : 'var(--ink-tertiary)',
          }}
        >
          <Send className="w-5 h-5" />
          Send Announcement
        </button>
      </div>
    </div>
  );
}

// ============================================
// ANNOUNCEMENT HISTORY
// ============================================

export function AnnouncementHistory({
  announcements,
  onViewDetails,
  className,
}: AnnouncementHistoryProps) {
  if (announcements.length === 0) {
    return (
      <div
        className={cn('p-8 rounded-2xl text-center', className)}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--rule)',
        }}
      >
        <Megaphone
          className="w-12 h-12 mx-auto mb-3"
          style={{ color: 'var(--ink-tertiary)' }}
        />
        <p style={{ color: 'var(--ink-secondary)' }}>
          No announcements yet
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          Send your first announcement to keep everyone informed
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {announcements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onClick={() => onViewDetails?.(announcement)}
        />
      ))}
    </div>
  );
}

// ============================================
// ANNOUNCEMENT CARD
// ============================================

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
}

function AnnouncementCard({ announcement, onClick }: AnnouncementCardProps) {
  const categoryIcons: Record<AnnouncementCategory, React.ReactNode> = {
    general: <MessageCircle className="w-5 h-5" />,
    schedule: <Calendar className="w-5 h-5" />,
    lineup: <Users className="w-5 h-5" />,
    weather: <Cloud className="w-5 h-5" />,
    results: <Trophy className="w-5 h-5" />,
  };

  const isUrgent = announcement.priority === 'urgent';
  const timeSent = announcement.sentAt
    ? formatRelativeTime(announcement.sentAt)
    : 'Draft';

  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-xl text-left transition-all active:scale-[0.98]"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isUrgent ? 'var(--error)' : 'var(--rule)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isUrgent ? 'var(--error)' : 'var(--surface-raised)',
            color: isUrgent ? 'white' : 'var(--masters)',
          }}
        >
          {categoryIcons[announcement.category]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {isUrgent && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-1"
                  style={{ background: 'var(--error)', color: 'white' }}
                >
                  <Zap className="w-3 h-3" />
                  Urgent
                </span>
              )}
              <p
                className="font-semibold"
                style={{ color: 'var(--ink)' }}
              >
                {announcement.title}
              </p>
            </div>
            <span
              className="text-xs whitespace-nowrap"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              {timeSent}
            </span>
          </div>

          <p
            className="text-sm mt-1 line-clamp-2"
            style={{ color: 'var(--ink-secondary)' }}
          >
            {announcement.message}
          </p>

          {announcement.readCount !== undefined && announcement.totalRecipients !== undefined && (
            <div
              className="flex items-center gap-2 mt-2 text-xs"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>
                {announcement.readCount}/{announcement.totalRecipients} read
              </span>
            </div>
          )}
        </div>

        <ChevronRight
          className="w-5 h-5 shrink-0"
          style={{ color: 'var(--ink-tertiary)' }}
        />
      </div>
    </button>
  );
}

// ============================================
// ANNOUNCEMENT BANNER (for players)
// ============================================

interface AnnouncementBannerProps {
  announcement: Announcement;
  onDismiss?: () => void;
  onView?: () => void;
  className?: string;
}

export function AnnouncementBanner({
  announcement,
  onDismiss,
  onView,
  className,
}: AnnouncementBannerProps) {
  const isUrgent = announcement.priority === 'urgent';

  return (
    <div
      className={cn('p-4 rounded-2xl', className)}
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, var(--error) 0%, #B91C1C 100%)'
          : 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[color:var(--canvas-raised)]/20 backdrop-blur-sm flex items-center justify-center">
          {isUrgent ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <Bell className="w-5 h-5 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-white">{announcement.title}</p>
          <p className="text-sm text-white/80 mt-1">{announcement.message}</p>
          <p className="text-xs text-white/60 mt-2">
            — {announcement.author.name} • {formatRelativeTime(announcement.createdAt)}
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg bg-[color:var(--canvas-raised)]/20 text-white transition-colors hover:bg-[color:var(--canvas-raised)]/30"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {onView && (
        <button
          onClick={onView}
          className="w-full mt-3 py-2 rounded-xl bg-[color:var(--canvas-raised)]/20 text-white text-sm font-medium transition-colors hover:bg-[color:var(--canvas-raised)]/30"
        >
          View Details
        </button>
      )}
    </div>
  );
}

// ============================================
// QUICK ANNOUNCEMENT MODAL
// ============================================

interface QuickAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'sentAt' | 'author'>) => void;
  recipientCount?: number;
  captainName?: string;
}

export function QuickAnnouncementModal({
  isOpen,
  onClose,
  onSend,
  recipientCount,
  captainName,
}: QuickAnnouncementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto">
        <AnnouncementComposer
          onSend={(announcement) => {
            onSend(announcement);
            onClose();
          }}
          onCancel={onClose}
          recipientCount={recipientCount}
          captainName={captainName}
        />
      </div>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default AnnouncementComposer;
