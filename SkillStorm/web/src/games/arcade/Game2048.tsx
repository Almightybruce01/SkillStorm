/* ═══════════════════════════════════════════════════════════════════════════════
   GAME 2048 — Elite Canvas-Based Tile Sliding Puzzle
   Modes: Classic 4x4, Mini 3x3, Big 5x5, Challenge
   Features: Smooth animations, particles, combos, swipe, undo, statistics
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface Game2048Props {
  onClose: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right';
type GameMode = 'classic' | 'mini' | 'big' | 'challenge';

interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
  mergedFrom: [number, number] | null;
  isNew: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface UndoState {
  grid: (Tile | null)[][];
  score: number;
  nextId: number;
}

type ColorTheme = 'vibrant' | 'pastel' | 'dark' | 'ocean';

interface GameStats {
  totalMerges: number;
  highestTile: number;
  gamesPlayed: number;
}

const STORAGE_KEY = 'skillzstorm_2048_best';
const STATS_KEY = 'skillzstorm_2048_stats';

// Unique gradient colors per power of 2 — supports themes
function getTileGradient(value: number, theme: ColorTheme = 'vibrant'): { start: string; end: string; shadow: string } {
  const vibrant: Record<number, { start: string; end: string; shadow: string }> = {
    2: { start: '#fef9c3', end: '#fef08a', shadow: '#ca8a04' },
    4: { start: '#fde68a', end: '#fcd34d', shadow: '#b45309' },
    8: { start: '#fed7aa', end: '#fdba74', shadow: '#c2410c' },
    16: { start: '#fecaca', end: '#fca5a5', shadow: '#dc2626' },
    32: { start: '#fbcfe8', end: '#f9a8d4', shadow: '#db2777' },
    64: { start: '#e9d5ff', end: '#d8b4fe', shadow: '#9333ea' },
    128: { start: '#c4b5fd', end: '#a78bfa', shadow: '#7c3aed' },
    256: { start: '#93c5fd', end: '#60a5fa', shadow: '#2563eb' },
    512: { start: '#67e8f9', end: '#22d3ee', shadow: '#0891b2' },
    1024: { start: '#5eead4', end: '#2dd4bf', shadow: '#0d9488' },
    2048: { start: '#fbbf24', end: '#f59e0b', shadow: '#d97706' },
    4096: { start: '#fb923c', end: '#f97316', shadow: '#ea580c' },
    8192: { start: '#a78bfa', end: '#8b5cf6', shadow: '#6d28d9' },
    16384: { start: '#f472b6', end: '#ec4899', shadow: '#be185d' },
    32768: { start: '#34d399', end: '#10b981', shadow: '#059669' },
    65536: { start: '#fcd34d', end: '#fbbf24', shadow: '#f59e0b' },
  };
  const pastel: Record<number, { start: string; end: string; shadow: string }> = {
    2: { start: '#fce7f3', end: '#fbcfe8', shadow: '#ec4899' },
    4: { start: '#e9d5ff', end: '#ddd6fe', shadow: '#8b5cf6' },
    8: { start: '#cffafe', end: '#a5f3fc', shadow: '#06b6d4' },
    16: { start: '#d1fae5', end: '#a7f3d0', shadow: '#10b981' },
    32: { start: '#fef9c3', end: '#fef08a', shadow: '#eab308' },
    64: { start: '#fed7aa', end: '#fdba74', shadow: '#f97316' },
    128: { start: '#fecaca', end: '#fca5a5', shadow: '#ef4444' },
    256: { start: '#e9d5ff', end: '#d8b4fe', shadow: '#a855f7' },
    512: { start: '#a5f3fc', end: '#67e8f9', shadow: '#0891b2' },
    1024: { start: '#a7f3d0', end: '#5eead4', shadow: '#0d9488' },
    2048: { start: '#fde68a', end: '#fcd34d', shadow: '#d97706' },
    4096: { start: '#fdba74', end: '#fb923c', shadow: '#ea580c' },
    8192: { start: '#d8b4fe', end: '#c084fc', shadow: '#7c3aed' },
    16384: { start: '#f9a8d4', end: '#f472b6', shadow: '#db2777' },
    32768: { start: '#6ee7b7', end: '#34d399', shadow: '#059669' },
    65536: { start: '#fcd34d', end: '#fbbf24', shadow: '#f59e0b' },
  };
  const dark: Record<number, { start: string; end: string; shadow: string }> = {
    2: { start: '#374151', end: '#4b5563', shadow: '#1f2937' },
    4: { start: '#4b5563', end: '#6b7280', shadow: '#374151' },
    8: { start: '#6b7280', end: '#9ca3af', shadow: '#4b5563' },
    16: { start: '#059669', end: '#10b981', shadow: '#047857' },
    32: { start: '#0891b2', end: '#06b6d4', shadow: '#0e7490' },
    64: { start: '#7c3aed', end: '#8b5cf6', shadow: '#6d28d9' },
    128: { start: '#dc2626', end: '#ef4444', shadow: '#b91c1c' },
    256: { start: '#2563eb', end: '#3b82f6', shadow: '#1d4ed8' },
    512: { start: '#0d9488', end: '#14b8a6', shadow: '#0f766e' },
    1024: { start: '#d97706', end: '#f59e0b', shadow: '#b45309' },
    2048: { start: '#fbbf24', end: '#fcd34d', shadow: '#f59e0b' },
    4096: { start: '#ec4899', end: '#f472b6', shadow: '#db2777' },
    8192: { start: '#6366f1', end: '#818cf8', shadow: '#4f46e5' },
    16384: { start: '#22c55e', end: '#4ade80', shadow: '#16a34a' },
    32768: { start: '#38bdf8', end: '#7dd3fc', shadow: '#0ea5e9' },
    65536: { start: '#fde047', end: '#fef08a', shadow: '#eab308' },
  };
  const ocean: Record<number, { start: string; end: string; shadow: string }> = {
    2: { start: '#e0f2fe', end: '#bae6fd', shadow: '#0284c7' },
    4: { start: '#bae6fd', end: '#7dd3fc', shadow: '#0ea5e9' },
    8: { start: '#67e8f9', end: '#22d3ee', shadow: '#06b6d4' },
    16: { start: '#5eead4', end: '#2dd4bf', shadow: '#14b8a6' },
    32: { start: '#99f6e4', end: '#5eead4', shadow: '#0d9488' },
    64: { start: '#a5f3fc', end: '#67e8f9', shadow: '#0891b2' },
    128: { start: '#38bdf8', end: '#0ea5e9', shadow: '#0284c7' },
    256: { start: '#0c4a6e', end: '#075985', shadow: '#0c4a6e' },
    512: { start: '#164e63', end: '#0e7490', shadow: '#155e75' },
    1024: { start: '#155e75', end: '#0891b2', shadow: '#0e7490' },
    2048: { start: '#fbbf24', end: '#f59e0b', shadow: '#d97706' },
    4096: { start: '#fb923c', end: '#ea580c', shadow: '#c2410c' },
    8192: { start: '#1e40af', end: '#2563eb', shadow: '#1e3a8a' },
    16384: { start: '#4c1d95', end: '#6d28d9', shadow: '#5b21b6' },
    32768: { start: '#134e4a', end: '#0f766e', shadow: '#115e59' },
    65536: { start: '#fde047', end: '#facc15', shadow: '#eab308' },
  };
  const palettes: Record<ColorTheme, Record<number, { start: string; end: string; shadow: string }>> = {
    vibrant,
    pastel,
    dark,
    ocean,
  };
  const gradients = palettes[theme] ?? vibrant;
  return gradients[value] ?? { start: '#fef3c7', end: '#fde68a', shadow: '#a16207' };
}

function getTileTextColor(value: number): string {
  return value <= 4 ? '#451a03' : '#1c1917';
}

function getGridSize(mode: GameMode): number {
  switch (mode) {
    case 'mini': return 3;
    case 'big': return 5;
    default: return 4;
  }
}

function createEmptyGrid(size: number): (Tile | null)[][] {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));
}

function addRandomTile(
  grid: (Tile | null)[][],
  nextId: number
): { grid: (Tile | null)[][]; nextId: number } {
  const size = grid.length;
  const empty: [number, number][] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return { grid, nextId };
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  const newGrid = grid.map((row) => row.map((t) => (t ? { ...t } : null)));
  newGrid[r][c] = {
    id: nextId,
    value,
    row: r,
    col: c,
    prevRow: r,
    prevCol: c,
    mergedFrom: null,
    isNew: true,
  };
  return { grid: newGrid, nextId: nextId + 1 };
}

function flattenGrid(grid: (Tile | null)[][]): Tile[] {
  const tiles: Tile[] = [];
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) tiles.push(grid[r][c]!);
    }
  }
  return tiles;
}

function slideAndMerge(
  grid: (Tile | null)[][],
  direction: Direction
): { grid: (Tile | null)[][]; scoreGain: number; moved: boolean; mergeCount: number } {
  const size = grid.length;
  let scoreGain = 0;
  let moved = false;
  let mergeCount = 0;
  const newGrid = createEmptyGrid(size);
  const merged = new Set<string>();

  const lines: { row: number; col: number }[][] = [];
  if (direction === 'left' || direction === 'right') {
    const cols = Array.from({ length: size }, (_, i) => i);
    for (let r = 0; r < size; r++) {
      lines.push(
        (direction === 'left' ? cols : cols.slice().reverse()).map((c) => ({ row: r, col: c }))
      );
    }
  } else {
    const rows = Array.from({ length: size }, (_, i) => i);
    for (let c = 0; c < size; c++) {
      lines.push(
        (direction === 'up' ? rows : rows.slice().reverse()).map((r) => ({ row: r, col: c }))
      );
    }
  }

  for (const line of lines) {
    const cells = line.map(({ row, col }) => grid[row][col]).filter(Boolean) as Tile[];
    const result: Tile[] = [];
    let targetIndex = 0;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const prevPos = line[i];
      const newPos = line[targetIndex];
      const last = result[result.length - 1];
      const canMerge =
        last &&
        last.value === cell.value &&
        !merged.has(`${last.id}`);

      if (canMerge) {
        const mergedValue = cell.value * 2;
        scoreGain += mergedValue;
        mergeCount++;
        merged.add(`${last.id}`);
        result[result.length - 1] = {
          ...last,
          value: mergedValue,
          row: newPos.row,
          col: newPos.col,
          prevRow: cell.row,
          prevCol: cell.col,
          mergedFrom: [last.id, cell.id],
          isNew: false,
        };
        targetIndex = result.length;
        moved = true;
      } else {
        if (prevPos.row !== newPos.row || prevPos.col !== newPos.col) moved = true;
        result.push({
          ...cell,
          row: newPos.row,
          col: newPos.col,
          prevRow: cell.row,
          prevCol: cell.col,
          mergedFrom: null,
          isNew: false,
        });
        targetIndex = result.length;
      }
    }
    for (const t of result) {
      newGrid[t.row][t.col] = t;
    }
  }

  return { grid: newGrid, scoreGain, moved, mergeCount };
}

function canMove(grid: (Tile | null)[][]): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (!t) return true;
      const v = t.value;
      if (r < size - 1 && grid[r + 1][c]?.value === v) return true;
      if (c < size - 1 && grid[r][c + 1]?.value === v) return true;
    }
  }
  return false;
}

function hasWon(grid: (Tile | null)[][]): boolean {
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]?.value === 2048) return true;
    }
  }
  return false;
}

function getHighestTile(grid: (Tile | null)[][]): number {
  let max = 0;
  const size = grid.length;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = grid[r][c]?.value ?? 0;
      if (v > max) max = v;
    }
  }
  return max;
}

const CHALLENGE_TARGET = 10000;

function loadBestScore(mode: GameMode): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return 0;
    const parsed = JSON.parse(data);
    return parsed[mode] ?? 0;
  } catch {
    return 0;
  }
}

function saveBestScore(mode: GameMode, score: number): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY) || '{}';
    const parsed = JSON.parse(data);
    parsed[mode] = Math.max(parsed[mode] ?? 0, score);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

function loadStats(): GameStats {
  try {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) return { totalMerges: 0, highestTile: 0, gamesPlayed: 0 };
    return JSON.parse(data);
  } catch {
    return { totalMerges: 0, highestTile: 0, gamesPlayed: 0 };
  }
}

function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function getBestMove(grid: (Tile | null)[][]): Direction | null {
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  let bestDir: Direction | null = null;
  let bestScore = -1;
  for (const d of dirs) {
    const { grid: g, scoreGain, moved } = slideAndMerge(grid, d);
    if (moved && scoreGain >= 0) {
      const highest = getHighestTile(g);
      const score = scoreGain * 3 + highest * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestDir = d;
      }
    }
  }
  return bestDir;
}

export default function Game2048({ onClose }: Game2048Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const gridSize = getGridSize(gameMode);

  const [grid, setGrid] = useState<(Tile | null)[][]>(() => {
    const g = createEmptyGrid(getGridSize('classic'));
    const { grid: g2 } = addRandomTile(g, 0);
    const { grid: g3 } = addRandomTile(g2, 1);
    return g3;
  });
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => loadBestScore('classic'));
  const [nextId, setNextId] = useState(2);
  const [won, setWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [continueAfterWin, setContinueAfterWin] = useState(false);
  const [moves, setMoves] = useState(0);
  const [mergeCount, setMergeCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [undoStack, setUndoStack] = useState<UndoState[]>([]);
  const MAX_UNDOS = 3;

  const [animating, setAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(1);
  const [displayGrid, setDisplayGrid] = useState<(Tile | null)[][]>(grid);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [screenShake, setScreenShake] = useState(0);
  const [comboLevel, setComboLevel] = useState(0);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    try {
      const t = localStorage.getItem('skillzstorm_2048_theme');
      if (t && ['vibrant', 'pastel', 'dark', 'ocean'].includes(t)) return t as ColorTheme;
    } catch {}
    return 'vibrant';
  });
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [noMovesShake, setNoMovesShake] = useState(0);
  const [hintDirection, setHintDirection] = useState<Direction | null>(null);

  const particleIdRef = useRef(0);
  const lastMoveRef = useRef<{ grid: (Tile | null)[][]; direction: Direction } | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const ANIM_DURATION = 180;
  const CELL_SIZE = gridSize === 3 ? 72 : gridSize === 5 ? 52 : 64;
  const GAP = 6;
  const PADDING = 20;
  const BOARD_W = gridSize * CELL_SIZE + (gridSize + 1) * GAP + PADDING * 2;
  const BOARD_H = gridSize * CELL_SIZE + (gridSize + 1) * GAP + PADDING * 2;

  useEffect(() => {
    try {
      localStorage.setItem('skillzstorm_2048_theme', colorTheme);
    } catch {}
  }, [colorTheme]);

  const startNewGame = useCallback((mode: GameMode) => {
    const size = getGridSize(mode);
    const g = createEmptyGrid(size);
    const { grid: g2, nextId: nid } = addRandomTile(addRandomTile(g, 0).grid, 1);
    setGrid(g2);
    setDisplayGrid(g2);
    setNextId(2);
    setScore(0);
    setBestScore(loadBestScore(mode));
    setWon(false);
    setGameOver(false);
    setContinueAfterWin(false);
    setMoves(0);
    setMergeCount(0);
    setUndoStack([]);
    setGameStartTime(Date.now());
    setElapsedSeconds(0);
    setGameMode(mode);
    setShowModeSelect(false);
    setParticles([]);
    setStats((s: GameStats) => {
      const next = { ...s, gamesPlayed: s.gamesPlayed + 1 };
      saveStats(next);
      return next;
    });
    setConfetti([]);
    setScreenShake(0);
    setComboLevel(0);
    setComboDisplay(0);
    playSound('click');
  }, []);

  const performMove = useCallback(
    (direction: Direction) => {
      if (animating || gameOver) return;
      const { grid: newGrid, scoreGain, moved, mergeCount: merges } = slideAndMerge(grid, direction);
      if (!moved) {
        playSound('wrong');
        return;
      }

      setUndoStack((prev) => {
        const next = [...prev, { grid: grid.map((r) => r.map((t) => (t ? { ...t } : null))), score, nextId }];
        return next.slice(-MAX_UNDOS);
      });
      setScore((s) => s + scoreGain);
      setMoves((m) => m + 1);
      setMergeCount((mc) => mc + merges);

      const newCombo = merges > 0 ? (comboLevel + merges) : 0;
      setComboLevel(newCombo);
      if (merges > 1) setComboDisplay(newCombo);

      const highestMerged = getHighestTile(newGrid);
      if (highestMerged >= 512) setScreenShake(12);
      if (highestMerged >= 2048 && !continueAfterWin && !won) {
        setConfetti(
          Array.from({ length: 80 }, (_, i) => ({
            id: particleIdRef.current++,
            x: BOARD_W / 2,
            y: BOARD_H / 2,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.8) * 10,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            life: 1,
            maxLife: 1,
            size: 4 + Math.random() * 6,
            hue: Math.random() * 360,
          }))
        );
        playSound('victory');
      } else if (merges > 0) {
        if (highestMerged >= 512) playSound('explosion');
        else if (merges >= 2) playSound('combo');
        else playSound('coin');
      } else {
        playSound('slide');
      }

      lastMoveRef.current = { grid: newGrid, direction };
      setGrid(newGrid);
      setDisplayGrid(newGrid);
      setAnimating(true);
      setAnimProgress(0);

      const mergedTiles = flattenGrid(newGrid).filter((t) => t.mergedFrom);
      const newParticles: Particle[] = [];
      for (const t of mergedTiles) {
        const cx = PADDING + GAP + (CELL_SIZE + GAP) * (t.col + 0.5);
        const cy = PADDING + GAP + (CELL_SIZE + GAP) * (t.row + 0.5);
        const baseHue = (Math.log2(t.value) * 22) % 360;
        for (let i = 0; i < 10; i++) {
          newParticles.push({
            id: particleIdRef.current++,
            x: cx,
            y: cy,
            vx: Math.cos((i / 10) * Math.PI * 2) * (3 + Math.random() * 3),
            vy: Math.sin((i / 10) * Math.PI * 2) * (3 + Math.random() * 3) - 2,
            life: 1,
            maxLife: 1,
            size: 3 + Math.random() * 5,
            hue: baseHue + (Math.random() - 0.5) * 30,
            saturation: 75,
            lightness: 60,
          });
        }
      }
      if (newParticles.length > 0) setParticles((p) => [...p, ...newParticles]);

      setTimeout(() => {
        const { grid: withNew, nextId: nid } = addRandomTile(newGrid, nextId);
        setGrid(withNew);
        setDisplayGrid(withNew);
        setNextId(nid);
        setAnimating(false);
        setAnimProgress(1); // ensure tiles stay in final position
        if (!continueAfterWin && !won && hasWon(withNew)) setWon(true);
        if (!canMove(withNew)) {
          setGameOver(true);
          setNoMovesShake(20);
          playSound('gameover');
          setStats((s: GameStats) => {
            const next = {
              ...s,
              totalMerges: s.totalMerges + mergeCount + merges,
              highestTile: Math.max(s.highestTile, getHighestTile(withNew)),
            };
            saveStats(next);
            return next;
          });
        }
        const newBest = Math.max(score + scoreGain, bestScore);
        if (newBest > bestScore) {
          setBestScore(newBest);
          saveBestScore(gameMode, newBest);
        }
      }, ANIM_DURATION);
    },
    [grid, score, nextId, animating, gameOver, won, continueAfterWin, comboLevel, gameMode, bestScore]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        performMove('up');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        performMove('down');
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        performMove('left');
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        performMove('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performMove]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gameOver && !animating) setElapsedSeconds(Math.floor((Date.now() - gameStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, animating, gameStartTime]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const minSwipe = 30;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > minSwipe) performMove('right');
        else if (dx < -minSwipe) performMove('left');
      } else {
        if (dy > minSwipe) performMove('down');
        else if (dy < -minSwipe) performMove('up');
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [performMove]);

  const handleUndo = () => {
    if (undoStack.length === 0 || animating || gameOver) return;
    const last = undoStack[undoStack.length - 1];
    setGrid(last.grid);
    setDisplayGrid(last.grid);
    setScore(last.score);
    setNextId(last.nextId);
    setUndoStack((prev) => prev.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setGameOver(false);
    playSound('click');
  };

  const handleRestart = () => {
    startNewGame(gameMode);
    playSound('click');
  };

  const handleShowHint = () => {
    if (gameOver || animating) return;
    const dir = getBestMove(grid);
    setHintDirection(dir);
    if (dir) playSound('click');
    setTimeout(() => setHintDirection(null), 1200);
  };

  // Animation loop for interpolated positions and effects
  useEffect(() => {
    if (!animating && particles.length === 0 && confetti.length === 0 && screenShake <= 0 && noMovesShake <= 0) return;

    const start = Date.now();
    const run = () => {
      const dt = (Date.now() - start) / ANIM_DURATION;
      const progress = Math.min(1, dt);
      if (animating) setAnimProgress(progress);

      setParticles((p) =>
        p
          .map((part) => ({
            ...part,
            x: part.x + part.vx,
            y: part.y + part.vy,
            vy: part.vy + 0.3,
            life: part.life - 0.03,
          }))
          .filter((part) => part.life > 0)
      );

      setConfetti((c) =>
        c
          .map((part) => ({
            ...part,
            x: part.x + part.vx,
            y: part.y + part.vy,
            vy: part.vy + 0.4,
            rotation: part.rotation + part.rotSpeed,
            life: part.life - 0.02,
          }))
          .filter((part) => part.life > 0)
      );

      setScreenShake((s) => Math.max(0, s - 1));
      setNoMovesShake((n) => Math.max(0, n - 0.8));
      if (comboDisplay > 0) setComboDisplay((c) => Math.max(0, c - 0.02));

      animFrameRef.current = requestAnimationFrame(run);
    };
    animFrameRef.current = requestAnimationFrame(run);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animating, particles.length, confetti.length, screenShake, noMovesShake, ANIM_DURATION]);

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = BOARD_W;
    const h = BOARD_H;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      const totalShake = Math.max(screenShake, noMovesShake);
      const shakeX = (Math.random() - 0.5) * totalShake;
      const shakeY = (Math.random() - 0.5) * totalShake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const size = displayGrid.length;

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, '#1e1b4b');
      bgGrad.addColorStop(1, '#312e81');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 16);
      ctx.fill();

      // Grid background
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.beginPath();
      ctx.roundRect(PADDING, PADDING, size * CELL_SIZE + (size + 1) * GAP, size * CELL_SIZE + (size + 1) * GAP, 12);
      ctx.fill();

      // Cell backgrounds
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const x = PADDING + GAP + c * (CELL_SIZE + GAP);
          const y = PADDING + GAP + r * (CELL_SIZE + GAP);
          const cellGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
          cellGrad.addColorStop(0, 'rgba(129, 140, 248, 0.2)');
          cellGrad.addColorStop(1, 'rgba(99, 102, 241, 0.25)');
          ctx.fillStyle = cellGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, CELL_SIZE, CELL_SIZE, 8);
          ctx.fill();
        }
      }

      // Tiles
      const tiles = flattenGrid(displayGrid);
      for (const tile of tiles) {
        let x = PADDING + GAP + tile.col * (CELL_SIZE + GAP);
        let y = PADDING + GAP + tile.row * (CELL_SIZE + GAP);

        if (animating && lastMoveRef.current) {
          const fromX = PADDING + GAP + tile.prevCol * (CELL_SIZE + GAP);
          const fromY = PADDING + GAP + tile.prevRow * (CELL_SIZE + GAP);
          const t = easeOutCubic(animProgress);
          x = fromX + (x - fromX) * t;
          y = fromY + (y - fromY) * t;
        }

        const { start, end, shadow } = getTileGradient(tile.value, colorTheme);
        const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        grad.addColorStop(0, start);
        grad.addColorStop(1, end);
        ctx.fillStyle = grad;

        let scale = 1;
        if (tile.mergedFrom && animating) {
          const bounce = Math.sin(animProgress * Math.PI);
          scale = 1 + 0.22 * bounce - 0.05 * Math.sin(animProgress * Math.PI * 2);
        }
        if (tile.isNew) {
          scale = easeOutBack(Math.min(1, animProgress * 3));
        }

        const cx = x + CELL_SIZE / 2;
        const cy = y + CELL_SIZE / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);

        ctx.shadowColor = shadow;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = getTileTextColor(tile.value);
        const fontSize = tile.value >= 1024 ? 18 : tile.value >= 256 ? 24 : tile.value >= 64 ? 28 : 32;
        ctx.font = `bold ${fontSize}px "SF Pro Display", "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(tile.value), x + CELL_SIZE / 2, y + CELL_SIZE / 2);

        ctx.restore();
      }

      // Particles
      for (const p of particles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const c of confetti) {
        ctx.globalAlpha = c.life / c.maxLife;
        ctx.fillStyle = `hsl(${c.hue}, 80%, 60%)`;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    const id = requestAnimationFrame(function loop() {
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, [displayGrid, animProgress, particles, confetti, screenShake, noMovesShake, gridSize, colorTheme]);

  const challengeWon = gameMode === 'challenge' && score >= CHALLENGE_TARGET;
  const highestTile = getHighestTile(grid);

  return (
    <div className="game-card bg-gradient-to-br from-slate-900 to-indigo-950 border-2 border-indigo-500/30 text-white min-h-[600px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">
          2048
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModeSelect((s) => !s)}
            className="btn-elite btn-elite-ghost text-sm capitalize"
          >
            {gameMode}
          </button>
          <button onClick={onClose} className="btn-elite btn-elite-ghost">
            Close
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/30">
        <span className="w-full text-sm text-indigo-200 font-medium">Theme</span>
        {(['vibrant', 'pastel', 'dark', 'ocean'] as ColorTheme[]).map((t) => (
          <button
            key={t}
            onClick={() => setColorTheme(t)}
            className={`btn-elite text-sm capitalize ${t === colorTheme ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {showModeSelect && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/30">
          <span className="w-full text-sm text-indigo-200 font-medium">Game Mode</span>
          {(['classic', 'mini', 'big', 'challenge'] as GameMode[]).map((m) => (
            <button
              key={m}
              onClick={() => startNewGame(m)}
              className={`btn-elite text-sm capitalize ${m === gameMode ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
            >
              {m === 'classic' ? '4×4' : m === 'mini' ? '3×3' : m === 'big' ? '5×5' : `Challenge (${CHALLENGE_TARGET})`}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-indigo-900/50 px-3 py-2 border border-indigo-500/20">
          <div className="text-xs text-indigo-300">Score</div>
          <div className="text-lg font-bold text-amber-300">{score}</div>
        </div>
        <div className="rounded-lg bg-indigo-900/50 px-3 py-2 border border-indigo-500/20">
          <div className="text-xs text-indigo-300">Best</div>
          <div className="text-lg font-bold text-amber-400">{bestScore}</div>
        </div>
        <div className="rounded-lg bg-indigo-900/50 px-3 py-2 border border-indigo-500/20">
          <div className="text-xs text-indigo-300">Moves</div>
          <div className="text-lg font-bold">{moves}</div>
        </div>
        <div className="rounded-lg bg-indigo-900/50 px-3 py-2 border border-indigo-500/20">
          <div className="text-xs text-indigo-300">Time</div>
          <div className="text-lg font-bold">
            {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3 text-sm text-indigo-200">
        <span>Highest: {highestTile || '—'}</span>
        <span>Merges: {mergeCount}</span>
        <span>Stats: {stats.gamesPlayed} games · {stats.totalMerges} merges · Best tile {stats.highestTile || '—'}</span>
        {comboDisplay > 0 && (
          <span className="text-amber-400 font-bold animate-pulse">Combo x{Math.floor(comboDisplay)}!</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {undoStack.length > 0 && (
          <button
            onClick={handleUndo}
            disabled={animating || gameOver}
            className="btn-elite btn-elite-ghost text-sm"
          >
            Undo ({undoStack.length}/{MAX_UNDOS})
          </button>
        )}
        <button
          onClick={handleShowHint}
          disabled={animating || gameOver}
          className="btn-elite btn-elite-ghost text-sm"
        >
          Hint
        </button>
      </div>
      {hintDirection && (
        <div className="mb-3 text-amber-400 font-bold animate-pulse">
          → Swipe {hintDirection === 'up' ? '↑' : hintDirection === 'down' ? '↓' : hintDirection === 'left' ? '←' : '→'}
        </div>
      )}

      {won && !continueAfterWin && !gameOver && (
        <div className="mb-4 p-4 rounded-xl bg-amber-500/20 border border-amber-400/40 flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-amber-300 text-lg">🎉 You reached 2048!</span>
          <button
            onClick={() => {
              setContinueAfterWin(true);
              playSound('correct');
            }}
            className="btn-elite btn-elite-primary"
          >
            Continue
          </button>
        </div>
      )}

      {challengeWon && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 font-bold text-emerald-300">
          🏆 Challenge Complete! Score: {score} ≥ {CHALLENGE_TARGET}
        </div>
      )}

      {gameOver && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/40 font-bold text-red-300">
          Game Over — No moves left.
        </div>
      )}

      <p className="text-xs text-indigo-300 mb-3">
        Arrow keys or swipe to slide. Merge matching tiles. Reach 2048!
      </p>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl mx-auto game-active"
        style={{ width: '100%', maxWidth: BOARD_W, aspectRatio: `${BOARD_W}/${BOARD_H}`, touchAction: 'none' }}
      >
        <canvas ref={canvasRef} className="block w-full h-full" style={{ width: '100%', height: '100%', touchAction: 'none' }} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={handleRestart} className="btn-elite btn-elite-primary">
          New Game
        </button>
        <button onClick={onClose} className="btn-elite btn-elite-ghost">
          Close
        </button>
      </div>
    </div>
  );
}
