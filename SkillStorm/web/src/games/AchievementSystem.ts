/* ═══════════════════════════════════════════════════════════════════════════════
   ACHIEVEMENT SYSTEM — Elite Game Achievements & Progression
   Tracks player accomplishments across all games with unlockable rewards,
   tiered achievements (bronze/silver/gold/diamond), lifetime stats,
   daily challenges, streaks, leaderboards, and progression milestones.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Achievement Tiers ── */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export const TIER_COLORS: Record<AchievementTier, { bg: string; text: string; border: string; glow: string }> = {
  bronze:    { bg: '#CD7F32', text: '#fff',    border: '#B8722C', glow: 'rgba(205,127,50,0.4)' },
  silver:    { bg: '#C0C0C0', text: '#333',    border: '#A8A8A8', glow: 'rgba(192,192,192,0.4)' },
  gold:      { bg: '#FFD700', text: '#333',    border: '#E6C200', glow: 'rgba(255,215,0,0.4)' },
  diamond:   { bg: '#B9F2FF', text: '#0C4A6E', border: '#67E8F9', glow: 'rgba(103,232,249,0.4)' },
  legendary: { bg: '#A855F7', text: '#fff',    border: '#9333EA', glow: 'rgba(168,85,247,0.5)' },
};

export const TIER_XP: Record<AchievementTier, number> = {
  bronze: 10,
  silver: 25,
  gold: 50,
  diamond: 100,
  legendary: 250,
};

/* ── Achievement Definition ── */
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  category: AchievementCategory;
  condition: AchievementCondition;
  reward?: AchievementReward;
  hidden?: boolean;
  gameId?: string;
}

export type AchievementCategory =
  | 'general'
  | 'snake' | 'tetris' | 'flappy' | 'breakout' | 'pong'
  | 'space_invaders' | 'chess' | 'checkers' | 'solitaire'
  | 'game_2048' | 'minesweeper' | 'sudoku' | 'cookie_clicker'
  | 'dino_run' | 'fruit_ninja' | 'simon' | 'maze_runner'
  | 'type_racer' | 'reaction' | 'crossword' | 'hangman'
  | 'bubble_shooter' | 'color_match' | 'connect_four'
  | 'tic_tac_toe' | 'whack_a_mole'
  | 'educational' | 'social' | 'collector' | 'streak' | 'explorer';

export interface AchievementCondition {
  type: 'stat_gte' | 'stat_eq' | 'event' | 'multi';
  stat?: string;
  value?: number;
  event?: string;
  conditions?: AchievementCondition[];
  all?: boolean;
}

export interface AchievementReward {
  type: 'coins' | 'skin' | 'theme' | 'title' | 'badge' | 'powerup';
  value: string | number;
  label: string;
}

/* ── Unlocked Achievement ── */
export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
  notified: boolean;
}

/* ── Player Stats ── */
export interface PlayerStats {
  totalGamesPlayed: number;
  totalTimePlayed: number;
  totalScore: number;
  highestCombo: number;
  longestStreak: number;
  currentStreak: number;
  lastPlayDate: string;
  gamesPlayedToday: number;
  uniqueGamesPlayed: string[];
  perfectGames: number;
  totalLinesCleared: number;
  totalBlocksPlaced: number;
  totalFoodEaten: number;
  totalPipesCleared: number;
  totalBricksDestroyed: number;
  totalCheckmates: number;
  totalSolves: number;
  totalWordsTyped: number;
  totalClickCount: number;
  totalMolesWhacked: number;
  totalFruitSliced: number;
  totalMinesFound: number;
  fastestReaction: number;
  longestSurvival: number;
  highestLevel: number;
  snakeHighScore: number;
  tetrisHighScore: number;
  flappyHighScore: number;
  breakoutHighScore: number;
  pongWins: number;
  spaceInvadersHighScore: number;
  game2048HighScore: number;
  dinoRunHighScore: number;
  [key: string]: number | string | string[];
}

