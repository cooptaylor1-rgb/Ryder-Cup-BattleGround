'use client';

/**
 * Quick Profile Mode
 *
 * Streamlined profile creation for players in a hurry.
 * Captures only essential fields: name, handicap, contact.
 * Can be expanded to full profile later.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    User,
    Hash,
    Mail,
    Phone,
    Check,
    ChevronRight,
    Clock,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface QuickProfileData {
    firstName: string;
    lastName: string;
    handicapIndex: number | null;
    email: string;
    phone?: string;
}

interface QuickProfileModeProps {
    onComplete: (data: QuickProfileData) => void;
    onSwitchToFull: () => void;
    initialData?: Partial<QuickProfileData>;
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function QuickProfileMode({
    onComplete,
    onSwitchToFull,
    initialData,
    className,
}: QuickProfileModeProps) {
    const [data, setData] = useState<QuickProfileData>({
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        handicapIndex: initialData?.handicapIndex ?? null,
        email: initialData?.email || '',
        phone: initialData?.phone || '',
    });
    const [errors, setErrors] = useState<Partial<Record<keyof QuickProfileData, string>>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const updateField = <K extends keyof QuickProfileData>(
        field: K,
        value: QuickProfileData[K]
    ) => {
        setData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof QuickProfileData, string>> = {};

        if (!data.firstName.trim()) {
            newErrors.firstName = 'Required';
        }
        if (!data.lastName.trim()) {
            newErrors.lastName = 'Required';
        }
        if (!data.email.trim()) {
            newErrors.email = 'Required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            newErrors.email = 'Invalid email';
        }
        if (data.handicapIndex === null) {
            newErrors.handicapIndex = 'Required';
        } else if (data.handicapIndex < -10 || data.handicapIndex > 54) {
            newErrors.handicapIndex = 'Must be -10 to 54';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onComplete(data);
        }
    };

    const progress = [
        !!data.firstName.trim(),
        !!data.lastName.trim(),
        data.handicapIndex !== null,
        !!data.email.trim(),
    ].filter(Boolean).length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn('space-y-6', className)}
        >
            {/* Header */}
            <div className="text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30"
                >
                    <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-xl font-bold text-[var(--ink-primary)]">
                    Quick Setup
                </h2>
                <p className="text-[var(--ink-secondary)] mt-1">
                    Just the essentials • 30 seconds
                </p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            'w-2 h-2 rounded-full transition-colors',
                            progress >= i
                                ? 'bg-masters'
                                : 'bg-[color:var(--ink-tertiary)]/20'
                        )}
                    />
                ))}
            </div>

            {/* Form Card */}
            <div className="card rounded-2xl shadow-sm overflow-hidden">
                {/* Name Row */}
                <div className="grid grid-cols-2 divide-x divide-[var(--rule)]">
                    <QuickInput
                        icon={<User className="w-4 h-4" />}
                        placeholder="First name"
                        value={data.firstName}
                        onChange={(v) => updateField('firstName', v)}
                        error={errors.firstName}
                        focused={focusedField === 'firstName'}
                        onFocus={() => setFocusedField('firstName')}
                        onBlur={() => setFocusedField(null)}
                        autoFocus
                    />
                    <QuickInput
                        placeholder="Last name"
                        value={data.lastName}
                        onChange={(v) => updateField('lastName', v)}
                        error={errors.lastName}
                        focused={focusedField === 'lastName'}
                        onFocus={() => setFocusedField('lastName')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>

                <div className="border-t border-[var(--rule)]">
                    <QuickInput
                        icon={<Hash className="w-4 h-4" />}
                        placeholder="Handicap (e.g., 12.5)"
                        value={data.handicapIndex !== null ? String(data.handicapIndex) : ''}
                        onChange={(v) => {
                            const num = v === '' ? null : parseFloat(v);
                            updateField('handicapIndex', isNaN(num!) ? null : num);
                        }}
                        error={errors.handicapIndex}
                        type="number"
                        focused={focusedField === 'handicap'}
                        onFocus={() => setFocusedField('handicap')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>

                <div className="border-t border-[var(--rule)]">
                    <QuickInput
                        icon={<Mail className="w-4 h-4" />}
                        placeholder="Email address"
                        value={data.email}
                        onChange={(v) => updateField('email', v)}
                        error={errors.email}
                        type="email"
                        focused={focusedField === 'email'}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>

                <div className="border-t border-[var(--rule)]">
                    <QuickInput
                        icon={<Phone className="w-4 h-4" />}
                        placeholder="Phone (optional)"
                        value={data.phone || ''}
                        onChange={(v) => updateField('phone', v)}
                        type="tel"
                        focused={focusedField === 'phone'}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>
            </div>

            {/* Submit Button */}
            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className={cn(
                    'w-full py-4 px-6 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-all',
                    progress === 4
                        ? 'bg-masters text-white shadow-lg shadow-masters/30'
                        : 'bg-[color:var(--ink-tertiary)]/10 text-[var(--ink-tertiary)]'
                )}
            >
                <Zap className="w-5 h-5" />
                Done – Join Trip
                <ChevronRight className="w-5 h-5" />
            </motion.button>

            {/* Switch to Full Mode */}
            <button
                onClick={onSwitchToFull}
                className="w-full py-3 text-center text-sm text-[var(--ink-secondary)] hover:text-masters transition-colors flex items-center justify-center gap-2"
            >
                <Sparkles className="w-4 h-4" />
                Want to add more details?
                <span className="font-medium text-masters">Full profile →</span>
            </button>

            {/* Time Estimate */}
            <div className="flex items-center justify-center gap-2 text-xs text-[var(--ink-tertiary)]">
                <Clock className="w-3.5 h-3.5" />
                You can complete your full profile anytime later
            </div>
        </motion.div>
    );
}

// ============================================
// QUICK INPUT COMPONENT
// ============================================

interface QuickInputProps {
    icon?: React.ReactNode;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    type?: 'text' | 'email' | 'tel' | 'number';
    focused?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    autoFocus?: boolean;
}

function QuickInput({
    icon,
    placeholder,
    value,
    onChange,
    error,
    type = 'text',
    focused,
    onFocus,
    onBlur,
    autoFocus,
}: QuickInputProps) {
    const hasValue = value.trim().length > 0;

    return (
        <div className={cn(
            'relative transition-colors',
            focused && 'bg-masters/5',
            error && 'bg-[color:var(--error)]/10'
        )}>
            <div className="flex items-center">
                {icon && (
                    <div className={cn(
                        'pl-4 transition-colors',
                        focused ? 'text-masters' : 'text-[var(--ink-tertiary)]'
                    )}>
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoFocus={autoFocus}
                    className={cn(
                        'flex-1 py-4 px-4 bg-transparent text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]',
                        'focus:outline-none text-base',
                        icon ? 'pl-3' : 'pl-4'
                    )}
                />
                <AnimatePresence>
                    {hasValue && !error && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="pr-4"
                        >
                            <div className="w-5 h-5 rounded-full bg-masters/20 flex items-center justify-center">
                                <Check className="w-3 h-3 text-masters" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && (
                <div className="px-4 pb-2 text-xs text-[var(--error)]">
                    {error}
                </div>
            )}
        </div>
    );
}

export default QuickProfileMode;
