/* ═══════════════════════════════════════════════════════════
   BALLOON POP ENGINE — ELITE EDITION
   Used by: Word Balloon Pop, Number Catch, Grammar Clicker
   Features: balloon types (normal, gold, ice, bomb), wind physics,
   chain combos, particle explosions, floating score popups,
   progressive difficulty
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestion, getRandomQuestion, type Grade, type Question } from '../questionBank';
import { sfxPop, sfxWrong, sfxGameOver, sfxStreak, sfxCoin, sfxExplosion, sfxLevelUp } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
type BalloonKind = 'normal' | 'gold' | 'ice' | 'tiny' | 'big';
interface Balloon {
  id: number; x: number; y: number; text: string; isCorrect: boolean;
  color: string; size: number; speed: number; wobblePhase: number;
  wobbleAmp: number; popped: boolean; kind: BalloonKind;
  rotation: number; rotSpeed: number;
}
interface PopEffect {
  id: number; x: number; y: number; color: string; pieces: { dx: number; dy: number; rot: number; size: number }[];
  life: number;
}
interface FloatingScore { id: number; x: number; y: number; text: string; color: string; life: number; }
interface WindParticle { x: number; y: number; vx: number; vy: number; size: number; opacity: number; }

/* ─── Config ────────────────────────────────────────────── */
const colorSets: Record<string, string[]> = {
  word_balloon_pop: ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'],
  number_catch: ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#3b82f6', '#0ea5e9'],
  grammar_clicker: ['#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#06b6d4', '#3b82f6'],
  default: ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'],
};

const bgThemes: Record<string, { sky1: string; sky2: string; accent: string; cloudColor: string }> = {
  word_balloon_pop: { sky1: '#fdf2f8', sky2: '#fce7f3', accent: '#ec4899', cloudColor: '#fbcfe8' },
  number_catch:     { sky1: '#eff6ff', sky2: '#dbeafe', accent: '#3b82f6', cloudColor: '#bfdbfe' },
  grammar_clicker:  { sky1: '#f5f3ff', sky2: '#ede9fe', accent: '#8b5cf6', cloudColor: '#ddd6fe' },
  default:          { sky1: '#fdf2f8', sky2: '#fce7f3', accent: '#ec4899', cloudColor: '#fbcfe8' },
};

let nextId = 0;

