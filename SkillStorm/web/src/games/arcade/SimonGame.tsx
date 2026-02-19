/* ═══════════════════════════════════════════════════════════════════════════════
   SIMON SAYS — Elite Canvas Edition
   Full canvas rendering, 5 game modes, 4 themes, particle effects,
   Web Audio API tones, keyboard controls, high score tracking
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface SimonGameProps {
  onClose: () => void;
}

type GameMode = 'classic' | 'reverse' | 'speed' | 'freeplay' | 'simonplus';
type ThemeName = 'classic' | 'neon' | 'pastel' | 'dark';
type Color = 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple';

const COLORS_4: Color[] = ['green', 'red', 'yellow', 'blue'];
const COLORS_6: Color[] = ['green', 'red', 'yellow', 'blue', 'orange', 'purple'];

// Arrow keys: Up=Green, Right=Red, Down=Yellow, Left=Blue. Simon Plus: Q=Orange, E=Purple
const KEY_TO_COLOR_4: Record<string, Color> = {
  ArrowUp: 'green',
  ArrowRight: 'red',
  ArrowDown: 'yellow',
  ArrowLeft: 'blue',
};
const KEY_TO_COLOR_6: Record<string, Color> = {
  ...KEY_TO_COLOR_4,
  KeyQ: 'orange',
  KeyE: 'purple',
};

const FREQUENCIES: Record<Color, number> = {
  red: 329.63,
  green: 261.63,
  blue: 392,
  yellow: 220,
  orange: 277.18,
  purple: 440,
};

const BASE_FLASH_MS = 450;
const SPEED_FLASH_BASE = 380;
const GAP_MS = 100;
const MIN_FLASH_MS = 120;

const HIGH_SCORE_KEY = 'simon-elite-high-scores';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect === 'function') {
    (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, w, h, r);
  } else {
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
}

type ThemeStyle = {
  red: { bg: string; active: string; glow: string };
  green: { bg: string; active: string; glow: string };
  blue: { bg: string; active: string; glow: string };
  yellow: { bg: string; active: string; glow: string };
  orange?: { bg: string; active: string; glow: string };
  purple?: { bg: string; active: string; glow: string };
  center: string;
  ring: string;
  bg: string;
  text: string;
};

const THEMES: Record<ThemeName, ThemeStyle> = {
  classic: {
    red: { bg: '#c53030', active: '#fc8181', glow: 'rgba(252,129,129,0.9)' },
    green: { bg: '#2f855a', active: '#68d391', glow: 'rgba(104,211,145,0.9)' },
    blue: { bg: '#2b6cb0', active: '#63b3ed', glow: 'rgba(99,179,237,0.9)' },
    yellow: { bg: '#b7791f', active: '#f6e05e', glow: 'rgba(246,224,94,0.9)' },
    center: '#2d3748',
    ring: 'rgba(0,0,0,0.3)',
    bg: '#f7fafc',
    text: '#2d3748',
  },
  neon: {
    red: { bg: '#cc0044', active: '#ff3366', glow: 'rgba(255,51,102,0.95)' },
    green: { bg: '#00cc44', active: '#39ff14', glow: 'rgba(57,255,20,0.95)' },
    blue: { bg: '#0088ff', active: '#00d4ff', glow: 'rgba(0,212,255,0.95)' },
    yellow: { bg: '#ccaa00', active: '#ffea00', glow: 'rgba(255,234,0,0.95)' },
    center: '#0f0f23',
    ring: 'rgba(255,255,255,0.12)',
    bg: '#0a0a18',
    text: '#e0e0ff',
  },
  pastel: {
    red: { bg: '#e8a0a0', active: '#fcd2d2', glow: 'rgba(252,210,210,0.8)' },
    green: { bg: '#a0d8a0', active: '#d4f0d4', glow: 'rgba(212,240,212,0.8)' },
    blue: { bg: '#a0c8e8', active: '#d4e6fc', glow: 'rgba(212,230,252,0.8)' },
    yellow: { bg: '#e8d8a0', active: '#fcf8d4', glow: 'rgba(252,248,212,0.8)' },
    center: '#f5f0e8',
    ring: 'rgba(0,0,0,0.06)',
    bg: '#faf8f5',
    text: '#4a4a4a',
  },
  dark: {
    red: { bg: '#5c2a2a', active: '#c44545', glow: 'rgba(196,69,69,0.8)' },
    green: { bg: '#2a5c2a', active: '#45c445', glow: 'rgba(69,196,69,0.8)' },
    blue: { bg: '#2a3a5c', active: '#4565c4', glow: 'rgba(69,101,196,0.8)' },
    yellow: { bg: '#5c4a2a', active: '#c4a545', glow: 'rgba(196,165,69,0.8)' },
    orange: { bg: '#5c3a2a', active: '#c48545', glow: 'rgba(196,133,69,0.8)' },
    purple: { bg: '#4a2a5c', active: '#a545c4', glow: 'rgba(165,69,196,0.8)' },
    center: '#1a1a2e',
    ring: 'rgba(255,255,255,0.08)',
    bg: '#0d0d14',
    text: '#e8e8f0',
  },
};

// Extend pastel/neon/classic with orange & purple for Simon Plus
function getThemeWithPlus(theme: ThemeName): ThemeStyle {
  const base = { ...THEMES[theme] };
  if (!base.orange) {
    base.orange = { bg: '#b86a2a', active: '#ed9a5a', glow: 'rgba(237,154,90,0.9)' };
  }
  if (!base.purple) {
    base.purple = { bg: '#6a3ab8', active: '#a55aed', glow: 'rgba(165,90,237,0.9)' };
  }
  return base as ThemeStyle;
}

function getHighScores(): Record<GameMode, number> {
  try {
    const s = localStorage.getItem(HIGH_SCORE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { classic: 0, reverse: 0, speed: 0, freeplay: 0, simonplus: 0 };
}

function saveHighScore(mode: GameMode, score: number) {
  const scores = getHighScores();
  if (score > scores[mode]) {
    scores[mode] = score;
    try {
      localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
    } catch {}
  }
}

// ─── Particle ─────────────────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

function createParticles(x: number, y: number, color: string, count: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    out.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.4,
      size: 3 + Math.random() * 4,
    });
  }
  return out;
}

// ─── Web Audio API for color tones ────────────────────────────────────────────
function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((color: Color, durationMs: number) => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = FREQUENCIES[color];
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  }, []);

  return playTone;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SimonGame({ onClose }: SimonGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playTone = useAudio();

  const [phase, setPhase] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [mode, setMode] = useState<GameMode | null>(null);
  const [theme, setTheme] = useState<ThemeName>('classic');
  const [pattern, setPattern] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [failFlash, setFailFlash] = useState(false);
  const [highScores, setHighScores] = useState<Record<GameMode, number>>(getHighScores);
  const [streak, setStreak] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  particlesRef.current = particles;
  const [screenShake, setScreenShake] = useState(0);
  const [padPressAnim, setPadPressAnim] = useState<{ color: Color; t: number } | null>(null);
  const [centerWheelAngle, setCenterWheelAngle] = useState(0);
  const [replayRequested, setReplayRequested] = useState(false);
  const [menuHover, setMenuHover] = useState<string | null>(null);
  const [errorReplayPhase, setErrorReplayPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const errorReplayTimeoutRef = useRef<number[]>([]);

  const gameRef = useRef({
    showingPattern: false,
    timeoutIds: [] as number[],
    lastTime: 0,
    animFrameId: 0,
  });

  const is6Color = mode === 'simonplus';
  const colors = is6Color ? COLORS_6 : COLORS_4;
  const keyMap = is6Color ? KEY_TO_COLOR_6 : KEY_TO_COLOR_4;

  const flashMs = mode === 'speed'
    ? Math.max(MIN_FLASH_MS, SPEED_FLASH_BASE - round * 18)
    : BASE_FLASH_MS;

  const themeStyle = getThemeWithPlus(theme);
  const currentScore = round;
  const speedPercent = mode === 'speed'
    ? Math.min(150, Math.round(100 + (flashMs / BASE_FLASH_MS) * 50))
    : 100;

  const addToPattern = useCallback(() => {
    const next = colors[Math.floor(Math.random() * colors.length)] as Color;
    setPattern(p => [...p, next]);
  }, [colors]);

  const clearTimeouts = useCallback(() => {
    gameRef.current.timeoutIds.forEach(clearTimeout);
    gameRef.current.timeoutIds = [];
  }, []);

  const showPattern = useCallback(() => {
    if (!mode) return;
    const g = gameRef.current;
    g.showingPattern = true;
    const p = [...pattern];
    const playSeq = mode === 'reverse' ? [...p].reverse() : p;
    let delay = 0;
    playSeq.forEach((c) => {
      const t1 = window.setTimeout(() => {
        setActiveColor(c);
        playTone(c, flashMs);
      }, delay);
      g.timeoutIds.push(t1);
      delay += flashMs + GAP_MS;
      const t2 = window.setTimeout(() => setActiveColor(null), delay);
      g.timeoutIds.push(t2);
      delay += 60;
    });
    const done = window.setTimeout(() => {
      g.showingPattern = false;
      setPlayerIndex(0);
    }, delay + 80);
    g.timeoutIds.push(done);
  }, [pattern, mode, flashMs, playTone]);

  const handleColorPress = useCallback((color: Color) => {
    if (!mode) return;
    const g = gameRef.current;
    if (g.showingPattern || gameOver) return;
    if (mode === 'freeplay') {
      setPadPressAnim({ color, t: 1 });
      setTimeout(() => setPadPressAnim(null), 150);
      playTone(color, 180);
      playSound('pop');
      return;
    }

    setPadPressAnim({ color, t: 1 });
    setTimeout(() => setPadPressAnim(null), 200);
    setActiveColor(color);
    playTone(color, 150);
    setTimeout(() => setActiveColor(null), 160);

    const expected = pattern[playerIndex];
    if (color !== expected) {
      setScreenShake(1);
      setFailFlash(true);
      playSound('wrong');
      setTimeout(() => setFailFlash(false), 400);
      setTimeout(() => setScreenShake(0), 400);
      clearTimeouts();
      setGameOver(true);
      saveHighScore(mode, currentScore);
      setHighScores(getHighScores());
      setStreak(0);
      return;
    }

    playSound('correct');
    const cx = 400;
    const cy = 320;
    particlesRef.current.push(...createParticles(cx, cy, themeStyle[color]?.active ?? '#fff', 14));

    const nextIndex = playerIndex + 1;
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak >= 5) playSound('streak');

    if (nextIndex >= pattern.length) {
      const newRound = round + 1;
      setRound(newRound);
      playSound('levelup');
      addToPattern();
      setPlayerIndex(0);
      g.showingPattern = true;
      const rec = highScores[mode];
      if (newRound > rec) {
        saveHighScore(mode, newRound);
        setHighScores(getHighScores());
      }
      setTimeout(showPattern, 700);
    } else {
      setPlayerIndex(nextIndex);
    }
  }, [pattern, playerIndex, gameOver, addToPattern, showPattern, playTone, mode, round, currentScore, highScores, streak, themeStyle, clearTimeouts]);

  const handleReplay = useCallback(() => {
    if (!mode || gameRef.current.showingPattern || gameOver) return;
    setReplayRequested(true);
    gameRef.current.showingPattern = true;
    showPattern();
    setTimeout(() => {
      gameRef.current.showingPattern = false;
      setReplayRequested(false);
      setPlayerIndex(0);
    }, pattern.length * (flashMs + GAP_MS) + 200);
  }, [mode, gameOver, showPattern, pattern.length, flashMs]);

  useEffect(() => {
    if (!started || gameOver || pattern.length === 0 || !mode || mode === 'freeplay') return;
    if (playerIndex === 0 && !gameRef.current.showingPattern && pattern.length > 0) {
      gameRef.current.showingPattern = true;
      setTimeout(showPattern, 500);
    }
  }, [started, gameOver, pattern, playerIndex, showPattern, mode]);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

  const playErrorReplay = useCallback(() => {
    if (!mode || !gameOver || pattern.length === 0) return;
    errorReplayTimeoutRef.current.forEach(clearTimeout);
    errorReplayTimeoutRef.current = [];
    setErrorReplayPhase('playing');
    let delay = 0;
    pattern.forEach((c) => {
      const t1 = window.setTimeout(() => {
        setActiveColor(c);
        playTone(c, flashMs);
      }, delay);
      errorReplayTimeoutRef.current.push(t1);
      delay += flashMs + GAP_MS;
      const t2 = window.setTimeout(() => setActiveColor(null), delay);
      errorReplayTimeoutRef.current.push(t2);
      delay += 80;
    });
    const t3 = window.setTimeout(() => {
      setErrorReplayPhase('done');
    }, delay + 100);
    errorReplayTimeoutRef.current.push(t3);
  }, [mode, gameOver, pattern, flashMs, playTone]);

  useEffect(() => {
    if (gameOver && pattern.length > 0 && errorReplayPhase === 'idle') {
      const t = window.setTimeout(playErrorReplay, 1200);
      return () => clearTimeout(t);
    }
  }, [gameOver, pattern.length, errorReplayPhase, playErrorReplay]);

  const handleStart = useCallback((selectedMode: GameMode) => {
    clearTimeouts();
    errorReplayTimeoutRef.current.forEach(clearTimeout);
    errorReplayTimeoutRef.current = [];
    gameRef.current.showingPattern = false;
    setMode(selectedMode);
    setPattern([]);
    setPlayerIndex(0);
    setRound(selectedMode === 'freeplay' ? 0 : 1);
    setGameOver(false);
    setStarted(true);
    setPhase('playing');
    setFailFlash(false);
    setStreak(0);
    setErrorReplayPhase('idle');
    particlesRef.current = [];
    if (selectedMode !== 'freeplay') addToPattern();
  }, [clearTimeouts, addToPattern]);

  const handleReset = useCallback(() => {
    setStarted(false);
    setPhase('menu');
    setMode(null);
    setPattern([]);
    setPlayerIndex(0);
    setRound(0);
    setGameOver(false);
    setFailFlash(false);
    setActiveColor(null);
    setPadPressAnim(null);
    setScreenShake(0);
    setReplayRequested(false);
    setErrorReplayPhase('idle');
    errorReplayTimeoutRef.current.forEach(clearTimeout);
    errorReplayTimeoutRef.current = [];
    clearTimeouts();
  }, [clearTimeouts]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'menu' && mode) {
          handleStart(mode);
        }
        return;
      }
      if (e.code === 'KeyR') {
        if (gameOver && mode) {
          e.preventDefault();
          handleStart(mode);
        } else if (started && !gameRef.current.showingPattern && !gameOver) {
          e.preventDefault();
          handleReplay();
        }
        return;
      }
      if (e.code === 'Escape') {
        if (gameOver) handleReset();
        return;
      }
      const color = keyMap[e.code];
      if (color && started) {
        e.preventDefault();
        handleColorPress(color);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, mode, started, gameOver, handleColorPress, handleReplay, handleStart, handleReset, keyMap]);

  // Canvas dimensions and layout
  const CANVAS_W = 800;
  const CANVAS_H = 640;
  const CX = CANVAS_W / 2;
  const CY = CANVAS_H / 2 - 20;
  const PAD_R_INNER = 80;
  const PAD_R_OUTER = 180;
  const CENTER_R = 70;

  const getPadPath = useCallback((index: number, total: number) => {
    const startAngle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
    const endAngle = startAngle + (2 * Math.PI) / total - 0.02;
    const path = new Path2D();
    path.moveTo(CX + PAD_R_INNER * Math.cos(startAngle), CY + PAD_R_INNER * Math.sin(startAngle));
    path.arc(CX, CY, PAD_R_OUTER, startAngle, endAngle);
    path.arc(CX, CY, PAD_R_INNER, endAngle, startAngle, true);
    path.closePath();
    return path;
  }, []);

  const hitTest = useCallback((px: number, py: number): Color | null => {
    const dx = px - CX;
    const dy = py - CY;
    const r = Math.sqrt(dx * dx + dy * dy);
    if (r < PAD_R_INNER || r > PAD_R_OUTER) return null;
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const idx = Math.floor((angle / (Math.PI * 2)) * colors.length) % colors.length;
    return colors[idx] as Color;
  }, [colors]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const draw = (now: number) => {
      const dt = (now - gameRef.current.lastTime) / 1000;
      gameRef.current.lastTime = now;

      // Background with level-based shift
      const levelHue = (round * 3) % 360;
      const bgColor = themeStyle.bg;
      ctx.fillStyle = failFlash ? '#4a1515' : bgColor;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (!failFlash && round > 0 && theme !== 'dark') {
        const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 400);
        grad.addColorStop(0, `hsla(${levelHue}, 20%, 98%, 0.08)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      const shakeX = screenShake * (Math.random() - 0.5) * 12;
      const shakeY = screenShake * (Math.random() - 0.5) * 12;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Update particles
      const parts = particlesRef.current;
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) parts.splice(i, 1);
      }

      parts.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Center ring
      ctx.strokeStyle = themeStyle.ring;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(CX, CY, PAD_R_OUTER + 8, 0, Math.PI * 2);
      ctx.stroke();

      // Pads
      const total = colors.length;
      colors.forEach((color, i) => {
        const path = getPadPath(i, total);
        const style = themeStyle[color];
        if (!style) return;

        const isActive = activeColor === color;
        const pressAnim = padPressAnim?.color === color ? padPressAnim.t : 1;
        const scale = isActive ? 0.9 : pressAnim < 1 ? 0.88 + pressAnim * 0.06 : 1;
        const brighten = isActive ? 1.4 : pressAnim < 1 ? 1.2 + (1 - pressAnim) * 0.15 : 1;

        ctx.save();
        ctx.translate(CX, CY);
        ctx.scale(scale, scale);
        ctx.translate(-CX, -CY);

        ctx.fillStyle = style.bg;
        ctx.fill(path);

        if (isActive) {
          ctx.shadowColor = style.glow;
          ctx.shadowBlur = 30;
          ctx.fillStyle = style.active;
          ctx.fill(path);
          ctx.shadowBlur = 0;
        } else if (pressAnim < 1) {
          ctx.globalAlpha = 0.3 + 0.7 * pressAnim;
          ctx.fillStyle = style.active;
          ctx.fill(path);
          ctx.globalAlpha = 1;
        }

        ctx.restore();
      });

      // Center circle
      ctx.fillStyle = themeStyle.center;
      ctx.beginPath();
      ctx.arc(CX, CY, CENTER_R, 0, Math.PI * 2);
      ctx.fill();

      // Animated color wheel (sequence length)
      const wheelSegments = Math.max(4, pattern.length);
      for (let i = 0; i < wheelSegments; i++) {
        const segColor = pattern[i] ? themeStyle[pattern[i]]?.active ?? '#fff' : themeStyle.ring;
        const a1 = (i / wheelSegments) * Math.PI * 2 + centerWheelAngle;
        const a2 = ((i + 1) / wheelSegments) * Math.PI * 2 + centerWheelAngle;
        ctx.fillStyle = segColor;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, CENTER_R - 8, a1, a2);
        ctx.closePath();
        ctx.fill();
      }
      setCenterWheelAngle(a => a + dt * 0.5);

      // Center text
      ctx.fillStyle = themeStyle.text;
      ctx.font = 'bold 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(round), CX, CY - 8);
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('LEVEL', CX, CY + 20);

      ctx.restore();

      // UI overlay
      ctx.fillStyle = themeStyle.text;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Score: ${currentScore}`, 24, 24);
      ctx.fillText(`Streak: ${streak}`, 24, 52);
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`Speed: ${speedPercent}%`, 24, 80);
      if (highScores[mode!] > 0) {
        ctx.fillText(`Best: ${highScores[mode!]}`, 24, 104);
      }

      if (phase === 'menu') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 42px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SIMON SAYS', CX, 80);
        ctx.font = '18px system-ui, sans-serif';
        ctx.fillText('Space to Start • Arrows to Play • R to Replay', CX, 120);

        const modes: { id: GameMode; label: string }[] = [
          { id: 'classic', label: 'Classic' },
          { id: 'reverse', label: 'Reverse' },
          { id: 'speed', label: 'Speed' },
          { id: 'freeplay', label: 'Free Play' },
          { id: 'simonplus', label: 'Color Recall+' },
        ];
        const mY = 180;
        modes.forEach((m, i) => {
          const x = 120 + (i % 3) * 220;
          const y = mY + Math.floor(i / 3) * 70;
          const hover = menuHover === m.id;
          ctx.fillStyle = mode === m.id ? '#4ade80' : hover ? '#94a3b8' : '#475569';
          ctx.strokeStyle = mode === m.id ? '#22c55e' : '#64748b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          roundRect(ctx, x - 90, y - 22, 180, 44, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(m.label, x, y);
          if (highScores[m.id] > 0) {
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(`Best: ${highScores[m.id]}`, x, y + 16);
          }
        });

        const themes: ThemeName[] = ['classic', 'neon', 'pastel', 'dark'];
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Theme:', CX, 340);
        themes.forEach((t, i) => {
          const x = CX - 120 + i * 70;
          const y = 370;
          const hover = menuHover === `theme_${t}`;
          ctx.fillStyle = theme === t ? '#4ade80' : hover ? '#94a3b8' : '#475569';
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText(t.charAt(0).toUpperCase(), x, y + 1);
        });

        ctx.fillStyle = mode ? '#4ade80' : '#64748b';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(mode ? 'Press SPACE to Start' : 'Select a mode', CX, 440);

        // Close button
        const closeX = CANVAS_W - 80;
        const closeY = 30;
        const closeHover = menuHover === 'close';
        ctx.fillStyle = closeHover ? '#ef4444' : '#64748b';
        ctx.beginPath();
        roundRect(ctx, closeX - 50, closeY - 18, 100, 36, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText('Close', closeX, closeY + 1);
      }

      if (phase === 'playing' && gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', CX, 240);
        ctx.font = '20px system-ui, sans-serif';
        ctx.fillText(`Score: ${currentScore}`, CX, 290);
        if (currentScore === highScores[mode!] && currentScore > 0) {
          ctx.fillText('New High Score!', CX, 325);
        }
        if (errorReplayPhase === 'playing') {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText('Showing correct sequence...', CX, 370);
        } else if (errorReplayPhase === 'done') {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px system-ui, sans-serif';
          ctx.fillText('That was the correct sequence', CX, 370);
        }
        ctx.fillStyle = '#fff';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText('R - Play Again', CX, 420);
        ctx.fillText('ESC - Change Mode', CX, 450);
      }

      rafId = requestAnimationFrame(draw);
    };

    gameRef.current.lastTime = performance.now();
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [
    phase, mode, theme, round, currentScore, streak, activeColor, padPressAnim,
    failFlash, screenShake, highScores, themeStyle, centerWheelAngle,
    menuHover, gameOver, speedPercent, errorReplayPhase,
  ]);

  // Pad press animation tick
  useEffect(() => {
    if (!padPressAnim) return;
    const id = setInterval(() => {
      setPadPressAnim(p => (p && p.t > 0 ? { ...p, t: p.t - 0.15 } : null));
    }, 16);
    return () => clearInterval(id);
  }, [padPressAnim]);

  // Canvas click handler
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    if (phase === 'menu') {
      const modes: GameMode[] = ['classic', 'reverse', 'speed', 'freeplay', 'simonplus'];
      const mY = 180;
      modes.forEach((m, i) => {
        const x = 120 + (i % 3) * 220;
        const y = mY + Math.floor(i / 3) * 70;
        if (px >= x - 90 && px <= x + 90 && py >= y - 22 && py <= y + 22) {
          setMode(m);
          playSound('click');
        }
      });
      const themes: ThemeName[] = ['classic', 'neon', 'pastel', 'dark'];
      themes.forEach((t, i) => {
        const x = CX - 120 + i * 70;
        const y = 370;
        if (Math.hypot(px - x, py - y) <= 18) {
          setTheme(t);
          playSound('click');
        }
      });
      if (mode && px >= CX - 120 && px <= CX + 120 && py >= 415 && py <= 465) {
        handleStart(mode);
        playSound('buttonPress');
      }
      if (px >= CANVAS_W - 130 && px <= CANVAS_W - 30 && py >= 12 && py <= 48) {
        onClose();
      }
      return;
    }

    if (phase === 'playing' && gameOver) {
      if (py >= 395 && py <= 455) {
        if (px >= CX - 80 && px <= CX + 80) {
          handleStart(mode!);
          playSound('buttonPress');
        }
      }
      return;
    }

    // Replay button click
    if (phase === 'playing' && !gameOver && mode !== 'freeplay') {
      const rX = CANVAS_W - 95;
      const rY = 40;
      if (px >= rX - 50 && px <= rX + 50 && py >= rY - 16 && py <= rY + 16) {
        handleReplay();
        playSound('click');
        return;
      }
    }

    const color = hitTest(px, py);
    if (color && started) handleColorPress(color);
  }, [phase, mode, started, handleColorPress, handleStart, handleReplay, hitTest, onClose]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    let hover: string | null = null;
    if (phase === 'menu') {
      const modes: GameMode[] = ['classic', 'reverse', 'speed', 'freeplay', 'simonplus'];
      modes.forEach((m, i) => {
        const x = 120 + (i % 3) * 220;
        const y = 180 + Math.floor(i / 3) * 70;
        if (px >= x - 90 && px <= x + 90 && py >= y - 22 && py <= y + 22) hover = m;
      });
      const themes: ThemeName[] = ['classic', 'neon', 'pastel', 'dark'];
      themes.forEach((t, i) => {
        const x = CX - 120 + i * 70;
        const y = 370;
        if (Math.hypot(px - x, py - y) <= 18) hover = `theme_${t}`;
      });
      if (px >= CANVAS_W - 130 && px <= CANVAS_W - 30 && py >= 12 && py <= 48) hover = 'close';
    } else if (phase === 'playing' && !gameOver && mode !== 'freeplay') {
      const rX = CANVAS_W - 95;
      const rY = 40;
      if (px >= rX - 50 && px <= rX + 50 && py >= rY - 16 && py <= rY + 16) hover = 'replay';
    }
    setMenuHover(hover);
  }, [phase, gameOver, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (gameOver) handleReset();
      else onClose();
    }
  };

  return (
    <div className="game-card overflow-hidden w-full max-w-lg mx-auto" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full max-w-full h-auto cursor-pointer"
          style={{ background: themeStyle.bg, maxWidth: '100%' }}
          onClick={handleCanvasClick}
          onTouchStart={(e) => {
            e.preventDefault();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            const t = e.changedTouches[0];
            if (t) {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) {
                handleCanvasClick({ clientX: t.clientX, clientY: t.clientY } as React.MouseEvent<HTMLCanvasElement>);
              }
            }
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMenuHover(null)}
        />
      </div>
    </div>
  );
}
