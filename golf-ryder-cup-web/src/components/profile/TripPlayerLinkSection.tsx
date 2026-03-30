import type { Player } from '@/lib/types/models';
import type { TripPlayerLinkResult } from '@/lib/utils/tripPlayerIdentity';

interface TripPlayerLinkSectionProps {
  tripName: string;
  linkedTripPlayer: Player | null;
  tripPlayerLink: TripPlayerLinkResult;
  isClaimingTripPlayer: boolean;
  isCaptainMode: boolean;
  onClaimTripPlayer: (playerId: string, allowEmailMismatch?: boolean) => void;
}

export function TripPlayerLinkSection({
  tripName,
  linkedTripPlayer,
  tripPlayerLink,
  isClaimingTripPlayer,
  isCaptainMode,
  onClaimTripPlayer,
}: TripPlayerLinkSectionProps) {
  return (
    <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
      <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
        Current Trip
      </span>
      <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-3)] leading-[1.2]">
        Roster Link
      </h3>
      <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mb-[var(--space-5)] leading-[1.6]">
        {linkedTripPlayer
          ? `Your profile is linked to ${linkedTripPlayer.firstName} ${linkedTripPlayer.lastName} in ${tripName}.`
          : `Connect your profile to the correct roster entry in ${tripName} so matches, schedule, and scoring resolve correctly.`}
      </p>

      {linkedTripPlayer ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--masters)]/25 bg-[var(--masters-subtle)] px-[var(--space-4)] py-[var(--space-4)]">
          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--masters)] m-0">
            Linked player
          </p>
          <p className="font-sans text-[length:var(--text-base)] text-ink m-0 mt-[var(--space-1)]">
            {linkedTripPlayer.firstName} {linkedTripPlayer.lastName}
            {linkedTripPlayer.team ? ` • ${linkedTripPlayer.team.toUpperCase()}` : ''}
          </p>
          <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-2)] leading-[1.5]">
            This is the roster row the app will use for your matches, stats, and scoring.
          </p>
        </div>
      ) : null}

      {!linkedTripPlayer && tripPlayerLink.status === 'claimable-name-match' ? (
        <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)]">
          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
            One likely roster match found
          </p>
          <p className="font-sans text-[length:var(--text-base)] text-ink m-0 mt-[var(--space-1)]">
            {tripPlayerLink.candidates[0]?.firstName} {tripPlayerLink.candidates[0]?.lastName}
          </p>
          <button
            type="button"
            disabled={isClaimingTripPlayer}
            onClick={() => {
              const candidateId = tripPlayerLink.candidates[0]?.id;
              if (candidateId) {
                onClaimTripPlayer(candidateId);
              }
            }}
            className="press-scale mt-[var(--space-4)] rounded-[var(--radius-full)] bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-2)] font-sans text-[length:var(--text-sm)] font-semibold text-[var(--canvas)] border-none"
          >
            {isClaimingTripPlayer ? 'Linking\u2026' : 'Link This Roster Entry'}
          </button>
        </div>
      ) : null}

      {!linkedTripPlayer &&
      (tripPlayerLink.status === 'ambiguous-email-match' ||
        tripPlayerLink.status === 'ambiguous-name-match') ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 px-[var(--space-4)] py-[var(--space-4)]">
          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--warning)] m-0">
            Multiple roster candidates found
          </p>
          <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mt-[var(--space-2)] leading-[1.6]">
            {isCaptainMode
              ? 'Choose the correct roster entry below to finish the link deliberately.'
              : 'Captain mode is required to choose between multiple roster entries.'}
          </p>
          <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
            {tripPlayerLink.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-3)]"
              >
                <div>
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
                    {candidate.firstName} {candidate.lastName}
                  </p>
                  <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)]">
                    {candidate.email || 'No email on roster'}
                  </p>
                </div>
                {isCaptainMode ? (
                  <button
                    type="button"
                    disabled={isClaimingTripPlayer}
                    onClick={() => onClaimTripPlayer(candidate.id, true)}
                    className="press-scale rounded-[var(--radius-full)] border border-rule bg-canvas-raised px-[var(--space-3)] py-[var(--space-2)] font-sans text-[length:var(--text-xs)] font-semibold text-ink"
                  >
                    Link
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!linkedTripPlayer &&
      (tripPlayerLink.status === 'unresolved' || tripPlayerLink.status === 'missing-user') ? (
        <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)]">
          <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
            No roster match found yet
          </p>
          <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mt-[var(--space-2)] leading-[1.6]">
            Ask the captain to add you on the Players screen, or open captain mode and assign your roster entry there.
          </p>
        </div>
      ) : null}
    </section>
  );
}
