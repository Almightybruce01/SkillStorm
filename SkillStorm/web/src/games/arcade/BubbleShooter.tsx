/* ═══════════════════════════════════════════════════════════════════════════════
   BUBBLE SHOOTER — Elite Arcade
   Massive Puzzle Bobble–style game: canvas, hex grid, special bubbles, modes
   Features: arc physics, ceiling bounce, particles, combo, 4 game modes
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface BubbleShooterProps {
  onClose: () => void;
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const W = 520;
const H = 680;
const BUBBLE_R = 16;
const SHOOTER_Y = H - 70;
const SHOOTER_X = W / 2;
const AIM_LENGTH = 100;
const SHOOT_SPEED = 520;
const GRAVITY = 1200;
const CEILING_BOUNCE = 0.85;
const WALL_BOUNCE = 0.92;
const HEX_WIDTH = BUBBLE_R * Math.sqrt(3);
const HEX_HEIGHT = BUBBLE_R * 2;

const COLORS = [
  '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316'
];
const NORMAL_COLORS = 8;
const COLS = 13;
const ROWS_TOP = 12;
const ROW_DROP_SHOTS = 8;
const TIME_ATTACK_SEC = 60;
const ENTRANCE_DURATION = 0.4;

const HIGH_SCORE_KEYS = {
  classic: 'skillzstorm_bubble_classic_hs',
  puzzle: 'skillzstorm_bubble_puzzle_hs',
  timeattack: 'skillzstorm_bubble_timeattack_hs',
  zen: 'skillzstorm_bubble_zen_hs',
};

type GameMode = 'classic' | 'puzzle' | 'timeattack' | 'zen';
type BubbleType = 'normal' | 'bomb' | 'rainbow' | 'fire';

interface Bubble {
  row: number;
  col: number;
  color: number;
  type: BubbleType;
  x: number;
  y: number;
  falling?: boolean;
  vy?: number;
  entranceT?: number;
}

interface FiredBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  type: BubbleType;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface PuzzleLayout {
  rows: number;
  cols: number;
  data: (number | null)[][];
}

const PUZZLE_LAYOUTS: PuzzleLayout[] = [
  {
    rows: 6,
    cols: 9,
    data: [
      [0, 1, 2, null, null, 3, 4, 5, null],
      [1, 2, 3, 4, null, 4, 5, 0, 1],
      [2, 3, 4, 5, 0, 1, 2, 3, 4],
      [3, 4, 5, 0, 1, 2, 3, 4, 5],
    ],
  },
  {
    rows: 5,
    cols: 11,
    data: [
      [null, null, 0, 1, 2, 3, 4, 5, null, null, null],
      [null, 0, 1, 2, 3, 4, 5, 0, 1, null, null],
      [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, null],
      [1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5],
    ],
  },
  {
    rows: 7,
    cols: 9,
    data: [
      [1, 2, null, 3, null, 4, null, 5, 6],
      [0, 1, 2, 3, 4, 5, 6, 0, 1],
      [2, 3, 4, null, 5, null, 6, 0, 2],
      [4, 5, 6, 0, 1, 2, 3, 4, 5],
      [6, 0, 1, 2, 3, 4, 5, 6, 0],
    ],
  },
  {
    rows: 6,
    cols: 11,
    data: [
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 0, 1, null, 1, null, 1, null, 1, 0, 1],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    ],
  },
  {
    rows: 5,
    cols: 9,
    data: [
      [null, null, null, 2, 3, 4, null, null, null],
      [null, null, 1, 2, 3, 4, 5, null, null],
      [null, 0, 1, 2, 3, 4, 5, 6, null],
      [0, 1, 2, 3, 4, 5, 6, 0, 1],
    ],
  },
  {
    rows: 8,
    cols: 9,
    data: [
      [3, 4, 5, null, null, 0, 1, 2, null],
      [2, 3, 4, 5, null, 5, 0, 1, 2],
      [1, 2, 3, 4, 5, 0, 1, 2, 3],
      [0, 1, 2, 3, 4, 5, 6, 0, 1],
      [1, 2, 3, null, 4, null, 5, 6, 0],
      [2, 3, 4, 5, 6, 0, 1, 2, 3],
    ],
  },
];

/* ─── Hex Grid Utils ──────────────────────────────────────────────────────── */
function getBubbleXY(row: number, col: number): { x: number; y: number } {
  const offsetX = row % 2 === 0 ? 0 : HEX_WIDTH / 2;
  const x = HEX_WIDTH * col + HEX_WIDTH / 2 + offsetX + BUBBLE_R * 2;
  const y = HEX_HEIGHT * row * 0.75 + BUBBLE_R * 2;
  return { x, y };
}

