/* ═══════════════════════════════════════════════════════════
   GAME STATS — LocalStorage Persistence for Dashboard
   Tracks: scores, games played, streaks, achievements, XP
   ═══════════════════════════════════════════════════════════ */

export interface GameSession {
  gameId: string;
  title: string;
  subject: string;
  engine: string;
  score: number;
  accuracy: number;
  duration: number; // seconds
  grade: string;
  timestamp: number;
  isArcade: boolean;
}

export interface SubjectStats {
  name: string;
  totalScore: number;
  gamesPlayed: number;
  bestScore: number;
  avgAccuracy: number;
  color: string;
  totalTime: number;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  desc: string;
  unlockedAt: number | null;
  requirement: (stats: PlayerStats) => boolean;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  totalScore: number;
  totalTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
  lastPlayDate: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  subjects: Record<string, SubjectStats>;
  recentGames: GameSession[];
  achievements: string[]; // unlocked achievement IDs
  coins: number;
  isPremium: boolean;
}

const STORAGE_KEY = 'skillzstorm_player_stats';
const SESSIONS_KEY = 'skillzstorm_game_sessions';

const SUBJECT_COLORS: Record<string, string> = {
  math: '#8b5cf6',
  science: '#10b981',
  reading: '#f59e0b',
  vocabulary: '#3b82f6',
  history: '#ef4444',
  geography: '#06b6d4',
  coding: '#6366f1',
  art: '#ec4899',
  arcade: '#f43f5e',
};

/* ── Default stats ── */
function defaultStats(): PlayerStats {
  return {
    totalGamesPlayed: 0,
    totalScore: 0,
    totalTimeSeconds: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayDate: '',
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    subjects: {},
    recentGames: [],
    achievements: [],
    coins: 0,
    isPremium: false,
  };
}

/* ── XP & Level System ── */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

function addXP(stats: PlayerStats, amount: number): PlayerStats {
  stats.xp += amount;
  while (stats.xp >= stats.xpToNextLevel) {
    stats.xp -= stats.xpToNextLevel;
    stats.level++;
    stats.xpToNextLevel = xpForLevel(stats.level);
  }
  return stats;
}

/* ── Streak Logic ── */
function updateStreak(stats: PlayerStats): PlayerStats {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (stats.lastPlayDate === today) {
    // Already played today, no change
  } else if (stats.lastPlayDate === yesterday) {
    stats.currentStreak++;
  } else if (stats.lastPlayDate !== today) {
    stats.currentStreak = 1;
  }

  stats.lastPlayDate = today;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  return stats;
}

/* ── Achievement Definitions ── */
const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game', icon: '🎮', title: 'First Steps',
    desc: 'Complete your first game',
    unlockedAt: null,
    requirement: (s) => s.totalGamesPlayed >= 1,
  },
  {
    id: 'streak_3', icon: '🔥', title: 'On Fire',
    desc: 'Play 3 days in a row',
    unlockedAt: null,
    requirement: (s) => s.currentStreak >= 3,
  },
  {
    id: 'streak_7', icon: '🔥', title: 'Week Warrior',
    desc: 'Play 7 days in a row',
    unlockedAt: null,
    requirement: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_30', icon: '💎', title: 'Monthly Master',
    desc: 'Play 30 days in a row',
    unlockedAt: null,
    requirement: (s) => s.currentStreak >= 30,
  },
  {
    id: 'games_10', icon: '⭐', title: 'Getting Started',
    desc: 'Play 10 games',
    unlockedAt: null,
    requirement: (s) => s.totalGamesPlayed >= 10,
  },
  {
    id: 'games_50', icon: '🏆', title: 'Dedicated Learner',
    desc: 'Play 50 games',
    unlockedAt: null,
    requirement: (s) => s.totalGamesPlayed >= 50,
  },
  {
    id: 'games_100', icon: '👑', title: 'Century Club',
    desc: 'Play 100 games',
    unlockedAt: null,
    requirement: (s) => s.totalGamesPlayed >= 100,
  },
  {
    id: 'score_1000', icon: '🎯', title: 'Score Hunter',
    desc: 'Reach 1,000 total score',
    unlockedAt: null,
    requirement: (s) => s.totalScore >= 1000,
  },
  {
    id: 'score_10000', icon: '💫', title: 'Score Legend',
    desc: 'Reach 10,000 total score',
    unlockedAt: null,
    requirement: (s) => s.totalScore >= 10000,
  },
  {
    id: 'score_50000', icon: '🌟', title: 'Score God',
    desc: 'Reach 50,000 total score',
    unlockedAt: null,
    requirement: (s) => s.totalScore >= 50000,
  },
  {
    id: 'all_rounder', icon: '🌈', title: 'All-Rounder',
    desc: 'Play games in 5 different subjects',
    unlockedAt: null,
    requirement: (s) => Object.keys(s.subjects).filter(k => s.subjects[k].gamesPlayed > 0).length >= 5,
  },
  {
    id: 'subject_master', icon: '🧠', title: 'Subject Master',
    desc: 'Play 20+ games in one subject',
    unlockedAt: null,
    requirement: (s) => Object.values(s.subjects).some(sub => sub.gamesPlayed >= 20),
  },
  {
    id: 'level_5', icon: '📈', title: 'Rising Star',
    desc: 'Reach Level 5',
    unlockedAt: null,
    requirement: (s) => s.level >= 5,
  },
  {
    id: 'level_10', icon: '🚀', title: 'Pro Player',
    desc: 'Reach Level 10',
    unlockedAt: null,
    requirement: (s) => s.level >= 10,
  },
  {
    id: 'level_25', icon: '⚡', title: 'Elite Gamer',
    desc: 'Reach Level 25',
    unlockedAt: null,
    requirement: (s) => s.level >= 25,
  },
  {
    id: 'marathon', icon: '⏱️', title: 'Marathon Gamer',
    desc: 'Play for 1 hour total',
    unlockedAt: null,
    requirement: (s) => s.totalTimeSeconds >= 3600,
  },
  {
    id: 'coins_500', icon: '💰', title: 'Coin Collector',
    desc: 'Earn 500 coins',
    unlockedAt: null,
    requirement: (s) => s.coins >= 500,
  },
  {
    id: 'arcade_fan', icon: '🕹️', title: 'Arcade Fan',
    desc: 'Play 10 arcade games',
    unlockedAt: null,
    requirement: (s) => {
      const arcadeCount = (s.subjects['arcade']?.gamesPlayed) || 0;
      return arcadeCount >= 10;
    },
  },
];

