// Match-3 mini-game for earning investigation actions

export type GemType = 'magnifier' | 'fingerprint' | 'document' | 'witness' | 'key';

export interface Gem {
  type: GemType;
  row: number;
  col: number;
  id: string;
}

export interface Match3State {
  grid: (Gem | null)[][];
  selected: { row: number; col: number } | null;
  score: number;
  movesRemaining: number;
  targetScore: number;
  isAnimating: boolean;
}

const GRID_SIZE = 6;
const GEM_TYPES: GemType[] = ['magnifier', 'fingerprint', 'document', 'witness', 'key'];

// Gem display symbols
export const GEM_SYMBOLS: Record<GemType, string> = {
  magnifier: '🔍',
  fingerprint: '👆',
  document: '📄',
  witness: '👁',
  key: '🗝',
};

export function createMatch3Game(moves: number = 10, target: number = 100): Match3State {
  const grid = createInitialGrid();
  // Remove any initial matches
  clearInitialMatches(grid);

  return {
    grid,
    selected: null,
    score: 0,
    movesRemaining: moves,
    targetScore: target,
    isAnimating: false,
  };
}

function createInitialGrid(): (Gem | null)[][] {
  const grid: (Gem | null)[][] = [];
  let id = 0;

  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = {
        type: GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)],
        row,
        col,
        id: `gem-${id++}`,
      };
    }
  }

  return grid;
}

function clearInitialMatches(grid: (Gem | null)[][]): void {
  let hasMatches = true;
  while (hasMatches) {
    const matches = findMatches(grid);
    if (matches.length === 0) {
      hasMatches = false;
    } else {
      // Replace matched gems with new random ones
      for (const { row, col } of matches) {
        if (grid[row][col]) {
          grid[row][col]!.type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
        }
      }
    }
  }
}

export function selectGem(
  state: Match3State,
  row: number,
  col: number
): Match3State {
  if (state.isAnimating || state.movesRemaining <= 0) return state;

  if (!state.selected) {
    // First selection
    return { ...state, selected: { row, col } };
  }

  const { row: selectedRow, col: selectedCol } = state.selected;

  // Check if adjacent
  const isAdjacent =
    (Math.abs(row - selectedRow) === 1 && col === selectedCol) ||
    (Math.abs(col - selectedCol) === 1 && row === selectedRow);

  if (!isAdjacent) {
    // Select new gem instead
    return { ...state, selected: { row, col } };
  }

  // Try to swap
  return trySwap(state, selectedRow, selectedCol, row, col);
}

function trySwap(
  state: Match3State,
  row1: number,
  col1: number,
  row2: number,
  col2: number
): Match3State {
  const newGrid = state.grid.map(row => [...row]);

  // Swap gems
  const temp = newGrid[row1][col1];
  newGrid[row1][col1] = newGrid[row2][col2];
  newGrid[row2][col2] = temp;

  // Update positions
  if (newGrid[row1][col1]) {
    newGrid[row1][col1] = { ...newGrid[row1][col1]!, row: row1, col: col1 };
  }
  if (newGrid[row2][col2]) {
    newGrid[row2][col2] = { ...newGrid[row2][col2]!, row: row2, col: col2 };
  }

  // Check for matches
  const matches = findMatches(newGrid);

  if (matches.length === 0) {
    // No match - invalid move, don't swap
    return { ...state, selected: null };
  }

  // Valid swap - process matches
  return {
    ...state,
    grid: newGrid,
    selected: null,
    movesRemaining: state.movesRemaining - 1,
    isAnimating: true,
  };
}

export function findMatches(grid: (Gem | null)[][]): { row: number; col: number }[] {
  const matches: Set<string> = new Set();

  // Check horizontal matches
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE - 2; col++) {
      const gem1 = grid[row][col];
      const gem2 = grid[row][col + 1];
      const gem3 = grid[row][col + 2];

      if (gem1 && gem2 && gem3 && gem1.type === gem2.type && gem2.type === gem3.type) {
        matches.add(`${row},${col}`);
        matches.add(`${row},${col + 1}`);
        matches.add(`${row},${col + 2}`);

        // Check for 4+ matches
        if (col + 3 < GRID_SIZE && grid[row][col + 3]?.type === gem1.type) {
          matches.add(`${row},${col + 3}`);
        }
        if (col + 4 < GRID_SIZE && grid[row][col + 4]?.type === gem1.type) {
          matches.add(`${row},${col + 4}`);
        }
      }
    }
  }

  // Check vertical matches
  for (let col = 0; col < GRID_SIZE; col++) {
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      const gem1 = grid[row][col];
      const gem2 = grid[row + 1][col];
      const gem3 = grid[row + 2][col];

      if (gem1 && gem2 && gem3 && gem1.type === gem2.type && gem2.type === gem3.type) {
        matches.add(`${row},${col}`);
        matches.add(`${row + 1},${col}`);
        matches.add(`${row + 2},${col}`);

        // Check for 4+ matches
        if (row + 3 < GRID_SIZE && grid[row + 3][col]?.type === gem1.type) {
          matches.add(`${row + 3},${col}`);
        }
        if (row + 4 < GRID_SIZE && grid[row + 4][col]?.type === gem1.type) {
          matches.add(`${row + 4},${col}`);
        }
      }
    }
  }

  return Array.from(matches).map(key => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });
}

export function processMatches(state: Match3State): Match3State {
  const matches = findMatches(state.grid);

  if (matches.length === 0) {
    return { ...state, isAnimating: false };
  }

  const newGrid = state.grid.map(row => [...row]);

  // Calculate score (more gems = bonus)
  const baseScore = matches.length * 10;
  const bonus = matches.length > 3 ? (matches.length - 3) * 5 : 0;
  const newScore = state.score + baseScore + bonus;

  // Remove matched gems
  for (const { row, col } of matches) {
    newGrid[row][col] = null;
  }

  // Drop gems down
  for (let col = 0; col < GRID_SIZE; col++) {
    let writeRow = GRID_SIZE - 1;
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (newGrid[row][col] !== null) {
        if (row !== writeRow) {
          newGrid[writeRow][col] = newGrid[row][col];
          newGrid[writeRow][col]!.row = writeRow;
          newGrid[row][col] = null;
        }
        writeRow--;
      }
    }

    // Fill empty spaces at top with new gems
    let id = Date.now();
    for (let row = writeRow; row >= 0; row--) {
      newGrid[row][col] = {
        type: GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)],
        row,
        col,
        id: `gem-${id++}-${row}-${col}`,
      };
    }
  }

  return {
    ...state,
    grid: newGrid,
    score: newScore,
    isAnimating: true, // Continue animating if there are cascading matches
  };
}

export function isGameOver(state: Match3State): boolean {
  return state.movesRemaining <= 0;
}

export function isGameWon(state: Match3State): boolean {
  return state.score >= state.targetScore;
}

export function hasValidMoves(grid: (Gem | null)[][]): boolean {
  // Check if any swap would create a match
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Try swap right
      if (col < GRID_SIZE - 1) {
        const testGrid = grid.map(r => [...r]);
        const temp = testGrid[row][col];
        testGrid[row][col] = testGrid[row][col + 1];
        testGrid[row][col + 1] = temp;
        if (findMatches(testGrid).length > 0) return true;
      }
      // Try swap down
      if (row < GRID_SIZE - 1) {
        const testGrid = grid.map(r => [...r]);
        const temp = testGrid[row][col];
        testGrid[row][col] = testGrid[row + 1][col];
        testGrid[row + 1][col] = temp;
        if (findMatches(testGrid).length > 0) return true;
      }
    }
  }
  return false;
}
