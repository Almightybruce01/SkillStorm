/* Minesweeper — Classic 10x10 grid, 15 mines */
import { useCallback, useEffect, useState } from 'react';
import { sfxClick, sfxCorrect, sfxGameOver, sfxPop } from '../SoundEngine';

const ROWS = 10;
const COLS = 10;
const MINES = 15;

type CellState = 'hidden' | 'revealed' | 'flagged';
type Cell = { isMine: boolean; neighborCount: number; state: CellState };

function createBoard(): Cell[][] {
  const grid: Cell[][] = Array(ROWS)
    .fill(null)
    .map(() =>
      Array(COLS)
        .fill(null)
        .map(() => ({ isMine: false, neighborCount: 0, state: 'hidden' as CellState }))
    );
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!grid[r][c].isMine) {
      grid[r][c].isMine = true;
      placed++;
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c].isMine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].isMine) n++;
        }
      }
      grid[r][c].neighborCount = n;
    }
  }
  return grid;
}

const NUMBER_COLORS: Record<number, string> = {
  1: '#1e40af',
  2: '#15803d',
  3: '#b91c1c',
  4: '#6b21a8',
  5: '#c2410c',
  6: '#0e7490',
  7: '#374151',
  8: '#4b5563',
};

export function MinesweeperGame({ onClose }: { onClose: () => void }) {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [flagsLeft, setFlagsLeft] = useState(MINES);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (gameOver !== null) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [gameOver, startTime]);

  const floodReveal = useCallback((grid: Cell[][], r: number, c: number): Cell[][] => {
    const next = grid.map((row) => row.map((cell) => ({ ...cell })));
    const stack: [number, number][] = [[r, c]];
    while (stack.length > 0) {
      const [y, x] = stack.pop()!;
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      const cell = next[y][x];
      if (cell.state !== 'hidden' || cell.isMine) continue;
      cell.state = 'revealed';
      if (cell.neighborCount === 0) {
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) stack.push([y + dr, x + dc]);
      }
    }
    return next;
  }, []);

  const reveal = useCallback(
    (r: number, c: number) => {
      if (gameOver !== null) return;
      const cell = board[r][c];
      if (cell.state !== 'hidden') return;
      if (cell.isMine) {
        setGameOver('lose');
        sfxGameOver();
        setBoard((prev) =>
          prev.map((row) =>
            row.map((c) => (c.isMine ? { ...c, state: 'revealed' as CellState } : { ...c }))
          )
        );
        return;
      }
      setBoard((prev) => {
        const next =
          cell.neighborCount === 0
            ? floodReveal(prev, r, c)
            : prev.map((row, ri) =>
                row.map((cel, ci) =>
                  ri === r && ci === c ? { ...cel, state: 'revealed' as CellState } : { ...cel }
                )
              );
        const revealed = next.flat().filter((x) => x.state === 'revealed').length;
        if (revealed === ROWS * COLS - MINES) {
          setGameOver('win');
          sfxCorrect();
        }
        return next;
      });
      sfxPop();
    },
    [board, gameOver, floodReveal]
  );

  const toggleFlag = useCallback(
    (r: number, c: number) => {
      if (gameOver !== null) return;
      const cell = board[r][c];
      if (cell.state !== 'hidden') return;
      setBoard((prev) =>
        prev.map((row, ri) =>
          row.map((cel, ci) =>
            ri === r && ci === c
              ? { ...cel, state: cel.state === 'flagged' ? ('hidden' as CellState) : ('flagged' as CellState) }
              : { ...cel }
          )
        )
      );
      setFlagsLeft((f) => (board[r][c].state === 'flagged' ? f + 1 : f - 1));
      sfxClick();
    },
    [board, gameOver]
  );

  const newGame = useCallback(() => {
    setBoard(createBoard());
    setGameOver(null);
    setFlagsLeft(MINES);
    setElapsed(0);
    sfxClick();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">💣 Minesweeper</span>
          <span className="text-xs text-gray-600">⏱ {elapsed}s</span>
          <span className="text-xs text-gray-600">🚩 {flagsLeft}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={newGame}
            className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            New Game
          </button>
          <button
            onClick={() => {
              sfxClick();
              onClose();
            }}
            className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
      <div className="p-4">
        <div className="inline-block border-2 border-gray-300 rounded overflow-hidden">
          <div className="grid gap-0.5 p-0.5 bg-gray-300" style={{ gridTemplateColumns: `repeat(${COLS}, 28px)` }}>
            {board.flatMap((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  className="w-7 h-7 border border-gray-400 rounded flex items-center justify-center text-sm font-bold select-none"
                  style={{
                    backgroundColor: cell.state === 'revealed' ? '#f3f4f6' : '#e5e7eb',
                    color:
                      cell.state === 'revealed' && !cell.isMine
                        ? NUMBER_COLORS[cell.neighborCount] ?? '#111'
                        : '#374151',
                  }}
                  onClick={() => reveal(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                  }}
                  disabled={gameOver !== null}
                >
                  {cell.state === 'flagged' && '🚩'}
                  {cell.state === 'revealed' && cell.isMine && '💣'}
                  {cell.state === 'revealed' &&
                    !cell.isMine &&
                    cell.neighborCount > 0 &&
                    cell.neighborCount}
                </button>
              ))
            )}
          </div>
        </div>
        {(gameOver === 'win' || gameOver === 'lose') && (
          <div className="mt-4 p-4 rounded-lg bg-gray-100 border border-gray-200 text-center">
            <p className="text-gray-800 font-bold mb-2">
              {gameOver === 'win' ? 'You win!' : 'Game Over'}
            </p>
            <p className="text-sm text-gray-600 mb-3">
              {gameOver === 'win' ? `Completed in ${elapsed}s` : 'You hit a mine!'}
            </p>
            <button
              onClick={newGame}
              className="px-4 py-2 text-sm font-medium bg-gray-800 text-gray-800 rounded hover:bg-gray-700"
            >
              Play Again
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500 text-center">
          Left click: reveal · Right click: flag
        </p>
      </div>
    </div>
  );
}
