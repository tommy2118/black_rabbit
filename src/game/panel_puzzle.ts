// Panel Puzzle mini-game - Tetris Attack / Puzzle League style
// Rows rise from below, player swaps horizontally, match 3+ to clear

export type PanelType = 'magnifier' | 'fingerprint' | 'document' | 'witness' | 'key' | 'flashlight';
export type BonusType = 'line_h' | 'line_v' | 'cross' | 'blast';

export interface Panel {
  type: PanelType;
  bonus: BonusType | null;
  row: number;
  col: number;
  id: string;
}

export interface Match {
  positions: { row: number; col: number }[];
  direction: 'horizontal' | 'vertical' | 'both';
  shape: 'line' | 'L' | 'T';
  type: PanelType;
}

export interface PanelPuzzleState {
  grid: (Panel | null)[][];
  score: number;
  combo: number;
  targetScore: number;
  timeRemaining: number;
  isAnimating: boolean;
  isGameOver: boolean;
  riseProgress: number;
  nextRow: Panel[];
  selected: { row: number; col: number } | null;
}

export interface SwapResult {
  swapped: boolean;
  state: PanelPuzzleState;
}

const GRID_ROWS = 12;
const GRID_COLS = 6;
const PANEL_TYPES: PanelType[] = ['magnifier', 'fingerprint', 'document', 'witness', 'key', 'flashlight'];

export const PANEL_SYMBOLS: Record<PanelType, string> = {
  magnifier: '🔍',
  fingerprint: '👆',
  document: '📄',
  witness: '👁',
  key: '🗝',
  flashlight: '🔦',
};

export const BONUS_SYMBOLS: Record<BonusType, string> = {
  line_h: '↔',
  line_v: '↕',
  cross: '✚',
  blast: '💥',
};

let panelIdCounter = 0;

function generatePanelId(): string {
  return `panel-${panelIdCounter++}`;
}

function randomPanelType(): PanelType {
  return PANEL_TYPES[Math.floor(Math.random() * PANEL_TYPES.length)];
}

export function createPanelPuzzle(targetScore: number = 500, timeRemaining: number = 60): PanelPuzzleState {
  const grid: (Panel | null)[][] = [];

  // Create empty grid
  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      grid[row][col] = null;
    }
  }

  // Fill bottom 6 rows (rows 6-11) with panels
  for (let row = 6; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      grid[row][col] = {
        type: randomPanelType(),
        bonus: null,
        row,
        col,
        id: generatePanelId(),
      };
    }
  }

  // Clear initial matches
  clearInitialMatches(grid);

  return {
    grid,
    score: 0,
    combo: 0,
    targetScore,
    timeRemaining,
    isAnimating: false,
    isGameOver: false,
    riseProgress: 0,
    nextRow: generateNextRow(),
    selected: null,
  };
}

function clearInitialMatches(grid: (Panel | null)[][]): void {
  let hasMatches = true;
  let iterations = 0;
  const maxIterations = 100;

  while (hasMatches && iterations < maxIterations) {
    const matches = findMatches(grid);
    if (matches.length === 0) {
      hasMatches = false;
    } else {
      // Replace matched panels with new random ones
      for (const match of matches) {
        for (const pos of match.positions) {
          if (grid[pos.row][pos.col]) {
            grid[pos.row][pos.col]!.type = randomPanelType();
          }
        }
      }
    }
    iterations++;
  }
}

function generateNextRow(): Panel[] {
  return Array.from({ length: GRID_COLS }, (_, col) => ({
    type: randomPanelType(),
    bonus: null,
    row: GRID_ROWS,
    col,
    id: generatePanelId(),
  }));
}

// Select a panel (for swap mechanic)
export function selectPanel(state: PanelPuzzleState, row: number, col: number): PanelPuzzleState {
  // Can't select while animating
  if (state.isAnimating || state.isGameOver) {
    return { ...state, selected: null };
  }

  // Can't select empty cells
  if (!state.grid[row]?.[col]) {
    return state;
  }

  // Toggle selection if clicking same panel
  if (state.selected?.row === row && state.selected?.col === col) {
    return { ...state, selected: null };
  }

  return { ...state, selected: { row, col } };
}

