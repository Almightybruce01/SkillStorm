/* Hangman — Word guessing with canvas drawing */
import { useState, useCallback } from 'react';
import { sfxCorrect, sfxWrong, sfxGameOver } from '../SoundEngine';

const WORDS: Record<string, string[]> = {
  Animals: ['ELEPHANT','GIRAFFE','PENGUIN','DOLPHIN','BUTTERFLY','KANGAROO','CHEETAH','OCTOPUS','CROCODILE','HAMSTER'],
  Countries: ['AUSTRALIA','BRAZIL','CANADA','GERMANY','JAPAN','MEXICO','FRANCE','ITALY','SPAIN','INDIA'],
  Sports: ['BASKETBALL','FOOTBALL','SWIMMING','BASEBALL','TENNIS','VOLLEYBALL','HOCKEY','CRICKET','BOXING','SURFING'],
  Food: ['HAMBURGER','SPAGHETTI','CHOCOLATE','PANCAKES','PINEAPPLE','BROCCOLI','SANDWICH','MUSHROOM','BLUEBERRY','AVOCADO'],
};
const CATS = Object.keys(WORDS);
const MAX = 6;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getWord() {
  const cat = CATS[Math.floor(Math.random() * CATS.length)];
  const words = WORDS[cat];
  return { word: words[Math.floor(Math.random() * words.length)], category: cat };
}

export function HangmanGame({ onClose }: { onClose: () => void }) {
  const [{ word, category }, setTarget] = useState(getWord);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const won = word.split('').every(l => guessed.has(l));
  const lost = wrong >= MAX;

  const guess = useCallback((l: string) => {
    if (won || lost || guessed.has(l)) return;
    const next = new Set(guessed); next.add(l);
    setGuessed(next);
    if (word.includes(l)) sfxCorrect();
    else { setWrong(w => { const nw = w + 1; if (nw >= MAX) sfxGameOver(); else sfxWrong(); return nw; }); }
  }, [word, guessed, won, lost]);

  const restart = () => { setTarget(getWord()); setGuessed(new Set()); setWrong(0); };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-800">🎭 Hangman</span>
          <span className="text-xs text-gray-500">Category: {category}</span>
          <span className="text-xs text-gray-500">Wrong: {wrong}/{MAX}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={restart} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">New</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300">Exit</button>
        </div>
      </div>
      <div className="p-6">
        {/* Hangman Drawing */}
        <div className="flex justify-center mb-6">
          <svg width="160" height="180" viewBox="0 0 160 180" className="stroke-gray-800" strokeWidth="3" fill="none">
            {/* Gallows */}
            <line x1="20" y1="170" x2="140" y2="170" />
            <line x1="40" y1="170" x2="40" y2="20" />
            <line x1="40" y1="20" x2="100" y2="20" />
            <line x1="100" y1="20" x2="100" y2="40" />
            {/* Head */}
            {wrong >= 1 && <circle cx="100" cy="55" r="15" />}
            {/* Body */}
            {wrong >= 2 && <line x1="100" y1="70" x2="100" y2="115" />}
            {/* Left arm */}
            {wrong >= 3 && <line x1="100" y1="85" x2="75" y2="100" />}
            {/* Right arm */}
            {wrong >= 4 && <line x1="100" y1="85" x2="125" y2="100" />}
            {/* Left leg */}
            {wrong >= 5 && <line x1="100" y1="115" x2="78" y2="145" />}
            {/* Right leg */}
            {wrong >= 6 && <line x1="100" y1="115" x2="122" y2="145" />}
          </svg>
        </div>
        {/* Word Display */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {word.split('').map((l, i) => (
            <div key={i} className="w-10 h-12 border-b-2 border-gray-300 flex items-center justify-center text-2xl font-black text-gray-800">
              {guessed.has(l) || lost ? l : ''}
            </div>
          ))}
        </div>
        {/* Result */}
        {(won || lost) && (
          <div className="text-center mb-4">
            <p className={`text-xl font-bold ${won ? 'text-emerald-600' : 'text-red-500'}`}>
              {won ? '🎉 You Won!' : `💀 Game Over! Word: ${word}`}
            </p>
            <button onClick={restart} className="mt-2 px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded hover:bg-gray-700">Play Again</button>
          </div>
        )}
        {/* Keyboard */}
        {!won && !lost && (
          <div className="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto">
            {LETTERS.map(l => {
              const used = guessed.has(l);
              const correct = used && word.includes(l);
              const incorrect = used && !word.includes(l);
              return (
                <button key={l} onClick={() => guess(l)} disabled={used}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all active:scale-90 ${
                    correct ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                    incorrect ? 'bg-red-50 text-red-300 border border-red-100' :
                    'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'
                  }`}>
                  {l}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