/* ── Core Functions ── */

export function getStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultStats(), ...parsed };
    }
  } catch {}
  return defaultStats();
}

export function saveStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordGameSession(session: GameSession): { stats: PlayerStats; newAchievements: Achievement[] } {
  let stats = getStats();

  // Update totals
  stats.totalGamesPlayed++;
  stats.totalScore += session.score;
  stats.totalTimeSeconds += session.duration;

  // XP: base 10 + score/10 + accuracy bonus + duration bonus
  const xpGain = Math.floor(10 + session.score / 10 + session.accuracy * 5 + Math.min(session.duration / 10, 20));
  stats = addXP(stats, xpGain);

  // Coins: 1 per 50 points + streak bonus
  const coinGain = Math.floor(session.score / 50) + stats.currentStreak;
  stats.coins += coinGain;

  // Update streak
  stats = updateStreak(stats);

  // Subject stats
  const subjectKey = session.isArcade ? 'arcade' : session.subject;
  if (!stats.subjects[subjectKey]) {
    stats.subjects[subjectKey] = {
      name: subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1),
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0,
      avgAccuracy: 0,
      color: SUBJECT_COLORS[subjectKey] || '#8b5cf6',
      totalTime: 0,
    };
  }
  const sub = stats.subjects[subjectKey];
  sub.totalScore += session.score;
  sub.gamesPlayed++;
  sub.bestScore = Math.max(sub.bestScore, session.score);
  sub.avgAccuracy = (sub.avgAccuracy * (sub.gamesPlayed - 1) + session.accuracy) / sub.gamesPlayed;
  sub.totalTime += session.duration;

  // Recent games (keep last 20)
  stats.recentGames.unshift(session);
  if (stats.recentGames.length > 20) stats.recentGames = stats.recentGames.slice(0, 20);

  // Check achievements
  const newAchievements: Achievement[] = [];
  for (const ach of ALL_ACHIEVEMENTS) {
    if (!stats.achievements.includes(ach.id) && ach.requirement(stats)) {
      stats.achievements.push(ach.id);
      newAchievements.push({ ...ach, unlockedAt: Date.now() });
    }
  }

  saveStats(stats);

  // Also save individual session
  try {
    const sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
    sessions.unshift(session);
    if (sessions.length > 100) sessions.length = 100;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {}

  return { stats, newAchievements };
}

export function getAllAchievements(): (Achievement & { unlocked: boolean })[] {
  const stats = getStats();
  return ALL_ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: stats.achievements.includes(a.id),
    unlockedAt: stats.achievements.includes(a.id) ? Date.now() : null,
  }));
}

export function getLeaderboard(): GameSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export { ALL_ACHIEVEMENTS };
