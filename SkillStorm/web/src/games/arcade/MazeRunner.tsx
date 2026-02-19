/* ═══════════════════════════════════════════════════════════════════════════════
   MAZE RUNNER — Elite Procedural Maze Game
   Canvas-based with full game loop, fog of war, collectibles, enemies,
   themes, minimap, particle trail, 3D-style walls, high scores.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface MazeRunnerProps {
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const CANVAS_W = 800;
const CANVAS_H = 560;
const CELL_SIZES = { small: 15, medium: 25, large: 35 } as const;
type MazeSize = keyof typeof CELL_SIZES;

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const; // up, down, left, right
const FOG_RADIUS = 3;
const TRAIL_MAX_LENGTH = 60;
const FOG_REVEAL_RIPPLE_SPEED = 4;
const BASE_SPEED = 0.08;
const SPEED_BOOST_MULT = 1.8;
const SPEED_BOOST_DURATION = 5000;
const MAP_REVEAL_DURATION = 4000;
const TIME_FREEZE_DURATION = 5000;
const KEYS_REQUIRED = 1;
const COINS_PER_LEVEL = { small: 8, medium: 12, large: 15 };
const ENEMY_START_LEVEL = 3;
const DOOR_GLOW_CYCLE = 60;
const HIGH_SCORE_PREFIX = 'maze_runner_';

type Theme = 'dungeon' | 'forest' | 'ice' | 'lava';
type CollectibleType = 'key' | 'coin' | 'speed_boost' | 'map_reveal' | 'time_freeze';

interface Cell {
  walls: [boolean, boolean, boolean, boolean]; // top, right, bottom, left
  revealed: boolean;
}

interface Collectible {
  r: number;
  c: number;
  type: CollectibleType;
  collected: boolean;
}

interface Enemy {
  r: number;
  c: number;
  path: [number, number][];
  pathIdx: number;
  moveTimer: number;
}

interface Particle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  age: number;
  maxAge: number;
}

interface FogRipple {
  r: number;
  c: number;
  radius: number;
  maxRadius: number;
  progress: number;
}

const THEMES: Record<Theme, {
  floor: string;
  wall: string;
  wallHighlight: string;
  wallShadow: string;
  fog: string;
  exit: string;
  exitGlow: string;
  key: string;
  coin: string;
  player: string;
  enemy: string;
  trail: string;
}> = {
  dungeon: {
    floor: '#2d2d2d',
    wall: '#4a4a4a',
    wallHighlight: '#6b6b6b',
    wallShadow: '#1a1a1a',
    fog: 'rgba(0,0,0,0.92)',
    exit: '#8b4513',
    exitGlow: 'rgba(210, 180, 140, 0.6)',
    key: '#ffd700',
    coin: '#ffd700',
    player: '#87ceeb',
    enemy: '#dc3545',
    trail: 'rgba(135, 206, 235, 0.4)',
  },
  forest: {
    floor: '#2d4a2d',
    wall: '#3d6b3d',
    wallHighlight: '#5a8a5a',
    wallShadow: '#1a301a',
    fog: 'rgba(0, 20, 0, 0.9)',
    exit: '#228b22',
    exitGlow: 'rgba(50, 205, 50, 0.5)',
    key: '#ffd700',
    coin: '#ffd700',
    player: '#98fb98',
    enemy: '#8b0000',
    trail: 'rgba(152, 251, 152, 0.35)',
  },
  ice: {
    floor: '#e8f4f8',
    wall: '#b0d4e8',
    wallHighlight: '#d0e8f5',
    wallShadow: '#7eb8d0',
    fog: 'rgba(180, 220, 240, 0.88)',
    exit: '#4682b4',
    exitGlow: 'rgba(135, 206, 250, 0.6)',
    key: '#1e90ff',
    coin: '#ffd700',
    player: '#00ced1',
    enemy: '#8b008b',
    trail: 'rgba(0, 206, 209, 0.35)',
  },
  lava: {
    floor: '#3d2a2a',
    wall: '#5c3d3d',
    wallHighlight: '#8b5a5a',
    wallShadow: '#2a1a1a',
    fog: 'rgba(40, 0, 0, 0.9)',
    exit: '#ff4500',
    exitGlow: 'rgba(255, 140, 0, 0.6)',
    key: '#ffd700',
    coin: '#ffd700',
    player: '#ff6b35',
    enemy: '#00ff00',
    trail: 'rgba(255, 107, 53, 0.35)',
  },
};

// ─── Recursive Backtracking Maze Generator ───────────────────────────────────
function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      walls: [true, true, true, true],
      revealed: false,
    }))
  );

  function carve(r: number, c: number) {
    grid[r][c].revealed = false;
    const shuffled = [...DIRS].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of shuffled) {
      const nr = r + dr * 2;
      const nc = c + dc * 2;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].walls.every((_, i) => grid[nr][nc].walls[i])) {
        const mr = r + dr;
        const mc = c + dc;
        if (dr === -1) { grid[r][c].walls[0] = false; grid[mr][mc].walls[2] = false; }
        if (dr === 1)  { grid[r][c].walls[2] = false; grid[mr][mc].walls[0] = false; }
        if (dc === -1) { grid[r][c].walls[3] = false; grid[mr][mc].walls[1] = false; }
        if (dc === 1)  { grid[r][c].walls[1] = false; grid[mr][mc].walls[3] = false; }
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);
  return grid;
}

function placeCollectibles(
  grid: Cell[][],
  size: MazeSize,
  start: [number, number],
  exit: [number, number],
  level: number
): Collectible[] {
  const items: Collectible[] = [];
  const rows = grid.length;
  const cols = grid[0].length;
  const coinCount = Math.max(2, COINS_PER_LEVEL[size] - (level - 1) * 2);
  const pool: CollectibleType[] = ['coin', 'coin', 'coin', 'speed_boost', 'map_reveal', 'time_freeze'];

  for (let i = 0; i < KEYS_REQUIRED; i++) {
    let r: number, c: number;
    do {
      r = 1 + Math.floor(Math.random() * (rows - 2));
      c = 1 + Math.floor(Math.random() * (cols - 2));
    } while ((r === start[0] && c === start[1]) || (r === exit[0] && c === exit[1]));
    items.push({ r, c, type: 'key', collected: false });
  }

  for (let i = 0; i < coinCount; i++) {
    let r: number, c: number;
    do {
      r = 1 + Math.floor(Math.random() * (rows - 2));
      c = 1 + Math.floor(Math.random() * (cols - 2));
    } while (items.some(it => it.r === r && it.c === c) || (r === start[0] && c === start[1]) || (r === exit[0] && c === exit[1]));
    items.push({ r, c, type: 'coin', collected: false });
  }

  const powerupCount = level <= 3 ? 2 : 1;
  for (let i = 0; i < powerupCount; i++) {
    const type = pool[2 + Math.floor(Math.random() * (pool.length - 2))];
    let r: number, c: number;
    do {
      r = 1 + Math.floor(Math.random() * (rows - 2));
      c = 1 + Math.floor(Math.random() * (cols - 2));
    } while (items.some(it => it.r === r && it.c === c) || (r === start[0] && c === start[1]) || (r === exit[0] && c === exit[1]));
    items.push({ r, c, type, collected: false });
  }

  return items;
}

function buildEnemyPaths(grid: Cell[][], exit: [number, number], count: number): [number, number][][] {
  const rows = grid.length;
  const cols = grid[0].length;
  const paths: [number, number][][] = [];

  for (let e = 0; e < count; e++) {
    const path: [number, number][] = [];
    let r = 1 + Math.floor(Math.random() * (rows - 2));
    let c = 1 + Math.floor(Math.random() * (cols - 2));
    const visited = new Set<string>();
    visited.add(`${r},${c}`);

    for (let step = 0; step < 20; step++) {
      path.push([r, c]);
      const neighbors: [number, number][] = [];
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        const wallIdx = dr === -1 ? 0 : dr === 1 ? 2 : dc === -1 ? 3 : 1;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[r][c].walls[wallIdx] && !visited.has(`${nr},${nc}`)) {
          neighbors.push([nr, nc]);
        }
      }
      if (neighbors.length === 0) break;
      const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      visited.add(`${nr},${nc}`);
      r = nr;
      c = nc;
    }
    if (path.length >= 4) paths.push(path);
  }
  return paths;
}

export default function MazeRunner({ onClose }: MazeRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'gameover'>('menu');
  const [size, setSize] = useState<MazeSize>('medium');
  const [theme, setTheme] = useState<Theme>('dungeon');
  const [level, setLevel] = useState(1);
  const [keysCollected, setKeysCollected] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [exploredPercent, setExploredPercent] = useState(0);
  const [postStats, setPostStats] = useState<{ time: number; coins: number; explored: number } | null>(null);

  const gameRef = useRef<{
    grid: Cell[][];
    start: [number, number];
    exit: [number, number];
    player: { r: number; c: number; px: number; py: number; targetR: number; targetC: number; dir: number; frame: number; moving: boolean };
    collectibles: Collectible[];
    enemies: Enemy[];
    particles: Particle[];
    trail: TrailPoint[];
    powerUps: { speedBoost: number; mapReveal: number; timeFreeze: number };
    keysCollected: number;
    coinsCollected: number;
    elapsed: number;
    levelStartTime: number;
    cellW: number;
    cellH: number;
    offsetX: number;
    offsetY: number;
    doorPhase: number;
  } | null>(null);

  const highScoresRef = useRef<Record<string, number>>({});
  const [speedrunTime, setSpeedrunTime] = useState(0);
  const [totalSpeedrunTime, setTotalSpeedrunTime] = useState(0);
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [fogRevealAnim, setFogRevealAnim] = useState<Map<string, number>>(new Map());
  const fogAnimRef = useRef<Map<string, number>>(new Map());
  const fogRipplesRef = useRef<FogRipple[]>([]);
  const touchDpadRef = useRef<{ dir: number } | null>(null);
  const touchHoldIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_PREFIX + 'scores');
      if (raw) highScoresRef.current = JSON.parse(raw);
    } catch {}
  }, []);

  const initLevel = useCallback(() => {
    const rows = CELL_SIZES[size];
    const cols = CELL_SIZES[size];
    const grid = generateMaze(rows, cols);

    const start: [number, number] = [1, 1];
    const exit: [number, number] = [rows - 2, cols - 2];

    grid[start[0]][start[1]].revealed = true;
    const collectibles = placeCollectibles(grid, size, start, exit, level);

    const enemyPaths = level >= ENEMY_START_LEVEL ? buildEnemyPaths(grid, exit, Math.min(level - 2, 3)) : [];
    const enemies: Enemy[] = enemyPaths.map((path, i) => ({
      r: path[0][0],
      c: path[0][1],
      path,
      pathIdx: 0,
      moveTimer: i * 0.5,
    }));

    const cellW = (CANVAS_W - 80) / cols;
    const cellH = (CANVAS_H - 80) / rows;
    const offsetX = 40;
    const offsetY = 40;

    gameRef.current = {
      grid,
      start,
      exit,
      player: {
        r: start[0],
        c: start[1],
        px: start[1] * cellW + cellW / 2,
        py: start[0] * cellH + cellH / 2,
        targetR: start[0],
        targetC: start[1],
        dir: 2,
        frame: 0,
        moving: false,
      },
      collectibles,
      enemies,
      particles: [],
      trail: [],
      powerUps: { speedBoost: 0, mapReveal: 0, timeFreeze: 0 },
      keysCollected: 0,
      coinsCollected: 0,
      elapsed: 0,
      levelStartTime: performance.now(),
      cellW,
      cellH,
      offsetX,
      offsetY,
      doorPhase: 0,
    };

    const baseTime = size === 'small' ? 90 : size === 'medium' ? 150 : 220;
    setTimeLeft(baseTime - (level - 1) * 15);
    setKeysCollected(0);
    setCoinsCollected(0);
    setPostStats(null);
    setSpeedrunTime(0);
  }, [size, level]);

  const revealAround = useCallback((r: number, c: number, radius: number, fullReveal = false) => {
    const g = gameRef.current;
    if (!g) return;
    const rows = g.grid.length;
    const cols = g.grid[0].length;
    for (let rr = Math.max(0, r - radius); rr <= Math.min(rows - 1, r + radius); rr++) {
      for (let cc = Math.max(0, c - radius); cc <= Math.min(cols - 1, c + radius); cc++) {
        if (fullReveal || Math.abs(rr - r) + Math.abs(cc - c) <= radius) {
          g.grid[rr][cc].revealed = true;
        }
      }
    }
  }, []);

  const gameLoop = useCallback((now: number) => {
    const g = gameRef.current;
    if (!g || gameState !== 'playing') return;

    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = now;

    g.doorPhase = (g.doorPhase + dt * 4) % (Math.PI * 2);
    g.player.frame += dt * 12;

    const speedMult = g.powerUps.speedBoost > now ? SPEED_BOOST_MULT : 1;
    const moveSpeed = BASE_SPEED * speedMult;

    if (g.powerUps.mapReveal > now) {
      g.grid.forEach(row => row.forEach(cell => { cell.revealed = true; }));
    }

    const timeFrozen = g.powerUps.timeFreeze > now;
    if (!timeFrozen) {
      g.elapsed += dt;
      setSpeedrunTime(prev => prev + dt);
      setTimeLeft(prev => Math.max(0, prev - dt));
    }

    const p = g.player;
    const cellW = g.cellW;
    const cellH = g.cellH;
    const targetX = p.targetC * cellW + cellW / 2;
    const targetY = p.targetR * cellH + cellH / 2;

    if (Math.abs(p.px - targetX) > 1 || Math.abs(p.py - targetY) > 1) {
      p.moving = true;
      p.px += (targetX - p.px) * moveSpeed;
      p.py += (targetY - p.py) * moveSpeed;

      const maxAge = 2.5;
      g.trail.push({ x: p.px, y: p.py, alpha: 1, age: 0, maxAge });
      if (g.trail.length > TRAIL_MAX_LENGTH) g.trail.shift();
      g.trail.forEach(t => {
        t.age += dt;
        t.alpha = Math.max(0, 1 - t.age / t.maxAge) * 0.9;
      });

      revealAround(p.targetR, p.targetC, FOG_RADIUS);
      fogRipplesRef.current.push({
        r: p.targetR,
        c: p.targetC,
        radius: 0,
        maxRadius: FOG_RADIUS * 1.5,
        progress: 0,
      });
    } else {
      p.moving = false;
      p.r = p.targetR;
      p.c = p.targetC;
      p.px = targetX;
      p.py = targetY;
    }

    for (const col of g.collectibles) {
      if (col.collected) continue;
      if (col.r === p.targetR && col.c === p.targetC) {
        col.collected = true;
        if (col.type === 'key') {
          g.keysCollected++;
          setKeysCollected(g.keysCollected);
          playSound('powerup');
        } else if (col.type === 'coin') {
          g.coinsCollected++;
          setCoinsCollected(g.coinsCollected);
          playSound('coin');
        } else if (col.type === 'speed_boost') {
          g.powerUps.speedBoost = now + SPEED_BOOST_DURATION;
          playSound('powerup');
        } else if (col.type === 'map_reveal') {
          g.powerUps.mapReveal = now + MAP_REVEAL_DURATION;
          playSound('powerup');
        } else if (col.type === 'time_freeze') {
          g.powerUps.timeFreeze = now + TIME_FREEZE_DURATION;
          playSound('powerup');
        }

        for (let i = 0; i < 8; i++) {
          g.particles.push({
            x: p.px + g.offsetX,
            y: p.py + g.offsetY,
            life: 0.5,
            maxLife: 0.5,
            color: col.type === 'key' ? '#ffd700' : col.type === 'coin' ? '#ffd700' : '#00ff88',
            size: 4 + Math.random() * 4,
          });
        }
      }
    }

    if (!timeFrozen) {
      for (const en of g.enemies) {
        en.moveTimer += dt;
        if (en.moveTimer >= 0.6) {
          en.moveTimer = 0;
          en.pathIdx = (en.pathIdx + 1) % en.path.length;
          const [nr, nc] = en.path[en.pathIdx];
          en.r = nr;
          en.c = nc;
          if (en.r === p.targetR && en.c === p.targetC) {
            playSound('hit');
            setGameState('gameover');
            const rev = g.grid.flat().filter(c => c.revealed).length;
            setPostStats({ time: Math.floor(g.elapsed), coins: g.coinsCollected, explored: Math.round((rev / (g.grid.length * g.grid[0].length)) * 100) });
          }
        }
      }
    }

    g.particles = g.particles.filter(pt => {
      pt.life -= dt;
      return pt.life > 0;
    });

    const totalCells = g.grid.length * g.grid[0].length;
    const revealed = g.grid.flat().filter(c => c.revealed).length;
    setExploredPercent(Math.round((revealed / totalCells) * 100));

    // Fog reveal animation: cells that just became revealed get an alpha ramp
    for (let rr = 0; rr < g.grid.length; rr++) {
      for (let cc = 0; cc < g.grid[0].length; cc++) {
        const key = `${rr},${cc}`;
        if (g.grid[rr][cc].revealed) {
          const current = fogAnimRef.current.get(key) ?? 0;
          fogAnimRef.current.set(key, Math.min(1, current + dt * FOG_REVEAL_RIPPLE_SPEED));
        } else {
          fogAnimRef.current.delete(key);
        }
      }
    }

    // Update fog ripples (expand and fade)
    const ripples = fogRipplesRef.current;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.progress += dt * 2;
      rp.radius = rp.maxRadius * Math.min(1, rp.progress);
      if (rp.progress >= 1) ripples.splice(i, 1);
    }

    if (p.targetR === g.exit[0] && p.targetC === g.exit[1]) {
      if (g.keysCollected >= KEYS_REQUIRED) {
        playSound('victory');
        setGameState('victory');
        const finishTime = Math.floor(g.elapsed);
        setPostStats({ time: finishTime, coins: g.coinsCollected, explored: Math.round((revealed / totalCells) * 100) });

        const key = `${size}_${level}`;
        const best = highScoresRef.current[key];
        if (best === undefined || finishTime < best) {
          highScoresRef.current[key] = finishTime;
          try {
            localStorage.setItem(HIGH_SCORE_PREFIX + 'scores', JSON.stringify(highScoresRef.current));
          } catch {}
        }
      }
    }

    if (timeLeft <= 0 && !timeFrozen) {
      playSound('gameover');
      setGameState('gameover');
      setPostStats({ time: Math.floor(g.elapsed), coins: g.coinsCollected, explored: Math.round((revealed / totalCells) * 100) });
    }
  }, [gameState, timeLeft, revealAround]);

  const movePlayer = useCallback((dr: number, dc: number) => {
    const g = gameRef.current;
    if (!g || gameState !== 'playing') return;
    const p = g.player;
    if (p.moving) return;
    if (dr !== 0) p.dir = dr === -1 ? 0 : 1;
    if (dc !== 0) p.dir = dc === -1 ? 3 : 2;
    const nr = p.r + dr;
    const nc = p.c + dc;
    const rows = g.grid.length;
    const cols = g.grid[0].length;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
    const wallIdx = dr === -1 ? 0 : dr === 1 ? 2 : dc === -1 ? 3 : 1;
    if (g.grid[p.r][p.c].walls[wallIdx]) return;
    p.targetR = nr;
    p.targetC = nc;
    playSound('tick');
  }, [gameState]);

  const handleInput = useCallback((e: KeyboardEvent) => {
    const g = gameRef.current;
    if (!g || gameState !== 'playing') return;

    const p = g.player;
    if (p.moving) return;

    let dr = 0, dc = 0;
    if (e.key === 'ArrowUp') { dr = -1; p.dir = 0; }
    if (e.key === 'ArrowDown') { dr = 1; p.dir = 1; }
    if (e.key === 'ArrowLeft') { dc = -1; p.dir = 3; }
    if (e.key === 'ArrowRight') { dc = 1; p.dir = 2; }

    if (e.key === ' ') {
      playSound('click');
      revealAround(p.r, p.c, FOG_RADIUS + 2);
      return;
    }

    if (dr !== 0 || dc !== 0) {
      e.preventDefault();
      movePlayer(dr, dc);
    }
  }, [gameState, revealAround, movePlayer]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const g = gameRef.current;
    if (!canvas || !g) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const T = THEMES[theme];
    const rows = g.grid.length;
    const cols = g.grid[0].length;
    const { cellW, cellH, offsetX, offsetY } = g;

    ctx.fillStyle = '#0f0f12';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = g.grid[r][c];
        if (!cell.revealed) {
          ctx.fillStyle = T.fog;
          ctx.fillRect(c * cellW, r * cellH, cellW + 1, cellH + 1);
          continue;
        }

        // Fog reveal animation: fade in newly revealed cells
        const fogAlpha = fogAnimRef.current.get(`${r},${c}`) ?? 1;
        ctx.globalAlpha = fogAlpha;
        ctx.fillStyle = T.floor;
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);

        const x = c * cellW;
        const y = r * cellH;
        const w = cellW * 0.12;
        const s = cellH * 0.12;

        if (cell.walls[0]) {
          const grad = ctx.createLinearGradient(x, y, x + cellW, y);
          grad.addColorStop(0, T.wallShadow);
          grad.addColorStop(0.5, T.wall);
          grad.addColorStop(1, T.wallHighlight);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y - s, cellW + 2, w + s);
        }
        if (cell.walls[1]) {
          const grad = ctx.createLinearGradient(x + cellW, y, x + cellW + w, y + cellH);
          grad.addColorStop(0, T.wallHighlight);
          grad.addColorStop(1, T.wallShadow);
          ctx.fillStyle = grad;
          ctx.fillRect(x + cellW - 1, y - s, w + s, cellH + s + 2);
        }
        if (cell.walls[2]) {
          const grad = ctx.createLinearGradient(x, y + cellH, x + cellW, y + cellH + w);
          grad.addColorStop(0, T.wall);
          grad.addColorStop(1, T.wallShadow);
          ctx.fillStyle = grad;
          ctx.fillRect(x - 1, y + cellH - 1, cellW + w + 2, w + s);
        }
        if (cell.walls[3]) {
          const grad = ctx.createLinearGradient(x - w, y, x, y + cellH);
          grad.addColorStop(0, T.wallShadow);
          grad.addColorStop(1, T.wall);
          ctx.fillStyle = grad;
          ctx.fillRect(x - w, y - 1, w + s, cellH + s + 2);
        }
        ctx.globalAlpha = 1;
      }
    }

    for (let i = 0; i < g.trail.length; i++) {
      const pt = g.trail[i];
      const trailSize = 3 + (1 - i / g.trail.length) * 3;
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = T.trail;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Fog reveal ripple effect (expanding circle at reveal points)
    for (const rp of fogRipplesRef.current) {
      if (rp.progress >= 1) continue;
      const cx = rp.c * cellW + cellW / 2;
      const cy = rp.r * cellH + cellH / 2;
      const alpha = (1 - rp.progress) * 0.35;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = T.exitGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, rp.radius * Math.min(cellW, cellH), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const col of g.collectibles) {
      if (col.collected) continue;
      if (!g.grid[col.r][col.c].revealed) continue;

      const cx = col.c * cellW + cellW / 2;
      const cy = col.r * cellH + cellH / 2;

      if (col.type === 'key') {
        ctx.fillStyle = T.key;
        ctx.strokeStyle = T.wallShadow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - cellH * 0.1, cellW * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(cx - cellW * 0.05, cy - cellH * 0.05, cellW * 0.1, cellH * 0.35);
        ctx.fillRect(cx - cellW * 0.15, cy + cellH * 0.2, cellW * 0.3, cellH * 0.08);
      } else if (col.type === 'coin') {
        ctx.fillStyle = T.coin;
        ctx.beginPath();
        ctx.arc(cx, cy, cellW * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = T.wallShadow;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (col.type === 'speed_boost') {
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(cx, cy, cellW * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (col.type === 'map_reveal') {
        ctx.fillStyle = '#00bfff';
        ctx.beginPath();
        ctx.arc(cx, cy, cellW * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (col.type === 'time_freeze') {
        ctx.fillStyle = '#add8e6';
        ctx.beginPath();
        ctx.arc(cx, cy, cellW * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const exitCell = g.grid[g.exit[0]][g.exit[1]];
    if (exitCell.revealed) {
      const ex = g.exit[1] * cellW + cellW / 2;
      const ey = g.exit[0] * cellH + cellH / 2;
      const glow = 0.4 + 0.3 * Math.sin(g.doorPhase);
      ctx.fillStyle = T.exit;
      ctx.fillRect(g.exit[1] * cellW + 2, g.exit[0] * cellH + 2, cellW - 4, cellH - 4);
      ctx.shadowColor = T.exitGlow;
      ctx.shadowBlur = 15 + glow * 10;
      ctx.fillStyle = g.keysCollected >= KEYS_REQUIRED ? '#22c55e' : '#ef4444';
      ctx.font = `bold ${cellW * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(g.keysCollected >= KEYS_REQUIRED ? 'EXIT' : 'LOCKED', ex, ey + cellH * 0.15);
      ctx.shadowBlur = 0;
    }

    for (const en of g.enemies) {
      if (!g.grid[en.r][en.c].revealed) continue;
      const ex = en.c * cellW + cellW / 2;
      const ey = en.r * cellH + cellH / 2;
      ctx.fillStyle = T.enemy;
      ctx.beginPath();
      ctx.arc(ex, ey, cellW * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = T.wallShadow;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const p = g.player;
    const px = p.px;
    const py = p.py;
    const headR = cellW * 0.22;
    const bodyH = cellH * 0.35;

    ctx.save();
    ctx.translate(px, py);
    const flip = p.dir === 3 ? -1 : 1;
    ctx.scale(flip, 1);

    ctx.fillStyle = T.player;
    ctx.strokeStyle = T.wallShadow;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, -bodyH * 0.3, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -bodyH * 0.3 + headR);
    ctx.lineTo(0, bodyH * 0.5);
    ctx.stroke();

    const legPhase = (p.frame * 0.5) % (Math.PI * 2);
    const legSwing = p.moving ? Math.sin(legPhase) * 0.4 : Math.sin(p.frame * 0.3) * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, bodyH * 0.2);
    ctx.lineTo(-cellW * 0.2 - legSwing * cellW, bodyH * 0.6);
    ctx.moveTo(0, bodyH * 0.2);
    ctx.lineTo(cellW * 0.2 + legSwing * cellW, bodyH * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -bodyH * 0.1);
    ctx.lineTo(-cellW * 0.15, bodyH * 0.2);
    ctx.moveTo(0, -bodyH * 0.1);
    ctx.lineTo(cellW * 0.15, bodyH * 0.2);
    ctx.stroke();

    ctx.restore();

    for (const pt of g.particles) {
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    const mmScale = 0.08;
    const mmW = cols * mmScale * cellW;
    const mmH = rows * mmScale * cellH;
    const mmX = CANVAS_W - mmW - 12;
    const mmY = 12;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);
    ctx.strokeStyle = T.wall;
    ctx.lineWidth = 2;
    ctx.strokeRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8);

    ctx.save();
    ctx.translate(mmX, mmY);
    ctx.scale(mmScale, mmScale);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!g.grid[r][c].revealed) continue;
        ctx.fillStyle = T.floor;
        ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
      }
    }
    ctx.fillStyle = T.player;
    ctx.beginPath();
    ctx.arc(p.px, p.py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = T.exit;
    ctx.fillRect(g.exit[1] * cellW, g.exit[0] * cellH, cellW, cellH);
    ctx.restore();

    if (gameState === 'playing') {
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Keys: ${g.keysCollected}/${KEYS_REQUIRED}  Coins: ${g.coinsCollected}  Time: ${Math.ceil(timeLeft)}s  Explored: ${exploredPercent}%`, 12, 24);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 12px monospace';
      const bestKey = `${size}_${level}`;
      const best = highScoresRef.current[bestKey];
      ctx.fillText(`Speedrun: ${speedrunTime.toFixed(1)}s`, CANVAS_W - 160, 24);
      if (best !== undefined) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.fillText(`Best: ${best}s`, CANVAS_W - 160, 38);
      }
      if (g.powerUps.speedBoost > performance.now()) {
        ctx.fillStyle = '#00ff88';
        ctx.fillText('SPEED BOOST', 12, 42);
      }
      if (g.powerUps.timeFreeze > performance.now()) {
        ctx.fillStyle = '#add8e6';
        ctx.fillText('TIME FREEZE', 12, 54);
      }
    }
  }, [theme, gameState, timeLeft, exploredPercent, speedrunTime]);

  useEffect(() => {
    if (gameState === 'playing') {
      initLevel();
    }
  }, [gameState === 'playing' ? level : 0, initLevel]);

  useEffect(() => {
    const loop = (now: number) => {
      gameLoop(now);
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop, draw]);

  useEffect(() => {
    window.addEventListener('keydown', handleInput);
    return () => window.removeEventListener('keydown', handleInput);
  }, [handleInput]);

  useEffect(() => {
    return () => {
      if (touchHoldIntervalRef.current) {
        clearInterval(touchHoldIntervalRef.current);
        touchHoldIntervalRef.current = null;
      }
    };
  }, []);

  const startGame = useCallback(() => {
    playSound('go');
    setGameState('playing');
    setLevel(1);
  }, []);

  const nextLevel = useCallback(() => {
    playSound('levelup');
    setLevel(l => l + 1);
    setGameState('playing');
  }, []);

  const backToMenu = useCallback(() => {
    playSound('click');
    setGameState('menu');
  }, []);

  const highScore = (() => {
    const key = `${size}_${level}`;
    return highScoresRef.current[key];
  })();

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-zinc-900/50 rounded-xl w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between w-full max-w-[800px] flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {gameState === 'menu' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">Size:</span>
                {(['small', 'medium', 'large'] as MazeSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition touch-manipulation active:scale-95 ${size === s ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">Theme:</span>
                {(['dungeon', 'forest', 'ice', 'lava'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition touch-manipulation active:scale-95 ${theme === t ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
                  >
                    {{ dungeon: 'Dungeon', forest: 'Forest', ice: 'Ice Cave', lava: 'Lava' }[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => {
            playSound('click');
            onClose();
          }}
          className="px-4 py-2 rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 text-sm font-medium touch-manipulation active:scale-95"
        >
          Close
        </button>
      </div>

      <div style={{ touchAction: 'none', width: '100%', position: 'relative' }} className="select-none">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full rounded-lg border-2 border-zinc-600 bg-zinc-800"
          style={{ maxWidth: '100%' }}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (t) setSwipeStart({ x: t.clientX, y: t.clientY });
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (!swipeStart) return;
            const t = e.changedTouches[0];
            if (!t) { setSwipeStart(null); return; }
            const dx = t.clientX - swipeStart.x;
            const dy = t.clientY - swipeStart.y;
            const thresh = 30;
            if (Math.abs(dx) > thresh || Math.abs(dy) > thresh) {
              if (Math.abs(dx) > Math.abs(dy)) {
                movePlayer(0, dx > 0 ? 1 : -1);
              } else {
                movePlayer(dy > 0 ? 1 : -1, 0);
              }
            }
            setSwipeStart(null);
          }}
        />
        {gameState === 'playing' && typeof window !== 'undefined' && 'ontouchstart' in window && (
          <div className="absolute bottom-4 left-4 flex flex-col items-center gap-1" style={{ touchAction: 'manipulation' }}>
            <button
              className="w-14 h-12 rounded-lg bg-zinc-700/90 text-amber-400 text-xl active:bg-amber-500 active:text-black pointer-events-auto touch-manipulation"
              onTouchStart={(e) => { e.preventDefault(); movePlayer(-1, 0); }}
            >
              ▲
            </button>
            <div className="flex gap-2">
              <button
                className="w-12 h-12 rounded-lg bg-zinc-700/90 text-amber-400 text-xl active:bg-amber-500 active:text-black pointer-events-auto touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); movePlayer(0, -1); }}
              >
                ◀
              </button>
              <button
                className="w-12 h-12 rounded-lg bg-zinc-700/90 text-amber-400 text-xl active:bg-amber-500 active:text-black pointer-events-auto touch-manipulation"
                onTouchStart={(e) => { e.preventDefault(); movePlayer(0, 1); }}
              >
                ▶
              </button>
            </div>
            <button
              className="w-14 h-12 rounded-lg bg-zinc-700/90 text-amber-400 text-xl active:bg-amber-500 active:text-black pointer-events-auto touch-manipulation"
              onTouchStart={(e) => { e.preventDefault(); movePlayer(1, 0); }}
            >
              ▼
            </button>
          </div>
        )}
      </div>

      {gameState === 'menu' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-zinc-400 text-sm">Arrow keys to move • Space to reveal area</p>
          <button
            onClick={startGame}
            className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition touch-manipulation active:scale-95"
            onMouseDown={() => playSound('click')}
          >
            Start Game
          </button>
        </div>
      )}

      {gameState === 'victory' && postStats && (
        <div className="flex flex-col items-center gap-3 p-4 bg-zinc-800/80 rounded-xl">
          <h3 className="text-xl font-bold text-amber-400">Level Complete!</h3>
          <div className="text-zinc-300 text-sm space-y-1">
            <p>Time: {postStats.time}s</p>
            <p>Coins: {postStats.coins}</p>
            <p>Explored: {postStats.explored}%</p>
            {highScore !== undefined && (
              <p className="text-amber-400">Best: {highScore}s</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={nextLevel}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              Next Level
            </button>
            <button
              onClick={backToMenu}
              className="px-4 py-2 rounded-lg bg-zinc-600 text-zinc-200 hover:bg-zinc-500 touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              Menu
            </button>
          </div>
        </div>
      )}

      {gameState === 'gameover' && postStats && (
        <div className="flex flex-col items-center gap-3 p-4 bg-zinc-800/80 rounded-xl">
          <h3 className="text-xl font-bold text-red-400">Game Over</h3>
          <div className="text-zinc-300 text-sm space-y-1">
            <p>Time: {postStats.time}s</p>
            <p>Coins: {postStats.coins}</p>
            <p>Explored: {postStats.explored}%</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { playSound('click'); setGameState('playing'); initLevel(); }}
              className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 touch-manipulation active:scale-95"
            >
              Retry
            </button>
            <button
              onClick={backToMenu}
              className="px-4 py-2 rounded-lg bg-zinc-600 text-zinc-200 hover:bg-zinc-500 touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
