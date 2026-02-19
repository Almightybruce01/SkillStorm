/* ═══════════════════════════════════════════════════════════════════════════════
   TIC-TAC-TOE ELITE — Arcade
   Canvas-based • Minimax AI • Multiple Modes • Particles • Animations
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface TicTacToeGameProps {
  onClose: () => void;
}

type Player = 'X' | 'O' | null;
type Difficulty = 'easy' | 'medium' | 'impossible';
type GameMode = 'classic' | 'bigboard' | 'ultimate';

// ── Win lines for 3x3 ──
const LINES_3x3 = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ── Win lines for 5x5 (4 in a row) ──
function getLines5x5(): number[][] {
  const lines: number[][] = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c <= 1; c++) {
      lines.push([r * 5 + c, r * 5 + c + 1, r * 5 + c + 2, r * 5 + c + 3]);
    }
  }
  // Cols
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r <= 1; r++) {
      lines.push([r * 5 + c, (r + 1) * 5 + c, (r + 2) * 5 + c, (r + 3) * 5 + c]);
    }
  }
  // Diagonals
  for (let r = 0; r <= 1; r++) for (let c = 0; c <= 1; c++) {
    lines.push([r * 5 + c, (r + 1) * 5 + c + 1, (r + 2) * 5 + c + 2, (r + 3) * 5 + c + 3]);
  }
  for (let r = 0; r <= 1; r++) for (let c = 3; c <= 4; c++) {
    lines.push([r * 5 + c, (r + 1) * 5 + c - 1, (r + 2) * 5 + c - 2, (r + 3) * 5 + c - 3]);
  }
  return lines;
}
const LINES_5x5 = getLines5x5();

// ── Minimax for 3x3 ──
function getEmptyIndices(board: Player[], size: number): number[] {
  return board.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
}

function checkWinner3x3(board: Player[]): { winner: Player; line?: number[] } {
  for (const line of LINES_3x3) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null };
}

function minimax3x3(board: Player[], isMax: boolean, depth: number, alpha: number = -Infinity, beta: number = Infinity): number {
  const { winner } = checkWinner3x3(board);
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  const empty = getEmptyIndices(board, 9);
  if (empty.length === 0) return 0;
  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      const score = minimax3x3(board, false, depth + 1, alpha, beta);
      board[i] = null;
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = 'X';
      const score = minimax3x3(board, true, depth + 1, alpha, beta);
      board[i] = null;
      best = Math.min(best, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getOptimalMove3x3(board: Player[]): number {
  let bestScore = -Infinity;
  let bestMove = -1;
  const empty = getEmptyIndices(board, 9);
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax3x3(board, false, 0, -Infinity, Infinity);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// Strategic hint: best move for X (human) - uses minimax from X's perspective
function getStrategicHint3x3(board: Player[]): number {
  const empty = getEmptyIndices(board, 9);
  if (empty.length === 0) return -1;
  let bestScore = Infinity;
  let bestMove = empty[0];
  for (const i of empty) {
    board[i] = 'X';
    const score = minimax3x3(board, true, 0, -Infinity, Infinity);
    board[i] = null;
    if (score < bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

// ── Heuristic for 5x5 (simplified) ──
function evaluate5x5(board: Player[]): number {
  let score = 0;
  for (const line of LINES_5x5) {
    const vals = line.map(i => board[i]);
    const xCount = vals.filter(v => v === 'X').length;
    const oCount = vals.filter(v => v === 'O').length;
    if (xCount > 0 && oCount === 0) score -= Math.pow(10, xCount);
    if (oCount > 0 && xCount === 0) score += Math.pow(10, oCount);
  }
  return score;
}

function checkWinner5x5(board: Player[]): { winner: Player; line?: number[] } {
  for (const line of LINES_5x5) {
    const [a, b, c, d] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] === board[d]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null };
}

function getBestMove5x5(board: Player[], difficulty: Difficulty): number {
  const empty = getEmptyIndices(board, 25);
  if (empty.length === 0) return -1;
  if (difficulty === 'easy') return empty[Math.floor(Math.random() * empty.length)];
  if (difficulty === 'medium' && Math.random() < 0.5) {
    return empty[Math.floor(Math.random() * empty.length)];
  }
  // Minimax with depth limit for 5x5
  let bestScore = -Infinity;
  let bestMove = empty[0];
  const depthLimit = difficulty === 'impossible' ? 3 : 2;
  for (const i of empty) {
    board[i] = 'O';
    const score = minimax5x5(board, false, 0, depthLimit);
    board[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax5x5(board: Player[], isMax: boolean, depth: number, limit: number): number {
  const { winner } = checkWinner5x5(board);
  if (winner === 'O') return 1000 - depth;
  if (winner === 'X') return depth - 1000;
  const empty = getEmptyIndices(board, 25);
  if (empty.length === 0) return evaluate5x5(board);
  if (depth >= limit) return evaluate5x5(board);
  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      best = Math.max(best, minimax5x5(board, false, depth + 1, limit));
      board[i] = null;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      board[i] = 'X';
      best = Math.min(best, minimax5x5(board, true, depth + 1, limit));
      board[i] = null;
    }
    return best;
  }
}

// ── Particle system ──
interface Particle {
  cellIndex: number;
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

// ── Cell animation state ──
interface CellAnim {
  progress: number;
  symbol: Player;
  cellIndex: number;
}

// ── Ultimate Tic-Tac-Toe helpers ──
function getSubBoardIndex(cell: number): number {
  return Math.floor(cell / 9);
}
function getSubCellIndex(cell: number): number {
  return cell % 9;
}
function getMetaRow(cell: number): number {
  return Math.floor(cell / 3) % 3;
}
function getMetaCol(cell: number): number {
  return cell % 3;
}
function getNextSubBoard(lastCell: number): number {
  return lastCell;
}

const DEFAULT_X_COLOR = '#8b5cf6';
const DEFAULT_O_COLOR = '#ec4899';

const TICTACTOE_STATS_KEY = 'skillzstorm_tictactoe_stats';

function loadMatchHistory(): { wins: number; losses: number; draws: number } {
  try {
    const raw = localStorage.getItem(TICTACTOE_STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { wins: 0, losses: 0, draws: 0 };
}

function saveMatchHistory(stats: { wins: number; losses: number; draws: number }) {
  try {
    localStorage.setItem(TICTACTOE_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export default function TicTacToeGame({ onClose }: TicTacToeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('impossible');
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [metaBoard, setMetaBoard] = useState<Player[]>(Array(9).fill(null)); // For ultimate
  const [allBoards, setAllBoards] = useState<Player[][]>(Array(9).fill(null).map(() => Array(9).fill(null))); // Ultimate
  const [xTurn, setXTurn] = useState(true);
  const [winner, setWinner] = useState<Player>(null);
  const [winLine, setWinLine] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState(0);
  const [wins, setWins] = useState(loadMatchHistory().wins);
  const [losses, setLosses] = useState(loadMatchHistory().losses);
  const [draws, setDraws] = useState(loadMatchHistory().draws);
  const [winStreak, setWinStreak] = useState(0);
  const [moveHistory, setMoveHistory] = useState<{ cell: number; player: Player; time: number }[]>([]);
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [moveTimer, setMoveTimer] = useState(0);
  const [screenShake, setScreenShake] = useState(0);
  const [winLineProgress, setWinLineProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [cellAnims, setCellAnims] = useState<CellAnim[]>([]);
  const [xColor, setXColor] = useState(DEFAULT_X_COLOR);
  const [oColor, setOColor] = useState(DEFAULT_O_COLOR);
  const [lastPlayedCell, setLastPlayedCell] = useState<number | null>(null); // Ultimate: next forced sub-board
  const [seriesMode, setSeriesMode] = useState(false);
  const [seriesScore, setSeriesScore] = useState<{ x: number; o: number }>({ x: 0, o: 0 });
  const [learningMode, setLearningMode] = useState(false);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [resetFadeProgress, setResetFadeProgress] = useState(1);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef(0);

  const boardSize = gameMode === 'bigboard' ? 25 : 9;
  const gridDim = gameMode === 'bigboard' ? 5 : 3;
  const isUltimate = gameMode === 'ultimate';

  const reset = useCallback(() => {
    setResetFadeProgress(0);
    setHintCell(null);
    setTimeout(() => {
      if (gameMode === 'classic' || gameMode === 'bigboard') {
        setBoard(gameMode === 'classic' ? Array(9).fill(null) : Array(25).fill(null));
      } else {
        setAllBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
        setMetaBoard(Array(9).fill(null));
      }
      setWinner(null);
      setWinLine([]);
      setXTurn(true);
      setSelectedCell(0);
      setMoveHistory([]);
      setWinLineProgress(0);
      setLastPlayedCell(null);
      setLastMoveTime(Date.now());
      setMoveTimer(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setMoveTimer(t => t + 1), 1000);
      setResetFadeProgress(0);
      playSound('click');
    }, 300);
  }, [gameMode]);

  const spawnParticles = useCallback((cellIndex: number, color: string, count = 12) => {
    const newP: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      newP.push({
        cellIndex,
        x: 0, y: 0,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, maxLife: 0.6 + Math.random() * 0.4, color, size: 2 + Math.random() * 4,
      });
    }
    setParticles(p => [...p, ...newP]);
  }, []);

  const addCellAnim = useCallback((cell: number, symbol: Player) => {
    setCellAnims(a => [...a.filter(x => x.cellIndex !== cell), { progress: 0, symbol, cellIndex: cell }]);
  }, []);

  const triggerScreenShake = useCallback(() => {
    setScreenShake(1);
  }, []);

  const doPlayerMove = useCallback((cell: number) => {
    if (winner) return;
    if (gameMode === 'ultimate') {
      const subIdx = lastPlayedCell !== null ? lastPlayedCell : Math.floor(selectedCell / 9);
      const subCell = lastPlayedCell !== null ? selectedCell % 9 : selectedCell % 9;
      const globalCell = subIdx * 9 + subCell;
      const boards = allBoards.map(b => [...b]);
      if (boards[subIdx][subCell]) return;
      boards[subIdx][subCell] = 'X';
      addCellAnim(globalCell, 'X');
      spawnParticles(globalCell, xColor, 8);
      playSound('pop');
      const subResult = checkWinner3x3(boards[subIdx]);
      const nextMeta = [...metaBoard];
      if (subResult.winner) {
        nextMeta[subIdx] = subResult.winner;
      }
      const metaResult = checkWinner3x3(nextMeta);
      if (metaResult.winner) {
        setWinner(metaResult.winner);
        setWinLine(metaResult.line!.map(i => i * 9 + 4));
        triggerScreenShake();
        playSound('victory');
        if (metaResult.winner === 'X') {
          setWins(w => w + 1);
          setWinStreak(s => s + 1);
          playSound('streak');
        }
        setAllBoards(boards);
        setMetaBoard(nextMeta);
        setLastPlayedCell(null);
        setMoveHistory(h => [...h, { cell: globalCell, player: 'X', time: moveTimer }]);
        return;
      }
      const nextSub = subCell;
      const nextSubBoard = allBoards[nextSub];
      const canPlayAny = nextMeta[nextSub] !== null || nextSubBoard.every(c => c !== null);
      setAllBoards(boards);
      setMetaBoard(nextMeta);
      setXTurn(false);
      setLastPlayedCell(canPlayAny ? null : nextSub);
      setMoveHistory(h => [...h, { cell: globalCell, player: 'X', time: moveTimer }]);
      setLastMoveTime(Date.now());
      setAiThinking(true);
      setHintCell(null);
      setTimeout(() => {
        setAiThinking(false);
        let aiSub = canPlayAny ? -1 : nextSub;
        let aiCell = -1;
        if (aiSub >= 0) {
          const empty = getEmptyIndices(boards[aiSub], 9);
          aiCell = difficulty === 'easy' ? empty[Math.floor(Math.random() * empty.length)] :
            difficulty === 'medium' && Math.random() < 0.5 ? empty[Math.floor(Math.random() * empty.length)] :
            getOptimalMove3x3(boards[aiSub].slice() as Player[]);
        } else {
          const cand: { sub: number; cell: number }[] = [];
          for (let s = 0; s < 9; s++) {
            if (nextMeta[s] !== null) continue;
            const empty = getEmptyIndices(boards[s], 9);
            for (const c of empty) cand.push({ sub: s, cell: c });
          }
          const pick = cand[Math.floor(Math.random() * cand.length)];
          aiSub = pick.sub;
          aiCell = pick.cell;
        }
        if (aiSub >= 0 && aiCell >= 0) {
          const b2 = boards.map(r => [...r]);
          b2[aiSub][aiCell] = 'O';
          const gCell = aiSub * 9 + aiCell;
          addCellAnim(gCell, 'O');
          spawnParticles(gCell, oColor, 8);
          playSound('pop');
          const sr = checkWinner3x3(b2[aiSub]);
          const nm = [...nextMeta];
          if (sr.winner) nm[aiSub] = sr.winner;
          const mr = checkWinner3x3(nm);
          if (mr.winner) {
            setWinner(mr.winner);
            setWinLine(mr.line!.map(i => i * 9 + 4));
            triggerScreenShake();
            playSound(mr.winner === 'O' ? 'gameover' : 'victory');
            if (mr.winner === 'O') setLosses(l => l + 1);
            setWinStreak(0);
          }
          setAllBoards(b2);
          setMetaBoard(nm);
          const subFull = b2[aiCell].every((c: Player) => c !== null);
            setLastPlayedCell(nm[aiCell] !== null || subFull ? null : aiCell);
        }
        setXTurn(true);
      }, 400);
      return;
    }

    if (gameMode === 'classic') {
      if (board[cell] || !xTurn) return;
      const next = [...board];
      next[cell] = 'X';
      addCellAnim(cell, 'X');
      spawnParticles(cell, xColor, 10);
      playSound('pop');
      const result = checkWinner3x3(next);
      if (result.winner) {
        setWinner(result.winner);
        setWinLine(result.line || []);
        triggerScreenShake();
        playSound('victory');
        if (result.winner === 'X') {
          setWins(w => w + 1);
          setWinStreak(s => s + 1);
          setSeriesScore(s => ({ ...s, x: s.x + 1 }));
          playSound('streak');
        } else {
          setWinStreak(0);
          setSeriesScore(s => ({ ...s, o: s.o + 1 }));
        }
      } else if (next.every(c => c)) {
        setWinner(null);
        setDraws(d => d + 1);
        playSound('wrong');
      }
      setBoard(next);
      setXTurn(false);
      setMoveHistory(h => [...h, { cell, player: 'X', time: moveTimer }]);
      setLastMoveTime(Date.now());
      if (!result.winner && !next.every(c => c)) {
        setAiThinking(true);
        setHintCell(null);
        setTimeout(() => {
          const empty = getEmptyIndices(next, 9);
          let aiMove: number;
          if (difficulty === 'easy') aiMove = empty[Math.floor(Math.random() * empty.length)];
          else if (difficulty === 'medium' && Math.random() < 0.5) aiMove = empty[Math.floor(Math.random() * empty.length)];
          else aiMove = getOptimalMove3x3([...next]);
          setAiThinking(false);
          const next2 = [...next];
          next2[aiMove] = 'O';
          addCellAnim(aiMove, 'O');
          spawnParticles(aiMove, oColor, 10);
          playSound('pop');
          const result2 = checkWinner3x3(next2);
          if (result2.winner) {
            setWinner(result2.winner);
            setWinLine(result2.line || []);
            triggerScreenShake();
            playSound(result2.winner === 'O' ? 'gameover' : 'victory');
            if (result2.winner === 'O') {
              setLosses(l => l + 1);
              setSeriesScore(s => ({ ...s, o: s.o + 1 }));
            } else setSeriesScore(s => ({ ...s, x: s.x + 1 }));
            setWinStreak(0);
          } else if (next2.every(c => c)) {
            setDraws(d => d + 1);
            playSound('wrong');
          }
          setBoard(next2);
          setXTurn(true);
          setMoveHistory(h => [...h, { cell: aiMove, player: 'O', time: moveTimer }]);
        }, 350);
      }
    } else {
      if (board[cell] || !xTurn) return;
      const next = [...board];
      next[cell] = 'X';
      addCellAnim(cell, 'X');
      spawnParticles(cell, xColor, 10);
      playSound('pop');
      const result = checkWinner5x5(next);
      if (result.winner) {
        setWinner(result.winner);
        setWinLine(result.line || []);
        triggerScreenShake();
        playSound('victory');
        if (result.winner === 'X') {
          setWins(w => w + 1);
          setWinStreak(s => s + 1);
          setSeriesScore(s => ({ ...s, x: s.x + 1 }));
          playSound('streak');
        } else {
          setWinStreak(0);
          setSeriesScore(s => ({ ...s, o: s.o + 1 }));
        }
      } else if (next.every(c => c)) {
        setDraws(d => d + 1);
        playSound('wrong');
      }
      setBoard(next);
      setXTurn(false);
      setMoveHistory(h => [...h, { cell, player: 'X', time: moveTimer }]);
      setLastMoveTime(Date.now());
      if (!result.winner && !next.every(c => c)) {
        setAiThinking(true);
        setHintCell(null);
        setTimeout(() => {
          const aiMove = getBestMove5x5([...next], difficulty);
          setAiThinking(false);
          if (aiMove >= 0) {
            const next2 = [...next];
            next2[aiMove] = 'O';
            addCellAnim(aiMove, 'O');
            spawnParticles(aiMove, oColor, 10);
            playSound('pop');
            const result2 = checkWinner5x5(next2);
            if (result2.winner) {
              setWinner(result2.winner);
              setWinLine(result2.line || []);
              triggerScreenShake();
              playSound(result2.winner === 'O' ? 'gameover' : 'victory');
              if (result2.winner === 'O') setLosses(l => l + 1);
              setWinStreak(0);
            } else if (next2.every(c => c)) {
              setDraws(d => d + 1);
              playSound('wrong');
            }
            setBoard(next2);
            setXTurn(true);
            setMoveHistory(h => [...h, { cell: aiMove, player: 'O', time: moveTimer }]);
          }
        }, 350);
      }
    }
  }, [board, winner, xTurn, gameMode, difficulty, metaBoard, allBoards, lastPlayedCell, selectedCell, moveTimer, xColor, addCellAnim, spawnParticles, triggerScreenShake]);

  const showStrategicHint = useCallback(() => {
    if (winner || !xTurn || gameMode !== 'classic') return;
    const h = getStrategicHint3x3([...board]);
    if (h >= 0) {
      setHintCell(h);
      playSound('tick');
      setTimeout(() => setHintCell(null), 2000);
    }
  }, [board, winner, xTurn, gameMode]);

  const undoLastMove = useCallback(() => {
    if (moveHistory.length < 1 || winner) return;
    if (gameMode !== 'classic') return;
    const last = moveHistory[moveHistory.length - 1];
    if (last.player !== 'X') return;
    const prev = moveHistory.slice(0, -1);
    const beforeLast = prev.length > 0 ? prev[prev.length - 1] : null;
    setBoard(b => {
      const nb = [...b];
      nb[last.cell] = null;
      if (beforeLast && beforeLast.player === 'O') nb[beforeLast.cell] = null;
      return nb;
    });
    setMoveHistory(prev);
    setXTurn(beforeLast ? false : true);
    setWinner(null);
    setWinLine([]);
    playSound('click');
  }, [moveHistory, winner, gameMode]);

  useEffect(() => {
    setLastMoveTime(Date.now());
    timerRef.current = setInterval(() => setMoveTimer(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [winner]);

  useEffect(() => {
    setSelectedCell(0);
    reset();
  }, [gameMode, difficulty]);

  useEffect(() => {
    saveMatchHistory({ wins, losses, draws });
  }, [wins, losses, draws]);

  useEffect(() => {
    const dt = 1 / 60;
    setCellAnims(a => a.map(x => ({ ...x, progress: Math.min(1, x.progress + dt * 2.5) })).filter(x => x.progress < 1));
    setParticles(p => p.map(par => ({
      ...par,
      life: par.life - (0.016 / par.maxLife),
    })).filter(par => par.life > 0));
    setScreenShake(s => Math.max(0, s - 0.05));
    if (winner && winLine.length > 0) setWinLineProgress(w => Math.min(1, w + 0.03));
    if (resetFadeProgress < 1) setResetFadeProgress(p => Math.min(1, p + 0.05));
  }, [winner, winLine, resetFadeProgress]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dim = gridDim;
      if (isUltimate) {
        const total = 81;
        setSelectedCell(c => {
          let next = c;
          if (e.key === 'ArrowRight') next = (c + 1) % total;
          if (e.key === 'ArrowLeft') next = (c - 1 + total) % total;
          if (e.key === 'ArrowDown') next = (c + 9) % total;
          if (e.key === 'ArrowUp') next = (c - 9 + total) % total;
          playSound('tick');
          return next;
        });
      } else {
        setSelectedCell(c => {
          let r = Math.floor(c / dim), col = c % dim;
          if (e.key === 'ArrowUp') r = (r - 1 + dim) % dim;
          if (e.key === 'ArrowDown') r = (r + 1) % dim;
          if (e.key === 'ArrowLeft') col = (col - 1 + dim) % dim;
          if (e.key === 'ArrowRight') col = (col + 1) % dim;
          playSound('tick');
          return r * dim + col;
        });
      }
    }
    if (e.key === ' ') {
      e.preventDefault();
      doPlayerMove(selectedCell);
    }
  }, [selectedCell, gridDim, isUltimate, lastPlayedCell, doPlayerMove]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getCellFromClientCoords = useCallback((clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const pad = 50;
    const gw = rect.width - pad * 2;
    const gh = rect.height - pad * 2;
    const dim = isUltimate ? 9 : gridDim;
    const cw = Math.max(gw / dim, 44);
    const ch = Math.max(gh / dim, 44);
    const x = clientX - rect.left - pad;
    const y = clientY - rect.top - pad;
    if (x < 0 || y < 0 || x > gw || y > gh) return null;
    const col = Math.min(dim - 1, Math.floor(x / cw));
    const row = Math.min(dim - 1, Math.floor(y / ch));
    const cell = row * dim + col;
    if (cell >= 0 && cell < (isUltimate ? 81 : boardSize)) return cell;
    return null;
  }, [isUltimate, gridDim, boardSize]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromClientCoords(e.clientX, e.clientY);
    if (cell !== null) {
      setSelectedCell(cell);
      doPlayerMove(cell);
    }
  }, [getCellFromClientCoords, doPlayerMove]);

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      const cell = getCellFromClientCoords(touch.clientX, touch.clientY);
      if (cell !== null) setSelectedCell(cell);
    }
  }, [getCellFromClientCoords]);

  const handleCanvasTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch) {
      const cell = getCellFromClientCoords(touch.clientX, touch.clientY);
      if (cell !== null) {
        setSelectedCell(cell);
        doPlayerMove(cell);
      }
    }
  }, [getCellFromClientCoords, doPlayerMove]);

  const getCurrentBoard = useCallback((): Player[] => {
    if (isUltimate) return metaBoard;
    return board;
  }, [isUltimate, board, metaBoard]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, w, h);

    const shakeX = (Math.random() - 0.5) * 12 * screenShake;
    const shakeY = (Math.random() - 0.5) * 12 * screenShake;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const pad = 50;
    const gw = w - pad * 2;
    const gh = h - pad * 2;
    const cellW = gw / (isUltimate ? 9 : gridDim);
    const cellH = gh / (isUltimate ? 9 : gridDim);

    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = `rgba(139, 92, 246, ${0.02 + 0.01 * Math.sin(Date.now() / 500 + i)}%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, (h / 20) * i);
      ctx.lineTo(w, (h / 20) * i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo((w / 20) * i, 0);
      ctx.lineTo((w / 20) * i, h);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 15;
    const step = isUltimate ? 9 : gridDim;
    for (let i = 0; i <= step; i++) {
      ctx.lineWidth = (isUltimate && i % 3 === 0) ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(pad + (gw / step) * i, pad);
      ctx.lineTo(pad + (gw / step) * i, pad + gh);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad, pad + (gh / step) * i);
      ctx.lineTo(pad + gw, pad + (gh / step) * i);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.globalAlpha = resetFadeProgress;
    const selR = Math.floor(selectedCell / (isUltimate ? 9 : gridDim));
    const selC = selectedCell % (isUltimate ? 9 : gridDim);
    const cw = isUltimate ? gw / 9 : cellW;
    const ch = isUltimate ? gh / 9 : cellH;
    if (hintCell !== null) {
      const hr = Math.floor(hintCell / (isUltimate ? 9 : gridDim));
      const hc = hintCell % (isUltimate ? 9 : gridDim);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.fillRect(pad + hc * cw + 2, pad + hr * ch + 2, cw - 4, ch - 4);
    }
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.fillRect(pad + selC * cw + 4, pad + selR * ch + 4, cw - 8, ch - 8);

    const drawSymbol = (cellX: number, cellY: number, cw: number, ch: number, sym: Player, progress: number, idx: number) => {
      const cx = cellX + cw / 2;
      const cy = cellY + ch / 2;
      const r = Math.min(cw, ch) * 0.35;
      const scaleBounce = progress < 1 ? 0.6 + 0.4 * Math.sin(progress * Math.PI) : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleBounce, scaleBounce);
      ctx.translate(-cx, -cy);
      const color = sym === 'X' ? xColor : oColor;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, r * 0.15);
      ctx.lineCap = 'round';
      if (sym === 'X') {
        ctx.beginPath();
        const p = progress;
        ctx.moveTo(cx - r, cy - r);
        ctx.lineTo(cx - r + (2 * r) * Math.min(1, p * 2), cy - r + (2 * r) * Math.min(1, p * 2));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + r, cy - r);
        ctx.lineTo(cx + r - (2 * r) * Math.min(1, Math.max(0, (p - 0.5) * 2)), cy - r + (2 * r) * Math.min(1, Math.max(0, (p - 0.5) * 2)));
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
      }
      ctx.restore();
    };

    const getBoardAt = (idx: number): Player => {
      if (isUltimate) {
        const sub = Math.floor(idx / 9);
        const cell = idx % 9;
        return allBoards[sub]?.[cell] ?? null;
      }
      return board[idx] ?? null;
    };

    for (let i = 0; i < (isUltimate ? 81 : boardSize); i++) {
      const r = Math.floor(i / (isUltimate ? 9 : gridDim));
      const c = i % (isUltimate ? 9 : gridDim);
      const cellX = pad + c * cw;
      const cellY = pad + r * ch;
      const sym = getBoardAt(i);
      const anim = cellAnims.find(a => a.cellIndex === i);
      const prog = anim ? anim.progress : (sym ? 1 : 0);
      const s = anim?.symbol ?? sym;
      if (s) drawSymbol(cellX, cellY, cw, ch, s, prog, i);
    }

    for (const p of particles) {
      const r = Math.floor(p.cellIndex / (isUltimate ? 9 : gridDim));
      const c = p.cellIndex % (isUltimate ? 9 : gridDim);
      const cellCx = pad + c * cw + cw / 2;
      const cellCy = pad + r * ch + ch / 2;
      const travel = (1 - p.life) * 25;
      const px = cellCx + p.vx * travel;
      const py = cellCy + p.vy * travel;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (winLine.length > 0 && winLineProgress > 0) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      const [a, b] = [winLine[0], winLine[winLine.length - 1]];
      const dim = isUltimate ? 9 : gridDim;
      const ax = pad + (a % dim) * cw + cw / 2;
      const ay = pad + Math.floor(a / dim) * ch + ch / 2;
      const bx = pad + (b % dim) * cw + cw / 2;
      const by = pad + Math.floor(b / dim) * ch + ch / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const ex = ax + dx * winLineProgress;
      const ey = ay + dy * winLineProgress;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
    animFrameRef.current = requestAnimationFrame(render);
    ctx.globalAlpha = 1;
  }, [board, allBoards, metaBoard, selectedCell, cellAnims, particles, screenShake, winLine, winLineProgress, gridDim, boardSize, isUltimate, xColor, oColor, resetFadeProgress, hintCell]);

  useEffect(() => {
    render();
    return () => { cancelAnimationFrame(animFrameRef.current); };
  }, [render]);

  const gameBoard = getCurrentBoard();
  const isDraw = !winner && (isUltimate ? metaBoard.every(b => b !== null) : board.every(c => c !== null));

  return (
    <div ref={containerRef} className="game-card flex flex-col w-full max-w-lg mx-auto" style={{ minHeight: 520 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-gray-900">⭕ Tic-Tac-Toe Elite</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>Close</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <label className="text-gray-700 font-medium block mb-1">Mode</label>
          <select
            value={gameMode}
            onChange={e => setGameMode(e.target.value as GameMode)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900"
          >
            <option value="classic">Classic 3×3</option>
            <option value="bigboard">Big Board 5×5 (4 in a row)</option>
            <option value="ultimate">Ultimate (3×3 of 3×3)</option>
          </select>
        </div>
        <div>
          <label className="text-gray-700 font-medium block mb-1">AI Difficulty</label>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as Difficulty)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="impossible">Impossible</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Game Statistics</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-800">
          <span>Wins: <strong className="text-green-600">{wins}</strong></span>
          <span>Losses: <strong className="text-red-600">{losses}</strong></span>
          <span>Draws: <strong>{draws}</strong></span>
          <span>Total: <strong>{wins + losses + draws}</strong></span>
          {wins + losses + draws > 0 && (
            <span>Win rate: <strong>{Math.round((wins / (wins + losses + draws)) * 100)}%</strong></span>
          )}
          {winStreak > 0 && <span className="text-amber-600 font-semibold">Streak: {winStreak} 🔥</span>}
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <span>X:</span>
          <input type="color" value={xColor} onChange={e => setXColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span>O:</span>
          <input type="color" value={oColor} onChange={e => setOColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer" />
        </label>
      </div>

      <div className="flex-1 min-h-[320px] rounded-xl overflow-hidden bg-gray-900/90 border border-gray-700 w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-pointer touch-manipulation"
          style={{ width: '100%', height: 320, maxWidth: '100%', minHeight: 280 }}
          tabIndex={0}
          onClick={handleCanvasClick}
          onTouchStart={handleCanvasTouchStart}
          onTouchEnd={handleCanvasTouchEnd}
        />
      </div>

      {seriesMode && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm">
          <span className="font-semibold">Best of 5:</span> You {seriesScore.x} — AI {seriesScore.o}
          {(seriesScore.x >= 3 || seriesScore.o >= 3) && (
            <span className="ml-2 font-bold text-amber-700">
              {seriesScore.x >= 3 ? 'You won the series!' : 'AI won the series!'}
            </span>
          )}
        </div>
      )}

      <p className="text-sm text-gray-800 mt-2 mb-2">
        {winner ? (
          <span className={winner === 'X' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
            {winner === 'X' ? 'You win!' : 'AI wins!'}
          </span>
        ) : isDraw ? (
          <span className="text-gray-600">Draw!</span>
        ) : xTurn ? (
          <span className="text-purple-600 font-medium">Your turn • Move timer: {moveTimer}s • Arrow keys + Space</span>
        ) : aiThinking ? (
          <span className="text-pink-600 font-medium animate-pulse">AI thinking...</span>
        ) : (
          <span className="text-pink-600 font-medium">AI thinking...</span>
        )}
      </p>

      <div className="flex flex-wrap gap-2 mb-2">
        <label className="flex items-center gap-2 text-sm touch-manipulation">
          <input type="checkbox" checked={seriesMode} onChange={e => { setSeriesMode(e.target.checked); if (!e.target.checked) setSeriesScore({ x: 0, o: 0 }); }} />
          Best of 5
        </label>
        <label className="flex items-center gap-2 text-sm touch-manipulation">
          <input type="checkbox" checked={learningMode} onChange={e => setLearningMode(e.target.checked)} />
          Learning
        </label>
        <button onClick={reset} className="btn-elite btn-elite-primary touch-manipulation active:scale-95" onMouseDown={() => playSound('click')}>Reset</button>
        {gameMode === 'classic' && (
          <>
            <button onClick={undoLastMove} disabled={moveHistory.length < 1 || !!winner} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Undo</button>
            {learningMode && (
              <button onClick={showStrategicHint} disabled={!!winner || !xTurn} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Hint</button>
            )}
          </>
        )}
      </div>

      <div className="text-xs text-gray-600 mt-1 max-h-20 overflow-y-auto">
        <strong>Move history:</strong>{' '}
        {moveHistory.length === 0 ? '—' : moveHistory.map((m, i) => (
          <span key={i}>
            {m.player}({m.cell})@{m.time}s{i < moveHistory.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
