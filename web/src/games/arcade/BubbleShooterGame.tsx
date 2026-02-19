/* Bubble Shooter — Match-3 bubble popping */
import { useState, useRef, useEffect, useCallback } from 'react';
import { sfxPop, sfxGameOver, sfxClick } from '../SoundEngine';

const COLS = 10, ROWS = 12, R = 16;
const COLORS = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316'];
type Cell = string | null;

function initGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) row.push(r < 5 ? COLORS[Math.floor(Math.random() * COLORS.length)] : null);
    grid.push(row);
  }
  return grid;
}

function getPos(r: number, c: number): { x: number; y: number } {
  const offset = r % 2 === 1 ? R : 0;
  return { x: c * R * 2 + R + offset, y: r * R * 1.7 + R };
}

function findMatches(grid: Cell[][], sr: number, sc: number, color: string): [number, number][] {
  const visited = new Set<string>();
  const matches: [number, number][] = [];
  const q: [number, number][] = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.pop()!;
    const k = `${r},${c}`;
    if (visited.has(k)) continue;
    visited.add(k);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== color) continue;
    matches.push([r, c]);
    const even = r % 2 === 0;
    const neighbors: [number, number][] = [[r, c - 1], [r, c + 1], [r - 1, even ? c - 1 : c], [r - 1, even ? c : c + 1], [r + 1, even ? c - 1 : c], [r + 1, even ? c : c + 1]];
    for (const [nr, nc] of neighbors) q.push([nr, nc]);
  }
  return matches;
}

export function BubbleShooterGame({ onClose }: { onClose: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const gridRef = useRef(initGrid());
  const currentColor = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const aimAngle = useRef(-Math.PI / 2);
  const shooting = useRef<{ x: number; y: number; vx: number; vy: number; color: string } | null>(null);

  const draw = useCallback(() => {
    const c = cvs.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cw = c.offsetWidth; const ch = c.offsetHeight;
    c.width = cw * dpr; c.height = ch * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cw, ch);

    // Grid
    const grid = gridRef.current;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const color = grid[r][col];
        if (!color) continue;
        const { x, y } = getPos(r, col);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y, R - 1, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 1; ctx.stroke();
      }
    }

    // Shooting bubble
    const s = shooting.current;
    if (s) {
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, R - 1, 0, Math.PI * 2); ctx.fill();
    }

    // Aim line
    const sx = cw / 2, sy = ch - 30;
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(aimAngle.current) * 100, sy + Math.sin(aimAngle.current) * 100);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current bubble
    ctx.fillStyle = currentColor.current;
    ctx.beginPath(); ctx.arc(sx, sy, R - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2; ctx.stroke();
  }, []);

  useEffect(() => {
    const c = cvs.current; if (!c) return;
    const cw = c.offsetWidth; const ch = c.offsetHeight;

    const onMove = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * cw / rect.width;
      const my = (e.clientY - rect.top) * ch / rect.height;
      aimAngle.current = Math.atan2(my - (ch - 30), mx - cw / 2);
      if (aimAngle.current > -0.15) aimAngle.current = -0.15;
      if (aimAngle.current < -Math.PI + 0.15) aimAngle.current = -Math.PI + 0.15;
    };

    const onClick = () => {
      if (shooting.current || over) return;
      sfxClick();
      const sx = cw / 2, sy = ch - 30;
      const speed = 10;
      shooting.current = { x: sx, y: sy, vx: Math.cos(aimAngle.current) * speed, vy: Math.sin(aimAngle.current) * speed, color: currentColor.current };
      currentColor.current = COLORS[Math.floor(Math.random() * COLORS.length)];
    };

    c.addEventListener('mousemove', onMove);
    c.addEventListener('click', onClick);

    let aid: number;
    function loop() {
      const s = shooting.current;
      if (s) {
        s.x += s.vx; s.y += s.vy;
        // Wall bounce
        if (s.x < R || s.x > cw - R) s.vx *= -1;
        // Check collision with grid
        const grid = gridRef.current;
        let placed = false;
        if (s.y < R) { // Top wall
          const col = Math.min(COLS - 1, Math.max(0, Math.round((s.x - R) / (R * 2))));
          grid[0][col] = s.color;
          placed = true;
        }
        if (!placed) {
          for (let r = 0; r < ROWS && !placed; r++) {
            for (let col = 0; col < COLS && !placed; col++) {
              if (!grid[r][col]) continue;
              const { x, y } = getPos(r, col);
              if (Math.hypot(s.x - x, s.y - y) < R * 1.8) {
                // Place in nearest empty neighbor
                const even = r % 2 === 0;
                const neighbors: [number, number][] = [[r, col - 1], [r, col + 1], [r - 1, even ? col - 1 : col], [r - 1, even ? col : col + 1], [r + 1, even ? col - 1 : col], [r + 1, even ? col : col + 1]];
                let bestDist = Infinity, bestR = -1, bestC = -1;
                for (const [nr, nc] of neighbors) {
                  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
                  if (grid[nr][nc]) continue;
                  const { x: nx, y: ny } = getPos(nr, nc);
                  const d = Math.hypot(s.x - nx, s.y - ny);
                  if (d < bestDist) { bestDist = d; bestR = nr; bestC = nc; }
                }
                if (bestR >= 0) { grid[bestR][bestC] = s.color; placed = true; }
              }
            }
          }
        }
        if (placed) {
          shooting.current = null;
          // Check matches
          for (let r = 0; r < ROWS; r++) {
            for (let col = 0; col < COLS; col++) {
              const color = grid[r][col];
              if (!color) continue;
              const matches = findMatches(grid, r, col, color);
              if (matches.length >= 3) {
                for (const [mr, mc] of matches) grid[mr][mc] = null;
                setScore(sc => sc + matches.length * 10);
                sfxPop();
              }
            }
          }
          // Check game over
          if (grid[ROWS - 1].some(c => c !== null)) { setOver(true); sfxGameOver(); }
        }
      }
      draw();
      aid = requestAnimationFrame(loop);
    }
    aid = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(aid); c.removeEventListener('mousemove', onMove); c.removeEventListener('click', onClick); };
  }, [draw, over]);

  const restart = () => { gridRef.current = initGrid(); shooting.current = null; currentColor.current = COLORS[Math.floor(Math.random() * COLORS.length)]; setScore(0); setOver(false); };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">🫧 Bubble Shooter</span>
          <span className="text-xs text-gray-600">Score: {score}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={restart} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">New</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Exit</button>
        </div>
      </div>
      <div className="relative" style={{ height: '420px' }}>
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/90">
            <p className="text-2xl font-bold text-gray-800 mb-1">Game Over</p>
            <p className="text-lg text-gray-600 mb-4">Score: {score}</p>
            <button onClick={restart} className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded">Play Again</button>
          </div>
        )}
        <canvas ref={cvs} className="w-full h-full block" style={{ background: 'linear-gradient(to bottom, #eff6ff, #dbeafe)' }} />
      </div>
      <p className="p-2 text-center text-xs text-gray-400 border-t border-gray-200">Aim with mouse · Click to shoot · Match 3+ to pop</p>
    </div>
  );
}
