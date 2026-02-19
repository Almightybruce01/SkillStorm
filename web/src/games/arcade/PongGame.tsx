/* PONG — Classic paddle vs AI, neon blue/yellow */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxPop, sfxGameOver } from '../SoundEngine';

const PADDLE_W = 12;
const PADDLE_H = 80;
const BALL_R = 8;
const PADDLE_SPEED = 6;
const BALL_SPEED_INIT = 5;

export function PongGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('pong_hs') || '0')
  );
  const stateRef = useRef({ score: 0, gameOver: false });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = (canvas.width = canvas.offsetWidth * 2);
    const H = (canvas.height = canvas.offsetHeight * 2);
    const scale = (x: number) => (x * W) / 600;
    const st = stateRef.current;

    let py = H / 2 - (PADDLE_H * 2) / 2;
    let aiY = H / 2 - (PADDLE_H * 2) / 2;
    let ballX = W / 2;
    let ballY = H / 2;
    let vx = BALL_SPEED_INIT * 2;
    let vy = (Math.random() - 0.5) * 3 * 2;
    const paddleW = scale(PADDLE_W);
    const paddleH = scale(PADDLE_H);
    const ballR = scale(BALL_R);
    let aiSpeed = 3 * 2;
    const paddleX = scale(20);
    const aiX = W - scale(20) - paddleW;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') py = Math.max(0, py - PADDLE_SPEED * 2);
      if (e.key === 'ArrowDown' || e.key === 's') py = Math.min(H - paddleH, py + PADDLE_SPEED * 2);
    };

    window.addEventListener('keydown', onKey);

    function loop() {
      if (st.gameOver || !ctx) return;
      ballX += vx;
      ballY += vy;

      if (ballY - ballR <= 0 || ballY + ballR >= H) {
        vy = -vy;
        sfxPop();
      }
      if (ballX - ballR <= paddleX + paddleW && ballX > paddleX && ballY >= py && ballY <= py + paddleH) {
        vx = Math.abs(vx) * 1.05;
        vy *= 1.02;
        ballX = paddleX + paddleW + ballR;
        sfxPop();
      }
      if (ballX + ballR >= aiX && ballX < aiX + paddleW && ballY >= aiY && ballY <= aiY + paddleH) {
        vx = -Math.abs(vx) * 1.05;
        vy *= 1.02;
        ballX = aiX - ballR;
        sfxPop();
      }
      if (ballX - ballR <= 0) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
        if (st.score > highScore) {
          setHighScore(st.score);
          localStorage.setItem('pong_hs', String(st.score));
        }
        return;
      }
      if (ballX + ballR >= W) {
        st.score++;
        setScore(st.score);
        sfxPop();
        ballX = W / 2;
        ballY = H / 2;
        vx = -(BALL_SPEED_INIT + st.score * 0.5) * 2;
        vy = (Math.random() - 0.5) * 4 * 2;
        aiSpeed = 3 * 2 + st.score * 0.4;
      }

      aiY += (ballY - (aiY + paddleH / 2)) * 0.08 * aiSpeed;
      aiY = Math.max(0, Math.min(H - paddleH, aiY));

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.setLineDash([scale(10), scale(10)]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.fillRect(paddleX, py, paddleW, paddleH);
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.fillRect(aiX, aiY, paddleW, paddleH);
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2);
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
    return startGame();
  }, [startGame, gameOver]);

  const restart = () => {
    setGameOver(false);
    sfxClick();
  };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#00ffff]/5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#00ffff]">🏓 PONG</span>
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
            <div className="text-5xl mb-3">🏓</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#00ffff] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">
              Play Again
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        ↑↓ or W/S to move paddle
      </div>
    </div>
  );
}
