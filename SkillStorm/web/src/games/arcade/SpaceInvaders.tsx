/* ═══════════════════════════════════════════════════════════════════════════════
   SPACE INVADERS — Elite Arcade
   Massive canvas-based classic: geometric sprites, parallax stars, particles,
   multiple alien types, weapon upgrades, shield barriers, boss battles
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';
import TouchControls, { isTouchDevice, haptic } from '../TouchControls';
import { isMobile, formatScore } from '../GameUtils';

const W = 640;
const H = 720;
const PLAYER_W = 52;
const PLAYER_H = 28;
const PLAYER_SPEED = 6;
const BULLET_W = 4;
const BULLET_H = 14;
const BULLET_SPEED = 12;
const ALIEN_BASIC_W = 24;
const ALIEN_BASIC_H = 18;
const ALIEN_MEDIUM_W = 32;
const ALIEN_MEDIUM_H = 22;
const ALIEN_HEAVY_W = 36;
const ALIEN_HEAVY_H = 26;
const ALIEN_GAP = 10;
const BOSS_W = 140;
const BOSS_H = 48;
const BOSS_HP = 10;
const UFO_W = 56;
const UFO_H = 20;
const SHIELD_W = 80;
const SHIELD_H = 48;
const SHIELD_CELL = 4;
const BASE_ALIEN_SPEED = 0.4;
const MAX_ALIEN_SPEED = 3.2;
const UFO_POINTS = 100;
const UFO_CHANCE_BASE = 0.002;
const HIGH_SCORE_KEY = 'skillzstorm_space_invaders_high_score';
const KILL_MULTIPLIER_WINDOW = 800; // ms for combo

type AlienType = 'basic' | 'medium' | 'heavy';
type WeaponType = 'standard' | 'spread' | 'rapid' | 'beam';
type PowerUpType = 'spread' | 'rapid' | 'beam' | 'extra_life' | 'shield_repair';
type UpgradeChoice = 'damage' | 'speed' | 'shield' | 'multishot' | 'health' | 'beam_time';
type ShipSkin = 'classic' | 'neon' | 'military' | 'stealth' | 'retro';

interface Star {
  x: number;
  y: number;
  z: number;
  baseX: number;
  twinkle: number;
}

interface Alien {
  x: number;
  y: number;
  type: AlienType;
  hp: number;
  maxHp: number;
  points: number;
  animFrame: number;
  row: number;
  col: number;
  lastShotTime: number;
}

interface Boss {
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  animFrame: number;
  lastShotTime: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  vx?: number;
  player: boolean;
  isBeam?: boolean;
  beamLife?: number;
  trail: { x: number; y: number; a: number }[];
}

interface UFO {
  x: number;
  y: number;
  vx: number;
}

interface Shield {
  x: number;
  y: number;
  cells: boolean[][];
}

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
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
  type: 'explosion' | 'thruster' | 'trail' | 'shield' | 'impact';
}

const SHIP_SKINS: ShipSkin[] = ['classic', 'neon', 'military', 'stealth', 'retro'];
const UPGRADE_OPTIONS: { id: UpgradeChoice; label: string; desc: string }[] = [
  { id: 'damage', label: '+25% Damage', desc: 'Bullets deal more damage' },
  { id: 'speed', label: '+15% Fire Rate', desc: 'Shoot faster' },
  { id: 'shield', label: '+1 Shield HP', desc: 'Shields absorb more hits' },
  { id: 'multishot', label: 'Multishot', desc: 'Fire 2 bullets instead of 1' },
  { id: 'health', label: '+1 Life', desc: 'Extra life' },
  { id: 'beam_time', label: 'Beam Duration +50%', desc: 'Beam lasts longer' },
];

function getAlienLayout(wave: number): { rows: number[]; cols: number } {
  const baseRows = Math.min(5 + Math.floor(wave / 3), 7);
  const cols = Math.min(10 + Math.floor(wave / 5), 14);
  const rows: number[] = [];
  for (let r = 0; r < baseRows; r++) {
    const typeIdx = r % 3;
    if (typeIdx === 0) rows.push(10); // basic
    else if (typeIdx === 1) rows.push(20); // medium
    else rows.push(40); // heavy (2 hp)
  }
  return { rows, cols };
}

function spawnParticles(
  x: number,
  y: number,
  color: string,
  count: number,
  type: Particle['type'] = 'explosion'
): Particle[] {
  const particles: Particle[] = [];
  const maxLife = type === 'explosion' ? 0.8 : type === 'thruster' ? 0.3 : 0.5;
  const baseSize = type === 'explosion' ? 4 : type === 'thruster' ? 3 : 2;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = type === 'thruster' ? 1 + Math.random() * 2 : 2 + Math.random() * 6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === 'thruster' ? 2 : 0),
      life: maxLife,
      maxLife,
      color,
      size: baseSize + Math.random() * 4,
      type,
    });
  }
  return particles;
}

function drawBasicAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number
) {
  const flash = 0.7 + Math.sin(Date.now() * 0.008) * 0.3;
  ctx.fillStyle = `rgb(${Math.floor(80 * flash)},${Math.floor(220 * flash)},${Math.floor(120 * flash)})`;
  ctx.beginPath();
  ctx.moveTo(x + 12, y);
  ctx.lineTo(x + 24, y + 6);
  ctx.lineTo(x + 22, y + 18);
  ctx.lineTo(x + 2, y + 18);
  ctx.lineTo(x, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  const eyeOffset = frame === 0 ? 0 : 2;
  ctx.fillRect(x + 6 + eyeOffset, y + 6, 4, 4);
  ctx.fillRect(x + 14 + eyeOffset, y + 6, 4, 4);
}

function drawMediumAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number
) {
  const flash = 0.65 + Math.sin(Date.now() * 0.006) * 0.35;
  ctx.fillStyle = `rgb(${Math.floor(200 * flash)},${Math.floor(150 * flash)},${Math.floor(255 * flash)})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 11, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#e9d5ff';
  const wiggle = frame === 0 ? 0 : 3;
  ctx.fillRect(x + 4, y + 14, 8 + wiggle, 4);
  ctx.fillRect(x + 20, y + 14, 8 + wiggle, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 8, y + 5, 5, 5);
  ctx.fillRect(x + 19, y + 5, 5, 5);
}

function drawHeavyAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  hp: number,
  maxHp: number
) {
  const armorPulse = 0.6 + Math.sin(Date.now() * 0.01) * 0.4;
  const armorColor = `rgb(${Math.floor(60 * armorPulse)},${Math.floor(120 * armorPulse)},${Math.floor(180 * armorPulse)})`;
  ctx.fillStyle = armorColor;
  ctx.fillRect(x, y + 4, 36, 22);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y + 4, 36, 22);
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(x + 4, y + 8, 28, 14);
  ctx.fillStyle = '#93c5fd';
  const barW = (26 * hp) / maxHp;
  ctx.fillRect(x + 5, y + 20, barW, 3);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 10, y + 10, 4, 4);
  ctx.fillRect(x + 22, y + 10, 4, 4);
}

function drawBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  frame: number
) {
  const pulse = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
  const grad = ctx.createLinearGradient(x, y, x + BOSS_W, y + BOSS_H);
  grad.addColorStop(0, `rgba(220,38,38,${pulse})`);
  grad.addColorStop(0.5, `rgba(185,28,28,${pulse})`);
  grad.addColorStop(1, `rgba(127,29,29,${pulse})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.rect(x, y + 8, BOSS_W, BOSS_H - 8);
  ctx.fill();
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 20, y + 20, BOSS_W - 40, 12);
  ctx.fillStyle = hp / maxHp > 0.5 ? '#22c55e' : hp / maxHp > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(x + 21, y + 21, ((BOSS_W - 42) * hp) / maxHp, 10);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`BOSS ${hp}/${maxHp}`, x + BOSS_W / 2, y + 14);
  ctx.textAlign = 'left';
}

function drawShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  skin: ShipSkin,
  thrusterFrame: number
) {
  const colors = {
    classic: { body: '#22c55e', accent: '#15803d', thruster: '#fbbf24' },
    neon: { body: '#06b6d4', accent: '#0891b2', thruster: '#ec4899' },
    military: { body: '#64748b', accent: '#475569', thruster: '#f59e0b' },
    stealth: { body: '#334155', accent: '#1e293b', thruster: '#38bdf8' },
    retro: { body: '#f97316', accent: '#ea580c', thruster: '#eab308' },
  };
  const c = colors[skin];
  ctx.fillStyle = c.body;
  ctx.beginPath();
  ctx.moveTo(x + 26, y);
  ctx.lineTo(x + 52, y + 28);
  ctx.lineTo(x + 42, y + 28);
  ctx.lineTo(x + 32, y + 20);
  ctx.lineTo(x + 20, y + 28);
  ctx.lineTo(x + 10, y + 28);
  ctx.lineTo(x, y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = c.accent;
  ctx.fillRect(x + 24, y + 22, 4, 6);
  const flameH = 8 + Math.sin(thrusterFrame * 0.3) * 6;
  ctx.fillStyle = c.thruster;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 28);
  ctx.lineTo(x + 20, y + 28 + flameH);
  ctx.lineTo(x + 26, y + 28 + flameH * 0.6);
  ctx.lineTo(x + 32, y + 28 + flameH);
  ctx.lineTo(x + 28, y + 28);
  ctx.closePath();
  ctx.fill();
}

function drawUFO(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const grad = ctx.createLinearGradient(x, y, x + UFO_W, y);
  grad.addColorStop(0, '#ec4899');
  grad.addColorStop(0.5, '#f472b6');
  grad.addColorStop(1, '#db2777');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x + UFO_W / 2, y + UFO_H / 2, UFO_W / 2 - 2, UFO_H / 2 - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fbcfe8';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('?', x + UFO_W / 2, y + 14);
  ctx.textAlign = 'left';
}

export default function SpaceInvaders({ onClose }: { onClose: () => void }) {
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
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<typeof UPGRADE_OPTIONS>([]);
  const [shipSkin, setShipSkin] = useState<ShipSkin>('classic');
  const [screenShake, setScreenShake] = useState(0);
  const [killMultiplier, setKillMultiplier] = useState(1);
  const lastKillTime = useRef(0);

  const gameRef = useRef({
    playerX: W / 2 - PLAYER_W / 2,
    aliens: [] as Alien[],
    boss: null as Boss | null,
    bullets: [] as Bullet[],
    ufo: null as UFO | null,
    shields: [] as Shield[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    alienDir: 1,
    alienSpeed: BASE_ALIEN_SPEED,
    lastAlienMove: 0,
    lastAlienShot: 0,
    lastUfoCheck: 0,
    weapon: 'standard' as WeaponType,
    weaponUntil: 0,
    beamActive: false,
    lastFire: 0,
    fireRate: 180,
    shieldActive: false,
    shieldUntil: 0,
    damageMult: 1,
    fireRateMult: 1,
    multishot: false,
    beamDurationMult: 1,
    thrusterFrame: 0,
    starOffset: 0,
    shipTrail: [] as { x: number; y: number; alpha: number }[],
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number>(0);

  const createShield = useCallback((cx: number, cy: number): Shield => {
    const cols = Math.floor(SHIELD_W / SHIELD_CELL);
    const rows = Math.floor(SHIELD_H / SHIELD_CELL);
    const cells: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const dx = (c - cols / 2) / cols;
        const dy = (r - rows / 2) / rows;
        const inShape = Math.abs(dx) < 0.48 && Math.abs(dy) < 0.45;
        const cutTop = r < 2 && Math.abs(dx) < 0.2;
        cells[r][c] = inShape && !cutTop;
      }
    }
    return {
      x: cx - (cols * SHIELD_CELL) / 2,
      y: cy - (rows * SHIELD_CELL) / 2,
      cells,
    };
  }, []);

  const initShields = useCallback(() => {
    const spacing = W / 5;
    const shields: Shield[] = [];
    for (let i = 0; i < 4; i++) {
      shields.push(createShield(spacing * (i + 1), H - 200));
    }
    return shields;
  }, [createShield]);

  const initAliens = useCallback((w: number) => {
    const { rows, cols } = getAlienLayout(w);
    const aliens: Alien[] = [];
    const startX = 60;
    const startY = 70;
    const now = performance.now();
    for (let r = 0; r < rows.length; r++) {
      const points = rows[r];
      const isHeavy = points === 40;
      const ww = isHeavy ? ALIEN_HEAVY_W : points === 20 ? ALIEN_MEDIUM_W : ALIEN_BASIC_W;
      const hh = isHeavy ? ALIEN_HEAVY_H : points === 20 ? ALIEN_MEDIUM_H : ALIEN_BASIC_H;
      const type: AlienType = isHeavy ? 'heavy' : points === 20 ? 'medium' : 'basic';
      for (let c = 0; c < cols; c++) {
        aliens.push({
          x: startX + c * (ww + ALIEN_GAP),
          y: startY + r * (hh + ALIEN_GAP),
          type,
          hp: isHeavy ? 2 : 1,
          maxHp: isHeavy ? 2 : 1,
          points,
          animFrame: 0,
          row: r,
          col: c,
          lastShotTime: now - Math.random() * 500,
        });
      }
    }
    return aliens;
  }, []);

  const hitShield = useCallback((x: number, y: number): boolean => {
    const g = gameRef.current;
    for (const s of g.shields) {
      const cx = Math.floor((x - s.x) / SHIELD_CELL);
      const cy = Math.floor((y - s.y) / SHIELD_CELL);
      if (
        cy >= 0 &&
        cy < s.cells.length &&
        cx >= 0 &&
        cx < s.cells[0].length &&
        s.cells[cy][cx]
      ) {
        s.cells[cy][cx] = false;
        for (let i = 0; i < 6; i++) {
          g.particles.push(...spawnParticles(s.x + cx * SHIELD_CELL, s.y + cy * SHIELD_CELL, '#22c55e', 4, 'shield'));
        }
        playSound('hit');
        return true;
      }
    }
    return false;
  }, []);

  const triggerScreenShake = useCallback(() => {
    setScreenShake(12);
  }, []);

  const addScore = useCallback((points: number) => {
    const g = gameRef.current;
    const now = performance.now();
    const mult = now - lastKillTime.current < KILL_MULTIPLIER_WINDOW ? killMultiplier : 1;
    const final = Math.floor(points * mult);
    setScore((s) => s + final);
    lastKillTime.current = now;
    if (mult > 1) setKillMultiplier((k) => Math.min(k + 0.5, 5));
    else setKillMultiplier(1);
  }, [killMultiplier]);

  const startWave = useCallback((w: number) => {
    const g = gameRef.current;
    const isBossWave = w > 0 && w % 5 === 0;
    if (isBossWave) {
      g.boss = {
        x: W / 2 - BOSS_W / 2,
        y: 50,
        vx: 2,
        hp: BOSS_HP,
        maxHp: BOSS_HP,
        animFrame: 0,
        lastShotTime: performance.now(),
      };
    } else {
      g.aliens = initAliens(w);
    }
    g.shields = initShields();
    g.alienDir = 1;
    const remaining = g.aliens.length || 1;
    const speedFactor = Math.min(MAX_ALIEN_SPEED / BASE_ALIEN_SPEED, 1 + (100 - remaining) * 0.02);
    g.alienSpeed = BASE_ALIEN_SPEED * speedFactor * (1 + w * 0.08);
    playSound('wave_start');
  }, [initAliens, initShields]);

  const rollUpgradeChoices = useCallback(() => {
    const shuffled = [...UPGRADE_OPTIONS].sort(() => Math.random() - 0.5);
    setUpgradeChoices(shuffled.slice(0, 3));
    setShowUpgrade(true);
  }, []);

  const applyUpgrade = useCallback((choice: UpgradeChoice) => {
    const g = gameRef.current;
    switch (choice) {
      case 'damage':
        g.damageMult *= 1.25;
        break;
      case 'speed':
        g.fireRateMult *= 1.15;
        break;
      case 'shield':
        g.shields.forEach((s) => {
          for (let r = 0; r < s.cells.length; r++) {
            for (let c = 0; c < s.cells[0].length; c++) {
              if (!s.cells[r][c] && Math.random() < 0.3) s.cells[r][c] = true;
            }
          }
        });
        break;
      case 'multishot':
        g.multishot = true;
        break;
      case 'health':
        setLives((l) => l + 1);
        playSound('extra_life');
        break;
      case 'beam_time':
        g.beamDurationMult *= 1.5;
        break;
    }
    setShowUpgrade(false);
    playSound('powerup');
  }, []);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
      } catch {}
    }
  }, [score, highScore]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    let lastTime = performance.now();

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 16.67, 3);
      lastTime = now;

      if (showUpgrade) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      g.thrusterFrame += dt;
      g.starOffset += dt * 0.15;

      if (screenShake > 0) {
        setScreenShake((s) => Math.max(0, s - dt * 2));
      }

      const shakeX = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      const shakeY = screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      ctx.fillStyle = '#030712';
      ctx.fillRect(-10, -10, W + 20, H + 20);

      for (let i = 0; i < 120; i++) {
        const star = { x: (i * 47) % (W + 40) - 20, y: ((i * 31 + g.starOffset * 20) % (H + 40)) - 20, z: (i % 3) + 1 };
        const alpha = 0.2 + (star.z / 3) * 0.5 + Math.sin(now * 0.002 + i) * 0.2;
        const size = star.z;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(star.x, star.y, size, size);
      }

      if (g.aliens.length === 0 && g.boss === null) {
        rollUpgradeChoices();
        setWave((w) => {
          const next = w + 1;
          startWave(next);
          return next;
        });
      }

      if (g.shields.length === 0 && g.boss === null) g.shields = initShields();

      const alienW = ALIEN_BASIC_W + ALIEN_GAP;
      const moveInterval = 1000 / g.alienSpeed;
      if (g.aliens.length > 0 && now - g.lastAlienMove > moveInterval) {
        g.lastAlienMove = now;
        let moveDown = false;
        let minX = Infinity, maxX = -Infinity;
        g.aliens.forEach((a) => {
          const ww = a.type === 'heavy' ? ALIEN_HEAVY_W : a.type === 'medium' ? ALIEN_MEDIUM_W : ALIEN_BASIC_W;
          minX = Math.min(minX, a.x);
          maxX = Math.max(maxX, a.x + ww);
        });
        if (g.alienDir > 0 && maxX > W - 50) {
          g.alienDir = -1;
          moveDown = true;
        } else if (g.alienDir < 0 && minX < 50) {
          g.alienDir = 1;
          moveDown = true;
        }
        g.aliens.forEach((a) => {
          const ww = a.type === 'heavy' ? ALIEN_HEAVY_W : a.type === 'medium' ? ALIEN_MEDIUM_W : ALIEN_BASIC_W;
          a.x += g.alienDir * 8;
          if (moveDown) a.y += 12;
          a.animFrame = (a.animFrame + 1) % 2;
        });
      }

      if (g.boss) {
        g.boss.x += g.boss.vx * dt;
        if (g.boss.x <= 20 || g.boss.x >= W - BOSS_W - 20) g.boss.vx *= -1;
        g.boss.animFrame = (g.boss.animFrame + 1) % 4;
        if (now - g.boss.lastShotTime > 1200) {
          g.boss.lastShotTime = now;
          g.bullets.push({
            x: g.boss.x + BOSS_W / 2,
            y: g.boss.y + BOSS_H,
            vy: 5,
            player: false,
            trail: [],
          });
          g.bullets.push({
            x: g.boss.x + BOSS_W / 4,
            y: g.boss.y + BOSS_H,
            vy: 5,
            vx: -1,
            player: false,
            trail: [],
          });
          g.bullets.push({
            x: g.boss.x + (3 * BOSS_W) / 4,
            y: g.boss.y + BOSS_H,
            vy: 5,
            vx: 1,
            player: false,
            trail: [],
          });
        }
      }

      if (g.aliens.length > 0 && now - g.lastAlienShot > 600 + Math.random() * 400) {
        g.lastAlienShot = now;
        const idx = Math.floor(Math.random() * g.aliens.length);
        const a = g.aliens[idx];
        const ww = a.type === 'heavy' ? ALIEN_HEAVY_W : a.type === 'medium' ? ALIEN_MEDIUM_W : ALIEN_BASIC_W;
        const hh = a.type === 'heavy' ? ALIEN_HEAVY_H : a.type === 'medium' ? ALIEN_MEDIUM_H : ALIEN_BASIC_H;
        g.bullets.push({
          x: a.x + ww / 2,
          y: a.y + hh,
          vy: 4,
          player: false,
          trail: [],
        });
      }

      if (
        g.ufo === null &&
        g.boss === null &&
        now - g.lastUfoCheck > 1000 &&
        Math.random() < UFO_CHANCE_BASE * (1 + wave * 0.1)
      ) {
        g.lastUfoCheck = now;
        const dir = Math.random() < 0.5 ? 1 : -1;
        g.ufo = {
          x: dir > 0 ? -UFO_W : W,
          y: 28,
          vx: dir * 3,
        };
      }
      if (g.ufo) {
        g.ufo.x += g.ufo.vx * dt;
        if ((g.ufo.vx > 0 && g.ufo.x > W) || (g.ufo.vx < 0 && g.ufo.x < -UFO_W)) {
          g.ufo = null;
        }
      }

      if (keysRef.current['ArrowLeft']) {
        g.playerX = Math.max(10, g.playerX - PLAYER_SPEED);
      }
      if (keysRef.current['ArrowRight']) {
        g.playerX = Math.min(W - PLAYER_W - 10, g.playerX + PLAYER_SPEED);
      }

      // Ship trail effect - add point every few frames
      if (g.shipTrail.length === 0 || Math.hypot(
        g.playerX + PLAYER_W / 2 - (g.shipTrail[g.shipTrail.length - 1]?.x ?? 0),
        0
      ) > 8) {
        g.shipTrail.push({
          x: g.playerX + PLAYER_W / 2,
          y: H - 46,
          alpha: 0.9,
        });
        if (g.shipTrail.length > 16) g.shipTrail.shift();
      }
      g.shipTrail.forEach((t) => { t.alpha -= 0.045; });
      g.shipTrail = g.shipTrail.filter((t) => t.alpha > 0);

      const fireRate = g.weapon === 'rapid' ? 80 : g.weapon === 'beam' ? 0 : 180 / g.fireRateMult;
      const canFire = g.weapon !== 'beam' ? now - g.lastFire > fireRate : !g.beamActive;

      if (keysRef.current[' '] && canFire) {
        if (g.weapon === 'beam') {
          if (!g.beamActive) {
            g.beamActive = true;
            g.lastFire = now;
            playSound('laser');
          }
        } else {
          g.lastFire = now;
          const mx = g.playerX + PLAYER_W / 2;
          const py = H - 60;
          const offsets = g.weapon === 'spread' ? [-12, 0, 12] : g.multishot ? [-6, 6] : [0];
          offsets.forEach((ox) => {
            g.bullets.push({
              x: mx + ox,
              y: py,
              vy: -BULLET_SPEED,
              player: true,
              trail: [],
            });
          });
          playSound('shoot');
        }
      }

      if (g.weapon === 'beam' && g.beamActive) {
        const beamDuration = 1500 * g.beamDurationMult;
        if (now - g.lastFire > beamDuration) {
          g.beamActive = false;
        } else {
          g.bullets.push({
            x: g.playerX + PLAYER_W / 2,
            y: H - 60,
            vy: -20,
            player: true,
            isBeam: true,
            beamLife: 0.1,
            trail: [],
          });
        }
      }

      g.bullets = g.bullets.filter((b) => {
        if (b.y < -20 || b.y > H + 20) return false;
        if (b.vx) b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.trail) {
          b.trail.push({ x: b.x, y: b.y, a: 1 });
          if (b.trail.length > 8) b.trail.shift();
        }
        return true;
      });

      for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
        const b = g.bullets[bi];
        const py = H - 60;
        const px = g.playerX;

        if (!b.player) {
          if (b.x > px && b.x < px + PLAYER_W && b.y > py && b.y < py + PLAYER_H) {
            if (g.shieldActive && now < g.shieldUntil) {
              g.bullets.splice(bi, 1);
              continue;
            }
            g.particles.push(...spawnParticles(px + PLAYER_W / 2, py + PLAYER_H / 2, '#ef4444', 20));
            playSound('explosion');
            triggerScreenShake();
            setLives((l) => {
              if (l <= 1) setGameOver(true);
              return l - 1;
            });
            g.bullets.splice(bi, 1);
          }
          continue;
        }

        if (hitShield(b.x, b.y)) {
          g.bullets.splice(bi, 1);
          continue;
        }

        if (g.boss && b.x > g.boss.x && b.x < g.boss.x + BOSS_W && b.y > g.boss.y && b.y < g.boss.y + BOSS_H) {
          const dmg = b.isBeam ? 2 : Math.ceil(g.damageMult);
          g.boss.hp -= dmg;
          g.bullets.splice(bi, 1);
          if (g.boss.hp <= 0) {
            g.particles.push(...spawnParticles(g.boss.x + BOSS_W / 2, g.boss.y + BOSS_H / 2, '#ef4444', 40));
            playSound('explosion');
            addScore(500);
            g.boss = null;
            setWave((w) => w + 1);
          }
          continue;
        }

        if (g.ufo && b.x > g.ufo.x && b.x < g.ufo.x + UFO_W && b.y > g.ufo.y && b.y < g.ufo.y + UFO_H) {
          addScore(UFO_POINTS);
          g.particles.push(...spawnParticles(g.ufo.x + UFO_W / 2, g.ufo.y + UFO_H / 2, '#ec4899', 15));
          playSound('coin');
          g.ufo = null;
          g.bullets.splice(bi, 1);
          continue;
        }

        for (let ai = g.aliens.length - 1; ai >= 0; ai--) {
          const a = g.aliens[ai];
          const ww = a.type === 'heavy' ? ALIEN_HEAVY_W : a.type === 'medium' ? ALIEN_MEDIUM_W : ALIEN_BASIC_W;
          const hh = a.type === 'heavy' ? ALIEN_HEAVY_H : a.type === 'medium' ? ALIEN_MEDIUM_H : ALIEN_BASIC_H;
          if (b.x > a.x && b.x < a.x + ww && b.y > a.y && b.y < a.y + hh) {
            const dmg = b.isBeam ? 1 : Math.ceil(g.damageMult);
            a.hp -= dmg;
            if (a.hp <= 0) {
              addScore(a.points);
              const colors = a.type === 'heavy' ? ['#60a5fa', '#93c5fd', '#3b82f6', '#1d4ed8'] : a.type === 'medium' ? ['#a78bfa', '#c4b5fd', '#8b5cf6'] : ['#4ade80', '#86efac', '#22c55e'];
              for (let pi = 0; pi < 18; pi++) {
                g.particles.push(...spawnParticles(a.x + ww / 2, a.y + hh / 2, colors[pi % colors.length], 1));
              }
              playSound('smallExplosion');
              if (Math.random() < 0.12) {
                const types: PowerUpType[] = ['spread', 'rapid', 'beam', 'extra_life', 'shield_repair'];
                const weights = [0.25, 0.25, 0.15, 0.15, 0.2];
                let r = Math.random();
                let type: PowerUpType = 'spread';
                for (let i = 0; i < weights.length; i++) {
                  r -= weights[i];
                  if (r <= 0) {
                    type = types[i];
                    break;
                  }
                }
                g.powerUps.push({
                  x: a.x + ww / 2 - 12,
                  y: a.y,
                  type,
                  vy: 2,
                });
              }
              g.aliens.splice(ai, 1);
            }
            g.bullets.splice(bi, 1);
            break;
          }
        }
      }

      g.powerUps.forEach((p, pi) => {
        p.y += p.vy * dt;
        const px = g.playerX;
        const py = H - 60;
        if (p.y + 20 > py && p.y < py + PLAYER_H && p.x + 24 > px && p.x < px + PLAYER_W) {
          if (p.type === 'extra_life') {
            setLives((l) => l + 1);
            playSound('extra_life');
          } else if (p.type === 'shield_repair') {
            g.shieldActive = true;
            g.shieldUntil = now + 5000;
            playSound('shield');
          } else {
            g.weapon = p.type as WeaponType;
            g.weaponUntil = now + 8000;
            playSound('powerup');
          }
          g.powerUps.splice(pi, 1);
        }
      });
      g.powerUps = g.powerUps.filter((p) => p.y < H + 30);

      if (now > g.weaponUntil && g.weapon !== 'standard') {
        g.weapon = 'standard';
      }
      if (now > g.shieldUntil) {
        g.shieldActive = false;
      }

      g.particles = g.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / (p.maxLife * 60);
        return p.life > 0;
      });

      const lowestAlien = g.aliens.length > 0
        ? Math.max(...g.aliens.map((a) => a.y + (a.type === 'heavy' ? ALIEN_HEAVY_H : a.type === 'medium' ? ALIEN_MEDIUM_H : ALIEN_BASIC_H)))
        : 0;
      if (lowestAlien > H - 100) setGameOver(true);

      g.shields.forEach((s) => {
        ctx.fillStyle = '#22c55e';
        s.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell) {
              ctx.fillRect(s.x + c * SHIELD_CELL, s.y + r * SHIELD_CELL, SHIELD_CELL - 1, SHIELD_CELL - 1);
            }
          })
        );
      });

      g.aliens.forEach((a) => {
        if (a.type === 'basic') drawBasicAlien(ctx, a.x, a.y, a.animFrame);
        else if (a.type === 'medium') drawMediumAlien(ctx, a.x, a.y, a.animFrame);
        else drawHeavyAlien(ctx, a.x, a.y, a.animFrame, a.hp, a.maxHp);
      });

      if (g.boss) drawBoss(ctx, g.boss.x, g.boss.y, g.boss.hp, g.boss.maxHp, g.boss.animFrame);

      if (g.ufo) drawUFO(ctx, g.ufo.x, g.ufo.y);

      g.powerUps.forEach((p) => {
        const colors: Record<PowerUpType, string> = {
          spread: '#22c55e',
          rapid: '#f59e0b',
          beam: '#06b6d4',
          extra_life: '#ec4899',
          shield_repair: '#3b82f6',
        };
        ctx.fillStyle = colors[p.type];
        ctx.fillRect(p.x, p.y, 24, 20);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(p.x, p.y, 24, 20);
      });

      g.particles.forEach((p) => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      });

      g.bullets.forEach((b) => {
        if (b.trail && b.trail.length > 0) {
          b.trail.forEach((t, i) => {
            ctx.globalAlpha = (i / b.trail!.length) * 0.5;
            ctx.fillStyle = b.player ? '#60a5fa' : '#ef4444';
            ctx.fillRect(t.x - 2, t.y - 2, 4, 4);
          });
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = b.player ? (b.isBeam ? '#06b6d4' : '#60a5fa') : '#ef4444';
        if (b.isBeam) {
          ctx.fillRect(b.x - 6, b.y, 12, 40);
        } else {
          ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H);
        }
      });

      const drawY = H - 60;
      // Ship trail rendering
      g.shipTrail.forEach((t, i) => {
        if (i === 0) return;
        const prev = g.shipTrail[i - 1];
        ctx.strokeStyle = `rgba(34, 197, 94, ${t.alpha * 0.6})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(t.x, t.y);
        ctx.stroke();
      });
      if (g.shieldActive && now < g.shieldUntil) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(g.playerX - 4, drawY - 4, PLAYER_W + 8, PLAYER_H + 8);
      }
      drawShip(ctx, g.playerX, drawY, shipSkin, g.thrusterFrame);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`HI ${highScore}`, 12, 24);
      ctx.fillText(`${score}`, 12, 44);
      if (killMultiplier > 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`${killMultiplier.toFixed(1)}x`, 12, 64);
      }
      ctx.textAlign = 'right';
      ctx.fillText(`Lives: ${lives}`, W - 12, 24);
      ctx.fillText(`Wave ${wave}`, W - 12, 44);
      // Boss health bar at top when boss is active
      if (g.boss) {
        const bh = 6;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(W / 2 - 100, 58, 200, bh + 4);
        ctx.fillStyle = g.boss.hp / g.boss.maxHp > 0.5 ? '#22c55e' : g.boss.hp / g.boss.maxHp > 0.25 ? '#eab308' : '#ef4444';
        ctx.fillRect(W / 2 - 98, 60, (196 * g.boss.hp) / g.boss.maxHp, bh);
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1;
        ctx.strokeRect(W / 2 - 100, 58, 200, bh + 4);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', W / 2, 52);
        ctx.textAlign = 'left';
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [started, gameOver, showUpgrade, highScore, lives, wave, killMultiplier, shipSkin, screenShake, hitShield, addScore, startWave, rollUpgradeChoices, initShields, triggerScreenShake]);

  useEffect(() => {
    if (!started || gameOver) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
      }
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      if (e.key === ' ' && gameRef.current.weapon === 'beam') {
        gameRef.current.beamActive = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [started, gameOver]);

  // Touch controls for canvas
  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchActive = false;
    let lastTouchX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchActive = true;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      lastTouchX = (t.clientX - rect.left) * (W / rect.width);
      // Auto-fire on touch
      keysRef.current[' '] = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchActive) return;
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = (t.clientX - rect.left) * (W / rect.width);
      const dx = x - lastTouchX;
      gameRef.current.playerX = Math.max(0, Math.min(W - PLAYER_W, gameRef.current.playerX + dx));
      lastTouchX = x;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      touchActive = false;
      keysRef.current[' '] = false;
      if (gameRef.current.weapon === 'beam') {
        gameRef.current.beamActive = false;
      }
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

  const showTouch = isTouchDevice();

  const handleStart = () => {
    const g = gameRef.current;
    g.playerX = W / 2 - PLAYER_W / 2;
    g.aliens = [];
    g.boss = null;
    g.bullets = [];
    g.ufo = null;
    g.shields = [];
    g.powerUps = [];
    g.particles = [];
    g.weapon = 'standard';
    g.weaponUntil = 0;
    g.beamActive = false;
    g.shieldActive = false;
    g.shieldUntil = 0;
    g.lastUfoCheck = performance.now();
    g.damageMult = 1;
    g.fireRateMult = 1;
    g.multishot = false;
    g.beamDurationMult = 1;
    g.shipTrail = [];
    setScore(0);
    setLives(3);
    setWave(1);
    setKillMultiplier(1);
    setGameOver(false);
    setShowUpgrade(false);
    setStarted(true);
    startWave(1);
  };

  return (
    <div className="game-card bg-white border border-gray-200 text-gray-900 w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Galaxy Defenders</h2>
        <div className="flex items-center gap-2">
          <select
            value={shipSkin}
            onChange={(e) => setShipSkin(e.target.value as ShipSkin)}
            className="text-xs border border-gray-300 rounded px-2 py-1 touch-manipulation"
          >
            {SHIP_SKINS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation">
            Close
          </button>
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
        <canvas ref={canvasRef} width={W} height={H} className="block w-full" style={{ maxWidth: '100%' }} />
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4">
            <p className="text-white font-bold text-base sm:text-lg mb-2">SPACE INVADERS</p>
            <p className="text-slate-300 text-xs sm:text-sm mb-1">
              {showTouch ? 'Drag to move · Touch to fire' : '← → Move · Space Fire'}
            </p>
            <p className="text-slate-400 text-xs mb-3 text-center max-w-md px-2">
              Basic (10) · Medium (20) · Heavy 2HP (40) · Boss every 5 waves
            </p>
            <button onClick={handleStart} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">
              Start
            </button>
          </div>
        )}
        {showUpgrade && upgradeChoices.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4">
            <p className="text-white font-bold mb-3 sm:mb-4">Choose Upgrade</p>
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
              {upgradeChoices.map((u) => (
                <button
                  key={u.id}
                  onClick={() => applyUpgrade(u.id)}
                  className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-left max-w-[130px] sm:max-w-[140px] transition-colors touch-manipulation"
                >
                  <div className="font-semibold text-xs sm:text-sm">{u.label}</div>
                  <div className="text-xs text-slate-400">{u.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 p-4">
            <p className="text-xl sm:text-2xl font-bold text-red-400 mb-1">GAME OVER</p>
            <p className="text-slate-300 mb-3 sm:mb-4 text-sm sm:text-base">
              Score: {formatScore(score)} · Wave: {wave}
            </p>
            {score >= highScore && score > 0 && (
              <p className="text-amber-400 text-sm mb-2">New High Score!</p>
            )}
            <div className="flex gap-2">
              <button onClick={handleStart} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">
                Play Again
              </button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile touch controls - horizontal with fire button */}
      {showTouch && started && !gameOver && !showUpgrade && (
        <TouchControls
          layout="horizontal"
          onLeft={() => { gameRef.current.playerX = Math.max(0, gameRef.current.playerX - 20); haptic('light'); }}
          onRight={() => { gameRef.current.playerX = Math.min(W - PLAYER_W, gameRef.current.playerX + 20); haptic('light'); }}
          onAction={() => { keysRef.current[' '] = true; setTimeout(() => { keysRef.current[' '] = false; }, 100); haptic('light'); }}
          actionLabel="🔫"
          size="md"
        />
      )}

      <p className="mt-2 text-xs text-gray-500">
        {showTouch ? 'Drag on screen to aim · Touch to auto-fire · Collect power-ups'
          : 'Parallax stars · Screen shake · Ship skins · Post-wave upgrades · Kill multiplier'}
      </p>
    </div>
  );
}
