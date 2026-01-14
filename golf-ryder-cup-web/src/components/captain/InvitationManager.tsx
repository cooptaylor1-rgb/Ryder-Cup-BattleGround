/**
 * Invitation Manager Component
 *
 * Player invitation and onboarding system:
 * - Generate shareable invite links
 * - Track invitation status
 * - Manage pending invites
 * - Resend/revoke invitations
 *
 * Features:
 * - One-tap sharing via native share API
 * - QR code generation
 * - Status tracking (pending/accepted/declined)
 * - Bulk invite management
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  UserPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Share2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  QrCode,
  Users,
  ChevronDown,
  Send,
  ExternalLink,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type InvitationStatus = 'pending' | 'sent' | 'opened' | 'accepted' | 'declined' | 'expired';

export interface Invitation {
  id: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: InvitationStatus;
  createdAt: string;
  sentAt?: string;
  expiresAt?: string;
  acceptedAt?: string;
  inviteCode: string;
  inviteUrl: string;
  assignedTeam?: 'A' | 'B';
}

export interface TripInviteInfo {
  tripId: string;
  tripName: string;
  shareCode: string;
  shareUrl: string;
  captainName: string;
  startDate?: string;
  location?: string;
}

interface InvitationManagerProps {
  tripInfo: TripInviteInfo;
  invitations: Invitation[];
  onSendInvite?: (invite: Partial<Invitation>) => void;
  onResendInvite?: (inviteId: string) => void;
  onRevokeInvite?: (inviteId: string) => void;
  onCopyLink?: (url: string) => void;
  className?: string;
}

// ============================================
// INVITATION MANAGER
// ============================================

export function InvitationManager({
  tripInfo,
  invitations,
  onSendInvite,
  onResendInvite,
  onRevokeInvite,
  onCopyLink,
  className,
}: InvitationManagerProps) {
  const [showNewInvite, setShowNewInvite] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const stats = useMemo(() => ({
    total: invitations.length,
    pending: invitations.filter((i) => ['pending', 'sent', 'opened'].includes(i.status)).length,
    accepted: invitations.filter((i) => i.status === 'accepted').length,
    declined: invitations.filter((i) => i.status === 'declined').length,
  }), [invitations]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tripInfo.shareUrl);
      setCopiedLink(true);
      onCopyLink?.(tripInfo.shareUrl);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback for older browsers
      onCopyLink?.(tripInfo.shareUrl);
    }
  }, [tripInfo.shareUrl, onCopyLink]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${tripInfo.tripName}`,
          text: `${tripInfo.captainName} has invited you to join their golf trip!`,
          url: tripInfo.shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  }, [tripInfo, handleCopyLink]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Share Card */}
      <div
        className="p-4 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-lg">Invite Players</h3>
            <p className="text-white/70 text-sm mt-0.5">
              Share this link to let players join your trip
            </p>
          </div>
          <div
            className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"
          >
            <UserPlus className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Share Code */}
        <div
          className="p-3 rounded-xl bg-white/10 backdrop-blur-sm mb-3"
        >
          <p className="text-white/60 text-xs mb-1">Join Code</p>
          <p className="text-white font-mono text-2xl tracking-wider">
            {tripInfo.shareCode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/20 text-white font-medium transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-masters font-medium transition-colors"
            style={{ color: 'var(--masters)' }}
          >
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-4 h-4" />}
          color="var(--warning)"
        />
        <StatBadge
          label="Accepted"
          value={stats.accepted}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="var(--success)"
        />
        <StatBadge
          label="Declined"
          value={stats.declined}
          icon={<XCircle className="w-4 h-4" />}
          color="var(--error)"
        />
      </div>

      {/* New Invite Button */}
      {onSendInvite && (
        <button
          onClick={() => setShowNewInvite(true)}
          className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          style={{
            background: 'var(--surface)',
            color: 'var(--masters)',
            border: '1px solid var(--rule)',
          }}
        >
          <UserPlus className="w-5 h-5" />
          Send Personal Invite
        </button>
      )}

      {/* Invitations List */}
      {invitations.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
          }}
        >
          <div
            className="p-4"
            style={{ borderBottom: '1px solid var(--rule)' }}
          >
            <h3
              className="font-semibold"
              style={{ color: 'var(--ink)' }}
            >
              Sent Invitations
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
            {invitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onResend={onResendInvite}
                onRevoke={onRevokeInvite}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {invitations.length === 0 && (
        <div
          className="p-8 rounded-2xl text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
          }}
        >
          <Users
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: 'var(--ink-tertiary)' }}
          />
          <p style={{ color: 'var(--ink-secondary)' }}>
            No invitations sent yet
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            Share your join code or send personal invites
          </p>
        </div>
      )}

      {/* New Invite Modal */}
      {showNewInvite && onSendInvite && (
        <NewInviteModal
          onClose={() => setShowNewInvite(false)}
          onSend={(invite) => {
            onSendInvite(invite);
            setShowNewInvite(false);
          }}
          tripInfo={tripInfo}
        />
      )}
    </div>
  );
}

