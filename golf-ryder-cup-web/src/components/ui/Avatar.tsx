/**
 * Avatar Component
 *
 * Optimized image component for user avatars using Next.js Image.
 * Falls back to initials when no image is provided.
 */

'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
  borderColor?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-base',
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function Avatar({
  src,
  alt,
  size = 'md',
  fallback,
  className,
  borderColor,
}: AvatarProps) {
  const initials = fallback || alt.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const borderStyle = borderColor ? { border: `2px solid ${borderColor}` } : {};

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
        style={borderStyle}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold',
        sizeClasses[size],
        className
      )}
      style={{
        background: borderColor ? `${borderColor}20` : 'var(--surface-secondary)',
        color: borderColor || 'var(--ink-secondary)',
        ...borderStyle,
      }}
    >
      {initials}
    </div>
  );
}

export default Avatar;
