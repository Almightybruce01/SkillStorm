/* ═══════════════════════════════════════════════════════════
   BREAKOUT GAME — Arcade
   Massive fully-featured Breakout/Arkanoid clone
   10 levels, 6 brick types, 8 power-ups, boss battles, particles
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface BreakoutGameProps {
  onClose: () => void;
}

const W = 520;
const H = 640;
const PADDLE_W = 90;
const PADDLE_H = 16;
const BALL_R = 7;
const BRICK_W = 40;
const BRICK_H = 18;
const ROWS = 10;
const COLS = 11;
const BASE_BALL_SPEED = 5.2;
const SPEED_PER_LEVEL = 0.4;
const MAX_BALL_SPEED = 14;
const COMBO_SCORE_PER_HIT = 10;
const HIGH_SCORE_KEY = 'skillzstorm_breakout_highscore';

type BrickType = 'normal' | 'silver' | 'gold' | 'explosive' | 'indestructible' | 'rainbow';
type PowerUpType = 'wide' | 'laser' | 'multiball' | 'sticky' | 'fireball' | 'slow' | 'extralife' | 'magnet';
type LevelPattern = 'pyramid' | 'diamond' | 'checkerboard' | 'spiral' | 'fortress' | 'zigzag' | 'heart' | 'skull' | 'wave' | 'random';

interface Brick {
  x: number;
  y: number;
  type: BrickType;
  hp: number;
  maxHp: number;
  color: string;
  id: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  stuck: boolean;
  fire: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
}

interface Laser {
  x: number;
  y: number;
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

interface ScorePopup {
  x: number;
  y: number;
  value: number;
  life: number;
  vy: number;
}

interface PaddleTrail {
  x: number;
  y: number;
  w: number;
  alpha: number;
}

interface Boss {
  x: number;
  y: number;
  vx: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shootTimer: number;
}

const BRICK_COLORS: Record<BrickType, string> = {
  normal: '#ef4444',
  silver: '#94a3b8',
  gold: '#f59e0b',
  explosive: '#8b5cf6',
  indestructible: '#475569',
  rainbow: 'hsl(300, 100%, 60%)',
};

function brickColor(type: BrickType, hp: number, maxHp: number, hueOffset = 0): string {
  if (type === 'rainbow') return `hsl(${(hueOffset + Date.now() / 50) % 360}, 100%, 60%)`;
  if (type === 'gold' && maxHp > 1) {
    const t = hp / maxHp;
    return t > 0.66 ? '#fbbf24' : t > 0.33 ? '#f59e0b' : '#d97706';
  }
  if (type === 'silver' && maxHp > 1) {
    const t = hp / maxHp;
    return t > 0.5 ? '#cbd5e1' : '#94a3b8';
  }
  return BRICK_COLORS[type] || '#ef4444';
}

function scoreForBrick(type: BrickType, maxHp: number): number {
  if (type === 'normal') return 10;
  if (type === 'silver') return 25 * maxHp;
  if (type === 'gold') return 40 * maxHp;
  if (type === 'explosive') return 80;
  if (type === 'indestructible') return 0;
  if (type === 'rainbow') return 60;
  return 10;
}

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  wide: '#22c55e',
  laser: '#ef4444',
  multiball: '#8b5cf6',
  sticky: '#f59e0b',
  fireball: '#f97316',
  slow: '#06b6d4',
  extralife: '#ec4899',
  magnet: '#6366f1',
};

function getPatternCoords(pattern: LevelPattern, level: number): { row: number; col: number; type: BrickType }[] {
  const result: { row: number; col: number; type: BrickType }[] = [];
  const types: BrickType[] = ['normal', 'silver', 'gold', 'explosive', 'rainbow'];
  const pickType = (r: number, c: number): BrickType => {
    const idx = Math.floor(Math.random() * (types.length + 2));
    if (idx < types.length) return types[idx];
    if (idx === types.length) return level > 3 ? 'explosive' : 'normal';
    return level > 2 ? 'rainbow' : 'silver';
  };

  const centerC = Math.floor(COLS / 2);
  const centerR = Math.floor(ROWS / 2);

  switch (pattern) {
    case 'pyramid':
      for (let r = 0; r < ROWS; r++) {
        const width = r + 2;
        const start = centerC - Math.floor(width / 2);
        for (let c = 0; c < width && start + c < COLS; c++) {
          result.push({ row: r, col: start + c, type: pickType(r, c) });
        }
      }
      break;
    case 'diamond':
      for (let r = 0; r < ROWS; r++) {
        const half = r < centerR ? r : ROWS - 1 - r;
        for (let c = centerC - half; c <= centerC + half; c++) {
          if (c >= 0 && c < COLS) result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    case 'checkerboard':
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    case 'spiral': {
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      let r = 0, c = 0, dir = 0, steps = 1, stepCount = 0, leg = 0;
      const seen = new Set<string>();
      for (let i = 0; i < ROWS * COLS - 5; i++) {
        const key = `${r},${c}`;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS && !seen.has(key)) {
          seen.add(key);
          result.push({ row: r, col: c, type: pickType(r, c) });
        }
        r += dirs[dir][0];
        c += dirs[dir][1];
        stepCount++;
        if (stepCount >= steps) {
          stepCount = 0;
          dir = (dir + 1) % 4;
          leg++;
          if (leg % 2 === 0) steps++;
        }
      }
      break;
    }
    case 'fortress':
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const edge = r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1;
          const inner = r >= 2 && r < ROWS - 2 && c >= 2 && c < COLS - 2;
          if (edge || (inner && (r === 2 || r === ROWS - 3 || c === 2 || c === COLS - 3))) {
            result.push({ row: r, col: c, type: r === 0 ? 'indestructible' : pickType(r, c) });
          }
        }
      }
      break;
    case 'zigzag':
      for (let r = 0; r < ROWS; r++) {
        const offset = r % 2;
        for (let c = offset; c < COLS; c += 2) {
          result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    case 'heart': {
      const heart = [
        [0,0,0,0,0,0,0,0,0,0,0],
        [0,0,1,1,0,0,0,1,1,0,0],
        [0,1,1,1,1,0,1,1,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,0,0,1,1,1,1,1,0,0,0],
        [0,0,0,0,1,1,1,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0],
      ];
      for (let r = 0; r < Math.min(ROWS, heart.length); r++) {
        for (let c = 0; c < COLS; c++) {
          if (heart[r]?.[c]) result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    }
    case 'skull': {
      const skull = [
        [0,0,0,0,1,1,1,0,0,0,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,1,1,0,1,1,1,0,1,1,0],
        [0,1,1,1,1,1,1,1,1,1,0],
        [0,0,1,1,1,1,1,1,1,0,0],
        [0,0,1,1,1,0,1,1,1,0,0],
        [0,0,0,1,0,0,0,1,0,0,0],
      ];
      for (let r = 0; r < Math.min(ROWS, skull.length); r++) {
        for (let c = 0; c < COLS; c++) {
          if (skull[r]?.[c]) result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    }
    case 'wave':
      for (let r = 0; r < ROWS; r++) {
        const wave = Math.sin(r * 0.8) * 2;
        const start = Math.max(0, Math.floor(centerC + wave - 3));
        const end = Math.min(COLS, Math.ceil(centerC + wave + 4));
        for (let c = start; c < end; c++) {
          result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
    case 'random':
    default:
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (Math.random() < 0.75) result.push({ row: r, col: c, type: pickType(r, c) });
        }
      }
      break;
  }
  return result;
}

const PATTERNS: LevelPattern[] = ['pyramid', 'diamond', 'checkerboard', 'spiral', 'fortress', 'zigzag', 'heart', 'skull', 'wave', 'random'];

function spawnParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random();
    const speed = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      size: 2 + Math.random() * 4,
    });
  }
  return particles;
}

export default function BreakoutGame({ onClose }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch { return 0; }
  });
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [showLevelTransition, setShowLevelTransition] = useState(false);
  const [bricksDestroyed, setBricksDestroyed] = useState(0);
  const [longestCombo, setLongestCombo] = useState(0);
  const [powerUpsCollected, setPowerUpsCollected] = useState(0);
  const brickIdRef = useRef(0);
  const powerUpFlashRef = useRef(0);
  const screenShakeRef = useRef(0);

  const gameRef = useRef({
    bricks: [] as Brick[],
    balls: [] as Ball[],
    powerUps: [] as PowerUp[],
    lasers: [] as Laser[],
    particles: [] as Particle[],
    paddleTrail: [] as PaddleTrail[],
    boss: null as Boss | null,
    bossProjectiles: [] as { x: number; y: number; vy: number }[],
    paddleX: W / 2 - PADDLE_W / 2,
    paddleW: PADDLE_W,
    wideUntil: 0,
    stickyUntil: 0,
    laserUntil: 0,
    fireballUntil: 0,
    slowUntil: 0,
    magnetUntil: 0,
    comboCount: 0,
    laserCooldown: 0,
    scorePopups: [] as ScorePopup[],
  });

  const buildLevel = useCallback((lvl: number) => {
    const isBossLevel = lvl % 5 === 0;
    const pattern = PATTERNS[(lvl - 1) % PATTERNS.length];
    const coords = getPatternCoords(pattern, lvl);

    const bricks: Brick[] = coords.map(({ row, col, type }) => {
      const maxHp = type === 'normal' ? 1 : type === 'silver' ? 2 : type === 'gold' ? 3 : 1;
      return {
        x: col * BRICK_W + 8,
        y: row * BRICK_H + 70,
        type,
        hp: maxHp,
        maxHp,
        color: brickColor(type, maxHp, maxHp, col * 30 + row * 20),
        id: brickIdRef.current++,
      };
    });

    return { bricks, isBossLevel };
  }, []);

  const addBoss = useCallback(() => {
    gameRef.current.boss = {
      x: W / 2 - 80,
      y: 40,
      vx: 3,
      width: 160,
      height: 24,
      hp: 20,
      maxHp: 20,
      shootTimer: 0,
    };
  }, []);

  const spawnBall = useCallback((stuck = true, fire = false) => {
    const g = gameRef.current;
    g.balls.push({
      x: g.paddleX + g.paddleW / 2,
      y: H - PADDLE_H - BALL_R - 6,
      vx: 0,
      vy: 0,
      stuck,
      fire: fire,
      trail: [],
    });
  }, []);

  const ballSpeedForLevel = useCallback((lvl: number) => {
    return Math.min(MAX_BALL_SPEED, BASE_BALL_SPEED + (lvl - 1) * SPEED_PER_LEVEL);
  }, []);

  const getCurrentBallSpeed = useCallback((ball: Ball, lvl: number) => {
    const base = ballSpeedForLevel(lvl);
    const current = Math.hypot(ball.vx, ball.vy);
    if (current < 0.1) return base;
    const mult = gameRef.current.slowUntil > Date.now() ? 0.6 : 1;
    return Math.min(MAX_BALL_SPEED, current * mult);
  }, [ballSpeedForLevel]);

  useEffect(() => {
    try {
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
      }
    } catch {}
  }, [score, highScore]);

  useEffect(() => {
    if (!started || gameOver) return;
    const { bricks, isBossLevel } = buildLevel(level);
    const g = gameRef.current;
    g.bricks = bricks;
    g.balls = [];
    g.powerUps = [];
    g.lasers = [];
    g.particles = [];
    g.paddleTrail = [];
    g.boss = null;
    g.bossProjectiles = [];
    g.paddleW = PADDLE_W;
    g.wideUntil = 0;
    g.stickyUntil = 0;
    g.laserUntil = 0;
    g.fireballUntil = 0;
    g.slowUntil = 0;
    g.magnetUntil = 0;
    g.comboCount = 0;
    g.laserCooldown = 0;
    g.paddleX = W / 2 - g.paddleW / 2;
    g.scorePopups = [];

    if (isBossLevel) {
      addBoss();
    }
    spawnBall(true);
  }, [started, gameOver, level, buildLevel, spawnBall, addBoss]);

  useEffect(() => {
    if (!started || gameOver || !showLevelTransition) return;
    const t = setTimeout(() => setShowLevelTransition(false), 1500);
    return () => clearTimeout(t);
  }, [started, gameOver, showLevelTransition, level]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') e.preventDefault();
      keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key] = false;
    };
    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W;
      gameRef.current.paddleX = Math.max(0, Math.min(W - gameRef.current.paddleW, x - gameRef.current.paddleW / 2));
    };
    const getTouchX = (e: TouchEvent) => {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      return (t.clientX - rect.left) * scaleX;
    };
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const x = getTouchX(e);
      if (x != null) {
        gameRef.current.paddleX = Math.max(0, Math.min(W - gameRef.current.paddleW, x - gameRef.current.paddleW / 2));
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const x = getTouchX(e);
      if (x != null) {
        gameRef.current.paddleX = Math.max(0, Math.min(W - gameRef.current.paddleW, x - gameRef.current.paddleW / 2));
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const stuck = gameRef.current.balls.find(b => b.stuck);
      if (stuck) {
        e.preventDefault();
        stuck.stuck = false;
        const speed = ballSpeedForLevel(level);
        const g = gameRef.current;
        const rel = (stuck.x - (g.paddleX + g.paddleW / 2)) / (g.paddleW / 2);
        const angle = (0.5 + Math.max(-0.4, Math.min(0.4, rel * 0.5))) * Math.PI;
        stuck.vx = Math.cos(angle) * speed * (rel > 0 ? 1 : -1);
        stuck.vy = -Math.sin(angle) * speed;
        playSound('pop');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    const keyInterval = setInterval(() => {
      const g = gameRef.current;
      const move = 14;
      if (keys['ArrowLeft']) g.paddleX = Math.max(0, g.paddleX - move);
      if (keys['ArrowRight']) g.paddleX = Math.min(W - g.paddleW, g.paddleX + move);
    }, 16);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      clearInterval(keyInterval);
    };
  }, [started, gameOver, level, ballSpeedForLevel]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let spacePressed = false;
    const handleSpace = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      e.preventDefault();
      if (spacePressed) return;
      spacePressed = true;
      const g = gameRef.current;
      const stuck = g.balls.find(b => b.stuck);
      if (stuck) {
        stuck.stuck = false;
        const speed = ballSpeedForLevel(level);
        const rel = (stuck.x - (g.paddleX + g.paddleW / 2)) / (g.paddleW / 2);
        const angle = (0.5 + Math.max(-0.4, Math.min(0.4, rel * 0.5))) * Math.PI;
        stuck.vx = Math.cos(angle) * speed * (rel > 0 ? 1 : -1);
        stuck.vy = -Math.sin(angle) * speed;
        playSound('pop');
      } else if (g.laserUntil > Date.now() && g.laserCooldown <= 0) {
        g.lasers.push({ x: g.paddleX + g.paddleW / 2, y: H - PADDLE_H });
        g.laserCooldown = 8;
        playSound('laser');
      }
    };
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spacePressed = false;
    };
    window.addEventListener('keydown', handleSpace);
    window.addEventListener('keyup', handleSpaceUp);
    return () => {
      window.removeEventListener('keydown', handleSpace);
      window.removeEventListener('keyup', handleSpaceUp);
    };
  }, [started, gameOver, level, ballSpeedForLevel]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speed = ballSpeedForLevel(level);
    let raf: number;
    const loop = () => {
      const g = gameRef.current;
      const now = Date.now();

      if (g.wideUntil > now) g.paddleW = PADDLE_W * 1.8;
      else g.paddleW = PADDLE_W;

      if (g.laserCooldown > 0) g.laserCooldown--;

      g.powerUps = g.powerUps.filter(pu => {
        pu.y += pu.vy;
        if (pu.y > H) return false;
        const px = g.paddleX, py = H - PADDLE_H, pw = g.paddleW, ph = PADDLE_H;
        if (pu.x >= px - 10 && pu.x <= px + pw + 10 && pu.y >= py - 5 && pu.y <= py + ph + 5) {
          setPowerUpsCollected(p => p + 1);
          powerUpFlashRef.current = 1;
          screenShakeRef.current = 14;
          playSound('powerup');
          if (pu.type === 'wide') g.wideUntil = now + 10000;
          else if (pu.type === 'sticky') g.stickyUntil = now + 8000;
          else if (pu.type === 'laser') g.laserUntil = now + 8000;
          else if (pu.type === 'slow') g.slowUntil = now + 6000;
          else if (pu.type === 'extralife') {
            setLives(l => l + 1);
            playSound('extra_life');
          } else if (pu.type === 'magnet') g.magnetUntil = now + 10000;
          else if (pu.type === 'fireball') g.fireballUntil = now + 12000;
          else if (pu.type === 'multiball') {
            const movingBalls = g.balls.filter(b => !b.stuck);
            const src = movingBalls[0] || g.balls[0];
            if (src) {
              const a = Math.atan2(src.vy, src.vx);
              const s = Math.hypot(src.vx, src.vy) || speed;
              for (let i = -1; i <= 1; i++) {
                if (i === 0) continue;
                const angle = a + i * 0.4;
                g.balls.push({
                  ...src,
                  vx: Math.cos(angle) * s,
                  vy: Math.sin(angle) * s,
                  stuck: false,
                  trail: [],
                });
              }
            }
          }
          return false;
        }
        return true;
      });

      if (g.laserUntil > now && g.laserCooldown <= 0 && Math.random() < 0.02) {
        g.lasers.push({ x: g.paddleX + g.paddleW / 2, y: H - PADDLE_H });
        g.laserCooldown = 12;
      }

      g.lasers = g.lasers.filter(laser => {
        laser.y -= 14;
        if (laser.y < 0) return false;
        g.bricks = g.bricks.filter(br => {
          if (br.type === 'indestructible') return true;
          if (laser.x >= br.x && laser.x <= br.x + BRICK_W && laser.y >= br.y && laser.y <= br.y + BRICK_H) {
            br.hp--;
            playSound('hit');
            if (br.hp <= 0) {
              const pts = scoreForBrick(br.type, br.maxHp);
              setScore(s => s + pts);
              g.scorePopups.push({ x: br.x + BRICK_W / 2, y: br.y + BRICK_H / 2, value: pts, life: 1, vy: -1.5 });
              setBricksDestroyed(b => b + 1);
              g.particles.push(...spawnParticles(br.x + BRICK_W / 2, br.y + BRICK_H / 2, br.color, 8));
              if (br.type === 'rainbow' || Math.random() < 0.15) {
                const types: PowerUpType[] = ['wide', 'sticky', 'laser', 'multiball', 'fireball', 'slow', 'extralife', 'magnet'];
                g.powerUps.push({
                  x: br.x + BRICK_W / 2 - 12,
                  y: br.y + BRICK_H / 2,
                  type: types[Math.floor(Math.random() * types.length)],
                  vy: 2.5,
                });
              }
              return false;
            }
            br.color = brickColor(br.type, br.hp, br.maxHp);
            return true;
          }
          return true;
        });
        if (g.boss && laser.y <= g.boss.y + g.boss.height && laser.x >= g.boss.x && laser.x <= g.boss.x + g.boss.width) {
          g.boss.hp--;
          playSound('hit');
          return false;
        }
        return laser.y > 0;
      });

      if (g.boss) {
        g.boss.x += g.boss.vx;
        if (g.boss.x <= 0 || g.boss.x + g.boss.width >= W) g.boss.vx *= -1;
        g.boss.shootTimer++;
        if (g.boss.shootTimer > 90) {
          g.boss.shootTimer = 0;
          g.bossProjectiles.push({
            x: g.boss.x + g.boss.width / 2,
            y: g.boss.y + g.boss.height,
            vy: 6,
          });
        }
      }

      g.bossProjectiles = g.bossProjectiles.filter(proj => {
        proj.y += proj.vy;
        if (proj.y > H) return false;
        const px = g.paddleX, py = H - PADDLE_H, pw = g.paddleW, ph = PADDLE_H;
        if (proj.x >= px && proj.x <= px + pw && proj.y >= py && proj.y <= py + ph) {
          setLives(l => l - 1);
          playSound('hit');
          if (lives - 1 <= 0) setGameOver(true);
          else spawnBall(true);
          return false;
        }
        return true;
      });

      g.particles = g.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.025;
        p.vy += 0.2;
        return p.life > 0;
      });

      powerUpFlashRef.current = Math.max(0, powerUpFlashRef.current - 0.05);
      screenShakeRef.current = Math.max(0, screenShakeRef.current - 0.6);
      g.scorePopups = g.scorePopups.map(p => ({ ...p, y: p.y + p.vy, life: p.life - 0.028 })).filter(p => p.life > 0);
      g.paddleTrail.unshift({ x: g.paddleX, y: H - PADDLE_H, w: g.paddleW, alpha: 1 });
      if (g.paddleTrail.length > 8) g.paddleTrail.pop();
      g.paddleTrail.forEach((t, i) => { t.alpha = 1 - (i / 8) * 0.9; });
      const ballNearBottom = g.balls.some(b => !b.stuck && b.y > H - 130);

      const slowMult = g.slowUntil > now ? 0.6 : 1;
      const magnetActive = g.magnetUntil > now;

      g.balls = g.balls.filter(ball => {
        if (ball.stuck) {
          ball.x = g.paddleX + g.paddleW / 2;
          ball.y = H - PADDLE_H - BALL_R - 6;
          ball.fire = g.fireballUntil > now;
          return true;
        }

        const currentSpeed = Math.hypot(ball.vx, ball.vy);
        const targetSpeed = Math.min(MAX_BALL_SPEED, (currentSpeed || speed) + 0.002) * slowMult;
        if (currentSpeed > 0.1) {
          const scale = targetSpeed / currentSpeed;
          ball.vx *= scale;
          ball.vy *= scale;
        }

        if (magnetActive) {
          const px = g.paddleX + g.paddleW / 2;
          const py = H - PADDLE_H - 30;
          const dx = px - ball.x;
          const dy = py - ball.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 5) {
            const force = 0.15 / (dist / 60);
            ball.vx += (dx / dist) * force;
            ball.vy += (dy / dist) * force;
          }
        }

        ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 1 });
        if (ball.trail.length > 12) ball.trail.pop();
        ball.trail.forEach((t, i) => { t.alpha = 1 - i / 12; });

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
        if (ball.x + BALL_R >= W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

        if (ball.y + BALL_R >= H - PADDLE_H) {
          if (ball.x >= g.paddleX && ball.x <= g.paddleX + g.paddleW) {
            ball.y = H - PADDLE_H - BALL_R - 1;
            const rel = (ball.x - (g.paddleX + g.paddleW / 2)) / (g.paddleW / 2);
            const angle = (0.5 + Math.max(-0.45, Math.min(0.45, rel * 0.5))) * Math.PI;
            const s = Math.min(MAX_BALL_SPEED, getCurrentBallSpeed(ball, level));
            ball.vx = Math.cos(angle) * s * (rel > 0 ? 1 : -1);
            ball.vy = -Math.sin(angle) * s;
            ball.fire = g.fireballUntil > now;
            if (g.stickyUntil > now) ball.stuck = true;
            g.comboCount = 0;
            playSound('hit');
          }
        }

        if (ball.y > H) return false;

        let hitBr: Brick | null = null;
        let reflectVx = false;
        let reflectVy = false;

        for (let i = 0; i < g.bricks.length; i++) {
          const br = g.bricks[i];
          if (br.type === 'indestructible' && !ball.fire) continue;
          if (ball.x + BALL_R < br.x || ball.x - BALL_R > br.x + BRICK_W) continue;
          if (ball.y + BALL_R < br.y || ball.y - BALL_R > br.y + BRICK_H) continue;
          hitBr = br;
          const overlapX = ball.vx > 0 ? (br.x + BRICK_W) - (ball.x - BALL_R) : (ball.x + BALL_R) - br.x;
          const overlapY = ball.vy > 0 ? (br.y + BRICK_H) - (ball.y - BALL_R) : (ball.y + BALL_R) - br.y;
          reflectVx = overlapX < overlapY;
          reflectVy = !reflectVx;
          break;
        }

        if (hitBr) {
          const br = hitBr;
          g.comboCount++;
          setLongestCombo(c => Math.max(c, g.comboCount));
          const comboBonus = Math.min(200, g.comboCount * COMBO_SCORE_PER_HIT);
          const baseScore = scoreForBrick(br.type, br.maxHp);
          const speedMult = 1 + Math.min(0.5, (Math.hypot(ball.vx, ball.vy) - speed) / speed * 0.3);
          const totalScore = Math.floor((baseScore + comboBonus) * speedMult);
          setScore(s => s + totalScore);
          g.scorePopups.push({ x: br.x + BRICK_W / 2, y: br.y + BRICK_H / 2, value: totalScore, life: 1, vy: -1.8 });
          setBricksDestroyed(b => b + 1);
          playSound(g.comboCount >= 5 ? 'combo' : 'pop');

          const destroyBrick = (b: Brick) => {
            g.particles.push(...spawnParticles(b.x + BRICK_W / 2, b.y + BRICK_H / 2, b.color, 10));
            if (b.type === 'rainbow' || (b.type !== 'indestructible' && Math.random() < 0.12)) {
              const types: PowerUpType[] = ['wide', 'sticky', 'laser', 'multiball', 'fireball', 'slow', 'extralife', 'magnet'];
              g.powerUps.push({
                x: b.x + BRICK_W / 2 - 12,
                y: b.y + BRICK_H / 2,
                type: types[Math.floor(Math.random() * types.length)],
                vy: 2.5,
              });
            }
          };

          if (ball.fire) {
            g.bricks = g.bricks.filter(b => {
              if (b.type === 'indestructible') return true;
              const hit = Math.abs(b.x + BRICK_W / 2 - br.x - BRICK_W / 2) < 80;
              if (hit) {
                const pts = scoreForBrick(b.type, b.maxHp);
                setScore(s => s + pts);
                g.scorePopups.push({ x: b.x + BRICK_W / 2, y: b.y + BRICK_H / 2, value: pts, life: 1, vy: -1.5 });
                destroyBrick(b);
                return false;
              }
              return true;
            });
          } else if (br.type === 'explosive') {
            const ex = br.x + BRICK_W / 2, ey = br.y + BRICK_H / 2;
            playSound('bomb');
            g.bricks = g.bricks.filter(b => {
              const dist = Math.hypot(b.x + BRICK_W / 2 - ex, b.y + BRICK_H / 2 - ey);
              if (dist < 90 && b.type !== 'indestructible') {
                const pts = scoreForBrick(b.type, b.maxHp);
                setScore(s => s + pts);
                g.scorePopups.push({ x: b.x + BRICK_W / 2, y: b.y + BRICK_H / 2, value: pts, life: 1, vy: -1.5 });
                destroyBrick(b);
                return false;
              }
              return true;
            });
            g.particles.push(...spawnParticles(ex, ey, '#8b5cf6', 20));
          } else {
            br.hp--;
            if (br.hp <= 0) {
              destroyBrick(br);
              g.bricks = g.bricks.filter(b => b !== br);
            } else {
              br.color = brickColor(br.type, br.hp, br.maxHp, br.id);
            }
          }

          if (!ball.fire) {
            if (reflectVx) ball.vx = -ball.vx;
            if (reflectVy) ball.vy = -ball.vy;
          }
        } else {
          g.comboCount = 0;
        }

        return true;
      });

      if (g.boss && g.boss.hp <= 0) {
        g.boss = null;
        g.bossProjectiles = [];
        playSound('victory');
        setScore(s => s + 500);
      }

      const levelComplete = g.bricks.length === 0 && !g.boss;
      if (levelComplete) {
        playSound('levelup');
        setShowLevelTransition(true);
        setLevel(l => l + 1);
        setGameOver(true);
        setWon(true);
      }

      if (g.balls.length === 0) {
        const newLives = lives - 1;
        setLives(newLives);
        playSound(newLives <= 0 ? 'gameover' : 'wrong');
        if (newLives <= 0) setGameOver(true);
        else spawnBall(true);
      }

      const shake = screenShakeRef.current;
      const shakeX = (Math.random() - 0.5) * shake;
      const shakeY = (Math.random() - 0.5) * shake;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      const isBossLevel = level % 5 === 0;
      const bgHue = (level * 37) % 360;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `hsl(${bgHue}, 25%, 8%)`);
      grad.addColorStop(0.5, `hsl(${(bgHue + 30) % 360}, 20%, 6%)`);
      grad.addColorStop(1, `hsl(${bgHue}, 30%, 4%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 60; i++) {
        const sx = (i * 137 + Date.now() / 100) % (W + 20) - 10;
        const sy = (i * 89 + Date.now() / 80) % (H + 20) - 10;
        ctx.fillStyle = `rgba(255,255,255,${0.02 + (i % 3) * 0.01})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
      }

      g.bricks.forEach(br => {
        const hue = br.type === 'rainbow' ? (Date.now() / 30 + br.id) % 360 : 0;
        ctx.fillStyle = br.type === 'rainbow' ? `hsl(${hue}, 100%, 60%)` : br.color;
        ctx.shadowColor = br.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(br.x, br.y, BRICK_W - 2, BRICK_H - 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(br.x, br.y, BRICK_W - 2, BRICK_H - 2);
      });

      if (g.boss) {
        ctx.fillStyle = '#dc2626';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillRect(g.boss.x, g.boss.y, g.boss.width, g.boss.height);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(g.boss.x, g.boss.y, g.boss.width * (g.boss.hp / g.boss.maxHp), 4);
      }

      g.bossProjectiles.forEach(p => {
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      g.paddleTrail.forEach((t, i) => {
        ctx.fillStyle = `rgba(108,92,231,${t.alpha * 0.4})`;
        ctx.fillRect(t.x + 2, t.y + 2, t.w - 4, PADDLE_H - 4);
      });
      const paddleColor = ballNearBottom ? '#ef4444' : g.wideUntil > now ? '#22c55e' : g.fireballUntil > now ? '#f97316' : '#6C5CE7';
      ctx.fillStyle = paddleColor;
      ctx.shadowColor = paddleColor;
      ctx.shadowBlur = ballNearBottom ? 25 : 20;
      ctx.fillRect(g.paddleX, H - PADDLE_H, g.paddleW, PADDLE_H);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(g.paddleX, H - PADDLE_H, g.paddleW, PADDLE_H);

      g.lasers.forEach(laser => {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(laser.x - 3, laser.y, 6, 18);
        ctx.shadowBlur = 0;
      });

      g.balls.forEach(ball => {
        ball.trail.forEach((t, i) => {
          ctx.fillStyle = ball.fire
            ? `rgba(249,115,22,${t.alpha * 0.5})`
            : `rgba(255,255,255,${t.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, BALL_R - 1, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = ball.fire ? '#f97316' : '#ffffff';
        ctx.shadowColor = ball.fire ? '#f97316' : '#94a3b8';
        ctx.shadowBlur = ball.fire ? 15 : 8;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      g.powerUps.forEach(pu => {
        ctx.fillStyle = POWER_UP_COLORS[pu.type];
        ctx.shadowColor = POWER_UP_COLORS[pu.type];
        ctx.shadowBlur = 6;
        ctx.fillRect(pu.x, pu.y, 24, 14);
        ctx.shadowBlur = 0;
      });

      g.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      });

      g.scorePopups.forEach(p => {
        ctx.fillStyle = `rgba(251,191,36,${p.life})`;
        ctx.font = 'bold 16px Inter, system-ui';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(`+${p.value}`, p.x, p.y);
        ctx.fillText(`+${p.value}`, p.x, p.y);
      });

      if (powerUpFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255,255,255,${powerUpFlashRef.current * 0.4})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 14px Inter, system-ui';
      ctx.fillText(`Score: ${score}  Level: ${level}  Lives: ${lives}`, 12, 28);
      ctx.fillText(`Combo: ${g.comboCount}  High: ${highScore}`, 12, 48);
      if (g.comboCount >= 3) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px Inter, system-ui';
        ctx.fillText(`${g.comboCount}x COMBO!`, W - 100, 28);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, gameOver, score, level, lives, highScore, buildLevel, spawnBall, ballSpeedForLevel, getCurrentBallSpeed]);

  const handleStart = () => {
    setScore(0);
    setLevel(1);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setStarted(true);
    setShowLevelTransition(true);
    setBricksDestroyed(0);
    setLongestCombo(0);
    setPowerUpsCollected(0);
    playSound('correct');
  };

  const handleNextLevel = () => {
    setLevel(l => l + 1);
    setGameOver(false);
    setWon(false);
    setShowLevelTransition(true);
  };

  return (
    <div className="game-card bg-white border border-gray-200 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🧱 Brick Breaker</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
      </div>

      <div className="flex flex-wrap gap-4 mb-3 text-sm text-gray-700">
        <span>Score: <strong className="text-gray-900">{score}</strong></span>
        <span>High: <strong className="text-violet-600">{highScore}</strong></span>
        <span>Level: <strong>{level}</strong></span>
        <span>Lives: <strong className="flex items-center gap-1">
          {[1, 2, 3].map(i => (
            <span key={i} className={`inline-block w-3 h-3 rounded-full transition-all ${i <= lives ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
          ))}
        </strong></span>
        <span>Bricks: <strong>{bricksDestroyed}</strong></span>
        <span>Best combo: <strong className="text-amber-600">{longestCombo}</strong></span>
        <span>Power-ups: <strong className="text-emerald-600">{powerUpsCollected}</strong></span>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        ← → move • Space launch/shoot laser
      </div>

      <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200 bg-gray-900 shadow-xl w-full" style={{ touchAction: 'none' }}>
        <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ maxWidth: '100%' }} />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
            <p className="font-medium mb-2 text-center">Break all bricks! Boss every 5 levels.</p>
            <p className="text-sm text-gray-300 mb-4">6 brick types • 8 power-ups • Combo multiplier</p>
            <button onClick={handleStart} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">Start</button>
          </div>
        )}
        {showLevelTransition && started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white animate-pulse">
            <span className="text-4xl font-bold tracking-widest">LEVEL {level}</span>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white">
            <p className="text-2xl font-bold mb-1">
              {won ? 'Level Complete!' : lives <= 0 ? 'Game Over' : ''}
            </p>
            <p className="text-gray-300 mb-2">Score: {score}</p>
            <p className="text-sm text-gray-400 mb-4">
              Bricks: {bricksDestroyed} • Combo: {longestCombo} • Power-ups: {powerUpsCollected}
            </p>
            <div className="flex gap-2">
              {won && <button onClick={handleNextLevel} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">Next Level</button>}
              <button onClick={handleStart} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
