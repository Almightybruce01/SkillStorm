/* ═══════════════════════════════════════════════════════════════════════════════
   SOLITAIRE — Klondike Elite Edition
   Canvas-based rendering • Arrow keys + Space • Mouse click/drag
   Full Klondike rules • Vegas scoring • Animations • Themes • Auto-play
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playSound } from '../SoundEngine';

interface Props {
  onClose: () => void;
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = number; // 1-13 (A=1, J=11, Q=12, K=13)
type PileType = 'tableau' | 'foundation' | 'stock' | 'waste';
type CardTheme = 'classic' | 'dark' | 'blue' | 'green';

interface Card {
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
  id: string;
}

interface Move {
  fromType: PileType;
  fromPileIndex: number;
  fromCardIndex: number;
  toType: PileType;
  toPileIndex: number;
  cards: Card[];
  revealedCard: boolean;
  scoreDelta: number;
}

interface AnimatedCard {
  card: Card;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
}

interface FlipAnimation {
  card: Card;
  pileType: PileType;
  pileIndex: number;
  cardIndex: number;
  startTime: number;
  duration: number;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diamonds: '♦',
};

const RANK_DISPLAY: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

const VEGAS_START = -52;
const VEGAS_FOUNDATION = 5;

const CARD_WIDTH = 72;
const CARD_HEIGHT = 100;
const CARD_RADIUS = 8;
const CARD_OVERLAP = 24;
const PADDING = 16;
const ANIMATION_DURATION = 200;
const FLIP_DURATION = 150;

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  let id = 0;
  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ suit, rank, faceUp: false, id: `c-${id++}` });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function canStackOnTableau(card: Card, target: Card | null): boolean {
  if (!target) return card.rank === 13;
  if (!target.faceUp) return false;
  if (card.rank !== target.rank - 1) return false;
  return isRed(card.suit) !== isRed(target.suit);
}

function canStackOnFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1;
  const top = pile[pile.length - 1];
  return card.suit === top.suit && card.rank === top.rank + 1;
}

const THEMES: Record<CardTheme, {
  bg: string;
  cardFace: string;
  cardBack: string;
  cardBackPattern: string;
  redSuit: string;
  blackSuit: string;
}> = {
  classic: {
    bg: '#2d5016',
    cardFace: '#ffffff',
    cardBack: 'linear-gradient(135deg, #1a4d8c 0%, #0d2d5a 50%, #1a4d8c 100%)',
    cardBackPattern: 'rgba(255,255,255,0.08)',
    redSuit: '#c41e3a',
    blackSuit: '#1a1a1a',
  },
  dark: {
    bg: '#0d1117',
    cardFace: '#21262d',
    cardBack: 'linear-gradient(135deg, #30363d 0%, #21262d 50%, #161b22 100%)',
    cardBackPattern: 'rgba(255,255,255,0.06)',
    redSuit: '#f85149',
    blackSuit: '#c9d1d9',
  },
  blue: {
    bg: '#0c4a6e',
    cardFace: '#f0f9ff',
    cardBack: 'linear-gradient(135deg, #0369a1 0%, #0c4a6e 50%, #075985 100%)',
    cardBackPattern: 'rgba(255,255,255,0.1)',
    redSuit: '#dc2626',
    blackSuit: '#1e3a5f',
  },
  green: {
    bg: '#14532d',
    cardFace: '#f0fdf4',
    cardBack: 'linear-gradient(135deg, #166534 0%, #14532d 50%, #052e16 100%)',
    cardBackPattern: 'rgba(255,255,255,0.09)',
    redSuit: '#b91c1c',
    blackSuit: '#052e16',
  },
};

function initGame(): { tableau: Card[][]; stock: Card[] } {
  const deck = shuffle(createDeck());
  const t: Card[][] = [[], [], [], [], [], [], []];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      t[col].push({ ...deck[idx++], faceUp: row === col });
    }
  }
  const s = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  return { tableau: t, stock: s };
}

export default function SolitaireGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragPosRef = useRef({ x: 0, y: 0 });
  const lastMouseUpWasDropRef = useRef(false);

  const [init] = useState(() => initGame());
  const [tableau, setTableau] = useState<Card[][]>(init.tableau);
  const [foundation, setFoundation] = useState<Card[][]>(() => [[], [], [], []]);
  const [stock, setStock] = useState<Card[]>(init.stock);
  const [waste, setWaste] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(VEGAS_START);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [drawCount, setDrawCount] = useState<1 | 3>(1);
  const [theme, setTheme] = useState<CardTheme>('classic');
  const [autoPlay, setAutoPlay] = useState(false);
  const [animations, setAnimations] = useState<AnimatedCard[]>([]);
  const [flipAnimations, setFlipAnimations] = useState<FlipAnimation[]>([]);
  const [winAnimations, setWinAnimations] = useState<{ card: Card; x: number; y: number; vx: number; vy: number }[]>([]);

  const [selected, setSelected] = useState<{ type: PileType; pileIndex: number; cardIndex: number } | null>(null);
  const [keyboardFocus, setKeyboardFocus] = useState<{ type: PileType; pileIndex: number; cardIndex: number }>({
    type: 'stock',
    pileIndex: 0,
    cardIndex: 0,
  });
  const [hint, setHint] = useState<{ type: PileType; pileIndex: number; cardIndex: number } | null>(null);
  const [dragging, setDragging] = useState<{
    type: PileType;
    pileIndex: number;
    cardIndex: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const timerRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const canvasWidth = 7 * (CARD_WIDTH + PADDING) + PADDING;
  const canvasHeight = 520;

  const allFaceUp = useMemo(() => {
    for (const col of tableau) {
      for (const c of col) if (!c.faceUp) return false;
    }
    return true;
  }, [tableau]);

  const allInFoundations = useMemo(() => {
    return foundation.reduce((s, p) => s + p.length, 0) === 52;
  }, [foundation]);

  const stockX = PADDING;
  const stockY = PADDING;
  const wasteX = stockX + CARD_WIDTH + PADDING;
  const wasteY = PADDING;
  const foundationStartX = wasteX + CARD_WIDTH + PADDING * 3;
  const tableauStartX = PADDING;
  const tableauStartY = stockY + CARD_HEIGHT + PADDING * 2;

  function getCardPosition(type: PileType, pileIndex: number, cardIndex: number): { x: number; y: number } {
    if (type === 'stock') return { x: stockX, y: stockY };
    if (type === 'waste') {
      const idx = waste.length - 1 - cardIndex;
      return { x: wasteX + Math.min(idx, 2) * (CARD_WIDTH * 0.25), y: wasteY };
    }
    if (type === 'foundation') {
      return {
        x: foundationStartX + pileIndex * (CARD_WIDTH + PADDING),
        y: stockY,
      };
    }
    const pile = tableau[pileIndex] || [];
    return {
      x: tableauStartX + pileIndex * (CARD_WIDTH + PADDING),
      y: tableauStartY + cardIndex * CARD_OVERLAP,
    };
  }

  function hitTest(x: number, y: number): { type: PileType; pileIndex: number; cardIndex: number } | null {
    if (y < tableauStartY - 20) {
      if (x >= stockX && x < stockX + CARD_WIDTH && y >= stockY && y < stockY + CARD_HEIGHT) {
        return { type: 'stock', pileIndex: 0, cardIndex: 0 };
      }
      for (let i = waste.length - 1; i >= 0; i--) {
        const pos = getCardPosition('waste', 0, i);
        if (x >= pos.x && x < pos.x + CARD_WIDTH && y >= pos.y && y < pos.y + CARD_HEIGHT) {
          return { type: 'waste', pileIndex: 0, cardIndex: i };
        }
      }
      if (waste.length === 0 && x >= wasteX && x < wasteX + CARD_WIDTH && y >= wasteY && y < wasteY + CARD_HEIGHT) {
        return { type: 'waste', pileIndex: 0, cardIndex: 0 };
      }
      for (let f = 0; f < 4; f++) {
        const fx = foundationStartX + f * (CARD_WIDTH + PADDING);
        if (x >= fx && x < fx + CARD_WIDTH && y >= stockY && y < stockY + CARD_HEIGHT) {
          const pile = foundation[f];
          return { type: 'foundation', pileIndex: f, cardIndex: pile.length > 0 ? pile.length - 1 : 0 };
        }
      }
    } else {
      for (let col = 0; col < 7; col++) {
        const pile = tableau[col];
        const baseX = tableauStartX + col * (CARD_WIDTH + PADDING);
        if (x >= baseX && x < baseX + CARD_WIDTH) {
          if (pile.length === 0) {
            if (y >= tableauStartY && y < tableauStartY + CARD_HEIGHT) {
              return { type: 'tableau', pileIndex: col, cardIndex: 0 };
            }
          } else {
            for (let i = 0; i < pile.length; i++) {
              const cardY = tableauStartY + i * CARD_OVERLAP;
              if (y >= cardY && y < cardY + CARD_HEIGHT) {
                return { type: 'tableau', pileIndex: col, cardIndex: i };
              }
            }
            const lastY = tableauStartY + (pile.length - 1) * CARD_OVERLAP;
            if (y >= lastY && y < lastY + CARD_HEIGHT) {
              return { type: 'tableau', pileIndex: col, cardIndex: pile.length - 1 };
            }
          }
        }
      }
    }
    return null;
  }

  const flipTableauTop = useCallback((t: Card[][], col: number): { tableau: Card[][]; revealed: boolean } => {
    const pile = t[col];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      return {
        tableau: t.map((p, i) =>
          i === col ? p.map((c, j) => (j === p.length - 1 ? { ...c, faceUp: true } : c)) : p
        ),
        revealed: true,
      };
    }
    return { tableau: t, revealed: false };
  }, []);

  const drawCard = useCallback(
    (ctx: CanvasRenderingContext2D, card: Card, x: number, y: number, scaleX = 1, highlight = false) => {
      const t = THEMES[theme];
      const w = CARD_WIDTH * scaleX;
      const h = CARD_HEIGHT;

      ctx.save();

      if (card.faceUp) {
        ctx.fillStyle = t.cardFace;
        roundRect(ctx, x, y, w, h, CARD_RADIUS);
        ctx.fill();
        ctx.strokeStyle = highlight ? '#f59e0b' : '#94a3b8';
        ctx.lineWidth = highlight ? 3 : 1;
        ctx.stroke();

        const suitColor = isRed(card.suit) ? t.redSuit : t.blackSuit;
        ctx.fillStyle = suitColor;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(RANK_DISPLAY[card.rank], x + 6, y + 18);
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(SUIT_SYMBOLS[card.suit], x + 6, y + 38);

        ctx.textAlign = 'right';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(RANK_DISPLAY[card.rank], x + w - 6, y + h - 8);
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(SUIT_SYMBOLS[card.suit], x + w - 6, y + h - 28);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + w, y + h);
        grad.addColorStop(0, '#1e40af');
        grad.addColorStop(0.5, '#1e3a8a');
        grad.addColorStop(1, '#1e40af');
        ctx.fillStyle = grad;
        roundRect(ctx, x, y, w, h, CARD_RADIUS);
        ctx.fill();
        ctx.strokeStyle = '#312e81';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = t.cardBackPattern;
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 8; j++) {
            ctx.fillRect(x + 8 + i * 10, y + 10 + j * 12, 4, 6);
          }
        }
      }

      ctx.restore();
    },
    [theme]
  );

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  const tryMoveToFoundation = useCallback(
    (fromType: PileType, pileIndex: number, cardIndex: number) => {
      let card: Card | null = null;
      if (fromType === 'tableau') {
        const pile = tableau[pileIndex];
        if (!pile || cardIndex !== pile.length - 1) return;
        card = pile[cardIndex];
      } else if (fromType === 'waste' && waste.length > 0) {
        card = waste[waste.length - 1];
      }
      if (!card || !card.faceUp) return;

      for (let f = 0; f < 4; f++) {
        if (canStackOnFoundation(card!, foundation[f])) {
          playSound('card_match');
          const fromPos = getCardPosition(fromType, pileIndex, cardIndex);
          const toPos = getCardPosition('foundation', f, foundation[f].length);
          const willReveal = fromType === 'tableau' && tableau[pileIndex].length > 1 && !tableau[pileIndex][tableau[pileIndex].length - 2].faceUp;

          setAnimations((a) => [
            ...a,
            {
              card: card!,
              fromX: fromPos.x,
              fromY: fromPos.y,
              toX: toPos.x,
              toY: toPos.y,
              startTime: performance.now(),
              duration: ANIMATION_DURATION,
            },
          ]);

          setTimeout(() => {
            setTableau((prev) => {
              let next = prev.map((p) => p.map((c) => ({ ...c })));
              let revealed = false;
              if (fromType === 'tableau') {
                next[pileIndex] = next[pileIndex].slice(0, -1);
                const flipRes = flipTableauTop(next, pileIndex);
                next = flipRes.tableau;
                revealed = flipRes.revealed;
                if (revealed) {
                  playSound('card_flip');
                  const topCard = next[pileIndex][next[pileIndex].length - 1];
                  setFlipAnimations((fa) => [
                    ...fa,
                    {
                      card: topCard,
                      pileType: 'tableau',
                      pileIndex,
                      cardIndex: next[pileIndex].length - 1,
                      startTime: performance.now(),
                      duration: FLIP_DURATION,
                    },
                  ]);
                }
              }
              return next;
            });
            setWaste((prev) => (fromType === 'waste' ? prev.slice(0, -1) : prev));
            setFoundation((prev) => {
              const next = prev.map((p, i) => (i === f ? [...p, card!] : p));
              return next;
            });
            setMoves((m) => m + 1);
            setScore((s) => s + VEGAS_FOUNDATION);
            setMoveHistory((h) => [
              ...h,
              {
                fromType,
                fromPileIndex: pileIndex,
                fromCardIndex: cardIndex,
                toType: 'foundation',
                toPileIndex: f,
                cards: [card!],
                revealedCard: fromType === 'tableau' && tableau[pileIndex].length > 1 && !tableau[pileIndex][tableau[pileIndex].length - 2].faceUp,
                scoreDelta: VEGAS_FOUNDATION,
              },
            ]);
            setSelected(null);
            setAnimations((a) => a.slice(1));
          }, ANIMATION_DURATION);
          return;
        }
      }
    },
    [tableau, waste, foundation, flipTableauTop]
  );

  const tryMoveToTableau = useCallback(
    (fromType: PileType, fromPileIndex: number, fromCardIndex: number, toCol: number) => {
      let cards: Card[] = [];
      if (fromType === 'tableau') {
        const pile = tableau[fromPileIndex];
        cards = pile.slice(fromCardIndex);
        if (cards.some((c) => !c.faceUp)) return;
      } else if (fromType === 'waste' && waste.length > 0) {
        cards = [waste[waste.length - 1]];
      } else return;

      const card = cards[0];
      const targetPile = tableau[toCol];
      const targetTop = targetPile.length === 0 ? null : targetPile[targetPile.length - 1];
      if (!canStackOnTableau(card, targetTop)) return;

      playSound('card_match');
      const fromPos = getCardPosition(fromType, fromPileIndex, fromCardIndex);
      const toPos = getCardPosition('tableau', toCol, targetPile.length);

      setAnimations((a) => [
        ...a,
        {
          card: cards[0],
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y,
          startTime: performance.now(),
          duration: ANIMATION_DURATION,
        },
      ]);

      setTimeout(() => {
        setTableau((prev) => {
          let next = prev.map((p) => p.map((c) => ({ ...c })));
          let revealed = false;
          if (fromType === 'tableau') {
            next[fromPileIndex] = next[fromPileIndex].slice(0, fromCardIndex);
            const flipRes = flipTableauTop(next, fromPileIndex);
            next = flipRes.tableau;
            revealed = flipRes.revealed;
            if (revealed) {
              playSound('card_flip');
            }
          }
          next[toCol] = [...next[toCol], ...cards];
          return next;
        });
        setWaste((prev) => (fromType === 'waste' ? prev.slice(0, -1) : prev));
        setMoves((m) => m + 1);
        setMoveHistory((h) => [
          ...h,
          {
            fromType,
            fromPileIndex,
            fromCardIndex,
            toType: 'tableau',
            toPileIndex: toCol,
            cards,
            revealedCard: fromType === 'tableau' && tableau[fromPileIndex].length === fromCardIndex + 1,
            scoreDelta: 0,
          },
        ]);
        setSelected(null);
        setAnimations((a) => a.slice(1));
      }, ANIMATION_DURATION);
    },
    [tableau, waste]
  );

  const handleStockClick = useCallback(() => {
    if (won || stock.length === 0) {
      if (stock.length === 0 && waste.length > 0) {
        playSound('click');
        setStock(waste.slice().reverse().map((c) => ({ ...c, faceUp: false })));
        setWaste([]);
        setMoves((m) => m + 1);
        setScore((s) => s - 5);
      }
      return;
    }
    playSound('click');
    const toDraw = Math.min(drawCount, stock.length);
    const drawn = stock.slice(-toDraw).map((c) => ({ ...c, faceUp: true }));
    setStock((s) => s.slice(0, -toDraw));
    setWaste((w) => [...w, ...drawn]);
    setMoves((m) => m + 1);
  }, [won, stock, waste, drawCount]);

  const handleClick = useCallback(
    (target: { type: PileType; pileIndex: number; cardIndex: number } | null) => {
      if (!target || won) return;

      if (target.type === 'stock') {
        handleStockClick();
        setKeyboardFocus({ type: 'stock', pileIndex: 0, cardIndex: 0 });
        return;
      }

      if (selected) {
        if (selected.type === target.type && selected.pileIndex === target.pileIndex && selected.cardIndex === target.cardIndex) {
          setSelected(null);
          playSound('click');
          return;
        }
        if (target.type === 'foundation') {
          tryMoveToFoundation(selected.type, selected.pileIndex, selected.cardIndex);
          return;
        }
        if (target.type === 'tableau') {
          tryMoveToTableau(selected.type, selected.pileIndex, selected.cardIndex, target.pileIndex);
          return;
        }
        setSelected(null);
        return;
      }

      if (target.type === 'waste' && waste.length > 0) {
        setSelected({ type: 'waste', pileIndex: 0, cardIndex: waste.length - 1 });
        setKeyboardFocus(target);
        playSound('click');
        return;
      }
      if (target.type === 'tableau') {
        const pile = tableau[target.pileIndex];
        if (pile.length === 0) {
          return;
        }
        const card = pile[target.cardIndex];
        if (card && card.faceUp) {
          setSelected({ type: 'tableau', pileIndex: target.pileIndex, cardIndex: target.cardIndex });
          setKeyboardFocus(target);
          playSound('click');
        }
      }
    },
    [selected, won, waste, tableau, tryMoveToFoundation, tryMoveToTableau, handleStockClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (won) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playSound('tick');
        const kf = keyboardFocus;
        if (kf.type === 'tableau' && kf.pileIndex > 0) {
          setKeyboardFocus({ ...kf, pileIndex: kf.pileIndex - 1 });
        } else if (kf.type === 'foundation' && kf.pileIndex > 0) {
          setKeyboardFocus({ ...kf, pileIndex: kf.pileIndex - 1 });
        } else if (kf.type === 'stock') {
          setKeyboardFocus({ type: 'waste', pileIndex: 0, cardIndex: waste.length - 1 });
        }
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        playSound('tick');
        const kf = keyboardFocus;
        if (kf.type === 'tableau' && kf.pileIndex < 6) {
          setKeyboardFocus({ ...kf, pileIndex: kf.pileIndex + 1 });
        } else if (kf.type === 'foundation' && kf.pileIndex < 3) {
          setKeyboardFocus({ ...kf, pileIndex: kf.pileIndex + 1 });
        } else if (kf.type === 'waste') {
          setKeyboardFocus({ type: 'foundation', pileIndex: 0, cardIndex: 0 });
        } else if (kf.type === 'foundation' && kf.pileIndex === 3) {
          setKeyboardFocus({ type: 'tableau', pileIndex: 0, cardIndex: 0 });
        }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        playSound('tick');
        const kf = keyboardFocus;
        if (kf.type === 'tableau') {
          const pile = tableau[kf.pileIndex];
          if (kf.cardIndex > 0) setKeyboardFocus({ ...kf, cardIndex: kf.cardIndex - 1 });
        }
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playSound('tick');
        const kf = keyboardFocus;
        if (kf.type === 'tableau') {
          const pile = tableau[kf.pileIndex];
          if (pile && kf.cardIndex < pile.length - 1) setKeyboardFocus({ ...kf, cardIndex: kf.cardIndex + 1 });
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        handleClick(keyboardFocus);
      }
    },
    [keyboardFocus, won, tableau, waste, handleClick]
  );

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }, [canvasWidth, canvasHeight]);

  const isDraggingRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);
  const lastTapHitRef = useRef<{ type: PileType; pileIndex: number; cardIndex: number } | null>(null);
  const DRAG_THRESHOLD = 8;
  const DOUBLE_TAP_MS = 350;

  const startDrag = useCallback((x: number, y: number) => {
    const hit = hitTest(x, y);
    if (!hit || won) return;
    setKeyboardFocus(hit);
    touchStartPosRef.current = { x, y };
    isDraggingRef.current = false;
    if (hit.type === 'stock') {
      handleStockClick();
    } else {
      let card: Card | null = null;
      if (hit.type === 'waste' && waste.length > 0) card = waste[waste.length - 1];
      else if (hit.type === 'tableau') card = tableau[hit.pileIndex]?.[hit.cardIndex] ?? null;
      else if (hit.type === 'foundation') card = foundation[hit.pileIndex]?.[foundation[hit.pileIndex].length - 1] ?? null;
      if (card && card.faceUp) {
        const pos = getCardPosition(hit.type, hit.pileIndex, hit.cardIndex);
        dragPosRef.current = { x, y };
        setDragging({ type: hit.type, pileIndex: hit.pileIndex, cardIndex: hit.cardIndex, offsetX: x - pos.x, offsetY: y - pos.y });
      }
    }
  }, [won, handleStockClick, waste, tableau, foundation]);

  const moveDrag = useCallback((x: number, y: number) => {
    if (!dragging) return;
    const dx = x - touchStartPosRef.current.x;
    const dy = y - touchStartPosRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
    }
    dragPosRef.current = { x, y };
    setHint(null);
  }, [dragging]);

  const endDrag = useCallback((x: number, y: number) => {
    if (!dragging) return;
    const wasDrag = isDraggingRef.current;
    isDraggingRef.current = false;

    if (wasDrag) {
      const hit = hitTest(x, y);
      if (hit && hit.type !== 'stock') {
        const d = dragging;
        const isValid = d.type === 'waste' || (d.type === 'tableau' && tableau[d.pileIndex]?.[d.cardIndex]?.faceUp) || d.type === 'foundation';
        if (isValid) {
          if (hit.type === 'foundation') {
            tryMoveToFoundation(d.type, d.pileIndex, d.cardIndex);
            lastMouseUpWasDropRef.current = true;
          } else if (hit.type === 'tableau') {
            tryMoveToTableau(d.type, d.pileIndex, d.cardIndex, hit.pileIndex);
            lastMouseUpWasDropRef.current = true;
          }
        }
      }
      setDragging(null);
      setSelected(null);
      return;
    }

    setDragging(null);

    const hit = hitTest(x, y);
    if (!hit || hit.type === 'stock') return;

    const now = Date.now();
    const lastHit = lastTapHitRef.current;
    const isDoubleTap = now - lastTapTimeRef.current < DOUBLE_TAP_MS && lastHit && lastHit.type === hit.type && lastHit.pileIndex === hit.pileIndex;
    lastTapTimeRef.current = now;
    lastTapHitRef.current = hit;

    if (isDoubleTap) {
      tryMoveToFoundation(hit.type, hit.pileIndex, hit.cardIndex);
      setSelected(null);
      lastTapHitRef.current = null;
      return;
    }

    handleClick(hit);
  }, [dragging, tableau, tryMoveToFoundation, tryMoveToTableau, handleClick]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) startDrag(coords.x, coords.y);
  }, [getCanvasCoords, startDrag]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) moveDrag(coords.x, coords.y);
  }, [getCanvasCoords, moveDrag]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) endDrag(coords.x, coords.y);
  }, [getCanvasCoords, endDrag]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (lastMouseUpWasDropRef.current) { lastMouseUpWasDropRef.current = false; return; }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (coords) startDrag(coords.x, coords.y);
  }, [getCanvasCoords, startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (coords) moveDrag(coords.x, coords.y);
  }, [getCanvasCoords, moveDrag]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = dragPosRef.current;
    endDrag(coords.x, coords.y);
  }, [endDrag]);

  const findHint = useCallback((): { type: PileType; pileIndex: number; cardIndex: number } | null => {
    const wasteTop = waste.length > 0 ? waste[waste.length - 1] : null;
    for (let f = 0; f < 4; f++) {
      if (wasteTop && canStackOnFoundation(wasteTop, foundation[f])) {
        return { type: 'waste', pileIndex: 0, cardIndex: waste.length - 1 };
      }
    }
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      if (pile.length === 0) continue;
      for (let i = pile.length - 1; i >= 0; i--) {
        const card = pile[i];
        if (!card.faceUp) break;
        for (let f = 0; f < 4; f++) {
          if (canStackOnFoundation(card, foundation[f])) return { type: 'tableau', pileIndex: col, cardIndex: i };
        }
        for (let toCol = 0; toCol < 7; toCol++) {
          if (toCol === col) continue;
          const target = tableau[toCol];
          const targetTop = target.length === 0 ? null : target[target.length - 1];
          if (canStackOnTableau(card, targetTop)) return { type: 'tableau', pileIndex: col, cardIndex: i };
        }
      }
    }
    if (wasteTop) {
      for (let col = 0; col < 7; col++) {
        const target = tableau[col];
        const targetTop = target.length === 0 ? null : target[target.length - 1];
        if (canStackOnTableau(wasteTop, targetTop)) return { type: 'waste', pileIndex: 0, cardIndex: waste.length - 1 };
      }
    }
    return null;
  }, [tableau, foundation, waste]);

  const handleHint = useCallback(() => {
    const h = findHint();
    if (h) {
      playSound('tick');
      setHint(h);
      setTimeout(() => setHint(null), 2000);
    }
  }, [findHint]);

  const handleUndo = useCallback(() => {
    if (moveHistory.length === 0 || won) return;
    playSound('click');
    const last = moveHistory[moveHistory.length - 1];
    setTableau((prev) => {
      const next = prev.map((p) => p.map((c) => ({ ...c })));
      if (last.toType === 'foundation') {
        if (last.fromType === 'tableau') {
          next[last.fromPileIndex] = [...next[last.fromPileIndex], ...last.cards];
          if (last.revealedCard) {
            const idx = next[last.fromPileIndex].length - 1 - last.cards.length;
            if (idx >= 0) next[last.fromPileIndex][idx] = { ...next[last.fromPileIndex][idx], faceUp: false };
          }
        }
      } else if (last.toType === 'tableau') {
        next[last.toPileIndex] = next[last.toPileIndex].slice(0, -last.cards.length);
        next[last.fromPileIndex] = [...next[last.fromPileIndex], ...last.cards];
        if (last.revealedCard) {
          const idx = next[last.fromPileIndex].length - 1 - last.cards.length;
          if (idx >= 0) next[last.fromPileIndex][idx] = { ...next[last.fromPileIndex][idx], faceUp: false };
        }
      }
      return next;
    });
    setFoundation((prev) =>
      last.toType === 'foundation' ? prev.map((p, i) => (i === last.toPileIndex ? p.slice(0, -1) : p)) : prev
    );
    setWaste((prev) => {
      if (last.toType === 'stock') return [];
      if (last.fromType === 'waste') return [...prev, ...last.cards];
      return prev;
    });
    setStock((prev) => {
      if (last.toType === 'stock') return [...prev, ...waste];
      return prev;
    });
    setMoves((m) => m - 1);
    setScore((s) => s - last.scoreDelta);
    setMoveHistory((h) => h.slice(0, -1));
    setSelected(null);
  }, [moveHistory, won, waste]);

  const handleNewGame = useCallback(() => {
    playSound('click');
    const { tableau: t, stock: s } = initGame();
    setTableau(t);
    setFoundation([[], [], [], []]);
    setStock(s);
    setWaste([]);
    setMoves(0);
    setScore(VEGAS_START);
    setSeconds(0);
    setWon(false);
    setMoveHistory([]);
    setSelected(null);
    setKeyboardFocus({ type: 'stock', pileIndex: 0, cardIndex: 0 });
    setAnimations([]);
    setFlipAnimations([]);
    setWinAnimations([]);
    setHint(null);
    setDragging(null);
  }, []);

  useEffect(() => {
    if (!won) {
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [won]);

  useEffect(() => {
    if (allInFoundations && !won) {
      setWon(true);
      playSound('victory');
      const allCards: Card[] = [];
      foundation.forEach((p) => p.forEach((c) => allCards.push(c)));
      setWinAnimations(
        allCards.map((card, i) => ({
          card,
          x: foundationStartX + (i % 4) * (CARD_WIDTH + PADDING),
          y: stockY,
          vx: (Math.random() - 0.5) * 12,
          vy: -8 - Math.random() * 6,
        }))
      );
    }
  }, [allInFoundations, won, foundation]);

  useEffect(() => {
    if (won && score > 0) {
      try {
        const key = 'solitaire_high_score';
        const current = parseInt(localStorage.getItem(key) || '0', 10);
        if (score > current) localStorage.setItem(key, String(score));
      } catch {}
    }
  }, [won, score]);

  useEffect(() => {
    if (!autoPlay || won || animations.length > 0) return;
    const wasteTop = waste[waste.length - 1];
    if (wasteTop && wasteTop.rank <= 2) {
      for (let f = 0; f < 4; f++) {
        if (canStackOnFoundation(wasteTop, foundation[f])) {
          tryMoveToFoundation('waste', 0, waste.length - 1);
          return;
        }
      }
    }
    for (let col = 0; col < 7; col++) {
      const pile = tableau[col];
      if (pile.length === 0) continue;
      const card = pile[pile.length - 1];
      if (!card.faceUp) continue;
      for (let f = 0; f < 4; f++) {
        if (canStackOnFoundation(card, foundation[f])) {
          tryMoveToFoundation('tableau', col, pile.length - 1);
          return;
        }
      }
    }
  }, [autoPlay, won, tableau, foundation, waste, tryMoveToFoundation, animations.length]);

  const highScore = useMemo(() => {
    try {
      return parseInt(localStorage.getItem('solitaire_high_score') || '0', 10);
    } catch {
      return 0;
    }
  }, [won, score]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const t = THEMES[theme];
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpi;
    canvas.height = canvasHeight * dpi;
    ctx.scale(dpi, dpi);
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (stock.length > 0) {
      drawCard(ctx, stock[stock.length - 1], stockX, stockY, 1, keyboardFocus.type === 'stock');
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      roundRect(ctx, stockX, stockY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
      ctx.fill();
    }

    waste.forEach((c, i) => {
      const pos = getCardPosition('waste', 0, waste.length - 1 - i);
      drawCard(ctx, c, pos.x, pos.y, 1, selected?.type === 'waste' && selected.cardIndex === waste.length - 1 - i);
    });

    foundation.forEach((pile, f) => {
      const fx = foundationStartX + f * (CARD_WIDTH + PADDING);
      if (pile.length > 0) {
        drawCard(ctx, pile[pile.length - 1], fx, stockY, 1, keyboardFocus.type === 'foundation' && keyboardFocus.pileIndex === f);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        roundRect(ctx, fx, stockY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    tableau.forEach((pile, col) => {
      pile.forEach((card, idx) => {
        const pos = getCardPosition('tableau', col, idx);
        const isHint = hint?.type === 'tableau' && hint.pileIndex === col && hint.cardIndex === idx;
        drawCard(ctx, card, pos.x, pos.y, 1, isHint || (selected?.type === 'tableau' && selected.pileIndex === col && selected.cardIndex === idx));
      });
      if (pile.length === 0) {
        const baseX = tableauStartX + col * (CARD_WIDTH + PADDING);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([4, 4]);
        roundRect(ctx, baseX, tableauStartY, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    animations.forEach((anim) => {
      const elapsed = now - anim.startTime;
      const t2 = Math.min(1, elapsed / anim.duration);
      const ease = 1 - Math.pow(1 - t2, 2);
      const x = anim.fromX + (anim.toX - anim.fromX) * ease;
      const y = anim.fromY + (anim.toY - anim.fromY) * ease;
      drawCard(ctx, anim.card, x, y);
    });

    flipAnimations.forEach((fa) => {
      const elapsed = now - fa.startTime;
      const t2 = Math.min(1, elapsed / fa.duration);
      const scaleX = t2 < 0.5 ? 1 - t2 * 2 : (t2 - 0.5) * 2;
      const pos = getCardPosition(fa.pileType, fa.pileIndex, fa.cardIndex);
      ctx.save();
      ctx.translate(pos.x + CARD_WIDTH / 2, pos.y + CARD_HEIGHT / 2);
      ctx.scale(Math.abs(scaleX), 1);
      ctx.translate(-(pos.x + CARD_WIDTH / 2), -(pos.y + CARD_HEIGHT / 2));
      drawCard(ctx, fa.card, pos.x, pos.y);
      ctx.restore();
    });
    if (flipAnimations.length > 0 && flipAnimations.every((fa) => now - fa.startTime > fa.duration)) {
      setFlipAnimations([]);
    }

    winAnimations.forEach((wa) => {
      drawCard(ctx, wa.card, wa.x, wa.y);
    });

    if (dragging && isDraggingRef.current) {
      const dp = dragPosRef.current;
      const mx = dp.x - dragging.offsetX;
      const my = dp.y - dragging.offsetY;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      if (dragging.type === 'tableau') {
        const pile = tableau[dragging.pileIndex];
        const dragCards = pile.slice(dragging.cardIndex);
        dragCards.forEach((c, i) => {
          if (c.faceUp) drawCard(ctx, c, mx, my + i * CARD_OVERLAP, 1, i === 0);
        });
      } else if (dragging.type === 'waste' && waste.length > 0) {
        const card = waste[waste.length - 1];
        if (card.faceUp) drawCard(ctx, card, mx, my, 1, true);
      } else if (dragging.type === 'foundation') {
        const pile = foundation[dragging.pileIndex];
        const card = pile[pile.length - 1];
        if (card) drawCard(ctx, card, mx, my, 1, true);
      }

      ctx.restore();
    }
  }, [
    theme,
    stock,
    waste,
    foundation,
    tableau,
    selected,
    keyboardFocus,
    hint,
    animations,
    flipAnimations,
    winAnimations,
    dragging,
    drawCard,
  ]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if (coords) moveDrag(coords.x, coords.y);
      }
    };
    const onMouseUp = (e: MouseEvent) => {
      if (dragging) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if (coords) endDrag(coords.x, coords.y);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, getCanvasCoords, moveDrag, endDrag]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render]);

  useEffect(() => {
    if (won && winAnimations.length > 0) {
      const interval = setInterval(() => {
        setWinAnimations((prev) =>
          prev
            .map((w) => ({
              ...w,
              x: w.x + w.vx,
              y: w.y + w.vy,
              vy: w.vy + 0.5,
            }))
            .filter((w) => w.y < canvasHeight + 50)
        );
      }, 16);
      return () => clearInterval(interval);
    }
  }, [won, winAnimations.length]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div
      ref={containerRef}
      className="game-card bg-gray-900/95 border border-gray-700 text-gray-100 overflow-hidden w-full max-w-2xl mx-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-wrap gap-2">
        <h2 className="text-xl font-bold">Solitaire — Klondike</h2>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="font-semibold">Score: <span className={score >= 0 ? 'text-green-400' : 'text-amber-400'}>{score}</span></span>
          <span>Moves: {moves}</span>
          <span>Time: {formatTime(seconds)}</span>
          {highScore > 0 && <span className="text-amber-400">Best: {highScore}</span>}
        </div>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
          Close
        </button>
      </div>

      {allFaceUp && !won && (
        <div className="px-4 py-2 bg-green-900/40 text-green-300 text-sm font-medium text-center">
          ✨ Auto-complete: move cards to foundations
        </div>
      )}

      {won && (
        <div className="mx-4 mt-4 p-6 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white text-center shadow-xl">
          <div className="text-5xl mb-2">🎉</div>
          <h3 className="text-2xl font-bold mb-3">You Won!</h3>
          <div className="space-y-1 text-sm opacity-90">
            <div>Time: <span className="font-bold">{formatTime(seconds)}</span></div>
            <div>Moves: <span className="font-bold">{moves}</span></div>
            <div>Score: <span className="font-bold">{score}</span></div>
          </div>
        </div>
      )}

      <div className="p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block w-full cursor-pointer rounded-lg shadow-2xl border border-gray-600"
          style={{ width: canvasWidth, height: canvasHeight, maxWidth: '100%', touchAction: 'none' }}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      <div className="p-3 sm:p-4 border-t border-gray-700 flex flex-wrap gap-2 items-center">
        <button onClick={handleNewGame} className="btn-elite btn-elite-primary text-sm touch-manipulation active:scale-95">
          New Game
        </button>
        <button
          onClick={handleUndo}
          disabled={moveHistory.length === 0 || won}
          className="btn-elite btn-elite-ghost text-sm disabled:opacity-50 touch-manipulation active:scale-95"
        >
          Undo
        </button>
        <button onClick={handleHint} disabled={won} className="btn-elite btn-elite-ghost text-sm disabled:opacity-50 touch-manipulation active:scale-95">
          Hint
        </button>
        {allFaceUp && !won && (
          <button
            onClick={() => setAutoPlay(true)}
            className="btn-elite btn-elite-accent text-sm touch-manipulation active:scale-95 animate-pulse"
          >
            Auto-Complete
          </button>
        )}
        <select
          value={drawCount}
          onChange={(e) => setDrawCount(Number(e.target.value) as 1 | 3)}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm min-h-[44px] touch-manipulation"
        >
          <option value={1}>Draw 1</option>
          <option value={3}>Draw 3</option>
        </select>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as CardTheme)}
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm min-h-[44px] touch-manipulation"
        >
          <option value="classic">Classic</option>
          <option value="dark">Dark</option>
          <option value="blue">Blue</option>
          <option value="green">Green Felt</option>
        </select>
      </div>

      <div className="px-4 pb-3 text-xs text-gray-400">
        Tap to select, tap destination to move. Double-tap to send to foundation. Drag cards between piles.
      </div>
    </div>
  );
}
