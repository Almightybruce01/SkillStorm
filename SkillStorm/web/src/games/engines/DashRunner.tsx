/* ═══════════════════════════════════════════════════════════
   DASH RUNNER — Endless Runner Educational Game Engine
   Geometry Dash, Decimal Dash, etc. Canvas + React.
   Features: Terrain themes, double-jump, slide, weather, Knowledge Gates,
   coins, shield power-up, milestone markers, particle dust trail,
   progressive speed, touch handlers (tap=jump, swipe down=slide).
   ═══════════════════════════════════════════════════════════ */

import { useRef, useEffect, useCallback, useState } from 'react';
import type { Grade, Question } from '../questionBank';
import { getQuestions } from '../questionBank';
import { getGameById } from '../../engine/gameData';
import { playSound } from '../SoundEngine';

function getSubjectForQuestions(gameId: string): 'math' | 'science' | 'vocabulary' {
  const game = getGameById(gameId);
  if (!game) return 'math';
  if (game.subject === 'math') return 'math';
  if (game.subject === 'science') return 'science';
  return 'vocabulary';
}

const STORAGE_KEY_HIGH = (id: string) => `dashrunner_high_${id}`;
const STORAGE_KEY_LEVEL = (id: string) => `dashrunner_level_${id}`;

// ── Constants ─────────────────────────────────────────────
const W = 800;
const H = 480;
const GROUND_Y = 380;
const PLAYER_W = 36;
const PLAYER_H_RUN = 44;
const PLAYER_H_SLIDE = 22;
const PLAYER_X = 100;

const BASE_SPEED = 6;
const MAX_SPEED = 14;
const GRAVITY = 0.7;
const JUMP_VEL = -12;
const DOUBLE_JUMP_VEL = -10;
const WALL_JUMP_VEL_Y = -10;
const WALL_JUMP_VEL_X = 8;
const SLIDE_DURATION = 35;

const CHECKPOINT_INTERVAL = 600;
const THEME_CHANGE_CHECKPOINTS = 2;
const QUESTION_BONUS = 50;
const LIVES = 3;
const KNOWLEDGE_GATE_INTERVAL = 500;

const OBSTACLE_SPAWN_MIN = 250;
const COIN_SPAWN_CHANCE = 0.18;
const TRAIL_SPAWN_INTERVAL = 4;
const COIN_BURST_COUNT = 14;
const SHIELD_SPAWN_CHANCE = 0.02;
const SHIELD_DURATION_FRAMES = 180;
const MILESTONE_INTERVAL = 250;
const LANE_COUNT = 3;
const LANE_WIDTH = W / LANE_COUNT;
const LANE_CENTERS = [LANE_WIDTH / 2, LANE_WIDTH + LANE_WIDTH / 2, W - LANE_WIDTH / 2];
const MAGNET_DURATION_FRAMES = 300;
const GHOST_DURATION_FRAMES = 180;
const SPEED_BOOST_DURATION_FRAMES = 180;
const MAGNET_RADIUS = 120;
const SWIPE_THRESHOLD = 50;

type TerrainTheme = 'city' | 'forest' | 'volcano' | 'space' | 'ocean';
type LaneIndex = 0 | 1 | 2;
type ObstacleKind = 'standard' | 'spike' | 'low_barrier' | 'moving_platform' | 'spring';
type PowerUpKind = 'shield' | 'magnet' | 'ghost' | 'speed';
type WeatherType = 'none' | 'rain' | 'fireflies' | 'embers' | 'stars' | 'bubbles';
type CoinType = 'bronze' | 'silver' | 'gold';

const COIN_VALUES: Record<CoinType, number> = { bronze: 1, silver: 5, gold: 10 };

interface ThemeConfig {
  sky: string;
  ground: string;
  accent: string;
  obstacleColor: string;
  parallaxColors: [string, string, string];
  weather: WeatherType;
  particleColor: string;
}

const THEMES: Record<TerrainTheme, ThemeConfig> = {
  city: {
    sky: '#87CEEB',
    ground: '#708090',
    accent: '#4a5568',
    obstacleColor: '#475569',
    parallaxColors: ['#64748b', '#475569', '#334155'],
    weather: 'rain',
    particleColor: '#94a3b8',
  },
  forest: {
    sky: '#1e3a2f',
    ground: '#2d5016',
    accent: '#166534',
    obstacleColor: '#14532d',
    parallaxColors: ['#166534', '#15803d', '#22c55e'],
    weather: 'fireflies',
    particleColor: '#f0fdf4',
  },
  volcano: {
    sky: '#1c1917',
    ground: '#7f1d1d',
    accent: '#b91c1c',
    obstacleColor: '#450a0a',
    parallaxColors: ['#991b1b', '#dc2626', '#f97316'],
    weather: 'embers',
    particleColor: '#fef3c7',
  },
  space: {
    sky: '#1e1b4b',
    ground: '#312e81',
    accent: '#6366f1',
    obstacleColor: '#4c1d95',
    parallaxColors: ['#312e81', '#4338ca', '#6366f1'],
    weather: 'stars',
    particleColor: '#e0e7ff',
  },
  ocean: {
    sky: '#0c4a6e',
    ground: '#0e7490',
    accent: '#0891b2',
    obstacleColor: '#155e75',
    parallaxColors: ['#0e7490', '#06b6d4', '#22d3ee'],
    weather: 'bubbles',
    particleColor: '#cffafe',
  },
};

const THEME_ORDER: TerrainTheme[] = ['city', 'forest', 'volcano', 'space', 'ocean'];

const COIN_COLORS: Record<CoinType, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
};

interface Obstacle {
  x: number;
  w: number;
  h: number;
  tall: boolean;
  isWall: boolean;
  lane?: LaneIndex;
  kind?: ObstacleKind;
  platformOffset?: number;
  hasQuestion?: boolean;
  question?: Question;
  passed?: boolean;
}