const DEFAULT_STATS: PlayerStats = {
  totalGamesPlayed: 0,
  totalTimePlayed: 0,
  totalScore: 0,
  highestCombo: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastPlayDate: '',
  gamesPlayedToday: 0,
  uniqueGamesPlayed: [],
  perfectGames: 0,
  totalLinesCleared: 0,
  totalBlocksPlaced: 0,
  totalFoodEaten: 0,
  totalPipesCleared: 0,
  totalBricksDestroyed: 0,
  totalCheckmates: 0,
  totalSolves: 0,
  totalWordsTyped: 0,
  totalClickCount: 0,
  totalMolesWhacked: 0,
  totalFruitSliced: 0,
  totalMinesFound: 0,
  fastestReaction: 9999,
  longestSurvival: 0,
  highestLevel: 0,
  snakeHighScore: 0,
  tetrisHighScore: 0,
  flappyHighScore: 0,
  breakoutHighScore: 0,
  pongWins: 0,
  spaceInvadersHighScore: 0,
  game2048HighScore: 0,
  dinoRunHighScore: 0,
};

/* ── Achievement Definitions ── */
export const ACHIEVEMENTS: AchievementDef[] = [
  /* === GENERAL ACHIEVEMENTS === */
  {
    id: 'first_game',
    title: 'First Steps',
    description: 'Play your first game',
    icon: '🎮',
    tier: 'bronze',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 1 },
  },
  {
    id: 'ten_games',
    title: 'Getting Started',
    description: 'Play 10 games',
    icon: '🕹️',
    tier: 'bronze',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 10 },
  },
  {
    id: 'fifty_games',
    title: 'Dedicated Gamer',
    description: 'Play 50 games',
    icon: '🏆',
    tier: 'silver',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 50 },
  },
  {
    id: 'hundred_games',
    title: 'Centurion',
    description: 'Play 100 games',
    icon: '💯',
    tier: 'gold',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 100 },
  },
  {
    id: 'five_hundred_games',
    title: 'Game Master',
    description: 'Play 500 games',
    icon: '👑',
    tier: 'diamond',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 500 },
  },
  {
    id: 'thousand_games',
    title: 'Legendary Player',
    description: 'Play 1000 games',
    icon: '⭐',
    tier: 'legendary',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalGamesPlayed', value: 1000 },
  },

  /* === EXPLORER ACHIEVEMENTS === */
  {
    id: 'explorer_5',
    title: 'Explorer',
    description: 'Play 5 different games',
    icon: '🗺️',
    tier: 'bronze',
    category: 'explorer',
    condition: { type: 'stat_gte', stat: 'uniqueGamesPlayedCount', value: 5 },
  },
  {
    id: 'explorer_15',
    title: 'Adventurer',
    description: 'Play 15 different games',
    icon: '🧭',
    tier: 'silver',
    category: 'explorer',
    condition: { type: 'stat_gte', stat: 'uniqueGamesPlayedCount', value: 15 },
  },
  {
    id: 'explorer_26',
    title: 'Arcade Champion',
    description: 'Play all 26 arcade games',
    icon: '🎯',
    tier: 'gold',
    category: 'explorer',
    condition: { type: 'stat_gte', stat: 'uniqueGamesPlayedCount', value: 26 },
  },

  /* === STREAK ACHIEVEMENTS === */
  {
    id: 'streak_3',
    title: 'On a Roll',
    description: 'Play 3 days in a row',
    icon: '🔥',
    tier: 'bronze',
    category: 'streak',
    condition: { type: 'stat_gte', stat: 'currentStreak', value: 3 },
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Play 7 days in a row',
    icon: '🔥',
    tier: 'silver',
    category: 'streak',
    condition: { type: 'stat_gte', stat: 'currentStreak', value: 7 },
  },
  {
    id: 'streak_30',
    title: 'Monthly Legend',
    description: 'Play 30 days in a row',
    icon: '🔥',
    tier: 'gold',
    category: 'streak',
    condition: { type: 'stat_gte', stat: 'currentStreak', value: 30 },
    reward: { type: 'title', value: 'Legendary', label: 'Legendary Player Title' },
  },

  /* === SNAKE ACHIEVEMENTS === */
  {
    id: 'snake_50',
    title: 'Snake Charmer',
    description: 'Score 50+ in Snake',
    icon: '🐍',
    tier: 'bronze',
    category: 'snake',
    condition: { type: 'stat_gte', stat: 'snakeHighScore', value: 50 },
  },
  {
    id: 'snake_200',
    title: 'Serpent Master',
    description: 'Score 200+ in Snake',
    icon: '🐍',
    tier: 'silver',
    category: 'snake',
    condition: { type: 'stat_gte', stat: 'snakeHighScore', value: 200 },
  },
  {
    id: 'snake_500',
    title: 'Anaconda',
    description: 'Score 500+ in Snake',
    icon: '🐍',
    tier: 'gold',
    category: 'snake',
    condition: { type: 'stat_gte', stat: 'snakeHighScore', value: 500 },
  },
  {
    id: 'food_100',
    title: 'Hungry Snake',
    description: 'Eat 100 food items total',
    icon: '🍎',
    tier: 'bronze',
    category: 'snake',
    condition: { type: 'stat_gte', stat: 'totalFoodEaten', value: 100 },
  },

  /* === BLOCK STACK ACHIEVEMENTS === */
  {
    id: 'tetris_1000',
    title: 'Block Builder',
    description: 'Score 1000+ in Block Stack',
    icon: '🧱',
    tier: 'bronze',
    category: 'tetris',
    condition: { type: 'stat_gte', stat: 'tetrisHighScore', value: 1000 },
  },
  {
    id: 'tetris_10000',
    title: 'Stack Pro',
    description: 'Score 10,000+ in Block Stack',
    icon: '🧱',
    tier: 'silver',
    category: 'tetris',
    condition: { type: 'stat_gte', stat: 'tetrisHighScore', value: 10000 },
  },
  {
    id: 'tetris_50000',
    title: 'Stack Legend',
    description: 'Score 50,000+ in Block Stack',
    icon: '🧱',
    tier: 'gold',
    category: 'tetris',
    condition: { type: 'stat_gte', stat: 'tetrisHighScore', value: 50000 },
  },
  {
    id: 'lines_100',
    title: 'Line Clearer',
    description: 'Clear 100 lines total',
    icon: '📏',
    tier: 'bronze',
    category: 'tetris',
    condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 100 },
  },
  {
    id: 'lines_1000',
    title: 'Line Master',
    description: 'Clear 1000 lines total',
    icon: '📏',
    tier: 'gold',
    category: 'tetris',
    condition: { type: 'stat_gte', stat: 'totalLinesCleared', value: 1000 },
  },

  /* === FLAPPY ACHIEVEMENTS === */
  {
    id: 'flappy_10',
    title: 'Baby Bird',
    description: 'Pass 10 pipes in Flappy',
    icon: '🐦',
    tier: 'bronze',
    category: 'flappy',
    condition: { type: 'stat_gte', stat: 'flappyHighScore', value: 10 },
  },
  {
    id: 'flappy_50',
    title: 'Soaring Eagle',
    description: 'Pass 50 pipes in Flappy',
    icon: '🦅',
    tier: 'silver',
    category: 'flappy',
    condition: { type: 'stat_gte', stat: 'flappyHighScore', value: 50 },
  },
  {
    id: 'flappy_100',
    title: 'Flappy Legend',
    description: 'Pass 100 pipes in Flappy',
    icon: '🐦',
    tier: 'gold',
    category: 'flappy',
    condition: { type: 'stat_gte', stat: 'flappyHighScore', value: 100 },
  },
  {
    id: 'pipes_500',
    title: 'Pipe Dream',
    description: 'Pass 500 pipes total across all games',
    icon: '🔧',
    tier: 'silver',
    category: 'flappy',
    condition: { type: 'stat_gte', stat: 'totalPipesCleared', value: 500 },
  },

  /* === BREAKOUT ACHIEVEMENTS === */
  {
    id: 'breakout_1000',
    title: 'Brick Breaker',
    description: 'Score 1000+ in Breakout',
    icon: '💥',
    tier: 'bronze',
    category: 'breakout',
    condition: { type: 'stat_gte', stat: 'breakoutHighScore', value: 1000 },
  },
  {
    id: 'bricks_500',
    title: 'Demolition Expert',
    description: 'Destroy 500 bricks total',
    icon: '🧱',
    tier: 'silver',
    category: 'breakout',
    condition: { type: 'stat_gte', stat: 'totalBricksDestroyed', value: 500 },
  },

  /* === PONG ACHIEVEMENTS === */
  {
    id: 'pong_10',
    title: 'Pong Rookie',
    description: 'Win 10 Pong matches',
    icon: '🏓',
    tier: 'bronze',
    category: 'pong',
    condition: { type: 'stat_gte', stat: 'pongWins', value: 10 },
  },
  {
    id: 'pong_50',
    title: 'Table Tennis Pro',
    description: 'Win 50 Pong matches',
    icon: '🏓',
    tier: 'silver',
    category: 'pong',
    condition: { type: 'stat_gte', stat: 'pongWins', value: 50 },
  },

  /* === SPACE INVADERS ACHIEVEMENTS === */
  {
    id: 'invaders_5000',
    title: 'Space Defender',
    description: 'Score 5000+ in Space Invaders',
    icon: '👾',
    tier: 'silver',
    category: 'space_invaders',
    condition: { type: 'stat_gte', stat: 'spaceInvadersHighScore', value: 5000 },
  },

  /* === 2048 ACHIEVEMENTS === */
  {
    id: '2048_2048',
    title: 'Two Thousand Forty-Eight',
    description: 'Reach the 2048 tile',
    icon: '🔢',
    tier: 'gold',
    category: 'game_2048',
    condition: { type: 'stat_gte', stat: 'game2048HighScore', value: 20000 },
  },

  /* === DINO RUN ACHIEVEMENTS === */
  {
    id: 'dino_500',
    title: 'Dino Runner',
    description: 'Score 500+ in Dino Run',
    icon: '🦕',
    tier: 'bronze',
    category: 'dino_run',
    condition: { type: 'stat_gte', stat: 'dinoRunHighScore', value: 500 },
  },
  {
    id: 'dino_2000',
    title: 'T-Rex Legend',
    description: 'Score 2000+ in Dino Run',
    icon: '🦖',
    tier: 'gold',
    category: 'dino_run',
    condition: { type: 'stat_gte', stat: 'dinoRunHighScore', value: 2000 },
  },

  /* === COMBO/SCORE ACHIEVEMENTS === */
  {
    id: 'combo_5',
    title: 'Combo Starter',
    description: 'Get a 5x combo in any game',
    icon: '⚡',
    tier: 'bronze',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'highestCombo', value: 5 },
  },
  {
    id: 'combo_20',
    title: 'Combo King',
    description: 'Get a 20x combo in any game',
    icon: '⚡',
    tier: 'silver',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'highestCombo', value: 20 },
  },
  {
    id: 'combo_50',
    title: 'Combo Legend',
    description: 'Get a 50x combo in any game',
    icon: '⚡',
    tier: 'gold',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'highestCombo', value: 50 },
  },
  {
    id: 'score_10k',
    title: 'Score Hunter',
    description: 'Accumulate 10,000 total score',
    icon: '📈',
    tier: 'bronze',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalScore', value: 10000 },
  },
  {
    id: 'score_100k',
    title: 'Score Master',
    description: 'Accumulate 100,000 total score',
    icon: '📈',
    tier: 'silver',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalScore', value: 100000 },
  },
  {
    id: 'score_1m',
    title: 'Score Legend',
    description: 'Accumulate 1,000,000 total score',
    icon: '📈',
    tier: 'gold',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalScore', value: 1000000 },
  },

  /* === TIME ACHIEVEMENTS === */
  {
    id: 'time_1h',
    title: 'One Hour',
    description: 'Play for a total of 1 hour',
    icon: '⏰',
    tier: 'bronze',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalTimePlayed', value: 3600 },
  },
  {
    id: 'time_10h',
    title: 'Dedicated Player',
    description: 'Play for a total of 10 hours',
    icon: '⏰',
    tier: 'silver',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalTimePlayed', value: 36000 },
  },
  {
    id: 'time_100h',
    title: 'Gaming Veteran',
    description: 'Play for a total of 100 hours',
    icon: '⏰',
    tier: 'gold',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'totalTimePlayed', value: 360000 },
  },

  /* === REACTION ACHIEVEMENTS === */
  {
    id: 'reaction_300',
    title: 'Quick Reflexes',
    description: 'React in under 300ms',
    icon: '⚡',
    tier: 'bronze',
    category: 'reaction',
    condition: { type: 'stat_gte', stat: 'fastestReactionInverse', value: 700 },
  },
  {
    id: 'reaction_200',
    title: 'Lightning Speed',
    description: 'React in under 200ms',
    icon: '⚡',
    tier: 'gold',
    category: 'reaction',
    condition: { type: 'stat_gte', stat: 'fastestReactionInverse', value: 800 },
  },

  /* === TYPING ACHIEVEMENTS === */
  {
    id: 'words_100',
    title: 'Typist',
    description: 'Type 100 words',
    icon: '⌨️',
    tier: 'bronze',
    category: 'type_racer',
    condition: { type: 'stat_gte', stat: 'totalWordsTyped', value: 100 },
  },
  {
    id: 'words_1000',
    title: 'Speed Demon',
    description: 'Type 1000 words',
    icon: '⌨️',
    tier: 'silver',
    category: 'type_racer',
    condition: { type: 'stat_gte', stat: 'totalWordsTyped', value: 1000 },
  },

  /* === COLLECTOR ACHIEVEMENTS === */
  {
    id: 'clicks_10k',
    title: 'Clicker',
    description: 'Click 10,000 times total',
    icon: '🖱️',
    tier: 'silver',
    category: 'collector',
    condition: { type: 'stat_gte', stat: 'totalClickCount', value: 10000 },
  },
  {
    id: 'perfect_5',
    title: 'Perfectionist',
    description: 'Complete 5 perfect games',
    icon: '✨',
    tier: 'gold',
    category: 'general',
    condition: { type: 'stat_gte', stat: 'perfectGames', value: 5 },
  },
];

