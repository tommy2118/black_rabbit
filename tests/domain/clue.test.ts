import { describe, it, expect } from 'vitest';
import {
  createClue,
  Clue,
  isPhysicalEvidence,
  isTestimony,
  isRedHerring,
  pointsToSuspect,
} from '@/domain/clue';
import {
  createClueId,
  createSuspectId,
  createLocationId,
  ClueType,
} from '@/domain/types';

describe('Clue', () => {
  const clueId = createClueId('clue-1');
  const suspectId = createSuspectId('suspect-1');
  const locationId = createLocationId('study');

  describe('createClue', () => {
    it('creates a clue with all required properties', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Bloodied Letter Opener',
        description: 'A silver letter opener with traces of blood on the blade.',
        foundAt: locationId,
        pointsTo: suspectId,
      });

      expect(clue.id).toBe(clueId);
      expect(clue.type).toBe(ClueType.Physical);
      expect(clue.name).toBe('Bloodied Letter Opener');
      expect(clue.description).toBe('A silver letter opener with traces of blood on the blade.');
      expect(clue.foundAt).toBe(locationId);
      expect(clue.pointsTo).toBe(suspectId);
    });

    it('defaults isRedHerring to false', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Real Evidence',
        description: 'Genuine clue',
        foundAt: locationId,
        pointsTo: suspectId,
      });

      expect(clue.isRedHerring).toBe(false);
    });

    it('allows setting isRedHerring to true', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Planted Glove',
        description: 'A glove that was planted to frame someone.',
        foundAt: locationId,
        pointsTo: suspectId,
        isRedHerring: true,
        refutedBy: createClueId('alibi-clue'),
      });

      expect(clue.isRedHerring).toBe(true);
      expect(clue.refutedBy).toBe('alibi-clue');
    });

    it('allows setting significance level', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Forensic,
        name: 'Time of Death',
        description: 'The coroner estimates death occurred between 9 and 10 PM.',
        foundAt: locationId,
        significance: 'critical',
      });

      expect(clue.significance).toBe('critical');
    });

    it('defaults significance to normal', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Behavioral,
        name: 'Nervous Behavior',
        description: 'The suspect seemed unusually nervous.',
        foundAt: locationId,
      });

      expect(clue.significance).toBe('normal');
    });
  });

  describe('isPhysicalEvidence', () => {
    it('returns true for physical clues', () => {
      const physical = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Fingerprint',
        description: 'A fingerprint on the glass.',
        foundAt: locationId,
      });

      expect(isPhysicalEvidence(physical)).toBe(true);
    });

    it('returns false for non-physical clues', () => {
      const testimony = createClue({
        id: clueId,
        type: ClueType.Testimonial,
        name: 'Butler\'s Account',
        description: 'The butler claims he saw nothing.',
        foundAt: locationId,
      });

      expect(isPhysicalEvidence(testimony)).toBe(false);
    });
  });

  describe('isTestimony', () => {
    it('returns true for testimonial clues', () => {
      const testimony = createClue({
        id: clueId,
        type: ClueType.Testimonial,
        name: 'Witness Statement',
        description: 'A maid heard arguing at 9 PM.',
        foundAt: locationId,
      });

      expect(isTestimony(testimony)).toBe(true);
    });

    it('returns false for non-testimonial clues', () => {
      const document = createClue({
        id: clueId,
        type: ClueType.Documentary,
        name: 'Will',
        description: 'The victim\'s last will and testament.',
        foundAt: locationId,
      });

      expect(isTestimony(document)).toBe(false);
    });
  });

  describe('isRedHerring', () => {
    it('returns true when clue is marked as red herring', () => {
      const herring = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Planted Evidence',
        description: 'Evidence that misleads.',
        foundAt: locationId,
        isRedHerring: true,
      });

      expect(isRedHerring(herring)).toBe(true);
    });

    it('returns false for genuine clues', () => {
      const genuine = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Real Evidence',
        description: 'Genuine evidence.',
        foundAt: locationId,
      });

      expect(isRedHerring(genuine)).toBe(false);
    });
  });

  describe('pointsToSuspect', () => {
    it('returns true when clue points to the specified suspect', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Monogrammed Handkerchief',
        description: 'A handkerchief with initials M.A.',
        foundAt: locationId,
        pointsTo: suspectId,
      });

      expect(pointsToSuspect(clue, suspectId)).toBe(true);
    });

    it('returns false when clue points to different suspect', () => {
      const otherSuspect = createSuspectId('other-suspect');
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Evidence',
        description: 'Points elsewhere.',
        foundAt: locationId,
        pointsTo: suspectId,
      });

      expect(pointsToSuspect(clue, otherSuspect)).toBe(false);
    });

    it('returns false when clue does not point to anyone', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Forensic,
        name: 'Time of Death',
        description: 'General forensic information.',
        foundAt: locationId,
      });

      expect(pointsToSuspect(clue, suspectId)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('clue properties cannot be mutated', () => {
      const clue = createClue({
        id: clueId,
        type: ClueType.Physical,
        name: 'Evidence',
        description: 'Description',
        foundAt: locationId,
      });

      expect(() => {
        (clue as { name: string }).name = 'Changed';
      }).toThrow();
    });
  });
});
