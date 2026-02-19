/* ═══════════════════════════════════════════════════════════════════════════════
   TETRIS — Elite Arcade Edition
   Canvas-based • SRS rotation • Ghost piece • Hold • T-spin • 7-bag
   Line clear animations • Multiple game modes • Lock delay • Particles
   Full game loop • Gradient blocks • Background particles • Statistics
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';
import TouchControls, { isTouchDevice, haptic } from '../TouchControls';
import {
  isMobile,
  formatScore,
  createBurstParticles,
  updateParticles,
  drawParticles,
  createScreenShake,
  updateScreenShake,
  applyScreenShake,
  createFloatingText,
  updateFloatingTexts,
  drawFloatingTexts,
  type Particle as UtilParticle,
  type ScreenShake as ShakeState,
  type FloatingText,
} from '../GameUtils';

interface TetrisGameProps {
  onClose: () => void;
}

/*
 * TetrisGame expects { onClose: () => void }
 * Renders canvas-based Tetris with full game loop (requestAnimationFrame).
 */

/* ─── Grid & timing constants ───────────────────────────────────────────────── */
const COLS = 10;
const ROWS = 20;
const CELL = 24;
const PREVIEW_CELL = 14;
const W = COLS * CELL + 120;
const H = ROWS * CELL;
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
const MARATHON_GOAL_LEVEL = 20;
const SPRINT_GOAL_LINES = 40;
const ULTRA_DURATION_MS = 120000;
const HIGH_SCORE_KEY = 'skillzstorm_tetris_hs';

type GameMode = 'marathon' | 'sprint' | 'ultra' | 'zen';
type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface Cell {
  type: PieceType;
  color: string;
  placedAt?: number;
}

// Piece shapes: [rotation_state][row][col]
const PIECE_SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  O: [[[1,1],[1,1]]],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ],
};

const PIECE_COLORS: Record<PieceType, string> = {
  I: '#06b6d4', O: '#f59e0b', T: '#8b5cf6', S: '#22c55e',
  Z: '#ef4444', J: '#3b82f6', L: '#f97316',
};
const PIECE_GRADIENTS: Record<PieceType, { light: string; base: string; dark: string }> = {
  I: { base: '#06b6d4', light: '#67e8f9', dark: '#0891b2' },
  O: { base: '#eab308', light: '#fde047', dark: '#ca8a04' },
  T: { base: '#a855f7', light: '#c084fc', dark: '#9333ea' },
  S: { base: '#22c55e', light: '#4ade80', dark: '#16a34a' },
  Z: { base: '#ef4444', light: '#f87171', dark: '#dc2626' },
  J: { base: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
  L: { base: '#f97316', light: '#fb923c', dark: '#ea580c' },
};

// SRS Wall Kick Data
// Format: [from_state-to_state] = [[dx,dy], ...] - offsets to try
// J, L, S, Z pieces share the same kick table
const JLSZ_KICKS: Record<string, [number, number][]> = {
  '0-1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],   // 0° → 90°
  '1-0': [[0,0],[1,0],[1,-1],[0,2],[1,2]],        // 90° → 0°
  '1-2': [[0,0],[1,0],[1,-1],[0,2],[1,2]],        // 90° → 180°
  '2-1': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],    // 180° → 90°
  '2-3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],       // 180° → 270°
  '3-2': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],     // 270° → 180°
  '3-0': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],     // 270° → 0°
  '0-3': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],       // 0° → 270°
};

