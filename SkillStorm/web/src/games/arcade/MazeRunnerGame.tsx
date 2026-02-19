/* ═══════════════════════════════════════════════════════════
   MAZE RUNNER — Arcade Game
   Canvas-based maze game with levels, coins, minimap, and scoring
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  onClose: () => void;
}

type Direction = 'up' | 'down' | 'left' | 'right' | null;
type Cell = { r: number; c: number };

const WALL = 1;
const PASS = 0;

const LEVEL_CONFIGS = [
  { size: 8, coinCount: 3 },
  { size: 12, coinCount: 5 },
  { size: 16, coinCount: 8 },
];

const COLORS = {
  wall: '#374151',
  floor: '#f8fafc',
  player: '#6C5CE7',
  exit: '#10b981',
  coin: '#eab308',
};

const CELL_SIZE = 30;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const MINIMAP_SIZE = 120;
const PLAYER_RADIUS = 10;
const COIN_RADIUS = 6;

// Recursive backtracking maze generation
function generateMaze(rows: number, cols: number): number[][] {
  const grid: number[][] = Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(WALL));

  function carve(r: number, c: number) {
    grid[r][c] = PASS;
    const directions = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    // Shuffle directions
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 1 && nr < rows - 1 && nc >= 1 && nc < cols - 1 && grid[nr][nc] === WALL) {
        grid[(r + nr) / 2][(c + nc) / 2] = PASS;
        carve(nr, nc);
      }
    }
  }

  // Start carving from (1, 1)
  carve(1, 1);
  grid[1][1] = PASS;
  grid[rows - 2][cols - 2] = PASS; // Ensure exit is passable

  return grid;
}

function generateCoins(maze: number[][], count: number, startCell: Cell, exitCell: Cell): Cell[] {
  const coins: Cell[] = [];
  const rows = maze.length;
  const cols = maze[0].length;
  const attempts = count * 10; // Try multiple times to place coins

  for (let i = 0; i < attempts && coins.length < count; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    // Don't place coins on walls, start, or exit
    if (
      maze[r][c] === PASS &&
      !(r === startCell.r && c === startCell.c) &&
      !(r === exitCell.r && c === exitCell.c) &&
      !coins.some((coin) => coin.r === r && coin.c === c)
    ) {
      coins.push({ r, c });
    }
  }

  return coins;
}

export default function MazeRunnerGame({ onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [maze, setMaze] = useState<number[][]>([]);
  const [player, setPlayer] = useState<Cell>({ r: 1, c: 1 });
  const [direction, setDirection] = useState<Direction>(null);
  const [coins, setCoins] = useState<Cell[]>([]);
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [explored, setExplored] = useState<Set<string>>(new Set());
  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [time, setTime] = useState(0);
  const [score, setScore] = useState(0);
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();
  const lastMoveTimeRef = useRef<number>(0);

  const config = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];
  const mazeSize = config.size;
  const startCell = { r: 1, c: 1 };
  const exitCell = { r: mazeSize - 2, c: mazeSize - 2 };

  // Initialize game
  const startGame = useCallback(() => {
    const newMaze = generateMaze(mazeSize, mazeSize);
    const newCoins = generateCoins(newMaze, config.coinCount, startCell, exitCell);
    setMaze(newMaze);
    setPlayer(startCell);
    setDirection(null);
    setCoins(newCoins);
    setCollectedCoins(0);
    setExplored(new Set([`${startCell.r},${startCell.c}`]));
    setGameStarted(true);
    setGameWon(false);
    setGameOver(false);
    setTime(0);
    setScore(0);
    setCamera({ x: 0, y: 0 });
  }, [mazeSize, config.coinCount]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameWon || gameOver) return;

    const interval = setInterval(() => {
      setTime((t) => t + 0.1);
    }, 100);

    return () => clearInterval(interval);
  }, [gameStarted, gameWon, gameOver]);

  // Keyboard input handling
  useEffect(() => {
    if (!gameStarted || gameWon || gameOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        arrowup: 'up',
        arrowdown: 'down',
        arrowleft: 'left',
        arrowright: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      if (keyMap[key]) {
        e.preventDefault();
        keysRef.current.add(keyMap[key]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const keyMap: Record<string, string> = {
        arrowup: 'up',
        arrowdown: 'down',
        arrowleft: 'left',
        arrowright: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      if (keyMap[key]) {
        keysRef.current.delete(keyMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameStarted, gameWon, gameOver]);

  // Player movement
  useEffect(() => {
    if (!gameStarted || gameWon || gameOver || maze.length === 0) return;

    const moveInterval = setInterval(() => {
      const now = Date.now();
      if (now - lastMoveTimeRef.current < 100) return; // Throttle movement
      lastMoveTimeRef.current = now;

      const keys = keysRef.current;
      let newDirection: Direction = null;
      let newPlayer = { ...player };

      if (keys.has('up')) {
        newDirection = 'up';
        if (player.r > 0 && maze[player.r - 1][player.c] === PASS) {
          newPlayer.r = player.r - 1;
        }
      } else if (keys.has('down')) {
        newDirection = 'down';
        if (player.r < mazeSize - 1 && maze[player.r + 1][player.c] === PASS) {
          newPlayer.r = player.r + 1;
        }
      } else if (keys.has('left')) {
        newDirection = 'left';
        if (player.c > 0 && maze[player.r][player.c - 1] === PASS) {
          newPlayer.c = player.c - 1;
        }
      } else if (keys.has('right')) {
        newDirection = 'right';
        if (player.c < mazeSize - 1 && maze[player.r][player.c + 1] === PASS) {
          newPlayer.c = player.c + 1;
        }
      }

      if (newPlayer.r !== player.r || newPlayer.c !== player.c) {
        setPlayer(newPlayer);
        setDirection(newDirection);
        setExplored((prev) => new Set(prev).add(`${newPlayer.r},${newPlayer.c}`));

        // Check for coin collection
        setCoins((prevCoins) => {
          const remaining = prevCoins.filter(
            (coin) => !(coin.r === newPlayer.r && coin.c === newPlayer.c)
          );
          if (remaining.length < prevCoins.length) {
            setCollectedCoins((c) => c + 1);
          }
          return remaining;
        });

        // Check win condition
        if (newPlayer.r === exitCell.r && newPlayer.c === exitCell.c) {
          const baseScore = 1000;
          const timeBonus = Math.max(0, Math.floor(5000 - time * 10));
          const coinBonus = collectedCoins * 100;
          const levelBonus = level * 500;
          setScore(baseScore + timeBonus + coinBonus + levelBonus);
          setGameWon(true);
        }
      } else if (newDirection !== null) {
        setDirection(newDirection);
      }
    }, 50);

    return () => clearInterval(moveInterval);
  }, [gameStarted, gameWon, gameOver, maze, player, mazeSize, exitCell, collectedCoins, level, time]);

  // Camera following player
  useEffect(() => {
    if (!gameStarted || maze.length === 0) return;

    const cellSize = CELL_SIZE;
    const playerX = player.c * cellSize + cellSize / 2;
    const playerY = player.r * cellSize + cellSize / 2;
    const mazeWidth = mazeSize * cellSize;
    const mazeHeight = mazeSize * cellSize;

    let targetX = CANVAS_WIDTH / 2 - playerX;
    let targetY = CANVAS_HEIGHT / 2 - playerY;

    // Clamp camera to maze bounds
    targetX = Math.max(CANVAS_WIDTH - mazeWidth, Math.min(0, targetX));
    targetY = Math.max(CANVAS_HEIGHT - mazeHeight, Math.min(0, targetY));

    // Smooth camera movement
    setCamera((prev) => ({
      x: prev.x + (targetX - prev.x) * 0.1,
      y: prev.y + (targetY - prev.y) * 0.1,
    }));
  }, [player, gameStarted, maze.length, mazeSize]);

  // Render main canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || maze.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = CELL_SIZE;

    // Clear canvas
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply camera transform
    ctx.save();
    ctx.translate(camera.x, camera.y);

    // Draw maze
    for (let r = 0; r < mazeSize; r++) {
      for (let c = 0; c < mazeSize; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        if (maze[r][c] === WALL) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, cellSize, cellSize);
        } else {
          // Draw floor
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(x, y, cellSize, cellSize);

          // Draw explored area highlight
          if (explored.has(`${r},${c}`)) {
            ctx.fillStyle = 'rgba(108, 92, 231, 0.1)';
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
    }

    // Draw exit (star/flag)
    const exitX = exitCell.c * cellSize + cellSize / 2;
    const exitY = exitCell.r * cellSize + cellSize / 2;
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    // Draw star shape
    const starPoints = 5;
    const outerRadius = cellSize * 0.3;
    const innerRadius = outerRadius * 0.5;
    for (let i = 0; i < starPoints * 2; i++) {
      const angle = (i * Math.PI) / starPoints;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = exitX + Math.cos(angle - Math.PI / 2) * radius;
      const py = exitY + Math.sin(angle - Math.PI / 2) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Draw coins
    ctx.fillStyle = COLORS.coin;
    coins.forEach((coin) => {
      const coinX = coin.c * cellSize + cellSize / 2;
      const coinY = coin.r * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(coinX, coinY, COIN_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // Add shine effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(coinX - 2, coinY - 2, COIN_RADIUS * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.coin;
    });

    // Draw player
    const playerX = player.c * cellSize + cellSize / 2;
    const playerY = player.r * cellSize + cellSize / 2;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(playerX, playerY, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Draw direction indicator
    if (direction) {
      ctx.fillStyle = '#ffffff';
      const indicatorSize = 4;
      let indicatorX = playerX;
      let indicatorY = playerY;

      switch (direction) {
        case 'up':
          indicatorY -= PLAYER_RADIUS * 0.6;
          break;
        case 'down':
          indicatorY += PLAYER_RADIUS * 0.6;
          break;
        case 'left':
          indicatorX -= PLAYER_RADIUS * 0.6;
          break;
        case 'right':
          indicatorX += PLAYER_RADIUS * 0.6;
          break;
      }

      ctx.beginPath();
      ctx.arc(indicatorX, indicatorY, indicatorSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Request next frame
    animationFrameRef.current = requestAnimationFrame(() => {
      // Re-render will be triggered by state changes
    });
  }, [maze, player, direction, coins, explored, camera, exitCell, mazeSize]);

  // Render minimap
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas || maze.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = MINIMAP_SIZE / mazeSize;

    // Clear minimap
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw maze
    for (let r = 0; r < mazeSize; r++) {
      for (let c = 0; c < mazeSize; c++) {
        const x = c * cellSize;
        const y = r * cellSize;

        if (maze[r][c] === WALL) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, cellSize, cellSize);
        } else if (explored.has(`${r},${c}`)) {
          ctx.fillStyle = COLORS.player;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // Draw exit
    ctx.fillStyle = COLORS.exit;
    ctx.fillRect(exitCell.c * cellSize, exitCell.r * cellSize, cellSize, cellSize);

    // Draw coins
    ctx.fillStyle = COLORS.coin;
    coins.forEach((coin) => {
      ctx.fillRect(coin.c * cellSize, coin.r * cellSize, cellSize, cellSize);
    });

    // Draw player
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(player.c * cellSize, player.r * cellSize, cellSize, cellSize);
  }, [maze, player, coins, explored, exitCell, mazeSize]);

  // Handle level progression
  const handleNextLevel = () => {
    if (level < LEVEL_CONFIGS.length) {
      setLevel(level + 1);
      startGame();
    } else {
      setGameOver(true);
    }
  };

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Maze Dash</h2>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Exit
        </button>
      </div>

      {!gameStarted ? (
        <div className="text-center">
          <p className="text-gray-700 mb-4">
            Navigate through the maze to reach the exit! Collect coins for bonus points.
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Use Arrow Keys or WASD to move
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start Game
          </button>
        </div>
      ) : (
        <>
          {/* HUD */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-600">Level: </span>
                <span className="font-semibold text-gray-900">{level}</span>
              </div>
              <div>
                <span className="text-gray-600">Time: </span>
                <span className="font-semibold text-gray-900">{time.toFixed(1)}s</span>
              </div>
              <div>
                <span className="text-gray-600">Coins: </span>
                <span className="font-semibold text-gray-900">{collectedCoins}/{config.coinCount}</span>
              </div>
              <div>
                <span className="text-gray-600">Score: </span>
                <span className="font-semibold text-gray-900">{score}</span>
              </div>
            </div>
          </div>

          {/* Game Canvas */}
          <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="block"
            />

            {/* Minimap */}
            <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded p-1 shadow-lg">
              <canvas
                ref={minimapRef}
                width={MINIMAP_SIZE}
                height={MINIMAP_SIZE}
                className="block"
              />
            </div>

            {/* Win Screen */}
            {gameWon && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-95">
                <div className="text-center p-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Level Complete!</h3>
                  <div className="space-y-2 mb-4 text-gray-700">
                    <p>Time: {time.toFixed(1)}s</p>
                    <p>Coins Collected: {collectedCoins}/{config.coinCount}</p>
                    <p className="text-lg font-semibold">Score: {score}</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    {level < LEVEL_CONFIGS.length ? (
                      <button
                        onClick={handleNextLevel}
                        className="px-6 py-2 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Next Level
                      </button>
                    ) : (
                      <button
                        onClick={() => setGameOver(true)}
                        className="px-6 py-2 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Finish Game
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Screen */}
            {gameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-95">
                <div className="text-center p-6">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Game Complete!</h3>
                  <div className="space-y-2 mb-4 text-gray-700">
                    <p>Final Score: {score}</p>
                    <p>Levels Completed: {level}</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setLevel(1);
                        startGame();
                      }}
                      className="px-6 py-2 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Play Again
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
