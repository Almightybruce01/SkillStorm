/* ═══════════════════════════════════════════════════════════════════════════════
   SUDOKU ELITE — Canvas-Based Logic Puzzle
   Full generator, solver, notes, themes, animations, hints, undo/redo
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
type Theme = 'classic' | 'paper' | 'dark' | 'blueprint';

interface SudokuGameProps {
  onClose: () => void;
}

const GIVEN_RANGES: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 40, max: 45 },
  medium: { min: 30, max: 39 },
  hard: { min: 22, max: 29 },
  expert: { min: 17, max: 21 },
};

function getBox(r: number, c: number): number {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

function validPlacement(grid: number[][], r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[r][i] === val || grid[i][c] === val) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (grid[br + dr][bc + dc] === val) return false;
    }
  }
  return true;
}

function solveCount(grid: number[][], maxSolutions: number): number {
  let count = 0;
  const g = grid.map((r) => [...r]);
  const order: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (g[r][c] === 0) order.push([r, c]);
    }
  }
  function backtrack(idx: number): boolean {
    if (count >= maxSolutions) return true;
    if (idx >= order.length) {
      count++;
      return count >= maxSolutions;
    }
    const [r, c] = order[idx];
    for (let n = 1; n <= 9; n++) {
      if (validPlacement(g, r, c, n)) {
        g[r][c] = n;
        if (backtrack(idx + 1)) return true;
        g[r][c] = 0;
      }
    }
    return false;
  }
  backtrack(0);
  return count;
}

function generateFullGrid(): number[][] {
  const grid = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
  const order: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) order.push([r, c]);
  }
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  function fill(idx: number): boolean {
    if (idx >= order.length) return true;
    const [r, c] = order[idx];
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    for (const n of nums) {
      if (validPlacement(grid, r, c, n)) {
        grid[r][c] = n;
        if (fill(idx + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }
  fill(0);
  return grid;
}

function createPuzzle(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = generateFullGrid();
  const puzzle = solution.map((r) => r.map((v) => v));
  const { min: target } = GIVEN_RANGES[difficulty];
  const toRemove = 81 - target;
  const cells: [number, number][] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) cells.push([r, c]);
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= toRemove) break;
    const val = puzzle[r][c];
    puzzle[r][c] = 0;
    if (solveCount(puzzle, 2) === 1) removed++;
    else puzzle[r][c] = val;
  }
  return { puzzle, solution };
}

const THEMES = {
  classic: {
    bg: '#ffffff',
    grid: '#1a1a1a',
    cellBorder: '#cccccc',
    given: '#0a0a0a',
    user: '#2563eb',
    conflict: '#dc2626',
    highlight: 'rgba(251, 191, 36, 0.4)',
    selected: 'rgba(59, 130, 246, 0.5)',
    sameNum: 'rgba(147, 51, 234, 0.25)',
  },
  paper: {
    bg: '#f5f0e6',
    grid: '#2c2416',
    cellBorder: '#8b7355',
    given: '#2c2416',
    user: '#5b4a2e',
    conflict: '#8b2500',
    highlight: 'rgba(210, 180, 140, 0.5)',
    selected: 'rgba(101, 67, 33, 0.3)',
    sameNum: 'rgba(139, 90, 43, 0.2)',
  },
  dark: {
    bg: '#1a1a2e',
    grid: '#eaeaea',
    cellBorder: '#4a4a6a',
    given: '#eaeaea',
    user: '#7dd3fc',
    conflict: '#f87171',
    highlight: 'rgba(251, 191, 36, 0.3)',
    selected: 'rgba(125, 211, 252, 0.35)',
    sameNum: 'rgba(192, 132, 252, 0.25)',
  },
  blueprint: {
    bg: '#e8f4f8',
    grid: '#0e4d6b',
    cellBorder: '#5c9ead',
    given: '#0e4d6b',
    user: '#1a6b85',
    conflict: '#c0392b',
    highlight: 'rgba(46, 204, 113, 0.25)',
    selected: 'rgba(52, 152, 219, 0.35)',
    sameNum: 'rgba(155, 89, 182, 0.2)',
  },
};

const STATS_KEY = 'sudoku_elite_stats';
const HIGHSCORE_KEY = 'sudoku_elite_highscores';
const STREAK_KEY = 'sudoku_elite_streak';

function loadStreak(): number {
  try {
    const s = localStorage.getItem(STREAK_KEY);
    if (s) return parseInt(s, 10) || 0;
  } catch {}
  return 0;
}

function saveStreak(streak: number) {
  try {
    localStorage.setItem(STREAK_KEY, String(streak));
  } catch {}
}

interface Stats {
  gamesCompleted: number;
  avgTimeByDiff: Record<Difficulty, number>;
  times: Record<Difficulty, number[]>;
}

function loadStats(): Stats {
  try {
    const s = localStorage.getItem(STATS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {
    gamesCompleted: 0,
    avgTimeByDiff: { easy: 0, medium: 0, hard: 0, expert: 0 },
    times: { easy: [], medium: [], hard: [], expert: [] },
  };
}

function saveStats(stats: Stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function loadHighscores(): Record<Difficulty, number> {
  try {
    const s = localStorage.getItem(HIGHSCORE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { easy: Infinity, medium: Infinity, hard: Infinity, expert: Infinity };
}

function saveHighscore(diff: Difficulty, time: number) {
  const h = loadHighscores();
  if (time < (h[diff] ?? Infinity)) {
    h[diff] = time;
    try {
      localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(h));
    } catch {}
    return true;
  }
  return false;
}

type HistoryEntry = { grid: number[][]; notes: Record<string, number[]> };

export default function SudokuGame({ onClose }: SudokuGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [grid, setGrid] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [given, setGiven] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, number[]>>({});
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [autoErrorCheck, setAutoErrorCheck] = useState(true);
  const [theme, setTheme] = useState<Theme>('classic');
  const [stats, setStats] = useState<Stats>(loadStats);
  const [highscores, setHighscores] = useState<Record<Difficulty, number>>(loadHighscores);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [popCell, setPopCell] = useState<[number, number] | null>(null);
  const [popTime, setPopTime] = useState(0);
  const [completionCascade, setCompletionCascade] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const [streak, setStreak] = useState(() => loadStreak());
  const timerRef = useRef<number>(0);
  const animRef = useRef<number>(0);

  const newGame = useCallback(
    (diff?: Difficulty) => {
      const d = diff ?? difficulty;
      const { puzzle, solution: sol } = createPuzzle(d);
      setGrid(puzzle.map((r) => [...r]));
      setSolution(sol);
      const g = new Set<string>();
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle[r][c] !== 0) g.add(`${r},${c}`);
        }
      }
      setGiven(g);
      setNotes({});
      setSelected(null);
      setSolved(false);
      setElapsed(0);
      setMoves(0);
      setHistory([{ grid: puzzle.map((r) => [...r]), notes: {} }]);
      setHistoryIdx(0);
      setPopCell(null);
      setCompletionCascade([]);
      setPaused(false);
      playSound('click');
    },
    [difficulty]
  );

  useEffect(() => {
    newGame();
  }, []);

  useEffect(() => {
    if (grid.length === 0 || solved || paused) return;
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [grid.length, solved, paused]);

  const isGiven = (r: number, c: number) => given.has(`${r},${c}`);
  const value = (r: number, c: number) => grid[r]?.[c] ?? 0;
  const selVal = selected ? value(selected[0], selected[1]) : 0;

  const hasConflict = useCallback(
    (r: number, c: number): boolean => {
      const v = grid[r][c];
      if (v === 0) return false;
      for (let i = 0; i < 9; i++) {
        if (i !== c && grid[r][i] === v) return true;
        if (i !== r && grid[i][c] === v) return true;
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const nr = br + dr;
          const nc = bc + dc;
          if ((nr !== r || nc !== c) && grid[nr][nc] === v) return true;
        }
      }
      return false;
    },
    [grid]
  );

  const addToHistory = useCallback((g: number[][], n: Record<string, number[]>) => {
    setHistory((h) => {
      const truncated = h.slice(0, historyIdx + 1);
      truncated.push({ grid: g.map((r) => [...r]), notes: { ...n } });
      if (truncated.length > 50) truncated.shift();
      setHistoryIdx(truncated.length - 1);
      return truncated;
    });
  }, [historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx <= 0 || solved) return;
    const prev = history[historyIdx - 1];
    setGrid(prev.grid.map((r) => [...r]));
    setNotes({ ...prev.notes });
    setHistoryIdx((i) => i - 1);
    playSound('click');
  }, [history, historyIdx, solved]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1 || solved) return;
    const next = history[historyIdx + 1];
    setGrid(next.grid.map((r) => [...r]));
    setNotes({ ...next.notes });
    setHistoryIdx((i) => i + 1);
    playSound('click');
  }, [history, historyIdx, solved]);

  const eliminateCandidates = useCallback(() => {
    const next: Record<string, number[]> = {};
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const key = `${r},${c}`;
        const current = notes[key] ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const eliminated = current.filter((n) => validPlacement(grid, r, c, n));
        if (eliminated.length > 0) next[key] = eliminated;
      }
    }
    setNotes(next);
    playSound('pop');
  }, [grid, notes]);

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (solved) return;
      setSelected([r, c]);
    },
    [solved]
  );

  const handleNumberInput = useCallback(
    (n: number) => {
      if (!selected || solved) return;
      const [r, c] = selected;
      if (isGiven(r, c)) return;

      if (pencilMode) {
        setNotes((prev) => {
          const key = `${r},${c}`;
          const arr = prev[key] ?? [];
          const idx = arr.indexOf(n);
          const next = idx >= 0 ? arr.filter((x) => x !== n) : [...arr, n].sort();
          const nextNotes = { ...prev };
          nextNotes[key] = next.length ? next : [];
          if (!nextNotes[key]?.length) delete nextNotes[key];
          return nextNotes;
        });
        playSound('tick');
        return;
      }

      const nextGrid = grid.map((row) => [...row]);
      nextGrid[r][c] = n;
      const nextNotes: Record<string, number[]> = {};
      for (const key of Object.keys(notes)) {
        if (key === `${r},${c}`) continue;
        const [nr, nc] = key.split(',').map(Number);
        const inSameUnit = nr === r || nc === c || (Math.floor(nr / 3) === Math.floor(r / 3) && Math.floor(nc / 3) === Math.floor(c / 3));
        if (inSameUnit) {
          const filtered = (notes[key] ?? []).filter((x) => x !== n);
          if (filtered.length > 0) nextNotes[key] = filtered;
        } else {
          nextNotes[key] = notes[key] ?? [];
        }
      }
      addToHistory(nextGrid, nextNotes);
      setGrid(nextGrid);
      setNotes(nextNotes);
      setMoves((m) => m + 1);
      setPopCell([r, c]);
      setPopTime(Date.now());
      playSound('pop');

      if (autoErrorCheck && hasConflict(r, c)) playSound('wrong');
      else playSound('correct');

      let complete = true;
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (nextGrid[i][j] === 0) complete = false;
        }
      }
      if (complete) {
        const correct = nextGrid.every((row, i) => row.every((v, j) => v === solution[i][j]));
        if (correct) {
          setSolved(true);
          playSound('victory');
          setStreak((s) => {
            const next = s + 1;
            saveStreak(next);
            return next;
          });
          const idxs: number[] = [];
          for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) idxs.push(rr * 9 + cc);
          setCompletionCascade(idxs);
          const st = loadStats();
          st.gamesCompleted++;
          st.times[difficulty].push(elapsed + 1);
          st.avgTimeByDiff[difficulty] =
            st.times[difficulty].reduce((a, b) => a + b, 0) / st.times[difficulty].length;
          saveStats(st);
          setStats(st);
          if (saveHighscore(difficulty, elapsed + 1)) setHighscores(loadHighscores());
        } else {
          playSound('wrong');
          setStreak(0);
          saveStreak(0);
        }
      }
    },
    [
      selected,
      solved,
      grid,
      notes,
      pencilMode,
      isGiven,
      solution,
      addToHistory,
      hasConflict,
      autoErrorCheck,
      difficulty,
      elapsed,
    ]
  );

  const handleClear = useCallback(() => {
    if (!selected || solved) return;
    const [r, c] = selected;
    if (isGiven(r, c)) return;
    const nextGrid = grid.map((row) => [...row]);
    nextGrid[r][c] = 0;
    const nextNotes = { ...notes };
    delete nextNotes[`${r},${c}`];
    addToHistory(nextGrid, nextNotes);
    setGrid(nextGrid);
    setNotes(nextNotes);
    setMoves((m) => m + 1);
    playSound('click');
  }, [selected, solved, grid, notes, isGiven, addToHistory]);

  const handleHint = useCallback(() => {
    if (solved || !solution.length) return;
    const empty: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0 && solution[r][c] !== 0) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const val = solution[r][c];
    const nextGrid = grid.map((row) => [...row]);
    nextGrid[r][c] = val;
    const nextNotes = { ...notes };
    delete nextNotes[`${r},${c}`];
    addToHistory(nextGrid, nextNotes);
    setGrid(nextGrid);
    setNotes(nextNotes);
    setSelected([r, c]);
    setPopCell([r, c]);
    setPopTime(Date.now());
    playSound('powerup');
  }, [grid, solution, notes, addToHistory, solved]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setPencilMode((p) => !p);
        playSound('click');
      }
      if (!selected) return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
      }
      if (e.key === ' ' || e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
      if (e.key === 'ArrowUp' && selected[0] > 0) {
        e.preventDefault();
        setSelected([selected[0] - 1, selected[1]]);
        playSound('tick');
      }
      if (e.key === 'ArrowDown' && selected[0] < 8) {
        e.preventDefault();
        setSelected([selected[0] + 1, selected[1]]);
        playSound('tick');
      }
      if (e.key === 'ArrowLeft' && selected[1] > 0) {
        e.preventDefault();
        setSelected([selected[0], selected[1] - 1]);
        playSound('tick');
      }
      if (e.key === 'ArrowRight' && selected[1] < 8) {
        e.preventDefault();
        setSelected([selected[0], selected[1] + 1]);
        playSound('tick');
      }
    },
    [selected, handleNumberInput, handleClear]
  );

  const numberCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) =>
    grid.flat().filter((v) => v === n).length
  );

  const isSolvable = useCallback((): boolean => {
    return solveCount(grid, 1) >= 1;
  }, [grid]);

  const getCellAt = (x: number, y: number, size: number): [number, number] | null => {
    const padding = size * 0.08;
    const gridW = size - padding * 2;
    const relX = (x - padding) / gridW;
    const relY = (y - padding) / gridW;
    if (relX < 0 || relY < 0 || relX >= 1 || relY >= 1) return null;
    const c = Math.min(8, Math.floor(relX * 9));
    const r = Math.min(8, Math.floor(relY * 9));
    return [r, c];
  };

  const getCoordsFromEvent = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const x = (clientX - rect.left) * scale;
      const y = (clientY - rect.top) * scale;
      const cell = getCellAt(x, y, canvas.width);
      return cell;
    },
    []
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCoordsFromEvent(e.clientX, e.clientY);
    if (cell) handleCellClick(cell[0], cell[1]);
  };

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const cell = getCoordsFromEvent(touch.clientX, touch.clientY);
      if (cell) handleCellClick(cell[0], cell[1]);
    },
    [getCoordsFromEvent, handleCellClick]
  );

  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(420, window.innerWidth * 0.85);
    canvas.width = size;
    canvas.height = size;
    const padding = size * 0.08;
    const gridW = size - padding * 2;
    const cellSz = gridW / 9;
    const t = THEMES[theme];

    const loop = () => {
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, size, size);

      const popElapsed = popCell ? (Date.now() - popTime) / 200 : 1;
      const popScale = popElapsed < 1 ? 0.7 + 0.3 * Math.sin(popElapsed * Math.PI) : 1;

      const cascadeProgress = completionCascade.length > 0 ? (Date.now() % 3000) / 80 : 999;
      const litCells = new Set(completionCascade.slice(0, Math.min(81, Math.floor(cascadeProgress))));

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const x = padding + c * cellSz;
          const y = padding + r * cellSz;
          const key = `${r},${c}`;
          const val = value(r, c);
          const givenCell = isGiven(r, c);
          const selectedCell = selected && selected[0] === r && selected[1] === c;
          const isSameRow = selected !== null && selected[0] === r;
          const isSameCol = selected !== null && selected[1] === c;
          const isSameBox =
            selected !== null && getBox(selected[0], selected[1]) === getBox(r, c);
          const highlight = selected && (isSameRow || isSameCol || isSameBox);
          const match =
            selected &&
            val !== 0 &&
            value(selected[0], selected[1]) === val;
          const conflict = autoErrorCheck && hasConflict(r, c);
          const isPop = popCell && popCell[0] === r && popCell[1] === c;
          const scale = isPop ? popScale : 1;
          const cascadeLit = litCells.has(r * 9 + c);

          if (cascadeLit) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
            ctx.fillRect(x + 1, y + 1, cellSz - 2, cellSz - 2);
          } else if (selectedCell) {
            ctx.fillStyle = t.selected;
            ctx.fillRect(x + 1, y + 1, cellSz - 2, cellSz - 2);
          } else if (highlight) {
            ctx.fillStyle = t.highlight;
            ctx.fillRect(x + 1, y + 1, cellSz - 2, cellSz - 2);
          }
          if (match && val !== 0) {
            ctx.fillStyle = t.sameNum;
            ctx.fillRect(x + 1, y + 1, cellSz - 2, cellSz - 2);
          }
          if (conflict) {
            ctx.fillStyle = `${t.conflict}40`;
            ctx.fillRect(x + 1, y + 1, cellSz - 2, cellSz - 2);
          }

          const cellNotes = notes[key] ?? [];
          if (val !== 0) {
            ctx.save();
            ctx.translate(x + cellSz / 2, y + cellSz / 2);
            ctx.scale(scale, scale);
            ctx.translate(-(x + cellSz / 2), -(y + cellSz / 2));
            ctx.font = `bold ${givenCell ? cellSz * 0.6 : cellSz * 0.55}px system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = conflict ? t.conflict : givenCell ? t.given : t.user;
            ctx.fillText(String(val), x + cellSz / 2, y + cellSz / 2);
            ctx.restore();
          } else if (cellNotes.length > 0) {
            ctx.font = `${cellSz * 0.22}px system-ui`;
            ctx.textAlign = 'center';
            ctx.fillStyle = t.user;
            for (let i = 0; i < 9; i++) {
              const nr = Math.floor(i / 3);
              const nc = i % 3;
              const n = i + 1;
              if (cellNotes.includes(n)) {
                ctx.fillText(
                  String(n),
                  x + (nc + 0.5) * (cellSz / 3),
                  y + (nr + 0.5) * (cellSz / 3)
                );
              }
            }
          }
        }
      }

      ctx.strokeStyle = t.cellBorder;
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 9; i++) {
        const pos = padding + i * cellSz;
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(size - padding, pos);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, size - padding);
        ctx.stroke();
      }
      ctx.strokeStyle = t.grid;
      ctx.lineWidth = 2.5;
      for (let i = 0; i <= 3; i++) {
        const pos = padding + i * (gridW / 3);
        ctx.beginPath();
        ctx.moveTo(padding, pos);
        ctx.lineTo(size - padding, pos);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos, padding);
        ctx.lineTo(pos, size - padding);
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [
    grid,
    notes,
    selected,
    theme,
    value,
    isGiven,
    hasConflict,
    autoErrorCheck,
    popCell,
    popTime,
    completionCascade,
  ]);

  if (grid.length === 0) {
    return (
      <div className="game-card bg-white">
        <p className="text-gray-700">Generating puzzle...</p>
      </div>
    );
  }

  return (
    <div
      className="game-card bg-white overflow-hidden w-full max-w-lg mx-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ maxWidth: 480 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">🔢 Sudoku Elite</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-900">
        <span>Time: <strong>{paused ? `${elapsed}s (paused)` : `${elapsed}s`}</strong></span>
        <span>Moves: <strong>{moves}</strong></span>
        {streak > 0 && <span className="text-amber-600 font-semibold">Streak: {streak} 🔥</span>}
        <button
          onClick={() => setPaused((p) => !p)}
          disabled={solved || grid.length === 0}
          className="px-2 py-1 rounded border border-gray-300 text-xs"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <label className="block text-sm font-medium text-gray-900">Difficulty</label>
        {(['easy', 'medium', 'hard', 'expert'] as const).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDifficulty(d);
              newGame(d);
            }}
            className={`btn-elite text-sm ${difficulty === d ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
            onMouseDown={() => playSound('click')}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <label className="block text-sm font-medium text-gray-900">Theme</label>
        {(['classic', 'paper', 'dark', 'blueprint'] as Theme[]).map((t) => (
          <button
            key={t}
            onClick={() => setTheme(t)}
            className={`btn-elite text-sm ${theme === t ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
            onMouseDown={() => playSound('click')}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
        Number count:{' '}
        {numberCounts.map((c, i) => (
          <span key={i} className={c === 9 ? 'font-bold text-green-600' : ''}>
            {i + 1}:{c}
          </span>
        ))}
      </div>

      {solved && (
        <div className="mb-3 p-3 rounded-lg bg-green-100 text-green-800 font-semibold">
          🎉 Puzzle solved in {elapsed}s! Best: {highscores[difficulty] === Infinity ? '-' : `${highscores[difficulty]}s`}
        </div>
      )}

      <div className="flex justify-center mb-3 touch-manipulation" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouchStart}
          onTouchEnd={handleCanvasTouchEnd}
          style={{ cursor: 'pointer', borderRadius: 8, touchAction: 'none', maxWidth: '100%' }}
          aria-label="Sudoku grid"
        />
      </div>

      {selected && (
        <div className="md:hidden fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 p-4 pb-[env(safe-area-inset-bottom)] z-20 shadow-lg" style={{ touchAction: 'manipulation' }}>
          <p className="text-xs text-gray-500 mb-2 text-center">Tap number to enter</p>
          <div className="grid grid-cols-9 gap-2 max-w-[340px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { handleNumberInput(n); playSound('click'); }}
                className={`min-h-[44px] rounded-lg font-semibold touch-manipulation active:scale-95 ${selVal === n ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => { handleClear(); playSound('click'); }}
              className="flex-1 py-2 text-sm bg-gray-200 rounded-lg touch-manipulation"
            >
              Clear
            </button>
            <button
              onClick={() => setSelected(null)}
              className="flex-1 py-2 text-sm text-gray-500 touch-manipulation"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
      <div className="mb-3 grid grid-cols-9 gap-1 max-w-[280px] mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleNumberInput(n)}
            className={`btn-elite text-sm h-9 touch-manipulation active:scale-95 ${selVal === n ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
            onMouseDown={() => playSound('click')}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-3">
        <button
          onClick={() => setPencilMode(!pencilMode)}
          className={`btn-elite text-sm touch-manipulation active:scale-95 ${pencilMode ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
          onMouseDown={() => playSound('click')}
        >
          Notes (N)
        </button>
        <button
          onClick={undo}
          disabled={historyIdx <= 0 || solved}
          className="btn-elite btn-elite-ghost text-sm disabled:opacity-50"
          onMouseDown={() => historyIdx > 0 && !solved && playSound('click')}
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={historyIdx >= history.length - 1 || solved}
          className="btn-elite btn-elite-ghost text-sm disabled:opacity-50"
          onMouseDown={() => historyIdx < history.length - 1 && !solved && playSound('click')}
        >
          Redo
        </button>
        <button
          onClick={handleHint}
          disabled={solved}
          className="btn-elite btn-elite-ghost text-sm disabled:opacity-50"
          onMouseDown={() => !solved && playSound('click')}
        >
          Hint
        </button>
        <button
          onClick={eliminateCandidates}
          disabled={solved}
          className="btn-elite btn-elite-ghost text-sm disabled:opacity-50"
          onMouseDown={() => !solved && playSound('click')}
        >
          Auto Notes
        </button>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={autoErrorCheck}
            onChange={(e) => setAutoErrorCheck(e.target.checked)}
          />
          Auto-error
        </label>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-500 mb-2 flex-wrap gap-1">
        <span>Solvable: {isSolvable() ? '✓' : '✗'}</span>
        <span>
          Stats: {stats.gamesCompleted} completed · Avg: {stats.avgTimeByDiff[difficulty].toFixed(0)}s
        </span>
        <span>Difficulty progress: {(['easy','medium','hard','expert'] as const).map(d => (
          <span key={d} className={stats.times[d]?.length ? 'text-green-600' : 'text-gray-400'}>
            {d[0]}{stats.times[d]?.length ? '✓' : ''}{' '}
          </span>
        ))}</span>
      </div>

      <button
        onClick={() => newGame()}
        className="btn-elite btn-elite-primary w-full touch-manipulation active:scale-95"
        onMouseDown={() => playSound('click')}
      >
        New Game
      </button>

      <p className="mt-2 text-xs text-gray-500 text-center">
        Arrows: move · 1-9: enter · Space/Del: clear · N: notes
      </p>
    </div>
  );
}