/* ── Daily Challenges ── */
export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  gameId?: string;
  condition: { stat: string; value: number };
  reward: { coins: number; xp: number };
}

function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const DAILY_CHALLENGE_POOL: Omit<DailyChallenge, 'id'>[] = [
  { title: 'Snake Sprint', description: 'Score 100+ in Snake', icon: '🐍', gameId: 'snake', condition: { stat: 'snakeHighScore', value: 100 }, reward: { coins: 50, xp: 25 } },
  { title: 'Stack Master', description: 'Clear 20 lines in Block Stack', icon: '🧱', gameId: 'tetris', condition: { stat: 'totalLinesCleared', value: 20 }, reward: { coins: 75, xp: 40 } },
  { title: 'Flappy Pro', description: 'Pass 25 pipes in Flappy Jump', icon: '🐦', gameId: 'flappy', condition: { stat: 'flappyHighScore', value: 25 }, reward: { coins: 60, xp: 30 } },
  { title: 'Breakout Blitz', description: 'Destroy 50 bricks', icon: '💥', gameId: 'breakout', condition: { stat: 'totalBricksDestroyed', value: 50 }, reward: { coins: 50, xp: 25 } },
  { title: 'Game Explorer', description: 'Play 5 different games today', icon: '🗺️', condition: { stat: 'gamesPlayedToday', value: 5 }, reward: { coins: 100, xp: 50 } },
  { title: 'Score Hunter', description: 'Accumulate 5000 score today', icon: '📈', condition: { stat: 'todayScore', value: 5000 }, reward: { coins: 80, xp: 40 } },
  { title: 'Speed Demon', description: 'React under 300ms', icon: '⚡', gameId: 'reaction', condition: { stat: 'fastestReactionInverse', value: 700 }, reward: { coins: 75, xp: 35 } },
  { title: 'Whack Master', description: 'Whack 30 moles', icon: '🔨', gameId: 'whack_a_mole', condition: { stat: 'totalMolesWhacked', value: 30 }, reward: { coins: 50, xp: 25 } },
  { title: 'Fruit Frenzy', description: 'Slice 40 fruits', icon: '🍉', gameId: 'fruit_ninja', condition: { stat: 'totalFruitSliced', value: 40 }, reward: { coins: 50, xp: 25 } },
  { title: 'Dino Dash', description: 'Score 300+ in Dino Run', icon: '🦕', gameId: 'dino_run', condition: { stat: 'dinoRunHighScore', value: 300 }, reward: { coins: 60, xp: 30 } },
];

