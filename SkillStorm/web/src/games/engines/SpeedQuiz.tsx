/* ═══════════════════════════════════════════════════════════
   SPEED QUIZ ENGINE (~500 lines)
   Rapid-fire quiz: Division Duel, Mental Math Blitz, etc.
   Themes: math=space, vocab=library, science=lab
   Lifelines: 50/50, Skip, Hint | Streak fire | 3 lives
   Enhanced: touch-friendly buttons, answer animations,
   combo multiplier, timer urgency, high score tracking
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getQuestions, shuffleArray, type Grade, type Question } from '../questionBank';
import { getGameById } from '../../engine/gameData';
import { playSound } from '../SoundEngine';

const STATS_KEY = 'speedquiz_stats';
interface QuizStats {
  totalQuestions: number;
  totalCorrect: number;
  bestAccuracy: number;
  bestStreak: number;
  gamesPlayed: number;
}

type QuizSubject = 'math' | 'science' | 'vocabulary';

type Lifeline = 'fifty' | 'skip' | 'hint';

type Theme = {
  bg: string;
  accent: string;
  card: string;
  text: string;
  icon: string;
  particles: string;
};

// Multiple visual themes per subject: math=space, vocab=library, science=lab
const THEMES: Record<QuizSubject, Theme> = {
  math: {
    bg: 'from-indigo-900 via-slate-800 to-indigo-950',
    accent: 'from-violet-500 to-indigo-600',
    card: 'bg-slate-100/90 border-indigo-200',
    text: 'text-slate-800',
    icon: '🚀',
    particles: '⭐',
  },
  vocabulary: {
    bg: 'from-amber-700 via-amber-600 to-amber-800',
    accent: 'from-amber-600 to-orange-500',
    card: 'bg-amber-50/95 border-amber-200',
    text: 'text-amber-900',
    icon: '📚',
    particles: '📖',
  },
  science: {
    bg: 'from-emerald-700 via-teal-700 to-emerald-800',
    accent: 'from-emerald-500 to-teal-600',
    card: 'bg-emerald-50/95 border-emerald-200',
    text: 'text-emerald-900',
    icon: '🔬',
    particles: '⚗️',
  },
};

const QUESTIONS_PER_ROUND = 10;
const BASE_TIME = 10;
const LIVES = 3;
const BASE_POINTS = 100;
const MIN_TOUCH_TARGET = 48;
const HIGH_SCORE_KEY = 'speedquiz_highscore';

const REACTION_MESSAGES = {
  correct: ['Awesome!', 'Great!', 'Perfect!', 'Excellent!', 'Brilliant!'],
  wrong: ['Oops!', 'Try again!', 'Not quite!', 'Close!'],
};

function mapSubject(subject: string): QuizSubject {
  if (subject === 'math') return 'math';
  if (subject === 'science') return 'science';
  return 'vocabulary';
}

function getSubject(gameId: string): QuizSubject {
  const game = getGameById(gameId);
  if (!game) return 'math';
  return mapSubject(game.subject);
}

function getStoredHighScore(): number {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setStoredHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // ignore
  }
}

function getStoredStats(): QuizStats {
  try {
    const s = localStorage.getItem(STATS_KEY);
    if (!s) return { totalQuestions: 0, totalCorrect: 0, bestAccuracy: 0, bestStreak: 0, gamesPlayed: 0 };
    return JSON.parse(s) as QuizStats;
  } catch {
    return { totalQuestions: 0, totalCorrect: 0, bestAccuracy: 0, bestStreak: 0, gamesPlayed: 0 };
  }
}

function updateStoredStats(partial: Partial<QuizStats>, merge = true): void {
  try {
    const current = merge ? getStoredStats() : { totalQuestions: 0, totalCorrect: 0, bestAccuracy: 0, bestStreak: 0, gamesPlayed: 0 };
    const next = { ...current, ...partial };
    localStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

type GameState = 'playing' | 'roundTransition' | 'gameOver';

export function SpeedQuiz({ gameId, grade, onClose, onRoundEnd }: Props) {
  const subject = useMemo(() => getSubject(gameId), [gameId]);
  const theme = THEMES[subject];
  const [gameState, setGameState] = useState<GameState>('playing');
  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [answered, setAnswered] = useState(false);
  const [reaction, setReaction] = useState<'correct' | 'wrong' | null>(null);
  const [reactionMessage, setReactionMessage] = useState<string>('');
  const [answerFlash, setAnswerFlash] = useState<'green' | 'red' | null>(null);
  const [shakingOption, setShakingOption] = useState<number | null>(null);
  const [highScore, setHighScore] = useState(getStoredHighScore);
  const [lifelines, setLifelines] = useState<Record<Lifeline, number>>({
    fifty: 1,
    skip: 1,
    hint: 1,
  });
  const [hintUsed, setHintUsed] = useState(false);
  const [hintClue, setHintClue] = useState<string | null>(null);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  const [options, setOptions] = useState<{ text: string; index: number; hidden: boolean }[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextQuestionRef = useRef<() => void>(() => {});

  const question = questions[currentIndex];

  // Progressive difficulty: timer decreases faster later in round (10s → 6s)
  const questionTime = useMemo(() => {
    const progress = currentIndex / questions.length;
    return Math.max(6, BASE_TIME - Math.floor(progress * 4));
  }, [currentIndex, questions.length]);

  // Difficulty multiplier for visual indicator
  const difficultyLevel = useMemo(() => {
    const progress = currentIndex / questions.length;
    if (progress < 0.3) return 1;
    if (progress < 0.6) return 2;
    return 3;
  }, [currentIndex, questions.length]);

  // Combo multiplier for streaks: 1.0x → 2.5x cap
  const comboMultiplier = useMemo(() => {
    if (streak < 2) return 1;
    return Math.min(2.5, 1 + streak * 0.15);
  }, [streak]);

  const fiftyHiddenIndices = useMemo(() => {
    if (!question || !fiftyUsed) return new Set<number>();
    const wrongIndices = question.options.map((_, i) => i).filter((i) => i !== question.correct);
    const shuffled = shuffleArray(wrongIndices);
    return new Set(shuffled.slice(0, 2));
  }, [question, fiftyUsed]);

  const loadRound = useCallback(() => {
    const subs: QuizSubject[] =
      subject === 'math' ? ['math'] : subject === 'science' ? ['science'] : ['vocabulary'];
    const all: Question[] = [];
    subs.forEach((s) => all.push(...getQuestions(grade, s, QUESTIONS_PER_ROUND * 2)));
    setQuestions(shuffleArray(all).slice(0, QUESTIONS_PER_ROUND));
    setCurrentIndex(0);
    setAnswered(false);
    setReaction(null);
    setAnswerFlash(null);
    setShakingOption(null);
    setRoundScore(0);
    setLifelines({ fifty: 1, skip: 1, hint: 1 });
  }, [grade, subject]);

  useEffect(() => {
    if (gameState === 'playing') {
      loadRound();
    }
  }, [loadRound, round, gameState]);

  useEffect(() => {
    if (!question || answered || gameState !== 'playing') return;
    setTimeLeft(questionTime);

    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    // Start new timer with smooth updates
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setAnswered(true);
          setReaction('wrong');
          setAnswerFlash('red');
          setReactionMessage(REACTION_MESSAGES.wrong[Math.floor(Math.random() * REACTION_MESSAGES.wrong.length)]);
          setLives((l) => Math.max(0, l - 1));
          setStreak(0);
          setTotalAnswered((t) => t + 1);
          setTimeout(() => nextQuestionRef.current(), 1500);
          return 0;
        }
        return Math.max(0, prev - 0.1);
      });
    }, 100);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentIndex, question, answered, questionTime, gameState]);

  const nextQuestion = useCallback(() => {
    setReaction(null);
    setReactionMessage('');
    setAnswered(false);
    setHintUsed(false);
    setHintClue(null);
    setFiftyUsed(false);
    setAnswerFlash(null);
    setShakingOption(null);

    if (currentIndex + 1 >= questions.length) {
      // Round complete - persist high score
      const totalScore = score + roundScore;
      if (totalScore > highScore) {
        setHighScore(totalScore);
        setStoredHighScore(totalScore);
      }
      onRoundEnd?.(round, roundScore);
      setGameState('roundTransition');
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length, round, roundScore, score, highScore, onRoundEnd]);

  nextQuestionRef.current = nextQuestion;

  const startNextRound = useCallback(() => {
    setRound((r) => r + 1);
    setScore(0);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (!question || answered) return;
    const opts = question.options.map((text, index) => ({
      text,
      index,
      hidden: fiftyHiddenIndices.has(index),
    }));
    setOptions(opts);
  }, [question, answered, fiftyHiddenIndices]);

  const handleAnswer = useCallback(
    (choiceIndex: number, e?: React.MouseEvent | React.TouchEvent) => {
      if (e) e.preventDefault();
      if (answered || !question) return;
      const correct = question.correct === choiceIndex;
      const elapsed = questionTime - timeLeft;
      const speedBonus = Math.max(1, 2 - elapsed / questionTime);
      const streakBonus = comboMultiplier;
      const points = Math.round(BASE_POINTS * speedBonus * streakBonus);

      setAnswered(true);
      setReaction(correct ? 'correct' : 'wrong');
      setReactionMessage(
        correct
          ? REACTION_MESSAGES.correct[Math.floor(Math.random() * REACTION_MESSAGES.correct.length)]
          : REACTION_MESSAGES.wrong[Math.floor(Math.random() * REACTION_MESSAGES.wrong.length)]
      );
      setTotalAnswered((t) => t + 1);

      if (correct) {
        setAnswerFlash('green');
        setScore((s) => s + points);
        setRoundScore((rs) => rs + points);
        setTotalCorrect((tc) => tc + 1);
        const newStreak = streak + 1;
        setStreak(newStreak);
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        const nextScore = score + points;
        if (nextScore > highScore) {
          setHighScore(nextScore);
          setStoredHighScore(nextScore);
        }
      } else {
        setAnswerFlash('red');
        setShakingOption(choiceIndex);
        setLives((l) => Math.max(0, l - 1));
        setStreak(0);
      }
      setTimeout(() => setAnswerFlash(null), 400);
      setTimeout(() => setShakingOption(null), 600);
      setTimeout(() => nextQuestionRef.current(), 1500);
    },
    [answered, question, timeLeft, streak, questionTime, bestStreak, comboMultiplier, score, highScore]
  );

  const useLifeline = useCallback(
    (type: Lifeline) => {
      if (answered || lifelines[type] <= 0) return;
      if (type === 'fifty' && question) {
        setFiftyUsed(true);
        setLifelines((l) => ({ ...l, fifty: l.fifty - 1 }));
      } else if (type === 'skip') {
        setLifelines((l) => ({ ...l, skip: l.skip - 1 }));
        setTotalAnswered((t) => t + 1);
        nextQuestionRef.current();
      } else if (type === 'hint' && question) {
        setHintUsed(true);
        const correctOpt = question.options[question.correct];
        const clue =
          correctOpt.length <= 4
            ? `Starts with "${correctOpt[0]}"`
            : `Contains "${correctOpt[Math.floor(correctOpt.length / 2)]}"`;
        setHintClue(clue);
        setLifelines((l) => ({ ...l, hint: l.hint - 1 }));
      }
    },
    [answered, lifelines, question]
  );

  // Check for game over
  useEffect(() => {
    if (lives <= 0 && gameState === 'playing') {
      const finalScore = score + roundScore;
      if (finalScore > highScore) {
        setHighScore(finalScore);
        setStoredHighScore(finalScore);
      }
      setGameState('gameOver');
    }
  }, [lives, gameState, score, roundScore, highScore]);

  // Streak multiplier display
  const streakMultiplier = useMemo(() => {
    if (streak === 0) return '1.0x';
    return `${comboMultiplier.toFixed(1)}x`;
  }, [streak, comboMultiplier]);

  // Timer visual urgency: pulse + glow when low
  const timerUrgency = useMemo(() => {
    const pct = (timeLeft / questionTime) * 100;
    if (pct <= 15) return 'critical';
    if (pct <= 35) return 'warning';
    return 'normal';
  }, [timeLeft, questionTime]);

  // Combo tier for display (e.g. 2-4 = Good, 5-9 = Great, 10+ = Amazing)
  const comboTier = useMemo(() => {
    if (streak >= 10) return { label: 'Amazing!', color: 'text-yellow-300' };
    if (streak >= 5) return { label: 'Great!', color: 'text-orange-300' };
    if (streak >= 2) return { label: 'Good', color: 'text-green-300' };
    return null;
  }, [streak]);

  // High score just broken indicator
  // High score just broken indicator
  const justBrokeHighScore = useMemo(() => {
    return score + roundScore > highScore && highScore > 0 && totalAnswered > 0;
  }, [score, roundScore, highScore, totalAnswered]);

  // Accessibility: ensure touch targets meet minimum size
  const answerButtonStyle = useMemo(
    () => ({
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
    }),
    []
  );

  // Round Transition Screen
  if (gameState === 'roundTransition') {
    return (
      <div className={`game-card overflow-hidden bg-gradient-to-br ${theme.bg} ${theme.text} p-8`}>
        <div className="text-center space-y-6">
          <div className="text-6xl">{theme.icon}</div>
          <h2 className="text-2xl font-bold">Round {round} Complete!</h2>
          <div className="space-y-2 text-lg">
            <div className="flex justify-between items-center">
              <span>Round Score:</span>
              <span className="font-bold">{roundScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>High Score:</span>
              <span className="font-bold text-yellow-400">🏆 {Math.max(highScore, roundScore)}</span>
            </div>
          </div>
          <button onClick={startNextRound} className="btn-elite btn-elite-primary text-lg px-8 py-3">
            Next Round
          </button>
          <button onClick={onClose} className="btn-elite btn-elite-ghost block mx-auto">
            Exit
          </button>
        </div>
      </div>
    );
  }

  // Game Over Screen
  if (gameState === 'gameOver') {
    return (
      <div className={`game-card overflow-hidden bg-gradient-to-br ${theme.bg} ${theme.text} p-8`}>
        <div className="text-center space-y-6">
          <div className="text-6xl">🏁</div>
          <h2 className="text-2xl font-bold">Game Over</h2>
          <div className="space-y-2 text-lg">
            <div className="flex justify-between items-center">
              <span>Final Score:</span>
              <span className="font-bold">{score + roundScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Best Streak:</span>
              <span className="font-bold">{bestStreak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>High Score:</span>
              <span className="font-bold text-yellow-400">🏆 {highScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Rounds Completed:</span>
              <span className="font-semibold">{round - 1}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-elite btn-elite-primary text-lg px-8 py-3">
            Exit
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`game-card bg-gradient-to-br ${theme.bg} ${theme.text} p-6`}>
        <p>Loading questions...</p>
        <button onClick={onClose} className="btn-elite btn-elite-ghost mt-4">
          Exit
        </button>
      </div>
    );
  }

  const timePercent = (timeLeft / questionTime) * 100;
  const streakFireGlow = streak >= 5 ? Math.min(100, streak * 10) : 0;
  const showOnFireBadge = streak >= 10;

  return (
    <div
      className={`game-card overflow-hidden bg-gradient-to-br ${theme.bg} ${theme.text} border border-white/20 relative ${
        streak >= 5 ? 'ring-2 ring-orange-400' : ''
      }`}
      style={{
        boxShadow: streak >= 5 ? `0 0 ${streakFireGlow}px rgba(249, 115, 22, 0.6)` : undefined,
      }}
    >
      {/* Background particles based on theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {Array.from({ length: subject === 'math' ? 15 : 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            {theme.particles}
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="flex items-center justify-between p-3 bg-white/10 border-b border-white/20 relative z-10">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold">Score: {score}</span>
          <span className="text-sm opacity-90">
            Q {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-yellow-300 text-sm">🏆 {highScore}</span>
          <span className="flex items-center gap-1">
            {'❤️'.repeat(lives)}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
              streak >= 3
                ? 'bg-orange-400 text-white shadow-[0_0_12px_rgba(251,146,60,0.8)] animate-pulse'
                : 'bg-white/20'
            }`}
          >
            🔥 {streak}
          </span>
          {streak >= 2 && (
            <span className="text-xs font-semibold opacity-90">
              {streakMultiplier}
            </span>
          )}
          {comboTier && (
            <span className={`text-xs font-bold ${comboTier.color}`}>
              {comboTier.label}
            </span>
          )}
          {justBrokeHighScore && (
            <span className="text-xs font-bold text-yellow-300 animate-pulse">
              🏆 New High Score!
            </span>
          )}
          {showOnFireBadge && (
            <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
              ON FIRE!
            </span>
          )}
        </div>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">
          Exit
        </button>
      </div>

      <div className="p-6 relative z-10">
        {/* Timer bar with visual urgency when low */}
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm opacity-90">Time</span>
              <span
                className={`text-lg font-mono font-bold transition-all ${
                  timerUrgency === 'critical'
                    ? 'text-red-400 animate-pulse'
                    : timerUrgency === 'warning'
                    ? 'text-amber-400'
                    : ''
                }`}
                style={
                  timerUrgency === 'critical'
                    ? {
                        textShadow: '0 0 8px rgba(248,113,113,0.8), 0 0 16px rgba(248,113,113,0.4)',
                      }
                    : undefined
                }
              >
                {Math.ceil(timeLeft)}s
              </span>
            </div>
            <div
              className={`h-3 rounded-full overflow-hidden bg-black/20 ring-1 transition-all ${
                timerUrgency === 'critical' ? 'ring-red-400/80 ring-2 animate-pulse' : 'ring-white/20'
              }`}
            >
              <div
                className={`h-full transition-all duration-100 ${
                  timerUrgency === 'critical'
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : timerUrgency === 'warning'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                }`}
                style={{
                  width: `${timePercent}%`,
                  boxShadow:
                    timerUrgency === 'critical' ? '0 0 12px rgba(239,68,68,0.6)' : undefined,
                }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-70 mb-1">Difficulty</div>
            <div className="flex gap-1">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`w-2 h-2 rounded-full ${
                    level <= difficultyLevel ? 'bg-yellow-400' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lifelines with icons */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => useLifeline('fifty')}
            disabled={answered || lifelines.fifty <= 0 || fiftyUsed}
            className="btn-elite btn-elite-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="50/50 - Remove two wrong answers"
          >
            <span className="mr-1">✂️</span>
            50/50 ({lifelines.fifty})
          </button>
          <button
            onClick={() => useLifeline('skip')}
            disabled={answered || lifelines.skip <= 0}
            className="btn-elite btn-elite-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Skip - Skip this question"
          >
            <span className="mr-1">⏭️</span>
            Skip ({lifelines.skip})
          </button>
          <button
            onClick={() => useLifeline('hint')}
            disabled={answered || lifelines.hint <= 0 || hintUsed}
            className="btn-elite btn-elite-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Hint - Get a clue"
          >
            <span className="mr-1">💡</span>
            Hint ({lifelines.hint})
          </button>
        </div>

        {/* Animated character reactions - correct=green flash, wrong=red shake */}
        <div
          className={`relative flex flex-col items-center gap-6 transition-all ${
            reaction === 'correct' ? 'animate-bounce' : ''
          } ${answerFlash === 'green' ? 'speedquiz-flash-green' : ''} ${
            answerFlash === 'red' ? 'speedquiz-flash-red' : ''
          }`}
          style={{
            animation:
              reaction === 'wrong'
                ? 'speedquiz-shake 0.5s ease-in-out'
                : undefined,
          }}
        >
          <div className="relative">
            <div className="text-6xl transition-transform duration-300">
              {reaction === 'correct' && '🎉'}
              {reaction === 'wrong' && '😢'}
              {!reaction && theme.icon}
            </div>
            {reaction === 'correct' && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-2xl animate-sparkle"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `rotate(${i * 45}deg) translateY(-60px)`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    ✨
                  </div>
                ))}
              </div>
            )}
          </div>

          {reactionMessage && (
            <div
              className={`text-2xl font-bold transition-all ${
                reaction === 'correct' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {reactionMessage}
            </div>
          )}

          <p className={`text-xl font-semibold text-center max-w-xl ${theme.text}`}>
            {question?.question}
          </p>

          {hintClue && (
            <div className="px-4 py-2 rounded-lg bg-yellow-100 border border-yellow-300 text-amber-800 text-sm font-medium animate-pulse">
              💡 Hint: {hintClue}
            </div>
          )}

          {/* Touch-friendly answer buttons: min 48px, preventDefault */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {options
              .filter((o) => !o.hidden)
              .map((o) => (
                <button
                  key={o.index}
                  onClick={(e) => handleAnswer(o.index, e)}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleAnswer(o.index, e);
                  }}
                  disabled={answered}
                  style={{ minHeight: MIN_TOUCH_TARGET }}
                  className={`btn-elite btn-elite-primary py-4 text-left px-4 min-h-[48px] touch-manipulation select-none ${theme.card} border transition-all ${
                    hintUsed && o.index === question.correct ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
                  } disabled:opacity-70 ${
                    answered && o.index === question.correct
                      ? 'ring-2 ring-green-400 bg-green-100'
                      : ''
                  } ${
                    answered && o.index !== question.correct && reaction === 'wrong'
                      ? 'ring-2 ring-red-400 bg-red-50'
                      : ''
                  } ${
                    answerFlash === 'green' && answered && o.index === question.correct
                      ? 'animate-pulse'
                      : ''
                  } ${
                    shakingOption === o.index ? 'speedquiz-shake-button' : ''
                  }`}
                >
                  {o.text}
                </button>
              ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes speedquiz-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes speedquiz-shake-button {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-12px); }
          40% { transform: translateX(12px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes speedquiz-flash-green {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
          50% { box-shadow: 0 0 24px 8px rgba(34, 197, 94, 0.4); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        @keyframes speedquiz-flash-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
          50% { box-shadow: 0 0 24px 8px rgba(239, 68, 68, 0.4); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .speedquiz-flash-green {
          animation: speedquiz-flash-green 0.4s ease-out;
        }
        .speedquiz-flash-red {
          animation: speedquiz-flash-red 0.4s ease-out;
        }
        .speedquiz-shake-button {
          animation: speedquiz-shake-button 0.5s ease-in-out;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.6; }
        }
        @keyframes sparkle {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.5) translateY(-30px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 0.8s ease-out forwards;
        }
        .touch-manipulation {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .speedquiz-answer-correct {
          animation: speedquiz-flash-green 0.4s ease-out;
        }
        .speedquiz-answer-wrong {
          animation: speedquiz-shake 0.5s ease-in-out;
        }
        @keyframes timer-pulse-critical {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }
        .timer-critical-pulse {
          animation: timer-pulse-critical 0.5s ease-in-out infinite;
        }
        @media (hover: none) and (pointer: coarse) {
          .speedquiz-answer-btn {
            padding: 14px 16px;
            min-height: 48px;
          }
        }
      `}</style>
    </div>
  );
}
