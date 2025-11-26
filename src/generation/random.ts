import seedrandom from 'seedrandom';

export interface RandomSource {
  random(): number;
  randomInt(min: number, max: number): number;
  pick<T>(array: readonly T[]): T;
  shuffle<T>(array: readonly T[]): T[];
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T;
  getSeed(): string;
}

export function createRandom(seed: string): RandomSource {
  const rng = seedrandom(seed);

  return {
    random(): number {
      return rng();
    },

    randomInt(min: number, max: number): number {
      return Math.floor(rng() * (max - min + 1)) + min;
    },

    pick<T>(array: readonly T[]): T {
      const index = Math.floor(rng() * array.length);
      return array[index];
    },

    shuffle<T>(array: readonly T[]): T[] {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },

    weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
      const total = weights.reduce((sum, w) => sum + w, 0);
      let threshold = rng() * total;

      for (let i = 0; i < items.length; i++) {
        threshold -= weights[i];
        if (threshold <= 0) {
          return items[i];
        }
      }

      return items[items.length - 1];
    },

    getSeed(): string {
      return seed;
    },
  };
}
