/* ═══════════════════════════════════════════════════════════
   SPEED QUIZ / BRAIN ARENA ENGINE — ELITE EDITION
   Used by: SAT Word Arena, Brain Arena, Flash Fact Frenzy, Speed Multiplication
   Features: rapid-fire quiz, circular timer, streak bonuses,
   lifeline power-ups, themed backgrounds, level progression
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestion, getRandomQuestion, type Grade, type Question } from '../questionBank';
import { sfxCorrect, sfxWrong, sfxGameOver, sfxStreak, sfxLevelUp, sfxPop } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
type ThemeId = 'sat_word_arena' | 'flash_fact_frenzy' | 'speed_multiplication' | 'brain_arena' | 'default';
type Lifeline = '5050' | 'freeze' | 'skip';

interface ThemeConfig {
  accent: string; glow: string;
  bg1: string; bg2: string;
  cardBg: string; cardBorder: string;
}

/* ─── Theme Configs ─────────────────────────────────────── */
const themes: Record<ThemeId, ThemeConfig> = {
  sat_word_arena:       { accent: '#f59e0b', glow: 'rgba(245,158,11,0.3)', bg1: '#fffbeb', bg2: '#fef3c7', cardBg: '#fffbeb', cardBorder: '#fde68a' },
  flash_fact_frenzy:    { accent: '#06b6d4', glow: 'rgba(6,182,212,0.3)',  bg1: '#ecfeff', bg2: '#cffafe', cardBg: '#ecfeff', cardBorder: '#a5f3fc' },
  speed_multiplication: { accent: '#3b82f6', glow: 'rgba(59,130,246,0.3)', bg1: '#eff6ff', bg2: '#dbeafe', cardBg: '#eff6ff', cardBorder: '#bfdbfe' },
  brain_arena:          { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.3)', bg1: '#f5f3ff', bg2: '#ede9fe', cardBg: '#f5f3ff', cardBorder: '#ddd6fe' },
  default:              { accent: '#3b82f6', glow: 'rgba(59,130,246,0.3)', bg1: '#eff6ff', bg2: '#dbeafe', cardBg: '#eff6ff', cardBorder: '#bfdbfe' },
};

function getTheme(gameId: string): ThemeId {
  if (gameId in themes) return gameId as ThemeId;
  return 'default';
}

function getSubject(gameId: string): 'math' | 'vocabulary' | undefined {
  if (gameId === 'sat_word_arena') return 'vocabulary';
  if (gameId === 'speed_multiplication') return 'math';
  return undefined;
}

const LIFELINE_DATA: Record<Lifeline, { emoji: string; name: string }> = {
  '5050': { emoji: '🎯', name: '50/50' },
  freeze: { emoji: '❄️', name: 'Freeze' },
  skip: { emoji: '⏭️', name: 'Skip' },
};

