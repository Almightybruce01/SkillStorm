/* ═══════════════════════════════════════════════════════════
   DASHBOARD PAGE — Real Stats with localStorage Persistence
   Features: XP/Level system, subject breakdown, achievements,
   recent games, streaks, animated progress bars
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopBannerAd from '../components/ads/TopBannerAd';
import SidebarAd from '../components/ads/SidebarAd';
import { getStats, getAllAchievements, formatTime, formatTimeAgo, type PlayerStats } from '../engine/gameStats';

export default function DashboardPage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [achievements, setAchievements] = useState<ReturnType<typeof getAllAchievements>>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'history'>('overview');

  useEffect(() => {
    setStats(getStats());
    setAchievements(getAllAchievements());
  }, []);

  if (!stats) return null;

  const subjectList = Object.values(stats.subjects).sort((a, b) => b.totalScore - a.totalScore);
  const maxSubjectScore = Math.max(...subjectList.map(s => s.totalScore), 1);
  const xpPercent = stats.xpToNextLevel > 0 ? (stats.xp / stats.xpToNextLevel) * 100 : 0;
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with Level */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <h1 className="section-heading text-3xl font-display font-bold">Your Dashboard</h1>
            <p className="text-gray-500 mt-4">Track your learning progress, achievements, and stats.</p>
          </div>
          <div className="mt-4 md:mt-0 game-card p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
              {stats.level}
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-900">Level {stats.level}</span>
                <span className="text-gray-500">{stats.xp}/{stats.xpToNextLevel} XP</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-1000 ease-out"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
          {[
            { label: 'Games Played', value: stats.totalGamesPlayed, icon: '🎮', color: 'from-violet-500 to-indigo-500' },
            { label: 'Total Score', value: stats.totalScore.toLocaleString(), icon: '🏆', color: 'from-yellow-400 to-orange-500' },
            { label: 'Day Streak', value: stats.currentStreak, icon: '🔥', color: 'from-red-400 to-pink-500' },
            { label: 'Time Played', value: formatTime(stats.totalTimeSeconds), icon: '⏱️', color: 'from-blue-400 to-cyan-500' },
            { label: 'Coins', value: stats.coins.toLocaleString(), icon: '💰', color: 'from-yellow-300 to-amber-500' },
            { label: 'Best Streak', value: stats.longestStreak, icon: '⚡', color: 'from-purple-400 to-fuchsia-500' },
          ].map((stat, i) => (
            <div key={i} className="game-card p-5 text-center card-entrance group hover:scale-105 transition-transform" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} mb-2 shadow-md`}>
                <span className="text-lg">{stat.icon}</span>
              </div>
              <p className="text-2xl font-display font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 pb-1">
          {[
            { id: 'overview' as const, label: 'Overview', icon: '📊' },
            { id: 'achievements' as const, label: `Achievements (${unlockedAchievements.length}/${achievements.length})`, icon: '🏅' },
            { id: 'history' as const, label: 'Game History', icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-500'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Subject Breakdown */}
            <div className="lg:col-span-2">
              <div className="game-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <span>📊</span> Subject Progress
                </h2>
                {subjectList.length > 0 ? (
                  <div className="space-y-5">
                    {subjectList.map((s, i) => (
                      <div key={s.name} className="card-entrance" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </span>
                          <span className="text-gray-500">
                            {s.totalScore.toLocaleString()} pts | {s.gamesPlayed} games | {Math.round(s.avgAccuracy)}% avg
                          </span>
                        </div>
                        <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                            style={{
                              width: `${Math.max((s.totalScore / maxSubjectScore) * 100, 3)}%`,
                              backgroundColor: s.color,
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-3">🎮</p>
                    <p className="text-lg font-medium">No games played yet!</p>
                    <p className="text-sm mt-1">Start playing to see your progress here.</p>
                    <Link to="/games" className="btn-elite btn-elite-primary mt-4 inline-block">
                      Start Playing
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              {subjectList.length > 0 && (
                <div className="game-card p-6 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📈</span> Quick Stats
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-violet-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-violet-600 font-medium">Avg Score</p>
                      <p className="text-xl font-bold text-violet-800">
                        {stats.totalGamesPlayed > 0 ? Math.round(stats.totalScore / stats.totalGamesPlayed) : 0}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-green-600 font-medium">Subjects Tried</p>
                      <p className="text-xl font-bold text-green-800">{subjectList.length}/9</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-amber-600 font-medium">Achievements</p>
                      <p className="text-xl font-bold text-amber-800">{unlockedAchievements.length}/{achievements.length}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar: Recent Games */}
            <div>
              <div className="game-card p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🕹️</span> Recent Games
                </h2>
                {stats.recentGames.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentGames.slice(0, 8).map((g, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 card-entrance" style={{ animationDelay: `${i * 0.03}s` }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                          <p className="text-xs text-gray-500">{formatTimeAgo(g.timestamp)}</p>
                        </div>
                        <span className="text-sm font-bold text-violet-600 ml-3">{g.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">No games played yet</p>
                )}
              </div>

              {/* Recent Achievements */}
              <div className="game-card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span>🏅</span> Recent Achievements
                </h2>
                {unlockedAchievements.length > 0 ? (
                  <div className="space-y-3">
                    {unlockedAchievements.slice(0, 4).map((a, i) => (
                      <div key={a.id} className="flex items-center gap-3 py-2 card-entrance" style={{ animationDelay: `${i * 0.05}s` }}>
                        <span className="text-2xl">{a.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                          <p className="text-xs text-gray-500">{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">Play games to unlock achievements!</p>
                )}
              </div>

              <SidebarAd />
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div>
            {/* Unlocked */}
            {unlockedAchievements.length > 0 && (
              <div className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Unlocked ({unlockedAchievements.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {unlockedAchievements.map((a, i) => (
                    <div key={a.id} className="game-card p-5 text-center card-entrance bg-gradient-to-b from-yellow-50/50 to-white border-yellow-200/50" style={{ animationDelay: `${i * 0.05}s` }}>
                      <p className="text-4xl mb-2">{a.icon}</p>
                      <p className="text-sm font-bold text-gray-900">{a.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{a.desc}</p>
                      <div className="mt-2 inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                        UNLOCKED
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked */}
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Locked ({lockedAchievements.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lockedAchievements.map((a, i) => (
                <div key={a.id} className="game-card p-5 text-center card-entrance opacity-60" style={{ animationDelay: `${i * 0.03}s` }}>
                  <p className="text-4xl mb-2 grayscale">🔒</p>
                  <p className="text-sm font-bold text-gray-600">{a.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="game-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Game</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Subject</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">When</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentGames.length > 0 ? (
                    stats.recentGames.map((g, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors card-entrance" style={{ animationDelay: `${i * 0.02}s` }}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{g.title}</p>
                          <p className="text-xs text-gray-400">{g.engine} Engine</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-2.5 py-0.5 bg-violet-50 text-violet-600 text-xs font-medium rounded-full">
                            {g.subject}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-violet-600">{g.score.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">{formatTime(g.duration)}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">{formatTimeAgo(g.timestamp)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <p className="text-3xl mb-2">📋</p>
                        <p>No game history yet. Start playing!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
