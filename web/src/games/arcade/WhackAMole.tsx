/* WHACK-A-MOLE — 3x3 grid, click moles before they hide */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxPop, sfxGameOver, sfxCoin } from '../SoundEngine';

const ROUND_SEC = 30;
const HOLES = 9;

export function WhackAMole({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('whack_hs') || '0'));
  const [moles, setMoles] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SEC);
  const timerRef = useRef<number | undefined>(undefined);
  const spawnRef = useRef<number | undefined>(undefined);
  const baseIntervalRef = useRef(1200);
  const lastSpawnRef = useRef(0);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  scoreRef.current = score;
  gameOverRef.current = gameOver;

  const startGame = useCallback(() => {
    setScore(0);
    setTimeLeft(ROUND_SEC);
    setMoles([]);
    baseIntervalRef.current = 1200;
    lastSpawnRef.current = Date.now();
    gameOverRef.current = false;

    const tick = () => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current !== undefined) clearInterval(timerRef.current);
          if (spawnRef.current !== undefined) clearTimeout(spawnRef.current);
          gameOverRef.current = true;
          setGameOver(true);
          sfxGameOver();
          const s = scoreRef.current;
          const hs = parseInt(localStorage.getItem('whack_hs') || '0');
          if (s > hs) {
            setHighScore(s);
            localStorage.setItem('whack_hs', String(s));
          }
          return 0;
        }
        return t - 1;
      });
    };
    timerRef.current = window.setInterval(tick, 1000) as unknown as number;

    function scheduleMole() {
      if (gameOverRef.current) return;
      const now = Date.now();
      const interval = Math.max(400, baseIntervalRef.current - (now - lastSpawnRef.current) * 0.02);
      lastSpawnRef.current = now;
      spawnRef.current = window.setTimeout(() => {
        if (gameOverRef.current) return;
        setMoles((prev) => {
          if (prev.length >= 9) return prev;
          let idx: number;
          do idx = Math.floor(Math.random() * HOLES);
          while (prev.includes(idx));
          setTimeout(() => {
            if (gameOverRef.current) return;
            setMoles((p) => p.filter((i) => i !== idx));
          }, 1800);
          return [...prev, idx];
        });
        scheduleMole();
      }, interval) as unknown as number;
    }
    scheduleMole();
  }, []);

  useEffect(() => {
    if (gameOver) return;
    return () => {
      if (timerRef.current !== undefined) clearInterval(timerRef.current);
      if (spawnRef.current !== undefined) clearTimeout(spawnRef.current);
    };
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) startGame();
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const whack = (idx: number) => {
    if (gameOver || !moles.includes(idx)) return;
    sfxPop();
    sfxCoin();
    setScore((s) => s + 10);
    setMoles((prev) => prev.filter((i) => i !== idx));
    baseIntervalRef.current = Math.max(400, baseIntervalRef.current - 30);
  };

  const restart = () => {
    setGameOver(false);
    sfxClick();
  };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-purple-500/10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-purple-400">🔨 WHACK-A-MOLE</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">HI {highScore}</span>
          <span className="text-xs text-purple-300">{timeLeft}s</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-white/10 transition-all">✕</button>
      </div>
      <div className="relative bg-gradient-to-b from-purple-900/40 to-purple-950/60 flex items-center justify-center" style={{ height: '400px' }}>
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
            <div className="text-5xl mb-3">🐹</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Time&apos;s Up!</h3>
            <p className="text-3xl font-black text-purple-400 mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 p-4 w-full max-w-[280px]">
          {Array.from({ length: HOLES }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => whack(i)}
              className="aspect-square rounded-2xl bg-purple-900/60 border-2 border-purple-600/50 flex items-center justify-center overflow-hidden transition-transform active:scale-95"
            >
              {moles.includes(i) ? (
                <span className="text-4xl animate-bounce" style={{ animationDuration: '0.5s' }}>🐹</span>
              ) : (
                <span className="text-2xl text-purple-800/50">○</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">Click moles to whack • Speed increases over time</div>
    </div>
  );
}
