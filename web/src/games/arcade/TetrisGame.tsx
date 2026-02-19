/* BLOCK STACK (Tetris-style) — Stack falling blocks, clear lines */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxCoin, sfxGameOver, sfxLevelUp, sfxClick } from '../SoundEngine';

const COLS = 10, ROWS = 20;
const COLORS = ['#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4'];

const SHAPES = [
  [[1,1,1,1]], // I
  [[1,1],[1,1]], // O
  [[0,1,0],[1,1,1]], // T
  [[1,0,0],[1,1,1]], // L
  [[0,0,1],[1,1,1]], // J
  [[0,1,1],[1,1,0]], // S
  [[1,1,0],[0,1,1]], // Z
];

export function TetrisGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({ score: 0, level: 1, gameOver: false });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth * 2;
    const H = canvas.height = canvas.offsetHeight * 2;
    const CELL = Math.min(Math.floor(W / (COLS + 6)), Math.floor(H / ROWS));
    const BOARD_X = (W - COLS * CELL) / 2;
    const st = stateRef.current;

    const board: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let piece: { shape: number[][]; color: string; x: number; y: number } | null = null;
    let frame = 0;
    let lines = 0;
    let keys: Record<string, boolean> = {};

    function newPiece() {
      const idx = Math.floor(Math.random() * SHAPES.length);
      piece = {
        shape: SHAPES[idx].map(r => [...r]),
        color: COLORS[idx],
        x: Math.floor(COLS / 2) - 1,
        y: 0,
      };
      if (!canPlace(piece.shape, piece.x, piece.y)) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
      }
    }

    function canPlace(shape: number[][], px: number, py: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const bx = px + c, by = py + r;
          if (bx < 0 || bx >= COLS || by >= ROWS) return false;
          if (by >= 0 && board[by][bx]) return false;
        }
      }
      return true;
    }

    function lockPiece() {
      if (!piece) return;
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue;
          const bx = piece.x + c, by = piece.y + r;
          if (by >= 0 && by < ROWS) board[by][bx] = piece.color;
        }
      }
      // Clear lines
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(c => c !== null)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(null));
          cleared++;
          r++; // recheck this row
        }
      }
      if (cleared > 0) {
        const pts = [0, 100, 300, 500, 800][cleared] || 800;
        st.score += pts;
        setScore(st.score);
        lines += cleared;
        sfxCoin();
        if (lines % 10 === 0) { st.level++; setLevel(st.level); sfxLevelUp(); }
      }
      newPiece();
    }

    function rotatePiece() {
      if (!piece) return;
      const s = piece.shape;
      const rotated = s[0].map((_, c) => s.map(row => row[c]).reverse());
      if (canPlace(rotated, piece.x, piece.y)) piece.shape = rotated;
    }

    const onKey = (e: KeyboardEvent) => {
      keys[e.key] = true;
      if (!piece || st.gameOver) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') { if (canPlace(piece.shape, piece.x - 1, piece.y)) piece.x--; }
      if (e.key === 'ArrowRight' || e.key === 'd') { if (canPlace(piece.shape, piece.x + 1, piece.y)) piece.x++; }
      if (e.key === 'ArrowUp' || e.key === 'w') rotatePiece();
      if (e.key === 'ArrowDown' || e.key === 's') { if (canPlace(piece.shape, piece.x, piece.y + 1)) piece.y++; }
      if (e.key === ' ') { while (piece && canPlace(piece.shape, piece.x, piece.y + 1)) piece.y++; lockPiece(); }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key] = false; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);

    newPiece();

    let animId: number;
    function loop() {
      if (st.gameOver) return;
      frame++;
      const speed = Math.max(5, 30 - st.level * 3);
      if (frame % speed === 0 && piece) {
        if (canPlace(piece.shape, piece.x, piece.y + 1)) { piece.y++; }
        else { lockPiece(); }
      }

      // Draw
      if (!ctx) return;
      ctx.fillStyle = '#0a0a2b';
      ctx.fillRect(0, 0, W, H);

      // Board outline
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(BOARD_X - 1, 0, COLS * CELL + 2, ROWS * CELL);

      // Board cells
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = BOARD_X + c * CELL, y = r * CELL;
          if (board[r][c]) {
            ctx.fillStyle = board[r][c]!;
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x + 1, y + 1, CELL - 2, 3);
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.01)';
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          }
        }
      }

      // Current piece
      if (piece) {
        ctx.shadowColor = piece.color;
        ctx.shadowBlur = 8;
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (!piece.shape[r][c]) continue;
            const x = BOARD_X + (piece.x + c) * CELL, y = (piece.y + r) * CELL;
            ctx.fillStyle = piece.color;
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
          }
        }
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameOver) return;
    stateRef.current = { score: 0, level: 1, gameOver: false };
    setScore(0); setLevel(1);
    return startGame();
  }, [startGame, gameOver]);

  const restart = () => { setGameOver(false); sfxClick(); };

  return (
    <div className="game-card !p-0 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-[#3b82f6]/5">
        <div className="flex items-center gap-4">
          <span className="text-xs font-black text-[#3b82f6]">🧱 BLOCK STACK</span>
          <span className="text-xs font-black text-gray-500">SCORE {score}</span>
          <span className="text-xs text-gray-500">LVL {level}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-xs px-2 py-1 rounded hover:bg-white/10 transition-all">✕</button>
      </div>
      <div className="relative" style={{ height: '500px' }}>
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/80">
            <div className="text-5xl mb-3">🧱</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black text-[#3b82f6] mb-4">{score}</p>
            <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
          </div>
        )}
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <div className="p-2 text-center text-gray-500 text-[10px] border-t border-gray-200">←→ Move • ↑ Rotate • ↓ Soft Drop • Space Hard Drop</div>
    </div>
  );
}
