import { describe, it, expect } from 'vitest';
import {
  createRelationship,
  Relationship,
  isHostile,
  isPositive,
  isSecretRelationship,
  getRelationshipDescription,
} from '@/domain/relationship';
import { createSuspectId, RelationshipType } from '@/domain/types';

describe('Relationship', () => {
  const suspectA = createSuspectId('suspect-a');
  const suspectB = createSuspectId('suspect-b');

  describe('createRelationship', () => {
    it('creates a relationship with all required properties', () => {
      const relationship = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Sibling,
        sentiment: 5,
      });

      expect(relationship.from).toBe(suspectA);
      expect(relationship.to).toBe(suspectB);
      expect(relationship.type).toBe(RelationshipType.Sibling);
      expect(relationship.sentiment).toBe(5);
    });

    it('defaults isPublicKnowledge to true', () => {
      const relationship = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Friend,
        sentiment: 3,
      });

      expect(relationship.isPublicKnowledge).toBe(true);
    });

    it('allows setting isPublicKnowledge to false for secret relationships', () => {
      const relationship = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Lover,
        sentiment: 8,
        isPublicKnowledge: false,
        secretReason: 'An affair hidden from their spouses',
      });

      expect(relationship.isPublicKnowledge).toBe(false);
      expect(relationship.secretReason).toBe('An affair hidden from their spouses');
    });

    it('clamps sentiment to -10 to 10 range', () => {
      const tooPositive = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Spouse,
        sentiment: 15,
      });

      const tooNegative = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Enemy,
        sentiment: -15,
      });

      expect(tooPositive.sentiment).toBe(10);
      expect(tooNegative.sentiment).toBe(-10);
    });
  });

  describe('isHostile', () => {
    it('returns true for negative sentiment', () => {
      const hostile = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Enemy,
        sentiment: -5,
      });

      expect(isHostile(hostile)).toBe(true);
    });

    it('returns false for neutral sentiment', () => {
      const neutral = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Acquaintance,
        sentiment: 0,
      });

      expect(isHostile(neutral)).toBe(false);
    });

    it('returns false for positive sentiment', () => {
      const friendly = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Friend,
        sentiment: 5,
      });

      expect(isHostile(friendly)).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('returns true for positive sentiment', () => {
      const positive = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Friend,
        sentiment: 5,
      });

      expect(isPositive(positive)).toBe(true);
    });

    it('returns false for neutral or negative sentiment', () => {
      const neutral = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Acquaintance,
        sentiment: 0,
      });

      const negative = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Rival,
        sentiment: -3,
      });

      expect(isPositive(neutral)).toBe(false);
      expect(isPositive(negative)).toBe(false);
    });
  });

  describe('isSecretRelationship', () => {
    it('returns true when isPublicKnowledge is false', () => {
      const secret = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Lover,
        sentiment: 7,
        isPublicKnowledge: false,
      });

      expect(isSecretRelationship(secret)).toBe(true);
    });

    it('returns false when isPublicKnowledge is true', () => {
      const publicRel = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Spouse,
        sentiment: 5,
        isPublicKnowledge: true,
      });

      expect(isSecretRelationship(publicRel)).toBe(false);
    });
  });

  describe('getRelationshipDescription', () => {
    it('returns human-readable description for each relationship type', () => {
      const types = [
        { type: RelationshipType.Spouse, expected: 'married to' },
        { type: RelationshipType.ExSpouse, expected: 'formerly married to' },
        { type: RelationshipType.Lover, expected: 'romantically involved with' },
        { type: RelationshipType.Sibling, expected: 'sibling of' },
        { type: RelationshipType.Parent, expected: 'parent of' },
        { type: RelationshipType.Child, expected: 'child of' },
        { type: RelationshipType.Friend, expected: 'friend of' },
        { type: RelationshipType.Rival, expected: 'rival of' },
        { type: RelationshipType.Enemy, expected: 'enemy of' },
        { type: RelationshipType.BusinessPartner, expected: 'business partner of' },
        { type: RelationshipType.Employee, expected: 'employed by' },
        { type: RelationshipType.Employer, expected: 'employer of' },
        { type: RelationshipType.Acquaintance, expected: 'acquaintance of' },
      ];

      for (const { type, expected } of types) {
        const rel = createRelationship({
          from: suspectA,
          to: suspectB,
          type,
          sentiment: 0,
        });
        expect(getRelationshipDescription(rel)).toBe(expected);
      }
    });
  });

  describe('immutability', () => {
    it('relationship properties cannot be mutated', () => {
      const relationship = createRelationship({
        from: suspectA,
        to: suspectB,
        type: RelationshipType.Friend,
        sentiment: 5,
      });

      expect(() => {
        (relationship as { sentiment: number }).sentiment = 10;
      }).toThrow();
    });
  });
});
