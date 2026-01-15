'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
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
  Image,
  Flame,
  CalendarDays,
} from 'lucide-react';
import type { Player } from '@/lib/types/models';

/**
 * SOCIAL PAGE — Trash Talk & Team Banter
 *
 * The social hub for your golf trip. Talk smack,
 * celebrate wins, and keep the competition fun!
 */

interface Comment {
  id: string;
  playerId: string;
  content: string;
  emoji?: string;
  createdAt: string;
  reactions: { emoji: string; count: number }[];
}

export default function SocialPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [message, setMessage] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Demo comments
  useEffect(() => {
    if (players.length > 0) {
      setComments([
        {
          id: '1',
          playerId: players[0]?.id || '',
          content: "Let's go USA! 🇺🇸",
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          reactions: [{ emoji: '🔥', count: 3 }, { emoji: '👍', count: 2 }],
        },
        {
          id: '2',
          playerId: players[1]?.id || '',
          content: "Europe is coming for that cup! 🏆",
          createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          reactions: [{ emoji: '💪', count: 4 }],
        },
        {
          id: '3',
          playerId: players[2]?.id || '',
          content: "What a putt on 7! Did you see that?",
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          reactions: [{ emoji: '⛳', count: 5 }, { emoji: '🎯', count: 2 }],
        },
      ]);
    }
  }, [players]);

  const getPlayer = (id: string): Player | undefined => {
    return players.find(p => p.id === id);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      playerId: players[0]?.id || '',
      content: message,
      createdAt: new Date().toISOString(),
      reactions: [],
    };
    setComments([newComment, ...comments]);
    setMessage('');
  };

  const quickReactions = ['🔥', '👏', '😂', '💪', '⛳', '🎯'];

  if (!currentTrip) return null;

  return (
    <div className="pb-nav" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
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
            <div>
              <span className="type-overline">Trash Talk</span>
              <p className="type-caption">{currentTrip.name}</p>
            </div>
          </div>
          <Link
            href="/social/photos"
            style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', color: 'var(--masters)' }}
          >
            <Camera size={22} />
          </Link>
        </div>
      </header>

      {/* Quick Tabs */}
      <div className="container-editorial" style={{ paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <TabButton active label="All" icon={<MessageCircle size={16} />} />
          <TabButton label="Photos" icon={<Image size={16} />} href="/social/photos" />
          <TabButton label="Highlights" icon={<Flame size={16} />} />
        </div>
      </div>

      {/* Comments Feed */}
      <main className="container-editorial" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {comments.map((comment) => {
            const player = getPlayer(comment.playerId);
            return (
              <CommentCard
                key={comment.id}
                comment={comment}
                player={player}
              />
            );
          })}
        </div>

        {comments.length === 0 && (
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
      <nav className="bottom-nav">
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

/* Comment Card Component */
interface CommentCardProps {
  comment: Comment;
  player?: Player;
}

function CommentCard({ comment, player }: CommentCardProps) {
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

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
          {player?.firstName?.[0] || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <p className="type-body-sm" style={{ fontWeight: 500 }}>
            {player ? `${player.firstName} ${player.lastName}` : 'Unknown Player'}
          </p>
          <p className="type-caption">{timeAgo(comment.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <p className="type-body" style={{ marginBottom: 'var(--space-3)' }}>{comment.content}</p>

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {comment.reactions.map((reaction, idx) => (
            <button
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--font-sm)',
                background: 'var(--canvas)',
                border: '1px solid var(--rule)',
                cursor: 'pointer',
              }}
            >
              <span>{reaction.emoji}</span>
              <span className="type-micro" style={{ opacity: 0.7 }}>{reaction.count}</span>
            </button>
          ))}
          <button
            style={{
              padding: 'var(--space-1)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--ink-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Smile size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