// Check if two positions are adjacent (horizontally or vertically)
function isAdjacent(row1: number, col1: number, row2: number, col2: number): boolean {
  const rowDiff = Math.abs(row1 - row2);
  const colDiff = Math.abs(col1 - col2);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// Try to swap selected panel with target - validates match is created
export function trySwap(state: PanelPuzzleState, targetRow: number, targetCol: number): SwapResult {
  // Need a selection first
  if (!state.selected) {
    return { swapped: false, state };
  }

  const { row: selectedRow, col: selectedCol } = state.selected;

  // Must be adjacent
  if (!isAdjacent(selectedRow, selectedCol, targetRow, targetCol)) {
    return { swapped: false, state };
  }

  // Perform the swap on a copy
  const newGrid = state.grid.map(r => [...r]);
  const panel1 = newGrid[selectedRow][selectedCol];
  const panel2 = newGrid[targetRow][targetCol];

  newGrid[selectedRow][selectedCol] = panel2;
  newGrid[targetRow][targetCol] = panel1;

  // Update positions
  if (newGrid[selectedRow][selectedCol]) {
    newGrid[selectedRow][selectedCol] = { ...newGrid[selectedRow][selectedCol]!, row: selectedRow, col: selectedCol };
  }
  if (newGrid[targetRow][targetCol]) {
    newGrid[targetRow][targetCol] = { ...newGrid[targetRow][targetCol]!, row: targetRow, col: targetCol };
  }

  // Check if swap creates a match
  const matches = findMatches(newGrid);

  if (matches.length === 0) {
    // No match - revert (return original state with selection cleared)
    return { swapped: false, state: { ...state, selected: null } };
  }

  // Valid swap - return new state
  return {
    swapped: true,
    state: { ...state, grid: newGrid, selected: null, isAnimating: true },
  };
}

// Legacy swap function (swaps right, no validation)
export function swapPanels(state: PanelPuzzleState, row: number, col: number): PanelPuzzleState {
  // Can't swap while animating or game over
  if (state.isAnimating || state.isGameOver) {
    return state;
  }

  // Can't swap at rightmost column (no panel to swap with)
  if (col >= GRID_COLS - 1) {
    return state;
  }

  // Create new grid with swap
  const newGrid = state.grid.map(r => [...r]);

  const leftPanel = newGrid[row][col];
  const rightPanel = newGrid[row][col + 1];

  // Perform swap
  newGrid[row][col] = rightPanel;
  newGrid[row][col + 1] = leftPanel;

  // Update positions
  if (newGrid[row][col]) {
    newGrid[row][col] = { ...newGrid[row][col]!, row, col };
  }
  if (newGrid[row][col + 1]) {
    newGrid[row][col + 1] = { ...newGrid[row][col + 1]!, row, col: col + 1 };
  }

  return { ...state, grid: newGrid };
}

export function findMatches(grid: (Panel | null)[][]): Match[] {
  const matches: Match[] = [];

  // Find all horizontal sequences of 3+
  const horizontalSequences: { row: number; col: number; type: PanelType }[][] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    let sequence: { row: number; col: number; type: PanelType }[] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const panel = grid[row][col];
      if (panel && (sequence.length === 0 || panel.type === sequence[0].type)) {
        sequence.push({ row, col, type: panel.type });
      } else {
        if (sequence.length >= 3) {
          horizontalSequences.push([...sequence]);
        }
        sequence = panel ? [{ row, col, type: panel.type }] : [];
      }
    }
    if (sequence.length >= 3) {
      horizontalSequences.push([...sequence]);
    }
  }

  // Find all vertical sequences of 3+
  const verticalSequences: { row: number; col: number; type: PanelType }[][] = [];
  for (let col = 0; col < GRID_COLS; col++) {
    let sequence: { row: number; col: number; type: PanelType }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      const panel = grid[row][col];
      if (panel && (sequence.length === 0 || panel.type === sequence[0].type)) {
        sequence.push({ row, col, type: panel.type });
      } else {
        if (sequence.length >= 3) {
          verticalSequences.push([...sequence]);
        }
        sequence = panel ? [{ row, col, type: panel.type }] : [];
      }
    }
    if (sequence.length >= 3) {
      verticalSequences.push([...sequence]);
    }
  }

  // Convert sequences to matches, detecting L and T shapes
  const positionToSequences = new Map<string, { h?: typeof horizontalSequences[0]; v?: typeof verticalSequences[0] }>();

  for (const seq of horizontalSequences) {
    for (const pos of seq) {
      const key = `${pos.row},${pos.col}`;
      const existing = positionToSequences.get(key) || {};
      existing.h = seq;
      positionToSequences.set(key, existing);
    }
  }

  for (const seq of verticalSequences) {
    for (const pos of seq) {
      const key = `${pos.row},${pos.col}`;
      const existing = positionToSequences.get(key) || {};
      existing.v = seq;
      positionToSequences.set(key, existing);
    }
  }

  // Find intersections (L and T shapes)
  const processedH = new Set<typeof horizontalSequences[0]>();
  const processedV = new Set<typeof verticalSequences[0]>();

  for (const [key, seqs] of positionToSequences) {
    if (seqs.h && seqs.v && !processedH.has(seqs.h) && !processedV.has(seqs.v)) {
      // This is an intersection - L or T shape
      const allPositions = new Set<string>();
      for (const pos of seqs.h) allPositions.add(`${pos.row},${pos.col}`);
      for (const pos of seqs.v) allPositions.add(`${pos.row},${pos.col}`);

      const positions = Array.from(allPositions).map(key => {
        const [row, col] = key.split(',').map(Number);
        return { row, col };
      });

      // Determine if L or T shape based on intersection point
      const [intRow, intCol] = key.split(',').map(Number);

      // T-shape: intersection is in the middle of one sequence
      // L-shape: intersection is at the end of at least one sequence
      const hStart = seqs.h[0].col;
      const hEnd = seqs.h[seqs.h.length - 1].col;
      const vStart = seqs.v[0].row;
      const vEnd = seqs.v[seqs.v.length - 1].row;

      const isHMiddle = intCol > hStart && intCol < hEnd;
      const isVMiddle = intRow > vStart && intRow < vEnd;

      // T-shape if intersection is in the middle of at least one sequence
      const shape: 'L' | 'T' = (isHMiddle || isVMiddle) ? 'T' : 'L';

      matches.push({
        positions,
        direction: 'both',
        shape,
        type: seqs.h[0].type,
      });

      processedH.add(seqs.h);
      processedV.add(seqs.v);
    }
  }

  // Add remaining unprocessed horizontal sequences
  for (const seq of horizontalSequences) {
    if (!processedH.has(seq)) {
      matches.push({
        positions: seq.map(p => ({ row: p.row, col: p.col })),
        direction: 'horizontal',
        shape: 'line',
        type: seq[0].type,
      });
    }
  }

  // Add remaining unprocessed vertical sequences
  for (const seq of verticalSequences) {
    if (!processedV.has(seq)) {
      matches.push({
        positions: seq.map(p => ({ row: p.row, col: p.col })),
        direction: 'vertical',
        shape: 'line',
        type: seq[0].type,
      });
    }
  }

  return matches;
}

