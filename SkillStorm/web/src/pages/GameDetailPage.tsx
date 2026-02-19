/* ═══════════════════════════════════════════════════════════
   GAME DETAIL PAGE — Enhanced with CoverArt & Better Layout
   Features: Dynamic cover art, grade selector, related games
   ═══════════════════════════════════════════════════════════ */
import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGameById, GAMES } from '../engine/gameData';
import TopBannerAd from '../components/ads/TopBannerAd';
import SidebarAd from '../components/ads/SidebarAd';
import PreGameAd from '../components/ads/PreGameAd';
import GameLauncher from '../games/GameLauncher';
import GameCard from '../components/GameCard';
import CoverArt from '../components/CoverArt';

type GamePhase = 'detail' | 'preAd' | 'playing';

export default function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = getGameById(gameId || '');
  const [phase, setPhase] = useState<GamePhase>('detail');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  const handlePlay = useCallback(() => {
    if (game && !selectedGrade && game.grades.length > 0) {
      setSelectedGrade(game.grades[0]);
    }
    setPhase('preAd');
  }, [game, selectedGrade]);

  const handlePreAdReady = useCallback(() => {
    setPhase('playing');
  }, []);

  const handleClose = useCallback(() => {
    setPhase('detail');
  }, []);

  if (!game) {
    return (
      <div className="page-enter max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4 animate-bounce-in">😞</p>
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-4">Game Not Found</h1>
        <p className="text-gray-500 mb-6">The game you're looking for doesn't exist or has been moved.</p>
        <Link to="/games" className="btn-elite btn-elite-primary">Browse Games</Link>
      </div>
    );
  }

  const related = GAMES.filter(g => g.subject === game.subject && g.id !== game.id).slice(0, 4);

  if (phase === 'preAd') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <PreGameAd gameName={game.title} onReady={handlePreAdReady} />
      </div>
    );
  }

  if (phase === 'playing') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <GameLauncher
          gameId={game.id}
          engine={game.engine}
          grade={(selectedGrade || game.grades[0]) as 'K-2' | '3-5' | '6-8' | '9-12'}
          onClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-violet-600 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/games" className="hover:text-violet-600 transition-colors">Games</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{game.title}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Cover Art — Dynamic Themed */}
          <div className="rounded-2xl shadow-xl overflow-hidden aspect-square max-h-[450px]">
            <CoverArt
              title={game.title}
              icon={game.icon}
              gradient={game.coverGradient}
              coverScene={game.coverScene}
              engine={game.engine}
              subject={game.subject}
              size="lg"
              animated={true}
            />
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-5xl">{game.icon}</span>
              <div>
                <h1 className="text-4xl font-display font-bold text-gray-900">{game.title}</h1>
                <p className="text-lg text-gray-500 mt-1">{game.engine.replace(/([A-Z])/g, ' $1').trim()} Engine</p>
              </div>
            </div>

            <p className="text-lg text-gray-600 mb-6 leading-relaxed">{game.description}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-4 py-1.5 bg-violet-50 text-violet-600 rounded-full text-sm font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 bg-violet-500 rounded-full" />
                {game.subject}
              </span>
              <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                game.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
                game.difficulty === 'medium' ? 'bg-amber-50 text-amber-600' :
                'bg-red-50 text-red-600'
              }`}>
                {game.difficulty}
              </span>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                {game.engine}
              </span>
            </div>

            {/* Features */}
            <div className="game-card p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gradient">{game.grades.length}</p>
                  <p className="text-xs text-gray-500">Grade Levels</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">8</p>
                  <p className="text-xs text-gray-500">Game Engines</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gradient">∞</p>
                  <p className="text-xs text-gray-500">Replay Value</p>
                </div>
              </div>
            </div>

            {/* Grade Selector */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Grade Level</h3>
              <div className="flex flex-wrap gap-2">
                {game.grades.map(grade => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      (selectedGrade || game.grades[0]) === grade
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-200 scale-105'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300 hover:shadow-md'
                    }`}
                  >
                    Grades {grade}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePlay}
              className="btn-elite btn-elite-primary btn-ripple text-lg px-10 py-4 w-full sm:w-auto animate-glow-pulse"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play Now
            </button>
          </div>
        </div>

        {/* Related Games */}
        {related.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="section-heading">More {game.subject} Games</h2>
              <Link to={`/games?subject=${game.subject}`} className="btn-elite btn-elite-ghost text-sm">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map((g, i) => (
                <GameCard key={g.id} game={g} index={i} type="educational" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
