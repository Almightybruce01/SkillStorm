/* ═══════════════════════════════════════════════════════════════════════════════
   FRUIT NINJA — Elite Canvas Edition
   Full canvas rendering • Mouse swipe + Arrow keys/Space controls
   Arc physics • Slice animations • Juice particles • Blade trail
   Modes: Classic, Zen, Arcade, Frenzy • Themes: Dojo, Garden, Space, Beach
   Special fruits: Freeze, Frenzy, Score x2 • Critical slice = 2x points
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface FruitNinjaProps {
  onClose: () => void;
}

type FruitType = 'watermelon' | 'orange' | 'apple' | 'banana' | 'pineapple' | 'kiwi' | 'bomb';
type SpecialType = 'freeze' | 'frenzy' | 'double_score' | null;
type GameMode = 'classic' | 'zen' | 'arcade' | 'frenzy';
type ThemeType = 'dojo' | 'garden' | 'space' | 'beach';

const CANVAS_W = 520;
const CANVAS_H = 580;
const GRAVITY = 0.42;
const COMBO_TIMEOUT_MS = 1200;
const SLASH_COOLDOWN_MS = 80;
const MAX_BLADE_POINTS = 24;
const HIGH_SCORE_KEY = 'fruitninja_elite_high';

const FRUIT_POINTS: Record<Exclude<FruitType, 'bomb'>, number> = {
  watermelon: 25,
  orange: 15,
  apple: 10,
  banana: 20,
  pineapple: 30,
  kiwi: 12,
};

const FRUIT_JUICE: Record<Exclude<FruitType, 'bomb'>, string> = {
  watermelon: '#dc2626',
  orange: '#ea580c',
  apple: '#ef4444',
  banana: '#eab308',
  pineapple: '#ca8a04',
  kiwi: '#84cc16',
};

const FRUIT_RADII: Record<FruitType, number> = {
  watermelon: 28,
  orange: 22,
  apple: 20,
  banana: 18,
  pineapple: 26,
  kiwi: 14,
  bomb: 22,
};

interface Fruit {
  id: number;
  type: FruitType;
  special: SpecialType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rotation: number;
  rotSpeed: number;
  spawnTime?: number;
}

interface FruitHalf {
  id: number;
  type: Exclude<FruitType, 'bomb'>;
  x: number;
  y: number;
  vx: number;
  vy: number;
  left: boolean;
  r: number;
  rotation: number;
  rotSpeed: number;
  life: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface BladePoint {
  x: number;
  y: number;
  t: number;
  color?: string;
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
}

function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

function lineIntersectsCircle(
  x1: number, y1: number, x2: number, y2: number,
  cx: number, cy: number, r: number
): { hit: boolean; distFromCenter: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len === 0) {
    const d = Math.hypot(cx - x1, cy - y1);
    return { hit: d <= r, distFromCenter: d / r };
  }
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / (len * len)));
  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;
  const d = Math.hypot(cx - nearX, cy - nearY);
  return { hit: d <= r, distFromCenter: d / r };
}

const THEMES: Record<ThemeType, { bg: string; sky: string; accent: string }> = {
  dojo: { bg: '#2d1810', sky: '#1a0f0a', accent: '#c9a227' },
  garden: { bg: '#1a472a', sky: '#0d2818', accent: '#90EE90' },
  space: { bg: '#0a0a1a', sky: '#050510', accent: '#a78bfa' },
  beach: { bg: '#1e3a5f', sky: '#0d1f33', accent: '#fcd34d' },
};

export default function FruitNinja({ onClose }: FruitNinjaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<'menu' | 'playing' | 'countdown' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [theme, setTheme] = useState<ThemeType>('dojo');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [halves, setHalves] = useState<FruitHalf[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bladeTrail, setBladeTrail] = useState<BladePoint[]>([]);
  const [sliceTrailColor, setSliceTrailColor] = useState<string>('#fcd34d');
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([]);
  const [combo, setCombo] = useState(0);
  const [comboDisplay, setComboDisplay] = useState(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [swordX, setSwordX] = useState(CANVAS_W / 2);
  const [swordY, setSwordY] = useState(CANVAS_H / 2);
  const [slashAngle, setSlashAngle] = useState(0);
  const [activeEffects, setActiveEffects] = useState<{
    freeze: number;
    frenzy: number;
    doubleScore: number;
  }>({ freeze: 0, frenzy: 0, doubleScore: 0 });
  const [countdownVal, setCountdownVal] = useState(3);
  const [stats, setStats] = useState({ sliced: 0, combos: 0, bestCombo: 0, swings: 0 });

  const gameRef = useRef({
    nextId: 0,
    nextPopupId: 0,
    bladePoints: [] as BladePoint[],
    lastSpawn: 0,
    lastSlash: 0,
    comboTimeout: 0,
    spawnInterval: 1600,
    timeAcc: 0,
    spawnSpeedMult: 1,
    animFrame: 0,
  });

  const loadHighScore = useCallback(() => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const val = parsed[gameMode] ?? 0;
        setHighScore(val);
      }
    } catch {}
  }, [gameMode]);

  useEffect(() => {
    loadHighScore();
  }, [loadHighScore, gameMode]);

  const saveHighScore = useCallback((s: number) => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      parsed[gameMode] = Math.max(parsed[gameMode] ?? 0, s);
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(parsed));
    } catch {}
  }, [gameMode]);

  const addParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
      const speed = 40 + Math.random() * 60;
      arr.push({
        id: gameRef.current.nextId++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 1,
        color,
        size: 4 + Math.random() * 6,
      });
    }
    setParticles(p => [...p, ...arr]);
  }, []);

  const addScorePopup = useCallback((x: number, y: number, text: string) => {
    setScorePopups(p => [...p, {
      id: gameRef.current.nextPopupId++,
      x, y, text, life: 1,
    }]);
  }, []);

  const spawnFruit = useCallback(() => {
    const { spawnInterval, spawnSpeedMult } = gameRef.current;
    const { frenzy } = activeEffects;
    const hasBombs = gameMode !== 'zen';
    const bombChance = gameMode === 'zen' ? 0 : gameMode === 'classic' ? 0.12 : 0.08;
    const specialChance = 0.06;

    const isBomb = hasBombs && Math.random() < bombChance;
    const isSpecial = !isBomb && Math.random() < specialChance;
    const regularTypes: Exclude<FruitType, 'bomb'>[] = [
      'watermelon', 'orange', 'apple', 'banana', 'pineapple', 'kiwi',
    ];
    const specialTypes: SpecialType[] = ['freeze', 'frenzy', 'double_score'];

    let type: FruitType = isBomb ? 'bomb' : regularTypes[Math.floor(Math.random() * regularTypes.length)];
    let special: SpecialType = isSpecial ? specialTypes[Math.floor(Math.random() * specialTypes.length)] : null;

    const x = 50 + Math.random() * (CANVAS_W - 100);
    const y = CANVAS_H - 30;
    const angle = -Math.PI / 2 - 0.6 + Math.random() * 1.2;
    const baseSpeed = (10 + Math.random() * 8) * spawnSpeedMult * (frenzy > 0 ? 1.3 : 1);
    const r = FRUIT_RADII[type];

    setFruits(prev => [...prev, {
      id: gameRef.current.nextId++,
      type,
      special,
      x, y,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      r,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    }]);
  }, [gameMode, activeEffects]);

  const checkSlash = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    if (phase !== 'playing') return;
    const toSlice: { fruit: Fruit; critical: boolean }[] = [];
    const newHalves: FruitHalf[] = [];
    let hitBomb = false;
    let hitCount = 0;

    setFruits(prev => {
      prev.forEach(f => {
        const { hit, distFromCenter } = lineIntersectsCircle(x1, y1, x2, y2, f.x, f.y, f.r);
        if (hit) {
          const critical = distFromCenter < 0.35;
          toSlice.push({ fruit: f, critical });
          hitCount++;
          if (f.type === 'bomb') {
            hitBomb = true;
          } else {
            setSliceTrailColor(FRUIT_JUICE[f.type]);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const perp = angle + Math.PI / 2;
            const speed = 5 + Math.random() * 4;
            const leftHalf: FruitHalf = {
              id: gameRef.current.nextId++,
              type: f.type,
              x: f.x, y: f.y,
              vx: Math.cos(perp) * speed + f.vx * 0.3,
              vy: Math.sin(perp) * speed + f.vy * 0.3,
              left: true, r: f.r * 0.75,
              rotation: f.rotation, rotSpeed: f.rotSpeed + 0.3,
              life: 1,
            };
            const rightHalf: FruitHalf = {
              ...leftHalf,
              id: gameRef.current.nextId++,
              vx: -Math.cos(perp) * speed + f.vx * 0.3,
              vy: -Math.sin(perp) * speed + f.vy * 0.3,
              left: false,
            };
            newHalves.push(leftHalf, rightHalf);
            addParticles(f.x, f.y, FRUIT_JUICE[f.type], 20);
          }
        }
      });
      return prev.filter(f => !toSlice.some(t => t.fruit === f));
    });

    if (hitCount > 0 && !hitBomb) {
      const newCombo = combo + hitCount;
      setCombo(newCombo);
      setComboDisplay(newCombo);
      setStats(s => ({
        ...s,
        sliced: s.sliced + hitCount,
        combos: s.combos + (newCombo > 1 ? 1 : 0),
        bestCombo: Math.max(s.bestCombo, newCombo),
      }));

      let totalPoints = 0;
      toSlice.forEach(({ fruit: f, critical }) => {
        if (f.type !== 'bomb') {
          const base = FRUIT_POINTS[f.type];
          const mult = Math.min(newCombo, 6);
          let pts = base * mult;
          if (critical) pts *= 2;
          addScorePopup(f.x, f.y, critical ? `+${pts} CRITICAL!` : `+${pts}`);
          if (f.special === 'double_score') pts *= 2;
          totalPoints += pts;
        }
      });

      const doubleMult = activeEffects.doubleScore > 0 ? 2 : 1;
      setScore(s => s + totalPoints * doubleMult);

      if (newCombo >= 3) playSound('combo');
      else if (hitCount > 0) playSound('slash');
      playSound('hit');

      window.clearTimeout(gameRef.current.comboTimeout);
      gameRef.current.comboTimeout = window.setTimeout(() => {
        setCombo(0);
        setComboDisplay(0);
      }, COMBO_TIMEOUT_MS);
    }

    toSlice.forEach(({ fruit: f }) => {
      if (f.special === 'freeze') setActiveEffects(e => ({ ...e, freeze: e.freeze + 180 }));
      if (f.special === 'frenzy') setActiveEffects(e => ({ ...e, frenzy: e.frenzy + 300 }));
      if (f.special === 'double_score') setActiveEffects(e => ({ ...e, doubleScore: e.doubleScore + 360 }));
    });

    setHalves(h => [...h, ...newHalves]);
    if (hitBomb) {
      playSound('bomb');
      setPhase('gameover');
      setScore(s => { saveHighScore(s); return s; });
    }
  }, [phase, combo, activeEffects, addParticles, addScorePopup, saveHighScore]);

  const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? (e as React.TouchEvent).changedTouches[0]?.clientX ?? 0) : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? (e as React.TouchEvent).changedTouches[0]?.clientY ?? 0) : (e as React.MouseEvent).clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, []);

  const handlePointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return;
    if ('preventDefault' in e) e.preventDefault();
    const p = getCanvasPoint(e);
    gameRef.current.bladePoints = [{ x: p.x, y: p.y, t: Date.now() }];
    setIsSlicing(true);
    setStats(s => ({ ...s, swings: s.swings + 1 }));
  }, [phase, getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSlicing || gameRef.current.bladePoints.length === 0) return;
    if ('preventDefault' in e) e.preventDefault();
    const p = getCanvasPoint(e);
    const last = gameRef.current.bladePoints[gameRef.current.bladePoints.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < 5) return;

    gameRef.current.bladePoints.push({ x: p.x, y: p.y, t: Date.now() });
    if (gameRef.current.bladePoints.length > MAX_BLADE_POINTS) {
      gameRef.current.bladePoints.shift();
    }
    setBladeTrail([...gameRef.current.bladePoints]);

    const prev = gameRef.current.bladePoints[gameRef.current.bladePoints.length - 2];
    const now = Date.now();
    if (now - gameRef.current.lastSlash > SLASH_COOLDOWN_MS && prev) {
      gameRef.current.lastSlash = now;
      checkSlash(prev.x, prev.y, p.x, p.y);
    }
  }, [isSlicing, getCanvasPoint, checkSlash]);

  const handlePointerUp = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    const pts = gameRef.current.bladePoints;
    if (pts.length >= 2) {
      const a = pts[0];
      const b = pts[pts.length - 1];
      checkSlash(a.x, a.y, b.x, b.y);
    }
    gameRef.current.bladePoints = [];
    setBladeTrail([]);
    setIsSlicing(false);
  }, [checkSlash]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== 'playing') return;
    const step = 25;
    if (e.key === 'ArrowUp') { setSwordY(y => Math.max(60, y - step)); e.preventDefault(); playSound('tick'); }
    if (e.key === 'ArrowDown') { setSwordY(y => Math.min(CANVAS_H - 60, y + step)); e.preventDefault(); playSound('tick'); }
    if (e.key === 'ArrowLeft') { setSwordX(x => Math.max(40, x - step)); e.preventDefault(); playSound('tick'); }
    if (e.key === 'ArrowRight') { setSwordX(x => Math.min(CANVAS_W - 40, x + step)); e.preventDefault(); playSound('tick'); }
    if (e.key === ' ') {
      e.preventDefault();
      const a = slashAngle;
      const len = 80;
      const x1 = swordX - Math.cos(a) * len;
      const y1 = swordY - Math.sin(a) * len;
      const x2 = swordX + Math.cos(a) * len;
      const y2 = swordY + Math.sin(a) * len;
      checkSlash(x1, y1, x2, y2);
      setSlashAngle(s => s + Math.PI / 4);
      playSound('slash');
    }
  }, [phase, swordX, swordY, slashAngle, checkSlash]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const startGame = useCallback((mode: GameMode) => {
    playSound('click');
    setGameMode(mode);
    setPhase('countdown');
    setCountdownVal(3);
    setScore(0);
    setLives(mode === 'classic' ? 3 : 1);
    setTimeLeft(mode === 'zen' ? 90 : mode === 'arcade' ? 60 : 999);
    setFruits([]);
    setHalves([]);
    setParticles([]);
    setBladeTrail([]);
    setScorePopups([]);
    setCombo(0);
    setComboDisplay(0);
    setActiveEffects({ freeze: 0, frenzy: 0, doubleScore: 0 });
    setStats({ sliced: 0, combos: 0, bestCombo: 0, swings: 0 });
    gameRef.current = {
      ...gameRef.current,
      nextId: 0,
      nextPopupId: 0,
      bladePoints: [],
      lastSpawn: 0,
      lastSlash: 0,
      spawnInterval: 1600,
      timeAcc: 0,
      spawnSpeedMult: 1,
    };
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setInterval(() => {
      setCountdownVal(v => {
        if (v <= 1) {
          clearInterval(id);
          setPhase('playing');
          playSound('go');
          return 0;
        }
        playSound('countdown');
        return v - 1;
      });
    }, 800);
    return () => clearInterval(id);
  }, [phase]);

  const gameLoop = useCallback(() => {
    const now = performance.now();
    const dt = Math.min(0.032, (now - gameRef.current.timeAcc) / 1000);
    gameRef.current.timeAcc = now;

    if (phase === 'playing') {
      const freezeMult = activeEffects.freeze > 0 ? 0.15 : 1;
      const effDt = dt * freezeMult;

      setActiveEffects(e => ({
        freeze: Math.max(0, e.freeze - 1),
        frenzy: Math.max(0, e.frenzy - 1),
        doubleScore: Math.max(0, e.doubleScore - 1),
      }));

      if (gameMode === 'arcade' || gameMode === 'zen') {
        setTimeLeft(t => {
          const next = t - effDt;
          if (next <= 0) {
            setPhase('gameover');
            setScore(s => { saveHighScore(s); return s; });
            playSound('gameover');
          }
          return next;
        });
      }

      gameRef.current.lastSpawn += effDt * 1000;
      const interval = gameRef.current.spawnInterval;
      const frenzyBonus = activeEffects.frenzy > 0 ? 0.5 : 1;
      const spawnRate = interval * frenzyBonus;
      while (gameRef.current.lastSpawn >= spawnRate) {
        gameRef.current.lastSpawn -= spawnRate;
        spawnFruit();
      }

      const g = GRAVITY * effDt * 60;
      setFruits(prev =>
        prev
          .map(f => ({
            ...f,
            x: f.x + f.vx * effDt * 60,
            y: f.y + f.vy * effDt * 60,
            vy: f.vy + g,
            rotation: f.rotation + f.rotSpeed * effDt * 60,
          }))
          .filter(f => f.y < CANVAS_H + 120 && f.x > -80 && f.x < CANVAS_W + 80)
      );

      setHalves(prev =>
        prev
          .map(h => ({
            ...h,
            x: h.x + h.vx * effDt * 60,
            y: h.y + h.vy * effDt * 60,
            vy: h.vy + g,
            rotation: h.rotation + h.rotSpeed * effDt * 60,
            life: h.life - 0.015,
          }))
          .filter(h => h.life > 0)
      );

      if (gameMode === 'classic') {
        setFruits(prev => {
          const missed = prev.filter(f => f.type !== 'bomb' && f.y > CANVAS_H - 50 && f.vy > 0);
          if (missed.length > 0) {
            setLives(l => {
              const next = Math.max(0, l - missed.length);
              if (next <= 0) {
                setPhase('gameover');
                playSound('gameover');
              }
              return next;
            });
          }
          return prev.filter(f => !(f.type !== 'bomb' && f.y > CANVAS_H - 50 && f.vy > 0));
        });
      }

      gameRef.current.spawnInterval = Math.max(500, 1600 - Math.floor(score / 150) * 70);
      gameRef.current.spawnSpeedMult = 1 + Math.floor(score / 250) * 0.15;
      if (gameMode === 'zen') {
        gameRef.current.spawnInterval = Math.max(700, gameRef.current.spawnInterval - Math.floor(score / 400) * 50);
        gameRef.current.spawnSpeedMult = Math.min(1.8, 1 + Math.floor(score / 350) * 0.1);
      }
    }

    setParticles(prev =>
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx * 0.016,
          y: p.y + p.vy * 0.016,
          life: p.life - 0.02,
          vx: p.vx * 0.96,
          vy: p.vy * 0.96 + 0.5,
        }))
        .filter(p => p.life > 0)
    );

    setScorePopups(prev =>
      prev.map(p => ({ ...p, life: p.life - 0.03 })).filter(p => p.life > 0)
    );

    gameRef.current.animFrame = requestAnimationFrame(gameLoop);
  }, [phase, gameMode, activeEffects, spawnFruit, saveHighScore]);

  useEffect(() => {
    gameRef.current.animFrame = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(gameRef.current.animFrame);
  }, [gameLoop]);

  const drawFruit = useCallback((ctx: CanvasRenderingContext2D, f: Fruit | FruitHalf, isHalf?: boolean) => {
    const type = f.type;
    const r = f.r;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);

    if (type === 'watermelon') {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      if (isHalf && 'left' in f && f.left) {
        ctx.arc(0, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.lineTo(-r * 0.2, 0);
      } else if (isHalf && 'left' in f && !f.left) {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(r * 0.2, 0);
      } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      if (isHalf && 'left' in f) {
        const start = f.left ? Math.PI / 2 : -Math.PI / 2;
        const end = f.left ? (Math.PI * 3) / 2 : Math.PI / 2;
        ctx.arc(0, 0, r * 0.7, start, end);
      } else {
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
      }
      ctx.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(Math.cos(a) * r * 0.4 - 1, Math.sin(a) * r * 0.4 - 1, 2, 2);
      }
    } else if (type === 'orange') {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      if (isHalf && 'left' in f && f.left) {
        ctx.arc(0, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.lineTo(-r * 0.3, 0);
      } else if (isHalf && 'left' in f && !f.left) {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(r * 0.3, 0);
      } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (type === 'apple') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      if (isHalf && 'left' in f && f.left) {
        ctx.arc(0, 0, r, Math.PI / 2, (Math.PI * 3) / 2);
        ctx.lineTo(-r * 0.25, 0);
      } else if (isHalf && 'left' in f && !f.left) {
        ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(r * 0.25, 0);
      } else {
        ctx.arc(0, 0, r, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      if (!isHalf) {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-2, -r - 2, 4, 6);
        ctx.beginPath();
        ctx.ellipse(0, -r - 2, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (type === 'banana') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.2, r * 0.5, 0, Math.PI * 0.3, Math.PI * 0.7);
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (type === 'pineapple') {
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.6, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        for (let j = -3; j <= 3; j++) {
          ctx.fillStyle = '#a16207';
          ctx.fillRect(i * r * 0.25 - 2, j * r * 0.2 - 2, 4, 4);
        }
      }
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-r * 0.4, -r * 1.2, r * 0.8, r * 0.4);
    } else if (type === 'kiwi') {
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillStyle = '#422006';
        ctx.fillRect(Math.cos(a) * r * 0.35 - 0.5, Math.sin(a) * r * 0.35 - 0.5, 1, 1);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const th = THEMES[theme];
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    gradient.addColorStop(0, th.sky);
    gradient.addColorStop(1, th.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    if (theme === 'dojo') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, CANVAS_H - 60, CANVAS_W, 60);
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, CANVAS_W - 20, CANVAS_H - 20);
    } else if (theme === 'garden') {
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(34,139,34,${0.1 + Math.sin(i) * 0.05})`;
        ctx.fillRect(i * 30, CANVAS_H - 40 - (i % 3) * 10, 40, 50);
      }
    } else if (theme === 'space') {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 50; i++) {
        ctx.globalAlpha = 0.3 + Math.random() * 0.5;
        ctx.fillRect((i * 137) % CANVAS_W, (i * 89) % CANVAS_H, 2, 2);
      }
      ctx.globalAlpha = 1;
    } else if (theme === 'beach') {
      ctx.fillStyle = 'rgba(255,228,196,0.3)';
      ctx.fillRect(0, CANVAS_H - 80, CANVAS_W, 80);
    }

      fruits.forEach(f => {
      if (f.type === 'bomb') {
        const spawnAge = f.spawnTime ? (Date.now() - f.spawnTime) / 1000 : 1;
        const warnPulse = spawnAge < 0.5 ? 0.4 + 0.4 * Math.sin(Date.now() * 0.02) : 0.3;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        if (spawnAge < 0.5) {
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12 + 8 * Math.sin(Date.now() * 0.015);
        }
        ctx.fillStyle = '#1f2937';
        ctx.beginPath();
        ctx.arc(0, 0, f.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(239,68,68,${warnPulse})`;
        ctx.lineWidth = spawnAge < 0.5 ? 4 : 3;
        ctx.stroke();
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.moveTo(0, -f.r - 8);
        ctx.lineTo(-4, -f.r);
        ctx.lineTo(4, -f.r);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -f.r - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        drawFruit(ctx, f, false);
        if (f.special) {
          ctx.save();
          ctx.translate(f.x, f.y - f.r - 6);
          ctx.fillStyle = f.special === 'freeze' ? '#60a5fa' : f.special === 'frenzy' ? '#f472b6' : '#fbbf24';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.special === 'freeze' ? 'FREEZE' : f.special === 'frenzy' ? 'FRENZY' : 'x2', 0, 0);
          ctx.restore();
        }
      }
    });

    halves.forEach(h => {
      ctx.globalAlpha = h.life;
      drawFruit(ctx, h, true);
      ctx.globalAlpha = 1;
    });

    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (2 - p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    gameRef.current.bladePoints.forEach((pt, i) => {
      if (i === 0) return;
      const prev = gameRef.current.bladePoints[i - 1];
      const age = Date.now() - pt.t;
      const alpha = Math.max(0, 1 - age / 200);
      const baseColor = sliceTrailColor || '#fcd34d';
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.9})`;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    scorePopups.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(p.text, p.x, p.y - 40);
      ctx.fillText(p.text, p.x, p.y - 40);
      ctx.restore();
    });

    if (phase === 'playing') {
      ctx.fillStyle = th.accent;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 12, 32);
      ctx.fillText(`High: ${highScore}`, 12, 54);
      if (gameMode === 'classic') {
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = i < lives ? '#ef4444' : 'rgba(100,50,50,0.5)';
          ctx.beginPath();
          ctx.arc(140 + i * 22, 32, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (gameMode === 'zen' || gameMode === 'arcade') {
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.ceil(timeLeft)}s`, CANVAS_W - 12, 32);
      }
      if (comboDisplay > 1) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`COMBO x${comboDisplay}!`, CANVAS_W / 2, 50);
      }
      if (activeEffects.freeze > 0) {
        ctx.fillStyle = 'rgba(96,165,250,0.5)';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('FREEZE', CANVAS_W - 70, 54);
      }
      if (activeEffects.doubleScore > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('x2 SCORE', CANVAS_W - 70, 70);
      }

      const sx = swordX;
      const sy = swordY;
      const ang = slashAngle;
      const len = 60;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);
      ctx.strokeStyle = '#c0c0c0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-len, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      ctx.fillStyle = '#8b7355';
      ctx.fillRect(-4, -25, 8, 50);
      ctx.restore();
    }

    if (phase === 'countdown') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = THEMES[theme].accent;
      ctx.font = 'bold 80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(countdownVal), CANVAS_W / 2, CANVAS_H / 2);
    }
  }, [phase, theme, fruits, halves, particles, scorePopups, score, highScore, lives, timeLeft, gameMode, comboDisplay, activeEffects, countdownVal, swordX, swordY, slashAngle, drawFruit]);

  useEffect(() => {
    draw();
  }, [draw]);

  const accuracy = stats.swings > 0 ? Math.round((stats.sliced / stats.swings) * 100) : 0;

  return (
    <div className="game-card bg-gradient-to-br from-amber-900/20 to-amber-950/30 border border-amber-700/40 text-amber-50 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-amber-100">Fruit Slicer Elite</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-amber-200 touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
          Close
        </button>
      </div>

      {phase === 'menu' && (
        <div className="space-y-4">
          <p className="text-amber-200/90 text-sm">Swipe to slice • Arrow keys + Space to slash • Avoid bombs!</p>
          <div>
            <p className="text-amber-300 text-xs mb-1">Mode</p>
            <div className="grid grid-cols-2 gap-2">
              {(['classic', 'zen', 'arcade', 'frenzy'] as GameMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => startGame(m)}
                  className="btn-elite btn-elite-primary text-sm capitalize touch-manipulation active:scale-95"
                  onMouseDown={() => playSound('click')}
                >
                  {m === 'classic' ? 'Classic (3 lives)' : m === 'zen' ? 'Zen (90s)' : m === 'arcade' ? 'Arcade (60s)' : 'Frenzy (endless)'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-amber-300 text-xs mb-1">Theme</p>
            <div className="flex gap-2 flex-wrap">
              {(['dojo', 'garden', 'space', 'beach'] as ThemeType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`btn-elite btn-elite-ghost text-sm capitalize touch-manipulation active:scale-95 ${theme === t ? 'ring-2 ring-amber-400' : ''}`}
                  onMouseDown={() => playSound('click')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <p className="text-amber-400/80 text-xs">
            Special fruits: Freeze (slow-mo), Frenzy (barrage), x2 (double score). Critical slice = 2x pts.
          </p>
        </div>
      )}

      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-amber-700/50 bg-black/30 w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full cursor-crosshair touch-none"
          style={{ maxHeight: 560, maxWidth: '100%' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => { e.preventDefault(); handlePointerDown(e); }}
          onTouchMove={(e) => { e.preventDefault(); handlePointerMove(e); }}
          onTouchEnd={(e) => { e.preventDefault(); handlePointerUp(e); }}
          onTouchCancel={(e) => { e.preventDefault(); handlePointerUp(e); }}
        />
      </div>

      <p className="text-amber-300/80 text-xs mt-2">Swipe to slice • ↑↓←→ move sword • Space slash</p>

      {phase === 'gameover' && (
        <div className="mt-4 p-4 rounded-lg bg-amber-900/40 border border-amber-600/50 space-y-2">
          <p className="text-xl font-bold text-amber-100">Game Over</p>
          <p>Final Score: {score}</p>
          <p>Fruits Sliced: {stats.sliced}</p>
          <p>Combos: {stats.combos} • Best: {stats.bestCombo}x</p>
          <p>Accuracy: {accuracy}%</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => startGame(gameMode)} className="btn-elite btn-elite-primary touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
              Play Again
            </button>
            <button onClick={() => setPhase('menu')} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
              Menu
            </button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
