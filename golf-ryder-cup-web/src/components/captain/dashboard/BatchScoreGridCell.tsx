'use client';

import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

interface BatchScoreGridCellProps {
  cellId: string;
  value: number | null;
  isDirty: boolean;
  hasError: boolean;
  teamColor: string;
  isFocused: boolean;
  onFocus: (cellId: string) => void;
  onChange: (cellId: string, value: number | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, cellId: string) => void;
}

export function BatchScoreGridCell({
  cellId,
  value,
  isDirty,
  hasError,
  teamColor,
  isFocused,
  onFocus,
  onChange,
  onKeyDown,
}: BatchScoreGridCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isFocused]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue === '') {
      onChange(cellId, null);
      return;
    }

    const parsedValue = parseInt(nextValue, 10);
    if (!Number.isNaN(parsedValue)) {
      onChange(cellId, parsedValue);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value ?? ''}
      onChange={handleChange}
      onFocus={() => onFocus(cellId)}
      onKeyDown={(event) => onKeyDown(event, cellId)}
      className={cn(
        'h-8 w-10 rounded text-center text-sm font-medium transition-all',
        'focus:outline-none focus:ring-2',
        hasError && 'bg-[color:var(--error)]/10',
        isDirty && !hasError && 'bg-[color:var(--warning)]/10'
      )}
      style={{
        background: hasError ? undefined : isDirty ? undefined : 'var(--surface)',
        border: `1px solid ${isFocused ? teamColor : 'var(--rule)'}`,
        color: 'var(--ink)',
        ['--tw-ring-color' as string]: teamColor,
      }}
    />
  );
}
