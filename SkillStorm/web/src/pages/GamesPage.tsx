import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GAMES, SUBJECTS, type Subject } from '../engine/gameData';
import GameCard from '../components/GameCard';
import TopBannerAd from '../components/ads/TopBannerAd';
import SidebarAd from '../components/ads/SidebarAd';

export default function GamesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubject = (searchParams.get('subject') || 'all') as Subject | 'all';
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = GAMES;
    if (activeSubject !== 'all') result = result.filter(g => g.subject === activeSubject);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));
    }
    return result;
  }, [activeSubject, search]);

  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="section-heading">Educational Games</h1>
          <p className="text-gray-500 mt-4">{GAMES.length} games across {SUBJECTS.length} subjects</p>
        </div>

        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 shadow-sm"
              />
            </div>

            {/* Subject Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setSearchParams({})}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSubject === 'all'
                    ? 'bg-violet-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
                }`}
              >
                All ({GAMES.length})
              </button>
              {SUBJECTS.map(s => {
                const count = GAMES.filter(g => g.subject === s.id).length;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSearchParams({ subject: s.id })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeSubject === s.id
                        ? 'bg-violet-500 text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {s.icon} {s.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} type="educational" />
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-gray-500">No games found. Try a different search or subject.</p>
              </div>
            )}
          </div>

          {/* Sidebar Ad */}
          <div className="hidden lg:block w-[300px] flex-shrink-0">
            <SidebarAd />
          </div>
        </div>
      </div>
    </div>
  );
}
