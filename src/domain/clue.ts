import { ClueId, SuspectId, LocationId, ClueType } from './types';

export type ClueSignificance = 'minor' | 'normal' | 'critical';

export interface Clue {
  readonly id: ClueId;
  readonly type: ClueType;
  readonly name: string;
  readonly description: string;
  readonly foundAt: LocationId;
  readonly pointsTo?: SuspectId;
  readonly isRedHerring: boolean;
  readonly refutedBy?: ClueId; // For red herrings, which clue proves it false
  readonly significance: ClueSignificance;
}

export interface CreateClueParams {
  id: ClueId;
  type: ClueType;
  name: string;
  description: string;
  foundAt: LocationId;
  pointsTo?: SuspectId;
  isRedHerring?: boolean;
  refutedBy?: ClueId;
  significance?: ClueSignificance;
}

export function createClue(params: CreateClueParams): Clue {
  return Object.freeze({
    id: params.id,
    type: params.type,
    name: params.name,
    description: params.description,
    foundAt: params.foundAt,
    pointsTo: params.pointsTo,
    isRedHerring: params.isRedHerring ?? false,
    refutedBy: params.refutedBy,
    significance: params.significance ?? 'normal',
  });
}

export function isPhysicalEvidence(clue: Clue): boolean {
  return clue.type === ClueType.Physical;
}

export function isTestimony(clue: Clue): boolean {
  return clue.type === ClueType.Testimonial;
}

export function isRedHerring(clue: Clue): boolean {
  return clue.isRedHerring;
}

export function pointsToSuspect(clue: Clue, suspectId: SuspectId): boolean {
  return clue.pointsTo === suspectId;
}