function hexNeighbors(row: number, col: number): [number, number][] {
  const even = row % 2 === 0;
  const deltas: [number, number][] = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => [row + dr, col + dc] as [number, number]);
}

function snapToGrid(x: number, y: number, grid: (number | null)[][]): { row: number; col: number } | null {
  if (y < BUBBLE_R) return null;
  const row = Math.round((y - BUBBLE_R * 2) / (HEX_HEIGHT * 0.75));
  const offsetX = row % 2 === 0 ? 0 : HEX_WIDTH / 2;
  const col = Math.round((x - HEX_WIDTH / 2 - offsetX - BUBBLE_R * 2) / HEX_WIDTH);
  const numCols = row % 2 === 0 ? COLS : COLS - 1;
  if (col < 0 || col >= numCols || row < 0) return null;
  return { row, col };
}

function getConnectedSameColor(
  grid: (number | null)[][],
  startRow: number,
  startCol: number,
  color: number,
  type: BubbleType
): Set<string> {
  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const isMatch = (r: number, c: number, cval: number | null) => {
    if (cval == null) return false;
    if (type === 'rainbow') return true;
    return cval === color;
  };
  const startVal = grid[startRow]?.[startCol];
  if (startVal == null) return visited;

  function dfs(r: number, c: number) {
    if (r < 0 || r >= grid.length) return;
    const row = grid[r];
    if (!row) return;
    if (c < 0 || c >= row.length) return;
    const val = row[c];
    if (!isMatch(r, c, val)) return;
    const k = key(r, c);
    if (visited.has(k)) return;
    visited.add(k);
    hexNeighbors(r, c).forEach(([nr, nc]) => dfs(nr, nc));
  }
  dfs(startRow, startCol);
  return visited;
}

function findFloating(grid: (number | null)[][]): Set<string> {
  const attached = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  function dfs(r: number, c: number) {
    if (r < 0 || r >= grid.length) return;
    const row = grid[r];
    if (!row || c < 0 || c >= row.length) return;
    if (row[c] == null) return;
    const k = key(r, c);
    if (attached.has(k)) return;
    attached.add(k);
    hexNeighbors(r, c).forEach(([nr, nc]) => dfs(nr, nc));
  }
  for (let c = 0; c < (grid[0]?.length ?? COLS); c++) {
    if (grid[0]?.[c] != null) dfs(0, c);
  }
  const floating = new Set<string>();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (grid[r][c] != null && !attached.has(key(r, c))) floating.add(key(r, c));
    }
  }
  return floating;
}

function spawnParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 3 + Math.random() * 8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      size: 2 + Math.random() * 5,
    });
  }
  return particles;
}

function pickRandomColor(): number {
  return Math.floor(Math.random() * NORMAL_COLORS);
}

function pickRandomBubbleType(mode: GameMode): BubbleType {
  if (mode === 'zen') return 'normal';
  const r = Math.random();
  if (r < 0.04) return 'bomb';
  if (r < 0.08) return 'rainbow';
  if (r < 0.11) return 'fire';
  return 'normal';
}

