/* ═══════════════════════════════════════════════════════════
   ARCADE GAME DATA
   26 arcade games — Friv-style casual gaming
   Premium descriptions & unique cover art designs
   Each game has a coverScene with SVG-rendered visual elements
   ═══════════════════════════════════════════════════════════ */

export type ArcadeCategory = 'action' | 'puzzle' | 'classic' | 'speed' | 'strategy';

export interface ArcadeGame {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: ArcadeCategory;
  coverGradient: string;
  coverScene: string;
  isNew?: boolean;
}

const ag = {
  neonGreen: 'linear-gradient(135deg, #22c55e, #16a34a)',
  electricBlue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  hotPink: 'linear-gradient(135deg, #ec4899, #db2777)',
  sunsetOrange: 'linear-gradient(135deg, #f97316, #ea580c)',
  deepPurple: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  crimsonRed: 'linear-gradient(135deg, #ef4444, #dc2626)',
  oceanCyan: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  goldAmber: 'linear-gradient(135deg, #f59e0b, #d97706)',
  limeFresh: 'linear-gradient(135deg, #84cc16, #65a30d)',
  indigoNight: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  roseBlush: 'linear-gradient(135deg, #f43f5e, #e11d48)',
  emeraldDark: 'linear-gradient(135deg, #10b981, #059669)',
  skyLight: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
  fuchsiaBright: 'linear-gradient(135deg, #d946ef, #c026d3)',
  tealDeep: 'linear-gradient(135deg, #14b8a6, #0d9488)',
  slateSteel: 'linear-gradient(135deg, #64748b, #475569)',
  warmPeach: 'linear-gradient(135deg, #fb923c, #f97316)',
  violetDream: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
  mintGreen: 'linear-gradient(135deg, #34d399, #10b981)',
  blushPink: 'linear-gradient(135deg, #fda4af, #fb7185)',
  cobaltBlue: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  tangerine: 'linear-gradient(135deg, #fb923c, #ea580c)',
  plum: 'linear-gradient(135deg, #a855f7, #9333ea)',
  ruby: 'linear-gradient(135deg, #e11d48, #be123c)',
  sapphire: 'linear-gradient(135deg, #3b82f6, #1e40af)',
  jade: 'linear-gradient(135deg, #059669, #047857)',
};

