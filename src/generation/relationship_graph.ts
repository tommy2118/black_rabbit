import { RandomSource } from './random';
import { Suspect } from '@/domain/suspect';
import { createRelationship, Relationship } from '@/domain/relationship';
import { RelationshipType, MotiveType, SuspectId } from '@/domain/types';

// Relationships that can provide motive for murder
const motiveRelationships: RelationshipType[] = [
  RelationshipType.Spouse,
  RelationshipType.ExSpouse,
  RelationshipType.Lover,
  RelationshipType.ExLover,
  RelationshipType.Sibling,
  RelationshipType.BusinessPartner,
  RelationshipType.Rival,
  RelationshipType.Enemy,
];

// All relationship types for general connections
const allRelationships: RelationshipType[] = Object.values(RelationshipType);

export interface RelationshipGraphConfig {
  minConnectionsPerPerson: number;
}

export function generateRelationshipGraph(
  victim: Suspect,
  killer: Suspect,
  others: Suspect[],
  motive: MotiveType,
  random: RandomSource,
  config: RelationshipGraphConfig = { minConnectionsPerPerson: 2 }
): Relationship[] {
  const relationships: Relationship[] = [];
  const allSuspects = [victim, killer, ...others];

  // 1. Create killer-victim relationship with motive
  const killerVictimRel = createKillerVictimRelationship(
    killer.id,
    victim.id,
    motive,
    random
  );
  relationships.push(killerVictimRel);

  // 2. Give 2-3 other suspects relationships with victim that could imply motive (red herrings)
  const redHerringCount = random.randomInt(2, Math.min(3, others.length));
  const shuffledOthers = random.shuffle(others);

  for (let i = 0; i < redHerringCount; i++) {
    const suspect = shuffledOthers[i];
    const relType = random.pick(motiveRelationships);
    const sentiment = random.randomInt(-8, -3); // Negative but not extreme

    relationships.push(
      createRelationship({
        from: suspect.id,
        to: victim.id,
        type: relType,
        sentiment,
        isPublicKnowledge: random.random() > 0.3, // 70% public
      })
    );
  }

  // 3. Ensure everyone is connected to at least minConnections people
  const connectionCount = new Map<SuspectId, number>();
  allSuspects.forEach(s => connectionCount.set(s.id, 0));

  // Count existing connections
  for (const rel of relationships) {
    connectionCount.set(rel.from, (connectionCount.get(rel.from) || 0) + 1);
    connectionCount.set(rel.to, (connectionCount.get(rel.to) || 0) + 1);
  }

  // Add connections for under-connected suspects
  for (const suspect of allSuspects) {
    const currentConnections = connectionCount.get(suspect.id) || 0;

    if (currentConnections < config.minConnectionsPerPerson) {
      const needed = config.minConnectionsPerPerson - currentConnections;

      // Find candidates to connect to
      const candidates = allSuspects.filter(s => {
        if (s.id === suspect.id) return false;
        // Check if relationship already exists
        const exists = relationships.some(
          r =>
            (r.from === suspect.id && r.to === s.id) ||
            (r.from === s.id && r.to === suspect.id)
        );
        return !exists;
      });

      const shuffledCandidates = random.shuffle(candidates);

      for (let i = 0; i < Math.min(needed, shuffledCandidates.length); i++) {
        const other = shuffledCandidates[i];
        const relType = random.pick(allRelationships);
        const sentiment = random.randomInt(-5, 8);

        relationships.push(
          createRelationship({
            from: suspect.id,
            to: other.id,
            type: relType,
            sentiment,
            isPublicKnowledge: random.random() > 0.2,
          })
        );

        connectionCount.set(suspect.id, (connectionCount.get(suspect.id) || 0) + 1);
        connectionCount.set(other.id, (connectionCount.get(other.id) || 0) + 1);
      }
    }
  }

  // 4. Add one or two secret relationships for mystery
  const secretCount = random.randomInt(1, 2);
  for (let i = 0; i < secretCount; i++) {
    const [person1, person2] = random.shuffle(allSuspects).slice(0, 2);

    // Check if relationship already exists
    const exists = relationships.some(
      r =>
        (r.from === person1.id && r.to === person2.id) ||
        (r.from === person2.id && r.to === person1.id)
    );

    if (!exists) {
      const secretTypes = [
        RelationshipType.Lover,
        RelationshipType.ExLover,
        RelationshipType.BusinessPartner,
      ];
      const relType = random.pick(secretTypes);

      relationships.push(
        createRelationship({
          from: person1.id,
          to: person2.id,
          type: relType,
          sentiment: random.randomInt(-3, 7),
          isPublicKnowledge: false,
          secretReason: generateSecretReason(relType, random),
        })
      );
    }
  }

  return relationships;
}

