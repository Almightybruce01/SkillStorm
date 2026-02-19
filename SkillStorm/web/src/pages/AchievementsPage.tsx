/* ═══════════════════════════════════════════════════════════════════════════════
   ACHIEVEMENTS PAGE — Player Achievements, Stats & Daily Challenges
   Shows all achievements with progress bars, player stats, daily challenges,
   XP/level progression, streak tracking, and tier breakdowns.
   ═══════════════════════════════════════════════════════════════════════════════ */
import { useState, useMemo } from 'react';
import {
  ACHIEVEMENTS,
  type AchievementDef,
  type AchievementTier,
  TIER_COLORS,
  TIER_XP,
  getUnlockedAchievements,
  getAchievementProgress,
  getAchievementsByCategory,
  getAchievementSummary,
  getPlayerStats,
  getDailyChallenges,
  getPlayerLevel,
  isAchievementUnlocked,
} from '../games/AchievementSystem';
import { AchievementBadge, AchievementProgressRing } from '../components/AchievementToast';

type FilterOption = 'all' | 'unlocked' | 'locked' | AchievementTier;

export default function AchievementsPage() {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const summary = useMemo(() => getAchievementSummary(), []);
  const stats = useMemo(() => getPlayerStats(), []);
  const level = useMemo(() => getPlayerLevel(), []);
  const categories = useMemo(() => getAchievementsByCategory(), []);
  const dailyChallenges = useMemo(() => getDailyChallenges(), []);
  const unlockedSet = useMemo(() => new Set(getUnlockedAchievements().map(u => u.id)), []);

  const filteredAchievements = useMemo(() => {
    let result = ACHIEVEMENTS;

    if (selectedCategory !== 'all') {
      result = result.filter(a => a.category === selectedCategory);
    }

    switch (filter) {
      case 'unlocked': result = result.filter(a => unlockedSet.has(a.id)); break;
      case 'locked': result = result.filter(a => !unlockedSet.has(a.id)); break;
      case 'bronze': case 'silver': case 'gold': case 'diamond': case 'legendary':
        result = result.filter(a => a.tier === filter); break;
    }

    return result;
  }, [filter, selectedCategory, unlockedSet]);

  const tierCounts = useMemo(() => {
    const counts: Record<AchievementTier, { total: number; unlocked: number }> = {
      bronze: { total: 0, unlocked: 0 },
      silver: { total: 0, unlocked: 0 },
      gold: { total: 0, unlocked: 0 },
      diamond: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 },
    };
    for (const a of ACHIEVEMENTS) {
      counts[a.tier].total++;
      if (unlockedSet.has(a.id)) counts[a.tier].unlocked++;
    }
    return counts;
  }, [unlockedSet]);

  function formatTime(seconds: number): string {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  return (
    <div className="page-enter">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

        {/* ── Header ── */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-gray-900">
            Achievements <span className="text-gradient">& Stats</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">
            {summary.unlockedCount} of {summary.totalAchievements} unlocked ({summary.completionPercent}%)
          </p>
        </div>

        {/* ── Player Level Card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <AchievementProgressRing progress={level.progress} size={64} color="#6C5CE7" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black text-violet-700">{level.level}</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Level {level.level}</h2>
                <p className="text-sm text-gray-500">
                  {level.currentXP} / {level.xpForNextLevel} XP to next level
                </p>
                <div className="w-40 h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${level.progress * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center w-full sm:w-auto">
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gradient">{summary.totalGamesPlayed}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Games Played</p>
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-gradient">{formatTime(summary.totalTimePlayed)}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Time Played</p>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-lg sm:text-2xl font-bold text-gradient">
                  {summary.currentStreak > 0 ? `${summary.currentStreak}🔥` : '0'}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500">Day Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Daily Challenges ── */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Daily Challenges</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dailyChallenges.map(challenge => (
              <div key={challenge.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{challenge.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{challenge.title}</h4>
                    <p className="text-xs text-gray-500">{challenge.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-amber-600">🪙 {challenge.reward.coins}</span>
                    <span className="text-xs font-medium text-violet-600">+{challenge.reward.xp} XP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tier Breakdown ── */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
          {(['bronze', 'silver', 'gold', 'diamond', 'legendary'] as AchievementTier[]).map(tier => {
            const tc = tierCounts[tier];
            const colors = TIER_COLORS[tier];
            return (
              <button
                key={tier}
                onClick={() => setFilter(filter === tier ? 'all' : tier)}
                className={`rounded-xl p-2 sm:p-3 text-center border transition-all touch-manipulation ${
                  filter === tier ? 'ring-2 ring-offset-1' : ''
                }`}
                style={{
                  borderColor: filter === tier ? colors.bg : '#e5e7eb',
                  background: filter === tier ? `${colors.bg}15` : 'white',
                  outlineColor: filter === tier ? colors.bg : undefined,
                }}
              >
                <p className="text-sm sm:text-lg font-bold" style={{ color: colors.bg }}>
                  {tc.unlocked}/{tc.total}
                </p>
                <p className="text-[9px] sm:text-xs text-gray-500 capitalize">{tier}</p>
              </button>
            );
          })}
        </div>

        {/* ── Filter Buttons ── */}
        <div className="flex gap-2 mb-4 overflow-x-auto category-scroll">
          {['all', 'unlocked', 'locked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterOption)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
                filter === f
                  ? 'bg-violet-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'unlocked' ? '✓ Unlocked' : '🔒 Locked'}
            </button>
          ))}
        </div>

        {/* ── Category Filter ── */}
        <div className="flex gap-2 mb-6 overflow-x-auto category-scroll">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
              selectedCategory === 'all'
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            All Categories
          </button>
          {Object.entries(categories).map(([cat, data]) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-manipulation ${
                selectedCategory === cat
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat.replace(/_/g, ' ')} ({data.unlocked}/{data.total})
            </button>
          ))}
        </div>

        {/* ── Achievement Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAchievements.map(achievement => {
            const unlocked = unlockedSet.has(achievement.id);
            const progress = getAchievementProgress(achievement);
            const colors = TIER_COLORS[achievement.tier];

            return (
              <div
                key={achievement.id}
                className={`rounded-xl border p-4 transition-all ${
                  unlocked
                    ? 'bg-white shadow-sm'
                    : 'bg-gray-50 opacity-75'
                }`}
                style={{ borderColor: unlocked ? colors.border + '60' : '#e5e7eb' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                      unlocked ? '' : 'grayscale'
                    }`}
                    style={{
                      background: unlocked ? `${colors.bg}20` : '#f3f4f6',
                      border: `2px solid ${unlocked ? colors.border + '40' : '#e5e7eb'}`,
                    }}
                  >
                    {achievement.hidden && !unlocked ? '❓' : achievement.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {achievement.tier}
                      </span>
                      <span className="text-[10px] text-gray-400">+{TIER_XP[achievement.tier]} XP</span>
                      {unlocked && <span className="text-[10px] text-green-500 font-medium">✓ Unlocked</span>}
                    </div>
                    <h4 className="font-semibold text-gray-900 text-sm">{achievement.title}</h4>
                    <p className="text-[11px] text-gray-500">{achievement.description}</p>

                    {!unlocked && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress * 100}%`, background: colors.bg }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {Math.round(progress * 100)}% complete
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAchievements.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-500">No achievements match this filter</p>
          </div>
        )}

        {/* ── Lifetime Stats ── */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Lifetime Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Score', value: stats.totalScore.toLocaleString(), icon: '📊' },
              { label: 'Games Played', value: stats.totalGamesPlayed.toString(), icon: '🎮' },
              { label: 'Unique Games', value: stats.uniqueGamesPlayed.length.toString(), icon: '🗺️' },
              { label: 'Longest Streak', value: `${stats.longestStreak} days`, icon: '🔥' },
              { label: 'Highest Combo', value: `${stats.highestCombo}x`, icon: '⚡' },
              { label: 'Perfect Games', value: stats.perfectGames.toString(), icon: '✨' },
              { label: 'Food Eaten', value: stats.totalFoodEaten.toString(), icon: '🍎' },
              { label: 'Lines Cleared', value: stats.totalLinesCleared.toString(), icon: '📏' },
              { label: 'Bricks Destroyed', value: stats.totalBricksDestroyed.toString(), icon: '🧱' },
              { label: 'Moles Whacked', value: stats.totalMolesWhacked.toString(), icon: '🔨' },
              { label: 'Words Typed', value: stats.totalWordsTyped.toString(), icon: '⌨️' },
              { label: 'Clicks', value: stats.totalClickCount.toLocaleString(), icon: '🖱️' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                <span className="text-xl">{stat.icon}</span>
                <p className="text-lg font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-[10px] text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
