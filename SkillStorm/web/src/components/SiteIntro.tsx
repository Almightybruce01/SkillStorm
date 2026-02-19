/* ═══════════════════════════════════════════════════════════
   SITE INTRO — 10-Second Animated Splash Screen
   Plays once per session when the site first loads
   Features: Logo reveal, particle burst, subject icons, tagline
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState, useCallback } from 'react';
import soundEngine from '../games/SoundEngine';

interface SiteIntroProps {
  onComplete: () => void;
}

const SUBJECT_ICONS = ['🔢', '🔬', '📖', '📝', '🏛️', '🌍', '💻', '🎨'];
const BRAND_COLORS = ['#6C5CE7', '#FD79A8', '#00CEC9', '#FDCB6E', '#6366f1', '#ec4899', '#10b981', '#f59e0b'];

interface Spark {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; alpha: number; life: number; maxLife: number;
  type: 'circle' | 'ring' | 'line';
}

export default function SiteIntro({ onComplete }: SiteIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const [canSkip, setCanSkip] = useState(false);
  const [phase, setPhase] = useState(0);

  const handleSkip = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    soundEngine.click();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const cx = W / 2;
    const cy = H / 2;

    const sparks: Spark[] = [];

    // Stars
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));

    // Orbiting icon positions
    const iconOrbit = SUBJECT_ICONS.map((icon, i) => ({
      icon,
      angle: (i / SUBJECT_ICONS.length) * Math.PI * 2,
      radius: Math.min(W, H) * 0.25,
      speed: 0.005 + Math.random() * 0.003,
    }));

    // Sound
    soundEngine.init();
    setTimeout(() => soundEngine.introWhoosh(), 500);
    setTimeout(() => soundEngine.introImpact(), 2500);
    setTimeout(() => soundEngine.introChime(), 5000);

    const skipTimer = setTimeout(() => setCanSkip(true), 2000);
    const startT = performance.now();
    const DURATION = 8000;

    const animate = (now: number) => {
      const elapsed = now - startT;
      const t = Math.min(elapsed / DURATION, 1);

      // Phase tracking
      let p: number;
      if (t < 0.15) p = 0;        // Dark buildup
      else if (t < 0.35) p = 1;   // Logo S appear
      else if (t < 0.55) p = 2;   // Full name + icons orbit
      else if (t < 0.75) p = 3;   // Tagline + stats
      else p = 4;                  // Fade out
      setPhase(p);

      // Background
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, W, H);

      // Subtle gradient pulse
      const pulseAlpha = 0.05 + Math.sin(elapsed * 0.002) * 0.03;
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
      bgGrad.addColorStop(0, `rgba(108,92,231,${pulseAlpha})`);
      bgGrad.addColorStop(0.5, `rgba(253,121,168,${pulseAlpha * 0.5})`);
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars
      stars.forEach(s => {
        s.twinkle += s.speed;
        const alpha = 0.3 + Math.sin(s.twinkle) * 0.3;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Phase 0: Energy converge
      if (p === 0) {
        const p0t = t / 0.15;
        // Convergence ring
        const ringR = 200 * (1 - p0t * 0.6);
        ctx.strokeStyle = `rgba(108,92,231,${p0t * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = `rgba(253,121,168,${p0t * 0.3})`;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR * 0.6, elapsed * 0.003, elapsed * 0.003 + Math.PI * 1.2);
        ctx.stroke();

        // Converging sparks
        if (Math.random() < 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 250;
          sparks.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (cx - (cx + Math.cos(angle) * dist)) * 0.04,
            vy: (cy - (cy + Math.sin(angle) * dist)) * 0.04,
            size: Math.random() * 3 + 1,
            color: BRAND_COLORS[Math.floor(Math.random() * BRAND_COLORS.length)],
            alpha: 1, life: 0, maxLife: 30,
            type: 'circle',
          });
        }
      }

      // Phase 1: Logo S reveal
      if (p >= 1) {
        const p1t = Math.min((t - 0.15) / 0.2, 1);
        const logoSize = Math.min(W * 0.12, 80);
        const logoScale = p1t < 0.3 ? (p1t / 0.3) * 1.15 : 1 + Math.sin(elapsed * 0.005) * 0.03;
        const logoY = cy - 40;

        ctx.save();
        ctx.translate(cx, logoY);
        ctx.scale(logoScale, logoScale);

        // Glow
        ctx.shadowColor = '#6C5CE7';
        ctx.shadowBlur = 40 * p1t;

        // Logo background
        const logoR = logoSize * 0.6;
        const logoGrad = ctx.createLinearGradient(-logoR, -logoR, logoR, logoR);
        logoGrad.addColorStop(0, '#6C5CE7');
        logoGrad.addColorStop(1, '#4f46e5');
        ctx.globalAlpha = p1t;
        ctx.fillStyle = logoGrad;
        ctx.beginPath();
        ctx.roundRect(-logoR, -logoR, logoR * 2, logoR * 2, logoR * 0.25);
        ctx.fill();

        // S letter
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${logoSize * 0.8}px 'Poppins', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1;

        // Burst on reveal
        if (p1t > 0.25 && p1t < 0.3) {
          for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            sparks.push({
              x: cx, y: logoY,
              vx: Math.cos(angle) * (4 + Math.random() * 4),
              vy: Math.sin(angle) * (4 + Math.random() * 4),
              size: Math.random() * 4 + 1,
              color: BRAND_COLORS[i % BRAND_COLORS.length],
              alpha: 1, life: 0, maxLife: 50,
              type: Math.random() > 0.5 ? 'circle' : 'ring',
            });
          }
        }
      }

      // Phase 2: Full brand name + orbiting icons
      if (p >= 2) {
        const p2t = Math.min((t - 0.35) / 0.2, 1);

        // Brand name
        ctx.globalAlpha = Math.min(p2t * 2, 1);
        ctx.font = `800 ${Math.min(W * 0.065, 44)}px 'Poppins', 'Inter', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Skillz', cx - 50, cy + 40);

        // "Storm" in gradient
        const stormGrad = ctx.createLinearGradient(cx - 10, cy + 40, cx + 80, cy + 40);
        stormGrad.addColorStop(0, '#6C5CE7');
        stormGrad.addColorStop(1, '#FD79A8');
        ctx.fillStyle = stormGrad;
        ctx.fillText('Storm', cx + 60, cy + 40);

        // Orbiting subject icons
        iconOrbit.forEach((io, idx) => {
          io.angle += io.speed;
          const orbitProgress = Math.min(p2t * 1.5, 1);
          const ix = cx + Math.cos(io.angle) * io.radius * orbitProgress;
          const iy = cy + Math.sin(io.angle) * io.radius * 0.5 * orbitProgress;
          const iconAlpha = orbitProgress * (0.4 + Math.sin(elapsed * 0.003 + idx) * 0.2);

          ctx.globalAlpha = iconAlpha;
          ctx.font = `${Math.min(W * 0.04, 28)}px serif`;
          ctx.textAlign = 'center';
          ctx.fillText(io.icon, ix, iy + 8);

          // Trail
          if (Math.random() < 0.1) {
            sparks.push({
              x: ix, y: iy,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              size: 2, color: BRAND_COLORS[idx % BRAND_COLORS.length],
              alpha: 0.5, life: 0, maxLife: 20,
              type: 'circle',
            });
          }
        });
        ctx.globalAlpha = 1;
      }

      // Phase 3: Tagline + stats
      if (p >= 3) {
        const p3t = Math.min((t - 0.55) / 0.2, 1);

        ctx.globalAlpha = Math.min(p3t * 2, 1) * 0.7;
        ctx.font = `500 ${Math.min(W * 0.022, 15)}px 'Inter', sans-serif`;
        ctx.fillStyle = '#a0a0b8';
        ctx.textAlign = 'center';
        ctx.fillText('Learn Through Play — 80+ Games Across 8 Subjects', cx, cy + 80);

        // Stats badges
        const stats = ['55+ Educational', '26+ Arcade', 'K-12 Grades'];
        const badgeY = cy + 115;
        const spacing = Math.min(W * 0.2, 140);

        stats.forEach((stat, i) => {
          const bx = cx + (i - 1) * spacing;
          const badgeAlpha = Math.min((p3t - i * 0.15) * 3, 1);
          if (badgeAlpha <= 0) return;

          ctx.globalAlpha = badgeAlpha * 0.8;
          ctx.fillStyle = 'rgba(108,92,231,0.15)';
          const tw = ctx.measureText(stat).width + 20;
          ctx.beginPath();
          ctx.roundRect(bx - tw / 2, badgeY - 12, tw, 28, 14);
          ctx.fill();
          ctx.fillStyle = '#a78bfa';
          ctx.font = `600 ${Math.min(W * 0.017, 12)}px 'Inter', sans-serif`;
          ctx.fillText(stat, bx, badgeY + 6);
        });
        ctx.globalAlpha = 1;
      }

      // Phase 4: Fade to white
      if (p === 4) {
        const p4t = (t - 0.75) / 0.25;

        // White flash then fade
        const flashAlpha = p4t < 0.2 ? p4t * 5 * 0.3 : 0.3 * (1 - (p4t - 0.2) / 0.8);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(flashAlpha, 0)})`;
        ctx.fillRect(0, 0, W, H);

        // Final fade to white
        if (p4t > 0.5) {
          ctx.fillStyle = `rgba(255,255,255,${(p4t - 0.5) * 2})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Update sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03;
        s.vx *= 0.98;
        s.life++;
        s.alpha = Math.max(0, 1 - s.life / s.maxLife);

        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.strokeStyle = s.color;

        if (s.type === 'ring') {
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (s.type === 'line') {
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 3, s.y - s.vy * 3);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }

        if (s.life >= s.maxLife) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // Progress bar
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(W * 0.2, H - 3, W * 0.6, 3);
      const pGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.2 + W * 0.6 * t, 0);
      pGrad.addColorStop(0, '#6C5CE7');
      pGrad.addColorStop(1, '#FD79A8');
      ctx.fillStyle = pGrad;
      ctx.fillRect(W * 0.2, H - 3, W * 0.6 * t, 3);

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
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[99999] bg-[#050510]">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {canSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 px-4 py-2 bg-white/5 backdrop-blur-sm text-white/50
                     rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white/80
                     transition-all border border-white/10"
        >
          Skip
        </button>
      )}
    </div>
  );
}
