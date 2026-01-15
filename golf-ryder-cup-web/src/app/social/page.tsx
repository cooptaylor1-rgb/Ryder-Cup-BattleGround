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
    <div className="min-h-screen pb-nav flex flex-col" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
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
            className="p-2 rounded-lg"
            style={{ color: 'var(--masters)' }}
          >
            <Camera size={22} />
          </Link>
        </div>
      </header>

      {/* Quick Tabs */}
      <div className="container-editorial py-3">
        <div className="flex gap-2">
          <TabButton active label="All" icon={<MessageCircle size={16} />} />
          <TabButton label="Photos" icon={<Image size={16} />} href="/social/photos" />
          <TabButton label="Highlights" icon={<Flame size={16} />} />
        </div>
      </div>

      {/* Comments Feed */}
      <main className="flex-1 overflow-y-auto container-editorial pb-4">
        <div className="space-y-4">
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
        className="sticky bottom-nav-height left-0 right-0 border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--rule)' }}
      >
        {/* Quick Reactions */}
        {showEmojis && (
          <div className="flex gap-2 p-3 border-b" style={{ borderColor: 'var(--rule)' }}>
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setMessage(message + emoji);
                  setShowEmojis(false);
                }}
                className="text-2xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className="p-2 rounded-lg"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <Smile size={22} />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Talk some trash..."
            className="flex-1 px-4 py-2 rounded-full"
            style={{
              background: 'var(--canvas)',
              border: '1px solid var(--rule)',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="p-2 rounded-full transition-colors"
            style={{
              background: message.trim() ? 'var(--masters)' : 'var(--rule)',
              color: message.trim() ? 'white' : 'var(--ink-tertiary)',
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
  const className = `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
    active
      ? 'bg-masters text-white'
      : 'bg-surface border border-rule'
  }`;

  if (href) {
    return (
      <Link href={href} className={className} style={{ background: active ? 'var(--masters)' : 'var(--surface)' }}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button className={className} style={{ background: active ? 'var(--masters)' : 'var(--surface)' }}>
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
      className="p-4 rounded-xl"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--team-usa), var(--team-europe))',
          }}
        >
          {player?.firstName?.[0] || '?'}
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {player ? `${player.firstName} ${player.lastName}` : 'Unknown Player'}
          </p>
          <p className="type-caption">{timeAgo(comment.createdAt)}</p>
        </div>
      </div>

      {/* Content */}
      <p className="text-base mb-3">{comment.content}</p>

      {/* Reactions */}
      {comment.reactions.length > 0 && (
        <div className="flex items-center gap-2">
          {comment.reactions.map((reaction, idx) => (
            <button
              key={idx}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm"
              style={{
                background: 'var(--canvas)',
                border: '1px solid var(--rule)',
              }}
            >
              <span>{reaction.emoji}</span>
              <span className="text-xs opacity-70">{reaction.count}</span>
            </button>
          ))}
          <button
            className="p-1.5 rounded-full"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <Smile size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
