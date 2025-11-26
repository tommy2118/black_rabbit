import {
  GameState,
  Accusation,
  GameResult,
} from './game_state';
import { Statement, Testimony, checkContradiction } from './statements';
import { SuspectId, ClueId, LocationId } from '@/domain/types';

// Action types
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'EXAMINE_LOCATION'; locationId: LocationId }
  | { type: 'DISCOVER_CLUE'; clueId: ClueId }
  | { type: 'START_INTERROGATION'; suspectId: SuspectId }
  | { type: 'END_INTERROGATION' }
  | { type: 'NEXT_STATEMENT' }
  | { type: 'PREVIOUS_STATEMENT' }
  | { type: 'PRESS_STATEMENT' }
  | { type: 'PRESENT_EVIDENCE'; clueId: ClueId; statement: Statement }
  | { type: 'ADD_NOTE'; suspectId: SuspectId; note: string }
  | { type: 'START_ACCUSATION' }
  | { type: 'SET_ACCUSATION'; accusation: Accusation }
  | { type: 'CONFIRM_ACCUSATION'; testimonies: Map<SuspectId, Testimony> }
  | { type: 'CANCEL_ACCUSATION' }
  | { type: 'ADD_SEARCH_TOKENS'; amount: number }
  | { type: 'SPEND_SEARCH_TOKEN' };

// Pure reducer function
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...state,
        phase: 'investigation',
      };

    case 'EXAMINE_LOCATION':
      return {
        ...state,
        currentLocation: action.locationId,
        playerKnowledge: {
          ...state.playerKnowledge,
          examinedLocations: new Set([
            ...state.playerKnowledge.examinedLocations,
            action.locationId,
          ]),
        },
      };

    case 'DISCOVER_CLUE':
      return {
        ...state,
        playerKnowledge: {
          ...state.playerKnowledge,
          discoveredClues: new Set([
            ...state.playerKnowledge.discoveredClues,
            action.clueId,
          ]),
        },
      };

    case 'START_INTERROGATION':
      return {
        ...state,
        interrogation: {
          suspectId: action.suspectId,
          currentStatementIndex: 0,
          pressedStatements: new Set(),
          presentedEvidence: new Map(),
        },
        playerKnowledge: {
          ...state.playerKnowledge,
          interrogatedSuspects: new Set([
            ...state.playerKnowledge.interrogatedSuspects,
            action.suspectId,
          ]),
        },
      };

    case 'END_INTERROGATION':
      return {
        ...state,
        interrogation: null,
      };

    case 'NEXT_STATEMENT':
      if (!state.interrogation) return state;
      return {
        ...state,
        interrogation: {
          ...state.interrogation,
          currentStatementIndex: state.interrogation.currentStatementIndex + 1,
        },
      };

    case 'PREVIOUS_STATEMENT':
      if (!state.interrogation) return state;
      return {
        ...state,
        interrogation: {
          ...state.interrogation,
          currentStatementIndex: Math.max(
            0,
            state.interrogation.currentStatementIndex - 1
          ),
        },
      };

    case 'PRESS_STATEMENT':
      if (!state.interrogation) return state;
      return {
        ...state,
        interrogation: {
          ...state.interrogation,
          pressedStatements: new Set([
            ...state.interrogation.pressedStatements,
            state.interrogation.currentStatementIndex,
          ]),
        },
      };

    case 'PRESENT_EVIDENCE': {
      if (!state.interrogation) return state;

      const isContradiction = checkContradiction(action.statement, action.clueId);

      if (isContradiction) {
        // Correct! Found a contradiction
        return {
          ...state,
          interrogation: {
            ...state.interrogation,
            presentedEvidence: new Map([
              ...state.interrogation.presentedEvidence,
              [state.interrogation.currentStatementIndex, action.clueId],
            ]),
          },
          playerKnowledge: {
            ...state.playerKnowledge,
            revealedContradictions: new Set([
              ...state.playerKnowledge.revealedContradictions,
              action.statement.id,
            ]),
          },
        };
      } else {
        // Wrong evidence presented - counts as a mistake
        return {
          ...state,
          mistakeCount: state.mistakeCount + 1,
        };
      }
    }

    case 'ADD_NOTE':
      return {
        ...state,
        playerKnowledge: {
          ...state.playerKnowledge,
          notes: new Map([
            ...state.playerKnowledge.notes,
            [action.suspectId, action.note],
          ]),
        },
      };

    case 'START_ACCUSATION':
      return {
        ...state,
        phase: 'accusation',
      };

    case 'SET_ACCUSATION':
      return {
        ...state,
        accusation: action.accusation,
      };

    case 'CONFIRM_ACCUSATION': {
      if (!state.accusation) return state;

      const correctKiller = state.generatedCase.killer;
      const won = state.accusation.accusedId === correctKiller;

      // Calculate stats
      const totalContradictions = countTotalContradictions(action.testimonies);

      const result: GameResult = {
        won,
        correctKiller,
        playerAccused: state.accusation.accusedId,
        cluesFound: state.playerKnowledge.discoveredClues.size,
        totalClues: state.generatedCase.clues.length,
        contradictionsFound: state.playerKnowledge.revealedContradictions.size,
        totalContradictions,
      };

      return {
        ...state,
        phase: 'resolution',
        result,
      };
    }

    case 'CANCEL_ACCUSATION':
      return {
        ...state,
        phase: 'investigation',
        accusation: null,
      };

    case 'ADD_SEARCH_TOKENS':
      return {
        ...state,
        searchTokens: state.searchTokens + action.amount,
      };

    case 'SPEND_SEARCH_TOKEN':
      return {
        ...state,
        searchTokens: Math.max(0, state.searchTokens - 1),
      };

    default:
      return state;
  }
}

