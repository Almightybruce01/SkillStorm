/* ═══════════════════════════════════════════════════════════════════════════════
   CROSSWORD MINI — Elite Canvas-Based Crossword Puzzle Game
   Procedural generation, multiple sizes, categories, hints, confetti, statistics
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

/* ── Types ──────────────────────────────────────────────────────────────────── */
type PuzzleSize = 'mini' | 'standard' | 'large';
type WordCategory = 'general' | 'science' | 'geography' | 'history' | 'sports' | 'technology';
type Difficulty = 'easy' | 'medium' | 'hard';

interface WordEntry {
  word: string;
  clue: string;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

interface Puzzle {
  size: number;
  grid: (string | null)[][]; // null = block
  placedWords: PlacedWord[];
  solution: string[][];
}

interface CellState {
  letter: string;
  isBlock: boolean;
  number?: number;
  across?: number;
  down?: number;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  w: number;
  h: number;
}

interface LetterPop {
  r: number;
  c: number;
  letter: string;
  progress: number;
}

/* ── Constants ───────────────────────────────────────────────────────────────── */
const SIZE_CONFIG: Record<PuzzleSize, number> = {
  mini: 5,
  standard: 9,
  large: 13,
};

const DIFFICULTY_CONFIG: Record<Difficulty, { maxWordLength: number; minWordLength: number }> = {
  easy: { maxWordLength: 6, minWordLength: 3 },
  medium: { maxWordLength: 8, minWordLength: 4 },
  hard: { maxWordLength: 12, minWordLength: 5 },
};

/* ── Word Banks by Category (word, clue) ─────────────────────────────────────── */
const WORD_BANKS: Record<WordCategory, WordEntry[]> = {
  general: [
    { word: 'BRAVE', clue: 'Courageous' },
    { word: 'OCEAN', clue: 'Large body of salt water' },
    { word: 'MUSIC', clue: 'Songs and melodies' },
    { word: 'LIGHT', clue: 'Illumination' },
    { word: 'HEART', clue: 'Valentine symbol' },
    { word: 'STARS', clue: 'Things in the night sky' },
    { word: 'IDEAL', clue: 'Perfect situation' },
    { word: 'EARTH', clue: 'Our planet' },
    { word: 'ARTS', clue: 'Creative pursuits' },
    { word: 'TREND', clue: 'Current fashion' },
    { word: 'HANDS', clue: 'Body parts at end of arms' },
    { word: 'EAR', clue: 'Listen with this' },
    { word: 'ARE', clue: 'Form of "be"' },
    { word: 'ART', clue: 'Greek god of war' },
    { word: 'RUG', clue: 'Floor covering' },
    { word: 'TEA', clue: 'Beverage from leaves' },
    { word: 'ERA', clue: 'Historical period' },
    { word: 'NET', clue: 'Catch fish' },
    { word: 'ORE', clue: 'Mineral deposit' },
    { word: 'ERA', clue: 'Time period' },
    { word: 'RAT', clue: 'Rodent' },
    { word: 'TEN', clue: 'Number after nine' },
    { word: 'ERA', clue: 'Epoch' },
    { word: 'USE', clue: 'Utilize' },
    { word: 'SAG', clue: 'Droop' },
    { word: 'ICE', clue: 'Frozen water' },
    { word: 'LOG', clue: 'Wood record' },
    { word: 'AGE', clue: 'Years lived' },
    { word: 'SUN', clue: 'Star we orbit' },
    { word: 'MAP', clue: 'Geographic guide' },
  ],
  science: [
    { word: 'ATOM', clue: 'Smallest unit of matter' },
    { word: 'GENE', clue: 'DNA unit' },
    { word: 'CELL', clue: 'Basic unit of life' },
    { word: 'ACID', clue: 'pH below 7' },
    { word: 'MASS', clue: 'Amount of matter' },
    { word: 'WAVE', clue: 'Energy oscillation' },
    { word: 'BOND', clue: 'Chemical link' },
    { word: 'LENS', clue: 'Light-focusing glass' },
    { word: 'HEAT', clue: 'Thermal energy' },
    { word: 'GAS', clue: 'State of matter' },
    { word: 'ORBIT', clue: 'Planetary path' },
    { word: 'PHASE', clue: 'State of matter' },
    { word: 'FORCE', clue: 'Push or pull' },
    { word: 'ION', clue: 'Charged particle' },
    { word: 'LAB', clue: 'Research room' },
    { word: 'DNA', clue: 'Genetic code' },
    { word: 'RNA', clue: 'Genetic messenger' },
    { word: 'OMEGA', clue: 'Last Greek letter' },
    { word: 'ZETA', clue: 'Sixth Greek letter' },
    { word: 'BETA', clue: 'Second Greek letter' },
    { word: 'RAY', clue: 'Light beam' },
    { word: 'SOL', clue: 'Sun in Latin' },
    { word: 'NEBULA', clue: 'Cloud of gas in space' },
    { word: 'QUARK', clue: 'Subatomic particle' },
    { word: 'PHOTON', clue: 'Light particle' },
  ],
  geography: [
    { word: 'ASIA', clue: 'Largest continent' },
    { word: 'NILE', clue: 'Longest river' },
    { word: 'ALPS', clue: 'European mountain range' },
    { word: 'ISLE', clue: 'Small island' },
    { word: 'BAY', clue: 'Coastal inlet' },
    { word: 'GULF', clue: 'Large sea inlet' },
    { word: 'DUNE', clue: 'Sand hill' },
    { word: 'MAP', clue: 'Geographic guide' },
    { word: 'ATLAS', clue: 'Book of maps' },
    { word: 'EQUATOR', clue: 'Zero latitude line' },
    { word: 'ARCTIC', clue: 'North polar region' },
    { word: 'DESERT', clue: 'Dry landscape' },
    { word: 'RIVER', clue: 'Flowing water body' },
    { word: 'DELTA', clue: 'River mouth formation' },
    { word: 'OASIS', clue: 'Desert water source' },
    { word: 'COAST', clue: 'Land meets sea' },
    { word: 'PORT', clue: 'Harbor city' },
    { word: 'CAPE', clue: 'Coastal headland' },
    { word: 'REEF', clue: 'Underwater ridge' },
    { word: 'MESA', clue: 'Flat-topped hill' },
    { word: 'TUNDRA', clue: 'Frozen plain' },
    { word: 'SAHARA', clue: 'African desert' },
    { word: 'AMAZON', clue: 'South American river' },
  ],
  history: [
    { word: 'ROME', clue: 'Ancient empire capital' },
    { word: 'WAR', clue: 'Armed conflict' },
    { word: 'ERA', clue: 'Historical period' },
    { word: 'KING', clue: 'Monarch' },
    { word: 'QUEEN', clue: 'Female monarch' },
    { word: 'EMPIRE', clue: 'Large territory under one rule' },
    { word: 'DYNASTY', clue: 'Ruling family' },
    { word: 'TRIBE', clue: 'Early social group' },
    { word: 'TREATY', clue: 'Formal agreement' },
    { word: 'REVOLUTION', clue: 'Overthrow of government' },
    { word: 'COLONY', clue: 'Territory under foreign rule' },
    { word: 'MEDIEVAL', clue: 'Middle Ages' },
    { word: 'RENAISSANCE', clue: 'Cultural rebirth period' },
    { word: 'ANCIENT', clue: 'Very old' },
    { word: 'BATTLE', clue: 'Military engagement' },
    { word: 'CROWN', clue: 'Royal headwear' },
    { word: 'SWORD', clue: 'Bladed weapon' },
    { word: 'CAVE', clue: 'Early human dwelling' },
  ],
  sports: [
    { word: 'GOAL', clue: 'Score in soccer' },
    { word: 'TEAM', clue: 'Group of players' },
    { word: 'BASE', clue: 'Baseball plate' },
    { word: 'NET', clue: 'Volleyball divider' },
    { word: 'RACE', clue: 'Speed competition' },
    { word: 'BAT', clue: 'Baseball stick' },
    { word: 'GOLF', clue: 'Club and ball game' },
    { word: 'TENNIS', clue: 'Racket sport' },
    { word: 'ARENA', clue: 'Sports venue' },
    { word: 'MATCH', clue: 'Game or contest' },
    { word: 'REF', clue: 'Game official' },
    { word: 'DRAFT', clue: 'Player selection' },
    { word: 'SPIKE', clue: 'Volleyball attack' },
    { word: 'LAP', clue: 'Pool length' },
    { word: 'GAME', clue: 'Sport contest' },
    { word: 'COACH', clue: 'Team trainer' },
    { word: 'ROSTER', clue: 'Team member list' },
  ],
  technology: [
    { word: 'CODE', clue: 'Programming instructions' },
    { word: 'APP', clue: 'Software application' },
    { word: 'WIFI', clue: 'Wireless internet' },
    { word: 'BYTE', clue: '8 bits' },
    { word: 'BUG', clue: 'Software error' },
    { word: 'ROBOT', clue: 'Automated machine' },
    { word: 'CHIP', clue: 'Microprocessor' },
    { word: 'PIXEL', clue: 'Screen dot' },
    { word: 'CLOUD', clue: 'Remote data storage' },
    { word: 'LOGIN', clue: 'Account access' },
    { word: 'EMAIL', clue: 'Electronic mail' },
    { word: 'MOUSE', clue: 'Pointing device' },
    { word: 'KEYBOARD', clue: 'Typing device' },
    { word: 'SCREEN', clue: 'Display surface' },
    { word: 'LAPTOP', clue: 'Portable computer' },
    { word: 'SERVER', clue: 'Network computer' },
    { word: 'DATA', clue: 'Digital information' },
    { word: 'ALGORITHM', clue: 'Step-by-step procedure' },
    { word: 'BROWSER', clue: 'Web viewer' },
  ],
};

/* ── Procedural Crossword Generator ──────────────────────────────────────────── */
function generateCrossword(
  size: PuzzleSize,
  category: WordCategory,
  difficulty: Difficulty
): Puzzle {
  const dim = SIZE_CONFIG[size];
  const { minWordLength, maxWordLength } = DIFFICULTY_CONFIG[difficulty];
  const grid: (string | null)[][] = Array(dim)
    .fill(null)
    .map(() => Array(dim).fill(null));

  const solution: string[][] = Array(dim)
    .fill(null)
    .map(() => Array(dim).fill(''));

  const words = WORD_BANKS[category].filter(
    (w) => w.word.length >= minWordLength && w.word.length <= maxWordLength
  );

  if (words.length < 3) {
    return generateFallbackPuzzle(dim);
  }

  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const placedWords: PlacedWord[] = [];
  let clueNum = 1;

  function canPlace(
    word: string,
    row: number,
    col: number,
    dir: 'across' | 'down'
  ): boolean {
    const len = word.length;
    if (dir === 'across') {
      if (col + len > dim) return false;
      for (let i = 0; i < len; i++) {
        const cell = grid[row][col + i];
        if (cell !== null && cell !== word[i]) return false;
      }
      return true;
    } else {
      if (row + len > dim) return false;
      for (let i = 0; i < len; i++) {
        const cell = grid[row + i][col];
        if (cell !== null && cell !== word[i]) return false;
      }
      return true;
    }
  }

  function placeWord(
    word: string,
    clue: string,
    row: number,
    col: number,
    dir: 'across' | 'down',
    num: number
  ) {
    const len = word.length;
    for (let i = 0; i < len; i++) {
      if (dir === 'across') {
        grid[row][col + i] = word[i];
        solution[row][col + i] = word[i];
      } else {
        grid[row + i][col] = word[i];
        solution[row + i][col] = word[i];
      }
    }
    placedWords.push({ word, clue, row, col, direction: dir, number: num });
  }

  const centerR = Math.floor(dim / 2);
  const centerC = Math.floor(dim / 2);

  let firstWord = shuffled.find((w) => w.word.length <= dim - 2 && w.word.length >= 3);
  if (!firstWord) firstWord = shuffled[0];

  const firstLen = firstWord.word.length;
  const firstStart = Math.max(0, centerC - Math.floor(firstLen / 2));
  if (canPlace(firstWord.word, centerR, firstStart, 'across')) {
    placeWord(firstWord.word, firstWord.clue, centerR, firstStart, 'across', clueNum++);
  }

  for (let attempt = 0; attempt < 80; attempt++) {
    let placed = false;
    for (const entry of shuffled) {
      if (placedWords.some((p) => p.word === entry.word)) continue;
      const word = entry.word;
      const len = word.length;

      for (let r = 0; r < dim && !placed; r++) {
        for (let c = 0; c < dim && !placed; c++) {
          for (let i = 0; i < len; i++) {
            const cellAcross = grid[r]?.[c + i];
            const cellDown = grid[r + i]?.[c];
            if (cellAcross === word[i] && i > 0) {
              const startC = c;
              if (canPlace(word, r, startC, 'across')) {
                placeWord(word, entry.clue, r, startC, 'across', clueNum++);
                placed = true;
                break;
              }
            }
            if (cellDown === word[i] && i > 0) {
              const startR = r;
              if (canPlace(word, startR, c, 'down')) {
                placeWord(word, entry.clue, startR, c, 'down', clueNum++);
                placed = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (grid[r][c] === null && solution[r][c] === '') {
        grid[r][c] = '#';
      }
    }
  }

  return { size: dim, grid, placedWords, solution };
}

function generateFallbackPuzzle(dim: number): Puzzle {
  const fallbacks: { word: string; clue: string }[] = [
    { word: 'HEART', clue: 'Valentine symbol' },
    { word: 'EARTH', clue: 'Our planet' },
    { word: 'MUSIC', clue: 'Songs' },
  ];
  const grid: (string | null)[][] = Array(dim)
    .fill(null)
    .map(() => Array(dim).fill(null));
  const solution: string[][] = Array(dim)
    .fill(null)
    .map(() => Array(dim).fill(''));
  const placedWords: PlacedWord[] = [];

  const w = fallbacks[0];
  const start = Math.max(0, Math.floor(dim / 2) - Math.floor(w.word.length / 2));
  for (let i = 0; i < w.word.length; i++) {
    grid[Math.floor(dim / 2)][start + i] = w.word[i];
    solution[Math.floor(dim / 2)][start + i] = w.word[i];
  }
  placedWords.push({
    word: w.word,
    clue: w.clue,
    row: Math.floor(dim / 2),
    col: start,
    direction: 'across',
    number: 1,
  });

  for (let r = 0; r < dim; r++) {
    for (let c = 0; c < dim; c++) {
      if (grid[r][c] === null) grid[r][c] = '#';
    }
  }

  return { size: dim, grid, placedWords, solution };
}

function buildNumberedCells(puzzle: Puzzle): (CellState | null)[][] {
  const { grid } = puzzle;
  const size = grid.length;
  const cells: (CellState | null)[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '#') {
        cells[r][c] = null;
        continue;
      }
      const startsAcross = c === 0 || grid[r][c - 1] === '#';
      const startsDown = r === 0 || grid[r - 1]?.[c] === '#';
      const needsNumber = startsAcross || startsDown;
      cells[r][c] = {
        letter: '',
        isBlock: false,
        number: undefined,
        across: undefined,
        down: undefined,
      };
    }
  }

  let clueNum = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cells[r][c];
      if (!cell) continue;
      const startsAcross = c === 0 || grid[r][c - 1] === '#';
      const startsDown = r === 0 || grid[r - 1]?.[c] === '#';
      if (startsAcross || startsDown) {
        cell.number = clueNum;
        if (startsAcross) cell.across = clueNum;
        if (startsDown) cell.down = clueNum;
        clueNum++;
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = cells[r][c];
      if (!cell) continue;
      if (cell.across === undefined && c > 0) {
        const left = cells[r][c - 1] as CellState | null;
        if (left) cell.across = left.across;
      }
      if (cell.down === undefined && r > 0) {
        const up = cells[r - 1]?.[c] as CellState | null;
        if (up) cell.down = up.down;
      }
    }
  }

  return cells;
}

/* ── localStorage ────────────────────────────────────────────────────────────── */
const STATS_KEY = 'skillzstorm_crossword_stats';
const HISCORE_KEY = 'skillzstorm_crossword_hiscore';

interface CrosswordStats {
  puzzlesCompleted: number;
  totalTime: number;
  times: number[];
}

function loadStats(): CrosswordStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { puzzlesCompleted: 0, totalTime: 0, times: [] };
}

function saveStats(stats: CrosswordStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

function loadHighScore(sizeKey: string): number {
  try {
    const raw = localStorage.getItem(HISCORE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return obj[sizeKey] ?? 0;
    }
  } catch {}
  return 0;
}

function saveHighScore(sizeKey: string, score: number) {
  try {
    const raw = localStorage.getItem(HISCORE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if (score > (obj[sizeKey] ?? 0)) {
      obj[sizeKey] = score;
      localStorage.setItem(HISCORE_KEY, JSON.stringify(obj));
    }
  } catch {}
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export default function CrosswordMini({ onClose }: { onClose: () => void }) {
  const [puzzleSize, setPuzzleSize] = useState<PuzzleSize>('mini');
  const [category, setCategory] = useState<WordCategory>('general');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [cells, setCells] = useState<(CellState | null)[][]>([]);
  const [userLetters, setUserLetters] = useState<string[][]>([]);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [showErrors, setShowErrors] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [wordFlashProgress, setWordFlashProgress] = useState<number>(0);
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
  const [letterPops, setLetterPops] = useState<LetterPop[]>([]);
  const [showStats, setShowStats] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const confettiStartRef = useRef<number>(0);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [touchSelectPending, setTouchSelectPending] = useState(false);

  const size = puzzle?.size ?? 5;
  const cellSize = Math.min(48, 320 / size);
  const padding = 4;

  const cluesAcross =
    puzzle?.placedWords.filter((p) => p.direction === 'across').sort((a, b) => a.number - b.number) ?? [];
  const cluesDown =
    puzzle?.placedWords.filter((p) => p.direction === 'down').sort((a, b) => a.number - b.number) ?? [];

  const selectedCell = selected ? cells[selected.r]?.[selected.c] : null;
  const activeClueNum =
    selectedCell && !selectedCell.isBlock
      ? direction === 'across'
        ? selectedCell.across
        : selectedCell.down
      : null;

  const getWordCells = useCallback(
    (r: number, c: number, dir: 'across' | 'down'): { r: number; c: number }[] => {
      const cell = cells[r]?.[c];
      if (!cell || cell.isBlock) return [];
      const num = dir === 'across' ? cell.across : cell.down;
      if (num === undefined) return [];

      const out: { r: number; c: number }[] = [];
      if (dir === 'across') {
        let cc = c;
        while (cc >= 0 && cells[r][cc] && !(cells[r][cc] as CellState).isBlock) {
          const c2 = cells[r][cc] as CellState;
          if (c2.across === num) {
            out.unshift({ r, c: cc });
            cc--;
          } else break;
        }
        cc = c + 1;
        while (cc < size && cells[r][cc] && !(cells[r][cc] as CellState).isBlock) {
          const c2 = cells[r][cc] as CellState;
          if (c2.across === num) {
            out.push({ r, c: cc });
            cc++;
          } else break;
        }
      } else {
        let rr = r;
        while (rr >= 0 && cells[rr]?.[c] && !(cells[rr][c] as CellState).isBlock) {
          const c2 = cells[rr][c] as CellState;
          if (c2.down === num) {
            out.unshift({ r: rr, c });
            rr--;
          } else break;
        }
        rr = r + 1;
        while (rr < size && cells[rr]?.[c] && !(cells[rr][c] as CellState).isBlock) {
          const c2 = cells[rr][c] as CellState;
          if (c2.down === num) {
            out.push({ r: rr, c });
            rr++;
          } else break;
        }
      }
      return out;
    },
    [cells, size]
  );

  const highlightedCells = selected ? getWordCells(selected.r, selected.c, direction) : [];

  const generateNewPuzzle = useCallback(() => {
    const p = generateCrossword(puzzleSize, category, difficulty);
    setPuzzle(p);
    const numbered = buildNumberedCells(p);
    setCells(numbered);
    setUserLetters(p.grid.map((row) => row.map(() => '')));
    setSelected(null);
    setDirection('across');
    setSeconds(0);
    setMoves(0);
    setSolved(false);
    setHintsUsed(0);
    setCompletedWords(new Set());
    setWordFlashProgress(0);
    setConfetti([]);
    setLetterPops([]);
    playSound('click');
  }, [puzzleSize, category, difficulty]);

  useEffect(() => {
    generateNewPuzzle();
  }, [puzzleSize, category, difficulty]);

  useEffect(() => {
    if (!puzzle || solved) return;
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [puzzle, solved]);

  const getNextCell = useCallback(
    (r: number, c: number, dir: 'across' | 'down'): { r: number; c: number } | null => {
      const wordCells = getWordCells(r, c, dir);
      const idx = wordCells.findIndex((wc) => wc.r === r && wc.c === c);
      if (idx >= 0 && idx < wordCells.length - 1) return wordCells[idx + 1];
      return null;
    },
    [getWordCells]
  );

  const getNextClue = useCallback(
    (currentNum: number | undefined, dir: 'across' | 'down'): { r: number; c: number } | null => {
      const clues = dir === 'across' ? cluesAcross : cluesDown;
      const idx = clues.findIndex((cl) => cl.number === currentNum);
      if (idx < 0 || idx >= clues.length - 1) return null;
      const nextNum = clues[idx + 1].number;
      const pw = clues[idx + 1];
      return { r: pw.row, c: pw.col };
    },
    [cluesAcross, cluesDown]
  );

  const checkWordComplete = useCallback(
    (r: number, c: number, dir: 'across' | 'down') => {
      const wordCells = getWordCells(r, c, dir);
      if (wordCells.length === 0) return false;
      const key = wordCells.map((wc) => `${wc.r},${wc.c}`).join('-');
      if (completedWords.has(key)) return false;

      let allCorrect = true;
      for (const { r: rr, c: cc } of wordCells) {
        const ul = userLetters[rr]?.[cc]?.toUpperCase() ?? '';
        const sol = puzzle?.solution[rr]?.[cc] ?? '';
        if (ul !== sol) {
          allCorrect = false;
          break;
        }
      }
      if (allCorrect) {
        setCompletedWords((prev) => new Set([...prev, key]));
        setWordFlashProgress(1);
        playSound('line_complete');
        setTimeout(() => setWordFlashProgress(0), 400);
        return true;
      }
      return false;
    },
    [getWordCells, completedWords, userLetters, puzzle]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selected || !puzzle || solved) return;
      const { r, c } = selected;
      const cell = cells[r]?.[c];
      if (!cell || cell.isBlock) return;

      if (e.key === ' ') {
        e.preventDefault();
        setDirection((d) => (d === 'across' ? 'down' : 'across'));
        playSound('click');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const next = getNextCell(r, c, direction);
        if (next) {
          setSelected(next);
        } else {
          const nextCluePos = getNextClue(activeClueNum ?? undefined, direction);
          if (nextCluePos) setSelected(nextCluePos);
        }
        playSound('click');
        return;
      }

      if (e.key.length === 1 && /^[A-Za-z]$/.test(e.key)) {
        e.preventDefault();
        const letter = e.key.toUpperCase();
        setUserLetters((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = letter;
          return next;
        });
        setLetterPops((prev) => [...prev, { r, c, letter, progress: 1 }]);
        setMoves((m) => m + 1);
        playSound('typing');
        setTimeout(() => playSound('pop'), 50);

        checkWordComplete(r, c, direction);

        if (autoAdvance) {
          const next = getNextCell(r, c, direction);
          if (next) setSelected(next);
          else {
            const nextCluePos = getNextClue(activeClueNum ?? undefined, direction);
            if (nextCluePos) setSelected(nextCluePos);
          }
        }
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setUserLetters((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = '';
          return next;
        });
        setMoves((m) => m + 1);
        playSound('click');
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        let cc = c - 1;
        while (cc >= 0 && (cells[r]?.[cc] as CellState | null)?.isBlock) cc--;
        if (cc >= 0) {
          setSelected({ r, c: cc });
          const leftCell = cells[r][cc] as CellState;
          if (leftCell && !leftCell.isBlock && leftCell.across) setDirection('across');
          playSound('click');
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        let cc = c + 1;
        while (cc < size && (cells[r]?.[cc] as CellState | null)?.isBlock) cc++;
        if (cc < size) {
          setSelected({ r, c: cc });
          const rightCell = cells[r][cc] as CellState;
          if (rightCell && !rightCell.isBlock && rightCell.across) setDirection('across');
          playSound('click');
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        let rr = r - 1;
        while (rr >= 0 && (cells[rr]?.[c] as CellState | null)?.isBlock) rr--;
        if (rr >= 0) {
          setSelected({ r: rr, c });
          const upCell = cells[rr][c] as CellState;
          if (upCell && !upCell.isBlock && upCell.down) setDirection('down');
          playSound('click');
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        let rr = r + 1;
        while (rr < size && (cells[rr]?.[c] as CellState | null)?.isBlock) rr++;
        if (rr < size) {
          setSelected({ r: rr, c });
          const downCell = cells[rr][c] as CellState;
          if (downCell && !downCell.isBlock && downCell.down) setDirection('down');
          playSound('click');
        }
        return;
      }
    },
    [
      selected,
      cells,
      direction,
      puzzle,
      solved,
      size,
      autoAdvance,
      getNextCell,
      getNextClue,
      activeClueNum,
      checkWordComplete,
    ]
  );

  const handleCheckErrors = useCallback(() => {
    if (!puzzle || solved) return;
    setShowErrors(true);
    playSound('click');
    setTimeout(() => setShowErrors(false), 3000);
  }, [puzzle, solved]);

  const handleHintLetter = useCallback(() => {
    if (!puzzle || solved) return;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ul = userLetters[r]?.[c] ?? '';
        const sol = puzzle.solution[r]?.[c] ?? '';
        if (sol && ul.toUpperCase() !== sol) {
          setUserLetters((prev) => {
            const next = prev.map((row) => [...row]);
            next[r][c] = sol;
            return next;
          });
          setHintsUsed((h) => h + 1);
          setLetterPops((prev) => [...prev, { r, c, letter: sol, progress: 1 }]);
          playSound('powerup');
          return;
        }
      }
    }
  }, [puzzle, solved, size, userLetters]);

  const handleHintWord = useCallback(() => {
    if (!selected || !puzzle || solved) return;
    const wordCells = getWordCells(selected.r, selected.c, direction);
    for (const { r, c } of wordCells) {
      const sol = puzzle.solution[r]?.[c];
      if (sol) {
        setUserLetters((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = sol;
          return next;
        });
        setLetterPops((prev) => [...prev, { r, c, letter: sol, progress: 1 }]);
      }
    }
    setHintsUsed((h) => h + 1);
    playSound('powerup');
  }, [selected, puzzle, solved, direction, getWordCells]);

  const handleCheckComplete = useCallback(() => {
    if (!puzzle || solved) return;
    let allCorrect = true;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const sol = puzzle.solution[r]?.[c];
        if (sol) {
          const ul = userLetters[r]?.[c]?.toUpperCase() ?? '';
          if (ul !== sol) allCorrect = false;
        }
      }
    }
    if (allCorrect) {
      setSolved(true);
      const timeBonus = Math.max(0, 3000 - seconds * 10);
      const hintPenalty = hintsUsed * 200;
      const moveBonus = Math.max(0, 500 - moves * 2);
      const finalScore = Math.floor(timeBonus + moveBonus - hintPenalty + 500);
      setScore(finalScore);
      playSound('victory');
      saveStats({
        ...loadStats(),
        puzzlesCompleted: loadStats().puzzlesCompleted + 1,
        totalTime: loadStats().totalTime + seconds,
        times: [...loadStats().times, seconds],
      });
      saveHighScore(puzzleSize, finalScore);

      const colors = ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'];
      const newConfetti: ConfettiParticle[] = [];
      for (let i = 0; i < 150; i++) {
        newConfetti.push({
          x: 50 + (Math.random() - 0.5) * 40,
          y: 30 + Math.random() * 40,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 2 - 2,
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          w: 4 + Math.random() * 6,
          h: 2 + Math.random() * 4,
        });
      }
      setConfetti(newConfetti);
      confettiStartRef.current = performance.now();
    }
  }, [puzzle, solved, size, userLetters, seconds, hintsUsed, moves, puzzleSize]);

  useEffect(() => {
    if (!puzzle || !solved) return;
    const totalCells = puzzle.grid.flat().filter((c) => c !== '#').length;
    let filled = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (userLetters[r]?.[c]) filled++;
      }
    }
    if (filled === totalCells) handleCheckComplete();
  }, [userLetters, puzzle, solved, size, handleCheckComplete]);

  const getCellFromPoint = useCallback(
    (clientX: number, clientY: number): { r: number; c: number } | null => {
      const canvas = canvasRef.current;
      const cont = containerRef.current;
      if (!canvas || !cont) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX - padding;
      const y = (clientY - rect.top) * scaleY - padding;
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      if (row >= 0 && row < size && col >= 0 && col < size) return { r: row, c: col };
      return null;
    },
    [cellSize, size]
  );

  const selectCellAtCoords = useCallback(
    (clientX: number, clientY: number) => {
      const pos = getCellFromPoint(clientX, clientY);
      if (!pos) return;
      const cell = cells[pos.r]?.[pos.c];
      if (!cell || cell.isBlock || solved) return;

      if (selected && selected.r === pos.r && selected.c === pos.c) {
        setDirection((d) => (d === 'across' ? 'down' : 'across'));
      } else {
        setSelected(pos);
        if (cell.across && cell.down) {
        } else if (cell.across) setDirection('across');
        else if (cell.down) setDirection('down');
      }
      playSound('click');
    },
    [getCellFromPoint, cells, selected, solved]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      selectCellAtCoords(e.clientX, e.clientY);
    },
    [selectCellAtCoords]
  );

  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchSelectPending(true);
  }, []);

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (!touchSelectPending) return;
      const t = e.changedTouches[0];
      if (t) selectCellAtCoords(t.clientX, t.clientY);
      setTouchSelectPending(false);
    },
    [touchSelectPending, selectCellAtCoords]
  );

  useEffect(() => {
    if (selected && mobileInputRef.current) {
      mobileInputRef.current.focus();
      mobileInputRef.current.value = '';
    }
  }, [selected]);

  const handleMobileInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const val = input.value;
      if (!selected || !puzzle || solved || !val) return;
      const letter = val.slice(-1).toUpperCase();
      if (!/^[A-Z]$/.test(letter)) {
        input.value = userLetters[selected.r]?.[selected.c] ?? '';
        return;
      }
      const { r, c } = selected;
      const cell = cells[r]?.[c];
      if (!cell || cell.isBlock) return;

      setUserLetters((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = letter;
        return next;
      });
      setLetterPops((prev) => [...prev, { r, c, letter, progress: 1 }]);
      setMoves((m) => m + 1);
      playSound('typing');
      setTimeout(() => playSound('pop'), 50);
      checkWordComplete(r, c, direction);

      if (autoAdvance) {
        const next = getNextCell(r, c, direction);
        if (next) setSelected(next);
        else {
          const nextCluePos = getNextClue(activeClueNum ?? undefined, direction);
          if (nextCluePos) setSelected(nextCluePos);
        }
      }
      input.value = '';
    },
    [selected, puzzle, solved, userLetters, cells, direction, autoAdvance, checkWordComplete, getNextCell, getNextClue, activeClueNum]
  );

  const handleMobileKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!selected || !puzzle || solved) return;
      const { r, c } = selected;
      const cell = cells[r]?.[c];
      if (!cell || cell.isBlock) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        setUserLetters((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = '';
          return next;
        });
        setMoves((m) => m + 1);
        playSound('click');
        (e.target as HTMLInputElement).value = '';
      }
    },
    [selected, puzzle, solved, cells]
  );

  const isWrong = useCallback(
    (r: number, c: number): boolean => {
      if (!showErrors || !puzzle) return false;
      const ul = userLetters[r]?.[c]?.toUpperCase() ?? '';
      const sol = puzzle.solution[r]?.[c] ?? '';
      return sol !== '' && ul !== '' && ul !== sol;
    },
    [showErrors, puzzle, userLetters]
  );

  const isWordCompleted = useCallback(
    (r: number, c: number, dir: 'across' | 'down'): boolean => {
      const wordCells = getWordCells(r, c, dir);
      const key = wordCells.map((wc) => `${wc.r},${wc.c}`).join('-');
      return completedWords.has(key);
    },
    [getWordCells, completedWords]
  );

  const canvasW = size * cellSize + padding * 2;
  const canvasH = size * cellSize + padding * 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      const dt = lastTickRef.current ? (now - lastTickRef.current) / 1000 : 0.016;
      lastTickRef.current = now;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const cell = cells[r]?.[c];
          const x = c * cellSize + padding;
          const y = r * cellSize + padding;

          if (!cell) {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#334155';
            ctx.strokeRect(x, y, cellSize, cellSize);
            continue;
          }

          const letter = userLetters[r]?.[c] ?? '';
          const wrong = isWrong(r, c);
          const isSel = selected?.r === r && selected?.c === c;
          const inWord = highlightedCells.some((h) => h.r === r && h.c === c) && !isSel;
          const wordDone =
            isWordCompleted(r, c, 'across') || isWordCompleted(r, c, 'down');

          let bg = '#1e293b';
          if (wordDone) bg = 'rgba(34, 197, 94, 0.4)';
          else if (isSel) bg = 'rgba(59, 130, 246, 0.7)';
          else if (inWord) bg = 'rgba(96, 165, 250, 0.35)';
          else if (wrong) bg = 'rgba(239, 68, 68, 0.4)';

          ctx.fillStyle = bg;
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          const pop = letterPops.find((lp) => lp.r === r && lp.c === c);
          const popScale = pop ? 1 + (1 - pop.progress) * 0.4 : 1;

          if (cell.number != null) {
            ctx.fillStyle = '#64748b';
            ctx.font = `${Math.max(8, Math.floor(cellSize * 0.25))}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(String(cell.number), x + 2, y + 1);
          }

          if (letter) {
            ctx.fillStyle = wrong ? '#fca5a5' : wordDone ? '#86efac' : '#f1f5f9';
            ctx.font = `bold ${Math.floor(cellSize * 0.55)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.save();
            ctx.translate(x + cellSize / 2, y + cellSize / 2);
            ctx.scale(popScale, popScale);
            ctx.fillText(letter, 0, 0);
            ctx.restore();
          }

          ctx.strokeStyle = isSel ? '#3b82f6' : '#334155';
          ctx.lineWidth = isSel ? 2 : 1;
          ctx.strokeRect(x, y, cellSize, cellSize);
        }
      }

      setLetterPops((prev) =>
        prev
          .map((lp) => ({ ...lp, progress: Math.max(0, lp.progress - dt * 6) }))
          .filter((lp) => lp.progress > 0)
      );

      if (confetti.length > 0) {
        const elapsed = (now - confettiStartRef.current) / 1000;
        for (let i = confetti.length - 1; i >= 0; i--) {
          const cf = confetti[i];
          ctx.save();
          const px = (cf.x / 100) * canvasW;
          const py = (cf.y / 100) * canvasH;
          ctx.translate(px, py);
          ctx.rotate((cf.rotation * Math.PI) / 180);
          ctx.fillStyle = cf.color;
          ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
          ctx.restore();
          cf.x += cf.vx * 0.5;
          cf.y += cf.vy * 0.5;
          cf.vy += 0.15;
          cf.rotation += cf.rotSpeed;
          if (cf.y > 150 || elapsed > 5) confetti.splice(i, 1);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [
    cells,
    userLetters,
    selected,
    highlightedCells,
    letterPops,
    completedWords,
    confetti,
    size,
    cellSize,
    canvasW,
    canvasH,
    isWrong,
    isWordCompleted,
  ]);

  const stats = loadStats();
  const avgTime =
    stats.times.length > 0
      ? Math.floor(stats.times.reduce((a, b) => a + b, 0) / stats.times.length)
      : 0;
  const bestScore = loadHighScore(puzzleSize);

  if (!puzzle) return null;

  return (
    <div
      className="game-card border border-slate-700 bg-slate-900 text-slate-100 overflow-hidden relative w-full max-w-2xl mx-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <style>{`
        @keyframes word-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-xl font-bold text-slate-100">Crossword Puzzle</h2>
        <button
          onClick={onClose}
          className="btn-elite btn-elite-ghost touch-manipulation active:scale-95"
          onMouseDown={() => playSound('click')}
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={puzzleSize}
          onChange={(e) => setPuzzleSize(e.target.value as PuzzleSize)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
        >
          <option value="mini">Mini (5×5)</option>
          <option value="standard">Standard (9×9)</option>
          <option value="large">Large (13×13)</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as WordCategory)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
        >
          <option value="general">General</option>
          <option value="science">Science</option>
          <option value="geography">Geography</option>
          <option value="history">History</option>
          <option value="sports">Sports</option>
          <option value="technology">Technology</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showErrors}
            onChange={(e) => setShowErrors(e.target.checked)}
            className="rounded"
          />
          Show errors
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="rounded"
          />
          Auto-advance
        </label>
        <button
          onClick={() => setShowStats(!showStats)}
          className="px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm hover:bg-slate-700 touch-manipulation active:scale-95"
        >
          Stats
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-slate-800/50">
        <div className="flex flex-wrap gap-4 font-mono text-sm">
          <span>
            Time: <strong className="text-emerald-400">{seconds}s</strong>
          </span>
          <span>
            Moves: <strong className="text-amber-400">{moves}</strong>
          </span>
          <span>
            Hints: <strong className="text-violet-400">{hintsUsed}</strong>
          </span>
          {solved && (
            <span>
              Score: <strong className="text-green-400">{score}</strong>
            </span>
          )}
          {bestScore > 0 && (
            <span className="text-slate-400 text-xs">Best: {bestScore}</span>
          )}
        </div>
        <button
          onClick={generateNewPuzzle}
          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm touch-manipulation active:scale-95"
          onMouseDown={() => playSound('click')}
        >
          New Puzzle
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div
          ref={containerRef}
          className="overflow-auto rounded-lg bg-slate-950 p-1 inline-block relative"
          style={{ maxWidth: '100%', touchAction: 'manipulation' }}
        >
          <input
            ref={mobileInputRef}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={1}
            aria-label="Crossword cell input"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            style={{ left: -9999, position: 'absolute' }}
            onInput={handleMobileInput}
            onKeyDown={handleMobileKeyDown}
          />
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="block w-full cursor-pointer touch-manipulation"
            style={{ maxWidth: '100%' }}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouchStart}
            onTouchEnd={handleCanvasTouchEnd}
            tabIndex={0}
          />
        </div>

        <div className="flex-1 min-w-[220px] max-h-[400px] overflow-y-auto space-y-4">
          <div>
            <h3 className="font-semibold text-amber-400 mb-1">Across</h3>
            <ul className="text-sm text-slate-300 space-y-0.5">
              {cluesAcross.map((clue) => (
                <li
                  key={`a-${clue.number}`}
                  className={
                    activeClueNum === clue.number
                      ? 'bg-blue-900/40 font-medium text-blue-200 px-2 py-0.5 rounded'
                      : 'px-1'
                  }
                >
                  {clue.number}. {clue.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-amber-400 mb-1">Down</h3>
            <ul className="text-sm text-slate-300 space-y-0.5">
              {cluesDown.map((clue) => (
                <li
                  key={`d-${clue.number}`}
                  className={
                    activeClueNum === clue.number
                      ? 'bg-blue-900/40 font-medium text-blue-200 px-2 py-0.5 rounded'
                      : 'px-1'
                  }
                >
                  {clue.number}. {clue.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {!solved && (
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={handleHintLetter}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm touch-manipulation active:scale-95"
            onMouseDown={() => playSound('click')}
          >
            Hint: One Letter
          </button>
          <button
            onClick={handleHintWord}
            className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm touch-manipulation active:scale-95"
            onMouseDown={() => playSound('click')}
          >
            Hint: Word
          </button>
          <button
            onClick={handleCheckErrors}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm touch-manipulation active:scale-95"
            onMouseDown={() => playSound('click')}
          >
            Check Errors (3s)
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-2">
        Arrows: move • Letters: type • Space: direction • Tab: next clue • Backspace: delete
      </p>

      {solved && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-900/30 border border-emerald-700 text-emerald-200">
          <p className="font-bold text-lg">Puzzle Complete!</p>
          <p className="text-sm mt-1">
            Score: {score}
            {score >= bestScore && bestScore > 0 && ' — New Best!'}
          </p>
          <p className="text-xs text-emerald-300/80 mt-1">
            Time: {seconds}s • Hints used: {hintsUsed}
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={generateNewPuzzle}
              className="btn-elite btn-elite-primary touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              New Puzzle
            </button>
            <button
              onClick={onClose}
              className="btn-elite btn-elite-ghost touch-manipulation active:scale-95"
              onMouseDown={() => playSound('click')}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showStats && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-600">
          <h3 className="font-semibold text-slate-200 mb-2">Statistics</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>Puzzles completed: {stats.puzzlesCompleted}</li>
            <li>Average time: {avgTime}s</li>
            <li>Total play time: {stats.totalTime}s</li>
          </ul>
        </div>
      )}
    </div>
  );
}
