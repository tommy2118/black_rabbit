import { SuspectId, PersonalityTraits } from './types';

export interface Suspect {
  readonly id: SuspectId;
  readonly firstName: string;
  readonly lastName: string;
  readonly occupation: string;
  readonly age: number;
  readonly description: string;
  readonly personality: PersonalityTraits;
  readonly isVictim: boolean;
  readonly isKiller: boolean;
}

export interface CreateSuspectParams {
  id: SuspectId;
  firstName: string;
  lastName: string;
  occupation: string;
  age: number;
  description: string;
  personality: PersonalityTraits;
  isVictim?: boolean;
  isKiller?: boolean;
}

export function createSuspect(params: CreateSuspectParams): Suspect {
  return Object.freeze({
    id: params.id,
    firstName: params.firstName,
    lastName: params.lastName,
    occupation: params.occupation,
    age: params.age,
    description: params.description,
    personality: Object.freeze({ ...params.personality }),
    isVictim: params.isVictim ?? false,
    isKiller: params.isKiller ?? false,
  });
}

export function getFullName(suspect: Suspect): string {
  return `${suspect.firstName} ${suspect.lastName}`;
}

export function isVictim(suspect: Suspect): boolean {
  return suspect.isVictim;
}

export function isKiller(suspect: Suspect): boolean {
  return suspect.isKiller;
}
