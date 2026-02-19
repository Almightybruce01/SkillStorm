/* ═══════════════════════════════════════════════════════════
   BUBBLE SHOOTER — Arcade
   Canvas-based Puzzle Bobble style: match 3+, detached fall bonus
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';

interface BubbleShooterGameProps {
  onClose: () => void;
}

const W = 480;
const H = 640;
const BUBBLE_R = 18;
const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
const ROWS_TOP = 8;
const COLS = 11;
const SHOOTER_Y = H - 60;
const SHOOTER_X = W / 2;
const AIM_LENGTH = 120;
const ROW_DROP_INTERVAL_MS = 15000;
const FALL_BONUS_PER = 5;
const BOMB_TYPE = 6;
const RAINBOW_TYPE = 7;
const BOMB_RADIUS = 2;
const COMBO_MULT = 0.25;

type ColorIndex = number;
type ShooterColor = ColorIndex | typeof BOMB_TYPE | typeof RAINBOW_TYPE;

interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

interface Bubble {
  row: number;
  col: number;
  color: ColorIndex;
  x: number;
  y: number;
  falling?: boolean;
  vy?: number;
}

function getBubbleXY(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 0 ? 0 : BUBBLE_R * 1.732;
  const x = BUBBLE_R * 1.732 * 2 * col + BUBBLE_R * 1.732 + offset;
  const y = BUBBLE_R * 2 * row + BUBBLE_R;
  return { x, y };
}

function hexNeighbors(row: number, col: number): [number, number][] {
  const even = row % 2 === 0;
  const deltas: [number, number][] = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  return deltas.map(([dr, dc]) => [row + dr, col + dc] as [number, number]);
}

function getConnectedSameColor(
  grid: (ColorIndex | null)[][],
  startRow: number,
  startCol: number,
  color: ColorIndex
): Set<string> {
  const visited = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;
  const cols = grid[0]?.length ?? COLS;

  function dfs(r: number, c: number) {
    if (r < 0 || r >= grid.length || c < 0 || c >= cols) return;
    if (grid[r][c] !== color) return;
    const k = key(r, c);
    if (visited.has(k)) return;
    visited.add(k);
    hexNeighbors(r, c).forEach(([nr, nc]) => dfs(nr, nc));
  }
  dfs(startRow, startCol);
  return visited;
}

function findFloating(grid: (ColorIndex | null)[][]): Set<string> {
  const attached = new Set<string>();
  const cols = grid[0]?.length ?? COLS;
  const key = (r: number, c: number) => `${r},${c}`;

  function dfs(r: number, c: number) {
    if (r < 0 || r >= grid.length || c < 0 || c >= cols) return;
    if (grid[r][c] == null) return;
    const k = key(r, c);
    if (attached.has(k)) return;
    attached.add(k);
    hexNeighbors(r, c).forEach(([nr, nc]) => dfs(nr, nc));
  }
  for (let c = 0; c < cols; c++) {
    if (grid[0][c] != null) dfs(0, c);
  }
  const floating = new Set<string>();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      if (grid[r][c] != null && !attached.has(key(r, c))) floating.add(key(r, c));
    }
  }
  return floating;
}

function pickNextColor(): ShooterColor {
  const r = Math.random();
  if (r < 0.04) return RAINBOW_TYPE;
  if (r < 0.09) return BOMB_TYPE;
  return Math.floor(Math.random() * COLORS.length) as ColorIndex;
}

function spawnPopParticles(
  x: number,
  y: number,
  color: string,
  setter: React.Dispatch<React.SetStateAction<PopParticle[]>>
) {
  const parts: PopParticle[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
    const spd = 2 + Math.random() * 4;
    parts.push({
      x,
      y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      color,
      life: 1,
      size: 4 + Math.random() * 4,
    });
  }
  setter((p) => [...p, ...parts]);
}

export default function BubbleShooterGame({ onClose }: BubbleShooterGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [grid, setGrid] = useState<(ColorIndex | null)[][]>(() => []);
  const [shooterAngle, setShooterAngle] = useState(-Math.PI / 2);
  const [firedBubble, setFiredBubble] = useState<{ x: number; y: number; vx: number; vy: number; color: ShooterColor } | null>(null);
  const [nextColor, setNextColor] = useState<ShooterColor>(0);
  const [floatingBubbles, setFloatingBubbles] = useState<Bubble[]>([]);
  const [bubblesToRemove, setBubblesToRemove] = useState<Set<string>>(new Set());
  const [popParticles, setPopParticles] = useState<PopParticle[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const nextColorRef = useRef<ShooterColor>(0);
  const gridRef = useRef<(ColorIndex | null)[][]>([]);
  const rowDropTimer = useRef<number>(0);

  const initGrid = useCallback(() => {
    const cols = COLS;
    const rows = ROWS_TOP;
    const g: (ColorIndex | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: (ColorIndex | null)[] = [];
      const numCols = r % 2 === 0 ? cols : cols - 1;
      for (let c = 0; c < numCols; c++) {
        row.push(Math.floor(Math.random() * COLORS.length) as ColorIndex);
      }
      g.push(row);
    }
    return g;
  }, []);

  const startGame = useCallback(() => {
    const g = initGrid();
    setGrid(g);
    gridRef.current = g.map(r => [...r]);
    setScore(0);
    setGameOver(false);
    setStarted(true);
    setFiredBubble(null);
    const nc = pickNextColor();
    setNextColor(nc);
    nextColorRef.current = nc;
    setFloatingBubbles([]);
    setBubblesToRemove(new Set());
    setPopParticles([]);
    setComboCount(0);
    rowDropTimer.current = Date.now();
  }, [initGrid]);

  useEffect(() => {
    if (!started || gameOver) return;
    const g = gridRef.current;
    for (let r = 0; r < g.length; r++) {
      const rowY = BUBBLE_R * 2 * r + BUBBLE_R;
      if (rowY + BUBBLE_R * 2 > SHOOTER_Y - 40) {
        setGameOver(true);
        return;
      }
    }
  }, [grid, started, gameOver]);

  useEffect(() => {
    if (!started || gameOver || !canvasRef.current) return;
    let animId: number;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const g = gridRef.current;

      setFiredBubble((b) => {
        if (!b) return null;
        let nx = b.x + b.vx * dt * 280;
        let ny = b.y + b.vy * dt * 280;
        const hit = checkCollision(g, b.x, b.y, nx, ny, b.color);
        if (hit) {
          const { row, col, newGrid } = hit;
          gridRef.current = newGrid;
          setGrid(newGrid.map(r => [...r]));
          const next = pickNextColor();
          setNextColor(next);
          nextColorRef.current = next;

          const color = b.color;
          let toRemove = new Set<string>();
          let finalGrid = newGrid.map(r => [...r]);

          if (color === BOMB_TYPE) {
            for (let dr = -BOMB_RADIUS; dr <= BOMB_RADIUS; dr++) {
              for (let dc = -BOMB_RADIUS; dc <= BOMB_RADIUS; dc++) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < finalGrid.length && nc >= 0 && nc < (finalGrid[nr]?.length ?? 0) && finalGrid[nr][nc] != null) {
                  toRemove.add(`${nr},${nc}`);
                  const { x, y } = getBubbleXY(nr, nc);
                  spawnPopParticles(x, y, COLORS[finalGrid[nr][nc] as ColorIndex], setPopParticles);
                }
              }
            }
            toRemove.forEach(k => {
              const [r, c] = k.split(',').map(Number);
              finalGrid[r][c] = null;
            });
          } else if (color === RAINBOW_TYPE) {
            let matchColor: ColorIndex = 0;
            for (const [nr, nc] of hexNeighbors(row, col)) {
              if (nr >= 0 && nr < newGrid.length && nc >= 0 && nc < (newGrid[nr]?.length ?? 0)) {
                const cell = newGrid[nr][nc];
                if (cell != null && cell < COLORS.length) {
                  matchColor = cell;
                  break;
                }
              }
            }
            toRemove = getConnectedSameColor(newGrid, row, col, matchColor);
            if (toRemove.size < 3) toRemove = new Set([`${row},${col}`]);
            else toRemove.add(`${row},${col}`);
            toRemove.forEach(k => {
              const [r, c] = k.split(',').map(Number);
              const clr = finalGrid[r]?.[c];
              if (clr != null && clr < COLORS.length) {
                const { x, y } = getBubbleXY(r, c);
                spawnPopParticles(x, y, COLORS[clr], setPopParticles);
              }
            });
            toRemove.forEach(k => {
              const [r, c] = k.split(',').map(Number);
              finalGrid[r][c] = null;
            });
          } else {
            const connected = getConnectedSameColor(newGrid, row, col, color as ColorIndex);
            if (connected.size >= 3) {
              toRemove = connected;
              toRemove.forEach(k => {
                const [r, c] = k.split(',').map(Number);
                const clr = finalGrid[r]?.[c];
                if (clr != null) {
                  const { x, y } = getBubbleXY(r, c);
                  spawnPopParticles(x, y, COLORS[clr], setPopParticles);
                }
              });
              toRemove.forEach(k => {
                const [r, c] = k.split(',').map(Number);
                finalGrid[r][c] = null;
              });
            }
          }

          if (toRemove.size > 0) {
            setBubblesToRemove(toRemove);
            gridRef.current = finalGrid;
            setGrid(finalGrid.map(r => [...r]));
            const comboMult = 1 + comboCount * COMBO_MULT;
            setScore(s => s + Math.floor(toRemove.size * 10 * comboMult));
            setComboCount((c) => c + 1);

            setTimeout(() => {
              const floating = findFloating(finalGrid);
              if (floating.size > 0) {
                const fallBonus = Math.floor(floating.size * FALL_BONUS_PER * (1 + comboCount * COMBO_MULT));
                setScore(s => s + fallBonus);
                const bubbles: Bubble[] = [];
                floating.forEach(k => {
                  const [r, c] = k.split(',').map(Number);
                  const clr = finalGrid[r][c];
                  if (clr != null) {
                    const { x, y } = getBubbleXY(r, c);
                    bubbles.push({ row: r, col: c, color: clr, x, y, falling: true, vy: 200 });
                  }
                });
                const ng3 = finalGrid.map(row => [...row]);
                floating.forEach(k => {
                  const [r, c] = k.split(',').map(Number);
                  ng3[r][c] = null;
                });
                gridRef.current = ng3;
                setGrid(ng3.map(r => [...r]));
                setFloatingBubbles(bubbles);
              }
              setBubblesToRemove(new Set());
            }, 100);
          }
          return null;
        }
        if (ny < -BUBBLE_R * 2) {
          setComboCount(0);
          const next = pickNextColor();
          setNextColor(next);
          nextColorRef.current = next;
          return null;
        }
        return { ...b, x: nx, y: ny };
      });

      setFloatingBubbles(prev =>
        prev
          .map(bb => ({ ...bb, y: bb.y + (bb.vy ?? 0) * dt }))
          .filter(bb => bb.y < H + BUBBLE_R * 2)
      );

      animId = requestAnimationFrame(tick);
    };

    function checkCollision(
      gr: (ColorIndex | null)[][],
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      color: ShooterColor
    ): { row: number; col: number; newGrid: (ColorIndex | null)[][] } | null {
      const numCols = gr[0]?.length ?? COLS;
      for (let r = 0; r < gr.length; r++) {
        for (let c = 0; c < (gr[r]?.length ?? 0); c++) {
          if (gr[r][c] != null) {
            const { x, y } = getBubbleXY(r, c);
            const dx = x1 - x;
            const dy = y1 - y;
            if (dx * dx + dy * dy < (BUBBLE_R * 2) ** 2) {
              const newGrid = gr.map(row => [...row]);
              newGrid[r][c] = color;
              return { row: r, col: c, newGrid };
            }
          }
        }
      }
      const snap = snapToGrid(x1, y1, gr);
      if (snap) {
        const newGrid = gr.map(row => [...row]);
        const r = snap.row;
        const c = snap.col;
        if (r >= newGrid.length) newGrid.push([]);
        while (newGrid[r].length <= c) newGrid[r].push(null);
        newGrid[r][c] = color;
        return { row: r, col: c, newGrid };
      }
      return null;
    }

    function snapToGrid(x: number, y: number, gr: (ColorIndex | null)[][]): { row: number; col: number } | null {
      if (y < BUBBLE_R) return null;
      const row = Math.round((y - BUBBLE_R) / (BUBBLE_R * 2));
      const offset = row % 2 === 0 ? 0 : BUBBLE_R * 1.732;
      const col = Math.round((x - BUBBLE_R * 1.732 - offset) / (BUBBLE_R * 1.732 * 2));
      const numCols = row % 2 === 0 ? COLS : COLS - 1;
      if (col < 0 || col >= numCols || row < 0) return null;
      return { row, col };
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setPopParticles((p) =>
        p
          .map((pt) => ({
            ...pt,
            x: pt.x + pt.vx,
            y: pt.y + pt.vy,
            vy: pt.vy + 0.3,
            life: pt.life - 0.04,
          }))
          .filter((pt) => pt.life > 0)
      );
    }, 16);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!started || gameOver) return;
    const t = setInterval(() => {
      const elapsed = Date.now() - rowDropTimer.current;
      if (elapsed >= ROW_DROP_INTERVAL_MS) {
        rowDropTimer.current = Date.now();
        setGrid(prev => {
          const newRow = Array(COLS).fill(null).map(() => Math.floor(Math.random() * COLORS.length) as ColorIndex);
          const newGrid = [newRow, ...prev];
          gridRef.current = newGrid;
          return newGrid;
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [started, gameOver]);

  useEffect(() => {
    if (!started || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    const g = gridRef.current;
    const key = (r: number, c: number) => `${r},${c}`;
    for (let r = 0; r < g.length; r++) {
      for (let c = 0; c < (g[r]?.length ?? 0); c++) {
        const cell = g[r][c];
        if (cell == null) continue;
        const { x, y } = getBubbleXY(r, c);
        const removing = bubblesToRemove.has(key(r, c));
        ctx.globalAlpha = removing ? 0.5 : 1;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[cell];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    floatingBubbles.forEach(bb => {
      ctx.beginPath();
      ctx.arc(bb.x, bb.y, BUBBLE_R - 1, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[bb.color];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    });

    const angle = shooterAngle;
    const tipX = SHOOTER_X + Math.cos(angle) * AIM_LENGTH;
    const tipY = SHOOTER_Y + Math.sin(angle) * AIM_LENGTH;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SHOOTER_X, SHOOTER_Y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    if (!firedBubble) {
      const previewLen = 200;
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SHOOTER_X, SHOOTER_Y);
      ctx.lineTo(SHOOTER_X + Math.cos(angle) * previewLen, SHOOTER_Y + Math.sin(angle) * previewLen);
      ctx.stroke();
      ctx.setLineDash([]);
      const ghostX = SHOOTER_X + Math.cos(angle) * previewLen;
      const ghostY = SHOOTER_Y + Math.sin(angle) * previewLen;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(ghostX, ghostY, BUBBLE_R - 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (nextColor === BOMB_TYPE) {
        ctx.fillStyle = '#1f2937';
      } else if (nextColor === RAINBOW_TYPE) {
        const g = ctx.createLinearGradient(ghostX - BUBBLE_R, ghostY, ghostX + BUBBLE_R, ghostY);
        COLORS.forEach((c, i) => g.addColorStop(i / COLORS.length, c));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = COLORS[nextColor];
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.arc(SHOOTER_X, SHOOTER_Y, BUBBLE_R + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();

    if (!firedBubble) {
      ctx.beginPath();
      ctx.arc(SHOOTER_X, SHOOTER_Y, BUBBLE_R - 1, 0, Math.PI * 2);
      if (nextColor === BOMB_TYPE) {
        ctx.fillStyle = '#1f2937';
      } else if (nextColor === RAINBOW_TYPE) {
        const g = ctx.createLinearGradient(SHOOTER_X - BUBBLE_R, SHOOTER_Y, SHOOTER_X + BUBBLE_R, SHOOTER_Y);
        COLORS.forEach((c, i) => g.addColorStop(i / COLORS.length, c));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = COLORS[nextColor];
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }

    if (firedBubble) {
      ctx.beginPath();
      ctx.arc(firedBubble.x, firedBubble.y, BUBBLE_R - 1, 0, Math.PI * 2);
      if (firedBubble.color === BOMB_TYPE) {
        ctx.fillStyle = '#1f2937';
      } else if (firedBubble.color === RAINBOW_TYPE) {
        const g = ctx.createLinearGradient(firedBubble.x - BUBBLE_R, firedBubble.y, firedBubble.x + BUBBLE_R, firedBubble.y);
        COLORS.forEach((c, i) => g.addColorStop(i / COLORS.length, c));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = COLORS[firedBubble.color as ColorIndex];
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
    }
    popParticles.forEach((pt) => {
      ctx.globalAlpha = pt.life;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }, [grid, shooterAngle, firedBubble, nextColor, floatingBubbles, bubblesToRemove, popParticles, started, gameOver]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || firedBubble) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top) * scaleY;
      let angle = Math.atan2(cy - SHOOTER_Y, cx - SHOOTER_X);
      const half = (Math.PI * 0.85) / 2;
      angle = Math.max(-Math.PI / 2 - half, Math.min(-Math.PI / 2 + half, angle));
      setShooterAngle(angle);
    },
    [firedBubble]
  );

  const handleClick = useCallback(() => {
    if (!started || gameOver || firedBubble) return;
    const angle = shooterAngle;
    setFiredBubble({
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      color: nextColorRef.current,
    });
  }, [started, gameOver, firedBubble, shooterAngle]);

  if (!started) {
    return (
      <div className="game-card bg-white w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bubble Shooter</h2>
          <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
        </div>
        <p className="text-gray-700 mb-4">Match 3+ same-colored bubbles. Detached bubbles fall for bonus. Rows push down over time.</p>
        <button onClick={startGame} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">Start</button>
      </div>
    );
  }

  return (
    <div className="game-card bg-white w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900">Bubble Shooter</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
      </div>
      <div className="flex justify-between items-center mb-2 text-gray-900 flex-wrap gap-2">
        <span className="font-semibold">Score: {score}</span>
        {comboCount >= 2 && (
          <span className="text-amber-600 font-bold">Combo x{comboCount}!</span>
        )}
      </div>
      {gameOver ? (
        <div className="text-center py-8">
          <p className="text-lg font-bold text-gray-900 mb-4">Game Over</p>
          <p className="text-gray-700 mb-4">Score: {score}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={startGame} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">Play Again</button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-slate-100 inline-block w-full" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block w-full cursor-crosshair"
              style={{ width: W, height: H, maxWidth: '100%' }}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
              onTouchStart={(e) => e.preventDefault()}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!canvasRef.current || firedBubble) return;
                const t = e.touches[0];
                if (t) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  const scaleX = W / rect.width;
                  const scaleY = H / rect.height;
                  const cx = (t.clientX - rect.left) * scaleX;
                  const cy = (t.clientY - rect.top) * scaleY;
                  let angle = Math.atan2(cy - SHOOTER_Y, cx - SHOOTER_X);
                  const half = (Math.PI * 0.85) / 2;
                  angle = Math.max(-Math.PI / 2 - half, Math.min(-Math.PI / 2 + half, angle));
                  setShooterAngle(angle);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (e.changedTouches[0]) handleClick();
              }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Aim with mouse/touch, click or release to fire. Match 3+ to pop! Bomb clears area, Rainbow matches any color.
          </p>
        </>
      )}
    </div>
  );
}
