'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { uiLogger } from '@/lib/utils/logger';
import { shareBanterPost } from '@/lib/utils/share';
import { EmptyStatePremium, NoMessagesEmpty } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import {
  MessageCircle,
  Camera,
  Send,
  Smile,
  Image as ImageIcon,
  Flame,
  Share2,
  Trash2,
} from 'lucide-react';
import type { Player, BanterPost } from '@/lib/types/models';

/**
 * SOCIAL PAGE -- Trash Talk & Team Banter
 *
 * The social hub for your golf trip. Talk smack,
 * celebrate wins, and keep the competition fun!
 */

// Golf-themed reaction emoji set used across the social feed
const GOLF_REACTIONS = ['\u26F3', '\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\uD83C\uDFC6'];

export default function SocialPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { showToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);

  // No redirect when no trip is selected -- render a premium empty state instead.

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
    return players.find((p) => p.id === id);
  };

  // Get the current user ID (first player as default)
  const currentUserId = players[0]?.id;

  const handleSend = async () => {
    if (!message.trim() || !currentTrip) return;

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

  // Toggle a reaction on a banter post
  const handleToggleReaction = useCallback(
    async (postId: string, emoji: string) => {
      if (!currentUserId) return;

      try {
        const post = await db.banterPosts.get(postId);
        if (!post) return;

        const reactions = { ...(post.reactions || {}) };
        const currentReactors = reactions[emoji] ? [...reactions[emoji]] : [];
        const alreadyReacted = currentReactors.includes(currentUserId);

        if (alreadyReacted) {
          reactions[emoji] = currentReactors.filter((id) => id !== currentUserId);
          // Remove the key entirely if no reactors remain
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...currentReactors, currentUserId];
        }

        await db.banterPosts.update(postId, { reactions });
      } catch (error) {
        uiLogger.error('Failed to toggle reaction:', error);
      }
    },
    [currentUserId]
  );

  // Share a banter post using the native share utility
  const handleSharePost = useCallback(
    async (post: BanterPost) => {
      const authorName = post.authorName || 'Unknown';
      const result = await shareBanterPost(authorName, post.content);

      if (result.shared && result.method === 'clipboard') {
        showToast('success', 'Copied to clipboard');
      } else if (!result.shared) {
        showToast('error', 'Could not share post');
      }
    },
    [showToast]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        await db.banterPosts.delete(postId);
        showToast('success', 'Post deleted');
      } catch (error) {
        uiLogger.error('Failed to delete post:', error);
        showToast('error', 'Failed to delete post');
      }
    },
    [showToast]
  );

  const quickEmojis = ['\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\u26F3', '\uD83C\uDFAF'];

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trash Talk"
          subtitle="No trip selected"
          icon={<MessageCircle size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="No trip selected"
            description="Start or select a trip to jump into team banter."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            secondaryAction={{
              label: 'More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col">
      <PageHeader
        title="Trash Talk"
        subtitle={currentTrip.name}
        icon={<MessageCircle size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          <Link href="/social/photos" className="btn-premium p-2 rounded-[var(--radius-md)]">
            <Camera size={20} />
          </Link>
        }
      />

      {/* Quick Tabs */}
      <div className="container-editorial py-[var(--space-3)]">
        <div className="flex gap-[var(--space-2)]">
          <TabButton active label="All" icon={<MessageCircle size={16} />} />
          <TabButton label="Photos" icon={<ImageIcon size={16} />} href="/social/photos" />
          <TabButton label="Highlights" icon={<Flame size={16} />} />
        </div>
      </div>

      {/* Comments Feed */}
      <main className="container-editorial flex-1 overflow-y-auto pb-[calc(var(--space-4)+64px)]">
        <div className="flex flex-col gap-[var(--space-4)]">
          {banterPosts.map((post) => {
            const player = post.authorId ? getPlayer(post.authorId) : undefined;
            return (
              <PostCard
                key={post.id}
                post={post}
                player={player}
                currentUserId={currentUserId}
                onToggleReaction={handleToggleReaction}
                onShare={handleSharePost}
                onDelete={handleDeletePost}
              />
            );
          })}
        </div>

        {banterPosts.length === 0 && <NoMessagesEmpty />}
      </main>

      {/* Message Input */}
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--nav-height)',
          left: 0,
          right: 0,
          background: 'rgba(var(--canvas-rgb), 0.92)',
          borderTop: '1px solid var(--rule)',
          backdropFilter: 'blur(10px)',
          zIndex: 20,
        }}
      >
        {/* Quick Reactions */}
        {showEmojis && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-3)', borderBottom: '1px solid var(--rule)' }}>
            {quickEmojis.map((emoji) => (
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
              color: message.trim() ? 'var(--canvas)' : 'var(--ink-tertiary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <BottomNav />
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
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    background: active ? 'var(--masters)' : 'var(--canvas-raised)',
    color: active ? 'var(--canvas)' : 'var(--ink)',
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
  currentUserId?: string;
  onToggleReaction: (postId: string, emoji: string) => void;
  onShare: (post: BanterPost) => void;
  onDelete: (postId: string) => void;
}

function PostCard({ post, player, currentUserId, onToggleReaction, onShare, onDelete }: PostCardProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOwnPost = currentUserId === post.authorId;

  // Update time periodically for "time ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time ago using stored time
  const timeAgo = useMemo(() => {
    const seconds = Math.floor((currentTime - new Date(post.timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [post.timestamp, currentTime]);

  // Get display name - prefer player name, fall back to authorName
  const displayName = player
    ? `${player.firstName} ${player.lastName}`
    : post.authorName || 'Unknown';

  const initials = displayName.charAt(0).toUpperCase();

  // Build reaction display data from the post's reactions map
  const reactions = post.reactions || {};
  const activeReactions = Object.entries(reactions).filter(
    ([, reactorIds]) => reactorIds.length > 0
  );

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
            color: 'var(--canvas)',
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
        {/* Share Button */}
        <button
          onClick={() => onShare(post)}
          aria-label="Share post"
          style={{
            padding: 'var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ink-tertiary)',
            transition: 'color 0.15s ease',
          }}
        >
          <Share2 size={16} />
        </button>
        {/* Delete Button — own posts only */}
        {isOwnPost && (
          confirmDelete ? (
            <button
              onClick={() => {
                onDelete(post.id);
                setConfirmDelete(false);
              }}
              aria-label="Confirm delete"
              style={{
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--error)',
                color: 'var(--canvas)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Delete?
            </button>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete post"
              style={{
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-tertiary)',
                transition: 'color 0.15s ease',
              }}
            >
              <Trash2 size={16} />
            </button>
          )
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

      {/* Reactions Display & Picker */}
      <div
        style={{
          marginTop: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-1)',
        }}
      >
        {/* Existing reactions */}
        {activeReactions.map(([emoji, reactorIds]) => {
          const hasReacted = currentUserId ? reactorIds.includes(currentUserId) : false;
          return (
            <button
              key={emoji}
              onClick={() => onToggleReaction(post.id, emoji)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: '2px var(--space-2)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                background: hasReacted ? 'var(--masters)' : 'var(--canvas-raised)',
                color: hasReacted ? 'var(--canvas)' : 'var(--ink-secondary)',
                border: hasReacted ? '1px solid var(--masters)' : '1px solid var(--rule)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{emoji}</span>
              <span>{reactorIds.length}</span>
            </button>
          );
        })}

        {/* Add reaction toggle */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            aria-label="Add reaction"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-full)',
              background: showReactionPicker ? 'var(--masters)' : 'var(--canvas-raised)',
              color: showReactionPicker ? 'var(--canvas)' : 'var(--ink-tertiary)',
              border: '1px solid var(--rule)',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
          >
            {showReactionPicker ? '\u2715' : '+'}
          </button>

          {/* Inline reaction picker */}
          {showReactionPicker && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                marginBottom: 'var(--space-2)',
                display: 'flex',
                gap: 'var(--space-1)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--canvas)',
                border: '1px solid var(--rule)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
                zIndex: 10,
              }}
            >
              {GOLF_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(post.id, emoji);
                    setShowReactionPicker(false);
                  }}
                  style={{
                    fontSize: '1.25rem',
                    padding: 'var(--space-1)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
