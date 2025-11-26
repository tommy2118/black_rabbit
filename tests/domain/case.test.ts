import { describe, it, expect } from 'vitest';
import {
  createCase,
  Case,
  getKiller,
  getVictim,
  getSuspects,
  getCluesPointingTo,
  isCaseSolvable,
} from '@/domain/case';
import { createSuspect } from '@/domain/suspect';
import { createRelationship } from '@/domain/relationship';
import { createClue } from '@/domain/clue';
import { createAlibi } from '@/domain/alibi';
import { createLocation } from '@/domain/location';
import {
  createSuspectId,
  createClueId,
  createLocationId,
  createTimeSlot,
  createPersonalityTraits,
  RelationshipType,
  ClueType,
  MotiveType,
  WeaponType,
} from '@/domain/types';

describe('Case', () => {
  // Set up test data
  const traits = createPersonalityTraits(0.5, 0.5, 0.5, 0.5);

  const victimId = createSuspectId('victim');
  const killerId = createSuspectId('killer');
  const innocentId = createSuspectId('innocent');

  const victim = createSuspect({
    id: victimId,
    firstName: 'Richard',
    lastName: 'Blackwood',
    occupation: 'Industrialist',
    age: 65,
    description: 'A wealthy man with many enemies.',
    personality: traits,
    isVictim: true,
  });

  const killer = createSuspect({
    id: killerId,
    firstName: 'Margaret',
    lastName: 'Ashworth',
    occupation: 'Heiress',
    age: 38,
    description: 'The victim\'s scheming sister.',
    personality: traits,
    isKiller: true,
  });

  const innocent = createSuspect({
    id: innocentId,
    firstName: 'James',
    lastName: 'Hartley',
    occupation: 'Lawyer',
    age: 45,
    description: 'The family lawyer.',
    personality: traits,
  });

  const studyId = createLocationId('study');
  const parlorId = createLocationId('parlor');

  const study = createLocation({
    id: studyId,
    name: 'Study',
    description: 'A wood-paneled room full of books.',
    isCrimeScene: true,
  });

  const parlor = createLocation({
    id: parlorId,
    name: 'Parlor',
    description: 'An elegant sitting room.',
  });

  const timeOfDeath = createTimeSlot(21); // 9 PM

  const killerRelationship = createRelationship({
    from: killerId,
    to: victimId,
    type: RelationshipType.Sibling,
    sentiment: -5,
  });

  const incriminatingClue = createClue({
    id: createClueId('clue-1'),
    type: ClueType.Physical,
    name: 'Poison Vial',
    description: 'An empty vial found in the study.',
    foundAt: studyId,
    pointsTo: killerId,
    significance: 'critical',
  });

  const motiveClue = createClue({
    id: createClueId('clue-2'),
    type: ClueType.Documentary,
    name: 'Will Amendment',
    description: 'A document showing Margaret was about to be disinherited.',
    foundAt: studyId,
    pointsTo: killerId,
  });

  const alibiClue = createClue({
    id: createClueId('clue-3'),
    type: ClueType.Testimonial,
    name: 'Butler\'s Testimony',
    description: 'The butler saw James in the parlor all evening.',
    foundAt: parlorId,
    pointsTo: innocentId, // This clears the innocent
  });

  const killerAlibi = createAlibi({
    suspectId: killerId,
    timeSlot: timeOfDeath,
    location: parlorId,
    description: 'Claims to have been freshening up in her room.',
    isVerifiable: false,
    isFalse: true,
  });

  const innocentAlibi = createAlibi({
    suspectId: innocentId,
    timeSlot: timeOfDeath,
    location: parlorId,
    description: 'Was in the parlor speaking with the butler.',
    witnesses: [createSuspectId('butler')],
    isVerifiable: true,
  });

  describe('createCase', () => {
    it('creates a case with all required properties', () => {
      const testCase = createCase({
        seed: 'test-seed',
        suspects: [victim, killer, innocent],
        relationships: [killerRelationship],
        locations: [study, parlor],
        clues: [incriminatingClue, motiveClue, alibiClue],
        alibis: [killerAlibi, innocentAlibi],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      expect(testCase.seed).toBe('test-seed');
      expect(testCase.suspects).toHaveLength(3);
      expect(testCase.relationships).toHaveLength(1);
      expect(testCase.locations).toHaveLength(2);
      expect(testCase.clues).toHaveLength(3);
      expect(testCase.alibis).toHaveLength(2);
      expect(testCase.victim).toBe(victimId);
      expect(testCase.killer).toBe(killerId);
      expect(testCase.motive).toBe(MotiveType.Greed);
      expect(testCase.weapon).toBe(WeaponType.Poison);
      expect(testCase.crimeScene).toBe(studyId);
      expect(testCase.timeOfDeath).toEqual(timeOfDeath);
    });
  });

  describe('getKiller', () => {
    it('returns the killer suspect', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      const foundKiller = getKiller(testCase);
      expect(foundKiller).toBeDefined();
      expect(foundKiller?.id).toBe(killerId);
    });
  });

  describe('getVictim', () => {
    it('returns the victim suspect', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      const foundVictim = getVictim(testCase);
      expect(foundVictim).toBeDefined();
      expect(foundVictim?.id).toBe(victimId);
    });
  });

  describe('getSuspects', () => {
    it('returns only living suspects (excludes victim)', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      const suspects = getSuspects(testCase);
      expect(suspects).toHaveLength(2);
      expect(suspects.map(s => s.id)).toContain(killerId);
      expect(suspects.map(s => s.id)).toContain(innocentId);
      expect(suspects.map(s => s.id)).not.toContain(victimId);
    });
  });

  describe('getCluesPointingTo', () => {
    it('returns all clues pointing to a specific suspect', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [incriminatingClue, motiveClue, alibiClue],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      const killerClues = getCluesPointingTo(testCase, killerId);
      expect(killerClues).toHaveLength(2);
      expect(killerClues.map(c => c.name)).toContain('Poison Vial');
      expect(killerClues.map(c => c.name)).toContain('Will Amendment');
    });

    it('returns empty array if no clues point to suspect', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [incriminatingClue],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      const clues = getCluesPointingTo(testCase, victimId);
      expect(clues).toHaveLength(0);
    });
  });

  describe('isCaseSolvable', () => {
    it('returns true when there are clues pointing to killer', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [incriminatingClue, motiveClue],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      expect(isCaseSolvable(testCase)).toBe(true);
    });

    it('returns false when no clues point to killer', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer, innocent],
        relationships: [],
        locations: [study],
        clues: [alibiClue], // Only clears the innocent
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      expect(isCaseSolvable(testCase)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('case properties cannot be mutated', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer],
        relationships: [],
        locations: [study],
        clues: [],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      expect(() => {
        (testCase as { seed: string }).seed = 'changed';
      }).toThrow();
    });

    it('suspect array cannot be mutated', () => {
      const testCase = createCase({
        seed: 'test',
        suspects: [victim, killer],
        relationships: [],
        locations: [study],
        clues: [],
        alibis: [],
        victim: victimId,
        killer: killerId,
        motive: MotiveType.Greed,
        weapon: WeaponType.Poison,
        crimeScene: studyId,
        timeOfDeath: timeOfDeath,
      });

      expect(() => {
        (testCase.suspects as Suspect[]).push(innocent);
      }).toThrow();
    });
  });
});

// Need to import Suspect type for the mutation test
import { Suspect } from '@/domain/suspect';
