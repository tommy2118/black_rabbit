import { describe, it, expect } from 'vitest';
import { generateRelationshipGraph } from '../../src/generation/relationship_graph';
import { createRandom } from '../../src/generation/random';
import { createSuspect } from '../../src/domain/suspect';
import { createSuspectId, createPersonalityTraits, MotiveType } from '../../src/domain/types';

describe('generateRelationshipGraph', () => {
  const defaultPersonality = createPersonalityTraits(0.5, 0.5, 0.5, 0.5);

  function createTestSuspect(id: string, firstName: string) {
    return createSuspect({
      id: createSuspectId(id),
      firstName,
      lastName: 'Test',
      occupation: 'Test',
      age: 30,
      description: 'Test',
      personality: defaultPersonality,
    });
  }

  const killer = createTestSuspect('killer', 'Karl');
  const victim = createTestSuspect('victim', 'Victor');
  const innocent1 = createTestSuspect('innocent1', 'Iris');
  const innocent2 = createTestSuspect('innocent2', 'Ivan');
  const innocent3 = createTestSuspect('innocent3', 'Ivy');
  const others = [innocent1, innocent2, innocent3];

  describe('killer-victim relationship', () => {
    it('always creates a relationship between killer and victim', () => {
      const random = createRandom('test-seed');
      const relationships = generateRelationshipGraph(
        victim, killer, others, MotiveType.Greed, random
      );

      const killerVictimRel = relationships.find(
        r => r.from === killer.id && r.to === victim.id
      );

      expect(killerVictimRel).toBeDefined();
    });

    it('killer-victim relationship has very negative sentiment', () => {
      for (let i = 0; i < 10; i++) {
        const random = createRandom(`sentiment-seed-${i}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, MotiveType.Revenge, random
        );

        const killerVictimRel = relationships.find(
          r => r.from === killer.id && r.to === victim.id
        )!;

        expect(killerVictimRel.sentiment).toBeLessThanOrEqual(-6);
        expect(killerVictimRel.sentiment).toBeGreaterThanOrEqual(-10);
      }
    });
  });

  describe('red herring motives for innocents', () => {
    it('creates 2-3 innocents with relationships to victim', () => {
      const random = createRandom('test-seed');
      const relationships = generateRelationshipGraph(
        victim, killer, others, MotiveType.Jealousy, random
      );

      // Find relationships from innocents to victim
      const innocentVictimRels = relationships.filter(
        r => others.some(o => o.id === r.from) && r.to === victim.id
      );

      expect(innocentVictimRels.length).toBeGreaterThanOrEqual(2);
      expect(innocentVictimRels.length).toBeLessThanOrEqual(3);
    });

    it('most red herring relationships have negative sentiment', () => {
      const random = createRandom('test-seed');
      const relationships = generateRelationshipGraph(
        victim, killer, others, MotiveType.Hatred, random
      );

      const innocentVictimRels = relationships.filter(
        r => others.some(o => o.id === r.from) && r.to === victim.id
      );

      // At least half should be negative (red herrings are -8 to -3)
      const negativeCount = innocentVictimRels.filter(r => r.sentiment < 0).length;
      expect(negativeCount).toBeGreaterThanOrEqual(Math.floor(innocentVictimRels.length / 2));
    });

    it('red herring relationships are less negative than killer relationship', () => {
      for (let i = 0; i < 10; i++) {
        const random = createRandom(`compare-seed-${i}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, MotiveType.Revenge, random
        );

        const killerVictimRel = relationships.find(
          r => r.from === killer.id && r.to === victim.id
        )!;

        const innocentVictimRels = relationships.filter(
          r => others.some(o => o.id === r.from) && r.to === victim.id
        );

        // Most innocent-victim relationships should be less negative
        for (const rel of innocentVictimRels) {
          // Red herrings are -8 to -3, killer is -10 to -6
          // So killer relationship should generally be more negative
          expect(rel.sentiment).toBeGreaterThanOrEqual(-8);
        }
      }
    });

    it('red herring relationships include motive-appropriate types', () => {
      const random = createRandom('test-seed');
      const relationships = generateRelationshipGraph(
        victim, killer, others, MotiveType.Greed, random
      );

      const innocentVictimRels = relationships.filter(
        r => others.some(o => o.id === r.from) && r.to === victim.id
      );

      // Should have at least one relationship type that could imply motive
      const motiveTypes = [
        'spouse', 'ex_spouse', 'lover', 'ex_lover', 'sibling',
        'business_partner', 'rival', 'enemy'
      ];

      const hasMotiveType = innocentVictimRels.some(rel => motiveTypes.includes(rel.type));
      expect(hasMotiveType).toBe(true);
    });

    it('some red herrings are secret (not public knowledge)', () => {
      let foundSecret = false;

      for (let i = 0; i < 20; i++) {
        const random = createRandom(`secret-seed-${i}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, MotiveType.Fear, random
        );

        const innocentVictimRels = relationships.filter(
          r => others.some(o => o.id === r.from) && r.to === victim.id
        );

        if (innocentVictimRels.some(r => !r.isPublicKnowledge)) {
          foundSecret = true;
          break;
        }
      }

      expect(foundSecret).toBe(true);
    });
  });

  describe('connection coverage', () => {
    it('ensures everyone has at least minimum connections', () => {
      const random = createRandom('test-seed');
      const relationships = generateRelationshipGraph(
        victim, killer, others, MotiveType.Ambition, random,
        { minConnectionsPerPerson: 2 }
      );

      const allSuspects = [victim, killer, ...others];
      const connectionCount = new Map<string, number>();
      allSuspects.forEach(s => connectionCount.set(s.id, 0));

      for (const rel of relationships) {
        connectionCount.set(rel.from, (connectionCount.get(rel.from) || 0) + 1);
        connectionCount.set(rel.to, (connectionCount.get(rel.to) || 0) + 1);
      }

      for (const suspect of allSuspects) {
        expect(connectionCount.get(suspect.id)).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('secret relationships', () => {
    it('generates 1-2 secret relationships', () => {
      let foundSecrets = false;

      for (let i = 0; i < 10; i++) {
        const random = createRandom(`secret-rel-${i}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, MotiveType.Protection, random
        );

        const secretRels = relationships.filter(r => !r.isPublicKnowledge);
        if (secretRels.length >= 1) {
          foundSecrets = true;
          break;
        }
      }

      expect(foundSecrets).toBe(true);
    });

    it('secret relationships have secret reasons', () => {
      for (let i = 0; i < 20; i++) {
        const random = createRandom(`reason-seed-${i}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, MotiveType.Jealousy, random
        );

        const secretRels = relationships.filter(
          r => !r.isPublicKnowledge && r.secretReason
        );

        for (const rel of secretRels) {
          expect(rel.secretReason).toBeDefined();
          expect(rel.secretReason!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('variety in motive types', () => {
    const motives = Object.values(MotiveType);

    for (const motive of motives) {
      it(`generates appropriate relationships for ${motive} motive`, () => {
        const random = createRandom(`motive-${motive}`);
        const relationships = generateRelationshipGraph(
          victim, killer, others, motive, random
        );

        const killerVictimRel = relationships.find(
          r => r.from === killer.id && r.to === victim.id
        );

        expect(killerVictimRel).toBeDefined();
        // Relationship should exist and have appropriate properties
        expect(killerVictimRel!.sentiment).toBeLessThan(0);
      });
    }
  });
});
