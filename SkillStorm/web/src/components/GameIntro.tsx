/* ═══════════════════════════════════════════════════════════
   GAME INTRO — 10-Second Animated Intro for Every Game
   Canvas-based cinematic sequence with engine-specific themes
   Features: Particle systems, text reveals, ambient audio
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';
import soundEngine from '../games/SoundEngine';

interface GameIntroProps {
  title: string;
  icon: string;
  engine: string;
  subject?: string;
  gradient: string;
  onComplete: () => void;
  duration?: number; // ms, default 8000 (8s animation + 2s buffer)
}

/* ── Particle class for intro effects ── */
class IntroParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; alpha: number; life: number;
  maxLife: number; rotation: number; rotSpeed: number;
  shape: 'circle' | 'star' | 'spark' | 'ring' | 'diamond';

  constructor(x: number, y: number, config: Partial<IntroParticle> = {}) {
    this.x = x; this.y = y;
    this.vx = config.vx ?? (Math.random() - 0.5) * 4;
    this.vy = config.vy ?? (Math.random() - 0.5) * 4;
    this.size = config.size ?? Math.random() * 6 + 2;
    this.color = config.color ?? '#ffffff';
    this.alpha = config.alpha ?? 1;
    this.life = 0;
    this.maxLife = config.maxLife ?? 60 + Math.random() * 60;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.1;
    this.shape = config.shape ?? 'circle';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    this.rotation += this.rotSpeed;
    this.alpha = Math.max(0, 1 - this.life / this.maxLife);
    this.vy += 0.02; // subtle gravity
    this.vx *= 0.99;
    return this.life < this.maxLife;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    switch (this.shape) {
      case 'star':
        this.drawStar(ctx, this.size);
        break;
      case 'spark':
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.size, 0);
        ctx.lineTo(this.size, 0);
        ctx.moveTo(0, -this.size);
        ctx.lineTo(0, this.size);
        ctx.stroke();
        break;
      case 'ring':
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(this.size * 0.6, 0);
        ctx.lineTo(0, this.size);
        ctx.lineTo(-this.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, size: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const method = i === 0 ? 'moveTo' : 'lineTo';
      ctx[method](Math.cos(angle) * size, Math.sin(angle) * size);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/* ── Engine theme configs ── */
const ENGINE_THEMES: Record<string, {
  colors: string[];
  bgPattern: string;
  particleShapes: IntroParticle['shape'][];
  subtitle: string;
  animation: string;
}> = {
  SpaceShooter: {
    colors: ['#6366f1', '#818cf8', '#c4b5fd', '#e0e7ff', '#fff'],
    bgPattern: 'starfield',
    particleShapes: ['star', 'spark', 'circle'],
    subtitle: 'BLAST OFF INTO LEARNING',
    animation: 'warp',
  },
  DashRunner: {
    colors: ['#22c55e', '#4ade80', '#86efac', '#fbbf24', '#fff'],
    bgPattern: 'speedlines',
    particleShapes: ['spark', 'diamond', 'circle'],
    subtitle: 'RUN • JUMP • LEARN',
    animation: 'rush',
  },
  BalloonPop: {
    colors: ['#ec4899', '#f472b6', '#fda4af', '#fbbf24', '#fff'],
    bgPattern: 'bubbles',
    particleShapes: ['circle', 'ring', 'star'],
    subtitle: 'POP YOUR WAY TO KNOWLEDGE',
    animation: 'float',
  },
  ZombieDefense: {
    colors: ['#ef4444', '#f97316', '#22c55e', '#a3e635', '#fff'],
    bgPattern: 'grid',
    particleShapes: ['diamond', 'spark', 'circle'],
    subtitle: 'DEFEND • BUILD • CONQUER',
    animation: 'pulse',
  },
  WordBuilder: {
    colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#fbbf24', '#fff'],
    bgPattern: 'letters',
    particleShapes: ['star', 'diamond', 'circle'],
    subtitle: 'BUILD WORDS • BUILD MINDS',
    animation: 'typewriter',
  },
  SpeedQuiz: {
    colors: ['#0ea5e9', '#38bdf8', '#7dd3fc', '#fbbf24', '#fff'],
    bgPattern: 'lightning',
    particleShapes: ['spark', 'star', 'circle'],
    subtitle: 'THINK FAST • ANSWER FASTER',
    animation: 'flash',
  },
  TargetRange: {
    colors: ['#ef4444', '#f97316', '#fbbf24', '#22c55e', '#fff'],
    bgPattern: 'crosshair',
    particleShapes: ['ring', 'spark', 'circle'],
    subtitle: 'LOCK ON • TAKE AIM • FIRE',
    animation: 'scope',
  },
  MemoryMatrix: {
    colors: ['#d946ef', '#a855f7', '#818cf8', '#38bdf8', '#fff'],
    bgPattern: 'cards',
    particleShapes: ['diamond', 'star', 'ring'],
    subtitle: 'REMEMBER • MATCH • MASTER',
    animation: 'flip',
  },
};

/* ── Arcade game theme fallback ── */
const ARCADE_THEME = {
  colors: ['#f43f5e', '#8b5cf6', '#3b82f6', '#fbbf24', '#fff'],
  bgPattern: 'arcade',
  particleShapes: ['star', 'spark', 'diamond'] as IntroParticle['shape'][],
  subtitle: 'ARCADE MODE',
  animation: 'retro',
};

export default function GameIntro({ title, icon, engine, subject, gradient, onComplete, duration = 8000 }: GameIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTime = useRef(0);
  const [canSkip, setCanSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const particles = useRef<IntroParticle[]>([]);
  const bgParticles = useRef<{ x: number; y: number; size: number; speed: number; alpha: number }[]>([]);

  const theme = ENGINE_THEMES[engine] || ARCADE_THEME;

  const handleSkip = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    soundEngine.click();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    // Initialize background particles
    bgParticles.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 3 + 0.5,
      speed: Math.random() * 0.8 + 0.2,
      alpha: Math.random() * 0.8 + 0.2,
    }));

    // Sound effects
    soundEngine.init();
    soundEngine.introRiser();
    setTimeout(() => soundEngine.introWhoosh(), 1500);
    setTimeout(() => soundEngine.introImpact(), 3000);
    setTimeout(() => soundEngine.introChime(), 4500);

    // Enable skip after 3 seconds
    const skipTimer = setTimeout(() => setCanSkip(true), 3000);

    startTime.current = performance.now();
    let phase = 0; // 0=buildup, 1=title_reveal, 2=subtitle, 3=icon_burst, 4=fadeout

    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);

      // Determine phase
      if (t < 0.2) phase = 0;
      else if (t < 0.45) phase = 1;
      else if (t < 0.65) phase = 2;
      else if (t < 0.85) phase = 3;
      else phase = 4;

      // Clear with gradient background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, theme.colors[0] + '20');
      grad.addColorStop(0.5, '#0a0a1a');
      grad.addColorStop(1, theme.colors[1] + '20');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Background particles (starfield / dots)
      bgParticles.current.forEach(p => {
        p.y -= p.speed * (1 + t * 3);
        if (p.y < 0) { p.y = H; p.x = Math.random() * W; }
        ctx.globalAlpha = p.alpha * (0.3 + t * 0.5);
        ctx.fillStyle = theme.colors[Math.floor(Math.random() * 3)];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + t), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Vignette
      const vignette = ctx.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.7);
      vignette.addColorStop(0, 'transparent');
      vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Phase-specific animations
      const cx = W / 2;
      const cy = H / 2;

      // Phase 0: Energy buildup — converging particles, pulsing ring
      if (phase === 0) {
        const p0t = t / 0.2;
        // Pulsing energy ring
        const ringSize = 150 * (1 - p0t * 0.5) + Math.sin(elapsed * 0.01) * 10;
        ctx.strokeStyle = theme.colors[0];
        ctx.lineWidth = 2 + p0t * 3;
        ctx.globalAlpha = p0t * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, ringSize, 0, Math.PI * 2);
        ctx.stroke();

        // Second ring
        ctx.strokeStyle = theme.colors[1];
        ctx.lineWidth = 1 + p0t * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringSize * 0.7, elapsed * 0.002, elapsed * 0.002 + Math.PI * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Spawn converging particles
        if (Math.random() < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 200 + Math.random() * 100;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          particles.current.push(new IntroParticle(px, py, {
            vx: (cx - px) * 0.03,
            vy: (cy - py) * 0.03,
            size: Math.random() * 3 + 1,
            color: theme.colors[Math.floor(Math.random() * 3)],
            maxLife: 40,
            shape: theme.particleShapes[Math.floor(Math.random() * 3)],
          }));
        }
      }

      // Phase 1: Title reveal with cinematic text
      if (phase >= 1) {
        const p1t = phase === 1 ? (t - 0.2) / 0.25 : 1;
        const titleAlpha = Math.min(p1t * 2, 1);
        const titleScale = 0.8 + Math.min(p1t, 1) * 0.2;
        const titleY = cy - 30 + (1 - Math.min(p1t, 1)) * 30;

        ctx.save();
        ctx.translate(cx, titleY);
        ctx.scale(titleScale, titleScale);

        // Glow behind text
        ctx.shadowColor = theme.colors[0];
        ctx.shadowBlur = 30 + Math.sin(elapsed * 0.005) * 10;
        ctx.globalAlpha = titleAlpha * 0.5;
        ctx.fillStyle = theme.colors[0];
        ctx.font = `bold ${Math.min(W * 0.07, 48)}px 'Poppins', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 0, 0);

        // Main text
        ctx.shadowBlur = 0;
        ctx.globalAlpha = titleAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(title, 0, 0);

        // Underline sweep
        if (p1t > 0.5) {
          const lineProgress = (p1t - 0.5) * 2;
          const metrics = ctx.measureText(title);
          const lineWidth = metrics.width * lineProgress;
          const lineGrad = ctx.createLinearGradient(-lineWidth / 2, 0, lineWidth / 2, 0);
          lineGrad.addColorStop(0, theme.colors[0]);
          lineGrad.addColorStop(1, theme.colors[1]);
          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-lineWidth / 2, 30);
          ctx.lineTo(lineWidth / 2, 30);
          ctx.stroke();
        }

        ctx.restore();

        // Burst particles on title reveal
        if (p1t > 0.3 && p1t < 0.35) {
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            particles.current.push(new IntroParticle(cx, titleY, {
              vx: Math.cos(angle) * (3 + Math.random() * 3),
              vy: Math.sin(angle) * (3 + Math.random() * 3),
              size: Math.random() * 4 + 2,
              color: theme.colors[Math.floor(Math.random() * theme.colors.length)],
              maxLife: 50,
              shape: theme.particleShapes[Math.floor(Math.random() * 3)],
            }));
          }
        }
      }

      // Phase 2: Subtitle + icon
      if (phase >= 2) {
        const p2t = phase === 2 ? (t - 0.45) / 0.2 : 1;

        // Subtitle
        ctx.globalAlpha = Math.min(p2t * 2, 1) * 0.8;
        ctx.font = `600 ${Math.min(W * 0.025, 16)}px 'Inter', sans-serif`;
        ctx.fillStyle = theme.colors[2] || '#aaa';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '4px';
        const subtitleText = theme.subtitle;
        ctx.fillText(subtitleText, cx, cy + 25);

        // Icon with bounce
        const iconAlpha = Math.min(p2t * 1.5, 1);
        const iconScale = p2t < 0.3 ? p2t / 0.3 * 1.2 : 1 + Math.sin(elapsed * 0.008) * 0.05;
        ctx.globalAlpha = iconAlpha;
        ctx.font = `${Math.min(W * 0.12, 80) * iconScale}px serif`;
        ctx.fillText(icon, cx, cy - 90);
        ctx.globalAlpha = 1;
      }

      // Phase 3: Icon burst + engine name
      if (phase >= 3) {
        const p3t = (t - 0.65) / 0.2;

        // Engine badge
        ctx.globalAlpha = Math.min(p3t * 2, 1) * 0.6;
        ctx.font = `bold ${Math.min(W * 0.018, 12)}px 'Inter', sans-serif`;
        ctx.fillStyle = theme.colors[0];
        const badgeText = `${engine.replace(/([A-Z])/g, ' $1').trim()} Engine`;
        const badgeW = ctx.measureText(badgeText).width + 24;
        ctx.fillStyle = theme.colors[0] + '30';
        ctx.beginPath();
        ctx.roundRect(cx - badgeW / 2, cy + 55, badgeW, 28, 14);
        ctx.fill();
        ctx.fillStyle = theme.colors[0];
        ctx.fillText(badgeText, cx, cy + 73);
        ctx.globalAlpha = 1;

        // Orbiting particles
        if (p3t > 0 && Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          particles.current.push(new IntroParticle(cx + Math.cos(angle) * 120, cy + Math.sin(angle) * 120, {
            vx: Math.cos(angle + Math.PI / 2) * 2,
            vy: Math.sin(angle + Math.PI / 2) * 2,
            size: Math.random() * 3 + 1,
            color: theme.colors[Math.floor(Math.random() * 3)],
            maxLife: 30,
            shape: 'spark',
          }));
        }
      }

      // Phase 4: Fade out
      if (phase === 4) {
        const p4t = (t - 0.85) / 0.15;
        ctx.fillStyle = `rgba(0,0,0,${p4t * 0.8})`;
        ctx.fillRect(0, 0, W, H);

        // "GET READY" text
        if (p4t > 0.3) {
          ctx.globalAlpha = Math.min((p4t - 0.3) * 3, 1);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.min(W * 0.05, 36)}px 'Poppins', 'Inter', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('GET READY!', cx, cy);
          ctx.globalAlpha = 1;
        }
      }

      // Update & draw particles
      particles.current = particles.current.filter(p => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
      });

      // Progress bar at bottom
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, H - 4, W, 4);
      const progGrad = ctx.createLinearGradient(0, 0, W * t, 0);
      progGrad.addColorStop(0, theme.colors[0]);
      progGrad.addColorStop(1, theme.colors[1]);
      ctx.fillStyle = progGrad;
      ctx.fillRect(0, H - 4, W * t, 4);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(skipTimer);
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [title, icon, engine, gradient, onComplete, duration, theme]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Skip button */}
      {canSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 px-4 py-2 bg-white/10 backdrop-blur-sm text-white/70
                     rounded-lg text-sm font-medium hover:bg-white/20 hover:text-white
                     transition-all duration-200 border border-white/10"
        >
          Skip Intro
        </button>
      )}

      {/* Loading text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 text-xs font-medium">
        Loading {title}... {Math.round(progress * 100)}%
      </div>
    </div>
  );
}
