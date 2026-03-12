import { useState } from 'react';

import { captainLogger } from '@/lib/utils/logger';

import { getOriginalHoleScore } from './overrideModalModel';
import type {
    EditedScores,
    MatchScore,
    OverrideModalProps,
    OverrideReason,
    OverrideStep,
} from './overrideModalTypes';
import { canSubmitOverride } from './overrideModalValidation';

interface OverrideModalHaptics {
    tap: () => void;
    press: () => void;
    impact: () => void;
}

interface UseOverrideModalActionsArgs {
    matchScore: MatchScore;
    onClose: () => void;
    onSubmit: OverrideModalProps['onSubmit'];
    haptic: OverrideModalHaptics;
}

export function useOverrideModalActions({
    matchScore,
    onClose,
    onSubmit,
    haptic,
}: UseOverrideModalActionsArgs) {
    const [selectedHole, setSelectedHole] = useState<number | null>(null);
    const [editedScores, setEditedScores] = useState<EditedScores>({});
    const [reason, setReason] = useState<OverrideReason | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<OverrideStep>('select');

    const resetState = () => {
        setSelectedHole(null);
        setEditedScores({});
        setReason(null);
        setNotes('');
        setStep('select');
    };

    const handleClose = () => {
        haptic.tap();
        resetState();
        onClose();
    };

    const handleHoleSelect = (hole: number) => {
        haptic.tap();
        setSelectedHole(hole);
        setStep('edit');
    };

    const handleScoreChange = (team: 'A' | 'B', value: number | undefined) => {
        if (selectedHole === null) {
            return;
        }

        setEditedScores((previous) => ({
            ...previous,
            [selectedHole]: {
                ...previous[selectedHole],
                [team === 'A' ? 'teamA' : 'teamB']: value,
            },
        }));
    };

    const handleContinue = () => {
        haptic.press();
        setStep('confirm');
    };

    const handleBack = () => {
        haptic.tap();
        if (step === 'confirm') {
            setStep('edit');
        } else if (step === 'edit') {
            setStep('select');
        }
    };

    const handleSubmit = async () => {
        const canSubmit = canSubmitOverride({ selectedHole, reason, notes });
        if (!canSubmit || selectedHole === null || reason === null) {
            return;
        }

        haptic.impact();
        setIsSubmitting(true);

        const originalHoleScore = getOriginalHoleScore(matchScore, selectedHole);

        try {
            await onSubmit({
                holeNumber: selectedHole,
                originalTeamAScore: originalHoleScore?.teamAScore,
                originalTeamBScore: originalHoleScore?.teamBScore,
                newTeamAScore: editedScores[selectedHole]?.teamA,
                newTeamBScore: editedScores[selectedHole]?.teamB,
                reason,
                notes,
            });
            handleClose();
        } catch (error) {
            captainLogger.error('Override failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        selectedHole,
        editedScores,
        reason,
        notes,
        isSubmitting,
        step,
        setReason,
        setNotes,
        handleClose,
        handleHoleSelect,
        handleScoreChange,
        handleContinue,
        handleBack,
        handleSubmit,
    };
}
