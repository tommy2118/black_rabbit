import { GameState } from './game_state';
import { GameAction, gameReducer } from './game_reducer';

export type Listener = (state: GameState) => void;

export interface Store {
  getState: () => GameState;
  dispatch: (action: GameAction) => void;
  subscribe: (listener: Listener) => () => void;
}

export function createStore(initialState: GameState): Store {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,

    dispatch: (action: GameAction) => {
      state = gameReducer(state, action);
      listeners.forEach(listener => listener(state));
    },

    subscribe: (listener: Listener) => {
      listeners.add(listener);
      // Return unsubscribe function
      return () => listeners.delete(listener);
    },
  };
}
