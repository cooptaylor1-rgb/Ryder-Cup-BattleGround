'use client';

import { Home, Target, Users, Trophy, MoreHorizontal } from 'lucide-react';

/**
 * Page Loading Skeleton
 *
 * Editorial loading states with warm cream tones.
 * Shaped like publication content (articles, cards)
 * rather than dashboard grids.
 */

interface PageLoadingSkeletonProps {
  /** Title shown in the skeleton header */
  title?: string;
  /** Whether to show the back button */
  showBackButton?: boolean;
  /** Number of content cards to show */
  cardCount?: number;
  /** Variant for different page layouts */
  variant?: 'default' | 'list' | 'grid' | 'detail' | 'form';
}

/** Warm skeleton block -- uses design system shimmer with cream tones */
function Bone({
  width,
  height,
  rounded = 'var(--radius-sm)',
  className = '',
  style,
}: {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? 16,
        borderRadius: rounded,
        ...style,
      }}
      aria-hidden
    />
  );
}

export function PageLoadingSkeleton({
  title = 'Loading...',
  showBackButton = true,
  cardCount = 4,
  variant = 'default',
}: PageLoadingSkeletonProps) {
  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]"
      role="progressbar"
      aria-busy="true"
      aria-label={title}
    >
      {/* Header Skeleton */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBackButton && <Bone width={32} height={32} rounded="var(--radius-lg)" />}
            <div>
              <Bone width={100} height={16} style={{ marginBottom: 4 }} />
              <Bone width={64} height={12} />
            </div>
          </div>
          <Bone width={32} height={32} rounded="var(--radius-lg)" />
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="container-editorial" style={{ paddingTop: 'var(--space-6)' }}>
        {variant === 'default' && <DefaultSkeleton cardCount={cardCount} />}
        {variant === 'list' && <ListSkeleton cardCount={cardCount} />}
        {variant === 'grid' && <GridSkeleton cardCount={cardCount} />}
        {variant === 'detail' && <DetailSkeleton />}
        {variant === 'form' && <FormSkeleton />}
      </main>

      {/* Bottom Navigation Skeleton */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg"
        style={{
          background: 'rgba(250, 248, 245, 0.88)',
          borderTop: '1px solid var(--rule)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-around items-center h-16">
          {[Home, Target, Users, Trophy, MoreHorizontal].map((Icon, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 p-2 opacity-30">
              <Icon size={22} style={{ color: 'var(--ink-tertiary)' }} />
              <Bone width={32} height={8} />
            </div>
          ))}
        </div>
      </nav>

      {/* Screen reader text */}
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
}

/**
 * Default: Editorial hero + article-style content rows
 */
function DefaultSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <>
      {/* Hero / headline area -- editorial, wide and airy */}
      <div
        className="card-editorial"
        style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-5)' }}
      >
        <Bone width="60%" height={24} rounded="var(--radius-sm)" style={{ marginBottom: 16 }} />
        <Bone width="100%" height={14} style={{ marginBottom: 10 }} />
        <Bone width="85%" height={14} style={{ marginBottom: 10 }} />
        <Bone width="40%" height={14} />
      </div>

      {/* Article-style content rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="card-editorial"
            style={{
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <Bone width={48} height={48} rounded="var(--radius-xl)" />
            <div style={{ flex: 1 }}>
              <Bone width="55%" height={16} style={{ marginBottom: 8 }} />
              <Bone width="35%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * List: Clean single-column article list
 */
function ListSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={i}
          className="card-editorial"
          style={{ padding: 'var(--space-5)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <Bone width={44} height={44} rounded="var(--radius-full)" />
            <div style={{ flex: 1 }}>
              <Bone width="50%" height={16} style={{ marginBottom: 8 }} />
              <Bone width="30%" height={12} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Grid: Two-column editorial cards (not dashboard tiles)
 */
function GridSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={i}
          className="card-editorial"
          style={{ padding: 'var(--space-5)', aspectRatio: '4 / 3' }}
        >
          <Bone width="70%" height={14} style={{ marginBottom: 12 }} />
          <Bone width="50%" height={12} />
        </div>
      ))}
    </div>
  );
}

/**
 * Detail: Article detail page with hero, stats, and body text
 */
function DetailSkeleton() {
  return (
    <>
      {/* Hero section */}
      <div
        className="card-editorial"
        style={{ padding: 'var(--space-8)', marginBottom: 'var(--space-5)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <Bone width={64} height={64} rounded="var(--radius-2xl, 16px)" />
          <div style={{ flex: 1 }}>
            <Bone width="60%" height={20} style={{ marginBottom: 8 }} />
            <Bone width="35%" height={14} />
          </div>
        </div>
        <Bone width="100%" height={80} rounded="var(--radius-lg)" />
      </div>

      {/* Stats row -- editorial, not dashboard */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="card-editorial"
            style={{ flex: 1, padding: 'var(--space-5)', textAlign: 'center' }}
          >
            <Bone width={48} height={24} rounded="var(--radius-sm)" style={{ margin: '0 auto 8px' }} />
            <Bone width={64} height={12} rounded="var(--radius-sm)" style={{ margin: '0 auto' }} />
          </div>
        ))}
      </div>

      {/* Body text block */}
      <div className="card-editorial" style={{ padding: 'var(--space-6)' }}>
        <Bone width={100} height={16} style={{ marginBottom: 'var(--space-5)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <Bone key={i} width={`${100 - i * 5}%`} height={13} />
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Form: Clean editorial form with generous spacing
 */
function FormSkeleton() {
  return (
    <div className="card-editorial" style={{ padding: 'var(--space-8)' }}>
      <Bone width={140} height={20} style={{ marginBottom: 'var(--space-8)' }} />

      {/* Form fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Bone width={80} height={12} style={{ marginBottom: 8 }} />
            <Bone width="100%" height={48} rounded="var(--radius-lg)" />
          </div>
        ))}
      </div>

      {/* Submit button */}
      <Bone width="100%" height={48} rounded="var(--radius-lg)" style={{ marginTop: 'var(--space-8)' }} />
    </div>
  );
}

/**
 * Inline loading state for smaller sections
 */
const LINE_WIDTHS = ['100%', '80%', '90%', '75%', '85%', '95%', '70%', '88%'];

export function InlineLoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div role="progressbar" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Bone
          key={i}
          width={LINE_WIDTHS[i % LINE_WIDTHS.length]}
          height={16}
          style={{ marginBottom: 8 }}
        />
      ))}
    </div>
  );
}

/**
 * Card loading skeleton
 */
export function CardLoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`card-editorial ${className}`}
      style={{ padding: 'var(--space-5)' }}
      role="progressbar"
      aria-busy="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <Bone width={48} height={48} rounded="var(--radius-xl)" />
        <div style={{ flex: 1 }}>
          <Bone width="55%" height={16} style={{ marginBottom: 8 }} />
          <Bone width="35%" height={12} />
        </div>
      </div>
    </div>
  );
}
