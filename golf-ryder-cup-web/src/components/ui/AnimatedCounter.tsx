/**
 * Animated Counter Component
 *
 * Smooth number animations for scores and statistics including:
 * - Count up/down effects
 * - Score pop animations
 * - Staggered digit transitions
 * - Format support (points, percentages, ordinals)
 *
 * Features:
 * - Spring physics easing
 * - Configurable duration
 * - Celebration effects on milestones
 * - Reduced motion support
 */

'use client';

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type CounterFormat = 'number' | 'points' | 'percent' | 'ordinal' | 'currency';

interface AnimatedCounterProps {
  value: number;
  previousValue?: number;
  format?: CounterFormat;
  duration?: number;
  delay?: number;
  celebrateOn?: number[];
  onCelebrate?: (value: number) => void;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
  showChange?: boolean;
  prefix?: string;
  suffix?: string;
}

// ============================================
// ANIMATED COUNTER
// ============================================

export function AnimatedCounter({
  value,
  previousValue,
  format = 'number',
  duration = 600,
  delay = 0,
  celebrateOn = [],
  onCelebrate,
  className,
  valueClassName,
  showChange = false,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(previousValue ?? value);
  const [isAnimating, setIsAnimating] = useState(false);
  const [changeDirection, setChangeDirection] = useState<'up' | 'down' | null>(null);
  const [animationStartValue, setAnimationStartValue] = useState(previousValue ?? value);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(previousValue ?? value);

  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      // No animation: render value directly (avoid setState-in-effect).
      startValueRef.current = value;
      startTimeRef.current = null;
      return;
    }

    const startValue = startValueRef.current;
    const diff = value - startValue;

    if (diff === 0) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        // Initialize animation state on the first RAF tick
        setIsAnimating(true);
        setChangeDirection(diff > 0 ? 'up' : 'down');
        setAnimationStartValue(startValue);
        startTimeRef.current = timestamp + delay;
      }

      const elapsed = timestamp - startTimeRef.current;

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);

      // Spring easing for natural feel
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + diff * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsAnimating(false);
        startValueRef.current = value;
        startTimeRef.current = null;

        // Check for celebration milestones
        if (celebrateOn.includes(value)) {
          onCelebrate?.(value);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, delay, celebrateOn, onCelebrate, prefersReducedMotion]);

  const formattedValue = formatValue(prefersReducedMotion ? value : displayValue, format, prefix, suffix);

  return (
    <div className={cn('relative inline-flex items-baseline gap-1', className)}>
      <span
        className={cn(
          'tabular-nums transition-transform',
          isAnimating && 'animate-score-pop',
          valueClassName
        )}
      >
        {formattedValue}
      </span>

      {showChange && changeDirection && (
        <span
          className={cn(
            'text-xs font-medium transition-opacity',
            isAnimating ? 'opacity-100' : 'opacity-0',
            changeDirection === 'up' ? 'text-green-500' : 'text-red-500'
          )}
        >
          {changeDirection === 'up' ? '+' : '−'}
          {Math.abs(value - (previousValue ?? animationStartValue))}
        </span>
      )}
    </div>
  );
}

// ============================================
// ROLLING DIGITS
// ============================================

interface RollingDigitsProps {
  value: number;
  digits?: number;
  duration?: number;
  className?: string;
  digitClassName?: string;
}

export function RollingDigits({
  value,
  digits = 2,
  duration = 400,
  className,
  digitClassName,
}: RollingDigitsProps) {
  const valueStr = String(value).padStart(digits, '0');

  return (
    <div className={cn('flex overflow-hidden', className)}>
      {valueStr.split('').map((digit, index) => (
        <RollingDigit
          key={index}
          digit={parseInt(digit, 10)}
          duration={duration}
          delay={index * 50}
          className={digitClassName}
        />
      ))}
    </div>
  );
}

interface RollingDigitProps {
  digit: number;
  duration: number;
  delay: number;
  className?: string;
}

