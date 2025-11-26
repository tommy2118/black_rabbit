import './styles/main.css';
import { generateCase } from './generation/case_generator';
import { createRandom } from './generation/random';
import { createInitialGameState } from './game/game_state';
import { createStore, Store } from './game/store';
import { gameActions } from './game/game_reducer';
import { generateTestimonies } from './game/statements';
import { getVictim, getSuspects } from './domain/case';
import { getFullName, Suspect } from './domain/suspect';
import { Clue } from './domain/clue';
import { SuspectId, MotiveType } from './domain/types';
import { audioManager } from './audio/audio_manager';
import { saveGame, loadGame, clearSave, hasSavedGame } from './game/persistence';
import {
  PanelPuzzleState,
  createPanelPuzzle,
  selectPanel,
  trySwap,
  processMatches,
  findMatches,
  applyGravity,
  tick,
  isGameWon,
  findValidMove,
  hasValidMoves,
  PANEL_SYMBOLS,
  BONUS_SYMBOLS,
} from './game/panel_puzzle';

// Check for saved game first
const savedGame = loadGame();

// Get seed from URL, saved game, or generate random
const urlParams = new URLSearchParams(window.location.search);
let seed = urlParams.get('seed') || savedGame?.seed || `mystery-${Date.now()}`;

// Generate the case and testimonies
let generatedCase = generateCase(seed);
let random = createRandom(seed);
let testimonies = generateTestimonies(generatedCase, random);

// Create game store - use saved state if available and seed matches
let store: Store;
if (savedGame && savedGame.seed === seed) {
  store = createStore(savedGame.state);
} else {
  const initialState = createInitialGameState(generatedCase);
  store = createStore(initialState);
}

// Update URL with seed
if (!urlParams.get('seed')) {
  window.history.replaceState({}, '', `?seed=${seed}`);
}

// Auto-save on every state change
store.subscribe((state) => {
  // Don't save if game is over (let them start fresh)
  if (state.phase !== 'resolution') {
    saveGame(state, seed);
  }
});

// Panel puzzle mini-game state
let puzzleState: PanelPuzzleState | null = null;
let puzzleCallback: ((tokensEarned: number) => void) | null = null;
let puzzleTimerInterval: number | null = null;
let puzzleAnimationFrame: number | null = null;
let lastTickTime: number = 0;
let puzzleOverlayElement: HTMLElement | null = null;
let isProcessingMatches = false;
let previousScore = 0;
let lastMatchTime: number = 0;
let hintShown = false;

// Constants for timing
// Animation durations - must match CSS
const SWAP_DURATION = 200;
const CLEAR_DURATION = 350;
const FALL_DURATION = 320;
const CASCADE_DELAY = 100;
const HINT_DELAY = 5000; // Show hint after 5 seconds without a match

function showPanelPuzzle(onComplete: (tokensEarned: number) => void) {
  puzzleState = createPanelPuzzle(250, 60); // Target 250 points, 60 seconds
  puzzleCallback = onComplete;
  lastTickTime = performance.now();
  previousScore = 0;
  isProcessingMatches = false;
  lastMatchTime = performance.now();
  hintShown = false;

  // Create the overlay once
  createPuzzleOverlay();

  // Use requestAnimationFrame for smoother updates
  const gameLoop = (currentTime: number) => {
    if (!puzzleState) return;

    const delta = (currentTime - lastTickTime) / 1000;
    lastTickTime = currentTime;

    if (!puzzleState.isGameOver && !isProcessingMatches) {
      puzzleState = tick(puzzleState, delta);
      updatePuzzleTimerDisplay();

      // Check for no valid moves
      if (!hasValidMoves(puzzleState)) {
        puzzleState = { ...puzzleState, isGameOver: true };
        showPuzzleGameOver();
        return;
      }

      // Show hint after HINT_DELAY without a match
      if (!hintShown && currentTime - lastMatchTime > HINT_DELAY) {
        showHint();
        hintShown = true;
      }

      if (puzzleState.isGameOver) {
        showPuzzleGameOver();
        return;
      }
    }

    puzzleAnimationFrame = requestAnimationFrame(gameLoop);
  };

  puzzleAnimationFrame = requestAnimationFrame(gameLoop);
}

