/* ═══════════════════════════════════════════════════════════
   GAME CARD — Enhanced with Dynamic Cover Art & Premium UI
   Features: Themed cover art, hover animations, badges, responsive
   ═══════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';
import type { GameDef } from '../engine/gameData';
import type { ArcadeGame } from '../games/arcade/arcadeData';
import CoverArt from './CoverArt';

interface GameCardProps {
  game: GameDef | ArcadeGame;
  index: number;
  type: 'educational' | 'arcade';
}

export default function GameCard({ game, index, type }: GameCardProps) {
  const href = type === 'educational' ? `/games/${game.id}` : `/arcade/${game.id}`;
  const isEdu = type === 'educational';
  const eduGame = isEdu ? (game as GameDef) : null;
  const arcadeGame = !isEdu ? (game as ArcadeGame) : null;

  return (
    <Link
      to={href}
      className="group overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm card-entrance hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Cover Art — Dynamic Themed */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        <CoverArt
          title={game.title}
          icon={game.icon}
          gradient={game.coverGradient}
          coverScene={'coverScene' in game ? game.coverScene : undefined}
          engine={isEdu ? eduGame?.engine : undefined}
          subject={isEdu ? eduGame?.subject : undefined}
          category={!isEdu ? arcadeGame?.category : undefined}
          size="md"
          animated={true}
        />

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all duration-300 scale-0 group-hover:scale-100 shadow-lg">
            <svg className="w-6 h-6 text-violet-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        {/* Badges */}
        {'isNew' in game && game.isNew && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className="inline-block px-2.5 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse">
              NEW
            </span>
          </div>
        )}

        {isEdu && eduGame && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm ${
              eduGame.difficulty === 'easy' ? 'bg-green-400/90 text-white' :
              eduGame.difficulty === 'medium' ? 'bg-yellow-400/90 text-gray-900' :
              'bg-red-400/90 text-white'
            }`}>
              {eduGame.difficulty.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors mb-1 truncate">
          {game.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[2.5rem]">{game.description}</p>

        {isEdu && eduGame && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-violet-600 text-xs font-medium rounded-full">
              {eduGame.subject}
            </span>
            {eduGame.grades.slice(0, 2).map(g => (
              <span key={g} className="inline-block px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-medium rounded-full">
                {g}
              </span>
            ))}
          </div>
        )}

        {!isEdu && arcadeGame && (
          <span className="inline-block px-2.5 py-0.5 bg-pink-50 text-pink-600 text-xs font-medium rounded-full capitalize">
            {arcadeGame.category}
          </span>
        )}
      </div>
    </Link>
  );
}
