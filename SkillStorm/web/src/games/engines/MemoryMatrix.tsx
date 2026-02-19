/* ═══════════════════════════════════════════════════════════
   MEMORY MATRIX ENGINE
   Memory card matching with 3D flip, progressive grid, power-ups
   Used by: Animal Kingdom, Word Memory, Flag Match, etc.

   Game mechanics:
   1. Grid of face-down cards. Flip two to find matches
   2. Cards show emoji pairs based on gameId theme
   3. CSS 3D flip animation using perspective and rotateY
   4. Timer: count-up (easy) or count-down (hard) by grade
   5. Score: points for matches, bonus for speed, multiplier for streaks
   6. Power-ups: Peek (2s), Freeze (5s), Undo (revert wrong pair)
   7. 3 power-ups total across the game
   8. Grid grows each level: 2x2 → 2x3 → 3x4 → 4x4 → 4x5 → 5x6
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { playSound } from '../SoundEngine';
import { shuffleArray } from '../questionBank';
import type { Grade } from '../questionBank';
import { getGameById } from '../../engine/gameData';

type CardTheme = 'animals' | 'space' | 'food' | 'art' | 'flags';
export type Difficulty = 'easy' | 'medium' | 'hard';

const CARD_SETS: Record<CardTheme, string[]> = {
  animals: ['🐶', '🐱', '🐼', '🦁', '🐸', '🐧', '🦊', '🐰', '🐻', '🦋', '🐙', '🦄'],
  space: ['🚀', '🌍', '🌙', '⭐', '🪐', '🛸', '☄️', '🌌', '🔭', '👽', '🛰️', '🌟'],
  food: ['🍕', '🍔', '🌮', '🍣', '🍩', '🍎', '🍪', '🧁', '🍓', '🍌', '🥑', '🍇'],
  art: ['🎨', '🖼️', '🎭', '🎪', '🎵', '🎹', '🎺', '🎸', '🥁', '🎯', '🎲', '🃏'],
  flags: ['🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵', '🇨🇦', '🇧🇷', '🇮🇹', '🇪🇸', '🇦🇺', '🇲🇽', '🇰🇷'],
};

/** Progressive grid sizes [rows, cols]: 2x2 → 2x3 → 3x4 → 4x4 → 4x5 → 5x6 */
const GRID_SIZES: [number, number][] = [
  [2, 2],
  [2, 3],
  [3, 4],
  [4, 4],
  [4, 5],
  [5, 6],
];

function getTheme(gameId: string): CardTheme {
  const game = getGameById(gameId);
  if (!game) return 'animals';
  const id = (game.id || '').toLowerCase();
  if (id.includes('animal') || id.includes('kingdom')) return 'animals';
  if (id.includes('space') || id.includes('explorer')) return 'space';
  if (id.includes('flag') || id.includes('match')) return 'flags';
  if (game.subject === 'art' || id.includes('art') || id.includes('ancient')) return 'art';
  return 'food';
}

interface Card {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
}

/** Particle for match effect */
interface MatchParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