function createPuzzleOverlay() {
  if (!puzzleState) return;

  // Remove any existing overlay
  document.querySelector('.puzzle-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'puzzle-overlay';
  overlay.innerHTML = `
    <div class="puzzle-container">
      <div class="puzzle-header">
        <h2>Evidence Search</h2>
        <p>Tap to select, tap adjacent to swap</p>
      </div>

      <div class="puzzle-stats">
        <div class="puzzle-stat">
          <div class="puzzle-stat-label">Score</div>
          <div class="puzzle-stat-value score" id="puzzle-score">0</div>
        </div>
        <div class="puzzle-stat">
          <div class="puzzle-stat-label">Goal</div>
          <div class="puzzle-stat-value target">${puzzleState.targetScore}</div>
        </div>
        <div class="puzzle-stat">
          <div class="puzzle-stat-label">Combo</div>
          <div class="puzzle-stat-value combo" id="puzzle-combo">-</div>
        </div>
        <div class="puzzle-stat">
          <div class="puzzle-stat-label">Time</div>
          <div class="puzzle-stat-value time" id="puzzle-time">${Math.ceil(puzzleState.timeRemaining)}s</div>
        </div>
      </div>

      <div class="puzzle-progress-row">
        <div class="puzzle-progress score-progress">
          <div class="puzzle-progress-bar" id="puzzle-score-bar" style="width: 0%"></div>
        </div>
        <div class="puzzle-progress time-progress">
          <div class="puzzle-progress-bar time-bar" id="puzzle-time-bar" style="width: 100%"></div>
        </div>
      </div>

      <div class="puzzle-game-area" id="puzzle-game-area">
        <div class="puzzle-grid" id="puzzle-grid"></div>
      </div>

      <div class="puzzle-actions">
        <button class="btn-secondary" id="puzzle-skip">Skip (+1 token)</button>
      </div>

      <div class="puzzle-result-overlay" id="puzzle-result" style="display: none;">
        <div class="puzzle-result">
          <h3 id="puzzle-result-title"></h3>
          <p id="puzzle-result-text"></p>
          <button class="btn-primary" id="puzzle-done">Continue</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  puzzleOverlayElement = overlay;

  // Render the initial grid
  renderPuzzleGrid();

  // Set up event listeners
  document.getElementById('puzzle-skip')?.addEventListener('click', () => {
    closePuzzle(1);
  });
}

function renderPuzzleGrid() {
  if (!puzzleState) return;

  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;

  // Show rows 6-11 (6 rows for compact fit)
  const startRow = 6;
  const visibleRows = puzzleState.grid.slice(startRow);

  const html = visibleRows.map((row, displayRowIdx) => {
    const actualRowIdx = displayRowIdx + startRow;
    return row.map((panel, colIdx) => {
      const isSelected = puzzleState!.selected?.row === actualRowIdx && puzzleState!.selected?.col === colIdx;
      if (!panel) {
        return `<div class="puzzle-cell empty" data-row="${actualRowIdx}" data-col="${colIdx}"></div>`;
      }
      const bonusIndicator = panel.bonus ? `<span class="bonus-indicator">${BONUS_SYMBOLS[panel.bonus]}</span>` : '';
      const classes = [
        'puzzle-cell',
        panel.type,
        panel.bonus ? 'has-bonus' : '',
        isSelected ? 'selected' : '',
      ].filter(Boolean).join(' ');

      return `<div class="${classes}" data-row="${actualRowIdx}" data-col="${colIdx}" data-id="${panel.id}">${PANEL_SYMBOLS[panel.type]}${bonusIndicator}</div>`;
    }).join('');
  }).join('');

  gridEl.innerHTML = html;

  // Use event delegation for better performance
  gridEl.onclick = handleGridClick;

  // Update displays
  updatePuzzleScoreDisplay();
}

function handleGridClick(e: Event) {
  const target = e.target as HTMLElement;
  const cell = target.closest('.puzzle-cell') as HTMLElement;
  if (!cell || !puzzleState || isProcessingMatches) return;

  const row = parseInt(cell.dataset.row!);
  const col = parseInt(cell.dataset.col!);

  // Can't interact with empty cells unless swapping into them
  if (cell.classList.contains('empty') && !puzzleState.selected) return;

  if (puzzleState.selected) {
    const { row: selRow, col: selCol } = puzzleState.selected;

    // Clicking same cell deselects
    if (selRow === row && selCol === col) {
      puzzleState = { ...puzzleState, selected: null };
      updateCellSelection(null);
      return;
    }

    // Check adjacency
    const rowDiff = Math.abs(selRow - row);
    const colDiff = Math.abs(selCol - col);
    const isAdj = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

    if (isAdj) {
      const result = trySwap(puzzleState, row, col);

      if (result.swapped) {
        isProcessingMatches = true;
        puzzleState = result.state;
        renderPuzzleGrid();
        highlightSwappedCells(selRow, selCol, row, col);
        setTimeout(() => processPuzzleStep(), SWAP_DURATION);
      } else {
        // Invalid swap feedback
        animateInvalidSwap(selRow, selCol, row, col);
        puzzleState = { ...puzzleState, selected: null };
        updateCellSelection(null);
      }
    } else {
      // Select new cell
      puzzleState = selectPanel(puzzleState, row, col);
      updateCellSelection({ row, col });
    }
  } else {
    // No selection - select this panel if not empty
    if (!cell.classList.contains('empty')) {
      puzzleState = selectPanel(puzzleState, row, col);
      updateCellSelection({ row, col });
    }
  }
}

function updateCellSelection(selected: { row: number; col: number } | null) {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;

  // Remove all selections
  gridEl.querySelectorAll('.puzzle-cell.selected').forEach(cell => {
    cell.classList.remove('selected');
  });

  // Add new selection
  if (selected) {
    const cell = gridEl.querySelector(`[data-row="${selected.row}"][data-col="${selected.col}"]`);
    cell?.classList.add('selected');
  }
}

function showHint() {
  if (!puzzleState) return;

  const hint = findValidMove(puzzleState);
  if (!hint) return;

  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;

  // Only show hint for visible rows (6-11)
  if (hint.from.row < 6 || hint.to.row < 6) return;

  const cell1 = gridEl.querySelector(`[data-row="${hint.from.row}"][data-col="${hint.from.col}"]`) as HTMLElement;
  const cell2 = gridEl.querySelector(`[data-row="${hint.to.row}"][data-col="${hint.to.col}"]`) as HTMLElement;

  // Add hint animation
  cell1?.classList.add('hint');
  cell2?.classList.add('hint');

  // Remove hint after a few seconds
  setTimeout(() => {
    cell1?.classList.remove('hint');
    cell2?.classList.remove('hint');
  }, 2000);
}

function clearHint() {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;
  gridEl.querySelectorAll('.puzzle-cell.hint').forEach(cell => {
    cell.classList.remove('hint');
  });
}

function highlightSwappedCells(row1: number, col1: number, row2: number, col2: number) {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;

  const cell1 = gridEl.querySelector(`[data-row="${row1}"][data-col="${col1}"]`) as HTMLElement;
  const cell2 = gridEl.querySelector(`[data-row="${row2}"][data-col="${col2}"]`) as HTMLElement;

  // Add a brief highlight to show the swap happened
  cell1?.classList.add('just-swapped');
  cell2?.classList.add('just-swapped');

  setTimeout(() => {
    cell1?.classList.remove('just-swapped');
    cell2?.classList.remove('just-swapped');
  }, SWAP_DURATION);
}

function animateSwap(row1: number, col1: number, row2: number, col2: number, onComplete: () => void) {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) {
    onComplete();
    return;
  }

  const cell1 = gridEl.querySelector(`[data-row="${row1}"][data-col="${col1}"]`) as HTMLElement;
  const cell2 = gridEl.querySelector(`[data-row="${row2}"][data-col="${col2}"]`) as HTMLElement;

  if (!cell1 && !cell2) {
    onComplete();
    return;
  }

  // Remove selection styling during swap
  cell1?.classList.remove('selected');
  cell2?.classList.remove('selected');

  // Determine swap direction and animate
  const isHorizontal = row1 === row2;
  let class1 = '';
  let class2 = '';

  if (isHorizontal) {
    if (col1 < col2) {
      class1 = 'swapping-right';
      class2 = 'swapping-left';
    } else {
      class1 = 'swapping-left';
      class2 = 'swapping-right';
    }
  } else {
    if (row1 < row2) {
      class1 = 'swapping-down';
      class2 = 'swapping-up';
    } else {
      class1 = 'swapping-up';
      class2 = 'swapping-down';
    }
  }

  cell1?.classList.add(class1);
  cell2?.classList.add(class2);

  setTimeout(() => {
    cell1?.classList.remove(class1);
    cell2?.classList.remove(class2);
    onComplete();
  }, SWAP_DURATION);
}

function animateInvalidSwap(row1: number, col1: number, row2: number, col2: number) {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) return;

  const cell1 = gridEl.querySelector(`[data-row="${row1}"][data-col="${col1}"]`) as HTMLElement;
  const cell2 = gridEl.querySelector(`[data-row="${row2}"][data-col="${col2}"]`) as HTMLElement;

  cell1?.classList.remove('selected');
  cell1?.classList.add('invalid-swap');
  cell2?.classList.add('invalid-swap');

  setTimeout(() => {
    cell1?.classList.remove('invalid-swap');
    cell2?.classList.remove('invalid-swap');
  }, 400);
}

function updatePuzzleTimerDisplay() {
  if (!puzzleState) return;

  const timeEl = document.getElementById('puzzle-time');
  const timeBarEl = document.getElementById('puzzle-time-bar');

  if (timeEl) {
    const time = Math.ceil(puzzleState.timeRemaining);
    timeEl.textContent = `${time}s`;

    // Add urgency class when low on time
    if (time <= 10) {
      timeEl.classList.add('low');
    } else {
      timeEl.classList.remove('low');
    }
  }

  if (timeBarEl) {
    const timePercent = (puzzleState.timeRemaining / 45) * 100;
    timeBarEl.style.width = `${Math.max(0, timePercent)}%`;
  }
}

function updatePuzzleScoreDisplay() {
  if (!puzzleState) return;

  const scoreEl = document.getElementById('puzzle-score');
  const comboEl = document.getElementById('puzzle-combo');
  const scoreBarEl = document.getElementById('puzzle-score-bar');

  if (scoreEl) {
    scoreEl.textContent = `${puzzleState.score}`;

    // Animate score change
    if (puzzleState.score > previousScore) {
      scoreEl.style.transform = 'scale(1.2)';
      setTimeout(() => {
        if (scoreEl) scoreEl.style.transform = 'scale(1)';
      }, 150);
      previousScore = puzzleState.score;
    }
  }

  if (comboEl) {
    if (puzzleState.combo > 1) {
      comboEl.textContent = `x${puzzleState.combo}`;
      comboEl.classList.add('active');
      setTimeout(() => comboEl.classList.remove('active'), 300);
    } else {
      comboEl.textContent = '-';
    }
  }

  if (scoreBarEl) {
    const progressPercent = Math.min(100, (puzzleState.score / puzzleState.targetScore) * 100);
    scoreBarEl.style.width = `${progressPercent}%`;
  }
}

function showScorePopup(score: number, x: number, y: number) {
  const gameArea = document.getElementById('puzzle-game-area');
  if (!gameArea) return;

  const popup = document.createElement('div');
  popup.className = 'puzzle-score-popup';
  popup.textContent = `+${score}`;
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  gameArea.appendChild(popup);

  setTimeout(() => popup.remove(), 800);
}

function showComboIndicator(combo: number) {
  if (combo < 2) return;

  const gameArea = document.getElementById('puzzle-game-area');
  if (!gameArea) return;

  const indicator = document.createElement('div');
  indicator.className = 'puzzle-combo-indicator';
  indicator.textContent = `${combo}x COMBO!`;
  gameArea.appendChild(indicator);

  setTimeout(() => indicator.remove(), 600);
}

function showPuzzleGameOver() {
  if (!puzzleState) return;

  const won = isGameWon(puzzleState);
  const resultEl = document.getElementById('puzzle-result');
  const titleEl = document.getElementById('puzzle-result-title');
  const textEl = document.getElementById('puzzle-result-text');
  const doneBtn = document.getElementById('puzzle-done');

  if (resultEl) {
    resultEl.style.display = 'flex';
    resultEl.className = `puzzle-result-overlay ${won ? 'won' : 'lost'}`;
  }

  if (titleEl) {
    titleEl.textContent = won ? 'Case Cracked!' : "Time's Up!";
  }

  if (textEl) {
    const tokensEarned = won ? 3 : (puzzleState.score >= puzzleState.targetScore / 2 ? 2 : 1);
    textEl.textContent = won
      ? `Excellent detective work! Score: ${puzzleState.score}. You earned ${tokensEarned} search tokens.`
      : puzzleState.score > 0
        ? `Score: ${puzzleState.score}/${puzzleState.targetScore}. You earned ${tokensEarned} search token${tokensEarned > 1 ? 's' : ''}.`
        : 'No matches found. You earned 1 search token.';
  }

  if (doneBtn) {
    doneBtn.onclick = () => {
      const tokensEarned = won ? 3 : (puzzleState && puzzleState.score >= puzzleState.targetScore / 2 ? 2 : 1);
      closePuzzle(tokensEarned);
    };
  }
}

function closePuzzle(tokensEarned: number) {
  if (puzzleAnimationFrame) {
    cancelAnimationFrame(puzzleAnimationFrame);
    puzzleAnimationFrame = null;
  }
  if (puzzleTimerInterval) {
    clearInterval(puzzleTimerInterval);
    puzzleTimerInterval = null;
  }
  puzzleOverlayElement?.remove();
  puzzleOverlayElement = null;
  console.log('[PUZZLE] Closing puzzle, tokens earned:', tokensEarned, 'callback exists:', !!puzzleCallback);
  if (puzzleCallback) {
    puzzleCallback(tokensEarned);
  }
  puzzleState = null;
  puzzleCallback = null;
  isProcessingMatches = false;
}

function processPuzzleStep() {
  if (!puzzleState) {
    isProcessingMatches = false;
    return;
  }

  const matches = findMatches(puzzleState.grid);
  if (matches.length > 0) {
    // Reset hint timer when matches are found
    lastMatchTime = performance.now();
    hintShown = false;
    clearHint();

    // Animate clearing
    animateClearing(matches, () => {
      if (!puzzleState) {
        isProcessingMatches = false;
        return;
      }

      const oldScore = puzzleState.score;
      puzzleState = processMatches(puzzleState);
      const scoreGained = puzzleState.score - oldScore;

      // Show score popup at center of grid
      if (scoreGained > 0) {
        showScorePopup(scoreGained, 150, 100);
      }

      // Show combo indicator
      if (puzzleState.combo > 1) {
        showComboIndicator(puzzleState.combo);
      }

      // Check for win
      if (isGameWon(puzzleState)) {
        puzzleState = { ...puzzleState, isGameOver: true };
        isProcessingMatches = false;
        renderPuzzleGrid();
        setTimeout(() => showPuzzleGameOver(), 500);
        return;
      }

      // Track positions before gravity
      const beforeGravity = puzzleState.grid.map(row => row.map(cell => !!cell));
      puzzleState = applyGravity(puzzleState);

      // Animate falling
      animateFalling(beforeGravity, () => {
        renderPuzzleGrid();
        // Check for cascades
        setTimeout(() => processPuzzleStep(), CASCADE_DELAY);
      });
    });
  } else {
    // No more matches
    puzzleState = { ...puzzleState, combo: 0, isAnimating: false };
    isProcessingMatches = false;
    renderPuzzleGrid();
  }
}

function animateClearing(matches: Array<{ positions: Array<{ row: number; col: number }> }>, onComplete: () => void) {
  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) {
    onComplete();
    return;
  }

  const clearingCells: HTMLElement[] = [];

  matches.forEach(match => {
    match.positions.forEach(({ row, col }) => {
      const cell = gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
      if (cell) {
        cell.classList.add('clearing');
        clearingCells.push(cell);
      }
    });
  });

  setTimeout(() => {
    // Clean up clearing classes before callback
    clearingCells.forEach(cell => cell.classList.remove('clearing'));
    onComplete();
  }, CLEAR_DURATION);
}

function animateFalling(beforeGravity: boolean[][], onComplete: () => void) {
  if (!puzzleState) {
    onComplete();
    return;
  }

  // Render new state first
  renderPuzzleGrid();

  const gridEl = document.getElementById('puzzle-grid');
  if (!gridEl) {
    onComplete();
    return;
  }

  // Add falling animation to cells that moved
  const fallingCells: HTMLElement[] = [];
  const afterGravity = puzzleState.grid;

  for (let row = 0; row < afterGravity.length; row++) {
    for (let col = 0; col < afterGravity[row].length; col++) {
      if (afterGravity[row][col] && !beforeGravity[row][col]) {
        const cell = gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`) as HTMLElement;
        if (cell) {
          cell.classList.add('falling');
          fallingCells.push(cell);
        }
      }
    }
  }

  setTimeout(() => {
    // Clean up falling classes
    fallingCells.forEach(cell => cell.classList.remove('falling'));
    onComplete();
  }, fallingCells.length > 0 ? FALL_DURATION : 50);
}

