/* ═══════════════════════════════════════════════════════════════════════════════
   WHACK-A-MOLE — Elite Canvas Edition
   Full canvas rendering, animated mole characters, particle effects
   Game modes: Classic, Endless, Speed Rush, Zen
   Arrow keys + Space or mouse click to whack
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface WhackAMoleProps {
  onClose: () => void;
}

type MoleType = 'normal' | 'golden' | 'speed' | 'bomb' | 'boss';
type GameMode = 'classic' | 'endless' | 'speedrush' | 'zen';

const GRID_SIZE = 3;
const HOLES = GRID_SIZE * GRID_SIZE;
const LIVES = 3;
const COMBO_TIMEOUT_MS = 1200;
const MAX_COMBO_MULT = 5;
const HIGH_SCORE_KEY = 'whackamole_elite_high';

interface Mole {
  id: number;
  holeIndex: number;
  type: MoleType;
  visible: boolean;
  peekProgress: number;
  hitProgress: number; // 0 = normal, 1 = fully hit (dizzy stars)
  shownAt: number;
  hideAt: number;
  hideDuration: number;
  bossHits: number; // for boss: 0..3
}

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  type: 'score' | 'miss' | 'penalty';
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'star' | 'sparkle' | 'smoke' | 'impact';
  size: number;
}

interface Hole {
  cx: number;
  cy: number;
  r: number;
}

function getPoints(type: MoleType, combo: number): number {
  const base = type === 'normal' ? 10 : type === 'golden' ? 50 : type === 'speed' ? 20 : type === 'boss' ? 200 : 0;
  const mult = type === 'golden' ? 5 : 1;
  return base * mult * Math.min(combo, MAX_COMBO_MULT);
}

function getBombPenalty(): number {
  return -30;
}

export default function WhackAMole({ onClose }: WhackAMoleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<'menu' | 'playing' | 'round_transition' | 'gameover'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const stored = localStorage.getItem(HIGH_SCORE_KEY);
      return stored ? JSON.parse(stored)[gameMode] ?? 0 : 0;
    } catch { return 0; }
  });
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(60);
  const [round, setRound] = useState(1);
  const [combo, setCombo] = useState(0);
  const [lastHitTime, setLastHitTime] = useState(0);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hammerPos, setHammerPos] = useState(4); // 0-8 grid index
  const [hammerSwing, setHammerSwing] = useState(0); // 0 = idle, 1 = swinging
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const [useKeyboard, setUseKeyboard] = useState(true);
  const [roundTransitionText, setRoundTransitionText] = useState('');
  const [totalWhacks, setTotalWhacks] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [molesWhacked, setMolesWhacked] = useState(0);

  const gameRef = useRef({
    nextMoleId: 0,
    nextPopupId: 0,
    nextParticleId: 0,
    spawnTimers: [] as number[],
    elapsed: 0,
    animFrame: 0,
  });
  const statusRef = useRef({ phase: 'menu' as string, round, gameMode });

  statusRef.current = { phase, round, gameMode };

  const CANVAS_W = 520;
  const CANVAS_H = 520;
  const PAD = 40;
  const CELL_W = (CANVAS_W - PAD * 2) / GRID_SIZE;
  const CELL_H = (CANVAS_H - PAD * 2) / GRID_SIZE;
  const HOLE_R = Math.min(CELL_W, CELL_H) * 0.32;

  const getHoles = useCallback((): Hole[] => {
    const holes: Hole[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        holes.push({
          cx: PAD + (col + 0.5) * CELL_W,
          cy: PAD + (row + 0.5) * CELL_H,
          r: HOLE_R,
        });
      }
    }
    return holes;
  }, []);

  const holeAt = getHoles()[hammerPos];

  const addParticles = useCallback((x: number, y: number, count: number, type: 'hit' | 'bomb') => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = type === 'bomb' ? 60 + Math.random() * 80 : 40 + Math.random() * 50;
      arr.push({
        id: gameRef.current.nextParticleId++,
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        type: type === 'bomb' ? 'smoke' : Math.random() > 0.5 ? 'star' : 'sparkle',
        size: 4 + Math.random() * 6,
      });
    }
    setParticles(prev => [...prev, ...arr]);
  }, []);

  const addPopup = useCallback((x: number, y: number, text: string, type: 'score' | 'miss' | 'penalty') => {
    const id = gameRef.current.nextPopupId++;
    setPopups(prev => [...prev, { id, x, y, text, life: 1, type }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 900);
  }, []);

  const spawnMole = useCallback((elapsed: number, r: number) => {
    const st = statusRef.current;
    if (st.phase !== 'playing') return;

    const isBossRound = r % 3 === 0 && r > 0;
    const hasBombs = st.gameMode !== 'zen';
    const ramp = Math.min(500, r * 80);
    const appearMin = Math.max(350, 900 - ramp);
    const appearMax = Math.max(500, 1400 - ramp * 0.8);
    const hideMin = Math.max(500, 1100 - ramp);
    const hideMax = Math.max(800, 1800 - ramp);

    const rand = Math.random();
    let type: MoleType = 'normal';
    if (isBossRound && rand < 0.25) type = 'boss';
    else if (rand < 0.08) type = 'golden';
    else if (rand < 0.18) type = 'speed';
    else if (hasBombs && rand < 0.28) type = 'bomb';

    const holeIndex = Math.floor(Math.random() * HOLES);
    const id = gameRef.current.nextMoleId++;
    const now = Date.now();
    let hideDuration = type === 'golden' ? 550 : type === 'speed' ? hideMin * 0.5 : hideMin + Math.random() * (hideMax - hideMin);
    if (type === 'boss') hideDuration = 2500;
    const hideAt = now + hideDuration;

    setMoles(prev => {
      const occupied = new Set(prev.filter(m => m.visible).map(m => m.holeIndex));
      if (occupied.has(holeIndex)) return prev;
      return [...prev, {
        id, holeIndex, type, visible: true, peekProgress: 0, hitProgress: 0,
        shownAt: now, hideAt, hideDuration, bossHits: 0,
      }];
    });

    const peekSteps = 8;
    const peekMs = 25;
    for (let i = 1; i <= peekSteps; i++) {
      const t = window.setTimeout(() => {
        setMoles(prev => prev.map(m => m.id === id ? { ...m, peekProgress: i / peekSteps } : m));
      }, (i - 1) * peekMs);
      gameRef.current.spawnTimers.push(t);
    }

    const hideTimer = window.setTimeout(() => {
      setMoles(prev => prev.map(m => m.id === id ? { ...m, peekProgress: 0 } : m));
      setTimeout(() => setMoles(prev => prev.map(m => m.id === id ? { ...m, visible: false } : m)), 100);
    }, hideDuration);
    gameRef.current.spawnTimers.push(hideTimer);

    const nextDelay = appearMin + Math.random() * (appearMax - appearMin);
    const nextTimer = window.setTimeout(() => spawnMole(elapsed + 0.5, r), nextDelay);
    gameRef.current.spawnTimers.push(nextTimer);
  }, []);

  const whackAt = useCallback((gridIndex: number, screenX?: number, screenY?: number) => {
    if (phase !== 'playing') return;
    const holes = getHoles();
    const h = holes[gridIndex];
    const px = screenX ?? h.cx;
    const py = screenY ?? h.cy;

    setTotalWhacks(prev => prev + 1);
    setHammerSwing(1);
    setTimeout(() => setHammerSwing(0), 120);

    const mole = moles.find(m => m.holeIndex === gridIndex && m.visible);
    if (!mole) {
      playSound('wrong');
      addPopup(px, py, 'Miss!', 'miss');
      setCombo(0);
      return;
    }

    if (mole.type === 'bomb') {
      playSound('bomb');
      addParticles(px, py, 14, 'bomb');
      addPopup(px, py, `-30!`, 'penalty');
      setScore(s => Math.max(0, s + getBombPenalty()));
      setLives(l => Math.max(0, l - 1));
      setCombo(0);
      setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, hitProgress: 1, peekProgress: 0 } : m));
      setTimeout(() => setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, visible: false } : m)), 200);
      return;
    }

    if (mole.type === 'boss') {
      const newHits = mole.bossHits + 1;
      if (newHits >= 3) {
        const now = Date.now();
        const newCombo = now - lastHitTime < COMBO_TIMEOUT_MS ? Math.min(MAX_COMBO_MULT, combo + 1) : 1;
        const pts = 200 * newCombo;
        setScore(s => s + pts);
        setTotalHits(h => h + 1);
        setMolesWhacked(m => m + 1);
        setLastHitTime(now);
        setCombo(newCombo);
        setBestCombo(b => Math.max(b, newCombo));
        playSound('levelup');
        addParticles(px, py, 16, 'hit');
        addPopup(px, py, `+${pts}`, 'score');
        setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, visible: false } : m));
      } else {
        playSound('hit');
        addParticles(px, py, 6, 'hit');
        for (let i = 0; i < 4; i++) {
          setParticles(prev => [...prev, {
            id: gameRef.current.nextParticleId++,
            x: px, y: py, vx: 0, vy: 0,
            life: 1, type: 'impact', size: 12 + i * 3,
          }]);
        }
        addPopup(px, py, `${newHits}/3`, 'score');
        setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, bossHits: newHits, hitProgress: 0.5 } : m));
        setTimeout(() => setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, hitProgress: 0 } : m)), 150);
      }
      return;
    }

    const now = Date.now();
    const newCombo = now - lastHitTime < COMBO_TIMEOUT_MS ? Math.min(MAX_COMBO_MULT, combo + 1) : 1;
    const pts = getPoints(mole.type, newCombo);
    setScore(s => s + pts);
    setTotalHits(h => h + 1);
    setMolesWhacked(m => m + 1);
    setLastHitTime(now);
    setCombo(newCombo);
    setBestCombo(b => Math.max(b, newCombo));
    playSound(newCombo > 1 ? 'combo' : 'whack');
    addParticles(px, py, mole.type === 'golden' ? 14 : 10, 'hit');
    for (let i = 0; i < 6; i++) {
      setParticles(prev => [...prev, {
        id: gameRef.current.nextParticleId++,
        x: px, y: py,
        vx: 0, vy: 0,
        life: 1, type: 'impact', size: 10 + i * 4,
      }]);
    }
    addPopup(px, py, `+${pts}`, 'score');
    setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, hitProgress: 1, peekProgress: 0 } : m));
    setTimeout(() => setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, visible: false } : m)), 180);
  }, [phase, moles, combo, lastHitTime, getHoles, addParticles, addPopup]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (phase !== 'playing' && phase !== 'menu') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHammerPos(p => (p % GRID_SIZE === 0 ? p : p - 1));
      playSound('click');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHammerPos(p => (p % GRID_SIZE === GRID_SIZE - 1 ? p : p + 1));
      playSound('click');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHammerPos(p => (p < GRID_SIZE ? p : p - GRID_SIZE));
      playSound('click');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHammerPos(p => (p >= HOLES - GRID_SIZE ? p : p + GRID_SIZE));
      playSound('click');
    } else if (e.key === ' ') {
      e.preventDefault();
      setUseKeyboard(true);
      whackAt(hammerPos);
    }
  }, [phase, hammerPos, whackAt]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || phase !== 'playing') return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    setCursorX(x);
    setCursorY(y);
    setUseKeyboard(false);
    const holes = getHoles();
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const dx = x - h.cx;
      const dy = y - h.cy;
      if (dx * dx + dy * dy <= h.r * h.r) {
        whackAt(i, x, y);
        return;
      }
    }
    setTotalWhacks(prev => prev + 1);
    setCombo(0);
    addPopup(x, y, 'Miss!', 'miss');
    playSound('wrong');
  }, [phase, getHoles, whackAt, addPopup]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setCursorX(x);
    setCursorY(y);
    setUseKeyboard(false);
    const holes = getHoles();
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      const dx = x - h.cx;
      const dy = y - h.cy;
      if (dx * dx + dy * dy <= h.r * h.r) {
        whackAt(i, x, y);
        return;
      }
    }
    setTotalWhacks(prev => prev + 1);
    setCombo(0);
    addPopup(x, y, 'Miss!', 'miss');
    playSound('wrong');
  }, [phase, getHoles, whackAt, addPopup]);

  const getTimerDuration = useCallback((mode: GameMode) => {
    if (mode === 'classic') return 60;
    if (mode === 'speedrush') return 30;
    return 999;
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    gameRef.current.spawnTimers.forEach(clearTimeout);
    gameRef.current.spawnTimers = [];
    setGameMode(mode);
    setScore(0);
    setLives(LIVES);
    setTimeLeft(mode === 'classic' ? 60 : mode === 'speedrush' ? 30 : 999);
    setRound(1);
    setCombo(0);
    setMoles([]);
    setPopups([]);
    setParticles([]);
    setTotalWhacks(0);
    setTotalHits(0);
    setBestCombo(0);
    setMolesWhacked(0);
    setHammerPos(4);
    setRoundTransitionText('ROUND 1');
    setPhase('round_transition');
    playSound('countdown');
  }, [gameMode]);

  useEffect(() => {
    if (phase !== 'round_transition') return;
    const t = setTimeout(() => {
      setPhase('playing');
      playSound('go');
      const r = round;
      spawnMole(0, r);
    }, 1500);
    return () => clearTimeout(t);
  }, [phase, round, spawnMole]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (gameMode === 'zen' || gameMode === 'endless') return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setPhase('gameover');
          playSound('gameover');
          return 0;
        }
        if (t <= 5) playSound('tick');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, gameMode]);

  useEffect(() => {
    if (phase === 'playing' && lives <= 0) {
      setPhase('gameover');
      playSound('gameover');
    }
  }, [phase, lives]);

  useEffect(() => {
    if (phase === 'gameover' && score > 0) {
      try {
        const stored = localStorage.getItem(HIGH_SCORE_KEY);
        const obj = stored ? JSON.parse(stored) : {};
        const key = gameMode;
        if (!obj[key] || score > obj[key]) {
          obj[key] = score;
          localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(obj));
          setHighScore(score);
        }
      } catch {}
    }
  }, [phase, score, gameMode]);

  const advanceRound = useCallback(() => {
    gameRef.current.spawnTimers.forEach(clearTimeout);
    gameRef.current.spawnTimers = [];
    setMoles([]);
    setRound(r => {
      const next = r + 1;
      setRoundTransitionText(`ROUND ${next}`);
      setPhase('round_transition');
      playSound('levelup');
      return next;
    });
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => advanceRound(), 15000);
    return () => clearInterval(timer);
  }, [phase, advanceRound]);

  useEffect(() => {
    setHighScore(() => {
      try {
        const stored = localStorage.getItem(HIGH_SCORE_KEY);
        const obj = stored ? JSON.parse(stored) : {};
        return obj[gameMode] ?? 0;
      } catch { return 0; }
    });
  }, [gameMode]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = CANVAS_W;
    const h = CANVAS_H;
    ctx.clearRect(0, 0, w, h);

    const time = Date.now() * 0.001;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2d5a27');
    gradient.addColorStop(0.6, '#3d7a35');
    gradient.addColorStop(1, '#1e4620');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 200; i++) {
      const x = (i * 137 + time * 2) % (w + 40) - 20;
      const y = (i * 89 + time) % (h + 40) - 20;
      ctx.fillStyle = `rgba(80, 140, 60, ${0.1 + Math.sin(time + i) * 0.05})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 30; i++) {
      const bx = (i * 73 + 11) % (w - 20) + 10;
      const by = (i * 51 + 7) % (h - 20) + 10;
      ctx.fillStyle = `rgba(60, 100, 50, ${0.15 + Math.sin(time * 2 + i * 0.5) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(bx, by, 3, 5, (i % 3) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const flowers = [[60, 80], [w - 70, 100], [90, h - 90], [w - 80, h - 100], [w / 2, 60]];
    flowers.forEach(([fx, fy], i) => {
      ctx.fillStyle = ['#FFB6C1', '#98FB98', '#FFD700', '#87CEEB', '#DDA0DD'][i % 5];
      ctx.globalAlpha = 0.6 + Math.sin(time + i) * 0.1;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 + time * 0.5;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 4, fy + Math.sin(a) * 4, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    const holes = getHoles();
    for (let i = 0; i < holes.length; i++) {
      const { cx, cy, r } = holes[i];
      ctx.fillStyle = '#1a1a0a';
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.1, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0d0d05';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#0a0a05';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 2, r * 0.95, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const drawMoleEyes = (ctx: CanvasRenderingContext2D, size: number, expr: 'normal' | 'happy' | 'dizzy' | 'angry') => {
      const eyeY = expr === 'dizzy' ? -size * 0.15 : -size * 0.2;
      const eyeW = size * 0.15;
      const eyeH = expr === 'dizzy' ? eyeW * 0.25 : expr === 'happy' ? eyeW * 0.6 : eyeW;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-size * 0.25, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(size * 0.25, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      if (expr === 'dizzy') {
        ctx.font = `${eyeW}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('x', -size * 0.25, eyeY + eyeW * 0.3);
        ctx.fillText('x', size * 0.25, eyeY + eyeW * 0.3);
      } else if (expr === 'happy') {
        ctx.beginPath();
        ctx.arc(-size * 0.25, eyeY, eyeW * 0.35, 0, Math.PI * 2);
        ctx.arc(size * 0.25, eyeY, eyeW * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-size * 0.25, eyeY, eyeW * 0.4, eyeH * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(size * 0.25, eyeY, eyeW * 0.4, eyeH * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawMoleMouth = (ctx: CanvasRenderingContext2D, size: number, expr: 'neutral' | 'ouch' | 'smile') => {
      ctx.strokeStyle = '#4a3728';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (expr === 'ouch') {
        ctx.arc(0, size * 0.15, size * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (expr === 'smile') {
        ctx.arc(0, size * 0.1, size * 0.25, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      } else {
        ctx.moveTo(-size * 0.15, size * 0.15);
        ctx.lineTo(size * 0.15, size * 0.15);
        ctx.stroke();
      }
    };

    moles.forEach(mole => {
      if (!mole.visible) return;
      const hole = holes[mole.holeIndex];
      const lift = mole.peekProgress * hole.r * 1.4;
      const bob = Math.sin(time * 8 + mole.id) * 2;
      const y = hole.cy - lift + bob;
      const hitSquash = 1 - mole.hitProgress * 0.5;

      const isHit = mole.hitProgress > 0;
      const scale = (0.4 + mole.peekProgress * 0.6) * hitSquash;
      const size = hole.r * 1.2 * scale;

      const colors: Record<MoleType, string> = {
        normal: '#8B6914',
        golden: '#FFD700',
        speed: '#4A90D9',
        bomb: '#8B0000',
        boss: '#2E4057',
      };
      const shade = colors[mole.type];

      ctx.save();
      ctx.translate(hole.cx, y);

      ctx.fillStyle = shade;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, size, size * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (mole.type === 'golden') {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (mole.type === 'bomb') {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(size * 0.4, -size * 0.2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      if (mole.type === 'boss') {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.9);
        ctx.lineTo(-size * 0.25, -size * 0.5);
        ctx.lineTo(size * 0.25, -size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      const eyeExpr = isHit ? 'dizzy' : mole.type === 'golden' ? 'happy' : mole.type === 'bomb' ? 'angry' : 'normal';
      const mouthExpr = isHit ? 'ouch' : mole.type === 'golden' ? 'smile' : 'neutral';
      drawMoleEyes(ctx, size, eyeExpr);
      drawMoleMouth(ctx, size, mouthExpr);

      if (isHit) {
        const starCount = 6;
        for (let s = 0; s < starCount; s++) {
          const a = (s / starCount) * Math.PI * 2 + time * 5;
          const dist = size * (0.8 + mole.hitProgress * 0.5);
          const sx = Math.cos(a) * dist;
          const sy = Math.sin(a) * dist - size * 0.5;
          ctx.fillStyle = `rgba(255,220,100,${1 - mole.hitProgress})`;
          ctx.font = `${size * 0.4}px sans-serif`;
          ctx.fillText('★', sx, sy);
        }
      }

      ctx.restore();
    });

    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(80,80,80,${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (2 - p.life), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'impact') {
        ctx.strokeStyle = `rgba(255,200,100,${p.life})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.5 - p.life * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.type === 'star' ? '#FFD700' : '#FFF8DC';
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.type === 'star' ? '★' : '✦', p.x, p.y);
      }
      ctx.restore();
    });

    popups.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = p.type === 'score' ? '#00FF00' : p.type === 'penalty' ? '#FF4444' : '#888';
      ctx.fillText(p.text, p.x, p.y - 30);
      ctx.restore();
    });

    const hx = useKeyboard ? holeAt.cx : cursorX;
    const hy = useKeyboard ? holeAt.cy : cursorY;

    const swingRot = hammerSwing * 0.8;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-Math.PI / 4 - swingRot * Math.PI / 2);
    ctx.fillStyle = '#5D4E37';
    ctx.fillRect(-4, -8, 8, 60);
    ctx.fillStyle = '#333';
    ctx.fillRect(-18, 48, 36, 12);
    ctx.fillStyle = '#444';
    ctx.fillRect(-20, 50, 40, 8);
    ctx.restore();

    if (phase === 'round_transition') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(roundTransitionText, w / 2, h / 2);
    }

    if (phase === 'playing') {
      for (let i = 0; i < LIVES; i++) {
        ctx.fillStyle = i < lives ? '#e74c3c' : 'rgba(100,50,50,0.4)';
        ctx.beginPath();
        ctx.moveTo(w - 80 + i * 22, 28);
        ctx.bezierCurveTo(w - 80 + i * 22 - 8, 18, w - 80 + i * 22 - 16, 28, w - 80 + i * 22 - 8, 36);
        ctx.bezierCurveTo(w - 80 + i * 22, 44, w - 80 + i * 22 + 8, 36, w - 80 + i * 22 + 8, 36);
        ctx.bezierCurveTo(w - 80 + i * 22 + 16, 28, w - 80 + i * 22 + 8, 18, w - 80 + i * 22, 28);
        ctx.fill();
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 12, 32);
    }

    if (phase === 'playing' && (gameMode === 'classic' || gameMode === 'speedrush')) {
      const barW = 150;
      const barH = 12;
      const x = w / 2 - barW / 2;
      const y = 18;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, y, barW, barH);
      const maxTime = gameMode === 'classic' ? 60 : 30;
      const pct = timeLeft / maxTime;
      ctx.fillStyle = pct > 0.3 ? '#4CAF50' : pct > 0.1 ? '#FFC107' : '#F44336';
      ctx.fillRect(x, y, barW * pct, barH);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barW, barH);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${timeLeft}s`, w / 2, y + 10);
    }
  }, [moles, particles, popups, hammerSwing, holeAt, cursorX, cursorY, useKeyboard, phase, roundTransitionText, gameMode, timeLeft, getHoles, lives, score]);

  useEffect(() => {
    setParticles(prev =>
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx * 0.016,
          y: p.y + p.vy * 0.016,
          life: p.life - 0.018,
          vx: p.vx * 0.96,
          vy: p.vy * 0.96,
        }))
        .filter(p => p.life > 0)
    );
  }, [moles]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const accuracy = totalWhacks > 0 ? Math.round((totalHits / totalWhacks) * 100) : 0;

  return (
    <div className="game-card bg-gradient-to-br from-amber-900/20 to-amber-950/30 border border-amber-700/40 text-amber-50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-amber-100">Whack Attack Elite</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-amber-200">Close</button>
      </div>

      {phase === 'menu' && (
        <div className="space-y-4">
          <p className="text-amber-200/90 text-sm">Canvas rendering • Arrow keys + Space or tap/click to whack</p>
          <div className="p-3 rounded-lg bg-amber-900/40 border border-amber-600/50 text-xs space-y-2">
            <p className="font-semibold text-amber-200">Mole Types</p>
            <p>🟤 <span className="text-amber-100">Normal</span> = 10 pts • <span className="text-yellow-300">✨ Golden</span> = 50 pts (5x) • <span className="text-blue-300">Speed</span> = 20 pts</p>
            <p>💣 <span className="text-red-300">Bomb</span> = -30 pts, lose a life! • 👑 <span className="text-purple-300">Boss</span> = 200 pts (3 hits)</p>
            <p>🔥 <span className="text-amber-300 font-bold">Combo</span>: Hit moles quickly for up to 5x multiplier! Speed increases each round.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['classic', 'endless', 'speedrush', 'zen'] as GameMode[]).map(m => (
              <button
                key={m}
                onClick={() => startGame(m)}
                className="btn-elite btn-elite-primary text-sm capitalize"
              >
                {m === 'classic' ? 'Classic (60s)' : m === 'endless' ? 'Endless' : m === 'speedrush' ? 'Speed Rush (30s)' : 'Zen'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-2 text-sm">
        <span>Score: <strong>{score}</strong></span>
        <span>High: <strong>{highScore}</strong></span>
        <span>Lives: <strong>{lives}</strong></span>
        {(gameMode === 'classic' || gameMode === 'speedrush') && <span>Time: <strong>{timeLeft}s</strong></span>}
        <span>Round: <strong>{round}</strong></span>
        {combo > 1 && <span className="text-amber-300 font-bold">Combo: {combo}x</span>}
      </div>

      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-amber-700/50 bg-black/30 w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={handleCanvasClick}
          onTouchStart={(e) => e.preventDefault()}
          onTouchEnd={handleCanvasTouchEnd}
          onTouchMove={(e) => {
            e.preventDefault();
            const canvas = canvasRef.current;
            if (!canvas) return;
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            setCursorX((touch.clientX - rect.left) * scaleX);
            setCursorY((touch.clientY - rect.top) * scaleY);
          }}
          onMouseMove={e => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            setCursorX((e.clientX - rect.left) * scaleX);
            setCursorY((e.clientY - rect.top) * scaleY);
          }}
          className="w-full max-w-full cursor-crosshair block"
          style={{ maxWidth: '100%', touchAction: 'none' }}
        />
      </div>

      <p className="text-amber-300/80 text-xs mt-2">
        {typeof window !== 'undefined' && 'ontouchstart' in window
          ? 'Tap moles to whack them!'
          : '↑↓←→ move hammer • Space whack • or click on holes'}
      </p>

      {phase === 'gameover' && (
        <div className="mt-4 p-4 rounded-lg bg-amber-900/40 border border-amber-600/50 space-y-2">
          <p className="text-xl font-bold text-amber-100">Game Over</p>
          <p>Final Score: {score}</p>
          <p>Accuracy: {accuracy}%</p>
          <p>Best Combo: {bestCombo}x</p>
          <p>Moles Whacked: {molesWhacked}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => startGame(gameMode)} className="btn-elite btn-elite-primary">Play Again</button>
            <button onClick={() => setPhase('menu')} className="btn-elite btn-elite-ghost">Menu</button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
