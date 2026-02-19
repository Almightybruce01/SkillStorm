/* ═══════════════════════════════════════════════════════════════════════════════
   DINO RUN — Elite Endless Runner
   Canvas-based with full game loop, animated dino, parallax, day/night,
   power-ups, coins, skins, difficulty modes, particle effects.
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface DinoRunProps {
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const W = 900;
const H = 400;
const GROUND_Y = 320;
const DINO_X = 80;
const DINO_W = 48;
const DINO_H = 52;
const DINO_DUCK_W = 64;
const DINO_DUCK_H = 28;
const JUMP_VEL = -16;
const GRAVITY = 0.85;
const BASE_SPEED_EASY = 6;
const BASE_SPEED_NORMAL = 9;
const BASE_SPEED_HARD = 12;
const MAX_SPEED_EASY = 14;
const MAX_SPEED_NORMAL = 20;
const MAX_SPEED_HARD = 26;
const SPEED_RAMP_INTERVAL = 500;
const HIGH_SCORE_KEY = 'dino_run_high_score';
const DAY_NIGHT_INTERVAL = 500;
const TERRAIN_CHANGE_INTERVAL = 1000;
const LIVES_DEFAULT = 3;
const SHIELD_DURATION = 5000;
const MAGNET_DURATION = 6000;
const DOUBLE_SCORE_DURATION = 8000;

type Difficulty = 'easy' | 'normal' | 'hard';
type TerrainTheme = 'desert' | 'forest' | 'snow';
type DinoSkin = 'default' | 'red' | 'blue' | 'gold';
type PowerUpType = 'shield' | 'magnet' | 'double_score';
type ObstacleType = 'small_cactus' | 'tall_cactus' | 'double_cactus' | 'pterodactyl' | 'rock';

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  w: number;
  h: number;
  collected: boolean;
}

interface Coin {
  x: number;
  y: number;
  w: number;
  h: number;
  collected: boolean;
  frame: number;
}

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  type: ObstacleType;
  passed: boolean;
  pteroFrame?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  isStar?: boolean;
}

interface ParallaxLayer {
  x: number;
  elements: { x: number; w: number; h: number; y: number }[];
  speed: number;
}

const SKIN_UNLOCKS: Record<DinoSkin, number> = {
  default: 0,
  red: 500,
  blue: 1500,
  gold: 5000,
};

const TERRAIN_COLORS: Record<TerrainTheme, { skyDay: string; skyNight: string; ground: string; accent: string }> = {
  desert: { skyDay: '#f7f7f7', skyNight: '#1a1a2e', ground: '#535353', accent: '#8b7355' },
  forest: { skyDay: '#87CEEB', skyNight: '#0d2137', ground: '#2d5016', accent: '#228B22' },
  snow: { skyDay: '#b0e0e6', skyNight: '#0f172a', ground: '#e8f4f8', accent: '#87CEEB' },
};

export default function DinoRun({ onClose }: DinoRunProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(LIVES_DEFAULT);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [coins, setCoins] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [postGameStats, setPostGameStats] = useState<{ distance: number; coins: number; time: number } | null>(null);
  const screenShakeRef = useRef(0);
  const milestoneRef = useRef<{ text: string; life: number } | null>(null);
  const touchStartRef = useRef(0);
  const duckTimeoutRef = useRef<number | null>(null);

  const gameRef = useRef({
    vy: 0,
    y: GROUND_Y,
    ducking: false,
    dead: false,
    frame: 0,
    deathFrame: 0,
    speed: BASE_SPEED_NORMAL,
    obstacles: [] as Obstacle[],
    powerUps: [] as PowerUp[],
    coinList: [] as Coin[],
    particles: [] as Particle[],
    parallax: {
      far: 0,
      mid: 0,
      near: 0,
    },
    lastObstacleX: 0,
    lastPowerUpX: 0,
    lastCoinX: 0,
    isNight: false,
    terrain: 'desert' as TerrainTheme,
    skin: 'default' as DinoSkin,
    powerUpActive: null as { type: PowerUpType; endTime: number } | null,
    coinsCollected: 0,
    jumpsUsed: 0,
    canDoubleJump: false,
  });

  const getBaseSpeed = () => {
    if (difficulty === 'easy') return BASE_SPEED_EASY;
    if (difficulty === 'hard') return BASE_SPEED_HARD;
    return BASE_SPEED_NORMAL;
  };
  const getMaxSpeed = () => {
    if (difficulty === 'easy') return MAX_SPEED_EASY;
    if (difficulty === 'hard') return MAX_SPEED_HARD;
    return MAX_SPEED_NORMAL;
  };

  const spawnObstacle = useCallback(() => {
    const g = gameRef.current;
    const minGap = difficulty === 'hard' ? 180 : difficulty === 'easy' ? 350 : 250;
    if (g.obstacles.length > 0 && g.obstacles[g.obstacles.length - 1].x > W - minGap) return;
    if (g.lastObstacleX > 0 && W - g.lastObstacleX < minGap) return;

    const types: ObstacleType[] = ['small_cactus', 'tall_cactus', 'double_cactus', 'pterodactyl', 'rock'];
    const weights = difficulty === 'hard' ? [0.15, 0.2, 0.2, 0.3, 0.15] : [0.25, 0.25, 0.2, 0.2, 0.1];
    let r = Math.random();
    let type: ObstacleType = 'small_cactus';
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) { type = types[i]; break; }
    }

    let w = 24, h = 48, y = GROUND_Y;
    if (type === 'small_cactus') { w = 24; h = 48; }
    else if (type === 'tall_cactus') { w = 28; h = 72; }
    else if (type === 'double_cactus') { w = 56; h = 52; }
    else if (type === 'pterodactyl') {
      w = 46; h = 24;
      y = GROUND_Y - 50 - Math.random() * 60;
    }
    else if (type === 'rock') { w = 36; h = 28; y = GROUND_Y - 28; }

    g.obstacles.push({
      x: W + 20,
      y,
      w,
      h,
      type,
      passed: false,
      pteroFrame: type === 'pterodactyl' ? Math.floor(Math.random() * 2) : undefined,
    });
    g.lastObstacleX = W + 20;
  }, [difficulty]);

  const spawnPowerUp = useCallback(() => {
    const g = gameRef.current;
    if (g.powerUps.length >= 1) return;
    const minGap = 400;
    if (g.lastPowerUpX > 0 && W - g.lastPowerUpX < minGap) return;

    const types: PowerUpType[] = ['shield', 'magnet', 'double_score'];
    const type = types[Math.floor(Math.random() * types.length)];
    g.powerUps.push({
      x: W + 30,
      y: GROUND_Y - 60 - Math.random() * 40,
      type,
      w: 32,
      h: 32,
      collected: false,
    });
    g.lastPowerUpX = W + 30;
  }, []);

  const spawnCoin = useCallback(() => {
    const g = gameRef.current;
    if (g.coinList.length >= 3) return;
    const minGap = 120;
    if (g.lastCoinX > 0 && W - g.lastCoinX < minGap) return;

    g.coinList.push({
      x: W + 20,
      y: GROUND_Y - 80 - Math.random() * 100,
      w: 28,
      h: 28,
      collected: false,
      frame: 0,
    });
    g.lastCoinX = W + 20;
  }, []);

  const addDustParticle = useCallback(() => {
    const g = gameRef.current;
    for (let i = 0; i < 4; i++) {
      g.particles.push({
        x: DINO_X - 10 - Math.random() * 20,
        y: GROUND_Y - 5,
        vx: -2 - Math.random() * 2,
        vy: -0.5 - Math.random(),
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 4 + Math.random() * 6,
        isStar: false,
      });
    }
  }, []);

  const addStarParticle = useCallback(() => {
    const g = gameRef.current;
    if (!g.isNight) return;
    if (Math.random() > 0.08) return;
    g.particles.push({
      x: Math.random() * W,
      y: Math.random() * 120,
      vx: -1,
      vy: 0,
      life: 2 + Math.random() * 2,
      maxLife: 4,
      size: 1 + Math.random() * 2,
      isStar: true,
    });
  }, []);

  const checkCollision = (ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number) => {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  };

  const drawDino = useCallback((ctx: CanvasRenderingContext2D, g: typeof gameRef.current) => {
    const skinColors: Record<DinoSkin, { body: string; belly: string; eye: string }> = {
      default: { body: '#535353', belly: '#616161', eye: '#333' },
      red: { body: '#b91c1c', belly: '#dc2626', eye: '#7f1d1d' },
      blue: { body: '#1d4ed8', belly: '#2563eb', eye: '#1e3a8a' },
      gold: { body: '#d97706', belly: '#fbbf24', eye: '#92400e' },
    };
    const c = skinColors[g.skin];
    const x = DINO_X;
    const legFrame = Math.floor(g.frame / 6) % 2;

    if (g.dead) {
      const rot = Math.min(g.deathFrame * 0.15, Math.PI / 2);
      ctx.save();
      ctx.translate(x + DINO_W / 2, g.y + DINO_H / 2);
      ctx.rotate(rot);
      ctx.translate(-DINO_W / 2, -DINO_H / 2);
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.roundRect(4, 4, 40, 44, 4);
      ctx.fill();
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.roundRect(8, 28, 24, 12, 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('X', 20, 28);
      ctx.fillText('X', 34, 28);
      ctx.restore();
      return;
    }

    if (g.ducking) {
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.roundRect(x, g.y + DINO_DUCK_H - 20, DINO_DUCK_W - 10, 20, 4);
      ctx.fill();
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.roundRect(x + 8, g.y + DINO_DUCK_H - 14, 35, 8, 2);
      ctx.fill();
      ctx.fillStyle = c.eye;
      ctx.beginPath();
      ctx.arc(x + 18, g.y + 8, 4, 0, Math.PI * 2);
      ctx.arc(x + 42, g.y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    if (g.vy < 0) {
      ctx.fillStyle = c.body;
      ctx.beginPath();
      ctx.roundRect(x, g.y, DINO_W - 4, DINO_H - 4, 4);
      ctx.fill();
      ctx.fillStyle = c.belly;
      ctx.beginPath();
      ctx.roundRect(x + 8, g.y + 28, 24, 12, 2);
      ctx.fill();
      ctx.fillStyle = c.eye;
      ctx.beginPath();
      ctx.arc(x + 16, g.y + 14, 4, 0, Math.PI * 2);
      ctx.arc(x + 32, g.y + 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.roundRect(x, g.y, DINO_W - 4, DINO_H - 4, 4);
    ctx.fill();
    ctx.fillStyle = c.belly;
    ctx.beginPath();
    ctx.roundRect(x + 8, g.y + 28, 24, 12, 2);
    ctx.fill();

    const legY = g.y + DINO_H - 10;
    ctx.fillStyle = c.body;
    if (legFrame === 0) {
      ctx.fillRect(x + 6, legY, 8, 12);
      ctx.fillRect(x + 30, legY - 6, 8, 16);
    } else {
      ctx.fillRect(x + 6, legY - 6, 8, 16);
      ctx.fillRect(x + 30, legY, 8, 12);
    }

    ctx.fillStyle = c.eye;
    ctx.beginPath();
    ctx.arc(x + 16, g.y + 14, 4, 0, Math.PI * 2);
    ctx.arc(x + 32, g.y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  const drawObstacle = useCallback((ctx: CanvasRenderingContext2D, o: Obstacle, terrain: TerrainTheme) => {
    const baseY = o.y;
    const colors = terrain === 'desert' ? { green: '#2d5016', brown: '#8b7355' }
      : terrain === 'forest' ? { green: '#166534', brown: '#78350f' }
      : { green: '#0d9488', brown: '#78716c' };

    if (o.type === 'small_cactus') {
      ctx.fillStyle = colors.brown;
      ctx.fillRect(o.x + 4, baseY, 6, o.h);
      ctx.fillStyle = colors.green;
      ctx.fillRect(o.x, baseY + 10, 10, 18);
      ctx.fillRect(o.x + 14, baseY + 6, 8, 22);
      ctx.fillRect(o.x + 6, baseY + 28, 6, 12);
    } else if (o.type === 'tall_cactus') {
      ctx.fillStyle = colors.brown;
      ctx.fillRect(o.x + 6, baseY, 8, o.h);
      ctx.fillStyle = colors.green;
      ctx.fillRect(o.x + 2, baseY + 8, 12, 28);
      ctx.fillRect(o.x + 14, baseY + 4, 10, 40);
      ctx.fillRect(o.x + 2, baseY + 36, 8, 24);
    } else if (o.type === 'double_cactus') {
      ctx.fillStyle = colors.brown;
      ctx.fillRect(o.x + 8, baseY, 5, 40);
      ctx.fillRect(o.x + 38, baseY, 5, 45);
      ctx.fillStyle = colors.green;
      ctx.fillRect(o.x, baseY + 6, 14, 38);
      ctx.fillRect(o.x + 28, baseY + 4, 18, 42);
    } else if (o.type === 'pterodactyl') {
      const wing = (o.pteroFrame ?? 0) === 0 ? 1 : -1;
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.ellipse(o.x + 20, o.y + 12, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(o.x + 35, o.y + 10);
      ctx.lineTo(o.x + 45, o.y + 12 + wing * 6);
      ctx.lineTo(o.x + 38, o.y + 12);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(o.x + 10, o.y + 10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.type === 'rock') {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, []);

  const drawPowerUp = useCallback((ctx: CanvasRenderingContext2D, p: PowerUp) => {
    if (p.collected) return;
    const colors = { shield: '#3b82f6', magnet: '#ef4444', double_score: '#eab308' };
    ctx.fillStyle = colors[p.type] + '80';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = colors[p.type];
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    if (p.type === 'shield') ctx.fillText('🛡', p.x + p.w / 2, p.y + p.h / 2 + 6);
    else if (p.type === 'magnet') ctx.fillText('🧲', p.x + p.w / 2, p.y + p.h / 2 + 6);
    else ctx.fillText('2x', p.x + p.w / 2, p.y + p.h / 2 + 6);
    ctx.textAlign = 'left';
  }, []);

  const drawCoin = useCallback((ctx: CanvasRenderingContext2D, coin: Coin) => {
    if (coin.collected) return;
    const f = Math.floor(coin.frame / 5) % 4;
    ctx.save();
    ctx.translate(coin.x + coin.w / 2, coin.y + coin.h / 2);
    ctx.rotate(f * 0.3);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.ellipse(0, 0, coin.w / 2 - 2, coin.h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, []);

  const gameLoop = useCallback((ts: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;
    const g = gameRef.current;
    let shakeX = 0, shakeY = 0;
    if (screenShakeRef.current > 0) {
      screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 12);
      shakeX = (Math.random() - 0.5) * screenShakeRef.current;
      shakeY = (Math.random() - 0.5) * screenShakeRef.current;
    }
    if (milestoneRef.current) {
      milestoneRef.current.life -= dt * 0.8;
      if (milestoneRef.current.life <= 0) milestoneRef.current = null;
    }

    if (gameState === 'menu') {
      ctx.fillStyle = '#f7f7f7';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DINO RUN', W / 2, 120);
      ctx.font = '20px sans-serif';
      ctx.fillText('Space / ↑ Jump  |  ↓ Duck', W / 2, 180);
      ctx.fillText('Collect coins • Grab power-ups • Avoid obstacles', W / 2, 220);
      ctx.font = '16px sans-serif';
      ctx.fillText(`High Score: ${highScore}`, W / 2, 280);
      ctx.textAlign = 'left';
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gameState === 'gameover') {
      ctx.fillStyle = g.isNight ? '#1a1a2e' : '#f7f7f7';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, 140);
      ctx.font = '20px sans-serif';
      ctx.fillText(`Score: ${score}  •  High: ${highScore}`, W / 2, 200);
      if (postGameStats) {
        ctx.fillText(`Distance: ${postGameStats.distance}m  •  Coins: ${postGameStats.coins}`, W / 2, 250);
        ctx.fillText(`Time: ${Math.floor(postGameStats.time / 60)}:${String(Math.floor(postGameStats.time % 60)).padStart(2, '0')}`, W / 2, 290);
      }
      ctx.textAlign = 'left';
      animRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    g.frame++;
    g.deathFrame += g.dead ? 1 : 0;

    ctx.save();
    if (shakeX !== 0 || shakeY !== 0) ctx.translate(shakeX, shakeY);

    const tc = TERRAIN_COLORS[g.terrain];
    const skyColor = g.isNight ? tc.skyNight : tc.skyDay;
    ctx.fillStyle = skyColor;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    if (g.isNight) addStarParticle();

    g.parallax.far += g.speed * 0.2 * dt * 60;
    g.parallax.mid += g.speed * 0.5 * dt * 60;
    g.parallax.near += g.speed * 1.2 * dt * 60;

    const p = g.parallax as Record<string, number>;
    p.cloudFar = (p.cloudFar ?? 0) + g.speed * 0.2 * dt * 60;
    p.cloudMid = (p.cloudMid ?? 0) + g.speed * 0.4 * dt * 60;
    p.cloudNear = (p.cloudNear ?? 0) + g.speed * 0.7 * dt * 60;
    [[p.cloudFar, 0.4, 6], [p.cloudMid, 0.55, 7], [p.cloudNear, 0.7, 5]].forEach(([offset, alpha, count]) => {
      ctx.fillStyle = g.isNight ? `rgba(100,100,140,${alpha * 0.5})` : `rgba(255,255,255,${alpha})`;
      for (let i = 0; i < count; i++) {
        const cx = ((i * 190 + (offset as number) * 0.3) % (W + 240)) - 120;
        const cy = 40 + (i % 3) * 50;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 50, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 35, cy - 8, 32, 14, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 70, cy, 40, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.fillStyle = tc.accent + '40';
    for (let i = 0; i < 8; i++) {
      const mx = ((i * 180 - g.parallax.far % 180) % (W + 180)) - 90;
      ctx.beginPath();
      ctx.moveTo(mx, GROUND_Y + 20);
      ctx.lineTo(mx + 60, H);
      ctx.lineTo(mx + 140, H);
      ctx.lineTo(mx + 100, GROUND_Y + 20);
      ctx.fill();
    }

    ctx.fillStyle = tc.ground + '60';
    for (let i = 0; i < 12; i++) {
      const gx = ((i * 120 - g.parallax.mid % 120) % (W + 120)) - 60;
      ctx.fillRect(gx, GROUND_Y + 5, 80, 30);
    }

    ctx.fillStyle = tc.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    ctx.strokeStyle = tc.accent;
    ctx.lineWidth = 2;
    for (let i = 0; i < 20; i++) {
      const lx = ((i * 90 - g.parallax.near % 90) % (W + 90)) - 45;
      ctx.beginPath();
      ctx.moveTo(lx, GROUND_Y);
      ctx.lineTo(lx + 45, GROUND_Y);
      ctx.stroke();
    }

    g.particles = g.particles.filter(p => {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      if (p.life <= 0) return false;
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.isStar ? '#fff' : '#8b7355';
      ctx.beginPath();
      if (p.isStar) {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      } else {
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });

    if (!g.dead) {
      if (!g.ducking) {
        g.vy += GRAVITY * dt * 60;
        g.y += g.vy * dt * 60;
        if (g.y >= GROUND_Y) {
          g.y = GROUND_Y;
          g.vy = 0;
          g.jumpsUsed = 0;
          g.canDoubleJump = true;
          addDustParticle();
        }
      } else {
        g.y = GROUND_Y - DINO_DUCK_H + 20;
        g.vy = 0;
      }

      const speedRamp = Math.floor(score / SPEED_RAMP_INTERVAL) * 0.5;
      g.speed = Math.min(getBaseSpeed() + speedRamp, getMaxSpeed());

      if (Math.floor(score / DAY_NIGHT_INTERVAL) % 2 === 1) g.isNight = true;
      else g.isNight = false;

      const prevTerrainIdx = Math.floor((score - 1) / TERRAIN_CHANGE_INTERVAL) % 3;
      const terrainIdx = Math.floor(score / TERRAIN_CHANGE_INTERVAL) % 3;
      g.terrain = (['desert', 'forest', 'snow'] as TerrainTheme[])[terrainIdx];
      if (terrainIdx !== prevTerrainIdx && score >= TERRAIN_CHANGE_INTERVAL) {
        const zoneNames = ['Desert Zone', 'Forest Zone', 'Snow Zone'];
        milestoneRef.current = { text: zoneNames[terrainIdx] + '!', life: 1.2 };
        playSound('powerup');
      }

      if (score >= SKIN_UNLOCKS.gold) g.skin = 'gold';
      else if (score >= SKIN_UNLOCKS.blue) g.skin = 'blue';
      else if (score >= SKIN_UNLOCKS.red) g.skin = 'red';
      else g.skin = 'default';

      setScore(s => {
        const inc = 1 * (g.powerUpActive?.type === 'double_score' ? 2 : 1);
        const next = s + Math.floor(inc * g.speed * dt * 2);
        if (next >= 1000 && s < 1000) {
          milestoneRef.current = { text: '1000m!', life: 1 };
          playSound('levelup');
        } else if (next >= 500 && s < 500) {
          milestoneRef.current = { text: '500m!', life: 1 };
          playSound('levelup');
        } else if (next >= 100 && s < 100) {
          milestoneRef.current = { text: '100m!', life: 1 };
          playSound('levelup');
        }
        return next;
      });

      if (Math.random() < 0.015 * (difficulty === 'hard' ? 1.5 : 1)) spawnObstacle();
      if (Math.random() < 0.008) spawnPowerUp();
      if (Math.random() < 0.02) spawnCoin();

      const dinoW = g.ducking ? DINO_DUCK_W : DINO_W;
      const dinoH = g.ducking ? DINO_DUCK_H : DINO_H;

      for (const o of g.obstacles) {
        o.x -= g.speed * dt * 60;
        o.pteroFrame = o.type === 'pterodactyl' ? Math.floor(g.frame / 8) % 2 : o.pteroFrame;
        if (o.x + o.w < DINO_X && !o.passed) {
          o.passed = true;
        }
        if (!o.passed && checkCollision(DINO_X, g.y, dinoW - 10, dinoH - 4, o.x, o.y, o.w, o.h)) {
          if (g.powerUpActive?.type === 'shield') {
            g.powerUpActive = null;
            o.passed = true;
            screenShakeRef.current = 8;
            playSound('shield');
          } else {
            g.dead = true;
            screenShakeRef.current = 20;
            playSound('hit');
            playSound('gameover');
            const newLives = lives - 1;
            setLives(newLives);
            if (newLives <= 0) {
              setGameState('gameover');
              setPostGameStats({
                distance: score,
                coins: g.coinsCollected,
                time: Math.floor((Date.now() - startTime) / 1000),
              });
              try {
                if (score > highScore) {
                  localStorage.setItem(HIGH_SCORE_KEY, String(score));
                  setHighScore(score);
                }
              } catch {}
            } else {
              setTimeout(() => {
                g.dead = false;
                g.deathFrame = 0;
                g.vy = 0;
                g.y = GROUND_Y;
                g.obstacles = [];
                g.lastObstacleX = 0;
              }, 1500);
            }
          }
        }
      }
      g.obstacles = g.obstacles.filter(o => o.x + o.w >= 0);

      for (const p of g.powerUps) {
        p.x -= g.speed * dt * 60;
        const magnet = g.powerUpActive?.type === 'magnet';
        const inRange = magnet && Math.abs(p.x - DINO_X) < 120;
        if (inRange) p.x -= 8;
        if (!p.collected && checkCollision(DINO_X, g.y, dinoW, dinoH, p.x, p.y, p.w, p.h)) {
          p.collected = true;
          playSound('powerup');
          g.powerUpActive = {
            type: p.type,
            endTime: Date.now() + (p.type === 'shield' ? SHIELD_DURATION : p.type === 'magnet' ? MAGNET_DURATION : DOUBLE_SCORE_DURATION),
          };
        }
        if (g.powerUpActive && Date.now() > g.powerUpActive.endTime) g.powerUpActive = null;
        if (p.x + p.w < 0) g.powerUps.splice(g.powerUps.indexOf(p), 1);
      }

      for (const coin of g.coinList) {
        coin.x -= g.speed * dt * 60;
        coin.frame++;
        const magnet = g.powerUpActive?.type === 'magnet';
        const inRange = magnet && Math.abs(coin.x - DINO_X) < 150;
        if (inRange) {
          coin.x -= 6;
          coin.y += (g.y + dinoH / 2 - coin.y - coin.h / 2) * 0.1;
        }
        if (!coin.collected && checkCollision(DINO_X, g.y, dinoW, dinoH, coin.x, coin.y, coin.w, coin.h)) {
          coin.collected = true;
          playSound('coin');
          g.coinsCollected++;
          setCoins(g.coinsCollected);
        }
      }
      g.coinList = g.coinList.filter(c => c.x + c.w >= 0);
    }

    for (const o of g.obstacles) drawObstacle(ctx, o, g.terrain);
    for (const p of g.powerUps) drawPowerUp(ctx, p);
    for (const c of g.coinList) drawCoin(ctx, c);

    if (g.powerUpActive?.type === 'shield' && !g.dead) {
      const pulse = 0.6 + 0.2 * Math.sin(g.frame * 0.2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(DINO_X + (g.ducking ? DINO_DUCK_W : DINO_W) / 2, g.y + (g.ducking ? DINO_DUCK_H : DINO_H) / 2, (g.ducking ? DINO_DUCK_W : DINO_W) + 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawDino(ctx, g);

    const m = milestoneRef.current;
    if (m && m.life > 0) {
      ctx.fillStyle = `rgba(251, 191, 36, ${m.life})`;
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(m.text, W / 2, H / 2 - 30);
      ctx.fillText(m.text, W / 2, H / 2 - 30);
      ctx.textAlign = 'left';
    }

    ctx.restore();

    ctx.fillStyle = g.isNight ? '#fff' : '#333';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 35);
    ctx.fillText(`High: ${highScore}`, 20, 60);
    ctx.fillText(`Coins: ${g.coinsCollected}`, 20, 85);
    ctx.fillText(`Lives: ${lives}`, W - 100, 35);
    if (g.powerUpActive) {
      const remain = Math.ceil((g.powerUpActive.endTime - Date.now()) / 1000);
      ctx.fillText(`${g.powerUpActive.type} ${remain}s`, W - 150, 60);
    }
    ctx.textAlign = 'left';

    animRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore, lives, difficulty, startTime, postGameStats, spawnObstacle, spawnPowerUp, spawnCoin, addDustParticle, addStarParticle, drawDino, drawObstacle, drawPowerUp, drawCoin, getBaseSpeed, getMaxSpeed]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (gameState === 'menu') {
        playSound('go');
        setGameState('playing');
        setStartTime(Date.now());
        setScore(0);
        setLives(LIVES_DEFAULT);
        setCoins(0);
        setPostGameStats(null);
        gameRef.current = {
          vy: 0,
          y: GROUND_Y,
          ducking: false,
          dead: false,
          frame: 0,
          deathFrame: 0,
          speed: getBaseSpeed(),
          obstacles: [],
          powerUps: [],
          coinList: [],
          particles: [],
          parallax: { far: 0, mid: 0, near: 0 },
          lastObstacleX: 0,
          lastPowerUpX: 0,
          lastCoinX: 0,
          isNight: false,
          terrain: 'desert',
          skin: 'default',
          powerUpActive: null,
          coinsCollected: 0,
          jumpsUsed: 0,
          canDoubleJump: false,
        };
      } else if (gameState === 'playing' && !gameRef.current.dead && !gameRef.current.ducking) {
        const g = gameRef.current;
        if (g.y >= GROUND_Y - 2) {
          g.vy = JUMP_VEL;
          g.jumpsUsed = 1;
          playSound('jump');
        } else if (g.canDoubleJump && g.jumpsUsed < 2) {
          g.vy = JUMP_VEL * 0.9;
          g.jumpsUsed = 2;
          g.canDoubleJump = false;
          playSound('jump');
        }
      }
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (gameState === 'playing' && !gameRef.current.dead) {
        gameRef.current.ducking = true;
      }
    }
  }, [gameState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'ArrowDown') {
      if (gameState === 'playing') gameRef.current.ducking = false;
    }
  }, [gameState]);

  const handlePlayAgain = useCallback(() => {
    playSound('click');
    setScore(0);
    setGameState('playing');
    const g = gameRef.current;
    g.y = GROUND_Y;
    g.vy = 0;
    g.dead = false;
    g.deathFrame = 0;
    g.frame = 0;
    g.obstacles = [];
    g.powerUps = [];
    g.coinList = [];
    g.particles = [];
    g.coinsCollected = 0;
    g.powerUpActive = null;
    g.lastObstacleX = 0;
    g.lastPowerUpX = 0;
    g.lastCoinX = 0;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-zinc-900/50 rounded-xl w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between w-full max-w-[900px]">
        <div className="flex items-center gap-4">
          {gameState === 'menu' && (
            <>
              <span className="text-zinc-400 text-sm">Difficulty:</span>
              <div className="flex gap-2">
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition touch-manipulation active:scale-95 ${
                      difficulty === d ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
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
      <div
        style={{ touchAction: 'none', width: '100%' }}
        onClick={() => {
          if (gameState === 'playing' && !gameRef.current.dead && !gameRef.current.ducking) {
            const g = gameRef.current;
            if (g.y >= GROUND_Y - 2) {
              g.vy = JUMP_VEL;
              g.jumpsUsed = 1;
              playSound('jump');
            } else if (g.canDoubleJump && g.jumpsUsed < 2) {
              g.vy = JUMP_VEL * 0.9;
              g.jumpsUsed = 2;
              g.canDoubleJump = false;
              playSound('jump');
            }
          }
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          touchStartRef.current = Date.now();
          if (gameState === 'playing' && !gameRef.current.dead) {
            duckTimeoutRef.current = window.setTimeout(() => {
              gameRef.current.ducking = true;
              duckTimeoutRef.current = null;
            }, 280);
          }
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          if (duckTimeoutRef.current) {
            clearTimeout(duckTimeoutRef.current);
            duckTimeoutRef.current = null;
          }
          gameRef.current.ducking = false;
          const holdTime = Date.now() - touchStartRef.current;
          if (holdTime < 300 && gameState === 'playing' && !gameRef.current.dead) {
            const g = gameRef.current;
            if (g.y >= GROUND_Y - 2) {
              g.vy = JUMP_VEL;
              g.jumpsUsed = 1;
              playSound('jump');
            } else if (g.canDoubleJump && g.jumpsUsed < 2) {
              g.vy = JUMP_VEL * 0.9;
              g.jumpsUsed = 2;
              g.canDoubleJump = false;
              playSound('jump');
            }
          }
        }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block w-full rounded-lg border-2 border-zinc-600 bg-zinc-800"
          style={{ maxWidth: '100%', imageRendering: 'pixelated' }}
        />
      </div>
      {(gameState === 'menu' || gameState === 'gameover') && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-zinc-400 text-sm">
            {gameState === 'menu' ? 'Press Space or ↑ to start' : 'Press Space or ↑ to play again'}
          </p>
          {gameState === 'gameover' && (
            <button
              onClick={handlePlayAgain}
              className="px-6 py-2 rounded-lg bg-amber-500 text-black font-bold hover:bg-amber-400 transition touch-manipulation active:scale-95"
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
