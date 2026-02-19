/* ═══════════════════════════════════════════════════════════════════════════════
   TYPE RACER — Elite Canvas-Based Racing Typing Game
   Canvas race track, AI opponents, multiple modes, ghost replay, car customization
   ═══════════════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';

interface TypeRacerProps {
  onClose: () => void;
}

type TextCategory = 'quotes' | 'code' | 'science' | 'stories' | 'poetry';
type GameMode = 'race' | 'sprint' | 'accuracy' | 'marathon' | 'custom';
type CarColor = 'red' | 'blue' | 'green';
type Difficulty = 'easy' | 'medium' | 'hard';

const QUOTES = [
  'The only way to do great work is to love what you do.',
  'Innovation distinguishes between a leader and a follower.',
  'Stay hungry, stay foolish.',
  'The best time to plant a tree was twenty years ago.',
  'Life is what happens when you are busy making other plans.',
  'In the middle of difficulty lies opportunity.',
  'The future belongs to those who believe in the beauty of their dreams.',
  'Success is not final, failure is not fatal.',
  'Do what you can with all you have, wherever you are.',
  'Believe you can and you are halfway there.',
  'The only impossible journey is the one you never begin.',
  'It does not matter how slowly you go as long as you do not stop.',
  'The only way to achieve the impossible is to believe it is possible.',
  'Excellence is not a destination; it is a continuous journey.',
  'Your time is limited, so do not waste it living someone else\'s life.',
  'The greatest glory in living lies not in never falling, but in rising every time we fall.',
  'In the end, we will remember not the words of our enemies, but the silence of our friends.',
  'The only thing we have to fear is fear itself.',
  'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.',
  'Life is either a daring adventure or nothing at all.',
];

const CODE_SNIPPETS = [
  'function calculateTotal(items) { return items.reduce((sum, item) => sum + item.price, 0); }',
  'const button = document.querySelector(".btn"); button.addEventListener("click", handleClick);',
  '<div className="container"><h1>Welcome</h1><p>Hello world!</p></div>',
  'const [count, setCount] = useState(0); useEffect(() => { document.title = `Count: ${count}`; }, [count]);',
  'const users = data.filter(user => user.active).map(user => user.name);',
  'const response = await fetch("/api/users"); const users = await response.json();',
  'function Component({ title, children }) { return <div><h2>{title}</h2>{children}</div>; }',
  'const result = numbers.map(n => n * 2).filter(n => n > 10).reduce((a, b) => a + b, 0);',
  'if (user.isAuthenticated) { redirect("/dashboard"); } else { showLogin(); }',
  'const styles = { color: "blue", fontSize: "16px", margin: "10px" };',
  'async function loadData() { const res = await fetch(url); return res.json(); }',
  'try { await operation(); } catch (error) { console.error("Failed:", error); }',
  'const memoized = useMemo(() => compute(a, b), [a, b]);',
  'useEffect(() => { const sub = observable.subscribe(handler); return () => sub.unsubscribe(); }, []);',
  'const { data, error, loading } = useQuery(key, fetcher, { staleTime: 5000 });',
];

const SCIENCE_FACTS = [
  'The speed of light in a vacuum is approximately 299,792 kilometers per second.',
  'DNA stores genetic information in a double helix structure discovered by Watson and Crick.',
  'Photosynthesis converts sunlight and carbon dioxide into glucose and oxygen.',
  "Newton's second law states that force equals mass multiplied by acceleration.",
  'Black holes are regions of spacetime where gravity is so strong that nothing can escape.',
  'The mitochondria is often called the powerhouse of the cell.',
  'The periodic table organizes elements by atomic number and electron configuration.',
  'Water boils at 100 degrees Celsius at standard atmospheric pressure.',
  'The human body contains approximately 206 bones in the adult skeleton.',
  'Electrons carry a negative charge and orbit the nucleus in energy levels.',
  'Climate change is driven by greenhouse gases trapping heat in the atmosphere.',
  'Evolution occurs through natural selection acting on genetic variation.',
  'Quantum entanglement allows particles to be correlated across vast distances instantly.',
  'The universe is expanding at an accelerating rate due to dark energy.',
  'Bacteria outnumber human cells in the body by approximately three to one.',
];

const STORIES = [
  'She walked through the garden and saw beautiful flowers blooming everywhere. The scent filled the air as butterflies danced between petals.',
  'He opened the old book and started reading. Dust particles floated in the sunlight streaming through the window.',
  'They decided to go to the store and buy groceries. The market was busy with shoppers filling their carts.',
  'The train arrived at midnight. A lone figure stepped onto the platform and vanished into the fog.',
  'Every morning she would sit by the window with a cup of tea and watch the world wake up.',
  'The old lighthouse had stood guard for over a century. Tonight its beam swept across the stormy sea.',
  'In the depths of the forest, something ancient stirred. The birds fell silent.',
  'He had traveled a thousand miles to deliver the letter. Now he stood at her door, uncertain.',
];

const POETRY = [
  'The quick brown fox jumps over the lazy dog near the river bank. Evening falls and shadows stretch.',
  'Roses are red, violets are blue. The sky above us stretches wide and true.',
  'In the stillness of night, stars whisper secrets to those who listen carefully with open hearts.',
  'Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler.',
  'Shall I compare thee to a summer day? Thou art more lovely and more temperate.',
  'I wandered lonely as a cloud that floats on high oer vales and hills.',
  'The fog comes on little cat feet. It sits looking over harbor and city.',
  'Do not go gentle into that good night. Rage, rage against the dying of the light.',
  'Hope is the thing with feathers that perches in the soul and sings the tune without the words.',
];

const TEXTS: Record<TextCategory, string[]> = {
  quotes: QUOTES,
  code: CODE_SNIPPETS,
  science: SCIENCE_FACTS,
  stories: STORIES,
  poetry: POETRY,
};

const AI_OPPONENTS = [
  { name: 'Turbo Tina', wpm: 45, color: '#E53E3E' },
  { name: 'Fast Fred', wpm: 55, color: '#3182CE' },
  { name: 'Speedy Sam', wpm: 65, color: '#38A169' },
];

const CAR_COLORS: Record<CarColor, string> = {
  red: '#E53E3E',
  blue: '#3182CE',
  green: '#38A169',
};

const HIGH_SCORE_KEY = 'typeracer_highscores';

interface HighScores {
  race: number;
  sprint: number;
  accuracy: number;
  marathon: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickByDifficulty(arr: string[], difficulty: Difficulty): string {
  const sorted = [...arr].sort((a, b) => a.length - b.length);
  const third = Math.max(1, Math.floor(sorted.length / 3));
  if (difficulty === 'easy') return pickRandom(sorted.slice(0, third));
  if (difficulty === 'hard') return pickRandom(sorted.slice(-third));
  return pickRandom(sorted.slice(third, -third));
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function calculateWPM(charactersTyped: number, elapsedMinutes: number): number {
  const words = charactersTyped / 5;
  return Math.round(words / Math.max(0.001, elapsedMinutes));
}

function loadHighScores(): HighScores {
  try {
    const stored = localStorage.getItem(HIGH_SCORE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { race: 0, sprint: 0, accuracy: 0, marathon: 0 };
}

function saveHighScore(mode: keyof HighScores, score: number) {
  const scores = loadHighScores();
  if (score > scores[mode]) {
    scores[mode] = score;
    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
  }
}

export default function TypeRacer({ onClose }: TypeRacerProps) {
  const [mode, setMode] = useState<GameMode>('race');
  const [category, setCategory] = useState<TextCategory>('quotes');
  const [carColor, setCarColor] = useState<CarColor>('red');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [text, setText] = useState('');
  const [customText, setCustomText] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [mistakes, setMistakes] = useState<{ word: string; typed: string; position: number }[]>([]);
  const [errorPositions, setErrorPositions] = useState<number[]>([]);
  const [streakCount, setStreakCount] = useState(0);
  const [aiPositions, setAiPositions] = useState<number[]>([0, 0, 0]);
  const [shake, setShake] = useState(false);
  const [bestRunData, setBestRunData] = useState<{ positions: number[]; timestamps: number[] } | null>(null);
  const [showGhostReplay, setShowGhostReplay] = useState(false);
  const [finishCelebration, setFinishCelebration] = useState(false);
  const [finishParticles, setFinishParticles] = useState<{ id: number; x: number; y: number; vx: number; vy: number; hue: number; life: number; size: number }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const wpmUpdateRef = useRef<number>(0);
  const aiUpdateRef = useRef<number>(0);
  const ghostReplayRef = useRef<number>(0);
  const runRecordingRef = useRef<{ positions: number[]; timestamps: number[] }>({ positions: [], timestamps: [] });

  const trackLength = 100;
  const laneCount = 4;

  const loadText = useCallback(() => {
    if (mode === 'custom' && customText.trim()) {
      setText(customText.trim());
      setWords(getWords(customText.trim()));
    } else {
      const arr = TEXTS[category];
      const t = pickByDifficulty(arr, difficulty);
      setText(t);
      setWords(getWords(t));
    }
    setTyped('');
    setCurrentWordIndex(0);
    setCurrentCharIndex(0);
    setCorrectChars(0);
    setTotalChars(0);
    setMistakes([]);
    setErrorPositions([]);
    setWpmHistory([]);
    setStreakCount(0);
    setAiPositions([0, 0, 0]);
    setTimeLeft(mode === 'sprint' ? 60 : mode === 'marathon' ? 300 : 60);
  }, [category, mode, customText, difficulty]);

  useEffect(() => {
    if (!started && !gameOver) loadText();
  }, [loadText, started, gameOver]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [started, gameOver]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'ontouchstart' in window && started && !gameOver) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [started, gameOver]);

  const finishParticlesRef = useRef<typeof finishParticles>([]);
  finishParticlesRef.current = finishParticles;
  useEffect(() => {
    if (!finishCelebration || finishParticles.length === 0) return;
    let raf: number;
    const animate = () => {
      const prev = finishParticlesRef.current;
      const next = prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 0.02,
        }))
        .filter(p => p.life > 0);
      setFinishParticles(next);
      if (next.length > 0) raf = requestAnimationFrame(animate);
      else setFinishCelebration(false);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [finishCelebration, finishParticles.length]);

  useEffect(() => {
    if (!started || gameOver) return;
    runRecordingRef.current = { positions: [], timestamps: [] };
    wpmUpdateRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 60000;
      const charsSoFar = words.slice(0, currentWordIndex).join('').length + typed.length;
      const currentWpm = calculateWPM(charsSoFar, elapsed);
      setWpm(currentWpm);
      setWpmHistory((prev) => [...prev.slice(-59), currentWpm]);
      const progress = text.length > 0 ? charsSoFar / text.length : 0;
      runRecordingRef.current.positions.push(progress);
      runRecordingRef.current.timestamps.push(Date.now() - startTimeRef.current);
    }, 500);
    return () => clearInterval(wpmUpdateRef.current);
  }, [started, gameOver, currentWordIndex, typed, words, text.length]);

  useEffect(() => {
    if (!started || gameOver) return;
    const isTimed = mode === 'sprint' || mode === 'marathon';
    if (!isTimed) return;

    timerRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);

      if (mode === 'sprint') {
        const left = 60 - elapsed;
        setTimeLeft(left);
        if (left <= 0) {
          setGameOver(true);
          playSound('gameover');
        }
      } else if (mode === 'marathon') {
        const left = 300 - elapsed;
        setTimeLeft(left);
        if (left <= 0) {
          setGameOver(true);
          playSound('gameover');
        }
      }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, [started, gameOver, mode]);

  useEffect(() => {
    if (!started || gameOver) return;

    aiUpdateRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setAiPositions([
        Math.min(trackLength, (elapsed / 60) * AI_OPPONENTS[0].wpm * 2),
        Math.min(trackLength, (elapsed / 60) * AI_OPPONENTS[1].wpm * 2),
        Math.min(trackLength, (elapsed / 60) * AI_OPPONENTS[2].wpm * 2),
      ]);
    }, 100);
    return () => clearInterval(aiUpdateRef.current);
  }, [started, gameOver]);

  const playerProgress = text.length > 0
    ? (words.slice(0, currentWordIndex).join('').length + typed.length) / text.length
    : 0;
  const playerPosition = playerProgress * trackLength;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && typed.length > 0) {
      playSound('typing');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;

    if (!started && v) {
      setStarted(true);
      startTimeRef.current = Date.now();
      playSound('go');
    }
    if (gameOver) return;

    const word = words[currentWordIndex];
    if (!word) return;

    if (v.endsWith(' ') || v.includes('  ')) {
      const typedWord = v.trimEnd();
      const correct = typedWord === word;

      if (correct) {
        setStreakCount((s) => s + 1);
        if (streakCount >= 2) playSound('streak');
        else playSound('correct');
      } else {
        setStreakCount(0);
        setMistakes((m) => [...m, { word, typed: typedWord, position: currentCharIndex }]);
        setErrorPositions((p) => [...p, currentCharIndex]);
        setShake(true);
        setTimeout(() => setShake(false), 400);
        playSound('wrong');
      }

      setCorrectChars((c) => c + (correct ? word.length : 0));
      setTotalChars((t) => t + typedWord.length);
      setTyped('');
      const nextIndex = Math.min(currentWordIndex + 1, words.length);
      setCurrentWordIndex(nextIndex);

      const wordsSoFar = words.slice(0, nextIndex).join(' ');
      setCurrentCharIndex(wordsSoFar.length + (nextIndex < words.length ? 1 : 0));
      e.target.value = '';

      if ((mode === 'race' || mode === 'custom') && nextIndex >= words.length) {
        setGameOver(true);
        playSound('victory');
        const elapsed = (Date.now() - startTimeRef.current) / 60000;
        const finalWpm = calculateWPM(text.length, elapsed);
        if (mode === 'race') saveHighScore('race', finalWpm);
        setFinishCelebration(true);
        const particles: { id: number; x: number; y: number; vx: number; vy: number; hue: number; life: number; size: number }[] = [];
        for (let i = 0; i < 80; i++) {
          const angle = (Math.PI * 2 * i) / 80 + Math.random() * 0.5;
          const speed = 4 + Math.random() * 8;
          particles.push({
            id: i,
            x: 0,
            y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 6,
            hue: 35 + Math.random() * 25,
            life: 1,
            size: 4 + Math.random() * 6,
          });
        }
        setFinishParticles(particles);
      }

      if (mode === 'accuracy' && nextIndex >= words.length) {
        const perfect = mistakes.length === 0 && correct;
        if (perfect) {
          setGameOver(true);
          playSound('victory');
          saveHighScore('accuracy', 100);
        } else {
          setGameOver(true);
          playSound('gameover');
        }
      }
      return;
    }

    setTyped(v);
    const wordsSoFar = words.slice(0, currentWordIndex).join(' ');
    setCurrentCharIndex(wordsSoFar.length + (wordsSoFar.length > 0 ? 1 : 0) + v.length);
  };

  useEffect(() => {
    if (gameOver && started) {
      const chars = words.slice(0, currentWordIndex).join('').length + typed.length;
      if (mode === 'sprint') saveHighScore('sprint', calculateWPM(chars, elapsedSeconds / 60));
      if (mode === 'marathon') saveHighScore('marathon', calculateWPM(chars, elapsedSeconds / 60));
      const rec = runRecordingRef.current;
      if (rec.positions.length > 0) {
        setBestRunData({ positions: [...rec.positions], timestamps: [...rec.timestamps] });
      }
    }
  }, [gameOver, started, mode, currentWordIndex, typed, words, elapsedSeconds]);

  const handleRestart = () => {
    setStarted(false);
    setGameOver(false);
    setFinishCelebration(false);
    setFinishParticles([]);
    setTimeLeft(mode === 'sprint' ? 60 : mode === 'marathon' ? 300 : 60);
    setElapsedSeconds(0);
    setWpm(0);
    setWpmHistory([]);
    setShowGhostReplay(false);
    loadText();
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    playSound('click');
  };

  const startGhostReplay = () => {
    setShowGhostReplay(true);
    playSound('powerup');
  };

  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
  const typedSoFar = words.slice(0, currentWordIndex).join(' ') + (currentWordIndex > 0 ? ' ' : '') + typed;
  const typedChars = typedSoFar.split('');
  const maxWpm = wpmHistory.length > 0 ? Math.max(...wpmHistory, wpm) : wpm;
  const highScores = loadHighScores();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const laneHeight = h / (laneCount + 2);
      const trackY = laneHeight;
      const trackHeight = laneHeight * laneCount;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#4a4a6a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= laneCount; i++) {
        const y = trackY + i * laneHeight;
        ctx.beginPath();
        ctx.setLineDash([8, 8]);
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.strokeStyle = '#6a6a8a';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, trackY, w, trackHeight);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('YOU', 4, trackY - 4);
      AI_OPPONENTS.forEach((ai, idx) => {
        ctx.fillStyle = ai.color;
        ctx.fillText(ai.name, 4, trackY + (idx + 1) * laneHeight - 4);
      });
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      for (let i = 0; i < 12; i++) {
        ctx.fillRect(w - 18 - i * 6, trackY + 4, 4, trackHeight - 8);
      }
      ctx.fillStyle = '#fbbf24';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('FINISH', w - 8, trackY + trackHeight / 2 + 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.setLineDash([4, 12]);
      ctx.beginPath();
      ctx.moveTo(w / 2, trackY);
      ctx.lineTo(w / 2, trackY + trackHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      const carWidth = 24;
      const carHeight = 16;
      const baseX = (v: number) => (v / trackLength) * (w - carWidth - 20) + 10;

      const drawCar = (x: number, lane: number, color: string, isPlayer: boolean) => {
        const y = trackY + lane * laneHeight + laneHeight / 2 - carHeight / 2;
        ctx.save();

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isPlayer ? 8 : 0;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, carWidth, carHeight, 4);
        } else {
          ctx.rect(x, y, carWidth, carHeight);
        }
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 4, 6, 4);
        ctx.fillRect(x + 14, y + 4, 6, 4);

        ctx.restore();
      };

      AI_OPPONENTS.forEach((ai, i) => {
        drawCar(baseX(aiPositions[i]), i + 1, ai.color, false);
      });

      drawCar(baseX(playerPosition), 0, CAR_COLORS[carColor], true);

      if (showGhostReplay && bestRunData && bestRunData.positions.length > 0) {
        const ghostProgress = ((Date.now() % 3000) / 3000) * bestRunData.positions.length;
        const idx = Math.min(Math.floor(ghostProgress), bestRunData.positions.length - 1);
        const ghostPos = bestRunData.positions[idx] * trackLength;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        drawCar(baseX(ghostPos), 0, '#888888', false);
        ctx.globalAlpha = 1;
      }
    };

    const frame = requestAnimationFrame(function loop() {
      draw();
      ghostReplayRef.current = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, [aiPositions, playerPosition, carColor, showGhostReplay, bestRunData]);

  const isCharInMistake = (idx: number) =>
    mistakes.some((m) => idx >= m.position && idx < m.position + m.word.length);
  const getMistakeCharAt = (idx: number): string | undefined => {
    for (const m of mistakes) {
      const rel = idx - m.position;
      if (rel >= 0 && rel < m.typed.length) return m.typed[rel];
    }
    return undefined;
  };

  const renderText = () =>
    text.split('').map((ch, i) => {
      const tc = typedChars[i];
      const isCurrent = i === currentCharIndex && !gameOver;
      const isError = isCharInMistake(i);
      const wrongTyped = isError ? getMistakeCharAt(i) : undefined;

      if (tc === undefined) {
        return (
          <span
            key={i}
            className={`${isCurrent ? 'bg-blue-400/40 text-blue-900 animate-pulse ring-1 ring-blue-400 ring-inset' : 'text-gray-500'} ${isError ? 'bg-red-300/80 text-red-900 ring-1 ring-red-500 ring-inset' : ''}`}
          >
            {ch}
          </span>
        );
      }
      const isCorrect = tc === ch;
      return (
        <span
          key={i}
          className={isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 bg-red-300 ring-1 ring-red-500 ring-inset font-semibold line-through'}
          title={!isCorrect && wrongTyped ? `You typed: ${wrongTyped}` : undefined}
        >
          {ch}
        </span>
      );
    });

  return (
    <div className={`game-card bg-slate-900 text-white border border-slate-700 overflow-hidden w-full max-w-lg mx-auto ${shake ? 'animate-shake' : ''}`}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease-out; }
      `}</style>

      <div className="flex items-center justify-between mb-4 px-4 pt-4">
        <h2 className="text-2xl font-bold text-amber-400">⌨️ Speed Typer</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm touch-manipulation active:scale-95">
          Close
        </button>
      </div>

      {!started && !gameOver && (
        <div className="px-4 space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Game Mode</label>
            <div className="flex gap-2 flex-wrap">
              {(['race', 'sprint', 'accuracy', 'marathon', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`btn-elite text-sm touch-manipulation active:scale-95 ${mode === m ? 'btn-elite-primary bg-amber-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {mode !== 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty</label>
                <div className="flex gap-2 flex-wrap">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`btn-elite text-sm touch-manipulation active:scale-95 ${difficulty === d ? 'btn-elite-primary bg-amber-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Text Category</label>
                <div className="flex gap-2 flex-wrap">
                  {(['quotes', 'code', 'science', 'stories', 'poetry'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`btn-elite text-sm touch-manipulation active:scale-95 ${category === c ? 'btn-elite-primary bg-amber-600' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            </>
          )}

          {mode === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Your Text</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type or paste your practice text..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 min-h-[100px]"
              />
            </div>
          )}

          {mode === 'race' && (
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-600">
              <label className="block text-sm font-medium text-slate-300 mb-2">AI Opponents</label>
              <div className="space-y-1 text-xs">
                {AI_OPPONENTS.map((ai, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ai.color }} />
                    <span className="text-slate-300">{ai.name}</span>
                    <span className="text-slate-500">— {ai.wpm} WPM</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 mt-2 text-xs">Beat them by typing faster and finishing first!</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Car Color</label>
            <div className="flex gap-2">
              {(['red', 'blue', 'green'] as CarColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCarColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${carColor === c ? 'border-amber-400 scale-110' : 'border-slate-600'}`}
                  style={{ backgroundColor: CAR_COLORS[c] }}
                />
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-2">
            <p className="font-medium text-slate-300">Modes: Race (finish vs AI) | Sprint (60s) | Accuracy (perfect only) | Marathon (5 min) | Custom (your text)</p>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-600">
              <p className="font-medium text-slate-300 mb-1">Difficulty Levels</p>
              <p><span className="text-green-400">Easy</span>: Shorter passages (bottom third). Best for beginners.</p>
              <p><span className="text-amber-400">Medium</span>: Mid-length passages. Balanced challenge.</p>
              <p><span className="text-red-400">Hard</span>: Longer passages. For advanced typists.</p>
              <p className="mt-1">Mistakes are highlighted in red with strike-through. Tap the text area on mobile to focus the keyboard.</p>
            </div>
            <button
              onClick={() => { loadText(); playSound('click'); }}
              className="btn-elite bg-slate-700 hover:bg-slate-600 text-sm mt-2 touch-manipulation active:scale-95"
            >
              Shuffle Text
            </button>
          </div>
        </div>
      )}

      {finishCelebration && finishParticles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {finishParticles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `calc(50% + ${p.x * 2}px)`,
                top: `calc(50% + ${p.y * 2}px)`,
                width: p.size,
                height: p.size,
                background: `hsl(${p.hue}, 80%, 55%)`,
                opacity: p.life,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
      )}

      {gameOver ? (
        <div className="px-4 pb-6 space-y-6">
          <h3 className="text-2xl font-bold text-amber-400 text-center">Results</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-xs text-slate-400">WPM</span>
              <p className="text-2xl font-bold text-amber-400">{wpm}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-xs text-slate-400">Accuracy</span>
              <p className={`text-2xl font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}%
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-xs text-slate-400">Chars</span>
              <p className="text-2xl font-bold text-white">{totalChars}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-xs text-slate-400">Errors</span>
              <p className="text-2xl font-bold text-red-400">{mistakes.length}</p>
            </div>
          </div>

          {mode === 'race' && (
            <div className="p-4 rounded-xl bg-slate-800 border border-amber-500/50">
              <span className="text-xs text-slate-400">Race Result</span>
              <p className="text-lg font-bold text-amber-400">You finished the passage!</p>
              <p className="text-sm text-slate-400 mt-1">
                Your WPM of {wpm} competed against Turbo Tina (45), Fast Fred (55), and Speedy Sam (65).
              </p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-2">WPM Over Time — Instant Velocity</h4>
            <p className="text-xs text-slate-500 mb-2">Each bar = 1 second. Peak WPM: {maxWpm}</p>
            <div className="h-24 bg-slate-800 rounded-xl p-3 border border-slate-600 flex items-end gap-0.5">
              {wpmHistory.map((w, i) => {
                const height = maxWpm > 0 ? (w / maxWpm) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-amber-500 rounded-t min-w-[2px] transition-all"
                    style={{ height: `${Math.max(2, height)}%` }}
                    title={`${w} WPM`}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-slate-400">Correct Chars</span>
              <p className="text-lg font-bold text-green-400">{correctChars}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-600">
              <span className="text-slate-400">Total Chars</span>
              <p className="text-lg font-bold text-white">{totalChars}</p>
            </div>
          </div>

          {mistakes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Error Breakdown — Mistake Positions</h4>
              <div className="max-h-32 overflow-y-auto text-sm space-y-1 bg-slate-800 p-3 rounded-xl border border-slate-600">
                {mistakes.map((m, i) => (
                  <div key={i} className="text-slate-300 flex justify-between">
                    <span>Expected <span className="text-green-400">{m.word}</span> → typed{' '}
                    <span className="text-red-400">{m.typed}</span></span>
                    <span className="text-slate-500">Position #{m.position}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleRestart} className="btn-elite bg-amber-600 hover:bg-amber-500 flex-1 touch-manipulation active:scale-95">
              Play Again
            </button>
            <button
              onClick={startGhostReplay}
              className="btn-elite bg-slate-700 hover:bg-slate-600 touch-manipulation active:scale-95"
              title="Watch a semi-transparent ghost car replay your run on the track"
            >
              Ghost Replay
            </button>
            <button onClick={onClose} className="btn-elite bg-slate-700 hover:bg-slate-600 touch-manipulation active:scale-95">
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 mb-3 w-full" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={140}
              className="block w-full max-w-full rounded-xl border border-slate-600 bg-slate-800"
              style={{ maxHeight: 140, maxWidth: '100%' }}
            />
          </div>

          <div className="px-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Live WPM</span>
              <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                {wpm} <span className="text-sm font-normal text-slate-400">WPM</span>
                {wpmHistory.length >= 2 && wpm > (wpmHistory[wpmHistory.length - 2] ?? 0) && (
                  <span className="text-green-400 text-sm animate-pulse">↑</span>
                )}
                {wpmHistory.length >= 2 && wpm < (wpmHistory[wpmHistory.length - 2] ?? 0) && wpm > 0 && (
                  <span className="text-red-400 text-sm">↓</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase tracking-wide">Accuracy</span>
              <div className={`text-lg font-semibold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                {accuracy}%
              </div>
            </div>
            <div className="text-lg font-semibold text-slate-400">
              {mode === 'sprint' || mode === 'marathon' ? `Time: ${timeLeft}s` : `Chars: ${totalChars}`}
            </div>
            {(mode === 'sprint' || mode === 'marathon') && (
              <div className="text-lg font-semibold text-slate-300">
                Words: {currentWordIndex} {mode === 'marathon' && `| ${formatTime(elapsedSeconds)}`}
              </div>
            )}
            <div className="text-sm text-slate-500">
              Errors: {mistakes.length}
            </div>
            {streakCount >= 3 && (
              <span className="text-amber-400 font-bold animate-pulse">🔥 {streakCount} streak!</span>
            )}
          </div>

          <div className="px-4 mb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Progress</span>
              <span>{Math.round((currentWordIndex / Math.max(1, words.length)) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${(currentWordIndex / Math.max(1, words.length)) * 100}%` }}
              />
            </div>
          </div>

          <div
            className="px-4 py-4 mx-4 mb-4 rounded-xl border-2 border-slate-600 bg-slate-800/50 min-h-[120px] leading-relaxed text-lg font-mono cursor-text touch-manipulation"
            onClick={() => { inputRef.current?.focus(); }}
            onTouchEnd={(e) => { e.preventDefault(); inputRef.current?.focus(); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.focus()}
          >
            {renderText()}
            {!gameOver && currentCharIndex >= text.length && text.length > 0 && (
              <span className="inline-block w-0.5 h-5 bg-amber-400 animate-pulse ml-1 align-middle" />
            )}
          </div>

          <div className="px-4 pb-4">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              enterKeyHint="done"
              placeholder="Start typing to race..."
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 bg-slate-800 border-2 border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg touch-manipulation min-h-[48px]"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
            />
          </div>

          <div className="px-4 pb-4 space-y-2">
            <div className="text-xs text-slate-500">
              High scores: Race {highScores.race} | Sprint {highScores.sprint} | Accuracy {highScores.accuracy}% | Marathon {highScores.marathon}
            </div>
            <div className="text-xs text-slate-600">
              Use space to advance words. Backspace to fix before space. Focus the input and start typing.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