// ============================================
// STAT BADGE
// ============================================

interface StatBadgeProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatBadge({ label, value, icon, color }: StatBadgeProps) {
  return (
    <div
      className="p-3 rounded-xl text-center"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div
        className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
        style={{
          background: `${color}15`,
          color,
        }}
      >
        {icon}
      </div>
      <p
        className="text-xl font-bold"
        style={{ color }}
      >
        {value}
      </p>
      <p
        className="text-xs"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        {label}
      </p>
    </div>
  );
}

// ============================================
// INVITATION ROW
// ============================================

interface InvitationRowProps {
  invitation: Invitation;
  onResend?: (id: string) => void;
  onRevoke?: (id: string) => void;
}

function InvitationRow({ invitation, onResend, onRevoke }: InvitationRowProps) {
  const [showActions, setShowActions] = useState(false);

  const statusConfig: Record<InvitationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pending', color: 'var(--ink-tertiary)', icon: <Clock className="w-4 h-4" /> },
    sent: { label: 'Sent', color: 'var(--warning)', icon: <Send className="w-4 h-4" /> },
    opened: { label: 'Opened', color: 'var(--team-europe)', icon: <ExternalLink className="w-4 h-4" /> },
    accepted: { label: 'Joined', color: 'var(--success)', icon: <CheckCircle2 className="w-4 h-4" /> },
    declined: { label: 'Declined', color: 'var(--error)', icon: <XCircle className="w-4 h-4" /> },
    expired: { label: 'Expired', color: 'var(--ink-tertiary)', icon: <Clock className="w-4 h-4" /> },
  };

  const config = statusConfig[invitation.status];
  const displayName = invitation.recipientName || invitation.recipientEmail || 'Anonymous';

  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
          style={{
            background: 'var(--surface-raised)',
            color: 'var(--ink-secondary)',
          }}
        >
          {displayName[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate"
            style={{ color: 'var(--ink)' }}
          >
            {displayName}
          </p>
          <div className="flex items-center gap-2">
            {invitation.assignedTeam && (
              <span
                className="text-xs font-medium"
                style={{
                  color: invitation.assignedTeam === 'A' ? 'var(--team-usa)' : 'var(--team-europe)',
                }}
              >
                Team {invitation.assignedTeam === 'A' ? 'USA' : 'EUR'}
              </span>
            )}
            <span
              className="text-xs"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              {formatRelativeTime(invitation.createdAt)}
            </span>
          </div>
        </div>

        {/* Status */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
          style={{
            background: `${config.color}15`,
            color: config.color,
          }}
        >
          {config.icon}
          {config.label}
        </div>

        {/* Actions */}
        {(onResend || onRevoke) && invitation.status !== 'accepted' && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActions(false)}
                />
                <div
                  className="absolute right-0 mt-1 py-1 rounded-xl shadow-lg z-20 min-w-[140px]"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--rule)',
                  }}
                >
                  {onResend && (
                    <button
                      onClick={() => {
                        onResend(invitation.id);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-2 text-sm transition-colors"
                      style={{ color: 'var(--ink)' }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Resend
                    </button>
                  )}
                  {onRevoke && (
                    <button
                      onClick={() => {
                        onRevoke(invitation.id);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 flex items-center gap-2 text-sm transition-colors"
                      style={{ color: 'var(--error)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Revoke
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// NEW INVITE MODAL
// ============================================

interface NewInviteModalProps {
  onClose: () => void;
  onSend: (invite: Partial<Invitation>) => void;
  tripInfo: TripInviteInfo;
}

function NewInviteModal({ onClose, onSend, tripInfo }: NewInviteModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [team, setTeam] = useState<'A' | 'B' | undefined>();
  const [sendMethod, setSendMethod] = useState<'email' | 'sms' | 'copy'>('copy');

  const canSend = name.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;

    onSend({
      recipientName: name.trim(),
      recipientEmail: email.trim() || undefined,
      assignedTeam: team,
      status: 'pending',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'var(--canvas)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--rule)' }}
        >
          <h3
            className="font-bold text-lg"
            style={{ color: 'var(--ink)' }}
          >
            Send Invitation
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Player Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--surface)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
              }}
            />
          </div>

          {/* Email (optional) */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@email.com"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--surface)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
              }}
            />
          </div>

          {/* Team Assignment */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--ink)' }}
            >
              Pre-assign to Team
            </label>
            <div className="flex gap-2">
              {(['A', 'B'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTeam(team === t ? undefined : t)}
                  className={cn('flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors')}
                  style={{
                    background: team === t
                      ? (t === 'A' ? 'var(--team-usa)' : 'var(--team-europe)')
                      : 'var(--surface)',
                    color: team === t ? 'white' : 'var(--ink-secondary)',
                    border: `1px solid ${team === t ? 'transparent' : 'var(--rule)'}`,
                  }}
                >
                  Team {t === 'A' ? 'USA' : 'EUR'}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--surface-raised)' }}
          >
            <p
              className="text-xs font-medium uppercase tracking-wide mb-2"
              style={{ color: 'var(--ink-tertiary)' }}
            >
              Invite Preview
            </p>
            <p style={{ color: 'var(--ink)' }}>
              <strong>{tripInfo.captainName}</strong> has invited you to join <strong>{tripInfo.tripName}</strong>!
            </p>
            <p
              className="text-sm mt-2"
              style={{ color: 'var(--ink-secondary)' }}
            >
              Use code: <span className="font-mono font-bold">{tripInfo.shareCode}</span>
            </p>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
            style={{
              background: canSend ? 'var(--masters)' : 'var(--surface)',
              color: canSend ? 'white' : 'var(--ink-tertiary)',
            }}
          >
            <Send className="w-5 h-5" />
            Create Invitation
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QR CODE CARD
// ============================================

interface QRCodeCardProps {
  shareUrl: string;
  shareCode: string;
  tripName: string;
  className?: string;
}

export function QRCodeCard({ shareUrl, shareCode, tripName, className }: QRCodeCardProps) {
  // Note: In production, you'd use a QR code library like qrcode.react
  // This is a placeholder representation
  return (
    <div
      className={cn('p-6 rounded-2xl text-center', className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--rule)',
      }}
    >
      <div
        className="w-48 h-48 mx-auto mb-4 rounded-xl flex items-center justify-center"
        style={{ background: 'white', border: '1px solid var(--rule)' }}
      >
        <QrCode
          className="w-32 h-32"
          style={{ color: 'var(--ink)' }}
        />
      </div>
      <p
        className="font-semibold"
        style={{ color: 'var(--ink)' }}
      >
        {tripName}
      </p>
      <p
        className="font-mono text-2xl mt-2"
        style={{ color: 'var(--masters)' }}
      >
        {shareCode}
      </p>
      <p
        className="text-sm mt-2"
        style={{ color: 'var(--ink-tertiary)' }}
      >
        Scan or enter code to join
      </p>
    </div>
  );
}

// ============================================
// HELPERS
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default InvitationManager;
