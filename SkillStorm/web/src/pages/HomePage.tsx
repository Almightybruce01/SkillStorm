import { Link } from 'react-router-dom';
import { GAMES, SUBJECTS } from '../engine/gameData';
import { ARCADE_GAMES } from '../games/arcade/arcadeData';
import TopBannerAd from '../components/ads/TopBannerAd';
import GameCard from '../components/GameCard';
import CoverArt from '../components/CoverArt';

export default function HomePage() {
  const featuredGames = GAMES.slice(0, 8);
  const featuredArcade = ARCADE_GAMES.slice(0, 6);

  return (
    <div className="page-enter">
      <TopBannerAd />

      {/* Hero */}
      <section className="relative overflow-hidden py-10 sm:py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-violet-50 text-violet-700 text-xs sm:text-sm font-semibold mb-4 sm:mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
            {GAMES.length} Educational + {ARCADE_GAMES.length} Arcade Games
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-display font-bold text-gray-900 mb-4 sm:mb-6 animate-slide-up leading-tight">
            Learn Through{' '}
            <span className="text-gradient" style={{ WebkitTextFillColor: 'transparent' }}>Play</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-700 max-w-2xl mx-auto mb-6 sm:mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
            The ultimate educational gaming platform. Master math, science, vocabulary, and more through engaging games designed for every grade level.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 animate-slide-up px-2 sm:px-0" style={{ animationDelay: '0.2s' }}>
            <Link to="/games" className="btn-elite btn-elite-primary btn-ripple text-base px-8 py-3.5 sm:py-4 w-full sm:w-auto text-center font-bold shadow-lg">
              Explore Games
            </Link>
            <Link to="/arcade" className="btn-elite btn-elite-accent btn-ripple text-base px-8 py-3.5 sm:py-4 w-full sm:w-auto text-center font-bold shadow-lg">
              Play Arcade
            </Link>
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading section-heading-center text-center text-xl sm:text-3xl">Learn Every Subject</h2>
          <p className="text-gray-600 text-center mb-6 sm:mb-10 max-w-xl mx-auto text-sm sm:text-base">Choose from 8 subjects with games tailored to every grade level.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {SUBJECTS.map((s, i) => (
              <Link
                key={s.id}
                to={`/games?subject=${s.id}`}
                className="game-card p-4 sm:p-6 text-center group card-entrance touch-manipulation"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">{s.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{s.label}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {GAMES.filter(g => g.subject === s.id).length} games
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Educational Games */}
      <section className="py-8 sm:py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div>
              <h2 className="section-heading text-lg sm:text-2xl">Featured Games</h2>
              <p className="text-gray-600 mt-2 sm:mt-4 text-sm sm:text-base">Our most popular educational games.</p>
            </div>
            <Link to="/games" className="btn-elite btn-elite-secondary text-xs sm:text-sm">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {featuredGames.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} type="educational" />
            ))}
          </div>
        </div>
      </section>

      {/* Arcade Preview */}
      <section className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div>
              <h2 className="section-heading text-lg sm:text-2xl">Arcade Zone</h2>
              <p className="text-gray-600 mt-2 sm:mt-4 text-sm sm:text-base">Take a break with our fun arcade games!</p>
            </div>
            <Link to="/arcade" className="btn-elite btn-elite-accent text-xs sm:text-sm">
              All Arcade
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredArcade.map((game, i) => (
              <Link
                key={game.id}
                to={`/arcade/${game.id}`}
                className="group overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm card-entrance hover:shadow-xl hover:-translate-y-1 hover:border-pink-200 transition-all duration-300"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="aspect-square relative overflow-hidden rounded-t-xl">
                  <CoverArt
                    title={game.title}
                    icon={game.icon}
                    gradient={game.coverGradient}
                    coverScene={game.coverScene}
                    category={game.category}
                    size="sm"
                    animated={true}
                  />
                  {game.isNew && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse pointer-events-none z-10">
                      NEW
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-pink-600 transition-colors">{game.title}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-medium rounded-full capitalize">{game.category}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8 sm:py-16 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
            {[
              { value: `${GAMES.length}+`, label: 'Educational Games' },
              { value: `${ARCADE_GAMES.length}+`, label: 'Arcade Games' },
              { value: '8', label: 'Subjects' },
              { value: 'K-12', label: 'Grade Levels' },
            ].map((stat, i) => (
              <div key={i} className="game-card p-4 sm:p-6 card-entrance" style={{ animationDelay: `${i * 0.1}s` }}>
                <p className="text-2xl sm:text-3xl font-display font-bold text-gradient" style={{ WebkitTextFillColor: 'transparent' }}>{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold text-gray-900 mb-4 sm:mb-6">
            Ready to Start Learning?
          </h2>
          <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 max-w-xl mx-auto">
            Start mastering math, science, reading, and more through fun educational games.
          </p>
          <Link to="/games" className="btn-elite btn-elite-primary btn-ripple text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 w-full sm:w-auto inline-block font-bold shadow-lg">
            Start Playing Now
          </Link>
        </div>
      </section>
    </div>
  );
}
