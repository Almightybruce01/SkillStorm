/* ═══════════════════════════════════════════════════════════════════════════════
   REACTION TEST — Elite Arcade Edition
   Canvas-based • Space Bar Primary • 5 Test Modes • 10 Rounds • Full Analytics
   Color Change | Target Appear | Sequence | Audio React | Stroop Test
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface ReactionTestProps {
  onClose: () => void;
}

type TestMode =
  | 'color'
  | 'target'
  | 'sequence'
  | 'audio'
  | 'stroop';
type Phase =
  | 'menu'
  | 'countdown'
  | 'wait'
  | 'ready'
  | 'result'
  | 'early'
  | 'summary';

const ROUNDS = 10;
const COUNTDOWN_DURATION = 4000; // 3, 2, 1, GO!
const BASE_MIN_WAIT = 1800;
const BASE_MAX_WAIT = 4500;
const EARLY_PENALTY_MS = 500;
const STROOP_COLORS = ['RED', 'GREEN', 'BLUE', 'YELLOW'] as const;
const STROOP_KEYS: Record<string, string> = { r: 'RED', g: 'GREEN', b: 'BLUE', y: 'YELLOW' };
const STROOP_COLOR_HEX: Record<string, string> = {
  RED: '#ef4444',
  GREEN: '#22c55e',
  BLUE: '#3b82f6',
  YELLOW: '#eab308',
};

interface RoundResult {
  reactionMs: number | null;
  early?: boolean;
  stroopWrong?: boolean;
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

interface LeaderboardEntry {
  mode: string;
  avg: number;
  best: number;
  timestamp: number;
}

const STORAGE_KEY = 'reaction_test_leaderboard';

const MODE_LABELS: Record<TestMode, string> = {
  color: 'Color',
  target: 'Target',
  sequence: 'Sequence',
  audio: 'Audio',
  stroop: 'Stroop',
};

function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLeaderboard(mode: string, avg: number, best: number) {
  const entries = getLeaderboard();
  entries.unshift({
    mode,
    avg: Math.round(avg),
    best: Math.round(best),
    timestamp: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 20)));
}

function getFeedbackColor(ms: number): string {
  if (ms <= 200) return '#22c55e'; // green - fast
  if (ms <= 350) return '#eab308'; // yellow - average
  return '#ef4444'; // red - slow
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sqDiffs = arr.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

export default function ReactionTest({ onClose }: ReactionTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<TestMode>('color');
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [countdownValue, setCountdownValue] = useState(3);
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });
  const [sequenceNumbers, setSequenceNumbers] = useState<number[]>([]);
  const [nextSequence, setNextSequence] = useState(1);
  const [stroopWord, setStroopWord] = useState('');
  const [stroopColor, setStroopColor] = useState('');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashAlpha, setFlashAlpha] = useState(0);
  const [elapsedBar, setElapsedBar] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bestTimes, setBestTimes] = useState<Record<string, number>>(() => getBestTimes());

  const gameRef = useRef({
    readyAt: 0,
    waitTimeoutId: 0,
    audioTimeoutId: 0,
    countdownStart: 0,
    elapsedStart: 0,
    animationId: 0,
  });

  const validResults = results.filter((r) => r.reactionMs !== null && !r.early && !r.stroopWrong) as {
    reactionMs: number;
  }[];
  const times = validResults.map((r) => r.reactionMs);
  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const bestMs = times.length ? Math.min(...times) : 0;
  const worstMs = times.length ? Math.max(...times) : 0;
  const medianMs = median(times);
  const stdDev = standardDeviation(times);

  const getMinWait = useCallback(() => {
    const roundIdx = round;
    const reduction = Math.min(roundIdx * 120, 900);
    return Math.max(600, BASE_MIN_WAIT - reduction);
  }, [round]);

  const getMaxWait = useCallback(() => {
    const roundIdx = round;
    const reduction = Math.min(roundIdx * 150, 1200);
    return Math.max(1000, BASE_MAX_WAIT - reduction);
  }, [round]);

  const spawnParticles = useCallback((x: number, y: number, color: string) => {
    const newP: Particle[] = [];
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random();
      const speed = 2 + Math.random() * 4;
      newP.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
    setParticles((p) => [...p, ...newP]);
  }, []);

  const startRound = useCallback(() => {
    gameRef.current.readyAt = 0;
    setReactionMs(null);
    setPhase('countdown');
    setCountdownValue(3);
    setCountdownProgress(0);
    setFlashAlpha(0);
    setElapsedBar(0);
    gameRef.current.countdownStart = performance.now();
    playSound('countdown');
  }, []);

  const beginWait = useCallback(() => {
    setPhase('wait');
    const minW = getMinWait();
    const maxW = getMaxWait();
    const waitMs = minW + Math.random() * (maxW - minW);
    gameRef.current.waitTimeoutId = window.setTimeout(() => {
      gameRef.current.readyAt = performance.now();
      gameRef.current.elapsedStart = performance.now();
      setPhase('ready');

      if (mode === 'color') {
        playSound('correct');
        setFlashAlpha(1);
      } else if (mode === 'target') {
        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          const r = Math.min(rect.width, rect.height) * 0.25;
          const angle = Math.random() * Math.PI * 2;
          setTargetPos({
            x: cx + Math.cos(angle) * r * (0.5 + Math.random() * 0.5),
            y: cy + Math.sin(angle) * r * (0.5 + Math.random() * 0.5),
          });
        }
        playSound('pop');
      } else if (mode === 'sequence') {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        for (let i = nums.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        setSequenceNumbers(nums);
        setNextSequence(1);
        playSound('powerup');
      } else if (mode === 'audio') {
        playSound('go');
      } else if (mode === 'stroop') {
        const word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        let ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        while (ink === word) ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
        setStroopWord(word);
        setStroopColor(ink);
      }
    }, waitMs);
  }, [mode, getMinWait, getMaxWait]);

  const handleReaction = useCallback(
    (stroopKey?: string) => {
      if (phase !== 'ready') return;

      if (mode === 'stroop') {
        const expected = STROOP_KEYS[stroopKey?.toLowerCase() || ''];
        const correct = expected === stroopColor;
        if (!correct) {
          setReactionMs(null);
          setResults((r) => [...r, { reactionMs: null, stroopWrong: true }]);
          setPhase('result');
          playSound('wrong');
          return;
        }
      }

      const now = performance.now();
      const ms = Math.round(now - gameRef.current.readyAt);
      setReactionMs(ms);
      setResults((r) => [...r, { reactionMs: ms }]);
      setPhase('result');
      if (saveBestTime(mode, ms)) setBestTimes(getBestTimes());
      playSound('correct');
      spawnParticles(
        (containerRef.current?.getBoundingClientRect().width ?? 400) / 2,
        (containerRef.current?.getBoundingClientRect().height ?? 300) / 2,
        getFeedbackColor(ms)
      );
    },
    [phase, mode, stroopColor, spawnParticles]
  );

  const handleEarly = useCallback(() => {
    if (phase === 'wait' || phase === 'countdown') {
      setPhase('early');
      setResults((r) => [
        ...r,
        { reactionMs: null, early: true },
      ]);
      playSound('wrong');
    }
  }, [phase]);

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      if (validResults.length > 0) {
        saveToLeaderboard(mode, avgMs, bestMs);
        setLeaderboard(getLeaderboard());
        if (saveBestTime(mode, bestMs)) setBestTimes(getBestTimes());
      }
      setPhase('summary');
    } else {
      setRound((r) => r + 1);
      startRound();
    }
  }, [round, validResults.length, avgMs, bestMs, mode, startRound]);

  const handleSequenceNumber = useCallback(
    (n: number) => {
      if (phase !== 'ready' || mode !== 'sequence' || n !== nextSequence) return;
      if (n === 10) {
        handleReaction();
      } else {
        setNextSequence((s) => s + 1);
      }
    },
    [phase, mode, nextSequence, handleReaction]
  );

  const handleStart = useCallback(
    (m: TestMode) => {
      setMode(m);
      setPhase('countdown');
      setRound(0);
      setResults([]);
      setLeaderboard(getLeaderboard());
      startRound();
    },
    [startRound]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (phase === 'ready') {
          if (mode === 'stroop') return;
          if (mode === 'sequence') return;
          handleReaction();
        } else if (phase === 'wait' || phase === 'countdown') {
          handleEarly();
        }
      }
      if (phase === 'ready' && mode === 'stroop') {
        const key = e.key?.toLowerCase();
        if (STROOP_KEYS[key]) {
          e.preventDefault();
          handleReaction(key);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, mode, handleReaction, handleEarly]);

  useEffect(() => {
    if (phase === 'countdown') {
      const interval = setInterval(() => {
        const elapsed = performance.now() - gameRef.current.countdownStart;
        const p = Math.min(1, elapsed / COUNTDOWN_DURATION);
        setCountdownProgress(p);
        if (p < 0.25) setCountdownValue(3);
        else if (p < 0.5) {
          setCountdownValue(2);
          playSound('countdown');
        } else if (p < 0.75) setCountdownValue(1);
        else setCountdownValue(0); // GO
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'countdown' && countdownProgress >= 1) {
      setCountdownValue(0);
      playSound('go');
      setPhase('wait');
      beginWait();
    }
  }, [phase, countdownProgress, beginWait]);

  useEffect(() => {
    if (phase === 'ready') {
      const interval = setInterval(() => {
        const elapsed = performance.now() - gameRef.current.elapsedStart;
        setElapsedBar(Math.min(1, elapsed / 3000));
      }, 16);
      return () => clearInterval(interval);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'result' && flashAlpha > 0) {
      const id = setInterval(() => setFlashAlpha((a) => Math.max(0, a - 0.05)), 30);
      return () => clearInterval(id);
    }
  }, [phase, flashAlpha]);

  useEffect(() => {
    const updateParticles = () => {
      setParticles((p) =>
        p
          .map((x) => ({
            ...x,
            x: x.x + x.vx,
            y: x.y + x.vy,
            life: x.life - 0.02,
          }))
          .filter((x) => x.life > 0)
      );
    };
    const id = setInterval(updateParticles, 16);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(gameRef.current.waitTimeoutId);
      clearTimeout(gameRef.current.audioTimeoutId);
    };
  }, []);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    let animId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Gradient background helper
      const drawGradientBg = (top: string, bottom: string) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, top);
        g.addColorStop(1, bottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      };

      if (phase === 'menu') {
        drawGradientBg('#0f172a', '#1e1b4b');
        ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
        ctx.fillRect(20, 20, w - 40, h - 40);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, w - 40, h - 40);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 28px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ REACTION TEST — ELITE', w / 2, 70);
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Press SPACE to react • 10 rounds per mode', w / 2, 100);

        const modes: { key: TestMode; label: string; desc: string }[] = [
          { key: 'color', label: 'Color Change', desc: 'Screen turns green → SPACE' },
          { key: 'target', label: 'Target Appear', desc: 'Circle appears → SPACE' },
          { key: 'sequence', label: 'Sequence (1→10)', desc: 'Tap numbers in order' },
          { key: 'audio', label: 'Audio React', desc: 'Hear beep → SPACE' },
          { key: 'stroop', label: 'Stroop (R/G/B/Y)', desc: 'Press key for ink color' },
        ];
        const startY = 140;
        modes.forEach((m, i) => {
          const y = startY + i * 52;
          const isHover = false;
          ctx.fillStyle = isHover ? '#475569' : '#334155';
          ctx.shadowColor = 'rgba(99, 102, 241, 0.3)';
          ctx.shadowBlur = 8;
          ctx.fillRect(w / 2 - 130, y - 20, 260, 44);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1;
          ctx.strokeRect(w / 2 - 130, y - 20, 260, 44);
          ctx.fillStyle = '#c7d2fe';
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.fillText(m.label, w / 2, y - 2);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px system-ui, sans-serif';
          ctx.fillText(m.desc, w / 2, y + 12);
        });

        ctx.fillStyle = '#64748b';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Leaderboard (click mode to play)', w / 2, h - 120);
        const lb = getLeaderboard().slice(0, 5);
        lb.forEach((e, i) => {
          ctx.fillText(
            `${i + 1}. ${e.mode} — avg ${e.avg}ms best ${e.best}ms`,
            w / 2,
            h - 95 + i * 18
          );
        });
      }

      if (phase === 'countdown') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        const ringProgress = countdownProgress;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 90, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringProgress);
        ctx.stroke();
        ctx.fillStyle = countdownValue === 0 ? '#22c55e' : '#f8fafc';
        ctx.font = countdownValue === 0 ? 'bold 64px system-ui' : 'bold 96px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countdownValue === 0 ? 'GO!' : String(countdownValue), w / 2, h / 2);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui';
        ctx.fillText('Get ready to react!', w / 2, h / 2 + 70);
      }

      if (phase === 'wait') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#475569';
        ctx.font = '24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Wait for it...', w / 2, h / 2);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui';
        ctx.fillText('Round ' + (round + 1) + ' / ' + ROUNDS, w / 2, h / 2 + 40);
        if (times.length > 0) {
          const runAvg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px system-ui';
          ctx.fillText('Avg so far: ' + runAvg + ' ms', w / 2, h / 2 + 70);
        }
        const best = bestTimes[mode];
        if (best) {
          ctx.fillStyle = '#22c55e';
          ctx.font = '13px system-ui';
          ctx.fillText('Best (all-time): ' + best + ' ms', w / 2, h / 2 + 95);
        }
      }

      if (phase === 'ready') {
        if (mode === 'color') {
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(0, 0, w, h);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, w, h);
        }
        if (mode === 'target') {
          const cx = targetPos.x;
          const cy = targetPos.y;
          ctx.fillStyle = '#6366f1';
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        if (mode === 'sequence') {
          ctx.fillStyle = '#f8fafc';
          ctx.font = '18px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Tap numbers 1 → 10 in order', w / 2, 60);
        }
        if (mode === 'audio') {
          ctx.fillStyle = '#f8fafc';
          ctx.font = '28px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Did you hear the beep? Press SPACE!', w / 2, h / 2);
        }
        if (mode === 'stroop') {
          ctx.fillStyle = STROOP_COLOR_HEX[stroopColor] ?? '#fff';
          ctx.font = 'bold 42px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(stroopWord, w / 2, h / 2);
          ctx.fillStyle = '#64748b';
          ctx.font = '14px system-ui';
          ctx.fillText('Press R G B or Y for the COLOR (not the word)', w / 2, h / 2 + 60);
        }

        if (elapsedBar > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(20, h - 30, w - 40, 12);
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(20, h - 30, (w - 40) * elapsedBar, 12);
        }
      }

      if (phase === 'result') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, w, h);
        if (reactionMs !== null) {
          const color = getFeedbackColor(reactionMs);
          ctx.fillStyle = color;
          ctx.font = 'bold 48px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`${reactionMs} ms`, w / 2, h / 2 - 20);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '18px system-ui';
          ctx.fillText(
            reactionMs <= 200 ? 'Lightning!' : reactionMs <= 350 ? 'Solid!' : 'Keep practicing!',
            w / 2,
            h / 2 + 30
          );
        } else {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 28px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('Wrong color key (Stroop)', w / 2, h / 2);
        }
      }

      if (phase === 'early') {
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fca5a5';
        ctx.font = 'bold 32px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Too early!', w / 2, h / 2 - 30);
        ctx.font = '18px system-ui';
        ctx.fillStyle = '#fecaca';
        ctx.fillText('Wait for the color/sound/target before reacting.', w / 2, h / 2 + 20);
        ctx.fillText('This round will not count. Tap Next Round to continue.', w / 2, h / 2 + 50);
      }

      if (phase === 'summary') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('📊 Results', w / 2, 50);

        const bestEver = bestTimes[mode] ?? bestMs;
        const stats = [
          { label: 'Average', value: Math.round(avgMs), color: '#94a3b8' },
          { label: 'Median', value: Math.round(medianMs), color: '#94a3b8' },
          { label: 'Best (run)', value: bestMs, color: '#22c55e' },
          { label: 'Best (all-time)', value: bestEver, color: '#06b6d4' },
          { label: 'Worst', value: worstMs, color: '#ef4444' },
          { label: 'Std Dev', value: Math.round(stdDev), color: '#eab308' },
        ];
        stats.forEach((s, i) => {
          const x = 40 + (i % 3) * ((w - 80) / 3) + (w - 80) / 6;
          const y = 100 + Math.floor(i / 3) * 70;
          ctx.fillStyle = '#334155';
          ctx.fillRect(x - 70, y - 25, 140, 50);
          ctx.fillStyle = s.color;
          ctx.font = '12px system-ui';
          ctx.fillText(s.label, x, y - 5);
          ctx.font = 'bold 18px system-ui';
          ctx.fillText(String(s.value) + (s.label === 'Std Dev' ? '' : ' ms'), x, y + 15);
        });

        const chartH = 120;
        const chartY = h - chartH - 140;
        const chartW = w - 80;
        const chartX = 40;
        if (times.length > 0) {
          const maxT = Math.max(...times, 500);
          ctx.fillStyle = '#334155';
          ctx.fillRect(chartX, chartY, chartW, chartH);
          ctx.strokeStyle = '#475569';
          ctx.strokeRect(chartX, chartY, chartW, chartH);
          times.forEach((t, i) => {
            const barW = chartW / times.length - 4;
            const barH = (t / maxT) * (chartH - 10);
            const x = chartX + 4 + i * (chartW / times.length);
            const y = chartY + chartH - barH;
            ctx.fillStyle = getFeedbackColor(t);
            ctx.fillRect(x, y, barW, barH);
          });
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px system-ui';
          ctx.fillText('Round times (ms)', chartX + chartW / 2 - 40, chartY + chartH + 20);
        }
      }

      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.5})`;
        ctx.fillRect(0, 0, w, h);
      }

      particles.forEach((p) => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [
    phase,
    mode,
    countdownValue,
    countdownProgress,
    targetPos,
    stroopWord,
    stroopColor,
    reactionMs,
    elapsedBar,
    particles,
    flashAlpha,
    round,
    times,
    results,
    validResults.length,
    avgMs,
    medianMs,
    bestMs,
    worstMs,
    stdDev,
    bestTimes,
  ]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (phase !== 'menu') return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = e.clientY - rect.top;
      const startY = 140 - 20;
      const modes: TestMode[] = ['color', 'target', 'sequence', 'audio', 'stroop'];
      for (let i = 0; i < 5; i++) {
        const cy = startY + i * 52 + 22;
        if (y >= cy - 22 && y <= cy + 22) {
          handleStart(modes[i]);
          break;
        }
      }
    },
    [phase, handleStart]
  );

  return (
    <div className="game-card bg-slate-900 border border-slate-700 text-slate-100 overflow-hidden w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2 px-4 py-2 bg-slate-800/50">
        <h2 className="text-lg font-bold text-indigo-300">⚡ Reaction Test — Elite</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm touch-manipulation active:scale-95"
        >
          Close
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full aspect-video min-h-[320px] bg-slate-900"
        onTouchEnd={(e) => {
          if (phase === 'ready') {
            e.preventDefault();
            if (mode === 'stroop') return;
            if (mode === 'sequence') return;
            handleReaction();
          } else if (phase === 'wait' || phase === 'countdown') {
            e.preventDefault();
            handleEarly();
          }
        }}
        style={{ touchAction: phase === 'ready' || phase === 'wait' || phase === 'countdown' ? 'none' : undefined }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-pointer"
          style={{ touchAction: 'none' }}
          onClick={handleCanvasClick}
        />

        {phase === 'ready' && mode === 'sequence' && (
          <div className="absolute inset-0 flex flex-wrap justify-center items-center gap-3 p-6 pt-16 pointer-events-none">
            {sequenceNumbers.map((n, i) => (
              <button
                key={i}
                type="button"
                className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold pointer-events-auto transition-colors touch-manipulation active:scale-95"
                onClick={() => handleSequenceNumber(n)}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {(phase === 'result' || phase === 'early') && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center">
            <button
              onClick={nextRound}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold touch-manipulation active:scale-95"
            >
              {round + 1 >= ROUNDS ? 'See Results' : 'Next Round'}
            </button>
          </div>
        )}

        {phase === 'summary' && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <button
              onClick={() => handleStart(mode)}
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold touch-manipulation active:scale-95"
            >
              Play Again
            </button>
            <button
              onClick={() => setPhase('menu')}
              className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-semibold touch-manipulation active:scale-95"
            >
              Mode Select
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 touch-manipulation active:scale-95"
            >
              Close
            </button>
          </div>
        )}
      </div>

      <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-700">
        {phase === 'menu' && 'Click a mode to start • SPACE or tap to react (R/G/B/Y for Stroop)'}
        {phase === 'countdown' && 'Get ready... Visual countdown: 3, 2, 1, GO!'}
        {phase === 'wait' && 'Don\'t press until you see/hear the stimulus! Difficulty increases each round.'}
        {phase === 'ready' && mode !== 'stroop' && 'Press SPACE or tap now!'}
        {phase === 'ready' && mode === 'stroop' && 'Press R G B or Y for the ink color'}
        {(phase === 'result' || phase === 'early') && 'Click Next Round to continue'}
        {phase === 'summary' && 'Your stats are saved to the leaderboard'}
      </div>
    </div>
  );
}
