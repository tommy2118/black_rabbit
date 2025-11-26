import { Case } from '@/domain/case';
import {
  SuspectId,
  ClueId,
  LocationId,
  GamePhase,
  MotiveType,
} from '@/domain/types';

// Player's collected knowledge
export interface PlayerKnowledge {
  readonly discoveredClues: ReadonlySet<ClueId>;
  readonly examinedLocations: ReadonlySet<LocationId>;
  readonly interrogatedSuspects: ReadonlySet<SuspectId>;
  readonly revealedContradictions: ReadonlySet<string>; // contradiction IDs
  readonly notes: ReadonlyMap<SuspectId, string>;
}

// Interrogation state
export interface InterrogationState {
  readonly suspectId: SuspectId;
  readonly currentStatementIndex: number;
  readonly pressedStatements: ReadonlySet<number>;
  readonly presentedEvidence: ReadonlyMap<number, ClueId>; // statement index -> clue presented
}

// Player's accusation
export interface Accusation {
  readonly accusedId: SuspectId;
  readonly motive: MotiveType;
  readonly supportingEvidence: readonly ClueId[];
}

// Game result
export interface GameResult {
  readonly won: boolean;
  readonly correctKiller: SuspectId;
  readonly playerAccused: SuspectId;
  readonly cluesFound: number;
  readonly totalClues: number;
  readonly contradictionsFound: number;
  readonly totalContradictions: number;
}

// Main game state
export interface GameState {
  readonly phase: GamePhase;
  readonly generatedCase: Case;
  readonly playerKnowledge: PlayerKnowledge;
  readonly currentLocation: LocationId | null;
  readonly interrogation: InterrogationState | null;
  readonly accusation: Accusation | null;
  readonly result: GameResult | null;
  readonly mistakeCount: number; // Wrong evidence presentations
  readonly maxMistakes: number;
  readonly searchTokens: number; // Earned from mini-game, spent on searches
}

// Factory functions
export function createInitialPlayerKnowledge(): PlayerKnowledge {
  return {
    discoveredClues: new Set(),
    examinedLocations: new Set(),
    interrogatedSuspects: new Set(),
    revealedContradictions: new Set(),
    notes: new Map(),
  };
}

export function createInitialGameState(generatedCase: Case): GameState {
  return {
    phase: 'intro',
    generatedCase,
    playerKnowledge: createInitialPlayerKnowledge(),
    currentLocation: generatedCase.crimeScene, // Start at crime scene
    interrogation: null,
    accusation: null,
    result: null,
    mistakeCount: 0,
    maxMistakes: 5,
    searchTokens: 3, // Start with 3 free searches
  };
}

// Helper to check if player has discovered a clue
export function hasDiscoveredClue(state: GameState, clueId: ClueId): boolean {
  return state.playerKnowledge.discoveredClues.has(clueId);
}

// Helper to get discovered clues as array
export function getDiscoveredClues(state: GameState): ClueId[] {
  return Array.from(state.playerKnowledge.discoveredClues);
}

// Helper to check if player can make accusation
export function canMakeAccusation(state: GameState): boolean {
  // Need at least 3 clues to make an accusation
  return state.playerKnowledge.discoveredClues.size >= 3;
}

// Helper to check if game is over
export function isGameOver(state: GameState): boolean {
  return state.phase === 'resolution';
}
