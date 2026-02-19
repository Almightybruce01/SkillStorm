/* ═══════════════════════════════════════════════════════════════════════════════
   CONNECT FOUR — Elite Canvas Edition
   Full canvas rendering, minimax AI, physics, particles, board sizes, replay
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface ConnectFourGameProps {
  onClose: () => void;
}

type Player = 1 | 2;
const HUMAN: Player = 1;
const AI_PLAYER: Player = 2;

type BoardSize = 'mini' | 'classic' | 'large';

const BOARD_CONFIGS: Record<BoardSize, { cols: number; rows: number; winCount: number }> = {
  mini: { cols: 5, rows: 4, winCount: 4 },
  classic: { cols: 7, rows: 6, winCount: 4 },
  large: { cols: 9, rows: 7, winCount: 4 },
};

type Difficulty = 'easy' | 'medium' | 'hard';
const DEPTH_MAP: Record<Difficulty, number> = { easy: 2, medium: 4, hard: 6 };

const COLORS = {
  human: {
    base: '#ef4444',
    dark: '#dc2626',
    light: '#f87171',
    gradient: ['#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'],
  },
  ai: {
    base: '#eab308',
    dark: '#ca8a04',
    light: '#facc15',
    gradient: ['#fef08a', '#eab308', '#a16207', '#713f12'],
  },
  board: {
    slot: '#1e3a5f',
    slotHover: '#2563eb',
    slotGhost: 'rgba(59, 130, 246, 0.4)',
    frame: '#0f172a',
    frameLight: '#334155',
    wood: '#78350f',
  },
};

interface DroppingDisc {
  col: number;
  row: number;
  player: Player;
  y: number;
  vy: number;
  bounceCount: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface WinLineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
}

interface MoveRecord {
  col: number;
  row: number;
  player: Player;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Game Logic
   ───────────────────────────────────────────────────────────────────────────── */

function createBoard(rows: number, cols: number): (Player | null)[][] {
  return Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null));
}

function getLowestRow(board: (Player | null)[][], col: number): number {
  const rows = board.length;
  for (let r = rows - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

function dropDisc(board: (Player | null)[][], col: number, player: Player): (Player | null)[][] {
  const row = getLowestRow(board, col);
  if (row < 0) return board;
  const next = board.map((r) => [...r]);
  next[row][col] = player;
  return next;
}

function checkWin(
  board: (Player | null)[][],
  player: Player,
  winCount: number
): { win: boolean; cells?: [number, number][] } {
  const rows = board.length;
  const cols = board[0].length;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== player) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let i = 1; i < winCount; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc] !== player) break;
          cells.push([nr, nc]);
        }
        if (cells.length === winCount) return { win: true, cells };
      }
    }
  }
  return { win: false };
}

function evaluateBoard(
  board: (Player | null)[][],
  human: Player,
  ai: Player,
  winCount: number
): number {
  const winH = checkWin(board, human, winCount);
  const winA = checkWin(board, ai, winCount);
  if (winH.win) return -10000;
  if (winA.win) return 10000;

  let score = 0;
  const rows = board.length;
  const cols = board[0].length;
  const center = Math.floor(cols / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === ai) {
        score += 10;
        if (c === center) score += 5;
      } else if (board[r][c] === human) {
        score -= 10;
        if (c === center) score -= 5;
      }
    }
  }
  return score;
}