interface QuestionGate {
  x: number;
  w: number;
  h: number;
  question: Question;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  type: CoinType;
  collected: boolean;
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  w?: number;
  h?: number;
  twinkle?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  vx?: number;
  vy?: number;
}

interface PowerUp {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PowerUpKind;
  collected: boolean;
  lane?: LaneIndex;
}

interface TouchIndicator {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  type: 'tap' | 'swipe';
}

interface MilestoneMarker {
  distance: number;
  displayUntil: number;
  text: string;
}

function rectOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

export function DashRunner({ gameId, grade, onClose, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const gameState = useRef({
    running: true,
    score: 0,
    distance: 0,
    lives: LIVES,
    coins: 0,
    coinValueTotal: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    round: 0,
    level: 1,
    speed: BASE_SPEED,
    gameOver: false,
    paused: false,
    checkpointCount: 0,
    nextQuestionGateAt: KNOWLEDGE_GATE_INTERVAL,
    lastObstacleX: -500,
    highScore: 0,
    trailTicker: 0,
    shieldActive: false,
    shieldFrames: 0,
    magnetFrames: 0,
    ghostFrames: 0,
    speedBoostFrames: 0,
    lastMilestone: 0,
  });

  const player = useRef({
    x: LANE_CENTERS[1],
    y: GROUND_Y - PLAYER_H_RUN,
    vy: 0,
    grounded: true,
    lane: 1 as LaneIndex,
    targetLane: 1 as LaneIndex,
    onWallLeft: false,
    onWallRight: false,
    canWallJump: true,
    canDoubleJump: true,
    slideFrames: 0,
    runFrame: 0,
    invincibleFrames: 0,
  });

  const obstacles = useRef<Obstacle[]>([]);
  const questionGates = useRef<QuestionGate[]>([]);
  const coins = useRef<Coin[]>([]);
  const particles = useRef<Particle[]>([]);
  const trailParticles = useRef<TrailParticle[]>([]);
  const powerUps = useRef<PowerUp[]>([]);
  const milestoneMarkers = useRef<MilestoneMarker[]>([]);
  const touchIndicators = useRef<TouchIndicator[]>([]);
  const weather = useRef<WeatherParticle[]>([]);
  const parallax = useRef([0, 0, 0] as [number, number, number]);

  const questionPool = useRef<Question[]>([]);
  const questionIndex = useRef(0);
  const lastFrameTime = useRef(0);

  const showModalRef = useRef(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [modalQuestion, setModalQuestion] = useState<Question | null>(null);
  const [modalType, setModalType] = useState<'gate' | 'obstacle'>('gate');
  const blockingGateRef = useRef<QuestionGate | null>(null);
  const [, setUiTick] = useState(0);

  const getTheme = useCallback((): TerrainTheme => {
    const idx = Math.floor(gameState.current.checkpointCount / THEME_CHANGE_CHECKPOINTS) % THEME_ORDER.length;
    return THEME_ORDER[idx];
  }, []);

  const loadHighScore = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIGH(gameId));
      if (saved !== null) gameState.current.highScore = Math.max(0, parseInt(saved, 10) || 0);
      const levelSaved = localStorage.getItem(STORAGE_KEY_LEVEL(gameId));
      if (levelSaved !== null) gameState.current.level = Math.max(1, parseInt(levelSaved, 10) || 1);
    } catch {
      // ignore
    }
  }, [gameId]);

  const saveHighScore = useCallback(() => {
    const gs = gameState.current;
    if (gs.score <= gs.highScore) return;
    gs.highScore = gs.score;
    try {
      localStorage.setItem(STORAGE_KEY_HIGH(gameId), String(gs.score));
      localStorage.setItem(STORAGE_KEY_LEVEL(gameId), String(Math.max(1, gs.round)));
    } catch {
      // ignore
    }
  }, [gameId]);

  const initQuestions = useCallback(() => {
    const subject = getSubjectForQuestions(gameId);
    questionPool.current = getQuestions(grade, subject, 40);
    for (let i = questionPool.current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionPool.current[i], questionPool.current[j]] = [questionPool.current[j], questionPool.current[i]];
    }
    questionIndex.current = 0;
  }, [grade, gameId]);

  const getNextQuestion = useCallback((): Question => {
    if (questionIndex.current >= questionPool.current.length) questionIndex.current = 0;
    return questionPool.current[questionIndex.current++];
  }, []);

  const spawnObstacle = useCallback((withQuestion = false) => {
    const gs = gameState.current;
    if (gs.distance - gs.lastObstacleX < OBSTACLE_SPAWN_MIN) return;

    const lane = Math.floor(Math.random() * LANE_COUNT) as LaneIndex;
    const r = Math.random();
    let kind: ObstacleKind = 'standard';
    if (gs.distance > 200 && r < 0.15) kind = 'spike';
    else if (gs.distance > 300 && r < 0.3) kind = 'low_barrier';
    else if (gs.distance > 400 && r < 0.45) kind = 'moving_platform';
    else if (gs.distance > 500 && r < 0.55) kind = 'spring';
    const isWall = kind === 'standard' && Math.random() < 0.2 && gs.distance > 300;
    const tall = isWall || (kind === 'standard' && Math.random() > 0.45);
    const q = withQuestion ? getNextQuestion() : undefined;
    const laneX = LANE_CENTERS[lane] - 14;

    obstacles.current.push({
      x: W + 60,
      w: kind === 'spike' ? 40 : isWall ? 20 : 28,
      h: kind === 'spike' ? 25 : kind === 'low_barrier' ? 20 : isWall ? H - GROUND_Y + 30 : tall ? 55 : 35,
      tall: isWall || tall || kind === 'spike',
      isWall: isWall && kind === 'standard',
      lane,
      kind,
      platformOffset: kind === 'moving_platform' ? Math.random() * 60 : undefined,
      hasQuestion: withQuestion,
      question: q,
    });
    gs.lastObstacleX = gs.distance;
  }, [getNextQuestion]);

  const spawnQuestionGate = useCallback(() => {
    questionGates.current.push({
      x: W + 80,
      w: 40,
      h: H - GROUND_Y + 20,
      question: getNextQuestion(),
      passed: false,
    });
  }, [getNextQuestion]);

  const getRandomCoinType = useCallback((): CoinType => {
    const r = Math.random();
    if (r < 0.6) return 'bronze';
    if (r < 0.85) return 'silver';
    return 'gold';
  }, []);

  const spawnCoin = useCallback(() => {
    const y = GROUND_Y - 80 - Math.random() * 120;
    coins.current.push({ x: W + 40, y, type: getRandomCoinType(), collected: false });
  }, [getRandomCoinType]);

  const spawnPowerUp = useCallback(() => {
    const r = Math.random();
    const kind: PowerUpKind = r < 0.35 ? 'shield' : r < 0.6 ? 'magnet' : r < 0.8 ? 'ghost' : 'speed';
    const lane = Math.floor(Math.random() * LANE_COUNT) as LaneIndex;
    const laneX = LANE_CENTERS[lane] - 14;
    powerUps.current.push({
      x: W + 60,
      y: GROUND_Y - 70 - Math.random() * 100,
      w: 28,
      h: 28,
      kind,
      collected: false,
      lane,
    });
  }, []);

  const addMilestoneMarker = useCallback((distance: number) => {
    const d = Math.floor(distance / 500) * 500;
    if (d > 0 && d > gameState.current.lastMilestone) {
      gameState.current.lastMilestone = d;
      let text = `${d}m!`;
      if (d >= 2000) text = `🔥 ${d}m AMAZING!`;
      else if (d >= 1000) text = `⭐ ${d}m GREAT!`;
      else text = `🏆 ${d}m!`;
      milestoneMarkers.current.push({
        distance: d,
        displayUntil: performance.now() + (d >= 1000 ? 2800 : 2200),
        text,
      });
      playSound('levelup');
    }
  }, []);

  const addTouchIndicator = useCallback((x: number, y: number, type: 'tap' | 'swipe') => {
    touchIndicators.current.push({
      x, y, type,
      life: 0,
      maxLife: 30,
    });
    while (touchIndicators.current.length > 8) touchIndicators.current.shift();
  }, []);

  const spawnWeather = useCallback(() => {
    const theme = getTheme();
    const cfg = THEMES[theme];
    const w = weather.current;

    if (cfg.weather === 'rain') {
      w.push({ x: Math.random() * (W + 60) - 30, y: -6, vx: -3, vy: 8 + Math.random() * 4, size: 2, alpha: 0.6 });
    } else if (cfg.weather === 'fireflies') {
      w.push({
        x: Math.random() * (W + 60) - 30,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.5,
        size: 2,
        alpha: 0.9,
        twinkle: Math.random() * Math.PI * 2,
      });
    } else if (cfg.weather === 'embers') {
      w.push({ x: Math.random() * W, y: H + 6, vx: (Math.random() - 0.5) * 2, vy: -3 - Math.random() * 2, size: 4, alpha: 0.8, w: 4, h: 8 });
    } else if (cfg.weather === 'stars') {
      w.push({
        x: Math.random() * (W + 40) - 20,
        y: Math.random() * H * 0.6,
        vx: -0.2,
        vy: 0,
        size: 1.5 + Math.random() * 2,
        alpha: 0.7,
        twinkle: Math.random() * Math.PI * 2,
      });
    } else if (cfg.weather === 'bubbles') {
      w.push({ x: Math.random() * (W + 40) - 20, y: H + 4, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 2, size: 6, alpha: 0.5 });
    }

    while (w.length > 120) w.shift();
  }, [getTheme]);

  const spawnExplosion = useCallback((x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const s = 2 + Math.random() * 4;
      particles.current.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
        life: 0, maxLife: 25, color, size: 4,
      });
    }
  }, []);

  const spawnTrail = useCallback(() => {
    const pl = player.current;
    const theme = getTheme();
    const cfg = THEMES[theme];
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = 18 + Math.random() * 12;
      trailParticles.current.push({
        x: pl.x + PLAYER_W / 2 + offsetX,
        y: pl.y + offsetY,
        life: 0,
        maxLife: 28 + Math.random() * 15,
        color: cfg.particleColor,
        size: 3 + Math.random() * 5,
        vx: -1.5 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
      });
    }
    while (trailParticles.current.length > 80) trailParticles.current.shift();
  }, [getTheme]);

  const performJump = useCallback(() => {
    const pl = player.current;
    if (pl.grounded) {
      pl.vy = JUMP_VEL;
      pl.grounded = false;
      playSound('jump');
    } else if (pl.canDoubleJump) {
      pl.vy = DOUBLE_JUMP_VEL;
      pl.canDoubleJump = false;
      playSound('jump');
    }
  }, []);

  const takeDamage = useCallback(() => {
    const gs = gameState.current;
    if (gs.gameOver || player.current.invincibleFrames > 0) return;
    if (gs.shieldActive) {
      gs.shieldActive = false;
      gs.shieldFrames = 0;
      spawnExplosion(player.current.x + PLAYER_W / 2, player.current.y + PLAYER_H_RUN / 2, '#3b82f6', 8);
      playSound('correct');
      return;
    }

    gs.lives--;
    player.current.invincibleFrames = 90;
    spawnExplosion(player.current.x + PLAYER_W / 2, player.current.y + PLAYER_H_RUN / 2, '#ef4444');
    playSound('hit');

    if (gs.lives <= 0) {
      gs.gameOver = true;
      playSound('gameover');
      saveHighScore();
    }
  }, [spawnExplosion, saveHighScore]);

  const triggerQuestion = useCallback((q: Question, type: 'gate' | 'obstacle', gate?: QuestionGate) => {
    gameState.current.totalQuestions++;
    setModalQuestion(q);
    setModalType(type);
    blockingGateRef.current = gate ?? null;
    showModalRef.current = true;
    setShowQuestionModal(true);
  }, []);

  const answerQuestion = useCallback((choiceIndex: number) => {
    const q = modalQuestion;
    if (!q) return;

    const correct = q.correct === choiceIndex;
    showModalRef.current = false;
    setShowQuestionModal(false);
    setModalQuestion(null);

    if (correct) {
      playSound('correct');
      gameState.current.correctAnswers++;
      gameState.current.score += QUESTION_BONUS;
      if (blockingGateRef.current) blockingGateRef.current.passed = true;
    } else {
      playSound('wrong');
      if (modalType === 'obstacle') takeDamage();
      spawnObstacle(false);
    }
    blockingGateRef.current = null;
    setUiTick((t) => t + 1);
  }, [modalQuestion, modalType, takeDamage, spawnObstacle]);

  const gameLoop = useCallback((timestamp: number) => {
    const dt = Math.min((timestamp - lastFrameTime.current) / 16.66, 3);
    lastFrameTime.current = timestamp;

    const gs = gameState.current;
    const pl = player.current;
    if (!gs.running || gs.gameOver) return;
    if (gs.paused || showModalRef.current) return;

    const theme = getTheme();
    const cfg = THEMES[theme];
    const sliding = pl.slideFrames > 0;
    if (sliding) pl.slideFrames--;

    const ph = sliding ? PLAYER_H_SLIDE : PLAYER_H_RUN;

    if (pl.invincibleFrames > 0) pl.invincibleFrames -= dt * 4;

    const difficultyFactor = Math.min(1 + gs.distance / 2500, 2);
    const baseSpeed = Math.min(BASE_SPEED * difficultyFactor, MAX_SPEED);
    gs.speed = gs.speedBoostFrames > 0 ? Math.min(baseSpeed * 1.4, MAX_SPEED * 1.2) : baseSpeed;

    gs.distance += gs.speed * dt;

    gs.score = Math.floor(gs.distance / 8) + gs.coinValueTotal + gs.correctAnswers * QUESTION_BONUS;
    if (gs.score > gs.highScore) gs.highScore = gs.score;

    if (Math.floor(gs.distance / CHECKPOINT_INTERVAL) > gs.checkpointCount) {
      gs.checkpointCount = Math.floor(gs.distance / CHECKPOINT_INTERVAL);
      gs.round++;
      onRoundEnd?.(gs.round, gs.score);
    }

    if (gs.distance >= gs.nextQuestionGateAt) {
      gs.nextQuestionGateAt += KNOWLEDGE_GATE_INTERVAL + Math.random() * 200;
      spawnQuestionGate();
    }

    if (gs.shieldFrames > 0) {
      gs.shieldFrames -= dt * 4;
      if (gs.shieldFrames <= 0) gs.shieldActive = false;
    }
    if (gs.magnetFrames > 0) gs.magnetFrames -= dt * 4;
    if (gs.ghostFrames > 0) gs.ghostFrames -= dt * 4;
    if (gs.speedBoostFrames > 0) {
      gs.speedBoostFrames -= dt * 4;
      if (gs.speedBoostFrames <= 0) gs.speed = Math.min(gs.speed, MAX_SPEED);
    }
    if (Math.random() < SHIELD_SPAWN_CHANCE * dt) spawnPowerUp();
    addMilestoneMarker(gs.distance);
    if (Math.random() < 0.025 * difficultyFactor * dt) spawnObstacle(Math.random() < 0.3);
    if (Math.random() < COIN_SPAWN_CHANCE * dt) spawnCoin();
    if (Math.random() < 0.12 * dt) spawnWeather();

    gs.trailTicker += dt;
    if (gs.trailTicker >= TRAIL_SPAWN_INTERVAL && (pl.grounded || pl.vy !== 0) && !sliding) {
      gs.trailTicker = 0;
      spawnTrail();
    }

    parallax.current[0] = (parallax.current[0] + gs.speed * 0.2 * dt) % (W + 150);
    parallax.current[1] = (parallax.current[1] + gs.speed * 0.5 * dt) % (W + 150);
    parallax.current[2] = (parallax.current[2] + gs.speed * 0.9 * dt) % (W + 150);

    pl.x += (LANE_CENTERS[pl.targetLane] - pl.x) * Math.min(1, dt * 0.15);
    if (Math.abs(pl.x - LANE_CENTERS[pl.targetLane]) < 5) pl.lane = pl.targetLane;

    const keys = keysRef.current;
    if (keys['ArrowLeft'] || keys['KeyA']) pl.targetLane = Math.max(0, (pl.targetLane ?? 1) - 1) as LaneIndex;
    if (keys['ArrowRight'] || keys['KeyD']) pl.targetLane = Math.min(2, (pl.targetLane ?? 1) + 1) as LaneIndex;
    if (keys['ArrowDown'] && pl.grounded && !sliding) pl.slideFrames = SLIDE_DURATION;

    if (!sliding) {
      if (pl.grounded) pl.canWallJump = true;
      if (pl.grounded) pl.canDoubleJump = true;

      if (keys[' '] || keys['ArrowUp'] || keys['KeyW']) {
        if (pl.grounded) {
          pl.vy = JUMP_VEL;
          pl.grounded = false;
          playSound('jump');
        } else if ((pl.onWallLeft || pl.onWallRight) && pl.canWallJump) {
          pl.vy = WALL_JUMP_VEL_Y;
          pl.canWallJump = false;
          pl.x += pl.onWallLeft ? WALL_JUMP_VEL_X : -WALL_JUMP_VEL_X;
          playSound('jump');
        } else if (pl.canDoubleJump) {
          pl.vy = DOUBLE_JUMP_VEL;
          pl.canDoubleJump = false;
          playSound('jump');
        }
      }
    }

    pl.vy += GRAVITY * dt;
    pl.y += pl.vy;
    pl.onWallLeft = false;
    pl.onWallRight = false;

    if (pl.y >= GROUND_Y - ph) {
      const wasFalling = pl.vy > 5;
      pl.y = GROUND_Y - ph;
      pl.vy = 0;
      pl.grounded = true;
      if (wasFalling && !sliding) {
        const theme = getTheme();
        const cfg = THEMES[theme];
        for (let i = 0; i < 6; i++) {
          trailParticles.current.push({
            x: pl.x + PLAYER_W / 2 + (Math.random() - 0.5) * 25,
            y: pl.y + ph - 4,
            life: 0,
            maxLife: 22 + Math.random() * 12,
            color: cfg.particleColor,
            size: 4 + Math.random() * 4,
            vx: -2 - Math.random() * 3,
            vy: (Math.random() - 0.6) * 3,
          });
        }
      }
    }

    pl.runFrame = (pl.runFrame + dt * 12) % 12;

    obstacles.current = obstacles.current.filter((o) => {
      o.x -= gs.speed * dt;

      if (o.x < -100) return false;

      const obsLane = o.lane ?? 1;
      const obsX = LANE_CENTERS[obsLane] + (o.x - 100);
      const sameLane = pl.lane === obsLane;
      const overlap = sameLane && rectOverlap(pl.x, pl.y, PLAYER_W, ph, obsX, GROUND_Y - o.h, o.w, o.h + 10);

      if (o.isWall && overlap && !sliding) {
        const touchLeft = pl.x + PLAYER_W >= obsX && pl.x + PLAYER_W <= obsX + o.w * 0.5;
        const touchRight = pl.x <= obsX + o.w && pl.x >= obsX + o.w * 0.5;
        if (touchLeft && !pl.grounded) {
          pl.onWallLeft = true;
          pl.x = obsX - PLAYER_W - 1;
          return true;
        }
        if (touchRight && !pl.grounded) {
          pl.onWallRight = true;
          pl.x = obsX + o.w + 1;
          return true;
        }
        if (pl.grounded && overlap) {
          if (o.hasQuestion && o.question && !o.passed) {
            triggerQuestion(o.question, 'obstacle');
            o.passed = true;
          } else {
            takeDamage();
          }
          return false;
        }
      }

      if (!o.isWall && overlap) {
        const kind = o.kind ?? 'standard';
        if (gs.ghostFrames > 0) return true;
        const canSlideUnder = (sliding && !o.tall) || (kind === 'low_barrier' && sliding);
        const landedOnTop = pl.y + ph <= GROUND_Y - o.h + 12 && pl.vy >= 0;
        if (kind === 'spring' && landedOnTop) {
          pl.vy = -18;
          playSound('jump');
          return false;
        }
        if (kind === 'moving_platform' && landedOnTop) {
          pl.vy = -3;
          return true;
        }
        if (canSlideUnder) return true;
        if (landedOnTop) {
          pl.vy = -5;
          if (o.hasQuestion && o.question) gs.score += QUESTION_BONUS;
          return false;
        }
        if (o.hasQuestion && o.question && !o.passed) {
          triggerQuestion(o.question, 'obstacle');
          o.passed = true;
          return true;
        }
        takeDamage();
        return false;
      }
      return true;
    });

    questionGates.current = questionGates.current.filter((g) => {
      g.x -= gs.speed * dt;
      if (g.x < -80) return false;

      const overlap = rectOverlap(pl.x, pl.y, PLAYER_W, ph, g.x, GROUND_Y - g.h, g.w, g.h + 10);
      if (overlap && !g.passed) {
        triggerQuestion(g.question, 'gate', g);
      }
      return g.x > -100;
    });

    coins.current = coins.current.filter((c) => {
      c.x -= gs.speed * dt;
      if (c.x < -30) return false;
      if (c.collected) return false;
      const inRange = gs.magnetFrames > 0 && Math.hypot(c.x - pl.x, c.y - (pl.y + ph / 2)) < MAGNET_RADIUS;
      if (inRange || rectOverlap(pl.x, pl.y, PLAYER_W, ph, c.x - 12, c.y - 12, 24, 24)) {
        c.collected = true;
        const value = COIN_VALUES[c.type];
        gs.coins++;
        gs.coinValueTotal += value;
        spawnExplosion(c.x, c.y, COIN_COLORS[c.type], COIN_BURST_COUNT);
        playSound('coin');
      }
      return !c.collected;
    });

    powerUps.current = powerUps.current.filter((s) => {
      s.x -= gs.speed * dt;
      if (s.x < -50) return false;
      if (s.collected) return false;
      const sLane = s.lane ?? 1;
      const sX = LANE_CENTERS[sLane] + (s.x - 100);
      if (rectOverlap(pl.x, pl.y, PLAYER_W, ph, sX, s.y, s.w, s.h)) {
        s.collected = true;
        if (s.kind === 'shield') {
          gs.shieldActive = true;
          gs.shieldFrames = SHIELD_DURATION_FRAMES;
        } else if (s.kind === 'magnet') gs.magnetFrames = MAGNET_DURATION_FRAMES;
        else if (s.kind === 'ghost') gs.ghostFrames = GHOST_DURATION_FRAMES;
        else if (s.kind === 'speed') gs.speedBoostFrames = SPEED_BOOST_DURATION_FRAMES;
        spawnExplosion(sX + s.w / 2, s.y + s.h / 2, '#3b82f6', 14);
        playSound('powerup');
      }
      return !s.collected;
    });

    particles.current = particles.current.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt * 5;
      return p.life < p.maxLife;
    });

    trailParticles.current = trailParticles.current.filter((t) => {
      t.x += (t.vx ?? 0) * dt;
      t.y += (t.vy ?? 0) * dt;
      t.life += dt * 6;
      return t.life < t.maxLife;
    });

    weather.current = weather.current.filter((w) => {
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      if (typeof w.twinkle === 'number') w.twinkle += 0.15;
      return w.y > -30 && w.y < H + 30 && w.x > -30 && w.x < W + 30;
    });

    milestoneMarkers.current = milestoneMarkers.current.filter((m) => m.displayUntil > performance.now());

    touchIndicators.current = touchIndicators.current.filter((ti) => {
      ti.life += dt * 8;
      return ti.life < ti.maxLife;
    });

    setUiTick((t) => t + 1);
  }, [getTheme, spawnQuestionGate, spawnObstacle, spawnCoin, spawnWeather, spawnTrail, spawnPowerUp, addMilestoneMarker, takeDamage, triggerQuestion, saveHighScore, onRoundEnd]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const gs = gameState.current;
    const pl = player.current;
    const theme = getTheme();
    const cfg = THEMES[theme];
    const sliding = pl.slideFrames > 0;
    const ph = sliding ? PLAYER_H_SLIDE : PLAYER_H_RUN;

    ctx.fillStyle = cfg.sky;
    ctx.fillRect(0, 0, W, H);

    for (let L = 0; L < 3; L++) {
      ctx.save();
      ctx.globalAlpha = 0.2 + (2 - L) * 0.25;
      const off = -parallax.current[L];
      ctx.fillStyle = cfg.parallaxColors[L];
      const h = 70 + L * 30;
      for (let i = -2; i <= 4; i++) {
        const x = (off + i * (W + 100)) % (W + 250) - 80;
        if (theme === 'city') {
          ctx.fillRect(x, GROUND_Y - h - 50, 60 + L * 15, h + 50);
        } else if (theme === 'forest') {
          ctx.beginPath();
          ctx.arc(x + 35, GROUND_Y - h, 35 + L * 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (theme === 'volcano') {
          ctx.beginPath();
          ctx.moveTo(x, GROUND_Y);
          ctx.lineTo(x + 40, GROUND_Y - h - 20);
          ctx.lineTo(x + 80, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        } else if (theme === 'space') {
          ctx.beginPath();
          ctx.arc(x + 25, GROUND_Y - 100 - L * 25, 25 + L * 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x + 30, GROUND_Y - 80 - L * 20, 30 + L * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    weather.current.forEach((w) => {
      ctx.save();
      let alpha = w.alpha;
      if (typeof w.twinkle === 'number') alpha *= 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(w.twinkle));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = cfg.particleColor;
      if (w.w && w.h) ctx.fillRect(w.x, w.y, w.w, w.h);
      else { ctx.beginPath(); ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });

    ctx.fillStyle = cfg.ground;
    ctx.fillRect(0, GROUND_Y, W + 60, H - GROUND_Y + 40);
    for (let i = 1; i < LANE_COUNT; i++) {
      const lx = LANE_WIDTH * i;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.moveTo(lx, GROUND_Y);
      ctx.lineTo(lx, H + 40);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    questionGates.current.forEach((g) => {
      if (g.passed) return;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.fillRect(g.x, GROUND_Y - g.h, g.w, g.h);
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(g.x, GROUND_Y - g.h, g.w, g.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x + g.w / 2, GROUND_Y - g.h / 2 + 6);
    });

    obstacles.current.forEach((o) => {
      const obsLane = o.lane ?? 1;
      const obsX = LANE_CENTERS[obsLane] + (o.x - 100);
      ctx.fillStyle = cfg.obstacleColor;
      if (o.kind === 'spike') {
        ctx.beginPath();
        ctx.moveTo(obsX, GROUND_Y);
        ctx.lineTo(obsX + o.w / 2, GROUND_Y - o.h);
        ctx.lineTo(obsX + o.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
      } else if (o.kind === 'spring') {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(obsX, GROUND_Y - o.h, o.w, o.h);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(obsX + o.w / 4, GROUND_Y - o.h - 8, o.w / 2, 10);
      } else if (o.isWall) {
        ctx.fillRect(obsX, 0, o.w, GROUND_Y + 30);
        ctx.fillStyle = cfg.accent;
        ctx.fillRect(obsX + 3, GROUND_Y - 70, o.w - 6, 50);
      } else {
        ctx.fillRect(obsX, GROUND_Y - o.h, o.w, o.h);
      }
      if (o.hasQuestion) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(obsX + o.w / 2, GROUND_Y - o.h - 12, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    trailParticles.current.forEach((t) => {
      const alpha = 1 - t.life / t.maxLife;
      ctx.fillStyle = t.color;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size * (1 - t.life / t.maxLife), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    coins.current.forEach((c) => {
      if (c.collected) return;
      const color = COIN_COLORS[c.type];
      const radius = c.type === 'gold' ? 14 : c.type === 'silver' ? 12 : 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = c.type === 'gold' ? '#b8860b' : '#787878';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    powerUps.current.forEach((s) => {
      if (s.collected) return;
      const sLane = s.lane ?? 1;
      const sX = LANE_CENTERS[sLane] + (s.x - 100);
      const colors: Record<PowerUpKind, string> = { shield: '#3b82f6', magnet: '#eab308', ghost: '#a78bfa', speed: '#22c55e' };
      ctx.fillStyle = colors[s.kind];
      ctx.fillRect(sX, s.y, s.w, s.h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(sX, s.y, s.w, s.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const icons: Record<PowerUpKind, string> = { shield: '🛡️', magnet: '🧲', ghost: '👻', speed: '⚡' };
      ctx.fillText(icons[s.kind], sX + s.w / 2, s.y + s.h / 2 + 6);
    });

    particles.current.forEach((p) => {
      const alpha = 1 - p.life / p.maxLife;
      if (p.color.startsWith('#')) {
        const r = parseInt(p.color.slice(1, 3), 16);
        const g = parseInt(p.color.slice(3, 5), 16);
        const b = parseInt(p.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      } else if (p.color.startsWith('rgb')) {
        ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      } else {
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });

    milestoneMarkers.current.forEach((m) => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (m.displayUntil - performance.now()) / 500);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = cfg.accent;
      ctx.lineWidth = 3;
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.text, W / 2, H / 2 - 20);
      ctx.strokeText(m.text, W / 2, H / 2 - 20);
      ctx.restore();
    });

    touchIndicators.current.forEach((ti) => {
      const alpha = 1 - ti.life / ti.maxLife;
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(ti.x, ti.y, 15 + ti.life, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(100,200,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();
    });

    if (!gs.gameOver) {
      let invAlpha = pl.invincibleFrames > 0 ? 0.5 + 0.5 * Math.sin(pl.invincibleFrames * 0.5) : 1;
      if (gs.ghostFrames > 0) invAlpha = 0.4 + 0.3 * Math.sin(performance.now() * 0.01);
      ctx.globalAlpha = invAlpha;
      if (gs.shieldActive) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pl.x + PLAYER_W / 2, pl.y + ph / 2, PLAYER_W, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = cfg.accent;
      if (sliding) {
        ctx.fillRect(pl.x + 4, pl.y + ph - 10, PLAYER_W - 8, 12);
        ctx.fillStyle = cfg.particleColor;
        ctx.fillRect(pl.x + 12, pl.y + 6, 8, 8);
      } else if (!pl.grounded) {
        ctx.fillRect(pl.x + 2, pl.y, PLAYER_W - 4, 36);
        ctx.fillRect(pl.x + 10, pl.y - 10, 14, 14);
        ctx.fillStyle = cfg.particleColor;
        ctx.fillRect(pl.x + 14, pl.y + 6, 6, 6);
      } else {
        const bounce = Math.sin(pl.runFrame) * 4;
        const legOff = Math.abs(Math.sin(pl.runFrame)) * 6;
        ctx.fillRect(pl.x + 4, pl.y + bounce, 12, ph - 12);
        ctx.fillRect(pl.x + 20, pl.y + 8 + bounce, 12, ph - 20);
        ctx.fillRect(pl.x + 6 + legOff, pl.y + ph - 12, 8, 12);
        ctx.fillRect(pl.x + 22 - legOff, pl.y + ph - 16, 8, 16);
        ctx.fillStyle = cfg.particleColor;
        ctx.fillRect(pl.x + 10, pl.y + 14 + bounce, 6, 6);
        ctx.fillRect(pl.x + 24, pl.y + 14 + bounce, 6, 6);
      }
      ctx.globalAlpha = 1;
    }

    const cpProgress = (gs.distance % KNOWLEDGE_GATE_INTERVAL) / KNOWLEDGE_GATE_INTERVAL;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(12, H - 28, W - 24, 14);
    ctx.fillStyle = cfg.accent;
    ctx.fillRect(12, H - 28, (W - 24) * cpProgress, 14);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, H - 28, W - 24, 14);

    requestAnimationFrame(render);
  }, [getTheme]);

  useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);

  useEffect(() => {
    const k = keysRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD'].includes(e.code)) e.preventDefault();
      k[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      k[e.code] = false;
    };
    const preventTouch = (e: TouchEvent) => {
      if (canvasRef.current?.contains(e.target as Node)) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvasRef.current?.addEventListener('touchstart', preventTouch, { passive: false });
    canvasRef.current?.addEventListener('touchmove', preventTouch, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvasRef.current?.removeEventListener('touchstart', preventTouch);
      canvasRef.current?.removeEventListener('touchmove', preventTouch);
    };
  }, []);

  useEffect(() => {
    initQuestions();

    const loop = (t: number) => {
      if (!gameState.current.gameOver) gameLoop(t);
      render();
      if (gameState.current.running) requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      gameState.current.running = false;
    };
  }, [initQuestions, gameLoop, render]);

  const restart = useCallback(() => {
    loadHighScore();
    gameState.current = {
      running: true,
      score: 0,
      distance: 0,
      lives: LIVES,
      coins: 0,
      coinValueTotal: 0,
      correctAnswers: 0,
      round: 0,
      level: gameState.current.level,
      speed: BASE_SPEED,
      gameOver: false,
      paused: false,
      checkpointCount: 0,
      nextQuestionGateAt: KNOWLEDGE_GATE_INTERVAL,
      lastObstacleX: -500,
      highScore: gameState.current.highScore,
      trailTicker: 0,
      shieldActive: false,
      shieldFrames: 0,
      magnetFrames: 0,
      ghostFrames: 0,
      speedBoostFrames: 0,
      totalQuestions: 0,
      lastMilestone: 0,
    };
    player.current = {
      x: LANE_CENTERS[1],
      y: GROUND_Y - PLAYER_H_RUN,
      vy: 0,
      grounded: true,
      onWallLeft: false,
      onWallRight: false,
      canWallJump: true,
      canDoubleJump: true,
      slideFrames: 0,
      runFrame: 0,
      invincibleFrames: 0,
      lane: 1,
      targetLane: 1,
    };
    obstacles.current = [];
    questionGates.current = [];
    coins.current = [];
    particles.current = [];
    trailParticles.current = [];
    weather.current = [];
    powerUps.current = [];
    milestoneMarkers.current = [];
    touchIndicators.current = [];
    parallax.current = [0, 0, 0];
    setShowQuestionModal(false);
    setModalQuestion(null);
    initQuestions();
  }, [initQuestions, loadHighScore]);
  const handleTap = useCallback(() => {
    if (gameState.current.gameOver || showQuestionModal) return;
    const pl = player.current;
    const sliding = pl.slideFrames > 0;
    if (!sliding) {
      if (pl.grounded) {
        pl.vy = JUMP_VEL;
        pl.grounded = false;
        playSound('jump');
      } else if (pl.canDoubleJump) {
        pl.vy = DOUBLE_JUMP_VEL;
        pl.canDoubleJump = false;
        playSound('jump');
      }
    }
  }, []);

  const handleSwipeDown = useCallback(() => {
    if (gameState.current.gameOver || showQuestionModal) return;
    const pl = player.current;
    if (pl.grounded && pl.slideFrames <= 0) {
      pl.slideFrames = SLIDE_DURATION;
      playSound('slide');
      const theme = getTheme();
      const cfg = THEMES[theme];
      for (let i = 0; i < 5; i++) {
        trailParticles.current.push({
          x: pl.x + PLAYER_W / 2 + (Math.random() - 0.5) * 30,
          y: pl.y + 20,
          life: 0,
          maxLife: 20,
          color: cfg.particleColor,
          size: 4 + Math.random() * 4,
          vx: -2 - Math.random() * 2,
          vy: (Math.random() - 0.3) * 2,
        });
      }
    }
  }, [getTheme]);

  const gs = gameState.current;

  return (
    <div className="game-card overflow-hidden bg-gray-50 border border-gray-200" style={{ maxWidth: W + 32 }}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block rounded-lg border border-gray-200 touch-none"
          onClick={handleTap}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (t) {
              touchStartRef.current = { x: t.clientX, y: t.clientY, time: performance.now() };
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                addTouchIndicator(t.clientX - rect.left, t.clientY - rect.top, 'tap');
              }
            }
          }}
          onTouchMove={(e) => e.preventDefault()}
          onTouchEnd={(e) => {
            e.preventDefault();
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (!start || !e.changedTouches[0]) return;
            const end = e.changedTouches[0];
            const dx = end.clientX - start.x;
            const dy = end.clientY - start.y;
            const dt = performance.now() - start.time;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
              if (dx > 0) { player.current.targetLane = Math.min(2, (player.current.targetLane ?? 1) + 1) as LaneIndex; playSound('click'); }
              else { player.current.targetLane = Math.max(0, (player.current.targetLane ?? 1) - 1) as LaneIndex; playSound('click'); }
            } else if (dy < -SWIPE_THRESHOLD) {
              handleTap();
            } else if (dy > SWIPE_THRESHOLD) {
              handleSwipeDown();
            } else if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 300) {
              handleTap();
            }
          }}
        />

        <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
          <div className="bg-gray-50/95 backdrop-blur rounded-lg px-3 py-2 shadow-md border border-gray-200">
            <span className="text-gray-800 font-bold text-sm">Score: {gs.score}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-700 text-sm">Best: {gs.highScore}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-indigo-600 font-bold text-sm">{Math.floor(gs.distance)}m</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-600 text-xs" title="Progressive speed">⚡{Math.floor(gs.speed)}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-700 text-sm">♥ {gs.lives}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-amber-600 text-sm">🪙 {gs.coins}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-500 text-xs">Lv {gs.level}</span>
            {gs.shieldActive && (
              <span className="ml-2 text-blue-600 text-sm" title="Shield active">🛡️</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="pointer-events-auto btn-elite btn-elite-ghost text-xs text-gray-800 border-gray-200"
              onClick={() => { gameState.current.paused = !gameState.current.paused; setUiTick((t) => t + 1); }}
            >
              {gs.paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="pointer-events-auto btn-elite btn-elite-ghost text-xs text-gray-800 border-gray-200" onClick={onClose}>
              Exit
            </button>
          </div>
        </div>

        {showQuestionModal && modalQuestion && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg z-10 p-4">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl border-2 border-gray-200">
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                {modalType === 'gate' ? 'Answer to pass!' : 'Answer to clear the path!'}
              </h3>
              <p className="text-gray-800 text-base mb-5">{modalQuestion.question}</p>
              <div className="flex flex-col gap-3">
                {modalQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => answerQuestion(i)}
                    className="btn-elite btn-elite-ghost text-left justify-start px-5 py-4 min-h-[56px] text-base text-gray-800 border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="font-mono text-sm text-gray-500 mr-2">[{i + 1}]</span>
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-4">Swipe left/right — Lanes · Tap — Jump · Swipe down — Slide</p>
            </div>
          </div>
        )}

        {gs.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-20">
            <div className="bg-gray-50 rounded-xl p-8 max-w-sm shadow-xl border border-gray-200 text-center">
              <h3 className="font-display font-bold text-2xl text-gray-800 mb-2">Game Over</h3>
              <p className="text-gray-700 font-semibold mb-2">Final Score: {gs.score}</p>
              <p className="text-gray-600 text-sm mb-1">Distance: {Math.floor(gs.distance)}m</p>
              <p className="text-gray-600 text-sm mb-1">Coins: {gs.coins}</p>
              <p className="text-gray-600 text-sm mb-1">Questions: {gs.correctAnswers}/{gs.totalQuestions || 1}</p>
              <p className="text-gray-600 text-sm mb-4">Accuracy: {gs.totalQuestions ? Math.round(100 * gs.correctAnswers / gs.totalQuestions) : 0}%</p>
              <p className="text-gray-600 text-sm mb-6">High Score: {gs.highScore}</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={restart} className="btn-elite btn-elite-primary">
                  Play Again
                </button>
                <button type="button" onClick={onClose} className="btn-elite btn-elite-ghost text-gray-800 border-gray-200">
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="p-2 text-center text-xs text-gray-600 border-t border-gray-200 bg-gray-50">
        Bronze(1) Silver(5) Gold(10) Shield🛡️ · Tap to jump · Swipe down to slide · Space/↑/Click · Double-jump · ↓ — Slide
      </p>
    </div>
  );
}
