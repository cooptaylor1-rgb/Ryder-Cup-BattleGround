/**
 * Sound Effects Service
 *
 * Lightweight Web Audio cues for scoring moments.
 * Respects browser limitations and fails silently if audio is unavailable.
 */

export type ScoreSoundOutcome = 'teamA' | 'teamB' | 'halved';

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
};

export function playScoreSound(options: {
  outcome: ScoreSoundOutcome;
  isMatchWin?: boolean;
  volume?: number;
}): void {
  const context = getAudioContext();
  if (!context) return;

  try {
    const now = context.currentTime;
    const volume = Math.min(Math.max(options.volume ?? 0.04, 0), 0.2);
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    gain.connect(context.destination);

    const scheduleTone = (frequency: number, startOffset: number, duration: number) => {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(gain);

      const start = now + startOffset;
      const end = start + duration;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.start(start);
      osc.stop(end + 0.02);
    };

    const baseFrequency =
      options.outcome === 'teamA' ? 523.25 : options.outcome === 'teamB' ? 392.0 : 440.0;

    scheduleTone(baseFrequency, 0, 0.12);
    scheduleTone(baseFrequency * 1.25, 0.13, 0.12);

    if (options.isMatchWin) {
      scheduleTone(baseFrequency * 1.5, 0.3, 0.18);
    }

    const totalDuration = options.isMatchWin ? 0.55 : 0.3;
    setTimeout(
      () => {
        context.close().catch(() => undefined);
      },
      totalDuration * 1000 + 50
    );
  } catch {
    context.close().catch(() => undefined);
  }
}
