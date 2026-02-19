/* ═══════════════════════════════════════════════════════════════════════════════
   CHECKERS — Elite Canvas Edition
   Canvas-based rendering, smooth animations, AI, themes, timers, full feature set
   Arrow keys + Space / Mouse click controls
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

type Player = 'red' | 'black';
type PieceType = 'man' | 'king';
type BoardTheme = 'classic' | 'modern' | 'wood' | 'marble';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Piece {
  player: Player;
  type: PieceType;
}

interface MoveRecord {
  from: [number, number];
  to: [number, number];
  removed?: [number, number];
  promoted?: boolean;
  board: (Piece | null)[][];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface AnimatingPiece {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  piece: Piece;
  startTime: number;
  duration: number;
  removed?: [number, number];
}

interface PromotionAnim {
  r: number;
  c: number;
  piece: Piece;
  startTime: number;
  duration: number;
}

interface JumpTrail {
  from: [number, number];
  to: [number, number];
  startTime: number;
  duration: number;
}

const BOARD_SIZE = 8;
const CELL_PX = 64;
const PIECE_RADIUS = 24;
const ANIM_MS = 180;
const PROMO_MS = 400;

type Board = (Piece | null)[][];

// ─── Theme palettes ───────────────────────────────────────────────────────────
const THEMES = {
  classic: {
    light: '#f5deb3',
    dark: '#8b4513',
    pieceRed: '#dc2626',
    pieceRedBorder: '#991b1b',
    pieceBlack: '#374151',
    pieceBlackBorder: '#1f2937',
    highlight: '#22c55e',
    glow: 'rgba(139, 92, 246, 0.6)',
    validDot: '#16a34a',
  },
  modern: {
    light: '#1e293b',
    dark: '#0f172a',
    pieceRed: '#ef4444',
    pieceRedBorder: '#f87171',
    pieceBlack: '#3b82f6',
    pieceBlackBorder: '#60a5fa',
    highlight: '#00ff88',
    glow: 'rgba(168, 85, 247, 0.8)',
    validDot: '#00ff88',
  },
  wood: {
    light: '#e8d5b7',
    dark: '#6b4423',
    pieceRed: '#b91c1c',
    pieceRedBorder: '#7f1d1d',
    pieceBlack: '#292524',
    pieceBlackBorder: '#1c1917',
    highlight: '#65a30d',
    glow: 'rgba(202, 138, 4, 0.6)',
    validDot: '#4d7c0f',
  },
  marble: {
    light: '#f8fafc',
    dark: '#94a3b8',
    pieceRed: '#e11d48',
    pieceRedBorder: '#9f1239',
    pieceBlack: '#334155',
    pieceBlackBorder: '#1e293b',
    highlight: '#0d9488',
    glow: 'rgba(99, 102, 241, 0.6)',
    validDot: '#0d9488',
  },
};

function createInitialBoard(): Board {
  const board: Board = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = (r + 1) % 2; c < BOARD_SIZE; c += 2) {
      if (r < 3) board[r][c] = { player: 'black', type: 'man' };
      else if (r >= BOARD_SIZE - 3) board[r][c] = { player: 'red', type: 'man' };
    }
  }
  return board;
}

function getJumpMoves(board: Board, r: number, c: number, player: Player): [number, number][] {
  const piece = board[r][c];
  if (!piece || piece.player !== player) return [];
  const dirs =
    piece.type === 'king'
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : player === 'red'
        ? [
            [-1, -1],
            [-1, 1],
          ]
        : [
            [1, -1],
            [1, 1],
          ];
  const moves: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const jr = r + 2 * dr;
    const jc = c + 2 * dc;
    const mr = r + dr;
    const mc = c + dc;
    if (jr < 0 || jr >= BOARD_SIZE || jc < 0 || jc >= BOARD_SIZE) continue;
    const mid = board[mr][mc];
    const dest = board[jr][jc];
    if (mid && mid.player !== player && !dest) moves.push([jr, jc]);
  }
  return moves;
}

function getSimpleMoves(board: Board, r: number, c: number, player: Player): [number, number][] {
  const piece = board[r][c];
  if (!piece || piece.player !== player) return [];
  const dirs =
    piece.type === 'king'
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : player === 'red'
        ? [
            [-1, -1],
            [-1, 1],
          ]
        : [
            [1, -1],
            [1, 1],
          ];
  const moves: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && !board[nr][nc])
      moves.push([nr, nc]);
  }
  return moves;
}

function hasAnyJump(board: Board, player: Player): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getJumpMoves(board, r, c, player).length > 0) return true;
    }
  }
  return false;
}

function getValidMoves(board: Board, r: number, c: number, player: Player): [number, number][] {
  const jumps = getJumpMoves(board, r, c, player);
  if (jumps.length > 0) return jumps;
  return getSimpleMoves(board, r, c, player);
}

function getJumpChains(
  board: Board,
  fromR: number,
  fromC: number,
  player: Player
): { to: [number, number]; removed: [number, number] }[] {
  const piece = board[fromR][fromC];
  if (!piece || piece.player !== player) return [];
  const dirs =
    piece.type === 'king'
      ? [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ]
      : player === 'red'
        ? [
            [-1, -1],
            [-1, 1],
          ]
        : [
            [1, -1],
            [1, 1],
          ];
  const results: { to: [number, number]; removed: [number, number] }[] = [];
  for (const [dr, dc] of dirs) {
    const jr = fromR + 2 * dr;
    const jc = fromC + 2 * dc;
    const mr = fromR + dr;
    const mc = fromC + dc;
    if (jr < 0 || jr >= BOARD_SIZE || jc < 0 || jc >= BOARD_SIZE) continue;
    const mid = board[mr][mc];
    const dest = board[jr][jc];
    if (mid && mid.player !== player && !dest)
      results.push({ to: [jr, jc], removed: [mr, mc] });
  }
  return results;
}

function applyMove(
  board: Board,
  fromR: number,
  fromC: number,
  toR: number,
  toC: number,
  removeR?: number,
  removeC?: number
): Board {
  const next = board.map((row) => row.map((p) => (p ? { ...p } : null)));
  const piece = next[fromR][fromC]!;
  next[toR][toC] = piece;
  next[fromR][fromC] = null;
  if (removeR !== undefined && removeC !== undefined) next[removeR][removeC] = null;
  if (piece.type === 'man') {
    const promoteRed = piece.player === 'red' && toR === 0;
    const promoteBlack = piece.player === 'black' && toR === BOARD_SIZE - 1;
    if (promoteRed || promoteBlack) next[toR][toC] = { ...piece, type: 'king' };
  }
  return next;
}

function getAllMovesForPlayer(
  board: Board,
  player: Player
): { from: [number, number]; to: [number, number]; remove?: [number, number] }[] {
  const list: {
    from: [number, number];
    to: [number, number];
    remove?: [number, number];
  }[] = [];
  const mustJump = hasAnyJump(board, player);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const jumps = getJumpChains(board, r, c, player);
      jumps.forEach(({ to, removed }) => {
        list.push({ from: [r, c], to, remove: removed });
      });
      if (!mustJump) {
        getSimpleMoves(board, r, c, player).forEach(([nr, nc]) => {
          list.push({ from: [r, c], to: [nr, nc] });
        });
      }
    }
  }
  return list;
}

function countPieces(board: Board, player: Player): number {
  let count = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c]?.player === player) count++;
    }
  }
  return count;
}

function aiPickMove(
  board: Board,
  difficulty: Difficulty
): { from: [number, number]; to: [number, number]; remove?: [number, number] } | null {
  const moves = getAllMovesForPlayer(board, 'black');
  if (moves.length === 0) return null;

  const captures = moves.filter((m) => m.remove);
  const candidates = captures.length > 0 ? captures : moves;

  if (difficulty === 'easy') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (difficulty === 'medium') {
    const priorities = candidates.filter((m) => {
      const sim = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1], m.remove?.[0], m.remove?.[1]);
      const redAfter = countPieces(sim, 'red');
      const blackAfter = countPieces(sim, 'black');
      return m.remove || blackAfter - redAfter >= -1;
    });
    const pool = priorities.length > 0 ? priorities : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Hard: evaluate moves with simple heuristic
  let bestScore = -9999;
  let bestMoves: typeof candidates = [];
  for (const m of candidates) {
    const sim = applyMove(board, m.from[0], m.from[1], m.to[0], m.to[1], m.remove?.[0], m.remove?.[1]);
    let score = 0;
    score += countPieces(sim, 'black') * 10;
    score -= countPieces(sim, 'red') * 10;
    if (m.remove) score += 15;
    const piece = board[m.from[0]][m.from[1]];
    if (piece?.type === 'king') score += 2;
    if (piece?.type === 'man' && (m.to[0] === 0 || m.to[0] === 7)) score += 5;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function copyBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

export default function CheckersGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>('red');
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([7, 1]);
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [capturedRed, setCapturedRed] = useState(0);
  const [capturedBlack, setCapturedBlack] = useState(0);
  const [theme, setTheme] = useState<BoardTheme>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [scoreWins, setScoreWins] = useState(0);
  const [scoreLosses, setScoreLosses] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [historyPanel, setHistoryPanel] = useState(false);
  const [redTime, setRedTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const timerRef = useRef<number | null>(null);
  const aiThinkingRef = useRef(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animating, setAnimating] = useState<AnimatingPiece | null>(null);
  const [promoAnim, setPromoAnim] = useState<PromotionAnim | null>(null);
  const [jumpTrail, setJumpTrail] = useState<JumpTrail | null>(null);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [crownPhase, setCrownPhase] = useState(0);

  const redCount = countPieces(board, 'red');
  const blackCount = countPieces(board, 'black');

  useEffect(() => {
    setCapturedRed(12 - redCount);
    setCapturedBlack(12 - blackCount);
  }, [redCount, blackCount]);

  // Timer (increment current player's time each second)
  useEffect(() => {
    if (!timerActive || gameOver) return;
    timerRef.current = window.setInterval(() => {
      setRedTime((t) => (turn === 'red' ? t + 1 : t));
      setBlackTime((t) => (turn === 'black' ? t + 1 : t));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [turn, timerActive, gameOver]);

  useEffect(() => {
    if (redCount === 0 && blackCount > 0) {
      setGameOver('Black wins!');
      setScoreLosses((l) => l + 1);
      playSound('gameover');
    } else if (blackCount === 0 && redCount > 0) {
      setGameOver('Red wins!');
      setScoreWins((w) => w + 1);
      playSound('victory');
    }
  }, [redCount, blackCount]);

  useEffect(() => {
    if (gameOver || turn !== 'red') return;
    const moves = getAllMovesForPlayer(board, 'red');
    if (moves.length === 0 && redCount > 0 && blackCount > 0) {
      setGameOver('Black wins! (No valid moves)');
      setScoreLosses((l) => l + 1);
      playSound('gameover');
    }
  }, [board, turn, gameOver, redCount, blackCount]);

  useEffect(() => {
    if (gameOver || turn !== 'black') return;
    const moves = getAllMovesForPlayer(board, 'black');
    if (moves.length === 0 && !gameOver) {
      setGameOver('Red wins! (No valid moves)');
      setScoreWins((w) => w + 1);
      playSound('victory');
      return;
    }
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;

    const delay = difficulty === 'easy' ? 600 : difficulty === 'medium' ? 900 : 1200;
    const timer = setTimeout(() => {
      let currentBoard = copyBoard(board);
      const prevBoard = copyBoard(board);
      let moveChain: { from: [number, number]; to: [number, number]; remove?: [number, number] }[] = [];
      let from: [number, number] | null = null;
      let to: [number, number] | null = null;

      let move = aiPickMove(currentBoard, difficulty);
      while (move) {
        if (moveChain.length === 0) from = move.from;
        to = move.to;
        if (move.remove) {
          const col = currentBoard[move.remove[0]][move.remove[1]]?.player === 'red' ? '#dc2626' : '#374151';
          setParticles((p) => {
            const cx = (move!.remove![1] + 0.5) * CELL_PX;
            const cy = (move!.remove![0] + 0.5) * CELL_PX;
            const newP: Particle[] = [];
            for (let i = 0; i < 12; i++) {
              const angle = (Math.PI * 2 * i) / 12 + Math.random();
              newP.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                life: 1, color: col, size: 4 + Math.random() * 4,
              });
            }
            return [...p, ...newP];
          });
          playSound('hit');
        } else if (moveChain.length === 0) {
          playSound('slide');
        }
        moveChain.push(move);
        currentBoard = applyMove(
          currentBoard,
          move.from[0], move.from[1],
          move.to[0], move.to[1],
          move.remove?.[0], move.remove?.[1]
        );
        const moreJumps = getJumpChains(currentBoard, move.to[0], move.to[1], 'black');
        move = moreJumps.length > 0 ? { from: move.to, to: moreJumps[0].to, remove: moreJumps[0].removed } : null;
      }

      if (moveChain.length > 0 && from && to) {
        const firstMove = moveChain[0];
        const lastMove = moveChain[moveChain.length - 1];
        setBoard(currentBoard);
        setLastMove({ from: firstMove.from, to: lastMove.to });
        setMoveCount((m) => m + 1);
        setMoveHistory((h) => [
          ...h,
          { from: firstMove.from, to: lastMove.to, removed: lastMove.remove, board: prevBoard },
        ]);
        setTurn('red');
      }
      aiThinkingRef.current = false;
    }, delay);

    return () => {
      clearTimeout(timer);
      aiThinkingRef.current = false;
    };
  }, [turn, board, gameOver, difficulty]);

  const spawnParticles = useCallback((r: number, c: number, color: string) => {
    const cx = (c + 0.5) * CELL_PX;
    const cy = (r + 0.5) * CELL_PX;
    setParticles((p) => {
      const newP: Particle[] = [];
      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14 + Math.random();
        newP.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          life: 1,
          color,
          size: 5 + Math.random() * 5,
        });
      }
      return [...p, ...newP];
    });
  }, []);

  const handleMove = useCallback(
    (fromR: number, fromC: number, toR: number, toC: number, removed?: [number, number]) => {
      const piece = board[fromR][fromC];
      if (!piece || piece.player !== 'red') return;

      const prevBoard = copyBoard(board);
      let next = applyMove(board, fromR, fromC, toR, toC, removed?.[0], removed?.[1]);
      const promoted = piece.type === 'man' && (toR === 0 || toR === BOARD_SIZE - 1);

      if (removed) {
        spawnParticles(removed[0], removed[1], board[removed[0]][removed[1]]?.player === 'red' ? '#dc2626' : '#374151');
        playSound('hit');
      } else {
        playSound('slide');
      }

      setBoard(next);
      setLastMove({ from: [fromR, fromC], to: [toR, toC] });
      setMoveCount((m) => m + 1);
      setMoveHistory((h) => [...h, { from: [fromR, fromC], to: [toR, toC], removed, promoted, board: prevBoard }]);

      const moreJumps = getJumpChains(next, toR, toC, 'red');
      if (moreJumps.length > 0) {
        setSelected([toR, toC]);
        setValidMoves(moreJumps.map((j) => j.to));
      } else {
        setSelected(null);
        setValidMoves([]);
        setTurn('black');
      }
    },
    [board, spawnParticles]
  );

  const handleSquareAction = useCallback(
    (r: number, c: number) => {
      if (gameOver || turn !== 'red') return;

      const isDest = validMoves.some(([nr, nc]) => nr === r && nc === c);
      if (isDest && selected) {
        const [sr, sc] = selected;
        const jumps = getJumpChains(board, sr, sc, 'red');
        const jump = jumps.find((j) => j.to[0] === r && j.to[1] === c);
        const pieceToMove = board[sr][sc]!;
        if (jump) {
          setJumpTrail({ from: [sr, sc], to: [r, c], startTime: Date.now(), duration: ANIM_MS });
        }
        setAnimating({
          fromR: sr,
          fromC: sc,
          toR: r,
          toC: c,
          piece: pieceToMove,
          startTime: Date.now(),
          duration: ANIM_MS,
          removed: jump?.removed,
        });
        setTimeout(() => {
          setAnimating(null);
          setJumpTrail(null);
          const next = applyMove(board, sr, sc, r, c, jump?.removed[0], jump?.removed[1]);
          const promo = next[r][c];
          if (promo?.type === 'king') {
            setPromoAnim({ r, c, piece: promo, startTime: Date.now(), duration: PROMO_MS });
            playSound('powerup');
          }
          handleMove(sr, sc, r, c, jump?.removed);
        }, ANIM_MS);
        return;
      }

      const piece = board[r][c];
      if (piece && piece.player === 'red') {
        const mustJump = hasAnyJump(board, 'red');
        const moves = mustJump ? getJumpMoves(board, r, c, 'red') : getValidMoves(board, r, c, 'red');
        if (moves.length > 0) {
          setSelected([r, c]);
          setValidMoves(moves);
          setCursor([r, c]);
          playSound('click');
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      } else {
        setSelected(null);
        setValidMoves([]);
      }
    },
    [board, turn, selected, validMoves, gameOver, handleMove]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver) return;
      const [cr, cc] = cursor;
      if (e.key === 'ArrowUp' && cr > 0) {
        e.preventDefault();
        setCursor([Math.max(0, cr - 1), cc]);
        playSound('tick');
      } else if (e.key === 'ArrowDown' && cr < 7) {
        e.preventDefault();
        setCursor([Math.min(7, cr + 1), cc]);
        playSound('tick');
      } else if (e.key === 'ArrowLeft' && cc > 0) {
        e.preventDefault();
        setCursor([cr, Math.max(0, cc - 1)]);
        playSound('tick');
      } else if (e.key === 'ArrowRight' && cc < 7) {
        e.preventDefault();
        setCursor([cr, Math.min(7, cc + 1)]);
        playSound('tick');
      } else if (e.key === ' ') {
        e.preventDefault();
        handleSquareAction(cr, cc);
      }
    },
    [cursor, gameOver, handleSquareAction]
  );

  useEffect(() => {
    const id = setInterval(() => setCrownPhase((p) => (p + 0.08) % (Math.PI * 2)), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const c = Math.floor(x / CELL_PX);
    const r = Math.floor(y / CELL_PX);
    if (r >= 0 && r < 8 && c >= 0 && c < 8) return [r, c];
    return null;
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords) {
        setCursor(coords);
        handleSquareAction(coords[0], coords[1]);
      }
    },
    [getCanvasCoords, handleSquareAction]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      if (!touch) return;
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      if (coords) {
        setCursor(coords);
        handleSquareAction(coords[0], coords[1]);
      }
    },
    [getCanvasCoords, handleSquareAction]
  );

  const handleUndo = useCallback(() => {
    if (moveHistory.length < 2 || turn !== 'red' || gameOver) return;
    const prevHumanBoard = moveHistory[moveHistory.length - 2].board;
    const prevLastMove = moveHistory.length >= 3 ? { from: moveHistory[moveHistory.length - 3].from, to: moveHistory[moveHistory.length - 3].to } : null;
    setBoard(copyBoard(prevHumanBoard));
    setMoveHistory((h) => h.slice(0, -2));
    setLastMove(prevLastMove);
    setMoveCount((m) => Math.max(0, m - 2));
    setSelected(null);
    setValidMoves([]);
    setTurn('red');
    playSound('click');
  }, [moveHistory, turn, gameOver]);

  const handleNewGame = useCallback(() => {
    setBoard(createInitialBoard());
    setTurn('red');
    setSelected(null);
    setValidMoves([]);
    setGameOver(null);
    setRedTime(0);
    setBlackTime(0);
    setMoveHistory([]);
    setParticles([]);
    setAnimating(null);
    setPromoAnim(null);
    setJumpTrail(null);
    setLastMove(null);
    setMoveCount(0);
    setCursor([7, 1]);
    playSound('correct');
  }, []);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const render = () => {
      const w = BOARD_SIZE * CELL_PX;
      const h = BOARD_SIZE * CELL_PX;
      canvas.width = w;
      canvas.height = h;

      const t = THEMES[theme];

      // Board
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const isLight = (r + c) % 2 === 0;
          ctx.fillStyle = isLight ? t.light : t.dark;
          ctx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
        }
      }

      // Last move highlight (from/to squares)
      if (lastMove) {
        const [[fr, fc], [tr, tc]] = [lastMove.from, lastMove.to];
        ctx.fillStyle = 'rgba(255, 255, 0, 0.4)';
        ctx.fillRect(fc * CELL_PX, fr * CELL_PX, CELL_PX, CELL_PX);
        ctx.fillRect(tc * CELL_PX, tr * CELL_PX, CELL_PX, CELL_PX);
      }

      // Forced jump indicator (highlight red pieces that must jump)
      if (turn === 'red' && hasAnyJump(board, 'red')) {
        const forcedPieces: [number, number][] = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (getJumpMoves(board, r, c, 'red').length > 0) forcedPieces.push([r, c]);
          }
        }
        forcedPieces.forEach(([r, c]) => {
          const cx = c * CELL_PX + CELL_PX / 2;
          const cy = r * CELL_PX + CELL_PX / 2;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, PIECE_RADIUS + 8);
          grad.addColorStop(0, 'rgba(255, 200, 0, 0.5)');
          grad.addColorStop(0.8, 'rgba(255, 100, 0, 0.2)');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, PIECE_RADIUS + 12, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Valid move dots
      for (const [nr, nc] of validMoves) {
        const cx = nc * CELL_PX + CELL_PX / 2;
        const cy = nr * CELL_PX + CELL_PX / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = t.validDot;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Selected glow
      if (selected && !animating) {
        const [sr, sc] = selected;
        const cx = sc * CELL_PX + CELL_PX / 2;
        const cy = sr * CELL_PX + CELL_PX / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, PIECE_RADIUS + 16);
        grad.addColorStop(0, t.glow);
        grad.addColorStop(0.6, 'transparent');
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, PIECE_RADIUS + 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Cursor highlight (subtle)
      const [cr, cc] = cursor;
      ctx.strokeStyle = theme === 'modern' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(cc * CELL_PX + 1, cr * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);

      // Pieces (from board state, but exclude animating source)
      const animSrc = animating ? { r: animating.fromR, c: animating.fromC } : null;
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (animSrc && r === animSrc.r && c === animSrc.c) continue;
          const piece = board[r][c];
          if (!piece) continue;
          const cx = c * CELL_PX + CELL_PX / 2;
          const cy = r * CELL_PX + CELL_PX / 2;
          drawPiece(ctx, piece, cx, cy, t);
        }
      }

      // Animating piece (overlay)
      if (animating) {
        const elapsed = Date.now() - animating.startTime;
        const t0 = Math.min(1, elapsed / animating.duration);
        const eased = t0 * (2 - t0);
        const cx =
          (animating.fromC + (animating.toC - animating.fromC) * eased) * CELL_PX + CELL_PX / 2;
        const cy =
          (animating.fromR + (animating.toR - animating.fromR) * eased) * CELL_PX + CELL_PX / 2;
        drawPiece(ctx, animating.piece, cx, cy, t);
        if (elapsed >= animating.duration) setAnimating(null);
      }

      // Jump trail
      if (jumpTrail) {
        const elapsed = Date.now() - jumpTrail.startTime;
        const t0 = Math.min(1, elapsed / jumpTrail.duration);
        ctx.strokeStyle = t.glow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - t0;
        ctx.beginPath();
        const x1 = jumpTrail.from[1] * CELL_PX + CELL_PX / 2;
        const y1 = jumpTrail.from[0] * CELL_PX + CELL_PX / 2;
        const x2 = jumpTrail.to[1] * CELL_PX + CELL_PX / 2;
        const y2 = jumpTrail.to[0] * CELL_PX + CELL_PX / 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Promotion crown animation
      if (promoAnim) {
        const elapsed = Date.now() - promoAnim.startTime;
        const t0 = Math.min(1, elapsed / promoAnim.duration);
        const scale = 0.5 + t0 * 0.5;
        const cx = promoAnim.c * CELL_PX + CELL_PX / 2;
        const cy = promoAnim.r * CELL_PX + CELL_PX / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        drawCrown(ctx, promoAnim.piece.player === 'red' ? t.pieceRedBorder : t.pieceBlackBorder);
        ctx.restore();
      }

      // Particles
      setParticles((prev) => {
        const next: Particle[] = [];
        for (const p of prev) {
          const nx = p.x + p.vx;
          const ny = p.y + p.vy;
          const nLife = p.life - 0.03;
          if (nLife > 0) {
            next.push({
              ...p,
              x: nx,
              y: ny,
              life: nLife,
              vy: p.vy + 0.2,
            });
          }
        }
        for (const p of next) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        return next;
      });

      raf = requestAnimationFrame(render);
    };

    function drawPiece(
      ctx: CanvasRenderingContext2D,
      piece: Piece,
      cx: number,
      cy: number,
      t: (typeof THEMES)[BoardTheme]
    ) {
      const fill = piece.player === 'red' ? t.pieceRed : t.pieceBlack;
      const border = piece.player === 'red' ? t.pieceRedBorder : t.pieceBlackBorder;

      if (piece.type === 'king') {
        const crownGlow = 0.3 + 0.15 * Math.sin(crownPhase);
        const grad = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy, PIECE_RADIUS + 10);
        grad.addColorStop(0, 'rgba(255, 215, 0, ' + crownGlow + ')');
        grad.addColorStop(0.6, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy - 8, PIECE_RADIUS + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, PIECE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (piece.type === 'king') {
        drawCrown(ctx, border);
      }
    }

    function drawCrown(ctx: CanvasRenderingContext2D, color: string) {
      ctx.save();
      ctx.translate(0, -6);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(6, 0);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }

    render();
    return () => cancelAnimationFrame(raf);
  }, [
    board,
    selected,
    cursor,
    validMoves,
    theme,
    animating,
    promoAnim,
    jumpTrail,
    particles,
  ]);

  return (
    <div className="game-card bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 backdrop-blur w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold tracking-tight">Checkers</h2>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
            Close
          </button>
        </div>
      </div>

      {gameOver ? (
        <div className="mb-4 p-4 rounded-xl bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-400 dark:border-amber-600">
          <div className="text-lg font-bold text-amber-900 dark:text-amber-200 mb-3">{gameOver}</div>
          <div className="text-sm text-amber-800 dark:text-amber-300 mb-3">
            Score: {scoreWins} wins / {scoreLosses} losses
          </div>
          <button onClick={handleNewGame} className="btn-elite btn-elite-primary touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
            New Game
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 items-center justify-between mb-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-medium">
                {turn === 'red' ? 'Your turn (Red)' : 'AI thinking… (Black)'}
              </span>
              <span className="text-sm opacity-80">
                Red: {redCount} | Black: {blackCount}
              </span>
              <span className="text-sm opacity-80">
                Captured: {capturedRed} / {capturedBlack}
              </span>
              <span className="text-sm opacity-80">
                Red: {Math.floor(redTime / 60)}:{String(redTime % 60).padStart(2, '0')} | Black:{' '}
                {Math.floor(blackTime / 60)}:{String(blackTime % 60).padStart(2, '0')}
              </span>
              <span className="text-sm font-medium">
                W: {scoreWins} L: {scoreLosses}
              </span>
              <span className="text-sm opacity-80" title="Total moves">
                Move # {moveCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as BoardTheme)}
                className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                onMouseDown={() => playSound('click')}
              >
                <option value="classic">Classic</option>
                <option value="modern">Modern</option>
                <option value="wood">Wood</option>
                <option value="marble">Marble</option>
              </select>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                onMouseDown={() => playSound('click')}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            {/* Captured pieces - left */}
            <div className="w-12 flex flex-col items-center gap-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-xs font-medium text-red-600 dark:text-red-400">Captured</span>
              <div className="flex flex-wrap justify-center gap-0.5 max-h-32 overflow-y-auto">
                {Array.from({ length: capturedRed }).map((_, i) => (
                  <div
                    key={`red-${i}`}
                    className="w-5 h-5 rounded-full bg-red-500 border border-red-700"
                    title="Captured red"
                  />
                ))}
              </div>
            </div>

            <div className="relative">
              <div style={{ touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="block w-full border-2 border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer touch-none select-none"
                  style={{ width: BOARD_SIZE * CELL_PX, height: BOARD_SIZE * CELL_PX, maxWidth: '100%', touchAction: 'none' }}
                  tabIndex={0}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Arrow keys to move cursor • Space to select/move • Or click
              </p>
            </div>

            {/* Captured pieces - right */}
            <div className="w-12 flex flex-col items-center gap-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Captured</span>
              <div className="flex flex-wrap justify-center gap-0.5 max-h-32 overflow-y-auto">
                {Array.from({ length: capturedBlack }).map((_, i) => (
                  <div
                    key={`black-${i}`}
                    className="w-5 h-5 rounded-full bg-slate-600 border border-slate-800"
                    title="Captured black"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button onClick={handleNewGame} className="btn-elite btn-elite-primary touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
            New Game
          </button>
            <button
              onClick={handleUndo}
              disabled={moveHistory.length === 0 || turn !== 'red'}
              className="btn-elite btn-elite-ghost disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              Undo
            </button>
            <button
              onClick={() => setHistoryPanel(!historyPanel)}
              className="btn-elite btn-elite-ghost touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              {historyPanel ? 'Hide History' : 'Move History'}
            </button>
            <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>
              Close
            </button>
          </div>

          {historyPanel && (
            <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 max-h-40 overflow-y-auto">
              <div className="text-sm font-medium mb-2">Move History</div>
              <div className="text-xs space-y-1 font-mono">
                {moveHistory.length === 0 && <div className="opacity-60">No moves yet</div>}
                {moveHistory.map((m, i) => (
                  <div key={i}>
                    {i + 1}. ({m.from[0]},{m.from[1]}) → ({m.to[0]},{m.to[1]})
                    {m.removed && ' [capture]'}
                    {m.promoted && ' [king]'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
