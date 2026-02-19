/* ═══════════════════════════════════════════════════════════════════════════════
   SNAKE GAME — Elite Arcade Edition v2
   Canvas-based, smooth interpolation, gradient snake, animated eyes,
   multiple food types, game modes, grid sizes, particles, death animation,
   FULL MOBILE TOUCH SUPPORT with swipe & on-screen D-pad,
   responsive canvas sizing, haptic feedback, trail effects, score popups,
   screen shake, improved rendering pipeline, and performance optimizations.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';
import TouchControls, { isTouchDevice, haptic } from '../TouchControls';
import {
  clamp, lerp as utilLerp, randomRange, randomInt, randomAngle,
  createBurstParticles, updateParticles, drawParticles,
  createFloatingText, updateFloatingTexts, drawFloatingTexts,
  createScreenShake, updateScreenShake, applyScreenShake,
  drawRoundedRect as utilDrawRoundedRect, drawGrid,
  hslToStr, neonGlow, clearGlow, formatScore,
  easing, FrameTimer, isMobile,
  type Particle as UtilParticle, type FloatingText, type ScreenShake as ShakeState,
} from '../GameUtils';

interface SnakeGameProps {
  onClose: () => void;
}

type Dir = 'up' | 'down' | 'left' | 'right';
type GameMode = 'classic' | 'wrap' | 'maze' | 'timeattack';
type GridSize = 'small' | 'medium' | 'large';
type FoodType = 'apple' | 'golden' | 'speed' | 'slow' | 'mega' | 'poison';

interface Pos {
  x: number;
  y: number;
}

interface Segment {
  x: number;
  y: number;
  fromX?: number;
  fromY?: number;
  displayX: number;
  displayY: number;
}

interface Food {
  x: number;
  y: number;
  type: FoodType;
  spawnTime: number;
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

interface DeathFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  segmentIndex: number;
}

const GRID_SIZES: Record<GridSize, number> = { small: 15, medium: 20, large: 30 };
const CELL_BASE = 20;
const BASE_SPEED = 120;
const MIN_SPEED = 50;
const SPEED_PER_SEGMENT = 1.5;

const FOOD_POINTS: Record<FoodType, number> = {
  apple: 10,
  golden: 50,
  speed: 10,
  slow: 10,
  mega: 25,
  poison: 0,
};

const FOOD_SPAWN_WEIGHTS: Record<FoodType, number> = {
  apple: 0.52,
  golden: 0.05,
  speed: 0.12,
  slow: 0.1,
  mega: 0.08,
  poison: 0.08,
};

const FOOD_COLORS: Record<FoodType, string> = {
  apple: '#ef4444',
  golden: '#fbbf24',
  speed: '#a78bfa',
  slow: '#60a5fa',
  mega: '#ec4899',
  poison: '#dc2626',
};

const SPEED_BOOST_EVERY_FOODS = 5;

const SNAKE_HEAD_COLOR = '#22c55e';
const SNAKE_TAIL_COLOR = '#166534';
const HIGH_SCORE_PREFIX = 'snake_high_';
const COMBO_WINDOW_MS = 800;
const SWIPE_THRESHOLD = 30;
const COMBO_MULTIPLIER_CAP = 8;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickFoodType(): FoodType {
  const types: FoodType[] = ['apple', 'golden', 'speed', 'slow', 'mega', 'poison'];
  const weights = types.map(t => FOOD_SPAWN_WEIGHTS[t]);
  return weightedRandom(types, weights);
}

export default function SnakeGame({ onClose }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [gridSize, setGridSize] = useState<GridSize>('medium');
  const [deathAnim, setDeathAnim] = useState(false);
  const [paused, setPaused] = useState(false);
  const [foodsEaten, setFoodsEaten] = useState(0);
  const [timeSurvived, setTimeSurvived] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeAttackRemaining, setTimeAttackRemaining] = useState(60);
  const [countdown, setCountdown] = useState(0);
  const [showTouch, setShowTouch] = useState(false);
  const deathProgressRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastEatTimeRef = useRef(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const shakeRef = useRef<ShakeState>({ intensity: 0, duration: 0, elapsed: 0, active: false });
  const utilParticlesRef = useRef<UtilParticle[]>([]);

  useEffect(() => {
    setShowTouch(isTouchDevice());
  }, []);

  const highScoreKey = HIGH_SCORE_PREFIX + gameMode + '_' + gridSize;
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem(highScoreKey) || '0', 10);
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      const v = parseInt(localStorage.getItem(highScoreKey) || '0', 10);
      setHighScore(v);
    } catch {}
  }, [highScoreKey]);

  const gameRef = useRef({
    dir: 'right' as Dir,
    nextDir: 'right' as Dir,
    segments: [] as Segment[],
    food: null as Food | null,
    obstacles: [] as Pos[],
    particles: [] as Particle[],
    deathFragments: [] as DeathFragment[],
    speed: BASE_SPEED,
    baseSpeed: BASE_SPEED,
    speedBoostUntil: 0,
    slowUntil: 0,
    lastMove: 0,
    gridCols: 20,
    gridRows: 20,
    wrap: false,
    foodsForLevel: 0,
  });

  const generateMazeObstacles = useCallback((cols: number, rows: number, levelNum: number) => {
    const obstacles: Pos[] = [];
    const occupied = new Set<string>();
    const midCol = Math.floor(cols / 2);
    const midRow = Math.floor(rows / 2);

    const count = Math.min(15, 2 + levelNum * 3);
    let added = 0;
    let tries = 0;
    while (added < count && tries < 300) {
      tries++;
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      const key = `${x},${y}`;
      if (occupied.has(key)) continue;
      const nearCenter = Math.abs(x - midCol) < 3 && Math.abs(y - midRow) < 3;
      if (nearCenter) continue;
      occupied.add(key);
      obstacles.push({ x, y });
      added++;
    }
    return obstacles;
  }, []);

  const spawnFood = useCallback((cols: number, rows: number, obstacles: Pos[], segments: Segment[]) => {
    const occupied = new Set<string>();
    segments.forEach(s => occupied.add(`${s.x},${s.y}`));
    obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
    const candidates: Pos[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!occupied.has(`${x},${y}`)) candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) return null;
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    return {
      x: p.x,
      y: p.y,
      type: pickFoodType(),
      spawnTime: performance.now(),
    } as Food;
  }, []);

  const addComboParticles = useCallback((cx: number, cy: number, combo: number) => {
    if (combo < 2) return;
    const g = gameRef.current;
    const extra = Math.min(combo - 1, 5);
    for (let i = 0; i < extra; i++) {
      const angle = (Math.PI * 2 * i) / Math.max(1, extra) + Math.random() * 0.3;
      const speed = 2 + combo * 0.5;
      g.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        color: combo >= 5 ? '#fbbf24' : '#ffffff',
        size: 2 + combo * 0.3,
      });
    }
  }, []);

  const addParticles = useCallback((cx: number, cy: number, color: string, count = 12) => {
    const g = gameRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      g.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  const initGame = useCallback((resetScore = true) => {
    const g = gameRef.current;
    const cols = GRID_SIZES[gridSize];
    const rows = GRID_SIZES[gridSize];
    g.gridCols = cols;
    g.gridRows = rows;
    g.wrap = gameMode === 'wrap';
    g.dir = 'right';
    g.nextDir = 'right';
    g.particles = [];
    g.deathFragments = [];
    const midX = Math.floor(cols / 2);
    const midY = Math.floor(rows / 2);
    g.segments = [
      { x: Math.max(2, midX - 2), y: midY, displayX: Math.max(2, midX - 2), displayY: midY },
    ];
    g.obstacles = gameMode === 'maze' ? generateMazeObstacles(cols, rows, 1) : [];
    g.foodsForLevel = 0;
    g.speed = BASE_SPEED;
    g.baseSpeed = BASE_SPEED;
    g.speedBoostUntil = 0;
    g.slowUntil = 0;
    g.lastMove = performance.now();
    g.food = spawnFood(cols, rows, g.obstacles, g.segments);
    if (resetScore) {
      setScore(0);
      setLevel(1);
      setFoodsEaten(0);
      setTimeSurvived(0);
      setCombo(0);
      startTimeRef.current = performance.now();
      if (gameMode === 'timeattack') setTimeAttackRemaining(60);
    }
  }, [gameMode, gridSize, generateMazeObstacles, spawnFood]);

  const gameScoreRef = useRef(0);
  gameScoreRef.current = score;

  useEffect(() => {
    if (!started || gameOver) return;
    initGame(true);
  }, [started, gameOver, initGame]);

  /* ── Direction change handler (shared by keyboard & touch) ── */
  const changeDirection = useCallback((newDir: Dir) => {
    const g = gameRef.current;
    if (newDir === 'up' && g.dir !== 'down') { g.nextDir = 'up'; haptic('light'); }
    else if (newDir === 'down' && g.dir !== 'up') { g.nextDir = 'down'; haptic('light'); }
    else if (newDir === 'left' && g.dir !== 'right') { g.nextDir = 'left'; haptic('light'); }
    else if (newDir === 'right' && g.dir !== 'left') { g.nextDir = 'right'; haptic('light'); }
  }, []);

  /* ── Keyboard controls ── */
  useEffect(() => {
    if (!started || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setPaused(p => !p);
        playSound('click');
        return;
      }
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          e.preventDefault(); changeDirection('up'); break;
        case 'ArrowDown': case 's': case 'S':
          e.preventDefault(); changeDirection('down'); break;
        case 'ArrowLeft': case 'a': case 'A':
          e.preventDefault(); changeDirection('left'); break;
        case 'ArrowRight': case 'd': case 'D':
          e.preventDefault(); changeDirection('right'); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, gameOver, changeDirection]);

  /* ── Touch swipe controls on canvas ── */
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling during game
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const dt = Date.now() - touchStartRef.current.time;

      // Tap = pause
      if (absDx < 10 && absDy < 10 && dt < 200) {
        setPaused(p => !p);
        playSound('click');
        touchStartRef.current = null;
        return;
      }

      // Swipe detection: primary axis + velocity weighting for quick flicks
      const velocity = Math.max(absDx, absDy) / Math.max(dt, 1);
      const threshold = velocity > 1.5 ? SWIPE_THRESHOLD * 0.7 : SWIPE_THRESHOLD;
      if (Math.max(absDx, absDy) > threshold) {
        const horizontal = absDx > absDy;
        if (horizontal) {
          changeDirection(dx > 0 ? 'right' : 'left');
        } else {
          changeDirection(dy > 0 ? 'down' : 'up');
        }
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
  }, [started, gameOver, changeDirection]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = gameRef.current.gridCols;
    const rows = gameRef.current.gridRows;
    const isMobileDevice = isMobile();
    const maxDim = Math.min(520, window.innerWidth - (isMobileDevice ? 24 : 48));
    const maxH = isMobileDevice ? window.innerHeight - 280 : 520;
    const cellW = Math.floor(maxDim / Math.max(cols, rows));
    const cellH = Math.floor(maxH / Math.max(cols, rows));
    const cell = Math.min(CELL_BASE, cellW, cellH);
    const W = cols * cell;
    const H = rows * cell;
    canvas.width = W;
    canvas.height = H;

    let raf: number;
    const loop = () => {
      const g = gameRef.current;
      const now = performance.now();

      if (gameMode === 'timeattack' && !deathAnim) {
        const elapsed = (now - startTimeRef.current) / 1000;
        const remaining = Math.max(0, 60 - elapsed);
        setTimeSurvived(Math.floor(elapsed));
        setTimeAttackRemaining(Math.ceil(remaining));
        if (remaining <= 0) {
          setDeathAnim(true);
          deathProgressRef.current = 0;
          g.deathFragments = g.segments.map((s, i) => ({
            x: s.displayX * cell + cell / 2,
            y: s.displayY * cell + cell / 2,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            segmentIndex: i,
          }));
          playSound('alarm');
          return;
        }
      }

      if (!paused && !deathAnim) {
        setTimeSurvived(Math.floor((now - startTimeRef.current) / 1000));
      }

      const speedMult = g.speedBoostUntil > now ? 0.6 : g.slowUntil > now ? 1.6 : 1;
      const foodSpeedBoost = Math.floor(g.foodsForLevel / SPEED_BOOST_EVERY_FOODS) * 6;
      const baseSpeed = Math.max(MIN_SPEED, BASE_SPEED - g.segments.length * SPEED_PER_SEGMENT - foodSpeedBoost);
      const speed = baseSpeed * speedMult;

      if (!paused && !deathAnim && now - g.lastMove >= speed) {
        g.dir = g.nextDir;
        const head = g.segments[0];
        let nx = head.x;
        let ny = head.y;
        if (g.dir === 'up') ny--;
        else if (g.dir === 'down') ny++;
        else if (g.dir === 'left') nx--;
        else nx++;

        if (g.wrap) {
          nx = ((nx % cols) + cols) % cols;
          ny = ((ny % rows) + rows) % rows;
        } else {
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
            g.deathFragments = g.segments.map((s, i) => ({
              x: s.displayX * cell + cell / 2,
              y: s.displayY * cell + cell / 2,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1,
              segmentIndex: i,
            }));
            setDeathAnim(true);
            deathProgressRef.current = 0;
            shakeRef.current = createScreenShake(5, 10);
            playSound('gameover');
            raf = requestAnimationFrame(loop);
            return;
          }
        }

        const obsHit = g.obstacles.some(o => o.x === nx && o.y === ny);
        if (obsHit) {
          g.deathFragments = g.segments.map((s, i) => ({
            x: s.displayX * cell + cell / 2,
            y: s.displayY * cell + cell / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            segmentIndex: i,
          }));
          setDeathAnim(true);
          deathProgressRef.current = 0;
          shakeRef.current = createScreenShake(5, 10);
          playSound('gameover');
          raf = requestAnimationFrame(loop);
          return;
        }

        const selfHit = g.segments.some(s => s.x === nx && s.y === ny);
        if (selfHit) {
          g.deathFragments = g.segments.map((s, i) => ({
            x: s.displayX * cell + cell / 2,
            y: s.displayY * cell + cell / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            segmentIndex: i,
          }));
          setDeathAnim(true);
          deathProgressRef.current = 0;
          shakeRef.current = createScreenShake(6, 12);
          playSound('gameover');
          raf = requestAnimationFrame(loop);
          return;
        }

        const poisonHit = g.food && g.food.type === 'poison' && g.food.x === nx && g.food.y === ny;
        if (poisonHit) {
          const cx = nx * cell + cell / 2;
          const cy = ny * cell + cell / 2;
          addParticles(cx, cy, '#dc2626', 24);
          utilParticlesRef.current.push(...createBurstParticles(cx, cy, 25, {
            speed: 8, colors: ['#dc2626', '#991b1b', '#7f1d1d', '#ffffff'], decay: 0.03, gravity: 0.1,
          }));
          g.deathFragments = g.segments.map((s, i) => ({
            x: s.displayX * cell + cell / 2,
            y: s.displayY * cell + cell / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            segmentIndex: i,
          }));
          setDeathAnim(true);
          deathProgressRef.current = 0;
          shakeRef.current = createScreenShake(6, 14);
          playSound('gameover');
          raf = requestAnimationFrame(loop);
          return;
        }

        const oldHead = g.segments[0];
        const newSeg: Segment = {
          x: nx,
          y: ny,
          fromX: oldHead.x,
          fromY: oldHead.y,
          displayX: oldHead.x,
          displayY: oldHead.y,
        };
        g.segments.unshift(newSeg);

        let ate = false;
        if (g.food && g.food.x === nx && g.food.y === ny) {
          ate = true;
          const foodType = g.food.type;
          const pts = FOOD_POINTS[foodType];
          const now2 = performance.now();
          const comboReset = now2 - lastEatTimeRef.current > COMBO_WINDOW_MS;
          const newCombo = comboReset ? 1 : combo + 1;
          setCombo(newCombo);
          lastEatTimeRef.current = now2;
          const comboBonus = Math.min(newCombo - 1, 5) * 5;
          const addScore = pts + comboBonus;
          setScore(s => s + addScore);
          setFoodsEaten(f => f + 1);
          g.foodsForLevel++;

          const cx = nx * cell + cell / 2;
          const cy = ny * cell + cell / 2;
          addParticles(cx, cy, FOOD_COLORS[foodType], 16);
          const burstColors = [FOOD_COLORS[foodType], FOOD_COLORS[foodType] + 'cc', '#ffffff88'];
          utilParticlesRef.current.push(...createBurstParticles(cx, cy, 18, {
            speed: 4 + (foodType === 'golden' ? 2 : 0),
            colors: burstColors,
            decay: 0.03,
            gravity: 0.06,
          }));

          // Score popup
          const popupText = comboBonus > 0 ? `+${addScore} x${newCombo}` : `+${addScore}`;
          floatingTextsRef.current.push(createFloatingText(cx, cy - 10, popupText, FOOD_COLORS[foodType], 14 + Math.min(newCombo, 4), 45));
          addComboParticles(cx, cy, newCombo);

          // Screen shake on golden
          if (foodType === 'golden') {
            shakeRef.current = createScreenShake(4, 8);
            utilParticlesRef.current.push(...createBurstParticles(cx, cy, 20, {
              speed: 6, colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#ffffff'], decay: 0.025, gravity: 0.08,
            }));
          }

          if (foodType === 'apple' || foodType === 'golden') playSound('coin');
          else playSound('powerup');

          if (foodType === 'speed') g.speedBoostUntil = now2 + 5000;
          if (foodType === 'slow') g.slowUntil = now2 + 4000;
          if (foodType === 'mega') {
            const last = g.segments[g.segments.length - 1];
            for (let i = 0; i < 5; i++) {
              g.segments.push({
                ...last,
                displayX: last.x,
                displayY: last.y,
              });
            }
          }

          const newLevel = Math.floor(g.foodsForLevel / 10) + 1;
          if (newLevel > level) {
            setLevel(newLevel);
            playSound('levelup');
            if (gameMode === 'maze') {
              g.obstacles = generateMazeObstacles(cols, rows, newLevel);
            }
          }

          g.food = spawnFood(cols, rows, g.obstacles, g.segments);
        }

        if (!ate) g.segments.pop();
        g.lastMove = now;
      }

      const moveT = deathAnim ? 1 : Math.min(1, (now - g.lastMove) / speed);
      for (let i = 0; i < g.segments.length; i++) {
        const s = g.segments[i];
        if (i === 0 && s.fromX !== undefined && s.fromY !== undefined) {
          g.segments[i].displayX = lerp(s.fromX, s.x, moveT);
          g.segments[i].displayY = lerp(s.fromY, s.y, moveT);
        } else if (i > 0) {
          const prev = g.segments[i - 1];
          g.segments[i].displayX = lerp(s.displayX, prev.x, 0.3);
          g.segments[i].displayY = lerp(s.displayY, prev.y, 0.3);
        }
      }

      g.particles = g.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        return p.life > 0;
      });

      if (deathAnim) {
        g.deathFragments.forEach(f => {
          f.x += f.vx;
          f.y += f.vy;
          f.vy += 0.3;
          f.life -= 0.02;
        });
        deathProgressRef.current = Math.min(1, deathProgressRef.current + 0.015);
        if (deathProgressRef.current >= 1) {
          setGameOver(true);
          setDeathAnim(false);
          deathProgressRef.current = 0;
        }
      }

      const gridPulse = 0.96 + Math.sin(now * 0.003) * 0.04;
      ctx.save();
      if (shakeRef.current.active) applyScreenShake(ctx, shakeRef.current);
      ctx.fillStyle = `rgba(15, 23, 42, ${gridPulse})`;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = `rgba(71, 85, 105, ${0.2 + Math.sin(now * 0.002) * 0.1})`;
      ctx.lineWidth = 1;
      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, H);
        ctx.stroke();
      }
      for (let i = 0; i <= rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(W, i * cell);
        ctx.stroke();
      }

      g.obstacles.forEach(o => {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(o.x * cell + 2, o.y * cell + 2, cell - 4, cell - 4);
        ctx.strokeRect(o.x * cell + 2, o.y * cell + 2, cell - 4, cell - 4);
      });

      g.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      if (g.food && !deathAnim) {
        const foodPulse = 0.8 + Math.sin((now - g.food.spawnTime) * 0.008) * 0.2;
        const fx = g.food.x * cell + cell / 2;
        const fy = g.food.y * cell + cell / 2;
        const r = (cell * 0.4) * foodPulse;
        const color = FOOD_COLORS[g.food.type];
        const glowAlpha = 0.5 + Math.sin(now * 0.012) * 0.25;
        const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, r * 2.5);
        grad.addColorStop(0, color);
        grad.addColorStop(0.5, color);
        grad.addColorStop(0.8, color + '88');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = glowAlpha;
        ctx.beginPath();
        ctx.arc(fx, fy, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fx, fy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (g.food.type === 'golden') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(fx, fy, r * 0.7, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (g.food.type === 'poison') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(fx, fy, r * 1.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(fx, fy, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!deathAnim) {
        const deathAlpha = 1;
        g.segments.forEach((s, i) => {
          const t = i / Math.max(1, g.segments.length - 1);
          const r = lerp(parseInt(SNAKE_HEAD_COLOR.slice(1, 3), 16) / 255, parseInt(SNAKE_TAIL_COLOR.slice(1, 3), 16) / 255, t);
          const g_ = lerp(parseInt(SNAKE_HEAD_COLOR.slice(3, 5), 16) / 255, parseInt(SNAKE_TAIL_COLOR.slice(3, 5), 16) / 255, t);
          const b = lerp(parseInt(SNAKE_HEAD_COLOR.slice(5, 7), 16) / 255, parseInt(SNAKE_TAIL_COLOR.slice(5, 7), 16) / 255, t);
          ctx.fillStyle = `rgba(${Math.floor(r * 255)}, ${Math.floor(g_ * 255)}, ${Math.floor(b * 255)}, ${deathAlpha})`;
          const pad = 2;
          const cx = s.displayX * cell + cell / 2;
          const cy = s.displayY * cell + cell / 2;
          const size = (cell - pad * 2) / 2;
          drawRoundedRect(ctx, cx - size, cy - size, size * 2, size * 2, 4);
          ctx.fill();

          if (i === 0) {
            const dir = g.dir;
            const eyeOff = size * 0.35;
            const pupilOff = size * 0.15;
            const blink = Math.sin(now * 0.01) > 0.95 ? 0.1 : 1;
            let ex1 = cx, ey1 = cy, ex2 = cx, ey2 = cy;
            if (dir === 'right') {
              ex1 = cx + eyeOff; ey1 = cy - eyeOff * 0.6;
              ex2 = cx + eyeOff; ey2 = cy + eyeOff * 0.6;
            } else if (dir === 'left') {
              ex1 = cx - eyeOff; ey1 = cy - eyeOff * 0.6;
              ex2 = cx - eyeOff; ey2 = cy + eyeOff * 0.6;
            } else if (dir === 'up') {
              ex1 = cx - eyeOff * 0.6; ey1 = cy - eyeOff;
              ex2 = cx + eyeOff * 0.6; ey2 = cy - eyeOff;
            } else {
              ex1 = cx - eyeOff * 0.6; ey1 = cy + eyeOff;
              ex2 = cx + eyeOff * 0.6; ey2 = cy + eyeOff;
            }
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.ellipse(ex1, ey1, size * 0.35, size * 0.25 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(ex2, ey2, size * 0.35, size * 0.25 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(ex1, ey1, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex2, ey2, size * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      g.deathFragments.forEach(f => {
        ctx.globalAlpha = f.life;
        ctx.fillStyle = f.segmentIndex === 0 ? SNAKE_HEAD_COLOR : SNAKE_TAIL_COLOR;
        ctx.fillRect(f.x - 4, f.y - 4, 8, 8);
        ctx.globalAlpha = 1;
      });

      if (deathAnim) {
        ctx.fillStyle = `rgba(220, 38, 38, ${deathProgressRef.current * 0.2})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Update & draw floating score texts
      floatingTextsRef.current = updateFloatingTexts(floatingTextsRef.current);
      drawFloatingTexts(ctx, floatingTextsRef.current);

      // Update & draw burst particles from GameUtils
      utilParticlesRef.current = updateParticles(utilParticlesRef.current);
      drawParticles(ctx, utilParticlesRef.current);

      // Update screen shake
      if (shakeRef.current.active) {
        shakeRef.current = updateScreenShake(shakeRef.current);
      }

      if (paused && !gameOver && !deathAnim) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 12;
        ctx.fillText('PAUSED', W / 2, H / 2 - 10);
        ctx.shadowBlur = 0;
        ctx.font = '14px system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(showTouch ? 'Tap to resume' : 'Space to resume', W / 2, H / 2 + 20);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    started,
    gameOver,
    score,
    level,
    gameMode,
    gridSize,
    deathAnim,
    paused,
    combo,
    addParticles,
    addComboParticles,
    generateMazeObstacles,
    spawnFood,
  ]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(highScoreKey, String(score));
      } catch {}
    }
  }, [score, highScore, highScoreKey]);

  const handleStart = () => {
    setGameOver(false);
    setDeathAnim(false);
    setPaused(false);
    deathProgressRef.current = 0;
    playSound('click');
    if (gameMode === 'timeattack') {
      setCountdown(3);
      const interval = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(interval);
            setStarted(true);
            startTimeRef.current = performance.now();
            playSound('go');
            return 0;
          }
          playSound('countdown');
          return c - 1;
        });
      }, 1000);
    } else {
      setStarted(true);
      startTimeRef.current = performance.now();
    }
  };

  const handleRestart = () => {
    setGameOver(false);
    setDeathAnim(false);
    setPaused(false);
    setStarted(true);
    playSound('click');
  };

  if (!started) {
    return (
      <div ref={containerRef} className="game-card bg-slate-900 border border-slate-700 text-slate-100 rounded-xl shadow-xl w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-400">🐍 Elite Snake</h2>
          <button onClick={onClose} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm touch-manipulation">Close</button>
        </div>
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-300 mb-2">Game Mode</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(['classic', 'wrap', 'maze', 'timeattack'] as GameMode[]).map(m => (
              <button
                key={m}
                onClick={() => setGameMode(m)}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors touch-manipulation ${
                  gameMode === m ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {m === 'timeattack' ? 'Time Attack' : m}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <p className="text-sm font-medium text-slate-300 mb-2">Grid Size</p>
          <div className="flex gap-1.5 sm:gap-2">
            {(['small', 'medium', 'large'] as GridSize[]).map(s => (
              <button
                key={s}
                onClick={() => setGridSize(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors touch-manipulation ${
                  gridSize === s ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {s} ({GRID_SIZES[s]}×{GRID_SIZES[s]})
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 text-sm text-slate-400">
          Best ({gameMode}/{gridSize}): <strong className="text-emerald-400">{highScore}</strong>
        </div>
        <div className="relative rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-800 w-full" style={{ maxWidth: '100%' }}>
          <canvas ref={canvasRef} width={400} height={400} className="block w-full" style={{ maxWidth: '100%' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95">
            {countdown > 0 ? (
              <p className="text-5xl sm:text-6xl font-bold text-emerald-400 animate-pulse">{countdown}</p>
            ) : (
              <>
                <p className="text-slate-300 font-medium mb-3 text-sm sm:text-base text-center px-4">
                  {showTouch ? 'Swipe to move · Tap to pause' : '↑↓←→ Move · Space Pause'}
                </p>
                <button onClick={handleStart} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-lg touch-manipulation active:scale-95">
                  Start Game
                </button>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 space-y-1">
          <p>🍎 Apple 10 · 🟡 Golden 50 · 🟣 Speed · 🔵 Slow · 💗 Mega +5 len</p>
          <p>☠️ Poison (red) = instant death · Combo: eat quickly for bonus</p>
          <p>Every 5 foods = speed boost · Every 10 foods = level up</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="game-card bg-slate-900 border border-slate-700 text-slate-100 rounded-xl shadow-xl w-full max-w-lg mx-auto game-active">
      <div className="flex items-center justify-between mb-2 sm:mb-4 flex-wrap gap-1 sm:gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-emerald-400">🐍 Elite Snake</h2>
        <div className="flex gap-2">
          {showTouch && (
            <button onClick={() => setPaused(p => !p)} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm touch-manipulation">
              {paused ? '▶' : '⏸'}
            </button>
          )}
          <button onClick={onClose} className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-sm touch-manipulation">Close</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 mb-2 sm:mb-3 text-xs sm:text-sm">
        <span>Score: <strong className="text-emerald-400">{formatScore(score)}</strong></span>
        <span>Best: <strong>{formatScore(highScore)}</strong></span>
        <span>Lv: <strong>{level}</strong></span>
        <span>Len: <strong>{gameRef.current.segments.length}</strong></span>
        {combo > 1 && <span className="text-amber-400 font-bold">x{combo}!</span>}
        {gameMode === 'timeattack' && (
          <span className={`font-mono ${timeAttackRemaining <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
            ⏱{timeAttackRemaining}s
          </span>
        )}
      </div>

      {!showTouch && <p className="text-xs text-slate-500 mb-2">↑↓←→ Move · Space Pause</p>}

      <div className="relative rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-800 w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
        <canvas ref={canvasRef} className="block w-full" style={{ maxWidth: '100%', touchAction: 'none' }} />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4 sm:p-6">
            <p className="text-xl sm:text-2xl font-bold text-red-400 mb-2">Game Over</p>
            <p className="text-slate-300 mb-1">Score: {formatScore(score)}</p>
            <div className="text-xs sm:text-sm text-slate-400 space-y-0.5 mb-4 sm:mb-6 text-center">
              <p>Length: {gameRef.current.segments.length} · Time: {timeSurvived}s · Foods: {foodsEaten}</p>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={handleRestart} className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors touch-manipulation active:scale-95">
                Play Again
              </button>
              <button onClick={onClose} className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium transition-colors touch-manipulation active:scale-95">
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch D-Pad */}
      {showTouch && started && !gameOver && (
        <TouchControls
          layout="dpad"
          onDirection={changeDirection}
          onAction={() => setPaused(p => !p)}
          actionLabel="⏸"
          size="md"
        />
      )}

      <div className="mt-2 sm:mt-4 text-xs text-slate-500">
        {showTouch ? 'Swipe on board or use D-pad · Tap to pause · Avoid red poison!' : '🍎 10 · 🟡 50 · 🟣 Speed · 🔵 Slow · 💗 Mega +5 · ☠️ Poison kills · Combo bonus'}
      </div>
    </div>
  );
}
