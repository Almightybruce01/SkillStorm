/* ═══════════════════════════════════════════════════════════
   PONG GAME — Arcade (Full-Featured)
   Canvas-based Pong with power-ups, themes, AI, 2P mode
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '../SoundEngine';
import { isTouchDevice, haptic } from '../TouchControls';
import { isMobile } from '../GameUtils';

interface PongGameProps {
  onClose: () => void;
}

const W = 700;
const H = 450;
const PADDLE_W = 14;
const PADDLE_H = 70;
const BALL_R = 10;
const WIN_SCORE_CLASSIC = 11;
const WIN_SCORE_TOURNAMENT = 5;
const TARGET_FPS = 60;
const MS_PER_FRAME = 1000 / TARGET_FPS;

type GameMode = 'classic' | 'tournament' | 'survival' | 'chaos';
type AiDifficulty = 'easy' | 'medium' | 'hard' | 'impossible';
type CourtTheme =
  | 'classic'
  | 'neon'
  | 'retro'
  | 'ice'
  | 'fire';

type PowerUpType =
  | 'big_paddle'
  | 'speed_ball'
  | 'multi_ball'
  | 'freeze'
  | 'invisible_ball'
  | 'curve_ball'
  | 'shield';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  speedMult: number;
  spin: number;
  curve: number;
  invisibleUntil: number;
  trail: { x: number; y: number; alpha: number }[];
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

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
  pulse: number;
}

interface CourtThemeConfig {
  bg: string;
  line: string;
  lineAlpha: number;
  paddle1: string;
  paddle2: string;
  ball: string;
  score: string;
  glow?: boolean;
  particles?: string[];
}

const COURT_THEMES: Record<CourtTheme, CourtThemeConfig> = {
  classic: {
    bg: '#0a0a0a',
    line: '#ffffff',
    lineAlpha: 0.6,
    paddle1: '#ffffff',
    paddle2: '#ffffff',
    ball: '#ffffff',
    score: '#ffffff',
  },
  neon: {
    bg: '#0d0221',
    line: '#00ff88',
    lineAlpha: 0.9,
    paddle1: '#ff00ff',
    paddle2: '#00ffff',
    ball: '#ffff00',
    score: '#00ff88',
    glow: true,
    particles: ['#ff00ff', '#00ffff', '#ffff00'],
  },
  retro: {
    bg: '#0f380f',
    line: '#306230',
    lineAlpha: 1,
    paddle1: '#9bbc0f',
    paddle2: '#8bac0f',
    ball: '#9bbc0f',
    score: '#9bbc0f',
  },
  ice: {
    bg: '#0c1929',
    line: '#7dd3fc',
    lineAlpha: 0.8,
    paddle1: '#bae6fd',
    paddle2: '#7dd3fc',
    ball: '#e0f2fe',
    score: '#bae6fd',
    glow: true,
    particles: ['#7dd3fc', '#38bdf8', '#e0f2fe'],
  },
  fire: {
    bg: '#1c0a00',
    line: '#f97316',
    lineAlpha: 0.9,
    paddle1: '#fbbf24',
    paddle2: '#ef4444',
    ball: '#fcd34d',
    score: '#f97316',
    glow: true,
    particles: ['#f97316', '#ef4444', '#fbbf24'],
  },
};

const POWERUP_COLORS: Record<PowerUpType, string> = {
  big_paddle: '#f59e0b',
  speed_ball: '#ef4444',
  multi_ball: '#22c55e',
  freeze: '#3b82f6',
  invisible_ball: '#a78bfa',
  curve_ball: '#ec4899',
  shield: '#06b6d4',
};

const POWERUP_LABELS: Record<PowerUpType, string> = {
  big_paddle: '2x Paddle',
  speed_ball: 'Speed',
  multi_ball: 'Multi',
  freeze: 'Freeze',
  invisible_ball: 'Ghost',
  curve_ball: 'Curve',
  shield: 'Shield',
};

function aiDelayFor(d: AiDifficulty): number {
  if (d === 'easy') return 0.12;
  if (d === 'medium') return 0.07;
  if (d === 'hard') return 0.035;
  return 0.015;
}

function aiPredicts(d: AiDifficulty): boolean {
  return d === 'hard' || d === 'impossible';
}

const HIGH_SCORE_KEY = 'skillzstorm_pong_highscore';

function loadHighScore(): number {
  try {
    return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    const current = loadHighScore();
    if (score > current) localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {}
}

export default function PongGame({ onClose }: PongGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const [started, setStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [courtTheme, setCourtTheme] = useState<CourtTheme>('classic');
  const [isTwoPlayer, setIsTwoPlayer] = useState(false);
  const [rallyCount, setRallyCount] = useState(0);
  const [maxBallSpeed, setMaxBallSpeed] = useState(0);
  const [powerUpsCollected, setPowerUpsCollected] = useState(0);
  const [serveCountdown, setServeCountdown] = useState(0);
  const [scoreBounce, setScoreBounce] = useState<'p1' | 'p2' | null>(null);
  const [chaosModifier, setChaosModifier] = useState<string>('');

  const gameRef = useRef({
    player1Y: H / 2 - PADDLE_H / 2,
    player2Y: H / 2 - PADDLE_H / 2,
    balls: [] as Ball[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    paddle1H: PADDLE_H,
    paddle2H: PADDLE_H,
    paddle1BigUntil: 0,
    paddle2BigUntil: 0,
    ballSpeedBase: 7,
    rallyCount: 0,
    lastPowerUp: 0,
    aiDelay: 0.07,
    aiTargetY: H / 2,
    flashUntil: 0,
    serveUntil: 0,
    serveSide: null as 'left' | 'right' | null,
    freezeUntil: 0,
    freezeP1Until: 0,
    shieldP1: false,
    shieldP2: false,
    cameraShake: 0,
    maxSpeed: 0,
    powerUpsCollected: 0,
    lastRallyBeforeGoal: 0,
    survivalElapsed: 0,
    curveMult: 0,
  });

  const keysRef = useRef<Record<string, boolean>>({});
  const lastFrameRef = useRef(0);
  const statsIntervalRef = useRef<number>(0);

  const spawnPowerUp = useCallback((x: number, y: number) => {
    const g = gameRef.current;
    const cooldown = gameMode === 'chaos' ? 4000 : 6000;
    if (Date.now() - g.lastPowerUp < cooldown) return;
    g.lastPowerUp = Date.now();
    const types: PowerUpType[] = [
      'big_paddle',
      'speed_ball',
      'multi_ball',
      'freeze',
      'invisible_ball',
      'curve_ball',
      'shield',
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    g.powerUps.push({ x, y, type, vy: 1.5, pulse: 0 });
  }, [gameMode]);

  const applyPowerUp = useCallback(
    (type: PowerUpType, target: 'p1' | 'p2') => {
      const g = gameRef.current;
      const now = Date.now();
      g.powerUpsCollected++;
      setPowerUpsCollected(g.powerUpsCollected);
      playSound('powerup');

      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        g.particles.push({
          x: W / 2,
          y: H / 2,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          life: 1,
          maxLife: 1,
          color: POWERUP_COLORS[type],
          size: 6,
        });
      }

      switch (type) {
        case 'big_paddle':
          if (target === 'p1') g.paddle1BigUntil = now + 5000;
          else g.paddle2BigUntil = now + 5000;
          break;
        case 'speed_ball':
          g.balls.forEach((b) => {
            b.speedMult = 1.5;
            setTimeout(() => (b.speedMult = 1), 5000);
          });
          break;
        case 'multi_ball': {
          const b = g.balls[0];
          if (b) {
            const mag = Math.hypot(b.vx, b.vy);
            const baseAngle = Math.atan2(b.vy, b.vx);
            for (let i = -1; i <= 1; i++) {
              if (i === 0) continue;
              const angle = baseAngle + i * 0.5;
              g.balls.push({
                ...b,
                vx: Math.cos(angle) * mag,
                vy: Math.sin(angle) * mag,
                trail: [],
              });
            }
          }
          break;
        }
        case 'freeze':
          if (target === 'p1') {
            g.freezeUntil = Math.max(g.freezeUntil, now + 2000);
          } else {
            g.freezeP1Until = Math.max(g.freezeP1Until, now + 2000);
          }
          break;
        case 'invisible_ball':
          g.balls.forEach((b) => (b.invisibleUntil = now + 3000));
          break;
        case 'curve_ball':
          g.curveMult = 0.3;
          setTimeout(() => (g.curveMult = 0), 6000);
          break;
        case 'shield':
          if (target === 'p1') g.shieldP1 = true;
          else g.shieldP2 = true;
          setTimeout(() => {
            if (target === 'p1') g.shieldP1 = false;
            else g.shieldP2 = false;
          }, 8000);
          break;
      }
    },
    []
  );

  const resetBall = useCallback((side?: 'left' | 'right') => {
    const g = gameRef.current;
    let baseSpeed = g.ballSpeedBase;
    const lastRally = g.lastRallyBeforeGoal ?? 0;
    // Ball speed increases with prior rally - longer rally = faster next serve
    if (lastRally > 0) {
      baseSpeed += Math.min(lastRally * 0.35, 6);
    }
    if (lastRally > 5) {
      baseSpeed += Math.min((lastRally - 5) * 0.3, 4);
    }
    const angle = (Math.random() * 0.7 - 0.35) * Math.PI;
    const dir =
      side === 'left' ? 1 : side === 'right' ? -1 : Math.random() > 0.5 ? 1 : -1;
    const speed = baseSpeed;
    g.balls = [
      {
        x: W / 2,
        y: H / 2,
        vx: dir * Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: BALL_R,
        speedMult: 1,
        spin: 0,
        curve: 0,
        invisibleUntil: 0,
        trail: [],
      },
    ];
  }, []);

  const startServe = useCallback((side: 'left' | 'right') => {
    const g = gameRef.current;
    g.serveUntil = Date.now() + 1500;
    g.serveSide = side;
    g.balls = [
      {
        x: W / 2,
        y: H / 2,
        vx: 0,
        vy: 0,
        r: BALL_R,
        speedMult: 1,
        spin: 0,
        curve: 0,
        invisibleUntil: 0,
        trail: [],
      },
    ];
    setServeCountdown(3);
    const interval = setInterval(() => {
      setServeCountdown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 500);
  }, []);

  const getWinScore = useCallback(() => {
    if (gameMode === 'tournament') return WIN_SCORE_TOURNAMENT;
    return WIN_SCORE_CLASSIC;
  }, [gameMode]);

  useEffect(() => {
    if (!started || gameOver) return;
    gameRef.current.aiDelay = aiDelayFor(aiDifficulty);
    startServe(Math.random() > 0.5 ? 'left' : 'right');
  }, [started, gameOver, aiDifficulty, startServe]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === ' ') e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
      if (e.key === ' ') e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const g = gameRef.current;
    const paddleSpeed = 14;
    const loop = () => {
      if (g.freezeUntil <= Date.now()) {
        if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
          g.player2Y = Math.max(0, g.player2Y - paddleSpeed);
        }
        if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) {
          g.player2Y = Math.min(H - g.paddle2H, g.player2Y + paddleSpeed);
        }
      }
      if (g.freezeP1Until <= Date.now() && isTwoPlayer) {
        if (keysRef.current['w'] || keysRef.current['W']) {
          g.player1Y = Math.max(0, g.player1Y - paddleSpeed);
        }
        if (keysRef.current['s'] || keysRef.current['S']) {
          g.player1Y = Math.min(H - g.paddle1H, g.player1Y + paddleSpeed);
        }
      } else if (!isTwoPlayer && g.freezeP1Until <= Date.now()) {
        if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
          g.player1Y = Math.max(0, g.player1Y - paddleSpeed);
        }
        if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) {
          g.player1Y = Math.min(H - g.paddle1H, g.player1Y + paddleSpeed);
        }
      }
    };
    const id = setInterval(loop, 1000 / 60);
    return () => clearInterval(id);
  }, [started, gameOver, isTwoPlayer]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = COURT_THEMES[courtTheme];
    const mouseHandler = (e: MouseEvent) => {
      if (!isTwoPlayer) return;
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const y = (e.clientY - rect.top) * scaleY;
      gameRef.current.player1Y = Math.max(
        0,
        Math.min(H - gameRef.current.paddle1H, y - gameRef.current.paddle1H / 2)
      );
    };
    canvas.addEventListener('mousemove', mouseHandler);

    // Touch drag support for mobile
    const touchMoveHandler = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const y = (t.clientY - rect.top) * scaleY;
      const g = gameRef.current;

      if (isTwoPlayer) {
        const scaleX = W / rect.width;
        const x = (t.clientX - rect.left) * scaleX;
        if (x < W / 2) {
          g.player1Y = Math.max(0, Math.min(H - g.paddle1H, y - g.paddle1H / 2));
        } else {
          g.player2Y = Math.max(0, Math.min(H - g.paddle2H, y - g.paddle2H / 2));
        }
      } else {
        g.player1Y = Math.max(0, Math.min(H - g.paddle1H, y - g.paddle1H / 2));
      }
    };

    const touchStartHandler = (e: TouchEvent) => {
      e.preventDefault();
      haptic('light');
      touchMoveHandler(e);
    };

    const touchEndHandler = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
    canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
    canvas.addEventListener('touchend', touchEndHandler, { passive: false });
    canvas.addEventListener('touchcancel', touchEndHandler, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', mouseHandler);
      canvas.removeEventListener('touchstart', touchStartHandler);
      canvas.removeEventListener('touchmove', touchMoveHandler);
      canvas.removeEventListener('touchend', touchEndHandler);
      canvas.removeEventListener('touchcancel', touchEndHandler);
    };
  }, [started, gameOver, isTwoPlayer, courtTheme]);

  useEffect(() => {
    if (!started || gameOver) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const theme = COURT_THEMES[courtTheme];

    const drawCourt = (shakeX: number, shakeY: number) => {
      ctx.save();
      ctx.translate(shakeX, shakeY);
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = theme.line;
      ctx.globalAlpha = theme.lineAlpha;
      ctx.setLineDash(courtTheme === 'retro' ? [] : [20, 15]);
      ctx.lineWidth = courtTheme === 'retro' ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      for (let i = 30; i < W; i += 40) {
        ctx.fillStyle = theme.line;
        ctx.globalAlpha = theme.lineAlpha * 0.5;
        ctx.fillRect(i, 0, 2, H);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    const drawPaddle = (
      x: number,
      y: number,
      h: number,
      color: string,
      glow: boolean
    ) => {
      if (theme.glow && glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, PADDLE_W, h);
      ctx.shadowBlur = 0;
    };

    const drawBall = (ball: Ball, paddleGlow: boolean) => {
      const visible = ball.invisibleUntil <= Date.now() || Date.now() % 200 < 100;
      if (!visible) return;

      ball.trail.forEach((t, i) => {
        const fade = 1 - i / ball.trail.length;
        ctx.globalAlpha = t.alpha * fade * 0.5;
        ctx.fillStyle = theme.ball;
        if (theme.glow) {
          ctx.shadowColor = theme.ball;
          ctx.shadowBlur = 6 + fade * 4;
        }
        const trailRadius = ball.r * (0.4 + 0.4 * fade);
        ctx.beginPath();
        ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      if (theme.glow && paddleGlow) {
        ctx.shadowColor = theme.ball;
        ctx.shadowBlur = 25;
      }
      ctx.fillStyle = theme.ball;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawSpeedLines = (ball: Ball) => {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < 15) return;
      const count = Math.min(8, Math.floor(speed / 3));
      ctx.strokeStyle = theme.ball;
      ctx.globalAlpha = 0.3 * (speed / 25);
      ctx.lineWidth = 1;
      for (let i = 0; i < count; i++) {
        const len = 15 + (i * speed) / 8;
        const dx = -ball.vx / speed;
        const dy = -ball.vy / speed;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + dx * len, ball.y + dy * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let raf: number;
    let lastTime = 0;

    const gameLoop = (now: number) => {
      const g = gameRef.current;
      const dt = Math.min(now - lastTime, 50);
      lastTime = now;

      setRallyCount(g.rallyCount);
      setMaxBallSpeed(Math.round(g.maxSpeed));

      if (g.paddle1BigUntil > Date.now()) g.paddle1H = PADDLE_H * 2;
      else g.paddle1H = PADDLE_H;
      if (g.paddle2BigUntil > Date.now()) g.paddle2H = PADDLE_H * 2;
      else g.paddle2H = PADDLE_H;

      if (gameMode === 'survival') {
        g.survivalElapsed += dt;
        g.ballSpeedBase = 7 + Math.floor(g.survivalElapsed / 15000) * 1.5;
      }

      if (gameMode === 'chaos' && Math.random() < 0.002) {
        const mods = [
          'Speed Boost',
          'Wide Paddles',
          'Tiny Ball',
          'Curve Active',
          'Multi-Ball',
        ];
        setChaosModifier(mods[Math.floor(Math.random() * mods.length)]);
        setTimeout(() => setChaosModifier(''), 3000);
      }

      if (g.serveUntil > Date.now()) {
        g.aiTargetY = H / 2;
        if (!isTwoPlayer) {
          g.player2Y += (H / 2 - g.player2Y - g.paddle2H / 2) * g.aiDelay;
        }
        drawCourt(0, 0);
        drawPaddle(0, g.player1Y, g.paddle1H, theme.paddle1, !!theme.glow);
        drawPaddle(W - PADDLE_W, g.player2Y, g.paddle2H, theme.paddle2, !!theme.glow);
        g.balls.forEach((b) => drawBall(b, false));
        const secs = Math.ceil((g.serveUntil - Date.now()) / 1000);
        ctx.fillStyle = theme.score;
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.9;
        ctx.fillText(secs > 0 ? `${secs}` : 'GO!', W / 2, H / 2 + 16);
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(gameLoop);
        return;
      }

      if (g.serveUntil > 0 && g.serveUntil <= Date.now() && g.serveSide != null) {
        const side = g.serveSide;
        g.serveUntil = 0;
        g.serveSide = null;
        resetBall(side);
        playSound('go');
      }

      g.powerUps = g.powerUps.filter((pu) => {
        pu.y += pu.vy;
        pu.pulse += 0.1;
        if (pu.y > H + 20) return false;

        const hitP1 =
          pu.x >= 0 &&
          pu.x <= PADDLE_W + 15 &&
          pu.y >= g.player1Y - 10 &&
          pu.y <= g.player1Y + g.paddle1H + 10;
        const hitP2 =
          pu.x >= W - PADDLE_W - 15 &&
          pu.x <= W + 15 &&
          pu.y >= g.player2Y - 10 &&
          pu.y <= g.player2Y + g.paddle2H + 10;

        if (hitP1) {
          applyPowerUp(pu.type, 'p1');
          return false;
        }
        if (hitP2) {
          applyPowerUp(pu.type, 'p2');
          return false;
        }
        return true;
      });

      const predictY = (ball: Ball): number => {
        if (!aiPredicts(aiDifficulty)) return ball.y;
        let x = ball.x;
        let y = ball.y;
        let vx = ball.vx;
        let vy = ball.vy;
        for (let step = 0; step < 200 && x < W - PADDLE_W - 20; step++) {
          x += vx * ball.speedMult;
          y += vy * ball.speedMult;
          if (y <= ball.r) {
            y = ball.r;
            vy = Math.abs(vy);
          }
          if (y >= H - ball.r) {
            y = H - ball.r;
            vy = -Math.abs(vy);
          }
        }
        return y;
      };

      if (!isTwoPlayer && g.balls.length > 0) {
        const targetBall = g.balls.reduce((a, b) => (b.vx > 0 ? b : a));
        g.aiTargetY = predictY(targetBall);
        if (g.freezeUntil <= Date.now()) {
          g.player2Y +=
            (g.aiTargetY - g.player2Y - g.paddle2H / 2) * g.aiDelay;
        }
      }

      g.balls = g.balls.filter((ball) => {
        ball.x += ball.vx * ball.speedMult;
        ball.y += ball.vy * ball.speedMult;

        if (g.curveMult > 0) {
          ball.vy += g.curveMult * (ball.vx > 0 ? 0.15 : -0.15);
        }

        ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 1 });
        if (ball.trail.length > 16) ball.trail.pop();

        const speed = Math.hypot(ball.vx, ball.vy);
        g.maxSpeed = Math.max(g.maxSpeed, speed);

        for (let i = 0; i < 2; i++) {
          g.particles.push({
            x: ball.x,
            y: ball.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1,
            maxLife: 1,
            color: theme.particles?.[0] || theme.ball,
            size: 3,
          });
        }

        if (ball.y - ball.r <= 0) {
          ball.y = ball.r;
          ball.vy = Math.abs(ball.vy);
          ball.spin *= 0.8;
        }
        if (ball.y + ball.r >= H) {
          ball.y = H - ball.r;
          ball.vy = -Math.abs(ball.vy);
          ball.spin *= 0.8;
        }

        const hitP1 =
          ball.x - ball.r <= PADDLE_W &&
          ball.vx < 0 &&
          ball.y >= g.player1Y &&
          ball.y <= g.player1Y + g.paddle1H;
        const hitP2 =
          ball.x + ball.r >= W - PADDLE_W &&
          ball.vx > 0 &&
          ball.y >= g.player2Y &&
          ball.y <= g.player2Y + g.paddle2H;

        const paddleH1 = g.paddle1H;
        const paddleH2 = g.paddle2H;

        if (hitP1 && !g.shieldP2) {
          ball.x = PADDLE_W + ball.r;
          const rel =
            (ball.y - (g.player1Y + paddleH1 / 2)) / (paddleH1 / 2);
          const angle = rel * 0.65 * Math.PI;
          // Ball speed increases each rally: base 1.03 + rally bonus (capped)
          const rallySpeedBonus = Math.min(g.rallyCount * 0.02, 0.35);
          let speed = Math.hypot(ball.vx, ball.vy) * (1.03 + rallySpeedBonus);
          speed = Math.min(speed, 32);
          ball.vx = Math.cos(angle) * speed;
          ball.vy = Math.sin(angle) * speed;
          ball.spin = rel * 2;
          g.rallyCount++;
          playSound('hit');
          if (Math.random() < 0.16) spawnPowerUp(ball.x + 30, ball.y);
          return true;
        }

        if (hitP2 && !g.shieldP1) {
          ball.x = W - PADDLE_W - ball.r;
          const rel =
            (ball.y - (g.player2Y + paddleH2 / 2)) / (paddleH2 / 2);
          const angle = Math.PI - rel * 0.65 * Math.PI;
          const rallySpeedBonus = Math.min(g.rallyCount * 0.02, 0.35);
          let speed = Math.hypot(ball.vx, ball.vy) * (1.03 + rallySpeedBonus);
          speed = Math.min(speed, 32);
          ball.vx = Math.cos(angle) * speed;
          ball.vy = Math.sin(angle) * speed;
          ball.spin = -rel * 2;
          g.rallyCount++;
          playSound('hit');
          if (Math.random() < 0.16) spawnPowerUp(ball.x - 30, ball.y);
          return true;
        }

        if (ball.x - ball.r < 0) {
          // Goal burst particles (left side / P2 scores)
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.5;
            const spd = 3 + Math.random() * 6;
            g.particles.push({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1,
              maxLife: 1,
              color: theme.particles?.[0] ?? theme.ball,
              size: 4 + Math.random() * 4,
            });
          }
          if (g.shieldP1) {
            ball.x = PADDLE_W + ball.r;
            ball.vx = Math.abs(ball.vx);
            g.shieldP1 = false;
            playSound('shield');
            return true;
          }
          setPlayer2Score((s) => s + 1);
          setScoreBounce('p2');
          setTimeout(() => setScoreBounce(null), 500);
          g.lastRallyBeforeGoal = g.rallyCount;
          g.rallyCount = 0;
          g.flashUntil = Date.now() + 250;
          g.cameraShake = 22;
          playSound('correct');
          if (gameMode === 'survival') {
            saveHighScore(player1Score + 1);
          }
          startServe('right');
          return false;
        }

        if (ball.x + ball.r > W) {
          // Goal burst particles (right side / P1 scores)
          for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.5;
            const spd = 3 + Math.random() * 6;
            g.particles.push({
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1,
              maxLife: 1,
              color: theme.particles?.[0] ?? theme.ball,
              size: 4 + Math.random() * 4,
            });
          }
          if (g.shieldP2) {
            ball.x = W - PADDLE_W - ball.r;
            ball.vx = -Math.abs(ball.vx);
            g.shieldP2 = false;
            playSound('shield');
            return true;
          }
          setPlayer1Score((s) => s + 1);
          setScoreBounce('p1');
          setTimeout(() => setScoreBounce(null), 500);
          g.lastRallyBeforeGoal = g.rallyCount;
          g.rallyCount = 0;
          g.flashUntil = Date.now() + 250;
          g.cameraShake = 22;
          playSound('correct');
          if (gameMode === 'survival') {
            saveHighScore(player2Score + 1);
          }
          startServe('left');
          return false;
        }

        return true;
      });

      if (g.balls.length === 0 && g.serveUntil <= Date.now()) {
        resetBall();
      }

      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        return p.life > 0;
      });

      g.cameraShake *= 0.85;
      const shakeX = (Math.random() - 0.5) * g.cameraShake;
      const shakeY = (Math.random() - 0.5) * g.cameraShake;

      drawCourt(shakeX, shakeY);

      if (g.flashUntil > Date.now()) {
        const alpha = (g.flashUntil - Date.now()) / 250;
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`;
        ctx.fillRect(0, 0, W, H);
      }

      g.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      const paddle1Glow = g.balls.some(
        (b) => b.x < W / 3 && Math.abs(b.y - g.player1Y - g.paddle1H / 2) < 60
      );
      const paddle2Glow = g.balls.some(
        (b) =>
          b.x > (2 * W) / 3 &&
          Math.abs(b.y - g.player2Y - g.paddle2H / 2) < 60
      );

      drawPaddle(0, g.player1Y, g.paddle1H, theme.paddle1, paddle1Glow && !!theme.glow);
      drawPaddle(
        W - PADDLE_W,
        g.player2Y,
        g.paddle2H,
        theme.paddle2,
        paddle2Glow && !!theme.glow
      );

      g.balls.forEach((ball) => {
        drawSpeedLines(ball);
        drawBall(
          ball,
          paddle1Glow || paddle2Glow
        );
      });

      g.powerUps.forEach((pu) => {
        const pulse = 10 + Math.sin(pu.pulse) * 3;
        ctx.fillStyle = POWERUP_COLORS[pu.type];
        if (theme.glow) {
          ctx.shadowColor = POWERUP_COLORS[pu.type];
          ctx.shadowBlur = 15;
        }
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      const scoreScale1 = scoreBounce === 'p1' ? 1.3 : 1;
      const scoreScale2 = scoreBounce === 'p2' ? 1.3 : 1;

      ctx.fillStyle = theme.score;
      ctx.font = 'bold 42px Inter';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(W / 4, 55);
      ctx.scale(scoreScale1, scoreScale1);
      ctx.fillText(`${player1Score}`, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate((3 * W) / 4, 55);
      ctx.scale(scoreScale2, scoreScale2);
      ctx.fillText(`${player2Score}`, 0, 0);
      ctx.restore();

      ctx.font = '14px Inter';
      ctx.fillStyle = theme.score;
      ctx.globalAlpha = 0.8;
      ctx.fillText(`Max Speed: ${Math.round(g.maxSpeed)}`, W / 2, H - 8);
      ctx.globalAlpha = 1;

      // Prominent rally counter badge
      if (g.rallyCount >= 3) {
        ctx.save();
        ctx.font = 'bold 20px Inter';
        ctx.textAlign = 'center';
        ctx.fillStyle = theme.score;
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeText(`Rally: ${g.rallyCount}`, W / 2, H - 35);
        ctx.fillText(`Rally: ${g.rallyCount}`, W / 2, H - 35);
        ctx.restore();
      } else {
        ctx.font = '14px Inter';
        ctx.fillStyle = theme.score;
        ctx.globalAlpha = 0.8;
        ctx.fillText(`Rally: ${g.rallyCount}`, W / 2, H - 25);
        ctx.globalAlpha = 1;
      }

      if (chaosModifier) {
        ctx.font = 'bold 16px Inter';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`CHAOS: ${chaosModifier}`, W / 2, 30);
      }

      // Rally fever indicator
      if (g.rallyCount >= 8) {
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = theme.score;
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillText(
          g.rallyCount >= 15 ? 'RALLY FEVER!' : g.rallyCount >= 10 ? 'Great rally!' : 'Nice rally!',
          W / 2,
          75
        );
        ctx.globalAlpha = 1;
      }

      const winScore = getWinScore();
      if (player1Score >= winScore || player2Score >= winScore) {
        setWinner(player1Score >= winScore ? 'p1' : 'p2');
        setGameOver(true);
        playSound(player1Score >= winScore ? 'victory' : 'gameover');
      }

      raf = requestAnimationFrame(gameLoop);
    };

    raf = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(raf);
  }, [
    started,
    gameOver,
    player1Score,
    player2Score,
    spawnPowerUp,
    applyPowerUp,
    resetBall,
    startServe,
    getWinScore,
    gameMode,
    aiDifficulty,
    courtTheme,
    isTwoPlayer,
    chaosModifier,
  ]);

  const handleStart = () => {
    setPlayer1Score(0);
    setPlayer2Score(0);
    setGameOver(false);
    setWinner(null);
    setStarted(true);
    setRallyCount(0);
    setMaxBallSpeed(0);
    setPowerUpsCollected(0);
    setScoreBounce(null);
    setChaosModifier('');
    gameRef.current = {
      ...gameRef.current,
      rallyCount: 0,
      maxSpeed: 0,
      powerUpsCollected: 0,
      survivalElapsed: 0,
    };
    playSound('click');
  };

  const highScore = loadHighScore();

  const showTouch = isTouchDevice();

  if (!started) {
    return (
      <div className="game-card bg-white border border-gray-200 text-gray-900 w-full max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">🏓 Paddle Rally</h2>
          <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Game Mode</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['classic', 'Classic'],
                  ['tournament', 'Tournament'],
                  ['survival', 'Survival'],
                  ['chaos', 'Chaos'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setGameMode(m)}
                  className={`btn-elite text-sm ${
                    gameMode === m ? 'btn-elite-primary' : 'btn-elite-ghost'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">AI Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {(
                ['easy', 'medium', 'hard', 'impossible'] as AiDifficulty[]
              ).map((d) => (
                <button
                  key={d}
                  onClick={() => setAiDifficulty(d)}
                  className={`btn-elite text-sm capitalize ${
                    aiDifficulty === d ? 'btn-elite-primary' : 'btn-elite-ghost'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Court Theme</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['classic', 'Classic'],
                ['neon', 'Neon'],
                ['retro', 'Retro'],
                ['ice', 'Ice'],
                ['fire', 'Fire'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setCourtTheme(t)}
                className={`btn-elite text-sm ${
                  courtTheme === t ? 'btn-elite-primary' : 'btn-elite-ghost'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isTwoPlayer}
              onChange={(e) => setIsTwoPlayer(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">2-Player (W/S vs Arrows)</span>
          </label>
        </div>

        <p className="text-xs text-gray-500 mb-2">
          {showTouch
            ? 'Drag finger to move paddle · Tap to serve'
            : isTwoPlayer
              ? 'P1: W/S · P2: ↑/↓ · Space to serve'
              : '↑/↓ or mouse · Space to serve'}
        </p>

        {gameMode === 'survival' && (
          <p className="text-sm text-amber-600 mb-2">
            Survival: Score points to survive. Speed increases over time. High score: {highScore}
          </p>
        )}

        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block cursor-none w-full"
            style={{ maxWidth: '100%' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
            <p className="text-white font-medium mb-3 text-sm sm:text-base text-center">
              First to {gameMode === 'tournament' ? 5 : 11} wins
              {gameMode === 'survival' && ' · Endless'}
              {gameMode === 'chaos' && ' · Random modifiers'}
            </p>
            <button onClick={handleStart} className="btn-elite btn-elite-primary touch-manipulation active:scale-95">
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card bg-white border border-gray-200 text-gray-900 w-full max-w-2xl mx-auto game-active">
      <div className="flex items-center justify-between mb-2 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">🏓 Paddle Rally</h2>
        <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-4 mb-2 text-xs sm:text-sm text-gray-900">
        <span>
          <strong>{player1Score}</strong> - <strong>{player2Score}</strong>
        </span>
        <span>Rally: <strong>{rallyCount}</strong></span>
        <span>Speed: <strong>{maxBallSpeed}</strong></span>
        <span>PU: <strong>{powerUpsCollected}</strong></span>
        {gameMode === 'survival' && (
          <span>Best: <strong>{highScore}</strong></span>
        )}
      </div>

      {!showTouch && (
        <p className="text-xs text-gray-500 mb-2">
          {isTwoPlayer
            ? 'P1: W/S · P2: ↑/↓ · Space to serve'
            : '↑/↓ or mouse · Space to serve'}
        </p>
      )}

      <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-black w-full" style={{ maxWidth: '100%', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block cursor-none w-full"
          style={{ maxWidth: '100%' }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (!started) handleStart();
            else if (!gameOver) startServe(Math.random() > 0.5 ? 'left' : 'right');
          }}
        />
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-4">
            <p
              className={`text-xl sm:text-2xl font-bold mb-1 ${
                winner === 'p1' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {winner === 'p1'
                ? isTwoPlayer
                  ? 'Player 1 Wins!'
                  : 'You Win!'
                : isTwoPlayer
                  ? 'Player 2 Wins!'
                  : 'AI Wins!'}
            </p>
            <p className="text-gray-300 mb-3 sm:mb-4">
              {player1Score} - {player2Score}
            </p>
            <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
              Rally: {rallyCount} · Max Speed: {maxBallSpeed}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleStart}
                className="btn-elite btn-elite-primary touch-manipulation active:scale-95"
              >
                Play Again
              </button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      {showTouch && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Drag finger up/down to move paddle · Tap to serve
        </p>
      )}
    </div>
  );
}
