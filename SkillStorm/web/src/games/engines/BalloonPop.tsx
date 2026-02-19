/* ═══════════════════════════════════════════════════════════
   BALLOON POP ENGINE
   Educational balloon popping: click the correct answer balloon
   Used by Fraction Frenzy, Chemistry Chaos, Percentage Pop, etc.
   Wind physics, chain combos, themed backgrounds, bomb & golden balloons
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Grade } from '../questionBank';
import { getQuestions } from '../questionBank';
import type { Question } from '../questionBank';
import { getGameById } from '../../engine/gameData';
import { playSound } from '../SoundEngine';

// ── Constants ─────────────────────────────────────────────
const CANVAS_W = 420;
const CANVAS_H = 320;
const BALLOON_RADIUS = 32;
const BASE_SPEED = 0.4;
const WIND_AMPLITUDE = 1.2;
const WIND_FREQ = 0.015;
const COMBO_DECAY_MS = 2000;
const STREAK_FREEZE_COMBO = 5;
const STREAK_FREEZE_EXTRA_MS = 3000;
const GOLDEN_POINTS = 5;
const SPEED_POINTS = 2;
const NORMAL_POINTS = 1;
const MAX_COMBO_MULTIPLIER = 5;

type BalloonType = 'normal' | 'speed' | 'bomb' | 'golden';
type BackgroundTheme = 'park' | 'sky' | 'underwater';
type Subject = 'math' | 'science' | 'vocabulary';

const BALLOON_COLORS: Record<BalloonType, string> = {
  normal: '#6C5CE7',
  speed: '#00CEC9',
  bomb: '#2d3436',
  golden: '#fdcb6e',
};

interface Balloon {
  id: number;
  x: number;
  y: number;
  answerIndex: number;
  answerText: string;
  type: BalloonType;
  vy: number;
  phase: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

type PowerUpType = 'freeze_wind' | 'double_points' | 'extra_life';

interface PowerUp {
  type: PowerUpType;
  endsAt: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  shape?: 'square' | 'circle' | 'triangle';
  rotation?: number;
}

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

// ── Subject from gameId ────────────────────────────────────
function getSubjectForGameId(gameId: string): Subject {
  const game = getGameById(gameId);
  if (!game) return 'math';
  if (game.subject === 'math') return 'math';
  if (game.subject === 'science') return 'science';
  return 'vocabulary';
}

export function BalloonPop({ gameId, grade, onClose, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [combo, setCombo] = useState(0);
  const [comboDisplay, setComboDisplay] = useState<string>('');
  const [screenShake, setScreenShake] = useState(false);
  const [streakBonus, setStreakBonus] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [correctPops, setCorrectPops] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const floatingScoreIdRef = useRef(0);
  const powerUpRef = useRef<PowerUp | null>(null);
  const lastTouchPosRef = useRef<{ x: number; y: number } | null>(null);
  const poppedThisGestureRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    powerUpRef.current = powerUp;
  }, [powerUp]);

  useEffect(() => {
    if (!powerUp || powerUp.type === 'extra_life') return;
    const endsAt = powerUp.endsAt;
    const id = setInterval(() => {
      if (performance.now() >= endsAt) {
        setPowerUp(null);
      }
    }, 200);
    return () => clearInterval(id);
  }, [powerUp]);

  const subject = useMemo(() => getSubjectForGameId(gameId), [gameId]);

  const gameStateRef = useRef<{
    balloons: Balloon[];
    confetti: Confetti[];
    nextBalloonId: number;
    comboCount: number;
    lastPopTime: number;
    time: number;
    questionsPool: Question[];
    windScale: number;
  }>({
    balloons: [],
    confetti: [],
    nextBalloonId: 0,
    comboCount: 0,
    lastPopTime: 0,
    time: 0,
    questionsPool: [],
    windScale: 1,
  });

  const animRef = useRef<number>(0);

  // Load questions for subject and grade
  useEffect(() => {
    const pool = getQuestions(grade, subject, 30);
    gameStateRef.current.questionsPool = pool;
  }, [grade, subject]);

  const getTheme = useCallback((): BackgroundTheme => {
    const idx = ((round - 1) % 3) as 0 | 1 | 2;
    return ['park', 'sky', 'underwater'][idx] as BackgroundTheme;
  }, [round]);

  const getBalloonType = useCallback((isCorrect: boolean, roundNum: number): BalloonType => {
    const rnd = Math.random();
    if (isCorrect) {
      if (rnd < 0.12) return 'golden';
      if (rnd < 0.25) return 'speed';
      return 'normal';
    }
    const bombChance = roundNum >= 5 ? 0.25 : roundNum >= 3 ? 0.2 : 0.15;
    return rnd < bombChance ? 'bomb' : 'normal';
  }, []);

  const spawnBalloons = useCallback((roundOverride?: number) => {
    const state = gameStateRef.current;
    const pool = state.questionsPool;
    if (!pool || pool.length === 0) return;

    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion(q);

    const opts = [...q.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }

    const baseY = CANVAS_H + BALLOON_RADIUS;
    const spacing = CANVAS_W / (opts.length + 1);
    const r = roundOverride ?? round;

    const speedScale = r >= 10 ? 1.4 : r >= 5 ? 1.2 : 1;
    state.windScale = r >= 10 ? 1.5 : 1;

    opts.forEach((text, idx) => {
      const correctIdx = q.options.indexOf(text);
      const isCorrect = correctIdx === q.correct;
      const type = getBalloonType(isCorrect, r);
      const speedMult = type === 'speed' ? 1.8 : type === 'golden' ? 0.7 : 1;
      const levelScale = (0.8 + r * 0.05) * speedScale;

      state.balloons.push({
        id: state.nextBalloonId++,
        x: spacing * (idx + 1) + (Math.random() - 0.5) * 40,
        y: baseY + idx * 50 + Math.random() * 30,
        answerIndex: correctIdx,
        answerText: text,
        type,
        vy: -BASE_SPEED * speedMult * levelScale,
        phase: Math.random() * Math.PI * 2,
      });
    });
  }, [round, getBalloonType]);

  const spawnConfetti = useCallback((x: number, y: number, color: string, count = 14) => {
    const state = gameStateRef.current;
    const colors = [color, '#6C5CE7', '#FD79A8', '#00CEC9', '#fdcb6e'];
    const shapes: Array<'square' | 'circle' | 'triangle'> = ['square', 'circle', 'triangle'];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const v = 2.5 + Math.random() * 2;
      state.confetti.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1.5,
        color: colors[i % colors.length],
        life: 35,
        maxLife: 35,
        size: 3 + Math.random() * 4,
        shape: shapes[i % 3],
        rotation: Math.random() * 360,
      });
    }
  }, []);

  /** Pop burst: extra particles for dramatic balloon pop effect */
  const spawnPopBurst = useCallback((x: number, y: number, color: string) => {
    const state = gameStateRef.current;
    const colors = [color, '#fff', '#ffd700', color];
    const shapes: Array<'square' | 'circle' | 'triangle'> = ['square', 'circle', 'triangle'];
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Math.random();
      const v = 4 + Math.random() * 6;
      state.confetti.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 3,
        color: colors[i % colors.length],
        life: 25,
        maxLife: 25,
        size: 4 + Math.random() * 6,
        shape: shapes[i % 3],
        rotation: Math.random() * 360,
      });
    }
  }, []);

  const triggerScreenShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);
  }, []);

  const addFloatingScore = useCallback((canvasX: number, canvasY: number, text: string, color: string) => {
    const id = floatingScoreIdRef.current++;
    const x = (canvasX / CANVAS_W) * 100;
    const y = (canvasY / CANVAS_H) * 100;
    setFloatingScores((prev) => [
      ...prev,
      { id, x, y, text, color, life: 45, maxLife: 45 },
    ]);
  }, []);

  const trySpawnPowerUp = useCallback((golden: boolean) => {
    if (!golden || Math.random() > 0.4) return;
    const types: PowerUpType[] = ['freeze_wind', 'double_points', 'extra_life'];
    const type = types[Math.floor(Math.random() * types.length)];
    const duration = type === 'freeze_wind' ? 5000 : type === 'double_points' ? 10000 : 0;
    if (type === 'extra_life') {
      setLives((l) => l + 1);
      playSound('extra_life');
    }
    if (duration > 0) {
      setPowerUp({ type, endsAt: performance.now() + duration });
      playSound('powerup');
    }
  }, []);

  /** Get canvas coordinates from client coordinates */
  const getCanvasCoords = useCallback((clientX: number, clientY: number): { mx: number; my: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      mx: (clientX - rect.left) * scaleX,
      my: (clientY - rect.top) * scaleY,
    };
  }, []);

  /** Try to pop a balloon at canvas position. Returns true if a balloon was popped (caller should stop). */
  const tryPopAtPosition = useCallback((mx: number, my: number, excludeIds?: Set<number>): boolean => {
    if (gameOver || !currentQuestion) return false;
    const state = gameStateRef.current;
    const now = performance.now();

    const decayMs = COMBO_DECAY_MS + (state.comboCount >= STREAK_FREEZE_COMBO ? STREAK_FREEZE_EXTRA_MS : 0);
    if (now - state.lastPopTime > decayMs) {
      state.comboCount = 0;
      setCombo(0);
      setComboDisplay('');
    }

    for (let i = state.balloons.length - 1; i >= 0; i--) {
      const b = state.balloons[i];
      if (excludeIds?.has(b.id)) continue;
      const dx = mx - b.x;
      const dy = my - b.y;
      if (dx * dx + dy * dy >= BALLOON_RADIUS * BALLOON_RADIUS) continue;

      state.balloons.splice(i, 1);
      spawnConfetti(b.x, b.y, BALLOON_COLORS[b.type]);
      spawnPopBurst(b.x, b.y, BALLOON_COLORS[b.type]);

      if (b.type === 'bomb') {
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
        playSound('hit');
        state.comboCount = 0;
        setCombo(0);
        setComboDisplay('');
        setStreakBonus(0);
        triggerScreenShake();
        return true;
      }

      const correct = b.answerIndex === currentQuestion.correct;

      if (correct) {
        setTotalAttempts((t) => t + 1);
        setCorrectPops((c) => c + 1);
        state.comboCount++;
        const mult = Math.min(state.comboCount, MAX_COMBO_MULTIPLIER);
        let pts =
          b.type === 'golden' ? GOLDEN_POINTS
          : b.type === 'speed' ? SPEED_POINTS
          : NORMAL_POINTS;
        const doublePoints = powerUpRef.current?.type === 'double_points' && powerUpRef.current.endsAt > now;
        if (doublePoints) pts *= 2;
        const streakPts = state.comboCount >= 3 ? Math.min(state.comboCount - 2, 5) : 0;
        const totalPts = pts * mult + streakPts;

        setBestCombo((bc) => Math.max(bc, state.comboCount));
        setCombo(state.comboCount);
        setComboDisplay(mult > 1 ? `x${mult} Combo!` : '');
        setStreakBonus(streakPts);
        setScore((s) => s + totalPts);
        state.lastPopTime = now;

        const floatText = mult > 1
          ? `+${totalPts} (${mult}× Combo!)`
          : doublePoints
            ? `+${totalPts} (2×!)`
            : `+${totalPts}!`;
        addFloatingScore(b.x, b.y, floatText, b.type === 'golden' ? '#fdcb6e' : '#6C5CE7');
        trySpawnPowerUp(b.type === 'golden');

        playSound('correct');

        setCurrentQuestion(null);

        const newRound = round + 1;
        setRound(newRound);

        onRoundEnd?.(newRound, score + totalPts);

        setTimeout(() => spawnBalloons(newRound), 800);
      } else {
        setTotalAttempts((t) => t + 1);
        state.comboCount = 0;
        setCombo(0);
        setComboDisplay('');
        setStreakBonus(0);
        triggerScreenShake();
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) setGameOver(true);
          return next;
        });
        playSound('wrong');
      }
      return true;
    }
    return false;
  }, [
    gameOver, currentQuestion, spawnConfetti, spawnPopBurst, spawnBalloons, round, score, onRoundEnd,
    triggerScreenShake, addFloatingScore, trySpawnPowerUp
  ]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords) tryPopAtPosition(coords.mx, coords.my);
    },
    [getCanvasCoords, tryPopAtPosition]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) {
        const coords = getCanvasCoords(t.clientX, t.clientY);
        if (coords) {
          lastTouchPosRef.current = { x: coords.mx, y: coords.my };
          poppedThisGestureRef.current = new Set();
        }
      }
    },
    [getCanvasCoords]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const t = e.changedTouches[0] || e.touches[0];
      if (!t) return;

      const coords = getCanvasCoords(t.clientX, t.clientY);
      if (!coords) return;

      const last = lastTouchPosRef.current;
      if (!last) {
        lastTouchPosRef.current = { x: coords.mx, y: coords.my };
        tryPopAtPosition(coords.mx, coords.my, poppedThisGestureRef.current);
        return;
      }

      const dx = coords.mx - last.x;
      const dy = coords.my - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const sampleStep = 18;
      const steps = Math.max(1, Math.floor(dist / sampleStep));
      const excludeIds = poppedThisGestureRef.current;

      for (let s = 1; s <= steps; s++) {
        const t0 = s / steps;
        const px = last.x + dx * t0;
        const py = last.y + dy * t0;
        if (tryPopAtPosition(px, py, excludeIds)) {
          break;
        }
      }

      lastTouchPosRef.current = { x: coords.mx, y: coords.my };
    },
    [getCanvasCoords, tryPopAtPosition]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) {
        const coords = getCanvasCoords(t.clientX, t.clientY);
        if (coords) {
          tryPopAtPosition(coords.mx, coords.my);
        }
      }
      lastTouchPosRef.current = null;
      poppedThisGestureRef.current = new Set();
    },
    [getCanvasCoords, tryPopAtPosition]
  );

  useEffect(() => {
    const state = gameStateRef.current;
    if (state.questionsPool.length > 0) {
      spawnBalloons();
    } else {
      const t = setInterval(() => {
        if (gameStateRef.current.questionsPool.length > 0) {
          spawnBalloons();
          clearInterval(t);
        }
      }, 100);
      return () => clearInterval(t);
    }
  }, [subject]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      state.time += 1 / 60;

      if (!gameOver) {
        const pu = powerUpRef.current;
        const windFrozen = pu?.type === 'freeze_wind' && pu.endsAt > performance.now();
        const windMult = windFrozen ? 0 : (state.windScale ?? 1);
        for (const b of state.balloons) {
          b.y += b.vy;
          const wind = Math.sin(state.time * 60 * WIND_FREQ + b.phase) * WIND_AMPLITUDE * windMult;
          b.x += wind;
          b.x = Math.max(BALLOON_RADIUS, Math.min(CANVAS_W - BALLOON_RADIUS, b.x));
        }

        state.balloons = state.balloons.filter((b) => b.y > -BALLOON_RADIUS - 20);

        state.confetti = state.confetti.filter((c) => {
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.15;
          c.life--;
          return c.life > 0;
        });
      }

      animRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    return () => cancelAnimationFrame(animRef.current);
  }, [gameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;
    const theme = getTheme();

    // ── Background by theme ─────────────────────────────────
    if (theme === 'park') {
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#2d5016';
      ctx.fillRect(0, CANVAS_H - 60, CANVAS_W, 60);
      for (let i = 0; i < 5; i++) {
        const tx = (i * 100 + 30 + (state.time * 2) % 50) % (CANVAS_W + 80) - 40;
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(tx, CANVAS_H - 50, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(tx - 15, CANVAS_H - 65, 18, 0, Math.PI * 2);
        ctx.arc(tx + 15, CANVAS_H - 70, 20, 0, Math.PI * 2);
        ctx.arc(tx, CANVAS_H - 85, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme === 'sky') {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#4facfe');
      grad.addColorStop(1, '#00f2fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      for (let i = 0; i < 6; i++) {
        const cx = (i * 80 + state.time * 8) % (CANVAS_W + 60) - 30;
        const cy = 40 + (i * 45) % (CANVAS_H - 80);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 25, cy - 5, 20, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      grad.addColorStop(0, '#006994');
      grad.addColorStop(1, '#0096c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      for (let i = 0; i < 8; i++) {
        const fx = (i * 55 + state.time * 5) % (CANVAS_W + 40) - 20;
        const fy = 60 + (i * 35) % (CANVAS_H - 100);
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.ellipse(fx + 40, fy + 20, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, CANVAS_H - 40, CANVAS_W, 40);
    }

    // ── Balloons (with wobble) ──────────────────────────────
    const wobbleScale = 3;
    for (const b of state.balloons) {
      ctx.save();
      const wobbleX = Math.sin(state.time * 8 + b.phase) * wobbleScale;
      const wobbleY = Math.cos(state.time * 6 + b.phase * 1.3) * wobbleScale * 0.5;
      const drawX = b.x + wobbleX;
      const drawY = b.y + wobbleY;

      ctx.fillStyle = BALLOON_COLORS[b.type];
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, BALLOON_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (b.type === 'golden') {
        ctx.strokeStyle = 'rgba(255,215,0,0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (b.type === 'bomb') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', drawX, drawY - 2);
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const displayText =
          b.answerText.length > 6 ? b.answerText.slice(0, 6) + '…' : b.answerText;
        ctx.fillText(displayText, drawX, drawY);
      }

      ctx.restore();
    }

    // ── Confetti (multi-shape particles) ───────────────────
    for (const c of state.confetti) {
      ctx.save();
      ctx.globalAlpha = c.life / c.maxLife;
      ctx.fillStyle = c.color;
      ctx.translate(c.x, c.y);
      ctx.rotate(((c.rotation ?? 0) + state.time * 200) * (Math.PI / 180));
      const s = c.size / 2;
      if (c.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.9, s * 0.6);
        ctx.lineTo(-s * 0.9, s * 0.6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(-s, -s, c.size, c.size);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }, [getTheme]);

  useEffect(() => {
    const id = setInterval(draw, 1000 / 60);
    return () => clearInterval(id);
  }, [draw]);

  useEffect(() => {
    const id = setInterval(() => {
      setFloatingScores((prev) =>
        prev.length === 0
          ? prev
          : prev
              .map((f) => ({ ...f, y: f.y - 1.2, life: f.life - 1 }))
              .filter((f) => f.life > 0)
      );
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (gameOver || !currentQuestion) return;
    const checkRespawn = () => {
      const state = gameStateRef.current;
      if (state.balloons.length === 0 && state.questionsPool.length > 0) {
        spawnBalloons();
      }
    };
    const id = setInterval(checkRespawn, 500);
    return () => clearInterval(id);
  }, [gameOver, currentQuestion, spawnBalloons]);

  const restart = useCallback(() => {
    gameStateRef.current = {
      balloons: [],
      confetti: [],
      nextBalloonId: 0,
      comboCount: 0,
      lastPopTime: 0,
      time: 0,
      questionsPool: gameStateRef.current.questionsPool,
      windScale: 1,
    };
    setScore(0);
    setLives(3);
    setRound(1);
    setGameOver(false);
    setCurrentQuestion(null);
    setCombo(0);
    setComboDisplay('');
    setStreakBonus(0);
    setBestCombo(0);
    setScreenShake(false);
    setFloatingScores([]);
    setPowerUp(null);
    setCorrectPops(0);
    setTotalAttempts(0);
    if (gameStateRef.current.questionsPool.length > 0) {
      spawnBalloons();
    }
  }, [spawnBalloons]);

  return (
    <div
      className="game-card overflow-hidden bg-white border border-gray-200"
      style={screenShake ? { animation: 'balloon-pop-shake 0.5s ease-out' } : undefined}
    >
      <style>{`
        @keyframes balloon-pop-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-12px); }
          30% { transform: translateX(12px); }
          45% { transform: translateX(-8px); }
          60% { transform: translateX(8px); }
          75% { transform: translateX(-4px); }
        }
      `}</style>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4 text-gray-900">
          <span className="text-sm font-bold">Score {score}</span>
          <span className="text-sm font-bold">Round {round}</span>
          <span>{Array.from({ length: 3 }, (_, i) => (i < lives ? '❤️' : '🖤')).join('')}</span>
          {combo > 1 && (
            <span className="text-sm font-bold text-purple-600">{comboDisplay}</span>
          )}
          {streakBonus > 0 && (
            <span className="text-sm font-bold text-amber-600">+{streakBonus} streak</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-elite btn-elite-ghost text-sm"
        >
          Exit
        </button>
      </div>

      {currentQuestion && (
        <div className="px-4 py-2 bg-purple-50 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">{currentQuestion.question}</p>
          <p className="text-xs text-gray-600 mt-1">Click the correct answer balloon!</p>
        </div>
      )}

      <div className="relative bg-white">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full max-w-full h-auto cursor-crosshair border-b border-gray-200 touch-none"
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {floatingScores.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {floatingScores.map((f) => (
              <div
                key={f.id}
                className="absolute font-black text-lg whitespace-nowrap transition-opacity duration-75"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  color: f.color,
                  opacity: f.life / f.maxLife,
                  textShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {f.text}
              </div>
            ))}
          </div>
        )}

        {showTutorial && !gameOver && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20"
            onClick={() => setShowTutorial(false)}
          >
            <div className="bg-white rounded-xl p-6 max-w-xs mx-4 text-center shadow-xl">
              <p className="text-lg font-bold text-gray-900 mb-2">Tap the correct answer balloon!</p>
              <div className="flex justify-center gap-2 mb-4">
                <span className="animate-bounce">👇</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>👇</span>
              </div>
              <p className="text-sm text-gray-600">Or drag through multiple balloons to pop them</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowTutorial(false); }}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {powerUp && powerUp.type !== 'extra_life' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-bold text-amber-800">
            {powerUp.type === 'freeze_wind' && '❄️ Wind Frozen'}
            {powerUp.type === 'double_points' && '2× Points!'}
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20">
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center max-w-sm mx-4">
              <h3 className="text-xl font-bold mb-2 text-gray-900">Game Over</h3>
              <p className="text-2xl font-black text-purple-600 mb-4">{score} pts</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left space-y-2 text-sm">
                <p><span className="font-semibold">Round reached:</span> {round}</p>
                <p><span className="font-semibold">Best combo:</span> {bestCombo}×</p>
                <p><span className="font-semibold">Accuracy:</span> {totalAttempts > 0 ? Math.round((correctPops / totalAttempts) * 100) : 0}%</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={restart} className="btn-elite btn-elite-primary">
                  Play Again
                </button>
                <button type="button" onClick={onClose} className="btn-elite btn-elite-ghost">
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-center text-xs text-gray-900 mb-1">
          Pop the correct answer! Normal=1pt, Speed=2pt, Golden=5pt. Avoid bombs 💣!
        </p>
        <p className="text-center text-xs text-gray-600">
          Chain pops for combos. Wind drifts balloons. Background changes each round.
        </p>
        <p className="text-center text-xs text-gray-500 mt-1">
          Tap balloons on mobile. 3+ correct in a row = streak bonus! Shake on wrong answer.
        </p>
      </div>
    </div>
  );
}
