import { describe, it, expect } from 'vitest';

// Import types and functions we'll implement
import {
  PanelType,
  BonusType,
  Panel,
  PanelPuzzleState,
  createPanelPuzzle,
  selectPanel,
  trySwap,
  swapPanels,
  findMatches,
  processMatches,
  applyGravity,
  raiseRows,
  isGameOver,
  isGameWon,
  PANEL_SYMBOLS,
} from '../../src/game/panel_puzzle';

describe('Panel Puzzle Game', () => {
  describe('createPanelPuzzle', () => {
    it('creates a 6x12 grid (6 columns, 12 rows)', () => {
      const game = createPanelPuzzle();
      expect(game.grid.length).toBe(12); // rows
      expect(game.grid[0].length).toBe(6); // columns
    });

    it('starts with bottom 6 rows filled, top 6 empty', () => {
      const game = createPanelPuzzle();

      // Top 6 rows should be empty (null)
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          expect(game.grid[row][col]).toBeNull();
        }
      }

      // Bottom 6 rows should have panels
      for (let row = 6; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          expect(game.grid[row][col]).not.toBeNull();
        }
      }
    });

    it('starts with no initial matches in filled rows', () => {
      // Run multiple times to increase confidence
      for (let i = 0; i < 10; i++) {
        const game = createPanelPuzzle();
        const matches = findMatches(game.grid);
        expect(matches.length).toBe(0);
      }
    });

    it('initializes with default target score and time', () => {
      const game = createPanelPuzzle();
      expect(game.targetScore).toBe(500);
      expect(game.timeRemaining).toBe(60);
    });

    it('accepts custom target score and time', () => {
      const game = createPanelPuzzle(1000, 120);
      expect(game.targetScore).toBe(1000);
      expect(game.timeRemaining).toBe(120);
    });

    it('starts with score of 0 and combo of 0', () => {
      const game = createPanelPuzzle();
      expect(game.score).toBe(0);
      expect(game.combo).toBe(0);
    });

    it('fills grid with valid panel types', () => {
      const game = createPanelPuzzle();
      const validTypes: PanelType[] = ['magnifier', 'fingerprint', 'document', 'witness', 'key', 'flashlight'];

      for (let row = 6; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const panel = game.grid[row][col];
          expect(panel).not.toBeNull();
          expect(validTypes).toContain(panel!.type);
          expect(panel!.bonus).toBeNull();
        }
      }
    });

    it('has symbols for all panel types', () => {
      const types: PanelType[] = ['magnifier', 'fingerprint', 'document', 'witness', 'key', 'flashlight'];
      for (const type of types) {
        expect(PANEL_SYMBOLS[type]).toBeDefined();
        expect(typeof PANEL_SYMBOLS[type]).toBe('string');
      }
    });
  });

  describe('Panel and Bonus Types', () => {
    it('defines all panel types', () => {
      const game = createPanelPuzzle();
      // Just verify the game creates - types are tested via TypeScript
      expect(game).toBeDefined();
    });

    it('bonus types include line_h, line_v, cross, and blast', () => {
      // This is a type-level test - we'll verify by creating panels with bonuses
      const bonusTypes: BonusType[] = ['line_h', 'line_v', 'cross', 'blast'];
      expect(bonusTypes.length).toBe(4);
    });
  });

  describe('selectPanel - selection mechanics', () => {
    it('selects a panel when none selected', () => {
      const game = createPanelPuzzle();
      const newState = selectPanel(game, 8, 2);

      expect(newState.selected).toEqual({ row: 8, col: 2 });
    });

    it('deselects when clicking same panel', () => {
      let game = createPanelPuzzle();
      game = selectPanel(game, 8, 2);
      game = selectPanel(game, 8, 2);

      expect(game.selected).toBeNull();
    });

    it('changes selection when clicking non-adjacent panel', () => {
      let game = createPanelPuzzle();
      game = selectPanel(game, 8, 2);
      game = selectPanel(game, 10, 4); // Not adjacent

      expect(game.selected).toEqual({ row: 10, col: 4 });
    });

    it('cannot select empty cells', () => {
      const game = createPanelPuzzle();
      // Row 0 should be empty
      const newState = selectPanel(game, 0, 0);

      expect(newState.selected).toBeNull();
    });

    it('cannot select while animating', () => {
      let game = createPanelPuzzle();
      game = { ...game, isAnimating: true };

      const newState = selectPanel(game, 8, 2);
      expect(newState.selected).toBeNull();
    });
  });

  describe('trySwap - validated swapping', () => {
    it('swaps adjacent panels when swap creates a match', () => {
      // Create a grid where swapping will create a match
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'key', 'magnifier', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'key', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      let game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
        selected: { row: 6, col: 2 }, // Select the 'key'
      };

      // Swap key at (6,2) with magnifier at (6,3) - creates 3 magnifiers
      const result = trySwap(game, 6, 3);

      expect(result.swapped).toBe(true);
      expect(result.state.grid[6][2]?.type).toBe('magnifier');
      expect(result.state.grid[6][3]?.type).toBe('key');
      expect(result.state.selected).toBeNull();
    });

    it('reverts swap when no match is created', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
        ['key', 'document', 'fingerprint', 'witness', 'flashlight', 'magnifier'],
        ['document', 'fingerprint', 'witness', 'flashlight', 'magnifier', 'key'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      let game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
        selected: { row: 8, col: 2 },
      };

      const originalType1 = game.grid[8][2]?.type;
      const originalType2 = game.grid[8][3]?.type;

      const result = trySwap(game, 8, 3);

      expect(result.swapped).toBe(false);
      expect(result.state.grid[8][2]?.type).toBe(originalType1);
      expect(result.state.grid[8][3]?.type).toBe(originalType2);
    });

    it('allows vertical swaps', () => {
      // Grid where swapping (8,0) with (9,0) creates 3 magnifiers vertically
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
        ['magnifier', 'document', 'key', 'witness', 'flashlight', 'fingerprint'],
        ['key', 'fingerprint', 'witness', 'flashlight', 'document', 'key'],
        ['magnifier', 'witness', 'flashlight', 'key', 'fingerprint', 'document'],
        ['witness', 'flashlight', 'key', 'document', 'magnifier', 'fingerprint'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      // Swap (8,0) key with (9,0) magnifier to create 3 magnifiers at (6,0), (7,0), (8,0)
      let game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
        selected: { row: 9, col: 0 }, // Select the magnifier at (9,0)
      };

      const result = trySwap(game, 8, 0); // Swap with (8,0) key

      expect(result.swapped).toBe(true);
    });

    it('does not swap non-adjacent panels', () => {
      const game = createPanelPuzzle();
      const gameWithSelection: PanelPuzzleState = {
        ...game,
        selected: { row: 8, col: 2 },
      };

      const result = trySwap(gameWithSelection, 10, 4);

      expect(result.swapped).toBe(false);
    });

    it('does not swap when no panel is selected', () => {
      const game = createPanelPuzzle();

      const result = trySwap(game, 8, 3);

      expect(result.swapped).toBe(false);
    });
  });

  describe('swapPanels - basic swap (deprecated, for backwards compat)', () => {
    it('swaps two horizontally adjacent panels', () => {
      const game = createPanelPuzzle();
      const leftPanel = game.grid[8][2];
      const rightPanel = game.grid[8][3];

      const newState = swapPanels(game, 8, 2);

      // Panels should be swapped
      expect(newState.grid[8][2]?.type).toBe(rightPanel?.type);
      expect(newState.grid[8][3]?.type).toBe(leftPanel?.type);
    });

    it('can swap with empty space on the right', () => {
      const game = createPanelPuzzle();
      // Row 5 should be empty, row 6 should have panels
      // Let's manually set up a scenario
      const newGrid = game.grid.map(r => [...r]);
      newGrid[5][2] = null; // empty
      newGrid[5][3] = { type: 'magnifier', bonus: null, row: 5, col: 3, id: 'test' };

      const modifiedGame = { ...game, grid: newGrid };
      const newState = swapPanels(modifiedGame, 5, 2);

      // Should swap - panel moves left, empty moves right
      expect(newState.grid[5][2]?.type).toBe('magnifier');
      expect(newState.grid[5][3]).toBeNull();
    });

    it('cannot swap when at rightmost column', () => {
      const game = createPanelPuzzle();
      const originalPanel = game.grid[8][5];

      const newState = swapPanels(game, 8, 5);

      // Should be unchanged - can't swap past edge
      expect(newState.grid[8][5]?.type).toBe(originalPanel?.type);
    });

    it('cannot swap while game is animating', () => {
      let game = createPanelPuzzle();
      game = { ...game, isAnimating: true };

      const originalGrid = JSON.stringify(game.grid);
      const newState = swapPanels(game, 8, 2);

      expect(JSON.stringify(newState.grid)).toBe(originalGrid);
    });

    it('cannot swap when game is over', () => {
      let game = createPanelPuzzle();
      game = { ...game, isGameOver: true };

      const originalGrid = JSON.stringify(game.grid);
      const newState = swapPanels(game, 8, 2);

      expect(JSON.stringify(newState.grid)).toBe(originalGrid);
    });
  });

  describe('findMatches - detecting matches', () => {
    it('finds horizontal match of 3', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'key', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'magnifier'],
        ['key', 'document', 'witness', 'magnifier', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'magnifier', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(1);
      expect(matches[0].positions.length).toBe(3);
      expect(matches[0].direction).toBe('horizontal');
    });

    it('finds vertical match of 3', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'witness', 'key', 'document', 'flashlight', 'fingerprint'],
        ['magnifier', 'key', 'fingerprint', 'witness', 'key', 'document'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(1);
      expect(matches[0].positions.length).toBe(3);
      expect(matches[0].direction).toBe('vertical');
    });

    it('finds horizontal match of 4', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'magnifier', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'key', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(1);
      expect(matches[0].positions.length).toBe(4);
    });

    it('finds horizontal match of 5', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'magnifier', 'magnifier', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'key', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(1);
      expect(matches[0].positions.length).toBe(5);
    });

    it('finds L-shaped match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'witness', 'key', 'document', 'flashlight', 'fingerprint'],
        ['magnifier', 'magnifier', 'magnifier', 'witness', 'key', 'document'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      // Should detect as L-shape (combined horizontal and vertical)
      const lMatch = matches.find(m => m.shape === 'L');
      expect(lMatch).toBeDefined();
      expect(lMatch!.positions.length).toBe(5);
    });

    it('finds T-shaped match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['key', 'magnifier', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'magnifier', 'magnifier', 'document', 'flashlight', 'fingerprint'],
        ['key', 'magnifier', 'fingerprint', 'witness', 'key', 'document'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const matches = findMatches(grid);
      const tMatch = matches.find(m => m.shape === 'T');
      expect(tMatch).toBeDefined();
      expect(tMatch!.positions.length).toBe(5);
    });

    it('finds no matches in valid grid', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
        ['key', 'document', 'fingerprint', 'witness', 'flashlight', 'magnifier'],
        ['document', 'fingerprint', 'witness', 'flashlight', 'magnifier', 'key'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      const matches = findMatches(grid);
      expect(matches.length).toBe(0);
    });

    it('ignores null spaces when finding matches', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', null, 'magnifier', 'magnifier', 'witness', 'flashlight'],
        ['key', 'document', 'fingerprint', 'witness', 'flashlight', 'magnifier'],
        ['document', 'fingerprint', 'witness', 'flashlight', 'magnifier', 'key'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      const matches = findMatches(grid);
      // Should NOT match across the null gap
      expect(matches.length).toBe(0);
    });
  });

  describe('processMatches - clearing and bonus creation', () => {
    it('clears matched panels from grid', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'key', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Matched positions should be null
      expect(result.grid[6][0]).toBeNull();
      expect(result.grid[6][1]).toBeNull();
      expect(result.grid[6][2]).toBeNull();
      // Non-matched should remain
      expect(result.grid[6][3]).not.toBeNull();
    });

    it('increases score based on match size', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'key', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);
      expect(result.score).toBeGreaterThan(0);
    });

    it('creates horizontal line clearer from horizontal 4-match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'magnifier', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'key', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Should have created a line clearer bonus panel somewhere
      let foundBonus = false;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const panel = result.grid[row][col];
          if (panel?.bonus === 'line_h') {
            foundBonus = true;
            break;
          }
        }
      }
      expect(foundBonus).toBe(true);
    });

    it('creates vertical line clearer from vertical 4-match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'witness', 'key', 'document', 'flashlight', 'fingerprint'],
        ['magnifier', 'key', 'fingerprint', 'witness', 'key', 'document'],
        ['magnifier', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      let foundBonus = false;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const panel = result.grid[row][col];
          if (panel?.bonus === 'line_v') {
            foundBonus = true;
            break;
          }
        }
      }
      expect(foundBonus).toBe(true);
    });

    it('creates cross bomb from 5-match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'magnifier', 'magnifier', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'key', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      let foundBonus = false;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const panel = result.grid[row][col];
          if (panel?.bonus === 'cross') {
            foundBonus = true;
            break;
          }
        }
      }
      expect(foundBonus).toBe(true);
    });

    it('creates area blast from L-shaped match', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'key', 'document', 'fingerprint', 'witness', 'key'],
        ['magnifier', 'witness', 'key', 'document', 'flashlight', 'fingerprint'],
        ['magnifier', 'magnifier', 'magnifier', 'witness', 'key', 'document'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['document', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      let foundBonus = false;
      for (let row = 0; row < 12; row++) {
        for (let col = 0; col < 6; col++) {
          const panel = result.grid[row][col];
          if (panel?.bonus === 'blast') {
            foundBonus = true;
            break;
          }
        }
      }
      expect(foundBonus).toBe(true);
    });

    it('increments combo counter on each match wave', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'key', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);
      expect(result.combo).toBe(1);
    });
  });

  describe('Bonus activation', () => {
    it('horizontal line clearer clears entire row when matched', () => {
      const grid = createGridWithBonus('line_h', 8, 2, 'magnifier');
      // Set up a match that will activate the bonus
      grid[8][0] = createPanel('magnifier', 8, 0);
      grid[8][1] = createPanel('magnifier', 8, 1);
      // grid[8][2] already has magnifier with line_h bonus

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Entire row 8 should be cleared
      for (let col = 0; col < 6; col++) {
        expect(result.grid[8][col]).toBeNull();
      }
    });

    it('vertical line clearer clears entire column when matched', () => {
      const grid = createGridWithBonus('line_v', 8, 2, 'magnifier');
      // Set up a vertical match that will activate the bonus
      grid[6][2] = createPanel('magnifier', 6, 2);
      grid[7][2] = createPanel('magnifier', 7, 2);
      // grid[8][2] already has magnifier with line_v bonus

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Entire column 2 should be cleared
      for (let row = 6; row < 12; row++) {
        expect(result.grid[row][2]).toBeNull();
      }
    });

    it('cross bomb clears row and column when matched', () => {
      const grid = createGridWithBonus('cross', 8, 2, 'magnifier');
      grid[8][0] = createPanel('magnifier', 8, 0);
      grid[8][1] = createPanel('magnifier', 8, 1);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Row 8 should be cleared
      for (let col = 0; col < 6; col++) {
        expect(result.grid[8][col]).toBeNull();
      }
      // Column 2 should be cleared
      for (let row = 6; row < 12; row++) {
        expect(result.grid[row][2]).toBeNull();
      }
    });

    it('area blast clears 3x3 area when matched', () => {
      const grid = createGridWithBonus('blast', 8, 2, 'magnifier');
      grid[8][0] = createPanel('magnifier', 8, 0);
      grid[8][1] = createPanel('magnifier', 8, 1);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // 3x3 area around (8, 2) should be cleared
      for (let row = 7; row <= 9; row++) {
        for (let col = 1; col <= 3; col++) {
          if (row >= 0 && row < 12 && col >= 0 && col < 6) {
            expect(result.grid[row][col]).toBeNull();
          }
        }
      }
    });

    it('chaining bonuses - bonus hitting bonus activates it', () => {
      // Place two bonuses where one will trigger the other
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['key', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
        ['witness', 'document', 'key', 'document', 'flashlight', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'document'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      // Add a horizontal line clearer that will be hit by a vertical line clearer
      grid[8][3] = createPanel('magnifier', 8, 3, 'line_h');
      grid[9][3] = createPanel('magnifier', 9, 3, 'line_v');
      grid[10][3] = createPanel('magnifier', 10, 3);
      grid[11][3] = createPanel('magnifier', 11, 3);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = processMatches(game);

      // Row 8 should also be cleared (chain reaction from line_v hitting line_h)
      for (let col = 0; col < 6; col++) {
        expect(result.grid[8][col]).toBeNull();
      }
    });
  });

  describe('applyGravity', () => {
    it('makes panels fall down to fill gaps', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', null, 'document', 'fingerprint', 'witness', 'flashlight'],
        [null, 'key', null, 'document', 'flashlight', 'magnifier'],
        ['document', 'fingerprint', 'witness', null, 'magnifier', 'key'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = applyGravity(game);

      // Gaps should be filled by panels falling from above
      // Column 0: existing panels fall down, new panel spawns at top
      expect(result.grid[11][0]?.type).toBe('flashlight');
      expect(result.grid[10][0]?.type).toBe('witness');
      expect(result.grid[9][0]?.type).toBe('fingerprint');
      expect(result.grid[8][0]?.type).toBe('document');
      expect(result.grid[7][0]?.type).toBe('magnifier');
      // Row 6 now gets a new random panel spawned
      expect(result.grid[6][0]).not.toBeNull();
    });

    it('does not fill gaps from above with new panels (only from rising rows)', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
        ['magnifier', 'key', 'document', 'fingerprint', 'flashlight', 'magnifier'],
        ['document', 'fingerprint', 'witness', 'flashlight', 'magnifier', 'key'],
        ['fingerprint', 'witness', 'flashlight', 'magnifier', 'key', 'document'],
        ['witness', 'flashlight', 'magnifier', 'key', 'document', 'fingerprint'],
        ['flashlight', 'magnifier', 'key', 'document', 'fingerprint', 'witness'],
      ]);

      const game: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const result = applyGravity(game);

      // Top row should still be null - no spawning
      for (let col = 0; col < 6; col++) {
        expect(result.grid[0][col]).toBeNull();
      }
    });
  });

  describe('raiseRows', () => {
    it('pushes all panels up by one row', () => {
      const game = createPanelPuzzle();
      const bottomRowTypes = game.grid[11].map(p => p?.type);

      const result = raiseRows(game);

      // What was row 11 should now be row 10
      const newRow10Types = result.grid[10].map(p => p?.type);
      expect(newRow10Types).toEqual(bottomRowTypes);
    });

    it('adds new row at the bottom from nextRow', () => {
      const game = createPanelPuzzle();
      const nextRowTypes = game.nextRow.map(p => p.type);

      const result = raiseRows(game);

      // New bottom row should match nextRow
      const newBottomTypes = result.grid[11].map(p => p?.type);
      expect(newBottomTypes).toEqual(nextRowTypes);
    });

    it('generates new nextRow after raising', () => {
      const game = createPanelPuzzle();
      const oldNextRow = JSON.stringify(game.nextRow);

      const result = raiseRows(game);

      // nextRow should be different (new random row)
      expect(JSON.stringify(result.nextRow)).not.toBe(oldNextRow);
    });

    it('triggers game over if panels pushed above row 0', () => {
      const game = createPanelPuzzle();
      // Fill row 0 with panels
      const newGrid = game.grid.map(r => [...r]);
      for (let col = 0; col < 6; col++) {
        newGrid[0][col] = createPanel('magnifier', 0, col);
      }

      const modifiedGame = { ...game, grid: newGrid };
      const result = raiseRows(modifiedGame);

      expect(result.isGameOver).toBe(true);
    });
  });

  describe('isGameOver', () => {
    it('returns true when time runs out', () => {
      let game = createPanelPuzzle();
      game = { ...game, timeRemaining: 0 };
      expect(isGameOver(game)).toBe(true);
    });

    it('returns true when isGameOver flag is set', () => {
      let game = createPanelPuzzle();
      game = { ...game, isGameOver: true };
      expect(isGameOver(game)).toBe(true);
    });

    it('returns false during normal play', () => {
      const game = createPanelPuzzle();
      expect(isGameOver(game)).toBe(false);
    });
  });

  describe('isGameWon', () => {
    it('returns true when score >= target', () => {
      let game = createPanelPuzzle(500, 60);
      game = { ...game, score: 500 };
      expect(isGameWon(game)).toBe(true);
    });

    it('returns true when score > target', () => {
      let game = createPanelPuzzle(500, 60);
      game = { ...game, score: 750 };
      expect(isGameWon(game)).toBe(true);
    });

    it('returns false when score < target', () => {
      let game = createPanelPuzzle(500, 60);
      game = { ...game, score: 250 };
      expect(isGameWon(game)).toBe(false);
    });
  });

  describe('Combo scoring', () => {
    it('awards bonus points for combos', () => {
      const grid = createTestGrid([
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        [null, null, null, null, null, null],
        ['magnifier', 'magnifier', 'magnifier', 'key', 'flashlight', 'document'],
        ['fingerprint', 'witness', 'key', 'document', 'magnifier', 'fingerprint'],
        ['document', 'key', 'fingerprint', 'witness', 'key', 'flashlight'],
        ['key', 'document', 'witness', 'flashlight', 'fingerprint', 'key'],
        ['witness', 'fingerprint', 'flashlight', 'key', 'document', 'witness'],
        ['flashlight', 'key', 'document', 'fingerprint', 'witness', 'flashlight'],
      ]);

      const gameWithCombo: PanelPuzzleState = {
        grid,
        score: 0,
        combo: 3, // Already have a combo going
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const gameNoCombo: PanelPuzzleState = {
        grid: JSON.parse(JSON.stringify(grid)), // Deep copy
        score: 0,
        combo: 0,
        targetScore: 500,
        timeRemaining: 60,
        isAnimating: false,
        isGameOver: false,
        riseProgress: 0,
        nextRow: createNextRow(),
      };

      const resultWithCombo = processMatches(gameWithCombo);
      const resultNoCombo = processMatches(gameNoCombo);

      // Higher combo should give more points
      expect(resultWithCombo.score).toBeGreaterThan(resultNoCombo.score);
    });
  });
});

