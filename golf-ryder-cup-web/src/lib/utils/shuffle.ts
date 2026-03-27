/**
 * Fisher-Yates (Knuth) shuffle — unbiased O(n) array shuffling.
 *
 * Replaces the biased `.sort(() => Math.random() - 0.5)` anti-pattern
 * used in several places. Uses `Math.random()` which is fine for
 * non-cryptographic shuffle (fairness in game features).
 *
 * Returns a new array; the original is never mutated.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