function createKillerVictimRelationship(
  killerId: SuspectId,
  victimId: SuspectId,
  motive: MotiveType,
  random: RandomSource
): Relationship {
  // Map motive to appropriate relationship type
  const relType = getRelationshipForMotive(motive, random);
  const sentiment = random.randomInt(-10, -6); // Very negative

  return createRelationship({
    from: killerId,
    to: victimId,
    type: relType,
    sentiment,
    isPublicKnowledge: random.random() > 0.4, // 60% public
  });
}

function getRelationshipForMotive(
  motive: MotiveType,
  random: RandomSource
): RelationshipType {
  const motiveToRelationships: Record<MotiveType, RelationshipType[]> = {
    [MotiveType.Jealousy]: [
      RelationshipType.Spouse,
      RelationshipType.Lover,
      RelationshipType.ExLover,
      RelationshipType.Sibling,
    ],
    [MotiveType.Greed]: [
      RelationshipType.Sibling,
      RelationshipType.Child,
      RelationshipType.Spouse,
      RelationshipType.BusinessPartner,
    ],
    [MotiveType.Revenge]: [
      RelationshipType.Enemy,
      RelationshipType.ExSpouse,
      RelationshipType.ExLover,
      RelationshipType.Rival,
    ],
    [MotiveType.Fear]: [
      RelationshipType.Employee,
      RelationshipType.BusinessPartner,
      RelationshipType.Acquaintance,
    ],
    [MotiveType.Hatred]: [
      RelationshipType.Enemy,
      RelationshipType.Rival,
      RelationshipType.Sibling,
    ],
    [MotiveType.Protection]: [
      RelationshipType.Parent,
      RelationshipType.Spouse,
      RelationshipType.Friend,
    ],
    [MotiveType.Ambition]: [
      RelationshipType.Employee,
      RelationshipType.BusinessPartner,
      RelationshipType.Rival,
    ],
  };

  const options = motiveToRelationships[motive];
  return random.pick(options);
}

function generateSecretReason(
  relType: RelationshipType,
  random: RandomSource
): string {
  const reasons: Record<string, string[]> = {
    [RelationshipType.Lover]: [
      'An affair hidden from their spouses',
      'A secret romance that would scandalize society',
      'A forbidden relationship kept from the family',
    ],
    [RelationshipType.ExLover]: [
      'A past affair no one knows about',
      'A relationship that ended badly and was covered up',
    ],
    [RelationshipType.BusinessPartner]: [
      'A secret business deal gone wrong',
      'An undisclosed financial arrangement',
      'A hidden investment that failed',
    ],
  };

  const options = reasons[relType] || ['A secret connection hidden from others'];
  return random.pick(options);
}

export function getMotiveDescription(motive: MotiveType): string {
  const descriptions: Record<MotiveType, string> = {
    [MotiveType.Jealousy]: 'consumed by jealousy',
    [MotiveType.Greed]: 'driven by greed',
    [MotiveType.Revenge]: 'seeking revenge',
    [MotiveType.Fear]: 'acting out of fear',
    [MotiveType.Hatred]: 'filled with hatred',
    [MotiveType.Protection]: 'protecting someone or something',
    [MotiveType.Ambition]: 'ruthlessly ambitious',
  };
  return descriptions[motive];
}
