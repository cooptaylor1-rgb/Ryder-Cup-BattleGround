import { AnimatePresence, motion } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { StrokeAlertBanner } from '@/components/scoring';
import { QuickPhotoCapture, VoiceScoring } from '@/components/live-play';
import type { HoleWinner } from '@/lib/types/models';

interface MatchScoringSupportLayerProps {
  isMatchComplete: boolean;
  showVoiceModal: boolean;
  currentHole: number;
  matchId: string;
  teamAName: string;
  teamBName: string;
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;
  holeHandicaps: number[];
  onCloseVoiceModal: () => void;
  onOpenVoiceModal: () => void;
  onVoiceScoreConfirmed: (winner: HoleWinner) => void;
  onPhotoCapture: (photo: { id: string }) => void;
  onStrokeAlertShown: (hole: number, teamAStrokes: number, teamBStrokes: number) => void;
}

export function MatchScoringSupportLayer({
  isMatchComplete,
  showVoiceModal,
  currentHole,
  matchId,
  teamAName,
  teamBName,
  teamAHandicapAllowance,
  teamBHandicapAllowance,
  holeHandicaps,
  onCloseVoiceModal,
  onOpenVoiceModal,
  onVoiceScoreConfirmed,
  onPhotoCapture,
  onStrokeAlertShown,
}: MatchScoringSupportLayerProps) {
  return (
    <>
      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseVoiceModal}
          >
            <motion.div
              onClick={(event) => event.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mx-4 w-full max-w-sm rounded-2xl border border-rule bg-canvas p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-[length:var(--text-lg)] font-normal text-ink">Voice Score</h3>
                <button
                  onClick={onCloseVoiceModal}
                  className="rounded-xl p-2 transition-opacity"
                >
                  <X size={18} className="text-ink-secondary" />
                </button>
              </div>
              <VoiceScoring
                teamAName={teamAName}
                teamBName={teamBName}
                currentHole={currentHole}
                onScoreConfirmed={onVoiceScoreConfirmed}
                floating={false}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isMatchComplete &&
        (teamAHandicapAllowance > 0 || teamBHandicapAllowance > 0) && (
          <StrokeAlertBanner
            currentHole={currentHole}
            teamAStrokes={teamAHandicapAllowance}
            teamBStrokes={teamBHandicapAllowance}
            holeHandicaps={holeHandicaps}
            teamAName={teamAName}
            teamBName={teamBName}
            autoDismissMs={5000}
            onAlertShown={onStrokeAlertShown}
            position="top"
          />
        )}

      {!isMatchComplete && (
        <div className="fixed bottom-24 left-4 z-40">
          <QuickPhotoCapture
            matchId={matchId}
            holeNumber={currentHole}
            teamAName={teamAName}
            teamBName={teamBName}
            onCapture={onPhotoCapture}
          />
        </div>
      )}

      {!isMatchComplete && (
        <div className="fixed bottom-24 right-4 z-40">
          <button
            onClick={onOpenVoiceModal}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-masters text-[var(--canvas)] shadow-[0_2px_8px_rgba(0,102,68,0.2)] transition-opacity"
            aria-label="Voice scoring"
          >
            <Mic size={24} />
          </button>
        </div>
      )}
    </>
  );
}
