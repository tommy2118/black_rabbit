import { describe, it, expect } from 'vitest';
import {
  createSuspect,
  Suspect,
  isVictim,
  isKiller,
  getFullName,
} from '@/domain/suspect';
import {
  createSuspectId,
  createPersonalityTraits,
} from '@/domain/types';

describe('Suspect', () => {
  const defaultTraits = createPersonalityTraits(0.5, 0.5, 0.5, 0.5);

  describe('createSuspect', () => {
    it('creates a suspect with all required properties', () => {
      const suspect = createSuspect({
        id: createSuspectId('suspect-1'),
        firstName: 'Eleanor',
        lastName: 'Ashworth',
        occupation: 'Socialite',
        age: 42,
        description: 'A poised woman with sharp eyes and an imperious manner.',
        personality: defaultTraits,
      });

      expect(suspect.id).toBe('suspect-1');
      expect(suspect.firstName).toBe('Eleanor');
      expect(suspect.lastName).toBe('Ashworth');
      expect(suspect.occupation).toBe('Socialite');
      expect(suspect.age).toBe(42);
      expect(suspect.description).toBe('A poised woman with sharp eyes and an imperious manner.');
      expect(suspect.personality).toEqual(defaultTraits);
    });

    it('defaults isVictim and isKiller to false', () => {
      const suspect = createSuspect({
        id: createSuspectId('suspect-1'),
        firstName: 'John',
        lastName: 'Doe',
        occupation: 'Butler',
        age: 55,
        description: 'A dignified servant.',
        personality: defaultTraits,
      });

      expect(suspect.isVictim).toBe(false);
      expect(suspect.isKiller).toBe(false);
    });

    it('allows setting isVictim', () => {
      const suspect = createSuspect({
        id: createSuspectId('victim-1'),
        firstName: 'Richard',
        lastName: 'Blackwood',
        occupation: 'Industrialist',
        age: 65,
        description: 'A wealthy but unlikable man.',
        personality: defaultTraits,
        isVictim: true,
      });

      expect(suspect.isVictim).toBe(true);
    });

    it('allows setting isKiller', () => {
      const suspect = createSuspect({
        id: createSuspectId('killer-1'),
        firstName: 'Margaret',
        lastName: 'Ashworth',
        occupation: 'Heiress',
        age: 38,
        description: 'The victim\'s scheming sister.',
        personality: defaultTraits,
        isKiller: true,
      });

      expect(suspect.isKiller).toBe(true);
    });
  });

  describe('getFullName', () => {
    it('returns first and last name combined', () => {
      const suspect = createSuspect({
        id: createSuspectId('suspect-1'),
        firstName: 'Eleanor',
        lastName: 'Ashworth',
        occupation: 'Socialite',
        age: 42,
        description: 'Description',
        personality: defaultTraits,
      });

      expect(getFullName(suspect)).toBe('Eleanor Ashworth');
    });
  });

  describe('isVictim helper', () => {
    it('returns true for victims', () => {
      const victim = createSuspect({
        id: createSuspectId('v1'),
        firstName: 'V',
        lastName: 'Victim',
        occupation: 'Deceased',
        age: 50,
        description: 'The victim',
        personality: defaultTraits,
        isVictim: true,
      });

      expect(isVictim(victim)).toBe(true);
    });

    it('returns false for non-victims', () => {
      const suspect = createSuspect({
        id: createSuspectId('s1'),
        firstName: 'S',
        lastName: 'Suspect',
        occupation: 'Innocent',
        age: 30,
        description: 'A suspect',
        personality: defaultTraits,
      });

      expect(isVictim(suspect)).toBe(false);
    });
  });

  describe('isKiller helper', () => {
    it('returns true for the killer', () => {
      const killer = createSuspect({
        id: createSuspectId('k1'),
        firstName: 'K',
        lastName: 'Killer',
        occupation: 'Murderer',
        age: 40,
        description: 'The killer',
        personality: defaultTraits,
        isKiller: true,
      });

      expect(isKiller(killer)).toBe(true);
    });

    it('returns false for non-killers', () => {
      const suspect = createSuspect({
        id: createSuspectId('s1'),
        firstName: 'S',
        lastName: 'Suspect',
        occupation: 'Innocent',
        age: 30,
        description: 'A suspect',
        personality: defaultTraits,
      });

      expect(isKiller(suspect)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('suspect properties cannot be mutated', () => {
      const suspect = createSuspect({
        id: createSuspectId('suspect-1'),
        firstName: 'Eleanor',
        lastName: 'Ashworth',
        occupation: 'Socialite',
        age: 42,
        description: 'Description',
        personality: defaultTraits,
      });

      // TypeScript should prevent this, but we verify at runtime too
      expect(() => {
        (suspect as { firstName: string }).firstName = 'Changed';
      }).toThrow();
    });
  });
});
