/* ═══════════════════════════════════════════════════════════
   COOKIE CLICKER — Arcade
   Full-featured idle clicker with canvas cookie, 12 upgrades,
   prestige, golden cookies, cookie storm, achievements & more
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { playSound } from '../SoundEngine';

interface CookieClickerGameProps {
  onClose: () => void;
}

type UpgradeId =
  | 'auto' | 'grandma' | 'farm' | 'mine' | 'factory' | 'bank'
  | 'temple' | 'wizard' | 'shipment' | 'alchemy' | 'portal' | 'timemachine';

interface Upgrade {
  id: UpgradeId;
  name: string;
  cps: number;
  baseCost: number;
  owned: number;
  emoji: string;
  keyBind: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  type: 'dot' | 'cookie';
}

interface Floater {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  startTime: number;
}

interface MiniCookie {
  id: number;
  x: number;
  y: number;
  vy: number;
  collected: boolean;
}

interface Achievement {
  id: string;
  name: string;
  desc: string;
  threshold: number;
  emoji: string;
  unlocked: boolean;
}

type Theme = 'basic' | 'silver' | 'gold' | 'diamond' | 'cosmic';

const SAVE_KEY = 'skillzstorm_cookieclicker_save';

const UPGRADES: Omit<Upgrade, 'owned'>[] = [
  { id: 'auto', name: 'Auto Clicker', cps: 0.1, baseCost: 15, emoji: '🤖', keyBind: 1 },
  { id: 'grandma', name: 'Grandma', cps: 1, baseCost: 100, emoji: '👵', keyBind: 2 },
  { id: 'farm', name: 'Farm', cps: 8, baseCost: 500, emoji: '🌾', keyBind: 3 },
  { id: 'mine', name: 'Mine', cps: 47, baseCost: 3000, emoji: '⛏️', keyBind: 4 },
  { id: 'factory', name: 'Factory', cps: 260, baseCost: 10000, emoji: '🏭', keyBind: 5 },
  { id: 'bank', name: 'Bank', cps: 1400, baseCost: 40000, emoji: '🏦', keyBind: 6 },
  { id: 'temple', name: 'Temple', cps: 7800, baseCost: 200000, emoji: '⛩️', keyBind: 7 },
  { id: 'wizard', name: 'Wizard Tower', cps: 44000, baseCost: 1200000, emoji: '🧙', keyBind: 8 },
  { id: 'shipment', name: 'Shipment', cps: 260000, baseCost: 6000000, emoji: '🚀', keyBind: 9 },
  { id: 'alchemy', name: 'Alchemy Lab', cps: 1600000, baseCost: 35000000, emoji: '⚗️', keyBind: 0 },
  { id: 'portal', name: 'Portal', cps: 10000000, baseCost: 200000000, emoji: '🌀', keyBind: 0 },
  { id: 'timemachine', name: 'Time Machine', cps: 65000000, baseCost: 1200000000, emoji: '⏰', keyBind: 0 },
];

const ACHIEVEMENTS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_click', name: 'First Click', desc: 'Click the cookie once', threshold: 1, emoji: '👆' },
  { id: '100', name: 'Hundred', desc: 'Earn 100 cookies', threshold: 100, emoji: '💯' },
  { id: '1k', name: 'Thousand', desc: 'Earn 1,000 cookies', threshold: 1000, emoji: '1️⃣' },
  { id: '10k', name: 'Ten Thousand', desc: 'Earn 10,000 cookies', threshold: 10000, emoji: '🔟' },
  { id: '100k', name: 'Hundred Thousand', desc: 'Earn 100,000 cookies', threshold: 100000, emoji: '💯' },
  { id: '1m', name: 'Million', desc: 'Earn 1,000,000 cookies', threshold: 1000000, emoji: '🏆' },
  { id: '10m', name: 'Ten Million', desc: 'Earn 10,000,000 cookies', threshold: 10000000, emoji: '🌟' },
  { id: 'first_upgrade', name: 'First Upgrade', desc: 'Buy your first upgrade', threshold: 0, emoji: '⬆️' },
  { id: 'five_upgrades', name: 'Collector', desc: 'Own 5 of any upgrade', threshold: 0, emoji: '📦' },
  { id: 'golden', name: 'Golden Touch', desc: 'Click a golden cookie', threshold: 0, emoji: '✨' },
  { id: 'storm', name: 'Cookie Storm', desc: 'Survive a cookie storm', threshold: 0, emoji: '🌪️' },
  { id: 'prestige', name: 'Ascended', desc: 'Prestige for the first time', threshold: 0, emoji: '👑' },
  { id: 'speed', name: 'Speed Baker', desc: 'Reach 1,000 CPS', threshold: 0, emoji: '⚡' },
  { id: 'tycoon', name: 'Cookie Tycoon', desc: 'Reach 100,000 CPS', threshold: 0, emoji: '💰' },
  { id: 'legend', name: 'Legendary Baker', desc: 'Reach 1,000,000 CPS', threshold: 0, emoji: '👑' },
];

function getTheme(totalCookies: number): Theme {
  if (totalCookies >= 1e12) return 'cosmic';
  if (totalCookies >= 1e9) return 'diamond';
  if (totalCookies >= 1e6) return 'gold';
  if (totalCookies >= 1e4) return 'silver';
  return 'basic';
}

const THEME_COLORS: Record<Theme, { bg: string; border: string; glow: string; accent: string }> = {
  basic: { bg: 'bg-amber-50', border: 'border-amber-200', glow: 'rgba(245,158,11,0.3)', accent: 'text-amber-700' },
  silver: { bg: 'bg-slate-100', border: 'border-slate-300', glow: 'rgba(148,163,184,0.4)', accent: 'text-slate-700' },
  gold: { bg: 'bg-yellow-50', border: 'border-yellow-300', glow: 'rgba(234,179,8,0.5)', accent: 'text-yellow-800' },
  diamond: { bg: 'bg-cyan-50', border: 'border-cyan-300', glow: 'rgba(6,182,212,0.5)', accent: 'text-cyan-800' },
  cosmic: { bg: 'bg-violet-950/30', border: 'border-violet-500/50', glow: 'rgba(139,92,246,0.6)', accent: 'text-violet-200' },
};

export default function CookieClickerGame({ onClose }: CookieClickerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cookieContainerRef = useRef<HTMLDivElement>(null);

  const [cookies, setCookies] = useState(0);
  const [totalCookiesBaked, setTotalCookiesBaked] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [totalUpgradesBought, setTotalUpgradesBought] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(() =>
    UPGRADES.map(u => ({ ...u, owned: 0 }))
  );
  const [prestigeLevel, setPrestigeLevel] = useState(0);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickScale, setClickScale] = useState(1);
  const [goldenCookie, setGoldenCookie] = useState<{ x: number; y: number; expires: number } | null>(null);
  const [goldenBoostUntil, setGoldenBoostUntil] = useState(0);
  const [cookieStorm, setCookieStorm] = useState(false);
  const [miniCookies, setMiniCookies] = useState<MiniCookie[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }))
  );
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [achievementsPanelOpen, setAchievementsPanelOpen] = useState(false);
  const [prestigeModalOpen, setPrestigeModalOpen] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [showAchievementToast, setShowAchievementToast] = useState<Achievement | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);

  const floaterId = useRef(0);
  const particleId = useRef(0);
  const miniCookieId = useRef(0);
  const animRef = useRef<number>(0);
  const lastTickRef = useRef(0);

  const prestigeMultiplier = 1 + prestigeLevel * 0.1;
  const cps = useMemo(() => {
    const base = upgrades.reduce((sum, u) => sum + u.cps * u.owned, 0);
    const autoClicks = (upgrades.find(u => u.id === 'auto')?.owned ?? 0) * 0.1;
    return (base + autoClicks) * prestigeMultiplier * (goldenBoostUntil > Date.now() ? 7 : 1);
  }, [upgrades, prestigeMultiplier, goldenBoostUntil]);

  const theme = useMemo(() => getTheme(totalCookiesBaked + cookies), [totalCookiesBaked, cookies]);
  const themeColors = THEME_COLORS[theme];

  const getCost = useCallback((upgrade: Upgrade): number => {
    return Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.owned));
  }, []);

  const MILESTONES = [100, 1000, 10000, 100000, 1000000, 10000000];
  const lastMilestoneRef = useRef(0);

  useEffect(() => {
    const total = totalCookiesBaked + cookies;
    const crossed = MILESTONES.find(m => total >= m && lastMilestoneRef.current < m);
    if (crossed) {
      lastMilestoneRef.current = crossed;
      const msg = crossed >= 1000000 ? `${(crossed / 1000000).toFixed(0)}M cookies!` : crossed >= 1000 ? `${(crossed / 1000).toFixed(0)}K cookies!` : `${crossed} cookies!`;
      setMilestoneToast(`Milestone: ${msg}`);
      playSound('powerup');
      setTimeout(() => setMilestoneToast(null), 2500);
    }
  }, [totalCookiesBaked, cookies]);

  const formatCookies = useCallback((n: number): string => {
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n).toString();
  }, []);

  const addFloater = useCallback((amount: number, x: number, y: number) => {
    const id = ++floaterId.current;
    const text = amount >= 1000 ? `+${formatCookies(amount)}` : `+${amount}`;
    setFloaters(f => [...f, { id, text, x, y, alpha: 1, startTime: Date.now() }]);
    setTimeout(() => setFloaters(f => f.filter(item => item.id !== id)), 1200);
  }, [formatCookies]);

  const spawnParticles = useCallback((centerX: number, centerY: number, count: number = 12) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random();
      const speed = 2 + Math.random() * 4;
      newParticles.push({
        id: ++particleId.current,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 0.8,
        size: 3 + Math.random() * 4,
        hue: 25 + Math.random() * 30,
        type: 'dot',
      });
    }
    setParticles(p => [...p, ...newParticles]);
  }, []);

  const spawnCookieParticles = useCallback((centerX: number, centerY: number, count: number = 6) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      newParticles.push({
        id: ++particleId.current,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        life: 0,
        maxLife: 1,
        size: 12 + Math.random() * 8,
        hue: 35 + Math.random() * 15,
        type: 'cookie',
      });
    }
    setParticles(p => [...p, ...newParticles]);
  }, []);

  const unlockAchievement = useCallback((ach: Achievement) => {
    if (ach.unlocked) return;
    setAchievements(prev =>
      prev.map(a => (a.id === ach.id ? { ...a, unlocked: true } : a))
    );
    setShowAchievementToast(ach);
    setTimeout(() => setShowAchievementToast(null), 3000);
    playSound('powerup');
  }, []);

  const handleCookieClick = useCallback(
    (e: React.MouseEvent | { clientX: number; clientY: number }) => {
      const amount = goldenBoostUntil > Date.now() ? 7 : 1;
      setCookies(c => c + amount);
      setTotalCookiesBaked(t => t + amount);
      setClickCount(c => c + 1);
      setClickScale(0.9);
      setTimeout(() => setClickScale(1), 100);

      const rect = cookieContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX ?? 0) - rect.left - rect.width / 2;
        const y = (e.clientY ?? 0) - rect.top - rect.height / 2;
        addFloater(amount, x, y);
        spawnParticles(rect.width / 2 + x, rect.height / 2 + y, 10);
        spawnCookieParticles(rect.width / 2 + x, rect.height / 2 + y, 6);
      }

      playSound('coin');
    },
    [goldenBoostUntil, addFloater, spawnParticles, spawnCookieParticles]
  );

  const handleGoldenCookieClick = useCallback(() => {
    setGoldenCookie(null);
    setGoldenBoostUntil(Date.now() + 15000);
    addFloater(0, 0, 0);
    setFloaters(f => [...f, { id: ++floaterId.current, text: '7x CPS!', x: 0, y: 0, alpha: 1, startTime: Date.now() }]);
    playSound('powerup');
    achievements.find(a => a.id === 'golden' && !a.unlocked) && unlockAchievement(achievements.find(a => a.id === 'golden')!);
  }, [addFloater, achievements, unlockAchievement]);

  const buyUpgrade = useCallback((id: UpgradeId) => {
    const idx = upgrades.findIndex(u => u.id === id);
    if (idx < 0) return;
    const u = upgrades[idx];
    const cost = getCost(u);
    if (cookies >= cost) {
      setCookies(c => c - cost);
      setUpgrades(prev =>
        prev.map(p => (p.id === id ? { ...p, owned: p.owned + 1 } : p))
      );
      setTotalUpgradesBought(t => t + 1);
      playSound('correct');
    }
  }, [upgrades, cookies, getCost]);

  const doPrestige = useCallback(() => {
    if (cookies < 1000000) return;
    setPrestigeLevel(p => p + 1);
    setCookies(0);
    setUpgrades(UPGRADES.map(u => ({ ...u, owned: 0 })));
    setGoldenCookie(null);
    setGoldenBoostUntil(0);
    setCookieStorm(false);
    setMiniCookies([]);
    setPrestigeModalOpen(false);
    playSound('victory');
    achievements.find(a => a.id === 'prestige' && !a.unlocked) && unlockAchievement(achievements.find(a => a.id === 'prestige')!);
  }, [cookies, achievements, unlockAchievement]);

  useEffect(() => {
    let last = 0;
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 60 * dt,
            y: p.y + p.vy * 60 * dt,
            life: p.life + dt,
            vy: p.vy + 120 * dt,
          }))
          .filter(p => p.life < p.maxLife)
      );
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const increment = cps / 10;
      setCookies(c => c + increment);
      setTotalCookiesBaked(t => t + increment);
    }, 100);
    return () => clearInterval(interval);
  }, [cps]);

  useEffect(() => {
    const spawnGolden = () => {
      if (goldenCookie) return;
      const x = 50 + Math.random() * 200;
      const y = 50 + Math.random() * 150;
      setGoldenCookie({ x, y, expires: Date.now() + 15000 });
    };
    const id = setInterval(spawnGolden, 30000 + Math.random() * 60000);
    return () => clearInterval(id);
  }, [goldenCookie]);

  useEffect(() => {
    if (!goldenCookie) return;
    const check = setInterval(() => {
      if (Date.now() > goldenCookie.expires) setGoldenCookie(null);
    }, 500);
    return () => clearInterval(check);
  }, [goldenCookie]);

  useEffect(() => {
    const triggerStorm = () => {
      if (cookieStorm) return;
      setCookieStorm(true);
      const spawn = () => {
        setMiniCookies(m => [
          ...m.slice(-30),
          ...Array.from({ length: 5 }, (_, i) => ({
            id: ++miniCookieId.current + i,
            x: Math.random() * 280,
            y: -20,
            vy: 80 + Math.random() * 60,
            collected: false,
          })),
        ]);
      };
      const interval = setInterval(spawn, 200);
      setTimeout(() => {
        clearInterval(interval);
        setTimeout(() => setCookieStorm(false), 3000);
        achievements.find(a => a.id === 'storm' && !a.unlocked) && unlockAchievement(achievements.find(a => a.id === 'storm')!);
      }, 8000);
    };
    const id = setInterval(triggerStorm, 120000 + Math.random() * 60000);
    return () => clearInterval(id);
  }, [cookieStorm, achievements, unlockAchievement]);

  const handleMiniCookieClick = useCallback((id: number) => {
    setMiniCookies(m => m.filter(c => c.id !== id));
    const bonus = Math.floor(cps * 0.5) + 10;
    setCookies(c => c + bonus);
    setTotalCookiesBaked(t => t + bonus);
    addFloater(bonus, 0, 0);
    playSound('coin');
  }, [cps, addFloater]);

  useEffect(() => {
    const id = setInterval(() => {
      setMiniCookies(m =>
        m
          .map(c => ({ ...c, y: c.y + c.vy * 0.12 }))
          .filter(c => c.y < 350)
      );
    }, 50);
    return () => clearInterval(id);
  }, []);

  const maxOwned = useMemo(() => Math.max(...upgrades.map(u => u.owned), 0), [upgrades]);

  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      const current = achievements.find(a => a.id === ach.id);
      if (current?.unlocked) return;
      if (ach.id === 'first_click' && clickCount >= 1) unlockAchievement({ ...ach, unlocked: false });
      if (ach.threshold > 0 && totalCookiesBaked >= ach.threshold) unlockAchievement({ ...ach, unlocked: false });
      if (ach.id === 'first_upgrade' && totalUpgradesBought >= 1) unlockAchievement({ ...ach, unlocked: false });
      if (ach.id === 'five_upgrades' && maxOwned >= 5) unlockAchievement({ ...ach, unlocked: false });
      if (ach.id === 'speed' && cps >= 1000) unlockAchievement({ ...ach, unlocked: false });
      if (ach.id === 'tycoon' && cps >= 100000) unlockAchievement({ ...ach, unlocked: false });
      if (ach.id === 'legend' && cps >= 1000000) unlockAchievement({ ...ach, unlocked: false });
    });
  }, [totalCookiesBaked, cps, achievements, unlockAchievement, clickCount, totalUpgradesBought, maxOwned]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const rect = cookieContainerRef.current?.getBoundingClientRect();
        if (rect) handleCookieClick({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && upgrades[num - 1]) {
        buyUpgrade(upgrades[num - 1].id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleCookieClick, buyUpgrade, upgrades]);

  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          cookies,
          totalCookiesBaked,
          clickCount,
          totalUpgradesBought,
          upgrades,
          prestigeLevel,
          achievements,
          startTime,
        }));
      } catch {}
    };
    const id = setInterval(save, 5000);
    return () => clearInterval(id);
  }, [cookies, totalCookiesBaked, clickCount, totalUpgradesBought, upgrades, prestigeLevel, achievements]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setCookies(data.cookies ?? 0);
        setTotalCookiesBaked(data.totalCookiesBaked ?? 0);
        setClickCount(data.clickCount ?? 0);
        setTotalUpgradesBought(data.totalUpgradesBought ?? 0);
        if (data.upgrades?.length) setUpgrades(data.upgrades);
        setPrestigeLevel(data.prestigeLevel ?? 0);
        if (data.achievements?.length) setAchievements(data.achievements);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const baseR = 70 * clickScale;
      const t = Date.now() / 1000;

      const gradient = ctx.createRadialGradient(cx - 20, cy - 20, 0, cx, cy, baseR + 20);
      gradient.addColorStop(0, '#fef3c7');
      gradient.addColorStop(0.5, '#fde68a');
      gradient.addColorStop(1, '#f59e0b');

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + Math.sin(t * 2) * 0.02, 1 + Math.cos(t * 2.1) * 0.02);
      ctx.translate(-cx, -cy);

      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.2;
        const r = 45 + Math.sin(i) * 10;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#78350f';
        ctx.fill();
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(cx - 15, cy - 10, 3, 0, Math.PI * 2);
      ctx.arc(cx + 20, cy + 15, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy - 25, 2, 0, Math.PI * 2);
      ctx.arc(cx - 25, cy + 20, 2.5, 0, Math.PI * 2);
      ctx.arc(cx + 15, cy - 18, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#451a03';
      ctx.fill();

      ctx.strokeStyle = 'rgba(120,53,15,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy + 5);
      ctx.lineTo(cx - 5, cy + 15);
      ctx.moveTo(cx + 10, cy - 15);
      ctx.lineTo(cx + 25, cy - 5);
      ctx.moveTo(cx - 10, cy - 20);
      ctx.lineTo(cx + 5, cy - 10);
      ctx.stroke();

      if (theme === 'gold' || theme === 'diamond' || theme === 'cosmic') {
        const glow = ctx.createRadialGradient(cx, cy, baseR - 20, cx, cy, baseR + 30);
        glow.addColorStop(0, 'transparent');
        glow.addColorStop(0.7, 'transparent');
        glow.addColorStop(1, theme === 'cosmic' ? 'rgba(139,92,246,0.3)' : theme === 'diamond' ? 'rgba(6,182,212,0.3)' : 'rgba(234,179,8,0.3)');
        ctx.fillStyle = glow;
        ctx.fill();
      }

      ctx.restore();
    };

    const raf = requestAnimationFrame(function frame() {
      draw();
      requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(raf);
  }, [clickScale, theme]);

  const timePlayed = Math.floor((Date.now() - startTime) / 1000);
  const hours = Math.floor(timePlayed / 3600);
  const mins = Math.floor((timePlayed % 3600) / 60);
  const secs = timePlayed % 60;

  return (
    <div className={`game-card ${themeColors.bg} ${themeColors.border} border-2 min-h-[500px] w-full max-w-lg mx-auto`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">🍪 Cookie Tapper</h2>
        <div className="flex gap-2">
          <button onClick={() => setStatsPanelOpen(s => !s)} className="btn-elite btn-elite-ghost text-sm">Stats</button>
          <button onClick={() => setAchievementsPanelOpen(a => !a)} className="btn-elite btn-elite-ghost text-sm">
            Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
          </button>
          {cookies >= 1000000 && (
            <button onClick={() => setPrestigeModalOpen(true)} className="btn-elite btn-elite-accent text-sm">
              Prestige
            </button>
          )}
          <button onClick={onClose} className="btn-elite btn-elite-ghost touch-manipulation active:scale-95">Close</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatCookies(cookies)} cookies
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {formatCookies(cps)}/sec
            {goldenBoostUntil > Date.now() && (
              <span className="ml-2 text-amber-600 font-bold">7x</span>
            )}
          </div>
          {prestigeLevel > 0 && (
            <div className="text-xs text-violet-600 mb-2">Prestige ×{prestigeMultiplier.toFixed(1)}</div>
          )}

          <div
            ref={cookieContainerRef}
            className="relative w-[220px] h-[220px] cursor-pointer select-none touch-manipulation flex items-center justify-center"
            style={{ touchAction: 'manipulation' }}
            onClick={handleCookieClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              const t = e.changedTouches[0];
              if (t) handleCookieClick({ clientX: t.clientX, clientY: t.clientY });
            }}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {particles.map(p => (
              (p.type ?? 'dot') === 'cookie' ? (
                <span
                  key={p.id}
                  className="absolute pointer-events-none text-lg select-none"
                  style={{
                    left: p.x - p.size / 2,
                    top: p.y - p.size / 2,
                    opacity: 1 - p.life / p.maxLife,
                    transform: `scale(${p.size / 20}) rotate(${p.life * 360}deg)`,
                  }}
                >
                  🍪
                </span>
              ) : (
                <div
                  key={p.id}
                  className="absolute w-2 h-2 rounded-full pointer-events-none"
                  style={{
                    left: p.x - 4,
                    top: p.y - 4,
                    background: `hsl(${p.hue}, 70%, 50%)`,
                    opacity: 1 - p.life / p.maxLife,
                    transform: `scale(${p.size / 4})`,
                  }}
                />
              )
            ))}
            {floaters.map(f => {
              const elapsed = (Date.now() - f.startTime) / 1000;
              const alpha = Math.max(0, 1 - elapsed / 1.2);
              const y = -elapsed * 60;
              return (
                <span
                  key={f.id}
                  className="absolute left-1/2 top-1/2 text-green-600 font-bold text-lg pointer-events-none"
                  style={{
                    marginLeft: f.x,
                    marginTop: f.y + y,
                    opacity: alpha,
                  }}
                >
                  {f.text}
                </span>
              );
            })}

            {goldenCookie && (
              <button
                onClick={(e) => { e.stopPropagation(); handleGoldenCookieClick(); }}
                className="absolute w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-amber-400 border-2 border-amber-600 shadow-lg hover:scale-110 transition-transform flex items-center justify-center touch-manipulation"
                style={{
                  left: goldenCookie.x,
                  top: goldenCookie.y,
                  animation: 'goldenCookiePulse 1.2s ease-in-out infinite',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(245, 158, 11, 0.4)',
                }}
              >
                ✨
              </button>
            )}

            {upgrades.filter(u => u.owned > 0).map((u, idx) => {
              const angle = (idx / Math.max(upgrades.filter(x => x.owned > 0).length, 1)) * Math.PI * 2 + Date.now() / 3000;
              const r = 95;
              const px = 110 + Math.cos(angle) * r;
              const py = 110 + Math.sin(angle) * r;
              return (
                <div
                  key={u.id}
                  className="absolute w-8 h-8 flex items-center justify-center text-lg pointer-events-none z-0"
                  style={{
                    left: px - 16,
                    top: py - 16,
                    transform: `scale(${0.7 + Math.sin(Date.now() / 500 + idx) * 0.1})`,
                    animation: 'upgradeFloat 2s ease-in-out infinite',
                    animationDelay: `${idx * 0.2}s`,
                  }}
                  title={`${u.name} ×${u.owned}`}
                >
                  {u.emoji}
                </div>
              );
            })}
            {cookieStorm && miniCookies.map(mc => (
              <button
                key={mc.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); handleMiniCookieClick(mc.id); }}
                className="absolute text-xl cursor-pointer hover:scale-125 transition-transform z-10 animate-bounce"
                style={{ left: mc.x, top: mc.y }}
              >
                🍪
              </button>
            ))}
          </div>

          <p className="mt-2 text-sm text-gray-500">Click or press Space • 1–9 to buy upgrades</p>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-3">Upgrades</h3>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-2">
            {upgrades.map((u, idx) => {
              const cost = getCost(u);
              const affordable = cookies >= cost;
              return (
                <button
                  key={u.id}
                  onClick={() => buyUpgrade(u.id)}
                  disabled={!affordable}
                  className={`btn-elite w-full flex justify-between items-center px-4 py-3 text-left ${
                    affordable ? 'btn-elite-primary' : 'btn-elite-ghost opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{u.emoji}</span>
                    <span>
                      <span className="font-medium">{u.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        (+{formatCookies(u.cps)}/s) ×{u.owned}
                      </span>
                    </span>
                  </span>
                  <span className="font-mono text-sm">
                    {formatCookies(cost)} 🍪 {u.keyBind > 0 && `[${u.keyBind}]`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {upgrades.filter(u => u.owned > 0).map(u => (
              <div
                key={u.id}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 border border-gray-200 text-sm"
                title={`${u.name} ×${u.owned}`}
              >
                <span>{u.emoji}</span>
                <span>×{u.owned}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {statsPanelOpen && (
        <div className="mt-4 p-4 rounded-lg bg-white/80 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Statistics Panel</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Cookies per second</div>
              <div className="font-mono font-bold">{formatCookies(cps)}</div>
            </div>
            <div>
              <div className="text-gray-500">Total baked</div>
              <div className="font-mono font-bold">{formatCookies(totalCookiesBaked + cookies)}</div>
            </div>
            <div>
              <div className="text-gray-500">Time played</div>
              <div className="font-mono font-bold">{hours}h {mins}m {secs}s</div>
            </div>
            <div>
              <div className="text-gray-500">Theme</div>
              <div className="font-bold capitalize">{theme}</div>
            </div>
            <div>
              <div className="text-gray-500">Total clicks</div>
              <div className="font-mono font-bold">{clickCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Upgrades bought</div>
              <div className="font-mono font-bold">{totalUpgradesBought}</div>
            </div>
            <div>
              <div className="text-gray-500">Prestige level</div>
              <div className="font-mono font-bold">{prestigeLevel}</div>
            </div>
            <div>
              <div className="text-gray-500">Achievements</div>
              <div className="font-mono font-bold">{achievements.filter(a => a.unlocked).length}/{achievements.length}</div>
            </div>
          </div>
        </div>
      )}

      {achievementsPanelOpen && (
        <div className="mt-4 p-4 rounded-lg bg-white/80 border border-gray-200 max-h-48 overflow-y-auto">
          <h4 className="font-semibold text-gray-900 mb-2">Achievements</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`flex items-center gap-2 p-2 rounded ${a.unlocked ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100 opacity-60'}`}
              >
                <span className="text-xl">{a.emoji}</span>
                <div>
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.desc}</div>
                </div>
                {a.unlocked && <span className="ml-auto text-amber-600">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {prestigeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPrestigeModalOpen(false)}>
          <div className="game-card bg-white p-6 max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">Prestige</h3>
            <p className="text-gray-600 mb-4">
              Reset all progress for a permanent +10% CPS multiplier. You have {formatCookies(cookies)} cookies.
              {prestigeLevel > 0 && ` Current multiplier: ×${prestigeMultiplier.toFixed(1)}`}
            </p>
            <div className="flex gap-2">
              <button onClick={doPrestige} disabled={cookies < 1000000} className="btn-elite btn-elite-accent">
                Prestige for ×{(prestigeLevel + 1) * 0.1 + 1} CPS
              </button>
              <button onClick={() => setPrestigeModalOpen(false)} className="btn-elite btn-elite-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showAchievementToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-amber-400 rounded-lg px-6 py-3 flex items-center gap-3 shadow-lg z-50 animate-pulse">
          <span className="text-3xl">{showAchievementToast.emoji}</span>
          <div>
            <div className="font-bold text-amber-900">Achievement Unlocked!</div>
            <div className="text-amber-800">{showAchievementToast.name}</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cookieFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.2); }
        }
        @keyframes goldenCookiePulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(251,191,36,0.8); }
          50% { transform: scale(1.15); box-shadow: 0 0 30px rgba(251,191,36,1), 0 0 50px rgba(245,158,11,0.6); }
        }
        .cookie-floater { animation: cookieFloat 0.8s ease-out forwards; }
      `}</style>

      {milestoneToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-100 border-2 border-amber-500 rounded-xl px-6 py-3 text-amber-900 font-bold shadow-lg z-50 animate-pulse">
          🎉 {milestoneToast}
        </div>
      )}
    </div>
  );
}
