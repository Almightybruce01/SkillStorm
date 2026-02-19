/* ═══════════════════════════════════════════════════════════
   WORD BUILDER / SENTENCE BUILDER ENGINE
   Used by: Sentence Builder Pro, Grammar Gladiator, Essay Builder Rush
   Arrange scrambled words in correct order to form a sentence
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Grade } from '../questionBank';
import { playSound } from '../SoundEngine';

type DifficultyMode = 'easy' | 'normal' | 'hard';

const SENTENCE_BANK: Record<Grade, string[]> = {
  'K-2': [
    'The cat sat on the mat',
    'I like to play games',
    'She has a red ball',
    'We go to school',
    'He can run fast',
    'My dog is very happy',
    'The sun shines bright today',
    'I see a big blue sky',
    'Mom makes yummy cookies',
    'We read books together',
    'The bird flies high',
    'I love my family',
  ],
  '3-5': [
    'The quick brown fox jumps over the lazy dog',
    'Scientists discovered a new planet yesterday',
    'Reading books improves your vocabulary skills',
    'The storm brought heavy rain and strong winds',
    'Children learn best when they have fun',
    'The library has thousands of interesting books',
    'Mountains rise high above the clouds',
    'Ocean waves crash against the sandy shore',
    'Students practice math problems every day',
    'The museum displays ancient artifacts from history',
    'Gardens bloom with colorful flowers in spring',
    'Technology helps us communicate around the world',
  ],
  '6-8': [
    'The committee decided to postpone the annual conference',
    'Despite the heavy rain the team continued practicing',
    'Ancient civilizations developed complex writing systems',
    'Climate change affects ecosystems around the world',
    'Mathematical equations require careful problem solving',
    'Historical events shape our understanding of society',
    'Literature explores themes of human experience',
    'Scientific experiments follow rigorous methodology',
    'Geographic features influence cultural development',
    'Economic systems impact global trade relationships',
    'Artistic expression reflects cultural values',
    'Educational institutions prepare students for careers',
  ],
  '9-12': [
    'The theoretical framework establishes fundamental principles for analysis',
    'Photosynthesis converts light energy into chemical energy efficiently',
    'Democracy requires active participation from informed citizens',
    'Scientific methodology emphasizes empirical observation and experimentation',
    'Literary analysis examines narrative structure and thematic development',
    'Mathematical proofs demonstrate logical relationships between concepts',
    'Historical interpretation involves examining multiple perspectives',
    'Economic theory explains market behavior and resource allocation',
    'Philosophical inquiry explores questions of existence and knowledge',
    'Technological innovation transforms communication and information access',
    'Social structures influence individual behavior and collective outcomes',
    'Environmental science addresses complex interactions within ecosystems',
  ],
};

// Scrabble-style letter point values
const LETTER_POINTS: Record<string, number> = {
  // Common letters (1 point)
  'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'R': 1, 'S': 1, 'T': 1,
  // Less common (2 points)
  'D': 2, 'G': 2,
  // Uncommon (3 points)
  'B': 3, 'C': 3, 'M': 3, 'P': 3,
  // Rare (4 points)
  'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
  // Very rare (5 points)
  'K': 5,
  // Extremely rare (8 points)
  'J': 8, 'X': 8,
  // Ultra rare (10 points)
  'Q': 10, 'Z': 10,
};

// Calculate word score based on letters
function calculateWordScore(word: string, multiplier: number = 1): number {
  let baseScore = 0;
  for (const char of word.toUpperCase()) {
    baseScore += LETTER_POINTS[char] || 1;
  }
  return Math.floor(baseScore * multiplier);
}

// Get point value for a single letter
function getLetterPoint(letter: string): number {
  return LETTER_POINTS[letter.toUpperCase()] || 1;
}

const themes: Record<string, { top: string; bottom: string; accent: string; pillBg: string; textColor: string }> = {
  sentence_builder_pro: { top: '#faf5ff', bottom: '#f3e8ff', accent: '#8b5cf6', pillBg: 'rgba(139,92,246,0.12)', textColor: '#1f2937' },
  grammar_gladiator: { top: '#fff7ed', bottom: '#ffedd5', accent: '#ea580c', pillBg: 'rgba(234,88,12,0.12)', textColor: '#1f2937' },
  essay_builder_rush: { top: '#ecfdf5', bottom: '#d1fae5', accent: '#059669', pillBg: 'rgba(5,150,105,0.12)', textColor: '#1f2937' },
  default: { top: '#eff6ff', bottom: '#dbeafe', accent: '#2563eb', pillBg: 'rgba(37,99,235,0.12)', textColor: '#1f2937' },
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getSentence(grade: Grade, level: number, complexity: number = 1): string {
  const bank = SENTENCE_BANK[grade];
  const filtered = bank.filter(s => {
    const len = s.split(' ').length;
    const maxLen = level <= 2 ? 6 : level <= 5 ? 10 : 20;
    return len <= Math.ceil(maxLen * complexity);
  });
  return filtered[Math.floor(Math.random() * filtered.length)] || bank[0];
}

// Generate bonus tile positions (gold 2x, purple 3x)
function generateBonusTiles(wordCount: number): Record<number, 'gold' | 'purple'> {
  const bonuses: Record<number, 'gold' | 'purple'> = {};
  const goldCount = Math.max(1, Math.floor(wordCount * 0.2));
  const purpleCount = Math.max(0, Math.floor(wordCount * 0.1));
  
  const positions = Array.from({ length: wordCount }, (_, i) => i);
  shuffle(positions);
  
  for (let i = 0; i < goldCount; i++) {
    bonuses[positions[i]] = 'gold';
  }
  for (let i = goldCount; i < goldCount + purpleCount; i++) {
    bonuses[positions[i]] = 'purple';
  }
  
  return bonuses;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  value: string;
  life: number;
}

interface AchievementNotification {
  id: number;
  message: string;
  life: number;
}

interface GameStats {
  sentencesCompleted: number;
  totalAttempts: number;
  correctPlacements: number;
  bestStreak: number;
  sentenceTimes: number[];
}

const DIFFICULTY_CONFIG: Record<DifficultyMode, { timeMult: number; sentenceComplexity: number }> = {
  easy: { timeMult: 1.4, sentenceComplexity: 0.7 },
  normal: { timeMult: 1.0, sentenceComplexity: 1.0 },
  hard: { timeMult: 0.6, sentenceComplexity: 1.3 },
};

export function WordBuilder({ gameId, grade, onClose, onRoundEnd }: { gameId: string; grade: Grade; onClose: () => void; onRoundEnd?: (round: number, score: number) => void }) {
  const theme = themes[gameId] || themes.default;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [sentence, setSentence] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [bonusTiles, setBonusTiles] = useState<Record<number, 'gold' | 'purple'>>({});
  const [validationState, setValidationState] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [toastMessage, setToastMessage] = useState('');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [animatedWords, setAnimatedWords] = useState<Set<number>>(new Set());
  const [hintActive, setHintActive] = useState(false);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [showCelebration, setShowCelebration] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [draggingWord, setDraggingWord] = useState<{ word: string; index: number; inPool: boolean } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyMode>('normal');
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [achievements, setAchievements] = useState<AchievementNotification[]>([]);
  const [gameStats, setGameStats] = useState<GameStats>({ sentencesCompleted: 0, totalAttempts: 0, correctPlacements: 0, bestStreak: 0, sentenceTimes: [] });
  const [sentenceTransition, setSentenceTransition] = useState<'in' | 'out' | 'idle'>('idle');
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [correctStreak, setCorrectStreak] = useState(0);
  const timerRef = useRef<number>();
  const timeTotalRef = useRef(15);
  const particleIdRef = useRef(0);
  const animationFrameRef = useRef<number>();
  const sentenceStartTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number; word: string; index: number; inPool: boolean } | null>(null);
  const hintTimeoutRef = useRef<number>();
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const floatingScoreIdRef = useRef(0);
  const achievementIdRef = useRef(0);

  const showAchievement = useCallback((message: string) => {
    const id = achievementIdRef.current++;
    setAchievements(prev => [...prev, { id, message, life: 1 }]);
    setTimeout(() => setAchievements(a => a.filter(x => x.id !== id)), 2500);
  }, []);

  // Create celebratory particles
  const createParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 3;
      newParticles.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    const animate = () => {
      setParticles(prev => {
        const updated = prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2, // gravity
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0 && p.y < 1000);
        return updated;
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [particles.length]);

  useEffect(() => {
    if (floatingScores.length === 0) return;
    const id = setInterval(() => {
      setFloatingScores(prev => prev.map(f => ({ ...f, life: Math.max(0, f.life - 0.02), y: f.y - 2 })).filter(f => f.life > 0));
    }, 30);
    return () => clearInterval(id);
  }, [floatingScores.length]);

  const loadSentence = useCallback(() => {
    setSentenceTransition('out');
    setTimeout(() => {
      const cfg = DIFFICULTY_CONFIG[difficulty];
      const s = getSentence(grade, level, cfg.sentenceComplexity);
      setSentence(s);
      const wordArray = shuffle(s.split(' '));
      setWords(wordArray);
      setSelected([]);
      setValidationState('none');
      setToastMessage('');
      setAnimatedWords(new Set());
      setHintActive(false);
      setDropTargetIndex(null);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      sentenceStartTimeRef.current = Date.now();
      const bonuses = generateBonusTiles(wordArray.length);
      setBonusTiles(bonuses);
      const baseTime = grade === 'K-2' ? 20 : grade === '3-5' ? 18 : grade === '6-8' ? 15 : 12;
      timeTotalRef.current = Math.max(6, (baseTime - (level - 1) * 1.5) * cfg.timeMult);
      setTimeLeft(timeTotalRef.current);
      setShuffling(true);
      setSentenceTransition('in');
      setTimeout(() => setShuffling(false), 500);
    }, 300);
  }, [grade, level, difficulty]);

  useEffect(() => {
    loadSentence();
  }, [loadSentence]);

  useEffect(() => {
    if (gameOver) return;
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          playSound('wrong');
          setLives(l => {
            const nl = l - 1;
            if (nl <= 0) setGameOver(true);
            return nl;
          });
          setCorrectCount(0);
          setCorrectStreak(0);
          setShake(true);
          setValidationState('incorrect');
          setToastMessage('Time\'s up!');
          setTimeout(() => {
            setShake(false);
            setValidationState('none');
            setToastMessage('');
          }, 2000);
          loadSentence();
          return timeTotalRef.current;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameOver, loadSentence]);

  const expectedNext = sentence ? sentence.split(' ')[selected.length] : '';

  const pickWord = (word: string, index: number) => {
    if (gameOver) return;
    setGameStats(s => ({ ...s, totalAttempts: s.totalAttempts + 1 }));
    if (word !== expectedNext) {
      playSound('wrong');
      setShake(true);
      setCorrectStreak(0);
      setComboMultiplier(1);
      setValidationState('incorrect');
      setToastMessage('Wrong word! Try again.');
      setTimeout(() => {
        setShake(false);
        setValidationState('none');
        setToastMessage('');
      }, 1500);
      setLives(l => {
        const nl = l - 1;
        if (nl <= 0) setGameOver(true);
        return nl;
      });
      return;
    }
    
    playSound('correct');
    const idx = words.indexOf(word);
    if (idx === -1) return;
    const newWords = words.filter((_, i) => i !== idx);
    const newSelected = [...selected, word];
    const newStreak = correctStreak + 1;
    setCorrectStreak(newStreak);
    const comboMult = newStreak >= 3 ? 3 : newStreak >= 2 ? 2 : 1;
    setComboMultiplier(comboMult);
    setWords(newWords);
    setSelected(newSelected);
    setGameStats(s => ({
      ...s,
      correctPlacements: s.correctPlacements + 1,
      bestStreak: Math.max(s.bestStreak, newStreak),
    }));
    
    const bonusType = bonusTiles[newSelected.length - 1];
    const wordScore = calculateWordScore(word, bonusType === 'gold' ? 2 : bonusType === 'purple' ? 3 : 1) * comboMult;
    const rect = document.querySelector(`[data-drop-zone]`)?.getBoundingClientRect();
    if (rect) {
      const fsId = floatingScoreIdRef.current++;
      setFloatingScores(prev => [...prev, { id: fsId, x: rect.left + rect.width / 2, y: rect.top + 20, value: `+${wordScore}`, life: 1 }]);
      setTimeout(() => setFloatingScores(f => f.filter(x => x.id !== fsId)), 800);
    }
    
    setAnimatedWords(prev => new Set([...prev, newSelected.length - 1]));
    setTimeout(() => {
      setAnimatedWords(prev => {
        const next = new Set(prev);
        next.delete(newSelected.length - 1);
        return next;
      });
    }, 600);
    
    setValidationState('correct');
    setToastMessage('Correct!');
    
    const wordRect = document.querySelector(`[data-word-index="${newSelected.length - 1}"]`)?.getBoundingClientRect();
    if (wordRect) {
      createParticles(wordRect.left + wordRect.width / 2, wordRect.top + wordRect.height / 2, theme.accent);
    }
    
    setTimeout(() => {
      setValidationState('none');
      setToastMessage('');
    }, 1000);
    
    // Check if sentence is complete
    if (newSelected.join(' ') === sentence) {
      const elapsed = (Date.now() - sentenceStartTimeRef.current) / 1000;
      const timePct = timeLeft / timeTotalRef.current;
      const timeCombo = timePct > 0.7 ? 3 : timePct > 0.5 ? 2 : timePct > 0.3 ? 1.5 : 1;
      const finalCombo = Math.max(comboMult, timeCombo);
      setComboMultiplier(finalCombo);
      
      const newSentencesCompleted = gameStats.sentencesCompleted + 1;
      setGameStats(s => ({
        ...s,
        sentencesCompleted: newSentencesCompleted,
        sentenceTimes: [...s.sentenceTimes, elapsed],
      }));
      if (newStreak >= 5) showAchievement('🔥 5 in a row!');
      if (newSentencesCompleted === 10) showAchievement('⭐ 10 sentences completed!');
      if (newSentencesCompleted === 20) showAchievement('🏆 20 sentences! Amazing!');
      
      // Calculate score with bonuses
      let totalScore = 0;
      const wordArray = sentence.split(' ');
      const wordLengthMultiplier = Math.max(1, Math.floor(wordArray.length / 5) + 1);
      
      wordArray.forEach((w, i) => {
        let multiplier = 1;
        if (bonusTiles[i] === 'gold') multiplier = 2;
        else if (bonusTiles[i] === 'purple') multiplier = 3;
        
        const wordScore = calculateWordScore(w, multiplier);
        totalScore += wordScore;
      });
      
      // Apply word length bonus
      totalScore = Math.floor(totalScore * wordLengthMultiplier);
      
      // Time bonus
      const timeBonus = Math.floor(timeLeft * 2);
      totalScore += timeBonus;
      
      // Combo bonus for quick completion / streak
      totalScore = Math.floor(totalScore * finalCombo);
      
      // Level multiplier
      totalScore = Math.floor(totalScore * (1 + level * 0.2));
      
      setScore(s => s + totalScore);
      const nc = correctCount + 1;
      setCorrectCount(nc);
      
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1200);
      
      // Celebration particles
      setTimeout(() => {
        const container = document.querySelector('.game-card')?.getBoundingClientRect();
        if (container) {
          const cx = container.left + container.width / 2;
          const cy = container.top + container.height / 2;
          for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.5;
            createParticles(cx + Math.cos(angle) * 20, cy, ['#ffd700', '#ff6b6b', theme.accent, '#10b981'][i % 4]);
          }
        }
      }, 100);
      
      if (onRoundEnd) {
        onRoundEnd(level, totalScore);
      }
      
      if (nc >= 3) {
        setLevel(l => l + 1);
        setCorrectCount(0);
      }
      
      setTimeout(() => {
        loadSentence();
      }, 1500);
    }
  };

  const removeFromSelected = (word: string, index: number) => {
    const idx = selected.indexOf(word);
    if (idx === -1) return;
    setSelected(prev => prev.filter((_, i) => i !== idx));
    setWords(prev => [...prev, word]);
    setValidationState('none');
    setToastMessage('');
  };

  const handleWordClick = (word: string, inPool: boolean, index: number) => {
    if (inPool) pickWord(word, index);
    else removeFromSelected(word, index);
  };

  const showHint = useCallback(() => {
    if (gameOver || !expectedNext || hintActive) return;
    setHintActive(true);
    hintTimeoutRef.current = window.setTimeout(() => setHintActive(false), 3000);
  }, [gameOver, expectedNext, hintActive]);

  const handleShuffle = useCallback(() => {
    if (gameOver) return;
    setShuffling(true);
    setWords(w => shuffle([...w]));
    setTimeout(() => setShuffling(false), 500);
  }, [gameOver]);

  const getClientPos = useCallback((e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('changedTouches' in e && e.changedTouches.length > 0) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, word: string, index: number, inPool: boolean) => {
    e.preventDefault();
    if (gameOver) return;
    const pos = getClientPos(e);
    touchStartRef.current = { x: pos.x, y: pos.y, word, index, inPool };
    setDragPosition({ x: pos.x, y: pos.y });
    setDraggingWord({ word, index, inPool });
  }, [gameOver, getClientPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!touchStartRef.current || !draggingWord) return;
    const pos = getClientPos(e);
    setDragPosition({ x: pos.x, y: pos.y });
  }, [draggingWord, getClientPos]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const start = touchStartRef.current;
    if (!start || !draggingWord) {
      setDraggingWord(null);
      setDragPosition(null);
      touchStartRef.current = null;
      return;
    }
    const pos = getClientPos(e);
    const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
    const dropZone = gameAreaRef.current?.querySelector('[data-drop-zone]');
    let dropped = false;
    if (dist < 10) {
      handleWordClick(start.word, start.inPool, start.index);
      dropped = true;
    } else if (dropZone && start.inPool) {
      const dropRect = dropZone.getBoundingClientRect();
      if (pos.x >= dropRect.left && pos.x <= dropRect.right && pos.y >= dropRect.top && pos.y <= dropRect.bottom) {
        handleWordClick(start.word, start.inPool, start.index);
        dropped = true;
      }
    }
    if (start.inPool && dist >= 10 && !dropped) {
      playSound('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setDraggingWord(null);
    setDragPosition(null);
    setDropTargetIndex(null);
    touchStartRef.current = null;
  }, [draggingWord, getClientPos, handleWordClick]);

  const handleMouseDown = useCallback((e: React.MouseEvent, word: string, index: number, inPool: boolean) => {
    if (gameOver) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, word, index, inPool };
    setDragPosition({ x: e.clientX, y: e.clientY });
    setDraggingWord({ word, index, inPool });
  }, [gameOver]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!touchStartRef.current || !draggingWord) return;
      setDragPosition({ x: e.clientX, y: e.clientY });
    };
    const onMouseUp = (e: MouseEvent) => {
      const start = touchStartRef.current;
      if (!start || !draggingWord) {
        setDraggingWord(null);
        setDragPosition(null);
        touchStartRef.current = null;
        return;
      }
      const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const dropZone = gameAreaRef.current?.querySelector('[data-drop-zone]');
      const inDropZone = dropZone && start.inPool
        ? (() => {
            const r = dropZone.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          })()
        : false;
      if (dist < 10 || inDropZone) {
        handleWordClick(start.word, start.inPool, start.index);
      } else if (start.inPool && dist >= 10) {
        playSound('wrong');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
      setDraggingWord(null);
      setDragPosition(null);
      setDropTargetIndex(null);
      touchStartRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [draggingWord, handleWordClick]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setCorrectCount(0);
    setGameOver(false);
    setParticles([]);
    setAnimatedWords(new Set());
    setValidationState('none');
    setToastMessage('');
    setHintActive(false);
    setShowCelebration(false);
    setComboMultiplier(1);
    setCorrectStreak(0);
    setGameStats({ sentencesCompleted: 0, totalAttempts: 0, correctPlacements: 0, bestStreak: 0, sentenceTimes: [] });
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    loadSentence();
  };

  const timerPct = (timeLeft / timeTotalRef.current) * 100;
  
  // Timer color based on remaining time
  const getTimerColor = () => {
    if (timerPct > 60) return theme.accent;
    if (timerPct > 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <>
      <style>{`
        @keyframes wordbuilder-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        @keyframes checkmark {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes x-mark {
          0% { transform: scale(0) rotate(0deg); }
          50% { transform: scale(1.2) rotate(180deg); }
          100% { transform: scale(1) rotate(180deg); }
        }
        @keyframes toast-slide {
          0% { transform: translateY(-20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes letter-snap {
          0% { transform: scale(1.2); }
          50% { transform: scale(0.95); }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes shuffle-spin {
          0% { transform: rotate(0deg); opacity: 0.5; }
          50% { transform: rotate(180deg); opacity: 1; }
          100% { transform: rotate(360deg); opacity: 0.5; }
        }
        @keyframes celebration-pop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes sentence-slide-out {
          0% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-30px); }
        }
        @keyframes sentence-slide-in {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .word-pop-in {
          animation: letter-snap 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .word-shuffle {
          animation: shuffle-spin 0.5s ease-out;
        }
        .word-shuffle > * {
          animation: shuffle-spin 0.5s ease-out;
        }
        @keyframes hint-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .hint-active {
          animation: hint-bounce 0.6s ease-in-out infinite;
        }
        @keyframes drag-feedback {
          0% { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          100% { box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        }
        .word-dragging {
          opacity: 0.6;
          transform: scale(0.95);
        }
        .combo-badge {
          animation: celebration-pop 0.4s ease-out;
        }
        .bonus-gold {
          animation: glow-pulse 2s ease-in-out infinite;
          color: #fbbf24;
          text-shadow: 0 0 8px #fbbf24;
        }
        .bonus-purple {
          animation: glow-pulse 2s ease-in-out infinite;
          color: #a855f7;
          text-shadow: 0 0 8px #a855f7;
        }
      `}</style>
      <div
        className="game-card !p-0 overflow-hidden animate-pop-in transition-transform duration-200 relative"
        style={{
          border: `1px solid ${theme.accent}30`,
          ...(shake && { animation: 'wordbuilder-shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both' }),
        }}
      >
        {/* Floating scores */}
        <div className="absolute inset-0 pointer-events-none z-35 overflow-hidden">
          {floatingScores.map(f => (
            <div
              key={f.id}
              className="absolute font-black text-green-600 text-lg whitespace-nowrap -translate-x-1/2"
              style={{
                left: f.x,
                top: f.y,
                opacity: f.life,
                textShadow: '0 0 4px rgba(255,255,255,0.9)',
                transition: 'opacity 0.05s',
              }}
            >
              {f.value}
            </div>
          ))}
        </div>

        {/* Achievement notifications */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none">
          {achievements.map(a => (
            <div
              key={a.id}
              className="px-4 py-2 rounded-lg bg-amber-100 border-2 border-amber-400 text-amber-900 font-bold text-sm shadow-lg"
              style={{ animation: 'toast-slide 0.3s ease-out' }}
            >
              {a.message}
            </div>
          ))}
        </div>

        {/* Drag ghost */}
        {draggingWord && dragPosition && (
          <div
            className="fixed z-[9999] pointer-events-none px-4 py-2.5 rounded-full font-bold -translate-x-1/2 -translate-y-1/2"
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
              background: theme.pillBg,
              border: `2px solid ${theme.accent}`,
              color: theme.textColor,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 0 16px rgba(0,0,0,0.15)',
            }}
          >
            {draggingWord.word}
          </div>
        )}

        {/* Particle container */}
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                background: p.color,
                opacity: p.life,
                transform: `scale(${p.life})`,
                transition: 'opacity 0.1s, transform 0.1s',
              }}
            />
          ))}
        </div>

        {/* Toast message */}
        {toastMessage && (
          <div
            className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 px-4 py-2 rounded-lg text-white font-bold text-sm shadow-lg"
            style={{
              background: validationState === 'correct' ? '#10b981' : '#ef4444',
              animation: 'toast-slide 0.3s ease-out',
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* HUD */}
        <div
          className="flex items-center justify-between p-3 border-b border-gray-200"
          style={{ background: `${theme.accent}08` }}
        >
          <div className="flex items-center gap-4">
            <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
            <span className="text-xs font-bold text-gray-400">LVL {level}</span>
            <span className="text-xs">{Array.from({ length: 3 }, (_, i) => (i < lives ? '❤️' : '🖤')).join('')}</span>
            <span className="text-xs text-gray-500">⏱ {Math.ceil(timeLeft)}s</span>
            {comboMultiplier > 1 && (
              <span className="text-xs font-black text-amber-600 animate-pulse">×{comboMultiplier} COMBO</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              {(['easy', 'normal', 'hard'] as DifficultyMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => !gameOver && setDifficulty(m)}
                  disabled={gameOver}
                  className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${difficulty === m ? 'font-bold' : 'opacity-70'}`}
                  style={{
                    background: difficulty === m ? theme.accent : 'transparent',
                    color: difficulty === m ? '#fff' : theme.accent,
                    border: `1px solid ${theme.accent}`,
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={showHint}
              disabled={gameOver || !expectedNext || hintActive}
              className="text-xs px-2 py-1 rounded border transition-all disabled:opacity-50"
              style={{ borderColor: theme.accent, color: theme.accent }}
            >
              💡 HINT
            </button>
            <button
              onClick={handleShuffle}
              disabled={gameOver}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              🔀 SHUFFLE
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all"
            >
              ✕ EXIT
            </button>
          </div>
        </div>

        {/* Timer bar with color change */}
        <div className="h-2 bg-gray-200 overflow-hidden relative">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${timerPct}%`,
              background: `linear-gradient(90deg, ${getTimerColor()}, ${getTimerColor()}88)`,
            }}
          />
          {timerPct < 30 && (
            <div
              className="absolute inset-0 bg-red-500 opacity-30 animate-pulse"
              style={{ width: `${timerPct}%` }}
            />
          )}
        </div>

        {/* Validation indicator */}
        {validationState !== 'none' && (
          <div className="absolute top-24 right-4 z-20">
            {validationState === 'correct' ? (
              <div
                className="text-4xl"
                style={{
                  animation: 'checkmark 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  color: '#10b981',
                }}
              >
                ✓
              </div>
            ) : (
              <div
                className="text-4xl"
                style={{
                  animation: 'x-mark 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  color: '#ef4444',
                }}
              >
                ✗
              </div>
            )}
          </div>
        )}

        {/* Celebration overlay */}
        {showCelebration && (
          <div
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            style={{ animation: 'celebration-pop 0.6s ease-out' }}
          >
            <div
              className="px-8 py-4 rounded-2xl text-white font-black text-2xl shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, #8b5cf6)`,
                animation: 'celebration-pop 0.6s ease-out',
              }}
            >
              🎉 COMPLETE! {comboMultiplier > 1 ? `×${comboMultiplier} COMBO!` : ''}
            </div>
          </div>
        )}

        {/* Game area */}
        <div
          ref={gameAreaRef}
          className="relative min-h-[320px] p-4 flex flex-col"
          style={{ background: `linear-gradient(180deg, ${theme.top}, ${theme.bottom})`, touchAction: 'none' }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {gameOver ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/95 backdrop-blur-sm p-4">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">Game Over!</h3>
              <p className="text-4xl font-black mb-1" style={{ color: theme.accent }}>{score} pts</p>
              <p className="text-gray-500 text-sm mb-4">Level {level}</p>
              <div className="bg-gray-100 rounded-xl p-4 mb-6 text-left w-full max-w-xs text-sm">
                <p className="font-bold text-gray-800 mb-2">Stats Summary</p>
                <p className="text-gray-600">Sentences: {gameStats.sentencesCompleted}</p>
                <p className="text-gray-600">Accuracy: {gameStats.totalAttempts > 0 ? Math.round((gameStats.correctPlacements / gameStats.totalAttempts) * 100) : 0}%</p>
                <p className="text-gray-600">Best streak: {gameStats.bestStreak} in a row</p>
                <p className="text-gray-600">Avg time: {gameStats.sentenceTimes.length > 0 ? (gameStats.sentenceTimes.reduce((a, b) => a + b, 0) / gameStats.sentenceTimes.length).toFixed(1) : '-'}s/sentence</p>
              </div>
              <div className="flex gap-3">
                <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
                <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-center text-gray-400 text-[10px] font-bold tracking-wider mb-2">
                CLICK OR DRAG WORDS IN ORDER — USE HINT FOR NEXT WORD, SHUFFLE TO MIX
              </p>

              {/* Sentence preview: blank slots */}
              <div
                className="flex flex-wrap justify-center gap-1 mb-3 min-h-[28px] items-center"
                style={{
                  animation: sentenceTransition === 'out' ? 'sentence-slide-out 0.3s ease-out' : sentenceTransition === 'in' ? 'sentence-slide-in 0.3s ease-out' : 'none',
                }}
              >
                {sentence && sentence.split(' ').map((_, i) => (
                  <span key={i} className="text-gray-400 font-mono text-sm">
                    {selected[i] ? ` ${selected[i]} ` : ' _ '}
                  </span>
                ))}
              </div>

              {/* Selected (built) words - drop zone when dragging */}
              <div
                data-drop-zone
                className={`min-h-[72px] flex flex-wrap justify-center items-center gap-2 mb-6 p-2 rounded-xl border transition-colors duration-200 ${
                  draggingWord?.inPool ? 'border-2 border-dashed ring-2 ring-offset-1' : 'border border-gray-200'
                }`}
                style={{
                  background: draggingWord?.inPool ? `${theme.accent}18` : 'rgba(255,255,255,0.6)',
                  borderColor: draggingWord?.inPool ? theme.accent : undefined,
                  boxShadow: draggingWord?.inPool ? `0 0 0 2px ${theme.accent}40` : undefined,
                }}
              >
                {selected.length === 0 ? (
                  <span className="text-gray-400 text-sm">Tap words below in order...</span>
                ) : (
                  selected.map((w, i) => {
                    const isAnimated = animatedWords.has(i);
                    const bonusType = bonusTiles[i];
                    const wordScore = calculateWordScore(w, bonusType === 'gold' ? 2 : bonusType === 'purple' ? 3 : 1);
                    
                    return (
                      <button
                        key={`${w}-${i}`}
                        data-word-index={i}
                        onClick={() => handleWordClick(w, false, i)}
                        onMouseDown={(e) => handleMouseDown(e, w, i, false)}
                        onTouchStart={(e) => handleTouchStart(e, w, i, false)}
                        className={`px-4 py-2 min-h-[48px] flex items-center rounded-full font-semibold text-gray-900 transition-all duration-200 hover:scale-105 active:scale-95 relative touch-none ${
                          isAnimated ? 'word-pop-in' : ''
                        } ${bonusType === 'gold' ? 'bonus-gold' : bonusType === 'purple' ? 'bonus-purple' : ''}`}
                        style={{
                          background: bonusType === 'gold' 
                            ? 'rgba(251, 191, 36, 0.2)' 
                            : bonusType === 'purple'
                            ? 'rgba(168, 85, 247, 0.2)'
                            : theme.pillBg,
                          boxShadow: bonusType === 'gold'
                            ? `0 0 16px rgba(251, 191, 36, 0.6)`
                            : bonusType === 'purple'
                            ? `0 0 16px rgba(168, 85, 247, 0.6)`
                            : `0 0 16px ${theme.accent}60`,
                          border: `1px solid ${bonusType === 'gold' ? '#fbbf24' : bonusType === 'purple' ? '#a855f7' : theme.accent}50`,
                        }}
                      >
                        {w}
                        <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-white rounded-full w-4 h-4 flex items-center justify-center border border-gray-300">
                          {wordScore}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Word bank - clear separation from answer area */}
              <div className="mt-4 pt-4 border-t-2 border-dashed flex-1" style={{ borderColor: `${theme.accent}40` }}>
                <p className="text-center text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Word Bank</p>
                <div className={`flex flex-wrap justify-center gap-2 ${shuffling ? 'word-shuffle' : ''}`}>
                {words.map((w, i) => {
                  const originalIndex = sentence.split(' ').indexOf(w);
                  const bonusType = bonusTiles[originalIndex];
                  const letterPoints = w.split('').map(l => getLetterPoint(l));
                  const isHintWord = hintActive && w === expectedNext;
                  
                  return (
                    <button
                      key={`${w}-${i}`}
                      onClick={() => handleWordClick(w, true, i)}
                      onMouseDown={(e) => handleMouseDown(e, w, i, true)}
                      onTouchStart={(e) => handleTouchStart(e, w, i, true)}
                      className={`px-4 py-2.5 min-h-[48px] flex items-center rounded-full font-bold text-gray-900 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg relative touch-none ${
                        bonusType === 'gold' ? 'bonus-gold' : bonusType === 'purple' ? 'bonus-purple' : ''
                      } ${isHintWord ? 'ring-4 ring-yellow-400 hint-active' : ''}`}
                      style={{
                        background: bonusType === 'gold'
                          ? 'rgba(251, 191, 36, 0.2)'
                          : bonusType === 'purple'
                          ? 'rgba(168, 85, 247, 0.2)'
                          : theme.pillBg,
                        border: `1px solid ${bonusType === 'gold' ? '#fbbf24' : bonusType === 'purple' ? '#a855f7' : theme.accent}40`,
                        boxShadow: bonusType === 'gold'
                          ? `0 2px 8px rgba(251, 191, 36, 0.5)`
                          : bonusType === 'purple'
                          ? `0 2px 8px rgba(168, 85, 247, 0.5)`
                          : `0 2px 8px ${theme.accent}30`,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {w.split('').map((letter, li) => (
                          <span
                            key={li}
                            className="relative"
                            style={{
                              fontSize: '0.9em',
                            }}
                          >
                            {letter}
                            <span
                              className="absolute -top-2 -right-1 text-[8px] font-bold opacity-70"
                              style={{
                                color: getLetterPoint(letter) >= 5 ? '#ef4444' : getLetterPoint(letter) >= 3 ? '#f59e0b' : '#6b7280',
                              }}
                            >
                              {getLetterPoint(letter)}
                            </span>
                          </span>
                        ))}
                      </div>
                      {bonusType && (
                        <span
                          className="absolute -top-1 -right-1 text-[10px] font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center border-2"
                          style={{
                            borderColor: bonusType === 'gold' ? '#fbbf24' : '#a855f7',
                            color: bonusType === 'gold' ? '#fbbf24' : '#a855f7',
                          }}
                        >
                          {bonusType === 'gold' ? '2×' : '3×'}
                        </span>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">
          Tap or drag words to build the sentence. Hint highlights next word. Shuffle mixes the pool.
          <span className="block mt-1">Quick completion = COMBO bonus! Gold = 2×, Purple = 3×</span>
        </div>
      </div>
    </>
  );
}
