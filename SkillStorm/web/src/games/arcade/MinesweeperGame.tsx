/* ═══════════════════════════════════════════════════════════════════════════════
   MINESWEEPER — Elite Canvas Edition
   Canvas-based rendering, particles, animations, full feature set
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

/* ── Types ──────────────────────────────────────────────────────────────────── */
type DifficultyId = 'beginner' | 'intermediate' | 'expert';

interface DifficultyPreset {
  id: DifficultyId;
  label: string;
  rows: number;
  cols: number;
  mines: number;
}

type CellState = 'hidden' | 'revealed' | 'flagged' | 'question';

interface Cell {
  isMine: boolean;
  neighborCount: number;
  state: CellState;
  revealOrder: number;
  explodeOrder: number;
  revealProgress: number;
  flagBounce: number;
  questionBounce: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  w: number;
  h: number;
}

/* ── Constants ───────────────────────────────────────────────────────────────── */
const DIFFICULTIES: DifficultyPreset[] = [
  { id: 'beginner', label: 'Beginner', rows: 9, cols: 9, mines: 10 },
  { id: 'intermediate', label: 'Intermediate', rows: 16, cols: 16, mines: 40 },
  { id: 'expert', label: 'Expert', rows: 16, cols: 30, mines: 99 },
];

const NUMBER_COLORS: Record<number, string> = {
  1: '#0000ff',
  2: '#008000',
  3: '#ff0000',
  4: '#000080',
  5: '#800000',
  6: '#008080',
  7: '#000000',
  8: '#808080',
};

const STATS_KEY = 'skillzstorm_minesweeper_stats';
const BEST_TIMES_KEY = 'skillzstorm_minesweeper_best_times';

const ZOOM_LEVELS = [16, 24, 32] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];

/* ── localStorage Helpers ────────────────────────────────────────────────────── */
interface GameStats {
  gamesPlayed: number;
  wins: number;
  bestTimes: Record<string, number>;
}

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { gamesPlayed: 0, wins: 0, bestTimes: {} };
}

function saveStats(stats: GameStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function loadBestTime(key: string): number {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return obj[key] ?? Infinity;
    }
  } catch {}
  return Infinity;
}

function saveBestTime(key: string, timeMs: number) {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if (timeMs < (obj[key] ?? Infinity)) {
      obj[key] = timeMs;
      localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(obj));
    }
  } catch {}
}

/* ── Board Logic ─────────────────────────────────────────────────────────────── */
function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array(rows)
    .fill(0)
    .map(() =>
      Array(cols)
        .fill(0)
        .map(() => ({
          isMine: false,
          neighborCount: 0,
          state: 'hidden' as CellState,
          revealOrder: -1,
          explodeOrder: -1,
          revealProgress: 0,
          flagBounce: 0,
          questionBounce: 0,
        }))
    );
}

function createBoardWithMines(
  rows: number,
  cols: number,
  mines: number,
  avoidR: number,
  avoidC: number
): Cell[][] {
  const grid = createEmptyBoard(rows, cols);
  const isAvoid = (r: number, c: number) =>
    Math.abs(r - avoidR) <= 1 && Math.abs(c - avoidC) <= 1;

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (grid[r][c].isMine || isAvoid(r, c)) continue;
    grid[r][c].isMine = true;
    placed++;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c].isMine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].isMine) count++;
        }
      }
      grid[r][c].neighborCount = count;
    }
  }
  return grid;
}

function getRevealOrder(
  board: Cell[][],
  startR: number,
  startC: number
): [number, number][] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const visited = new Set<string>();
  const order: [number, number][] = [];
  const queue: [number, number][] = [[startR, startC]];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    const cell = board[r]?.[c];
    if (!cell || cell.state !== 'hidden' || cell.isMine) continue;

    visited.add(key);
    order.push([r, c]);

    if (cell.neighborCount === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) queue.push([nr, nc]);
        }
      }
    }
  }
  return order;
}

