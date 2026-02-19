/* ═══════════════════════════════════════════════════════════
   GAME LAUNCHER — Enhanced with Intro Animations & Stats
   Routes educational games to their correct engine
   Lazy-loads each engine for faster page loads
   ═══════════════════════════════════════════════════════════ */
import { useState, useCallback, useRef, lazy, Suspense } from 'react';
import type { Grade } from './questionBank';
import BetweenRoundsAd from '../components/ads/BetweenRoundsAd';
import GameOverAd from '../components/ads/GameOverAd';
import GameIntro from '../components/GameIntro';
import { getGameById } from '../engine/gameData';
import { recordGameSession } from '../engine/gameStats';
import soundEngine from './SoundEngine';

/* ═══ Lazy-loaded engine components ═══ */
const SpaceShooter = lazy(() => import('./engines/SpaceShooter').then(m => ({ default: m.SpaceShooter })));
const DashRunner = lazy(() => import('./engines/DashRunner').then(m => ({ default: m.DashRunner })));
const BalloonPop = lazy(() => import('./engines/BalloonPop').then(m => ({ default: m.BalloonPop })));
const ZombieDefense = lazy(() => import('./engines/ZombieDefense').then(m => ({ default: m.ZombieDefense })));
const WordBuilder = lazy(() => import('./engines/WordBuilder').then(m => ({ default: m.WordBuilder })));
const SpeedQuiz = lazy(() => import('./engines/SpeedQuiz').then(m => ({ default: m.SpeedQuiz })));
const TargetRange = lazy(() => import('./engines/TargetRange').then(m => ({ default: m.TargetRange })));
const MemoryMatrix = lazy(() => import('./engines/MemoryMatrix').then(m => ({ default: m.MemoryMatrix })));

type LaunchPhase = 'intro' | 'playing' | 'roundAd' | 'gameOver';

interface GameLauncherProps {
  gameId: string;
  engine: string;
  grade: Grade;
  onClose: () => void;
}

function EngineLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Loading game engine...</p>
      </div>
    </div>
  );
}

export default function GameLauncher({ gameId, engine, grade, onClose }: GameLauncherProps) {
  const [phase, setPhase] = useState<LaunchPhase>('intro');
  const [roundNum, setRoundNum] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [newAchievements, setNewAchievements] = useState<{ icon: string; title: string }[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const gameStartTime = useRef(Date.now());
  const totalScore = useRef(0);

  const game = getGameById(gameId);

  const handleIntroComplete = useCallback(() => {
    soundEngine.init();
    soundEngine.countdownGo();
    gameStartTime.current = Date.now();
    setPhase('playing');
  }, []);

  const handleRoundEnd = useCallback((round: number, score: number) => {
    totalScore.current = score;
    if (round > 0 && round % 3 === 0) {
      setRoundNum(round);
      setRoundScore(score);
      setPhase('roundAd');
    }
  }, []);

  const handleGameOver = useCallback((score: number) => {
    totalScore.current = score;
    setGameOverScore(score);

    if (game) {
      const duration = Math.floor((Date.now() - gameStartTime.current) / 1000);
      const { newAchievements: newAch } = recordGameSession({
        gameId,
        title: game.title,
        subject: game.subject,
        engine: game.engine,
        score,
        accuracy: Math.min(score / (Math.max(1, score) + 100) * 100, 100),
        duration,
        grade,
        timestamp: Date.now(),
        isArcade: false,
      });

      if (newAch.length > 0) {
        setNewAchievements(newAch.map(a => ({ icon: a.icon, title: a.title })));
        setShowAchievement(true);
        soundEngine.victory();
        setTimeout(() => setShowAchievement(false), 4000);
      } else {
        soundEngine.gameOver();
      }
    }

    setPhase('gameOver');
  }, [game, gameId, grade]);

  const handleContinue = useCallback(() => {
    setPhase('playing');
  }, []);

  const handleRetry = useCallback(() => {
    gameStartTime.current = Date.now();
    setGameKey(prev => prev + 1);
    setPhase('playing');
  }, []);

  const engineProps = {
    gameId,
    grade,
    onClose,
    onRoundEnd: handleRoundEnd,
    onGameOver: handleGameOver,
  };

  if (phase === 'intro' && game) {
    return (
      <GameIntro
        title={game.title}
        icon={game.icon}
        engine={game.engine}
        subject={game.subject}
        gradient={game.coverGradient}
        onComplete={handleIntroComplete}
        duration={8000}
      />
    );
  }

  if (phase === 'gameOver') {
    return (
      <div className="game-card relative min-h-[400px]">
        {showAchievement && newAchievements.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
              <span className="text-2xl">{newAchievements[0].icon}</span>
              <div>
                <p className="text-xs font-medium opacity-80">Achievement Unlocked!</p>
                <p className="font-bold">{newAchievements[0].title}</p>
              </div>
            </div>
          </div>
        )}
        <GameOverAd
          score={gameOverScore}
          onRetry={handleRetry}
          onExit={onClose}
        />
      </div>
    );
  }

  if (phase === 'roundAd') {
    return (
      <div className="game-card relative min-h-[400px]">
        <BetweenRoundsAd round={roundNum} score={roundScore} onContinue={handleContinue} />
      </div>
    );
  }

  function renderEngine() {
    switch (engine) {
      case 'SpaceShooter':
        return <SpaceShooter key={gameKey} {...engineProps} />;
      case 'DashRunner':
        return <DashRunner key={gameKey} {...engineProps} />;
      case 'BalloonPop':
        return <BalloonPop key={gameKey} {...engineProps} />;
      case 'ZombieDefense':
        return <ZombieDefense key={gameKey} {...engineProps} />;
      case 'WordBuilder':
        return <WordBuilder key={gameKey} {...engineProps} />;
      case 'SpeedQuiz':
        return <SpeedQuiz key={gameKey} {...engineProps} />;
      case 'TargetRange':
        return <TargetRange key={gameKey} {...engineProps} />;
      case 'MemoryMatrix':
        return <MemoryMatrix key={gameKey} {...engineProps} />;
      default:
        return (
          <div className="game-card p-8 text-center">
            <p className="text-4xl mb-4">🚧</p>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Engine "{engine}" Not Found</h3>
            <p className="text-gray-500 mb-4">This game engine is still being built.</p>
            <button onClick={onClose} className="btn-elite btn-elite-primary">Go Back</button>
          </div>
        );
    }
  }

  return (
    <Suspense fallback={<EngineLoader />}>
      {renderEngine()}
    </Suspense>
  );
}
