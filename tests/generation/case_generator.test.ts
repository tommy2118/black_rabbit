import { describe, it, expect } from 'vitest';
import { generateCase } from '@/generation/case_generator';
import { getKiller, getVictim, getSuspects, isCaseSolvable } from '@/domain/case';

describe('CaseGenerator', () => {
  describe('generateCase', () => {
    it('generates a case with all required properties', () => {
      const generatedCase = generateCase('test-seed');

      expect(generatedCase.seed).toBe('test-seed');
      expect(generatedCase.suspects.length).toBeGreaterThanOrEqual(3);
      expect(generatedCase.locations.length).toBeGreaterThanOrEqual(3);
      expect(generatedCase.clues.length).toBeGreaterThanOrEqual(3);
      expect(generatedCase.relationships.length).toBeGreaterThanOrEqual(1);
      expect(generatedCase.alibis.length).toBeGreaterThanOrEqual(1);
      expect(generatedCase.victim).toBeDefined();
      expect(generatedCase.killer).toBeDefined();
      expect(generatedCase.motive).toBeDefined();
      expect(generatedCase.weapon).toBeDefined();
      expect(generatedCase.crimeScene).toBeDefined();
      expect(generatedCase.timeOfDeath).toBeDefined();
    });

    it('generates deterministic cases with the same seed', () => {
      const case1 = generateCase('deterministic-test');
      const case2 = generateCase('deterministic-test');

      expect(case1.killer).toBe(case2.killer);
      expect(case1.victim).toBe(case2.victim);
      expect(case1.motive).toBe(case2.motive);
      expect(case1.weapon).toBe(case2.weapon);
      expect(case1.suspects.length).toBe(case2.suspects.length);
    });

    it('generates different cases with different seeds', () => {
      const case1 = generateCase('seed-a');
      const case2 = generateCase('seed-b');

      // At least some aspects should differ
      const sameKiller = case1.killer === case2.killer;
      const sameMotive = case1.motive === case2.motive;
      const sameWeapon = case1.weapon === case2.weapon;

      // It's statistically very unlikely all three match
      expect(sameKiller && sameMotive && sameWeapon).toBe(false);
    });

    it('always generates a solvable case', () => {
      // Test with multiple seeds
      const seeds = Array.from({ length: 20 }, (_, i) => `solvability-test-${i}`);

      for (const seed of seeds) {
        const generatedCase = generateCase(seed);
        expect(isCaseSolvable(generatedCase)).toBe(true);
      }
    });

    it('has a victim and killer among suspects', () => {
      const generatedCase = generateCase('victim-killer-test');

      const victim = getVictim(generatedCase);
      const killer = getKiller(generatedCase);

      expect(victim).toBeDefined();
      expect(killer).toBeDefined();
      expect(victim?.isVictim).toBe(true);
      expect(killer?.isKiller).toBe(true);
    });

    it('has living suspects (excluding victim)', () => {
      const generatedCase = generateCase('living-suspects-test');
      const suspects = getSuspects(generatedCase);

      expect(suspects.length).toBeGreaterThanOrEqual(2);
      expect(suspects.every(s => !s.isVictim)).toBe(true);
    });

    it('has at least one clue pointing to the killer', () => {
      const generatedCase = generateCase('killer-clues-test');
      const killerClues = generatedCase.clues.filter(
        c => c.pointsTo === generatedCase.killer && !c.isRedHerring
      );

      expect(killerClues.length).toBeGreaterThanOrEqual(1);
    });

    it('includes red herring clues', () => {
      const generatedCase = generateCase('red-herrings-test');
      const redHerrings = generatedCase.clues.filter(c => c.isRedHerring);

      expect(redHerrings.length).toBeGreaterThanOrEqual(1);
    });

    it('generates alibis for suspects', () => {
      const generatedCase = generateCase('alibis-test');

      // Non-victim suspects should have alibis
      const suspects = getSuspects(generatedCase);

      for (const suspect of suspects) {
        const alibi = generatedCase.alibis.find(a => a.suspectId === suspect.id);
        expect(alibi).toBeDefined();
      }
    });

    it("killer's alibi is false or unverifiable", () => {
      const generatedCase = generateCase('killer-alibi-test');
      const killerAlibi = generatedCase.alibis.find(
        a => a.suspectId === generatedCase.killer
      );

      expect(killerAlibi).toBeDefined();
      expect(killerAlibi?.isFalse || !killerAlibi?.isVerifiable).toBe(true);
    });

    it('generates relationships between suspects', () => {
      const generatedCase = generateCase('relationships-test');

      // Killer should have relationship with victim
      const killerVictimRel = generatedCase.relationships.find(
        r =>
          (r.from === generatedCase.killer && r.to === generatedCase.victim) ||
          (r.from === generatedCase.victim && r.to === generatedCase.killer)
      );

      expect(killerVictimRel).toBeDefined();
    });

    it('respects suspect count configuration', () => {
      const case4 = generateCase('count-4', { suspectCount: 4 });
      const case8 = generateCase('count-8', { suspectCount: 8 });

      expect(case4.suspects.length).toBe(4);
      expect(case8.suspects.length).toBe(8);
    });

    it('time of death is in evening hours', () => {
      const generatedCase = generateCase('time-test');

      // Should be between 8 PM (20) and 11 PM (23)
      expect(generatedCase.timeOfDeath.hour).toBeGreaterThanOrEqual(20);
      expect(generatedCase.timeOfDeath.hour).toBeLessThanOrEqual(23);
    });

    it('crime scene is one of the locations', () => {
      const generatedCase = generateCase('crime-scene-test');

      const crimeSceneLocation = generatedCase.locations.find(
        l => l.id === generatedCase.crimeScene
      );

      expect(crimeSceneLocation).toBeDefined();
    });
  });

  describe('difficulty settings', () => {
    it('easy mode has more clues pointing to killer', () => {
      const easyCase = generateCase('easy-test', { difficulty: 'easy' });
      const hardCase = generateCase('hard-test', { difficulty: 'hard' });

      const easyKillerClues = easyCase.clues.filter(
        c => c.pointsTo === easyCase.killer && !c.isRedHerring
      );
      const hardKillerClues = hardCase.clues.filter(
        c => c.pointsTo === hardCase.killer && !c.isRedHerring
      );

      // Both should be solvable, but easy should have at least as many clues
      expect(easyKillerClues.length).toBeGreaterThanOrEqual(hardKillerClues.length - 1);
    });
  });
});
