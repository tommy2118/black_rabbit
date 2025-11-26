import { SuspectId, RelationshipType } from './types';

export interface Relationship {
  readonly from: SuspectId;
  readonly to: SuspectId;
  readonly type: RelationshipType;
  readonly sentiment: number; // -10 (hatred) to +10 (devoted)
  readonly isPublicKnowledge: boolean;
  readonly secretReason?: string;
}

export interface CreateRelationshipParams {
  from: SuspectId;
  to: SuspectId;
  type: RelationshipType;
  sentiment: number;
  isPublicKnowledge?: boolean;
  secretReason?: string;
}

export function createRelationship(params: CreateRelationshipParams): Relationship {
  const clampedSentiment = Math.max(-10, Math.min(10, params.sentiment));

  return Object.freeze({
    from: params.from,
    to: params.to,
    type: params.type,
    sentiment: clampedSentiment,
    isPublicKnowledge: params.isPublicKnowledge ?? true,
    secretReason: params.secretReason,
  });
}

export function isHostile(relationship: Relationship): boolean {
  return relationship.sentiment < 0;
}

export function isPositive(relationship: Relationship): boolean {
  return relationship.sentiment > 0;
}

export function isSecretRelationship(relationship: Relationship): boolean {
  return !relationship.isPublicKnowledge;
}

export function getRelationshipDescription(relationship: Relationship): string {
  const descriptions: Record<RelationshipType, string> = {
    [RelationshipType.Spouse]: 'married to',
    [RelationshipType.ExSpouse]: 'formerly married to',
    [RelationshipType.Lover]: 'romantically involved with',
    [RelationshipType.ExLover]: 'formerly involved with',
    [RelationshipType.Sibling]: 'sibling of',
    [RelationshipType.Parent]: 'parent of',
    [RelationshipType.Child]: 'child of',
    [RelationshipType.Friend]: 'friend of',
    [RelationshipType.Rival]: 'rival of',
    [RelationshipType.Enemy]: 'enemy of',
    [RelationshipType.BusinessPartner]: 'business partner of',
    [RelationshipType.Employee]: 'employed by',
    [RelationshipType.Employer]: 'employer of',
    [RelationshipType.Acquaintance]: 'acquaintance of',
  };

  return descriptions[relationship.type];
}
