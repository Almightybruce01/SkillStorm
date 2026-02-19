/* ═══════════════════════════════════════════════════════════
   MEMORY MATRIX / MATCH PAIRS ENGINE — ELITE EDITION
   Used by: Memory Matrix, Pattern Blast, Word Connect Storm
   Features: 3D card flip, combo scoring, power-ups (peek, freeze),
   themed card backs, progressive grid sizes, star ratings
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuestions, type Grade } from '../questionBank';
import { sfxFlip, sfxMatch, sfxWrong, sfxLevelUp, sfxPop, sfxStreak } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
interface CardData {
  id: number; content: string; pairId: number; isQuestion: boolean;
}
interface MatchEffect { id: number; x: number; y: number; life: number; }

const themes: Record<string, { accent: string; bg1: string; bg2: string; cardBack: string; cardFront: string; matchGlow: string }> = {
  memory_matrix:      { accent: '#3b82f6', bg1: '#eff6ff', bg2: '#dbeafe', cardBack: '#3b82f6', cardFront: '#eff6ff', matchGlow: '#22c55e' },
  pattern_blast:      { accent: '#f97316', bg1: '#fff7ed', bg2: '#fed7aa', cardBack: '#f97316', cardFront: '#fff7ed', matchGlow: '#22c55e' },
  word_connect_storm: { accent: '#8b5cf6', bg1: '#f5f3ff', bg2: '#ede9fe', cardBack: '#8b5cf6', cardFront: '#f5f3ff', matchGlow: '#22c55e' },
  default:            { accent: '#3b82f6', bg1: '#eff6ff', bg2: '#dbeafe', cardBack: '#3b82f6', cardFront: '#eff6ff', matchGlow: '#22c55e' },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const K2_EXTRA_PAIRS: [string, string][] = [
  ['cat', '🐱'], ['dog', '🐕'], ['red', '🔴'], ['sun', '☀️'],
  ['star', '⭐'], ['heart', '❤️'], ['apple', '🍎'], ['fish', '🐟'],
  ['moon', '🌙'], ['tree', '🌳'], ['rain', '🌧️'], ['book', '📚'],
];

function buildPairs(grade: Grade, pairCount: number): CardData[] {
  const pool = getQuestions(grade, undefined, pairCount * 2);
  const rawPairs: [string, string][] = pool.slice(0, pairCount).map(q => [q.text, q.answer]);
  if (grade === 'K-2') {
    const swapCount = Math.min(6, Math.floor(pairCount / 2));
    for (let i = 0; i < swapCount; i++) {
      rawPairs[i] = K2_EXTRA_PAIRS[i % K2_EXTRA_PAIRS.length];
    }
  }
  const pairs: CardData[] = [];
  let id = 0;
  for (let i = 0; i < pairCount && i < rawPairs.length; i++) {
    const [q, a] = rawPairs[i];
    pairs.push({ id: id++, content: q, pairId: i, isQuestion: true });
    pairs.push({ id: id++, content: a, pairId: i, isQuestion: false });
  }
  return shuffle(pairs);
}

const PAIRS_PER_LEVEL = [6, 8, 8, 10, 10, 12];
const FLIP_BACK_MS = 900;

/* ─── Component ─────────────────────────────────────────── */
export function MemoryMatrix({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const theme = themes[gameId] || themes.default;
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timer, setTimer] = useState(0);
  const [peeksLeft, setPeeksLeft] = useState(1);
  const pairCount = PAIRS_PER_LEVEL[Math.min(level - 1, PAIRS_PER_LEVEL.length - 1)];
  const [cards, setCards] = useState<CardData[]>(() => buildPairs(grade, pairCount));
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [lockFlip, setLockFlip] = useState(false);
  const [matchEffects, setMatchEffects] = useState<MatchEffect[]>([]);
  const [peeking, setPeeking] = useState(false);
  const [highScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_mm`) || '0'));
  const timerRef = useRef<number | undefined>(undefined);
  const gridCols = cards.length <= 12 ? 4 : cards.length <= 16 ? 4 : cards.length <= 20 ? 5 : 6;

  useEffect(() => {
    timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  /* ─── Peek power-up ─────────────────────────── */
  const usePeek = () => {
    if (peeksLeft <= 0 || peeking) return;
    setPeeksLeft(p => p - 1);
    setPeeking(true);
    sfxPop();
    // Show all cards for 2 seconds
    const allIds = new Set(cards.map(c => c.id));
    setFlipped(allIds);
    setLockFlip(true);
    setTimeout(() => {
      setFlipped(new Set([...matched]));
      setLockFlip(false);
      setPeeking(false);
    }, 2000);
  };

  /* ─── Next level ────────────────────────────── */
  const nextLevel = useCallback(() => {
    const nl = level + 1;
    setLevel(nl);
    sfxLevelUp();
    const nextPairCount = PAIRS_PER_LEVEL[Math.min(nl - 1, PAIRS_PER_LEVEL.length - 1)];
    setCards(buildPairs(grade, nextPairCount));
    setFlipped(new Set());
    setMatched(new Set());
    setLockFlip(false);
    setMoves(0);
    setCombo(0);
    if (nl % 2 === 0) setPeeksLeft(p => p + 1);
  }, [grade, level]);

  /* ─── Card click ────────────────────────────── */
  const handleCardClick = (card: CardData) => {
    if (lockFlip || matched.has(card.id) || flipped.has(card.id)) return;

    sfxFlip();
    const newFlipped = new Set(flipped);
    newFlipped.add(card.id);
    setFlipped(newFlipped);
    setMoves(m => m + 1);

    if (newFlipped.size === 2) {
      setLockFlip(true);
      const [a, b] = Array.from(newFlipped);
      const cardA = cards.find(c => c.id === a)!;
      const cardB = cards.find(c => c.id === b)!;

      if (cardA.pairId === cardB.pairId) {
        // Match!
        const newMatched = new Set(matched);
        newMatched.add(a);
        newMatched.add(b);
        setMatched(newMatched);

        const newCombo = combo + 1;
        setCombo(newCombo);
        const comboBonus = newCombo >= 3 ? newCombo * 10 : 0;
        const speedBonus = Math.max(0, 50 - moves * 2);
        const pts = (100 + comboBonus + speedBonus) * level;
        setScore(s => {
          const ns = s + pts;
          if (ns > highScore) localStorage.setItem(`sz_hs_${gameId}_mm`, String(ns));
          return ns;
        });
        sfxMatch();
        if (newCombo >= 3) sfxStreak();

        // Match effect
        setMatchEffects(prev => [...prev, { id: a, x: 0, y: 0, life: 20 }]);
        setTimeout(() => setMatchEffects(prev => prev.filter(e => e.id !== a)), 600);

        if (newMatched.size === cards.length) {
          sfxLevelUp();
        }

        setFlipped(new Set());
        setLockFlip(false);
      } else {
        // Mismatch
        sfxWrong();
        setCombo(0);
        setTimeout(() => {
          setFlipped(new Set());
          setLockFlip(false);
        }, FLIP_BACK_MS);
      }
    }
  };

  const allMatched = matched.size === cards.length && cards.length > 0;
  const starRating = moves <= pairCount ? 3 : moves <= pairCount * 2 ? 2 : 1;

  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${theme.accent}30` }}>
      {/* ── HUD ────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${theme.accent}08` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          <span className="text-xs font-bold text-gray-500">MOVES {moves}</span>
          {combo >= 2 && <span className="text-[10px] font-black text-amber-500 animate-pulse">{combo}× COMBO</span>}
          <span className="text-xs text-gray-400">⏱ {timer}s</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={usePeek} disabled={peeksLeft <= 0 || peeking}
            className={`text-xs px-2 py-1 rounded-lg border transition-all ${peeksLeft > 0 ? 'bg-white border-gray-200 hover:border-gray-300 text-gray-700' : 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed'}`}>
            👁️ Peek ×{peeksLeft}
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
        </div>
      </div>

      {/* ── Grid ──────────────────────────────── */}
      <div className="p-4 relative" style={{
        background: `linear-gradient(180deg, ${theme.bg1}, ${theme.bg2})`,
        minHeight: '380px',
      }}>
        <div className="grid gap-2 mx-auto" style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          maxWidth: '440px',
          margin: '0 auto',
        }}>
          {cards.map(card => (
            <Card
              key={card.id}
              card={card}
              isFlipped={flipped.has(card.id) || matched.has(card.id)}
              isMatched={matched.has(card.id)}
              accent={theme.accent}
              cardBack={theme.cardBack}
              cardFront={theme.cardFront}
              matchGlow={theme.matchGlow}
              hasMatchEffect={matchEffects.some(e => e.id === card.id)}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>

        {/* Level complete overlay */}
        {allMatched && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/90 backdrop-blur-md animate-pop-in">
            <h3 className="text-2xl font-black text-gray-800 mb-2">Level {level} Complete!</h3>
            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3].map(s => (
                <span key={s} className={`text-2xl ${s <= starRating ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
              ))}
            </div>
            <p className="text-gray-500 text-sm mb-1">{moves} moves in {timer}s</p>
            <p className="text-xl font-black mb-4" style={{ color: theme.accent }}>+{score} pts</p>
            <button onClick={nextLevel} className="btn-elite btn-elite-primary text-sm">
              Next Level ({PAIRS_PER_LEVEL[Math.min(level, PAIRS_PER_LEVEL.length - 1)]} pairs)
            </button>
          </div>
        )}
      </div>

      {/* ── Pairs remaining ───────────────────── */}
      <div className="flex justify-center gap-1 px-4 py-2 bg-gray-50 border-t border-gray-100">
        {Array.from({ length: pairCount }).map((_, i) => (
          <div key={i} className={`w-3 h-1.5 rounded-full transition-all ${
            i < matched.size / 2 ? 'bg-green-400' : 'bg-gray-200'
          }`} />
        ))}
      </div>

      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">
        Match question ↔ answer pairs • Fewer moves = more stars • 👁️ Peek to reveal all
      </div>
    </div>
  );
}

/* ─── Card Component ────────────────────────────────────── */
interface CardProps {
  card: CardData; isFlipped: boolean; isMatched: boolean;
  accent: string; cardBack: string; cardFront: string; matchGlow: string;
  hasMatchEffect: boolean; onClick: () => void;
}

function Card({ card, isFlipped, isMatched, accent, cardBack, cardFront, matchGlow, hasMatchEffect, onClick }: CardProps) {
  return (
    <div
      className={`cursor-pointer select-none ${hasMatchEffect ? 'animate-pop-in' : ''}`}
      style={{ perspective: '800px', aspectRatio: '1', minHeight: '68px' }}
      onClick={onClick}
    >
      <div className="relative w-full h-full rounded-xl" style={{
        transformStyle: 'preserve-3d',
        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Face-down (card back) */}
        <div className="absolute inset-0 rounded-xl flex items-center justify-center font-black text-white/60 text-xl border-2 shadow-md hover:shadow-lg hover:scale-[1.03] transition-all"
          style={{
            backfaceVisibility: 'hidden',
            background: `linear-gradient(135deg, ${cardBack}, ${cardBack}cc)`,
            borderColor: `${accent}30`,
          }}>
          {/* Pattern on back */}
          <div className="absolute inset-2 rounded-lg border border-white/10 flex items-center justify-center">
            <span className="text-2xl opacity-30">?</span>
          </div>
        </div>

        {/* Face-up (card front) */}
        <div className="absolute inset-0 rounded-xl flex items-center justify-center p-2 text-center text-sm font-bold overflow-hidden border-2 shadow-md"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: isMatched ? '#f0fdf4' : cardFront,
            borderColor: isMatched ? '#86efac' : `${accent}30`,
            boxShadow: isMatched ? `0 0 16px ${matchGlow}30` : undefined,
            color: '#1f2937',
          }}>
          <span className="leading-tight">{card.content}</span>
          {isMatched && <span className="absolute top-1 right-1 text-[8px]">✓</span>}
        </div>
      </div>
    </div>
  );
}
