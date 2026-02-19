/* ═══════════════════════════════════════════════════════════════════════════════
   FLAPPY GAME — Elite Arcade
   Massive canvas Flappy Jump: parallax, themes, power-ups, medals, bird skins,
   coins, difficulty modes, death animation, animated bird with wing flap
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';
import { isTouchDevice, haptic } from '../TouchControls';
import { isMobile, formatScore, createConfetti, updateParticles, drawParticles, type Particle as UtilParticle } from '../GameUtils';

interface FlappyGameProps {
  onClose: () => void;
}

// ─── Constants (responsive) ──────────────────────────────────────────────────
const W = 400;
const H = 600;
const BIRD_R = 14;
const GRAVITY = 0.48;
const FLAP_STRENGTH = -9.2;
const PIPE_W = 62;
const PIPE_GAP_BASE = 155;
const PIPE_GAP_MIN = 85;
const PIPE_SPEED_BASE = 3.2;
const GROUND_H = 85;
const THEME_CHANGE_SCORE = 15;

type Theme = 'day' | 'night' | 'underwater' | 'space';
type BirdSkin = 'default' | 'red' | 'blue' | 'rainbow';
type Difficulty = 'easy' | 'normal' | 'hard';
type PowerUpType = 'shield' | 'slow' | 'small' | 'score2' | 'ghost';
type Medal = 'bronze' | 'silver' | 'gold' | 'platinum' | null;

interface Pipe {
  x: number;
  top: number;
  bottom: number;
  gap: number;
  passed: boolean;
  moveDir: number;
  moveOffset: number;
  id: number;
  zoneIndex: number;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  anim: number;
  id: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  collected: boolean;
  anim: number;
  id: number;
}

interface TrailFeather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Mountain {
  x: number;
  peak: number;
  w: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
}

const HIGH_SCORE_KEYS: Record<Difficulty, string> = {
  easy: 'flappy_high_easy',
  normal: 'flappy_high_normal',
  hard: 'flappy_high_hard',
};

const MEDAL_THRESHOLDS: Record<Medal extends null ? never : NonNullable<Medal>, number> = {
  bronze: 10,
  silver: 20,
  gold: 40,
  platinum: 100,
};

const DIFFICULTY_GAP_MULT: Record<Difficulty, number> = { easy: 1.25, normal: 1, hard: 0.8 };
const DIFFICULTY_PIPE_SPEED: Record<Difficulty, number> = { easy: 2.6, normal: 3.2, hard: 3.8 };
const DIFFICULTY_MOVING_PIPES: Record<Difficulty, number> = { easy: 0.15, normal: 0.35, hard: 0.6 };

// ─── Theme Colors ────────────────────────────────────────────────────────────
function getThemeColors(theme: Theme) {
  switch (theme) {
    case 'day':
      return {
        sky: '#87CEEB',
        sky2: '#B0E0E6',
        clouds: 'rgba(255,255,255,0.85)',
        mountains: '#6B8E6B',
        mountains2: '#5A7A5A',
        ground: '#22c55e',
        grass: '#16a34a',
        pipe: '#22c55e',
        pipeDark: '#16a34a',
        pipeCap: '#15803d',
        pipeHighlight: '#4ade80',
      };
    case 'night':
      return {
        sky: '#0f172a',
        sky2: '#1e293b',
        clouds: 'rgba(71,85,105,0.7)',
        mountains: '#1e3a2f',
        mountains2: '#0f2a1f',
        ground: '#14532d',
        grass: '#052e16',
        pipe: '#166534',
        pipeDark: '#14532d',
        pipeCap: '#064e3b',
        pipeHighlight: '#22c55e',
      };
    case 'underwater':
      return {
        sky: '#0c4a6e',
        sky2: '#075985',
        clouds: 'rgba(56,189,248,0.4)',
        mountains: '#0e7490',
        mountains2: '#0c4a6e',
        ground: '#164e63',
        grass: '#0e7490',
        pipe: '#0891b2',
        pipeDark: '#0e7490',
        pipeCap: '#06b6d4',
        pipeHighlight: '#22d3ee',
      };
    case 'space':
      return {
        sky: '#030712',
        sky2: '#0f172a',
        clouds: 'rgba(99,102,241,0.3)',
        mountains: '#312e81',
        mountains2: '#1e1b4b',
        ground: '#1e1b4b',
        grass: '#312e81',
        pipe: '#4f46e5',
        pipeDark: '#3730a3',
        pipeCap: '#6366f1',
        pipeHighlight: '#818cf8',
      };
    default:
      return getThemeColors('day');
  }
}

const PIPE_ZONE_COLORS: { pipe: string; pipeDark: string; pipeCap: string; pipeHighlight: string }[] = [
  { pipe: '#22c55e', pipeDark: '#16a34a', pipeCap: '#15803d', pipeHighlight: '#4ade80' },
  { pipe: '#3b82f6', pipeDark: '#2563eb', pipeCap: '#1d4ed8', pipeHighlight: '#60a5fa' },
  { pipe: '#8b5cf6', pipeDark: '#7c3aed', pipeCap: '#6d28d9', pipeHighlight: '#a78bfa' },
  { pipe: '#ec4899', pipeDark: '#db2777', pipeCap: '#be185d', pipeHighlight: '#f472b6' },
  { pipe: '#f59e0b', pipeDark: '#d97706', pipeCap: '#b45309', pipeHighlight: '#fbbf24' },
  { pipe: '#06b6d4', pipeDark: '#0891b2', pipeCap: '#0e7490', pipeHighlight: '#22d3ee' },
];

function getPipeColorsForZone(zoneIndex: number, themeColors: ReturnType<typeof getThemeColors>): { pipe: string; pipeDark: string; pipeCap: string; pipeHighlight: string } {
  return PIPE_ZONE_COLORS[zoneIndex % PIPE_ZONE_COLORS.length] ?? themeColors;
}

function getMedal(score: number): Medal {
  if (score >= 100) return 'platinum';
  if (score >= 40) return 'gold';
  if (score >= 20) return 'silver';
  if (score >= 10) return 'bronze';
  return null;
}

// ─── Bird Drawing ────────────────────────────────────────────────────────────
function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  wingAngle: number,
  skin: BirdSkin,
  scale: number,
  frame: number
) {
  const r = BIRD_R * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  let bodyColor = '#eab308';
  let bodyDark = '#ca8a04';
  let bodyLight = '#facc15';
  let beakColor = '#f97316';

  if (skin === 'red') {
    bodyColor = '#ef4444';
    bodyDark = '#dc2626';
    bodyLight = '#f87171';
    beakColor = '#ea580c';
  } else if (skin === 'blue') {
    bodyColor = '#3b82f6';
    bodyDark = '#2563eb';
    bodyLight = '#60a5fa';
    beakColor = '#1e40af';
  } else if (skin === 'rainbow') {
    const hue = (frame * 3) % 360;
    bodyColor = `hsl(${hue}, 85%, 55%)`;
    bodyDark = `hsl(${hue}, 85%, 45%)`;
    bodyLight = `hsl(${hue}, 90%, 70%)`;
    beakColor = '#f97316';
  }

  // Body (ellipse)
  ctx.fillStyle = bodyDark;
  ctx.beginPath();
  ctx.ellipse(-2, 2, r * 0.7, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyLight;
  ctx.beginPath();
  ctx.ellipse(2, -2, r * 0.6, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing (animated flap)
  ctx.fillStyle = bodyDark;
  ctx.save();
  ctx.rotate(wingAngle);
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, 0, r * 0.8, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eye
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(r * 0.5, -r * 0.3, r * 0.3, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(r * 0.55, -r * 0.35, r * 0.12, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = beakColor;
  ctx.beginPath();
  ctx.moveTo(r + 2, 0);
  ctx.lineTo(r + 9, -3);
  ctx.lineTo(r + 9, 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function FlappyGame({ onClose }: FlappyGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [dead, setDead] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<BirdSkin>('default');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [deathFlash, setDeathFlash] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const pipeIdRef = useRef(0);
  const coinIdRef = useRef(0);
  const powerUpIdRef = useRef(0);

  const highScores = useRef<Record<Difficulty, number>>({
    easy: 0,
    normal: 0,
    hard: 0,
  });

  const gameRef = useRef({
    birdY: H / 2 - BIRD_R,
    birdVy: 0,
    birdRotation: 0,
    wingCycle: 0,
    frame: 0,
    pipes: [] as Pipe[],
    coins: [] as Coin[],
    powerUps: [] as PowerUp[],
    trailFeathers: [] as TrailFeather[],
    lastPipe: 0,
    groundOffset: 0,
    parallaxOffsets: [0, 0, 0] as number[],
    deathT: 0,
    deathVy: 0,
    deathRotation: 0,
    pipeSpeed: PIPE_SPEED_BASE,
    scoreMultiplier: 1,
    ghostActive: false,
    ghostTimer: 0,
    shieldActive: false,
    shieldTimer: 0,
    slowMotion: false,
    slowTimer: 0,
    smallBird: false,
    smallTimer: 0,
    clouds: [] as Cloud[],
    mountains: [] as Mountain[],
    stars: [] as Star[],
  });

  useEffect(() => {
    ['easy', 'normal', 'hard'].forEach((d) => {
      try {
        const saved = localStorage.getItem(HIGH_SCORE_KEYS[d as Difficulty]);
        if (saved) highScores.current[d as Difficulty] = parseInt(saved, 10);
      } catch {}
    });
  }, []);

  const theme: Theme = score < 15 ? 'day' : score < 30 ? 'night' : score < 50 ? 'underwater' : 'space';
  const gapMult = DIFFICULTY_GAP_MULT[difficulty];
  const baseSpeed = DIFFICULTY_PIPE_SPEED[difficulty];
  const movingPipeChance = DIFFICULTY_MOVING_PIPES[difficulty];
  const currentHighScore = highScores.current[difficulty];

  const getPipeGap = useCallback(() => {
    const shrink = Math.min(40, score * 1.5);
    return Math.max(PIPE_GAP_MIN, (PIPE_GAP_BASE - shrink) * gapMult);
  }, [score, gapMult]);

  const spawnCoin = useCallback((x: number, pipeTop: number, pipeBottom: number) => {
    const centerY = (pipeTop + pipeBottom) / 2;
    coinIdRef.current += 1;
    gameRef.current.coins.push({
      x,
      y: centerY,
      collected: false,
      anim: 0,
      id: coinIdRef.current,
    });
  }, []);

  const spawnPowerUp = useCallback((x: number, pipeTop: number, pipeBottom: number) => {
    if (Math.random() > 0.25) return;
    const types: PowerUpType[] = ['shield', 'slow', 'small', 'score2', 'ghost'];
    const type = types[Math.floor(Math.random() * types.length)];
    const centerY = (pipeTop + pipeBottom) / 2 + (Math.random() - 0.5) * 40;
    powerUpIdRef.current += 1;
    gameRef.current.powerUps.push({
      x,
      y: centerY,
      type,
      collected: false,
      anim: 0,
      id: powerUpIdRef.current,
    });
  }, []);

  const spawnPipe = useCallback(() => {
    const gap = getPipeGap();
    const minTop = 80;
    const maxTop = H - GROUND_H - gap - 80;
    const top = minTop + Math.random() * (maxTop - minTop);
    const bottom = top + gap;
    const moves = Math.random() < movingPipeChance;
    pipeIdRef.current += 1;
    const pipe = {
      x: W + PIPE_W,
      top,
      bottom,
      gap,
      passed: false,
      moveDir: moves ? (Math.random() > 0.5 ? 1 : -1) : 0,
      moveOffset: 0,
      id: pipeIdRef.current,
      zoneIndex: Math.floor((pipeIdRef.current - 1) / 10) % 6,
    };
    gameRef.current.pipes.push(pipe);
    spawnCoin(pipe.x + PIPE_W / 2 - 15, top, bottom);
    if (Math.random() < 0.35) spawnPowerUp(pipe.x + PIPE_W / 2 + 25, top, bottom);
  }, [getPipeGap, movingPipeChance, spawnCoin, spawnPowerUp]);

  const addTrailFeathers = useCallback((x: number, y: number, skin: BirdSkin) => {
    const colors = skin === 'rainbow' ? ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3'] : ['#ca8a04', '#facc15'];
    for (let i = 0; i < 4; i++) {
      gameRef.current.trailFeathers.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 2 + 1,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }, []);

  const initParallax = useCallback(() => {
    const clouds: Cloud[] = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * W * 2,
        y: 30 + Math.random() * 120,
        w: 60 + Math.random() * 80,
        h: 25 + Math.random() * 25,
        speed: 0.2 + Math.random() * 0.4,
      });
    }
    const mountains: Mountain[] = [];
    for (let i = 0; i < 12; i++) {
      mountains.push({
        x: (i - 2) * (W / 3 + 20) + Math.random() * 40,
        peak: 120 + Math.random() * 80,
        w: 80 + Math.random() * 60,
      });
    }
    const stars: Star[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * W * 2,
        y: Math.random() * (H - GROUND_H),
        size: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    gameRef.current.clouds = clouds;
    gameRef.current.mountains = mountains;
    gameRef.current.stars = stars;
  }, []);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.birdY = H / 2 - BIRD_R;
    g.birdVy = 0;
    g.birdRotation = 0;
    g.wingCycle = 0;
    g.frame = 0;
    g.pipes = [];
    g.coins = [];
    g.powerUps = [];
    g.trailFeathers = [];
    g.lastPipe = 0;
    g.groundOffset = 0;
    g.parallaxOffsets = [0, 0, 0];
    g.deathT = 0;
    g.pipeSpeed = baseSpeed;
    g.scoreMultiplier = 1;
    g.shieldActive = false;
    g.shieldTimer = 0;
    g.slowMotion = false;
    g.slowTimer = 0;
    g.smallBird = false;
    g.smallTimer = 0;
    g.ghostActive = false;
    g.ghostTimer = 0;
    initParallax();
  }, [baseSpeed, initParallax]);

  const handleFlap = useCallback(() => {
    if (gameOver || dead) return;
    const g = gameRef.current;
    g.birdVy = FLAP_STRENGTH;
    addTrailFeathers(W / 2, g.birdY, selectedSkin);
    haptic('light');
    playSound('jump');
  }, [gameOver, dead, selectedSkin, addTrailFeathers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleFlap]);

  useEffect(() => {
    if (score > currentHighScore) {
      highScores.current[difficulty] = score;
      try {
        localStorage.setItem(HIGH_SCORE_KEYS[difficulty], String(score));
      } catch {}
    }
  }, [score, difficulty, currentHighScore]);

  useEffect(() => {
    let animId: number;
    const animateScore = () => {
      setDisplayScore((prev) => {
        if (prev < score) return Math.min(prev + 1, score);
        return score;
      });
      animId = requestAnimationFrame(animateScore);
    };
    animId = requestAnimationFrame(animateScore);
    return () => cancelAnimationFrame(animId);
  }, [score]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const loop = () => {
      const g = gameRef.current;
      const dt = g.slowMotion ? 0.008 : 0.016;
      g.frame += 1;

      // Power-up timers
      if (g.shieldActive) {
        g.shieldTimer -= dt;
        if (g.shieldTimer <= 0) g.shieldActive = false;
      }
      if (g.slowMotion) {
        g.slowTimer -= dt;
        if (g.slowTimer <= 0) g.slowMotion = false;
      }
      if (g.smallBird) {
        g.smallTimer -= dt;
        if (g.smallTimer <= 0) g.smallBird = false;
      }
      if (g.ghostActive) {
        g.ghostTimer -= dt;
        if (g.ghostTimer <= 0) g.ghostActive = false;
      }

      const zoneSpeedBoost = Math.floor(score / 10) * 0.25;
      const effectiveSpeed = g.slowMotion ? baseSpeed * 0.5 : baseSpeed;
      const speedInc = Math.min(0.5, score * 0.008);
      const pipeSpeed = (effectiveSpeed + speedInc + zoneSpeedBoost) * (g.slowMotion ? 0.6 : 1);

      if (dead) {
        g.deathT += dt;
        g.deathVy += 0.9;
        g.birdY += g.deathVy;
        g.deathRotation += 0.4 + g.deathT * 0.15;
        setDeathFlash((f) => Math.max(0, f - 0.15));
        setScreenShake((s) => Math.max(0, s - 0.5));
        if (g.birdY > H + 80) setGameOver(true);
      } else {
        g.birdVy += GRAVITY * (g.slowMotion ? 0.6 : 1);
        g.birdY += g.birdVy;
        g.birdRotation = Math.max(-0.7, Math.min(0.85, g.birdVy / 10));
        g.wingCycle += 0.25;

        if (g.birdY - BIRD_R < 0) {
          g.birdY = BIRD_R;
          g.birdVy = 0;
        }
        if (g.birdY + BIRD_R > H - GROUND_H) {
          if (g.shieldActive) {
            g.birdY = H - GROUND_H - BIRD_R;
            g.birdVy = -4;
            g.shieldActive = false;
            playSound('shield');
          } else {
            g.deathVy = g.birdVy;
            g.deathRotation = g.birdRotation;
            setDead(true);
            setDeathFlash(1);
            setScreenShake(8);
            playSound('hit');
            playSound('gameover');
          }
        }

        g.lastPipe += pipeSpeed;
        if (g.lastPipe > 160) {
          g.lastPipe = 0;
          spawnPipe();
        }

        g.pipes = g.pipes.filter((pipe) => {
          pipe.x -= pipeSpeed;
          if (pipe.moveDir !== 0) {
            pipe.moveOffset += pipe.moveDir * 0.8;
            if (Math.abs(pipe.moveOffset) > 35) pipe.moveDir *= -1;
          }
          const pipeTop = pipe.top + pipe.moveOffset;
          const pipeBottom = pipe.bottom + pipe.moveOffset;

          if (pipe.x + PIPE_W < 0) return false;

          const bx = W / 2;
          const by = g.birdY;
          const hitBox = g.smallBird ? BIRD_R * 0.7 : BIRD_R;

          if (pipe.x + PIPE_W > bx - hitBox && pipe.x < bx + hitBox) {
            if (g.ghostActive) {
              g.ghostActive = false;
              g.ghostTimer = 0;
            } else if ((by - hitBox < pipeTop || by + hitBox > pipeBottom) && !g.shieldActive) {
              g.deathVy = g.birdVy;
              g.deathRotation = g.birdRotation;
              setDead(true);
              setDeathFlash(1);
              setScreenShake(8);
              playSound('hit');
              playSound('gameover');
            } else if ((by - hitBox < pipeTop || by + hitBox > pipeBottom) && g.shieldActive) {
              g.shieldActive = false;
              playSound('shield');
            }
          }

          if (!pipe.passed && pipe.x + PIPE_W < bx - hitBox) {
            pipe.passed = true;
            setScore((s) => s + 1 * g.scoreMultiplier);
            playSound('correct');
          }

          return true;
        });

        g.coins = g.coins.filter((c) => {
          c.anim += 0.12;
          if (c.collected) return false;
          c.x -= pipeSpeed;
          if (c.x < -20) return false;
          const dx = Math.abs(W / 2 - c.x);
          const dy = Math.abs(g.birdY - c.y);
          const r = g.smallBird ? BIRD_R * 0.7 : BIRD_R;
          if (dx < r + 12 && dy < r + 12) {
            c.collected = true;
            setCoins((co) => co + 1);
            setScore((s) => s + 1);
            playSound('coin');
          }
          return true;
        });

        g.powerUps = g.powerUps.filter((pu) => {
          pu.anim += 0.1;
          if (pu.collected) return false;
          pu.x -= pipeSpeed;
          if (pu.x < -30) return false;
          const dx = Math.abs(W / 2 - pu.x);
          const dy = Math.abs(g.birdY - pu.y);
          const r = g.smallBird ? BIRD_R * 0.7 : BIRD_R;
          if (dx < r + 18 && dy < r + 18) {
            pu.collected = true;
            playSound('powerup');
            if (pu.type === 'shield') {
              g.shieldActive = true;
              g.shieldTimer = 5;
            } else if (pu.type === 'ghost') {
              g.ghostActive = true;
              g.ghostTimer = 999;
            } else if (pu.type === 'slow') {
              g.slowMotion = true;
              g.slowTimer = 4;
            } else if (pu.type === 'small') {
              g.smallBird = true;
              g.smallTimer = 5;
            } else if (pu.type === 'score2') {
              g.scoreMultiplier = 2;
              setTimeout(() => (gameRef.current.scoreMultiplier = 1), 6000);
            }
          }
          return true;
        });

        g.trailFeathers = g.trailFeathers
          .map((t) => ({
            ...t,
            x: t.x + t.vx,
            y: t.y + t.vy,
            vy: t.vy + 0.2,
            life: t.life - 0.04,
          }))
          .filter((t) => t.life > 0);
      }

      g.groundOffset = (g.groundOffset + pipeSpeed * 1.3) % 90;
      g.parallaxOffsets[0] = (g.parallaxOffsets[0] + pipeSpeed * 0.2) % (W + 300);
      g.parallaxOffsets[1] = (g.parallaxOffsets[1] + pipeSpeed * 0.5) % (W + 200);
      g.parallaxOffsets[2] = (g.parallaxOffsets[2] + pipeSpeed * 0.9) % (W + 120);

      g.clouds.forEach((c) => {
        c.x -= c.speed * pipeSpeed * 0.5;
        if (c.x < -c.w - 50) c.x = W + 50;
      });

      // ─── RENDER ────────────────────────────────────────────────────────────
      const colors = getThemeColors(theme);
      const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Death flash
      if (deathFlash > 0) {
        ctx.fillStyle = `rgba(255,255,255,${deathFlash})`;
        ctx.fillRect(-20, -20, W + 40, H + 40);
      }

      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, colors.sky);
      gradient.addColorStop(1, colors.sky2);
      ctx.fillStyle = gradient;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // Stars (night/space)
      if (theme === 'night' || theme === 'space') {
        g.stars.forEach((star) => {
          const alpha = 0.4 + Math.sin(star.twinkle + g.frame * 0.08) * 0.5;
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.arc((star.x - g.parallaxOffsets[0] * 0.1) % (W + 50), star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Far layer: clouds
      g.clouds.forEach((c) => {
        ctx.fillStyle = colors.clouds;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + c.w * 0.3, c.y - 5, c.w * 0.4, c.h * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + c.w * 0.6, c.y, c.w * 0.35, c.h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mid layer: mountains
      g.mountains.forEach((m) => {
        const ox = (m.x - g.parallaxOffsets[1]) % (W + 200) - 50;
        ctx.fillStyle = colors.mountains2;
        ctx.beginPath();
        ctx.moveTo(ox, H);
        ctx.lineTo(ox + m.w * 0.5, H - m.peak * 0.6);
        ctx.lineTo(ox + m.w, H);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = colors.mountains;
        ctx.beginPath();
        ctx.moveTo(ox + 20, H);
        ctx.lineTo(ox + m.w * 0.5, H - m.peak);
        ctx.lineTo(ox + m.w - 20, H);
        ctx.closePath();
        ctx.fill();
      });

      // Near layer: ground base
      ctx.fillStyle = colors.ground;
      for (let i = -2; i < 5; i++) {
        const ox = -g.parallaxOffsets[2] + i * (W + 120);
        ctx.fillRect(ox, H - GROUND_H, W + 150, GROUND_H + 30);
      }

      // Grass with seamless scroll
      ctx.fillStyle = colors.grass;
      for (let i = -2; i < 25; i++) {
        const ox = -g.groundOffset + i * 36;
        ctx.fillRect(ox, H - GROUND_H + 15, 28, 10);
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.moveTo(ox + j * 10, H - GROUND_H + 15);
          ctx.lineTo(ox + j * 10 + 3, H - GROUND_H - 5);
          ctx.lineTo(ox + j * 10 + 6, H - GROUND_H + 8);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Pipes (zone colors - every 10 pipes = new color)
      g.pipes.forEach((pipe) => {
        const pc = getPipeColorsForZone(pipe.zoneIndex, colors);
        const pt = pipe.top + pipe.moveOffset;
        const pb = pipe.bottom + pipe.moveOffset;
        ctx.fillStyle = pc.pipeDark;
        ctx.fillRect(pipe.x + 4, 0, PIPE_W - 8, pt);
        ctx.fillRect(pipe.x + 4, pb, PIPE_W - 8, H - pb);
        ctx.fillStyle = pc.pipe;
        ctx.fillRect(pipe.x, 0, PIPE_W, pt);
        ctx.fillRect(pipe.x, pb, PIPE_W, H - pb);
        ctx.fillStyle = pc.pipeCap;
        ctx.fillRect(pipe.x - 4, pt - 28, PIPE_W + 12, 28);
        ctx.fillRect(pipe.x - 4, pb, PIPE_W + 12, 28);
        ctx.fillStyle = pc.pipeHighlight;
        ctx.fillRect(pipe.x + 8, pt - 24, 4, 12);
        ctx.fillRect(pipe.x + 8, pb + 6, 4, 12);
      });

      // Coins
      g.coins.forEach((c) => {
        if (c.collected) return;
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.anim);
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Power-ups
      g.powerUps.forEach((pu) => {
        if (pu.collected) return;
        const scale = 0.8 + Math.sin(pu.anim) * 0.1;
        ctx.save();
        ctx.translate(pu.x, pu.y);
        ctx.scale(scale, scale);
        ctx.fillStyle = pu.type === 'shield' ? '#3b82f6' : pu.type === 'slow' ? '#8b5cf6' : pu.type === 'small' ? '#22c55e' : pu.type === 'ghost' ? '#a78bfa' : '#eab308';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(pu.type === 'shield' ? 'S' : pu.type === 'slow' ? 'T' : pu.type === 'small' ? 'M' : pu.type === 'ghost' ? 'G' : 'x2', 0, 5);
        ctx.restore();
      });

      // Trail feathers
      g.trailFeathers.forEach((t) => {
        ctx.globalAlpha = t.life;
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, 3, 6, t.vy * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const wingAngle = Math.sin(g.wingCycle) * 0.5;
      const birdScale = g.smallBird ? 0.7 : 1;
      drawBird(ctx, W / 2, g.birdY, dead ? g.deathRotation : g.birdRotation, wingAngle, selectedSkin, birdScale, g.frame);

      if (g.shieldActive) {
        ctx.strokeStyle = `rgba(59,130,246,${0.4 + Math.sin(g.frame * 0.3) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, g.birdY, (g.smallBird ? BIRD_R * 0.7 : BIRD_R) + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (g.ghostActive) {
        ctx.globalAlpha = 0.5 + Math.sin(g.frame * 0.2) * 0.2;
        ctx.strokeStyle = `rgba(167,139,250,0.8)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(W / 2, g.birdY, (g.smallBird ? BIRD_R * 0.7 : BIRD_R) + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // Score
      ctx.fillStyle = theme === 'night' || theme === 'space' ? '#fff' : '#1f2937';
      ctx.strokeStyle = theme === 'night' || theme === 'space' ? '#000' : '#fff';
      ctx.lineWidth = 3;
      ctx.font = 'bold 42px system-ui';
      ctx.textAlign = 'center';
      ctx.strokeText(String(Math.round(displayScore)), W / 2, 55);
      ctx.fillText(String(Math.round(displayScore)), W / 2, 55);

      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started, gameOver, dead, displayScore, selectedSkin, theme, baseSpeed, difficulty, movingPipeChance, getPipeGap, spawnPipe, spawnCoin, spawnPowerUp, deathFlash, screenShake]);

  useEffect(() => {
    if (started && !gameOver) resetGame();
  }, [started, gameOver, resetGame]);

  const handleStart = () => {
    setScore(0);
    setDisplayScore(0);
    setCoins(0);
    setGameOver(false);
    setDead(false);
    setDeathFlash(0);
    setScreenShake(0);
    setStarted(true);
    playSound('click');
  };

  const handleRestart = () => {
    handleStart();
  };

  const medal = getMedal(score);
  const unlockedRainbow = currentHighScore >= 30 || score >= 30;

  const [showTouch] = useState(isTouchDevice());

  return (
    <div className="game-card w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Flappy Jump</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation" onMouseEnter={() => playSound('hover')} onClickCapture={() => playSound('click')}>
          Close
        </button>
      </div>

      {!started && (
        <>
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">Difficulty</p>
            <div className="flex gap-2 flex-wrap">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors capitalize ${
                    difficulty === d ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {d} (Best: {highScores.current[d]})
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-2">Bird Skin</p>
            <div className="flex gap-2 flex-wrap">
              {(['default', 'red', 'blue', 'rainbow'] as BirdSkin[]).map((s) => (
                <button
                  key={s}
                  onClick={() => (unlockedRainbow || s !== 'rainbow') && setSelectedSkin(s)}
                  disabled={s === 'rainbow' && !unlockedRainbow}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors capitalize ${
                    selectedSkin === s ? 'bg-amber-500 text-white' : s === 'rainbow' && !unlockedRainbow ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {s === 'rainbow' && !unlockedRainbow ? `${s} (30pts)` : s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div
        className="relative rounded-lg overflow-hidden border border-gray-200 bg-white cursor-pointer select-none w-full game-active"
        onClick={handleFlap}
        onTouchStart={(e) => { e.preventDefault(); handleFlap(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.code === 'Space' || e.code === 'ArrowUp') && handleFlap()}
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ maxWidth: '100%' }} />

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95">
            <p className="text-gray-900 font-medium mb-3 text-sm sm:text-base text-center px-4">
              {showTouch ? 'Tap anywhere to flap' : 'Space or Up to flap'}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); handleStart(); }}
              onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleStart(); }}
              className="btn-elite btn-elite-primary touch-manipulation active:scale-95"
            >
              Start
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <p className="text-xl sm:text-2xl font-bold text-white mb-1">Game Over</p>
            <p className="text-white/90 text-base sm:text-lg mb-1">Score: {score}</p>
            <p className="text-amber-300 text-sm mb-1">Coins: {coins}</p>
            {medal && (
              <p className="text-yellow-400 font-bold mb-2 sm:mb-3 capitalize flex items-center gap-1 text-sm sm:text-base">
                Medal: {medal}
                {medal === 'bronze' && '🥉'}
                {medal === 'silver' && '🥈'}
                {medal === 'gold' && '🥇'}
                {medal === 'platinum' && '💎'}
              </p>
            )}
            <p className="text-gray-300 text-xs mb-3 sm:mb-4">Best ({difficulty}): {currentHighScore}</p>
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleRestart(); }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); handleRestart(); }}
                className="btn-elite btn-elite-primary touch-manipulation active:scale-95"
              >
                Play Again
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); onClose(); }}
                className="btn-elite btn-elite-ghost text-white border-white/50 hover:bg-white/20 touch-manipulation active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 sm:mt-3 flex items-center justify-between text-xs sm:text-sm text-gray-600">
        <span>Score: {Math.round(displayScore)} | Coins: {coins} | Theme: {theme}</span>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {showTouch ? 'Tap to flap · Themes change as you progress · Collect coins & power-ups (Ghost passes 1 pipe)'
          : 'Parallax, themes, power-ups (Shield/Slow/Small/Score x2/Ghost), medals, difficulty zones every 10 pipes. Rainbow at 30pts.'}
      </p>
    </div>
  );
}
