/**
 * Direct Message to Groups
 *
 * Quick communication system for captains to reach specific groups.
 * Message all players, specific teams, or individual tee time groups.
 *
 * Features:
 * - Pre-defined quick messages (running late, weather alert, etc.)
 * - Custom message composition
 * - Group targeting (all, team, tee time, individual)
 * - Multiple delivery methods (SMS, push, in-app)
 * - Message history and read receipts
 */

'use client';

import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    Users,
    User,
    Clock,
    AlertTriangle,
    Cloud,
    CheckCircle2,
    ChevronDown,
    X,
    Zap,
    History,
    CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type MessageRecipientType = 'all' | 'team' | 'tee-time' | 'individual';

export interface MessageRecipient {
    id: string;
    name: string;
    type: MessageRecipientType;
    playerIds?: string[];
    teeTime?: string;
    teamId?: 'A' | 'B';
}

export interface QuickMessageTemplate {
    id: string;
    icon: ReactNode;
    label: string;
    message: string;
    urgency: 'normal' | 'urgent';
}

export interface MessagePlayer {
    id: string;
    firstName: string;
    lastName: string;
    teamId: 'A' | 'B';
    teeTime?: string;
    phone?: string;
    pushEnabled?: boolean;
}

export interface SentMessage {
    id: string;
    message: string;
    recipients: MessageRecipient[];
    timestamp: Date;
    deliveryMethod: 'sms' | 'push' | 'both';
    readBy: string[];
    totalRecipients: number;
}

interface DirectMessageProps {
    players: MessagePlayer[];
    teeTimes: { time: string; playerIds: string[] }[];
    teamAName?: string;
    teamBName?: string;
    onSendMessage?: (message: string, recipients: MessageRecipient[], method: 'sms' | 'push' | 'both') => void;
    className?: string;
}

// ============================================
// QUICK MESSAGE TEMPLATES
// ============================================

const QUICK_TEMPLATES: QuickMessageTemplate[] = [
    {
        id: 'running-late',
        icon: <Clock className="w-4 h-4" />,
        label: 'Running Late',
        message: 'Heads up - we\'re running about 10 minutes behind. Please adjust accordingly.',
        urgency: 'normal',
    },
    {
        id: 'weather-alert',
        icon: <Cloud className="w-4 h-4" />,
        label: 'Weather Alert',
        message: '⚠️ Weather update - please check the app for the latest conditions and any schedule changes.',
        urgency: 'urgent',
    },
    {
        id: 'gather-up',
        icon: <Users className="w-4 h-4" />,
        label: 'Gather Up',
        message: 'Please gather at the first tee - we\'re about to get started!',
        urgency: 'normal',
    },
    {
        id: 'rules-reminder',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Rules Reminder',
        message: 'Quick reminder: All matches are match play, lift/clean/place is in effect. Have fun!',
        urgency: 'normal',
    },
    {
        id: 'pace-alert',
        icon: <Zap className="w-4 h-4" />,
        label: 'Pace of Play',
        message: 'Let\'s try to pick up the pace a bit - we\'re falling behind the group ahead.',
        urgency: 'normal',
    },
    {
        id: 'emergency',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Emergency Stop',
        message: '🚨 STOP PLAY - Please return to the clubhouse immediately.',
        urgency: 'urgent',
    },
];

// ============================================
// DIRECT MESSAGE COMPONENT
// ============================================

