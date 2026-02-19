/* ═══════════════════════════════════════════════════════════
   ARCADE (NON-EDUCATIONAL) GAME DATA
   Classic casual games — Friv-style
   ═══════════════════════════════════════════════════════════ */

export interface ArcadeGame {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  tags: string[];
}

export const arcadeGames: ArcadeGame[] = [
  { id: 'snake', name: 'Snake', emoji: '🐍', color: '#00ff80', description: 'Classic snake — eat, grow, survive!', tags: ['classic', 'strategy'] },
  { id: 'tetris', name: 'Block Stack', emoji: '🧱', color: '#0099ff', description: 'Stack falling blocks. Clear lines!', tags: ['classic', 'puzzle'] },
  { id: 'pong', name: 'Pong', emoji: '🏓', color: '#ffe600', description: 'The original arcade game. Beat the AI!', tags: ['classic', 'sports'] },
  { id: 'breakout', name: 'Breakout', emoji: '🧱', color: '#ff3399', description: 'Smash bricks with a bouncing ball!', tags: ['classic', 'action'] },
  { id: 'flappy', name: 'Flappy Jump', emoji: '🐦', color: '#ff8000', description: 'Tap to fly through pipes!', tags: ['action', 'tap'] },
  { id: 'whack', name: 'Whack-a-Mole', emoji: '🔨', color: '#9933ff', description: 'Smash moles as they pop up!', tags: ['action', 'speed'] },
  { id: 'simon', name: 'Simon Says', emoji: '🎵', color: '#00e6e6', description: 'Repeat the color pattern!', tags: ['memory', 'puzzle'] },
  { id: 'runner', name: 'Dino Run', emoji: '🦖', color: '#ff2626', description: 'Jump over cacti. How far can you go?', tags: ['action', 'runner'] },
  { id: 'shooter', name: 'Space Invaders', emoji: '👾', color: '#6644ff', description: 'Shoot descending alien invaders!', tags: ['classic', 'shooter'] },
  { id: 'maze', name: 'Maze Runner', emoji: '🏃', color: '#00ff80', description: 'Navigate the maze before time runs out!', tags: ['puzzle', 'strategy'] },
  { id: 'clicker', name: 'Cookie Clicker', emoji: '🍪', color: '#ff8000', description: 'Click. Upgrade. Repeat!', tags: ['clicker', 'idle'] },
  { id: 'connect4', name: 'Connect Four', emoji: '🔴', color: '#ff2626', description: 'Get 4 in a row before the AI!', tags: ['classic', 'strategy'] },
  { id: 'tictactoe', name: 'Tic-Tac-Toe', emoji: '❌', color: '#0099ff', description: 'Classic X\'s and O\'s!', tags: ['classic', 'strategy'] },
  { id: 'reaction', name: 'Reaction Test', emoji: '⚡', color: '#ffe600', description: 'How fast are your reflexes?', tags: ['speed', 'test'] },
  { id: 'colormatch', name: 'Color Match', emoji: '🎨', color: '#9933ff', description: 'Match colors at lightning speed!', tags: ['speed', 'puzzle'] },
  { id: 'typing', name: 'Type Racer', emoji: '⌨️', color: '#00e6e6', description: 'Type words before they fall!', tags: ['speed', 'typing'] },
  { id: 'game2048', name: '2048', emoji: '🔢', color: '#edc22e', description: 'Slide tiles, merge numbers to reach 2048!', tags: ['classic', 'puzzle'] },
  { id: 'minesweeper', name: 'Minesweeper', emoji: '💣', color: '#6b7280', description: 'Reveal cells and avoid the mines.', tags: ['classic', 'puzzle'] },
  { id: 'fruitninja', name: 'Fruit Ninja', emoji: '🍉', color: '#22c55e', description: 'Slice fruits, avoid bombs!', tags: ['action', 'speed'] },
  { id: 'bubbleshooter', name: 'Bubble Shooter', emoji: '🫧', color: '#3b82f6', description: 'Match 3+ bubbles to pop them.', tags: ['puzzle', 'action'] },
  { id: 'hangman', name: 'Hangman', emoji: '🎭', color: '#8b5cf6', description: 'Guess the word before the hangman.', tags: ['classic', 'puzzle'] },
];

export const arcadeTags = ['all', 'classic', 'action', 'puzzle', 'strategy', 'speed', 'runner', 'shooter', 'memory', 'tap', 'clicker', 'typing', 'idle'];
