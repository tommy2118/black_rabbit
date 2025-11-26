import { GameState, PlayerKnowledge, InterrogationState, Accusation, GameResult } from './game_state';
import { Case } from '@/domain/case';
import { SuspectId, ClueId, LocationId, GamePhase } from '@/domain/types';

const STORAGE_KEY = 'black_rabbit_save';

// Serializable versions of the state (Sets/Maps -> Arrays)
interface SerializedPlayerKnowledge {
  discoveredClues: string[];
  examinedLocations: string[];
  interrogatedSuspects: string[];
  revealedContradictions: string[];
  notes: [string, string][];
}

interface SerializedInterrogationState {
  suspectId: string;
  currentStatementIndex: number;
  pressedStatements: number[];
  presentedEvidence: [number, string][];
}

interface SerializedGameState {
  phase: GamePhase;
  generatedCase: Case;
  playerKnowledge: SerializedPlayerKnowledge;
  currentLocation: string | null;
  interrogation: SerializedInterrogationState | null;
  accusation: Accusation | null;
  result: GameResult | null;
  mistakeCount: number;
  maxMistakes: number;
  searchTokens?: number; // Optional for backwards compat with old saves
  seed: string;
}

export function saveGame(state: GameState, seed: string): void {
  const serialized: SerializedGameState = {
    phase: state.phase,
    generatedCase: state.generatedCase,
    playerKnowledge: {
      discoveredClues: Array.from(state.playerKnowledge.discoveredClues),
      examinedLocations: Array.from(state.playerKnowledge.examinedLocations),
      interrogatedSuspects: Array.from(state.playerKnowledge.interrogatedSuspects),
      revealedContradictions: Array.from(state.playerKnowledge.revealedContradictions),
      notes: Array.from(state.playerKnowledge.notes.entries()),
    },
    currentLocation: state.currentLocation,
    interrogation: state.interrogation ? {
      suspectId: state.interrogation.suspectId,
      currentStatementIndex: state.interrogation.currentStatementIndex,
      pressedStatements: Array.from(state.interrogation.pressedStatements),
      presentedEvidence: Array.from(state.interrogation.presentedEvidence.entries()),
    } : null,
    accusation: state.accusation,
    result: state.result,
    mistakeCount: state.mistakeCount,
    maxMistakes: state.maxMistakes,
    searchTokens: state.searchTokens,
    seed,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.warn('Failed to save game:', e);
  }
}

export function loadGame(): { state: GameState; seed: string } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const serialized: SerializedGameState = JSON.parse(saved);

    const playerKnowledge: PlayerKnowledge = {
      discoveredClues: new Set(serialized.playerKnowledge.discoveredClues as ClueId[]),
      examinedLocations: new Set(serialized.playerKnowledge.examinedLocations as LocationId[]),
      interrogatedSuspects: new Set(serialized.playerKnowledge.interrogatedSuspects as SuspectId[]),
      revealedContradictions: new Set(serialized.playerKnowledge.revealedContradictions),
      notes: new Map(
        serialized.playerKnowledge.notes.map(([k, v]) => [k as SuspectId, v])
      ),
    };

    const interrogation: InterrogationState | null = serialized.interrogation ? {
      suspectId: serialized.interrogation.suspectId as SuspectId,
      currentStatementIndex: serialized.interrogation.currentStatementIndex,
      pressedStatements: new Set(serialized.interrogation.pressedStatements) as ReadonlySet<number>,
      presentedEvidence: new Map(
        serialized.interrogation.presentedEvidence.map(([k, v]) => [k, v as ClueId])
      ) as ReadonlyMap<number, ClueId>,
    } : null;

    const state: GameState = {
      phase: serialized.phase,
      generatedCase: serialized.generatedCase,
      playerKnowledge,
      currentLocation: serialized.currentLocation as LocationId | null,
      interrogation,
      accusation: serialized.accusation,
      result: serialized.result,
      mistakeCount: serialized.mistakeCount,
      maxMistakes: serialized.maxMistakes,
      searchTokens: serialized.searchTokens ?? 3, // Default to 3 for old saves
    };

    return { state, seed: serialized.seed };
  } catch (e) {
    console.warn('Failed to load game:', e);
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear save:', e);
  }
}

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function getSavedGameSeed(): string | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const serialized: SerializedGameState = JSON.parse(saved);
    return serialized.seed;
  } catch {
    return null;
  }
}
