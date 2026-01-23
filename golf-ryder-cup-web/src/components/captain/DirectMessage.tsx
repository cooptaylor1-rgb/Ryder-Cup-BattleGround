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
    icon: React.ReactNode;
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
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Quick Message
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            Send announcements to players
                        </p>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            showHistory ? 'bg-white/10' : ''
                        )}
                    >
                        <History className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
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
                        className="overflow-hidden border-b"
                        style={{ borderColor: 'rgba(128, 120, 104, 0.2)', background: 'var(--surface)' }}
                    >
                        <div className="p-4 max-h-48 overflow-y-auto">
                            <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-muted)' }}>
                                Recent Messages
                            </p>
                            {sentMessages.length === 0 ? (
                                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                    No messages sent yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {sentMessages.slice(0, 5).map(msg => (
                                        <div
                                            key={msg.id}
                                            className="p-3 rounded-lg"
                                            style={{ background: 'var(--canvas)' }}
                                        >
                                            <p className="text-sm" style={{ color: 'var(--ink)' }}>
                                                {msg.message}
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--ink-muted)' }}>
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
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-muted)' }}>
                    Quick Messages
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {QUICK_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={cn(
                                'flex items-center gap-2 p-3 rounded-lg text-left transition-colors',
                                'hover:bg-white/10'
                            )}
                            style={{
                                background: template.urgency === 'urgent' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
                                border: '1px solid rgba(128, 120, 104, 0.2)',
                            }}
                        >
                            <span style={{ color: template.urgency === 'urgent' ? '#ef4444' : 'var(--ink-muted)' }}>
                                {template.icon}
                            </span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: template.urgency === 'urgent' ? '#ef4444' : 'var(--ink)' }}
                            >
                                {template.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recipient Selector */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-muted)' }}>
                    Send To
                </p>

                {/* Selected Recipients */}
                {selectedRecipients.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {selectedRecipients.map(recipient => (
                            <span
                                key={recipient.id}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm"
                                style={{ background: 'var(--masters-muted)', color: 'var(--masters)' }}
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
                    className="w-full flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                >
                    <span style={{ color: selectedRecipients.length > 0 ? 'var(--ink)' : 'var(--ink-muted)' }}>
                        {selectedRecipients.length > 0
                            ? `${getRecipientCount()} player${getRecipientCount() !== 1 ? 's' : ''} selected`
                            : 'Choose recipients...'}
                    </span>
                    <ChevronDown
                        className={cn('w-5 h-5 transition-transform', showRecipientPicker && 'rotate-180')}
                        style={{ color: 'var(--ink-muted)' }}
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
                                className="mt-2 p-3 rounded-lg max-h-48 overflow-y-auto"
                                style={{ background: 'var(--surface)' }}
                            >
                                {/* Groups */}
                                <div className="mb-3">
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--ink-muted)' }}>
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
                                                        ? 'bg-white/10'
                                                        : 'hover:bg-white/5'
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    {option.type === 'team' && option.teamId === 'A' && (
                                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                                    )}
                                                    {option.type === 'team' && option.teamId === 'B' && (
                                                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                    )}
                                                    <span style={{ color: 'var(--ink)' }}>{option.name}</span>
                                                </span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--masters)' }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tee Times */}
                                <div className="mb-3">
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--ink-muted)' }}>
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
                                                        ? 'bg-white/10'
                                                        : 'hover:bg-white/5'
                                                )}
                                            >
                                                <span style={{ color: 'var(--ink)' }}>{option.name}</span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--masters)' }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Individuals */}
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--ink-muted)' }}>
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
                                                        ? 'bg-white/10'
                                                        : 'hover:bg-white/5'
                                                )}
                                            >
                                                <span style={{ color: 'var(--ink)' }}>{option.name}</span>
                                                {selectedRecipients.find(r => r.id === option.id) && (
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--masters)' }} />
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
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--ink-muted)' }}>
                    Message
                </p>
                <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full h-32 p-3 rounded-lg resize-none"
                    style={{
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        border: '1px solid rgba(128, 120, 104, 0.2)',
                    }}
                />

                {/* Delivery Method */}
                <div className="flex items-center gap-4 mt-3">
                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>Send via:</p>
                    <div className="flex gap-2">
                        {(['sms', 'push', 'both'] as const).map(method => (
                            <button
                                key={method}
                                onClick={() => setDeliveryMethod(method)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                                    deliveryMethod === method ? 'bg-white/10' : ''
                                )}
                                style={{
                                    background: deliveryMethod === method ? 'var(--masters-muted)' : 'var(--surface)',
                                    color: deliveryMethod === method ? 'var(--masters)' : 'var(--ink)',
                                    border: '1px solid rgba(128, 120, 104, 0.2)',
                                }}
                            >
                                {method === 'sms' ? 'SMS' : method === 'push' ? 'Push' : 'Both'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Send Button */}
            <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <button
                    onClick={handleSend}
                    disabled={!customMessage.trim() || selectedRecipients.length === 0 || sending}
                    className={cn(
                        'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    style={{
                        background: 'var(--masters)',
                        color: 'white',
                    }}
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
                                <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">
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
