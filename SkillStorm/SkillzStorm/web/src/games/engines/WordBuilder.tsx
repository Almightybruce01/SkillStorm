/* ═══════════════════════════════════════════════════════════
   WORD BUILDER / SENTENCE BUILDER ENGINE
   Used by: Sentence Builder Pro, Grammar Gladiator, Essay Builder Rush
   Arrange scrambled words in correct order to form a sentence
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Grade } from '../questionBank';

const SENTENCE_BANK: Record<Grade, string[]> = {
  'K-2': [
    'The cat sat on the mat',
    'I like to play games',
    'She has a red ball',
    'We go to school',
    'He can run fast',
  ],
  '3-5': [
    'The quick brown fox jumps over the lazy dog',
    'Scientists discovered a new planet yesterday',
    'Reading books improves your vocabulary skills',
    'The storm brought heavy rain and strong winds',
    'Children learn best when they have fun',
  ],
  '6-8': [
    'The committee decided to postpone the annual conference',
    'Despite the heavy rain the team continued practicing',
    'Ancient civilizations developed complex writing systems',
    'Climate change affects ecosystems around the world',
  ],
  '9-12': [
    'The theoretical framework establishes fundamental principles for analysis',
    'Photosynthesis converts light energy into chemical energy efficiently',
    'Democracy requires active participation from informed citizens',
    'Scientific methodology emphasizes empirical observation and experimentation',
  ],
};

const themes: Record<string, { top: string; bottom: string; accent: string; pillBg: string }> = {
  sentence_builder_pro: { top: '#0d001a', bottom: '#1a0033', accent: '#9933ff', pillBg: 'rgba(153,51,255,0.25)' },
  grammar_gladiator: { top: '#1a0a00', bottom: '#2d1500', accent: '#ff6600', pillBg: 'rgba(255,102,0,0.25)' },
  essay_builder_rush: { top: '#001a0d', bottom: '#00331a', accent: '#00cc66', pillBg: 'rgba(0,204,102,0.25)' },
  default: { top: '#0a0d1a', bottom: '#0d1533', accent: '#0099ff', pillBg: 'rgba(0,153,255,0.25)' },
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSentence(grade: Grade, level: number): string {
  const bank = SENTENCE_BANK[grade];
  const filtered = bank.filter(s => {
    const len = s.split(' ').length;
    return level <= 2 ? len <= 6 : level <= 5 ? len <= 10 : true;
  });
  return filtered[Math.floor(Math.random() * filtered.length)] || bank[0];
}

export function WordBuilder({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const theme = themes[gameId] || themes.default;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<number>();
  const timeTotalRef = useRef(15);

  const loadSentence = useCallback(() => {
    const s = getSentence(grade, level);
    setSentence(s);
    setWords(shuffle(s.split(' ')));
    setSelected([]);
    timeTotalRef.current = Math.max(8, 15 - (level - 1) * 2);
    setTimeLeft(timeTotalRef.current);
  }, [grade, level]);

  useEffect(() => {
    loadSentence();
  }, [loadSentence]);

  useEffect(() => {
    if (gameOver) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setLives(l => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
          setCorrectCount(0);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          loadSentence();
          return timeTotalRef.current;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameOver, loadSentence]);

  const expectedNext = sentence ? sentence.split(' ')[selected.length] : '';

  const pickWord = (word: string) => {
    if (gameOver) return;
    if (word !== expectedNext) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLives(l => {
        const nl = l - 1;
        if (nl <= 0) setGameOver(true);
        return nl;
      });
      return;
    }
    const idx = words.indexOf(word);
    if (idx === -1) return;
    const newWords = words.filter((_, i) => i !== idx);
    const newSelected = [...selected, word];
    setWords(newWords);
    setSelected(newSelected);
    if (newSelected.join(' ') === sentence) {
      const pts = 10 * level + Math.floor(timeLeft / 3) * 5;
      setScore(s => s + pts);
      const nc = correctCount + 1;
      setCorrectCount(nc);
      if (nc >= 3) {
        setLevel(l => l + 1);
        setCorrectCount(0);
      }
      loadSentence();
    }
  };

  const removeFromSelected = (word: string) => {
    const idx = selected.indexOf(word);
    if (idx === -1) return;
    setSelected(prev => prev.filter((_, i) => i !== idx));
    setWords(prev => [...prev, word]);
  };

  const handleWordClick = (word: string, inPool: boolean) => {
    if (inPool) pickWord(word);
    else removeFromSelected(word);
  };

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setCorrectCount(0);
    setGameOver(false);
    loadSentence();
  };

  const timerPct = (timeLeft / timeTotalRef.current) * 100;

  return (
    <>
      <style>{`@keyframes wordbuilder-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
    <div
      className="game-card !p-0 overflow-hidden animate-pop-in transition-transform duration-200"
      style={{
        border: `1px solid ${theme.accent}30`,
        ...(shake && { animation: 'wordbuilder-shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both' }),
      }}
    >
      {/* HUD */}
      <div
        className="flex items-center justify-between p-3 border-b border-white/5"
        style={{ background: `${theme.accent}08` }}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-white/40">LVL {level}</span>
          <span className="text-xs">{Array.from({ length: 3 }, (_, i) => (i < lives ? '❤️' : '🖤')).join('')}</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-all"
        >
          ✕ EXIT
        </button>
      </div>

      {/* Timer bar */}
      <div className="h-1 bg-black/30 overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${timerPct}%`,
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}88)`,
          }}
        />
      </div>

      {/* Game area */}
      <div
        className="relative min-h-[320px] p-4 flex flex-col"
        style={{ background: `linear-gradient(180deg, ${theme.top}, ${theme.bottom})` }}
      >
        {gameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/85">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-3xl font-black text-white mb-2">Game Over!</h3>
            <p className="text-4xl font-black mb-1" style={{ color: theme.accent }}>{score} pts</p>
            <p className="text-white/40 text-sm mb-6">Level {level}</p>
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-center text-white/40 text-[10px] font-bold tracking-wider mb-4">
              CLICK WORDS IN ORDER TO BUILD THE SENTENCE
            </p>

            {/* Selected (built) words */}
            <div className="min-h-[72px] flex flex-wrap justify-center items-center gap-2 mb-6 p-2 rounded-xl border border-white/10 bg-black/20">
              {selected.length === 0 ? (
                <span className="text-white/20 text-sm">Tap words below in order...</span>
              ) : (
                selected.map((w, i) => (
                  <button
                    key={`${w}-${i}`}
                    onClick={() => handleWordClick(w, false)}
                    className="px-4 py-2 rounded-full font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      background: theme.pillBg,
                      boxShadow: `0 0 16px ${theme.accent}60`,
                      border: `1px solid ${theme.accent}50`,
                    }}
                  >
                    {w}
                  </button>
                ))
              )}
            </div>

            {/* Word pool */}
            <div className="flex flex-wrap justify-center gap-2">
              {words.map((w, i) => (
                <button
                  key={`${w}-${i}`}
                  onClick={() => handleWordClick(w, true)}
                  className="px-4 py-2.5 rounded-full font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                  style={{
                    background: theme.pillBg,
                    border: `1px solid ${theme.accent}40`,
                    boxShadow: `0 2px 8px ${theme.accent}30`,
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="p-2 text-center text-white/20 text-[10px] border-t border-white/5">
        Click words in the correct order. Wrong click = lose a life. Build 3 correct to level up!
      </div>
    </div>
    </>
  );
}
