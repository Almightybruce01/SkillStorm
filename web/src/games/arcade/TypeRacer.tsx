/* TYPE RACER — Type falling words before they hit the bottom */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxCorrect, sfxWrong, sfxGameOver, sfxCoin } from '../SoundEngine';

const WORDS = ['code', 'type', 'fast', 'react', 'game', 'word', 'race', 'key', 'speed', 'skill', 'storm', 'play', 'win', 'fun', 'arcade', 'click', 'type', 'quick', 'test', 'best', 'goal', 'life', 'live', 'run', 'end'];
const LIVES = 3;
const GAME_HEIGHT = 400;
const WORD_HEIGHT = 32;

interface FallingWord {
  id: number;
  text: string;
  y: number;
  speed: number;
}

export function TypeRacer({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('typeracer_hs') || '0'));
  const [lives, setLives] = useState(LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState('');
  const [level, setLevel] = useState(1);
  const idCounterRef = useRef(0);
  const animRef = useRef<number | undefined>(undefined);
  const spawnRef = useRef<number | undefined>(undefined);
  const baseSpeedRef = useRef(0.8);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const startGame = useCallback(() => {
    setScore(0);
    setLives(LIVES);
    setWords([]);
    setInput('');
    setLevel(1);
    baseSpeedRef.current = 0.8;
    idCounterRef.current = 0;
    lastSpawnRef.current = Date.now();

    function spawnWord() {
      const id = ++idCounterRef.current;
      const text = WORDS[Math.floor(Math.random() * WORDS.length)];
      const speed = baseSpeedRef.current + Math.random() * 0.4;
      setWords((prev) => [...prev, { id, text, y: 0, speed }]);
      const nextDelay = Math.max(1200, 2200 - level * 150);
      spawnRef.current = window.setTimeout(spawnWord, nextDelay) as unknown as number;
    }
    spawnRef.current = window.setTimeout(spawnWord, 1500) as unknown as number;

    let last = performance.now();
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      setWords((prev) => {
        const next = prev
          .map((w) => ({ ...w, y: w.y + w.speed * dt * 80 }))
          .filter((w) => {
            if (w.y >= GAME_HEIGHT - WORD_HEIGHT) {
              setLives((l) => {
                if (l <= 1) {
                  setGameOver(true);
                  sfxGameOver();
                  const s = scoreRef.current;
                  const hs = parseInt(localStorage.getItem('typeracer_hs') || '0');
                  if (s > hs) {
                    setHighScore(s);
                    localStorage.setItem('typeracer_hs', String(s));
                  }
                  return 0;
                }
                sfxWrong();
                return l - 1;
              });
              return false;
            }
            return true;
          });
        return next;
      });
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (gameOver) return;
    return () => {
      if (animRef.current !== undefined) cancelAnimationFrame(animRef.current);
      if (spawnRef.current !== undefined) clearTimeout(spawnRef.current);
    };
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) startGame();
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameOver) return;
    const s = score;
    if (s > 0 && s % 50 === 0) {
      setLevel((l) => l + 1);
      baseSpeedRef.current = Math.min(2.5, baseSpeedRef.current + 0.15);
    }
  }, [score, gameOver]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !input.trim()) return;
    const typed = input.trim().toLowerCase();
    const match = words.find((w) => w.text.toLowerCase() === typed);
    if (match) {
      sfxCorrect();
      sfxCoin();
      setScore((s) => s + 10);
      setWords((prev) => prev.filter((w) => w.id !== match.id));
      setInput('');
      setScore((s) => {
        const next = s + 10;
        const hs = parseInt(localStorage.getItem('typeracer_hs') || '0');
        if (next > hs) {
          setHighScore(next);
          localStorage.setItem('typeracer_hs', String(next));
        }
        return next;
      });
    }
  };

  const restart = () => {
    setGameOver(false);
    sfxClick();
  };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-cyan-500/10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-cyan-400">⌨️ TYPE RACER</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">HI {highScore}</span>
          <span className="text-xs text-red-400">❤️ {lives}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-white/10 transition-all">✕</button>
      </div>
      <div className="relative bg-gradient-to-b from-cyan-900/30 to-cyan-950/50 overflow-hidden" style={{ height: `${GAME_HEIGHT}px` }}>
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-cyan-400 mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
          </div>
        )}
        {words.map((w) => (
          <div
            key={w.id}
            className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-cyan-500/30 border border-cyan-400/50 text-gray-800 font-mono font-bold text-sm whitespace-nowrap"
            style={{ top: w.y, height: WORD_HEIGHT, lineHeight: `${WORD_HEIGHT - 8}px` }}
          >
            {w.text}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-gray-200 flex gap-2 items-center bg-cyan-950/30">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type word and press Enter"
          className="flex-1 px-3 py-2 rounded bg-white/10 border border-cyan-500/30 text-gray-800 placeholder-white/40 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
          autoComplete="off"
          disabled={gameOver}
        />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">Type the word and press Enter before it reaches the bottom • 3 lives</div>
    </div>
  );
}