// I-piece has its own kick table (different offsets)
const I_KICKS: Record<string, [number, number][]> = {
  '0-1': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '1-0': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '1-2': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '2-1': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '2-3': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '3-2': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '3-0': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '0-3': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

// O-piece has no rotation, so no kick table needed

/**
 * Get the appropriate kick table for a piece rotation.
 * I-piece uses separate table; J/L/S/Z share JLSZ; O returns identity.
 */
function getKicks(piece: PieceType, from: number, to: number): [number, number][] {
  const key = `${from}-${to}`;
  if (piece === 'I') {
    return I_KICKS[key] || [[0,0]];
  } else if (piece === 'O') {
    return [[0,0]]; // O-piece doesn't rotate
  } else {
    return JLSZ_KICKS[key] || [[0,0]];
  }
}

/**
 * Create a shuffled bag of all 7 piece types (7-bag system).
 * Ensures no more than 2 of same piece in 12; Fisher-Yates shuffle.
 */
function createBag(): PieceType[] {
  const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // Fisher-Yates shuffle
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

export default function TetrisGame({ onClose }: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const clearLineParticlesRef = useRef<UtilParticle[]>([]);
  const floatingScoreRef = useRef<FloatingText[]>([]);
  const [showTouch, setShowTouch] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('marathon');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>({ marathon: 0, sprint: 0, ultra: 0, zen: 0 });
  const [stats, setStats] = useState({ linesCleared: 0, piecesPlaced: 0, tspins: 0, maxCombo: 0 });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const linesRef = useRef(0);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  linesRef.current = lines;
  scoreRef.current = score;
  levelRef.current = level;
  
  const gameRef = useRef({
    board: [] as (Cell | null)[][],
    piece: null as { type: PieceType; x: number; y: number; r: number } | null,
    nextBag: [] as PieceType[],
    hold: null as PieceType | null,
    canHold: true,  // Can only hold once per piece placement
    lastDrop: 0,
    dropInterval: 1000,
    lastTSpin: false,
    lastLineCount: 0,
    combo: 0,
    lockTimer: 0,
    lockResets: 0,
    gameStartTime: 0,
    bgParticles: [] as { x: number; y: number; vx: number; vy: number; size: number; hue: number; alpha: number }[],
    clearAnimRows: [] as number[],
    clearAnimStart: 0,
    pendingScore: 0,
    pendingLines: 0,
    pendingCombo: 0,
  });

  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const sprintTimeRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) setHighScores(prev => ({ ...prev, ...JSON.parse(stored) }));
    } catch {}
  }, []);

  const saveHighScore = useCallback((mode: GameMode, s: number) => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[mode] = Math.max(parsed[mode] ?? 0, s);
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(parsed));
      setHighScores(prev => ({ ...prev, [mode]: parsed[mode] }));
    } catch {}
  }, []);

  const initBgParticles = useCallback(() => {
    const particles: { x: number; y: number; vx: number; vy: number; size: number; hue: number; alpha: number }[] = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 - 1,
        size: 1 + Math.random() * 1.5, hue: Math.random() * 50 + 210, alpha: 0.02 + Math.random() * 0.04,
      });
    }
    return particles;
  }, []);

  /**
   * Initialize an empty game board
   */
  const initBoard = useCallback(() => {
    const board: (Cell | null)[][] = [];
    for (let y = 0; y < ROWS; y++) {
      board[y] = [];
      for (let x = 0; x < COLS; x++) {
        board[y][x] = null;
      }
    }
    return board;
  }, []);

  /**
   * Spawn a new piece at the top center of the board
   * Returns the piece type if successful, null if game over
   */
  const spawnPiece = useCallback((): PieceType | null => {
    const g = gameRef.current;
    // Refill bag if needed (7-bag system)
    if (g.nextBag.length < 7) {
      g.nextBag.push(...createBag());
    }
    const type = g.nextBag.shift()!;
    const shapes = PIECE_SHAPES[type];
    const w = shapes[0][0].length;
    const x = Math.floor((COLS - w) / 2);
    const y = 0;
    g.piece = { type, x, y, r: 0 };
    g.lockTimer = performance.now();
    g.lockResets = 0;
    if (collides(g.board, g.piece)) {
      return null; // Game over
    }
    return type;
  }, []);

  /**
   * Check if a piece position collides with walls or existing blocks.
   * Used for movement, rotation (with wall kicks), ghost Y, and spawn check.
   */
  function collides(
    board: (Cell | null)[][],
    p: { type: PieceType; x: number; y: number; r: number }
  ): boolean {
    const shapes = PIECE_SHAPES[p.type];
    const s = shapes[p.r % shapes.length];
    for (let dy = 0; dy < s.length; dy++) {
      for (let dx = 0; dx < s[dy].length; dx++) {
        if (s[dy][dx]) {
          const nx = p.x + dx;
          const ny = p.y + dy;
          // Check boundaries
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          // Check collision with existing blocks
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  /**
   * Lock the current piece onto the board and check for line clears
   */
  function lockPiece() {
    const g = gameRef.current;
    if (!g.piece) return;
    
    const shapes = PIECE_SHAPES[g.piece.type];
    const s = shapes[g.piece.r % shapes.length];
    const color = PIECE_COLORS[g.piece.type];
    
    // Place piece blocks on board
    for (let dy = 0; dy < s.length; dy++) {
      for (let dx = 0; dx < s[dy].length; dx++) {
        if (s[dy][dx]) {
          const ny = g.piece.y + dy;
          const nx = g.piece.x + dx;
          if (ny >= 0) {
            g.board[ny][nx] = { type: g.piece.type, color, placedAt: performance.now() };
          }
        }
      }
    }
    
    // Find completed lines
    let cleared: number[] = [];
    for (let y = ROWS - 1; y >= 0; y--) {
      if (g.board[y].every(c => c !== null)) {
        cleared.push(y);
      }
    }
    cleared.sort((a, b) => a - b);
    
    // Score: 100/300/500/800 for 1/2/3/4 lines; T-spin bonuses; combo +50
    let pts = 0;
    if (cleared.length === 1) pts = 100;
    else if (cleared.length === 2) pts = 300;
    else if (cleared.length === 3) pts = 500;
    else if (cleared.length === 4) pts = 800; // Four-line clear!
    
    // T-spin bonus scoring
    if (g.lastTSpin && g.piece.type === 'T') {
      if (cleared.length === 0) pts = 400;      // T-spin no lines
      else if (cleared.length === 1) pts = 800;  // T-spin single
      else if (cleared.length === 2) pts = 1200; // T-spin double
      else pts = 1600;                            // T-spin triple
    }
    
    pts *= level;
    const comboMultiplier = cleared.length > 0 ? 1 + g.combo * 0.5 : 1;
    pts *= comboMultiplier;
    const lineBonus = cleared.length > 0 ? 50 * (g.combo + 1) * comboMultiplier : 0;
    const newCombo = cleared.length > 0 ? g.combo + 1 : 0;
    setStats(s => ({
      ...s,
      piecesPlaced: s.piecesPlaced + 1,
      linesCleared: s.linesCleared + cleared.length,
      tspins: s.tspins + (g.lastTSpin && g.piece?.type === 'T' ? 1 : 0),
      maxCombo: Math.max(s.maxCombo, newCombo),
    }));
    
    // Reset T-spin flag and allow holding again
    g.lastTSpin = false;
    g.piece = null;
    g.canHold = true;

    if (cleared.length > 0) {
      if (cleared.length === 4) { playSound('tetris'); playSound('explosion'); }
      else if (cleared.length >= 2) { playSound('line_complete'); playSound('combo'); }
      else playSound('line_complete');
      if (newCombo >= 3) playSound('streak');
      g.clearAnimRows = cleared;
      g.clearAnimStart = performance.now();
      g.pendingScore = pts + lineBonus;
      g.pendingLines = cleared.length;
      g.pendingCombo = newCombo;
      shakeRef.current = createScreenShake(2 + cleared.length, 8 + cleared.length * 2);
      const midY = cleared.reduce((a, b) => a + b, 0) / cleared.length;
      const cx = (COLS * CELL) / 2;
      const cy = (midY + 0.5) * CELL;
      for (const rowY of cleared) {
        const rowCx = (COLS * CELL) / 2;
        const rowCy = (rowY + 0.5) * CELL;
        const colors = cleared.length === 4
          ? ['#ffd700', '#ff6b6b', '#4d96ff', '#22c55e', '#ffffff']
          : ['#67e8f9', '#c084fc', '#f87171', '#ffffff'];
        clearLineParticlesRef.current.push(...createBurstParticles(rowCx, rowCy, 20, {
          speed: 6,
          colors,
          decay: 0.025,
          gravity: 0.08,
        }));
      }
      const scoreText = cleared.length === 4 ? 'TETRIS!' : `${cleared.length} lines`;
      const bonusText = g.combo > 0 ? ` x${g.combo + 1} combo` : '';
      floatingScoreRef.current.push(createFloatingText(cx, cy - 20, scoreText + bonusText, '#fbbf24', 18, 60));
    } else {
      // No lines cleared, spawn next piece immediately
      g.lastLineCount = 0;
      const next = spawnPiece();
      if (next === null) { playSound('gameover'); setGameOver(true); }
    }
  }

  /**
   * Calculate the Y position where the ghost piece should be rendered.
   * Iterates downward until collision; used for ghost display and hard drop.
   */
  function getGhostY(): number {
    const g = gameRef.current;
    if (!g.piece) return 0;
    let y = g.piece.y;
    while (!collides(g.board, { ...g.piece, y: y + 1 })) {
      y++;
    }
    return y;
  }

  /**
   * Attempt to rotate the current piece using SRS (Super Rotation System).
   * Tries each wall-kick offset; T-spin detection when T rotates into 2+ filled corners.
   * @param direction - 1 for clockwise, -1 for counter-clockwise
   */
  function tryRotate(direction: number) {
    const g = gameRef.current;
    if (!g.piece) return;
    if (g.piece.type === 'O') return; // O-piece doesn't rotate
    
    const shapes = PIECE_SHAPES[g.piece.type];
    const nextR = (g.piece.r + direction + shapes.length) % shapes.length;
    const kicks = getKicks(g.piece.type, g.piece.r, nextR);
    
    // Try each kick offset
    for (const [dx, dy] of kicks) {
      const test = {
        ...g.piece,
        x: g.piece.x + dx,
        y: g.piece.y - dy, // Note: dy is subtracted (SRS convention)
        r: nextR,
      };
      
      if (!collides(g.board, test)) {
        // Rotation successful
        const wasT = g.piece.type === 'T';
        const prevSquares = getTSquare(g.piece);
        
        g.piece.x = test.x;
        g.piece.y = test.y;
        g.piece.r = nextR;
        
        // T-spin detection
        if (wasT) {
          const newSquares = getTSquare(g.piece);
          // Check if T-piece moved (not just rotated in place)
          const overlap = prevSquares.some(p =>
            newSquares.some(n => n[0] === p[0] && n[1] === p[1])
          );
          
          // Check if at least 2 of the 3 front squares are filled
          const minY = Math.min(...newSquares.map(p => p[1]));
          const threeFilled = [0, 1, 2].filter(i => {
            const cx = g.piece!.x + (i === 0 ? 0 : i === 1 ? 1 : 2);
            return (
              cx >= 0 &&
              cx < COLS &&
              minY >= 0 &&
              g.board[minY]?.[cx] !== null
            );
          }).length;
          
          // T-spin detected if piece moved and 2+ front squares filled
          if (!overlap && threeFilled >= 2) {
            g.lastTSpin = true;
          }
        }
        g.lockTimer = performance.now();
        g.lockResets = Math.min((g.lockResets ?? 0) + 1, MAX_LOCK_RESETS);
        playSound('tick');
        return;
      }
    }
  }

  /**
   * Get the squares occupied by a T-piece (for T-spin detection)
   */
  function getTSquare(
    p: { type: PieceType; x: number; y: number; r: number }
  ): [number, number][] {
    if (p.type !== 'T') return [];
    const shapes = PIECE_SHAPES.T;
    const s = shapes[p.r % shapes.length];
    const out: [number, number][] = [];
    for (let dy = 0; dy < s.length; dy++) {
      for (let dx = 0; dx < s[dy].length; dx++) {
        if (s[dy][dx]) {
          out.push([p.x + dx, p.y + dy]);
        }
      }
    }
    return out;
  }

  /**
   * Hold the current piece or swap with held piece (C or Shift).
   * Can only be used once per piece placement; resets on lock.
   */
  function tryHold() {
    const g = gameRef.current;
    if (!g.canHold || !g.piece) return;
    
    const type = g.piece.type;
    
    if (g.hold) {
      // Swap: place held piece, hold current piece
      const shapes = PIECE_SHAPES[g.hold];
      const w = shapes[0][0].length;
      g.piece = {
        type: g.hold,
        x: Math.floor((COLS - w) / 2),
        y: 0,
        r: 0,
      };
      g.hold = type;
    } else {
      // First hold: just hold current piece and spawn next
      g.hold = type;
      const next = spawnPiece();
      if (next === null) setGameOver(true);
    }
    
    g.canHold = false;
    playSound('click');
  }

  /**
   * Move piece left or right
   */
  function move(dx: number) {
    const g = gameRef.current;
    if (!g.piece) return;
    const test = { ...g.piece, x: g.piece.x + dx };
    if (!collides(g.board, test)) {
      g.piece.x = test.x;
      g.lockTimer = performance.now();
      g.lockResets = Math.min((g.lockResets ?? 0) + 1, MAX_LOCK_RESETS);
      playSound('tick');
    }
  }

  /**
   * Soft drop: move piece down one cell, 1 point per cell.
   * Lock delay resets on each move; immediate lock when piece lands.
   */
  function softDrop() {
    const g = gameRef.current;
    if (!g.piece) return;
    const test = { ...g.piece, y: g.piece.y + 1 };
    if (!collides(g.board, test)) {
      g.piece.y = test.y;
      setScore(s => s + 1);
    } else {
      lockPiece();
    }
  }

  /**
   * Hard drop: instantly drop to ghost position, 2 points per cell.
   * Triggers lock immediately; plays slide sound.
   */
  function hardDrop() {
    const g = gameRef.current;
    if (!g.piece) return;
    const ghostY = getGhostY();
    const dist = ghostY - g.piece.y;
    setScore(s => s + dist * 2);
    g.piece.y = ghostY;
    playSound('slide');
    lockPiece();
  }

  // Initialize game when started
  useEffect(() => {
    if (!started || gameOver) return;
    gameRef.current.board = initBoard();
    gameRef.current.hold = null;
    gameRef.current.canHold = true;
    gameRef.current.nextBag = [];
    gameRef.current.combo = 0;
    gameRef.current.bgParticles = initBgParticles();
    gameRef.current.gameStartTime = performance.now();
    spawnPiece();
  }, [started, gameOver, initBoard, initBgParticles, spawnPiece]);

  // Keyboard controls
  useEffect(() => {
    if (!started || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.piece) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          tryRotate(1); // Clockwise
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'h':
        case 'H':
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          tryHold();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, gameOver]);

  // Touch detection
  useEffect(() => { setShowTouch(isTouchDevice()); }, []);

  // Touch controls for canvas
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const canvas = canvasRef.current;
      if (!canvas) { touchStartRef.current = null; return; }
      const rect = canvas.getBoundingClientRect();
      const touchX = t.clientX - rect.left;
      const touchY = t.clientY - rect.top;
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dt = Date.now() - touchStartRef.current.time;

      if (absDx < 20 && absDy < 20 && dt < 250) {
        const boardW = COLS * CELL;
        if (touchX < boardW) {
          if (touchX < boardW / 2) { move(-1); haptic('light'); }
          else { move(1); haptic('light'); }
        }
        touchStartRef.current = null;
        return;
      }

      if (absDy > absDx && absDy > 35) {
        if (dy > 0) {
          hardDrop();
          haptic('medium');
        } else {
          tryRotate(1);
          haptic('light');
        }
      } else if (absDx > absDy && absDx > 30) {
        move(dx > 0 ? 1 : -1);
        haptic('light');
      }
      touchStartRef.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [started, gameOver]);

  // Update drop speed: smoother ramping per level (Zen: constant; others: eased curve)
  useEffect(() => {
    if (!started || gameOver) return;
    const g = gameRef.current;
    if (gameModeRef.current === 'zen') {
      g.dropInterval = 1000;
    } else {
      const lv = Math.max(1, level);
      const t = (lv - 1) / 19;
      const eased = 1 - Math.pow(t, 0.75);
      g.dropInterval = Math.max(80, 1000 * eased);
    }
  }, [started, gameOver, level]);

  // Victory checks for Marathon, Sprint; timer for Ultra
  useEffect(() => {
    if (!started || gameOver) return;
    const mode = gameModeRef.current;
    if (mode === 'marathon' && level >= MARATHON_GOAL_LEVEL) {
      playSound('victory');
      saveHighScore('marathon', score);
      setGameOver(true);
    }
  }, [started, gameOver, level, score, saveHighScore]);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      setTimeElapsed(t => {
        const elapsed = t + 0.1;
        if (gameModeRef.current === 'ultra' && elapsed >= ULTRA_DURATION_MS / 1000) {
          playSound('gameover');
          saveHighScore('ultra', scoreRef.current);
          setGameOver(true);
        }
        return elapsed;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [started, gameOver, saveHighScore]);

  useEffect(() => {
    if (!started || gameOver) return;
    if (gameModeRef.current === 'sprint' && lines >= SPRINT_GOAL_LINES) {
      sprintTimeRef.current = timeElapsed;
      playSound('victory');
      saveHighScore('sprint', Math.round(10000 / Math.max(0.1, timeElapsed)));
      setGameOver(true);
    }
  }, [started, gameOver, lines, timeElapsed, saveHighScore]);

  // Save high score on game over (Ultra: by score; Marathon: on victory)
  useEffect(() => {
    if (!gameOver || !started) return;
    const mode = gameModeRef.current;
    if (mode === 'ultra') saveHighScore('ultra', scoreRef.current);
  }, [gameOver, started, saveHighScore]);

  // Main game loop and rendering
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const loop = () => {
      const g = gameRef.current;
      const now = performance.now();

      // Handle line clear animation
      if (g.clearAnimRows.length > 0) {
        if (now - g.clearAnimStart >= 400) {
          // Animation complete, remove lines
          const sorted = [...g.clearAnimRows].sort((a, b) => b - a);
          for (const y of sorted) {
            g.board.splice(y, 1);
          }
          // Add empty lines at top
          for (let i = 0; i < sorted.length; i++) {
            g.board.unshift(Array(COLS).fill(null));
          }
          // Update score and level
          setScore(s => s + g.pendingScore);
          const newLines = linesRef.current + g.pendingLines;
          setLines(newLines);
          setLevel(Math.max(1, Math.floor(newLines / 10) + 1));
          g.combo = g.pendingCombo;
          g.lastLineCount = g.pendingLines;
          g.clearAnimRows = [];
          // Spawn next piece
          const next = spawnPiece();
          if (next === null) { playSound('gameover'); setGameOver(true); }
        }
      } else if (g.piece && now - g.lastDrop >= g.dropInterval) {
        g.lastDrop = now;
        const test = { ...g.piece, y: g.piece.y + 1 };
        if (!collides(g.board, test)) {
          g.piece.y = test.y;
        } else {
          if (now - (g.lockTimer ?? now) >= LOCK_DELAY_MS) lockPiece();
        }
      }

      // Background particles
      for (const p of g.bgParticles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (shakeRef.current.active) applyScreenShake(ctx, shakeRef.current);
      for (const p of g.bgParticles) {
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, COLS * CELL, H);

      // Draw board
      const clearSet = new Set(g.clearAnimRows);
      const flashT = g.clearAnimRows.length > 0
        ? Math.min(1, (now - g.clearAnimStart) / 400)
        : 0;
      const flashAlpha = flashT < 0.5 ? flashT * 2 : 2 - flashT * 2;

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const c = gameRef.current.board[y][x];
          if (c) {
            const colors = PIECE_GRADIENTS[c.type] || { base: c.color, light: c.color, dark: c.color };
            const grad = ctx.createLinearGradient(x * CELL, y * CELL, x * CELL + CELL, y * CELL + CELL);
            grad.addColorStop(0, colors.light);
            grad.addColorStop(0.35, colors.base);
            grad.addColorStop(1, colors.dark);
            ctx.fillStyle = grad;
            ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
            if (c.placedAt && !clearSet.has(y)) {
              const age = now - c.placedAt;
              if (age < 800) {
                const shine = Math.max(0, 1 - age / 800) * 0.3;
                ctx.fillStyle = `rgba(255,255,255,${shine})`;
                ctx.fillRect(x * CELL + 2, y * CELL + 2, (CELL - 4) / 2, (CELL - 4) / 2);
              }
            }
            if (clearSet.has(y)) {
              ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.8})`;
              ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
            }
          } else {
            ctx.strokeStyle = '#e5e7eb';
            ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }

      // Draw ghost piece: semi-transparent preview of landing position
      const ghostY = getGhostY();
      if (g.piece && ghostY !== g.piece.y) {
        ctx.fillStyle = 'rgba(128, 128, 128, 0.3)'; // Semi-transparent gray
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)';
        ctx.lineWidth = 1;
        const shapes = PIECE_SHAPES[g.piece.type];
        const s = shapes[g.piece.r % shapes.length];
        for (let dy = 0; dy < s.length; dy++) {
          for (let dx = 0; dx < s[dy].length; dx++) {
            if (s[dy][dx]) {
              const x = (g.piece.x + dx) * CELL + 1;
              const y = (ghostY + dy) * CELL + 1;
              ctx.fillRect(x, y, CELL - 2, CELL - 2);
              ctx.strokeRect(x, y, CELL - 2, CELL - 2);
            }
          }
        }
      }

      // Draw current piece: gradient fill with subtle white edge highlight
      if (g.piece) {
        const colors = PIECE_GRADIENTS[g.piece.type];
        const pieceShapes = PIECE_SHAPES[g.piece.type];
        const pieceS = pieceShapes[g.piece.r % pieceShapes.length];
        for (let dy = 0; dy < pieceS.length; dy++) {
          for (let dx = 0; dx < pieceS[dy].length; dx++) {
            if (pieceS[dy][dx]) {
              const px = (g.piece.x + dx) * CELL, py = (g.piece.y + dy) * CELL;
              const grad = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
              grad.addColorStop(0, colors.light);
              grad.addColorStop(0.4, colors.base);
              grad.addColorStop(1, colors.dark);
              ctx.fillStyle = grad;
              ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
              ctx.strokeStyle = 'rgba(255,255,255,0.35)';
              ctx.lineWidth = 1;
              ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
            }
          }
        }
      }

      // Draw UI panel
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, COLS * CELL + 12, 30);
      ctx.fillText(`Level: ${level}`, COLS * CELL + 12, 50);
      ctx.fillText(`Lines: ${lines}`, COLS * CELL + 12, 70);
      
      // Speed indicator
      const speedMs = g.dropInterval;
      const speedText = speedMs >= 1000 ? `${(speedMs / 1000).toFixed(1)}s` : `${speedMs}ms`;
      ctx.font = '10px Inter';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`Speed: ${speedText}`, COLS * CELL + 12, 90);
      ctx.fillText(`T-spins: ${stats.tspins}`, COLS * CELL + 12, 102);
      ctx.fillText(`Combo: ${stats.maxCombo}`, COLS * CELL + 12, 114);
      if (gameModeRef.current === 'ultra') ctx.fillText(`${Math.floor(Math.max(0, ULTRA_DURATION_MS / 1000 - timeElapsed))}s`, COLS * CELL + 12, 126);
      else if (gameModeRef.current === 'sprint') ctx.fillText(`Goal: 40`, COLS * CELL + 12, 126);
      else if (gameModeRef.current === 'marathon') ctx.fillText(`Lv ${MARATHON_GOAL_LEVEL}`, COLS * CELL + 12, 126);
      ctx.fillText(`HS: ${gameModeRef.current === 'sprint' && (highScores[gameModeRef.current] ?? 0) > 0 ? (10000 / (highScores[gameModeRef.current] ?? 1)).toFixed(1) + 's' : (highScores[gameModeRef.current] ?? 0)}`, COLS * CELL + 12, 138);
      clearLineParticlesRef.current = updateParticles(clearLineParticlesRef.current);
      drawParticles(ctx, clearLineParticlesRef.current);
      floatingScoreRef.current = updateFloatingTexts(floatingScoreRef.current);
      drawFloatingTexts(ctx, floatingScoreRef.current);
      if (shakeRef.current.active) shakeRef.current = updateScreenShake(shakeRef.current);
      ctx.restore();
      // Hold section
      ctx.font = 'bold 12px Inter';
      ctx.fillStyle = '#111827';
      ctx.fillText('Hold (C/Shift)', COLS * CELL + 12, 156);
      if (g.hold) {
        const shapes = PIECE_SHAPES[g.hold];
        const s = shapes[0];
        const colors = PIECE_GRADIENTS[g.hold];
        for (let dy = 0; dy < s.length; dy++) {
          for (let dx = 0; dx < s[dy].length; dx++) {
            if (s[dy][dx]) {
              const px = COLS * CELL + 12 + dx * PREVIEW_CELL;
              const py = 166 + dy * PREVIEW_CELL;
              const grad = ctx.createLinearGradient(px, py, px + PREVIEW_CELL, py + PREVIEW_CELL);
              grad.addColorStop(0, colors.light);
              grad.addColorStop(0.5, colors.base);
              grad.addColorStop(1, colors.dark);
              ctx.fillStyle = grad;
              ctx.fillRect(px, py,
                PREVIEW_CELL - 1,
                PREVIEW_CELL - 1
              );
            }
          }
        }
      } else {
        ctx.strokeStyle = '#e5e7eb';
        ctx.strokeRect(COLS * CELL + 12, 166, PREVIEW_CELL * 4, PREVIEW_CELL * 2);
      }
      
      // Next pieces preview
      ctx.font = 'bold 12px Inter';
      ctx.fillStyle = '#111827';
      ctx.fillText('Next (3)', COLS * CELL + 12, 250);
      for (let i = 0; i < 3 && i < g.nextBag.length; i++) {
        const type = g.nextBag[i];
        const shapes = PIECE_SHAPES[type];
        const s = shapes[0];
        const colors = PIECE_GRADIENTS[type];
        const baseY = 262 + i * 52;
        for (let dy = 0; dy < s.length; dy++) {
          for (let dx = 0; dx < s[dy].length; dx++) {
            if (s[dy][dx]) {
              const px = COLS * CELL + 12 + dx * PREVIEW_CELL;
              const py = baseY + dy * PREVIEW_CELL;
              const grad = ctx.createLinearGradient(px, py, px + PREVIEW_CELL, py + PREVIEW_CELL);
              grad.addColorStop(0, colors.light);
              grad.addColorStop(0.5, colors.base);
              grad.addColorStop(1, colors.dark);
              ctx.fillStyle = grad;
              ctx.fillRect(px, py,
                PREVIEW_CELL - 1,
                PREVIEW_CELL - 1
              );
            }
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, gameOver, score, level, lines, stats, timeElapsed, highScores]);

  const handleStart = () => {
    setScore(0);
    setLevel(1);
    setLines(0);
    setTimeElapsed(0);
    sprintTimeRef.current = null;
    gameModeRef.current = gameMode;
    setGameOver(false);
    setStarted(true);
    setStats({ linesCleared: 0, piecesPlaced: 0, tspins: 0, maxCombo: 0 });
  };

  /* ─── Render ─────────────────────────────────────────────────────────────────
     Mode selector on start overlay; Victory/Game Over overlay with stats;
     Hold button; Score/Level/Lines/Time display per mode. */

  return (
    <div className="game-card bg-white border border-gray-200 text-gray-900 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">🧱 Block Stack</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation" onMouseDown={() => playSound('click')}>
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 mb-2 text-xs sm:text-sm text-gray-900">
        <span>Score: <strong>{formatScore(score)}</strong></span>
        <span>Lv: <strong>{level}</strong></span>
        <span>Lines: <strong>{lines}</strong></span>
        {gameMode === 'sprint' && <span>Time: <strong>{timeElapsed.toFixed(1)}s</strong></span>}
        {gameMode === 'ultra' && <span>Left: <strong>{Math.floor(Math.max(0, ULTRA_DURATION_MS / 1000 - timeElapsed))}s</strong></span>}
      </div>
      {!showTouch && (
        <p className="text-xs text-gray-500 mb-2">
          ← → move · ↑ rotate · ↓ soft drop · Space hard drop · C / Shift hold
        </p>
      )}
      <p className="text-xs text-gray-400 mb-1">
        {gameMode === 'marathon' && 'Marathon: Reach level 20'}
        {gameMode === 'sprint' && 'Sprint: Clear 40 lines fastest'}
        {gameMode === 'ultra' && 'Ultra: Highest score in 2 minutes'}
        {gameMode === 'zen' && 'Zen: Relaxed, no speed increase'}
      </p>

      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-white w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
        <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ maxWidth: '100%' }} />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 p-4">
            <p className="text-gray-900 font-medium mb-3 text-center">
              ← → move · ↑ rotate · ↓ soft drop · Space hard drop · C / Shift hold
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              {(['marathon', 'sprint', 'ultra', 'zen'] as GameMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => { setGameMode(m); gameModeRef.current = m; }}
                  onMouseDown={() => playSound('click')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    gameMode === m ? 'bg-cyan-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-2">
              Marathon: Lv 20 · Sprint: 40 lines · Ultra: 2 min · Zen: relaxed
            </p>
            <p className="text-xs text-cyan-600 mb-3">HS: {gameMode === 'sprint' && highScores[gameMode] > 0 ? (10000 / highScores[gameMode]).toFixed(1) + 's' : highScores[gameMode]}</p>
            <button onClick={() => handleStart()} className="btn-elite btn-elite-primary" onMouseDown={() => playSound('click')}>
              Start
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95">
            <p className={`text-xl font-bold mb-1 ${(gameMode === 'marathon' && level >= MARATHON_GOAL_LEVEL) || (gameMode === 'sprint' && lines >= SPRINT_GOAL_LINES) ? 'text-green-600' : 'text-gray-900'}`}>
              {(gameMode === 'marathon' && level >= MARATHON_GOAL_LEVEL) || (gameMode === 'sprint' && lines >= SPRINT_GOAL_LINES) ? 'Victory!' : 'Game Over'}
            </p>
            <p className="text-gray-700 mb-1">Score: {score}</p>
            {gameMode === 'sprint' && sprintTimeRef.current != null && (
              <p className="text-gray-600 mb-1">Time: {sprintTimeRef.current.toFixed(2)}s</p>
            )}
            <p className="text-xs text-gray-500 mb-4">Lines: {stats.linesCleared} · T-spins: {stats.tspins} · Max combo: {stats.maxCombo}</p>
            <div className="flex gap-2">
              <button onClick={handleStart} className="btn-elite btn-elite-primary" onMouseDown={() => playSound('click')}>
                Play Again
              </button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost" onMouseDown={() => playSound('click')}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      {showTouch && started && !gameOver && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center px-2">
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); move(-1); haptic('light'); }}
                className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-xl active:bg-gray-200 active:scale-95 transition-all touch-manipulation select-none"
              >◀</button>
              <button
                onTouchStart={(e) => { e.preventDefault(); move(1); haptic('light'); }}
                className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-xl active:bg-gray-200 active:scale-95 transition-all touch-manipulation select-none"
              >▶</button>
            </div>
            <div className="flex gap-2">
              <button
                onTouchStart={(e) => { e.preventDefault(); tryRotate(1); haptic('light'); }}
                className="w-14 h-14 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center text-lg font-bold text-purple-700 active:bg-purple-200 active:scale-95 transition-all touch-manipulation select-none"
              >↻</button>
              <button
                onTouchStart={(e) => { e.preventDefault(); tryHold(); haptic('light'); }}
                className="w-14 h-14 rounded-xl bg-cyan-100 border border-cyan-300 flex items-center justify-center text-lg font-bold text-cyan-700 active:bg-cyan-200 active:scale-95 transition-all touch-manipulation select-none"
              >H</button>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onTouchStart={(e) => { e.preventDefault(); softDrop(); haptic('light'); }}
              className="flex-1 max-w-[140px] h-12 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-sm font-bold text-amber-700 active:bg-amber-200 active:scale-95 transition-all touch-manipulation select-none"
            >▼ Soft</button>
            <button
              onTouchStart={(e) => { e.preventDefault(); hardDrop(); haptic('medium'); }}
              className="flex-1 max-w-[140px] h-12 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-sm font-bold text-red-700 active:bg-red-200 active:scale-95 transition-all touch-manipulation select-none"
            >⬇ Hard</button>
          </div>
        </div>
      )}

      {/* Hold piece: C or Shift; one use per piece placement before lock */}
      {!showTouch && (
        <div className="mt-2 flex justify-center">
          <button
            ref={holdButtonRef}
            onClick={tryHold}
            disabled={!started || gameOver}
            className="btn-elite btn-elite-ghost text-sm touch-manipulation"
            onMouseDown={() => (started && !gameOver) && playSound('click')}
          >
            Hold Piece (C / Shift)
          </button>
        </div>
      )}

      {showTouch && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Tap left/right = move · Swipe ↑ = rotate · Swipe ↓ = hard drop · Combo lines for bonus!
        </p>
      )}
    </div>
  );
}

/*
 * End of TetrisGame — Elite Arcade Edition
 * Features: SRS rotation, ghost piece, hold (C/Shift), T-spin detection,
 * 7-bag, lock delay, gradient blocks, background particles,
 * 4 game modes (Marathon/Sprint/Ultra/Zen), high score per mode.
 * Controls: Left/Right move, Up rotate, Down soft drop, Space hard drop,
 * C or Shift to hold piece. Sound via playSound from SoundEngine.
 */