export function DirectMessage({
    players,
    teeTimes,
    teamAName = 'Team A',
    teamBName = 'Team B',
    onSendMessage,
    className,
}: DirectMessageProps) {
    const [selectedRecipients, setSelectedRecipients] = useState<MessageRecipient[]>([]);
    const [customMessage, setCustomMessage] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState<'sms' | 'push' | 'both'>('both');
    const [showRecipientPicker, setShowRecipientPicker] = useState(false);
    const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [sending, setSending] = useState(false);

    // Build recipient options
    const recipientOptions: MessageRecipient[] = [
        {
            id: 'all',
            name: 'Everyone',
            type: 'all',
            playerIds: players.map(p => p.id),
        },
        {
            id: 'team-a',
            name: teamAName,
            type: 'team',
            teamId: 'A',
            playerIds: players.filter(p => p.teamId === 'A').map(p => p.id),
        },
        {
            id: 'team-b',
            name: teamBName,
            type: 'team',
            teamId: 'B',
            playerIds: players.filter(p => p.teamId === 'B').map(p => p.id),
        },
        ...teeTimes.map(tt => ({
            id: `tee-${tt.time}`,
            name: `${tt.time} Tee Time`,
            type: 'tee-time' as const,
            teeTime: tt.time,
            playerIds: tt.playerIds,
        })),
        ...players.map(p => ({
            id: `player-${p.id}`,
            name: `${p.firstName} ${p.lastName}`,
            type: 'individual' as const,
            playerIds: [p.id],
        })),
    ];

    const handleSelectTemplate = (template: QuickMessageTemplate) => {
        setCustomMessage(template.message);
    };

    const handleToggleRecipient = (recipient: MessageRecipient) => {
        setSelectedRecipients(prev => {
            const exists = prev.find(r => r.id === recipient.id);
            if (exists) {
                return prev.filter(r => r.id !== recipient.id);
            }
            // If selecting "all", clear other selections
            if (recipient.type === 'all') {
                return [recipient];
            }
            // Remove "all" if selecting specific
            return [...prev.filter(r => r.type !== 'all'), recipient];
        });
    };

    const handleSend = useCallback(async () => {
        if (!customMessage.trim() || selectedRecipients.length === 0) return;

        setSending(true);

        // Simulate send delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        const totalRecipients = new Set(
            selectedRecipients.flatMap(r => r.playerIds || [])
        ).size;

        const newMessage: SentMessage = {
            id: crypto.randomUUID(),
            message: customMessage,
            recipients: selectedRecipients,
            timestamp: new Date(),
            deliveryMethod,
            readBy: [],
            totalRecipients,
        };

        setSentMessages(prev => [newMessage, ...prev]);
        onSendMessage?.(customMessage, selectedRecipients, deliveryMethod);

        // Reset form
        setCustomMessage('');
        setSelectedRecipients([]);
        setSending(false);
    }, [customMessage, selectedRecipients, deliveryMethod, onSendMessage]);

    const getRecipientCount = () => {
        const playerIds = new Set(
            selectedRecipients.flatMap(r => r.playerIds || [])
        );
        return playerIds.size;
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div className="p-4 border-b border-[var(--rule)]">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--ink-primary)]">
                            Quick Message
                        </h2>
                        <p className="text-sm text-[var(--ink-tertiary)]">
                            Send announcements to players
                        </p>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            showHistory ? 'bg-[color:var(--ink-primary)]/5' : 'hover:bg-[color:var(--ink-primary)]/5'
                        )}
                    >
                        <History className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    </button>
                </div>
            </div>

            {/* Message History Panel */}
            <AnimatePresence>
                {showHistory && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-[var(--rule)] bg-[var(--surface)]"
                    >
                        <div className="p-4 max-h-48 overflow-y-auto">
                            <p className="text-sm font-medium mb-3 text-[var(--ink-tertiary)]">
                                Recent Messages
                            </p>
                            {sentMessages.length === 0 ? (
                                <p className="text-sm text-[var(--ink-tertiary)]">
                                    No messages sent yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {sentMessages.slice(0, 5).map(msg => (
                                        <div
                                            key={msg.id}
                                            className="p-3 rounded-lg bg-[var(--surface-secondary)]"
                                        >
                                            <p className="text-sm text-[var(--ink-primary)]">
                                                {msg.message}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--ink-tertiary)]">
                                                <span>{msg.recipients.map(r => r.name).join(', ')}</span>
                                                <span>•</span>
                                                <span>{msg.timestamp.toLocaleTimeString()}</span>
                                                <span className="flex items-center gap-1">
                                                    <CheckCheck className="w-3 h-3" />
                                                    {msg.readBy.length}/{msg.totalRecipients}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Templates */}
            <div className="p-4 border-b border-[var(--rule)]">
                <p className="text-sm font-medium mb-3 text-[var(--ink-tertiary)]">
                    Quick Messages
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {QUICK_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                                'flex items-center gap-2 p-3 rounded-lg text-left transition-colors border',
                                template.urgency === 'urgent'
                                    ? 'bg-[color:var(--error)]/10 border-[color:var(--error)]/30 hover:bg-[color:var(--error)]/15'
                                    : 'bg-[var(--surface)] border-[var(--rule)] hover:bg-[color:var(--ink-primary)]/5'
                            )}
                        >
                            <span
                                className={cn(
                                    template.urgency === 'urgent' ? 'text-[var(--error)]' : 'text-[var(--ink-tertiary)]'
                                )}
                            >
                                {template.icon}
                            </span>
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    template.urgency === 'urgent' ? 'text-[var(--error)]' : 'text-[var(--ink-primary)]'
                                )}
                            >
                                {template.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recipient Selector */}
            <div className="p-4 border-b border-[var(--rule)]">
                <p className="text-sm font-medium mb-3 text-[var(--ink-tertiary)]">
                    Send To
                </p>

                {/* Selected Recipients */}
                {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {selectedRecipients.map(recipient => (
                            <span
                                key={recipient.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm bg-[color:var(--masters)]/10 text-[var(--masters)]"
                            >
                                {recipient.type === 'all' && <Users className="w-3 h-3" />}
                                {recipient.type === 'team' && <Users className="w-3 h-3" />}
                                {recipient.type === 'tee-time' && <Clock className="w-3 h-3" />}
                                {recipient.type === 'individual' && <User className="w-3 h-3" />}
                                {recipient.name}
                                <button
                                    onClick={() => handleToggleRecipient(recipient)}
                                    className="hover:opacity-70"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Recipient Picker */}
                <button
                    onClick={() => setShowRecipientPicker(!showRecipientPicker)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] border border-[var(--rule)] hover:bg-[color:var(--ink-primary)]/5 transition-colors"
                >
                    <span
                        className={cn(
                            'text-sm',
                            selectedRecipients.length > 0 ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-tertiary)]'
                        )}
                    >
                        {selectedRecipients.length > 0
                            ? `${getRecipientCount()} player${getRecipientCount() !== 1 ? 's' : ''} selected`
                            : 'Choose recipients...'}
                    </span>
                    <ChevronDown
                        className={cn(
                            'w-5 h-5 transition-transform text-[var(--ink-tertiary)]',
                            showRecipientPicker && 'rotate-180'
                        )}
                    />
                </button>

                <AnimatePresence>
                    {showRecipientPicker && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div
                                className="mt-2 p-3 rounded-lg max-h-48 overflow-y-auto bg-[var(--surface)] border border-[var(--rule)]"
                            >
                                {/* Groups */}
                                <div className="mb-3">
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2 text-[var(--ink-tertiary)]">
                                        Groups
                                    </p>
                                    <div className="space-y-1">
                                        {recipientOptions.filter(r => r.type === 'all' || r.type === 'team').map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleToggleRecipient(option)}
                                                className={cn(
                                                    'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                                                    selectedRecipients.find(r => r.id === option.id)
                                                        ? 'bg-[color:var(--ink-primary)]/5'
                                                        : 'hover:bg-[color:var(--ink-primary)]/3'
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {option.type === 'team' && option.teamId === 'A' && (
                                                        <div className="w-3 h-3 rounded-full bg-team-usa" />
                                                    )}
                                                    {option.type === 'team' && option.teamId === 'B' && (
                                                        <div className="w-3 h-3 rounded-full bg-team-europe" />
                                                    )}
                                                    <span className="text-[var(--ink-primary)]">{option.name}</span>
                                                </span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4 text-[var(--masters)]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tee Times */}
                                <div className="mb-3">
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2 text-[var(--ink-tertiary)]">
                                        Tee Times
                                    </p>
                                    <div className="space-y-1">
                                        {recipientOptions.filter(r => r.type === 'tee-time').map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleToggleRecipient(option)}
                                                className={cn(
                                                    'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                                                    selectedRecipients.find(r => r.id === option.id)
                                                        ? 'bg-[color:var(--ink-primary)]/5'
                                                        : 'hover:bg-[color:var(--ink-primary)]/3'
                                                )}
                                            >
                                                <span className="text-[var(--ink-primary)]">{option.name}</span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4 text-[var(--masters)]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Individuals */}
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2 text-[var(--ink-tertiary)]">
                                        Individuals
                                    </p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {recipientOptions.filter(r => r.type === 'individual').map(option => (
                                            <button
                                                key={option.id}
                                                onClick={() => handleToggleRecipient(option)}
                                                className={cn(
                                                    'w-full flex items-center justify-between p-2 rounded-lg transition-colors',
                                                    selectedRecipients.find(r => r.id === option.id)
                                                        ? 'bg-[color:var(--ink-primary)]/5'
                                                        : 'hover:bg-[color:var(--ink-primary)]/3'
                                                )}
                                            >
                                                <span className="text-[var(--ink-primary)]">{option.name}</span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4 text-[var(--masters)]" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Message Composer */}
            <div className="flex-1 p-4">
                <p className="text-sm font-medium mb-3 text-[var(--ink-tertiary)]">
                    Message
                </p>
                <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full h-32 p-3 rounded-lg resize-none bg-[var(--surface)] text-[var(--ink-primary)] border border-[var(--rule)] focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/30"
                />

                {/* Delivery Method */}
                <div className="flex items-center gap-4 mt-3">
                    <p className="text-sm text-[var(--ink-tertiary)]">Send via:</p>
                    <div className="flex gap-2">
                        {(['sms', 'push', 'both'] as const).map(method => (
                            <button
                                key={method}
                                onClick={() => setDeliveryMethod(method)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors border border-[var(--rule)]',
                                    deliveryMethod === method
                                        ? 'bg-[color:var(--masters)]/10 text-[var(--masters)]'
                                        : 'bg-[var(--surface)] text-[var(--ink-primary)] hover:bg-[color:var(--ink-primary)]/5'
                                )}
                            >
                                {method === 'sms' ? 'SMS' : method === 'push' ? 'Push' : 'Both'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Send Button */}
            <div className="p-4 border-t border-[var(--rule)]">
                <button
                    onClick={handleSend}
                    disabled={!customMessage.trim() || selectedRecipients.length === 0 || sending}
                    className={cn(
                        'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                        'bg-[var(--masters)] text-[var(--canvas)]',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                >
                    {sending ? (
                        <>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                                <Send className="w-5 h-5" />
                            </motion.div>
                            Sending...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Send Message
                            {selectedRecipients.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs bg-[color:var(--canvas-raised)]/20 text-[var(--canvas)]">
                                    {getRecipientCount()}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

export default DirectMessage;
