/* ═══════════════════════════════════════════════════════════
   GAME LAUNCHER
   Maps every game ID to its correct engine + theme
   ═══════════════════════════════════════════════════════════ */
import { SpaceShooter } from './engines/SpaceShooter';
import { DashRunner } from './engines/DashRunner';
import { BalloonPop } from './engines/BalloonPop';
import { ZombieDefense } from './engines/ZombieDefense';
import { WordBuilder } from './engines/WordBuilder';
import { SpeedQuiz } from './engines/SpeedQuiz';
import { TargetRange } from './engines/TargetRange';
import { MemoryMatrix } from './engines/MemoryMatrix';
import type { Grade } from './questionBank';

type Engine = 'space' | 'dash' | 'balloon' | 'zombie' | 'word' | 'speed' | 'target' | 'memory';

/** Maps every game ID to its engine type */
const gameEngineMap: Record<string, Engine> = {
  // ─── SpaceShooter ───
  astromath_wars: 'space',
  multiplication_meteors: 'space',
  algebra_blaster: 'space',
  geometry_defender: 'space',
  coordinate_conquest: 'space',

  // ─── DashRunner ───
  skilldash: 'dash',
  bull_run_logic: 'dash',
  equation_escape: 'dash',
  sentence_sprint: 'dash',
  maze_of_ratios: 'dash',
  physics_platform: 'dash',
  word_rocket_run: 'dash',
  logic_tunnel: 'dash',
  history_dash: 'dash',
  chem_jump: 'dash',
  speed_reading_dash: 'dash',
  market_mayhem: 'dash',
  debate_dash: 'dash',
  geometry_glide: 'dash',
  financial_literacy_run: 'dash',

  // ─── BalloonPop ───
  word_balloon_pop: 'balloon',
  number_catch: 'balloon',
  grammar_clicker: 'balloon',
  color_equation: 'balloon',

  // ─── ZombieDefense ───
  wordwave_survival: 'zombie',
  science_defender: 'zombie',
  data_defender: 'zombie',
  storm_defenders_vr: 'zombie',

  // ─── WordBuilder ───
  sentence_builder_pro: 'word',
  grammar_gladiator: 'word',
  essay_builder_rush: 'word',

  // ─── SpeedQuiz ───
  sat_word_arena: 'speed',
  flash_fact_frenzy: 'speed',
  speed_multiplication: 'speed',
  brain_arena: 'speed',
  quick_sat: 'speed',
  fraction_frenzy: 'speed',
  chem_lab_chaos: 'speed',
  history_timeline_rush: 'speed',
  statistics_paintball: 'speed',

  // ─── TargetRange ───
  vocabulary_sniper: 'target',
  spelling_sniper: 'target',
  context_clue_hunt: 'target',

  // ─── MemoryMatrix ───
  memory_matrix: 'memory',
  pattern_blast: 'memory',
  word_connect_storm: 'memory',
  code_breaker: 'memory',
  logic_tower: 'memory',

  // ─── Unmapped games → fallback engines ───
  ratio_architect: 'speed',
  timeline_builder: 'speed',
  proof_builder: 'speed',
  probability_quest: 'speed',
  brain_boost: 'speed',
  geometry_runner_3d: 'dash',
  math_galaxy_3d: 'space',
  word_world_3d: 'word',
  vr_math_dojo: 'speed',
  vr_science_lab: 'zombie',
  vr_history_explorer: 'speed',
  storm_defenders: 'zombie',
};

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
}

export function GameLauncher({ gameId, grade, onClose }: Props) {
  const engine = gameEngineMap[gameId] || 'speed'; // fallback to speed quiz

  switch (engine) {
    case 'space':
      return <SpaceShooter gameId={gameId} grade={grade} onClose={onClose} />;
    case 'dash':
      return <DashRunner gameId={gameId} grade={grade} onClose={onClose} />;
    case 'balloon':
      return <BalloonPop gameId={gameId} grade={grade} onClose={onClose} />;
    case 'zombie':
      return <ZombieDefense gameId={gameId} grade={grade} onClose={onClose} />;
    case 'word':
      return <WordBuilder gameId={gameId} grade={grade} onClose={onClose} />;
    case 'speed':
      return <SpeedQuiz gameId={gameId} grade={grade} onClose={onClose} />;
    case 'target':
      return <TargetRange gameId={gameId} grade={grade} onClose={onClose} />;
    case 'memory':
      return <MemoryMatrix gameId={gameId} grade={grade} onClose={onClose} />;
    default:
      return <SpeedQuiz gameId={gameId} grade={grade} onClose={onClose} />;
  }
}

/** Check if a game has a dedicated engine */
export function hasEngine(gameId: string): boolean {
  return gameId in gameEngineMap;
}
