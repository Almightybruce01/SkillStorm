/* ═══════════════════════════════════════════════════════════
   WORD BUILDER ENGINE — ENHANCED
   Used by: Sentence Builder Pro, Grammar Gladiator, Essay Builder Rush
   Arrange scrambled words into correct sentence order
   Drag-and-drop + tap support with visual feedback
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Grade } from '../questionBank';
import { sfxClick, sfxCorrect, sfxWrong, sfxGameOver, sfxLevelUp } from '../SoundEngine';

interface Theme { accent: string; bg: string; tile: string; wordBankBg: string; }

const themes: Record<string, Theme> = {
  sentence_builder_pro: { accent: '#8b5cf6', bg: '#0d001a', tile: '#8b5cf6', wordBankBg: '#1a0d2e' },
  grammar_gladiator: { accent: '#f97316', bg: '#1a0a00', tile: '#f97316', wordBankBg: '#2e1a0a' },
  essay_builder_rush: { accent: '#10b981', bg: '#001a0d', tile: '#10b981', wordBankBg: '#0a2e1a' },
  default: { accent: '#3b82f6', bg: '#001a2e', tile: '#3b82f6', wordBankBg: '#0a1a2e' },
};

type Difficulty = 'easy' | 'normal' | 'hard';

interface DifficultyConfig {
  baseTime: number;
  timePerLevel: number;
  minTime: number;
}

const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { baseTime: 20, timePerLevel: 2, minTime: 12 },
  normal: { baseTime: 15, timePerLevel: 1, minTime: 8 },
  hard: { baseTime: 10, timePerLevel: 1, minTime: 5 },
};

interface FloatingScore { id: number; word: string; points: number; life: number; }
interface Achievement { id: number; text: string; life: number; }
interface SentenceTransition { leaving: boolean; entering: boolean; }

const sentenceBank: Record<string, string[]> = {
  'K-2': [
    'The cat sat on the mat',
    'I like to play games',
    'She has a red ball',
    'We go to school every day',
    'He can run very fast',
    'The dog likes to play fetch',
    'My mom makes good food',
    'Birds can fly in the sky',
    'I have two big eyes',
    'The sun is very bright',
  ],
  '3-5': [
    'The quick brown fox jumps over the lazy dog',
    'Scientists discovered a new planet yesterday',
    'Reading books improves your vocabulary skills',
    'The children played happily in the sunny park',
    'Mathematics helps us solve real world problems',
    'Our teacher explained the science experiment clearly',
    'The ocean contains many different species of fish',
    'Exercise keeps your body healthy and strong',
  ],
  '6-8': [
    'The committee decided to postpone the annual conference',
    'Despite the heavy rain the team continued practicing diligently',
    'Photosynthesis is the process by which plants make food',
    'The industrial revolution transformed manufacturing across Europe',
    'Students should develop critical thinking skills early on',
    'The experiment demonstrated a significant correlation between variables',
  ],
  '9-12': [
    'The theoretical framework establishes fundamental principles for analysis',
    'Photosynthesis converts light energy into chemical energy efficiently',
    'Constitutional amendments reflect the evolving values of democratic society',
    'Quantum mechanics challenges our classical understanding of physical reality',
    'Economic indicators suggest a gradual recovery from the recent recession',
    'The philosophical implications of artificial intelligence remain deeply contested',
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function WordBuilder({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const t = themes[gameId] || themes.default;
  const sentences = sentenceBank[grade] || sentenceBank['3-5'];
  const isInitialMount = useRef(true);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [correctSentences, setCorrectSentences] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [bestStreak, setBestStreak] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [, setConsecutiveCorrect] = useState(0);
  const [totalTimePlayed, setTotalTimePlayed] = useState(0);
  const gameStartTimeRef = useRef(Date.now());

  const [scrambled, setScrambled] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const [shakeSlotIdx, setShakeSlotIdx] = useState<number | null>(null);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [sentenceTransition, setSentenceTransition] = useState<SentenceTransition>({ leaving: false, entering: false });
  const [hintHighlight, setHintHighlight] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  // Drag state
  const [draggingWord, setDraggingWord] = useState<string | null>(null);
  const [draggingFromIdx, setDraggingFromIdx] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dropTargetSlot, setDropTargetSlot] = useState<number | null>(null);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const answerAreaRef = useRef<HTMLDivElement>(null);

  const currentSentence = sentences[sentenceIdx % sentences.length];
  const correctWords = currentSentence.split(' ');
  const diffConfig = DIFFICULTY[difficulty];
  const maxTime = Math.max(diffConfig.minTime, diffConfig.baseTime - (level - 1) * diffConfig.timePerLevel);
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const timerRef = useRef<number | undefined>(undefined);
  const uidRef = useRef(0);

  const nextSentence = useCallback(() => {
    setSentenceTransition({ leaving: true, entering: false });
    setTimeout(() => {
      const nextIdx = (sentenceIdx + 1) % sentences.length;
      setSentenceIdx(nextIdx);
      const next = sentences[nextIdx].split(' ');
      setScrambled(shuffle([...next]));
      setSelected([]);
      setTimeLeft(Math.max(diffConfig.minTime, diffConfig.baseTime - level * diffConfig.timePerLevel));
      setHintHighlight(null);
      setSentenceTransition({ leaving: false, entering: true });
      setTimeout(() => setSentenceTransition({ leaving: false, entering: false }), 300);
    }, 250);
  }, [sentenceIdx, sentences, level, diffConfig]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setScrambled(shuffle([...correctWords]));
    }
  }, []);
  useEffect(() => {
    if (!isInitialMount.current && !scrambled.length && correctWords.length) {
      setScrambled(shuffle([...correctWords]));
    }
  }, [currentSentence, correctWords, scrambled.length]);

  useEffect(() => {
    if (gameOver) return;
    timerRef.current = window.setInterval(() => {
      setTotalTimePlayed(t => t + 1);
      setTimeLeft(prev => {
        if (prev <= 1) {
          setLives(l => {
            const nl = l - 1;
            if (nl <= 0) { setGameOver(true); sfxGameOver(); }
            return nl;
          });
          nextSentence();
          return maxTime;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameOver, maxTime, nextSentence]);

  const addFloatingScore = useCallback((word: string, points: number) => {
    const id = ++uidRef.current;
    setFloatingScores(s => [...s, { id, word, points, life: 40 }]);
    const interval = setInterval(() => {
      setFloatingScores(prev => {
        const updated = prev.map(f => f.id === id ? { ...f, life: f.life - 2 } : f).filter(f => f.life > 0);
        if (updated.every(f => f.id !== id)) clearInterval(interval);
        return updated;
      });
    }, 50);
  }, []);

  const addAchievement = useCallback((text: string) => {
    const id = ++uidRef.current;
    setAchievements(a => [...a, { id, text, life: 80 }]);
    const iv = setInterval(() => {
      setAchievements(prev => prev.map(x => x.id === id ? { ...x, life: x.life - 1 } : x).filter(x => x.life > 0));
    }, 50);
    setTimeout(() => clearInterval(iv), 4000);
  }, []);

  const handleWordCorrect = useCallback((word: string) => {
    const basePoints = 10 * level;
    const comboBonus = Math.floor(basePoints * (comboMultiplier - 1));
    const timeBonus = timeLeft > maxTime * 0.4 ? 5 : 0;
    const total = basePoints + comboBonus + timeBonus;
    setScore(s => s + total);
    addFloatingScore(word, total);
    sfxCorrect();
    setConsecutiveCorrect(c => {
      const nc = c + 1;
      const newMultiplier = nc >= 3 ? Math.min(3, Math.floor(nc / 2) + 1) : 1;
      setComboMultiplier(newMultiplier);
      setBestStreak(bs => Math.max(bs, nc));
      if (nc === 5) addAchievement('5 in a row! 🔥');
      if (nc === 10) addAchievement('10 word streak! 🌟');
      return nc;
    });
    setCorrectSentences(c => {
      const nc = c + 1;
      if (nc === 5) addAchievement('5 sentences! 📝');
      if (nc === 10) addAchievement('10 sentences! 🎯');
      if (nc % 3 === 0) { setLevel(l => l + 1); sfxLevelUp(); }
      return nc;
    });
  }, [level, timeLeft, maxTime, comboMultiplier, addFloatingScore, addAchievement]);

  const handleWordWrong = useCallback((idx: number) => {
    sfxWrong();
    setShakeIdx(idx);
    setTimeout(() => setShakeIdx(null), 500);
    setConsecutiveCorrect(0);
    setComboMultiplier(1);
    setLives(l => {
      const nl = l - 1;
      if (nl <= 0) { setGameOver(true); sfxGameOver(); }
      return nl;
    });
  }, []);

  const placeWord = useCallback((word: string, fromIdx: number, toSlot: number) => {
    const nextCorrectWord = correctWords[selected.length];
    if (word === nextCorrectWord && toSlot === selected.length) {
      const newSelected = [...selected, word];
      setSelected(newSelected);
      setScrambled(prev => prev.filter((_, i) => i !== fromIdx));
      handleWordCorrect(word);
      if (newSelected.length === correctWords.length) {
        setTransitioning(true);
        setTimeout(() => { nextSentence(); setTransitioning(false); }, 600);
      }
    } else {
      handleWordWrong(fromIdx);
      setShakeSlotIdx(toSlot);
      setTimeout(() => setShakeSlotIdx(null), 500);
    }
  }, [selected, correctWords, handleWordCorrect, handleWordWrong, nextSentence]);

  const handleWordClick = (word: string, idx: number) => {
    if (gameOver || transitioning) return;
    sfxClick();
    const nextCorrectWord = correctWords[selected.length];
    if (word === nextCorrectWord) {
      const newSelected = [...selected, word];
      setSelected(newSelected);
      setScrambled(prev => prev.filter((_, i) => i !== idx));
      handleWordCorrect(word);
      if (newSelected.length === correctWords.length) {
        setTransitioning(true);
        setTimeout(() => { nextSentence(); setTransitioning(false); }, 600);
      }
    } else {
      handleWordWrong(idx);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, word: string, idx: number) => {
    if (gameOver || transitioning) return;
    e.preventDefault();
    setDraggingWord(word);
    setDraggingFromIdx(idx);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPosRef.current = { x: clientX, y: clientY };
    setDragPosition({ x: clientX, y: clientY });
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingWord) return;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    setDragPosition({ x: clientX, y: clientY });
    if (answerAreaRef.current) {
      const rect = answerAreaRef.current.getBoundingClientRect();
      const isOver = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      setDropTargetSlot(isOver ? selected.length : null);
    }
  }, [draggingWord, selected.length]);

  const handleDragEnd = useCallback(() => {
    if (!draggingWord || draggingFromIdx === null) return;
    const targetSlot = dropTargetSlot ?? selected.length;
    if (targetSlot === selected.length && targetSlot < correctWords.length) {
      placeWord(draggingWord, draggingFromIdx, targetSlot);
    } else if (targetSlot !== null && targetSlot === selected.length) {
      placeWord(draggingWord, draggingFromIdx, targetSlot);
    } else {
      setShakeIdx(draggingFromIdx);
      setTimeout(() => setShakeIdx(null), 500);
      sfxWrong();
    }
    setDraggingWord(null);
    setDraggingFromIdx(null);
    setDropTargetSlot(null);
  }, [draggingWord, draggingFromIdx, dropTargetSlot, selected.length, correctWords.length, placeWord]);

  useEffect(() => {
    if (!draggingWord) return;
    const move = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const end = () => { handleDragEnd(); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [draggingWord, handleDragMove, handleDragEnd]);

  const handleUndoWord = (idx: number) => {
    if (idx !== selected.length - 1) return;
    const word = selected[idx];
    setSelected(prev => prev.slice(0, -1));
    setScrambled(prev => [...prev, word]);
  };

  const handleHint = () => {
    if (gameOver || hintHighlight !== null) return;
    const nextIdx = scrambled.findIndex(w => w === correctWords[selected.length]);
    if (nextIdx >= 0) {
      setHintHighlight(nextIdx);
      sfxClick();
      setTimeout(() => setHintHighlight(null), 1500);
    }
  };

  const restart = () => {
    setScore(0); setLives(3); setLevel(1); setGameOver(false);
    setCorrectSentences(0); setSentenceIdx(0); setConsecutiveCorrect(0);
    setComboMultiplier(1); setBestStreak(0); setTotalTimePlayed(0);
    gameStartTimeRef.current = Date.now();
    const words = sentences[0].split(' ');
    setScrambled(shuffle([...words]));
    setSelected([]);
    setTimeLeft(diffConfig.baseTime);
  };

  const timerPct = (timeLeft / maxTime) * 100;
  const accuracy = correctSentences > 0 ? Math.round((correctSentences / (correctSentences + (3 - lives))) * 100) : 0;
  const avgTimePerSentence = correctSentences > 0 ? Math.round(totalTimePlayed / correctSentences) : 0;

  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${t.accent}30` }} ref={containerRef}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes floatUp { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-30px)} }
        @keyframes snapIn { from{transform:scale(1.2)} to{transform:scale(1)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .animate-float-up { animation: floatUp 0.6s ease-out forwards; }
        .animate-snap-in { animation: snapIn 0.2s ease-out; }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
      `}</style>

      {/* HUD */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 flex-wrap gap-2" style={{ background: `${t.accent}08` }}>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-black" style={{ color: t.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          {comboMultiplier > 1 && <span className="text-xs font-black text-amber-500">{comboMultiplier}x</span>}
          <span className="text-xs">{Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="text-[10px] px-1 py-0.5 rounded border border-gray-200 bg-white">
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleHint} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-all">💡 Hint</button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-50 transition-all">✕ EXIT</button>
        </div>
      </div>

      <div className="h-1 w-full bg-gray-50">
        <div className="h-full transition-all duration-1000 ease-linear rounded-r" style={{
          width: `${timerPct}%`,
          background: timerPct > 40 ? t.accent : timerPct > 20 ? '#f97316' : '#ef4444',
          boxShadow: `0 0 10px ${timerPct > 40 ? t.accent : '#ef4444'}40`,
        }} />
      </div>

      <div className="p-6 min-h-[420px] flex flex-col relative" style={{ background: `linear-gradient(180deg, ${t.bg}, ${t.bg}dd)`, touchAction: draggingWord ? 'none' : undefined }}>
        {gameOver ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-3xl font-black text-gray-800 mb-2">Game Over!</h3>
            <p className="text-4xl font-black mb-1" style={{ color: t.accent }}>{score} pts</p>
            <div className="text-left bg-gray-50 rounded-xl p-4 mb-6 text-sm space-y-1">
              <p><strong>Sentences:</strong> {correctSentences}</p>
              <p><strong>Accuracy:</strong> {accuracy}%</p>
              <p><strong>Best streak:</strong> {bestStreak} words</p>
              <p><strong>Avg time/sentence:</strong> ~{avgTimePerSentence}s</p>
            </div>
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-[10px] font-bold tracking-wider text-center mb-1">BUILD THE SENTENCE</p>
            <p className="text-gray-500 text-[10px] text-center mb-4">⏱ {timeLeft}s • Sentence {correctSentences + 1}</p>

            {/* Sentence preview: blank slots */}
            <div className="flex flex-wrap justify-center gap-1 mb-2">
              {correctWords.map((_, i) => (
                <span key={i} className="text-gray-400 text-sm font-mono">
                  {i < selected.length ? selected[i] : '_'}
                  {i < correctWords.length - 1 && ' '}
                </span>
              ))}
            </div>

            {/* Built sentence / drop zone */}
            <div
              ref={answerAreaRef}
              className={`min-h-[64px] border-2 rounded-2xl p-3 mb-4 flex flex-wrap gap-2 items-center justify-center transition-all duration-300 ${
                sentenceTransition.leaving ? 'opacity-0 -translate-y-2' : sentenceTransition.entering ? 'animate-slide-in' : ''
              }`}
              style={{
                borderColor: dropTargetSlot !== null ? t.accent : `${t.accent}40`,
                background: dropTargetSlot !== null ? `${t.accent}15` : selected.length > 0 ? `${t.accent}08` : 'transparent',
                borderStyle: dropTargetSlot !== null ? 'solid' : 'dashed',
                boxShadow: dropTargetSlot !== null ? `0 0 20px ${t.accent}30` : 'none',
              }}
            >
              {selected.map((word, i) => (
                <button
                  key={`sel-${i}`}
                  onClick={() => handleUndoWord(i)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 min-h-[48px] flex items-center ${
                    shakeSlotIdx === i ? 'animate-shake' : ''
                  }`}
                  style={{
                    background: `${t.accent}20`,
                    color: t.accent,
                    border: `1px solid ${t.accent}40`,
                    boxShadow: `0 0 10px ${t.accent}15`,
                    cursor: i === selected.length - 1 ? 'pointer' : 'default',
                    opacity: i === selected.length - 1 ? 1 : 0.7,
                    animation: 'snapIn 0.2s ease-out',
                  }}
                >
                  {word}
                </button>
              ))}
              {selected.length < correctWords.length && (
                <span className="inline-flex min-w-[60px] min-h-[48px] items-center justify-center text-gray-400 text-xs">
                  {dropTargetSlot === selected.length ? '▼ drop' : ''}
                </span>
              )}
              {selected.length === correctWords.length && <span className="text-2xl animate-pop-in ml-2">✅</span>}
            </div>

            {/* Floating scores */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {floatingScores.map(f => (
                <div key={f.id} className="absolute text-lg font-black animate-float-up" style={{
                  left: '50%', top: '35%', transform: `translate(-50%, ${-f.life}px)`,
                  color: t.accent, opacity: f.life / 40,
                }}>
                  +{f.points}
                </div>
              ))}
            </div>

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-1">
                {achievements.slice(-2).map(a => (
                  <div key={a.id} className="px-4 py-2 rounded-lg bg-white/95 shadow-lg border border-amber-200 text-amber-700 text-sm font-bold animate-pop-in">
                    {a.text}
                  </div>
                ))}
              </div>
            )}

            {/* Word bank - clear separation */}
            <div className="mt-auto pt-4 border-t-2 border-gray-200 rounded-xl p-4" style={{ background: `${t.wordBankBg}40` }}>
              <p className="text-gray-500 text-[10px] font-bold mb-2">WORD BANK</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {scrambled.map((word, i) => (
                  <div
                    key={`scr-${i}-${word}`}
                    onMouseDown={e => handleDragStart(e, word, i)}
                    onTouchStart={e => handleDragStart(e, word, i)}
                    onClick={() => handleWordClick(word, i)}
                    className={`px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 min-h-[48px] flex items-center justify-center cursor-grab active:cursor-grabbing touch-manipulation select-none ${
                      shakeIdx === i ? 'animate-shake' : ''
                    } ${hintHighlight === i ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
                    style={{
                      background: hintHighlight === i ? `${t.accent}30` : shakeIdx === i ? 'rgba(255,38,38,0.15)' : 'rgba(255,255,255,0.1)',
                      boxShadow: hintHighlight === i ? `0 0 20px ${t.accent}50` : shakeIdx === i ? '0 0 15px rgba(255,38,38,0.2)' : 'none',
                      border: `1px solid ${hintHighlight === i ? t.accent : 'rgba(255,255,255,0.2)'}`,
                      touchAction: 'none',
                    }}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>

            {/* Ghost of dragged word */}
            {draggingWord && (
              <div
                className="fixed pointer-events-none z-50 px-4 py-3 rounded-xl font-bold text-sm shadow-2xl opacity-80"
                style={{
                  left: dragPosition.x,
                  top: dragPosition.y,
                  transform: 'translate(-50%, -50%)',
                  background: `${t.accent}90`,
                  color: 'white',
                }}
              >
                {draggingWord}
              </div>
            )}

            <div className="flex justify-center gap-1 mt-4">
              {correctWords.map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all duration-300" style={{
                  background: i < selected.length ? t.accent : 'rgba(255,255,255,0.1)',
                  boxShadow: i < selected.length ? `0 0 6px ${t.accent}60` : 'none',
                }} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        Drag or tap words in order. Tap last word to undo. Use Hint to highlight next word.
      </div>
    </div>
  );
}
