import { describe, it, expect } from 'vitest';
import { generateTestimonies, getContradictableStatements } from '../../src/game/statements';
import { generateCase } from '../../src/generation/case_generator';
import { createRandom } from '../../src/generation/random';

describe('generateTestimonies', () => {
  function getTestCase(seed: string) {
    const generatedCase = generateCase(seed);
    const random = createRandom(seed);
    return { generatedCase, random };
  }

  describe('killer statement variety', () => {
    it('generates different alibi statements across seeds', () => {
      const alibiTexts: string[] = [];

      for (let i = 0; i < 20; i++) {
        const { generatedCase, random } = getTestCase(`alibi-variety-${i}`);
        const testimonies = generateTestimonies(generatedCase, random);

        const killer = generatedCase.suspects.find(s => s.isKiller)!;
        const killerTestimony = testimonies.get(killer.id)!;
        const alibiStatement = killerTestimony.statements.find(s => s.topic === 'alibi');

        if (alibiStatement) {
          alibiTexts.push(alibiStatement.text);
        }
      }

      // Should have multiple unique alibi texts
      const uniqueTexts = new Set(alibiTexts);
      expect(uniqueTexts.size).toBeGreaterThan(1);
    });

    it('generates different observation statements for killers across seeds', () => {
      const observationTexts: string[] = [];

      for (let i = 0; i < 20; i++) {
        const { generatedCase, random } = getTestCase(`obs-variety-${i}`);
        const testimonies = generateTestimonies(generatedCase, random);

        const killer = generatedCase.suspects.find(s => s.isKiller)!;
        const killerTestimony = testimonies.get(killer.id)!;
        const obsStatement = killerTestimony.statements.find(s => s.topic === 'observations');

        if (obsStatement) {
          observationTexts.push(obsStatement.text);
        }
      }

      // Should have multiple unique observation texts
      const uniqueTexts = new Set(observationTexts);
      expect(uniqueTexts.size).toBeGreaterThan(1);
    });

    it('generates different self-defense statements for killers across seeds', () => {
      const selfTexts: string[] = [];

      for (let i = 0; i < 20; i++) {
        const { generatedCase, random } = getTestCase(`self-variety-${i}`);
        const testimonies = generateTestimonies(generatedCase, random);

        const killer = generatedCase.suspects.find(s => s.isKiller)!;
        const killerTestimony = testimonies.get(killer.id)!;
        const selfStatement = killerTestimony.statements.find(s => s.topic === 'self');

        if (selfStatement) {
          selfTexts.push(selfStatement.text);
        }
      }

      // Should have multiple unique self statements
      const uniqueTexts = new Set(selfTexts);
      expect(uniqueTexts.size).toBeGreaterThan(1);
    });

    it('generates different press responses for killer statements', () => {
      const pressResponses: string[] = [];

      for (let i = 0; i < 20; i++) {
        const { generatedCase, random } = getTestCase(`press-variety-${i}`);
        const testimonies = generateTestimonies(generatedCase, random);

        const killer = generatedCase.suspects.find(s => s.isKiller)!;
        const killerTestimony = testimonies.get(killer.id)!;

        for (const statement of killerTestimony.statements) {
          if (statement.isLie) {
            pressResponses.push(statement.pressResponse);
          }
        }
      }

      // Should have multiple unique press responses
      const uniqueResponses = new Set(pressResponses);
      expect(uniqueResponses.size).toBeGreaterThan(1);
    });
  });

  describe('testimony structure', () => {
    it('generates testimonies for all non-victim suspects', () => {
      const { generatedCase, random } = getTestCase('structure-test');
      const testimonies = generateTestimonies(generatedCase, random);

      const livingSuspects = generatedCase.suspects.filter(s => !s.isVictim);
      expect(testimonies.size).toBe(livingSuspects.length);

      for (const suspect of livingSuspects) {
        expect(testimonies.has(suspect.id)).toBe(true);
      }
    });

    it('each testimony has multiple statements', () => {
      const { generatedCase, random } = getTestCase('statements-count');
      const testimonies = generateTestimonies(generatedCase, random);

      for (const testimony of testimonies.values()) {
        expect(testimony.statements.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('killer testimony contains lies', () => {
      const { generatedCase, random } = getTestCase('killer-lies');
      const testimonies = generateTestimonies(generatedCase, random);

      const killer = generatedCase.suspects.find(s => s.isKiller)!;
      const killerTestimony = testimonies.get(killer.id)!;

      const lies = killerTestimony.statements.filter(s => s.isLie);
      expect(lies.length).toBeGreaterThan(0);
    });

    it('innocent testimonies contain no lies', () => {
      const { generatedCase, random } = getTestCase('innocent-truth');
      const testimonies = generateTestimonies(generatedCase, random);

      const innocents = generatedCase.suspects.filter(s => !s.isKiller && !s.isVictim);

      for (const innocent of innocents) {
        const testimony = testimonies.get(innocent.id)!;
        // Allow for secret relationship lies (which innocents might have)
        const criticalLies = testimony.statements.filter(
          s => s.isLie && s.topic !== 'relationships'
        );
        expect(criticalLies.length).toBe(0);
      }
    });
  });

  describe('getContradictableStatements', () => {
    it('returns only statements that are lies with contradicting evidence', () => {
      const { generatedCase, random } = getTestCase('contradictable');
      const testimonies = generateTestimonies(generatedCase, random);

      const killer = generatedCase.suspects.find(s => s.isKiller)!;
      const killerTestimony = testimonies.get(killer.id)!;

      const contradictable = getContradictableStatements(killerTestimony);

      for (const statement of contradictable) {
        expect(statement.isLie).toBe(true);
        expect(statement.contradictedBy.length).toBeGreaterThan(0);
      }
    });

    it('killer has at least one contradictable statement', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const { generatedCase, random } = getTestCase(`contradictable-${i}`);
        const testimonies = generateTestimonies(generatedCase, random);

        const killer = generatedCase.suspects.find(s => s.isKiller)!;
        const killerTestimony = testimonies.get(killer.id)!;

        const contradictable = getContradictableStatements(killerTestimony);
        expect(contradictable.length).toBeGreaterThan(0);
      }
    });
  });
});
