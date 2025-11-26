import { SuspectId, LocationId, TimeSlot } from './types';

export interface Alibi {
  readonly suspectId: SuspectId;
  readonly timeSlot: TimeSlot;
  readonly location: LocationId;
  readonly description: string;
  readonly witnesses: readonly SuspectId[];
  readonly isVerifiable: boolean; // Can be confirmed by evidence/witnesses
  readonly isFalse: boolean; // For the killer's alibi
}

export interface CreateAlibiParams {
  suspectId: SuspectId;
  timeSlot: TimeSlot;
  location: LocationId;
  description: string;
  witnesses?: SuspectId[];
  isVerifiable?: boolean;
  isFalse?: boolean;
}

export function createAlibi(params: CreateAlibiParams): Alibi {
  return Object.freeze({
    suspectId: params.suspectId,
    timeSlot: params.timeSlot,
    location: params.location,
    description: params.description,
    witnesses: Object.freeze(params.witnesses ?? []),
    isVerifiable: params.isVerifiable ?? true,
    isFalse: params.isFalse ?? false,
  });
}

export function hasWitnesses(alibi: Alibi): boolean {
  return alibi.witnesses.length > 0;
}

export function canBeVerified(alibi: Alibi): boolean {
  return alibi.isVerifiable && !alibi.isFalse;
}
