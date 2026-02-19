/* ═══════════════════════════════════════════════════════════════════════════════
   CHESS — Elite Canvas-Based Chess Game
   Full rules, AI opponent, animations, themes, chess notation
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface ChessGameProps {
  onClose: () => void;
}

type Color = 'white' | 'black';
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

interface Piece {
  type: PieceType;
  color: Color;
}

interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  castling: { whiteK: boolean; whiteQ: boolean; blackK: boolean; blackQ: boolean };
  enPassantTarget: [number, number] | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

type Board = (Piece | null)[][];

const PIECE_VALUES: Record<PieceType, number> = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 };

const BOARD_THEMES = {
  Classic: { light: '#f0d9b5', dark: '#b58863' },
  Wood: { light: '#d4a574', dark: '#8b4513' },
  Blue: { light: '#87ceeb', dark: '#4682b4' },
  Dark: { light: '#4a5568', dark: '#1a202c' },
} as const;

type ThemeName = keyof typeof BOARD_THEMES;

const OPENING_BOOK: Record<string, string[]> = {
  'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'd2d4': ['d7d5', 'g8f6', 'e7e6', 'c7c5'],
  'e2e3': ['d7d5', 'e7e5', 'g8f6'],
  'c2c4': ['e7e5', 'g8f6', 'c7c5'],
  'g1f3': ['g8f6', 'd7d5', 'c7c5'],
  'b1c3': ['g8f6', 'e7e5', 'd7d5'],
};

function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRank: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: 'black' };
    board[1][c] = { type: 'P', color: 'black' };
    board[6][c] = { type: 'P', color: 'white' };
    board[7][c] = { type: backRank[c], color: 'white' };
  }
  return board;
}

function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: 'white',
    castling: { whiteK: true, whiteQ: true, blackK: true, blackQ: true },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

function copyBoard(board: Board): Board {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function findKing(board: Board, color: Color): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.color === color) return [r, c];
    }
  }
  return null;
}

function pathClear(board: Board, fromR: number, fromC: number, toR: number, toC: number): boolean {
  const stepR = toR === fromR ? 0 : Math.sign(toR - fromR);
  const stepC = toC === fromC ? 0 : Math.sign(toC - fromC);
  let r = fromR + stepR;
  let c = fromC + stepC;
  while (r !== toR || c !== toC) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    if (board[r][c]) return false;
    r += stepR;
    c += stepC;
  }
  return true;
}

function canAttack(board: Board, fromR: number, fromC: number, toR: number, toC: number, color: Color): boolean {
  const piece = board[fromR][fromC];
  if (!piece || piece.color !== color) return false;
  const dr = toR - fromR;
  const dc = toC - fromC;
  const target = board[toR][toC];
  if (target && target.color === color) return false;

  switch (piece.type) {
    case 'P': {
      const dir = color === 'white' ? -1 : 1;
      return Math.abs(dc) === 1 && dr === dir;
    }
    case 'N': {
      const d = [Math.abs(dr), Math.abs(dc)];
      return (d[0] === 2 && d[1] === 1) || (d[0] === 1 && d[1] === 2);
    }
    case 'K':
      return Math.max(Math.abs(dr), Math.abs(dc)) <= 1;
    case 'R':
      return (dr === 0 || dc === 0) && pathClear(board, fromR, fromC, toR, toC);
    case 'B':
      return Math.abs(dr) === Math.abs(dc) && pathClear(board, fromR, fromC, toR, toC);
    case 'Q':
      return ((dr === 0 || dc === 0) || Math.abs(dr) === Math.abs(dc)) && pathClear(board, fromR, fromC, toR, toC);
    default:
      return false;
  }
}

function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  const opp = byColor === 'white' ? 'black' : 'white';
  for (let pr = 0; pr < 8; pr++) {
    for (let pc = 0; pc < 8; pc++) {
      const p = board[pr][pc];
      if (!p || p.color !== byColor) continue;
      if (p.type === 'P') {
        const dir = byColor === 'white' ? -1 : 1;
        if (Math.abs(pc - c) === 1 && pr + dir === r) return true;
      } else if (canAttack(board, pr, pc, r, c, byColor)) return true;
    }
  }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos[0], kingPos[1], color === 'white' ? 'black' : 'white');
}

function getThreatenedSquares(board: Board, color: Color): [number, number][] {
  const threats: [number, number][] = [];
  const opp = color === 'white' ? 'black' : 'white';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (isSquareAttacked(board, r, c, opp)) threats.push([r, c]);
    }
  }
  return threats;
}

interface Move {
  from: [number, number];
  to: [number, number];
  promo?: PieceType;
  isCastling?: 'K' | 'Q';
  isEnPassant?: boolean;
}

function getLegalMoves(state: GameState, r: number, c: number): Move[] {
  const { board, turn, castling, enPassantTarget } = state;
  const piece = board[r][c];
  if (!piece || piece.color !== turn) return [];

  const moves: Move[] = [];
  const opp = turn === 'white' ? 'black' : 'white';

  const tryAdd = (nr: number, nc: number, extra?: Partial<Move>) => {
    if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return;
    const target = board[nr][nc];
    if (target && target.color === turn) return;

    const nextBoard = copyBoard(board);
    nextBoard[nr][nc] = nextBoard[r][c];
    nextBoard[r][c] = null;
    if (!isInCheck(nextBoard, turn)) moves.push({ from: [r, c], to: [nr, nc], ...extra });
  };

  switch (piece.type) {
    case 'P': {
      const dir = turn === 'white' ? -1 : 1;
      const startRow = turn === 'white' ? 6 : 1;
      const promoRow = turn === 'white' ? 0 : 7;

      if (!board[r + dir]?.[c]) {
        if (r + dir === promoRow) {
          (['Q', 'R', 'B', 'N'] as PieceType[]).forEach((p) => tryAdd(r + dir, c, { promo: p }));
        } else {
          tryAdd(r + dir, c);
          if (r === startRow && !board[r + 2 * dir]?.[c]) tryAdd(r + 2 * dir, c);
        }
      }
      for (const dc of [-1, 1]) {
        const target = board[r + dir]?.[c + dc];
        if (target && target.color === opp) {
          if (r + dir === promoRow) {
            (['Q', 'R', 'B', 'N'] as PieceType[]).forEach((p) => tryAdd(r + dir, c + dc, { promo: p }));
          } else {
            tryAdd(r + dir, c + dc);
          }
        }
        if (enPassantTarget && enPassantTarget[0] === r + dir && enPassantTarget[1] === c + dc) {
          tryAdd(r + dir, c + dc, { isEnPassant: true });
        }
      }
      break;
    }
    case 'N': {
      const jumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      jumps.forEach(([dr, dc]) => tryAdd(r + dr, c + dc));
      break;
    }
    case 'K': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr || dc) tryAdd(r + dr, c + dc);
        }
      }
      if (turn === 'white') {
        if (castling.whiteK && !board[7][5] && !board[7][6] &&
            !isSquareAttacked(board, 7, 4, opp) && !isSquareAttacked(board, 7, 5, opp) && !isSquareAttacked(board, 7, 6, opp)) {
          const n = copyBoard(board);
          n[7][6] = n[7][4]; n[7][4] = null; n[7][5] = n[7][7]; n[7][7] = null;
          if (!isInCheck(n, turn)) tryAdd(7, 6, { isCastling: 'K' });
        }
        if (castling.whiteQ && !board[7][1] && !board[7][2] && !board[7][3] &&
            !isSquareAttacked(board, 7, 4, opp) && !isSquareAttacked(board, 7, 3, opp)) {
          const n = copyBoard(board);
          n[7][2] = n[7][4]; n[7][4] = null; n[7][3] = n[7][0]; n[7][0] = null;
          if (!isInCheck(n, turn)) tryAdd(7, 2, { isCastling: 'Q' });
        }
      } else {
        if (castling.blackK && !board[0][5] && !board[0][6] &&
            !isSquareAttacked(board, 0, 4, opp) && !isSquareAttacked(board, 0, 5, opp) && !isSquareAttacked(board, 0, 6, opp)) {
          const n = copyBoard(board);
          n[0][6] = n[0][4]; n[0][4] = null; n[0][5] = n[0][7]; n[0][7] = null;
          if (!isInCheck(n, turn)) tryAdd(0, 6, { isCastling: 'K' });
        }
        if (castling.blackQ && !board[0][1] && !board[0][2] && !board[0][3] &&
            !isSquareAttacked(board, 0, 4, opp) && !isSquareAttacked(board, 0, 3, opp)) {
          const n = copyBoard(board);
          n[0][2] = n[0][4]; n[0][4] = null; n[0][3] = n[0][0]; n[0][0] = null;
          if (!isInCheck(n, turn)) tryAdd(0, 2, { isCastling: 'Q' });
        }
      }
      break;
    }
    case 'R':
    case 'B':
    case 'Q': {
      const dirs = piece.type === 'R' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] :
        piece.type === 'B' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] :
        [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      dirs.forEach(([dr, dc]) => {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
          tryAdd(nr, nc);
          if (board[nr][nc]) break;
          nr += dr; nc += dc;
        }
      });
      break;
    }
  }
  return moves;
}

function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      moves.push(...getLegalMoves(state, r, c));
    }
  }
  return moves;
}

function applyMove(state: GameState, move: Move, promoChoice: PieceType = 'Q'): GameState {
  const { board, turn, castling, enPassantTarget } = state;
  const next = copyBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = next[fr][fc]!;

  if (move.isCastling) {
    if (turn === 'white') {
      if (move.isCastling === 'K') {
        next[7][6] = next[7][4]; next[7][4] = null;
        next[7][5] = next[7][7]; next[7][7] = null;
      } else {
        next[7][2] = next[7][4]; next[7][4] = null;
        next[7][3] = next[7][0]; next[7][0] = null;
      }
    } else {
      if (move.isCastling === 'K') {
        next[0][6] = next[0][4]; next[0][4] = null;
        next[0][5] = next[0][7]; next[0][7] = null;
      } else {
        next[0][2] = next[0][4]; next[0][4] = null;
        next[0][3] = next[0][0]; next[0][0] = null;
      }
    }
  } else if (move.isEnPassant && enPassantTarget) {
    next[tr][tc] = piece;
    next[fr][fc] = null;
    next[fr][tc] = null;
  } else {
    const promo = (piece.type === 'P' && (tr === 0 || tr === 7)) ? (move.promo || promoChoice) : piece.type;
    next[tr][tc] = { type: promo, color: piece.color };
    next[fr][fc] = null;
  }

  const newCastling = { ...castling };
  if (piece.type === 'K') {
    if (turn === 'white') {
      newCastling.whiteK = false;
      newCastling.whiteQ = false;
    } else {
      newCastling.blackK = false;
      newCastling.blackQ = false;
    }
  }
  if (piece.type === 'R') {
    if (turn === 'white') {
      if (fr === 7 && fc === 0) newCastling.whiteQ = false;
      if (fr === 7 && fc === 7) newCastling.whiteK = false;
    } else {
      if (fr === 0 && fc === 0) newCastling.blackQ = false;
      if (fr === 0 && fc === 7) newCastling.blackK = false;
    }
  }

  let newEnPassant: [number, number] | null = null;
  if (piece.type === 'P' && Math.abs(fr - tr) === 2) {
    newEnPassant = [turn === 'white' ? tr + 1 : tr - 1, tc];
  }

  const halfmove = (piece.type === 'P' || next[tr][tc]) ? 0 : state.halfmoveClock + 1;
  const fullmove = turn === 'black' ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  return {
    board: next,
    turn: turn === 'white' ? 'black' : 'white',
    castling: newCastling,
    enPassantTarget: newEnPassant,
    halfmoveClock: halfmove,
    fullmoveNumber: fullmove,
  };
}

function toAlgebraic(move: Move, state: GameState): string {
  const piece = state.board[move.from[0]][move.from[1]]!;
  const files = 'abcdefgh';
  const capture = state.board[move.to[0]][move.to[1]] || move.isEnPassant;
  let base = piece.type === 'P' ? '' : piece.type;
  if (piece.type === 'P' && capture) base += files[move.from[1]];
  base += capture ? 'x' : '';
  base += files[move.to[1]] + (8 - move.to[0]);
  if (move.promo) base += '=' + move.promo;
  if (move.isCastling) return move.isCastling === 'K' ? 'O-O' : 'O-O-O';
  return base;
}

function isStalemate(state: GameState): boolean {
  return !isInCheck(state.board, state.turn) && getAllLegalMoves(state).length === 0;
}

function isInsufficientMaterial(board: Board): boolean {
  let pieces: Piece[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== 'K') pieces.push(p);
    }
  }
  if (pieces.length === 0) return true;
  if (pieces.length === 1) {
    return pieces[0].type === 'B' || pieces[0].type === 'N';
  }
  if (pieces.length === 2) {
    return pieces.every((p) => p.type === 'B' || p.type === 'N');
  }
  return false;
}

function evaluateBoard(board: Board, forColor: Color): number {
  let score = 0;
  const posBonus: Record<PieceType, number[][]> = {
    P: [[0, 0, 0, 0, 0, 0, 0, 0], [50, 50, 50, 50, 50, 50, 50, 50], [10, 10, 20, 30, 30, 20, 10, 10], [5, 5, 10, 25, 25, 10, 5, 5], [0, 0, 0, 20, 20, 0, 0, 0], [5, -5, -10, 0, 0, -10, -5, 5], [5, 10, 10, -20, -20, 10, 10, 5], [0, 0, 0, 0, 0, 0, 0, 0]],
    N: [[-50, -40, -30, -30, -30, -30, -40, -50], [-40, -20, 0, 0, 0, 0, -20, -40], [-30, 0, 10, 15, 15, 10, 0, -30], [-30, 5, 15, 20, 20, 15, 5, -30], [-30, 0, 15, 20, 20, 15, 0, -30], [-30, 5, 10, 15, 15, 10, 5, -30], [-40, -20, 0, 5, 5, 0, -20, -40], [-50, -40, -30, -30, -30, -30, -40, -50]],
    B: [[-20, -10, -10, -10, -10, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 10, 10, 5, 0, -10], [-10, 5, 5, 10, 10, 5, 5, -10], [-10, 0, 10, 10, 10, 10, 0, -10], [-10, 10, 10, 10, 10, 10, 10, -10], [-10, 5, 0, 0, 0, 0, 5, -10], [-20, -10, -10, -10, -10, -10, -10, -20]],
    R: [[0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, 10, 10, 10, 10, 5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [0, 0, 0, 5, 5, 0, 0, 0]],
    Q: [[-20, -10, -10, -5, -5, -10, -10, -20], [-10, 0, 0, 0, 0, 0, 0, -10], [-10, 0, 5, 5, 5, 5, 0, -10], [-5, 0, 5, 5, 5, 5, 0, -5], [0, 0, 5, 5, 5, 5, 0, -5], [-10, 5, 5, 5, 5, 5, 0, -10], [-10, 0, 5, 0, 0, 0, 0, -10], [-20, -10, -10, -5, -5, -10, -10, -20]],
    K: [[-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -40, -40, -50, -50, -40, -40, -30], [-20, -30, -30, -40, -40, -30, -30, -20], [-10, -20, -20, -20, -20, -20, -20, -10], [20, 20, 0, 0, 0, 0, 20, 20], [20, 30, 10, 0, 0, 10, 30, 20]],
  };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const wr = p.color === 'white' ? r : 7 - r;
      const val = PIECE_VALUES[p.type] * 100 + (posBonus[p.type]?.[wr]?.[c] ?? 0);
      score += p.color === forColor ? val : -val;
    }
  }
  return score;
}

function aiMove(state: GameState, difficulty: 'easy' | 'medium' | 'hard'): Move | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === 'medium') {
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      const score = evaluateBoard(next.board, 'black');
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  // Hard: minimax depth 3
  function minimax(s: GameState, depth: number, alpha: number, beta: number, maximizing: boolean): number {
    if (depth === 0) return evaluateBoard(s.board, 'black');
    const movs = getAllLegalMoves(s);
    if (movs.length === 0) {
      if (isInCheck(s.board, s.turn)) return maximizing ? -10000 + (3 - depth) : 10000 - (3 - depth);
      return 0;
    }
    if (maximizing) {
      let maxEval = -Infinity;
      for (const m of movs) {
        const next = applyMove(s, m);
        const eval_ = minimax(next, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const m of movs) {
        const next = applyMove(s, m);
        const eval_ = minimax(next, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const next = applyMove(state, m);
    const score = minimax(next, 2, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function CapturedPieceCanvas({ piece }: { piece: Piece }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 20, 20);
    drawPiece(ctx, piece, 0, 0, 20);
  }, [piece.type, piece.color]);
  return <canvas ref={canvasRef} width={20} height={20} className="block" />;
}

function getOpeningHint(moveHistory: string[]): string | null {
  if (moveHistory.length === 0) return 'Popular first moves: e4, d4, c4, Nf3';
  const last = moveHistory[moveHistory.length - 1].replace(/[+#x=]|O-O|O-O-O/g, '').replace(/[QRBN]/g, '').trim();
  const key = last.slice(-4);
  const hints = OPENING_BOOK[key];
  if (hints) return `Consider: ${hints.map((h) => `${String.fromCharCode(97 + Number(h[0]))}${8 - Number(h[1])}`).join(', ')}`;
  return null;
}

/* ─── Canvas piece drawing (geometric) ─── */
function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, x: number, y: number, size: number) {
  const isWhite = piece.color === 'white';
  const fill = isWhite ? '#fff' : '#222';
  const stroke = isWhite ? '#333' : '#111';
  const pad = size * 0.1;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.35;

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = Math.max(1, size * 0.04);

  switch (piece.type) {
    case 'K': {
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.5, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy);
      ctx.lineTo(cx + r * 0.6, cy);
      ctx.lineTo(cx + r * 0.4, cy + r * 0.8);
      ctx.lineTo(cx, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.4, cy + r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - r * 0.9, cy + r * 0.5, size * 0.5, size * 0.15);
      break;
    }
    case 'Q': {
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.3);
        ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.5);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.4, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - r * 0.85, cy + r * 0.4, size * 0.45, size * 0.12);
      break;
    }
    case 'R': {
      ctx.fillRect(cx - r * 0.7, cy - r * 0.9, r * 1.4, r * 0.4);
      ctx.fillRect(cx - r * 0.6, cy - r * 0.5, r * 1.2, r * 0.3);
      ctx.fillRect(cx - r * 0.7, cy, r * 1.4, r * 0.9);
      ctx.strokeRect(cx - r * 0.7, cy - r * 0.9, r * 1.4, r * 0.4);
      ctx.strokeRect(cx - r * 0.6, cy - r * 0.5, r * 1.2, r * 0.3);
      ctx.strokeRect(cx - r * 0.7, cy, r * 1.4, r * 0.9);
      break;
    }
    case 'B': {
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.2, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.5, r * 0.5, 0, Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - r * 0.5, cy + r * 0.6, r, size * 0.1);
      break;
    }
    case 'N': {
      ctx.beginPath();
      ctx.arc(cx - r * 0.2, cy - r * 0.6, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.3, cy - r * 0.2);
      ctx.quadraticCurveTo(cx + r * 0.6, cy - r * 0.8, cx + r * 0.7, cy + r * 0.6);
      ctx.lineTo(cx - r * 0.2, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.5, cy + r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - r * 0.6, cy + r * 0.6, r * 0.6, size * 0.12);
      break;
    }
    case 'P': {
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.2, r * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx - r * 0.55, cy + r * 0.3, r * 1.1, size * 0.12);
      break;
    }
  }
  ctx.restore();
}