// Helper functions for tests

function createTestGrid(types: (string | null)[][]): (Panel | null)[][] {
  return types.map((row, rowIdx) =>
    row.map((type, colIdx) =>
      type === null ? null : createPanel(type as PanelType, rowIdx, colIdx)
    )
  );
}

function createPanel(type: PanelType, row: number, col: number, bonus: BonusType | null = null): Panel {
  return {
    type,
    bonus,
    row,
    col,
    id: `test-${row}-${col}`,
  };
}

function createNextRow(): Panel[] {
  const types: PanelType[] = ['magnifier', 'fingerprint', 'document', 'witness', 'key', 'flashlight'];
  return Array.from({ length: 6 }, (_, col) => ({
    type: types[col % types.length],
    bonus: null,
    row: 12,
    col,
    id: `next-${col}`,
  }));
}

function createGridWithBonus(bonus: BonusType, row: number, col: number, type: PanelType): (Panel | null)[][] {
  const grid = createTestGrid([
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    [null, null, null, null, null, null],
    ['key', 'witness', 'document', 'fingerprint', 'flashlight', 'key'],
    ['witness', 'document', 'key', 'flashlight', 'fingerprint', 'witness'],
    ['document', 'key', 'flashlight', 'fingerprint', 'witness', 'document'],
    ['fingerprint', 'flashlight', 'witness', 'key', 'document', 'fingerprint'],
    ['flashlight', 'witness', 'fingerprint', 'document', 'key', 'flashlight'],
    ['witness', 'fingerprint', 'document', 'key', 'flashlight', 'witness'],
  ]);

  grid[row][col] = createPanel(type, row, col, bonus);
  return grid;
}
