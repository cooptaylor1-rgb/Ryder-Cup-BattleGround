'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { uiLogger } from '@/lib/utils/logger';
import { NoMessagesEmpty } from '@/components/ui';
import {
  ChevronLeft,
  Home,
  Target,
  Users,
  Trophy,
  MoreHorizontal,
  MessageCircle,
  Camera,
  Send,
  Smile,
  Image as ImageIcon,
  Flame,
  CalendarDays,
} from 'lucide-react';
import type { Player, BanterPost } from '@/lib/types/models';

/**
 * SOCIAL PAGE — Trash Talk & Team Banter
 *
 * The social hub for your golf trip. Talk smack,
 * celebrate wins, and keep the competition fun!
 */

export default function SocialPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { showToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Get real banter posts from database
  const banterPosts = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.banterPosts
        .where('tripId')
        .equals(currentTrip.id)
        .reverse()
        .sortBy('timestamp');
    },
    [currentTrip?.id],
    []
  );

  const getPlayer = (id: string): Player | undefined => {
    return players.find(p => p.id === id);
  };

  const handleSend = async () => {
    if (!message.trim() || !currentTrip) return;

    // Get first player as default author (in real app, would use auth context)
    const author = players[0];

    if (!author) {
      showToast('error', 'Unable to post: No player profile found');
      return;
    }

    const newPost: BanterPost = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      content: message,
      authorId: author.id,
      authorName: `${author.firstName} ${author.lastName}`,
      postType: 'message',
      timestamp: new Date().toISOString(),
    };

    try {
      await db.banterPosts.add(newPost);
      setMessage('');
    } catch (error) {
      uiLogger.error('Failed to post message:', error);
      showToast('error', 'Failed to post message. Please try again.');
    }
  };

  const quickReactions = ['🔥', '👏', '😂', '💪', '⛳', '🎯'];

  if (!currentTrip) {
    return (
      <main className="page-container">
        <header className="header-premium">
          <h1 className="type-h2">Team Banter</h1>
        </header>
        <div className="content-area">
          <div className="card-surface rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h2 className="type-h3 mb-2">No Active Trip</h2>
            <p className="text-text-secondary">
              Start or join a trip to chat with your group!
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="pb-nav page-premium-enter texture-grain" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              onClick={() => router.back()}
              className="press-scale"
              style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))', color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} />
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
                <MessageCircle size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Trash Talk</span>
                <p className="type-caption">{currentTrip.name}</p>
              </div>
            </div>
          </div>
          <Link
            href="/social/photos"
            className="btn-premium"
            style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
          >
            <Camera size={22} />
          </Link>
        </div>
      </header>

      {/* Quick Tabs */}
      <div className="container-editorial" style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <TabButton active label="All" icon={<MessageCircle size={16} />} />
          <TabButton label="Photos" icon={<ImageIcon size={16} />} href="/social/photos" />
          <TabButton label="Highlights" icon={<Flame size={16} />} />
        </div>
      </div>

      {/* Comments Feed */}
      <main className="container-editorial" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {banterPosts.map((post) => {
            const player = post.authorId ? getPlayer(post.authorId) : undefined;
            return (
              <PostCard
                key={post.id}
                post={post}
                player={player}
              />
            );
          })}
        </div>

        {banterPosts.length === 0 && (
          <NoMessagesEmpty />
        )}
      </main>

      {/* Message Input */}
      <div
        style={{
          position: 'sticky',
          bottom: 'var(--nav-height)',
          left: 0,
          right: 0,
          background: 'var(--canvas-raised)',
          borderTop: '1px solid var(--rule)',
        }}
      >
        {/* Quick Reactions */}
        {showEmojis && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3)', borderBottom: '1px solid var(--rule)' }}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage(message + emoji);
                  setShowEmojis(false);
                }}
                className="press-scale"
                style={{
                  fontSize: '1.5rem',
                  padding: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)' }}>
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            style={{
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--ink-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Smile size={22} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Talk some trash..."
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-full)',
              background: 'var(--canvas)',
              border: '1px solid var(--rule)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            style={{
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-full)',
              background: message.trim() ? 'var(--masters)' : 'var(--rule)',
              color: message.trim() ? 'white' : 'var(--ink-tertiary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

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

/* Tab Button Component */
interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  href?: string;
}

function TabButton({ label, icon, active, href }: TabButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-sm)',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    background: active ? 'var(--masters)' : 'var(--canvas-raised)',
    color: active ? 'white' : 'var(--ink)',
    border: active ? 'none' : '1px solid var(--rule)',
    cursor: 'pointer',
    textDecoration: 'none',
  };

  if (href) {
    return (
      <Link href={href} style={baseStyle}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button style={baseStyle}>
      {icon}
      {label}
    </button>
  );
}

/* Post Card Component */
interface PostCardProps {
  post: BanterPost;
  player?: Player;
}

function PostCard({ post, player }: PostCardProps) {
  // Memoize time calculation to avoid impure Date.now() during render
  const timeAgo = useMemo(() => {
    const now = Date.now();
    const seconds = Math.floor((now - new Date(post.timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [post.timestamp]);

  // Get display name - prefer player name, fall back to authorName
  const displayName = player
    ? `${player.firstName} ${player.lastName}`
    : post.authorName || 'Unknown';

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="card"
      style={{ padding: 'var(--space-4)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--team-usa), var(--team-europe))',
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p className="type-body-sm" style={{ fontWeight: 500 }}>
            {displayName}
          </p>
          <p className="type-caption">{timeAgo}</p>
        </div>
        {post.postType !== 'message' && (
          <span
            className="type-micro"
            style={{
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--canvas-sunken)',
              textTransform: 'capitalize',
            }}
          >
            {post.postType}
          </span>
        )}
      </div>

      {/* Content */}
      <p className="type-body">{post.content}</p>

      {/* Emoji if present */}
      {post.emoji && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <span style={{ fontSize: '1.5rem' }}>{post.emoji}</span>
        </div>
      )}
    </div>
  );
}
