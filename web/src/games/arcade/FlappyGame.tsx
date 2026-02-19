/* FLAPPY — Tap/click/space to flap, pipes, orange character */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxJump, sfxGameOver } from '../SoundEngine';

const GRAVITY = 0.45;
const FLAP = -8;
const PIPE_W = 70;
const PIPE_GAP = 180;
const PIPE_SPEED = 4;
const CHAR_SIZE = 28;

export function FlappyGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('flappy_hs') || '0')
  );
  const stateRef = useRef({ score: 0, gameOver: false });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = (canvas.width = canvas.offsetWidth * 2);
    const H = (canvas.height = canvas.offsetHeight * 2);
    const st = stateRef.current;

    let charY = H / 2 - CHAR_SIZE;
    let vy = 0;
    let pipes: { x: number; top: number; bottom: number; scored: boolean }[] = [];
    let frame = 0;
    const spawnInterval = 90;

    function spawnPipe() {
      const gapY = PIPE_GAP + Math.random() * 80;
      const top = 60 + Math.random() * (H - gapY - 120);
      pipes.push({
        x: W,
        top,
        bottom: top + gapY,
        scored: false,
      });
    }

    const flap = () => {
      if (st.gameOver) return;
      vy = FLAP * 2;
      sfxJump();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', flap);

    function loop() {
      if (st.gameOver || !ctx) return;
      frame++;
      if (frame % spawnInterval === 0) spawnPipe();

      vy += GRAVITY * 2;
      charY += vy;

      if (charY <= 0 || charY + CHAR_SIZE >= H) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
        if (st.score > highScore) {
          setHighScore(st.score);
          localStorage.setItem('flappy_hs', String(st.score));
        }
        return;
      }

      const charCenterX = 80 * 2;
      const charCenterY = charY + CHAR_SIZE / 2;

      pipes = pipes.filter((p) => {
        p.x -= PIPE_SPEED * 2;
        if (p.x + PIPE_W * 2 < 0) return false;

        if (!p.scored && charCenterX > p.x + PIPE_W * 2) {
          p.scored = true;
          st.score++;
          setScore(st.score);
        }

        const left = p.x;
        const right = p.x + PIPE_W * 2;
        if (
          charCenterX + CHAR_SIZE / 2 > left &&
          charCenterX - CHAR_SIZE/2 < right &&
          (charCenterY - CHAR_SIZE / 2 < p.top || charCenterY + CHAR_SIZE / 2 > p.bottom)
        ) {
          st.gameOver = true;
          setGameOver(true);
          sfxGameOver();
          if (st.score > highScore) {
            setHighScore(st.score);
            localStorage.setItem('flappy_hs', String(st.score));
          }
        }
        return true;
      });

      ctx.fillStyle = '#0d2818';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1b4332';
      for (let i = 0; i < W; i += 40) ctx.fillRect(i, 0, 20, H);

      pipes.forEach((p) => {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(p.x, 0, PIPE_W * 2, p.top);
        ctx.fillRect(p.x, p.bottom, PIPE_W * 2, H - p.bottom);
        ctx.strokeStyle = '#40916c';
        ctx.lineWidth = 4;
        ctx.strokeRect(p.x, 0, PIPE_W * 2, p.top);
        ctx.strokeRect(p.x, p.bottom, PIPE_W * 2, H - p.bottom);
      });

      ctx.fillStyle = '#ff8c00';
      ctx.shadowColor = '#ff8c00';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(charCenterX, charCenterY, CHAR_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(charCenterX - 6, charY + 8, 4, 0, Math.PI * 2);
      ctx.arc(charCenterX + 6, charY + 8, 4, 0, Math.PI * 2);
      ctx.fill();

      animIdRef.current = requestAnimationFrame(loop);
    }
    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animIdRef.current !== undefined) cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', flap);
    };
  }, [highScore]);

  useEffect(() => {
    if (gameOver) return;
    stateRef.current = { score: 0, gameOver: false };
    setScore(0);
    return startGame();
  }, [startGame, gameOver]);

  const restart = () => {
    setGameOver(false);
    sfxClick();
  };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#2d6a4f]/10">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#40916c]">🐦 FLAPPY</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">HI {highScore}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-white/10 transition-all"
        >
          ✕
        </button>
      </div>
      <div className="relative" style={{ height: '420px' }}>
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
            <div className="text-5xl mb-3">🐦</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#ff8c00] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">
              Play Again
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        Click / Space / ↑ to flap
      </div>
    </div>
  );
}