// Main render function
function render() {
  const state = store.getState();
  const app = document.getElementById('app');
  if (!app) return;

  // Update music based on game phase
  switch (state.phase) {
    case 'intro':
      audioManager.stopMusic();
      renderIntro(app);
      break;
    case 'investigation':
      if (state.interrogation) {
        audioManager.playMusic('interrogation');
        renderInterrogation(app);
      } else {
        audioManager.playMusic('investigation');
        renderInvestigation(app);
      }
      break;
    case 'accusation':
      audioManager.playMusic('tension');
      renderAccusation(app);
      break;
    case 'resolution':
      audioManager.playMusic(state.result?.won ? 'victory' : 'defeat');
      renderResolution(app);
      break;
  }
}

// Subscribe to state changes
store.subscribe(render);

// Initial render
render();

// --- KEYBOARD SHORTCUTS ---
document.addEventListener('keydown', (e) => {
  const state = store.getState();

  // Global shortcuts
  if (e.key === 'm' || e.key === 'M') {
    audioManager.toggleMusic();
    audioManager.toggleSfx();
    render();
    return;
  }

  // Phase-specific shortcuts
  switch (state.phase) {
    case 'intro':
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        store.dispatch(gameActions.startGame());
      }
      break;

    case 'investigation':
      if (state.interrogation) {
        // Interrogation shortcuts
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          store.dispatch(gameActions.previousStatement());
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          store.dispatch(gameActions.nextStatement());
        } else if (e.key === 'p' || e.key === 'P') {
          // Press
          const pressBtn = document.getElementById('press-btn') as HTMLButtonElement;
          if (pressBtn && !pressBtn.disabled) {
            pressBtn.click();
          }
        } else if (e.key === 'e' || e.key === 'E') {
          // Present Evidence
          const presentBtn = document.getElementById('present-btn') as HTMLButtonElement;
          if (presentBtn && !presentBtn.disabled) {
            presentBtn.click();
          }
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          // Check if evidence drawer is open
          const drawer = document.getElementById('evidence-drawer');
          if (drawer && !drawer.classList.contains('hidden')) {
            drawer.classList.add('hidden');
          } else {
            store.dispatch(gameActions.endInterrogation());
          }
        } else if (e.key >= '1' && e.key <= '9') {
          // Quick select evidence by number
          const drawer = document.getElementById('evidence-drawer');
          if (drawer && !drawer.classList.contains('hidden')) {
            const cards = drawer.querySelectorAll('.evidence-select-card');
            const index = parseInt(e.key) - 1;
            if (cards[index]) {
              (cards[index] as HTMLElement).click();
            }
          }
        }
      } else {
        // Investigation shortcuts
        if (e.key === '1') {
          document.querySelector('[data-tab="suspects"]')?.dispatchEvent(new Event('click'));
        } else if (e.key === '2') {
          document.querySelector('[data-tab="evidence"]')?.dispatchEvent(new Event('click'));
        } else if (e.key === '3') {
          document.querySelector('[data-tab="locations"]')?.dispatchEvent(new Event('click'));
        } else if (e.key === 's' || e.key === 'S') {
          // Search area
          document.getElementById('search-btn')?.click();
        } else if (e.key === 'Enter') {
          // Make accusation
          const accuseBtn = document.getElementById('accuse-btn') as HTMLButtonElement;
          if (accuseBtn && !accuseBtn.disabled) {
            accuseBtn.click();
          }
        }
      }
      break;

    case 'accusation':
      if (e.key === 'Escape') {
        store.dispatch(gameActions.cancelAccusation());
      }
      break;

    case 'resolution':
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        document.getElementById('new-mystery-btn')?.click();
      } else if (e.key === 'r' || e.key === 'R') {
        document.getElementById('replay-btn')?.click();
      }
      break;
  }
});

