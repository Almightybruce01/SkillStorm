/* ═══════════════════════════════════════════════════════════════════════════════
   ARCADE PAGE v3 — Premium Arcade Zone with Elite Mobile UX
   Features: AI cover art, search, filters, responsive grid,
   mobile-first layout, smooth animations, game info modals,
   recently played, favorites, sort options, infinite-feeling scroll
   ═══════════════════════════════════════════════════════════════════════════════ */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ARCADE_GAMES, ARCADE_CATEGORIES, type ArcadeCategory } from '../games/arcade/arcadeData';
import TopBannerAd from '../components/ads/TopBannerAd';
import PreGameAd from '../components/ads/PreGameAd';
import ArcadeLauncher from '../games/arcade/ArcadeLauncher';
import CoverArt from '../components/CoverArt';
import soundEngine from '../games/SoundEngine';

type ArcadePhase = 'browse' | 'preAd' | 'playing';
type SortOption = 'default' | 'title' | 'category' | 'new';

/* ── Recently Played Tracking ── */
function getRecentlyPlayed(): string[] {
  try {
    const raw = localStorage.getItem('skillzstorm_recent_arcade');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToRecentlyPlayed(gameId: string) {
  try {
    const recent = getRecentlyPlayed().filter(id => id !== gameId);
    recent.unshift(gameId);
    localStorage.setItem('skillzstorm_recent_arcade', JSON.stringify(recent.slice(0, 12)));
  } catch {}
}

/* ── Favorites ── */
function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem('skillzstorm_fav_arcade');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function toggleFavorite(gameId: string): string[] {
  const favs = getFavorites();
  const idx = favs.indexOf(gameId);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(gameId);
  localStorage.setItem('skillzstorm_fav_arcade', JSON.stringify(favs));
  return [...favs];
}

export default function ArcadePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [activeCategory, setActiveCategory] = useState<ArcadeCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>(gameId || '');
  const [phase, setPhase] = useState<ArcadePhase>(gameId ? 'preAd' : 'browse');
  const [sort, setSort] = useState<SortOption>('default');
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [showRecent, setShowRecent] = useState(false);
  const [gridReady, setGridReady] = useState(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setGridReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const recentIds = useMemo(() => getRecentlyPlayed(), [phase]);
  const recentGames = useMemo(() => {
    return recentIds.map(id => ARCADE_GAMES.find(g => g.id === id)).filter(Boolean) as typeof ARCADE_GAMES;
  }, [recentIds]);

  const filtered = useMemo(() => {
    let result = [...ARCADE_GAMES];

    if (showRecent && recentIds.length > 0) {
      result = result.filter(g => recentIds.includes(g.id));
    }
    if (activeCategory !== 'all') result = result.filter(g => g.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'title': result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'category': result.sort((a, b) => a.category.localeCompare(b.category)); break;
      case 'new': result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
    }

    return result;
  }, [activeCategory, search, sort, showRecent, recentIds]);

  const handlePlay = useCallback((id: string) => {
    try { soundEngine.buttonPress(); } catch {}
    addToRecentlyPlayed(id);
    setSelectedGameId(id);
    setPhase('preAd');
  }, []);

  const handlePreAdReady = useCallback(() => setPhase('playing'), []);

  const handleClose = useCallback(() => {
    setPhase('browse');
    setSelectedGameId('');
  }, []);

  const randomGame = useCallback(() => {
    try { soundEngine.coin(); } catch {}
    const game = ARCADE_GAMES[Math.floor(Math.random() * ARCADE_GAMES.length)];
    handlePlay(game.id);
  }, [handlePlay]);

  const handleFav = useCallback((e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites(toggleFavorite(gameId));
    try { soundEngine.click(); } catch {}
  }, []);

  const selectedGame = ARCADE_GAMES.find(g => g.id === selectedGameId);

  if (phase === 'preAd' && selectedGame) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <PreGameAd gameName={selectedGame.title} onReady={handlePreAdReady} />
      </div>
    );
  }

  if (phase === 'playing' && selectedGameId) {
    return (
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
        <ArcadeLauncher gameId={selectedGameId} onClose={handleClose} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-gray-900">
              Arcade <span className="text-gradient">Zone</span>
            </h1>
            <p className="text-gray-500 text-sm sm:text-base mt-1 sm:mt-2">
              {ARCADE_GAMES.length} games — no login required
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {recentGames.length > 0 && (
              <button
                onClick={() => { setShowRecent(!showRecent); setActiveCategory('all'); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showRecent
                    ? 'bg-violet-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } touch-manipulation`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Recent
              </button>
            )}
            <button
              onClick={randomGame}
              className="btn-elite btn-elite-accent btn-ripple flex items-center gap-2 touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="text-lg">🎲</span>
              <span className="hidden sm:inline">Random Game</span>
              <span className="sm:hidden">Random</span>
            </button>
          </div>
        </div>

        {/* ── Search + Sort Row ── */}
        <div className="flex gap-2 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search games..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 sm:pl-11 pr-9 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 shadow-sm transition-shadow hover:shadow-md text-sm sm:text-base"
              style={{ fontSize: '16px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 touch-manipulation"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-sm"
            style={{ fontSize: '16px' }}
          >
            <option value="default">Default</option>
            <option value="title">A-Z</option>
            <option value="category">Category</option>
            <option value="new">Newest</option>
          </select>
        </div>

        {/* ── Category Tabs — Horizontal scroll on mobile ── */}
        <div
          ref={categoryScrollRef}
          className="flex gap-2 mb-4 sm:mb-8 overflow-x-auto pb-1 scrollbar-hide category-scroll"
        >
          {ARCADE_CATEGORIES.map(c => {
            const count = c.id === 'all' ? ARCADE_GAMES.length : ARCADE_GAMES.filter(g => g.category === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCategory(c.id as ArcadeCategory | 'all');
                  setShowRecent(false);
                  try { soundEngine.click(); } catch {}
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap touch-manipulation ${
                  activeCategory === c.id && !showRecent
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-pink-300 hover:shadow-sm'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {c.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
          <span className="flex items-center px-2.5 py-1 bg-green-50 text-green-600 text-[10px] sm:text-xs font-bold rounded-full animate-pulse whitespace-nowrap">
            {ARCADE_GAMES.filter(g => g.isNew).length} NEW
          </span>
        </div>

        {/* ── Recently Played Strip ── */}
        {recentGames.length > 0 && !showRecent && !search && activeCategory === 'all' && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Continue Playing</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 category-scroll">
              {recentGames.slice(0, 6).map(game => (
                <button
                  key={game.id}
                  onClick={() => handlePlay(game.id)}
                  className="flex-shrink-0 w-24 sm:w-28 group touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="aspect-square rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow mb-1.5 border border-gray-200">
                    <CoverArt
                      title={game.title}
                      icon={game.icon}
                      gradient={game.coverGradient}
                      coverScene={game.coverScene}
                      category={game.category}
                      size="sm"
                      animated={false}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-700 truncate text-center">{game.title}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Game Grid ── */}
        <div className={`friv-grid ${gridReady ? '' : 'opacity-0'}`}>
          {filtered.map((game, i) => (
            <button
              key={game.id}
              onClick={() => handlePlay(game.id)}
              className="group overflow-hidden text-left rounded-xl bg-white border border-gray-200 shadow-sm card-entrance hover:shadow-xl hover:-translate-y-1 hover:border-pink-200 transition-all duration-300 cursor-pointer touch-manipulation active:scale-[0.97] relative"
              style={{ animationDelay: `${Math.min(i * 0.02, 0.4)}s`, WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Cover Art */}
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

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all duration-300 scale-0 group-hover:scale-100 shadow-lg">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>

                {/* Favorite button */}
                <button
                  onClick={(e) => handleFav(e, game.id)}
                  className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full flex items-center justify-center bg-black/30 backdrop-blur-sm text-white/80 hover:text-pink-400 transition-colors z-10 touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {favorites.includes(game.id) ? '❤️' : '🤍'}
                </button>

                {game.isNew && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-bold rounded-full shadow-lg animate-pulse pointer-events-none z-10">
                    NEW
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-2 sm:p-3">
                <h3 className="font-semibold text-gray-900 text-xs sm:text-sm truncate group-hover:text-pink-600 transition-colors">
                  {game.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 line-clamp-2 min-h-[2rem] hidden sm:block">
                  {game.description}
                </p>
                <span className="inline-block mt-1 px-1.5 sm:px-2 py-0.5 bg-pink-50 text-pink-600 text-[9px] sm:text-[10px] font-medium rounded-full capitalize">
                  {game.category}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Empty State ── */}
        {filtered.length === 0 && (
          <div className="text-center py-12 sm:py-16 animate-fade-in">
            <p className="text-4xl sm:text-5xl mb-4">🕹️</p>
            <p className="text-gray-500 text-base sm:text-lg">
              No games found{search ? ` matching "${search}"` : ''}
            </p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('all'); setShowRecent(false); }}
              className="btn-elite btn-elite-ghost mt-4 touch-manipulation"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* ── Results count ── */}
        {filtered.length > 0 && (
          <div className="text-center mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm text-gray-400">
              Showing {filtered.length} of {ARCADE_GAMES.length} games
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
