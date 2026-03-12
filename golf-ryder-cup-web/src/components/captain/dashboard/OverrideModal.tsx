'use client';

import { useMemo } from 'react';

import { useHaptic } from '@/lib/hooks';

import { OverrideModalSections } from './OverrideModalSections';
import {
    computeNewMatchScore,
    getOriginalHoleScore,
} from './overrideModalModel';
import type { OverrideModalProps } from './overrideModalTypes';
import { canSubmitOverride } from './overrideModalValidation';
import { useOverrideModalActions } from './useOverrideModalActions';

export type {
    AuditEntry,
    MatchScore,
    OverrideReason,
} from './overrideModalTypes';

export function OverrideModal({
    isOpen,
    onClose,
    matchScore,
    currentUserName,
    onSubmit,
}: OverrideModalProps) {
    const haptic = useHaptic();
    const modal = useOverrideModalActions({
        matchScore,
        onClose,
        onSubmit,
        haptic,
    });

    const originalHoleScore = useMemo(
        () => getOriginalHoleScore(matchScore, modal.selectedHole),
        [matchScore, modal.selectedHole]
    );

    const newMatchScore = useMemo(
        () => computeNewMatchScore(matchScore.holeScores, modal.editedScores),
        [matchScore.holeScores, modal.editedScores]
    );

    const canSubmit = canSubmitOverride({
        selectedHole: modal.selectedHole,
        reason: modal.reason,
        notes: modal.notes,
    });

    return (
        <OverrideModalSections
            isOpen={isOpen}
            matchScore={matchScore}
            currentUserName={currentUserName}
            selectedHole={modal.selectedHole}
            editedScores={modal.editedScores}
            reason={modal.reason}
            notes={modal.notes}
            isSubmitting={modal.isSubmitting}
            step={modal.step}
            originalHoleScore={originalHoleScore}
            newMatchScore={newMatchScore}
            canSubmit={canSubmit}
            onClose={modal.handleClose}
            onHoleSelect={modal.handleHoleSelect}
            onTeamAScoreChange={(value) => modal.handleScoreChange('A', value)}
            onTeamBScoreChange={(value) => modal.handleScoreChange('B', value)}
            onContinue={modal.handleContinue}
            onBack={modal.handleBack}
            onReasonChange={modal.setReason}
            onNotesChange={modal.setNotes}
            onSubmit={modal.handleSubmit}
        />
    );
}

export default OverrideModal;