function getMinePositions(board: Cell[][]): [number, number][] {
  const result: [number, number][] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c].isMine) result.push([r, c]);
    }
  }
  return result;
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export default function MinesweeperGame({ onClose }: { onClose: () => void }) {
  const [difficulty, setDifficulty] = useState<DifficultyPreset>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [flagsLeft, setFlagsLeft] = useState(10);
  const [timeMs, setTimeMs] = useState(0);
  const [focusedCell, setFocusedCell] = useState<[number, number] | null>(null);
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(24);
  const [showStats, setShowStats] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const confettiRef = useRef<Confetti[]>([]);
  const explosionStartRef = useRef<number>(0);
  const cascadeStartRef = useRef<number>(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartCellRef = useRef<[number, number] | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const lastPinchDistRef = useRef<number>(0);
  const lastPinchZoomRef = useRef<ZoomLevel>(24);

  const vibrateMineHit = useCallback(() => {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  const rows = difficulty.rows;
  const cols = difficulty.cols;
  const mines = difficulty.mines;
  const safeCount = rows * cols - mines;
  const revealedCount = board.flat().filter((c) => c.state === 'revealed').length;
  const difficultyKey = difficulty.id;
  const cellSize = zoom;
  const padding = 4;

  const bestTime = loadBestTime(difficultyKey);
  const stats = loadStats();

  /* ── Initialize empty board ────────────────────────────────────────────────── */
  useEffect(() => {
    setBoard(createEmptyBoard(rows, cols));
    setFlagsLeft(mines);
    setStarted(false);
    setGameOver(false);
    setWon(false);
    setTimeMs(0);
    setFocusedCell(null);
    setHoverCell(null);
    particlesRef.current = [];
    confettiRef.current = [];
  }, [rows, cols, mines]);

  /* ── Timer ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!started || gameOver || won) return;
    const start = Date.now() - timeMs;
    timerRef.current = window.setInterval(() => {
      setTimeMs(Math.floor(Date.now() - start));
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [started, gameOver, won, timeMs]);

  /* ── Win detection ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (started && !gameOver && !won && revealedCount === safeCount) {
      setWon(true);
      playSound('victory');
      const nextStats = {
        ...stats,
        gamesPlayed: stats.gamesPlayed + 1,
        wins: stats.wins + 1,
      };
      saveStats(nextStats);
      saveBestTime(difficultyKey, timeMs);

      const colors = ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'];
      confettiRef.current = [];
      for (let i = 0; i < 120; i++) {
        confettiRef.current.push({
          x: 50 + (Math.random() - 0.5) * 60,
          y: 50 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2 - 1,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          w: 4 + Math.random() * 6,
          h: 2 + Math.random() * 4,
        });
      }
    }
  }, [started, gameOver, won, revealedCount, safeCount, difficultyKey, timeMs]);

  /* ── Reveal cell (first click safe, cascade) ────────────────────────────────── */
  const reveal = useCallback(
    (r: number, c: number, isFirstClick: boolean) => {
      if (gameOver || won) return;

      if (!started && isFirstClick) {
        let newBoard = createBoardWithMines(rows, cols, mines, r, c);
        let cell = newBoard[r][c];
        while (cell.isMine || cell.neighborCount !== 0) {
          newBoard = createBoardWithMines(rows, cols, mines, r, c);
          cell = newBoard[r][c];
        }
        const order = getRevealOrder(newBoard, r, c);
        const next = newBoard.map((row) => row.map((x) => ({ ...x })));
        order.forEach(([ar, ac], i) => {
          next[ar][ac].state = 'revealed';
          next[ar][ac].revealOrder = i;
          next[ar][ac].revealProgress = 0;
        });
        setBoard(next);
        setStarted(true);
        setFlagsLeft(mines);
        cascadeStartRef.current = performance.now();
        playSound('pop');

        for (let i = 0; i < order.length; i++) {
          const [pr, pc] = order[i];
          const cx = pc * cellSize + cellSize / 2 + padding;
          const cy = pr * cellSize + cellSize / 2 + padding;
          for (let j = 0; j < 4; j++) {
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              life: 1,
              maxLife: 1,
              color: ['#60a5fa', '#34d399', '#fbbf24'][j % 3],
              size: 2 + Math.random() * 2,
            });
          }
        }
        return;
      }

      const cell = board[r]?.[c];
      if (!cell || cell.state === 'flagged') return;

      if (cell.state === 'revealed') {
        chordReveal(r, c);
        return;
      }

      if (cell.isMine) {
        vibrateMineHit();
        setGameOver(true);
        explosionStartRef.current = performance.now();
        const nextStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
        saveStats(nextStats);
        playSound('bomb');
        const minePositions = getMinePositions(board);
        const next = board.map((row) => row.map((x) => ({ ...x })));
        minePositions.forEach(([mr, mc], i) => {
          next[mr][mc].state = 'revealed';
          next[mr][mc].explodeOrder = i;
        });
        setBoard(next);
        return;
      }

      const order = getRevealOrder(board, r, c);
      setBoard((prev) => {
        const next = prev.map((row) => row.map((x) => ({ ...x })));
        order.forEach(([ar, ac], i) => {
          next[ar][ac].state = 'revealed';
          next[ar][ac].revealOrder = i;
          next[ar][ac].revealProgress = 0;
        });
        return next;
      });
      cascadeStartRef.current = performance.now();
      playSound('pop');

      order.forEach(([pr, pc], i) => {
        setTimeout(() => {
          const cx = pc * cellSize + cellSize / 2 + padding;
          const cy = pr * cellSize + cellSize / 2 + padding;
          for (let j = 0; j < 3; j++) {
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              life: 1,
              maxLife: 1,
              color: '#94a3b8',
              size: 1.5 + Math.random(),
            });
          }
        }, i * 25);
      });
    },
    [board, gameOver, won, started, rows, cols, mines, cellSize]
  );

  /* ── Chord reveal ──────────────────────────────────────────────────────────── */
  const chordReveal = useCallback(
    (r: number, c: number) => {
      const cell = board[r]?.[c];
      if (!cell || cell.state !== 'revealed' || cell.neighborCount === 0) return;

      let flagCount = 0;
      const neighbors: [number, number][] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          if (board[nr][nc].state === 'flagged') flagCount++;
          if (board[nr][nc].state === 'hidden' || board[nr][nc].state === 'question') neighbors.push([nr, nc]);
        }
      }
      if (flagCount !== cell.neighborCount) return;

      for (const [nr, nc] of neighbors) {
        const n = board[nr][nc];
        if (n.isMine) {
          vibrateMineHit();
          setGameOver(true);
          explosionStartRef.current = performance.now();
          const nextStats = { ...stats, gamesPlayed: stats.gamesPlayed + 1 };
          saveStats(nextStats);
          playSound('bomb');
          const minePositions = getMinePositions(board);
          setBoard((prev) => {
            const next = prev.map((row) => row.map((x) => ({ ...x })));
            minePositions.forEach(([mr, mc], i) => {
              next[mr][mc].state = 'revealed';
              next[mr][mc].explodeOrder = i;
            });
            next[nr][nc].explodeOrder = 0;
            return next;
          });
          return;
        }
      }

      const allCoords = new Set<string>();
      const queue = [...neighbors];
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!;
        const key = `${qr},${qc}`;
        if (allCoords.has(key)) continue;
        const q = board[qr]?.[qc];
        if (!q || (q.state !== 'hidden' && q.state !== 'question')) continue;
        allCoords.add(key);
        if (q.neighborCount === 0) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nnr = qr + dr;
              const nnc = qc + dc;
              if (nnr >= 0 && nnr < rows && nnc >= 0 && nnc < cols) queue.push([nnr, nnc]);
            }
          }
        }
      }

      const order = Array.from(allCoords).map((k) => {
        const [a, b] = k.split(',').map(Number);
        return [a, b] as [number, number];
      });

      setBoard((prev) => {
        const next = prev.map((row) => row.map((x) => ({ ...x })));
        order.forEach(([ar, ac], i) => {
          next[ar][ac].state = 'revealed';
          next[ar][ac].revealOrder = i;
          next[ar][ac].revealProgress = 0;
        });
        return next;
      });
      cascadeStartRef.current = performance.now();
      playSound('pop');
    },
    [board, rows, cols]
  );

  /* ── Flag / Question cycle ─────────────────────────────────────────────────── */
  const cycleFlag = useCallback(
    (r: number, c: number) => {
      if (gameOver || won || !started) return;
      const cell = board[r]?.[c];
      if (cell.state === 'revealed') return;

      setBoard((prev) => {
        const next = prev.map((row) => row.map((x) => ({ ...x })));
        const c2 = next[r][c];
        if (c2.state === 'hidden') {
          if (flagsLeft > 0) {
            c2.state = 'flagged';
            c2.flagBounce = 1;
            setFlagsLeft((f) => f - 1);
            playSound('click');
          }
        } else if (c2.state === 'flagged') {
          c2.state = 'question';
          c2.questionBounce = 1;
          setFlagsLeft((f) => f + 1);
          playSound('click');
        } else {
          c2.state = 'hidden';
          playSound('click');
        }
        return next;
      });
    },
    [board, gameOver, won, started, flagsLeft]
  );

  /* ── Mouse / touch handling ────────────────────────────────────────────────── */
  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current;
      const cont = containerRef.current;
      if (!canvas || !cont) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX - padding;
      const y = (clientY - rect.top) * scaleY - padding;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < rows && c >= 0 && c < cols) return [r, c];
      return null;
    },
    [cellSize, rows, cols]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPoint(e.clientX, e.clientY);
      setHoverCell(cell);
    },
    [getCellFromPoint]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) {
        const [r, c] = cell;
        if (e.button === 0) reveal(r, c, !started);
        else if (e.button === 1) chordReveal(r, c);
        else if (e.button === 2) cycleFlag(r, c);
      }
    },
    [getCellFromPoint, reveal, chordReveal, cycleFlag, started]
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const cell = getCellFromPoint(e.clientX, e.clientY);
      if (cell) cycleFlag(cell[0], cell[1]);
    },
    [getCellFromPoint, cycleFlag]
  );

  const handleCanvasAuxClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
        const cell = getCellFromPoint(e.clientX, e.clientY);
        if (cell) chordReveal(cell[0], cell[1]);
      }
    },
    [getCellFromPoint, chordReveal]
  );

  /* ── Touch handlers (tap = reveal, long-press = flag) ───────────────────────── */
  const LONG_PRESS_MS = 400;

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length >= 2) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        touchStartCellRef.current = null;
        return;
      }
      const touch = e.touches[0];
      if (!touch) return;
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      touchStartCellRef.current = cell;
      touchStartTimeRef.current = Date.now();
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        if (touchStartCellRef.current) {
          const [r, c] = touchStartCellRef.current;
          cycleFlag(r, c);
          longPressTimerRef.current = null;
          touchStartCellRef.current = null;
        }
      }, LONG_PRESS_MS);
    },
    [getCellFromPoint, cycleFlag]
  );

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const touch = e.changedTouches[0];
      if (!touch || !touchStartCellRef.current) return;
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      const held = Date.now() - touchStartTimeRef.current;
      touchStartCellRef.current = null;
      lastPinchDistRef.current = 0;
      if (held >= LONG_PRESS_MS) return;
      if (cell) {
        reveal(cell[0], cell[1], !started);
      }
    },
    [getCellFromPoint, reveal, started]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastPinchDistRef.current > 0) {
          const delta = d - lastPinchDistRef.current;
          const idx = ZOOM_LEVELS.indexOf(zoom);
          if (delta > 15 && idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
          if (delta < -15 && idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
        }
        lastPinchDistRef.current = d;
      } else {
        lastPinchDistRef.current = 0;
      }
    },
    [zoom]
  );

  const handleCanvasTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartCellRef.current = null;
    lastPinchDistRef.current = 0;
  }, []);

  /* ── Pinch zoom (Ctrl+wheel on desktop) ────────────────────────────────────── */
  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => {
        const idx = ZOOM_LEVELS.indexOf(z);
        if (e.deltaY < 0 && idx < ZOOM_LEVELS.length - 1) return ZOOM_LEVELS[idx + 1];
        if (e.deltaY > 0 && idx > 0) return ZOOM_LEVELS[idx - 1];
        return z;
      });
    };
    cont.addEventListener('wheel', onWheel, { passive: false });
    return () => cont.removeEventListener('wheel', onWheel);
  }, []);

  /* ── Keyboard ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!started || gameOver || won) {
        if (e.key === 'Escape') onClose();
        return;
      }

      let [fr, fc] = focusedCell ?? [0, 0];
      const maxR = rows - 1;
      const maxC = cols - 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCell([Math.max(0, fr - 1), fc]);
          playSound('click');
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedCell([Math.min(maxR, fr + 1), fc]);
          playSound('click');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCell([fr, Math.max(0, fc - 1)]);
          playSound('click');
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCell([fr, Math.min(maxC, fc + 1)]);
          playSound('click');
          break;
        case ' ':
          e.preventDefault();
          if (focusedCell) {
            if (e.shiftKey) {
              cycleFlag(focusedCell[0], focusedCell[1]);
            } else {
              reveal(focusedCell[0], focusedCell[1], false);
            }
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (focusedCell) cycleFlag(focusedCell[0], focusedCell[1]);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedCell) chordReveal(focusedCell[0], focusedCell[1]);
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [started, gameOver, won, focusedCell, rows, cols, reveal, cycleFlag, chordReveal, onClose]);

  /* ── New game ──────────────────────────────────────────────────────────────── */
  const newGame = useCallback(() => {
    setBoard(createEmptyBoard(rows, cols));
    setStarted(false);
    setGameOver(false);
    setWon(false);
    setFlagsLeft(mines);
    setTimeMs(0);
    setFocusedCell(null);
    setHoverCell(null);
    particlesRef.current = [];
    confettiRef.current = [];
  }, [rows, cols, mines]);

  /* ── Canvas render loop ────────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      const dt = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0.016;
      lastTickRef.current = now;

      const w = cols * cellSize + padding * 2;
      const h = rows * cellSize + padding * 2;
      canvas.width = w;
      canvas.height = h;

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = board[r]?.[c];
          if (!cell) continue;

          const x = c * cellSize + padding;
          const y = r * cellSize + padding;
          const isHover =
            (hoverCell?.[0] === r && hoverCell?.[1] === c) ||
            (focusedCell?.[0] === r && focusedCell?.[1] === c);

          if (cell.state === 'flagged') {
              const bounce = Math.max(0, 1 - (cell.flagBounce || 0) * 5);
              const scale = 1 + bounce * 0.3;
              const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
              grad.addColorStop(0, '#475569');
              grad.addColorStop(0.5, '#334155');
              grad.addColorStop(1, '#1e293b');
              ctx.fillStyle = grad;
              ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
              ctx.save();
              ctx.translate(x + cellSize / 2, y + cellSize / 2);
              ctx.scale(scale, scale);
              ctx.translate(-(x + cellSize / 2), -(y + cellSize / 2));
              ctx.fillStyle = '#ef4444';
              ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🚩', x + cellSize / 2, y + cellSize / 2);
              ctx.restore();
          } else if (cell.state === 'hidden' || cell.state === 'question') {
            const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
            grad.addColorStop(0, '#475569');
            grad.addColorStop(0.5, '#334155');
            grad.addColorStop(1, '#1e293b');
            ctx.fillStyle = grad;
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

            if (isHover) {
              ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
              ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            }

            if (cell.state === 'question') {
              ctx.fillStyle = '#fbbf24';
              ctx.font = `bold ${Math.floor(cellSize * 0.5)}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('?', x + cellSize / 2, y + cellSize / 2);
            }
          } else {
            const cascadeElapsed = (now - cascadeStartRef.current) / 1000;
            const cascadeRevealed = cell.revealOrder < 0 || cascadeElapsed > cell.revealOrder * 0.025;

            const elapsed = gameOver ? (now - explosionStartRef.current) / 1000 : 0;
            const explDelay = cell.explodeOrder >= 0 ? cell.explodeOrder * 0.06 : 0;
            const explProgress = cell.explodeOrder >= 0 ? Math.min(1, Math.max(0, (elapsed - explDelay) * 8)) : 1;

            ctx.fillStyle = gameOver && cell.isMine && cell.explodeOrder === 0 ? '#dc2626' : '#0f172a';
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

            if (cell.isMine) {
              if (gameOver && explProgress > 0) {
                const ex = x + cellSize / 2;
                const ey = y + cellSize / 2;
                const rad = (cellSize / 2) * 0.8 * explProgress;
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(ex, ey, rad, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(ex, ey, rad * 0.5, 0, Math.PI * 2);
                ctx.fill();
              } else if (won) {
                ctx.fillStyle = '#22c55e';
                ctx.font = `${Math.floor(cellSize * 0.6)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✓', x + cellSize / 2, y + cellSize / 2);
              }
            } else if (cell.neighborCount > 0 && cascadeRevealed) {
              const color = NUMBER_COLORS[cell.neighborCount] ?? '#94a3b8';
              ctx.fillStyle = color;
              ctx.font = `bold ${Math.floor(cellSize * 0.65)}px monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(String(cell.neighborCount), x + cellSize / 2, y + cellSize / 2);
            } else if (cell.neighborCount === 0 && !cascadeRevealed) {
              ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
              ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
            }
          }

          ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }

      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.life -= dt / 0.4;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      const conf = confettiRef.current;
      for (let i = conf.length - 1; i >= 0; i--) {
        const cf = conf[i];
        ctx.save();
        ctx.translate((cf.x * w) / 100, (cf.y * h) / 100);
        ctx.rotate((cf.rotation * Math.PI) / 180);
        ctx.fillStyle = cf.color;
        ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
        ctx.restore();
        cf.x += cf.vx;
        cf.y += cf.vy;
        cf.vy += 0.2;
        cf.rotation += cf.rotSpeed;
        if (cf.y > 120) conf.splice(i, 1);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [board, rows, cols, cellSize, gameOver, won, hoverCell, focusedCell]);

  const canvasW = cols * cellSize + padding * 2;
  const canvasH = rows * cellSize + padding * 2;

  return (
    <div className="game-card border border-slate-700 bg-slate-900 text-slate-100 overflow-hidden relative w-full max-w-2xl mx-auto">
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2); }
        }
      `}</style>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-100">Mine Sweep</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={difficulty.id}
          onChange={(e) => {
            const d = DIFFICULTIES.find((x) => x.id === e.target.value)!;
            setDifficulty(d);
            setBoard(createEmptyBoard(d.rows, d.cols));
            setFlagsLeft(d.mines);
            setStarted(false);
            setGameOver(false);
            setWon(false);
            setTimeMs(0);
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value) as ZoomLevel)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
        >
          <option value={16}>Small</option>
          <option value={24}>Medium</option>
          <option value={32}>Large</option>
        </select>

        <button
          onClick={() => setShowStats(!showStats)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm hover:bg-slate-700"
        >
          Stats
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-slate-800/50">
        <div className="flex items-center gap-4 font-mono text-sm">
          <span>Mines: <strong className="text-amber-400">{flagsLeft}</strong></span>
          <span>Time: <strong className="text-emerald-400">{(timeMs / 1000).toFixed(2)}s</strong></span>
          {bestTime < Infinity && (
            <span className="text-slate-400 text-xs">Best: {(bestTime / 1000).toFixed(2)}s</span>
          )}
        </div>
        <button
          onClick={newGame}
          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm"
        >
          New Game
        </button>
      </div>

      <div
        ref={containerRef}
        className="overflow-auto rounded-lg bg-slate-950 p-1 inline-block touch-manipulation"
        style={{ maxWidth: '100%', touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="cursor-pointer block w-full touch-manipulation"
          style={{ maxWidth: '100%' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={handleCanvasMouseLeave}
          onClick={handleCanvasClick}
          onContextMenu={handleCanvasContextMenu}
          onAuxClick={handleCanvasAuxClick}
          onTouchStart={handleCanvasTouchStart}
          onTouchEnd={handleCanvasTouchEnd}
          onTouchMove={handleCanvasTouchMove}
          onTouchCancel={handleCanvasTouchCancel}
          tabIndex={0}
          onFocus={() => {
            if (!focusedCell && started) setFocusedCell([0, 0]);
          }}
        />
      </div>

      <p className="text-xs text-slate-400 mt-2">
        Arrows: move • Space: reveal • Shift+Space / F: flag • Enter / Middle-click: chord • Right-click: flag cycle
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Mobile: tap to reveal • long-press (0.4s) to flag • pinch to zoom • Ctrl+scroll: zoom
      </p>

      {gameOver && (
        <div className="mt-4 p-4 rounded-xl bg-red-900/30 border border-red-700 text-red-200">
          <p className="font-bold">Game Over — you hit a mine!</p>
          <button onClick={newGame} className="btn-elite btn-elite-primary mt-2 touch-manipulation active:scale-95">
            New Game
          </button>
        </div>
      )}

      {won && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-900/30 border border-emerald-700 text-emerald-200 animate-[pulse_1.5s_ease-in-out_2]">
          <p className="font-bold text-lg">🎉 You Win! 🎉</p>
          <p className="text-sm">
            Time: {(timeMs / 1000).toFixed(2)}s
            {timeMs <= bestTime && ' — New Best!'}
          </p>
          <button onClick={newGame} className="btn-elite btn-elite-primary mt-2 touch-manipulation active:scale-95">
            New Game
          </button>
        </div>
      )}

      {showStats && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-600">
          <p className="font-semibold mb-2">Statistics</p>
          <p>Games: {stats.gamesPlayed} • Wins: {stats.wins}</p>
          <p>Win rate: {stats.gamesPlayed > 0 ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) : 0}%</p>
          <p className="text-xs text-slate-400 mt-2">
            Best: Beginner {loadBestTime('beginner') < Infinity ? (loadBestTime('beginner') / 1000).toFixed(2) + 's' : '-'} •
            Intermediate {loadBestTime('intermediate') < Infinity ? (loadBestTime('intermediate') / 1000).toFixed(2) + 's' : '-'} •
            Expert {loadBestTime('expert') < Infinity ? (loadBestTime('expert') / 1000).toFixed(2) + 's' : '-'}
          </p>
        </div>
      )}
    </div>
  );
}