/* ─── Component ─────────────────────────────────────────── */
export function BalloonPop({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const colors = colorSets[gameId] || colorSets.default;
  const bg = bgThemes[gameId] || bgThemes.default;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [question, setQuestion] = useState<Question>(generateMathQuestion(grade));
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [wind, setWind] = useState(0);
  const [windParticles] = useState<WindParticle[]>(() =>
    Array.from({ length: 15 }, () => ({
      x: Math.random() * 100, y: Math.random() * 100,
      vx: 0.05 + Math.random() * 0.1, vy: -0.02,
      size: 2 + Math.random() * 4, opacity: 0.1 + Math.random() * 0.15,
    }))
  );
  const [highScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_bp`) || '0'));
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const windRef = useRef<number | undefined>(undefined);
  const stateRef = useRef({ lives: 5, gameOver: false, level: 1, score: 0, combo: 0 });

  useEffect(() => {
    stateRef.current = { lives, gameOver, level, score, combo };
  }, [lives, gameOver, level, score, combo]);

  /* ─── Question helper ───────────────────────── */
  const getQuestion = useCallback((): Question => {
    return gameId.includes('grammar') ? getRandomQuestion(grade, 'grammar') : generateMathQuestion(grade);
  }, [gameId, grade]);

  /* ─── Spawn balloons ────────────────────────── */
  const spawnWave = useCallback((q: Question) => {
    const lvl = stateRef.current.level;
    const extraBalloons = lvl >= 5 ? 2 : lvl >= 3 ? 1 : 0;
    const optCount = q.options.length + extraBalloons;

    // Generate some extra wrong options for higher levels
    const opts = [...q.options];
    for (let i = 0; i < extraBalloons; i++) {
      opts.push(String(Math.floor(Math.random() * 50)));
    }

    const newBalloons: Balloon[] = opts.map((opt, i) => {
      // Decide balloon kind
      let kind: BalloonKind = 'normal';
      if (opt === q.answer && Math.random() > 0.85) kind = 'gold';
      else if (i >= q.options.length) kind = Math.random() > 0.5 ? 'tiny' : 'big';

      const baseSize = kind === 'tiny' ? 40 : kind === 'big' ? 80 : kind === 'gold' ? 62 : 56;

      return {
        id: nextId++,
        x: 8 + (i / optCount) * 70 + Math.random() * 12,
        y: 105 + Math.random() * 15,
        text: opt,
        isCorrect: opt === q.answer,
        color: kind === 'gold' ? '#f59e0b' : colors[i % colors.length],
        size: baseSize + Math.random() * 12,
        speed: (0.12 + Math.random() * 0.08 + lvl * 0.015) * (kind === 'tiny' ? 1.3 : kind === 'big' ? 0.7 : 1),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleAmp: 8 + Math.random() * 10,
        popped: false,
        kind,
        rotation: (Math.random() - 0.5) * 0.3,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      };
    });
    setBalloons(newBalloons);
  }, [colors]);

  useEffect(() => {
    if (gameOver) return;
    spawnWave(question);
  }, [question, spawnWave, gameOver]);

  /* ─── Wind changes ──────────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    windRef.current = window.setInterval(() => {
      setWind(Math.sin(Date.now() * 0.0003) * (1 + stateRef.current.level * 0.3));
    }, 100);
    return () => clearInterval(windRef.current);
  }, [gameOver]);

  /* ─── Animate balloons ─────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    intervalRef.current = window.setInterval(() => {
      setBalloons(prev => {
        const updated = prev.map(b => ({
          ...b,
          y: b.y - b.speed,
          x: b.x + Math.sin(b.wobblePhase) * 0.08 + wind * 0.03,
          wobblePhase: b.wobblePhase + 0.04,
          rotation: b.rotation + b.rotSpeed,
        }));

        // Clamp x
        updated.forEach(b => { b.x = Math.max(2, Math.min(92, b.x)); });

        // Check if correct one escaped
        const escaped = updated.filter(b => b.y < -12 && !b.popped);
        if (escaped.some(b => b.isCorrect)) {
          const st = stateRef.current;
          st.lives--;
          st.combo = 0;
          setLives(st.lives);
          setCombo(0);
          if (st.lives <= 0) {
            st.gameOver = true;
            setGameOver(true);
            sfxGameOver();
            if (st.score > highScore) localStorage.setItem(`sz_hs_${gameId}_bp`, String(st.score));
          } else {
            const q = getQuestion();
            setQuestion(q);
          }
          return [];
        }
        return updated.filter(b => b.y > -12);
      });

      // Animate pop effects
      setPopEffects(prev => prev.map(p => ({ ...p, life: p.life - 1 })).filter(p => p.life > 0));
      setFloatingScores(prev => prev.map(f => ({ ...f, y: f.y - 0.8, life: f.life - 1 })).filter(f => f.life > 0));
    }, 30);
    return () => clearInterval(intervalRef.current);
  }, [gameOver, wind, grade, gameId, getQuestion, highScore]);

  /* ─── Pop handler ───────────────────────────── */
  const popBalloon = (balloon: Balloon) => {
    if (balloon.popped || gameOver) return;
    const st = stateRef.current;

    // Generate pop pieces
    const pieces = Array.from({ length: 10 }, () => ({
      dx: (Math.random() - 0.5) * 120,
      dy: (Math.random() - 0.5) * 120,
      rot: Math.random() * 360,
      size: 3 + Math.random() * 5,
    }));
    setPopEffects(prev => [...prev, { id: balloon.id, x: balloon.x, y: balloon.y, color: balloon.color, pieces, life: 20 }]);

    if (balloon.isCorrect) {
      const newCombo = st.combo + 1;
      const comboMultiplier = newCombo >= 10 ? 4 : newCombo >= 7 ? 3 : newCombo >= 4 ? 2 : 1;
      const kindBonus = balloon.kind === 'gold' ? 3 : 1;
      const points = 10 * st.level * comboMultiplier * kindBonus;

      sfxPop();
      if (newCombo >= 3) sfxStreak();
      if (balloon.kind === 'gold') sfxCoin();

      st.score += points;
      st.combo = newCombo;
      setScore(st.score);
      setCombo(newCombo);
      if (newCombo > bestCombo) setBestCombo(newCombo);

      // Floating score
      const text = comboMultiplier > 1 ? `+${points} (${newCombo}×!)` : `+${points}`;
      setFloatingScores(prev => [...prev, {
        id: nextId++, x: balloon.x, y: balloon.y,
        text, color: balloon.kind === 'gold' ? '#f59e0b' : bg.accent, life: 30,
      }]);

      // Level up
      if (st.score > 0 && st.score % 80 < points) {
        st.level++;
        setLevel(st.level);
        sfxLevelUp();
        setFloatingScores(prev => [...prev, {
          id: nextId++, x: 50, y: 50, text: `LEVEL ${st.level}!`, color: '#f59e0b', life: 40,
        }]);
      }

      setBalloons([]);
      const q = getQuestion();
      setQuestion(q);
    } else {
      sfxWrong();
      st.lives--;
      st.combo = 0;
      setLives(st.lives);
      setCombo(0);

      if (balloon.kind === 'ice') {
        // Ice balloon freezes all for a moment (visual only, slow them)
        sfxExplosion();
        setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : { ...b, speed: b.speed * 0.3 }));
        setTimeout(() => setBalloons(prev => prev.map(b => ({ ...b, speed: b.speed / 0.3 }))), 1500);
      } else {
        setBalloons(prev => prev.map(b => b.id === balloon.id ? { ...b, popped: true } : b));
      }

      if (st.lives <= 0) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
        if (st.score > highScore) localStorage.setItem(`sz_hs_${gameId}_bp`, String(st.score));
      }
    }
  };

  const restart = () => {
    setScore(0); setLives(5); setLevel(1); setCombo(0); setBestCombo(0);
    setGameOver(false); setPopEffects([]); setFloatingScores([]);
    stateRef.current = { lives: 5, gameOver: false, level: 1, score: 0, combo: 0 };
    setQuestion(getQuestion());
  };

  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${bg.accent}30` }}>
      {/* ── HUD ───────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${bg.accent}08` }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black" style={{ color: bg.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          {combo >= 2 && <span className="text-[10px] font-black text-amber-500 animate-pulse">🔥{combo}×</span>}
          <span className="text-xs">{Array.from({ length: 5 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
      </div>

      {/* ── Question ──────────────────────────────── */}
      <div className="text-center py-3 border-b border-gray-100" style={{ background: bg.sky1 }}>
        <p className="text-gray-400 text-[10px] font-bold tracking-wider">POP THE CORRECT ANSWER</p>
        <p className="text-2xl font-black text-gray-800">{question.text} = ?</p>
      </div>

      {/* ── Game Area ─────────────────────────────── */}
      <div ref={containerRef} className="relative overflow-hidden" style={{
        height: '380px',
        background: `linear-gradient(180deg, ${bg.sky1}, ${bg.sky2})`,
      }}>
        {/* Wind indicator */}
        {Math.abs(wind) > 0.5 && (
          <div className="absolute top-2 right-3 text-gray-400 text-[10px] font-bold z-10">
            {wind > 0 ? '→' : '←'} wind
          </div>
        )}

        {/* Clouds */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[20, 55, 80].map((x, i) => (
            <div key={i} className="absolute rounded-full" style={{
              left: `${(x + wind * 2) % 100}%`,
              top: `${10 + i * 25}%`,
              width: `${60 + i * 20}px`,
              height: `${25 + i * 8}px`,
              background: bg.cloudColor,
              opacity: 0.4,
              filter: 'blur(4px)',
            }} />
          ))}
        </div>

        {/* Wind particles */}
        {windParticles.map((wp, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            left: `${(wp.x + wind * 10 + i * 0.02 * Date.now() * 0.001) % 100}%`,
            top: `${(wp.y + Math.sin(Date.now() * 0.001 + i) * 5 + 50) % 100}%`,
            width: `${wp.size}px`, height: `${wp.size}px`,
            background: bg.cloudColor, opacity: wp.opacity,
          }} />
        ))}

        {gameOver ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/90 backdrop-blur-md">
            <div className="text-6xl mb-3 animate-bounce">🎈</div>
            <h3 className="text-3xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-4xl font-black mb-1" style={{ color: bg.accent }}>{score} pts</p>
            <p className="text-gray-400 text-sm mb-1">Level {level} • Best Combo: {bestCombo}×</p>
            {score >= highScore && score > 0 && <p className="text-xs font-bold text-amber-500 mb-4">NEW HIGH SCORE!</p>}
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        ) : (
          <>
            {/* Balloons */}
            {balloons.filter(b => !b.popped).map(b => (
              <button
                key={b.id}
                onClick={() => popBalloon(b)}
                className="absolute cursor-pointer select-none active:scale-90 group"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  transform: `translateX(${Math.sin(b.wobblePhase) * b.wobbleAmp}px) rotate(${b.rotation}rad)`,
                  zIndex: 10,
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center font-black text-sm shadow-lg group-hover:scale-110 transition-transform duration-150 relative"
                  style={{
                    width: `${b.size}px`,
                    height: `${b.size * 1.2}px`,
                    background: b.kind === 'gold'
                      ? `radial-gradient(ellipse at 30% 30%, #fef3c7, #f59e0b)`
                      : `radial-gradient(ellipse at 30% 30%, ${b.color}aa, ${b.color})`,
                    boxShadow: b.kind === 'gold'
                      ? `0 4px 24px rgba(245,158,11,0.4), inset 0 -4px 8px rgba(0,0,0,0.15)`
                      : `0 4px 20px ${b.color}30, inset 0 -4px 8px rgba(0,0,0,0.15)`,
                    border: b.kind === 'gold' ? '2px solid #fbbf24' : 'none',
                  }}
                >
                  {/* Shine highlight */}
                  <div className="absolute top-2 left-3 w-3 h-3 rounded-full bg-white/40" />
                  {b.kind === 'gold' && <div className="absolute top-1 right-2 text-[8px]">⭐</div>}
                  <span className="relative z-10 text-xs sm:text-sm text-white drop-shadow-md">{b.text}</span>
                </div>
                {/* String */}
                <svg className="mx-auto" width="2" height="30" style={{ opacity: 0.4 }}>
                  <path d={`M1,0 Q${Math.sin(b.wobblePhase) * 3},15 1,30`} stroke={b.color} strokeWidth="1.5" fill="none" />
                </svg>
              </button>
            ))}

            {/* Pop effects */}
            {popEffects.map(p => (
              <div key={p.id} className="absolute pointer-events-none z-20" style={{
                left: `${p.x}%`, top: `${p.y}%`,
                opacity: p.life / 20,
              }}>
                {p.pieces.map((piece, i) => (
                  <div key={i} className="absolute rounded-sm" style={{
                    width: `${piece.size}px`, height: `${piece.size}px`,
                    background: p.color,
                    transform: `translate(${piece.dx * (1 - p.life / 20)}px, ${piece.dy * (1 - p.life / 20)}px) rotate(${piece.rot * (1 - p.life / 20)}deg)`,
                  }} />
                ))}
              </div>
            ))}

            {/* Floating scores */}
            {floatingScores.map(f => (
              <div key={f.id} className="absolute pointer-events-none z-20 font-black text-sm" style={{
                left: `${f.x}%`, top: `${f.y}%`,
                color: f.color,
                opacity: f.life / 30,
                transform: `scale(${0.8 + (30 - f.life) * 0.02})`,
                textShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}>
                {f.text}
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200 flex justify-center gap-3">
        <span>TAP correct balloon</span>
        <span>•</span>
        <span>Don't let it escape!</span>
        <span>•</span>
        <span>⭐ = gold bonus</span>
      </div>
    </div>
  );
}
