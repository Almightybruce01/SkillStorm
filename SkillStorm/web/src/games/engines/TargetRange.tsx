/* ═══════════════════════════════════════════════════════════
   TARGET RANGE ENGINE
   Canvas shooting: Number Ninja, World Map Shooter, etc.
   Moving targets, wind/gravity, scope zoom, combo, lives
   Environments: forest, desert, arctic (with 3D perspective)
   Enhanced: touch tap-to-shoot, hit particle effects,
   crosshair follows touch/mouse, accuracy tracking,
   combo for consecutive hits, progressive difficulty
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getQuestions, type Grade, type Question } from '../questionBank';
import { getGameById } from '../../engine/gameData';

type Subject = 'math' | 'science' | 'vocabulary';

type EnvTheme = 'forest' | 'desert' | 'arctic';

type TargetType = 'standard' | 'fast' | 'heavy' | 'bonus';

interface Target {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  answer: string;
  points: number;
  radius: number;
  pattern: 'linear' | 'sine' | 'circular';
  t0: number;
  cx?: number;
  cy?: number;
  r?: number;
  correct?: boolean;
  speed?: number;
  type: TargetType;
  rotation: number;
  distance: number; // 0-1, for 3D perspective (0 = far, 1 = near)
  health?: number; // For heavy targets (2 hits)
}

interface ProjectileTrail {
  id: number;
  points: Array<{ x: number; y: number; life: number }>;
}

type PowerUpType = 'no_wind' | 'big_bullets' | 'extra_ammo';
interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: PowerUpType;
  life: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  wind: number;
  gravity: number;
  trail?: Array<{ x: number; y: number; life: number }>;
  hitRadius?: number;
}

interface HitMarker {
  id: number;
  x: number;
  y: number;
  life: number;
  correct: boolean;
}

interface MissSplash {
  id: number;
  x: number;
  y: number;
  life: number;
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>;
}

interface HitParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface Props {
  gameId: string;
  grade: Grade;
  onClose: () => void;
  onRoundEnd?: (round: number, score: number) => void;
}

function mapSubject(subject: string): Subject {
  if (subject === 'math') return 'math';
  if (subject === 'science') return 'science';
  return 'vocabulary';
}

function getSubject(gameId: string): Subject {
  const game = getGameById(gameId);
  if (!game) return 'math';
  return mapSubject(game.subject);
}

const ENV_COLORS: Record<EnvTheme, { sky: string; ground: string; accent: string; horizon: string }> = {
  forest: { sky: '#1e4620', ground: '#2d5016', accent: '#4ade80', horizon: '#166534' },
  desert: { sky: '#fef3c7', ground: '#a16207', accent: '#fcd34d', horizon: '#fcd34d' },
  arctic: { sky: '#0c4a6e', ground: '#64748b', accent: '#7dd3fc', horizon: '#0284c7' },
};

const TARGET_TYPE_CONFIG: Record<TargetType, { radius: number; speed: number; points: number; color: string; strokeColor: string }> = {
  standard: { radius: 24, speed: 1.0, points: 50, color: '#4ade80', strokeColor: '#22c55e' },
  fast: { radius: 16, speed: 1.8, points: 75, color: '#60a5fa', strokeColor: '#3b82f6' },
  heavy: { radius: 36, speed: 0.5, points: 150, color: '#f87171', strokeColor: '#ef4444' },
  bonus: { radius: 28, speed: 1.2, points: 200, color: '#fbbf24', strokeColor: '#f59e0b' },
};

const CANVAS_W = 640;
const CANVAS_H = 480;
const HORIZON_Y = CANVAS_H * 0.4; // Horizon line for 3D perspective
const VANISHING_X = CANVAS_W / 2; // Vanishing point X
const MAX_AMMO = 6;
const BASE_WIND = 0.08;
const GRAVITY = 0.12;
const LIVES = 3;
const ROUNDS_PER_LEVEL = 3;
const COMBO_DECAY_MS = 2500;
const ZOOM_LEVELS = [1.0, 1.5, 2.0, 2.5];
let nextId = 0;

export function TargetRange({ gameId, grade, onClose, onRoundEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subject = getSubject(gameId);
  const [round, setRound] = useState(1);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [combo, setCombo] = useState(0);
  const [streak, setStreak] = useState(0);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [accuracy, setAccuracy] = useState({ hits: 0, shots: 0 });
  const [question, setQuestion] = useState<Question | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [hitMarkers, setHitMarkers] = useState<HitMarker[]>([]);
  const [missSplashes, setMissSplashes] = useState<MissSplash[]>([]);
  const [hitParticles, setHitParticles] = useState<HitParticle[]>([]);
  const [mouse, setMouse] = useState({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const [scopeZoom, setScopeZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [wind, setWind] = useState(0);
  const [windDirection, setWindDirection] = useState(1); // 1 = right, -1 = left
  const [windAnimation, setWindAnimation] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [screenFlash, setScreenFlash] = useState<'green' | 'red' | null>(null);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [activePowerUps, setActivePowerUps] = useState<{ noWind?: number; bigBullets?: number }>({});
  const [showTutorial, setShowTutorial] = useState(true);
  const [roundCorrectHits, setRoundCorrectHits] = useState(0);
  const [roundShotsFired, setRoundShotsFired] = useState(0);
  const [roundMisses, setRoundMisses] = useState(0);
  const [perfectRoundBonus, setPerfectRoundBonus] = useState(0);
  const [envParticles, setEnvParticles] = useState<Array<{ x: number; y: number; vx: number; vy: number; life: number; type: 'snowflake' | 'bird' | 'shimmer' }>>([]);
  const lastHitTimeRef = useRef(0);
  const tapStartTimeRef = useRef(0);
  const scopeZoomTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const roundCorrectHitsRef = useRef(0);
  const roundMissesRef = useRef(0);
  const reloadingRef = useRef(false);
  const ammoRef = useRef(MAX_AMMO);
  const bestComboRef = useRef(0);
  const bestStreakRef = useRef(0);
  const roundEndScheduledRef = useRef(false);
  const failRespawnScheduledRef = useRef(false);
  const pointerDownRef = useRef(false);
  ammoRef.current = ammo;
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const questionsPoolRef = useRef<Question[]>([]);
  const stateRef = useRef({ targets: [] as Target[], projectiles: [] as Projectile[], hitMarkers: [] as HitMarker[], missSplashes: [] as MissSplash[], hitParticles: [] as HitParticle[], powerUps: [] as PowerUp[] });

  const envTheme: EnvTheme = ['forest', 'desert', 'arctic'][(level - 1) % 3] as EnvTheme;
  const env = ENV_COLORS[envTheme];

  const loadQuestions = useCallback(() => {
    const subs: Subject[] = subject === 'math' ? ['math'] : subject === 'science' ? ['science'] : ['vocabulary'];
    const all: Question[] = [];
    subs.forEach(s => all.push(...getQuestions(grade, s, 20)));
    questionsPoolRef.current = all;
  }, [grade, subject]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Spawn environment particles
  useEffect(() => {
    if (envTheme === 'arctic') {
      const interval = setInterval(() => {
        setEnvParticles(prev => [...prev, {
          x: Math.random() * CANVAS_W,
          y: -10,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.5 + Math.random() * 0.5,
          life: 200,
          type: 'snowflake',
        }]);
      }, 500);
      return () => clearInterval(interval);
    } else if (envTheme === 'forest') {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          setEnvParticles(prev => [...prev, {
            x: -20,
            y: HORIZON_Y + Math.random() * 50,
            vx: 1 + Math.random(),
            vy: (Math.random() - 0.5) * 0.3,
            life: 150,
            type: 'bird',
          }]);
        }
      }, 2000);
      return () => clearInterval(interval);
    } else if (envTheme === 'desert') {
      const interval = setInterval(() => {
        if (Math.random() > 0.8) {
          setEnvParticles(prev => [...prev, {
            x: Math.random() * CANVAS_W,
            y: HORIZON_Y + Math.random() * 100,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -0.2 - Math.random() * 0.2,
            life: 100,
            type: 'shimmer',
          }]);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [envTheme]);

  const spawnTargets = useCallback(() => {
    const pool = questionsPoolRef.current;
    if (pool.length === 0) return;
    const q = pool[Math.floor(Math.random() * pool.length)];
    const opts = q.options.map((o, i) => ({ text: o, correct: i === q.correct }));
    
    // Change wind direction between rounds; progressive difficulty: stronger wind at higher levels
    const windScale = 1 + (level - 1) * 0.2;
    const newWindDirection = Math.random() > 0.5 ? 1 : -1;
    setWindDirection(newWindDirection);
    const newWind = (Math.random() - 0.5) * BASE_WIND * 2.5 * windScale * newWindDirection;
    setWind(newWind);
    
    const radiusScale = 1 - (level - 1) * 0.03; // Progressive: smaller targets at higher levels
    const patterns: Target['pattern'][] = ['linear', 'sine', 'circular'];
    const types: TargetType[] = ['standard', 'fast', 'heavy', 'bonus'];
    const newTargets: Target[] = opts.map((opt, i) => {
      const baseSpeed = 0.6 + level * 0.35 + (opt.correct ? 0.2 : 0);
      const speed = baseSpeed * (0.8 + Math.random() * 0.4);
      const pattern = patterns[i % 3];
      
      // Assign target type based on position and correctness
      let type: TargetType = 'standard';
      if (opt.correct && i === opts.length - 1 && Math.random() > 0.5) {
        type = 'bonus';
      } else if (i === 0 && Math.random() > 0.6) {
        type = 'fast';
      } else if (i === Math.floor(opts.length / 2) && Math.random() > 0.7) {
        type = 'heavy';
      }
      
      const config = TARGET_TYPE_CONFIG[type];
      const distance = 0.3 + Math.random() * 0.5; // 0.3 to 0.8 for 3D effect
      const baseY = HORIZON_Y + (CANVAS_H - HORIZON_Y) * (1 - distance);
      const cx = VANISHING_X + (100 + (i * (CANVAS_W - 200) / Math.max(1, opts.length - 1)) - VANISHING_X) * distance;
      const cy = baseY + (Math.random() - 0.5) * 60;
      
      return {
        id: nextId++,
        x: cx,
        y: cy,
        vx: pattern === 'linear' ? (Math.random() - 0.5) * speed * 2 : 0,
        vy: pattern === 'linear' ? (Math.random() - 0.5) * speed * 2 : 0,
        answer: opt.text,
        points: opt.correct ? config.points + level * 30 + combo * 5 : 15,
        radius: config.radius * distance * radiusScale, // Progressive: smaller at higher levels
        pattern,
        t0: timeRef.current,
        cx: pattern !== 'linear' ? cx : undefined,
        cy: pattern !== 'linear' ? cy : undefined,
        r: pattern === 'circular' ? (55 + level * 5) * distance : undefined,
        correct: opt.correct,
        speed: config.speed * speed,
        type,
        rotation: 0,
        distance,
        health: type === 'heavy' ? 2 : 1,
      };
    });
    setQuestion(q);
    setTargets(newTargets);
    stateRef.current.targets = newTargets;
    if (Math.random() < 0.2) {
      const types: PowerUpType[] = ['no_wind', 'big_bullets', 'extra_ammo'];
      const pu: PowerUp = {
        id: nextId++,
        x: 80 + Math.random() * (CANVAS_W - 160),
        y: HORIZON_Y + 40 + Math.random() * (CANVAS_H - HORIZON_Y - 120),
        type: types[Math.floor(Math.random() * types.length)],
        life: 600,
      };
      setPowerUps(prev => {
      const next = [...prev, pu];
      stateRef.current.powerUps = next;
      return next;
    });
    }
  }, [level, combo]);

  useEffect(() => {
    if (questionsPoolRef.current.length > 0 && !gameOver) spawnTargets();
  }, [level, spawnTargets, gameOver]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: CANVAS_W / 2, y: CANVAS_H / 2 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(CANVAS_W, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(CANVAS_H, (clientY - rect.top) * scaleY)),
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      setMouse(getCanvasCoords(e.clientX, e.clientY));
    },
    [getCanvasCoords]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        setMouse(getCanvasCoords(t.clientX, t.clientY));
      }
    },
    [getCanvasCoords]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        pointerDownRef.current = true;
        tapStartTimeRef.current = Date.now();
        const t = e.touches[0];
        const coords = getCanvasCoords(t.clientX, t.clientY);
        lastTapCoordsRef.current = coords;
        setMouse(coords);
        if (scopeZoomTimeoutRef.current) clearTimeout(scopeZoomTimeoutRef.current);
        scopeZoomTimeoutRef.current = setTimeout(() => {
          setScopeZoom(true);
          setZoomLevel(prev => (prev + 1) % ZOOM_LEVELS.length);
          scopeZoomTimeoutRef.current = null;
        }, 200);
      }
    },
    [getCanvasCoords]
  );

  const handleMouseDown = useCallback(() => {
    pointerDownRef.current = true;
    setScopeZoom(true);
    setZoomLevel(prev => (prev + 1) % ZOOM_LEVELS.length);
  }, []);

  const fireProjectile = useCallback((targetX?: number, targetY?: number) => {
    if (!pointerDownRef.current && targetX === undefined) return;
    if (targetX === undefined) pointerDownRef.current = false;
    setScopeZoom(false);
    if (ammo <= 0) return;
    const currentWind = activePowerUps.noWind ? 0 : wind;
    const grav = GRAVITY;
    const hitRadiusMult = activePowerUps.bigBullets ? 2 : 1;
    let vx = currentWind;
    let vy = -7 - grav * 3;
    if (targetX !== undefined && targetY !== undefined) {
      const dx = targetX - CANVAS_W / 2;
      const dy = targetY - (CANVAS_H - 50);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 12;
      vx = (dx / dist) * speed * 0.5 + currentWind;
      vy = (dy / dist) * speed * 0.85;
    }
    const proj: Projectile = {
      id: nextId++,
      x: CANVAS_W / 2,
      y: CANVAS_H - 50,
      vx,
      vy,
      life: 90,
      wind: currentWind,
      gravity: grav,
      trail: [],
      hitRadius: 6 * hitRadiusMult,
    };
    stateRef.current.projectiles = [...stateRef.current.projectiles, proj];
    setProjectiles(prev => [...prev, proj]);
    setAmmo(a => a - 1);
    setAccuracy(acc => ({ ...acc, shots: acc.shots + 1 }));
    setRoundShotsFired(s => s + 1);
  }, [ammo, wind, activePowerUps]);

  const handleMouseUp = useCallback(() => {
    fireProjectile();
  }, [fireProjectile]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (scopeZoomTimeoutRef.current) {
        clearTimeout(scopeZoomTimeoutRef.current);
        scopeZoomTimeoutRef.current = null;
      }
      const duration = Date.now() - tapStartTimeRef.current;
      const coords = e.changedTouches.length > 0
        ? getCanvasCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
        : lastTapCoordsRef.current;
      if (e.changedTouches.length > 0) setMouse(coords!);
      if (duration < 250 && coords && ammo > 0) {
        fireProjectile(coords.x, coords.y);
      } else {
        fireProjectile();
      }
    },
    [fireProjectile, getCanvasCoords, ammo]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gameLoop = () => {
      timeRef.current += 1;
      const t = timeRef.current * 0.016;
      const state = stateRef.current;
      
      // Animate wind indicator
      setWindAnimation(prev => prev + 0.1);

      // Update environment particles
      setEnvParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 1,
      })).filter(p => p.life > 0 && p.x >= -50 && p.x <= CANVAS_W + 50 && p.y >= -50 && p.y <= CANVAS_H + 50));

      state.targets = state.targets.map(tg => {
        let x = tg.x;
        let y = tg.y;
        let rotation = tg.rotation;
        
        if (tg.type === 'bonus') {
          rotation += 0.05; // Spinning bonus targets
        }
        
        if (tg.pattern === 'linear') {
          x += tg.vx;
          y += tg.vy;
          if (x < tg.radius || x > CANVAS_W - tg.radius) tg.vx *= -1;
          if (y < tg.radius || y > CANVAS_H - tg.radius) tg.vy *= -1;
        } else if (tg.pattern === 'sine' && tg.cx !== undefined) {
          const sp = tg.speed ?? 1;
          x = tg.cx + Math.sin(t * sp) * 45 * tg.distance;
          y = (tg.cy ?? 0) + Math.cos(t * sp * 0.8) * 28 * tg.distance;
        } else if (tg.pattern === 'circular' && tg.cx !== undefined && tg.r) {
          const sp = tg.speed ?? 1;
          x = tg.cx + Math.cos(t * sp) * tg.r;
          y = (tg.cy ?? 0) + Math.sin(t * sp) * tg.r;
        }
        return { ...tg, x, y, rotation };
      });

      state.projectiles = state.projectiles
        .map(p => {
          const np = { ...p };
          const trail = np.trail ?? [];
          trail.push({ x: np.x, y: np.y, life: 15 });
          np.trail = trail.filter(pt => (pt.life -= 1) > 0);
          np.x += np.vx;
          np.y += np.vy;
          np.vx += np.wind * 0.5;
          np.vy += np.gravity;
          np.life--;
          return np;
        })
        .filter(p => p.life > 0 && p.x >= 0 && p.x <= CANVAS_W && p.y >= 0 && p.y <= CANVAS_H);

      // Update hit markers
      state.hitMarkers = state.hitMarkers.map(m => ({ ...m, life: m.life - 1 })).filter(m => m.life > 0);

      // Update hit particles
      state.hitParticles = state.hitParticles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * 0.96,
          vy: p.vy * 0.96 + 0.15,
          life: p.life - 1,
        }))
        .filter(p => p.life > 0);

      // Update miss splashes
      state.missSplashes = state.missSplashes.map(splash => ({
        ...splash,
        life: splash.life - 1,
        particles: splash.particles.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * 0.95,
          vy: p.vy * 0.95,
          life: p.life - 1,
        })).filter(p => p.life > 0),
      })).filter(splash => splash.life > 0 && splash.particles.length > 0);

      if (combo > 0 && Date.now() - lastHitTimeRef.current > COMBO_DECAY_MS) {
        setCombo(0);
      }

      let collectedPowerUpIds = new Set<number>();
      state.projectiles.forEach(proj => {
        stateRef.current.powerUps.forEach(pu => {
          const dx = proj.x - pu.x;
          const dy = proj.y - pu.y;
          if (Math.sqrt(dx * dx + dy * dy) < 30) collectedPowerUpIds.add(pu.id);
        });
      });
      collectedPowerUpIds.forEach(id => {
        const pu = stateRef.current.powerUps.find(p => p.id === id);
        if (pu) {
          if (pu.type === 'no_wind') setActivePowerUps(prev => ({ ...prev, noWind: 1 }));
          if (pu.type === 'big_bullets') setActivePowerUps(prev => ({ ...prev, bigBullets: 1 }));
          if (pu.type === 'extra_ammo') setAmmo(a => Math.min(MAX_AMMO, a + 3));
        }
      });
      stateRef.current.powerUps = stateRef.current.powerUps
        .filter(pu => !collectedPowerUpIds.has(pu.id))
        .map(pu => ({ ...pu, life: pu.life - 1 }))
        .filter(pu => pu.life > 0);
      setPowerUps([...stateRef.current.powerUps]);

      const hitTargets = new Set<number>();
      const hitProjs = new Set<number>();
      let hitCorrect = false;
      
      state.projectiles.forEach(proj => {
        let hit = false;
        const projHitRadius = proj.hitRadius ?? 6;
        state.targets.forEach(tg => {
          const dx = proj.x - tg.x;
          const dy = proj.y - tg.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < tg.radius + projHitRadius) {
            hit = true;
            hitProjs.add(proj.id);
            const isHeavyWithHealth = tg.type === 'heavy' && (tg.health ?? 1) > 1;
            if (isHeavyWithHealth) {
              const newHealth = (tg.health ?? 1) - 1;
              const idx = state.targets.findIndex(t => t.id === tg.id);
              if (idx >= 0) state.targets[idx] = { ...state.targets[idx], health: newHealth };
              if (newHealth <= 0) hitTargets.add(tg.id);
            } else {
              hitTargets.add(tg.id);
            }
            const pts = tg.points + combo * 3;
            setScore(s => s + pts);
            setAccuracy(acc => ({ ...acc, hits: acc.hits + 1 }));
            if (tg.correct) {
              setRoundCorrectHits(c => c + 1);
              roundCorrectHitsRef.current += 1;
            }
            setScreenFlash(tg.correct ? 'green' : 'red');
            setTimeout(() => setScreenFlash(null), 300);
            
            // Add hit marker
            state.hitMarkers.push({
              id: nextId++,
              x: tg.x,
              y: tg.y,
              life: 20,
              correct: tg.correct ?? false,
            });
            // Spawn hit particle effects (burst of particles)
            const hitColor = tg.correct ? '#22c55e' : '#ef4444';
            const particleCount = tg.correct ? 16 : 12;
            for (let i = 0; i < particleCount; i++) {
              const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
              const speed = (tg.correct ? 2.5 : 2) + Math.random() * 3;
              state.hitParticles.push({
                id: nextId++,
                x: tg.x,
                y: tg.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                life: 25 + Math.random() * 15,
                color: hitColor,
                size: 2 + Math.random() * 2,
              });
            }
            // Extra sparkle particles for correct hits (golden tint)
            if (tg.correct) {
              for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                state.hitParticles.push({
                  id: nextId++,
                  x: tg.x,
                  y: tg.y,
                  vx: Math.cos(angle) * 4,
                  vy: Math.sin(angle) * 4 - 4,
                  life: 20,
                  color: '#fbbf24',
                  size: 1.5,
                });
              }
            }
            
            if (!tg.correct) {
              setRoundMisses(m => m + 1);
              roundMissesRef.current += 1;
            }
            if (tg.correct) {
              hitCorrect = true;
              lastHitTimeRef.current = Date.now();
              setCombo(c => {
                const next = c + 1;
                if (next > bestComboRef.current) bestComboRef.current = next;
                return next;
              });
              setStreak(s => {
                const next = s + 1;
                if (next > bestStreakRef.current) bestStreakRef.current = next;
                return next;
              });
            } else {
              setCombo(0);
              setStreak(0);
            }
          }
        });
        
        // If projectile didn't hit a target and reached ground, create miss splash
        if (!hit && proj.y >= CANVAS_H - 50 && proj.life < 5) {
          setRoundMisses(m => m + 1);
          roundMissesRef.current += 1;
          const splash: MissSplash = {
            id: nextId++,
            x: proj.x,
            y: CANVAS_H - 50,
            life: 30,
            particles: Array.from({ length: 8 }, () => ({
              x: proj.x,
              y: CANVAS_H - 50,
              vx: (Math.random() - 0.5) * 3,
              vy: -Math.random() * 2 - 1,
              life: 20 + Math.random() * 10,
            })),
          };
          state.missSplashes.push(splash);
          hitProjs.add(proj.id);
        }
      });
      
      state.targets = state.targets.filter(t => !hitTargets.has(t.id));
      state.projectiles = state.projectiles.filter(p => !hitProjs.has(p.id));
      setTargets([...state.targets]);
      setProjectiles([...state.projectiles]);
      setHitMarkers([...state.hitMarkers]);
      setHitParticles([...state.hitParticles]);
      setMissSplashes([...state.missSplashes]);

      if (state.targets.length === 0 && state.projectiles.length === 0 && !gameOver && !roundEndScheduledRef.current && !failRespawnScheduledRef.current) {
        roundEndScheduledRef.current = true;
        const correctTargetsThisRound = 1;
        const perfect = roundMissesRef.current === 0 && roundCorrectHitsRef.current >= correctTargetsThisRound;
        if (perfect) {
          const bonus = 500 + level * 100;
          setScore(s => s + bonus);
          setPerfectRoundBonus(bonus);
        }
        setTimeout(() => {
          onRoundEnd?.(round, score);
          setRound(r => r + 1);
          setAmmo(MAX_AMMO);
          setActivePowerUps(prev => {
            const nw = prev.noWind ?? 0;
            const bb = prev.bigBullets ?? 0;
            return {
              noWind: nw > 0 ? nw - 1 : undefined,
              bigBullets: bb > 0 ? bb - 1 : undefined,
            };
          });
          setRoundCorrectHits(0);
          setRoundShotsFired(0);
          setRoundMisses(0);
          roundCorrectHitsRef.current = 0;
          roundMissesRef.current = 0;
          setPerfectRoundBonus(0);
          setLevel(l => (round % ROUNDS_PER_LEVEL === 0 ? l + 1 : l));
          roundEndScheduledRef.current = false;
          spawnTargets();
        }, 500);
      } else if (ammoRef.current <= 0 && state.projectiles.length === 0 && state.targets.length > 0 && !failRespawnScheduledRef.current && !reloadingRef.current) {
        reloadingRef.current = true;
        setReloading(true);
        setTimeout(() => {
          reloadingRef.current = false;
          setReloading(false);
          setAmmo(MAX_AMMO);
          failRespawnScheduledRef.current = true;
          const correctStillUp = state.targets.some(t => t.correct);
          if (correctStillUp) {
            setLives(l => {
              const next = Math.max(0, l - 1);
              if (next <= 0) setGameOver(true);
              return next;
            });
            setStreak(0);
          }
          state.targets = [];
          setTargets([]);
          setTimeout(() => {
            failRespawnScheduledRef.current = false;
            if (!gameOver) spawnTargets();
          }, 100);
        }, 1500);
      }

      animRef.current = requestAnimationFrame(gameLoop);
    };
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [spawnTargets, round, combo, gameOver, onRoundEnd]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = stateRef.current;
    const zoom = scopeZoom ? ZOOM_LEVELS[zoomLevel] : 1.0;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    if (envTheme === 'forest') {
      skyGradient.addColorStop(0, env.sky);
      skyGradient.addColorStop(1, env.horizon);
    } else if (envTheme === 'desert') {
      skyGradient.addColorStop(0, '#fef3c7');
      skyGradient.addColorStop(1, '#fcd34d');
    } else {
      skyGradient.addColorStop(0, env.sky);
      skyGradient.addColorStop(1, env.horizon);
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);

    // Draw horizon line
    ctx.strokeStyle = env.horizon;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(CANVAS_W, HORIZON_Y);
    ctx.stroke();

    // Draw environment elements
    if (envTheme === 'forest') {
      // Draw trees in background (smaller, further away)
      for (let i = 0; i < 5; i++) {
        const x = (i * CANVAS_W / 5) + (timeRef.current * 0.1) % (CANVAS_W / 5);
        const treeHeight = 40 + Math.sin(i) * 10;
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.moveTo(x, HORIZON_Y);
        ctx.lineTo(x - 15, HORIZON_Y - treeHeight);
        ctx.lineTo(x + 15, HORIZON_Y - treeHeight);
        ctx.closePath();
        ctx.fill();
      }
    } else if (envTheme === 'desert') {
      // Draw cacti
      for (let i = 0; i < 4; i++) {
        const x = (i * CANVAS_W / 4) + 50;
        const cactusHeight = 30 + Math.sin(i) * 10;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x, HORIZON_Y - cactusHeight, 8, cactusHeight);
        ctx.fillRect(x - 5, HORIZON_Y - cactusHeight * 0.6, 6, cactusHeight * 0.4);
        ctx.fillRect(x + 8, HORIZON_Y - cactusHeight * 0.7, 6, cactusHeight * 0.3);
      }
      // Draw sand dunes
      ctx.fillStyle = '#a16207';
      ctx.beginPath();
      ctx.moveTo(0, HORIZON_Y);
      for (let i = 0; i < CANVAS_W; i += 20) {
        ctx.lineTo(i, HORIZON_Y + Math.sin(i * 0.02 + timeRef.current * 0.01) * 5);
      }
      ctx.lineTo(CANVAS_W, HORIZON_Y);
      ctx.closePath();
      ctx.fill();
    } else if (envTheme === 'arctic') {
      // Draw aurora effect
      const auroraGradient = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
      auroraGradient.addColorStop(0, 'rgba(125, 211, 252, 0.3)');
      auroraGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.2)');
      auroraGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = auroraGradient;
      ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y);
      
      // Draw ice formations
      for (let i = 0; i < 3; i++) {
        const x = (i * CANVAS_W / 3) + 100;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(x, HORIZON_Y);
        ctx.lineTo(x - 20, HORIZON_Y - 25);
        ctx.lineTo(x, HORIZON_Y - 35);
        ctx.lineTo(x + 20, HORIZON_Y - 25);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Draw environment particles
    envParticles.forEach(p => {
      if (p.type === 'snowflake') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'bird') {
        ctx.fillStyle = '#1e4620';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shimmer') {
        ctx.fillStyle = `rgba(252, 211, 77, ${0.3 * (p.life / 100)})`;
        ctx.fillRect(p.x - 10, p.y - 2, 20, 4);
      }
    });

    // Draw wind visualization - animated streaks
    if (wind !== 0 && !activePowerUps.noWind) {
      const windStr = Math.min(8, Math.ceil(Math.abs(wind) * 80));
      const dir = wind > 0 ? 1 : -1;
      for (let i = 0; i < windStr; i++) {
        const y = HORIZON_Y + 20 + (i * 35) + (timeRef.current * 0.5) % 35;
        const offset = (timeRef.current * 2 + i * 15) % 60 - 30;
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + 0.1 * (i / windStr)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const x1 = dir > 0 ? 0 : CANVAS_W;
        const x2 = dir > 0 ? CANVAS_W : 0;
        ctx.moveTo(x1, y + offset);
        ctx.lineTo(x1 + dir * (30 + Math.abs(wind) * 100), y + offset);
        ctx.stroke();
      }
    }

    // Draw ground with 3D perspective (trapezoid)
    const groundGradient = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_H);
    groundGradient.addColorStop(0, env.ground);
    groundGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = groundGradient;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(0, CANVAS_H);
    ctx.lineTo(CANVAS_W, CANVAS_H);
    ctx.lineTo(CANVAS_W, HORIZON_Y);
    ctx.closePath();
    ctx.fill();

    // Draw perspective grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = HORIZON_Y + (i * (CANVAS_H - HORIZON_Y) / 5);
      const width = CANVAS_W * (1 - (y - HORIZON_Y) / (CANVAS_H - HORIZON_Y) * 0.3);
      ctx.beginPath();
      ctx.moveTo((CANVAS_W - width) / 2, y);
      ctx.lineTo((CANVAS_W + width) / 2, y);
      ctx.stroke();
    }

    // Draw targets with 3D scaling
    state.targets.forEach(tg => {
      const config = TARGET_TYPE_CONFIG[tg.type];
      const scaledRadius = tg.radius;
      
      ctx.save();
      ctx.translate(tg.x, tg.y);
      if (tg.type === 'bonus') {
        ctx.rotate(tg.rotation);
      }
      
      // Draw target circle
      ctx.fillStyle = tg.correct ? config.color : '#94a3b8';
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, scaledRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw target type indicator
      if (tg.type === 'bonus') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, scaledRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tg.type === 'fast') {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(0, -scaledRadius * 0.5);
        ctx.lineTo(-scaledRadius * 0.3, scaledRadius * 0.3);
        ctx.lineTo(scaledRadius * 0.3, scaledRadius * 0.3);
        ctx.closePath();
        ctx.fill();
      } else if (tg.type === 'heavy') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-scaledRadius * 0.4, -scaledRadius * 0.4, scaledRadius * 0.8, scaledRadius * 0.8);
      }
      
      ctx.restore();
      
      if (tg.type === 'heavy' && (tg.health ?? 1) < 2) {
        const barW = tg.radius * 1.2;
        const barH = 4;
        ctx.fillStyle = '#444';
        ctx.fillRect(tg.x - barW / 2, tg.y - tg.radius - 10, barW, barH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(tg.x - barW / 2, tg.y - tg.radius - 10, barW * ((tg.health ?? 1) / 2), barH);
      }
      
      // Draw answer text
      ctx.fillStyle = '#0f172a';
      ctx.font = `${Math.max(10, 12 * tg.distance)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(tg.answer.slice(0, 10), tg.x, tg.y + 4);
    });

    // Draw projectile trails
    state.projectiles.forEach(p => {
      const trail = p.trail ?? [];
      trail.forEach((pt, i) => {
        const alpha = pt.life / 15;
        ctx.fillStyle = `rgba(248,113,113,${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw projectiles
    state.projectiles.forEach(p => {
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw power-ups
    stateRef.current.powerUps.forEach(pu => {
      ctx.fillStyle = pu.type === 'no_wind' ? '#60a5fa' : pu.type === 'big_bullets' ? '#fbbf24' : '#4ade80';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#000';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pu.type === 'no_wind' ? '🌀' : pu.type === 'big_bullets' ? '●' : '+3', pu.x, pu.y + 5);
    });

    if (reloading) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Reloading...', CANVAS_W / 2, CANVAS_H / 2);
    }

    // Draw miss splashes
    state.missSplashes.forEach(splash => {
      splash.particles.forEach(particle => {
        ctx.fillStyle = `rgba(139, 69, 19, ${particle.life / 30})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw hit markers
    state.hitMarkers.forEach(marker => {
      const alpha = marker.life / 20;
      ctx.strokeStyle = marker.correct ? `rgba(34, 197, 94, ${alpha})` : `rgba(239, 68, 68, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, 15 + (20 - marker.life), 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw hit particle effects
    state.hitParticles.forEach(particle => {
      const alpha = particle.life / 40;
      const [r, g, b] = particle.color.startsWith('#')
        ? [
            parseInt(particle.color.slice(1, 3), 16) / 255,
            parseInt(particle.color.slice(3, 5), 16) / 255,
            parseInt(particle.color.slice(5, 7), 16) / 255,
          ]
        : [0.13, 0.77, 0.37];
      ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw crosshair
    ctx.strokeStyle = 'rgba(30,41,59,0.95)';
    ctx.lineWidth = 2;
    const crossSize = scopeZoom ? 24 * zoom : 14;
    ctx.beginPath();
    ctx.moveTo(mouse.x - crossSize, mouse.y);
    ctx.lineTo(mouse.x + crossSize, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - crossSize);
    ctx.lineTo(mouse.x, mouse.y + crossSize);
    ctx.stroke();

    // Draw scope overlay when zooming
    if (scopeZoom) {
      ctx.strokeStyle = 'rgba(30,41,59,0.6)';
      ctx.lineWidth = 1;
      // Outer circle
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 55 * zoom, 0, Math.PI * 2);
      ctx.stroke();
      // Middle circle
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 35 * zoom, 0, Math.PI * 2);
      ctx.stroke();
      // Inner circle
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 20 * zoom, 0, Math.PI * 2);
      ctx.stroke();
      // Crosshair lines
      ctx.strokeStyle = 'rgba(30,41,59,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouse.x - 30 * zoom, mouse.y);
      ctx.lineTo(mouse.x - 15 * zoom, mouse.y);
      ctx.moveTo(mouse.x + 15 * zoom, mouse.y);
      ctx.lineTo(mouse.x + 30 * zoom, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 30 * zoom);
      ctx.lineTo(mouse.x, mouse.y - 15 * zoom);
      ctx.moveTo(mouse.x, mouse.y + 15 * zoom);
      ctx.lineTo(mouse.x, mouse.y + 30 * zoom);
      ctx.stroke();
    }
  }, [mouse, scopeZoom, zoomLevel, env, envTheme, envParticles, wind, activePowerUps, reloading]);

  useEffect(() => {
    const id = setInterval(draw, 1000 / 60);
    return () => clearInterval(id);
  }, [draw]);

  useEffect(() => {
    if (targets.length === 0 && question && ammo <= 0) {
      setLevel(l => l + 1);
      setAmmo(MAX_AMMO);
      setQuestion(null);
    }
  }, [targets.length, question, ammo]);

  const accPct = accuracy.shots > 0 ? Math.round((accuracy.hits / accuracy.shots) * 100) : 0;
  const hitsDisplay = accuracy.hits;
  const shotsDisplay = accuracy.shots;
  const accuracyGrade =
    accPct >= 90 ? 'A'
    : accPct >= 80 ? 'B'
    : accPct >= 70 ? 'C'
    : accPct >= 60 ? 'D'
    : 'F';

  if (gameOver || lives <= 0) {
    return (
      <div className="game-card overflow-hidden bg-white border border-gray-200 p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Over</h2>
          <p className="text-lg text-gray-600 mb-2">Final Score: {score}</p>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg text-left max-w-xs mx-auto">
            <p className="font-semibold text-gray-700 mb-2">Stats Breakdown</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Rounds completed: {round - 1}</p>
              <p>Best combo: {bestComboRef.current}</p>
              <p>Best streak: {bestStreakRef.current}</p>
              <div className="mt-2">
                <p>Accuracy: {accPct}% (Grade: {accuracyGrade})</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${accPct}%` }} />
                  </div>
                  <span className="text-xs">{hitsDisplay}/{shotsDisplay} hits</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-elite btn-elite-primary">
            Exit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card overflow-hidden bg-white border border-gray-200">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4 text-gray-800 text-sm font-medium flex-wrap">
          <span>Score: {score}</span>
          <span>Round {round}</span>
          <span>Level {level}</span>
          <span className={combo >= 2 ? 'text-amber-600 font-bold' : ''}>Combo: {combo}x</span>
          <span className={streak >= 3 ? 'text-green-600 font-bold' : ''}>Streak: {streak}</span>
          <span title={`${hitsDisplay} hits / ${shotsDisplay} shots`}>
            Accuracy: {accPct}% ({accuracyGrade})
          </span>
          <span>Ammo: {ammo}</span>
          <span className="text-red-500">❤️ {lives}</span>
        </div>
        <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">
          Exit
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 py-2 bg-amber-50 border-b border-amber-100">
        <span className="text-sm text-amber-800 font-medium">Wind:</span>
        <div className="flex items-center gap-1" title={`Wind: ${wind > 0 ? '→' : '←'} ${(Math.abs(wind) * 100).toFixed(0)}%`}>
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            className={wind < 0 ? 'rotate-180' : ''} 
            style={{ 
              opacity: 0.5 + Math.min(Math.abs(wind) * 8, 0.5),
              transform: `translateX(${Math.sin(windAnimation) * 3}px)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <path d="M4 12h16M12 4v16m0-16l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs text-amber-700">{wind > 0 ? '→' : '←'} {Math.abs(wind * 100).toFixed(0)}%</span>
        </div>
        {scopeZoom && (
          <span className="text-xs text-amber-700 ml-4">Zoom: {ZOOM_LEVELS[zoomLevel].toFixed(1)}x</span>
        )}
      </div>

      <div className="relative">
        {screenFlash && (
          <div
            className={`absolute inset-0 z-20 pointer-events-none animate-fade-out ${
              screenFlash === 'green' ? 'bg-green-500/40' : 'bg-red-500/40'
            }`}
            style={{ animation: 'targetrange-flash 0.3s ease-out forwards' }}
          />
        )}
        {showTutorial && round === 1 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">How to Play</h3>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Hold to zoom scope, release to fire</li>
                <li>• On mobile: tap targets to shoot directly at them</li>
                <li>• Hit the correct answer to score</li>
                <li>• Red targets (heavy) need 2 hits</li>
                <li>• Collect power-ups for bonuses</li>
              </ul>
              <button onClick={() => setShowTutorial(false)} className="btn-elite btn-elite-primary w-full">
                Got it!
              </button>
            </div>
          </div>
        )}
        {perfectRoundBonus > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-15 pointer-events-none text-yellow-400 font-bold text-2xl animate-bounce">
            Perfect Round! +{perfectRoundBonus}
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-white/95 border-b border-gray-200 text-gray-800 text-center font-semibold shadow-sm">
          {question?.question}
        </div>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full max-w-full cursor-crosshair touch-none"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            pointerDownRef.current = false;
            setScopeZoom(false);
          }}
          onTouchMove={handleTouchMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={(e) => {
            e.preventDefault();
            pointerDownRef.current = false;
            setScopeZoom(false);
          }}
          style={{ touchAction: 'none' }}
        />
      </div>
      <style>{`
        @keyframes targetrange-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
      <p className="p-2 text-center text-xs text-gray-500 bg-gray-50">
        Hold click to zoom scope, release to fire. Tap targets on mobile to shoot directly! Wind and gravity affect shots. 
        Target types: 🟢 Standard, 🔵 Fast, 🔴 Heavy, 🟡 Bonus (spinning)
      </p>
    </div>
  );
}
