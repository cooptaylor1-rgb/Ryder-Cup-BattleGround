'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/layout';
import {
  FeedPill,
  PostCard,
  SidebarPanel,
  SocialComposerDock,
  SocialFactCard,
  socialIcons,
} from '@/components/social/SocialPageSections';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, EmptyStatePremium } from '@/components/ui';
import { db } from '@/lib/db';
import { useAuthStore, useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { uiLogger } from '@/lib/utils/logger';
import { shareBanterPost } from '@/lib/utils/share';
import { resolveCurrentTripPlayer, withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import type { BanterPost } from '@/lib/types/models';

const QUICK_EMOJIS = ['\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\u26F3', '\uD83C\uDFAF'];

function resolveCurrentFeedPlayer(
  players: ReturnType<typeof useTripStore.getState>['players'],
  currentUser: ReturnType<typeof useAuthStore.getState>['currentUser'],
  authUserId: ReturnType<typeof useAuthStore.getState>['authUserId']
) {
  if (!currentUser) {
    return players[0];
  }

  return resolveCurrentTripPlayer(players, withTripPlayerIdentity(currentUser, authUserId), true) ?? players[0];
}

export default function SocialPageClient() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const { currentUser, authUserId } = useAuthStore();
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
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

  const currentFeedPlayer = useMemo(
    () => resolveCurrentFeedPlayer(players, currentUser, authUserId),
    [authUserId, currentUser, players]
  );
  const currentUserId = currentFeedPlayer?.id;
  const totalReactions = useMemo(
    () =>
      banterPosts.reduce(
        (sum, post) =>
          sum +
          Object.values(post.reactions || {}).reduce(
            (postSum, reactorIds) => postSum + reactorIds.length,
            0
          ),
        0
      ),
    [banterPosts]
  );

  const handleSend = useCallback(async () => {
    if (!message.trim() || !currentTrip) {
      return;
    }

    if (!currentFeedPlayer) {
      showToast('error', 'Unable to post without a player profile');
      return;
    }

    const newPost: BanterPost = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      content: message.trim(),
      authorId: currentFeedPlayer.id,
      authorName: `${currentFeedPlayer.firstName} ${currentFeedPlayer.lastName}`,
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
  }, [currentFeedPlayer, currentTrip, message, showToast]);

  const handleToggleReaction = useCallback(
    async (postId: string, emoji: string) => {
      if (!currentUserId) {
        return;
      }

      try {
        // Wrap the read-modify-write in a Dexie transaction so two
        // reactions landing in the same frame can't clobber each
        // other. Previously a naive `get → mutate → update` lost
        // whichever write finished second — User A's 🔥 reaction
        // overwrote User B's 🔥 reaction (or vice versa) and one
        // thumbs-up silently vanished. Transaction serializes the
        // pair so both reactors end up in the array.
        await db.transaction('rw', db.banterPosts, async () => {
          const post = await db.banterPosts.get(postId);
          if (!post) return;

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
        });
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
          icon={<socialIcons.message size={16} className="text-[var(--canvas)]" />}
          iconTone="captain"
          backFallback="/"
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
          icon={<socialIcons.message size={16} className="text-[var(--canvas)]" />}
          iconTone="captain"
          backFallback="/"
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
        icon={<socialIcons.message size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        backFallback="/"
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<socialIcons.camera size={14} />}
            onClick={() => router.push('/social/photos')}
          >
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
                This feed is for the chatter between matches: the hot takes, the score jokes, the
                photo prompts, and the little bit of theater that keeps a golf trip from feeling sterile.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <SocialFactCard label="Posts" value={banterPosts.length} detail="Everything currently on the board." />
              <SocialFactCard label="Reactions" value={totalReactions} detail="Lightweight applause, heat, and ridicule." />
              <SocialFactCard
                label="Feed tone"
                value="Live"
                detail="The room works best when it feels present-tense."
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-3)]">
          <FeedPill active label="All posts" icon={<socialIcons.message size={15} />} />
          <FeedPill label="Photos" icon={<socialIcons.image size={15} />} href="/social/photos" />
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.14fr)_18rem]">
          <div className="space-y-[var(--space-4)]">
            {banterPosts.length === 0 ? (
              <section className="rounded-[1.9rem] border border-dashed border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-6)] text-center shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                  <socialIcons.message size={18} />
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

      <SocialComposerDock
        message={message}
        showEmojis={showEmojis}
        quickEmojis={QUICK_EMOJIS}
        onToggleEmojis={() => setShowEmojis((value) => !value)}
        onAppendEmoji={(emoji) => {
          setMessage((value) => value + emoji);
          setShowEmojis(false);
        }}
        onChangeMessage={setMessage}
        onSubmit={() => {
          void handleSend();
        }}
      />

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
