import { describe, it, expect } from 'vitest';
import { generateAlibis } from '../../src/generation/alibi_generator';
import { createRandom } from '../../src/generation/random';
import { createSuspect } from '../../src/domain/suspect';
import { createLocation } from '../../src/domain/location';
import { createSuspectId, createLocationId, createPersonalityTraits } from '../../src/domain/types';

describe('generateAlibis', () => {
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

  function createTestLocation(id: string, name: string, isPublic: boolean) {
    return createLocation({
      id: createLocationId(id),
      name,
      description: 'Test location',
      isPublic,
    });
  }

  const killer = createTestSuspect('killer', 'Karl');
  const victim = createTestSuspect('victim', 'Victor');
  const innocent1 = createTestSuspect('innocent1', 'Iris');
  const innocent2 = createTestSuspect('innocent2', 'Ivan');
  const others = [innocent1, innocent2];

  const publicLocation = createTestLocation('public', 'Parlor', true);
  const privateLocation = createTestLocation('private', 'Study', false);
  const locations = [publicLocation, privateLocation];

  const timeOfDeath = { label: '9:00 PM - 10:00 PM', hour: 21 };

  it('generates alibis for all suspects including killer', () => {
    const random = createRandom('test-seed');
    const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

    expect(alibis.length).toBe(3); // killer + 2 innocents
  });

  it('killer alibi is always false', () => {
    // Test multiple seeds to ensure consistent behavior
    for (let i = 0; i < 10; i++) {
      const random = createRandom(`seed-${i}`);
      const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

      const killerAlibi = alibis.find(a => a.suspectId === killer.id);
      expect(killerAlibi).toBeDefined();
      expect(killerAlibi!.isFalse).toBe(true);
      expect(killerAlibi!.isVerifiable).toBe(false);
    }
  });

  it('innocent alibis are always true', () => {
    const random = createRandom('test-seed');
    const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

    const innocentAlibis = alibis.filter(a => a.suspectId !== killer.id);
    for (const alibi of innocentAlibis) {
      expect(alibi.isFalse).toBe(false);
      expect(alibi.isVerifiable).toBe(true);
    }
  });

  it('shuffles alibi order so killer is not always last', () => {
    const killerPositions: number[] = [];

    for (let i = 0; i < 20; i++) {
      const random = createRandom(`position-seed-${i}`);
      const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

      const killerIndex = alibis.findIndex(a => a.suspectId === killer.id);
      killerPositions.push(killerIndex);
    }

    // Killer should appear in different positions
    const uniquePositions = new Set(killerPositions);
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  describe('killer alibi strategies', () => {
    it('produces variety in killer alibi descriptions across seeds', () => {
      const descriptions: string[] = [];

      for (let i = 0; i < 20; i++) {
        const random = createRandom(`variety-seed-${i}`);
        const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);
        const killerAlibi = alibis.find(a => a.suspectId === killer.id)!;
        descriptions.push(killerAlibi.description);
      }

      // Should have multiple unique descriptions (different strategies)
      const uniqueDescriptions = new Set(descriptions);
      expect(uniqueDescriptions.size).toBeGreaterThan(1);
    });

    it('sometimes generates killer alibis with witnesses (unreliable strategy)', () => {
      let foundWithWitness = false;

      for (let i = 0; i < 50; i++) {
        const random = createRandom(`witness-seed-${i}`);
        const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);
        const killerAlibi = alibis.find(a => a.suspectId === killer.id)!;

        if (killerAlibi.witnesses.length > 0) {
          foundWithWitness = true;
          // Even with witnesses, should still be unverifiable
          expect(killerAlibi.isVerifiable).toBe(false);
          break;
        }
      }

      expect(foundWithWitness).toBe(true);
    });

    it('sometimes generates killer alibis without witnesses (no_witnesses strategy)', () => {
      let foundWithoutWitness = false;

      for (let i = 0; i < 50; i++) {
        const random = createRandom(`no-witness-seed-${i}`);
        const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);
        const killerAlibi = alibis.find(a => a.suspectId === killer.id)!;

        if (killerAlibi.witnesses.length === 0) {
          foundWithoutWitness = true;
          break;
        }
      }

      expect(foundWithoutWitness).toBe(true);
    });
  });

  describe('innocent alibi variability', () => {
    it('sometimes generates weak alibis for innocents', () => {
      let foundWeakAlibi = false;

      for (let i = 0; i < 100; i++) {
        const random = createRandom(`weak-alibi-seed-${i}`);
        const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

        const innocentAlibis = alibis.filter(a => a.suspectId !== killer.id);
        for (const alibi of innocentAlibis) {
          // Weak alibis have fewer witnesses (0-1) and uncertain language
          if (alibi.witnesses.length <= 1 &&
              (alibi.description.includes('unclear') ||
               alibi.description.includes('thinks') ||
               alibi.description.includes("can't be certain") ||
               alibi.description.includes('distracted'))) {
            foundWeakAlibi = true;
            break;
          }
        }
        if (foundWeakAlibi) break;
      }

      expect(foundWeakAlibi).toBe(true);
    });

    it('most innocent alibis are strong (not weak)', () => {
      let totalInnocentAlibis = 0;
      let strongAlibis = 0;

      for (let i = 0; i < 50; i++) {
        const random = createRandom(`strong-alibi-seed-${i}`);
        const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

        const innocentAlibis = alibis.filter(a => a.suspectId !== killer.id);
        totalInnocentAlibis += innocentAlibis.length;

        for (const alibi of innocentAlibis) {
          // Strong alibis have clear witness confirmation
          if (alibi.description.includes('can confirm')) {
            strongAlibis++;
          }
        }
      }

      // At least 65% should be strong (20% chance of weak alibis)
      expect(strongAlibis / totalInnocentAlibis).toBeGreaterThan(0.65);
    });
  });

  it('all alibis reference the time of death', () => {
    const random = createRandom('test-seed');
    const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);

    for (const alibi of alibis) {
      expect(alibi.timeSlot).toEqual(timeOfDeath);
    }
  });

  it('all alibis reference valid locations', () => {
    const random = createRandom('test-seed');
    const alibis = generateAlibis(killer, victim, others, locations, timeOfDeath, random);
    const locationIds = locations.map(l => l.id);

    for (const alibi of alibis) {
      expect(locationIds).toContain(alibi.location);
    }
  });
});
