/* Fruit Ninja — Canvas fruit slicing */
import { useRef, useEffect, useState, useCallback } from 'react';
import { sfxPop, sfxWrong, sfxGameOver } from '../SoundEngine';

const COLORS = ['#ef4444','#22c55e','#eab308','#3b82f6','#a855f7','#f97316'];
interface Fruit { id: number; x: number; y: number; vx: number; vy: number; r: number; color: string; bomb: boolean; pts: number; sliced: boolean; }
function spawn(w: number, h: number, lv: number): Fruit {
  const bomb = Math.random() < 0.1 + lv * 0.01;
  const r = 20 + Math.random() * 12;
  const x = r + Math.random() * (w - 2 * r);
  const a = -Math.PI / 2 - 0.4 + Math.random() * 0.8;
  const sp = 8 + lv * 1.2;
  return { id: Math.random(), x, y: h + r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, color: bomb ? '#374151' : COLORS[Math.floor(Math.random() * COLORS.length)], bomb, pts: bomb ? 0 : 10 + Math.floor(Math.random() * 20), sliced: false };
}

export function FruitNinjaGame({ onClose }: { onClose: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [lv, setLv] = useState(1);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);

  useEffect(() => { overRef.current = over; }, [over]);

  const start = useCallback(() => {
    const c = cvs.current; if (!c) return () => {};
    const ctx = c.getContext('2d')!; if (!ctx) return () => {};
    const dpr = Math.min(2, devicePixelRatio || 1);
    const cw = c.offsetWidth; const ch = c.offsetHeight;
    c.width = cw * dpr; c.height = ch * dpr; ctx.scale(dpr, dpr);
    let fruits: Fruit[] = [], trail: { x: number; y: number }[] = [], timer = 0, level = 1;
    const g = 0.35;

    const getXY = (e: MouseEvent | TouchEvent) => {
      const cx = 'touches' in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
      const cy = 'touches' in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;
      if (cx == null || cy == null) return null;
      const r = c.getBoundingClientRect();
      return { x: (cx - r.left) * cw / r.width, y: (cy - r.top) * ch / r.height };
    };
    const slice = (x: number, y: number) => {
      for (const f of fruits) {
        if (f.sliced) continue;
        if ((x - f.x) ** 2 + (y - f.y) ** 2 <= f.r ** 2) {
          f.sliced = true;
          if (f.bomb) { livesRef.current--; setLives(livesRef.current); if (livesRef.current <= 0) { setOver(true); sfxGameOver(); } else sfxWrong(); }
          else { scoreRef.current += f.pts; setScore(scoreRef.current); sfxPop(); }
        }
      }
    };
    const onMove = (e: MouseEvent | TouchEvent) => { const p = getXY(e); if (p) { trail.push(p); if (trail.length > 20) trail.shift(); slice(p.x, p.y); } };
    const onDown = (e: MouseEvent | TouchEvent) => { trail = []; const p = getXY(e); if (p) { trail.push(p); slice(p.x, p.y); } };
    c.addEventListener('mousemove', onMove); c.addEventListener('mousedown', onDown);
    c.addEventListener('touchmove', onMove, { passive: true }); c.addEventListener('touchstart', onDown, { passive: true });

    let aid: number;
    function loop() {
      if (overRef.current) return;
      ctx.clearRect(0, 0, cw, ch);
      timer++;
      if (timer >= Math.max(20 - level * 2, 10)) { timer = 0; fruits.push(spawn(cw, ch, level)); }
      fruits = fruits.filter(f => {
        f.x += f.vx; f.y += f.vy; f.vy += g;
        if (f.y - f.r > ch + 20 || f.sliced) return false;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        if (f.bomb) { ctx.fillStyle = '#fff'; ctx.font = `bold ${f.r}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('💣', f.x, f.y); }
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 2; ctx.stroke();
        return true;
      });
      for (let i = 0; i < trail.length - 1; i++) {
        const a = trail[i], b = trail[i + 1];
        ctx.strokeStyle = `rgba(34,197,94,${0.9 - (i / trail.length) * 0.7})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      aid = requestAnimationFrame(loop);
    }
    aid = requestAnimationFrame(loop);
    const lvl = setInterval(() => { level = Math.min(level + 1, 15); setLv(level); }, 12000);
    return () => { clearInterval(lvl); cancelAnimationFrame(aid); c.removeEventListener('mousemove', onMove); c.removeEventListener('mousedown', onDown); c.removeEventListener('touchmove', onMove); c.removeEventListener('touchstart', onDown); };
  }, []);

  useEffect(() => { if (over) return; scoreRef.current = 0; livesRef.current = 3; return start(); }, [start, over]);

  const restart = () => { setScore(0); setLives(3); setOver(false); setLv(1); };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">🍉 Fruit Ninja</span>
          <span className="text-xs text-gray-600">Score: {score}</span>
          <span className="text-xs">{Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
          <span className="text-xs text-gray-400">Lv {lv}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={restart} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">New</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Exit</button>
        </div>
      </div>
      <div className="relative" style={{ height: '400px' }}>
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/90">
            <p className="text-2xl font-bold text-gray-800 mb-1">Game Over</p>
            <p className="text-lg text-gray-600 mb-4">Score: {score}</p>
            <button onClick={restart} className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded">Play Again</button>
          </div>
        )}
        <canvas ref={cvs} className="w-full h-full block touch-none" style={{ background: 'linear-gradient(to top,#fef3c7,#fde68a,#fef9c3)' }} />
      </div>
      <p className="p-2 text-center text-xs text-gray-400 border-t border-gray-200">Drag to slice fruits · Avoid bombs</p>
    </div>
  );
}
