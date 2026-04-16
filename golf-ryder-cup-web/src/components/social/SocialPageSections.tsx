'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { stripHtml } from '@/lib/utils/sanitize';
import type { BanterPost, Player } from '@/lib/types/models';
import { Camera, Image as ImageIcon, MessageCircle, Send, Share2, Smile, Trash2 } from 'lucide-react';

const GOLF_REACTIONS = ['\u26F3', '\uD83D\uDD25', '\uD83D\uDC4F', '\uD83D\uDE02', '\uD83D\uDCAA', '\uD83C\uDFC6'];

export function FeedPill({
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

export function PostCard({
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
  const activeReactions = Object.entries(post.reactions || {}).filter(
    ([, reactorIds]) => reactorIds.length > 0
  );
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
              <p className="mt-[2px] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {timeAgo}
              </p>
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
                aria-label="Share post"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80 text-[var(--ink-tertiary)] transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
              >
                <Share2 size={15} />
              </button>
              {isOwnPost ? (
                <button
                  type="button"
                  onClick={() => onDelete(post.id)}
                  aria-label="Delete post"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80 text-[var(--ink-tertiary)] transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
          </div>

          <p className="mt-[var(--space-4)] text-sm leading-7 text-[var(--ink)]">{stripHtml(post.content)}</p>

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
                aria-label={showReactionPicker ? 'Close reactions' : 'Add reaction'}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40',
                  showReactionPicker
                    ? 'border-[var(--masters)]/20 bg-[color:var(--masters)] text-[var(--canvas)]'
                    : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-tertiary)]'
                )}
              >
                {showReactionPicker ? 'x' : '+'}
              </button>

              {showReactionPicker ? (
                <div
                  role="toolbar"
                  aria-label="Reactions"
                  aria-orientation="horizontal"
                  className="absolute bottom-full left-0 mb-[var(--space-2)] flex gap-[var(--space-1)] rounded-[1rem] border border-[color:var(--rule)]/75 bg-[var(--canvas)] p-[var(--space-2)] shadow-[0_12px_28px_rgba(41,29,17,0.12)]"
                  onKeyDown={(e) => {
                    const items = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="button"], button');
                    const focused = document.activeElement as HTMLElement;
                    const currentIdx = Array.from(items).indexOf(focused as HTMLButtonElement);
                    let nextIdx = currentIdx;

                    if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % items.length;
                    else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + items.length) % items.length;
                    else if (e.key === 'Home') nextIdx = 0;
                    else if (e.key === 'End') nextIdx = items.length - 1;
                    else if (e.key === 'Escape') { setShowReactionPicker(false); return; }
                    else return;

                    e.preventDefault();
                    items[nextIdx]?.focus();
                  }}
                >
                  {GOLF_REACTIONS.map((emoji, idx) => (
                    <button
                      key={emoji}
                      type="button"
                      tabIndex={idx === 0 ? 0 : -1}
                      onClick={() => {
                        onToggleReaction(post.id, emoji);
                        setShowReactionPicker(false);
                      }}
                      aria-label={`React with ${emoji}`}
                      className="rounded-full p-2 text-[1.2rem] transition-transform duration-150 hover:scale-[1.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
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

export function SocialFactCard({
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
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

export function SidebarPanel({
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

export function SocialComposerDock({
  message,
  showEmojis,
  quickEmojis,
  onToggleEmojis,
  onAppendEmoji,
  onChangeMessage,
  onSubmit,
}: {
  message: string;
  showEmojis: boolean;
  quickEmojis: string[];
  onToggleEmojis: () => void;
  onAppendEmoji: (emoji: string) => void;
  onChangeMessage: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-[var(--nav-height)] z-20 border-t border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/94 backdrop-blur-xl">
      <div className="container-editorial py-[var(--space-3)]">
        {showEmojis ? (
          <div className="mb-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onAppendEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
                className="rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-3 py-2 text-xl transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40"
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
              onClick={onToggleEmojis}
              aria-label={showEmojis ? 'Hide emoji picker' : 'Show emoji picker'}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-150 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40',
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
              onChange={(event) => onChangeMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onSubmit();
                }
              }}
              placeholder="Talk some trash..."
              className="min-h-11 flex-1 rounded-full border border-[color:var(--rule)]/70 bg-[var(--canvas)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
            />

            <Button variant="primary" size="icon" disabled={!message.trim()} onClick={onSubmit}>
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const socialIcons = {
  camera: Camera,
  image: ImageIcon,
  message: MessageCircle,
};
