'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TeamLogoProps {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  rounded?: boolean;
}

/**
 * Render a team logo from a URL (Supabase Storage public/signed URL,
 * or any image URL). Returns null when no src is provided so callers
 * can keep their existing layout intact — the dot/badge/emoji they
 * were using stays put until a captain adds a logo on the settings
 * page. next/image's remote loader is intentionally skipped so we
 * don't have to allowlist every captain's Supabase host in the
 * Next.js config; the unoptimized fetch is fine for a handful of
 * trip logos.
 */
export function TeamLogo({
  src,
  alt,
  size = 48,
  className,
  rounded = true,
}: TeamLogoProps) {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={cn(
        'inline-block object-contain',
        rounded && 'rounded-full',
        className
      )}
      style={{ width: size, height: size }}
    />
  );
}