function countTotalContradictions(
  testimonies: Map<SuspectId, Testimony>
): number {
  let count = 0;
  for (const testimony of testimonies.values()) {
    for (const statement of testimony.statements) {
      if (statement.isLie && statement.contradictedBy.length > 0) {
        count++;
      }
    }
  }
  return count;
}

// Action creators for convenience
export const gameActions = {
  startGame: (): GameAction => ({ type: 'START_GAME' }),

  examineLocation: (locationId: LocationId): GameAction => ({
    type: 'EXAMINE_LOCATION',
    locationId,
  }),

  discoverClue: (clueId: ClueId): GameAction => ({
    type: 'DISCOVER_CLUE',
    clueId,
  }),

  startInterrogation: (suspectId: SuspectId): GameAction => ({
    type: 'START_INTERROGATION',
    suspectId,
  }),

  endInterrogation: (): GameAction => ({ type: 'END_INTERROGATION' }),

  nextStatement: (): GameAction => ({ type: 'NEXT_STATEMENT' }),

  previousStatement: (): GameAction => ({ type: 'PREVIOUS_STATEMENT' }),

  pressStatement: (): GameAction => ({ type: 'PRESS_STATEMENT' }),

  presentEvidence: (clueId: ClueId, statement: Statement): GameAction => ({
    type: 'PRESENT_EVIDENCE',
    clueId,
    statement,
  }),

  addNote: (suspectId: SuspectId, note: string): GameAction => ({
    type: 'ADD_NOTE',
    suspectId,
    note,
  }),

  startAccusation: (): GameAction => ({ type: 'START_ACCUSATION' }),

  setAccusation: (accusation: Accusation): GameAction => ({
    type: 'SET_ACCUSATION',
    accusation,
  }),

  confirmAccusation: (testimonies: Map<SuspectId, Testimony>): GameAction => ({
    type: 'CONFIRM_ACCUSATION',
    testimonies,
  }),

  cancelAccusation: (): GameAction => ({ type: 'CANCEL_ACCUSATION' }),

  addSearchTokens: (amount: number): GameAction => ({
    type: 'ADD_SEARCH_TOKENS',
    amount,
  }),

  spendSearchToken: (): GameAction => ({ type: 'SPEND_SEARCH_TOKEN' }),
};