export default function ChessGame({ onClose }: ChessGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialState());
  const [stateHistory, setStateHistory] = useState<GameState[]>([createInitialState()]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [capturedWhite, setCapturedWhite] = useState<Piece[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<Piece[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [moveHistoryFull, setMoveHistoryFull] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [promoSquare, setPromoSquare] = useState<[number, number] | null>(null);
  const [pendingPromo, setPendingPromo] = useState<Move | null>(null);
  const [theme, setTheme] = useState<ThemeName>('Classic');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);
  const [cursorPos, setCursorPos] = useState<[number, number]>([4, 4]);
  const [animating, setAnimating] = useState<{ piece: Piece; from: [number, number]; to: [number, number]; progress: number } | null>(null);
  const [captureAnim, setCaptureAnim] = useState<{ piece: Piece; from: [number, number]; progress: number } | null>(null);
  const [boardSize, setBoardSize] = useState(480);
  const [checkFlashPhase, setCheckFlashPhase] = useState(0);
  const aiThinkingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<number | null>(null);

  const inCheck = isInCheck(gameState.board, gameState.turn);
  useEffect(() => {
    if (!inCheck || gameOver) return;
    const id = setInterval(() => setCheckFlashPhase((p) => (p + 0.15) % (Math.PI * 2)), 50);
    return () => clearInterval(id);
  }, [inCheck, gameOver]);

  const threatenedSquares = getThreatenedSquares(gameState.board, gameState.turn);
  const whiteMaterial = gameState.board.flat().reduce((s, p) => s + (p && p.color === 'white' ? PIECE_VALUES[p.type] : 0), 0);
  const blackMaterial = gameState.board.flat().reduce((s, p) => s + (p && p.color === 'black' ? PIECE_VALUES[p.type] : 0), 0);
  const materialDiff = whiteMaterial - blackMaterial;
  const openingHint = gameState.turn === 'white' && !gameOver ? getOpeningHint(moveHistory) : null;

  useEffect(() => {
    if (gameOver || !timerEnabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (gameState.turn === 'white') setWhiteTime((t) => t + 1);
      else setBlackTime((t) => t + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.turn, gameOver, timerEnabled]);

  useEffect(() => {
    if (gameOver || gameState.turn !== 'black' || aiThinkingRef.current || promoSquare) return;
    aiThinkingRef.current = true;
    const t = setTimeout(() => {
      const move = aiMove(gameState, aiDifficulty);
      if (move) {
        const captured = gameState.board[move.to[0]][move.to[1]];
        if (captured) {
          playSound('hit');
          setCaptureAnim({ piece: captured, from: move.to, progress: 0 });
        }
        setAnimating({
          piece: gameState.board[move.from[0]][move.from[1]]!,
          from: move.from,
          to: move.to,
          progress: 0,
        });
        setPendingPromo(null);
        const doApply = () => {
          const next = applyMove(gameState, move);
          setGameState(next);
          setStateHistory((h) => [...h.slice(0, -1), gameState, next]);
          setMoveHistory((m) => [...m, toAlgebraic(move, gameState)]);
          setMoveHistoryFull((m) => [...m, move]);
          setLastMove({ from: move.from, to: move.to });
          if (captured) setCapturedWhite((w) => [...w, captured]);
        };
        setTimeout(doApply, 280);
        playSound('pop');
      }
      aiThinkingRef.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [gameState.turn, gameState, gameOver, aiDifficulty, promoSquare]);

  useEffect(() => {
    if (!animating && !captureAnim) return;
    const start = performance.now();
    const tick = () => {
      const elapsed = (performance.now() - start) / 250;
      if (animating) {
        setAnimating((a) => (a ? { ...a, progress: Math.min(1, elapsed) } : null));
        if (elapsed >= 1) setAnimating(null);
      }
      if (captureAnim) {
        setCaptureAnim((c) => (c ? { ...c, progress: Math.min(1, elapsed) } : null));
        if (elapsed >= 1) setCaptureAnim(null);
      }
      if (animating || captureAnim) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [animating, captureAnim]);

  const handleSelect = useCallback((r: number, c: number) => {
    if (gameOver || gameState.turn !== 'white' || promoSquare) return;
    const piece = gameState.board[r][c];
    const moves = getLegalMoves(gameState, r, c);
    const isLegalDest = legalMoves.some((m) => m.to[0] === r && m.to[1] === c);

    if (isLegalDest && selected) {
      const move = legalMoves.find((m) => m.to[0] === r && m.to[1] === c)!;
      const movingPiece = gameState.board[selected[0]][selected[1]];
      const promo = movingPiece?.type === 'P' && (r === 0 || r === 7);
      if (promo) {
        setPendingPromo(move);
        setPromoSquare([r, c]);
        return;
      }
      executeMove(move, 'Q');
      return;
    }

    if (piece && piece.color === 'white') {
      setSelected([r, c]);
      setLegalMoves(moves);
      setCursorPos([r, c]);
      playSound('click');
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  }, [gameState, selected, legalMoves, gameOver, promoSquare]);

  const executeMove = useCallback((move: Move, promo: PieceType = 'Q') => {
    const captured = gameState.board[move.to[0]][move.to[1]];
    if (captured) {
      playSound('hit');
      setCaptureAnim({ piece: captured, from: move.to, progress: 0 });
    }
    setAnimating({
      piece: gameState.board[move.from[0]][move.from[1]]!,
      from: move.from,
      to: move.to,
      progress: 0,
    });
    const next = applyMove(gameState, move, promo);
    setTimeout(() => {
      setGameState(next);
      setStateHistory((h) => [...h, next]);
      setMoveHistory((m) => [...m, toAlgebraic(move, gameState)]);
      setMoveHistoryFull((m) => [...m, move]);
      setLastMove({ from: move.from, to: move.to });
      setSelected(null);
      setLegalMoves([]);
      setPromoSquare(null);
      setPendingPromo(null);
      setCursorPos(move.to);
      if (captured) setCapturedBlack((b) => [...b, captured]);
      playSound('pop');
    }, 250);
  }, [gameState]);

  const handlePromoChoice = useCallback((choice: PieceType) => {
    if (!pendingPromo) return;
    executeMove(pendingPromo, choice);
  }, [pendingPromo, executeMove]);

  const handleUndo = useCallback(() => {
    if (stateHistory.length < 3 || gameState.turn !== 'white') return;
    const prevState = stateHistory[stateHistory.length - 3];
    const whiteMove = moveHistoryFull[moveHistoryFull.length - 2];
    const blackMove = moveHistoryFull[moveHistoryFull.length - 1];
    setGameState(prevState);
    setStateHistory((h) => h.slice(0, -2));
    setMoveHistory((m) => m.slice(0, -2));
    setMoveHistoryFull((f) => f.slice(0, -2));
    const prevLastMove = moveHistoryFull.length >= 4
      ? { from: moveHistoryFull[moveHistoryFull.length - 4].from, to: moveHistoryFull[moveHistoryFull.length - 4].to }
      : null;
    setLastMove(prevLastMove);
    setCapturedWhite((w) => (blackMove && stateHistory[stateHistory.length - 2].board[blackMove.to[0]][blackMove.to[1]] ? w.slice(0, -1) : w));
    setCapturedBlack((b) => (whiteMove && stateHistory[stateHistory.length - 3].board[whiteMove.to[0]][whiteMove.to[1]] ? b.slice(0, -1) : b));
    setSelected(null);
    setLegalMoves([]);
    setGameOver(null);
    setCursorPos(whiteMove ? whiteMove.from : [4, 4]);
    playSound('click');
  }, [stateHistory, moveHistoryFull, gameState.turn]);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): [number, number] | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      const cell = boardSize / 8;
      const c = Math.floor(x / cell);
      const r = Math.floor(y / cell);
      if (r >= 0 && r < 8 && c >= 0 && c < 8) return [r, c];
      return null;
    },
    [boardSize]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords) handleSelect(coords[0], coords[1]);
    },
    [getCanvasCoords, handleSelect]
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
      if (coords) handleSelect(coords[0], coords[1]);
    },
    [getCanvasCoords, handleSelect]
  );

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver || promoSquare) return;
    const [r, c] = cursorPos;
    if (e.key === 'ArrowUp' && r > 0) { setCursorPos([r - 1, c]); playSound('tick'); e.preventDefault(); }
    if (e.key === 'ArrowDown' && r < 7) { setCursorPos([r + 1, c]); playSound('tick'); e.preventDefault(); }
    if (e.key === 'ArrowLeft' && c > 0) { setCursorPos([r, c - 1]); playSound('tick'); e.preventDefault(); }
    if (e.key === 'ArrowRight' && c < 7) { setCursorPos([r, c + 1]); playSound('tick'); e.preventDefault(); }
    if (e.key === ' ') {
      e.preventDefault();
      handleSelect(r, c);
    }
  }, [cursorPos, handleSelect, gameOver, promoSquare]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const moves = getAllLegalMoves(gameState);
    if (moves.length === 0) {
      if (inCheck) setGameOver(gameState.turn === 'white' ? 'Checkmate! Black wins.' : 'Checkmate! White wins.');
      else setGameOver('Stalemate! Draw.');
    } else if (gameState.halfmoveClock >= 50) {
      setGameOver('Draw by 50-move rule');
    } else if (isInsufficientMaterial(gameState.board)) {
      setGameOver('Draw by insufficient material');
    }
  }, [gameState, inCheck]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = boardSize / 8;
    const colors = BOARD_THEMES[theme];
    const kingPos = findKing(gameState.board, gameState.turn);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const isLight = (r + c) % 2 === 0;
        let fill: string = isLight ? colors.light : colors.dark;

        if (lastMove && ((lastMove.from[0] === r && lastMove.from[1] === c) || (lastMove.to[0] === r && lastMove.to[1] === c))) {
          fill = 'rgba(255, 255, 0, 0.5)';
        }
        if (threatenedSquares.some(([tr, tc]) => tr === r && tc === c)) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
        ctx.fillStyle = fill;
        ctx.fillRect(c * cell, r * cell, cell, cell);

        const isSelected = selected?.[0] === r && selected?.[1] === c;
        if (isSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 4;
          ctx.strokeRect(c * cell + 2, r * cell + 2, cell - 4, cell - 4);
        }

        const isCheck = inCheck && kingPos && kingPos[0] === r && kingPos[1] === c;
        if (isCheck) {
          const flashAlpha = 0.4 + 0.35 * Math.sin(checkFlashPhase);
          ctx.fillStyle = 'rgba(255, 0, 0, ' + flashAlpha + ')';
          ctx.beginPath();
          ctx.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.45, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        const isLegal = legalMoves.some((m) => m.to[0] === r && m.to[1] === c);
        if (isLegal) {
          const piece = gameState.board[r][c];
          ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
          if (piece) {
            ctx.beginPath();
            ctx.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const isCursor = cursorPos[0] === r && cursorPos[1] === c && !isSelected;
        if (isCursor) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(c * cell + 4, r * cell + 4, cell - 8, cell - 8);
        }

        let pieceToDraw = gameState.board[r][c];
        if (animating && animating.from[0] === r && animating.from[1] === c) pieceToDraw = null;
        if (captureAnim && captureAnim.from[0] === r && captureAnim.from[1] === c) pieceToDraw = null;

        if (pieceToDraw) {
          drawPiece(ctx, pieceToDraw, c * cell + cell * 0.05, r * cell + cell * 0.05, cell * 0.9);
        }
      }
    }

    if (animating) {
      const [fr, fc] = animating.from;
      const [tr, tc] = animating.to;
      const t = animating.progress;
      const x = fc * cell + (tc - fc) * cell * t + cell * 0.05;
      const y = fr * cell + (tr - fr) * cell * t + cell * 0.05;
      drawPiece(ctx, animating.piece, x, y, cell * 0.9);
    }

    if (captureAnim) {
      const [r, c] = captureAnim.from;
      const scale = 1 - captureAnim.progress;
      const alpha = 1 - captureAnim.progress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c * cell + cell / 2, r * cell + cell / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(c * cell + cell / 2), -(r * cell + cell / 2));
      drawPiece(ctx, captureAnim.piece, c * cell + cell * 0.1, r * cell - cell * captureAnim.progress * 0.5, cell * 0.8);
      ctx.restore();
    }
  }, [gameState, selected, legalMoves, cursorPos, lastMove, threatenedSquares, inCheck, checkFlashPhase, animating, captureAnim, theme]);

  useEffect(() => {
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 480;
      setBoardSize(Math.min(w, 520));
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleNewGame = useCallback(() => {
    setGameState(createInitialState());
    setStateHistory([createInitialState()]);
    setSelected(null);
    setLegalMoves([]);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setMoveHistory([]);
    setMoveHistoryFull([]);
    setLastMove(null);
    setGameOver(null);
    setPromoSquare(null);
    setPendingPromo(null);
    setCursorPos([4, 4]);
    setAnimating(null);
    setCaptureAnim(null);
    setWhiteTime(0);
    setBlackTime(0);
    playSound('menuOpen');
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="game-card bg-slate-900 text-slate-100 border border-slate-700 overflow-hidden w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-4 pt-3">
        <h2 className="text-xl font-bold tracking-wide">Chess</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm touch-manipulation active:scale-95">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-3 px-4 mb-2">
        <span className={`font-medium ${gameState.turn === 'white' ? 'text-amber-400' : 'text-slate-400'}`}>
          {gameState.turn === 'white' ? 'Your turn (White)' : 'AI thinking…'}
        </span>
        <span className="text-sm text-slate-400">Move {gameState.fullmoveNumber}</span>
        <div className="flex gap-1">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              className={`px-2 py-1 rounded text-xs font-medium touch-manipulation active:scale-95 ${aiDifficulty === d ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              onClick={() => setAiDifficulty(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} className="rounded" />
          Timer
        </label>
        {timerEnabled && (
          <span className="text-sm">
            W: {formatTime(whiteTime)} | B: {formatTime(blackTime)}
          </span>
        )}
        <div className="flex gap-2">
          {(['Classic', 'Wood', 'Blue', 'Dark'] as ThemeName[]).map((t) => (
            <button
              key={t}
              className={`px-2 py-1 rounded text-xs ${theme === t ? 'ring-2 ring-amber-500' : ''}`}
              style={{ backgroundColor: BOARD_THEMES[t].dark }}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 px-4 mb-2">
        <div className="flex-1">
          <div className="text-xs text-slate-500">Captured by AI</div>
          <div className="flex flex-wrap gap-0.5 min-h-6">
            {capturedWhite.map((p, i) => (
              <div key={i} className="w-5 h-5">
                <CapturedPieceCanvas piece={p} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-slate-500">Captured by you</div>
          <div className="flex flex-wrap gap-0.5 min-h-6">
            {capturedBlack.map((p, i) => (
              <div key={i} className="w-5 h-5">
                <CapturedPieceCanvas piece={p} />
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm">
          Material: {materialDiff > 0 ? `+${materialDiff}` : materialDiff}
        </div>
      </div>

      {openingHint && (
        <div className="px-4 py-1 text-xs text-amber-300/90 bg-amber-900/30 rounded mx-4 mb-2">
          {openingHint}
        </div>
      )}

      {gameOver && (
        <div className="mx-4 mb-2 p-4 rounded-xl bg-gradient-to-r from-amber-900/90 to-amber-800/90 text-amber-100 font-semibold text-center border-2 border-amber-500/50 shadow-lg animate-pulse">
          <div className="text-lg mb-1">{gameOver}</div>
          <div className="text-sm text-amber-300/90 font-normal">
            {gameOver.includes('Checkmate') ? 'The game has ended. Start a new game to play again.' : 
              gameOver.includes('Stalemate') ? 'No legal moves remaining. The game is a draw.' : 
              'Draw by special rule. Start a new game to play again.'}
          </div>
        </div>
      )}

      {promoSquare && (
        <div className="mx-4 mb-2 p-2 rounded bg-slate-700 flex gap-2 justify-center">
          <span className="text-sm self-center">Promote to:</span>
          {(['Q', 'R', 'B', 'N'] as PieceType[]).map((p) => (
            <button
              key={p}
              className="w-10 h-10 rounded bg-slate-600 hover:bg-amber-600 flex items-center justify-center text-lg font-bold touch-manipulation active:scale-95"
              onClick={() => handlePromoChoice(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex justify-center p-4 w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={boardSize}
          height={boardSize}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="block w-full cursor-pointer rounded-lg shadow-xl border-2 border-slate-600 touch-none"
          style={{ maxWidth: '100%', touchAction: 'none' }}
        />
      </div>

      <div className="px-4 mb-2">
        <div className="text-xs text-slate-500 mb-1 font-medium">Move history (algebraic notation)</div>
        <div className="max-h-28 overflow-y-auto overflow-x-hidden rounded bg-slate-800/50 p-2 border border-slate-600/50" style={{ scrollBehavior: 'smooth' }}>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs font-mono">
            {moveHistory.map((m, i) => (
              <span key={i} className={"px-1.5 py-0.5 rounded " + (i === moveHistory.length - 1 ? 'bg-amber-600/30 text-amber-200' : 'text-slate-300')}>
                {Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '..'} {m}
              </span>
            ))}
            {moveHistory.length === 0 && <span className="text-slate-500 italic">No moves yet — make your first move as White</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-center pb-4">
        <button onClick={handleNewGame} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">
          New Game
        </button>
        <button onClick={handleUndo} disabled={stateHistory.length < 3 || gameState.turn !== 'white'} className="btn-elite btn-elite-ghost disabled:opacity-50 touch-manipulation active:scale-95">
          Undo
        </button>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">
          Close
        </button>
      </div>
    </div>
  );
}