/** Single card with 3D flip animation and touch support */
function MemoCard({
  card,
  onClick,
}: {
  card: Card;
  onClick: () => void;
}) {
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    onClick();
  };
  return (
    <div
      onClick={onClick}
      onTouchEnd={handleTouchEnd}
      className="relative cursor-pointer select-none min-h-[80px] touch-none"
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform:
            card.flipped || card.matched ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Card back - face-down */}
        <div
          className="absolute inset-0 rounded-xl border-2 border-gray-200 flex items-center justify-center text-2xl sm:text-3xl font-bold bg-gray-100 text-gray-400 shadow-sm"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(0deg)',
          }}
        >
          ?
        </div>
        {/* Card front - face-up */}
        <div
          className={`absolute inset-0 rounded-xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-sm ${
            card.matched
              ? 'border-green-400 bg-green-50 text-green-800'
              : 'border-gray-300 bg-white text-gray-900'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {card.value}
        </div>
      </div>
    </div>
  );
}

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

/** Difficulty selector shown before game starts */
function DifficultySelector({
  onSelect,
  onClose,
}: {
  onSelect: (d: Difficulty) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
      <p className="text-lg font-bold text-gray-800 mb-4">Select Difficulty</p>
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        <button
          onClick={() => onSelect('easy')}
          className="px-6 py-3 rounded-xl border-2 border-green-300 bg-green-50 text-green-800 font-semibold hover:bg-green-100 transition-colors"
        >
          Easy — More time, slower grid
        </button>
        <button
          onClick={() => onSelect('medium')}
          className="px-6 py-3 rounded-xl border-2 border-blue-300 bg-blue-50 text-blue-800 font-semibold hover:bg-blue-100 transition-colors"
        >
          Medium — Standard
        </button>
        <button
          onClick={() => onSelect('hard')}
          className="px-6 py-3 rounded-xl border-2 border-red-300 bg-red-50 text-red-800 font-semibold hover:bg-red-100 transition-colors"
        >
          Hard — Less time, faster grid
        </button>
      </div>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 text-sm"
      >
        Exit
      </button>
    </div>
  );
}

/** Overlay shown briefly when all pairs are matched before advancing level */
function LevelCompleteOverlay({
  level,
  bonus,
  perfect,
}: {
  level: number;
  bonus: number;
  perfect?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm transition-opacity duration-300">
      {perfect && (
        <div className="text-4xl font-black text-amber-500 mb-2 animate-bounce">
          Perfect! ⭐
        </div>
      )}
      <div className="text-center px-6 py-4 rounded-2xl border-2 border-green-300 bg-green-50 shadow-lg">
        <p className="text-2xl font-bold text-green-800 mb-1">Level {level} Complete!</p>
        <p className="text-green-600">+{bonus} time bonus</p>
      </div>
    </div>
  );
}

/** HUD bar: score, matches, timer, level, streak, power-ups, exit */
function GameHUD({
  score,
  matches,
  moves,
  timeLeft,
  timeTotal,
  level,
  matchStreak,
  countDown,
  powerUps,
  gameOver,
  peekActive,
  freezeActive,
  hasMismatch,
  onPeek,
  onFreeze,
  onExtra,
  onClose,
}: {
  score: number;
  matches: number;
  moves: number;
  timeLeft: number;
  timeTotal: number;
  level: number;
  matchStreak: number;
  countDown: boolean;
  powerUps: { peek: number; freeze: number; extra: number };
  gameOver: boolean;
  peekActive: boolean;
  freezeActive: boolean;
  hasMismatch: boolean;
  onPeek: () => void;
  onFreeze: () => void;
  onExtra: () => void;
  onClose: () => void;
}) {
  const totalPowerUps = powerUps.peek + powerUps.freeze + powerUps.extra;
  const timerPct = timeTotal > 0 ? (timeLeft / timeTotal) * 100 : 100;
  return (
    <div className="border-b border-gray-200 bg-white">
    <div className="flex items-center justify-between flex-wrap gap-3 p-3">
      <div className="flex items-center gap-4 text-gray-900 text-sm flex-wrap">
        <span className="font-bold">Score: {score}</span>
        <span>Matches: {matches}</span>
        <span>Moves: {moves}</span>
        <span
          className={
            countDown && timeLeft <= 10 ? 'text-red-600 font-semibold' : ''
          }
        >
          Time: {timeLeft}s
        </span>
        <span>Level {level + 1}</span>
        <span className="text-blue-600">Streak: {matchStreak}×</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onPeek}
          disabled={powerUps.peek <= 0 || gameOver || peekActive}
          className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-900 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Briefly show all cards"
        >
          💡 Hint ({powerUps.peek})
        </button>
        <button
          onClick={onFreeze}
          disabled={powerUps.freeze <= 0 || gameOver || freezeActive}
          className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-900 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ⏸ Freeze ({powerUps.freeze})
        </button>
        <button
          onClick={onExtra}
          disabled={!hasMismatch || powerUps.extra <= 0 || gameOver}
          className="px-2 py-1 rounded border border-gray-200 bg-white text-gray-900 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ↩ Undo ({powerUps.extra})
        </button>
        <span className="text-xs text-gray-500">Power-ups: {totalPowerUps}/3</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded border border-gray-200 bg-white text-gray-900 text-sm hover:bg-gray-50 transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
    {countDown && !freezeActive && (
      <div className="h-1.5 bg-gray-200 overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${timerPct}%`,
            background: timerPct > 30 ? '#10b981' : timerPct > 10 ? '#f59e0b' : '#ef4444',
          }}
        />
      </div>
    )}
    </div>
  );
}

