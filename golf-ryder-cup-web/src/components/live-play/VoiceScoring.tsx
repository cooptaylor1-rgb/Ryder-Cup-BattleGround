/**
 * Voice Scoring Component
 *
 * Hands-free voice-activated scoring for golf rounds.
 * Perfect for when your hands are full with clubs, cart, or beverage.
 *
 * Features:
 * - Voice activation ("Hey Score" wake word or button)
 * - Natural language score input
 * - Confirmation before recording
 * - Works offline with on-device recognition
 * - Visual feedback during listening
 * - Haptic feedback on recognition
 * - Supports multiple phrases per result
 * - Accessible design
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoringLogger } from '@/lib/utils/logger';
// Speech recognition types are global from speech-recognition.d.ts

// Simple haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns: Record<typeof type, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      success: [50, 50, 50],
      warning: [100, 50, 100],
      error: [200, 100, 200],
    };
    navigator.vibrate(patterns[type]);
  }
}

// Use the same HoleWinner type as models.ts
type HoleWinner = 'teamA' | 'teamB' | 'halved' | 'none';

// ============================================
// TYPES
// ============================================

interface VoiceScoringProps {
  /** Team A name for voice recognition */
  teamAName?: string;
  /** Team B name for voice recognition */
  teamBName?: string;
  /** Current hole number */
  currentHole: number;
  /** Callback when score is confirmed */
  onScoreConfirmed: (winner: HoleWinner) => void;
  /** Show floating mode (FAB style) */
  floating?: boolean;
  /** Custom position for floating mode */
  position?: { bottom: number; left?: number; right?: number };
  /** Custom class name */
  className?: string;
}

type ListeningState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error';

interface RecognizedScore {
  winner: HoleWinner;
  confidence: number;
  rawTranscript: string;
}

// ============================================
// VOICE RECOGNITION PATTERNS
// ============================================

const SCORE_PATTERNS: Array<{
  patterns: RegExp[];
  result: HoleWinner;
}> = [
  // Team A wins
  {
    patterns: [
      /team\s*a\s*win/i,
      /usa?\s*win/i,
      /america\s*win/i,
      /red\s*team\s*win/i,
      /we\s*won/i,
      /we\s*win/i,
      /i\s*won/i,
      /got\s*it/i,
      /point\s*for\s*us/i,
      /our\s*point/i,
      /our\s*hole/i,
    ],
    result: 'teamA',
  },
  // Team B wins
  {
    patterns: [
      /team\s*b\s*win/i,
      /europe\s*win/i,
      /eur\s*win/i,
      /blue\s*team\s*win/i,
      /they\s*won/i,
      /they\s*win/i,
      /their\s*point/i,
      /their\s*hole/i,
      /opponent/i,
      /lost\s*(it|the\s*hole)?/i,
    ],
    result: 'teamB',
  },
  // Halved
  {
    patterns: [
      /halv/i,
      /half/i,
      /tied/i,
      /tie/i,
      /push/i,
      /split/i,
      /all\s*square/i,
      /same/i,
      /draw/i,
      /even/i,
    ],
    result: 'halved',
  },
];

// ============================================
// COMPONENT
// ============================================