function minimax(
  board: (Player | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  human: Player,
  ai: Player,
  winCount: number
): number {
  const winH = checkWin(board, human, winCount);
  const winA = checkWin(board, ai, winCount);
  if (winH.win) return -10000 + (depth - 100);
  if (winA.win) return 10000 - (depth - 100);

  const rows = board.length;
  const cols = board[0].length;
  const full = board.every((row) => row.every((cell) => cell !== null));
  if (full || depth === 0) return evaluateBoard(board, human, ai, winCount);

  if (isMax) {
    let best = -Infinity;
    for (let c = 0; c < cols; c++) {
      const row = getLowestRow(board, c);
      if (row < 0) continue;
      const next = dropDisc(board, c, ai);
      const val = minimax(next, depth - 1, alpha, beta, false, human, ai, winCount);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let c = 0; c < cols; c++) {
      const row = getLowestRow(board, c);
      if (row < 0) continue;
      const next = dropDisc(board, c, human);
      const val = minimax(next, depth - 1, alpha, beta, true, human, ai, winCount);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getEasyRandomMove(board: (Player | null)[][]): number {
  const cols = board[0].length;
  const validCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (getLowestRow(board, c) >= 0) validCols.push(c);
  }
  if (validCols.length === 0) return 0;
  return validCols[Math.floor(Math.random() * validCols.length)];
}

function getAIMove(
  board: (Player | null)[][],
  human: Player,
  ai: Player,
  depth: number,
  winCount: number
): number {
  const cols = board[0].length;
  let bestCol = 0;
  let bestVal = -Infinity;
  const validCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (getLowestRow(board, c) >= 0) validCols.push(c);
  }
  if (validCols.length === 0) return 0;

  for (const c of validCols) {
    const next = dropDisc(board, c, ai);
    const val = minimax(next, depth - 1, -Infinity, Infinity, false, human, ai, winCount);
    if (val > bestVal) {
      bestVal = val;
      bestCol = c;
    }
  }
  return bestCol;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Canvas Rendering Helpers
   ───────────────────────────────────────────────────────────────────────────── */

function drawGradientDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  player: Player,
  alpha = 1
) {
  const colors = player === HUMAN ? COLORS.human : COLORS.ai;
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r * 1.2);
  grad.addColorStop(0, colors.light);
  grad.addColorStop(0.4, colors.base);
  grad.addColorStop(0.8, colors.dark);
  grad.addColorStop(1, colors.dark);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  const shine = ctx.createRadialGradient(
    cx - r * 0.5,
    cy - r * 0.5,
    0,
    cx,
    cy,
    r * 0.8
  );
  shine.addColorStop(0, 'rgba(255,255,255,0.6)');
  shine.addColorStop(0.3, 'rgba(255,255,255,0.2)');
  shine.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fill();
  ctx.restore();
}

function drawGhostDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  player: Player
) {
  const colors = player === HUMAN ? COLORS.human : COLORS.ai;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = colors.base;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = colors.base;
  ctx.fill();
  ctx.restore();
}