// --- RENDER FUNCTIONS ---

function renderIntro(app: HTMLElement) {
  const victim = getVictim(generatedCase)!;
  const crimeScene = generatedCase.locations.find(l => l.id === generatedCase.crimeScene);

  app.innerHTML = `
    <div class="intro-screen">
      <header class="header">
        <h1>Black Rabbit</h1>
        <p class="subtitle">A Murder Most Foul</p>
      </header>

      <main class="intro-content">
        <div class="newspaper">
          <h2 class="headline">TRAGEDY STRIKES</h2>
          <div class="newspaper-body">
            <p class="lead">
              <strong>${getFullName(victim)}</strong>, ${victim.age}, a respected ${victim.occupation.toLowerCase()},
              was found dead in the ${crimeScene?.name || 'manor'} this evening.
            </p>
            <p>${victim.description}</p>
            <p>
              The death occurred around <strong>${generatedCase.timeOfDeath.label}</strong>.
              Police suspect foul play.
            </p>
            <p class="quote">
              "One of the guests must be responsible," says the inspector.
              "No one leaves until we find the truth."
            </p>
          </div>
        </div>

        <div class="case-info">
          <p>Case File: <code>${seed.slice(-8).toUpperCase()}</code></p>
          <p>${getSuspects(generatedCase).length} suspects to interrogate</p>
        </div>

        <div class="intro-buttons">
          <button class="btn-primary" id="start-btn">Begin Investigation</button>
          ${hasSavedGame() ? `<button class="btn-secondary" id="new-game-btn">New Mystery</button>` : ''}
        </div>
      </main>
    </div>
  `;

  document.getElementById('start-btn')?.addEventListener('click', () => {
    store.dispatch(gameActions.startGame());
  });

  document.getElementById('new-game-btn')?.addEventListener('click', () => {
    clearSave();
    window.location.href = `?seed=mystery-${Date.now()}`;
  });
}

