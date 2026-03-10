'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  BadgeCheck,
  Clock3,
  Copy,
  Link2,
  Mail,
  MapPin,
  QrCode,
  RefreshCw,
  Send,
  Share2,
  type LucideIcon,
  Trash2,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { QRCode } from '@/components/ui/QRCode';
import { cn } from '@/lib/utils';

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

const STATUS_META: Record<
  InvitationStatus,
  {
    label: string;
    icon: LucideIcon;
    accent: string;
    surfaceClassName: string;
  }
> = {
  pending: {
    label: 'Pending',
    icon: Clock3,
    accent: 'var(--warning)',
    surfaceClassName: 'bg-[color:var(--warning)]/10 text-[var(--warning)]',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    accent: 'var(--team-europe)',
    surfaceClassName: 'bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
  },
  opened: {
    label: 'Opened',
    icon: Link2,
    accent: 'var(--team-usa)',
    surfaceClassName: 'bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
  },
  accepted: {
    label: 'Accepted',
    icon: BadgeCheck,
    accent: 'var(--success)',
    surfaceClassName: 'bg-[color:var(--success)]/10 text-[var(--success)]',
  },
  declined: {
    label: 'Declined',
    icon: XCircle,
    accent: 'var(--error)',
    surfaceClassName: 'bg-[color:var(--error)]/10 text-[var(--error)]',
  },
  expired: {
    label: 'Expired',
    icon: Clock3,
    accent: 'var(--ink-tertiary)',
    surfaceClassName: 'bg-[color:var(--ink-tertiary)]/12 text-[var(--ink-tertiary)]',
  },
};