export default function ConnectFourGame({ onClose }: ConnectFourGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boardSize, setBoardSize] = useState<BoardSize>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [board, setBoard] = useState<(Player | null)[][]>([]);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [selectedCol, setSelectedCol] = useState(0);
  const [dropping, setDropping] = useState<DroppingDisc | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shakeX, setShakeX] = useState(0);
  const [winLineProgress, setWinLineProgress] = useState(0);
  const [fillProgress, setFillProgress] = useState(0);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0, streak: 0 });
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [moveTimerSec, setMoveTimerSec] = useState(0);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [turnArrowPhase, setTurnArrowPhase] = useState(0);
  const [winGlowPhase, setWinGlowPhase] = useState(0);

  const config = BOARD_CONFIGS[boardSize];
  const cols = config.cols;
  const rows = config.rows;
  const winCount = config.winCount;
  const cellSize = boardSize === 'mini' ? 42 : boardSize === 'classic' ? 52 : 44;
  const gap = 6;
  const boardWidth = cols * cellSize + (cols + 1) * gap;
  const boardHeight = rows * cellSize + (rows + 1) * gap;
  const discRadius = cellSize / 2 - 2;
  const padding = 24;
  const canvasW = boardWidth + padding * 2 + 180;
  const canvasH = boardHeight + padding * 2 + 80;

  const initBoard = useCallback(() => {
    setBoard(createBoard(rows, cols));
    setWinner(null);
    setWinCells([]);
    setIsPlayerTurn(true);
    setSelectedCol(Math.min(selectedCol, cols - 1));
    setDropping(null);
    setParticles([]);
    setShakeX(0);
    setWinLineProgress(0);
    setFillProgress(0);
    setMoveHistory([]);
    setReplayIndex(-1);
    setMoveTimerSec(0);
  }, [rows, cols]);

  const reset = useCallback(() => {
    initBoard();
    setFillProgress(0);
    playSound('click');
  }, [initBoard]);

  useEffect(() => {
    initBoard();
  }, [boardSize]);

  const canUndo = moveHistory.length >= 2 && !winner && !dropping;
  const undo = useCallback(() => {
    if (!canUndo) return;
    const newHistory = [...moveHistory];
    const aiMove = newHistory.pop()!;
    const humanMove = newHistory.pop()!;
    const newBoard = createBoard(rows, cols);
    for (const m of newHistory) {
      newBoard[m.row][m.col] = m.player;
    }
    setBoard(newBoard);
    setMoveHistory(newHistory);
    setWinner(null);
    setIsPlayerTurn(true);
    playSound('click');
  }, [canUndo, moveHistory, rows, cols]);

  const applyHumanDrop = useCallback(
    (col: number) => {
      const row = getLowestRow(board, col);
      if (row < 0 || winner || !isPlayerTurn || dropping) return;

      playSound('pop');
      setDropping({
        col,
        row,
        player: HUMAN,
        y: 0,
        vy: 0,
        bounceCount: 0,
      });
      setShakeX(4);
      setTimeout(() => setShakeX(0), 80);
      setIsPlayerTurn(false);

      const newBoard = dropDisc(board, col, HUMAN);
      const newHistory = [...moveHistory, { col, row, player: HUMAN }];

      const winCheck = checkWin(newBoard, HUMAN, winCount);
      if (winCheck.win) {
        setTimeout(() => {
          setBoard(newBoard);
          setDropping(null);
          setWinner(HUMAN);
          setWinCells(winCheck.cells || []);
          setMoveHistory(newHistory);
          setStats((s) => ({ ...s, wins: s.wins + 1, streak: s.streak + 1 }));
          playSound('victory');
        }, 420);
        return;
      }

      const full = newBoard.every((r) => r.every((c) => c !== null));
      if (full) {
        setTimeout(() => {
          setBoard(newBoard);
          setDropping(null);
          setWinner('draw');
          setMoveHistory(newHistory);
          setStats((s) => ({ ...s, draws: s.draws + 1, streak: 0 }));
          playSound('wrong');
        }, 420);
        return;
      }

      setTimeout(() => {
        setBoard(newBoard);
        setDropping(null);
        setMoveHistory(newHistory);

        const aiCol = difficulty === 'easy' ? getEasyRandomMove(newBoard) : getAIMove(newBoard, HUMAN, AI_PLAYER, DEPTH_MAP[difficulty], winCount);
        const aiRow = getLowestRow(newBoard, aiCol);

        playSound('pop');
        setDropping({
          col: aiCol,
          row: aiRow,
          player: AI_PLAYER,
          y: 0,
          vy: 0,
          bounceCount: 0,
        });
        setShakeX(4);
        setTimeout(() => setShakeX(0), 80);

        const finalBoard = dropDisc(newBoard, aiCol, AI_PLAYER);
        const finalHistory = [...newHistory, { col: aiCol, row: aiRow, player: AI_PLAYER }];

        const aiWin = checkWin(finalBoard, AI_PLAYER, winCount);
        if (aiWin.win) {
          setTimeout(() => {
            setBoard(finalBoard);
            setDropping(null);
            setWinner(AI_PLAYER);
            setWinCells(aiWin.cells || []);
            setMoveHistory(finalHistory);
            setStats((s) => ({ ...s, losses: s.losses + 1, streak: 0 }));
            playSound('gameover');
          }, 420);
          return;
        }

        const aiFull = finalBoard.every((r) => r.every((c) => c !== null));
        if (aiFull) {
          setTimeout(() => {
            setBoard(finalBoard);
            setDropping(null);
            setWinner('draw');
            setMoveHistory(finalHistory);
            setStats((s) => ({ ...s, draws: s.draws + 1, streak: 0 }));
            playSound('wrong');
          }, 420);
          return;
        }

        setTimeout(() => {
          setBoard(finalBoard);
          setDropping(null);
          setMoveHistory(finalHistory);
          setIsPlayerTurn(true);
        }, 420);
      }, 420);
    },
    [board, winner, isPlayerTurn, dropping, moveHistory, difficulty, winCount]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (winner) return;
      if (e.key === 'ArrowLeft') {
        setSelectedCol((c) => Math.max(0, c - 1));
        playSound('click');
      } else if (e.key === 'ArrowRight') {
        setSelectedCol((c) => Math.min(cols - 1, c + 1));
        playSound('click');
      } else if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        applyHumanDrop(selectedCol);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [winner, selectedCol, cols, applyHumanDrop]);

  useEffect(() => {
    if (fillProgress >= 1) return;
    const id = requestAnimationFrame(() => {
      setFillProgress((p) => Math.min(1, p + 0.02));
    });
    return () => cancelAnimationFrame(id);
  }, [fillProgress]);

  const boardX = padding + 90;
  const boardY = padding + 40;

  useEffect(() => {
    if (winner && winCells.length > 0) {
      const colors = winner === HUMAN ? COLORS.human : COLORS.ai;
      const parts: Particle[] = [];
      winCells.forEach(([r, c]) => {
        const gx = boardX + gap + c * (cellSize + gap) + cellSize / 2;
        const gy = boardY + gap + r * (cellSize + gap) + cellSize / 2;
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.5;
          const speed = 2 + Math.random() * 6;
          parts.push({
            x: gx,
            y: gy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 4,
            life: 1,
            maxLife: 1,
            color: colors.gradient[i % 4],
            size: 4 + Math.random() * 6,
          });
        }
      });
      setParticles(parts);
    }
  }, [winner, winCells, cols, rows]);

  useEffect(() => {
    if (winCells.length > 0 && winner) {
      const id = requestAnimationFrame(() => {
        setWinLineProgress((p) => Math.min(1, p + 0.03));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [winner, winCells]);

  useEffect(() => {
    if (particles.length === 0) return;
    const raf = requestAnimationFrame(() => {
      setParticles((ps) =>
        ps
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.3,
            life: p.life - 0.025,
          }))
          .filter((p) => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [particles]);

  useEffect(() => {
    if (dropping) {
      const raf = requestAnimationFrame(() => {
        setDropping((d) => {
          if (!d) return null;
          const targetY = gap + d.row * (cellSize + gap) + cellSize / 2;
          let vy = d.vy + 0.8;
          let y = d.y + vy;
          let bounce = d.bounceCount;

          if (y >= targetY) {
            y = targetY;
            if (bounce < 2) {
              vy = -vy * 0.4;
              bounce++;
            } else {
              return null;
            }
          }
          return { ...d, y, vy, bounceCount: bounce };
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [dropping]);

  useEffect(() => {
    const id = setInterval(() => setTurnArrowPhase((p) => (p + 0.05) % (Math.PI * 2)), 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (winner && winCells.length > 0) {
      const id = setInterval(() => setWinGlowPhase((p) => (p + 0.12) % (Math.PI * 2)), 50);
      return () => clearInterval(id);
    }
  }, [winner, winCells.length]);

  useEffect(() => {
    if (isPlayerTurn && !winner && !dropping) {
      setMoveTimerSec(0);
      moveTimerRef.current = setInterval(() => setMoveTimerSec((s) => s + 1), 1000);
    } else {
      if (moveTimerRef.current) {
        clearInterval(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    }
    return () => {
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, [isPlayerTurn, winner, dropping]);

  const startReplay = useCallback(() => {
    if (moveHistory.length === 0) return;
    setBoard(createBoard(rows, cols));
    setWinner(null);
    setWinCells([]);
    setReplayIndex(0);
    playSound('click');
  }, [moveHistory, rows, cols]);

  useEffect(() => {
    if (replayIndex < 0 || replayIndex >= moveHistory.length) return;
    const m = moveHistory[replayIndex];
    setBoard((b) => {
      const next = b.map((r) => [...r]);
      next[m.row][m.col] = m.player;
      return next;
    });
    const t = setTimeout(() => {
      if (replayIndex + 1 >= moveHistory.length) {
        setReplayIndex(-1);
      } else {
        setReplayIndex((i) => i + 1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [replayIndex, moveHistory]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const boardLocalX = canvasX - boardX;
    const boardLocalY = canvasY - boardY;
    if (boardLocalY < 0) return null;
    const col = Math.floor((boardLocalX + gap) / (cellSize + gap));
    return col >= 0 && col < cols ? { col, x: canvasX, y: canvasY } : null;
  }, [cols, cellSize, gap, boardX, boardY]);

  const handleCanvasPointer = useCallback((col: number | null, canvasX: number, canvasY: number) => {
    if (col === null || col < 0 || col >= cols) return;
    const ghostRow = getLowestRow(board, col);
    if (ghostRow >= 0) {
      const slotX = boardX + gap + col * (cellSize + gap) + cellSize / 2;
      const slotY = boardY + gap + ghostRow * (cellSize + gap) + cellSize / 2;
      const dx = canvasX - slotX;
      const dy = canvasY - slotY;
      if (dx * dx + dy * dy < (cellSize / 2) ** 2 * 4) {
        applyHumanDrop(col);
      }
    }
  }, [board, cols, cellSize, gap, boardX, boardY, applyHumanDrop]);

  const canvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      if (coords) handleCanvasPointer(coords.col, coords.x, coords.y);
    },
    [getCanvasCoords, handleCanvasPointer]
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
      if (coords) handleCanvasPointer(coords.col, coords.x, coords.y);
    },
    [getCanvasCoords, handleCanvasPointer]
  );

  const hoverColRef = useRef(-1);
  const [hoverCol, setHoverCol] = useState(-1);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const x = canvasX - boardX;
      const col = Math.floor((x + gap) / (cellSize + gap));
      if (col >= 0 && col < cols && col !== hoverColRef.current) {
        hoverColRef.current = col;
        setHoverCol(col);
      }
    },
    [cols, cellSize, gap, boardX]
  );

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      ctx.save();
      ctx.translate(shakeX * (Math.random() - 0.5) * 2, 0);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(boardX, boardY);

      const fillCellCount = Math.floor(fillProgress * rows * cols);
      let drawn = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const slotX = gap + c * (cellSize + gap) + cellSize / 2;
          const slotY = gap + r * (cellSize + gap) + cellSize / 2;

          const showSlot = drawn < fillCellCount || fillProgress >= 1;
          drawn++;

          if (showSlot) {
            const colFull = getLowestRow(board, c) < 0;
            ctx.beginPath();
            ctx.arc(slotX, slotY, discRadius + 4, 0, Math.PI * 2);
            ctx.fillStyle = colFull ? "#334155" : COLORS.board.slot;
            if (c === hoverCol) {
              ctx.fillStyle = colFull ? "#475569" : COLORS.board.slotHover;
            }
            ctx.fill();
            ctx.strokeStyle = colFull ? "#64748b" : COLORS.board.frameLight;
            ctx.lineWidth = colFull ? 2 : 1;
            ctx.stroke();
            if (colFull && c === hoverCol) {
              ctx.fillStyle = "rgba(248,250,252,0.6)";
              ctx.font = "bold 16px system-ui";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("X", slotX, slotY);
              ctx.textAlign = "left";
              ctx.textBaseline = "alphabetic";
            }
          }
        }
      }

      const winSet = new Set(winCells.map(([r, c]) => `${r},${c}`));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = board[r]?.[c];
          const isDroppingHere = dropping?.col === c && dropping?.row === r;
          if (!cell && !isDroppingHere) continue;

          const cx = gap + c * (cellSize + gap) + cellSize / 2;
          const cy = gap + r * (cellSize + gap) + cellSize / 2;

          if (cell) {
            drawGradientDisc(ctx, cx, cy, discRadius, cell);
          }
        }
      }

      if (dropping) {
        const cx = gap + dropping.col * (cellSize + gap) + cellSize / 2;
        const startY = gap + cellSize / 2;
        const y = dropping.y > 0 ? dropping.y : startY;
        drawGradientDisc(ctx, cx, y, discRadius, dropping.player);
      }

      if (isPlayerTurn && !winner) {
        const ghostRow = getLowestRow(board, selectedCol);
        if (ghostRow >= 0) {
          const gx = gap + selectedCol * (cellSize + gap) + cellSize / 2;
          const gy = gap + ghostRow * (cellSize + gap) + cellSize / 2;
          drawGhostDisc(ctx, gx, gy, discRadius, HUMAN);
        }
      }

      if (hoverCol >= 0 && hoverCol < cols && !winner) {
        const ghostRow = getLowestRow(board, hoverCol);
        if (ghostRow >= 0 && hoverCol !== selectedCol) {
          const gx = gap + hoverCol * (cellSize + gap) + cellSize / 2;
          const gy = gap + ghostRow * (cellSize + gap) + cellSize / 2;
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.beginPath();
          ctx.arc(gx, gy, discRadius, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.board.slotGhost;
          ctx.fill();
          ctx.restore();
        }
      }

      if (winCells.length > 0 && winner) {
        const glow = 0.6 + 0.4 * Math.sin(winGlowPhase);
        winCells.forEach(([r, c]) => {
          const cx = gap + c * (cellSize + gap) + cellSize / 2;
          const cy = gap + r * (cellSize + gap) + cellSize / 2;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, discRadius + 15);
          grad.addColorStop(0, winner === HUMAN ? "rgba(239,68,68," + glow + ")" : "rgba(234,179,8," + glow + ")");
          grad.addColorStop(0.6, "rgba(255,255,255,0.2)");
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, discRadius + 15, 0, Math.PI * 2);
          ctx.fill();
        });
        const [r1, c1] = winCells[0];
        const [r2, c2] = winCells[winCells.length - 1];
        const x1 = gap + c1 * (cellSize + gap) + cellSize / 2;
        const y1 = gap + r1 * (cellSize + gap) + cellSize / 2;
        const x2 = gap + c2 * (cellSize + gap) + cellSize / 2;
        const y2 = gap + r2 * (cellSize + gap) + cellSize / 2;
        const prog = winLineProgress;
        const midX = x1 + (x2 - x1) * prog;
        const midY = y1 + (y2 - y1) * prog;
        ctx.save();
        ctx.strokeStyle = winner === HUMAN ? COLORS.human.light : COLORS.ai.light;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = winner === HUMAN ? '#ef4444' : '#eab308';
        ctx.shadowBlur = 15 + 10 * Math.sin(winGlowPhase);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(midX, midY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 14px system-ui';
      ctx.fillText(`W: ${stats.wins}  L: ${stats.losses}  D: ${stats.draws}`, 12, 28);
      if (stats.streak > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Streak: ${stats.streak}`, 12, 48);
      }

      ctx.fillStyle = isPlayerTurn ? COLORS.human.light : COLORS.ai.light;
      ctx.font = '600 12px system-ui';
      const turnText = winner
        ? winner === 'draw'
          ? 'Draw!'
          : winner === HUMAN
            ? 'You Win!'
            : 'AI Wins!'
        : isPlayerTurn
          ? 'Your turn'
          : 'AI thinking...';
      ctx.fillText(turnText, boardX + boardWidth + 12, boardY + 20);

      const arrowY = boardY + 50 + Math.sin(turnArrowPhase) * 4;
      if (!winner && isPlayerTurn) {
        ctx.fillStyle = COLORS.human.base;
        ctx.beginPath();
        ctx.moveTo(boardX + boardWidth + 20, arrowY - 8);
        ctx.lineTo(boardX + boardWidth + 20, arrowY + 8);
        ctx.lineTo(boardX + boardWidth + 32, arrowY);
        ctx.fill();
      }

      ctx.restore();
    };

    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [
    board,
    dropping,
    particles,
    winner,
    winCells,
    winLineProgress,
    isPlayerTurn,
    selectedCol,
    hoverCol,
    fillProgress,
    stats,
    turnArrowPhase,
    shakeX,
    moveTimerSec,
    winGlowPhase,
  ]);

  return (
    <div className="game-card bg-slate-900 text-white w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-amber-400">Four in a Row</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-slate-300 touch-manipulation active:scale-95">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-2 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          Board:
          <select
            value={boardSize}
            onChange={(e) => setBoardSize(e.target.value as BoardSize)}
            className="bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600"
            disabled={!!winner || !!dropping}
          >
            <option value="mini">Mini 5×4</option>
            <option value="classic">Classic 7×6</option>
            <option value="large">Large 9×7</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          AI:
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600"
            disabled={!!winner || !!dropping || moveHistory.length > 0}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-400 mb-2">
        ← → choose column • Space / ↓ drop • Click or tap column to drop
      </p>

      <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 w-full" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className="block w-full cursor-pointer"
          style={{ maxWidth: '100%', touchAction: 'none' }}
          onClick={canvasClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            hoverColRef.current = -1;
            setHoverCol(-1);
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={reset}
          className="btn-elite btn-elite-primary bg-amber-600 hover:bg-amber-500 text-slate-900 touch-manipulation active:scale-95"
        >
          New Game
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          className="btn-elite btn-elite-ghost text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
        >
          Undo
        </button>
        <button
          onClick={startReplay}
          disabled={moveHistory.length === 0}
          className="btn-elite btn-elite-ghost text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
        >
          Replay
        </button>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-slate-300 touch-manipulation active:scale-95">
          Close
        </button>
      </div>
    </div>
  );
}
