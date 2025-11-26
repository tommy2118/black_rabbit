import {
  SuspectId,
  LocationId,
  TimeSlot,
  MotiveType,
  WeaponType,
} from './types';
import { Suspect } from './suspect';
import { Relationship } from './relationship';
import { Clue } from './clue';
import { Alibi } from './alibi';
import { Location } from './location';

export interface Case {
  readonly seed: string;
  readonly suspects: readonly Suspect[];
  readonly relationships: readonly Relationship[];
  readonly locations: readonly Location[];
  readonly clues: readonly Clue[];
  readonly alibis: readonly Alibi[];
  readonly victim: SuspectId;
  readonly killer: SuspectId;
  readonly motive: MotiveType;
  readonly weapon: WeaponType;
  readonly crimeScene: LocationId;
  readonly timeOfDeath: TimeSlot;
}

export interface CreateCaseParams {
  seed: string;
  suspects: Suspect[];
  relationships: Relationship[];
  locations: Location[];
  clues: Clue[];
  alibis: Alibi[];
  victim: SuspectId;
  killer: SuspectId;
  motive: MotiveType;
  weapon: WeaponType;
  crimeScene: LocationId;
  timeOfDeath: TimeSlot;
}

export function createCase(params: CreateCaseParams): Case {
  return Object.freeze({
    seed: params.seed,
    suspects: Object.freeze([...params.suspects]),
    relationships: Object.freeze([...params.relationships]),
    locations: Object.freeze([...params.locations]),
    clues: Object.freeze([...params.clues]),
    alibis: Object.freeze([...params.alibis]),
    victim: params.victim,
    killer: params.killer,
    motive: params.motive,
    weapon: params.weapon,
    crimeScene: params.crimeScene,
    timeOfDeath: params.timeOfDeath,
  });
}

export function getKiller(caseData: Case): Suspect | undefined {
  return caseData.suspects.find(s => s.id === caseData.killer);
}

export function getVictim(caseData: Case): Suspect | undefined {
  return caseData.suspects.find(s => s.id === caseData.victim);
}

export function getSuspects(caseData: Case): readonly Suspect[] {
  return caseData.suspects.filter(s => !s.isVictim);
}

export function getCluesPointingTo(
  caseData: Case,
  suspectId: SuspectId
): readonly Clue[] {
  return caseData.clues.filter(c => c.pointsTo === suspectId);
}

export function isCaseSolvable(caseData: Case): boolean {
  // A case is solvable if there's at least one clue pointing to the killer
  const killerClues = getCluesPointingTo(caseData, caseData.killer);
  return killerClues.length > 0;
}

export function getAlibiForSuspect(
  caseData: Case,
  suspectId: SuspectId
): Alibi | undefined {
  return caseData.alibis.find(a => a.suspectId === suspectId);
}

export function getRelationshipsForSuspect(
  caseData: Case,
  suspectId: SuspectId
): readonly Relationship[] {
  return caseData.relationships.filter(
    r => r.from === suspectId || r.to === suspectId
  );
}

export function getLocationById(
  caseData: Case,
  locationId: LocationId
): Location | undefined {
  return caseData.locations.find(l => l.id === locationId);
}
