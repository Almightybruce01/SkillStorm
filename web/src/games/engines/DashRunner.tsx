/* ═══════════════════════════════════════════════════════════
   DASH RUNNER ENGINE — ELITE EDITION
   Used by: SkillDash, Bull Run, Equation Escape, Sentence Sprint, etc.
   Features: multi-biome parallax, double jump, slide, power-ups,
   weather effects, combo system, moving platforms, screen shake,
   knowledge gates between levels
   ═══════════════════════════════════════════════════════════ */
import { useRef, useEffect, useState, useCallback } from 'react';
import { generateMathQuestion, type Grade } from '../questionBank';
import { sfxJump, sfxCoin, sfxWrong, sfxCorrect, sfxGameOver, sfxLevelUp, sfxExplosion, sfxPop } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
interface Biome {
  name: string;
  sky1: string; sky2: string; ground: string; groundLine: string;
  fgColor: string; bgColor: string; weather: 'none' | 'rain' | 'snow' | 'leaves' | 'sand' | 'stars';
  bgElements: 'buildings' | 'trees' | 'mountains' | 'icicles' | 'planets';
}
interface Theme {
  name: string; player: string; accent: string;
  biomes: Biome[];
}
type PowerupKind = 'shield' | 'magnet' | 'boost' | 'double' | 'tiny';
interface Powerup { x: number; y: number; kind: PowerupKind; collected: boolean; }
interface Obstacle { x: number; w: number; h: number; type: 'spike' | 'wall' | 'saw' | 'bird' | 'low'; }
interface Coin { x: number; y: number; collected: boolean; value: number; }
interface Platform { x: number; y: number; w: number; moving: boolean; baseY: number; phase: number; }
interface WeatherDrop { x: number; y: number; vx: number; vy: number; size: number; opacity: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface FloatingText { x: number; y: number; text: string; life: number; color: string; }

/* ─── Biome Definitions ─────────────────────────────────── */
const BIOMES: Biome[] = [
  { name: 'City', sky1: '#e0e7ff', sky2: '#c7d2fe', ground: '#6366f1', groundLine: '#818cf8', fgColor: '#4338ca', bgColor: '#c7d2fe40', weather: 'none', bgElements: 'buildings' },
  { name: 'Forest', sky1: '#d1fae5', sky2: '#a7f3d0', ground: '#059669', groundLine: '#34d399', fgColor: '#047857', bgColor: '#a7f3d040', weather: 'leaves', bgElements: 'trees' },
  { name: 'Desert', sky1: '#fef3c7', sky2: '#fde68a', ground: '#d97706', groundLine: '#f59e0b', fgColor: '#b45309', bgColor: '#fde68a30', weather: 'sand', bgElements: 'mountains' },
  { name: 'Arctic', sky1: '#e0f2fe', sky2: '#bae6fd', ground: '#0284c7', groundLine: '#38bdf8', fgColor: '#0369a1', bgColor: '#bae6fd30', weather: 'snow', bgElements: 'icicles' },
  { name: 'Space', sky1: '#1e1b4b', sky2: '#0f0a2e', ground: '#6d28d9', groundLine: '#a78bfa', fgColor: '#4c1d95', bgColor: '#a78bfa15', weather: 'stars', bgElements: 'planets' },
];

const themes: Record<string, Theme> = {
  skilldash:        { name: 'SkillDash',       player: '#3b82f6', accent: '#3b82f6', biomes: BIOMES },
  bull_run_logic:   { name: 'Bull Run',        player: '#f97316', accent: '#f97316', biomes: BIOMES },
  equation_escape:  { name: 'Equation Escape', player: '#10b981', accent: '#10b981', biomes: BIOMES },
  sentence_sprint:  { name: 'Sentence Sprint', player: '#8b5cf6', accent: '#8b5cf6', biomes: BIOMES },
  default:          { name: 'Storm Dash',      player: '#3b82f6', accent: '#3b82f6', biomes: BIOMES },
};

const POWERUP_COLORS: Record<PowerupKind, string> = {
  shield: '#3b82f6', magnet: '#f59e0b', boost: '#ef4444', double: '#10b981', tiny: '#8b5cf6',
};
const POWERUP_EMOJI: Record<PowerupKind, string> = {
  shield: '🛡️', magnet: '🧲', boost: '🚀', double: '×2', tiny: '🐭',
};

/* ─── Component ─────────────────────────────────────────── */
export function DashRunner({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = themes[gameId] || themes.default;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_dash`) || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [gateActive, setGateActive] = useState(false);
  const [gateQ, setGateQ] = useState(generateMathQuestion(grade));
  const [activePowerups, setActivePowerups] = useState<{ kind: PowerupKind; timer: number }[]>([]);
  const stateRef = useRef({
    score: 0, lives: 3, level: 1, gameOver: false, distance: 0,
    gateActive: false, combo: 0, shakeTimer: 0,
    powers: {} as Partial<Record<PowerupKind, number>>,
  });

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width = rect.width * dpr;
    const H = canvas.height = rect.height * dpr;

    const GROUND_Y = H * 0.78;
    const PLAYER_W = 28 * dpr;
    const PLAYER_H = 36 * dpr;
    const playerX = W * 0.18;
    let playerY = GROUND_Y;
    let playerVY = 0;
    let jumpCount = 0;      // 0 = grounded, 1 = single jump, 2 = double jump
    let isSliding = false;
    let slideTimer = 0;
    const MAX_SLIDE = 40;
    let speed = 4 * dpr;
    let distance = 0;
    let frame = 0;
    const st = stateRef.current;
    let biome = theme.biomes[0];

    let obstacles: Obstacle[] = [];
    let coins: Coin[] = [];
    let platforms: Platform[] = [];
    let powerups: Powerup[] = [];
    let particles: Particle[] = [];
    let weather: WeatherDrop[] = [];
    let floatingTexts: FloatingText[] = [];
    let bgLayers: { x: number; y: number; w: number; h: number; layer: number; seed: number }[] = [];

    // Background layer generation
    for (let layer = 0; layer < 3; layer++) {
      for (let i = 0; i < 15; i++) {
        bgLayers.push({
          x: Math.random() * W * 4,
          y: GROUND_Y,
          w: (20 + Math.random() * 60) * dpr,
          h: (30 + Math.random() * (80 + layer * 40)) * dpr,
          layer,
          seed: Math.random(),
        });
      }
    }

    // Initialize weather
    for (let i = 0; i < 60; i++) {
      weather.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: -1 - Math.random(), vy: 2 + Math.random() * 3,
        size: 1 + Math.random() * 2, opacity: 0.2 + Math.random() * 0.5,
      });
    }

    /* ─── Spawning ─────────────────────────────────── */
    function spawnObstacle() {
      const types: Obstacle['type'][] = ['spike', 'wall', 'saw', 'bird', 'low'];
      const weights = [3, 2, st.level > 2 ? 2 : 0, st.level > 3 ? 1 : 0, st.level > 1 ? 2 : 0];
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let type: Obstacle['type'] = 'spike';
      for (let i = 0; i < types.length; i++) {
        r -= weights[i];
        if (r <= 0) { type = types[i]; break; }
      }

      const h = type === 'spike' ? (25 + Math.random() * 20) * dpr
        : type === 'wall' ? (45 + Math.random() * 35) * dpr
        : type === 'saw' ? 22 * dpr
        : type === 'bird' ? 18 * dpr
        : 20 * dpr; // low
      const w = type === 'low' ? (50 + Math.random() * 40) * dpr : (18 + Math.random() * 14) * dpr;

      obstacles.push({ x: W + 50, w, h, type });

      // Coins near obstacles
      if (Math.random() > 0.3) {
        const numCoins = 1 + Math.floor(Math.random() * 3);
        for (let c = 0; c < numCoins; c++) {
          coins.push({
            x: W + 50 + c * 22 * dpr,
            y: type === 'bird' ? GROUND_Y - 100 * dpr - Math.random() * 30 * dpr : GROUND_Y - h - 30 * dpr - Math.random() * 40 * dpr,
            collected: false,
            value: Math.random() > 0.85 ? 10 : 5,
          });
        }
      }
    }

    function spawnPlatform() {
      const moving = Math.random() > 0.6;
      const y = GROUND_Y - (80 + Math.random() * 100) * dpr;
      platforms.push({
        x: W + 100, y, w: (60 + Math.random() * 50) * dpr,
        moving, baseY: y, phase: Math.random() * Math.PI * 2,
      });
      // Coins on platform
      coins.push({ x: W + 120, y: y - 20 * dpr, collected: false, value: 5 });
    }

    function spawnPowerup() {
      const kinds: PowerupKind[] = ['shield', 'magnet', 'boost', 'double', 'tiny'];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      powerups.push({ x: W + 80, y: GROUND_Y - (60 + Math.random() * 80) * dpr, kind, collected: false });
    }

    /* ─── Player actions ──────────────────────────── */
    function jump() {
      if (st.gameOver || st.gateActive) return;
      if (jumpCount < 2) {
        if (isSliding) { isSliding = false; slideTimer = 0; }
        playerVY = jumpCount === 0 ? -16 * dpr : -13 * dpr;
        jumpCount++;
        sfxJump();
        // Jump particles
        for (let i = 0; i < 6; i++) {
          particles.push({
            x: playerX, y: playerY,
            vx: (Math.random() - 0.5) * 4 * dpr, vy: Math.random() * 3 * dpr,
            life: 15, maxLife: 15, color: theme.accent, size: 3 * dpr,
          });
        }
      }
    }

    function slide() {
      if (st.gameOver || st.gateActive || jumpCount > 0) return;
      isSliding = true;
      slideTimer = MAX_SLIDE;
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jump(); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); slide(); }
    };
    const onTap = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as MouseEvent).clientY;
      if (clientY > rect.top + rect.height * 0.6) slide();
      else jump();
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTap, { passive: false });

    /* ─── Helpers ──────────────────────────────────── */
    function hasPower(kind: PowerupKind): boolean { return (st.powers[kind] || 0) > 0; }

    function addShake(amount: number) { st.shakeTimer = Math.max(st.shakeTimer, amount); }

    function emitParticles(x: number, y: number, count: number, color: string, spread = 5) {
      for (let i = 0; i < count; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * spread * dpr,
          vy: (Math.random() - 0.5) * spread * dpr,
          life: 12 + Math.random() * 12,
          maxLife: 24,
          color,
          size: (2 + Math.random() * 3) * dpr,
        });
      }
    }

    /* ─── Update ──────────────────────────────────── */
    function update() {
      if (st.gameOver || st.gateActive) return;
      frame++;

      // Biome changes per level
      biome = theme.biomes[(st.level - 1) % theme.biomes.length];

      // Speed scaling
      const boostMul = hasPower('boost') ? 1.6 : 1;
      speed = (4 + st.level * 0.6) * dpr * boostMul;
      distance += speed;
      st.distance = distance;

      // Slide timer
      if (isSliding) {
        slideTimer--;
        if (slideTimer <= 0) isSliding = false;
      }

      // Player physics
      playerVY += 0.9 * dpr;
      playerY += playerVY;

      // Platform collision (land on top)
      let onPlatform = false;
      platforms.forEach(p => {
        if (p.moving) p.y = p.baseY + Math.sin(frame * 0.03 + p.phase) * 25 * dpr;
        if (playerVY > 0 && playerX > p.x && playerX < p.x + p.w &&
            playerY >= p.y - 2 * dpr && playerY <= p.y + 8 * dpr) {
          playerY = p.y;
          playerVY = 0;
          jumpCount = 0;
          onPlatform = true;
        }
      });

      if (playerY >= GROUND_Y && !onPlatform) {
        playerY = GROUND_Y;
        playerVY = 0;
        jumpCount = 0;
      }

      // Spawn logic
      if (frame % Math.max(30, 65 - st.level * 3) === 0) spawnObstacle();
      if (frame % 180 === 0 && st.level > 1) spawnPlatform();
      if (frame % 400 === 0) spawnPowerup();

      // Player hitbox
      const pH = isSliding ? PLAYER_H * 0.45 : PLAYER_H;
      const pTop = playerY - pH;
      const pLeft = playerX - PLAYER_W / 2;
      const pRight = playerX + PLAYER_W / 2;

      // Obstacle collision
      obstacles = obstacles.filter(o => {
        o.x -= speed;
        // Bird moves slightly vertically
        if (o.type === 'bird') o.h = 18 * dpr + Math.sin(frame * 0.08 + o.x) * 8 * dpr;

        const ox1 = o.x;
        const ox2 = o.x + o.w;
        const oy = o.type === 'bird' ? GROUND_Y - 60 * dpr - o.h : GROUND_Y - o.h;
        const oyBottom = o.type === 'bird' ? GROUND_Y - 60 * dpr : GROUND_Y;

        // Low obstacles: must slide
        if (o.type === 'low') {
          if (pRight > ox1 && pLeft < ox2 && !isSliding && playerY > GROUND_Y - o.h * 2) {
            return hitPlayer(o);
          }
        } else {
          if (pRight > ox1 && pLeft < ox2 && playerY > oy && pTop < oyBottom) {
            return hitPlayer(o);
          }
        }
        return o.x > -80 * dpr;
      });

      // Coins
      const magnetRange = hasPower('magnet') ? 120 * dpr : 25 * dpr;
      coins = coins.filter(c => {
        c.x -= speed;
        const dist = Math.hypot(c.x - playerX, c.y - playerY);
        // Magnet pull
        if (!c.collected && hasPower('magnet') && dist < magnetRange) {
          c.x += (playerX - c.x) * 0.15;
          c.y += (playerY - c.y) * 0.15;
        }
        if (!c.collected && dist < 20 * dpr) {
          c.collected = true;
          const mul = hasPower('double') ? 2 : 1;
          st.score += c.value * mul;
          st.combo++;
          setScore(st.score);
          setCombo(st.combo);
          sfxCoin();
          emitParticles(c.x, c.y, 6, '#f59e0b');
          if (st.combo > 0 && st.combo % 5 === 0) {
            floatingTexts.push({ x: c.x, y: c.y - 20 * dpr, text: `${st.combo}x COMBO!`, life: 40, color: '#f59e0b' });
          }
          return false;
        }
        return c.x > -30 * dpr;
      });

      // Platforms scroll
      platforms = platforms.filter(p => { p.x -= speed; return p.x > -p.w; });

      // Powerups
      powerups = powerups.filter(p => {
        p.x -= speed;
        if (!p.collected && Math.hypot(p.x - playerX, p.y - playerY) < 22 * dpr) {
          p.collected = true;
          st.powers[p.kind] = 300; // 5 seconds at 60fps
          sfxPop();
          emitParticles(p.x, p.y, 10, POWERUP_COLORS[p.kind], 8);
          floatingTexts.push({ x: p.x, y: p.y - 15 * dpr, text: POWERUP_EMOJI[p.kind], life: 30, color: POWERUP_COLORS[p.kind] });
          return false;
        }
        return p.x > -30 * dpr;
      });

      // Update power timers
      for (const k of Object.keys(st.powers) as PowerupKind[]) {
        if (st.powers[k]! > 0) st.powers[k]!--;
        else delete st.powers[k];
      }
      setActivePowerups(Object.entries(st.powers).filter(([, v]) => v! > 0).map(([k, v]) => ({ kind: k as PowerupKind, timer: v! })));

      // BG layers scroll with parallax
      bgLayers.forEach(b => {
        const pSpeed = speed * (0.15 + b.layer * 0.1);
        b.x -= pSpeed;
        if (b.x < -b.w) b.x += W * 4;
      });

      // Weather
      weather.forEach(w => {
        w.x += w.vx - speed * 0.2;
        w.y += w.vy;
        if (w.y > H) { w.y = -5; w.x = Math.random() * W; }
        if (w.x < -20) w.x = W + 20;
      });

      // Particles
      particles = particles.filter(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.15 * dpr;
        p.life--;
        return p.life > 0;
      });

      // Floating texts
      floatingTexts = floatingTexts.filter(f => { f.y -= 1.5 * dpr; f.life--; return f.life > 0; });

      // Screen shake
      if (st.shakeTimer > 0) st.shakeTimer--;

      // Knowledge Gate every 600 distance
      if (distance > 200 && Math.floor(distance) % 600 < speed) {
        st.gateActive = true;
        setGateActive(true);
        setGateQ(generateMathQuestion(grade));
      }
    }

    function hitPlayer(_o: Obstacle): boolean {
      if (hasPower('shield')) {
        st.powers.shield = 0;
        sfxExplosion();
        emitParticles(playerX, playerY, 15, '#3b82f6', 10);
        addShake(8);
        return false; // remove obstacle
      }
      if (hasPower('tiny')) return true; // tiny = invincible-ish

      st.lives--;
      st.combo = 0;
      setLives(st.lives);
      setCombo(0);
      sfxWrong();
      addShake(12);
      emitParticles(playerX, playerY, 15, '#ef4444', 8);
      if (st.lives <= 0) {
        st.gameOver = true;
        setGameOver(true);
        sfxGameOver();
        if (st.score > highScore) {
          setHighScore(st.score);
          localStorage.setItem(`sz_hs_${gameId}_dash`, String(st.score));
        }
      }
      return false;
    }

    /* ─── Draw ────────────────────────────────────── */
    function draw() {
      if (!ctx) return;
      ctx.save();

      // Screen shake
      if (st.shakeTimer > 0) {
        const intensity = st.shakeTimer * 0.6 * dpr;
        ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
      }

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, biome.sky1);
      sky.addColorStop(1, biome.sky2);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // BG layers
      bgLayers.forEach(b => {
        const alpha = 0.06 + b.layer * 0.04;
        ctx.fillStyle = `${biome.fgColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        if (biome.bgElements === 'buildings') {
          ctx.fillRect(b.x, b.y - b.h, b.w, b.h);
          // Windows
          ctx.fillStyle = `rgba(255,255,255,${0.05 + b.seed * 0.08})`;
          for (let wy = b.y - b.h + 8 * dpr; wy < b.y - 6 * dpr; wy += 14 * dpr) {
            for (let wx = b.x + 4 * dpr; wx < b.x + b.w - 4 * dpr; wx += 10 * dpr) {
              if (Math.sin(wx + wy + b.seed * 100) > 0.3) ctx.fillRect(wx, wy, 5 * dpr, 6 * dpr);
            }
          }
        } else if (biome.bgElements === 'trees') {
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x + b.w / 2, b.y - b.h);
          ctx.lineTo(b.x + b.w, b.y);
          ctx.closePath();
          ctx.fill();
          ctx.fillRect(b.x + b.w / 2 - 3 * dpr, b.y - 10 * dpr, 6 * dpr, 10 * dpr);
        } else if (biome.bgElements === 'mountains') {
          ctx.beginPath();
          ctx.moveTo(b.x - b.w * 0.3, b.y);
          ctx.quadraticCurveTo(b.x + b.w / 2, b.y - b.h * 1.2, b.x + b.w * 1.3, b.y);
          ctx.closePath();
          ctx.fill();
        } else if (biome.bgElements === 'icicles') {
          ctx.fillRect(b.x, 0, b.w * 0.4, b.h * 0.4);
          ctx.beginPath();
          ctx.moveTo(b.x, b.h * 0.4);
          ctx.lineTo(b.x + b.w * 0.2, b.h * 0.4 + b.h * 0.15);
          ctx.lineTo(b.x + b.w * 0.4, b.h * 0.4);
          ctx.closePath();
          ctx.fill();
        } else { // planets
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, b.y - b.h * 0.8, b.w * 0.4, 0, Math.PI * 2);
          ctx.fill();
          // Ring
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.ellipse(b.x + b.w / 2, b.y - b.h * 0.8, b.w * 0.6, b.w * 0.15, 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Weather
      weather.forEach(w => {
        ctx.globalAlpha = w.opacity;
        ctx.fillStyle = biome.weather === 'snow' ? '#ffffff'
          : biome.weather === 'rain' ? '#93c5fd'
          : biome.weather === 'leaves' ? '#f97316'
          : biome.weather === 'sand' ? '#d4a056'
          : '#e0e7ff'; // stars
        if (biome.weather === 'rain') {
          ctx.fillRect(w.x, w.y, 1.5 * dpr, 6 * dpr);
        } else if (biome.weather === 'stars') {
          ctx.fillRect(w.x, w.y, w.size * dpr, w.size * dpr);
        } else {
          ctx.beginPath();
          ctx.arc(w.x, w.y, w.size * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Ground
      ctx.fillStyle = biome.ground;
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = biome.groundLine;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();

      // Ground texture (scrolling dashes)
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = biome.groundLine;
      for (let x = -(speed * frame % (40 * dpr)); x < W; x += 40 * dpr) {
        ctx.beginPath(); ctx.moveTo(x, GROUND_Y + 8 * dpr); ctx.lineTo(x + 20 * dpr, GROUND_Y + 8 * dpr); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Platforms
      platforms.forEach(p => {
        ctx.fillStyle = biome.groundLine;
        ctx.shadowColor = biome.groundLine;
        ctx.shadowBlur = 6 * dpr;
        const r = 4 * dpr;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, 8 * dpr, r);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Glow dots
        ctx.fillStyle = '#ffffff40';
        ctx.fillRect(p.x + 6 * dpr, p.y + 2 * dpr, 4 * dpr, 3 * dpr);
        ctx.fillRect(p.x + p.w - 10 * dpr, p.y + 2 * dpr, 4 * dpr, 3 * dpr);
      });

      // Obstacles
      obstacles.forEach(o => {
        if (o.type === 'spike') {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8 * dpr;
          ctx.beginPath();
          ctx.moveTo(o.x, GROUND_Y);
          ctx.lineTo(o.x + o.w / 2, GROUND_Y - o.h);
          ctx.lineTo(o.x + o.w, GROUND_Y);
          ctx.closePath();
          ctx.fill();
        } else if (o.type === 'wall') {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 6 * dpr;
          ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
          // Stripes
          ctx.fillStyle = '#dc262640';
          for (let s = 0; s < o.h; s += 12 * dpr) {
            ctx.fillRect(o.x, GROUND_Y - o.h + s, o.w, 4 * dpr);
          }
        } else if (o.type === 'saw') {
          const cx = o.x + o.w / 2;
          const cy = GROUND_Y - 16 * dpr;
          const r = 14 * dpr;
          ctx.fillStyle = '#9ca3af';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 6 * dpr;
          ctx.beginPath();
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + frame * 0.12;
            const rr = i % 2 === 0 ? r : r * 0.7;
            ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
          }
          ctx.closePath();
          ctx.fill();
        } else if (o.type === 'bird') {
          const by = GROUND_Y - 60 * dpr - o.h;
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 6 * dpr;
          // Simple bird shape
          ctx.beginPath();
          ctx.ellipse(o.x + o.w / 2, by, o.w / 2, 8 * dpr, 0, 0, Math.PI * 2);
          ctx.fill();
          // Wings
          const wingY = Math.sin(frame * 0.15) * 6 * dpr;
          ctx.beginPath();
          ctx.moveTo(o.x, by);
          ctx.quadraticCurveTo(o.x - 8 * dpr, by - 10 * dpr + wingY, o.x - 14 * dpr, by + wingY);
          ctx.moveTo(o.x + o.w, by);
          ctx.quadraticCurveTo(o.x + o.w + 8 * dpr, by - 10 * dpr + wingY, o.x + o.w + 14 * dpr, by + wingY);
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2 * dpr;
          ctx.stroke();
        } else if (o.type === 'low') {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 6 * dpr;
          ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
          // Arrow indicating slide
          ctx.fillStyle = '#ffffff60';
          ctx.font = `bold ${10 * dpr}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('↓', o.x + o.w / 2, GROUND_Y - o.h - 5 * dpr);
        }
        ctx.shadowBlur = 0;
      });

      // Coins
      coins.forEach(c => {
        if (c.collected) return;
        const bob = Math.sin(frame * 0.06 + c.x * 0.01) * 3 * dpr;
        ctx.fillStyle = c.value >= 10 ? '#ec4899' : '#f59e0b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8 * dpr;
        ctx.beginPath();
        ctx.arc(c.x, c.y + bob, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff60';
        ctx.beginPath();
        ctx.arc(c.x - 2 * dpr, c.y + bob - 2 * dpr, 2 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Powerups
      powerups.forEach(p => {
        if (p.collected) return;
        const bob = Math.sin(frame * 0.05 + p.x * 0.01) * 4 * dpr;
        const glow = 0.5 + 0.3 * Math.sin(frame * 0.08);
        ctx.fillStyle = POWERUP_COLORS[p.kind];
        ctx.shadowColor = POWERUP_COLORS[p.kind];
        ctx.shadowBlur = 12 * dpr * glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 11 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `${11 * dpr}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(POWERUP_EMOJI[p.kind], p.x, p.y + bob);
        ctx.shadowBlur = 0;
      });

      // ── Player ────────────────────────────────────
      ctx.save();
      ctx.translate(playerX, playerY);
      const squash = jumpCount > 0 ? 0.9 : (isSliding ? 0.5 : 1);
      const stretch = jumpCount > 0 ? 1.15 : (isSliding ? 1.5 : 1);
      ctx.scale(stretch, squash);

      // Shield glow
      if (hasPower('shield')) {
        ctx.strokeStyle = '#3b82f660';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.arc(0, -PLAYER_H / 2, PLAYER_H * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Body
      ctx.fillStyle = theme.player;
      ctx.shadowColor = theme.player;
      ctx.shadowBlur = 12 * dpr;
      const bH = isSliding ? PLAYER_H * 0.45 : PLAYER_H;
      ctx.beginPath();
      ctx.roundRect(-PLAYER_W / 2, -bH, PLAYER_W, bH, 5 * dpr);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Face
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(PLAYER_W / 4 - 4 * dpr, -bH + 6 * dpr, 7 * dpr, 7 * dpr);
      ctx.fillStyle = '#000000';
      ctx.fillRect(PLAYER_W / 4 - 1 * dpr, -bH + 9 * dpr, 4 * dpr, 3 * dpr);

      // Running legs
      if (jumpCount === 0 && !isSliding) {
        const leg = Math.sin(frame * 0.25) * 5 * dpr;
        ctx.fillStyle = theme.player;
        ctx.fillRect(-5 * dpr, 0, 5 * dpr, 3 * dpr + leg);
        ctx.fillRect(3 * dpr, 0, 5 * dpr, 3 * dpr - leg);
      }

      // Speed lines when boosted
      if (hasPower('boost')) {
        ctx.strokeStyle = `${theme.accent}40`;
        ctx.lineWidth = 1.5 * dpr;
        for (let i = 0; i < 3; i++) {
          const ly = -bH / 2 + (i - 1) * 8 * dpr;
          ctx.beginPath();
          ctx.moveTo(-PLAYER_W, ly);
          ctx.lineTo(-PLAYER_W - 20 * dpr - Math.random() * 10 * dpr, ly);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Trail particles
      if (frame % 2 === 0 && !st.gateActive) {
        particles.push({
          x: playerX - PLAYER_W / 2, y: playerY - 4 * dpr,
          vx: (-2 - Math.random()) * dpr, vy: (Math.random() - 0.5) * dpr,
          life: 10, maxLife: 10, color: `${theme.player}50`, size: 3 * dpr,
        });
      }

      // Particles
      particles.forEach(p => {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Floating texts
      floatingTexts.forEach(f => {
        ctx.globalAlpha = f.life / 40;
        ctx.fillStyle = f.color;
        ctx.font = `bold ${14 * dpr}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1;

      // ── HUD ───────────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.roundRect(W - 110 * dpr, 8 * dpr, 100 * dpr, 28 * dpr, 6 * dpr);
      ctx.fill();
      ctx.fillStyle = '#ffffffcc';
      ctx.font = `bold ${11 * dpr}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(distance)}m`, W - 18 * dpr, 27 * dpr);

      // Biome name
      ctx.fillStyle = '#ffffff60';
      ctx.font = `${9 * dpr}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(biome.name, 12 * dpr, 22 * dpr);

      ctx.restore();
    }

    /* ─── Game loop ───────────────────────────────── */
    let animId: number;
    function loop() {
      update();
      draw();
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onTap);
    };
  }, [grade, gameId, theme, gameOver, highScore]);

  useEffect(() => {
    const st = stateRef.current;
    st.score = score; st.lives = lives; st.level = level;
    st.gameOver = gameOver; st.gateActive = gateActive; st.combo = combo;
  }, [score, lives, level, gameOver, gateActive, combo]);

  useEffect(() => {
    if (gameOver || gateActive) return;
    const cleanup = startGame();
    return cleanup;
  }, [startGame, gameOver, gateActive]);

  /* ─── Knowledge Gate handler ─────────────────── */
  const handleGateAnswer = (opt: string) => {
    const st = stateRef.current;
    if (opt === gateQ.answer) {
      st.score += 25;
      st.level++;
      setScore(st.score);
      setLevel(st.level);
      sfxCorrect();
      sfxLevelUp();
    } else {
      st.lives--;
      setLives(st.lives);
      sfxWrong();
      if (st.lives <= 0) { st.gameOver = true; setGameOver(true); sfxGameOver(); }
    }
    st.gateActive = false;
    setGateActive(false);
  };

  const restart = () => {
    setScore(0); setLives(3); setLevel(1); setCombo(0);
    setGameOver(false); setGateActive(false);
    setActivePowerups([]);
    stateRef.current = { score: 0, lives: 3, level: 1, gameOver: false, distance: 0, gateActive: false, combo: 0, shakeTimer: 0, powers: {} };
  };

  const biome = theme.biomes[(level - 1) % theme.biomes.length];

  return (
    <div className="game-card !p-0 overflow-hidden animate-pop-in" style={{ border: `1px solid ${theme.accent}30` }}>
      {/* ── Top bar ──────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${theme.accent}08` }}>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black" style={{ color: theme.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">LVL {level}</span>
          {combo > 2 && <span className="text-[10px] font-black text-amber-500 animate-pulse">{combo}× COMBO</span>}
          <span className="text-xs">{Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join('')}</span>
        </div>
        <div className="flex items-center gap-2">
          {activePowerups.map(p => (
            <span key={p.kind} className="text-sm animate-pop-in" title={p.kind}>{POWERUP_EMOJI[p.kind]}</span>
          ))}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────── */}
      <div className="relative" style={{ height: '420px' }}>
        {/* Game Over overlay */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-white/90 backdrop-blur-md">
            <div className="text-6xl mb-3 animate-bounce">💥</div>
            <h3 className="text-3xl font-black text-gray-800 mb-1">Game Over!</h3>
            <p className="text-4xl font-black mb-1" style={{ color: theme.accent }}>{score} pts</p>
            <p className="text-gray-400 text-sm mb-1">Level {level} — {biome.name}</p>
            {score >= highScore && score > 0 && <p className="text-xs font-bold text-amber-500 mb-4">NEW HIGH SCORE!</p>}
            <p className="text-gray-400 text-xs mb-4">Best: {highScore}</p>
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        )}

        {/* Knowledge Gate overlay */}
        {gateActive && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-6 bg-white/95 backdrop-blur-md">
            <div className="text-4xl mb-2 animate-pop-in">🔒</div>
            <h3 className="text-xl font-black text-gray-800 mb-1">KNOWLEDGE GATE</h3>
            <p className="text-gray-400 text-xs mb-4">Answer correctly to advance to <span className="font-bold">{theme.biomes[level % theme.biomes.length].name}</span>!</p>
            <p className="text-3xl font-black text-gray-800 mb-6">{gateQ.text} = ?</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              {gateQ.options.map((opt, i) => (
                <button key={i} onClick={() => handleGateAnswer(opt)}
                  className="py-3 rounded-xl font-black text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all active:scale-95">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* ── Controls hint ─────────────────────────── */}
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200 flex justify-center gap-4">
        <span>↑ / SPACE / TAP top = Jump (×2)</span>
        <span>↓ / TAP bottom = Slide</span>
        <span>Collect coins & power-ups!</span>
      </div>
    </div>
  );
}