export function processMatches(state: PanelPuzzleState): PanelPuzzleState {
  const matches = findMatches(state.grid);

  if (matches.length === 0) {
    return { ...state, isAnimating: false };
  }

  const newGrid = state.grid.map(r => [...r]);
  const bonusesToActivate: { row: number; col: number; bonus: BonusType }[] = [];
  let bonusToCreate: { row: number; col: number; type: PanelType; bonus: BonusType } | null = null;

  // Process each match
  for (const match of matches) {
    // Determine if we should create a bonus
    if (match.shape === 'L' || match.shape === 'T') {
      // L/T shape creates area blast
      const centerPos = match.positions[Math.floor(match.positions.length / 2)];
      bonusToCreate = {
        row: centerPos.row,
        col: centerPos.col,
        type: match.type,
        bonus: 'blast',
      };
    } else if (match.positions.length >= 5) {
      // 5+ creates cross bomb
      const centerPos = match.positions[Math.floor(match.positions.length / 2)];
      bonusToCreate = {
        row: centerPos.row,
        col: centerPos.col,
        type: match.type,
        bonus: 'cross',
      };
    } else if (match.positions.length === 4) {
      // 4-match creates line clearer
      const centerPos = match.positions[Math.floor(match.positions.length / 2)];
      bonusToCreate = {
        row: centerPos.row,
        col: centerPos.col,
        type: match.type,
        bonus: match.direction === 'horizontal' ? 'line_h' : 'line_v',
      };
    }

    // Collect bonuses that need to be activated
    for (const pos of match.positions) {
      const panel = newGrid[pos.row][pos.col];
      if (panel?.bonus) {
        bonusesToActivate.push({ row: pos.row, col: pos.col, bonus: panel.bonus });
      }
    }

    // Clear matched panels
    for (const pos of match.positions) {
      newGrid[pos.row][pos.col] = null;
    }
  }

  // Activate bonuses (can chain)
  const activatedPositions = new Set<string>();
  while (bonusesToActivate.length > 0) {
    const bonusInfo = bonusesToActivate.shift()!;
    const key = `${bonusInfo.row},${bonusInfo.col}`;
    if (activatedPositions.has(key)) continue;
    activatedPositions.add(key);

    const clearedPositions = activateBonus(newGrid, bonusInfo.row, bonusInfo.col, bonusInfo.bonus);

    // Check if any cleared positions had bonuses that need to chain
    for (const pos of clearedPositions) {
      const panel = newGrid[pos.row]?.[pos.col];
      if (panel?.bonus && !activatedPositions.has(`${pos.row},${pos.col}`)) {
        bonusesToActivate.push({ row: pos.row, col: pos.col, bonus: panel.bonus });
      }
      if (newGrid[pos.row]) {
        newGrid[pos.row][pos.col] = null;
      }
    }
  }

  // Create bonus panel if earned
  if (bonusToCreate && newGrid[bonusToCreate.row][bonusToCreate.col] === null) {
    newGrid[bonusToCreate.row][bonusToCreate.col] = {
      type: bonusToCreate.type,
      bonus: bonusToCreate.bonus,
      row: bonusToCreate.row,
      col: bonusToCreate.col,
      id: generatePanelId(),
    };
  }

  // Calculate score
  const baseScore = matches.reduce((sum, m) => sum + m.positions.length * 10, 0);
  const comboMultiplier = 1 + state.combo * 0.5;
  const newScore = state.score + Math.floor(baseScore * comboMultiplier);

  return {
    ...state,
    grid: newGrid,
    score: newScore,
    combo: state.combo + 1,
    isAnimating: true,
  };
}

