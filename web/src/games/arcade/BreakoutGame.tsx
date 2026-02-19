/* BREAKOUT — Brick breaker, colored rows, pink/magenta theme */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxPop, sfxLevelUp, sfxGameOver } from '../SoundEngine';

const ROWS = 5;
const COLS = 10;
const BRICK_GAP = 2;
const PADDLE_H = 14;
const BALL_R = 6;
const ROW_COLORS = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'];

export function BreakoutGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('breakout_hs') || '0')
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

    let bricks: { x: number; y: number; w: number; h: number; color: string }[] = [];
    let paddleX = W / 2 - (120 * 2) / 2;
    const paddleW = 120 * 2;
    const paddleH = PADDLE_H * 2;
    let ballX = W / 2;
    let ballY = H - 80 * 2;
    let vx = 4 * 2;
    let vy = -5 * 2;
    let currentLevel = 1;
    const baseSpeed = 5 * 2;

    function spawnBricks() {
      bricks = [];
      const totalW = W - 40 * 2;
      const bw = (totalW - (COLS - 1) * BRICK_GAP * 2) / COLS;
      const bh = 18 * 2;
      const startX = 20 * 2;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          bricks.push({
            x: startX + col * (bw + BRICK_GAP * 2),
            y: 30 * 2 + row * (bh + BRICK_GAP * 2),
            w: bw,
            h: bh,
            color: ROW_COLORS[row],
          });
        }
      }
    }
    spawnBricks();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') paddleX = Math.max(0, paddleX - 18 * 2);
      if (e.key === 'ArrowRight' || e.key === 'd') paddleX = Math.min(W - paddleW, paddleX + 18 * 2);
    };
    window.addEventListener('keydown', onKey);

    function loop() {
      if (st.gameOver || !ctx) return;
      ballX += vx;
      ballY += vy;

      if (ballX - BALL_R * 2 <= 0 || ballX + BALL_R * 2 >= W) {
        vx = -vx;
        sfxPop();
      }
      if (ballY - BALL_R * 2 <= 0) {
        vy = -vy;
        sfxPop();
      }
      if (ballY + BALL_R * 2 >= H) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
        if (st.score > highScore) {
          setHighScore(st.score);
          localStorage.setItem('breakout_hs', String(st.score));
        }
        return;
      }

      if (
        ballY + BALL_R * 2 >= H - paddleH - 20 * 2 &&
        ballY <= H - 20 * 2 &&
        ballX >= paddleX &&
        ballX <= paddleX + paddleW
      ) {
        vy = -Math.abs(vy);
        const hit = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2);
        vx += hit * 2;
        sfxPop();
      }

      for (let i = bricks.length - 1; i >= 0; i--) {
        const b = bricks[i];
        if (
          ballX + BALL_R * 2 >= b.x &&
          ballX - BALL_R * 2 <= b.x + b.w &&
          ballY + BALL_R * 2 >= b.y &&
          ballY - BALL_R * 2 <= b.y + b.h
        ) {
          vy = -vy;
          bricks.splice(i, 1);
          st.score += 10;
          setScore(st.score);
          sfxPop();
          break;
        }
      }

      if (bricks.length === 0) {
        currentLevel++;
        setLevel(currentLevel);
        sfxLevelUp();
        const speedMult = 1 + (currentLevel - 1) * 0.12;
        vx = (vx > 0 ? baseSpeed : -baseSpeed) * speedMult;
        vy = -Math.abs(vy) * speedMult;
        ballX = W / 2;
        ballY = H - 80 * 2;
        paddleX = W / 2 - paddleW / 2;
        spawnBricks();
      }

      ctx.fillStyle = '#1a0a1a';
      ctx.fillRect(0, 0, W, H);
      bricks.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ff00aa';
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 12;
      ctx.fillRect(paddleX, H - paddleH - 20 * 2, paddleW, paddleH);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ff69b4';
      ctx.shadowColor = '#ff69b4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_R * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animIdRef.current = requestAnimationFrame(loop);
    }
    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animIdRef.current !== undefined) cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('keydown', onKey);
    };
  }, [highScore]);

  useEffect(() => {
    if (gameOver) return;
    stateRef.current = { score: 0, gameOver: false };
    setScore(0);
    setLevel(1);
    return startGame();
  }, [startGame, gameOver]);

  const restart = () => {
    setGameOver(false);
    sfxClick();
  };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#ff00aa]/5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#ff69b4]">🧱 BREAKOUT</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">LVL {level}</span>
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
            <div className="text-5xl mb-3">🧱</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#ff69b4] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">
              Play Again
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        ← → or A/D to move paddle
      </div>
    </div>
  );
}