function renderInvestigation(app: HTMLElement) {
  const state = store.getState();
  const suspects = getSuspects(generatedCase);
  const discoveredClues = Array.from(state.playerKnowledge.discoveredClues);
  const allClues = generatedCase.clues;

  // Clues at current location that haven't been discovered yet
  const currentLocationClues = allClues.filter(
    c => c.foundAt === state.currentLocation && !state.playerKnowledge.discoveredClues.has(c.id)
  );

  app.innerHTML = `
    <div class="investigation-screen">
      <header class="game-header">
        <h1>Black Rabbit</h1>
        <div class="header-stats">
          <span class="stat">Evidence: ${discoveredClues.length}/${allClues.length}</span>
          <span class="stat">Mistakes: ${state.mistakeCount}/${state.maxMistakes}</span>
          <span class="stat search-tokens" title="Search tokens - play mini-game to earn more">
            <span class="search-tokens-icon">🔍</span>
            <span class="search-tokens-count">${state.searchTokens}</span>
          </span>
          <button class="btn-audio" id="toggle-audio" title="Toggle Sound">
            ${audioManager.isSfxEnabled() ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <nav class="game-nav">
        <button class="nav-btn active" data-tab="suspects">Suspects</button>
        <button class="nav-btn" data-tab="evidence">Evidence</button>
        <button class="nav-btn" data-tab="locations">Locations</button>
      </nav>

      <main class="game-main">
        <section class="tab-content" id="suspects-tab">
          <h2>Suspects</h2>
          <div class="suspect-grid">
            ${suspects.map(suspect => renderSuspectCard(suspect, state)).join('')}
          </div>
        </section>

        <section class="tab-content hidden" id="evidence-tab">
          <h2>Collected Evidence</h2>
          ${discoveredClues.length === 0
            ? '<p class="empty-state">No evidence collected yet. Search the locations!</p>'
            : `<div class="evidence-grid">
                ${discoveredClues.map(clueId => {
                  const clue = allClues.find(c => c.id === clueId);
                  return clue ? renderEvidenceCard(clue) : '';
                }).join('')}
              </div>`
          }
        </section>

        <section class="tab-content hidden" id="locations-tab">
          <h2>Locations</h2>
          <div class="location-grid">
            ${generatedCase.locations.map(location => `
              <div class="card location-card ${location.id === state.currentLocation ? 'current' : ''}"
                   data-location="${location.id}">
                <h3>${location.name}</h3>
                <p>${location.description}</p>
                ${location.isCrimeScene ? '<span class="badge crime-scene-badge">Crime Scene</span>' : ''}
                ${state.playerKnowledge.examinedLocations.has(location.id)
                  ? '<span class="badge examined-badge">Searched</span>'
                  : ''}
              </div>
            `).join('')}
          </div>
        </section>
      </main>

      ${currentLocationClues.length > 0 ? `
        <div class="discovery-prompt">
          <p>You notice something in the ${generatedCase.locations.find(l => l.id === state.currentLocation)?.name}...</p>
          ${state.searchTokens > 0
            ? `<button class="btn-secondary" id="search-btn">Search Area (🔍 ${state.searchTokens})</button>`
            : `<button class="btn-primary" id="earn-tokens-btn">Play Mini-Game to Search</button>`
          }
        </div>
      ` : `
        <div class="discovery-prompt" style="border-top-color: var(--smoke-gray);">
          <p>No more evidence at this location.</p>
          <button class="btn-secondary" id="earn-tokens-btn">Play Mini-Game (🔍 +tokens)</button>
        </div>
      `}

      <footer class="game-footer">
        <button class="btn-accuse" id="accuse-btn" ${discoveredClues.length < 3 ? 'disabled' : ''}>
          Make Accusation
        </button>
      </footer>
    </div>
  `;

  // Tab switching
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tab = target.dataset.tab;

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      document.getElementById(`${tab}-tab`)?.classList.remove('hidden');
    });
  });

  // Suspect interrogation
  document.querySelectorAll('.suspect-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const suspectId = (e.currentTarget as HTMLElement).dataset.suspect as SuspectId;
      store.dispatch(gameActions.startInterrogation(suspectId));
    });
  });

  // Location examination
  document.querySelectorAll('.location-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const locationId = (e.currentTarget as HTMLElement).dataset.location;
      if (locationId) {
        store.dispatch(gameActions.examineLocation(locationId as any));
      }
    });
  });

  // Search for clues (costs a search token)
  document.getElementById('search-btn')?.addEventListener('click', () => {
    const currentState = store.getState();
    if (currentLocationClues.length > 0 && currentState.searchTokens > 0) {
      store.dispatch(gameActions.spendSearchToken());
      const clue = currentLocationClues[0];
      store.dispatch(gameActions.discoverClue(clue.id));
      showClueDiscovery(clue);
    }
  });

  // Earn tokens via mini-game
  document.getElementById('earn-tokens-btn')?.addEventListener('click', () => {
    showPanelPuzzle((tokensEarned) => {
      store.dispatch(gameActions.addSearchTokens(tokensEarned));
      render();
    });
  });

  // Accusation
  document.getElementById('accuse-btn')?.addEventListener('click', () => {
    store.dispatch(gameActions.startAccusation());
  });

  // Audio toggle
  document.getElementById('toggle-audio')?.addEventListener('click', () => {
    audioManager.toggleSfx();
    audioManager.toggleMusic();
    render();
  });
}

