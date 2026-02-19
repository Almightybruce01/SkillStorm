/* ═══════════════════════════════════════════════════════════
   TARGET RANGE / SHOOTING GALLERY ENGINE — ELITE EDITION
   Used by: Vocabulary Sniper, Statistics Paintball, Spelling Sniper
   Features: bouncing targets, crosshair cursor, splat FX,
   wind shifts, progressive speed, streak bonus,
   themed environments, game over with high scores
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';
import { generateMathQuestion, getRandomQuestion, type Grade, type Question } from '../questionBank';
import { sfxShoot, sfxCorrect, sfxWrong, sfxGameOver, sfxLevelUp, sfxStreak } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
interface Target {
  id: number; x: number; y: number; vx: number; vy: number;
  text: string; size: number; bobPhase: number;
}
interface Splat { id: number; x: number; y: number; correct: boolean; life: number; }
interface FloatingText { id: number; x: number; y: number; text: string; color: string; life: number; }

const THEMES: Record<string, { accent: string; bg1: string; bg2: string; targetBg: string; targetBorder: string; env: string }> = {
  vocabulary_sniper:    { accent: '#10b981', bg1: '#ecfdf5', bg2: '#d1fae5', targetBg: '#d1fae5', targetBorder: '#6ee7b7', env: 'Forest' },
  statistics_paintball: { accent: '#f97316', bg1: '#fff7ed', bg2: '#fed7aa', targetBg: '#fff7ed', targetBorder: '#fdba74', env: 'Desert' },
  spelling_sniper:      { accent: '#8b5cf6', bg1: '#f5f3ff', bg2: '#ede9fe', targetBg: '#ede9fe', targetBorder: '#c4b5fd', env: 'Night' },
  context_clue_hunt:    { accent: '#06b6d4', bg1: '#ecfeff', bg2: '#cffafe', targetBg: '#cffafe', targetBorder: '#67e8f9', env: 'Ocean' },
  default:              { accent: '#3b82f6', bg1: '#eff6ff', bg2: '#dbeafe', targetBg: '#dbeafe', targetBorder: '#93c5fd', env: 'Range' },
};

function getSubject(gameId: string): 'math' | 'vocabulary' {
  const map: Record<string, 'math' | 'vocabulary'> = {
    vocabulary_sniper: 'vocabulary', statistics_paintball: 'math',
    spelling_sniper: 'vocabulary', context_clue_hunt: 'vocabulary',
  };
  return map[gameId] ?? 'vocabulary';
}

function getNextQuestion(grade: Grade, gameId: string): Question {
  const subject = getSubject(gameId);
  return subject === 'math' ? generateMathQuestion(grade) : getRandomQuestion(grade, subject);
}

let uid = 0;

/* ─── Component ─────────────────────────────────────────── */
export function TargetRange({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const theme = THEMES[gameId] ?? THEMES.default;
  const areaRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(5);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [splats, setSplats] = useState<Splat[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [shaking, setShaking] = useState(false);
  const [highScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_tr`) || '0'));
  const stateRef = useRef({ lives: 5, gameOver: false, score: 0 });

  useEffect(() => {
    stateRef.current = { lives, gameOver, score };
  }, [lives, gameOver, score]);

  /* ─── Spawn targets ─────────────────────────── */
  const spawnTargets = useCallback(() => {
    const q = getNextQuestion(grade, gameId);
    setQuestion(q);
    const baseSpeed = 0.6 + level * 0.2;
    const extraTargets = level >= 5 ? 1 : 0;

    const opts = [...q.options];
    for (let i = 0; i < extraTargets; i++) opts.push(String(Math.floor(Math.random() * 50)));

    setTargets(opts.map((text) => ({
      id: uid++, text,
      x: 10 + Math.random() * 65,
      y: 10 + Math.random() * 60,
      vx: (Math.random() - 0.5) * baseSpeed * 2,
      vy: (Math.random() - 0.5) * baseSpeed * 2,
      size: 60 + Math.random() * 16,
      bobPhase: Math.random() * Math.PI * 2,
    })));
  }, [grade, gameId, level]);

  useEffect(() => {
    if (!gameOver) spawnTargets();
  }, [spawnTargets, gameOver]);

  /* ─── Movement tick ─────────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    const tick = setInterval(() => {
      setTargets(prev => prev.map(t => {
        let nx = t.x + t.vx;
        let ny = t.y + t.vy;
        let nvx = t.vx;
        let nvy = t.vy;
        if (nx < 2 || nx > 82) nvx = -nvx;
        if (ny < 2 || ny > 75) nvy = -nvy;
        return { ...t, x: Math.max(2, Math.min(82, nx)), y: Math.max(2, Math.min(75, ny)), vx: nvx, vy: nvy, bobPhase: t.bobPhase + 0.05 };
      }));

      // Decay effects
      setSplats(prev => prev.map(s => ({ ...s, life: s.life - 1 })).filter(s => s.life > 0));
      setFloatingTexts(prev => prev.map(f => ({ ...f, y: f.y - 0.5, life: f.life - 1 })).filter(f => f.life > 0));
    }, 40);
    return () => clearInterval(tick);
  }, [gameOver]);

  /* ─── Target click ──────────────────────────── */
  const handleTargetClick = (target: Target) => {
    if (!question || gameOver) return;
    sfxShoot();

    const correct = target.text === question.answer;
    setSplats(prev => [...prev, { id: uid++, x: target.x, y: target.y, correct, life: 15 }]);

    if (correct) {
      const streakBonus = Math.min(streak * 3, 25);
      const points = 10 * level + streakBonus;
      sfxCorrect();

      setScore(s => {
        const ns = s + points;
        if (ns > highScore) localStorage.setItem(`sz_hs_${gameId}_tr`, String(ns));
        return ns;
      });
      setStreak(s => {
        const ns = s + 1;
        if (ns >= 5) sfxStreak();
        return ns;
      });

      setFloatingTexts(prev => [...prev, {
        id: uid++, x: target.x, y: target.y,
        text: streak >= 3 ? `+${points} (${streak + 1}×!)` : `+${points}`,
        color: theme.accent, life: 25,
      }]);

      setCorrectCount(c => {
        const nc = c + 1;
        if (nc >= 5) {
          setLevel(l => l + 1);
          sfxLevelUp();
          return 0;
        }
        return nc;
      });

      setTimeout(() => spawnTargets(), 300);
    } else {
      sfxWrong();
      setStreak(0);
      setShaking(true);
      setTimeout(() => setShaking(false), 200);

      setLives(l => {
        const nl = l - 1;
        if (nl <= 0) {
          setGameOver(true);
          sfxGameOver();
          const s = stateRef.current.score;
          if (s > highScore) localStorage.setItem(`sz_hs_${gameId}_tr`, String(s));
        }
        return nl;
      });

      setFloatingTexts(prev => [...prev, {
        id: uid++, x: target.x, y: target.y,
        text: '✗ MISS', color: '#ef4444', life: 20,
      }]);

      setTimeout(() => { if (!stateRef.current.gameOver) spawnTargets(); }, 400);
    }
  };

  const restart = () => {
    setScore(0); setLevel(1); setLives(5); setStreak(0);
    setCorrectCount(0); setGameOver(false);
    setSplats([]); setFloatingTexts([]);
    stateRef.current = { lives: 5, gameOver: false, score: 0 };
  };

  return (
    <div className={`game-card !p-0 overflow-hidden animate-pop-in transition-transform ${shaking ? 'translate-x-1' : ''}`} style={{ border: `1px solid ${theme.accent}30` }}>
      {/* ── HUD ────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${theme.accent}08` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          <span className="text-xs font-bold text-gray-400">{theme.env}</span>
          {streak >= 3 && <span className="text-[10px] font-black text-amber-500 animate-pulse">{streak}🔥</span>}
          <span className="text-xs">{Array.from({ length: 5 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
      </div>

      {/* ── Level progress ─────────────────────── */}
      <div className="flex justify-center gap-1 px-4 py-1.5 bg-gray-50 border-b border-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-8 h-1.5 rounded-full transition-all ${i < correctCount ? 'bg-green-400' : 'bg-gray-200'}`} />
        ))}
        <span className="text-[9px] text-gray-400 ml-2">{correctCount}/5 to Level {level + 1}</span>
      </div>

      {/* ── Question ──────────────────────────── */}
      {question && (
        <div className="text-center py-2 border-b border-gray-100" style={{ background: theme.bg1 }}>
          <p className="text-gray-400 text-[10px] font-bold tracking-wider">SHOOT THE CORRECT ANSWER</p>
          <p className="text-xl font-black text-gray-800">{question.text}</p>
        </div>
      )}

      {/* ── Shooting Gallery ──────────────────── */}
      <div ref={areaRef} className="relative overflow-hidden" style={{
        height: '300px',
        background: `linear-gradient(180deg, ${theme.bg1}, ${theme.bg2})`,
        cursor: 'crosshair',
      }}>
        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/90 backdrop-blur-md">
            <div className="text-5xl mb-3">🎯</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-3xl font-black mb-1" style={{ color: theme.accent }}>{score} pts</p>
            <p className="text-gray-400 text-sm mb-1">Level {level}</p>
            {score >= highScore && score > 0 && <p className="text-xs font-bold text-amber-500 mb-4">NEW HIGH SCORE!</p>}
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        )}

        {/* Targets */}
        {!gameOver && targets.map(t => {
          const bob = Math.sin(t.bobPhase) * 3;
          return (
            <button key={t.id} onClick={() => handleTargetClick(t)}
              className="absolute rounded-full flex items-center justify-center font-bold text-sm select-none transition-transform active:scale-90 hover:scale-105 border-2 shadow-lg"
              style={{
                left: `${t.x}%`, top: `${t.y + bob}%`,
                width: `${t.size}px`, height: `${t.size}px`,
                background: theme.targetBg,
                borderColor: theme.targetBorder,
                color: '#374151',
                boxShadow: `0 4px 12px ${theme.accent}20`,
              }}>
              {/* Target rings */}
              <div className="absolute inset-1 rounded-full border" style={{ borderColor: `${theme.accent}20` }} />
              <div className="absolute inset-3 rounded-full border" style={{ borderColor: `${theme.accent}15` }} />
              <span className="relative z-10 text-xs leading-tight text-center px-1">{t.text}</span>
            </button>
          );
        })}

        {/* Splat effects */}
        {splats.map(s => (
          <div key={s.id} className="absolute pointer-events-none z-20" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            transform: 'translate(-50%, -50%)',
          }}>
            <div className="rounded-full" style={{
              width: `${80 * (1 + (15 - s.life) * 0.05)}px`,
              height: `${80 * (1 + (15 - s.life) * 0.05)}px`,
              background: s.correct
                ? `radial-gradient(circle, ${theme.accent}80 0%, transparent 70%)`
                : 'radial-gradient(circle, rgba(239,68,68,0.7) 0%, transparent 70%)',
              opacity: s.life / 15,
            }} />
          </div>
        ))}

        {/* Floating texts */}
        {floatingTexts.map(f => (
          <div key={f.id} className="absolute pointer-events-none z-20 font-black text-sm" style={{
            left: `${f.x}%`, top: `${f.y}%`,
            color: f.color, opacity: f.life / 25,
            textShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* ── Footer ────────────────────────────── */}
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">
        Click/tap the correct answer target! • 5 correct = level up • Streaks = bonus points
      </div>
    </div>
  );
}