function activateBonus(
  grid: (Panel | null)[][],
  row: number,
  col: number,
  bonus: BonusType
): { row: number; col: number }[] {
  const clearedPositions: { row: number; col: number }[] = [];

  switch (bonus) {
    case 'line_h':
      // Clear entire row
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[row][c]) {
          clearedPositions.push({ row, col: c });
        }
      }
      break;

    case 'line_v':
      // Clear entire column
      for (let r = 0; r < GRID_ROWS; r++) {
        if (grid[r][col]) {
          clearedPositions.push({ row: r, col });
        }
      }
      break;

    case 'cross':
      // Clear row and column
      for (let c = 0; c < GRID_COLS; c++) {
        if (grid[row][c]) {
          clearedPositions.push({ row, col: c });
        }
      }
      for (let r = 0; r < GRID_ROWS; r++) {
        if (grid[r][col] && r !== row) {
          clearedPositions.push({ row: r, col });
        }
      }
      break;

    case 'blast':
      // Clear 3x3 area
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && grid[r][c]) {
            clearedPositions.push({ row: r, col: c });
          }
        }
      }
      break;
  }

  return clearedPositions;
}

export function applyGravity(state: PanelPuzzleState): PanelPuzzleState {
  const newGrid = state.grid.map(r => [...r]);

  // Process each column - panels fall down
  for (let col = 0; col < GRID_COLS; col++) {
    let writeRow = GRID_ROWS - 1;

    // Scan from bottom to top
    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (newGrid[row][col] !== null) {
        if (row !== writeRow) {
          // Create a new panel object to avoid mutating the original
          newGrid[writeRow][col] = { ...newGrid[row][col]!, row: writeRow };
          newGrid[row][col] = null;
        }
        writeRow--;
      }
    }

    // Fill empty spaces at top with new panels
    // Only fill rows 6 and below (the playable area)
    for (let row = writeRow; row >= 0; row--) {
      if (row >= 6) {
        // Spawn new panel in the playable area
        newGrid[row][col] = {
          type: randomPanelType(),
          bonus: null,
          row,
          col,
          id: generatePanelId(),
        };
      }
    }
  }

  return { ...state, grid: newGrid };
}

