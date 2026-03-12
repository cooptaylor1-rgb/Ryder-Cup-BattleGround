import type { OverrideReason } from './overrideModalTypes';

export function canSubmitOverride({
    selectedHole,
    reason,
    notes,
}: {
    selectedHole: number | null;
    reason: OverrideReason | null;
    notes: string;
}): boolean {
    return (
        selectedHole !== null &&
        reason !== null &&
        (reason !== 'other' || notes.trim().length > 0)
    );
}
