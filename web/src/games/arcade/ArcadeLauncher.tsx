/* Arcade Game Launcher — maps arcade game IDs to components */
import { SnakeGame } from './SnakeGame';
import { TetrisGame } from './TetrisGame';
import { PongGame } from './PongGame';
import { BreakoutGame } from './BreakoutGame';
import { FlappyGame } from './FlappyGame';
import { DinoRunGame } from './DinoRunGame';
import { SpaceInvadersGame } from './SpaceInvadersGame';
import { WhackAMole } from './WhackAMole';
import { SimonGame } from './SimonGame';
import { ReactionTest } from './ReactionTest';
import { ColorMatchGame } from './ColorMatchGame';
import { TypeRacer } from './TypeRacer';
import { Game2048 } from './Game2048';
import { MinesweeperGame } from './MinesweeperGame';
import { FruitNinjaGame } from './FruitNinjaGame';
import { BubbleShooterGame } from './BubbleShooterGame';
import { HangmanGame } from './HangmanGame';

const gameMap: Record<string, React.ComponentType<{ onClose: () => void }>> = {
  snake: SnakeGame,
  tetris: TetrisGame,
  pong: PongGame,
  breakout: BreakoutGame,
  flappy: FlappyGame,
  runner: DinoRunGame,
  shooter: SpaceInvadersGame,
  whack: WhackAMole,
  simon: SimonGame,
  reaction: ReactionTest,
  colormatch: ColorMatchGame,
  typing: TypeRacer,
  game2048: Game2048,
  minesweeper: MinesweeperGame,
  fruitninja: FruitNinjaGame,
  bubbleshooter: BubbleShooterGame,
  hangman: HangmanGame,
  // Fallbacks for games without unique engines
  maze: SnakeGame,
  clicker: WhackAMole,
  connect4: SimonGame,
  tictactoe: SimonGame,
};

export function ArcadeLauncher({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const GameComponent = gameMap[gameId] || SnakeGame;
  return <GameComponent onClose={onClose} />;
}
