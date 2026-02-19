/* ═══════════════════════════════════════════════════════════
   HANGMAN ELITE — Arcade
   Canvas-animated hangman, 6 categories, 4 game modes, particles,
   hints, streaks, score multipliers, arrow-key keyboard nav.
   ═══════════════════════════════════════════════════════════ */

import { useState, useCallback, useEffect, useRef } from 'react';
import { playSound } from '../SoundEngine';

interface HangmanGameProps {
  onClose: () => void;
}

type Category = 'animals' | 'countries' | 'science' | 'sports' | 'technology' | 'movies';
type GameMode = 'classic' | 'timed' | 'survival' | 'speed';

interface WordEntry {
  word: string;
  hint?: string;
}

// 6 categories × 20+ words each
const WORDS: Record<Category, WordEntry[]> = {
  animals: [
    { word: 'ELEPHANT', hint: 'Large mammal with a trunk' },
    { word: 'DOLPHIN', hint: 'Marine mammal, very intelligent' },
    { word: 'PENGUIN', hint: 'Flightless bird from cold regions' },
    { word: 'KANGAROO', hint: 'Hops and has a pouch' },
    { word: 'BUTTERFLY', hint: 'Insect with colorful wings' },
    { word: 'CROCODILE', hint: 'Large reptile with a long snout' },
    { word: 'OCTOPUS', hint: 'Sea creature with eight arms' },
    { word: 'GORILLA', hint: 'Great ape from Africa' },
    { word: 'ZEBRA', hint: 'Black and white striped animal' },
    { word: 'CHEETAH', hint: 'Fastest land animal' },
    { word: 'HIPPOPOTAMUS', hint: 'Large river animal' },
    { word: 'CHAMELEON', hint: 'Color-changing lizard' },
    { word: 'KOALA', hint: 'Australian eucalyptus eater' },
    { word: 'PLATYPUS', hint: 'Egg-laying mammal' },
    { word: 'FLAMINGO', hint: 'Pink wading bird' },
    { word: 'RHINOCEROS', hint: 'Has a horn on its nose' },
    { word: 'PANDAS', hint: 'Black and white bear' },
    { word: 'PARROT', hint: 'Colorful talking bird' },
    { word: 'SCORPION', hint: 'Arachnid with tail stinger' },
    { word: 'ALBATROSS', hint: 'Large seabird with vast wingspan' },
  ],
  countries: [
    { word: 'JAPAN', hint: 'Island nation in East Asia' },
    { word: 'BRAZIL', hint: 'Largest country in South America' },
    { word: 'EGYPT', hint: 'Home of the pyramids' },
    { word: 'CANADA', hint: 'North American country with maple leaf' },
    { word: 'ITALY', hint: 'European country shaped like a boot' },
    { word: 'AUSTRALIA', hint: 'Continent and country' },
    { word: 'GERMANY', hint: 'Central European country' },
    { word: 'MEXICO', hint: 'South of the USA' },
    { word: 'INDIA', hint: 'Second most populous country' },
    { word: 'SPAIN', hint: 'Iberian country' },
    { word: 'ARGENTINA', hint: 'Tango and steak country' },
    { word: 'SWEDEN', hint: 'Nordic country with IKEA' },
    { word: 'THAILAND', hint: 'Land of smiles' },
    { word: 'NIGERIA', hint: 'Most populous African nation' },
    { word: 'INDONESIA', hint: 'Archipelago of thousands of islands' },
    { word: 'GREECE', hint: 'Birthplace of democracy' },
    { word: 'NETHERLANDS', hint: 'Tulips and windmills' },
    { word: 'POLAND', hint: 'Central European nation' },
    { word: 'SOUTH KOREA', hint: 'K-pop and tech hub' },
    { word: 'VIETNAM', hint: 'Southeast Asian country' },
    { word: 'PORTUGAL', hint: 'Home of port wine' },
  ],
  science: [
    { word: 'PHOTOSYNTHESIS', hint: 'Plants convert light to energy' },
    { word: 'GRAVITY', hint: 'Force that pulls objects together' },
    { word: 'MOLECULE', hint: 'Group of bonded atoms' },
    { word: 'VOLCANO', hint: 'Mountain that can erupt' },
    { word: 'TELESCOPE', hint: 'Instrument to see distant objects' },
    { word: 'ELECTRON', hint: 'Tiny particle with negative charge' },
    { word: 'ECOSYSTEM', hint: 'Community of living things' },
    { word: 'WAVELENGTH', hint: 'Distance between wave peaks' },
    { word: 'HYPOTHESIS', hint: 'Testable scientific idea' },
    { word: 'BACTERIA', hint: 'Microscopic single-celled organism' },
    { word: 'CLIMATE', hint: 'Long-term weather patterns' },
    { word: 'EVOLUTION', hint: 'Change over generations' },
    { word: 'FOSSIL', hint: 'Preserved remains of ancient life' },
    { word: 'CHROMOSOME', hint: 'DNA package in cells' },
    { word: 'ORBIT', hint: 'Path around a celestial body' },
    { word: 'PLASMA', hint: 'Fourth state of matter' },
    { word: 'SOLAR SYSTEM', hint: 'Sun and its planets' },
    { word: 'GEOLOGY', hint: 'Study of Earth' },
    { word: 'METAMORPHOSIS', hint: 'Transformation in life cycle' },
    { word: 'RESONANCE', hint: 'Amplification by matching frequency' },
    { word: 'SUPERNOVA', hint: 'Exploding star' },
  ],
  sports: [
    { word: 'BASKETBALL', hint: 'Hoops and dribbling' },
    { word: 'SWIMMING', hint: 'Sport in a pool' },
    { word: 'VOLLEYBALL', hint: 'Net and spiking' },
    { word: 'GYMNASTICS', hint: 'Flips and balance beams' },
    { word: 'WRESTLING', hint: 'Grappling sport' },
    { word: 'BASEBALL', hint: 'Bat and diamond' },
    { word: 'TENNIS', hint: 'Racket and net' },
    { word: 'MARATHON', hint: 'Long-distance run' },
    { word: 'SKATEBOARDING', hint: 'Board with wheels' },
    { word: 'BADMINTON', hint: 'Shuttlecock over net' },
    { word: 'FENCING', hint: 'Sword fighting sport' },
    { word: 'ROWING', hint: 'Oars and water' },
    { word: 'TRIATHLON', hint: 'Swim, bike, run' },
    { word: 'SNOWBOARDING', hint: 'Snow slopes' },
    { word: 'RUGBY', hint: 'Oval ball, no padding' },
    { word: 'LACROSSE', hint: 'Stick and net' },
    { word: 'ARCHERY', hint: 'Bow and arrows' },
    { word: 'POLO', hint: 'Horses and mallets' },
    { word: 'SQUASH', hint: 'Indoor racket sport' },
    { word: 'HOCKEY', hint: 'Ice or field stick sport' },
    { word: 'CURLING', hint: 'Stones on ice' },
  ],
  technology: [
    { word: 'ALGORITHM', hint: 'Step-by-step procedure' },
    { word: 'BROWSER', hint: 'Web page viewer' },
    { word: 'CLOUD', hint: 'Remote computing' },
    { word: 'DATABASE', hint: 'Structured data storage' },
    { word: 'ENCRYPTION', hint: 'Secure encoding' },
    { word: 'FIRMWARE', hint: 'Embedded software' },
    { word: 'HARDWARE', hint: 'Physical computer parts' },
    { word: 'INTERNET', hint: 'Global network' },
    { word: 'KEYBOARD', hint: 'Input device' },
    { word: 'MICROCHIP', hint: 'Tiny circuit' },
    { word: 'NETWORK', hint: 'Connected devices' },
    { word: 'OPERATING SYSTEM', hint: 'Core software' },
    { word: 'PROCESSOR', hint: 'CPU' },
    { word: 'ROUTER', hint: 'Network traffic director' },
    { word: 'SOFTWARE', hint: 'Programs and apps' },
    { word: 'BLUETOOTH', hint: 'Wireless connection' },
    { word: 'SMARTPHONE', hint: 'Mobile computer' },
    { word: 'ARTIFICIAL INTELLIGENCE', hint: 'Machine learning' },
    { word: 'VIRTUAL REALITY', hint: 'Immersive simulation' },
    { word: 'WIFI', hint: 'Wireless internet' },
    { word: 'PLUGIN', hint: 'Add-on extension' },
  ],
  movies: [
    { word: 'AVATAR', hint: 'Blue aliens on Pandora' },
    { word: 'TITANIC', hint: 'Sinking ship romance' },
    { word: 'INCEPTION', hint: 'Dream within dreams' },
    { word: 'MATRIX', hint: 'Red pill or blue pill' },
    { word: 'GLADIATOR', hint: 'Roman arena fighter' },
    { word: 'JURASSIC PARK', hint: 'Dinosaurs come back' },
    { word: 'AVENGERS', hint: 'Marvel superhero team' },
    { word: 'STAR WARS', hint: 'Space opera saga' },
    { word: 'CASABLANCA', hint: 'Classic wartime romance' },
    { word: 'GODFATHER', hint: 'Crime family drama' },
    { word: 'PULP FICTION', hint: 'Non-linear crime story' },
    { word: 'FROZEN', hint: 'Let it go' },
    { word: 'TITANIC', hint: 'Iceberg disaster' },
    { word: 'CHINATOWN', hint: 'Noir detective' },
    { word: 'ALIEN', hint: 'Space horror' },
    { word: 'TERMINATOR', hint: 'Android from future' },
    { word: 'JOKER', hint: 'Clown prince of crime' },
    { word: 'BLADE RUNNER', hint: 'Future LA' },
    { word: 'SCARFACE', hint: 'Cuban drug lord' },
    { word: 'FORREST GUMP', hint: 'Run Forrest run' },
    { word: 'PARASITE', hint: 'Korean class satire' },
  ],
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_WRONG = 6;
const HIGH_SCORE_KEY = 'skillzstorm_hangman_highscore';
const HINT_POINT_PENALTY = 25;
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

// Letter frequency in English (for helper)
const LETTER_FREQ: Record<string, number> = {
  E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1,
  R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2,
  G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15,
  Q: 0.1, Z: 0.07,
};

const CATEGORY_BG: Record<Category, string> = {
  animals: 'from-emerald-900/30 via-green-800/20 to-teal-900/40',
  countries: 'from-blue-900/40 via-indigo-800/30 to-sky-900/50',
  science: 'from-violet-900/40 via-purple-800/30 to-fuchsia-900/40',
  sports: 'from-orange-900/40 via-amber-800/30 to-yellow-900/30',
  technology: 'from-slate-900/50 via-cyan-800/30 to-blue-900/40',
  movies: 'from-rose-900/40 via-pink-800/30 to-red-900/40',
};

function pickWord(category: Category, round: number, streak = 0): WordEntry {
  const list = WORDS[category];
  // Progressive difficulty: longer words as round and streak increase
  const difficultyBonus = Math.min(Math.floor(streak / 2), 4);
  const startIdx = Math.min((Math.floor(round / 2) + difficultyBonus) * 3, list.length - 10);
  const pool = list.slice(Math.max(0, startIdx), Math.min(startIdx + 12, list.length));
  const filtered = pool.filter((w) => w.word.replace(/\s/g, '').length >= 4 + Math.min(round, 4));
  const finalPool = filtered.length > 0 ? filtered : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
  alpha: number;
}

interface LetterAnim {
  letter: string;
  index: number;
  progress: number;
  correct: boolean;
}

function useParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef<number>(0);

  const burst = useCallback((x: number, y: number, correct: boolean) => {
    const count = 16;
    const newParts: Particle[] = [];
    const color = correct ? '#22c55e' : '#ef4444';
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      newParts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 3 + Math.random() * 4,
        alpha: 1,
      });
    }
    setParticles((p) => [...p, ...newParts]);
  }, []);

  useEffect(() => {
    const animate = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15,
            life: p.life - 0.025,
            alpha: p.life,
          }))
          .filter((p) => p.life > 0);
        return next;
      });
    };
    rafRef.current = requestAnimationFrame(function loop() {
      animate();
      rafRef.current = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { particles, burst };
}

// Canvas Hangman with smooth drawing animation + wrong-guess shake
function HangmanCanvas({
  wrong,
  animProgress,
  shake = false,
}: {
  wrong: number;
  animProgress: number;
  shake?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = 200;
  const h = 240;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawLine = (x1: number, y1: number, x2: number, y2: number, minWrong: number) => {
      if (wrong < minWrong) return;
      const prog = wrong > minWrong ? 1 : animProgress;
      const dx = (x2 - x1) * prog;
      const dy = (y2 - y1) * prog;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + dx, y1 + dy);
      ctx.stroke();
    };

    const drawCircle = (cx: number, cy: number, r: number, minWrong: number) => {
      if (wrong < minWrong) return;
      const prog = wrong > minWrong ? 1 : animProgress;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    };

    // Gallows
    drawLine(20, 200, 180, 200, 0);
    drawLine(100, 200, 100, 20, 0);
    drawLine(100, 20, 160, 20, 0);
    drawLine(160, 20, 160, 45, 0);

    // Head
    drawCircle(160, 55, 12, 1);

    // Body
    drawLine(160, 67, 160, 110, 2);

    // Left arm
    drawLine(160, 75, 135, 95, 3);

    // Right arm
    drawLine(160, 75, 185, 95, 4);

    // Left leg
    drawLine(160, 110, 140, 145, 5);

    // Right leg
    drawLine(160, 110, 180, 145, 6);
  }, [wrong, animProgress]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      className="mx-auto block"
      style={shake ? { animation: 'hangmanShake 0.4s ease-in-out' } : undefined}
    />
  );
}

