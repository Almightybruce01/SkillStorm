/* ═══════════════════════════════════════════════════════════════════════════════
   COLOR MATCH — Elite Canvas-Based Color Game
   5 Modes: Match, Memory, Sequence, Gradient, Stroop
   Timer scoring, combos, particles, color theory education
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

type GameMode = 'match' | 'memory' | 'sequence' | 'gradient' | 'stroop';
type GamePhase = 'menu' | 'playing' | 'transition' | 'stats';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
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

const COLORS: Record<string, ColorRGB> = {
  red: { r: 220, g: 38, b: 38 },
  blue: { r: 37, g: 99, b: 235 },
  green: { r: 22, g: 163, b: 74 },
  yellow: { r: 234, g: 179, b: 8 },
  purple: { r: 147, g: 51, b: 234 },
  orange: { r: 234, g: 88, b: 12 },
  pink: { r: 236, g: 72, b: 153 },
  cyan: { r: 6, g: 182, b: 212 },
};

const COLOR_NAMES = Object.keys(COLORS);
const ROUNDS_PER_LEVEL = 10;
const LEVELS = 5;
const COMBO_MULTIPLIER_CAP = 6;

function rgb(c: ColorRGB): string {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function hex(c: ColorRGB): string {
  return `#${[c.r, c.g, c.b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function luminance(c: ColorRGB): number {
  return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Color theory: complementary (opposite), analogous (adjacent), triadic (120°)
function getComplementary(name: string): string {
  const idx = COLOR_NAMES.indexOf(name);
  if (idx < 0) return name;
  return COLOR_NAMES[(idx + 4) % COLOR_NAMES.length];
}

function getAnalogous(name: string): string[] {
  const idx = COLOR_NAMES.indexOf(name);
  if (idx < 0) return [name];
  return [
    COLOR_NAMES[(idx - 1 + 8) % 8],
    COLOR_NAMES[(idx + 1) % 8],
  ];
}

function getTriadic(name: string): string[] {
  const idx = COLOR_NAMES.indexOf(name);
  if (idx < 0) return [name];
  return [
    COLOR_NAMES[(idx + 3) % 8],
    COLOR_NAMES[(idx + 5) % 8],
  ];
}

export default function ColorMatch({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [mode, setMode] = useState<GameMode>('match');
  const [selectedModeIdx, setSelectedModeIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [level, setLevel] = useState(1);
  const [roundInLevel, setRoundInLevel] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [shakeOffset, setShakeOffset] = useState(0);
  const [animTime, setAnimTime] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flashAlpha, setFlashAlpha] = useState(0);
  const [bestTime, setBestTime] = useState(Number.MAX_SAFE_INTEGER);
  const [roundStartTime, setRoundStartTime] = useState(0);
  const [gameStats, setGameStats] = useState({
    correct: 0,
    total: 0,
    bestStreak: 0,
    bestTime: Number.MAX_SAFE_INTEGER,
  });

  // Mode-specific state
  const [targetColor, setTargetColor] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [stroopWord, setStroopWord] = useState<string | null>(null);
  const [stroopDisplayColor, setStroopDisplayColor] = useState<string | null>(null);
  const [memoryCards, setMemoryCards] = useState<{ name: string; flipped: boolean; matched: boolean }[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [sequenceColors, setSequenceColors] = useState<string[]>([]);
  const [sequenceInput, setSequenceInput] = useState<string[]>([]);
  const [gradientOptions, setGradientOptions] = useState<string[]>([]);
  const [gradientOrder, setGradientOrder] = useState<string[]>([]);

  const highScoreKey = 'colormatch_highscore_' + mode;
  const highScore = parseInt(localStorage.getItem(highScoreKey) || '0', 10);

  const getOptionAtPoint = useCallback((x: number, y: number, w: number, h: number): number => {
    const cx = w / 2;
    const cy = h / 2;
    if (phase === 'menu') {
      MODES.forEach((_, i) => {
        const yPos = 150 + i * 55;
        if (x >= cx - 200 && x <= cx + 200 && y >= yPos - 22 && y <= yPos + 22) {
          return i;
        }
      });
      return -1;
    }
    if (phase === 'stats') return -1;
    if (phase === 'playing') {
      if (mode === 'match' && targetColor && options.length > 0) {
        const cols = Math.ceil(Math.sqrt(options.length));
        const pad = 12;
        const cellW = (w - pad * (cols + 1)) / cols;
        const cellH = 70;
        for (let i = 0; i < options.length; i++) {
          const row = Math.floor(i / cols);
          const col = i % cols;
          const ox = pad + col * (cellW + pad) + cellW / 2;
          const oy = 260 + row * (cellH + pad) + cellH / 2;
          if (x >= ox - cellW / 2 + 6 && x <= ox + cellW / 2 - 6 && y >= oy - cellH / 2 && y <= oy + cellH / 2 - 8) {
            return i;
          }
        }
      } else if (mode === 'stroop' && options.length > 0) {
        const optW = 90;
        const optH = 50;
        const totalW = options.length * optW + (options.length - 1) * 10;
        let startX = cx - totalW / 2 + optW / 2 + 5;
        for (let i = 0; i < options.length; i++) {
          const ox = startX + i * (optW + 10);
          const oy = 260;
          if (x >= ox - optW / 2 && x <= ox + optW / 2 && y >= oy - optH / 2 && y <= oy + optH / 2) {
            return i;
          }
        }
      } else if (mode === 'sequence' && options.length > 0) {
        const optW = 60;
        const startX = cx - (options.length * (optW + 8)) / 2 + optW / 2 + 4;
        for (let i = 0; i < options.length; i++) {
          const ox = startX + i * (optW + 8);
          const oy = 270;
          if (x >= ox - optW / 2 && x <= ox + optW / 2 && y >= oy - 22 && y <= oy + 23) {
            return i;
          }
        }
      } else if (mode === 'gradient' && gradientOptions.length > 0) {
        const remaining = gradientOptions.filter(o => !options.includes(o));
        for (let i = 0; i < remaining.length; i++) {
          const ox = cx - (remaining.length * 55) / 2 + i * 55 + 27;
          const oy = 180;
          if (x >= ox - 25 && x <= ox + 25 && y >= oy - 25 && y <= oy + 25) {
            return i;
          }
        }
      } else if (mode === 'memory' && memoryCards.length > 0) {
        const cols = 4;
        const cardW = 70;
        const cardH = 90;
        const gap = 10;
        const totalW = cols * cardW + (cols - 1) * gap;
        let ox = cx - totalW / 2 + cardW / 2 + gap / 2;
        for (let i = 0; i < memoryCards.length; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cardX = ox + col * (cardW + gap);
          const cardY = 140 + row * (cardH + gap);
          if (x >= cardX - cardW / 2 && x <= cardX + cardW / 2 && y >= cardY - cardH / 2 && y <= cardY + cardH / 2) {
            return i;
          }
        }
      }
    }
    return -2;
  }, [phase, mode, options, targetColor, gradientOptions, gradientOrder, memoryCards]);

  const handleCanvasPointer = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    const x = ((clientX - rect.left) / rect.width) * (canvas.width / dpr);
    const y = ((clientY - rect.top) / rect.height) * (canvas.height / dpr);

    if (phase === 'menu') {
      const idx = getOptionAtPoint(x, y, canvas.width / dpr, canvas.height / dpr);
      if (idx >= 0 && idx < MODES.length) {
        setSelectedModeIdx(idx);
        setMode(MODES[idx].id);
        playSound('click');
      }
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      if (y >= 415 && y <= 465 && x >= cw / 2 - 120 && x <= cw / 2 + 120) {
        setMode(MODES[selectedModeIdx].id);
        setPhase('playing');
        setScore(0);
        setCombo(0);
        setLevel(1);
        setRoundInLevel(0);
        setGameStats({ correct: 0, total: 0, bestStreak: 0, bestTime: Number.MAX_SAFE_INTEGER });
        playSound('countdown');
        startRound();
      }
      return;
    }
    if (phase === 'stats') {
      if (y >= (canvas.height / dpr) - 80 && y <= (canvas.height / dpr) - 40) {
        setPhase('menu');
      }
      return;
    }
    if (phase === 'playing') {
      const idx = getOptionAtPoint(x, y, canvas.width / dpr, canvas.height / dpr);
      if (idx >= 0) {
        setSelectedIdx(idx);
        handleConfirm(idx);
        playSound('click');
      }
    }
  }, [phase, mode, selectedModeIdx, getOptionAtPoint, handleConfirm, startRound]);

  useEffect(() => {
    if (phase === 'stats' && score > highScore) {
      try {
        localStorage.setItem(highScoreKey, String(score));
      } catch {}
    }
  }, [phase, score, highScoreKey, highScore]);

  const MODES: { id: GameMode; label: string; desc: string }[] = [
    { id: 'match', label: 'Color Match', desc: 'Pick the matching color from options' },
    { id: 'memory', label: 'Color Memory', desc: 'Flip cards to find matching pairs' },
    { id: 'sequence', label: 'Color Sequence', desc: 'Remember and repeat the sequence' },
    { id: 'gradient', label: 'Gradient Challenge', desc: 'Order colors lightest to darkest' },
    { id: 'stroop', label: 'Stroop Mode', desc: 'Pick the displayed color, ignore the word' },
  ];

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number, correct: boolean) => {
    const newP: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = correct ? 3 + Math.random() * 4 : 2 + Math.random() * 2;
      newP.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color,
        size: correct ? 4 + Math.random() * 4 : 3 + Math.random() * 2,
      });
    }
    setParticles(prev => [...prev, ...newP]);
  }, []);

  const startRound = useCallback(() => {
    setFeedback(null);
    setRoundStartTime(Date.now());

    if (mode === 'match') {
      const pool = COLOR_NAMES.slice(0, 4 + Math.min(level - 1, 3));
      const target = pick(pool);
      let opts = [target];
      while (opts.length < Math.min(4 + Math.floor(level / 1.5), 8)) {
        const c = pick(COLOR_NAMES);
        if (!opts.includes(c)) opts.push(c);
      }
      setTargetColor(target);
      setOptions(shuffle(opts));
      setSelectedIdx(0);
    } else if (mode === 'stroop') {
      const pool = COLOR_NAMES.slice(0, 4 + Math.min(level - 1, 2));
      const word = pick(pool);
      let display = pick(pool);
      while (display === word) display = pick(pool);
      setStroopWord(word);
      setStroopDisplayColor(display);
      const opts = shuffle([...new Set([word, display, ...pool.slice(0, 2)])]);
      setOptions(opts.slice(0, Math.min(4 + Math.floor(level / 2), 6)));
      setTargetColor(display);
      setSelectedIdx(0);
    } else if (mode === 'sequence') {
      const len = 3 + Math.min(level, 4);
      const seq: string[] = [];
      const pool = COLOR_NAMES.slice(0, 4 + Math.min(level - 1, 2));
      for (let i = 0; i < len; i++) seq.push(pick(pool));
      setSequenceColors(seq);
      setSequenceInput([]);
      setOptions(pool);
      setSelectedIdx(0);
    } else if (mode === 'gradient') {
      const pool = COLOR_NAMES.slice(0, 4 + Math.min(level - 1, 2));
      const opts = shuffle(pool).slice(0, Math.min(4 + Math.floor(level / 2), 6));
      setGradientOptions(opts);
      setGradientOrder([...opts].sort((a, b) => luminance(COLORS[b]) - luminance(COLORS[a])));
      setOptions([]);
    } else if (mode === 'memory') {
      const pairCount = 4 + Math.min(level - 1, 2);
      const pool = shuffle(COLOR_NAMES).slice(0, pairCount);
      const cards = shuffle([...pool, ...pool].map((name, i) => ({
        name,
        flipped: false,
        matched: false,
        id: i,
      })));
      setMemoryCards(cards);
      setMemoryFlipped([]);
    }
  }, [mode, level]);

  const handleConfirm = useCallback((overrideIdx?: number) => {
    if (phase !== 'playing') return;
    const idx = overrideIdx ?? selectedIdx;

    if (mode === 'match' || mode === 'stroop') {
      const choice = options[idx];
      const correct = choice === targetColor;
      const responseTime = Date.now() - roundStartTime;

      setGameStats(prev => ({
        ...prev,
        correct: prev.correct + (correct ? 1 : 0),
        total: prev.total + 1,
        bestStreak: Math.max(prev.bestStreak, correct ? combo + 1 : combo),
        bestTime: correct ? Math.min(prev.bestTime, responseTime) : prev.bestTime,
      }));

      if (correct) {
        const mult = Math.min(COMBO_MULTIPLIER_CAP, 1 + Math.floor((combo + 1) / 2));
        const base = 100;
        const timeBonus = Math.max(0, 50 - Math.floor(responseTime / 100));
        const pts = (base + timeBonus) * mult;
        setScore(s => s + pts);
        setCombo(c => c + 1);
        setFeedback('correct');
        setFlashAlpha(0.5);
        playSound('correct');
        if (combo >= 2) playSound('streak');
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = rect.width / 2;
          const y = rect.height / 2;
          spawnParticles(x, y, hex(COLORS[choice]), 12, true);
        }
      } else {
        setCombo(0);
        setFeedback('wrong');
        setShakeOffset(15);
        playSound('wrong');
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          spawnParticles(rect.width / 2, rect.height / 2, '#dc2626', 8, false);
        }
      }

      setTimeout(() => {
        setFlashAlpha(0);
        setShakeOffset(0);
        const nextRound = roundInLevel + 1;
        if (nextRound >= ROUNDS_PER_LEVEL) {
          if (level >= LEVELS) {
            setPhase('stats');
            playSound('victory');
            const key = 'colormatch_highscore_' + mode;
            const current = parseInt(localStorage.getItem(key) || '0', 10);
            if (score + (correct ? 1 : 0) > current) {
              localStorage.setItem(key, String(score));
            }
          } else {
            setLevel(l => l + 1);
            setRoundInLevel(0);
            setPhase('transition');
            playSound('levelup');
            setTimeout(() => {
              setPhase('playing');
              startRound();
            }, 1500);
          }
        } else {
          setRoundInLevel(nextRound);
          startRound();
        }
      }, 600);
    } else if (mode === 'sequence') {
      const choice = options[idx];
      const nextInput = [...sequenceInput, choice];
      setSequenceInput(nextInput);
      playSound('click');

      if (nextInput.length === sequenceColors.length) {
        const correct = nextInput.every((c, i) => c === sequenceColors[i]);
        const responseTime = Date.now() - roundStartTime;

        setGameStats(prev => ({
          ...prev,
          correct: prev.correct + (correct ? 1 : 0),
          total: prev.total + 1,
          bestStreak: Math.max(prev.bestStreak, correct ? combo + 1 : combo),
          bestTime: correct ? Math.min(prev.bestTime, responseTime) : prev.bestTime,
        }));

        if (correct) {
          const mult = Math.min(5, 1 + Math.floor((combo + 1) / 3));
          const pts = (150 + Math.max(0, 50 - Math.floor(responseTime / 100))) * mult;
          setScore(s => s + pts);
          setCombo(c => c + 1);
          setFeedback('correct');
          setFlashAlpha(0.3);
          playSound('correct');
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            spawnParticles(rect.width / 2, rect.height / 2, '#22c55e', 12, true);
          }
        } else {
          setCombo(0);
          setFeedback('wrong');
          setShakeOffset(15);
          playSound('wrong');
          const canvas = canvasRef.current;
          if (canvas) spawnParticles(canvas.width / 2, canvas.height / 2, '#dc2626', 8, false);
        }

        setTimeout(() => {
          setFlashAlpha(0);
          setShakeOffset(0);
          const nextRound = roundInLevel + 1;
          if (nextRound >= ROUNDS_PER_LEVEL) {
            if (level >= LEVELS) {
              setPhase('stats');
              playSound('victory');
              const key = 'colormatch_highscore_' + mode;
              const hs = parseInt(localStorage.getItem(key) || '0', 10);
              if (score > hs) localStorage.setItem(key, String(score));
            } else {
              setLevel(l => l + 1);
              setRoundInLevel(0);
              setPhase('transition');
              playSound('levelup');
              setTimeout(() => {
                setPhase('playing');
                startRound();
              }, 1500);
            }
          } else {
            setRoundInLevel(nextRound);
            startRound();
          }
        }, 600);
      }
    } else if (mode === 'gradient') {
      // Gradient: selectedIdx is the position we're filling
      // User selects from gradientOptions to place in order
      // Simplified: we show options, user picks lightest first, etc.
      const opts = gradientOptions.filter(o => !options.includes(o));
      if (opts.length === 0) return;
      const choice = opts[idx % opts.length];
      const newOrder = [...options, choice];

      if (newOrder.length >= gradientOrder.length) {
        const correct = newOrder.every((c, i) => c === gradientOrder[i]);
        const responseTime = Date.now() - roundStartTime;

        setGameStats(prev => ({
          ...prev,
          correct: prev.correct + (correct ? 1 : 0),
          total: prev.total + 1,
          bestStreak: Math.max(prev.bestStreak, correct ? combo + 1 : combo),
          bestTime: correct ? Math.min(prev.bestTime, responseTime) : prev.bestTime,
        }));

        if (correct) {
          const mult = Math.min(5, 1 + Math.floor((combo + 1) / 3));
          const pts = (120 + Math.max(0, 40 - Math.floor(responseTime / 100))) * mult;
          setScore(s => s + pts);
          setCombo(c => c + 1);
          setFeedback('correct');
          setFlashAlpha(0.3);
          playSound('correct');
        } else {
          setCombo(0);
          setFeedback('wrong');
          setShakeOffset(15);
          playSound('wrong');
        }

        setTimeout(() => {
          setFlashAlpha(0);
          setShakeOffset(0);
          const nextRound = roundInLevel + 1;
          if (nextRound >= ROUNDS_PER_LEVEL) {
            if (level >= LEVELS) {
              setPhase('stats');
              playSound('victory');
            } else {
              setLevel(l => l + 1);
              setRoundInLevel(0);
              setPhase('transition');
              playSound('levelup');
              setTimeout(() => {
                setPhase('playing');
                startRound();
              }, 1500);
            }
          } else {
            setRoundInLevel(nextRound);
            startRound();
          }
        }, 600);
      } else {
        setOptions(newOrder);
        setSelectedIdx(0);
      }
    } else if (mode === 'memory') {
      // Memory: tap/select flips card
      if (memoryFlipped.length >= 2 || memoryCards[idx]?.matched || memoryCards[idx]?.flipped) return;
      const newFlipped = [...memoryFlipped, idx];
      const newCards = memoryCards.map((c, i) =>
        i === idx ? { ...c, flipped: true } : c
      );
      setMemoryCards(newCards);
      setMemoryFlipped(newFlipped);
      playSound('card_flip');

      if (newFlipped.length === 2) {
        const [a, b] = newFlipped;
        const match = newCards[a].name === newCards[b].name;
        if (match) {
          playSound('card_match');
          setScore(s => s + 150 + combo * 20);
          setCombo(c => c + 1);
          setTimeout(() => {
            setMemoryCards(prev =>
              prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c))
            );
            setMemoryFlipped([]);
            const allMatched = newCards.filter(c => !c.matched).length <= 2;
            if (allMatched) {
              const nextRound = roundInLevel + 1;
              if (nextRound >= ROUNDS_PER_LEVEL && level >= LEVELS) {
                setPhase('stats');
                playSound('victory');
              } else if (nextRound >= ROUNDS_PER_LEVEL) {
                setLevel(l => l + 1);
                setRoundInLevel(0);
                setPhase('transition');
                playSound('levelup');
                setTimeout(() => startRound(), 1500);
              } else {
                setRoundInLevel(nextRound);
                setTimeout(() => startRound(), 800);
              }
            }
          }, 400);
        } else {
          setCombo(0);
          playSound('wrong');
          setTimeout(() => {
            setMemoryCards(prev =>
              prev.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c))
            );
            setMemoryFlipped([]);
          }, 800);
        }
      }
    }
  }, [
    phase,
    mode,
    selectedIdx,
    options,
    targetColor,
    sequenceInput,
    sequenceColors,
    gradientOptions,
    gradientOrder,
    roundInLevel,
    level,
    combo,
    roundStartTime,
    memoryCards,
    memoryFlipped,
    startRound,
    spawnParticles,
  ]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (phase === 'menu') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedModeIdx(i => (i + 1) % MODES.length);
          playSound('click');
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedModeIdx(i => (i - 1 + MODES.length) % MODES.length);
          playSound('click');
        } else if (e.key === ' ') {
          e.preventDefault();
          setMode(MODES[selectedModeIdx].id);
          setPhase('playing');
          setScore(0);
          setCombo(0);
          setLevel(1);
          setRoundInLevel(0);
          setGameStats({ correct: 0, total: 0, bestStreak: 0, bestTime: Number.MAX_SAFE_INTEGER });
          playSound('countdown');
          startRound();
        }
        return;
      }
      if (phase === 'stats') {
        if (e.key === ' ') {
          e.preventDefault();
          setPhase('menu');
        }
        return;
      }
      if (phase === 'playing') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (mode === 'match' || mode === 'stroop') {
            setSelectedIdx(i => (i + 1) % options.length);
          } else if (mode === 'sequence') {
            setSelectedIdx(i => (i + 1) % options.length);
          } else if (mode === 'gradient') {
            const remaining = gradientOptions.filter(o => !options.includes(o));
            setSelectedIdx(i => (i + 1) % Math.max(1, remaining.length));
          } else if (mode === 'memory') {
            setSelectedIdx(i => (i + 1) % memoryCards.length);
          }
          playSound('click');
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (mode === 'match' || mode === 'stroop') {
            setSelectedIdx(i => (i - 1 + options.length) % options.length);
          } else if (mode === 'sequence') {
            setSelectedIdx(i => (i - 1 + options.length) % options.length);
          } else if (mode === 'gradient') {
            const remaining = gradientOptions.filter(o => !options.includes(o));
            setSelectedIdx(i => (i - 1 + remaining.length) % Math.max(1, remaining.length));
          } else if (mode === 'memory') {
            setSelectedIdx(i => (i - 1 + memoryCards.length) % memoryCards.length);
          }
          playSound('click');
        } else if (e.key === ' ') {
          e.preventDefault();
          handleConfirm();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, selectedModeIdx, mode, options, gradientOptions, gradientOrder, memoryCards, handleConfirm, startRound, onClose]);

  // Particle & animation loop
  useEffect(() => {
    let raf: number;
    const loop = () => {
      setAnimTime(t => t + 0.016);
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );
      setFlashAlpha(a => Math.max(0, a - 0.02));
      setShakeOffset(o => (o > 0 ? o * 0.9 : 0));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    const shakeX = feedback === 'wrong' ? (Math.random() - 0.5) * shakeOffset : 0;
    const shakeY = feedback === 'wrong' ? (Math.random() - 0.5) * shakeOffset : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0f0f23');
    bg.addColorStop(0.5, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Flash overlay - green for correct, red for wrong
    if (flashAlpha > 0) {
      ctx.fillStyle = feedback === 'correct'
        ? `rgba(34,197,94,${flashAlpha * 0.7})`
        : `rgba(220,38,38,${flashAlpha * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    const cx = w / 2;
    const cy = h / 2;

    if (phase === 'menu') {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Color Match', cx, 60);

      ctx.font = '16px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Arrow keys to select mode · Space to start', cx, 95);

      MODES.forEach((m, i) => {
        const y = 150 + i * 55;
        const sel = i === selectedModeIdx;
        ctx.fillStyle = sel ? 'rgba(147,51,234,0.4)' : 'rgba(255,255,255,0.05)';
        ctx.beginPath();
        ctx.roundRect(cx - 200, y - 22, 400, 44, 12);
        ctx.fill();
        if (sel) {
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = sel ? '#fff' : '#94a3b8';
        ctx.font = sel ? 'bold 18px system-ui' : '16px system-ui';
        ctx.fillText(m.label, cx, y + 5);
        ctx.font = '12px system-ui';
        ctx.fillStyle = '#64748b';
        ctx.fillText(m.desc, cx, y + 22);
      });

      ctx.fillStyle = '#475569';
      ctx.font = '12px system-ui';
      ctx.fillText(`High Score: ${highScore}`, cx, h - 40);

      // Color theory palette
      const baseY = h - 120;
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Color Theory', cx, baseY - 8);
      const pal = ['red', 'blue', 'green'];
      pal.forEach((c, i) => {
        const x = cx - 80 + i * 80;
        ctx.fillStyle = hex(COLORS[c]);
        ctx.beginPath();
        ctx.arc(x, baseY + 15, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui';
      ctx.fillText('Complementary · Analogous · Triadic', cx, baseY + 55);
    } else if (phase === 'transition') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Level ${level}`, cx, cy);
      ctx.font = '18px system-ui';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Get ready...', cx, cy + 40);
    } else if (phase === 'stats') {
      const acc = gameStats.total > 0 ? Math.round((gameStats.correct / gameStats.total) * 100) : 0;
      const bt = gameStats.bestTime < Number.MAX_SAFE_INTEGER ? gameStats.bestTime : 0;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Game Complete!', cx, 80);
      ctx.fillStyle = '#a78bfa';
      ctx.font = 'bold 36px system-ui';
      ctx.fillText(`Score: ${score}`, cx, 130);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui';
      ctx.fillText('Post-Game Stats', cx, 180);
      ctx.fillText(`Accuracy: ${acc}%`, cx, 220);
      ctx.fillText(`Best Time: ${bt}ms`, cx, 250);
      ctx.fillText(`Best Streak: ${gameStats.bestStreak}`, cx, 280);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui';
      ctx.fillText('Space to return to menu', cx, h - 60);
    } else if (phase === 'playing') {
      // HUD
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${score}`, 20, 35);
      ctx.fillText(`Level ${level}`, 20, 55);
      ctx.fillText(`Round ${roundInLevel + 1}/${ROUNDS_PER_LEVEL}`, 20, 75);
      if (combo > 0) {
        const mult = Math.min(COMBO_MULTIPLIER_CAP, 1 + Math.floor(combo / 2));
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 18px system-ui';
        ctx.fillText(`Combo ×${mult}`, w - 100, 40);
        ctx.font = 'bold 16px system-ui';
      }
      if (highScore > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '14px system-ui';
        ctx.fillText(`Best: ${highScore}`, w - 100, 65);
        ctx.font = 'bold 16px system-ui';
      }

      if (mode === 'match' && targetColor) {
        // Target color display
        ctx.fillStyle = hex(COLORS[targetColor]);
        ctx.beginPath();
        ctx.roundRect(cx - 80, 120, 160, 100, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        options.forEach((opt, i) => {
          const cols = Math.ceil(Math.sqrt(options.length));
          const rows = Math.ceil(options.length / cols);
          const idx = i;
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const pad = 12;
          const cellW = (w - pad * (cols + 1)) / cols;
          const cellH = 70;
          const x = pad + col * (cellW + pad) + cellW / 2;
          const y = 260 + row * (cellH + pad) + cellH / 2;

          ctx.fillStyle = hex(COLORS[opt]);
          ctx.beginPath();
          ctx.roundRect(x - cellW / 2 + 6, y - cellH / 2, cellW - 12, cellH - 8, 12);
          ctx.fill();
          if (i === selectedIdx) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        });
      } else if (mode === 'stroop' && stroopWord && stroopDisplayColor) {
        ctx.fillStyle = hex(COLORS[stroopDisplayColor]);
        ctx.font = 'bold 42px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(stroopWord.toUpperCase(), cx, 180);

        const optW = 90;
        const optH = 50;
        const totalW = options.length * optW + (options.length - 1) * 10;
        let startX = cx - totalW / 2 + optW / 2 + 5;
        options.forEach((opt, i) => {
          const x = startX + i * (optW + 10);
          const y = 260;
          ctx.fillStyle = hex(COLORS[opt]);
          ctx.beginPath();
          ctx.roundRect(x - optW / 2, y - optH / 2, optW, optH, 10);
          ctx.fill();
          if (i === selectedIdx) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        });
      } else if (mode === 'sequence') {
        const showCount = Math.min(sequenceInput.length + 1, sequenceColors.length);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Repeat the sequence', cx, 110);
        sequenceColors.slice(0, showCount).forEach((c, i) => {
          ctx.fillStyle = hex(COLORS[c]);
          ctx.beginPath();
          ctx.arc(cx - (sequenceColors.length * 25) + i * 50, 160, 18, 0, Math.PI * 2);
          ctx.fill();
        });
        sequenceInput.forEach((c, i) => {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = hex(COLORS[c]);
          ctx.beginPath();
          ctx.arc(cx - (sequenceInput.length * 25) + i * 50, 220, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        const optW = 60;
        const startX = cx - (options.length * (optW + 8)) / 2 + optW / 2 + 4;
        options.forEach((opt, i) => {
          const x = startX + i * (optW + 8);
          ctx.fillStyle = hex(COLORS[opt]);
          ctx.beginPath();
          ctx.roundRect(x - optW / 2, 270, optW, 45, 8);
          ctx.fill();
          if (i === selectedIdx) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      } else if (mode === 'gradient' && gradientOptions.length > 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Pick lightest to darkest', cx, 100);
        const remaining = gradientOptions.filter(o => !options.includes(o));
        remaining.forEach((opt, i) => {
          const x = cx - (remaining.length * 55) / 2 + i * 55 + 27;
          const y = 180;
          ctx.fillStyle = hex(COLORS[opt]);
          ctx.beginPath();
          ctx.roundRect(x - 45, y - 30, 50, 50, 10);
          ctx.fill();
          if (i === selectedIdx % remaining.length) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        });
        options.forEach((opt, i) => {
          const x = cx - (gradientOrder.length * 40) / 2 + i * 40 + 20;
          ctx.fillStyle = hex(COLORS[opt]);
          ctx.beginPath();
          ctx.roundRect(x - 18, 260, 36, 36, 6);
          ctx.fill();
        });
      } else if (mode === 'memory' && memoryCards.length > 0) {
        const cols = 4;
        const cardW = 70;
        const cardH = 90;
        const gap = 10;
        const totalW = cols * cardW + (cols - 1) * gap;
        let ox = cx - totalW / 2 + cardW / 2 + gap / 2;
        memoryCards.forEach((card, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = ox + col * (cardW + gap);
          const y = 140 + row * (cardH + gap);
          const sel = i === selectedIdx;
          if (card.matched) {
            ctx.fillStyle = 'rgba(34,197,94,0.3)';
            ctx.beginPath();
            ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
            ctx.fill();
          }
          if (card.flipped || card.matched) {
            ctx.fillStyle = hex(COLORS[card.name]);
            ctx.beginPath();
            ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
            ctx.fill();
          } else {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
            ctx.fill();
            ctx.fillStyle = '#64748b';
            ctx.font = '24px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('?', x, y + 8);
          }
          if (sel) {
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      }

      if (feedback) {
        ctx.fillStyle = feedback === 'correct' ? '#22c55e' : '#dc2626';
        ctx.font = 'bold 24px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(feedback === 'correct' ? '✓ Correct!' : '✗ Wrong', cx, h - 80);
      }
    }

    ctx.restore();
  }, [
    phase,
    mode,
    score,
    combo,
    level,
    roundInLevel,
    selectedIdx,
    selectedModeIdx,
    options,
    targetColor,
    stroopWord,
    stroopDisplayColor,
    sequenceColors,
    sequenceInput,
    gradientOptions,
    gradientOrder,
    memoryCards,
    memoryFlipped,
    feedback,
    gameStats,
    particles,
    flashAlpha,
    shakeOffset,
    highScore,
  ]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0f0f23] rounded-xl overflow-hidden max-w-lg mx-auto">
      <div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0">
        <h2 className="text-lg font-bold text-white">Color Match</h2>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors text-sm font-medium touch-manipulation active:scale-95"
        >
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0 relative" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ width: '100%', height: '100%', maxWidth: '100%' }}
          tabIndex={0}
        />
      </div>
      <div className="p-2 text-center text-xs text-slate-500 shrink-0">
        ↑↓ Select · Space Confirm · Esc Close
      </div>
    </div>
  );
}