/* ─── Bubble drawing helper (shine + stroke + optional label) ───────────────── */
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorHex: string,
  radius: number,
  alpha = 1,
  label?: string
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (radius > 6) {
    const grad = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, radius);
    grad.addColorStop(0, 'rgba(255,255,255,0.5)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (label) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }
  ctx.restore();
}

/* ─── Bubble entrance animation (0..1 progress) ────────────────────────────── */
function entranceScale(t: number): number {
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 2);
}

/* ─── Game Logic ──────────────────────────────────────────────────────────── */
function initGrid(mode: GameMode, puzzleIndex: number): (number | null)[][] {
  if (mode === 'puzzle' && puzzleIndex < PUZZLE_LAYOUTS.length) {
    const layout = PUZZLE_LAYOUTS[puzzleIndex];
    return layout.data.map(row => [...row.map(v => v)]);
  }
  const rows = mode === 'zen' ? 6 : ROWS_TOP;
  const g: (number | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const numCols = r % 2 === 0 ? COLS : COLS - 1;
    const row: (number | null)[] = [];
    for (let c = 0; c < numCols; c++) {
      row.push(pickRandomColor());
    }
    g.push(row);
  }
  return g;
}

export default function BubbleShooter({ onClose }: BubbleShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menu, setMenu] = useState<'mode' | 'game' | 'over'>('mode');
  const [mode, setMode] = useState<GameMode>('classic');
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>(() => ({
    classic: parseInt(localStorage.getItem(HIGH_SCORE_KEYS.classic) || '0', 10),
    puzzle: parseInt(localStorage.getItem(HIGH_SCORE_KEYS.puzzle) || '0', 10),
    timeattack: parseInt(localStorage.getItem(HIGH_SCORE_KEYS.timeattack) || '0', 10),
    zen: parseInt(localStorage.getItem(HIGH_SCORE_KEYS.zen) || '0', 10),
  }));
  const [combo, setCombo] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_ATTACK_SEC);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [won, setWon] = useState(false);

  const gridRef = useRef<(number | null)[][]>([]);
  const shooterAngleRef = useRef(-Math.PI / 2);
  const [shooterAngle, setShooterAngleState] = useState(-Math.PI / 2);
  const setShooterAngle = useCallback((v: number) => {
    shooterAngleRef.current = v;
    setShooterAngleState(v);
  }, []);

  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [firedBubble, setFiredBubble] = useState<FiredBubble | null>(null);
  const [nextBubble, setNextBubble] = useState<{ color: number; type: BubbleType }>({ color: 0, type: 'normal' });
  const [floatingBubbles, setFloatingBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [entranceBubbles, setEntranceBubbles] = useState<Map<string, number>>(new Map());
  const rowDropCounterRef = useRef(0);
  const timeAttackStartRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);
  const gameOverTriggeredRef = useRef(false);
  const processingRef = useRef(false);

  const startGame = useCallback((m: GameMode) => {
    playSound('click');
    setMode(m);
    const g = initGrid(m, puzzleIndex);
    gridRef.current = g.map(r => [...r]);
    setGrid(g);
    setScore(0);
    setCombo(0);
    setShotsFired(0);
    rowDropCounterRef.current = 0;
    gameOverTriggeredRef.current = false;
    setGameOver(false);
    setFiredBubble(null);
    setFloatingBubbles([]);
    setParticles([]);
    setEntranceBubbles(() => {
      const t = performance.now() / 1000;
      const m = new Map<string, number>();
      g.forEach((row, r) => row.forEach((_, c) => m.set(`grid_${r}_${c}`, t)));
      return m;
    });
    setWon(false);
    const nc = pickRandomColor();
    const nt = pickRandomBubbleType(m);
    setNextBubble({ color: nc, type: nt });
    if (m === 'timeattack') {
      setTimeLeft(TIME_ATTACK_SEC);
      timeAttackStartRef.current = Date.now();
    }
    setMenu('game');
  }, [puzzleIndex]);

  const checkCollision = useCallback((
    g: (number | null)[][],
    x0: number, y0: number, x1: number, y1: number,
    color: number, _type: BubbleType
  ): { row: number; col: number; newGrid: (number | null)[][] } | null => {
    for (let r = 0; r < g.length; r++) {
      const row = g[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        if (row[c] != null) {
          const { x, y } = getBubbleXY(r, c);
          const dx = x1 - x;
          const dy = y1 - y;
          if (dx * dx + dy * dy < (BUBBLE_R * 1.9) ** 2) {
            const newGrid = g.map(rr => [...rr]);
            if (newGrid[r][c] == null) newGrid[r][c] = color;
            return { row: r, col: c, newGrid };
          }
        }
      }
    }
    const snap = snapToGrid(x1, y1, g);
    if (snap) {
      const newGrid = g.map(r => [...r]);
      const { row, col } = snap;
      while (newGrid.length <= row) newGrid.push([]);
      while (newGrid[row].length <= col) newGrid[row].push(null);
      newGrid[row][col] = color;
      return { row, col, newGrid };
    }
    return null;
  }, []);

  const processHit = useCallback((row: number, col: number, color: number, type: BubbleType) => {
    if (processingRef.current) return;
    processingRef.current = true;
    let g = gridRef.current.map(r => [...r]);
    let pts = 0;
    let comboAdd = 1;

    if (type === 'bomb') {
      playSound('bomb');
      const toRemove = new Set<string>();
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < g.length && nc >= 0 && nc < (g[nr]?.length ?? 0) && g[nr][nc] != null) {
            toRemove.add(`${nr},${nc}`);
            pts += 15;
          }
        }
      }
      g = g.map((r, ri) => r.map((c, ci) => toRemove.has(`${ri},${ci}`) ? null : c));
      setParticles(prev => [...prev, ...spawnParticles(
        getBubbleXY(row, col).x, getBubbleXY(row, col).y,
        '#333', 24
      )]);
    } else if (type === 'fire') {
      playSound('explosion');
      const toRemove = new Set<string>();
      for (let r = row; r < g.length; r++) {
        const cc = col + (Math.floor((r - row) / 2) % 2 === 0 ? 0 : 0);
        if (g[r]?.[col] != null) toRemove.add(`${r},${col}`);
        if (col + 1 < (g[r]?.length ?? 0) && g[r][col + 1] != null) toRemove.add(`${r},${col + 1}`);
      }
      g = g.map((r, ri) => r.map((c, ci) => toRemove.has(`${ri},${ci}`) ? null : c));
      pts = toRemove.size * 12;
      setParticles(prev => [...prev, ...spawnParticles(
        getBubbleXY(row, col).x, getBubbleXY(row, col).y,
        '#f97316', 20
      )]);
    } else {
      let matchColor = color;
      if (type === 'rainbow') {
        for (const [nr, nc] of hexNeighbors(row, col)) {
          const neighborColor = g[nr]?.[nc];
          if (neighborColor != null) {
            matchColor = neighborColor;
            break;
          }
        }
      }
      const connected = getConnectedSameColor(g, row, col, matchColor, type);
      if (connected.size >= 3) {
        playSound('pop');
        g = g.map((r, ri) => r.map((c, ci) => connected.has(`${ri},${ci}`) ? null : c));
        pts = connected.size * 10;
        setParticles(prev => [...prev, ...Array.from(connected).flatMap(k => {
          const [r, c] = k.split(',').map(Number);
          const { x, y } = getBubbleXY(r, c);
          return spawnParticles(x, y, COLORS[g[r]?.[c] ?? 0], 8);
        })]);
      } else {
        playSound('hit');
      }
    }

    setScore(s => {
      const total = s + pts * Math.max(1, combo);
      comboAdd = pts > 0 ? 1 : 0;
      setCombo(c => pts > 0 ? c + comboAdd : 0);
      return total;
    });
    if (pts > 0) setCombo(c => c + 1);

    gridRef.current = g;
    setGrid(g);

    const floating = findFloating(g);
    if (floating.size > 0) {
      playSound('combo');
      const bubbles: Bubble[] = [];
      floating.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        const clr = g[r]?.[c];
        if (clr != null) {
          const { x, y } = getBubbleXY(r, c);
          bubbles.push({ row: r, col: c, color: clr, type: 'normal', x, y, falling: true, vy: 180 });
        }
      });
      const g2 = g.map(r => [...r]);
      floating.forEach(k => {
        const [r, c] = k.split(',').map(Number);
        g2[r][c] = null;
      });
      gridRef.current = g2;
      setGrid(g2);
      setFloatingBubbles(bubbles);
      setScore(s => s + floating.size * 15);
    }

    if (mode === 'puzzle' && g.every(row => row.every(c => c == null))) {
      setWon(true);
      gameOverTriggeredRef.current = true;
      setGameOver(true);
      playSound('victory');
    }

    setNextBubble({ color: pickRandomColor(), type: pickRandomBubbleType(mode) });
    processingRef.current = false;
  }, [mode]);

  /* ─── Game Loop ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (menu !== 'game' || !canvasRef.current) return;
    let last = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.04);
      last = now;

      if (mode === 'timeattack') {
        const elapsed = (Date.now() - timeAttackStartRef.current) / 1000;
        const left = Math.max(0, TIME_ATTACK_SEC - elapsed);
        setTimeLeft(left);
        if (left <= 0 && !gameOverTriggeredRef.current) {
          gameOverTriggeredRef.current = true;
          setGameOver(true);
          playSound('gameover');
        }
      }

      setFiredBubble(prev => {
        if (!prev) return null;
        let nx = prev.x + prev.vx * dt;
        let ny = prev.y + prev.vy * dt;
        const gr = gridRef.current;

        if (nx - BUBBLE_R < BUBBLE_R * 2) {
          nx = BUBBLE_R * 2;
          prev = { ...prev, vx: -prev.vx * WALL_BOUNCE, x: nx };
        }
        if (nx + BUBBLE_R > W - BUBBLE_R * 2) {
          nx = W - BUBBLE_R * 2;
          prev = { ...prev, vx: -prev.vx * WALL_BOUNCE, x: nx };
        }
        if (ny - BUBBLE_R < BUBBLE_R) {
          ny = BUBBLE_R;
          prev = { ...prev, vy: -prev.vy * CEILING_BOUNCE, y: ny };
        }

        const hit = checkCollision(gr, prev.x, prev.y, nx, ny, prev.color, prev.type);
        if (hit) {
          processHit(hit.row, hit.col, prev.color, prev.type);
          return null;
        }

        if (ny > H + BUBBLE_R * 2) return null;

        return { ...prev, x: nx, y: ny };
      });

      setFloatingBubbles(prev =>
        prev.map(b => ({
          ...b,
          y: b.y + (b.vy ?? 0) * dt,
          vy: (b.vy ?? 0) + GRAVITY * dt * 0.5,
        })).filter(b => b.y < H + BUBBLE_R * 3)
      );

      setParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - dt * 3,
        })).filter(p => p.life > 0)
      );

      const g = gridRef.current;
      if (!gameOverTriggeredRef.current) {
        for (let r = 0; r < g.length; r++) {
          const { y } = getBubbleXY(r, 0);
          if (y + BUBBLE_R * 2 > SHOOTER_Y - 30) {
            gameOverTriggeredRef.current = true;
            setGameOver(true);
            playSound('gameover');
            break;
          }
        }
      }

      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [menu, mode, checkCollision, processHit]);

  /* ─── Row Drop (Classic) ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (menu !== 'game' || mode !== 'classic' || gameOver) return;
    if (!firedBubble && shotsFired > 0) {
      rowDropCounterRef.current += 1;
      if (rowDropCounterRef.current >= ROW_DROP_SHOTS) {
        rowDropCounterRef.current = 0;
        setGrid(prev => {
          const newRow: (number | null)[] = [];
          const numCols = prev.length % 2 === 0 ? COLS : COLS - 1;
          for (let c = 0; c < numCols; c++) newRow.push(pickRandomColor());
          const next = [newRow, ...prev];
          gridRef.current = next;
          setEntranceBubbles(eb => {
            const nextEb = new Map(eb);
            const t = performance.now() / 1000;
            for (let c = 0; c < numCols; c++) nextEb.set(`grid_0_${c}`, t);
            return nextEb;
          });
          return next;
        });
      }
    }
  }, [menu, mode, gameOver, firedBubble, shotsFired]);

  /* ─── Keyboard ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (menu !== 'game' || gameOver) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(-Math.PI * 0.92, shooterAngleRef.current - 0.08);
        setShooterAngle(next);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(-Math.PI * 0.08, shooterAngleRef.current + 0.08);
        setShooterAngle(next);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (!firedBubble && !processingRef.current) {
          playSound('shoot');
          const angle = shooterAngleRef.current;
          setFiredBubble({
            x: SHOOTER_X,
            y: SHOOTER_Y,
            vx: Math.cos(angle) * SHOOT_SPEED,
            vy: Math.sin(angle) * SHOOT_SPEED,
            color: nextBubble.color,
            type: nextBubble.type,
          });
          setNextBubble({ color: pickRandomColor(), type: pickRandomBubbleType(mode) });
          setShotsFired(s => s + 1);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [menu, gameOver, firedBubble, nextBubble, mode]);

  /* ─── High Score ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (menu !== 'over') return;
    const key = HIGH_SCORE_KEYS[mode];
    const prev = highScores[mode];
    if (score > prev) {
      try {
        localStorage.setItem(key, String(score));
        setHighScores(hs => ({ ...hs, [mode]: score }));
      } catch {}
    }
  }, [menu, mode, score, highScores]);

  /* ─── Render ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (menu !== 'game' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(0.5, '#0f172a');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const g = gridRef.current;
    const now = performance.now() / 1000;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < (g[r]?.length ?? 0); c++) {
        const cell = g[r][c];
        if (cell == null) continue;
        const { x, y } = getBubbleXY(r, c);
        const key = `grid_${r}_${c}`;
        const entT = entranceBubbles.get(key);
        let scale = 1;
        if (entT != null) {
          const elapsed = now - entT;
          scale = entranceScale(Math.min(1, elapsed / ENTRANCE_DURATION));
        }
        drawBubble(ctx, x, y, COLORS[cell % COLORS.length], (BUBBLE_R - 2) * scale, 1);
      }
    }

    floatingBubbles.forEach(b => {
      drawBubble(ctx, b.x, b.y, COLORS[b.color % COLORS.length], BUBBLE_R - 2, 1);
    });

    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const angle = shooterAngleRef.current;
    const tipX = SHOOTER_X + Math.cos(angle) * AIM_LENGTH;
    const tipY = SHOOTER_Y + Math.sin(angle) * AIM_LENGTH;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(SHOOTER_X, SHOOTER_Y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y, BUBBLE_R + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#334155';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();

    const nextLabel = nextBubble.type === 'bomb' ? 'B' : nextBubble.type === 'rainbow' ? 'R' : nextBubble.type === 'fire' ? 'F' : undefined;
    if (!firedBubble) {
      drawBubble(ctx, SHOOTER_X, SHOOTER_Y, COLORS[nextBubble.color % COLORS.length], BUBBLE_R - 1, 1, nextLabel);
    }

    if (firedBubble) {
      const firedLabel = firedBubble.type === 'bomb' ? 'B' : firedBubble.type === 'rainbow' ? 'R' : firedBubble.type === 'fire' ? 'F' : undefined;
      drawBubble(ctx, firedBubble.x, firedBubble.y, COLORS[firedBubble.color % COLORS.length], BUBBLE_R - 1, 1, firedLabel);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 12, 28);
    if (combo > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Combo x${combo}`, 12, 48);
    }
    if (mode === 'timeattack') {
      ctx.fillStyle = timeLeft < 10 ? '#ef4444' : '#22c55e';
      ctx.fillText(`Time: ${Math.ceil(timeLeft)}s`, W - 80, 28);
    }
  }, [menu, grid, shooterAngle, firedBubble, nextBubble, floatingBubbles, particles, score, combo, mode, timeLeft, entranceBubbles]);

  useEffect(() => {
    if (menu === 'game' && gameOver) setMenu('over');
  }, [menu, gameOver]);

  const handleClose = useCallback(() => {
    playSound('click');
    onClose();
  }, [onClose]);

  /* ─── Mode Select ───────────────────────────────────────────────────────── */
  if (menu === 'mode') {
    return (
      <div className="game-card bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden max-w-lg mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold">Bubble Shooter</h2>
          <button onClick={handleClose} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 transition touch-manipulation active:scale-95">
            Close
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-300 text-sm">Choose a game mode. Use <kbd className="px-1 py-0.5 bg-slate-700 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-slate-700 rounded">→</kbd> to aim, <kbd className="px-1 py-0.5 bg-slate-700 rounded">Space</kbd> to fire.</p>
          <div className="grid grid-cols-2 gap-3">
            {(['classic', 'puzzle', 'timeattack', 'zen'] as GameMode[]).map(m => (
              <button
                key={m}
                onClick={() => startGame(m)}
                className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 transition text-left touch-manipulation active:scale-95"
              >
                <span className="font-semibold capitalize block">{m === 'timeattack' ? 'Time Attack' : m}</span>
                <span className="text-xs text-slate-400">
                  {m === 'classic' && 'Endless, rows push down every 8 shots'}
                  {m === 'puzzle' && 'Clear pre-set layouts'}
                  {m === 'timeattack' && '60 seconds to clear'}
                  {m === 'zen' && 'Relaxed, no pressure'}
                </span>
                <span className="text-amber-400 text-xs block mt-1">Best: {highScores[m]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─── Game Over ─────────────────────────────────────────────────────────── */
  if (menu === 'over') {
    return (
      <div className="game-card bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden max-w-lg mx-auto">
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">{won ? 'Victory!' : 'Game Over'}</h2>
          <p className="text-slate-300 mb-4">Score: {score}</p>
          <p className="text-amber-400 text-sm mb-6">High Score: {Math.max(highScores[mode], score)}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => startGame(mode)}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition font-semibold touch-manipulation active:scale-95"
            >
              Play Again
            </button>
            <button
              onClick={() => setMenu('mode')}
              className="px-6 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 transition touch-manipulation active:scale-95"
            >
              Modes
            </button>
            <button onClick={handleClose} className="px-6 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 transition touch-manipulation active:scale-95">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main Game ─────────────────────────────────────────────────────────── */
  return (
    <div className="game-card bg-slate-900 text-white rounded-2xl shadow-2xl overflow-hidden max-w-lg mx-auto">
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">Bubble Shooter</h2>
          <span className="text-slate-400 text-sm capitalize">{mode}</span>
        </div>
        <button onClick={handleClose} className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 transition touch-manipulation active:scale-95">
          Close
        </button>
      </div>
      <div className="p-2">
        <div className="rounded-xl overflow-hidden border-2 border-slate-600 inline-block bg-slate-950 w-full" style={{ touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full"
            style={{ width: Math.min(W, 400), height: Math.min(H, 520), maxWidth: '100%' }}
            tabIndex={0}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          ← → aim · Space fire · Bomb (B) · Rainbow (R) · Fire (F)
        </p>
      </div>
    </div>
  );
}
