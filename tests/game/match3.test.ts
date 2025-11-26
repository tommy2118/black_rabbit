import { describe, it, expect } from 'vitest';
import {
  createMatch3Game,
  selectGem,
  findMatches,
  processMatches,
  isGameOver,
  isGameWon,
  Match3State,
  GEM_SYMBOLS,
} from '../../src/game/match3';

describe('Match3 Game', () => {
  describe('createMatch3Game', () => {
    it('creates a 6x6 grid', () => {
      const game = createMatch3Game();
      expect(game.grid.length).toBe(6);
      expect(game.grid[0].length).toBe(6);
    });

    it('initializes with specified moves and target', () => {
      const game = createMatch3Game(10, 100);
      expect(game.movesRemaining).toBe(10);
      expect(game.targetScore).toBe(100);
    });

    it('starts with score of 0', () => {
      const game = createMatch3Game();
      expect(game.score).toBe(0);
    });

    it('starts with no selection', () => {
      const game = createMatch3Game();
      expect(game.selected).toBeNull();
    });

    it('creates grid with no initial matches', () => {
      // Run multiple times to increase confidence
      for (let i = 0; i < 10; i++) {
        const game = createMatch3Game();
        const matches = findMatches(game.grid);
        expect(matches.length).toBe(0);
      }
    });

    it('fills grid with valid gem types', () => {
      const game = createMatch3Game();
      const validTypes = Object.keys(GEM_SYMBOLS);

      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const gem = game.grid[row][col];
          expect(gem).not.toBeNull();
          expect(validTypes).toContain(gem!.type);
        }
      }
    });
  });

  describe('selectGem', () => {
    it('selects a gem when none selected', () => {
      const game = createMatch3Game();
      const newState = selectGem(game, 2, 3);

      expect(newState.selected).toEqual({ row: 2, col: 3 });
    });

    it('selects a different gem when non-adjacent gem clicked', () => {
      let game = createMatch3Game();
      game = selectGem(game, 0, 0);
      game = selectGem(game, 3, 3); // Not adjacent

      expect(game.selected).toEqual({ row: 3, col: 3 });
    });

    it('does not allow selection when animating', () => {
      let game = createMatch3Game();
      game = { ...game, isAnimating: true };

      const newState = selectGem(game, 2, 3);
      expect(newState.selected).toBeNull();
    });

    it('does not allow selection when no moves remaining', () => {
      let game = createMatch3Game(0);

      const newState = selectGem(game, 2, 3);
      expect(newState.selected).toBeNull();
    });
  });

  describe('findMatches', () => {
    it('finds horizontal match of 3', () => {
      const grid = createTestGrid([
        ['magnifier', 'magnifier', 'magnifier', 'key', 'key', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'magnifier'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'document'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(3);
      expect(matches).toContainEqual({ row: 0, col: 0 });
      expect(matches).toContainEqual({ row: 0, col: 1 });
      expect(matches).toContainEqual({ row: 0, col: 2 });
    });

    it('finds vertical match of 3', () => {
      const grid = createTestGrid([
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['magnifier', 'key', 'fingerprint', 'witness', 'key', 'document'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(3);
      expect(matches).toContainEqual({ row: 0, col: 0 });
      expect(matches).toContainEqual({ row: 1, col: 0 });
      expect(matches).toContainEqual({ row: 2, col: 0 });
    });

    it('finds match of 4', () => {
      const grid = createTestGrid([
        ['magnifier', 'magnifier', 'magnifier', 'magnifier', 'key', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'magnifier'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(4);
    });

    it('finds no matches in valid grid', () => {
      const grid = createTestGrid([
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
        ['key', 'document', 'fingerprint', 'witness', 'magnifier', 'key'],
        ['document', 'fingerprint', 'witness', 'magnifier', 'key', 'document'],
        ['fingerprint', 'witness', 'magnifier', 'key', 'document', 'fingerprint'],
        ['witness', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(0);
    });
  });

  describe('processMatches', () => {
    it('increases score when matches found', () => {
      const grid = createTestGrid([
        ['magnifier', 'magnifier', 'magnifier', 'key', 'witness', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'magnifier'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const game: Match3State = {
        grid,
        selected: null,
        score: 0,
        movesRemaining: 10,
        targetScore: 100,
        isAnimating: true,
      };

      const newState = processMatches(game);
      expect(newState.score).toBeGreaterThan(0);
    });

    it('removes matched gems from grid', () => {
      const grid = createTestGrid([
        ['magnifier', 'magnifier', 'magnifier', 'key', 'witness', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'magnifier'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const game: Match3State = {
        grid,
        selected: null,
        score: 0,
        movesRemaining: 10,
        targetScore: 100,
        isAnimating: true,
      };

      const newState = processMatches(game);

      // Grid should still be full (gems drop and new ones fill)
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          expect(newState.grid[row][col]).not.toBeNull();
        }
      }
    });

    it('returns same state with isAnimating false when no matches', () => {
      const grid = createTestGrid([
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
        ['key', 'document', 'fingerprint', 'witness', 'magnifier', 'key'],
        ['document', 'fingerprint', 'witness', 'magnifier', 'key', 'document'],
        ['fingerprint', 'witness', 'magnifier', 'key', 'document', 'fingerprint'],
        ['witness', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'magnifier'],
      ]);

      const game: Match3State = {
        grid,
        selected: null,
        score: 50,
        movesRemaining: 10,
        targetScore: 100,
        isAnimating: true,
      };

      const newState = processMatches(game);
      expect(newState.score).toBe(50);
      expect(newState.isAnimating).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('returns true when no moves remaining', () => {
      const game = createMatch3Game(0);
      expect(isGameOver(game)).toBe(true);
    });

    it('returns false when moves remaining', () => {
      const game = createMatch3Game(5);
      expect(isGameOver(game)).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('returns true when score >= target', () => {
      let game = createMatch3Game(10, 100);
      game = { ...game, score: 100 };
      expect(isGameWon(game)).toBe(true);
    });

    it('returns true when score > target', () => {
      let game = createMatch3Game(10, 100);
      game = { ...game, score: 150 };
      expect(isGameWon(game)).toBe(true);
    });

    it('returns false when score < target', () => {
      let game = createMatch3Game(10, 100);
      game = { ...game, score: 50 };
      expect(isGameWon(game)).toBe(false);
    });
  });
});

// Helper to create a test grid from gem type arrays
function createTestGrid(types: string[][]): (import('../../src/game/match3').Gem | null)[][] {
  return types.map((row, rowIdx) =>
    row.map((type, colIdx) => ({
      type: type as import('../../src/game/match3').GemType,
      row: rowIdx,
      col: colIdx,
      id: `test-${rowIdx}-${colIdx}`,
    }))
  );
}
