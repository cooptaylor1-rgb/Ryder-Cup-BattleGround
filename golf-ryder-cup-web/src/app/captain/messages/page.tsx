'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { AnnouncementComposer, AnnouncementHistory, type Announcement } from '@/components/captain';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useUIStore } from '@/lib/stores';
import { Home, MessageSquare, MoreHorizontal, Send } from 'lucide-react';

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

  // Note: we avoid auto-redirects here so we can render a clear empty-state instead.

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to send announcements."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Messages."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Messages"
        subtitle="Send announcements"
        onBack={() => router.back()}
        icon={<MessageSquare size={16} className="text-white" />}
        rightSlot={
          <button
            onClick={() => setShowComposer(true)}
            className="btn-premium flex items-center gap-[var(--space-2)] px-[var(--space-3)] py-[var(--space-2)]"
          >
            <Send size={16} />
            New
          </button>
        }
      />

      <main className="container-editorial">
        <section className="section">
          {showComposer ? (
            <div className="card p-[var(--space-5)]">
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
            <div className="card text-center p-[var(--space-8)]">
              <MessageSquare size={48} className="text-[var(--ink-tertiary)] mx-auto mb-[var(--space-4)]" />
              <h2 className="type-title-sm mb-[var(--space-2)]">
                No Messages Yet
              </h2>
              <p className="type-caption mb-[var(--space-4)]">
                Send announcements to keep everyone informed.
              </p>
              <button onClick={() => setShowComposer(true)} className="btn btn-primary">
                Send First Message
              </button>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
