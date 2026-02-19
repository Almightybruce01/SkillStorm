/* ═══════════════════════════════════════════════════════════
   ARCADE LAUNCHER — Lazy-loaded for Performance
   Each game component is loaded on demand using React.lazy().
   Only the selected game's code is fetched from the server.
   ═══════════════════════════════════════════════════════════ */
import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import GameIntro from '../../components/GameIntro';
import { getArcadeGameById } from './arcadeData';
import { recordGameSession } from '../../engine/gameStats';
import soundEngine from '../SoundEngine';

/* ═══ Lazy-loaded game components ═══ */
const SnakeGame = lazy(() => import('./SnakeGame'));
const TetrisGame = lazy(() => import('./TetrisGame'));
const PongGame = lazy(() => import('./PongGame'));
const BreakoutGame = lazy(() => import('./BreakoutGame'));
const FlappyGame = lazy(() => import('./FlappyGame'));
const WhackAMole = lazy(() => import('./WhackAMole'));
const SimonGame = lazy(() => import('./SimonGame'));
const DinoRunGame = lazy(() => import('./DinoRunGame'));
const SpaceInvaders = lazy(() => import('./SpaceInvaders'));
const ReactionTest = lazy(() => import('./ReactionTest'));
const ColorMatch = lazy(() => import('./ColorMatch'));
const TypeRacer = lazy(() => import('./TypeRacer'));
const Game2048 = lazy(() => import('./Game2048'));
const MinesweeperGame = lazy(() => import('./MinesweeperGame'));
const SudokuGame = lazy(() => import('./SudokuGame'));
const HangmanGame = lazy(() => import('./HangmanGame'));
const BubbleShooter = lazy(() => import('./BubbleShooter'));
const ConnectFourGame = lazy(() => import('./ConnectFourGame'));
const TicTacToeGame = lazy(() => import('./TicTacToeGame'));
const CookieClickerGame = lazy(() => import('./CookieClickerGame'));
const SolitaireGame = lazy(() => import('./SolitaireGame'));
const ChessGame = lazy(() => import('./ChessGame'));
const CheckersGame = lazy(() => import('./CheckersGame'));
const MazeRunner = lazy(() => import('./MazeRunner'));
const CrosswordMiniGame = lazy(() => import('./CrosswordMiniGame'));
const FruitNinjaGame = lazy(() => import('./FruitNinjaGame'));

function GameLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Loading game...</p>
      </div>
    </div>
  );
}

interface ArcadeLauncherProps {
  gameId: string;
  onClose: () => void;
}

export default function ArcadeLauncher({ gameId, onClose }: ArcadeLauncherProps) {
  const [showIntro, setShowIntro] = useState(true);
  const gameStartTime = useRef(Date.now());
  const game = getArcadeGameById(gameId);

  const handleIntroComplete = useCallback(() => {
    soundEngine.init();
    soundEngine.countdownGo();
    gameStartTime.current = Date.now();
    setShowIntro(false);
  }, []);

  const handleClose = useCallback(() => {
    if (game) {
      const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);
      if (duration > 5) {
        recordGameSession({
          gameId,
          title: game.title,
          subject: 'arcade',
          engine: 'Arcade',
          score: 0,
          accuracy: 100,
          duration,
          grade: 'K-2',
          timestamp: Date.now(),
          isArcade: true,
        });
      }
    }
    onClose();
  }, [game, gameId, onClose]);

  if (showIntro && game) {
    return (
      <GameIntro
        title={game.title}
        icon={game.icon}
        engine="Arcade"
        gradient={game.coverGradient}
        onComplete={handleIntroComplete}
        duration={6000}
      />
    );
  }

  const props = { onClose: handleClose };

  function renderGame() {
    switch (gameId) {
      case 'snake': return <SnakeGame {...props} />;
      case 'tetris': return <TetrisGame {...props} />;
      case 'pong': return <PongGame {...props} />;
      case 'breakout': return <BreakoutGame {...props} />;
      case 'flappy': return <FlappyGame {...props} />;
      case 'whack_a_mole': return <WhackAMole {...props} />;
      case 'simon': return <SimonGame {...props} />;
      case 'dino_run': return <DinoRunGame {...props} />;
      case 'space_invaders': return <SpaceInvaders {...props} />;
      case 'reaction_test': return <ReactionTest {...props} />;
      case 'color_match': return <ColorMatch {...props} />;
      case 'type_racer': return <TypeRacer {...props} />;
      case 'game_2048': return <Game2048 {...props} />;
      case 'minesweeper': return <MinesweeperGame {...props} />;
      case 'sudoku': return <SudokuGame {...props} />;
      case 'hangman': return <HangmanGame {...props} />;
      case 'bubble_shooter': return <BubbleShooter {...props} />;
      case 'connect_four': return <ConnectFourGame {...props} />;
      case 'tic_tac_toe': return <TicTacToeGame {...props} />;
      case 'cookie_clicker': return <CookieClickerGame {...props} />;
      case 'solitaire': return <SolitaireGame {...props} />;
      case 'chess': return <ChessGame {...props} />;
      case 'checkers': return <CheckersGame {...props} />;
      case 'maze_runner': return <MazeRunner {...props} />;
      case 'crossword_mini': return <CrosswordMiniGame {...props} />;
      case 'fruit_ninja': return <FruitNinjaGame {...props} />;
      default:
        return (
          <div className="game-card p-8 text-center">
            <p className="text-4xl mb-4">🕹️</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Game Coming Soon!</h3>
            <p className="text-gray-500 mb-4">This arcade game is still in development.</p>
            <button onClick={handleClose} className="btn-elite btn-elite-primary">Go Back</button>
          </div>
        );
    }
  }

  return (
    <Suspense fallback={<GameLoader />}>
      {renderGame()}
    </Suspense>
  );
}