function renderSuspectCard(suspect: Suspect, state: ReturnType<typeof store.getState>): string {
  const hasInterrogated = state.playerKnowledge.interrogatedSuspects.has(suspect.id);

  return `
    <div class="card suspect-card" data-suspect="${suspect.id}">
      <h3>${getFullName(suspect)}</h3>
      <p class="occupation">${suspect.occupation}, ${suspect.age}</p>
      <p class="description">${suspect.description}</p>
      ${hasInterrogated ? '<span class="badge interrogated-badge">Questioned</span>' : ''}
      <div class="card-action">
        <span class="interrogate-hint">Click to interrogate</span>
      </div>
    </div>
  `;
}

function renderEvidenceCard(clue: Clue): string {
  const location = generatedCase.locations.find(l => l.id === clue.foundAt);
  const pointsToSuspect = clue.pointsTo
    ? generatedCase.suspects.find(s => s.id === clue.pointsTo)
    : null;

  const significanceClass = clue.significance === 'critical' ? 'evidence-critical'
    : clue.significance === 'minor' ? 'evidence-minor'
    : '';

  return `
    <div class="card evidence-card ${significanceClass}" data-clue-id="${clue.id}">
      <div class="evidence-header">
        <h4>${clue.name}</h4>
        ${clue.significance === 'critical' ? '<span class="badge critical-badge">Key Evidence</span>' : ''}
      </div>
      <p class="evidence-type">${clue.type} evidence</p>
      <p class="evidence-description">${clue.description}</p>
      <div class="evidence-meta">
        <span class="evidence-location">Found: ${location?.name || 'Unknown'}</span>
        ${pointsToSuspect ? `<span class="evidence-implicates">Implicates: ${pointsToSuspect.firstName} ${pointsToSuspect.lastName}</span>` : ''}
      </div>
    </div>
  `;
}

function showClueDiscovery(clue: Clue) {
  audioManager.playSfx('clue_found');
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal clue-discovery-modal">
      <h2>Evidence Discovered!</h2>
      <div class="discovered-clue">
        <h3>${clue.name}</h3>
        <p class="evidence-type">${clue.type} evidence • ${clue.significance}</p>
        <p>${clue.description}</p>
      </div>
      <button class="btn-primary" id="close-modal">Add to Evidence</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('close-modal')?.addEventListener('click', () => {
    modal.remove();
    render();
  });
}