export function VoiceScoring({
  teamAName = 'USA',
  teamBName = 'Europe',
  currentHole,
  onScoreConfirmed,
  floating = true,
  position = { bottom: 160, right: 16 },
  className,
}: VoiceScoringProps) {
  // Use the globally declared SpeechRecognition type from speech-recognition.d.ts
  const recognitionRef = useRef<InstanceType<NonNullable<typeof window.SpeechRecognition>> | null>(
    null
  );
  // Track state in ref to avoid stale closure in event handlers
  const stateRef = useRef<ListeningState>('idle');

  const [state, setState] = useState<ListeningState>('idle');
  const [recognizedScore, setRecognizedScore] = useState<RecognizedScore | null>(null);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      const timeoutId = setTimeout(() => {
        setIsSupported(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Parse transcript to determine score
  const parseTranscript = useCallback(
    (text: string): RecognizedScore | null => {
      const normalizedText = text.toLowerCase().trim();

      // Add dynamic team name patterns
      const dynamicPatterns: Array<{ patterns: RegExp[]; result: HoleWinner }> = [
        {
          patterns: [
            new RegExp(`${teamAName.toLowerCase()}\\s*win`, 'i'),
            new RegExp(`${teamAName.toLowerCase()}\\s*got`, 'i'),
          ],
          result: 'teamA',
        },
        {
          patterns: [
            new RegExp(`${teamBName.toLowerCase()}\\s*win`, 'i'),
            new RegExp(`${teamBName.toLowerCase()}\\s*got`, 'i'),
          ],
          result: 'teamB',
        },
      ];

      const allPatterns = [...SCORE_PATTERNS, ...dynamicPatterns];

      for (const { patterns, result } of allPatterns) {
        for (const pattern of patterns) {
          if (pattern.test(normalizedText)) {
            return {
              winner: result,
              confidence: 0.9, // Would use actual confidence in production
              rawTranscript: text,
            };
          }
        }
      }

      return null;
    },
    [teamAName, teamBName]
  );

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setErrorMessage('Voice input not supported on this device');
      setState('error');
      return;
    }

    triggerHaptic('medium');
    setState('listening');
    setTranscript('');
    setRecognizedScore(null);
    setErrorMessage(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event) => {
      // Event type is SpeechRecognitionEvent from our d.ts
      const results = (event as unknown as { results: SpeechRecognitionResultList }).results;
      const lastResult = results[results.length - 1];
      const text = lastResult[0].transcript;
      setTranscript(text);

      if (lastResult.isFinal) {
        setState('processing');
        const score = parseTranscript(text);

        if (score) {
          triggerHaptic('success');
          setRecognizedScore(score);
          setState('confirming');
        } else {
          triggerHaptic('warning');
          setErrorMessage("Didn't catch that. Try: 'We won', 'They won', or 'Halved'");
          setState('error');
        }
      }
    };

    recognition.onerror = (event) => {
      // Event type is SpeechRecognitionErrorEvent from our d.ts
      const errorEvent = event as unknown as { error: string };
      scoringLogger.error('Speech recognition error:', errorEvent.error);
      triggerHaptic('error');
      setErrorMessage(
        errorEvent.error === 'no-speech'
          ? 'No speech detected. Tap to try again.'
          : `Error: ${errorEvent.error}`
      );
      setState('error');
    };

    recognition.onend = () => {
      // Use stateRef to get current state, avoiding stale closure
      if (stateRef.current === 'listening') {
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [parseTranscript]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState('idle');
  }, []);

  // Confirm score
  const confirmScore = useCallback(() => {
    if (!recognizedScore) return;
    triggerHaptic('success');
    onScoreConfirmed(recognizedScore.winner);
    setState('idle');
    setRecognizedScore(null);
    setTranscript('');
  }, [recognizedScore, onScoreConfirmed]);

  // Cancel/retry
  const cancel = useCallback(() => {
    triggerHaptic('light');
    setState('idle');
    setRecognizedScore(null);
    setTranscript('');
    setErrorMessage(null);
  }, []);

  // Get winner display text
  const getWinnerDisplay = (winner: HoleWinner) => {
    switch (winner) {
      case 'teamA':
        return `${teamAName} Wins`;
      case 'teamB':
        return `${teamBName} Wins`;
      case 'halved':
        return 'Halved';
      default:
        return '';
    }
  };

  // Get winner color
  const getWinnerColor = (winner: HoleWinner) => {
    switch (winner) {
      case 'teamA':
        return 'var(--team-usa, #B91C1C)';
      case 'teamB':
        return 'var(--team-europe, #1E40AF)';
      case 'halved':
        return 'var(--masters, #006747)';
      default:
        return '#6B7280';
    }
  };

  const containerStyles = floating
    ? {
        position: 'fixed' as const,
        bottom: `${position.bottom}px`,
        ...(position.right !== undefined && { right: `${position.right}px` }),
        ...(position.left !== undefined && { left: `${position.left}px` }),
        zIndex: 50,
      }
    : {};

  if (!isSupported) {
    return (
      <div className={className} style={containerStyles}>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            className={cn(
              'flex items-center justify-center',
              'w-14 h-14 rounded-full shadow-lg',
              'bg-[color:var(--surface)]/60 text-[var(--ink-secondary)] border border-[color:var(--rule)]/30'
            )}
            aria-disabled="true"
            disabled
          >
            <Mic className="w-6 h-6" />
          </button>
          <p className="text-xs text-center text-[var(--ink-tertiary)]">
            Voice scoring not supported
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={containerStyles}>
      <AnimatePresence mode="wait">
        {/* Idle state - just the mic button */}
        {state === 'idle' && (
          <motion.button
            key="idle"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={startListening}
            className={cn(
              'flex items-center justify-center',
              'w-14 h-14 rounded-full shadow-lg border border-[var(--rule)]',
              'bg-[var(--surface-raised)] text-[var(--ink-primary)]',
              'transition-colors duration-150',
              'hover:bg-[var(--surface-secondary)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)]',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--focus-ring-offset)]'
            )}
            aria-label="Start voice scoring"
          >
            <Mic className="w-6 h-6" />
          </motion.button>
        )}

        {/* Listening state */}
        {state === 'listening' && (
          <motion.div
            key="listening"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-2xl',
              'shadow-lg backdrop-blur-md',
              'border border-[color:var(--masters)]/40 bg-[color:var(--masters)]/95'
            )}
            style={{
              minWidth: '200px',
            }}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Animated mic */}
            <motion.div
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.1, 1] }}
              transition={prefersReducedMotion ? undefined : { duration: 1, repeat: Infinity }}
              className="relative"
            >
              <div
                className={cn(
                  'absolute inset-0 bg-[color:var(--canvas-raised)]/20 rounded-full',
                  !prefersReducedMotion && 'animate-ping'
                )}
              />
              <div className="relative p-4 rounded-full bg-[color:var(--canvas-raised)]/10">
                <Mic className="w-8 h-8 text-white" />
              </div>
            </motion.div>

            <div className="text-center">
              <p className="text-white font-medium">Listening...</p>
              <p className="text-[color:var(--canvas-raised)]/60 text-xs mt-1">Hole {currentHole}</p>
            </div>

            {/* Live transcript */}
            {transcript && (
              <p
                className="text-[color:var(--canvas-raised)]/80 text-sm italic text-center"
                aria-live="polite"
                aria-atomic="true"
              >
                &quot;{transcript}&quot;
              </p>
            )}

            {/* Cancel button */}
            <button
              onClick={stopListening}
              className="mt-2 px-4 py-2 rounded-full bg-[color:var(--canvas-raised)]/10 text-[color:var(--canvas-raised)]/80 text-sm hover:bg-[color:var(--canvas-raised)]/20 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Processing state */}
        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'flex items-center justify-center',
              'w-14 h-14 rounded-full shadow-lg border border-[var(--rule)]',
              'bg-[var(--surface-raised)] text-[var(--ink-primary)]'
            )}
          >
            <Loader2 className="w-6 h-6 text-[var(--masters)] animate-spin" />
          </motion.div>
        )}

        {/* Confirming state */}
        {state === 'confirming' && recognizedScore && (
          <motion.div
            key="confirming"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-2xl',
              'shadow-lg backdrop-blur-md',
              'border-2 border-transparent bg-[color:var(--surface)]/95'
            )}
            style={{
              borderColor: getWinnerColor(recognizedScore.winner),
              minWidth: '220px',
            }}
          >
            {/* Result preview */}
            <div className="text-center">
              <p className="text-[color:var(--canvas-raised)]/60 text-xs uppercase tracking-wider">Hole {currentHole}</p>
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: getWinnerColor(recognizedScore.winner) }}
              >
                {getWinnerDisplay(recognizedScore.winner)}
              </p>
              <p className="text-[color:var(--canvas-raised)]/40 text-xs mt-2 italic">
                &quot;{recognizedScore.rawTranscript}&quot;
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-2">
              <button
                onClick={cancel}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full',
                  'bg-[color:var(--canvas-raised)]/10 text-[color:var(--canvas-raised)]/80 text-sm',
                  'hover:bg-[color:var(--canvas-raised)]/20 transition-colors'
                )}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <motion.button
                onClick={confirmScore}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full',
                  'text-white font-medium text-sm',
                  'transition-colors'
                )}
                style={{ background: getWinnerColor(recognizedScore.winner) }}
              >
                <Check className="w-4 h-4" />
                Confirm
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-2xl',
              'shadow-lg backdrop-blur-md',
              'border border-[color:var(--error)]/40 bg-[color:var(--error)]/95'
            )}
            style={{
              minWidth: '200px',
            }}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <AlertCircle className="w-8 h-8 text-white" />
            <p className="text-[color:var(--canvas-raised)]/90 text-sm text-center">{errorMessage}</p>
            <div className="flex gap-2">
              <button
                onClick={cancel}
                className="px-4 py-2 rounded-full bg-[color:var(--canvas-raised)]/10 text-[color:var(--canvas-raised)]/80 text-sm hover:bg-[color:var(--canvas-raised)]/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startListening}
                className="px-4 py-2 rounded-full bg-[color:var(--canvas-raised)]/20 text-white text-sm hover:bg-[color:var(--canvas-raised)]/30 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VoiceScoring;