export function getDailyChallenges(): DailyChallenge[] {
  const seed = getDailySeed();
  const rng = seededRandom(seed);
  const shuffled = [...DAILY_CHALLENGE_POOL].sort(() => rng() - 0.5);
  return shuffled.slice(0, 3).map((c, i) => ({
    ...c,
    id: `daily_${seed}_${i}`,
  }));
}

/* ── Storage Keys ── */
const STATS_KEY = 'skillzstorm_player_stats';
const ACHIEVEMENTS_KEY = 'skillzstorm_achievements';
const DAILY_KEY = 'skillzstorm_daily_progress';
const XP_KEY = 'skillzstorm_player_xp';

/* ── Stats Management ── */
export function getPlayerStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function savePlayerStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function updateStat(stat: string, value: number, mode: 'set' | 'add' | 'max' | 'min' = 'add'): PlayerStats {
  const stats = getPlayerStats();
  const current = (stats[stat] as number) ?? 0;

  switch (mode) {
    case 'set': (stats as any)[stat] = value; break;
    case 'add': (stats as any)[stat] = current + value; break;
    case 'max': (stats as any)[stat] = Math.max(current, value); break;
    case 'min': (stats as any)[stat] = Math.min(current, value); break;
  }

  savePlayerStats(stats);
  return stats;
}