function renderInterrogation(app: HTMLElement) {
  const state = store.getState();
  if (!state.interrogation) return;

  const suspect = generatedCase.suspects.find(s => s.id === state.interrogation!.suspectId)!;
  const testimony = testimonies.get(suspect.id)!;
  const currentIndex = state.interrogation.currentStatementIndex;
  const statement = testimony.statements[Math.min(currentIndex, testimony.statements.length - 1)];
  const isPressing = state.interrogation.pressedStatements.has(currentIndex);
  const hasContradicted = state.playerKnowledge.revealedContradictions.has(statement.id);
  const discoveredClues = Array.from(state.playerKnowledge.discoveredClues)
    .map(id => generatedCase.clues.find(c => c.id === id))
    .filter(Boolean) as Clue[];

  // Determine character expression
  let expression = '';
  if (hasContradicted) {
    expression = 'caught';
  } else if (statement.isLie && isPressing) {
    expression = 'nervous';
  } else if (isPressing) {
    expression = 'defensive';
  }

  app.innerHTML = `
    <div class="interrogation-screen">
      <header class="interrogation-header">
        <button class="btn-back" id="end-interrogation">← Back</button>
        <h2>Interrogating ${getFullName(suspect)}</h2>
        <span class="mistakes">Mistakes: ${state.mistakeCount}/${state.maxMistakes}</span>
      </header>

      <main class="interrogation-main">
        <div class="suspect-portrait">
          <div class="portrait-placeholder ${expression}">
            ${suspect.firstName[0]}${suspect.lastName[0]}
          </div>
          <p class="suspect-name">${getFullName(suspect)}</p>
          <p class="suspect-role">${suspect.occupation}</p>
        </div>

        <div class="testimony-box">
          <div class="statement-counter">
            Statement ${currentIndex + 1} of ${testimony.statements.length}
          </div>

          <div class="statement ${hasContradicted ? 'contradicted' : ''}">
            <p class="statement-text">
              "${isPressing ? statement.pressResponse : (hasContradicted && statement.truthReveal ? statement.truthReveal : statement.text)}"
            </p>
            ${hasContradicted ? '<span class="contradiction-found">CONTRADICTION FOUND!</span>' : ''}
          </div>

          <div class="testimony-actions">
            <button class="btn-action" id="press-btn" ${isPressing || hasContradicted ? 'disabled' : ''}>
              Press
            </button>
            <button class="btn-action btn-present" id="present-btn" ${hasContradicted ? 'disabled' : ''}>
              Present Evidence
            </button>
          </div>

          <div class="statement-nav">
            <button class="btn-nav" id="prev-stmt" ${currentIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button class="btn-nav" id="next-stmt" ${currentIndex >= testimony.statements.length - 1 ? 'disabled' : ''}>
              Next →
            </button>
          </div>
        </div>
      </main>

      <div class="evidence-drawer hidden" id="evidence-drawer">
        <h3>Select Evidence to Present</h3>
        <div class="evidence-select-grid">
          ${discoveredClues.map((clue, i) => {
            const location = generatedCase.locations.find(l => l.id === clue.foundAt);
            const pointsTo = clue.pointsTo
              ? generatedCase.suspects.find(s => s.id === clue.pointsTo)
              : null;
            const significanceClass = clue.significance === 'critical' ? 'evidence-select-critical' : '';
            return `
              <div class="evidence-select-card ${significanceClass}" data-clue="${clue.id}">
                <span class="evidence-number">${i + 1}</span>
                <h4>${clue.name}</h4>
                <p class="evidence-select-type">${clue.type} evidence</p>
                <p class="evidence-select-location">Found: ${location?.name || 'Unknown'}</p>
                ${pointsTo ? `<p class="evidence-select-implicates">→ ${pointsTo.firstName} ${pointsTo.lastName}</p>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn-secondary" id="cancel-present">Cancel <kbd>Esc</kbd></button>
      </div>

      <footer class="keyboard-hints">
        <span><kbd>←</kbd><kbd>→</kbd> Navigate</span>
        <span><kbd>P</kbd> Press</span>
        <span><kbd>E</kbd> Evidence</span>
        <span><kbd>Esc</kbd> Back</span>
        <span><kbd>M</kbd> Mute</span>
      </footer>
    </div>
  `;

  // Event listeners
  document.getElementById('end-interrogation')?.addEventListener('click', () => {
    store.dispatch(gameActions.endInterrogation());
  });

  document.getElementById('press-btn')?.addEventListener('click', () => {
    showHoldIt();
    setTimeout(() => {
      store.dispatch(gameActions.pressStatement());
    }, 800);
  });

  document.getElementById('present-btn')?.addEventListener('click', () => {
    document.getElementById('evidence-drawer')?.classList.remove('hidden');
  });

  document.getElementById('cancel-present')?.addEventListener('click', () => {
    document.getElementById('evidence-drawer')?.classList.add('hidden');
  });

  document.getElementById('prev-stmt')?.addEventListener('click', () => {
    store.dispatch(gameActions.previousStatement());
  });

  document.getElementById('next-stmt')?.addEventListener('click', () => {
    store.dispatch(gameActions.nextStatement());
  });

  // Evidence selection
  document.querySelectorAll('.evidence-select-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const clueId = (e.currentTarget as HTMLElement).dataset.clue;
      if (clueId) {
        // Show OBJECTION! first
        showObjection();

        // Delay the actual action for dramatic effect
        setTimeout(() => {
          store.dispatch(gameActions.presentEvidence(clueId as any, statement));
          document.getElementById('evidence-drawer')?.classList.add('hidden');

          // Check if it was correct
          const newState = store.getState();
          if (newState.playerKnowledge.revealedContradictions.has(statement.id)) {
            // Correct! Show celebration
            showContradictionCelebration();
          } else {
            showWrongEvidence();
          }
        }, 1400);
      }
    });
  });
}

function showWrongEvidence() {
  audioManager.playSfx('wrong');
  const flash = document.createElement('div');
  flash.className = 'wrong-flash';
  flash.innerHTML = '<span>OBJECTION OVERRULED!</span>';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1500);
}

