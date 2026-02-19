/* ═══════════════════════════════════════════════════════════
   SPACE INVADERS — Arcade
   Canvas-based: 4 shield barriers, 5x8 aliens (front 10, back 30),
   mystery ship 300, boss every 3 waves, powerups (rapid fire, shield, spread).
   Aliens pulse/flash; speed increases as fewer remain.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpaceInvadersGameProps {
  onClose: () => void;
}

const W = 600;
const H = 700;
const ROWS = 5;
const COLS = 8;
const ALIEN_W = 28;
const ALIEN_H = 20;
const ALIEN_GAP = 8;
const PLAYER_W = 48;
const PLAYER_H = 24;
const BULLET_W = 4;
const BULLET_H = 12;
const BULLET_SPEED = 10;
const PLAYER_SPEED = 6;
const SHIELD_CELL_W = 8;
const SHIELD_CELL_H = 6;
const SHIELD_COLS = 10;
const SHIELD_ROWS = 8;
const UFO_W = 45;
const UFO_H = 16;
const MYSTERY_SHIP_POINTS = 300;
const BOSS_W = 120;
const BOSS_H = 40;
const BOSS_HP_MAX = 12;
const BOSS_POINTS = 500;
const POWERUP_W = 24;
const POWERUP_H = 16;
const BASE_ALIEN_SPEED = 0.35;
const MAX_ALIEN_SPEED = 2.5;
const BASE_FIRE_RATE = 400;
const RAPID_FIRE_RATE = 120;
const SPREAD_SHOT_DURATION = 5000;
const SHIELD_DURATION = 4000;
const RAPID_FIRE_DURATION = 5000;
const UFO_INTERVAL_MIN = 8000;
const UFO_INTERVAL_MAX = 20000;
const HIGH_SCORE_KEY = 'space_invaders_high_score';

type AlienType = 'squid' | 'crab' | 'octopus';
type PowerupType = 'rapid_fire' | 'shield' | 'spread_shot';

interface Alien {
  x: number;
  y: number;
  type: AlienType;
  points: number;
  animPhase: number;
  row: number;
  col: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  player: boolean;
}

interface Shield {
  x: number;
  y: number;
  cells: boolean[][];
}

interface UFO {
  x: number;
  y: number;
  vx: number;
  points: number;
}

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  vy: number;
}

interface Boss {
  x: number;
  y: number;
  vx: number;
  hp: number;
}

// Front row (closest to player) = 10, back row = 30
const ROW_POINTS = [30, 20, 20, 20, 10];
const ALIEN_TYPES_BY_ROW: AlienType[] = [
  'squid',
  'crab',
  'crab',
  'octopus',
  'octopus',
];

function drawSquid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flash: number
) {
  const r = Math.floor(255 * flash);
  const g = Math.floor(100 * flash);
  const b = Math.floor(180 * flash);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + 28, y + 8);
  ctx.lineTo(x + 24, y + 20);
  ctx.lineTo(x + 4, y + 20);
  ctx.lineTo(x, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 6, y + 6, 4, 4);
  ctx.fillRect(x + 18, y + 6, 4, 4);
}

function drawCrab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flash: number
) {
  const r = Math.floor(120 * flash);
  const g = Math.floor(220 * flash);
  const b = Math.floor(255 * flash);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 10, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 8, y + 6, 4, 4);
  ctx.fillRect(x + 16, y + 6, 4, 4);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x + 2, y + 14, 8, 4);
  ctx.fillRect(x + 18, y + 14, 8, 4);
}

function drawOctopus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flash: number
) {
  const r = Math.floor(255 * flash);
  const g = Math.floor(180 * flash);
  const b = Math.floor(100 * flash);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.beginPath();
  ctx.ellipse(x + 14, y + 8, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 4, y + 10, 8, 10);
  ctx.fillRect(x + 16, y + 10, 8, 10);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 6, y + 5, 3, 3);
  ctx.fillRect(x + 19, y + 5, 3, 3);
}

export default function SpaceInvadersGame({ onClose }: SpaceInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const gameRef = useRef<{
    playerX: number;
    aliens: Alien[];
    bullets: Bullet[];
    shields: Shield[];
    ufo: UFO | null;
    boss: Boss | null;
    powerups: Powerup[];
    alienDir: number;
    alienSpeed: number;
    lastAlienMove: number;
    lastFire: number;
    lastUfoTime: number;
    lastAlienShot: number;
    powerupUntil: { rapid_fire: number; shield: number; spread_shot: number };
    alienFlash: number;
    wave: number;
  }>({
    playerX: W / 2 - PLAYER_W / 2,
    aliens: [],
    bullets: [],
    shields: [],
    ufo: null,
    boss: null,
    powerups: [],
    alienDir: 1,
    alienSpeed: BASE_ALIEN_SPEED,
    lastAlienMove: 0,
    lastFire: 0,
    lastUfoTime: 0,
    lastAlienShot: 0,
    powerupUntil: { rapid_fire: 0, shield: 0, spread_shot: 0 },
    alienFlash: 0,
    wave: 1,
  });

  const createShield = useCallback((cx: number, cy: number): Shield => {
    const cells: boolean[][] = [];
    for (let r = 0; r < SHIELD_ROWS; r++) {
      cells[r] = [];
      for (let c = 0; c < SHIELD_COLS; c++) {
        const dx = (c - SHIELD_COLS / 2) / SHIELD_COLS;
        const dy = (r - SHIELD_ROWS / 2) / SHIELD_ROWS;
        const inRect = Math.abs(dx) < 0.48 && Math.abs(dy) < 0.42;
        const inTop = r < 2 && Math.abs(dx) < 0.22;
        cells[r][c] = inRect && !inTop;
      }
    }
    return {
      x: cx - (SHIELD_COLS * SHIELD_CELL_W) / 2,
      y: cy - (SHIELD_ROWS * SHIELD_CELL_H) / 2,
      cells,
    };
  }, []);

  const initShields = useCallback(() => {
    const shields: Shield[] = [];
    const spacing = W / 5;
    for (let i = 0; i < 4; i++) {
      const cx = spacing * (i + 1);
      shields.push(createShield(cx, H - 180));
    }
    return shields;
  }, [createShield]);

  const initAliens = useCallback(() => {
    const aliens: Alien[] = [];
    const startX = 80;
    const startY = 80;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = ALIEN_TYPES_BY_ROW[r];
        aliens.push({
          x: startX + c * (ALIEN_W + ALIEN_GAP),
          y: startY + r * (ALIEN_H + ALIEN_GAP),
          type,
          points: ROW_POINTS[r],
          animPhase: 0,
          row: r,
          col: c,
        });
      }
    }
    return aliens;
  }, []);

  const hitShield = useCallback((x: number, y: number): Shield | null => {
    const g = gameRef.current;
    for (const s of g.shields) {
      const cx = Math.floor((x - s.x) / SHIELD_CELL_W);
      const cy = Math.floor((y - s.y) / SHIELD_CELL_H);
      if (
        cy >= 0 &&
        cy < s.cells.length &&
        cx >= 0 &&
        cx < s.cells[0].length &&
        s.cells[cy][cx]
      ) {
        s.cells[cy][cx] = false;
        return s;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    if (g.aliens.length === 0 && g.boss === null) {
      const isBossWave = g.wave > 0 && g.wave % 3 === 0;
      if (isBossWave) {
        g.boss = {
          x: W / 2 - BOSS_W / 2,
          y: 60,
          vx: 1.2,
          hp: BOSS_HP_MAX,
        };
      } else {
        g.aliens = initAliens();
      }
    }
    if (g.shields.length === 0 && g.boss === null) g.shields = initShields();

    let raf: number;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 16, 2);
      lastTime = now;

      g.alienFlash = (g.alienFlash + dt * 10) % (Math.PI * 2);
      const flash = 0.65 + Math.sin(g.alienFlash) * 0.35;

      const remaining = g.aliens.length;
      const speedFactor = Math.min(
        MAX_ALIEN_SPEED / BASE_ALIEN_SPEED,
        1 + (ROWS * COLS - remaining) * 0.015
      );
      g.alienSpeed = BASE_ALIEN_SPEED * speedFactor;
      const alienMoveInterval = 1000 / g.alienSpeed;

      if (
        g.aliens.length > 0 &&
        now - g.lastAlienMove > alienMoveInterval
      ) {
        g.lastAlienMove = now;
        let moveDown = false;
        let minX = Infinity;
        let maxX = -Infinity;
        g.aliens.forEach((a) => {
          minX = Math.min(minX, a.x);
          maxX = Math.max(maxX, a.x + ALIEN_W);
        });
        if (g.alienDir > 0 && maxX > W - 60) {
          g.alienDir = -1;
          moveDown = true;
        } else if (g.alienDir < 0 && minX < 60) {
          g.alienDir = 1;
          moveDown = true;
        }
        g.aliens.forEach((a) => {
          a.x += g.alienDir * (ALIEN_W + ALIEN_GAP) * 0.5;
          if (moveDown) a.y += 15;
          a.animPhase = (a.animPhase + 1) % 2;
        });
      }

      if (g.boss) {
        g.boss.x += g.boss.vx * dt * 60;
        if (g.boss.x <= 20 || g.boss.x >= W - BOSS_W - 20) g.boss.vx *= -1;
      }

      if (
        g.aliens.length > 0 &&
        now - g.lastAlienShot > 800 + Math.random() * 600
      ) {
        g.lastAlienShot = now;
        const idx = Math.floor(Math.random() * g.aliens.length);
        const a = g.aliens[idx];
        g.bullets.push({
          x: a.x + ALIEN_W / 2,
          y: a.y + ALIEN_H,
          vy: 4,
          player: false,
        });
      }

      if (
        g.ufo === null &&
        g.boss === null &&
        now - g.lastUfoTime >
          UFO_INTERVAL_MIN + Math.random() * (UFO_INTERVAL_MAX - UFO_INTERVAL_MIN)
      ) {
        g.lastUfoTime = now;
        const dir = Math.random() < 0.5 ? 1 : -1;
        g.ufo = {
          x: dir > 0 ? -UFO_W : W,
          y: 32,
          vx: dir * 2.5,
          points: MYSTERY_SHIP_POINTS,
        };
      }
      if (g.ufo) {
        g.ufo.x += g.ufo.vx * dt;
        if (
          (g.ufo.vx > 0 && g.ufo.x > W) ||
          (g.ufo.vx < 0 && g.ufo.x < -UFO_W)
        ) {
          g.ufo = null;
        }
      }

      g.bullets = g.bullets.filter((b) => b.y > -20 && b.y < H + 20);
      g.bullets.forEach((b) => {
        b.y += b.vy * dt;
      });

      g.bullets.forEach((b, bi) => {
        if (!b.player) {
          const px = g.playerX;
          const py = H - 50;
          if (
            b.x > px &&
            b.x < px + PLAYER_W &&
            b.y > py &&
            b.y < py + PLAYER_H
          ) {
            if (now < g.powerupUntil.shield) {
              g.bullets.splice(bi, 1);
            } else {
              setLives((l) => {
                if (l <= 1) setGameOver(true);
                return l - 1;
              });
              g.bullets.splice(bi, 1);
            }
          }
        } else {
          if (hitShield(b.x, b.y)) {
            g.bullets.splice(bi, 1);
            return;
          }
          if (
            g.boss &&
            b.x > g.boss.x &&
            b.x < g.boss.x + BOSS_W &&
            b.y > g.boss.y &&
            b.y < g.boss.y + BOSS_H
          ) {
            g.boss.hp--;
            g.bullets.splice(bi, 1);
            if (g.boss.hp <= 0) {
              setScore((s) => s + BOSS_POINTS);
              g.boss = null;
              g.wave++;
              setLevel((l) => l + 1);
              g.aliens = initAliens();
              g.shields = initShields();
            }
            return;
          }
          if (
            g.ufo &&
            b.x > g.ufo.x &&
            b.x < g.ufo.x + UFO_W &&
            b.y > g.ufo.y &&
            b.y < g.ufo.y + UFO_H
          ) {
            setScore((s) => s + g.ufo!.points);
            g.ufo = null;
            g.bullets.splice(bi, 1);
            return;
          }
          for (let ai = 0; ai < g.aliens.length; ai++) {
            const a = g.aliens[ai];
            if (
              b.x > a.x &&
              b.x < a.x + ALIEN_W &&
              b.y > a.y &&
              b.y < a.y + ALIEN_H
            ) {
              setScore((s) => s + a.points);
              if (Math.random() < 0.14) {
                const types: PowerupType[] = [
                  'rapid_fire',
                  'shield',
                  'spread_shot',
                ];
                g.powerups.push({
                  x: a.x + ALIEN_W / 2 - POWERUP_W / 2,
                  y: a.y,
                  type: types[Math.floor(Math.random() * 3)],
                  vy: 1.5,
                });
              }
              g.aliens.splice(ai, 1);
              g.bullets.splice(bi, 1);
              return;
            }
          }
        }
      });

      g.powerups.forEach((p, pi) => {
        p.y += p.vy * dt;
        const px = g.playerX;
        const py = H - 50;
        if (
          p.y + POWERUP_H > py &&
          p.y < py + PLAYER_H &&
          p.x + POWERUP_W > px &&
          p.x < px + PLAYER_W
        ) {
          const dur =
            p.type === 'rapid_fire'
              ? RAPID_FIRE_DURATION
              : p.type === 'shield'
                ? SHIELD_DURATION
                : SPREAD_SHOT_DURATION;
          g.powerupUntil[p.type] = now + dur;
          g.powerups.splice(pi, 1);
        }
      });
      g.powerups = g.powerups.filter((p) => p.y < H + 20);

      if (g.aliens.length === 0 && g.boss === null && g.wave > 0 && g.wave % 3 !== 0) {
        g.wave++;
        setLevel((l) => l + 1);
        g.aliens = initAliens();
        g.shields = initShields();
      }

      const lowestAlien =
        g.aliens.length > 0
          ? Math.max(...g.aliens.map((a) => a.y + ALIEN_H))
          : 0;
      if (lowestAlien > H - 85) setGameOver(true);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(now * 0.002 + i) * 0.15})`;
        ctx.fillRect((i * 10) % W, (i * 14) % H, 2, 2);
      }

      g.shields.forEach((s) => {
        ctx.fillStyle = '#22c55e';
        s.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell)
              ctx.fillRect(
                s.x + c * SHIELD_CELL_W,
                s.y + r * SHIELD_CELL_H,
                SHIELD_CELL_W - 1,
                SHIELD_CELL_H - 1
              );
          })
        );
      });

      g.aliens.forEach((a) => {
        if (a.type === 'squid') drawSquid(ctx, a.x, a.y, flash);
        else if (a.type === 'crab') drawCrab(ctx, a.x, a.y, flash);
        else drawOctopus(ctx, a.x, a.y, flash);
      });

      if (g.ufo) {
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(g.ufo.x, g.ufo.y, UFO_W, UFO_H);
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('?', g.ufo.x + 18, g.ufo.y + 12);
      }

      if (g.boss) {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(g.boss.x, g.boss.y, BOSS_W, BOSS_H);
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 2;
        ctx.strokeRect(g.boss.x, g.boss.y, BOSS_W, BOSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px system-ui';
        ctx.fillText(`BOSS ${g.boss.hp}/${BOSS_HP_MAX}`, g.boss.x + 24, g.boss.y + 24);
      }

      g.powerups.forEach((p) => {
        if (p.type === 'rapid_fire') ctx.fillStyle = '#f59e0b';
        else if (p.type === 'shield') ctx.fillStyle = '#3b82f6';
        else ctx.fillStyle = '#22c55e';
        ctx.fillRect(p.x, p.y, POWERUP_W, POWERUP_H);
      });

      ctx.fillStyle =
        now < g.powerupUntil.shield ? '#3b82f6' : '#22c55e';
      ctx.fillRect(g.playerX, H - 50, PLAYER_W, PLAYER_H);
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2;
      ctx.strokeRect(g.playerX, H - 50, PLAYER_W, PLAYER_H);

      g.bullets.forEach((b) => {
        ctx.fillStyle = b.player ? '#fbbf24' : '#ef4444';
        ctx.fillRect(
          b.x - BULLET_W / 2,
          b.y,
          BULLET_W,
          BULLET_H
        );
      });

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`HI ${highScore}`, 20, 22);
      ctx.fillText(String(score), 20, 42);
      ctx.textAlign = 'right';
      ctx.fillText(`Lives: ${lives}`, W - 20, 22);
      ctx.fillText(`Level ${level}`, W - 20, 42);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [
    started,
    gameOver,
    lives,
    highScore,
    level,
    initAliens,
    initShields,
    hitShield,
  ]);

  useEffect(() => {
    if (!started || gameOver) return;
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        g.playerX = Math.max(10, g.playerX - PLAYER_SPEED);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        g.playerX = Math.min(W - PLAYER_W - 10, g.playerX + PLAYER_SPEED);
      } else if (e.key === ' ') {
        e.preventDefault();
        const rate =
          performance.now() < g.powerupUntil.rapid_fire
            ? RAPID_FIRE_RATE
            : BASE_FIRE_RATE;
        if (performance.now() - g.lastFire > rate) {
          g.lastFire = performance.now();
          const mx = g.playerX + PLAYER_W / 2;
          const py = H - 50;
          if (performance.now() < g.powerupUntil.spread_shot) {
            [-15, 0, 15].forEach((ox) => {
              g.bullets.push({
                x: mx + ox,
                y: py,
                vy: -BULLET_SPEED,
                player: true,
              });
            });
          } else {
            g.bullets.push({
              x: mx,
              y: py,
              vy: -BULLET_SPEED,
              player: true,
            });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    const moveInterval = setInterval(() => {
      const g = gameRef.current;
      if (document.activeElement?.tagName === 'INPUT') return;
      const keys = (window as unknown as { _keys?: Record<string, boolean> })
        ._keys;
      if (!keys) return;
      if (keys['ArrowLeft'])
        g.playerX = Math.max(10, g.playerX - PLAYER_SPEED);
      if (keys['ArrowRight'])
        g.playerX = Math.min(W - PLAYER_W - 10, g.playerX + PLAYER_SPEED);
    }, 16);
    const keyDown = (e: KeyboardEvent) => {
      (window as unknown as { _keys?: Record<string, boolean> })._keys =
        (window as unknown as { _keys?: Record<string, boolean> })._keys || {};
      (window as unknown as { _keys?: Record<string, boolean> })._keys![
        e.key
      ] = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      (window as unknown as { _keys?: Record<string, boolean> })._keys =
        (window as unknown as { _keys?: Record<string, boolean> })._keys || {};
      (window as unknown as { _keys?: Record<string, boolean> })._keys![e.key] =
        false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearInterval(moveInterval);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, [started, gameOver]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
      } catch {}
    }
  }, [score, highScore]);

  const handleStart = () => {
    gameRef.current.playerX = W / 2 - PLAYER_W / 2;
    gameRef.current.aliens = [];
    gameRef.current.bullets = [];
    gameRef.current.shields = [];
    gameRef.current.ufo = null;
    gameRef.current.boss = null;
    gameRef.current.powerups = [];
    gameRef.current.alienDir = 1;
    gameRef.current.lastUfoTime = performance.now();
    gameRef.current.lastAlienShot = 0;
    gameRef.current.wave = 1;
    gameRef.current.powerupUntil = {
      rapid_fire: 0,
      shield: 0,
      spread_shot: 0,
    };
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setStarted(true);
  };

  return (
    <div className="game-card bg-white border border-gray-200 text-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Galaxy Defenders</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost">
          Close
        </button>
      </div>
      <div className="flex gap-4 mb-3 text-sm text-gray-900">
        <span>
          Score: <strong>{score}</strong>
        </span>
        <span>
          HI: <strong>{highScore}</strong>
        </span>
        <span>
          Lives: <strong>{lives}</strong>
        </span>
        <span>
          Level: <strong>{level}</strong>
        </span>
      </div>
      <div className="relative inline-block rounded-lg overflow-hidden border border-gray-200 bg-white">
        <canvas ref={canvasRef} width={W} height={H} className="block" />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95">
            <p className="text-gray-900 font-medium mb-2">
              ← → Move · Space Fire
            </p>
            <p className="text-gray-600 text-sm mb-2 text-center max-w-xs">
              4 shields · 5×8 aliens (front 10, back 30) · Mystery ship 300 · Boss every 3 waves
            </p>
            <p className="text-gray-500 text-xs mb-3">Powerups: Rapid fire · Shield · Spread shot</p>
            <button onClick={handleStart} className="btn-elite btn-elite-primary">
              Start
            </button>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95">
            <p className="text-xl font-bold text-gray-900 mb-1">Game Over</p>
            <p className="text-gray-700 mb-4">Score: {score} · Level: {level}</p>
            <div className="flex gap-2">
              <button
                onClick={handleStart}
                className="btn-elite btn-elite-primary"
              >
                Play Again
              </button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Aliens shoot back · Boss every 3 waves · Collect powerups from defeated aliens
      </p>
    </div>
  );
}
