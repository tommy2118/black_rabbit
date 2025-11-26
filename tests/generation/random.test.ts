import { describe, it, expect } from 'vitest';
import { createRandom, RandomSource } from '@/generation/random';

describe('RandomSource', () => {
  describe('createRandom', () => {
    it('returns a RandomSource interface', () => {
      const random = createRandom('test-seed');

      expect(random).toHaveProperty('random');
      expect(random).toHaveProperty('randomInt');
      expect(random).toHaveProperty('pick');
      expect(random).toHaveProperty('shuffle');
      expect(random).toHaveProperty('weightedPick');
    });
  });

  describe('determinism', () => {
    it('produces same sequence with same seed', () => {
      const random1 = createRandom('deterministic-seed');
      const random2 = createRandom('deterministic-seed');

      const sequence1 = [random1.random(), random1.random(), random1.random()];
      const sequence2 = [random2.random(), random2.random(), random2.random()];

      expect(sequence1).toEqual(sequence2);
    });

    it('produces different sequences with different seeds', () => {
      const random1 = createRandom('seed-a');
      const random2 = createRandom('seed-b');

      const sequence1 = [random1.random(), random1.random(), random1.random()];
      const sequence2 = [random2.random(), random2.random(), random2.random()];

      expect(sequence1).not.toEqual(sequence2);
    });
  });

  describe('random()', () => {
    it('returns values between 0 and 1', () => {
      const random = createRandom('range-test');

      for (let i = 0; i < 100; i++) {
        const value = random.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('randomInt()', () => {
    it('returns integers within the specified range (inclusive)', () => {
      const random = createRandom('int-test');

      for (let i = 0; i < 100; i++) {
        const value = random.randomInt(5, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('can return both min and max values', () => {
      const random = createRandom('min-max-test');
      const results = new Set<number>();

      for (let i = 0; i < 1000; i++) {
        results.add(random.randomInt(1, 3));
      }

      expect(results.has(1)).toBe(true);
      expect(results.has(2)).toBe(true);
      expect(results.has(3)).toBe(true);
    });
  });

  describe('pick()', () => {
    it('returns an element from the array', () => {
      const random = createRandom('pick-test');
      const items = ['apple', 'banana', 'cherry'];

      for (let i = 0; i < 50; i++) {
        const picked = random.pick(items);
        expect(items).toContain(picked);
      }
    });

    it('is deterministic with same seed', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];

      const random1 = createRandom('pick-seed');
      const random2 = createRandom('pick-seed');

      const picks1 = [random1.pick(items), random1.pick(items), random1.pick(items)];
      const picks2 = [random2.pick(items), random2.pick(items), random2.pick(items)];

      expect(picks1).toEqual(picks2);
    });

    it('eventually picks all items given enough attempts', () => {
      const random = createRandom('coverage-test');
      const items = ['a', 'b', 'c'];
      const picked = new Set<string>();

      for (let i = 0; i < 100; i++) {
        picked.add(random.pick(items));
      }

      expect(picked.size).toBe(3);
    });
  });

  describe('shuffle()', () => {
    it('returns array with same elements', () => {
      const random = createRandom('shuffle-test');
      const original = [1, 2, 3, 4, 5];
      const shuffled = random.shuffle(original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('does not mutate the original array', () => {
      const random = createRandom('immutable-test');
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];

      random.shuffle(original);

      expect(original).toEqual(originalCopy);
    });

    it('is deterministic with same seed', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const random1 = createRandom('shuffle-seed');
      const random2 = createRandom('shuffle-seed');

      const shuffled1 = random1.shuffle(items);
      const shuffled2 = random2.shuffle(items);

      expect(shuffled1).toEqual(shuffled2);
    });

    it('actually shuffles (not identity)', () => {
      const random = createRandom('real-shuffle');
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // With a sufficiently long array, shuffle should change order
      // (statistically very unlikely to return same order)
      const shuffled = random.shuffle(items);

      expect(shuffled).not.toEqual(items);
    });
  });

  describe('weightedPick()', () => {
    it('respects weights in selection probability', () => {
      const random = createRandom('weighted-test');
      const items = ['rare', 'common'];
      const weights = [1, 99]; // 'common' should be picked ~99% of the time

      const counts = { rare: 0, common: 0 };
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const picked = random.weightedPick(items, weights);
        counts[picked as keyof typeof counts]++;
      }

      // 'common' should be picked significantly more often
      expect(counts.common).toBeGreaterThan(counts.rare * 5);
    });

    it('is deterministic with same seed', () => {
      const items = ['a', 'b', 'c'];
      const weights = [10, 20, 70];

      const random1 = createRandom('weighted-seed');
      const random2 = createRandom('weighted-seed');

      const picks1 = Array.from({ length: 10 }, () =>
        random1.weightedPick(items, weights)
      );
      const picks2 = Array.from({ length: 10 }, () =>
        random2.weightedPick(items, weights)
      );

      expect(picks1).toEqual(picks2);
    });

    it('handles equal weights', () => {
      const random = createRandom('equal-weights');
      const items = ['a', 'b', 'c'];
      const weights = [1, 1, 1];
      const picked = new Set<string>();

      for (let i = 0; i < 100; i++) {
        picked.add(random.weightedPick(items, weights));
      }

      expect(picked.size).toBe(3);
    });

    it('handles zero weights (never picks)', () => {
      const random = createRandom('zero-weight');
      const items = ['never', 'always'];
      const weights = [0, 100];

      for (let i = 0; i < 100; i++) {
        expect(random.weightedPick(items, weights)).toBe('always');
      }
    });
  });

  describe('getSeed()', () => {
    it('returns the seed used to create the random source', () => {
      const seed = 'my-specific-seed';
      const random = createRandom(seed);

      expect(random.getSeed()).toBe(seed);
    });
  });
});