export function raiseRows(state: PanelPuzzleState): PanelPuzzleState {
  const newGrid: (Panel | null)[][] = [];

  // Check if any panels in row 0 - game over condition
  let willOverflow = false;
  for (let col = 0; col < GRID_COLS; col++) {
    if (state.grid[0][col] !== null) {
      willOverflow = true;
      break;
    }
  }

  if (willOverflow) {
    return { ...state, isGameOver: true };
  }

  // Shift all rows up by 1
  for (let row = 0; row < GRID_ROWS - 1; row++) {
    newGrid[row] = state.grid[row + 1].map(panel =>
      panel ? { ...panel, row: row } : null
    );
  }

  // Add next row at the bottom
  newGrid[GRID_ROWS - 1] = state.nextRow.map((panel, col) => ({
    ...panel,
    row: GRID_ROWS - 1,
    col,
  }));

  return {
    ...state,
    grid: newGrid,
    nextRow: generateNextRow(),
    riseProgress: 0,
  };
}

export function isGameOver(state: PanelPuzzleState): boolean {
  return state.isGameOver || state.timeRemaining <= 0;
}

export function isGameWon(state: PanelPuzzleState): boolean {
  return state.score >= state.targetScore;
}

// Find a valid move (swap that creates a match) - returns null if none exists
export function findValidMove(state: PanelPuzzleState): { from: { row: number; col: number }; to: { row: number; col: number } } | null {
  const grid = state.grid;

  // Check all possible horizontal and vertical swaps
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!grid[row][col]) continue;

      // Try swap right
      if (col < GRID_COLS - 1 && grid[row][col + 1]) {
        const testGrid = grid.map(r => [...r]);
        const temp = testGrid[row][col];
        testGrid[row][col] = testGrid[row][col + 1];
        testGrid[row][col + 1] = temp;
        if (findMatches(testGrid).length > 0) {
          return { from: { row, col }, to: { row, col: col + 1 } };
        }
      }

      // Try swap down
      if (row < GRID_ROWS - 1 && grid[row + 1][col]) {
        const testGrid = grid.map(r => [...r]);
        const temp = testGrid[row][col];
        testGrid[row][col] = testGrid[row + 1][col];
        testGrid[row + 1][col] = temp;
        if (findMatches(testGrid).length > 0) {
          return { from: { row, col }, to: { row: row + 1, col } };
        }
      }
    }
  }

  return null;
}

// Check if any valid moves exist
export function hasValidMoves(state: PanelPuzzleState): boolean {
  return findValidMove(state) !== null;
}

// Reset combo when player makes a swap without creating a match
export function resetComboIfNoMatch(state: PanelPuzzleState): PanelPuzzleState {
  const matches = findMatches(state.grid);
  if (matches.length === 0) {
    return { ...state, combo: 0 };
  }
  return state;
}

// Update timer (row rising disabled for simpler gameplay)
export function tick(state: PanelPuzzleState, deltaSeconds: number): PanelPuzzleState {
  if (state.isGameOver) return state;

  const newTime = Math.max(0, state.timeRemaining - deltaSeconds);

  let newState = { ...state, timeRemaining: newTime };

  if (newTime <= 0) {
    newState = { ...newState, isGameOver: true };
  }

  return newState;
}
