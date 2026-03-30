import React from 'react';

export interface ProfileFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'number';
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hint?: string;
}

export function ProfileField({
  icon,
  label,
  value,
  isEditing,
  onChange,
  type = 'text',
  min,
  max,
  step,
  disabled = false,
  hint,
}: ProfileFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
        <span className="text-ink-faint">{icon}</span>
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          readOnly={disabled}
          className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-sans text-[length:var(--text-base)] text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--surface)] disabled:text-ink-secondary"
        />
      ) : (
        <p className="font-sans text-[length:var(--text-base)] text-ink m-0 leading-[1.5]">
          {value || '\u2014'}
        </p>
      )}
      {hint && (
        <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)] leading-[1.4]">
          {hint}
        </p>
      )}
    </div>
  );
}
