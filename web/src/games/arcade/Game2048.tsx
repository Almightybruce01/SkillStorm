/* 2048 — Classic tile sliding puzzle */
import { useCallback, useEffect, useState } from 'react';
import { sfxClick, sfxCorrect, sfxGameOver } from '../SoundEngine';

const SIZE = 4;
const STORAGE_KEY = 'game2048_hs';

type Grid = (number | null)[][];

function emptyGrid(): Grid {
  return Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill(null) as (number | null)[]);
}

function spawnTile(grid: Grid): Grid {
  const empty: { r: number; c: number }[] = [];
  grid.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v === null) empty.push({ r, c });
    })
  );
  if (empty.length === 0) return grid;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
  const filtered = row.filter((v) => v !== null) as number[];
  let score = 0;
  const merged: (number | null)[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      merged.push(filtered[i] * 2);
      score += filtered[i] * 2;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i += 1;
    }
  }
  while (merged.length < SIZE) merged.push(null);
  return { row: merged, score };
}

function moveGrid(grid: Grid, dir: 'up' | 'down' | 'left' | 'right'): { grid: Grid; score: number; changed: boolean } {
  let next = grid.map((row) => [...row]);
  let totalScore = 0;

  if (dir === 'left') {
    for (let r = 0; r < SIZE; r++) {
      const { row, score } = slideRow(next[r]);
      next[r] = row;
      totalScore += score;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < SIZE; r++) {
      const { row, score } = slideRow([...next[r]].reverse());
      next[r] = row.reverse();
      totalScore += score;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map((row) => row[c]);
      const { row, score } = slideRow(col);
      totalScore += score;
      row.forEach((v, r) => (next[r][c] = v));
    }
  } else {
    for (let c = 0; c < SIZE; c++) {
      const col = next.map((row) => row[c]).reverse();
      const { row, score } = slideRow(col);
      totalScore += score;
      row.reverse().forEach((v, r) => (next[r][c] = v));
    }
  }

  const changed = JSON.stringify(next) !== JSON.stringify(grid);
  if (changed && totalScore > 0) sfxCorrect();
  return { grid: next, score: totalScore, changed };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === null) return true;
      const v = grid[r][c]!;
      if (c < SIZE - 1 && grid[r][c + 1] === v) return true;
      if (r < SIZE - 1 && grid[r + 1][c] === v) return true;
    }
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

function tileColor(v: number): string {
  return TILE_COLORS[v] ?? '#3c3a32';
}

function tileTextColor(v: number): string {
  return v <= 4 ? '#776e65' : '#f9f6f2';
}

export function Game2048({ onClose }: { onClose: () => void }) {
  const [grid, setGrid] = useState<Grid>(() => spawnTile(spawnTile(emptyGrid())));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10));
  const [gameOver, setGameOver] = useState(false);

  const tryMove = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setGrid((g) => {
      const { grid: next, score: add, changed } = moveGrid(g, dir);
      if (!changed) return g;
      setScore((s) => {
        const newScore = s + add;
        const hs = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        if (newScore > hs) {
          setHighScore(newScore);
          localStorage.setItem(STORAGE_KEY, String(newScore));
        }
        return newScore;
      });
      const withSpawn = spawnTile(next);
      if (!canMove(withSpawn)) {
        setGameOver(true);
        sfxGameOver();
      }
      return withSpawn;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); tryMove('up'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); tryMove('down'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); tryMove('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); tryMove('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameOver, tryMove]);

  const newGame = useCallback(() => {
    setGrid(spawnTile(spawnTile(emptyGrid())));
    setScore(0);
    setGameOver(false);
    sfxClick();
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">2048</span>
          <span className="text-xs text-gray-600">Score: {score}</span>
          <span className="text-xs text-gray-500">Best: {highScore}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={newGame}
            className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            New Game
          </button>
          <button
            onClick={() => { sfxClick(); onClose(); }}
            className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
      <div className="p-4">
        <div
          className="inline-block p-2 rounded-lg bg-gray-300"
          style={{ aspectRatio: '1', width: 'min(320px, 100%)' }}
        >
          <div className="grid grid-cols-4 gap-2 h-full w-full">
            {grid.flat().map((v, i) => (
              <div
                key={i}
                className="rounded-md flex items-center justify-center font-bold text-lg transition-all duration-150"
                style={{
                  backgroundColor: v ? tileColor(v) : 'rgba(238, 228, 218, 0.35)',
                  color: v ? tileTextColor(v) : 'transparent',
                }}
              >
                {v ?? ''}
              </div>
            ))}
          </div>
        </div>
        {gameOver && (
          <div className="mt-4 p-4 rounded-lg bg-gray-100 border border-gray-200 text-center">
            <p className="text-gray-800 font-bold mb-2">Game Over</p>
            <p className="text-sm text-gray-600 mb-3">No moves left. Final score: {score}</p>
            <button
              onClick={newGame}
              className="px-4 py-2 text-sm font-medium bg-gray-800 text-gray-800 rounded hover:bg-gray-700"
            >
              Play Again
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500 text-center">Use arrow keys to slide tiles</p>
      </div>
    </div>
  );
}