export const ARCADE_GAMES: ArcadeGame[] = [
  // ── Classic Games ──
  {
    id: 'snake',
    title: 'Snake',
    description: 'Navigate the neon serpent through a pulsing grid. Devour glowing orbs to grow longer while dodging your own tail in this addictive arcade classic reimagined with elite visuals.',
    icon: '🐍',
    category: 'classic',
    coverGradient: ag.neonGreen,
    coverScene: 'snake',
  },
  {
    id: 'tetris',
    title: 'Block Stack',
    description: 'Falling blocks meet lightning reflexes. Rotate, slide, and stack tetrominoes to clear lines in a race against gravity. How long can you survive the accelerating cascade?',
    icon: '🧱',
    category: 'classic',
    coverGradient: ag.electricBlue,
    coverScene: 'tetris',
  },
  {
    id: 'pong',
    title: 'Paddle Rally',
    description: 'The classic reimagined with smooth physics and dynamic AI. Rally the ball past your opponent with precise paddle control in this timeless competitive showdown.',
    icon: '🏓',
    category: 'classic',
    coverGradient: ag.slateSteel,
    coverScene: 'pong',
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    description: 'The ultimate card game of patience and strategy. Build foundation stacks from Ace to King in this beautifully rendered Klondike solitaire with smooth drag-and-drop controls.',
    icon: '🃏',
    category: 'classic',
    coverGradient: ag.jade,
    coverScene: 'cards',
    isNew: true,
  },

  // ── Action Games ──
  {
    id: 'breakout',
    title: 'Brick Breaker',
    description: 'Launch the ball and shatter rows of vibrant bricks! Chain power-ups, unlock multi-ball chaos, and demolish every block in this physics-driven brick breaker with dazzling particle effects.',
    icon: '💥',
    category: 'action',
    coverGradient: ag.sunsetOrange,
    coverScene: 'bricks',
  },
  {
    id: 'flappy',
    title: 'Flappy Jump',
    description: 'Tap with surgical precision to guide your bird through impossibly narrow pipe gaps. One wrong move and it\'s game over. Simple to learn, brutally hard to master.',
    icon: '🐦',
    category: 'action',
    coverGradient: ag.skyLight,
    coverScene: 'flappy',
  },
  {
    id: 'dino_run',
    title: 'Dino Run',
    description: 'Sprint through a prehistoric landscape as an unstoppable dinosaur! Leap over cacti, duck under pterodactyls, and rack up distance in this endless runner with retro charm.',
    icon: '🦕',
    category: 'action',
    coverGradient: ag.emeraldDark,
    coverScene: 'dino',
  },
  {
    id: 'space_invaders',
    title: 'Galaxy Defenders',
    description: 'Defend Earth from descending alien formations in this legendary shoot-em-up. Strafe behind shields, pick off invaders row by row, and face the dreaded mothership bonus round.',
    icon: '👾',
    category: 'action',
    coverGradient: ag.indigoNight,
    coverScene: 'space',
  },
  {
    id: 'fruit_ninja',
    title: 'Fruit Slicer',
    description: 'Swipe your blade through juicy watermelons, oranges, and mangoes launched into the air! Rack up combos with precision slices but beware — one bomb and your streak is done.',
    icon: '🍉',
    category: 'action',
    coverGradient: ag.limeFresh,
    coverScene: 'fruit',
    isNew: true,
  },

  // ── Puzzle Games ──
  {
    id: 'simon',
    title: 'Color Recall',
    description: 'Watch the colors flash, listen to the tones, then repeat the sequence from memory. Each round adds a new step — how far can your concentration take you?',
    icon: '🔴',
    category: 'puzzle',
    coverGradient: ag.deepPurple,
    coverScene: 'simon',
  },
  {
    id: 'maze_runner',
    title: 'Maze Dash',
    description: 'Race against the clock through procedurally generated labyrinths. Every maze is unique, walls shift unpredictably, and only the sharpest navigators find the exit before time expires.',
    icon: '🏃',
    category: 'puzzle',
    coverGradient: ag.tealDeep,
    coverScene: 'maze',
  },
  {
    id: 'game_2048',
    title: '2048',
    description: 'Slide numbered tiles on a 4×4 grid, merging matching pairs to create higher values. Plan ahead, chain moves strategically, and chase the legendary 2048 tile — or push even further.',
    icon: '🔢',
    category: 'puzzle',
    coverGradient: ag.tangerine,
    coverScene: 'tiles2048',
    isNew: true,
  },
  {
    id: 'minesweeper',
    title: 'Mine Sweep',
    description: 'Use logic and deduction to clear a hidden minefield. Each number is a clue — calculate risk, flag suspected bombs, and sweep the board clean without triggering a single mine.',
    icon: '💣',
    category: 'puzzle',
    coverGradient: ag.slateSteel,
    coverScene: 'mines',
    isNew: true,
  },
  {
    id: 'sudoku',
    title: 'Sudoku',
    description: 'Fill the 9×9 grid so every row, column, and 3×3 box contains digits 1–9. Choose from easy to fiendish difficulty with smart pencil marks, undo, and auto-check features.',
    icon: '🔢',
    category: 'puzzle',
    coverGradient: ag.cobaltBlue,
    coverScene: 'sudoku',
    isNew: true,
  },
  {
    id: 'crossword_mini',
    title: 'Crossword Mini',
    description: 'Solve compact crossword puzzles in under two minutes! Clues range from pop culture to science — perfect brain teasers for a quick mental challenge during any break.',
    icon: '📰',
    category: 'puzzle',
    coverGradient: ag.mintGreen,
    coverScene: 'crossword',
    isNew: true,
  },
  {
    id: 'bubble_shooter',
    title: 'Bubble Shooter',
    description: 'Aim and fire colored bubbles into the cascading cluster above. Match three or more to pop them in satisfying chain reactions. Clear the board before the bubbles reach the bottom!',
    icon: '🫧',
    category: 'puzzle',
    coverGradient: ag.blushPink,
    coverScene: 'bubbles',
    isNew: true,
  },
  {
    id: 'hangman',
    title: 'Hangman',
    description: 'Guess the hidden word one letter at a time before the stick figure is complete. Thousands of words across multiple categories test your vocabulary and deduction skills.',
    icon: '🪢',
    category: 'puzzle',
    coverGradient: ag.plum,
    coverScene: 'hangman',
    isNew: true,
  },

  // ── Speed Games ──
  {
    id: 'whack_a_mole',
    title: 'Whack Attack',
    description: 'Critters pop up faster and faster — slam them back down with split-second reflexes! Golden critters award bonus points while bomb critters cost precious lives. Stay sharp!',
    icon: '🔨',
    category: 'speed',
    coverGradient: ag.goldAmber,
    coverScene: 'whack',
  },
  {
    id: 'cookie_clicker',
    title: 'Cookie Tapper',
    description: 'Tap the giant cookie, buy upgrades, and watch your bakery empire grow exponentially. Grandmas, factories, and quantum cookie generators turn clicks into astronomical numbers.',
    icon: '🍪',
    category: 'speed',
    coverGradient: ag.warmPeach,
    coverScene: 'cookie',
  },
  {
    id: 'reaction_test',
    title: 'Reaction Test',
    description: 'How fast are your reflexes? Wait for the screen to flash green, then click instantly. Milliseconds matter — compete against yourself and friends for the ultimate reaction time.',
    icon: '⚡',
    category: 'speed',
    coverGradient: ag.hotPink,
    coverScene: 'lightning',
  },
  {
    id: 'color_match',
    title: 'Color Match',
    description: 'Your brain says one thing, your eyes say another. Identify whether the color of the text matches the word displayed — a devious Stroop test that accelerates with every correct answer.',
    icon: '🎨',
    category: 'speed',
    coverGradient: ag.fuchsiaBright,
    coverScene: 'palette',
  },
  {
    id: 'type_racer',
    title: 'Speed Typer',
    description: 'Race against the clock by typing words and sentences at blazing speed. Track your WPM, accuracy, and streaks as the difficulty escalates from common words to complex passages.',
    icon: '⌨️',
    category: 'speed',
    coverGradient: ag.roseBlush,
    coverScene: 'keyboard',
  },

  // ── Strategy Games ──
  {
    id: 'connect_four',
    title: 'Four in a Row',
    description: 'Drop colored discs into the vertical grid and be the first to align four in a row — horizontally, vertically, or diagonally. Outsmart the AI with clever blocking and setups.',
    icon: '🔴',
    category: 'strategy',
    coverGradient: ag.crimsonRed,
    coverScene: 'connect4',
  },
  {
    id: 'tic_tac_toe',
    title: 'Tic-Tac-Toe',
    description: 'The quintessential strategy game with a twist — play against an AI that ranges from beginner to unbeatable. Master the 3×3 grid and discover optimal opening moves.',
    icon: '❌',
    category: 'strategy',
    coverGradient: ag.oceanCyan,
    coverScene: 'tictactoe',
  },
  {
    id: 'chess',
    title: 'Chess',
    description: 'The king of strategy games, beautifully rendered with intelligent AI opponents. Choose your difficulty, study openings, and execute brilliant checkmates in this timeless battle of minds.',
    icon: '♟️',
    category: 'strategy',
    coverGradient: ag.violetDream,
    coverScene: 'chess',
    isNew: true,
  },
  {
    id: 'checkers',
    title: 'Checkers',
    description: 'Jump your opponent\'s pieces and crown your kings in this classic board game. Simple rules hide deep tactical possibilities — plan multi-jump sequences to dominate the board.',
    icon: '⬛',
    category: 'strategy',
    coverGradient: ag.ruby,
    coverScene: 'checkers',
    isNew: true,
  },
];

export function getArcadeGameById(id: string): ArcadeGame | undefined {
  return ARCADE_GAMES.find(g => g.id === id);
}

export function getArcadeGamesByCategory(category: ArcadeCategory): ArcadeGame[] {
  return ARCADE_GAMES.filter(g => g.category === category);
}

export const ARCADE_CATEGORIES: { id: ArcadeCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Games' },
  { id: 'action', label: 'Action' },
  { id: 'puzzle', label: 'Puzzle' },
  { id: 'classic', label: 'Classic' },
  { id: 'speed', label: 'Speed' },
  { id: 'strategy', label: 'Strategy' },
];
