import NextImage from 'next/image';
import type { UserProfile } from '@/lib/stores';

interface ProfileHeroCardProps {
  currentUser: UserProfile;
}

export function ProfileHeroCard({ currentUser }: ProfileHeroCardProps) {
  const displayName = currentUser.nickname || currentUser.firstName;
  const initials = `${currentUser.firstName?.[0] || '?'}${currentUser.lastName?.[0] || '?'}`;

  return (
    <div className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] overflow-hidden mb-[var(--space-6)]">
      <div className="bg-gradient-to-b from-canvas to-canvas-sunken pt-[var(--space-10)] px-[var(--space-6)] pb-[var(--space-8)] flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="w-[5.5rem] h-[5.5rem] rounded-[var(--radius-full)] bg-canvas-raised border-2 border-rule flex items-center justify-center mb-[var(--space-4)] shadow-card overflow-hidden">
          {currentUser.avatarUrl ? (
            <NextImage
              src={currentUser.avatarUrl}
              alt={displayName}
              width={88}
              height={88}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-serif text-[clamp(1.75rem,5vw,2.25rem)] italic text-masters leading-none tracking-[-0.02em]">
              {initials}
            </span>
          )}
        </div>

        {/* Name */}
        <h2 className="font-serif text-[clamp(1.5rem,5vw,1.75rem)] italic font-normal text-ink leading-[1.2] tracking-[-0.01em] m-0">
          {currentUser.firstName} {currentUser.lastName}
        </h2>

        {/* Nickname */}
        {currentUser.nickname && (
          <p className="font-sans text-[length:var(--text-sm)] text-ink-tertiary m-0 pt-[var(--space-1)]">
            &ldquo;{currentUser.nickname}&rdquo;
          </p>
        )}

        {/* Handicap Badge */}
        <div className="mt-[var(--space-5)] flex flex-col items-center gap-[var(--space-1)]">
          <span className="type-overline text-ink-tertiary tracking-[0.15em]">
            Handicap
          </span>
          <span className="font-serif text-[clamp(2rem,6vw,2.5rem)] font-normal text-masters leading-none tracking-[-0.02em]">
            {currentUser.handicapIndex?.toFixed(1) || '\u2014'}
          </span>
        </div>
      </div>
    </div>
  );
}
