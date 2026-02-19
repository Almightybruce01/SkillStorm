/* ═══════════════════════════════════════════════════════════
   SPACE SHOOTER — Educational Game Engine
   Canvas-based shooter: answer questions to destroy enemies.
   Features: touch-drag ship, tap to shoot, power-up drops (shield, rapid fire),
   screen shake on hit, particle explosions, boss health bar, combo kills
   with floating score text, hit flash overlay.
   Used by Multiplication Meteors, Algebra Blaster, etc.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Grade } from '../questionBank';
import type { Question } from '../questionBank';
import { getQuestions } from '../questionBank';
import { getGameById } from '../../engine/gameData';
import { playSound } from '../SoundEngine';

export interface SpaceShooterProps {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

// ── Constants ─────────────────────────────────────────────
const W = 800;
const H = 600;
const PLAYER_W = 48;
const PLAYER_H = 36;
const PLAYER_SPEED = 6;
const BULLET_SPEED = 14;
const BULLET_W = 6;
const BULLET_H = 14;
const ENEMY_BASIC_W = 36;
const ENEMY_BASIC_H = 28;
const ENEMY_FAST_W = 28;
const ENEMY_FAST_H = 24;
const ENEMY_TANK_W = 52;
const ENEMY_TANK_H = 40;
const ENEMY_ZIGZAG_W = 32;
const ENEMY_ZIGZAG_H = 26;
const POWERUP_SIZE = 24;
const STAR_COUNT = 150;
const NEBULA_COUNT = 6;
const BOSS_INTERVAL = 5;
const BASE_FIRE_RATE_MS = 350;
const RAPID_FIRE_RATE_MS = 120;
const SLOW_TIME_FACTOR = 0.4;
const COMBO_TIMEOUT_MS = 2000;
const SCREEN_SHAKE_DURATION_MS = 180;
const EXPLOSION_PARTICLES = 14;
const WRONG_ANSWER_SHAKE_MS = 80;
const COMBO_BONUS_PERCENT = 50;
const FLOATING_TEXT_DURATION_MS = 1200;
const COMBO_TIERS = [2, 5, 10, 15, 25] as const;
function getComboTier(combo: number): number {
  for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
    if (combo >= COMBO_TIERS[i]) return i + 1;
  }
  return 0;
}
const BULLET_TRAIL_CHANCE = 0.4;
const HIT_FLASH_DURATION_MS = 80;
const JOYSTICK_RADIUS = 60;
const JOYSTICK_DEADZONE = 15;
const FIRE_BUTTON_SIZE = 72;
const AUTO_FIRE_RATE_MS = 200;
const WEAPON_UPGRADE_INTERVAL = 3;
const BOSS_WARNING_DURATION_MS = 1800;

type EnemyType = 'basic' | 'fast' | 'tank' | 'zigzag';
type PowerupType = 'shield' | 'rapid_fire' | 'bomb' | 'slow_time';
type WeaponUpgradeType = 'spread' | 'piercing' | 'homing';

interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  answerIndex: number;
  vy: number;
  vx?: number;
  piercing?: boolean;
  homing?: boolean;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  question: Question;
  phase: number;
  vx: number;
  vy: number;
}

interface Boss {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  question: Question;
  phase: number;
  attackTimer: number;
  vx: number;
  attackPhase: number;
}

interface Powerup {
  x: number;
  y: number;
  type: PowerupType;
  vy: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  hue: number;
  alpha: number;
  speed: number;
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

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

// ── Subject from gameId ────────────────────────────────────
function getSubjectForGameId(gameId: string): 'math' | 'science' | 'vocabulary' {
  const game = getGameById(gameId);
  if (!game) return 'math';
  const s = game.subject;
  if (s === 'math') return 'math';
  if (s === 'science') return 'science';
  return 'vocabulary';
}

// ── Colors (space theme: dark game area, light UI) ──────────
const COLORS = {
  bg: '#0a0e1a',
  text: '#1f2937',
  accent1: '#6C5CE7',
  accent2: '#FD79A8',
  accent3: '#00CEC9',
  player: '#a29bfe',
  bullet: '#fbbf24',
  enemyBasic: '#6366f1',
  enemyFast: '#ec4899',
  enemyTank: '#14b8a6',
  enemyZigzag: '#f59e0b',
  boss: '#ef4444',
  correct: '#22c55e',
  wrong: '#f87171',
  star: '#e2e8f0',
} as const;

const ANSWER_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

const POWERUP_LABELS: Record<PowerupType, string> = {
  shield: '🛡️',
  rapid_fire: '⚡',
  bomb: '💣',
  slow_time: '⏱️',
};

export function SpaceShooter({ gameId, grade, onClose, onRoundEnd }: SpaceShooterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const subject = getSubjectForGameId(gameId);

  // Game state (refs for performance)
  const gameState = useRef({
    running: true,
    score: 0,
    level: 1,
    wave: 1,
    lives: 3,
    combo: 0,
    comboKills: 0,
    lastComboTime: 0,
    screenShake: 0,
    slowTimeUntil: 0,
    shieldActive: false,
    rapidFireUntil: 0,
    gameOver: false,
    paused: false,
    hitFlashUntil: 0,
    autoFire: false,
    weaponUpgrade: null as WeaponUpgradeType | null,
    weaponUpgradeChoice: false,
    bossWarningUntil: 0,
  });

  const player = useRef({
    x: W / 2 - PLAYER_W / 2,
    y: H - PLAYER_H - 40,
    vx: 0,
    selectedAnswer: 0,
  });

  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const boss = useRef<Boss | null>(null);
  const powerups = useRef<Powerup[]>([]);
  const stars = useRef<Star[]>([]);
  const nebulae = useRef<Nebula[]>([]);
  const particles = useRef<Particle[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);

  const lastFireTime = useRef(0);
  const lastSpawnTime = useRef(0);
  const lastFrameTime = useRef(0);
  const starOffset = useRef(0);
  const questionPool = useRef<Question[]>([]);
  const questionIndex = useRef(0);
  const lastBossLevel = useRef(-1);
  const enemyKills = useRef(0);
  const onRoundEndRef = useRef(onRoundEnd);
  const touchStartRef = useRef<{ x: number; clientX: number; time: number } | null>(null);
  const joystickRef = useRef<{ active: boolean; centerX: number; centerY: number; touchId: number } | null>(null);
  const joystickDivRef = useRef<HTMLDivElement>(null);
  const [joystickKnob, setJoystickKnob] = useState<{ dx: number; dy: number } | null>(null);
  const fireButtonTouchRef = useRef<boolean>(false);
  const exhaustTicker = useRef(0);

  const getCanvasRect = useCallback(() => canvasRef.current?.getBoundingClientRect(), []);

  const [, setUiTick] = useState(0);

  onRoundEndRef.current = onRoundEnd;

  // Initialize question pool (gameId + grade + level scaling)
  const initQuestions = useCallback(() => {
    const count = 40 + Math.min(gameState.current.level * 5, 30);
    const math = getQuestions(grade, 'math', Math.ceil(count / 3));
    const science = getQuestions(grade, 'science', Math.ceil(count / 3));
    const vocab = getQuestions(grade, 'vocabulary', Math.ceil(count / 3));
    const combined =
      subject === 'math'
        ? [...math, ...science.slice(0, 5), ...vocab.slice(0, 5)]
        : subject === 'science'
          ? [...science, ...math.slice(0, 5), ...vocab.slice(0, 5)]
          : [...vocab, ...math.slice(0, 5), ...science.slice(0, 5)];
    questionPool.current = combined;
    for (let i = questionPool.current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionPool.current[i], questionPool.current[j]] = [questionPool.current[j], questionPool.current[i]];
    }
    questionIndex.current = 0;
  }, [grade, subject]);

  const getNextQuestion = useCallback((): Question => {
    if (questionIndex.current >= questionPool.current.length) {
      questionIndex.current = 0;
      initQuestions();
    }
    return questionPool.current[questionIndex.current++];
  }, [initQuestions]);

  // Initialize stars and nebulae
  const initBackground = useCallback(() => {
    stars.current = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.5 + Math.random() * 2,
      speed: 0.5 + Math.random() * 2.5,
      brightness: 0.2 + Math.random() * 0.8,
    }));
    nebulae.current = Array.from({ length: NEBULA_COUNT }, () => ({
      x: Math.random() * W * 2 - W * 0.5,
      y: Math.random() * H * 2 - H * 0.5,
      radius: 100 + Math.random() * 150,
      hue: 230 + Math.random() * 100,
      alpha: 0.02 + Math.random() * 0.07,
      speed: 0.15 + Math.random() * 0.6,
    }));
  }, []);

  const rectCollision = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const getEnemyColor = useCallback((type: EnemyType): string => {
    switch (type) {
      case 'basic': return COLORS.enemyBasic;
      case 'fast': return COLORS.enemyFast;
      case 'tank': return COLORS.enemyTank;
      case 'zigzag': return COLORS.enemyZigzag;
      default: return COLORS.enemyBasic;
    }
  }, []);

  const spawnExplosion = useCallback(
    (x: number, y: number, color: string, count = EXPLOSION_PARTICLES) => {
      const extra = Math.floor(count * 0.5) + 3;
      for (let i = 0; i < count + extra; i++) {
        const angle = (Math.PI * 2 * i) / (count + extra) + Math.random() * 0.5;
        const speed = 3 + Math.random() * 10;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 0,
          maxLife: 28 + Math.random() * 25,
          color,
          size: 2 + Math.random() * 6,
        });
      }
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        particles.current.push({
          x,
          y,
          vx: Math.cos(angle) * 6,
          vy: Math.sin(angle) * 6,
          life: 0,
          maxLife: 20,
          color: '#fff',
          size: 1 + Math.random() * 2,
        });
      }
    },
    []
  );

  const triggerScreenShake = useCallback((duration = SCREEN_SHAKE_DURATION_MS) => {
    gameState.current.screenShake = Math.max(gameState.current.screenShake, duration);
  }, []);

  const spawnBoss = useCallback(() => {
    const gs = gameState.current;
    boss.current = {
      x: W / 2 - 65,
      y: -100,
      w: 130,
      h: 75,
      hp: 35 + gs.level * 12,
      maxHp: 35 + gs.level * 12,
      question: getNextQuestion(),
      phase: 0,
      attackTimer: 0,
      vx: 2.5,
      attackPhase: 0,
    };
  }, [getNextQuestion]);

  const spawnEnemy = useCallback(
    (type: EnemyType) => {
      const x = 50 + Math.random() * (W - 100);
      let w: number, h: number, hp: number, vx: number, vy: number;

      const lvl = gameState.current.level;

      switch (type) {
        case 'basic':
          w = ENEMY_BASIC_W;
          h = ENEMY_BASIC_H;
          hp = 1;
          vx = 0;
          vy = 1 + lvl * 0.25;
          break;
        case 'fast':
          w = ENEMY_FAST_W;
          h = ENEMY_FAST_H;
          hp = 1;
          vx = 2.5;
          vy = 1.8 + lvl * 0.2;
          break;
        case 'tank':
          w = ENEMY_TANK_W;
          h = ENEMY_TANK_H;
          hp = 3 + Math.floor(lvl / 2);
          vx = 0;
          vy = 0.5 + lvl * 0.12;
          break;
        case 'zigzag':
          w = ENEMY_ZIGZAG_W;
          h = ENEMY_ZIGZAG_H;
          hp = 1;
          vx = 3;
          vy = 1.2 + lvl * 0.18;
          break;
        default:
          w = ENEMY_BASIC_W;
          h = ENEMY_BASIC_H;
          hp = 1;
          vx = 0;
          vy = 1;
      }

      enemies.current.push({
        x,
        y: -h - 15,
        w,
        h,
        type,
        hp,
        maxHp: hp,
        question: getNextQuestion(),
        phase: Math.random() * Math.PI * 2,
        vx,
        vy,
      });
    },
    [getNextQuestion]
  );

  const spawnPowerup = useCallback((x: number, y: number) => {
    if (Math.random() > 0.42) return;
    const r = Math.random();
    const type: PowerupType = r < 0.4 ? 'shield' : r < 0.7 ? 'rapid_fire' : r < 0.88 ? 'bomb' : 'slow_time';
    powerups.current.push({
      x,
      y,
      type,
      vy: 2.2,
    });
  }, []);

  const activateBomb = useCallback(() => {
    triggerScreenShake(220);
    enemies.current.forEach((e) => {
      spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, COLORS.enemyBasic, 10);
    });
    if (boss.current) {
      spawnExplosion(
        boss.current.x + boss.current.w / 2,
        boss.current.y + boss.current.h / 2,
        COLORS.boss,
        25
      );
      boss.current = null;
    }
    enemies.current = [];
    spawnExplosion(W / 2, H / 2, COLORS.accent2, 35);
  }, [spawnExplosion, triggerScreenShake]);

  const damagePlayer = useCallback(
    (wrongAnswer: boolean) => {
      const gs = gameState.current;
      if (wrongAnswer) playSound('wrong');
      gs.hitFlashUntil = performance.now() + HIT_FLASH_DURATION_MS;
      if (wrongAnswer) triggerScreenShake(WRONG_ANSWER_SHAKE_MS + 60);
      else triggerScreenShake(SCREEN_SHAKE_DURATION_MS + 80);

      if (gs.shieldActive) {
        gs.shieldActive = false;
        return;
      }
      gs.comboKills = 0;
      gs.combo = 0;
      gs.lives--;
      if (gs.lives <= 0) {
        gs.gameOver = true;
        playSound('gameover');
      }
    },
    [triggerScreenShake]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const dt = Math.min((timestamp - lastFrameTime.current) / 16.66, 3);
      lastFrameTime.current = timestamp;

      const gs = gameState.current;
      const pl = player.current;

      if (!gs.running || gs.gameOver) return;
      if (gs.paused || gs.weaponUpgradeChoice) return;

      const slowMult = gs.slowTimeUntil > timestamp ? SLOW_TIME_FACTOR : 1;
      const dts = dt * slowMult;

      pl.x = Math.max(10, Math.min(W - PLAYER_W - 10, pl.x + pl.vx * dts));

      if (gs.screenShake > 0) gs.screenShake -= dts * 60;
      if (gs.hitFlashUntil > 0 && gs.hitFlashUntil < timestamp) gs.hitFlashUntil = 0;

      exhaustTicker.current += dts;
      const exhaustInterval = Math.abs(pl.vx) > 0.5 ? 2 : 4;
      if (exhaustTicker.current > exhaustInterval) {
        exhaustTicker.current = 0;
        const dir = pl.vx !== 0 ? (pl.vx > 0 ? -1 : 1) : 0;
        for (let i = 0; i < (dir !== 0 ? 2 : 1); i++) {
          particles.current.push({
            x: pl.x + PLAYER_W / 2 + (dir * PLAYER_W / 2),
            y: pl.y + PLAYER_H - 4,
            vx: (dir * 2) + (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 2,
            life: 0,
            maxLife: 15,
            color: Math.random() > 0.5 ? '#fbbf24' : '#f59e0b',
            size: 2 + Math.random(),
          });
        }
      }

      if (timestamp - gs.lastComboTime > COMBO_TIMEOUT_MS) {
        gs.combo = 0;
      }

      if (gs.autoFire && timestamp - lastFireTime.current >= AUTO_FIRE_RATE_MS) {
        lastFireTime.current = timestamp;
        const weapon = gs.weaponUpgrade;
          if (weapon === 'spread') {
            for (const angle of [-0.3, 0, 0.3]) {
              const vx = Math.sin(angle) * BULLET_SPEED * 0.3;
              const vy = -Math.cos(angle) * BULLET_SPEED;
              bullets.current.push({
                x: pl.x + PLAYER_W / 2 - BULLET_W / 2,
                y: pl.y - BULLET_H,
                w: BULLET_W, h: BULLET_H,
                answerIndex: pl.selectedAnswer,
                vy, vx,
              });
            }
          } else if (weapon === 'homing') {
            bullets.current.push({
              x: pl.x + PLAYER_W / 2 - BULLET_W / 2,
              y: pl.y - BULLET_H,
              w: BULLET_W, h: BULLET_H,
              answerIndex: pl.selectedAnswer,
              vy: -BULLET_SPEED,
              homing: true,
            });
          } else {
            bullets.current.push({
              x: pl.x + PLAYER_W / 2 - BULLET_W / 2,
              y: pl.y - BULLET_H,
              w: BULLET_W, h: BULLET_H,
              answerIndex: pl.selectedAnswer,
              vy: -BULLET_SPEED,
              piercing: weapon === 'piercing',
            });
          }
      }

      const targetLevel = 1 + Math.floor(enemyKills.current / 8);
      if (targetLevel > gs.level && !boss.current) {
        gs.level = targetLevel;
        gs.wave = gs.level;
      }

      const spawnInterval = Math.max(500, 2000 - gs.level * 80);
      if (timestamp - lastSpawnTime.current > spawnInterval && !boss.current) {
        lastSpawnTime.current = timestamp;
        const r = Math.random();
        const lvl = gs.level;
        if (lvl <= 2) {
          if (r < 0.7) spawnEnemy('basic');
          else spawnEnemy('fast');
        } else if (lvl <= 5) {
          if (r < 0.35) spawnEnemy('basic');
          else if (r < 0.65) spawnEnemy('fast');
          else if (r < 0.88) spawnEnemy('tank');
          else spawnEnemy('zigzag');
        } else {
          if (r < 0.25) spawnEnemy('basic');
          else if (r < 0.5) spawnEnemy('fast');
          else if (r < 0.75) spawnEnemy('tank');
          else spawnEnemy('zigzag');
        }
      }

      if (
        gs.level % BOSS_INTERVAL === 0 &&
        gs.level > 0 &&
        lastBossLevel.current !== gs.level &&
        !boss.current &&
        enemies.current.length < 5
      ) {
        lastBossLevel.current = gs.level;
        gs.bossWarningUntil = timestamp + BOSS_WARNING_DURATION_MS;
      }
      if (gs.bossWarningUntil > 0 && timestamp >= gs.bossWarningUntil && !boss.current) {
        gs.bossWarningUntil = 0;
        spawnBoss();
      }

      if (boss.current) {
        const b = boss.current;
        b.y = Math.min(b.y + 1.8 * dts, 90);
        b.phase += dts * 2;
        b.x += b.vx * dts * (1 + 0.3 * Math.sin(b.phase));
        if (b.x <= 0 || b.x + b.w >= W) b.vx *= -1;
        b.attackTimer += dts;
        if (b.attackTimer > 2.2) {
          b.attackTimer = 0;
          b.attackPhase = (b.attackPhase + 1) % 3;
          if (enemies.current.length < 8) {
            spawnEnemy('basic');
            spawnEnemy(b.attackPhase === 0 ? 'fast' : b.attackPhase === 1 ? 'zigzag' : 'tank');
          }
        }
      }

      bullets.current = bullets.current.filter((b) => {
        if (b.homing) {
          const targets = [...enemies.current];
          if (boss.current) {
            const b3 = boss.current;
            targets.push({ x: b3.x, y: b3.y, w: b3.w, h: b3.h } as Enemy);
          }
          const bx = b.x + b.w / 2, by = b.y + b.h / 2;
          const nearest = targets
            .filter((t) => t.y + t.h > 0)
            .sort((a, b) => {
              const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
              const bx2 = b.x + b.w / 2, by2 = b.y + b.h / 2;
              return Math.hypot(ax - bx, ay - by) - Math.hypot(bx2 - bx, by2 - by);
            })[0];
          if (nearest) {
            const tx = nearest.x + nearest.w / 2;
            const ty = nearest.y + nearest.h / 2;
            const dx = tx - bx;
            const dy = ty - by;
            const dist = Math.hypot(dx, dy) || 1;
            const steer = 0.15 * dts;
            const wantVx = (dx / dist) * BULLET_SPEED * 0.4;
            const wantVy = (dy / dist) * BULLET_SPEED - BULLET_SPEED * 0.5;
            (b as Bullet & { vx?: number }).vx = ((b as Bullet & { vx?: number }).vx ?? 0) * (1 - steer) + wantVx * steer;
            b.vy = b.vy * (1 - steer) + wantVy * steer;
          }
        }
        b.x += ((b as Bullet & { vx?: number }).vx ?? 0) * dts;
        b.y += b.vy * dts;
        if (b.y < -b.h || b.x < -b.w || b.x > W + b.w) return false;

        const hitEnemy = enemies.current.find((e) => rectCollision(b, e));
        if (hitEnemy) {
          const correct = b.answerIndex === hitEnemy.question.correct;
          if (correct) {
            hitEnemy.hp--;
            if (hitEnemy.hp <= 0) {
              playSound('correct');
              const explodeColor = getEnemyColor(hitEnemy.type);
              spawnExplosion(hitEnemy.x + hitEnemy.w / 2, hitEnemy.y + hitEnemy.h / 2, explodeColor);
              spawnPowerup(hitEnemy.x + hitEnemy.w / 2, hitEnemy.y);
              const bonus = Math.floor(100 * (1 + gs.combo * 0.5));
              gs.score += bonus;
              gs.combo++;
              gs.comboKills++;
              gs.lastComboTime = timestamp;
              playSound(hitEnemy.type === 'tank' || hitEnemy.maxHp > 1 ? 'explosion' : 'smallExplosion');
              floatingTexts.current.push({
                x: hitEnemy.x + hitEnemy.w / 2,
                y: hitEnemy.y,
                text: gs.combo > 1 ? `${gs.combo}x +${bonus}` : `+${bonus}`,
                life: 0,
                maxLife: FLOATING_TEXT_DURATION_MS / 16,
                color: '#fbbf24',
              });
              enemyKills.current++;
              triggerScreenShake();
            } else {
              spawnExplosion(hitEnemy.x + hitEnemy.w / 2, hitEnemy.y + hitEnemy.h / 2, getEnemyColor(hitEnemy.type), 6);
            }
          } else {
            damagePlayer(true);
            spawnExplosion(hitEnemy.x + hitEnemy.w / 2, hitEnemy.y + hitEnemy.h / 2, COLORS.wrong, 6);
          }
          if (!b.piercing || !correct) return false;
        }

        if (boss.current && rectCollision(b, boss.current)) {
          const bossEnt = boss.current;
          const correct = b.answerIndex === bossEnt.question.correct;
          if (correct) {
            bossEnt.hp--;
            spawnExplosion(bossEnt.x + bossEnt.w / 2, bossEnt.y + bossEnt.h / 2, COLORS.boss, 12);
            if (Math.random() < 0.15) spawnPowerup(bossEnt.x + bossEnt.w / 2, bossEnt.y + bossEnt.h / 2);
            triggerScreenShake();
            if (bossEnt.hp <= 0) {
              spawnExplosion(bossEnt.x + bossEnt.w / 2, bossEnt.y + bossEnt.h / 2, COLORS.boss, 30);
              const bossBonus = Math.floor(1000 * (1 + gs.combo * 0.5));
              boss.current = null;
              gs.score += bossBonus;
              gs.combo++;
              gs.lastComboTime = timestamp;
              floatingTexts.current.push({
                x: bossEnt.x + bossEnt.w / 2,
                y: bossEnt.y + bossEnt.h / 2,
                text: `BOSS! +${bossBonus}`,
                life: 0,
                maxLife: FLOATING_TEXT_DURATION_MS / 16 * 1.5,
                color: '#22c55e',
              });
              gs.level++;
              gs.wave = gs.level;
              enemyKills.current++;
              playSound('levelup');
              if (gs.level % WEAPON_UPGRADE_INTERVAL === 0) {
                gs.weaponUpgradeChoice = true;
              }
              onRoundEndRef.current?.(gs.level, gs.score);
            }
          } else {
            damagePlayer(true);
            spawnExplosion(bossEnt.x + bossEnt.w / 2, bossEnt.y + bossEnt.h / 2, COLORS.wrong, 8);
          }
          if (!b.piercing || !correct) return false;
        }
        return true;
      });

      enemies.current = enemies.current.filter((e) => {
        e.phase += dts * 5;
        if (e.type === 'fast') {
          e.vx = 2.5 * Math.sin(e.phase);
        } else if (e.type === 'zigzag') {
          e.vx = 3 * Math.sin(e.phase * 1.5);
        }
        e.x += e.vx * dts;
        e.y += e.vy * dts;
        if (e.x < -e.w - 20 || e.x > W + 20) return false;
        if (e.y > H + 25) {
          damagePlayer(false);
          return false;
        }
        return true;
      });

      powerups.current = powerups.current.filter((p) => {
        p.y += p.vy * dts;
        if (p.y > H + 25) return false;
        const pw = POWERUP_SIZE;
        const ph = POWERUP_SIZE;
        if (
          rectCollision(
            { x: pl.x, y: pl.y, w: PLAYER_W, h: PLAYER_H },
            { x: p.x - pw / 2, y: p.y - ph / 2, w: pw, h: ph }
          )
        ) {
          switch (p.type) {
            case 'shield':
              gs.shieldActive = true;
              playSound('shield');
              break;
            case 'rapid_fire':
              gs.rapidFireUntil = timestamp + 8000;
              playSound('powerup');
              break;
            case 'bomb':
              activateBomb();
              playSound('explosion');
              break;
            case 'slow_time':
              gs.slowTimeUntil = timestamp + 5000;
              playSound('powerup');
              break;
          }
          return false;
        }
        return true;
      });

      particles.current = particles.current.filter((p) => {
        p.x += p.vx * dts;
        p.y += p.vy * dts;
        p.life += dts * 4;
        return p.life < p.maxLife;
      });

      floatingTexts.current = floatingTexts.current.filter((ft) => {
        ft.y -= dts * 0.8;
        ft.life += dts * 4;
        return ft.life < ft.maxLife;
      });

      starOffset.current += dts * 90;
    },
    [spawnEnemy, spawnBoss, spawnExplosion, spawnPowerup, activateBomb, triggerScreenShake, damagePlayer, getEnemyColor]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const gs = gameState.current;
    const pl = player.current;
    const shake = gs.screenShake > 0 ? (Math.random() - 0.5) * 10 : 0;
    ctx.save();
    ctx.translate(shake, shake);
    if (gs.hitFlashUntil > performance.now()) {
      const alpha = (gs.hitFlashUntil - performance.now()) / HIT_FLASH_DURATION_MS;
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    nebulae.current.forEach((n) => {
      const y = ((n.y + starOffset.current * n.speed) % (H + 300)) - 150;
      const gradient = ctx.createRadialGradient(n.x, y, 0, n.x, y, n.radius);
      gradient.addColorStop(0, `hsla(${n.hue}, 70%, 55%, ${n.alpha})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(n.x, y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    stars.current.forEach((s) => {
      const sy = (s.y + starOffset.current * s.speed) % (H + 30) - 15;
      ctx.fillStyle = `rgba(226,232,240,${s.brightness})`;
      ctx.beginPath();
      ctx.arc(s.x, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    particles.current.forEach((p) => {
      const alpha = 1 - p.life / p.maxLife;
      const hex = p.color;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });

    floatingTexts.current.forEach((ft) => {
      const alpha = 1 - ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    if (boss.current) {
      const b = boss.current;
      ctx.fillStyle = COLORS.boss;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      const barY = b.y - 22;
      const barH = 12;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(b.x - 4, barY, b.w + 8, barH);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x - 4, barY, b.w + 8, barH);
      ctx.fillStyle = '#374151';
      ctx.fillRect(b.x, barY + 2, b.w, barH - 4);
      const hpPct = b.hp / b.maxHp;
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(b.x, barY + 2, b.w * hpPct, barH - 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`BOSS HP ${Math.ceil(b.hp)}/${b.maxHp}`, b.x + b.w / 2, barY + barH - 2);
    }

    enemies.current.forEach((e) => {
      const color =
        e.type === 'basic'
          ? COLORS.enemyBasic
          : e.type === 'fast'
            ? COLORS.enemyFast
            : e.type === 'tank'
              ? COLORS.enemyTank
              : COLORS.enemyZigzag;
      ctx.fillStyle = color;
      ctx.fillRect(e.x, e.y, e.w, e.h);
      if (e.maxHp > 1) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(e.x, e.y - 7, e.w, 5);
        ctx.fillStyle = COLORS.correct;
        ctx.fillRect(e.x, e.y - 7, (e.hp / e.maxHp) * e.w, 5);
      }
    });

    powerups.current.forEach((p) => {
      const colors: Record<PowerupType, string> = {
        shield: '#3b82f6',
        rapid_fire: '#f59e0b',
        bomb: '#ef4444',
        slow_time: '#8b5cf6',
      };
      const pulse = 0.9 + 0.1 * Math.sin(performance.now() * 0.005);
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = colors[p.type];
      ctx.fillStyle = colors[p.type];
      ctx.beginPath();
      ctx.arc(p.x, p.y, (POWERUP_SIZE / 2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    bullets.current.forEach((b) => {
      ctx.fillStyle = ANSWER_COLORS[b.answerIndex];
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(pl.x + PLAYER_W / 2, pl.y);
    ctx.lineTo(pl.x + PLAYER_W, pl.y + PLAYER_H);
    ctx.lineTo(pl.x + PLAYER_W / 2, pl.y + PLAYER_H - 8);
    ctx.lineTo(pl.x, pl.y + PLAYER_H);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (gs.shieldActive) {
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.008);
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
      ctx.strokeStyle = `rgba(59, 130, 246, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pl.x + PLAYER_W / 2, pl.y + PLAYER_H / 2, PLAYER_W / 2 + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (gs.bossWarningUntil > performance.now()) {
      ctx.save();
      const flash = Math.sin(performance.now() * 0.015) > 0 ? 1 : 0.5;
      ctx.globalAlpha = flash;
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('WARNING!', W / 2, H / 2 - 20);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeText('WARNING!', W / 2, H / 2 - 20);
      ctx.restore();
    }

    ctx.restore();
    requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    initQuestions();
    initBackground();

    const uiInterval = setInterval(() => setUiTick((t) => t + 1), 100);

    const loop = (t: number) => {
      if (!gameState.current.gameOver) gameLoop(t);
      render();
      if (gameState.current.running) requestAnimationFrame(loop);
    };
    const raf = requestAnimationFrame(loop);

    return () => {
      clearInterval(uiInterval);
      cancelAnimationFrame(raf);
      gameState.current.running = false;
    };
  }, [initQuestions, initBackground, gameLoop, render]);

  const fire = useCallback(() => {
    const now = performance.now();
    const gs = gameState.current;
    const fireRate = gs.rapidFireUntil > now ? RAPID_FIRE_RATE_MS : BASE_FIRE_RATE_MS;
    if (now - lastFireTime.current < fireRate) return;
    lastFireTime.current = now;

    const pl = player.current;
    const weapon = gs.weaponUpgrade;

    if (weapon === 'spread') {
      for (const angle of [-0.3, 0, 0.3]) {
        const vx = Math.sin(angle) * BULLET_SPEED * 0.3;
        const vy = -Math.cos(angle) * BULLET_SPEED;
        bullets.current.push({
          x: pl.x + PLAYER_W / 2 - BULLET_W / 2, y: pl.y - BULLET_H,
          w: BULLET_W, h: BULLET_H, answerIndex: pl.selectedAnswer, vy, vx,
        });
      }
    } else if (weapon === 'homing') {
      bullets.current.push({
        x: pl.x + PLAYER_W / 2 - BULLET_W / 2, y: pl.y - BULLET_H,
        w: BULLET_W, h: BULLET_H, answerIndex: pl.selectedAnswer,
        vy: -BULLET_SPEED, homing: true,
      });
    } else {
      bullets.current.push({
        x: pl.x + PLAYER_W / 2 - BULLET_W / 2, y: pl.y - BULLET_H,
        w: BULLET_W, h: BULLET_H, answerIndex: pl.selectedAnswer,
        vy: -BULLET_SPEED, piercing: weapon === 'piercing',
      });
    }

    playSound('shoot');
    if (Math.random() < 0.5) {
      particles.current.push({
        x: pl.x + PLAYER_W / 2, y: pl.y - 4,
        vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 2,
        life: 0, maxLife: 12, color: '#fbbf24', size: 2,
      });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!gameState.current.gameOver && !gameState.current.weaponUpgradeChoice) {
          gameState.current.paused = !gameState.current.paused;
          setUiTick((t) => t + 1);
        }
        return;
      }
      if (gameState.current.gameOver || gameState.current.paused) return;
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          player.current.vx = -PLAYER_SPEED;
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          player.current.vx = PLAYER_SPEED;
          break;
        case 'Digit1':
          e.preventDefault();
          player.current.selectedAnswer = 0;
          break;
        case 'Digit2':
          e.preventDefault();
          player.current.selectedAnswer = 1;
          break;
        case 'Digit3':
          e.preventDefault();
          player.current.selectedAnswer = 2;
          break;
        case 'Digit4':
          e.preventDefault();
          player.current.selectedAnswer = 3;
          break;
        case 'Space':
          e.preventDefault();
          fire();
          break;
      }
    },
    [fire]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        if (player.current.vx < 0) player.current.vx = 0;
        break;
      case 'ArrowRight':
      case 'KeyD':
        if (player.current.vx > 0) player.current.vx = 0;
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (!t || !joystickDivRef.current || gameState.current.gameOver || gameState.current.paused) return;
    const rect = joystickDivRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joystickRef.current = { active: true, centerX, centerY, touchId: t.identifier };
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    const j = joystickRef.current;
    if (!j || !j.active) return;
    const t = Array.from(e.touches).find((x) => x.identifier === j.touchId);
    if (!t) return;
    e.preventDefault();
    const dx = t.clientX - j.centerX;
    const dy = t.clientY - j.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, JOYSTICK_RADIUS);
    const cdx = dist < 1e-6 ? 0 : (dx / dist) * clamped;
    const cdy = dist < 1e-6 ? 0 : (dy / dist) * clamped;
    setJoystickKnob({ dx: cdx, dy: cdy });
    if (dist < JOYSTICK_DEADZONE) {
      player.current.vx = 0;
      return;
    }
    const nx = dx / dist;
    player.current.vx = (nx * clamped / JOYSTICK_RADIUS) * PLAYER_SPEED;
  }, []);

  const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
    const j = joystickRef.current;
    if (!j) return;
    const stillDown = Array.from(e.touches).some((x) => x.identifier === j.touchId);
    if (!stillDown) {
      joystickRef.current = null;
      setJoystickKnob(null);
      player.current.vx = 0;
    }
  }, []);

  const handleFireButtonTouch = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (gameState.current.gameOver || gameState.current.paused || gameState.current.weaponUpgradeChoice) return;
    fireButtonTouchRef.current = true;
    fire();
  }, [fire]);

  const targetQuestion = (() => {
    if (boss.current) return boss.current.question;
    const pl = player.current;
    const nearest = enemies.current
      .filter((e) => e.y > 0)
      .sort((a, b) => {
        const da = Math.abs(a.x + a.w / 2 - (pl.x + PLAYER_W / 2)) + a.y * 0.5;
        const db = Math.abs(b.x + b.w / 2 - (pl.x + PLAYER_W / 2)) + b.y * 0.5;
        return da - db;
      })[0];
    return nearest?.question ?? null;
  })();

  const now = performance.now();
  const gs = gameState.current;
  const activePowerups: { type: PowerupType; remaining: number }[] = [];
  if (gs.shieldActive) activePowerups.push({ type: 'shield', remaining: -1 });
  if (gs.rapidFireUntil > now) activePowerups.push({ type: 'rapid_fire', remaining: Math.ceil((gs.rapidFireUntil - now) / 1000) });
  if (gs.slowTimeUntil > now) activePowerups.push({ type: 'slow_time', remaining: Math.ceil((gs.slowTimeUntil - now) / 1000) });

  const restart = useCallback(() => {
    gameState.current.gameOver = false;
    gameState.current.lives = 3;
    gameState.current.score = 0;
    gameState.current.hitFlashUntil = 0;
    gameState.current.level = 1;
    gameState.current.wave = 1;
    gameState.current.combo = 0;
    gameState.current.comboKills = 0;
    gameState.current.shieldActive = false;
    gameState.current.rapidFireUntil = 0;
    gameState.current.slowTimeUntil = 0;
    gameState.current.paused = false;
    gameState.current.weaponUpgradeChoice = false;
    gameState.current.bossWarningUntil = 0;
    bullets.current = [];
    enemies.current = [];
    boss.current = null;
    powerups.current = [];
    particles.current = [];
    floatingTexts.current = [];
    player.current.x = W / 2 - PLAYER_W / 2;
    player.current.vx = 0;
    player.current.selectedAnswer = 0;
    lastBossLevel.current = -1;
    enemyKills.current = 0;
    lastFireTime.current = 0;
    lastSpawnTime.current = 0;
    initQuestions();
  }, [initQuestions]);

  return (
    <div
      ref={containerRef}
      className="game-card overflow-hidden bg-white border border-gray-200"
      style={{ maxWidth: W + 32 }}
    >
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block rounded-lg border border-gray-200 bg-slate-900 touch-none"
          style={{ width: W, height: H }}
          onTouchStart={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (t && canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = W / rect.width;
              const canvasX = (t.clientX - rect.left) * scaleX;
              touchStartRef.current = { x: canvasX, clientX: t.clientX, time: performance.now() };
            }
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            const t = e.touches[0];
            if (!t || !canvasRef.current || gameState.current.gameOver) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = W / rect.width;
            const canvasX = (t.clientX - rect.left) * scaleX;
            const pl = player.current;
            pl.x = Math.max(10, Math.min(W - PLAYER_W - 10, canvasX - PLAYER_W / 2));
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (!start || !e.changedTouches[0]) return;
            const end = e.changedTouches[0];
            const dx = Math.abs(end.clientX - start.clientX);
            if (dx < 15 && performance.now() - start.time < 250) fire();
          }}
          onMouseDown={(e) => {
            if (gameState.current.gameOver) return;
            e.preventDefault();
            fire();
          }}
          onMouseMove={(e) => {
            if (gameState.current.gameOver || !canvasRef.current) return;
            if (e.buttons !== 1) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = W / rect.width;
            const canvasX = (e.clientX - rect.left) * scaleX;
            const pl = player.current;
            pl.x = Math.max(10, Math.min(W - PLAYER_W - 10, canvasX - PLAYER_W / 2));
          }}
        />

        {/* Virtual joystick (mobile) - transparent circular area, knob tracks touch */}
        <div
          ref={joystickDivRef}
          className="absolute left-5 bottom-24 w-24 h-24 rounded-full bg-black/10 border-2 border-white/30 touch-none select-none flex items-center justify-center"
          style={{ minWidth: JOYSTICK_RADIUS * 2, minHeight: JOYSTICK_RADIUS * 2 }}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          aria-hidden
        >
          {joystickKnob && (
            <div
              className="absolute w-10 h-10 rounded-full bg-white/60 border-2 border-white/80 pointer-events-none"
              style={{
                transform: `translate(${joystickKnob.dx}px, ${joystickKnob.dy}px)`,
                left: '50%',
                top: '50%',
                marginLeft: -20,
                marginTop: -20,
              }}
            />
          )}
        </div>

        {/* Fire button (mobile) */}
        <div
          className="absolute right-5 bottom-24 rounded-full bg-red-500/60 border-2 border-red-400 touch-none select-none flex items-center justify-center active:bg-red-600/70"
          style={{ width: FIRE_BUTTON_SIZE, height: FIRE_BUTTON_SIZE }}
          onTouchStart={handleFireButtonTouch}
          aria-hidden
        >
          <span className="text-white font-bold text-lg">FIRE</span>
        </div>

        {/* HUD */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2 flex-wrap">
          <div className="bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-md border border-gray-200 pointer-events-none">
            <span className="text-gray-900 font-bold text-sm">Score: {gs.score}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-700 text-sm">Lv {gs.level}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-gray-700 text-sm">♥ {gs.lives}</span>
            {gs.comboKills > 0 && (
              <span className="ml-2 text-amber-600 text-sm font-medium">Combo: {gs.comboKills}</span>
            )}
          </div>
          {gs.combo > 0 && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 text-amber-800 font-bold text-sm animate-pulse pointer-events-none">
              {gs.combo}x Combo! +{Math.floor(50 * gs.combo)}% score
              {getComboTier(gs.combo) > 0 && ` · Tier ${getComboTier(gs.combo)}`}
            </div>
          )}
          <div className="flex gap-1.5 items-center">
            {activePowerups.map((p, i) => (
              <div
                key={`${p.type}-${i}`}
                className="bg-white/95 backdrop-blur rounded-lg px-2 py-1 shadow border border-gray-200 text-xs text-gray-800 pointer-events-none"
                title={p.remaining >= 0 ? `${p.remaining}s left` : 'Active'}
              >
                {POWERUP_LABELS[p.type]}
                {p.remaining >= 0 ? ` ${p.remaining}s` : ''}
              </div>
            ))}
            {!gs.gameOver && (
              <>
                <button
                  type="button"
                  className="btn-elite btn-elite-ghost text-xs py-1 px-2"
                  onClick={() => { gameState.current.autoFire = !gameState.current.autoFire; setUiTick((t) => t + 1); }}
                >
                  {gs.autoFire ? 'Auto ⚡' : 'Manual'}
                </button>
                <button
                  type="button"
                  className="btn-elite btn-elite-ghost text-xs py-1 px-2"
                  onClick={() => { gameState.current.paused = !gameState.current.paused; setUiTick((t) => t + 1); }}
                >
                  {gs.paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-elite btn-elite-ghost text-xs py-1 px-2"
                >
                  Exit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Question panel - bottom, larger buttons */}
        {targetQuestion && !gs.gameOver && !gs.paused && !gs.weaponUpgradeChoice && (
          <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur rounded-lg p-3 shadow-md border border-gray-200">
            <p className="text-gray-900 text-sm font-medium mb-2 truncate" title={targetQuestion.question}>
              {targetQuestion.question}
            </p>
            <div className="flex gap-2 flex-wrap">
              {targetQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className={`btn-elite min-h-[56px] text-sm py-3 px-4 flex-1 min-w-[120px] ${
                    player.current.selectedAnswer === i ? 'btn-elite-primary' : 'btn-elite-ghost'
                  }`}
                  style={{
                    borderColor: player.current.selectedAnswer === i ? undefined : ANSWER_COLORS[i],
                    color: player.current.selectedAnswer === i ? undefined : ANSWER_COLORS[i],
                  }}
                  onClick={() => {
                    player.current.selectedAnswer = i;
                    setUiTick((t) => t + 1);
                  }}
                >
                  <span className="text-xs opacity-70 mr-1">[{i + 1}]</span> {opt}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-1.5">
              Keys 1-4 to select · Space/tap to fire · Drag/joystick to move · Wrong answer = damage!
            </p>
          </div>
        )}

        {/* Weapon upgrade choice */}
        {gs.weaponUpgradeChoice && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg z-20">
            <div className="bg-white rounded-xl p-6 max-w-md shadow-xl border border-gray-200 text-center">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Choose Weapon Upgrade</h3>
              <div className="flex flex-col gap-3">
                {(['spread', 'piercing', 'homing'] as WeaponUpgradeType[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="btn-elite btn-elite-primary py-3 text-left px-4"
                    onClick={() => {
                      gameState.current.weaponUpgrade = w;
                      gameState.current.weaponUpgradeChoice = false;
                      playSound('powerup');
                      setUiTick((t) => t + 1);
                    }}
                  >
                    {w === 'spread' && 'Spread Shot — 3 bullets in fan'}
                    {w === 'piercing' && 'Piercing Shot — bullets pass through'}
                    {w === 'homing' && 'Homing Missiles — curve toward enemies'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {gs.paused && !gs.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
            <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200 text-center">
              <h3 className="font-bold text-xl text-gray-900 mb-2">Paused</h3>
              <p className="text-gray-600 text-sm mb-4">Press P or Escape to resume</p>
              <button
                type="button"
                className="btn-elite btn-elite-primary"
                onClick={() => { gameState.current.paused = false; setUiTick((t) => t + 1); }}
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* Game Over */}
        {gs.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="bg-white rounded-xl p-8 max-w-sm shadow-xl border border-gray-200 text-center">
              <h3 className="font-display font-bold text-2xl text-gray-900 mb-2">Game Over</h3>
              <p className="text-gray-700 mb-4">Final Score: {gs.score}</p>
              <p className="text-gray-500 text-sm mb-6">Level reached: {gs.level}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={onClose} className="btn-elite btn-elite-primary">
                  Exit
                </button>
                <button onClick={restart} className="btn-elite btn-elite-ghost">
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
