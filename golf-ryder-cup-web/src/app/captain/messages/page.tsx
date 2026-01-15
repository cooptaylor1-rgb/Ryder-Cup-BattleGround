'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AnnouncementComposer, AnnouncementHistory, type Announcement } from '@/components/captain';
import {
  ChevronLeft,
  MessageSquare,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
  Send,
} from 'lucide-react';

/**
 * MESSAGES PAGE
 *
 * Send announcements and messages to trip participants.
 */

export default function MessagesPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  const handleSendAnnouncement = (data: Omit<Announcement, 'id' | 'createdAt' | 'sentAt' | 'author'>) => {
    const now = new Date().toISOString();
    const newAnnouncement: Announcement = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      sentAt: now,
      author: {
        name: 'Captain',
        role: 'captain',
      },
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setShowComposer(false);
    showToast('success', 'Announcement sent!');
  };

  if (!currentTrip || !isCaptainMode) {
    return null;
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)',
                }}
              >
                <MessageSquare size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Messages</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Send announcements
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowComposer(true)}
            className="btn-premium"
            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Send size={16} />
            New
          </button>
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          {showComposer ? (
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <AnnouncementComposer
                onSend={handleSendAnnouncement}
                onCancel={() => setShowComposer(false)}
                recipientCount={players.length}
                captainName="Captain"
              />
            </div>
          ) : announcements.length > 0 ? (
            <AnnouncementHistory
              announcements={announcements}
              onViewDetails={(ann) => {
                showToast('info', `Viewing: ${ann.title}`);
              }}
            />
          ) : (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <MessageSquare size={48} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-4)' }} />
              <h2 className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                No Messages Yet
              </h2>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Send announcements to keep everyone informed.
              </p>
              <button onClick={() => setShowComposer(true)} className="btn btn-primary">
                Send First Message
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
