/* ═══════════════════════════════════════════════════════════
   COLOR MATCH GAME — Stroop Effect
   Multiple match modes: Classic, Word, Shape
   Combo system, progressive difficulty, visual effects, detailed stats
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';

interface ColorMatchGameProps {
  onClose: () => void;
}

type GameMode = 'classic' | 'word' | 'shape';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'] as const;
type ColorName = (typeof COLORS)[number];

const COLOR_MAP: Record<ColorName, string> = {
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  purple: '#9333ea',
  orange: '#ea580c',
  pink: '#ec4899',
  cyan: '#06b6d4',
};

const GAME_DURATION = 60;
const BASE_TIME_MS = 3000;
const MIN_TIME_MS = 800;
const INITIAL_COLORS = 4;
const MAX_COLORS = 8;

interface GameStats {
  totalAnswers: number;
  correctAnswers: number;
  totalResponseTime: number;
  bestStreak: number;
}

function pickRandom<T>(arr: T[]): T {
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

function getShapeSVG(color: string, size: number = 60) {
  const shapes = [
    <circle key="circle" cx={size / 2} cy={size / 2} r={size / 3} fill={color} />,
    <rect key="square" x={size / 6} y={size / 6} width={size * 2 / 3} height={size * 2 / 3} fill={color} />,
    <polygon key="triangle" points={`${size / 2},${size / 6} ${size / 6},${size * 5 / 6} ${size * 5 / 6},${size * 5 / 6}`} fill={color} />,
    <polygon key="diamond" points={`${size / 2},${size / 6} ${size * 5 / 6},${size / 2} ${size / 2},${size * 5 / 6} ${size / 6},${size / 2}`} fill={color} />,
  ];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

export default function ColorMatchGame({ onClose }: ColorMatchGameProps) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<GameMode>('classic');
  const [currentWord, setCurrentWord] = useState<ColorName | null>(null);
  const [currentTextColor, setCurrentTextColor] = useState<ColorName | null>(null);
  const [currentShape, setCurrentShape] = useState<React.ReactNode | null>(null);
  const [roundTarget, setRoundTarget] = useState<ColorName | null>(null);
  const [colorsInPlay, setColorsInPlay] = useState<ColorName[]>(COLORS.slice(0, INITIAL_COLORS));
  const [roundTime, setRoundTime] = useState(BASE_TIME_MS);
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [flashEffect, setFlashEffect] = useState<'green' | 'red' | null>(null);
  const [shakeEffect, setShakeEffect] = useState(false);
  const [scorePopup, setScorePopup] = useState<number | null>(null);
  const [stats, setStats] = useState<GameStats>({
    totalAnswers: 0,
    correctAnswers: 0,
    totalResponseTime: 0,
    bestStreak: 0,
  });
  
  const roundRef = useRef(0);
  const roundTimerRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const getRoundTarget = useCallback(
    (word: ColorName, textColor: ColorName): ColorName => {
      if (mode === 'classic' || mode === 'shape') return textColor;
      if (mode === 'word') return word;
      return textColor;
    },
    [mode]
  );

  const nextRound = useCallback(() => {
    const word = pickRandom(colorsInPlay);
    let textColor = pickRandom(colorsInPlay);
    while (textColor === word) textColor = pickRandom(colorsInPlay);

    const target = getRoundTarget(word, textColor);
    setCurrentWord(word);
    setCurrentTextColor(textColor);
    setRoundTarget(target);
    
    if (mode === 'shape') {
      setCurrentShape(getShapeSVG(COLOR_MAP[textColor]));
    } else {
      setCurrentShape(null);
    }

    const time = Math.max(
      MIN_TIME_MS,
      BASE_TIME_MS - (roundRef.current > 0 ? Math.min(roundRef.current * 25, BASE_TIME_MS - MIN_TIME_MS) : 0)
    );
    setRoundTimeLeft(time);
    setRoundTime(time);
    questionStartTimeRef.current = Date.now();
    roundRef.current++;
    
    // Progressive difficulty: decrease timer every 5 rounds
    if (roundRef.current % 5 === 0 && roundRef.current > 0) {
      setRoundTime((t) => Math.max(MIN_TIME_MS, t - 80));
    }
    
    // Progressive difficulty: add colors every 8 rounds
    if (roundRef.current % 8 === 0 && roundRef.current > 0 && colorsInPlay.length < MAX_COLORS) {
      const next = COLORS.find((c) => !colorsInPlay.includes(c));
      if (next) setColorsInPlay((prev) => [...prev, next]);
    }
  }, [colorsInPlay, mode, getRoundTarget]);

  const handleChoice = useCallback(
    (choice: ColorName) => {
      if (gameOver || !roundTarget) return;
      if (roundTimerRef.current) {
        window.clearInterval(roundTimerRef.current);
        roundTimerRef.current = 0;
      }
      
      const responseTime = Date.now() - questionStartTimeRef.current;
      const correct = choice === roundTarget;
      
      setStats((prev) => ({
        totalAnswers: prev.totalAnswers + 1,
        correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
        totalResponseTime: prev.totalResponseTime + responseTime,
        bestStreak: Math.max(prev.bestStreak, correct ? combo + 1 : combo),
      }));

      if (correct) {
        const newCombo = combo + 1;
        const mult = Math.min(5, 1 + Math.floor(newCombo / 3));
        const points = 10 * mult;
        setCombo(newCombo);
        setMultiplier(mult);
        setScore((s) => s + points);
        setFeedback('correct');
        setFlashEffect('green');
        setScorePopup(points);
        setTimeout(() => setFlashEffect(null), 300);
        setTimeout(() => setScorePopup(null), 1000);
      } else {
        setCombo(0);
        setMultiplier(1);
        setFeedback('wrong');
        setFlashEffect('red');
        setShakeEffect(true);
        setTimeout(() => setFlashEffect(null), 300);
        setTimeout(() => setShakeEffect(false), 500);
      }
      
      setTimeout(() => {
        setFeedback(null);
        nextRound();
      }, 500);
    },
    [gameOver, roundTarget, combo, nextRound]
  );

  useEffect(() => {
    if (!started || gameOver) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started || gameOver || !currentWord) return;
    roundTimerRef.current = window.setInterval(() => {
      setRoundTimeLeft((t) => {
        if (t <= 100) {
          if (roundTimerRef.current) {
            clearInterval(roundTimerRef.current);
            roundTimerRef.current = 0;
          }
          setCombo(0);
          setMultiplier(1);
          setFeedback('wrong');
          setStats((prev) => ({
            ...prev,
            totalAnswers: prev.totalAnswers + 1,
          }));
          return 0;
        }
        return t - 100;
      });
    }, 100);
    return () => {
      if (roundTimerRef.current) {
        clearInterval(roundTimerRef.current);
        roundTimerRef.current = 0;
      }
    };
  }, [started, gameOver, currentWord]);

  useEffect(() => {
    if (!started || gameOver) return;
    if (roundTimeLeft === 0 && currentWord) {
      setTimeout(() => nextRound(), 500);
    }
  }, [roundTimeLeft, currentWord, started, gameOver, nextRound]);

  useEffect(() => {
    if (!started || gameOver) return;
    nextRound();
  }, [started, gameOver, nextRound]);

  const handleStart = () => {
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setRoundTime(BASE_TIME_MS);
    setColorsInPlay(COLORS.slice(0, INITIAL_COLORS));
    setRoundTimeLeft(0);
    setStats({
      totalAnswers: 0,
      correctAnswers: 0,
      totalResponseTime: 0,
      bestStreak: 0,
    });
    roundRef.current = 0;
    if (roundTimerRef.current) {
      clearInterval(roundTimerRef.current);
      roundTimerRef.current = 0;
    }
    setStarted(true);
  };

  const choices = shuffle([...colorsInPlay]);
  const accuracy = stats.totalAnswers > 0 
    ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100) 
    : 0;
  const avgResponseTime = stats.totalAnswers > 0
    ? Math.round(stats.totalResponseTime / stats.totalAnswers)
    : 0;

  return (
    <div 
      ref={containerRef}
      className={`game-card bg-white border border-gray-200 text-gray-900 relative overflow-hidden transition-all duration-300 ${
        shakeEffect ? 'animate-pulse' : ''
      } ${combo >= 9 ? 'ring-4 ring-yellow-400 ring-opacity-75' : combo >= 6 ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''}`}
    >
      {/* Flash overlay */}
      {flashEffect && (
        <div
          className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-300 ${
            flashEffect === 'green' ? 'bg-green-400 opacity-40' : 'bg-red-400 opacity-40'
          }`}
          style={{ animation: 'fadeOut 0.3s ease-out' }}
        />
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-xl font-bold text-gray-900">Color Match</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-900 relative z-10">
        <span>
          Score: <strong>{score}</strong>
        </span>
        <span>
          Time: <strong>{timeLeft}s</strong>
        </span>
        {combo > 0 && (
          <span className="relative">
            <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg transform scale-110 transition-transform">
              COMBO ×{multiplier}
            </span>
            {scorePopup && (
              <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-green-600 font-bold text-lg animate-bounce">
                +{scorePopup}
              </span>
            )}
          </span>
        )}
        <span>
          Streak: <strong>{combo}</strong>
        </span>
      </div>

      {!started ? (
        <div className="space-y-4 relative z-10">
          <p className="text-gray-700">
            Stroop test: Match colors based on the selected mode. Build combos for multipliers!
          </p>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-sm">
            <p className="font-medium text-gray-900 mb-1">Modes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>Classic</strong> — Match the color the text is written in (ignore the word).
              </li>
              <li>
                <strong>Word</strong> — Match the word meaning (ignore the text color).
              </li>
              <li>
                <strong>Shape</strong> — Match the color of the displayed shape.
              </li>
            </ul>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Mode</label>
            <div className="flex gap-2 flex-wrap">
              {(['classic', 'word', 'shape'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`btn-elite text-sm ${mode === m ? 'btn-elite-primary' : 'btn-elite-ghost'}`}
                >
                  {m === 'classic' && 'Classic'}
                  {m === 'word' && 'Word'}
                  {m === 'shape' && 'Shape'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-500">
            60 seconds. Combo every 3 correct for a multiplier (up to 5x). More colors unlock every 8 rounds (up to 8 colors).
          </p>
          <button onClick={handleStart} className="btn-elite btn-elite-primary">
            Start
          </button>
        </div>
      ) : gameOver ? (
        <div className="space-y-4 relative z-10">
          <p className="text-xl font-bold text-gray-900">Time&apos;s Up!</p>
          <p className="text-gray-700">
            Final Score: <strong>{score}</strong>
          </p>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-2 text-sm">
            <p className="font-medium text-gray-900 mb-2">Stats:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Accuracy:</span>{' '}
                <strong className="text-gray-900">{accuracy}%</strong>
              </div>
              <div>
                <span className="text-gray-600">Avg Response:</span>{' '}
                <strong className="text-gray-900">{avgResponseTime}ms</strong>
              </div>
              <div>
                <span className="text-gray-600">Best Streak:</span>{' '}
                <strong className="text-gray-900">{stats.bestStreak}</strong>
              </div>
              <div>
                <span className="text-gray-600">Total Answers:</span>{' '}
                <strong className="text-gray-900">{stats.totalAnswers}</strong>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleStart} className="btn-elite btn-elite-primary">
              Play Again
            </button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost">
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Round timer</span>
            <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-100"
                style={{
                  width: `${roundTimeLeft && roundTime ? (roundTimeLeft / roundTime) * 100 : 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-gray-200 min-h-[120px]">
            {mode === 'shape' && currentShape ? (
              <div className="flex items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 60 60">
                  {currentShape}
                </svg>
              </div>
            ) : (
              <div
                className="text-4xl font-bold text-center transition-colors duration-150"
                style={currentTextColor ? { color: COLOR_MAP[currentTextColor] } : undefined}
              >
                {currentWord}
              </div>
            )}
          </div>

          {feedback && (
            <p
              className={`text-center font-semibold text-lg ${
                feedback === 'correct' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong'}
            </p>
          )}

          <p className="text-xs text-gray-500 text-center">
            {mode === 'word'
              ? 'Click the color that matches the WORD'
              : mode === 'shape'
              ? 'Click the color of the SHAPE'
              : 'Click the color of the TEXT'}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            {choices.map((c) => (
              <button
                key={c}
                onClick={() => handleChoice(c)}
                className="btn-elite px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: COLOR_MAP[c],
                  color: c === 'yellow' ? '#1f2937' : '#fff',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Live stats during game */}
          <div className="pt-4 border-t border-gray-200 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Accuracy: <strong>{accuracy}%</strong></span>
              <span>Avg Time: <strong>{avgResponseTime}ms</strong></span>
              <span>Best Streak: <strong>{stats.bestStreak}</strong></span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeOut {
          from { opacity: 0.4; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
