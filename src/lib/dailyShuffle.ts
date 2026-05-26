/**
 * Seeded shuffle using Fisher–Yates algorithm.
 * Same seed always produces the same order, but different seeds
 * give entirely different orders.
 */
export function seededShuffle<T>(array: readonly T[], seed: string): T[] {
  const result = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  // Linear Congruential Generator for deterministic pseudo-random
  const lcg = () => {
    hash = (hash * 16807 + 0) % 2147483647;
    return Math.abs(hash) / 2147483647;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(lcg() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