export default function HangmanGame({ onClose }: HangmanGameProps) {
  const [phase, setPhase] = useState<'menu' | 'playing' | 'stats'>('menu');
  const [category, setCategory] = useState<Category>('animals');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [wordEntry, setWordEntry] = useState<WordEntry>(() => pickWord('animals', 1));
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [showHint, setShowHint] = useState(false);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [lives, setLives] = useState(3); // Survival mode
  const [timeLeft, setTimeLeft] = useState(30); // Timed mode
  const [keyboardIndex, setKeyboardIndex] = useState({ row: 0, col: 0 });
  const [letterAnims, setLetterAnims] = useState<LetterAnim[]>([]);
  const [wrongAnimProgress, setWrongAnimProgress] = useState(0);
  const [streak, setStreak] = useState(0);
  const [wordStartTime, setWordStartTime] = useState(0);
  const [stats, setStats] = useState({ wordsCorrect: 0, wordsWrong: 0, totalTime: 0, bestStreak: 0 });
  const [pressedLetter, setPressedLetter] = useState<string | null>(null);
  const [hangmanShake, setHangmanShake] = useState(false);
  const [keyboardShake, setKeyboardShake] = useState(false);

  const { particles, burst } = useParticles();
  const containerRef = useRef<HTMLDivElement>(null);

  const word = wordEntry.word.toUpperCase();
  const wrongGuesses = [...guessed].filter((l) => !word.includes(l));
  const wrongCount = wrongGuesses.length;

  // Get current letter at keyboard index
  const getKeyAt = useCallback((row: number, col: number) => {
    const r = KEYBOARD_ROWS[row];
    return r ? r[col] : '';
  }, []);

  const selectedLetter = getKeyAt(keyboardIndex.row, keyboardIndex.col);

  const handleLetter = useCallback(
    (letter: string, fromKeyNav = false) => {
      if (gameState !== 'playing') return;
      if (guessed.has(letter)) return;

      const next = new Set(guessed);
      next.add(letter);
      setGuessed(next);

      if (word.includes(letter)) {
        playSound('correct');
        const indices = word.split('').reduce<number[]>((acc, c, i) => {
          if (c === letter) acc.push(i);
          return acc;
        }, []);
        setLetterAnims((a) => [
          ...a,
          ...indices.map((index) => ({ letter, index, progress: 0, correct: true })),
        ]);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          burst(rect.width / 2, 220, true);
        }
        const allRevealed = word.split('').every((c) => c === ' ' || next.has(c));
        if (allRevealed) {
          const elapsed = (Date.now() - wordStartTime) / 1000;
          const speedMult = Math.max(1, 3 - elapsed / 10);
          const baseScore = 100 + round * 20;
          const streakBonus = streak >= 2 ? Math.min(streak * 15, 75) : 0;
          const total = Math.floor((baseScore * speedMult + streakBonus));
          setScore((s) => s + total);
          const newStreak = streak + 1;
          setStreak(newStreak);
          setGameState('won');
          if (newStreak >= 2) playSound('streak');
          else playSound('victory');
        }
      } else {
        playSound('wrong');
        setWrongAnimProgress(0);
        setHangmanShake(true);
        setKeyboardShake(true);
        setTimeout(() => setHangmanShake(false), 400);
        setTimeout(() => setKeyboardShake(false), 400);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          burst(rect.width / 2, 220, false);
        }
        if (gameMode === 'survival') {
          setLives((l) => {
            if (l <= 1) {
              setGameState('lost');
              playSound('gameover');
              return 0;
            }
            return l - 1;
          });
        } else if (wrongCount + 1 >= MAX_WRONG) {
          setGameState('lost');
          setStreak(0);
          playSound('gameover');
        }
      }
    },
    [gameState, guessed, word, wrongCount, gameMode, round, streak, wordStartTime, burst]
  );

  // Letter reveal animation
  useEffect(() => {
    const id = setInterval(() => {
      setLetterAnims((prev) =>
        prev
          .map((a) => ({ ...a, progress: Math.min(1, a.progress + 0.12) }))
          .filter((a) => a.progress < 1.01)
      );
    }, 30);
    return () => clearInterval(id);
  }, []);

  // Wrong guess drawing animation
  useEffect(() => {
    if (wrongCount === 0) return;
    const id = setInterval(() => {
      setWrongAnimProgress((p) => Math.min(1, p + 0.08));
    }, 40);
    return () => clearInterval(id);
  }, [wrongCount]);

  // Timed / Speed mode countdown (30s for timed, 15s for speed)
  const timePerWord = gameMode === 'speed' ? 15 : 30;
  useEffect(() => {
    if ((gameMode !== 'timed' && gameMode !== 'speed') || gameState !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState('lost');
          playSound('alarm');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameMode, gameState]);

  // Arrow key navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'playing') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardIndex((k) => ({
          row: Math.min(KEYBOARD_ROWS.length - 1, k.row + 1),
          col: Math.min(
            (KEYBOARD_ROWS[Math.min(KEYBOARD_ROWS.length - 1, k.row + 1)]?.length ?? 1) - 1,
            k.col
          ),
        }));
        playSound('click');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardIndex((k) => ({
          row: Math.max(0, k.row - 1),
          col: Math.min((KEYBOARD_ROWS[Math.max(0, k.row - 1)]?.length ?? 1) - 1, k.col),
        }));
        playSound('click');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setKeyboardIndex((k) => ({ ...k, col: Math.max(0, k.col - 1) }));
        playSound('click');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setKeyboardIndex((k) => ({
          ...k,
          col: Math.min((KEYBOARD_ROWS[k.row]?.length ?? 1) - 1, k.col + 1),
        }));
        playSound('click');
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedLetter && !guessed.has(selectedLetter) && gameState === 'playing') {
          handleLetter(selectedLetter, true);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, selectedLetter, guessed, gameState, handleLetter]);

  const useHint = useCallback(() => {
    if (hintsLeft <= 0 || gameState !== 'playing') return;
    const unrevealed = word
      .split('')
      .map((c, i) => (c !== ' ' && !guessed.has(c) ? { c, i } : null))
      .filter((x): x is { c: string; i: number } => x !== null);
    if (unrevealed.length === 0) return;
    const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setGuessed((g) => new Set([...g, pick.c]));
    setLetterAnims((a) => [...a, { letter: pick.c, index: pick.i, progress: 0, correct: true }]);
    setHintsLeft((h) => h - 1);
    setScore((s) => Math.max(0, s - HINT_POINT_PENALTY));
    playSound('powerup');
  }, [hintsLeft, gameState, word, guessed]);

  const nextRound = useCallback(() => {
    const newEntry = pickWord(category, round + 1, streak);
    setWordEntry(newEntry);
    setGuessed(new Set());
    setShowHint(false);
    setGameState('playing');
    setRound((r) => r + 1);
    setLetterAnims([]);
    setWrongAnimProgress(0);
    setTimeLeft(gameMode === 'speed' ? 15 : 30);
    setWordStartTime(Date.now());
    if (gameMode === 'survival') {
      // Lives persist in survival
    }
  }, [category, round, gameMode]);

  const newGame = useCallback(() => {
    setPhase('playing');
    const entry = pickWord(category, 1);
    setWordEntry(entry);
    setGuessed(new Set());
    setShowHint(false);
    setGameState('playing');
    setScore(0);
    setRound(1);
    setHintsLeft(3);
    setLetterAnims([]);
    setWrongAnimProgress(0);
    setTimeLeft(30);
    setLives(3);
    setStreak(0);
    setWordStartTime(Date.now());
    setStats({ wordsCorrect: 0, wordsWrong: 0, totalTime: 0, bestStreak: 0 });
    playSound('go');
  }, [category]);

  const startGame = useCallback(
    (cat: Category, mode: GameMode) => {
      setCategory(cat);
      setGameMode(mode);
      setPhase('playing');
      const entry = pickWord(cat, 1);
      setWordEntry(entry);
      setGuessed(new Set());
      setShowHint(false);
      setGameState('playing');
      setScore(0);
      setRound(1);
      setHintsLeft(3);
      setLetterAnims([]);
      setWrongAnimProgress(0);
      setTimeLeft(mode === 'speed' ? 15 : 30);
      setLives(mode === 'survival' ? 3 : 3);
      setStreak(0);
      setWordStartTime(Date.now());
      setStats({ wordsCorrect: 0, wordsWrong: 0, totalTime: 0, bestStreak: 0 });
      playSound('go');
    },
    []
  );

  const finishGame = useCallback(() => {
    const high = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    if (score > high) {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    }
    setStats((s) => ({
      ...s,
      wordsCorrect: s.wordsCorrect + (gameState === 'won' ? 1 : 0),
      wordsWrong: s.wordsWrong + (gameState === 'lost' ? 1 : 0),
      totalTime: s.totalTime + (Date.now() - wordStartTime) / 1000,
      bestStreak: Math.max(s.bestStreak, streak),
    }));
    setPhase('stats');
  }, [score, gameState, wordStartTime, streak]);

  const highScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);

  // Letter frequency for unrevealed letters in word
  const unrevealedLetters = word
    .split('')
    .filter((c) => c !== ' ' && !guessed.has(c));
  const freqSum = unrevealedLetters.reduce((sum, c) => sum + (LETTER_FREQ[c] || 0), 0);
  const avgFreq = unrevealedLetters.length > 0 ? freqSum / unrevealedLetters.length : 0;

  if (phase === 'menu') {
    return (
      <div className="game-card bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-600 w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Hangman Elite</h2>
          <button onClick={onClose} className="btn-elite btn-elite-ghost text-white/90 touch-manipulation active:scale-95">
            Close
          </button>
        </div>

        <p className="text-slate-300 mb-6">Choose category and mode</p>

        <div className="mb-6">
          <p className="text-sm font-medium text-slate-400 mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {(['animals', 'countries', 'science', 'sports', 'technology', 'movies'] as const).map(
              (c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    category === c ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } touch-manipulation active:scale-95`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              )
            )}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-slate-400 mb-2">Game Mode</p>
          <div className="grid grid-cols-2 gap-2">
            {(['classic', 'timed', 'survival', 'speed'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setGameMode(m)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition min-h-[44px] touch-manipulation active:scale-95 ${
                  gameMode === m ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {m === 'classic' && 'Classic (no limit)'}
                {m === 'timed' && 'Timed (30s)'}
                {m === 'survival' && 'Survival (3 lives)'}
                {m === 'speed' && 'Speed (15s)'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {(gameMode === 'timed' || gameMode === 'speed') ? (
              <>Timer on: race the clock per word</>
            ) : (
              <>No time limit — guess at your pace</>
            )}
          </p>
        </div>

        <button
          onClick={() => startGame(category, gameMode)}
          className="btn-elite btn-elite-primary w-full py-3 text-lg touch-manipulation active:scale-95"
        >
          Start Game
        </button>

        <p className="text-slate-500 text-xs mt-4">High Score: {highScore}</p>
      </div>
    );
  }

  if (phase === 'stats') {
    const total = stats.wordsCorrect + stats.wordsWrong;
    const accuracy = total > 0 ? Math.round((stats.wordsCorrect / total) * 100) : 0;
    return (
      <div className="game-card bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-600 w-full max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Game Over</h2>
          <button onClick={onClose} className="btn-elite btn-elite-ghost text-white/90 touch-manipulation active:scale-95">
            Close
          </button>
        </div>

        <div className="space-y-3 mb-6 p-4 bg-slate-800/50 rounded-xl">
          <p className="text-2xl font-bold text-cyan-400">Score: {score}</p>
          <p>Accuracy: {accuracy}%</p>
          <p>Time: {Math.round(stats.totalTime)}s</p>
          <p>Best Streak: {stats.bestStreak}</p>
          {score >= highScore && score > 0 && (
            <p className="text-amber-400 font-bold">New High Score!</p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setPhase('menu')} className="btn-elite btn-elite-ghost flex-1 touch-manipulation active:scale-95">
            Menu
          </button>
          <button onClick={newGame} className="btn-elite btn-elite-primary flex-1 touch-manipulation active:scale-95">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const wordLength = word.replace(/\s/g, '').length;

  return (
    <div
      ref={containerRef}
      className={`game-card relative overflow-hidden bg-gradient-to-br ${CATEGORY_BG[category]} border border-white/20 text-white transition-all duration-500 w-full max-w-lg mx-auto`}
    >
      {/* Particle layer */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.alpha,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Hangman Elite</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">
          Close
        </button>
      </div>

      <div className="relative flex flex-wrap gap-4 mb-4 text-sm">
        <span>Score: <strong>{score}</strong></span>
        <span>Round: <strong>{round}</strong></span>
        <span>Wrong: <strong>{wrongCount}/{MAX_WRONG}</strong></span>
        {gameMode === 'survival' && <span>Lives: <strong>{lives}</strong></span>}
        {gameMode === 'timed' && <span>Time: <strong className="text-amber-300">{timeLeft}s</strong></span>}
        {streak >= 2 && <span className="text-cyan-300">Streak: {streak}×</span>}
      </div>

      <style>{`
        @keyframes hangmanShake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-10px); }
          30% { transform: translateX(10px); }
          50% { transform: translateX(-7px); }
          70% { transform: translateX(7px); }
          90% { transform: translateX(-4px); }
        }
        @keyframes letterBounce {
          0% { transform: scale(1); }
          40% { transform: scale(0.88); }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes wrongGuessShake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          50% { transform: translateX(-6px); }
          70% { transform: translateX(6px); }
          90% { transform: translateX(-3px); }
        }
      `}</style>
      <div className="relative mb-4">
        <HangmanCanvas wrong={wrongCount} animProgress={wrongAnimProgress} shake={hangmanShake} />
      </div>

      {/* Word length indicator with unique styling */}
      <div className="relative mb-2 text-center">
        <span className="text-sm text-white/70">
          Word length: <strong className="text-white font-mono">{wordLength}</strong> letters
        </span>
      </div>

      {/* Word blanks with unique styling */}
      <div className="relative flex flex-wrap justify-center gap-1 my-6 min-h-[3rem]">
        {word.split('').map((c, i) => {
          if (c === ' ') {
            return <span key={i} className="w-4" />;
          }
          const anim = letterAnims.find((a) => a.index === i);
          const revealed = guessed.has(c) || anim;
          const progress = anim?.progress ?? 1;

          return (
            <span
              key={i}
              className="inline-flex items-center justify-center w-10 h-12 text-xl font-bold border-2 rounded-lg bg-white/10 border-white/30"
              style={{
                transform: revealed
                  ? `scale(${0.5 + progress * 0.5})`
                  : 'scale(1)',
                opacity: revealed ? 1 : 0.6,
              }}
            >
              {revealed ? c : '?'}
            </span>
          );
        })}
      </div>

      {wordEntry.hint && (
        <div className="relative mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => {
                setShowHint((h) => !h);
                playSound('click');
              }}
              className="btn-elite btn-elite-ghost text-sm min-h-[44px] px-4 touch-manipulation active:scale-95"
            >
              {showHint ? 'Hide hint' : 'Show hint'}
            </button>
            <button
              type="button"
              onClick={useHint}
              disabled={hintsLeft <= 0 || gameState !== 'playing'}
              className="btn-elite btn-elite-ghost text-sm min-h-[44px] px-4 disabled:opacity-50 touch-manipulation active:scale-95"
              title={`Reveal one letter (-${HINT_POINT_PENALTY} pts)`}
            >
              Reveal letter ({hintsLeft}) −{HINT_POINT_PENALTY} pts
            </button>
          </div>
          {showHint && (
            <p className="mt-2 text-sm text-white/80 italic">Hint: {wordEntry.hint}</p>
          )}
        </div>
      )}

      {/* Letter frequency helper */}
      <div className="relative mb-4 p-2 bg-black/20 rounded-lg text-xs">
        <span className="text-white/70">Letter frequency hint: </span>
        <span className={avgFreq > 8 ? 'text-green-400' : avgFreq > 4 ? 'text-amber-400' : 'text-slate-400'}>
          {avgFreq > 8 ? 'Common letters' : avgFreq > 4 ? 'Mixed' : 'Rare letters'}
        </span>
      </div>

      {/* On-screen keyboard: touch-friendly min 44px, letter bounce, wrong-guess shake */}
      <div
        className="relative flex flex-col gap-1.5 sm:gap-1 mb-4"
        style={keyboardShake ? { animation: 'wrongGuessShake 0.4s ease-in-out' } : undefined}
      >
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1 sm:gap-1">
            {row.map((letter, ci) => {
              const isSelected = keyboardIndex.row === ri && keyboardIndex.col === ci;
              const used = guessed.has(letter);
              const inWord = word.includes(letter);
              const isPressed = pressedLetter === letter;

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={used || gameState !== 'playing'}
                  onClick={() => {
                    setPressedLetter(letter);
                    handleLetter(letter, false);
                    setTimeout(() => setPressedLetter(null), 150);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setPressedLetter(letter);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setPressedLetter(null);
                  }}
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 sm:w-9 sm:h-9 rounded-lg text-sm font-bold transition-transform duration-75 touch-manipulation select-none active:scale-95 ${
                    isPressed ? 'scale-90' : ''
                  } ${
                    isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-800 scale-110' : ''
                  } ${
                    used
                      ? inWord
                        ? 'bg-green-500/80 text-white cursor-default'
                        : 'bg-red-500/80 text-white cursor-default'
                      : gameState !== 'playing'
                        ? 'bg-white/20 text-white/60 cursor-default'
                        : 'bg-white/20 text-white hover:bg-white/40 active:bg-white/50 border border-white/30'
                  }`}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-white/60 mb-2">Arrow keys to move, Space/Enter to select</p>

      {gameState === 'won' && (
        <div className="relative p-4 rounded-xl bg-green-500/20 border border-green-400/50 animate-in fade-in duration-300">
          <p className="font-bold text-lg">Correct!</p>
          <p className="text-sm">+{Math.floor(100 + round * 20 + (streak >= 2 ? Math.min(streak * 15, 75) : 0))} points</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setStats((s) => ({ ...s, wordsCorrect: s.wordsCorrect + 1, bestStreak: Math.max(s.bestStreak, streak + 1) }));
                nextRound();
                playSound('levelup');
              }}
              className="btn-elite btn-elite-primary"
            >
              Next word
            </button>
            <button onClick={finishGame} className="btn-elite btn-elite-ghost">
              End game
            </button>
          </div>
        </div>
      )}

      {gameState === 'lost' && (
        <div className="relative p-4 rounded-xl bg-red-500/20 border border-red-400/50 animate-in fade-in duration-300">
          <p className="font-bold text-lg">Game over</p>
          <p className="text-sm">The word was: <strong>{word}</strong></p>
          <div className="flex gap-2 mt-2">
            {(gameMode === 'survival' ? lives > 0 : true) ? (
              <>
                <button
                  onClick={() => {
                    setStats((s) => ({ ...s, wordsWrong: s.wordsWrong + 1 }));
                    nextRound();
                  }}
                  className="btn-elite btn-elite-primary"
                >
                  Next word
                </button>
                <button onClick={finishGame} className="btn-elite btn-elite-ghost">
                  End game
                </button>
              </>
            ) : (
              <button onClick={finishGame} className="btn-elite btn-elite-primary">
                View stats
              </button>
            )}
          </div>
        </div>
      )}

      {gameState === 'playing' && round > 1 && (
        <button
          onClick={() => {
            setStats((s) => ({ ...s, wordsWrong: s.wordsWrong + 1 }));
            nextRound();
          }}
          className="btn-elite btn-elite-ghost text-sm"
        >
          Skip word
        </button>
      )}
    </div>
  );
}