export function recordGamePlayed(gameId: string, score: number, timePlayed: number): PlayerStats {
  const stats = getPlayerStats();
  const today = new Date().toISOString().split('T')[0];

  stats.totalGamesPlayed++;
  stats.totalScore += score;
  stats.totalTimePlayed += timePlayed;

  if (!stats.uniqueGamesPlayed.includes(gameId)) {
    stats.uniqueGamesPlayed.push(gameId);
  }

  if (stats.lastPlayDate !== today) {
    // Grace period: streak continues if last play was within 2 days (Apple-friendly)
    const lastDate = stats.lastPlayDate ? new Date(stats.lastPlayDate) : null;
    const todayDate = new Date(today);
    const daysSinceLast = lastDate
      ? Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLast <= 2) {
      stats.currentStreak++;
    } else {
      stats.currentStreak = 1;
    }

    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastPlayDate = today;
    stats.gamesPlayedToday = 1;
  } else {
    stats.gamesPlayedToday++;
  }

  savePlayerStats(stats);
  return stats;
}

/* ── Achievement Management ── */
export function getUnlockedAchievements(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnlockedAchievements(achievements: UnlockedAchievement[]) {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch {}
}

export function isAchievementUnlocked(achievementId: string): boolean {
  return getUnlockedAchievements().some(a => a.id === achievementId);
}

function checkCondition(condition: AchievementCondition, stats: PlayerStats): boolean {
  const derivedStats: Record<string, number> = {
    uniqueGamesPlayedCount: stats.uniqueGamesPlayed.length,
    fastestReactionInverse: 1000 - stats.fastestReaction,
  };

  switch (condition.type) {
    case 'stat_gte': {
      const val = derivedStats[condition.stat!] ?? (stats[condition.stat!] as number) ?? 0;
      return val >= (condition.value ?? 0);
    }
    case 'stat_eq': {
      const val = derivedStats[condition.stat!] ?? (stats[condition.stat!] as number) ?? 0;
      return val === (condition.value ?? 0);
    }
    case 'multi': {
      if (condition.all) {
        return (condition.conditions ?? []).every(c => checkCondition(c, stats));
      }
      return (condition.conditions ?? []).some(c => checkCondition(c, stats));
    }
    default:
      return false;
  }
}

export function checkAchievements(): AchievementDef[] {
  const stats = getPlayerStats();
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: AchievementDef[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (unlocked.some(u => u.id === achievement.id)) continue;
    if (checkCondition(achievement.condition, stats)) {
      newlyUnlocked.push(achievement);
      unlocked.push({
        id: achievement.id,
        unlockedAt: Date.now(),
        notified: false,
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    saveUnlockedAchievements(unlocked);
    const currentXP = getPlayerXP();
    const earnedXP = newlyUnlocked.reduce((sum, a) => sum + TIER_XP[a.tier], 0);
    setPlayerXP(currentXP + earnedXP);
  }

  return newlyUnlocked;
}

export function markAchievementNotified(achievementId: string) {
  const unlocked = getUnlockedAchievements();
  const ach = unlocked.find(a => a.id === achievementId);
  if (ach) {
    ach.notified = true;
    saveUnlockedAchievements(unlocked);
  }
}

export function getUnnotifiedAchievements(): AchievementDef[] {
  const unlocked = getUnlockedAchievements();
  const unnotified = unlocked.filter(u => !u.notified);
  return unnotified.map(u => ACHIEVEMENTS.find(a => a.id === u.id)!).filter(Boolean);
}

/* ── XP & Level ── */
export function getPlayerXP(): number {
  try {
    return parseInt(localStorage.getItem(XP_KEY) ?? '0', 10);
  } catch {
    return 0;
  }
}

export function setPlayerXP(xp: number) {
  try {
    localStorage.setItem(XP_KEY, String(xp));
  } catch {}
}

export function getPlayerLevel(): { level: number; currentXP: number; xpForNextLevel: number; progress: number } {
  const totalXP = getPlayerXP();
  let level = 1;
  let xpNeeded = 100;
  let xpRemaining = totalXP;

  while (xpRemaining >= xpNeeded) {
    xpRemaining -= xpNeeded;
    level++;
    xpNeeded = Math.floor(100 * Math.pow(1.15, level - 1));
  }

  return {
    level,
    currentXP: xpRemaining,
    xpForNextLevel: xpNeeded,
    progress: xpRemaining / xpNeeded,
  };
}

/* ── Achievement Progress Helpers ── */
export function getAchievementProgress(achievement: AchievementDef): number {
  const stats = getPlayerStats();
  if (isAchievementUnlocked(achievement.id)) return 1;

  const condition = achievement.condition;
  if (condition.type === 'stat_gte' && condition.stat && condition.value) {
    const derivedStats: Record<string, number> = {
      uniqueGamesPlayedCount: stats.uniqueGamesPlayed.length,
      fastestReactionInverse: 1000 - stats.fastestReaction,
    };
    const current = derivedStats[condition.stat] ?? (stats[condition.stat] as number) ?? 0;
    return Math.min(1, current / condition.value);
  }

  return 0;
}

/* ── Category Stats ── */
export function getAchievementsByCategory(): Record<string, { total: number; unlocked: number; achievements: AchievementDef[] }> {
  const unlocked = new Set(getUnlockedAchievements().map(u => u.id));
  const result: Record<string, { total: number; unlocked: number; achievements: AchievementDef[] }> = {};

  for (const ach of ACHIEVEMENTS) {
    const cat = ach.category;
    if (!result[cat]) result[cat] = { total: 0, unlocked: 0, achievements: [] };
    result[cat].total++;
    result[cat].achievements.push(ach);
    if (unlocked.has(ach.id)) result[cat].unlocked++;
  }

  return result;
}

/* ── Summary ── */
export function getAchievementSummary() {
  const unlocked = getUnlockedAchievements();
  const total = ACHIEVEMENTS.length;
  const stats = getPlayerStats();
  const level = getPlayerLevel();

  return {
    totalAchievements: total,
    unlockedCount: unlocked.length,
    completionPercent: Math.round((unlocked.length / total) * 100),
    playerLevel: level.level,
    playerXP: getPlayerXP(),
    xpProgress: level.progress,
    xpToNextLevel: level.xpForNextLevel - level.currentXP,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalGamesPlayed: stats.totalGamesPlayed,
    totalTimePlayed: stats.totalTimePlayed,
    totalScore: stats.totalScore,
    uniqueGamesPlayed: stats.uniqueGamesPlayed.length,
    dailyChallenges: getDailyChallenges(),
  };
}