function RollingDigit({ digit, duration, delay, className }: RollingDigitProps) {
  // Pure CSS transition driven by the `digit` prop.
  // Avoids setState-in-effect (and still provides smooth rolling via transitionDelay).
  return (
    <div className={cn('relative h-[1em] w-[0.6em] overflow-hidden', className)}>
      <div
        className={cn('absolute inset-0 flex flex-col transition-transform')}
        style={{
          transform: `translateY(-${digit * 10}%)`,
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span key={n} className="h-[1em] flex items-center justify-center tabular-nums">
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================
// SCORE TICKER
// ============================================

interface ScoreTickerProps {
  teamA: number;
  teamB: number;
  teamAName?: string;
  teamBName?: string;
  showNames?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreTicker({
  teamA,
  teamB,
  teamAName = 'USA',
  teamBName = 'EUR',
  showNames = true,
  size = 'md',
  className,
}: ScoreTickerProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  const nameSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {/* Team A */}
      <div className="text-center">
        {showNames && (
          <p
            className={cn('font-medium mb-1', nameSizeClasses[size])}
            style={{ color: 'var(--team-usa)' }}
          >
            {teamAName}
          </p>
        )}
        <AnimatedCounter
          value={teamA}
          format="number"
          valueClassName={cn('font-bold', sizeClasses[size])}
          className="justify-center"
        />
      </div>

      {/* Divider */}
      <span
        className={cn('font-light', sizeClasses[size])}
        style={{ color: 'var(--ink-tertiary)' }}
      >
        –
      </span>

      {/* Team B */}
      <div className="text-center">
        {showNames && (
          <p
            className={cn('font-medium mb-1', nameSizeClasses[size])}
            style={{ color: 'var(--team-europe)' }}
          >
            {teamBName}
          </p>
        )}
        <AnimatedCounter
          value={teamB}
          format="number"
          valueClassName={cn('font-bold', sizeClasses[size])}
          className="justify-center"
        />
      </div>
    </div>
  );
}

// ============================================
// STAT COUNTER
// ============================================

interface StatCounterProps {
  value: number;
  label: string;
  previousValue?: number;
  format?: CounterFormat;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
  className?: string;
}

export function StatCounter({
  value,
  label,
  previousValue,
  format = 'number',
  icon,
  trend,
  highlight = false,
  className,
}: StatCounterProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl text-center transition-all',
        highlight && 'ring-2 ring-masters animate-pulse-subtle',
        className
      )}
      style={{
        background: highlight ? 'var(--surface-raised)' : 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      {icon && (
        <div
          className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
          style={{
            background: 'var(--surface-raised)',
            color: 'var(--masters)',
          }}
        >
          {icon}
        </div>
      )}

      <AnimatedCounter
        value={value}
        previousValue={previousValue}
        format={format}
        showChange={trend !== undefined}
        valueClassName="text-2xl font-bold"
        className="justify-center"
      />

      <p
        className="text-xs mt-1"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        {label}
      </p>

      {trend && trend !== 'neutral' && (
        <div
          className={cn(
            'mt-2 text-xs font-medium',
            trend === 'up' ? 'text-green-500' : 'text-red-500'
          )}
        >
          {trend === 'up' ? '↑' : '↓'} vs last session
        </div>
      )}
    </div>
  );
}

// ============================================
// COUNTDOWN TIMER
// ============================================

interface CountdownProps {
  targetDate: Date;
  onComplete?: () => void;
  showDays?: boolean;
  showSeconds?: boolean;
  className?: string;
}

export function Countdown({
  targetDate,
  onComplete,
  showDays = true,
  showSeconds = true,
  className,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.total <= 0) {
    return (
      <div className={cn('text-center', className)}>
        <span className="font-bold text-xl" style={{ color: 'var(--masters)' }}>
          Now!
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {showDays && timeLeft.days > 0 && (
        <TimeUnit value={timeLeft.days} label="days" />
      )}
      <TimeUnit value={timeLeft.hours} label="hrs" />
      <TimeUnit value={timeLeft.minutes} label="min" />
      {showSeconds && <TimeUnit value={timeLeft.seconds} label="sec" />}
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <RollingDigits value={value} digits={2} className="justify-center text-2xl font-bold" />
      <p
        className="text-xs mt-0.5"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        {label}
      </p>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatValue(
  value: number,
  format: CounterFormat,
  prefix: string,
  suffix: string
): string {
  let formatted: string;

  switch (format) {
    case 'points':
      formatted = `${value}`;
      suffix = suffix || ' pts';
      break;
    case 'percent':
      formatted = `${value}`;
      suffix = suffix || '%';
      break;
    case 'ordinal':
      formatted = `${value}${getOrdinalSuffix(value)}`;
      break;
    case 'currency':
      formatted = value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      });
      break;
    default:
      formatted = value.toLocaleString();
  }

  return `${prefix}${formatted}${suffix}`;
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function calculateTimeLeft(targetDate: Date) {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const diff = target - now;

  if (diff <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    total: diff,
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default AnimatedCounter;
