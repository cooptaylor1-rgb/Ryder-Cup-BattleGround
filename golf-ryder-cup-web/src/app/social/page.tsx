'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Camera,
  Image as ImageIcon,
  MessageCircle,
  Send,
  Share2,
  Smile,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, EmptyStatePremium } from '@/components/ui';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { uiLogger } from '@/lib/utils/logger';
import { shareBanterPost } from '@/lib/utils/share';
import { cn } from '@/lib/utils';
import type { BanterPost, Player } from '@/lib/types/models';

const GOLF_REACTIONS = ['\u26F3', '\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\uD83C\uDFC6'];
const QUICK_EMOJIS = ['\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\u26F3', '\uD83C\uDFAF'];

export default function SocialPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { showToast } = useUIStore();
  const [message, setMessage] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const banterPosts = useLiveQuery(
    async () => {
      if (!currentTrip) {
        return [];
      }

      return db.banterPosts.where('tripId').equals(currentTrip.id).reverse().sortBy('timestamp');
    },
    [currentTrip?.id],
    []
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const currentUserId = players[0]?.id;
  const totalReactions = useMemo(
    () =>
      banterPosts.reduce(
        (sum, post) =>
          sum +
          Object.values(post.reactions || {}).reduce((postSum, reactorIds) => postSum + reactorIds.length, 0),
        0
      ),
    [banterPosts]
  );

  const handleSend = useCallback(async () => {
    if (!message.trim() || !currentTrip) {
      return;
    }

    const author = players[0];
    if (!author) {
      showToast('error', 'Unable to post without a player profile');
      return;
    }

    const newPost: BanterPost = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      content: message.trim(),
      authorId: author.id,
      authorName: `${author.firstName} ${author.lastName}`,
      postType: 'message',
      timestamp: new Date().toISOString(),
    };

    try {
      await db.banterPosts.add(newPost);
      setMessage('');
      setShowEmojis(false);
    } catch (error) {
      uiLogger.error('Failed to post message:', error);
      showToast('error', 'Failed to post message');
    }
  }, [currentTrip, message, players, showToast]);

  const handleToggleReaction = useCallback(
    async (postId: string, emoji: string) => {
      if (!currentUserId) {
        return;
      }

      try {
        const post = await db.banterPosts.get(postId);
        if (!post) {
          return;
        }

        const reactions = { ...(post.reactions || {}) };
        const currentReactors = reactions[emoji] ? [...reactions[emoji]] : [];
        const alreadyReacted = currentReactors.includes(currentUserId);

        if (alreadyReacted) {
          reactions[emoji] = currentReactors.filter((id) => id !== currentUserId);
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

  const handleSharePost = useCallback(
    async (post: BanterPost) => {
      const result = await shareBanterPost(post.authorName || 'Unknown', post.content);

      if (result.shared && result.method === 'clipboard') {
        showToast('success', 'Copied to clipboard');
      } else if (!result.shared) {
        showToast('error', 'Could not share post');
      }
    },
    [showToast]
  );

  const handleDeletePost = useCallback(async () => {
    if (!pendingDeletePostId) {
      return;
    }

    try {
      await db.banterPosts.delete(pendingDeletePostId);
      showToast('success', 'Post deleted');
    } catch (error) {
      uiLogger.error('Failed to delete post:', error);
      showToast('error', 'Failed to delete post');
    } finally {
      setPendingDeletePostId(null);
    }
  }, [pendingDeletePostId, showToast]);

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Clubhouse"
          subtitle="No active trip"
          icon={<MessageCircle size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="No active trip"
            description="Start or select a trip before opening the clubhouse feed."
            action={{
              label: 'Go home',
              onClick: () => router.push('/'),
            }}
            secondaryAction={{
              label: 'More',
              onClick: () => router.push('/more'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Clubhouse"
          subtitle={currentTrip.name}
          icon={<MessageCircle size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No players yet"
            description="Add players before opening the trip feed so posts have a proper identity."
            action={{
              label: 'Manage players',
              onClick: () => router.push('/players'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Clubhouse"
        subtitle={currentTrip.name}
        icon={<MessageCircle size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.back()}
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<Camera size={14} />} onClick={() => router.push('/social/photos')}>
            Photos
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[calc(var(--space-12)+8rem)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,240,241,0.99))] shadow-[0_26px_56px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.18fr)_18rem]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Clubhouse Feed</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--ink)]">
                Every good trip needs one room for noise, receipts, and bragging rights.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
                This feed is for the chatter between matches: the hot takes, the score jokes, the photo prompts,
                and the little bit of theater that keeps a golf trip from feeling sterile.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <SocialFactCard label="Posts" value={banterPosts.length} detail="Everything currently on the board." />
              <SocialFactCard label="Reactions" value={totalReactions} detail="Lightweight applause, heat, and ridicule." />
              <SocialFactCard label="Feed tone" value="Live" detail="The room works best when it feels present-tense." valueClassName="font-sans text-[1rem] not-italic leading-[1.25]" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-3)]">
          <FeedPill active label="All posts" icon={<MessageCircle size={15} />} />
          <FeedPill label="Photos" icon={<ImageIcon size={15} />} href="/social/photos" />
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.14fr)_18rem]">
          <div className="space-y-[var(--space-4)]">
            {banterPosts.length === 0 ? (
              <section className="rounded-[1.9rem] border border-dashed border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-6)] text-center shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                  <MessageCircle size={18} />
                </div>
                <h2 className="mt-[var(--space-3)] text-lg font-semibold text-[var(--ink)]">
                  The clubhouse is quiet.
                </h2>
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                  Start with a quick post, a joke, or a photo prompt and the room will stop feeling so polite.
                </p>
              </section>
            ) : (
              banterPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  player={post.authorId ? players.find((candidate) => candidate.id === post.authorId) : undefined}
                  currentUserId={currentUserId}
                  currentTime={currentTime}
                  onToggleReaction={handleToggleReaction}
                  onShare={handleSharePost}
                  onDelete={(postId) => setPendingDeletePostId(postId)}
                />
              ))
            )}
          </div>

          <aside className="space-y-[var(--space-4)]">
            <SidebarPanel
              title="Keep it conversational"
              body="The feed is strongest when it feels like the group text’s smarter cousin, not a corporate activity stream."
            />
            <SidebarPanel
              title="Photos deserve daylight"
              body="Photos are better as a dedicated room than as a token tab inside a cluttered feed. Let each surface do one thing well."
              tone="maroon"
            />
          </aside>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-[var(--nav-height)] z-20 border-t border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/94 backdrop-blur-xl">
        <div className="container-editorial py-[var(--space-3)]">
          {showEmojis ? (
            <div className="mb-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setMessage((value) => value + emoji);
                    setShowEmojis(false);
                  }}
                  className="rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-3 py-2 text-xl transition-transform duration-150 hover:scale-[1.04]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-[color:var(--rule)]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-3)] shadow-[0_16px_32px_rgba(41,29,17,0.06)]">
            <div className="flex items-center gap-[var(--space-3)]">
              <button
                type="button"
                onClick={() => setShowEmojis((value) => !value)}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-150 hover:scale-[1.04]',
                  showEmojis
                    ? 'border-[var(--masters)]/25 bg-[color:var(--masters)]/10 text-[var(--masters)]'
                    : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 text-[var(--ink-tertiary)]'
                )}
              >
                <Smile size={18} />
              </button>

              <input
                type="text"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSend();
                  }
                }}
                placeholder="Talk some trash..."
                className="min-h-11 flex-1 rounded-full border border-[color:var(--rule)]/70 bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
              />

              <Button
                variant="primary"
                size="icon"
                disabled={!message.trim()}
                onClick={() => void handleSend()}
              >
                <Send size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeletePostId)}
        onClose={() => setPendingDeletePostId(null)}
        onConfirm={handleDeletePost}
        title="Delete post?"
        description="This removes the post from the feed. It should feel deliberate, even in a casual room."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function FeedPill({
  label,
  icon,
  active = false,
  href,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  href?: string;
}) {
  const className = cn(
    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
    active
      ? 'border-[var(--maroon-subtle)] bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
      : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <div className={className}>
      {icon}
      {label}
    </div>
  );
}