/** Game over / victory screen with stats and play again */
function GameOverScreen({
  won,
  score,
  totalMoves,
  totalMatches,
  timeTaken,
  onPlayAgain,
  onClose,
}: {
  won: boolean;
  score: number;
  totalMoves: number;
  totalMatches: number;
  timeTaken: number;
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  const minMoves = totalMatches * 2;
  const accuracy = totalMoves > 0 ? Math.round((minMoves / totalMoves) * 100) : 100;
  return (
    <div className="text-center py-8 px-4">
      <p className="text-2xl font-bold text-gray-900 mb-3">
        {won ? '🎉 You Won!' : "Time's Up!"}
      </p>
      <p className="text-3xl font-black mb-4" style={{ color: '#10b981' }}>
        {score} pts
      </p>
      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left max-w-xs mx-auto space-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Total moves:</span> {totalMoves}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Accuracy:</span> {accuracy}%
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Time taken:</span> {timeTaken}s
        </p>
      </div>
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={onPlayAgain}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 font-medium hover:bg-gray-50 transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 font-medium hover:bg-gray-50 transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}

const PEEK_DURATION_MS = 2000;  // Peek shows all cards for 2 seconds
const FREEZE_DURATION_MS = 5000; // Freeze pauses timer for 5 seconds
const MISMATCH_DELAY_MS = 800;   // Delay before unflipping non-matching pair
const PREVIEW_PHASE_MS = 2000;   // Preview shows all cards face-up at level start

/** Time limit per level (seconds). Base values; difficulty multiplies these. */
const LEVEL_TIME_BASE: Record<number, number> = {
  0: 30,
  1: 45,
  2: 60,
  3: 75,
  4: 90,
  5: 120,
};

const DIFFICULTY_TIME_MULT: Record<Difficulty, number> = {
  easy: 1.5,
  medium: 1,
  hard: 0.7,
};

const DIFFICULTY_GRID_OFFSET: Record<Difficulty, number> = {
  easy: 0,   // Start at smallest grid, progress slower
  medium: 0,
  hard: 1,   // Skip first grid size for harder start
};

function getLevelTime(levelIdx: number, difficulty: Difficulty): number {
  const base = LEVEL_TIME_BASE[Math.min(levelIdx, 5)] ?? 60;
  return Math.round(base * DIFFICULTY_TIME_MULT[difficulty]);
}

/** Difficulty progression: combo bonus multiplier per consecutive match */
const COMBO_BONUS_PER_MATCH = 25;

/** Hint/Peek duration - briefly show all cards */
const HINT_DURATION_MS = 1500;

export function MemoryMatrix({ gameId, grade, onClose, onRoundEnd }: Props) {
  const theme = useMemo(() => getTheme(gameId), [gameId]);
  const cardset = CARD_SETS[theme];
  const countDown = grade === '6-8' || grade === '9-12';

  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [level, setLevel] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const totalMovesRef = useRef(0);
  const totalMatchesRef = useRef(0);
  const [matchStreak, setMatchStreak] = useState(0);
  const [previewPhase, setPreviewPhase] = useState(true);
  const [shake, setShake] = useState(false);
  const [powerUps, setPowerUps] = useState({ peek: 1, freeze: 1, extra: 1 });
  const [freezeActive, setFreezeActive] = useState(false);
  const [peekActive, setPeekActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const lastMismatchRef = useRef<number[] | null>(null);
  const mismatchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelAdvancedRef = useRef(false);
  const consecutiveMatchesRef = useRef(0);
  const particleIdRef = useRef(0);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const levelCompleteBonusRef = useRef(0);
  const [matchParticles, setMatchParticles] = useState<MatchParticle[]>([]);

  const diff = difficulty ?? 'medium';
  const gridOffset = DIFFICULTY_GRID_OFFSET[diff];
  const effectiveLevel = Math.max(0, level + gridOffset);
  const [rows, cols] = GRID_SIZES[Math.min(effectiveLevel, GRID_SIZES.length - 1)];
  const initialTime = getLevelTime(level, diff);
  const [timeLeft, setTimeLeft] = useState(countDown ? initialTime : 0);

  const timerActive = !gameOver && !freezeActive && !peekActive && !previewPhase;
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      if (countDown) {
        setTimeLeft(t => {
          if (t <= 1) {
            setGameOver(true);
            return 0;
          }
          return t - 1;
        });
      } else {
        setTimeLeft(t => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive, countDown]);

  const initLevel = useCallback(
    (levelIndex?: number) => {
      if (!difficulty) return;
      levelAdvancedRef.current = false;
      lastMismatchRef.current = null;
      consecutiveMatchesRef.current = 0;
      if (mismatchTimeoutRef.current) {
        clearTimeout(mismatchTimeoutRef.current);
        mismatchTimeoutRef.current = null;
      }
      const idx = levelIndex ?? level;
      const gridOff = DIFFICULTY_GRID_OFFSET[difficulty];
      const effIdx = Math.max(0, idx + gridOff);
      const [r, c] = GRID_SIZES[Math.min(effIdx, GRID_SIZES.length - 1)];
      const count = (r * c) / 2;
      const values = shuffleArray(cardset.slice(0, Math.min(count, cardset.length)));
      const pairs = [...values, ...values];
      const shuffled = shuffleArray(pairs).map((v, i) => ({
        id: i,
        value: v,
        flipped: true,
        matched: false,
      }));
      setCards(shuffled);
      setFlipped([]);
      setMoves(0);
      if (idx === 0) {
        totalMovesRef.current = 0;
        totalMatchesRef.current = 0;
      }
      setPreviewPhase(true);
      const init = getLevelTime(idx, difficulty);
      setTimeLeft(countDown ? init : 0);
      setGameOver(false);
      setTimeout(() => {
        setCards((c) => c.map((x) => ({ ...x, flipped: x.matched })));
        setPreviewPhase(false);
      }, PREVIEW_PHASE_MS);
    },
    [level, cardset, countDown, difficulty]
  );

  useEffect(() => {
    if (difficulty) initLevel(0);
  }, [difficulty]);

  const startGame = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setLevel(0);
    setScore(0);
    setMatches(0);
    setMoves(0);
    totalMovesRef.current = 0;
    totalMatchesRef.current = 0;
    setMatchStreak(0);
    setPowerUps({ peek: 1, freeze: 1, extra: 1 });
    setShowLevelComplete(false);
  }, []);

  const usePeek = useCallback(() => {
    if (powerUps.peek <= 0 || gameOver) return;
    setPowerUps(p => ({ ...p, peek: p.peek - 1 }));
    setPeekActive(true);
    setCards(c => c.map(x => ({ ...x, flipped: true })));
    setTimeout(() => {
      setCards(c => c.map(x => ({ ...x, flipped: x.matched })));
      setPeekActive(false);
    }, HINT_DURATION_MS);
  }, [powerUps.peek, gameOver]);

  /** Spawn match particles at card center */
  const spawnMatchParticles = useCallback((cardIds: number[]) => {
    const particles: MatchParticle[] = [];
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
    cardIds.forEach((_, idx) => {
      const baseX = 50 + (idx % 2) * 100;
      const baseY = 50 + Math.floor(idx / 2) * 80;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + Math.random();
        const v = 2 + Math.random() * 4;
        particles.push({
          id: particleIdRef.current++,
          x: baseX,
          y: baseY,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 2,
          life: 1,
          color: colors[i % colors.length],
          size: 4 + Math.random() * 4,
        });
      }
    });
    setMatchParticles(prev => [...prev, ...particles]);
  }, []);

  const matchParticleRef = useRef<number>(0);
  useEffect(() => {
    if (matchParticles.length === 0) return;
    const animate = () => {
      setMatchParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.12,
            life: p.life - 0.025,
          }))
          .filter(p => p.life > 0);
        return updated;
      });
      matchParticleRef.current = requestAnimationFrame(animate);
    };
    matchParticleRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(matchParticleRef.current);
  }, [matchParticles.length]);

  const useFreeze = useCallback(() => {
    if (powerUps.freeze <= 0 || gameOver) return;
    setPowerUps(p => ({ ...p, freeze: p.freeze - 1 }));
    setFreezeActive(true);
    setTimeout(() => setFreezeActive(false), FREEZE_DURATION_MS);
  }, [powerUps.freeze, gameOver]);

  const useExtra = useCallback(() => {
    if (powerUps.extra <= 0 || gameOver) return;
    const pair = lastMismatchRef.current;
    if (!pair || pair.length !== 2) return;
    setPowerUps(p => ({ ...p, extra: p.extra - 1 }));
    if (mismatchTimeoutRef.current) {
      clearTimeout(mismatchTimeoutRef.current);
      mismatchTimeoutRef.current = null;
    }
    setCards(c =>
      c.map(x =>
        x.id === pair[0] || x.id === pair[1] ? { ...x, flipped: false } : x
      )
    );
    setFlipped([]);
    lastMismatchRef.current = null;
  }, [powerUps.extra, gameOver]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  }, []);

  const handleCardClick = useCallback(
    (id: number) => {
      if (gameOver || peekActive || previewPhase) return;
      const card = cards.find(c => c.id === id);
      if (!card || card.matched || card.flipped) return;
      if (flipped.length >= 2) return;

      playSound('card_flip');
      setMoves((m) => m + 1);
      totalMovesRef.current += 1;
      setCards(c => c.map(x => (x.id === id ? { ...x, flipped: true } : x)));
      const newFlipped = [...flipped, id];

      if (flipped.length === 1) {
        const firstId = flipped[0];
        const firstCard = cards.find(c => c.id === firstId);
        if (firstCard && firstCard.value === card.value) {
          playSound('correct');
          setCards(c =>
            c.map(x =>
              x.id === firstId || x.id === id ? { ...x, matched: true } : x
            )
          );
          const newStreak = matchStreak + 1;
          const multiplier = 1 + newStreak * 0.5;
          const baseScore = 50 + Math.floor(timeLeft * 0.3);
          const comboBonus = newStreak >= 2 ? COMBO_BONUS_PER_MATCH * (newStreak - 1) : 0;
          const bonus = Math.floor(baseScore * multiplier) + comboBonus;
          setScore(s => s + bonus);
          setMatches(m => m + 1);
          totalMatchesRef.current += 1;
          setMatchStreak(newStreak);
          setFlipped([]);
          spawnMatchParticles([firstId, id]);
        } else {
          playSound('wrong');
          consecutiveMatchesRef.current = 0;
          setMatchStreak(0);
          triggerShake();
          lastMismatchRef.current = [firstId, id];
          setFlipped(newFlipped);
          mismatchTimeoutRef.current = setTimeout(() => {
            setCards(c =>
              c.map(x =>
                x.id === firstId || x.id === id ? { ...x, flipped: false } : x
              )
            );
            setFlipped([]);
            lastMismatchRef.current = null;
            mismatchTimeoutRef.current = null;
          }, MISMATCH_DELAY_MS);
        }
      } else {
        setFlipped(newFlipped);
      }
    },
    [cards, flipped, gameOver, matchStreak, timeLeft, peekActive, previewPhase, spawnMatchParticles, triggerShake]
  );

  const allMatched = cards.length > 0 && cards.every(c => c.matched);
  useEffect(() => {
    if (allMatched && cards.length > 0 && !levelAdvancedRef.current) {
      levelAdvancedRef.current = true;
      const timeBonus = countDown
        ? Math.floor(timeLeft * 2)
        : Math.floor(timeLeft * 0.5);
      levelCompleteBonusRef.current = timeBonus;
      setShowLevelComplete(true);
      const newScore = score + timeBonus;
      setScore(s => s + timeBonus);
      onRoundEnd?.(level + 1, newScore);
      const nextLevel = Math.min(level + 1, GRID_SIZES.length);
      if (nextLevel >= GRID_SIZES.length) {
        setTimeout(() => {
          setShowLevelComplete(false);
          setGameOver(true);
        }, 1500);
      } else {
        setLevel(nextLevel);
        setTimeout(() => {
          setShowLevelComplete(false);
          initLevel(nextLevel);
        }, 1200);
      }
    }
  }, [allMatched, timeLeft, initLevel, level, countDown, score, onRoundEnd]);

  const hasMismatch =
    flipped.length === 2 &&
    (() => {
      const [a, b] = flipped.map(id => cards.find(c => c.id === id));
      return a && b && a.value !== b.value;
    })();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pairCount = (rows * cols) / 2;
  const minMovesForLevel = pairCount * 2;
  const perfectLevel = allMatched && moves === minMovesForLevel && pairCount > 0;
  const totalTimeTaken = countDown ? (initialTime - timeLeft) : timeLeft;

  if (difficulty === null) {
    return (
      <div className="game-card overflow-hidden bg-white border border-gray-200">
        <DifficultySelector onSelect={startGame} onClose={onClose} />
      </div>
    );
  }

  return (
    <div className="game-card overflow-hidden bg-white border border-gray-200">
      <style>{`
        @keyframes memory-shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
        }
      `}</style>
      <GameHUD
        score={score}
        matches={matches}
        moves={moves}
        timeLeft={timeLeft}
        timeTotal={initialTime}
        level={level}
        matchStreak={matchStreak}
        countDown={countDown}
        powerUps={powerUps}
        gameOver={gameOver}
        peekActive={peekActive}
        freezeActive={freezeActive}
        hasMismatch={!!hasMismatch}
        onPeek={usePeek}
        onFreeze={useFreeze}
        onExtra={useExtra}
        onClose={onClose}
      />

      <div className="p-4 sm:p-6 relative">
        {gameOver ? (
          <GameOverScreen
            won={allMatched && effectiveLevel >= GRID_SIZES.length - 1}
            score={score}
            totalMoves={totalMovesRef.current}
            totalMatches={totalMatchesRef.current}
            timeTaken={totalTimeTaken}
            onPlayAgain={() => {
              startGame(diff);
              setShowLevelComplete(false);
              levelAdvancedRef.current = false;
              setTimeout(() => initLevel(0), 50);
            }}
            onClose={onClose}
          />
        ) : (
          <div
            className={`relative transition-transform ${shake ? 'animate-[memory-shake_0.4s_ease-out]' : ''}`}
          >
            {matchParticles.length > 0 && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                {matchParticles.map(p => (
                  <div
                    key={p.id}
                    className="absolute rounded-full transition-opacity duration-75"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: p.size,
                      height: p.size,
                      marginLeft: -p.size / 2 + p.x,
                      marginTop: -p.size / 2 + p.y,
                      background: p.color,
                      opacity: p.life,
                    }}
                  />
                ))}
              </div>
            )}
            {showLevelComplete && (
              <LevelCompleteOverlay
                level={level + 1}
                bonus={levelCompleteBonusRef.current}
                perfect={perfectLevel}
              />
            )}
            <div
              className="grid gap-2 sm:gap-3 mx-auto max-w-2xl"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              aspectRatio: `${cols} / ${rows}`,
              perspective: '1200px',
            }}
          >
            {cards.map(card => (
              <MemoCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
