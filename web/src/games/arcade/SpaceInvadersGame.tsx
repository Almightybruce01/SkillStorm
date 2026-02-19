/* SPACE INVADERS — Grid of aliens, ship shoots, aliens shoot back, green/white on black */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxClick, sfxShoot, sfxExplosion, sfxLevelUp, sfxGameOver } from '../SoundEngine';

const COLS = 8;
const ROWS = 5;
const ALIEN_W = 32;
const ALIEN_H = 24;
const SHIP_W = 48;
const SHIP_H = 24;
const BULLET_SPEED = 12;
const ALIEN_BULLET_SPEED = 4;
const ALIEN_DROP = 16;

export function SpaceInvadersGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animIdRef = useRef<number | undefined>(undefined);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('invaders_hs') || '0')
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

    let shipX = W / 2 - (SHIP_W * 2) / 2;
    const shipY = H - (SHIP_H * 2) - 20 * 2;
    let bullets: { x: number; y: number }[] = [];
    let alienBullets: { x: number; y: number }[] = [];
    let aliens: { x: number; y: number; alive: boolean }[] = [];
    let alienDir = 1;
    let alienTick = 0;
    let currentLevel = 1;
    let alienSpeed = 35;
    const shipSpeed = 10 * 2;

    function spawnAliens() {
      aliens = [];
      const startX = 40 * 2;
      const startY = 40 * 2;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          aliens.push({
            x: startX + col * (ALIEN_W * 2 + 8),
            y: startY + row * (ALIEN_H * 2 + 8) + (currentLevel - 1) * 20,
            alive: true,
          });
        }
      }
      alienDir = 1;
      alienTick = 0;
      alienSpeed = Math.max(8, 35 - currentLevel * 4);
    }
    spawnAliens();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') shipX = Math.max(0, shipX - shipSpeed);
      if (e.key === 'ArrowRight' || e.key === 'd') shipX = Math.min(W - SHIP_W * 2, shipX + shipSpeed);
      if (e.key === ' ') {
        e.preventDefault();
        if (!st.gameOver && bullets.length < 4) {
          bullets.push({ x: shipX + (SHIP_W * 2) / 2 - 2, y: shipY });
          sfxShoot();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    function loop() {
      if (st.gameOver || !ctx) return;
      alienTick++;

      bullets = bullets.filter((b) => {
        b.y -= BULLET_SPEED * 2;
        if (b.y < 0) return false;
        for (const a of aliens) {
          if (!a.alive) continue;
          if (
            b.x >= a.x &&
            b.x <= a.x + ALIEN_W * 2 &&
            b.y >= a.y &&
            b.y <= a.y + ALIEN_H * 2
          ) {
            a.alive = false;
            st.score += 10;
            setScore(st.score);
            sfxExplosion();
            return false;
          }
        }
        return true;
      });

      const aliveAliens = aliens.filter((a) => a.alive);
      if (aliveAliens.length === 0) {
        currentLevel++;
        setLevel(currentLevel);
        sfxLevelUp();
        alienBullets = [];
        bullets = [];
        spawnAliens();
        animIdRef.current = requestAnimationFrame(loop);
        return;
      }

      if (alienTick % alienSpeed === 0) {
        let edge = false;
        for (const a of aliveAliens) {
          if (a.x <= 20 || a.x + ALIEN_W * 2 >= W - 20) edge = true;
        }
        if (edge) {
          alienDir = -alienDir;
          for (const a of aliens) if (a.alive) a.y += ALIEN_DROP * 2;
        } else {
          for (const a of aliens) if (a.alive) a.x += alienDir * 8 * 2;
        }
      }

      if (alienTick % 80 === 0 && aliveAliens.length > 0) {
        const shooter = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
        alienBullets.push({
          x: shooter.x + (ALIEN_W * 2) / 2 - 2,
          y: shooter.y + ALIEN_H * 2,
        });
      }

      alienBullets = alienBullets.filter((b) => {
        b.y += ALIEN_BULLET_SPEED * 2;
        if (b.y > H) return false;
        if (
          b.x >= shipX &&
          b.x <= shipX + SHIP_W * 2 &&
          b.y >= shipY &&
          b.y <= shipY + SHIP_H * 2
        ) {
          st.gameOver = true;
          setGameOver(true);
          sfxGameOver();
          if (st.score > highScore) {
            setHighScore(st.score);
            localStorage.setItem('invaders_hs', String(st.score));
          }
          return false;
        }
        return true;
      });

      for (const a of aliveAliens) {
        if (a.y + ALIEN_H * 2 >= shipY) {
          st.gameOver = true;
          setGameOver(true);
          sfxGameOver();
          if (st.score > highScore) {
            setHighScore(st.score);
            localStorage.setItem('invaders_hs', String(st.score));
          }
          break;
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      aliens.forEach((a) => {
        if (!a.alive) return;
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(a.x, a.y, ALIEN_W * 2, ALIEN_H * 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(a.x + 6, a.y + 6, 8, 8);
        ctx.fillRect(a.x + ALIEN_W * 2 - 14, a.y + 6, 8, 8);
      });
      ctx.fillStyle = '#fff';
      ctx.fillRect(shipX, shipY, SHIP_W * 2, SHIP_H * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(shipX + (SHIP_W * 2) / 2 - 8, shipY - 4, 16, 8);
      bullets.forEach((b) => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(b.x, b.y, 4, 12);
      });
      alienBullets.forEach((b) => {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(b.x, b.y, 4, 10);
      });

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
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#001a0d]">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#00ff88]">👾 INVADERS</span>
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
            <div className="text-5xl mb-3">👾</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#00ff88] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">
              Play Again
            </button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">
        ← → to move, Space to shoot
      </div>
    </div>
  );
}