function PostCard({
  post,
  player,
  currentUserId,
  currentTime,
  onToggleReaction,
  onShare,
  onDelete,
}: {
  post: BanterPost;
  player?: Player;
  currentUserId?: string;
  currentTime: number;
  onToggleReaction: (postId: string, emoji: string) => void;
  onShare: (post: BanterPost) => void;
  onDelete: (postId: string) => void;
}) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const isOwnPost = currentUserId === post.authorId;
  const displayName = player ? `${player.firstName} ${player.lastName}` : post.authorName || 'Unknown';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const activeReactions = Object.entries(post.reactions || {}).filter(([, reactorIds]) => reactorIds.length > 0);

  const timeAgo = useMemo(() => {
    const seconds = Math.floor((currentTime - new Date(post.timestamp).getTime()) / 1000);
    if (seconds < 60) {
      return 'Just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    return `${Math.floor(hours / 24)}d ago`;
  }, [currentTime, post.timestamp]);

  return (
    <article className="rounded-[1.75rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.06)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--team-usa),var(--team-europe))] text-sm font-semibold text-[var(--canvas)] shadow-[0_10px_20px_rgba(41,29,17,0.12)]">
          {initials || '?'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{displayName}</p>
              <p className="mt-[2px] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{timeAgo}</p>
            </div>

            <div className="flex items-center gap-[var(--space-2)]">
              {post.postType !== 'message' ? (
                <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                  {post.postType}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onShare(post)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80 text-[var(--ink-tertiary)] transition-transform duration-150 hover:scale-[1.04]"
              >
                <Share2 size={15} />
              </button>
              {isOwnPost ? (
                <button
                  type="button"
                  onClick={() => onDelete(post.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80 text-[var(--ink-tertiary)] transition-transform duration-150 hover:scale-[1.04]"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
          </div>

          <p className="mt-[var(--space-4)] text-sm leading-7 text-[var(--ink)]">{post.content}</p>

          {post.emoji ? <div className="mt-[var(--space-2)] text-[1.4rem]">{post.emoji}</div> : null}

          <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)]">
            {activeReactions.map(([emoji, reactorIds]) => {
              const hasReacted = currentUserId ? reactorIds.includes(currentUserId) : false;

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(post.id, emoji)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-transform duration-150 hover:scale-[1.04]',
                    hasReacted
                      ? 'border-[var(--masters)]/20 bg-[color:var(--masters)] text-[var(--canvas)]'
                      : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
                  )}
                >
                  <span>{emoji}</span>
                  <span>{reactorIds.length}</span>
                </button>
              );
            })}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowReactionPicker((value) => !value)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-transform duration-150 hover:scale-[1.04]',
                  showReactionPicker
                    ? 'border-[var(--masters)]/20 bg-[color:var(--masters)] text-[var(--canvas)]'
                    : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-tertiary)]'
                )}
              >
                {showReactionPicker ? 'x' : '+'}
              </button>

              {showReactionPicker ? (
                <div className="absolute bottom-full left-0 mb-[var(--space-2)] flex gap-[var(--space-1)] rounded-[1rem] border border-[color:var(--rule)]/75 bg-[var(--canvas)] p-[var(--space-2)] shadow-[0_12px_28px_rgba(41,29,17,0.12)]">
                  {GOLF_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onToggleReaction(post.id, emoji);
                        setShowReactionPicker(false);
                      }}
                      className="rounded-full p-2 text-[1.2rem] transition-transform duration-150 hover:scale-[1.08]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SocialFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function SidebarPanel({
  title,
  body,
  tone = 'default',
}: {
  title: string;
  body: string;
  tone?: 'default' | 'maroon';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'maroon'
          ? 'border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,241,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      )}
    >
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Clubhouse note</p>
      <h3 className="mt-[var(--space-2)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}