export function InvitationManager({
  tripInfo,
  invitations,
  onSendInvite,
  onResendInvite,
  onRevokeInvite,
  onCopyLink,
  className,
}: InvitationManagerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  const stats = useMemo(
    () => ({
      total: invitations.length,
      pending: invitations.filter((invite) =>
        ['pending', 'sent', 'opened'].includes(invite.status)
      ).length,
      accepted: invitations.filter((invite) => invite.status === 'accepted').length,
      declined: invitations.filter((invite) => invite.status === 'declined').length,
    }),
    [invitations]
  );

  const handleCopyLink = useCallback(async () => {
    if (!tripInfo.shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(tripInfo.shareUrl);
      onCopyLink?.(tripInfo.shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      onCopyLink?.(tripInfo.shareUrl);
    }
  }, [onCopyLink, tripInfo.shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!tripInfo.shareUrl) {
      return;
    }

    const payload = {
      title: `Join ${tripInfo.tripName}`,
      text: `${tripInfo.captainName} invited you to the trip. Use code ${tripInfo.shareCode}.`,
      url: tripInfo.shareUrl,
    };

    if (!navigator.share) {
      await handleCopyLink();
      return;
    }

    try {
      await navigator.share(payload);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        await handleCopyLink();
      }
    }
  }, [handleCopyLink, tripInfo.captainName, tripInfo.shareCode, tripInfo.shareUrl, tripInfo.tripName]);

  return (
    <div className={cn('space-y-[var(--space-4)]', className)}>
      <section className="grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.12fr)_18rem]">
        <div className="rounded-[1.9rem] border border-[var(--masters)]/20 bg-[linear-gradient(145deg,rgba(11,94,55,0.95),rgba(5,58,35,0.98))] p-[var(--space-5)] text-[var(--canvas)] shadow-[0_26px_54px_rgba(5,58,35,0.24)]">
          <div className="flex items-start justify-between gap-[var(--space-4)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/72">
                Share The Trip
              </p>
              <h3 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic leading-[1.02] text-[var(--canvas)]">
                Give the group one clean way in.
              </h3>
              <p className="mt-[var(--space-3)] max-w-[32rem] text-sm leading-6 text-[color:var(--canvas)]/78">
                The best invite is the one that is unmistakable. Send the link, post the code,
                and let the captain desk look organized instead of improvised.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10">
              <UserPlus size={20} />
            </div>
          </div>

          <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="rounded-[1.4rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
              <p className="type-overline tracking-[0.15em] text-[color:var(--canvas)]/68">Join Code</p>
              <p className="mt-[var(--space-2)] font-mono text-[2rem] tracking-[0.28em] text-[var(--canvas)]">
                {tripInfo.shareCode}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
              <div className="flex items-center gap-[var(--space-2)] text-[color:var(--canvas)]/72">
                <Link2 size={16} />
                <span className="type-overline tracking-[0.14em]">Trip Link</span>
              </div>
              <p className="mt-[var(--space-2)] break-all text-sm leading-6 text-[var(--canvas)]">
                {tripInfo.shareUrl}
              </p>
            </div>
          </div>

          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <Button
              variant="secondary"
              className="border-[color:var(--canvas)]/18 bg-[color:var(--canvas)] text-[var(--masters)] hover:bg-[color:var(--canvas)]/92"
              leftIcon={copiedLink ? <BadgeCheck size={16} /> : <Copy size={16} />}
              onClick={() => {
                void handleCopyLink();
              }}
            >
              {copiedLink ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="outline"
              className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
              leftIcon={<Share2 size={16} />}
              onClick={() => {
                void handleNativeShare();
              }}
            >
              Share invite
            </Button>
            {onSendInvite ? (
              <Button
                variant="ghost"
                className="bg-[color:var(--canvas)]/8 text-[var(--canvas)] hover:bg-[color:var(--canvas)]/16 hover:text-[var(--canvas)]"
                leftIcon={<Mail size={16} />}
                onClick={() => setShowComposer(true)}
              >
                Personal invite
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.98))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.08)]">
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Player Path</p>
          <h3 className="mt-[var(--space-2)] font-serif text-[1.7rem] italic text-[var(--ink)]">
            Keep the next steps obvious.
          </h3>
          <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
            <InviteStep
              icon={<Share2 size={16} />}
              title="Share one link"
              detail="Drop the link in the thread, then leave the code somewhere visible for the slow responders."
            />
            <InviteStep
              icon={<QrCode size={16} />}
              title="Use the QR card at check-in"
              detail="The printed code works best when bags are down and everybody is still pretending to be organized."
            />
            <InviteStep
              icon={<Users size={16} />}
              title="Let players self-join"
              detail="The less manual roster wrangling a captain does on arrival morning, the better the day starts."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-[var(--space-3)] sm:grid-cols-4">
        <InviteStatCard label="Total invites" value={stats.total} detail="Tracked personal sends" />
        <InviteStatCard label="Pending" value={stats.pending} detail="Still waiting on a response" />
        <InviteStatCard label="Accepted" value={stats.accepted} detail="Ready to join the trip" />
        <InviteStatCard label="Declined" value={stats.declined} detail="Needs a replacement plan" />
      </section>

      <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-5)] shadow-[0_20px_44px_rgba(41,29,17,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Invite Ledger</p>
            <h3 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink)]">
              Keep the paper trail calm.
            </h3>
            <p className="mt-[var(--space-2)] max-w-[32rem] text-sm leading-6 text-[var(--ink-secondary)]">
              This is the board for personal nudges and follow-ups. The join link does most of the
              work, but the captain still needs a place to see who is lingering.
            </p>
          </div>
          {onSendInvite ? (
            <Button variant="secondary" leftIcon={<UserPlus size={16} />} onClick={() => setShowComposer(true)}>
              New personal invite
            </Button>
          ) : null}
        </div>

        {invitations.length === 0 ? (
          <div className="mt-[var(--space-4)] rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/72 p-[var(--space-5)] text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
              <Mail size={18} />
            </div>
            <h4 className="mt-[var(--space-3)] text-base font-semibold text-[var(--ink)]">
              No personal invites on the books yet.
            </h4>
            <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
              That is fine if the share link is doing the job. Use personal invites only when the
              captain needs a direct nudge for one player.
            </p>
          </div>
        ) : (
          <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onResendInvite={onResendInvite}
                onRevokeInvite={onRevokeInvite}
              />
            ))}
          </div>
        )}
      </section>

      {onSendInvite ? (
        <InviteComposerModal
          isOpen={showComposer}
          tripInfo={tripInfo}
          onClose={() => setShowComposer(false)}
          onSend={(invite) => {
            onSendInvite(invite);
            setShowComposer(false);
          }}
        />
      ) : null}
    </div>
  );
}

function InviteStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_30px_rgba(41,29,17,0.05)]">
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function InviteStep({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72 p-[var(--space-4)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--masters)]">
        {icon}
        <span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
      </div>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function InvitationCard({
  invitation,
  onResendInvite,
  onRevokeInvite,
}: {
  invitation: Invitation;
  onResendInvite?: (inviteId: string) => void;
  onRevokeInvite?: (inviteId: string) => void;
}) {
  const meta = STATUS_META[invitation.status];
  const StatusIcon = meta.icon;
  const contactLine =
    invitation.recipientEmail || invitation.recipientPhone || 'No contact method recorded';

  return (
    <article className="rounded-[1.45rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/80 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
        <div>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <h4 className="text-base font-semibold text-[var(--ink)]">
              {invitation.recipientName || 'Unnamed invite'}
            </h4>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', meta.surfaceClassName)}>
              <StatusIcon size={12} />
              {meta.label}
            </span>
            {invitation.assignedTeam ? (
              <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                Team {invitation.assignedTeam}
              </span>
            ) : null}
          </div>
          <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
            {contactLine}
          </p>
        </div>

        <div className="text-right text-xs leading-5 text-[var(--ink-tertiary)]">
          <p>Created {formatDate(invitation.createdAt)}</p>
          {invitation.acceptedAt ? <p>Accepted {formatDate(invitation.acceptedAt)}</p> : null}
          {!invitation.acceptedAt && invitation.expiresAt ? (
            <p>Expires {formatDate(invitation.expiresAt)}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
        {onResendInvite ? (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => onResendInvite(invitation.id)}
          >
            Resend
          </Button>
        ) : null}
        {onRevokeInvite ? (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={() => onRevokeInvite(invitation.id)}
          >
            Revoke
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function InviteComposerModal({
  isOpen,
  onClose,
  onSend,
  tripInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (invite: Partial<Invitation>) => void;
  tripInfo: TripInviteInfo;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [team, setTeam] = useState<'A' | 'B' | ''>('');

  const reset = useCallback(() => {
    setName('');
    setEmail('');
    setPhone('');
    setTeam('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSend = useCallback(() => {
    if (!name.trim() && !email.trim() && !phone.trim()) {
      return;
    }

    onSend({
      id: crypto.randomUUID(),
      recipientName: name.trim() || undefined,
      recipientEmail: email.trim() || undefined,
      recipientPhone: phone.trim() || undefined,
      assignedTeam: team || undefined,
      status: 'sent',
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      inviteCode: tripInfo.shareCode,
      inviteUrl: tripInfo.shareUrl,
    });

    handleClose();
  }, [email, handleClose, name, onSend, phone, team, tripInfo.shareCode, tripInfo.shareUrl]);

  const canSubmit = Boolean(name.trim() || email.trim() || phone.trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send a personal invite"
      description="Keep the shared link as the default, then use this for the one player who needs a directed nudge."
      size="lg"
    >
      <div className="space-y-[var(--space-4)] p-[var(--space-5)] pt-0">
        <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/70 p-[var(--space-4)]">
          <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Trip Invite</p>
          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-3)] text-sm text-[var(--ink-secondary)]">
            <span className="inline-flex items-center gap-2">
              <Users size={14} />
              {tripInfo.tripName}
            </span>
            {tripInfo.location ? (
              <span className="inline-flex items-center gap-2">
                <MapPin size={14} />
                {tripInfo.location}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          <InviteField label="Player name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
            />
          </InviteField>

          <InviteField label="Preferred team">
            <select
              value={team}
              onChange={(event) => setTeam(event.target.value as 'A' | 'B' | '')}
              className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
            >
              <option value="">No team preference</option>
              <option value="A">Team A</option>
              <option value="B">Team B</option>
            </select>
          </InviteField>
        </div>

        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          <InviteField label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
            />
          </InviteField>

          <InviteField label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="555-555-5555"
              className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--masters)]"
            />
          </InviteField>
        </div>

        <div className="flex flex-wrap justify-end gap-[var(--space-3)]">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" leftIcon={<Send size={16} />} disabled={!canSubmit} onClick={handleSend}>
            Create invite
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InviteField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[var(--space-2)] block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

interface QRCodeCardProps {
  shareUrl: string;
  shareCode: string;
  tripName: string;
  className?: string;
}

export function QRCodeCard({ shareUrl, shareCode, tripName, className }: QRCodeCardProps) {
  return (
    <section
      className={cn(
        'rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,240,232,0.99))] p-[var(--space-5)] shadow-[0_24px_48px_rgba(41,29,17,0.08)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Scan To Join</p>
          <h3 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
            Put the invite in plain sight.
          </h3>
          <p className="mt-[var(--space-2)] max-w-[28rem] text-sm leading-6 text-[var(--ink-secondary)]">
            This works best on a table, taped near the first tee, or anywhere the group naturally
            gathers before the day gets noisy.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-[var(--masters)]/18 bg-[var(--surface-raised)] text-[var(--masters)]">
          <QrCode size={20} />
        </div>
      </div>

      <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-4)] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <div className="mx-auto flex justify-center rounded-[1.2rem] bg-white p-[var(--space-3)] shadow-[0_12px_24px_rgba(41,29,17,0.08)]">
            <QRCode value={shareUrl} size={208} />
          </div>
        </div>

        <div className="grid gap-[var(--space-3)]">
          <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72 p-[var(--space-4)]">
            <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Trip</p>
            <p className="mt-[var(--space-2)] text-lg font-semibold text-[var(--ink)]">{tripName}</p>
          </div>
          <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72 p-[var(--space-4)]">
            <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Join code</p>
            <p className="mt-[var(--space-2)] font-mono text-[1.8rem] tracking-[0.28em] text-[var(--ink)]">
              {shareCode}
            </p>
          </div>
          <div className="rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72 p-[var(--space-4)]">
            <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Camera note</p>
            <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
              If the camera misses, the player can still type the code in by hand. The QR helps, but
              the join code is the real backbone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default InvitationManager;
