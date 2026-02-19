/* DINO RUN — Chrome dino style: ground scroll, cacti, pterodactyls, red accents */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxJump, sfxGameOver } from '../SoundEngine';

const GRAVITY = 0.6;
const JUMP = -14;
const GROUND_Y_RATIO = 0.82;
const DINO_W = 44;
const DINO_H = 48;
const OBSTACLE_MIN_GAP = 180;
const PTERO_SPAWN_SCORE = 100;

export function DinoRunGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('dino_hs') || '0')
  );
  const stateRef = useRef({ score: 0, gameOver: false });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = (canvas.width = canvas.offsetWidth * 2);
    const H = (canvas.height = canvas.offsetHeight * 2);
    const groundY = H * GROUND_Y_RATIO;
    const st = stateRef.current;

    let dinoY = groundY - DINO_H;
    let vy = 0;
    let groundOffset = 0;
    let obstacles: { x: number; w: number; h: number; isPtero: boolean; y?: number }[] = [];
    let nextObstacle = 120;
    let speed = 8 * 2;
    let frame = 0;

    function spawnObstacle() {
      const usePtero = st.score >= PTERO_SPAWN_SCORE && Math.random() < 0.35;
      if (usePtero) {
        const flyY = groundY - 60 * 2 - Math.random() * 40 * 2;
        obstacles.push({ x: W, w: 46 * 2, h: 30 * 2, isPtero: true, y: flyY });
      } else {
        const h = (36 + Math.random() * 24) * 2;
        obstacles.push({ x: W, w: 24 * 2, h, isPtero: false });
      }
    }

    const jump = () => {
      if (st.gameOver) return;
      if (dinoY >= groundY - DINO_H - 2) {
        vy = JUMP * 2;
        sfxJump();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', jump);

    function loop() {
      if (st.gameOver || !ctx) return;
      frame++;
      if (frame % 60 === 0) {
        st.score++;
        setScore(st.score);
        speed = Math.min(16 * 2, 8 * 2 + st.score * 0.4);
      }

      vy += GRAVITY * 2;
      dinoY += vy;
      if (dinoY >= groundY - DINO_H) {
        dinoY = groundY - DINO_H;
        vy = 0;
      }
      groundOffset = (groundOffset + speed) % (80 * 2);

      if (frame >= nextObstacle) {
        spawnObstacle();
        nextObstacle = frame + OBSTACLE_MIN_GAP + Math.random() * 120;
      }

      const dinoLeft = 80 * 2;
      const dinoRight = dinoLeft + DINO_W;
      const dinoBottom = dinoY + DINO_H;

      obstacles = obstacles.filter((obs) => {
        obs.x -= speed;
        if (obs.x + obs.w < 0) return false;
        const obsLeft = obs.x;
        const obsRight = obs.x + obs.w;
        const obsTop = obs.isPtero ? (obs.y ?? groundY) : groundY - obs.h;
        const obsBottom = obs.isPtero ? (obs.y ?? groundY) + obs.h : groundY;
        if (
          dinoRight > obsLeft &&
          dinoLeft < obsRight &&
          dinoY < obsBottom &&
          dinoBottom > obsTop
        ) {
          st.gameOver = true;
          setGameOver(true);
          sfxGameOver();
          if (st.score > highScore) {
            setHighScore(st.score);
            localStorage.setItem('dino_hs', String(st.score));
          }
        }
        return true;
      });

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#333';
      for (let i = -2; i < W / (80 * 2) + 2; i++) {
        const x = i * 80 * 2 - groundOffset;
        ctx.fillRect(x, groundY, 80 * 2, H - groundY);
      }
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      obstacles.forEach((obs) => {
        ctx.fillStyle = '#333';
        if (obs.isPtero && obs.y !== undefined) {
          ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
          ctx.fillStyle = '#c00';
          ctx.fillRect(obs.x + obs.w - 12 * 2, obs.y + obs.h / 2 - 4, 14 * 2, 8);
        } else {
          ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h);
          ctx.fillStyle = '#c00';
          ctx.fillRect(obs.x + obs.w / 2 - 6, groundY - obs.h, 12, 12);
        }
      });

      ctx.fillStyle = '#444';
      ctx.fillRect(dinoLeft, dinoY, DINO_W, DINO_H);
      ctx.fillStyle = '#c00';
      ctx.fillRect(dinoLeft + DINO_W - 8, dinoY + 8, 8, 12);
      ctx.fillRect(dinoLeft + 4, dinoY + 4, 6, 6);
      ctx.fillRect(dinoLeft + DINO_W - 14, dinoY + 4, 6, 6);

      animIdRef.current = requestAnimationFrame(loop);
    }
    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animIdRef.current !== undefined) cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', jump);
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
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#333]/20">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-gray-500">🦖 DINO RUN</span>
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
            <div className="text-5xl mb-3">🦖</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#c00] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">
              Play Again
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        Space / Click / ↑ to jump
      </div>
    </div>
  );
}
