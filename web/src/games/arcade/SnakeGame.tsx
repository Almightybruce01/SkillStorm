/* SNAKE — Classic snake eat-and-grow game */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxCoin, sfxGameOver, sfxClick } from '../SoundEngine';

export function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake_hs') || '0'));
  const stateRef = useRef({ score: 0, gameOver: false });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    const CELL = Math.floor(W / 30);
    const COLS = Math.floor(W / CELL);
    const ROWS = Math.floor(H / CELL);
    const st = stateRef.current;

    let snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = spawnFood();
    let frame = 0;
    const speed = 8; // frames per move

    function spawnFood(): { x: number; y: number } {
      let f: { x: number; y: number };
      do { f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while (snake.some(s => s.x === f.x && s.y === f.y));
      return f;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') { if (dir.y === 0) nextDir = { x: 0, y: -1 }; }
      if (e.key === 'ArrowDown' || e.key === 's') { if (dir.y === 0) nextDir = { x: 0, y: 1 }; }
      if (e.key === 'ArrowLeft' || e.key === 'a') { if (dir.x === 0) nextDir = { x: -1, y: 0 }; }
      if (e.key === 'ArrowRight' || e.key === 'd') { if (dir.x === 0) nextDir = { x: 1, y: 0 }; }
    };

    // Swipe support
    let touchStart = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) { if (dx > 20 && dir.x === 0) nextDir = { x: 1, y: 0 }; else if (dx < -20 && dir.x === 0) nextDir = { x: -1, y: 0 }; }
      else { if (dy > 20 && dir.y === 0) nextDir = { x: 0, y: 1 }; else if (dy < -20 && dir.y === 0) nextDir = { x: 0, y: -1 }; }
    };

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    let animId: number;
    function loop() {
      if (st.gameOver || !ctx) return;
      frame++;
      if (frame % speed === 0) {
        dir = { ...nextDir };
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        // Wall collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) {
          st.gameOver = true;
          setGameOver(true);
          sfxGameOver();
          if (st.score > highScore) { setHighScore(st.score); localStorage.setItem('snake_hs', String(st.score)); }
          return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          st.score += 10;
          setScore(st.score);
          sfxCoin();
          food = spawnFood();
        } else {
          snake.pop();
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a1f';
      ctx.fillRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      for (let x = 0; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
      for (let y = 0; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }
      // Snake
      snake.forEach((s, i) => {
        const brightness = 1 - (i / snake.length) * 0.5;
        ctx.fillStyle = `rgba(0, 255, 128, ${brightness})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = i === 0 ? 12 : 4;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      // Eyes on head
      ctx.fillStyle = '#000';
      ctx.shadowBlur = 0;
      const hx = snake[0].x * CELL, hy = snake[0].y * CELL;
      ctx.fillRect(hx + CELL * 0.3, hy + CELL * 0.25, 3, 3);
      ctx.fillRect(hx + CELL * 0.65, hy + CELL * 0.25, 3, 3);
      // Food
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [highScore]);

  useEffect(() => {
    if (gameOver) return;
    stateRef.current = { score: 0, gameOver: false };
    setScore(0);
    return startGame();
  }, [startGame, gameOver]);

  const restart = () => { setGameOver(false); sfxClick(); };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#10b981]/5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#10b981]">🐍 SNAKE</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">HI {highScore}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-white/10 transition-all">✕</button>
      </div>
      <div className="relative" style={{ height: '420px' }}>
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
            <div className="text-5xl mb-3">🐍</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#10b981] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">Arrow Keys / WASD / Swipe to move</div>
    </div>
  );
}