function showObjection() {
  audioManager.playSfx('objection');
  const flash = document.createElement('div');
  flash.className = 'objection-flash';
  flash.innerHTML = '<span class="objection-text">OBJECTION!</span>';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1500);
}

function showHoldIt() {
  audioManager.playSfx('holdit');
  const flash = document.createElement('div');
  flash.className = 'holdit-flash';
  flash.innerHTML = '<span class="holdit-text">HOLD IT!</span>';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1100);
}

function showContradictionCelebration() {
  audioManager.playSfx('contradiction');
  const celebration = document.createElement('div');
  celebration.className = 'contradiction-celebration';
  document.body.appendChild(celebration);
  setTimeout(() => celebration.remove(), 1000);
}

function renderAccusation(app: HTMLElement) {
  const state = store.getState();
  const suspects = getSuspects(generatedCase);
  const discoveredClues = Array.from(state.playerKnowledge.discoveredClues)
    .map(id => generatedCase.clues.find(c => c.id === id))
    .filter(Boolean) as Clue[];

  app.innerHTML = `
    <div class="accusation-screen">
      <header class="header">
        <h1>Make Your Accusation</h1>
      </header>

      <main class="accusation-form">
        <div class="form-group">
          <label>The murderer is:</label>
          <div class="suspect-select">
            ${suspects.map(s => `
              <label class="radio-card">
                <input type="radio" name="accused" value="${s.id}">
                <span class="radio-card-content">
                  <strong>${getFullName(s)}</strong>
                  <span>${s.occupation}</span>
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>The motive was:</label>
          <div class="motive-select">
            ${Object.values(MotiveType).map(m => `
              <label class="radio-card">
                <input type="radio" name="motive" value="${m}">
                <span class="radio-card-content">${m}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Supporting evidence (select at least 1):</label>
          <div class="evidence-checkboxes">
            ${discoveredClues.map(c => `
              <label class="checkbox-card">
                <input type="checkbox" name="evidence" value="${c.id}">
                <span class="checkbox-card-content">
                  <strong>${c.name}</strong>
                  <span>${c.type}</span>
                </span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="accusation-actions">
          <button class="btn-secondary" id="cancel-accusation">Cancel</button>
          <button class="btn-accuse" id="confirm-accusation">Confirm Accusation</button>
        </div>
      </main>
    </div>
  `;

  document.getElementById('cancel-accusation')?.addEventListener('click', () => {
    store.dispatch(gameActions.cancelAccusation());
  });

  document.getElementById('confirm-accusation')?.addEventListener('click', () => {
    const accusedInput = document.querySelector('input[name="accused"]:checked') as HTMLInputElement;
    const motiveInput = document.querySelector('input[name="motive"]:checked') as HTMLInputElement;
    const evidenceInputs = document.querySelectorAll('input[name="evidence"]:checked');

    if (!accusedInput || !motiveInput) {
      alert('Please select a suspect and motive.');
      return;
    }

    const evidence = Array.from(evidenceInputs).map(e => (e as HTMLInputElement).value);

    store.dispatch(gameActions.setAccusation({
      accusedId: accusedInput.value as SuspectId,
      motive: motiveInput.value as MotiveType,
      supportingEvidence: evidence as any,
    }));

    store.dispatch(gameActions.confirmAccusation(testimonies));
  });
}

function renderResolution(app: HTMLElement) {
  const state = store.getState();
  const result = state.result!;
  const killer = generatedCase.suspects.find(s => s.id === result.correctKiller)!;
  const accused = generatedCase.suspects.find(s => s.id === result.playerAccused)!;

  // Clear save when game is over
  clearSave();

  app.innerHTML = `
    <div class="resolution-screen ${result.won ? 'won' : 'lost'}">
      <header class="resolution-header">
        <h1>${result.won ? 'CASE SOLVED' : 'CASE UNSOLVED'}</h1>
      </header>

      <main class="resolution-content">
        ${result.won ? `
          <div class="victory-message">
            <p class="result-text">You correctly identified the murderer!</p>
            <div class="killer-reveal">
              <h2>${getFullName(killer)}</h2>
              <p>${killer.occupation}</p>
              <p>Motive: <strong>${generatedCase.motive}</strong></p>
              <p>Weapon: <strong>${generatedCase.weapon}</strong></p>
            </div>
          </div>
        ` : `
          <div class="defeat-message">
            <p class="result-text">You accused the wrong person.</p>
            <div class="wrong-accusation">
              <p>You accused: <strong>${getFullName(accused)}</strong></p>
              <p>The real killer was: <strong>${getFullName(killer)}</strong></p>
            </div>
            <div class="killer-reveal">
              <h2>The Truth</h2>
              <p>${getFullName(killer)} committed the murder.</p>
              <p>Motive: <strong>${generatedCase.motive}</strong></p>
              <p>Weapon: <strong>${generatedCase.weapon}</strong></p>
            </div>
          </div>
        `}

        <div class="stats">
          <h3>Your Investigation</h3>
          <ul>
            <li>Evidence found: ${result.cluesFound} / ${result.totalClues}</li>
            <li>Contradictions revealed: ${result.contradictionsFound} / ${result.totalContradictions}</li>
            <li>Mistakes made: ${state.mistakeCount}</li>
          </ul>
        </div>

        <div class="resolution-actions">
          <button class="btn-primary" id="new-mystery-btn">New Mystery</button>
          <button class="btn-secondary" id="replay-btn">Replay This Case</button>
        </div>
      </main>
    </div>
  `;

  document.getElementById('new-mystery-btn')?.addEventListener('click', () => {
    clearSave();
    window.location.href = `?seed=mystery-${Date.now()}`;
  });

  document.getElementById('replay-btn')?.addEventListener('click', () => {
    clearSave();
    window.location.reload();
  });
}
