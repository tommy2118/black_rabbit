import { describe, it, expect, beforeEach } from 'vitest';
import { gameReducer, gameActions } from '@/game/game_reducer';
import {
  GameState,
  createInitialGameState,
  hasDiscoveredClue,
} from '@/game/game_state';
import { generateCase } from '@/generation/case_generator';
import { generateTestimonies, Statement } from '@/game/statements';
import { createRandom } from '@/generation/random';
import { createClueId, createSuspectId, createLocationId, MotiveType } from '@/domain/types';

describe('gameReducer', () => {
  let initialState: GameState;
  const testSeed = 'test-reducer-seed';

  beforeEach(() => {
    const generatedCase = generateCase(testSeed);
    initialState = createInitialGameState(generatedCase);
  });

  describe('START_GAME', () => {
    it('transitions from intro to investigation phase', () => {
      expect(initialState.phase).toBe('intro');

      const newState = gameReducer(initialState, gameActions.startGame());

      expect(newState.phase).toBe('investigation');
    });
  });

  describe('EXAMINE_LOCATION', () => {
    it('updates current location', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const locationId = state.generatedCase.locations[0].id;

      const newState = gameReducer(
        state,
        gameActions.examineLocation(locationId)
      );

      expect(newState.currentLocation).toBe(locationId);
    });

    it('adds location to examined locations', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const locationId = state.generatedCase.locations[0].id;

      const newState = gameReducer(
        state,
        gameActions.examineLocation(locationId)
      );

      expect(newState.playerKnowledge.examinedLocations.has(locationId)).toBe(
        true
      );
    });
  });

  describe('DISCOVER_CLUE', () => {
    it('adds clue to discovered clues', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const clueId = state.generatedCase.clues[0].id;

      const newState = gameReducer(state, gameActions.discoverClue(clueId));

      expect(hasDiscoveredClue(newState, clueId)).toBe(true);
    });

    it('preserves previously discovered clues', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const clue1 = state.generatedCase.clues[0].id;
      const clue2 = state.generatedCase.clues[1].id;

      let newState = gameReducer(state, gameActions.discoverClue(clue1));
      newState = gameReducer(newState, gameActions.discoverClue(clue2));

      expect(hasDiscoveredClue(newState, clue1)).toBe(true);
      expect(hasDiscoveredClue(newState, clue2)).toBe(true);
    });
  });

  describe('START_INTERROGATION', () => {
    it('sets up interrogation state', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      const newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );

      expect(newState.interrogation).not.toBeNull();
      expect(newState.interrogation?.suspectId).toBe(suspectId);
      expect(newState.interrogation?.currentStatementIndex).toBe(0);
    });

    it('marks suspect as interrogated', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      const newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );

      expect(
        newState.playerKnowledge.interrogatedSuspects.has(suspectId)
      ).toBe(true);
    });
  });

  describe('END_INTERROGATION', () => {
    it('clears interrogation state', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );
      expect(newState.interrogation).not.toBeNull();

      newState = gameReducer(newState, gameActions.endInterrogation());
      expect(newState.interrogation).toBeNull();
    });
  });

  describe('NEXT_STATEMENT / PREVIOUS_STATEMENT', () => {
    it('navigates through statements', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );
      expect(newState.interrogation?.currentStatementIndex).toBe(0);

      newState = gameReducer(newState, gameActions.nextStatement());
      expect(newState.interrogation?.currentStatementIndex).toBe(1);

      newState = gameReducer(newState, gameActions.nextStatement());
      expect(newState.interrogation?.currentStatementIndex).toBe(2);

      newState = gameReducer(newState, gameActions.previousStatement());
      expect(newState.interrogation?.currentStatementIndex).toBe(1);
    });

    it('does not go below 0', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );
      newState = gameReducer(newState, gameActions.previousStatement());

      expect(newState.interrogation?.currentStatementIndex).toBe(0);
    });
  });

  describe('PRESS_STATEMENT', () => {
    it('marks statement as pressed', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );
      newState = gameReducer(newState, gameActions.pressStatement());

      expect(newState.interrogation?.pressedStatements.has(0)).toBe(true);
    });
  });

  describe('PRESENT_EVIDENCE', () => {
    it('increments mistake count for wrong evidence', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );

      // Create a statement that is NOT contradicted by our evidence
      const fakeStatement: Statement = {
        id: 'fake-stmt',
        suspectId,
        text: 'This is a truthful statement',
        topic: 'alibi',
        isLie: false,
        contradictedBy: [], // No contradicting evidence
        pressResponse: 'I stand by this.',
      };

      const randomClueId = newState.generatedCase.clues[0].id;
      newState = gameReducer(
        newState,
        gameActions.presentEvidence(randomClueId, fakeStatement)
      );

      expect(newState.mistakeCount).toBe(1);
    });

    it('reveals contradiction for correct evidence', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      let newState = gameReducer(
        state,
        gameActions.startInterrogation(suspectId)
      );

      const clueId = newState.generatedCase.clues[0].id;

      // Create a statement that IS contradicted by this evidence
      const lyingStatement: Statement = {
        id: 'lying-stmt',
        suspectId,
        text: 'This is a lie',
        topic: 'alibi',
        isLie: true,
        contradictedBy: [clueId], // This clue contradicts it
        pressResponse: 'I stand by this.',
        truthReveal: 'Fine, you caught me.',
      };

      newState = gameReducer(
        newState,
        gameActions.presentEvidence(clueId, lyingStatement)
      );

      expect(newState.mistakeCount).toBe(0);
      expect(
        newState.playerKnowledge.revealedContradictions.has('lying-stmt')
      ).toBe(true);
    });
  });

  describe('ACCUSATION flow', () => {
    it('transitions to accusation phase', () => {
      const state = gameReducer(initialState, gameActions.startGame());

      const newState = gameReducer(state, gameActions.startAccusation());

      expect(newState.phase).toBe('accusation');
    });

    it('sets accusation details', () => {
      let state = gameReducer(initialState, gameActions.startGame());
      state = gameReducer(state, gameActions.startAccusation());

      const accusation = {
        accusedId: state.generatedCase.suspects.find(s => !s.isVictim)!.id,
        motive: MotiveType.Greed,
        supportingEvidence: [state.generatedCase.clues[0].id],
      };

      const newState = gameReducer(state, gameActions.setAccusation(accusation));

      expect(newState.accusation).toEqual(accusation);
    });

    it('resolves game with correct accusation', () => {
      let state = gameReducer(initialState, gameActions.startGame());
      state = gameReducer(state, gameActions.startAccusation());

      const killerId = state.generatedCase.killer;
      const accusation = {
        accusedId: killerId,
        motive: state.generatedCase.motive,
        supportingEvidence: [state.generatedCase.clues[0].id],
      };

      state = gameReducer(state, gameActions.setAccusation(accusation));

      const testimonies = generateTestimonies(
        state.generatedCase,
        createRandom(testSeed)
      );
      const finalState = gameReducer(
        state,
        gameActions.confirmAccusation(testimonies)
      );

      expect(finalState.phase).toBe('resolution');
      expect(finalState.result?.won).toBe(true);
      expect(finalState.result?.correctKiller).toBe(killerId);
    });

    it('resolves game with incorrect accusation', () => {
      let state = gameReducer(initialState, gameActions.startGame());
      state = gameReducer(state, gameActions.startAccusation());

      // Accuse someone who is NOT the killer
      const innocentId = state.generatedCase.suspects.find(
        s => !s.isVictim && !s.isKiller
      )!.id;
      const accusation = {
        accusedId: innocentId,
        motive: MotiveType.Greed,
        supportingEvidence: [],
      };

      state = gameReducer(state, gameActions.setAccusation(accusation));

      const testimonies = generateTestimonies(
        state.generatedCase,
        createRandom(testSeed)
      );
      const finalState = gameReducer(
        state,
        gameActions.confirmAccusation(testimonies)
      );

      expect(finalState.phase).toBe('resolution');
      expect(finalState.result?.won).toBe(false);
      expect(finalState.result?.playerAccused).toBe(innocentId);
    });

    it('can cancel accusation', () => {
      let state = gameReducer(initialState, gameActions.startGame());
      state = gameReducer(state, gameActions.startAccusation());
      expect(state.phase).toBe('accusation');

      state = gameReducer(state, gameActions.cancelAccusation());
      expect(state.phase).toBe('investigation');
    });
  });

  describe('ADD_NOTE', () => {
    it('saves notes for suspects', () => {
      const state = gameReducer(initialState, gameActions.startGame());
      const suspectId = state.generatedCase.suspects.find(s => !s.isVictim)!.id;

      const newState = gameReducer(
        state,
        gameActions.addNote(suspectId, 'Very suspicious!')
      );

      expect(newState.playerKnowledge.notes.get(suspectId)).toBe(
        'Very suspicious!'
      );
    });
  });
});