/* ─── Component ─────────────────────────────────────────── */
export function SpeedQuiz({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const themeId = getTheme(gameId);
  const subject = getSubject(gameId);
  const theme = themes[themeId];

  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [highScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_sq`) || '0'));
  const [lifelines, setLifelines] = useState<Record<Lifeline, number>>({ '5050': 1, freeze: 1, skip: 1 });
  const [frozen, setFrozen] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<Set<string>>(new Set());

  const timerDuration = Math.max(3, 8 - (level - 1) * 0.25);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const timerRef = useRef<number | undefined>(undefined);
  const flashRef = useRef<number | undefined>(undefined);
  const answeredRef = useRef(false);
  const gameOverRef = useRef(false);

  answeredRef.current = answered;
  gameOverRef.current = gameOver;

  /* ─── Load question ─────────────────────────── */
  const loadQuestion = useCallback(() => {
    const q = subject === 'math' ? generateMathQuestion(grade) : getRandomQuestion(grade, subject);
    setQuestion(q);
    setAnswered(false);
    setSelectedOpt(null);
    setHiddenOptions(new Set());
    setFrozen(false);
    setTimeLeft(Math.max(3, 8 - (level - 1) * 0.25));
  }, [grade, subject, level]);

  /* ─── Wrong handler ─────────────────────────── */
  const handleWrong = useCallback(() => {
    if (answeredRef.current) return;
    setAnswered(true);
    setFlash('wrong');
    sfxWrong();
    setStreak(0);
    setLives(l => {
      const next = l - 1;
      if (next <= 0) {
        setGameOver(true);
        sfxGameOver();
      }
      return next;
    });
    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => {
      setFlash(null);
      if (!gameOverRef.current) loadQuestion();
    }, 500);
  }, [loadQuestion]);

  useEffect(() => {
    if (gameOver) return;
    loadQuestion();
  }, [gameOver, level, loadQuestion]);

  /* ─── Timer ─────────────────────────────────── */
  useEffect(() => {
    if (gameOver || answered || !question || frozen) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0.05) {
          clearInterval(timerRef.current);
          handleWrong();
          return 0;
        }
        return t - 0.05;
      });
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [question, answered, gameOver, handleWrong, frozen]);

  /* ─── Answer handler ────────────────────────── */
  const handleAnswer = (selected: string) => {
    if (answered) return;
    setAnswered(true);
    setSelectedOpt(selected);
    if (timerRef.current) clearInterval(timerRef.current);

    if (selected === question!.answer) {
      setFlash('correct');
      sfxCorrect();
      const streakBonus = Math.min(streak * 2, 30);
      const timeBonus = Math.round(timeLeft * 2);
      const points = 10 + streakBonus + timeBonus;
      setScore(s => {
        const ns = s + points;
        if (ns > highScore) localStorage.setItem(`sz_hs_${gameId}_sq`, String(ns));
        return ns;
      });
      setStreak(s => {
        const ns = s + 1;
        if (ns > bestStreak) setBestStreak(ns);
        return ns;
      });
      if (streak + 1 >= 5) sfxStreak();
      setTotalAnswered(t => t + 1);
      setQuestionsAnswered(q => {
        const nq = q + 1;
        if (nq >= 5) {
          setLevel(l => l + 1);
          sfxLevelUp();
          // Grant lifelines on level up
          if ((level + 1) % 3 === 0) {
            setLifelines(ll => ({ ...ll, '5050': ll['5050'] + 1, freeze: ll.freeze + 1, skip: ll.skip + 1 }));
          }
          return 0;
        }
        return nq;
      });
    } else {
      setFlash('wrong');
      sfxWrong();
      setStreak(0);
      setTotalAnswered(t => t + 1);
      setLives(l => {
        const next = l - 1;
        if (next <= 0) { setGameOver(true); sfxGameOver(); }
        return next;
      });
    }

    if (flashRef.current) clearTimeout(flashRef.current);
    flashRef.current = window.setTimeout(() => {
      setFlash(null);
      if (!gameOverRef.current) loadQuestion();
    }, 500);
  };

  /* ─── Lifelines ─────────────────────────────── */
  const useLifeline = (kind: Lifeline) => {
    if (lifelines[kind] <= 0 || answered || !question) return;
    setLifelines(ll => ({ ...ll, [kind]: ll[kind] - 1 }));
    sfxPop();

    if (kind === '5050') {
      const wrongOpts = question.options.filter(o => o !== question.answer);
      const toHide = wrongOpts.slice(0, Math.ceil(wrongOpts.length / 2));
      setHiddenOptions(new Set(toHide));
    } else if (kind === 'freeze') {
      setFrozen(true);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => {
        setFrozen(false);
      }, 5000);
    } else if (kind === 'skip') {
      loadQuestion();
    }
  };

  const restart = () => {
    setScore(0); setLevel(1); setStreak(0); setBestStreak(0); setLives(3);
    setGameOver(false); setQuestionsAnswered(0); setTotalAnswered(0);
    setLifelines({ '5050': 1, freeze: 1, skip: 1 });
    setHiddenOptions(new Set());
  };

  const streakLabel = streak >= 15 ? 'LEGENDARY' : streak >= 10 ? 'UNSTOPPABLE' : streak >= 5 ? 'ON FIRE' : null;
  const timerPct = timeLeft / timerDuration;
  const timerColor = timerPct > 0.5 ? theme.accent : timerPct > 0.25 ? '#f97316' : '#ef4444';

  /* ─── Game Over ─────────────────────────────── */
  if (gameOver) {
    return (
      <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${theme.accent}30` }}>
        <div className="p-8 flex flex-col items-center justify-center min-h-[500px]" style={{ background: `linear-gradient(180deg, ${theme.bg1}, ${theme.bg2})` }}>
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Game Over</h2>
          <p className="text-4xl font-black mb-1" style={{ color: theme.accent }}>{score} pts</p>
          <div className="flex gap-4 text-sm text-gray-500 mb-1">
            <span>Level {level}</span>
            <span>•</span>
            <span>{totalAnswered} answered</span>
            <span>•</span>
            <span>Best streak: {bestStreak}🔥</span>
          </div>
          {score >= highScore && score > 0 && <p className="text-xs font-bold text-amber-500 mb-4">NEW HIGH SCORE!</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main UI ───────────────────────────────── */
  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${theme.accent}30` }}>
      {/* Flash overlay */}
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-150 z-50 ${flash ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: flash === 'correct' ? 'rgba(16,185,129,0.1)' : flash === 'wrong' ? 'rgba(239,68,68,0.12)' : 'transparent' }}
      />

      {/* ── HUD ────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${theme.accent}08` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          {streak > 0 && (
            <span className={`text-xs font-black ${streak >= 5 ? 'animate-pulse' : ''}`} style={{ color: streak >= 5 ? '#f59e0b' : theme.accent }}>
              {streak}🔥 {streakLabel && `(${streakLabel})`}
            </span>
          )}
          <span className="text-xs">{Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
      </div>

      {/* ── Progress bar ──────────────────────────── */}
      <div className="h-1 bg-gray-100">
        <div className="h-full rounded-r transition-all" style={{
          width: `${(questionsAnswered / 5) * 100}%`,
          background: theme.accent,
        }} />
      </div>

      {/* ── Main Area ─────────────────────────────── */}
      <div className="p-6 flex flex-col items-center gap-6" style={{
        background: `linear-gradient(180deg, ${theme.bg1}, ${theme.bg2})`,
        minHeight: '440px',
      }}>
        {/* Timer ring + question */}
        <div className="relative">
          <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={timerColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - timerPct)}`}
              style={{
                transition: frozen ? 'none' : 'stroke-dashoffset 0.05s linear',
                filter: `drop-shadow(0 0 ${timerPct < 0.3 ? 14 : 8}px ${theme.glow})`,
              }}
            />
          </svg>
          {frozen && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-4xl animate-pulse">❄️</div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg md:text-xl font-bold text-gray-800 px-8 max-w-[190px] leading-snug">
              {question?.text}
            </p>
          </div>
        </div>

        {/* Lifelines */}
        <div className="flex gap-2">
          {(Object.keys(LIFELINE_DATA) as Lifeline[]).map(kind => (
            <button key={kind} onClick={() => useLifeline(kind)}
              disabled={lifelines[kind] <= 0 || answered}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                lifelines[kind] > 0 ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-700' : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              {LIFELINE_DATA[kind].emoji} {LIFELINE_DATA[kind].name}
              {lifelines[kind] > 0 && <span className="ml-1 text-gray-400">×{lifelines[kind]}</span>}
            </button>
          ))}
        </div>

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {question?.options.map((opt, i) => {
            const isHidden = hiddenOptions.has(opt);
            const isSelected = selectedOpt === opt;
            const isCorrectOpt = opt === question.answer;
            const showResult = answered && (isSelected || isCorrectOpt);

            return (
              <button key={`${opt}-${i}`} disabled={answered || isHidden}
                onClick={() => handleAnswer(opt)}
                className={`py-4 px-4 rounded-xl font-bold text-sm transition-all duration-200 border ${
                  isHidden ? 'opacity-20 cursor-not-allowed' :
                  showResult && isCorrectOpt ? 'bg-green-50 border-green-300 text-green-700 scale-105' :
                  showResult && isSelected && !isCorrectOpt ? 'bg-red-50 border-red-300 text-red-600 scale-95' :
                  'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }`}
                style={!showResult && !isHidden ? { boxShadow: `0 2px 8px ${theme.glow}` } : undefined}
              >
                {opt}
                {showResult && isCorrectOpt && ' ✓'}
                {showResult && isSelected && !isCorrectOpt && ' ✗'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">
        Answer before time runs out • 5 correct = level up • Streaks = bonus points
      </div>
    </div>
  );
}
