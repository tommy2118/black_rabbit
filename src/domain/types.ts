// Branded types for type-safe IDs
declare const SuspectIdBrand: unique symbol;
declare const ClueIdBrand: unique symbol;
declare const LocationIdBrand: unique symbol;
declare const StatementIdBrand: unique symbol;

export type SuspectId = string & { readonly [SuspectIdBrand]: typeof SuspectIdBrand };
export type ClueId = string & { readonly [ClueIdBrand]: typeof ClueIdBrand };
export type LocationId = string & { readonly [LocationIdBrand]: typeof LocationIdBrand };
export type StatementId = string & { readonly [StatementIdBrand]: typeof StatementIdBrand };

// Factory functions for creating branded IDs
export function createSuspectId(id: string): SuspectId {
  return id as SuspectId;
}

export function createClueId(id: string): ClueId {
  return id as ClueId;
}

export function createLocationId(id: string): LocationId {
  return id as LocationId;
}

export function createStatementId(id: string): StatementId {
  return id as StatementId;
}

// Enums for domain concepts
export enum RelationshipType {
  Spouse = 'spouse',
  ExSpouse = 'ex_spouse',
  Lover = 'lover',
  ExLover = 'ex_lover',
  Sibling = 'sibling',
  Parent = 'parent',
  Child = 'child',
  Friend = 'friend',
  Rival = 'rival',
  Enemy = 'enemy',
  BusinessPartner = 'business_partner',
  Employee = 'employee',
  Employer = 'employer',
  Acquaintance = 'acquaintance',
}

export enum MotiveType {
  Jealousy = 'jealousy',
  Greed = 'greed',
  Revenge = 'revenge',
  Fear = 'fear',
  Hatred = 'hatred',
  Protection = 'protection', // Protecting someone else or a secret
  Ambition = 'ambition',
}

export enum ClueType {
  Physical = 'physical', // Fingerprint, hair, weapon, etc.
  Testimonial = 'testimonial', // Witness statement
  Documentary = 'documentary', // Letter, receipt, will, etc.
  Behavioral = 'behavioral', // Suspicious action observed
  Forensic = 'forensic', // Time of death, cause, etc.
}

export enum WeaponType {
  Poison = 'poison',
  Knife = 'knife',
  Blunt = 'blunt', // Candlestick, statue, etc.
  Firearm = 'firearm',
  Strangulation = 'strangulation',
  Pushed = 'pushed', // From height, into water, etc.
}

// Time representation (hour-based for simplicity)
export interface TimeSlot {
  hour: number; // 0-23
  label: string; // "8:00 PM", "9:30 PM", etc.
}

export function createTimeSlot(hour: number): TimeSlot {
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const period = hour >= 12 ? 'PM' : 'AM';
  return {
    hour,
    label: `${displayHour}:00 ${period}`,
  };
}

// Personality traits (affects dialogue and behavior)
export interface PersonalityTraits {
  honesty: number; // 0-1: How forthcoming in interrogation
  composure: number; // 0-1: How well they hide emotions
  aggression: number; // 0-1: How defensive/hostile when pressed
  observance: number; // 0-1: Quality of their memories/alibis
}

export function createPersonalityTraits(
  honesty: number,
  composure: number,
  aggression: number,
  observance: number
): PersonalityTraits {
  return { honesty, composure, aggression, observance };
}

// Game phases
export type GamePhase = 'intro' | 'investigation' | 'accusation' | 'resolution';

// Connection types for the case board
export enum ConnectionType {
  Suspicion = 'suspicion', // Red - accusation
  Alibi = 'alibi', // Blue - defense
  Question = 'question', // Yellow - unresolved
  Confirmed = 'confirmed', // Green - proven fact
}
