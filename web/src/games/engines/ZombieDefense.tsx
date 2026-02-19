/* ═══════════════════════════════════════════════════════════
   ZOMBIE DEFENSE ENGINE — ELITE EDITION
   Used by: WordWave Survival, Science Defender, Data Defender, Storm Defenders
   Tower defense + quiz hybrid — answer questions to fire weapons,
   manage gold, upgrade towers, survive boss waves
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateMathQuestion, getRandomQuestion, type Grade, type Question } from '../questionBank';
import { sfxExplosion, sfxWrong, sfxGameOver, sfxCorrect, sfxShoot, sfxCoin, sfxLevelUp, sfxPop } from '../SoundEngine';

/* ─── Types ─────────────────────────────────────────────── */
type ZombieKind = 'walker' | 'runner' | 'tank' | 'flyer' | 'boss';
interface Zombie {
  id: number; x: number; y: number;
  direction: 'left' | 'right';
  speed: number; kind: ZombieKind;
  hp: number; maxHp: number;
  emoji: string; frozen: number;
  poisoned: number; size: number;
}

type WeaponKind = 'pea' | 'snow' | 'fire' | 'lightning' | 'bomb' | 'laser';
interface Projectile {
  id: number; x: number; y: number;
  vx: number; vy: number;
  weapon: WeaponKind; damage: number;
  targetId: number;
}

interface GoldDrop { id: number; x: number; y: number; amount: number; life: number; }
interface KillEffect { id: number; x: number; y: number; kind: ZombieKind; life: number; }
interface FloatingText { id: number; x: number; y: number; text: string; color: string; life: number; }

interface ThemeConfig {
  name: string; accent: string; groundColor: string;
  enemies: Record<ZombieKind, string[]>;
  bg: string;
}

/* ─── Theme Configs ─────────────────────────────────────── */
const themeData: Record<string, ThemeConfig> = {
  wordwave_survival: {
    name: 'WordWave Survival', accent: '#10b981', groundColor: '#065f46',
    enemies: {
      walker: ['🧟', '🧟‍♂️'], runner: ['🧟‍♀️', '💀'],
      tank: ['🦍', '🐻'], flyer: ['🦇', '👻'],
      boss: ['🐉'],
    },
    bg: 'linear-gradient(180deg, #ecfdf5, #d1fae5)',
  },
  science_defender: {
    name: 'Science Defender', accent: '#06b6d4', groundColor: '#155e75',
    enemies: {
      walker: ['🦠', '🧫'], runner: ['🧬', '⚗️'],
      tank: ['🔬', '🧪'], flyer: ['🫧', '💨'],
      boss: ['☣️'],
    },
    bg: 'linear-gradient(180deg, #ecfeff, #cffafe)',
  },
  data_defender: {
    name: 'Data Defender', accent: '#3b82f6', groundColor: '#1e3a5f',
    enemies: {
      walker: ['🐛', '🕷️'], runner: ['🦟', '🐜'],
      tank: ['💻', '🖥️'], flyer: ['📡', '⚠️'],
      boss: ['🤖'],
    },
    bg: 'linear-gradient(180deg, #eff6ff, #dbeafe)',
  },
  storm_defenders_vr: {
    name: 'Storm Defenders', accent: '#f97316', groundColor: '#7c2d12',
    enemies: {
      walker: ['🌪️', '⛈️'], runner: ['🔥', '❄️'],
      tank: ['🌊', '🌋'], flyer: ['⚡', '☁️'],
      boss: ['🐲'],
    },
    bg: 'linear-gradient(180deg, #fff7ed, #fed7aa)',
  },
  default: {
    name: 'Zombie Defense', accent: '#10b981', groundColor: '#065f46',
    enemies: {
      walker: ['🧟', '🧟‍♂️'], runner: ['🧟‍♀️', '💀'],
      tank: ['🦍', '🐻'], flyer: ['🦇', '👻'],
      boss: ['🐉'],
    },
    bg: 'linear-gradient(180deg, #ecfdf5, #d1fae5)',
  },
};

/* ─── Weapon/Tower Data ─────────────────────────────────── */
const WEAPONS: Record<WeaponKind, { name: string; emoji: string; damage: number; speed: number; cost: number; range: number; special: string; color: string }> = {
  pea:       { name: 'Pea Shooter', emoji: '🟢', damage: 1, speed: 6, cost: 0,   range: 25, special: 'Basic attack', color: '#22c55e' },
  snow:      { name: 'Snowball',    emoji: '❄️', damage: 1, speed: 4, cost: 30,  range: 22, special: 'Freezes enemies', color: '#38bdf8' },
  fire:      { name: 'Fireball',    emoji: '🔥', damage: 3, speed: 5, cost: 60,  range: 20, special: 'Burns over time', color: '#ef4444' },
  lightning: { name: 'Lightning',   emoji: '⚡', damage: 2, speed: 12, cost: 80,  range: 30, special: 'Chains to 2 nearby', color: '#facc15' },
  bomb:      { name: 'Bomb',        emoji: '💣', damage: 5, speed: 3, cost: 100, range: 28, special: 'Area damage', color: '#6b7280' },
  laser:     { name: 'Laser',       emoji: '🔴', damage: 4, speed: 20, cost: 150, range: 35, special: 'Pierces enemies', color: '#dc2626' },
};

const TOWER_SLOTS: { x: number; y: number }[] = [
  { x: 18, y: 25 }, { x: 35, y: 25 }, { x: 65, y: 25 }, { x: 82, y: 25 },
  { x: 18, y: 8 }, { x: 35, y: 8 }, { x: 65, y: 8 }, { x: 82, y: 8 },
];

interface DamageNumber { id: number; x: number; y: number; amount: number; life: number; }
interface AttackBeam { id: number; fromX: number; toX: number; toY: number; color: string; life: number; }
interface PlacedTower { id: number; slotIdx: number; kind: WeaponKind; level: number; cost: number; lastShot: number; }

let uid = 0;

/* ─── Component ─────────────────────────────────────────── */
export function ZombieDefense({ gameId, grade, onClose }: { gameId: string; grade: Grade; onClose: () => void }) {
  const t = themeData[gameId] || themeData.default;
  const [score, setScore] = useState(0);
  const [gold, setGold] = useState(20);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [enemies, setEnemies] = useState<Zombie[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [goldDrops, setGoldDrops] = useState<GoldDrop[]>([]);
  const [killEffects, setKillEffects] = useState<KillEffect[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [question, setQuestion] = useState<Question>(generateMathQuestion(grade));
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponKind>('pea');
  const [unlockedWeapons, setUnlockedWeapons] = useState<WeaponKind[]>(['pea']);
  const [streak, setStreak] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  const [waveCountdown, setWaveCountdown] = useState(0);
  const [placedTowers, setPlacedTowers] = useState<PlacedTower[]>([]);
  const [damageNumbers, setDamageNumbers] = useState<DamageNumber[]>([]);
  const [attackBeams, setAttackBeams] = useState<AttackBeam[]>([]);
  const [selectedTowerForUpgrade, setSelectedTowerForUpgrade] = useState<number | null>(null);
  const [knowledgeGate, setKnowledgeGate] = useState<{ show: boolean; question: Question; bonus: number } | null>(null);
  const [waveProgress, setWaveProgress] = useState({ total: 5, spawned: 0 });
  const [fastForward, setFastForward] = useState(false);
  const [zombiesKilled, setZombiesKilled] = useState(0);
  const [towersBuilt, setTowersBuilt] = useState(0);
  const [draggingTower, setDraggingTower] = useState<{ kind: WeaponKind; clientX: number; clientY: number } | null>(null);
  const [ghostTowerSlot, setGhostTowerSlot] = useState<number | null>(null);
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const [highScore] = useState(() => parseInt(localStorage.getItem(`sz_hs_${gameId}_zd`) || '0'));
  const tickRef = useRef<number | undefined>(undefined);
  const spawnRef = useRef<number | undefined>(undefined);
  const stateRef = useRef({ lives: 10, gameOver: false, wave: 1, gold: 20, score: 0, enemies: 0 });
  const knowledgeGateShownRef = useRef(false);
  const enemiesRef = useRef<Zombie[]>([]);
  const towerLastShotRef = useRef<Record<number, number>>({});

  /* ─── Update state ref ──────────────────────── */
  useEffect(() => {
    stateRef.current = { lives, gameOver, wave, gold, score, enemies: enemies.length };
  }, [lives, gameOver, wave, gold, score, enemies.length]);
  useEffect(() => { enemiesRef.current = enemies; }, [enemies]);

  /* ─── Next Question ─────────────────────────── */
  const nextQuestion = useCallback(() => {
    const subj = gameId.includes('science') ? 'science'
      : gameId.includes('vocab') || gameId.includes('word') ? 'vocabulary'
      : undefined;
    setQuestion(subj ? getRandomQuestion(grade, subj) : generateMathQuestion(grade));
  }, [gameId, grade]);

  /* ─── Spawn ─────────────────────────────────── */
  const spawnZombie = useCallback((forceKind?: ZombieKind) => {
    const st = stateRef.current;
    const w = st.wave;
    const dir = Math.random() > 0.5 ? 'left' : 'right';
    const kinds: ZombieKind[] = ['walker', 'walker', 'walker'];
    if (w >= 2) kinds.push('runner', 'runner');
    if (w >= 3) kinds.push('tank');
    if (w >= 4) kinds.push('flyer');
    const kind = forceKind || kinds[Math.floor(Math.random() * kinds.length)];

    const baseHp = kind === 'walker' ? 2 : kind === 'runner' ? 1 : kind === 'tank' ? 6 : kind === 'flyer' ? 2 : 20 + w * 5;
    const hp = Math.ceil(baseHp * (1 + (w - 1) * 0.15));
    const baseSpeed = kind === 'walker' ? 0.06 : kind === 'runner' ? 0.12 : kind === 'tank' ? 0.03 : kind === 'flyer' ? 0.08 : 0.025;
    const spd = baseSpeed + w * 0.004 + Math.random() * 0.01;
    const emojis = t.enemies[kind];
    const y = kind === 'flyer' ? 15 + Math.random() * 25 : 0;

    setEnemies(prev => [...prev, {
      id: uid++, x: dir === 'left' ? -3 : 103,
      y, direction: dir, speed: spd, kind, hp, maxHp: hp,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      frozen: 0, poisoned: 0,
      size: kind === 'boss' ? 2.2 : kind === 'tank' ? 1.4 : 1,
    }]);
  }, [t.enemies]);

  /* ─── Boss Wave ─────────────────────────────── */
  const spawnBoss = useCallback(() => {
    setBossActive(true);
    spawnZombie('boss');
    // Spawn minions alongside
    for (let i = 0; i < wave; i++) {
      setTimeout(() => spawnZombie(), i * 600);
    }
  }, [spawnZombie, wave]);

  /* ─── Wave management ───────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    const isBossWave = wave % 5 === 0;
    const waveTotal = isBossWave ? 1 + wave : Math.min(5 + wave * 2, 15);
    setWaveProgress({ total: waveTotal, spawned: 0 });

    if (isBossWave) {
      setWaveCountdown(3);
      const countdownInterval = setInterval(() => {
        setWaveCountdown(p => {
          if (p <= 1) {
            clearInterval(countdownInterval);
            spawnBoss();
            return 0;
          }
          return p - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }

    let spawned = 0;
    const interval = setInterval(() => {
      if (!stateRef.current.gameOver && spawned < waveTotal) {
        spawnZombie();
        spawned++;
        setWaveProgress(prev => ({ ...prev, spawned }));
      }
    }, Math.max(600, 2500 - wave * 150));
    spawnRef.current = interval as unknown as number;
    return () => clearInterval(interval);
  }, [spawnZombie, spawnBoss, gameOver, wave]);

  /* ─── Game tick (movement + collisions) ─────── */
  useEffect(() => {
    if (gameOver) return;
    tickRef.current = window.setInterval(() => {
      // Move enemies
      setEnemies(prev => {
        const updated = prev.map(e => {
          const freezeMul = e.frozen > 0 ? 0.3 : 1;
          return {
            ...e,
            x: e.direction === 'left' ? e.x + e.speed * freezeMul : e.x - e.speed * freezeMul,
            frozen: Math.max(0, e.frozen - 1),
            poisoned: Math.max(0, e.poisoned - 1),
            hp: e.poisoned > 0 ? e.hp - 0.02 : e.hp,
          };
        });

        // Check for enemies reaching center (40-60%)
        const reached = updated.filter(e => e.x > 40 && e.x < 60);
        if (reached.length > 0) {
          const dmg = reached.reduce((sum, e) => sum + (e.kind === 'boss' ? 5 : e.kind === 'tank' ? 2 : 1), 0);
          setLives(l => {
            const nl = Math.max(0, l - dmg);
            if (nl <= 0) {
              setGameOver(true);
              sfxGameOver();
              const s = stateRef.current.score;
              if (s > highScore) localStorage.setItem(`sz_hs_${gameId}_zd`, String(s));
            }
            return nl;
          });
          setShaking(true);
          setTimeout(() => setShaking(false), 200);
          return updated.filter(e => !(e.x > 40 && e.x < 60));
        }

        // Remove dead enemies
        const dead = updated.filter(e => e.hp <= 0);
        dead.forEach(e => {
          setZombiesKilled(k => k + 1);
          const goldAmount = e.kind === 'boss' ? 50 : e.kind === 'tank' ? 15 : 5;
          setGold(g => g + goldAmount);
          setScore(s => s + (e.kind === 'boss' ? 100 : e.kind === 'tank' ? 20 : 10));
          setKillEffects(p => [...p, { id: e.id, x: e.x, y: e.y, kind: e.kind, life: 15 }]);
          setGoldDrops(p => [...p, { id: uid++, x: e.x, y: 40, amount: goldAmount, life: 30 }]);
          if (e.kind === 'boss') {
            setBossActive(false);
            sfxLevelUp();
            setFloatingTexts(p => [...p, { id: uid++, x: 50, y: 30, text: 'BOSS DEFEATED!', color: '#f59e0b', life: 50 }]);
          }
          sfxExplosion();
        });

        return updated.filter(e => e.hp > 0);
      });

      // Move projectiles and check collisions
      setProjectiles(prev => {
        return prev.map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy })).filter(p => {
          if (p.x < -5 || p.x > 105) return false;

          // Check collision with enemies
          let hit = false;
          setEnemies(enemies => {
            const hitIdx = enemies.findIndex(e => Math.abs(e.x - p.x) < 4 && Math.abs(e.y - (p.y - 50)) < 15);
            if (hitIdx < 0) return enemies;
            hit = true;
            const hitEnemy = enemies[hitIdx];
            setDamageNumbers(dn => [...dn, { id: uid++, x: hitEnemy.x, y: hitEnemy.y, amount: p.damage, life: 30 }]);
            const bombDmg = Math.ceil(p.damage * 0.6);
            const chainTargets = p.weapon === 'lightning'
              ? enemies.filter(ev => ev.id !== hitEnemy.id && Math.abs(ev.x - hitEnemy.x) < 15).slice(0, 2)
              : [];
            const chainIds = new Set(chainTargets.map(ev => ev.id));
            const updated = enemies.map((e, i) => {
              if (i === hitIdx) {
                return { ...e, hp: e.hp - p.damage, frozen: p.weapon === 'snow' ? 60 : e.frozen, poisoned: p.weapon === 'fire' ? 80 : e.poisoned };
              }
              if (p.weapon === 'bomb' && Math.abs(e.x - p.x) < 12) {
                setDamageNumbers(dn => [...dn, { id: uid++, x: e.x, y: e.y, amount: bombDmg, life: 30 }]);
                return { ...e, hp: e.hp - bombDmg };
              }
              if (p.weapon === 'lightning' && chainIds.has(e.id)) {
                const chainDmg = Math.ceil(p.damage * 0.5);
                setDamageNumbers(dn => [...dn, { id: uid++, x: e.x, y: e.y, amount: chainDmg, life: 30 }]);
                return { ...e, hp: e.hp - chainDmg };
              }
              return e;
            });
            sfxPop();
            return updated;
          });

          return !hit && p.x > -5 && p.x < 105;
        });
      });

      // Decay effects
      setKillEffects(prev => prev.map(k => ({ ...k, life: k.life - 1 })).filter(k => k.life > 0));
      setGoldDrops(prev => prev.map(g => ({ ...g, life: g.life - 1, y: g.y - 0.3 })).filter(g => g.life > 0));
      setFloatingTexts(prev => prev.map(f => ({ ...f, life: f.life - 1, y: f.y - 0.3 })).filter(f => f.life > 0));
      setDamageNumbers(prev => prev.map(d => ({ ...d, life: d.life - 1, y: d.y + 0.8 })).filter(d => d.life > 0));
      setAttackBeams(prev => prev.map(b => ({ ...b, life: b.life - 1 })).filter(b => b.life > 0));

      // Wave clear -> Knowledge Gate -> advance
      setEnemies(curr => {
        if (curr.length === 0 && !stateRef.current.gameOver && !knowledgeGateShownRef.current) {
          knowledgeGateShownRef.current = true;
          const subj = gameId.includes('science') ? 'science' : gameId.includes('vocab') || gameId.includes('word') ? 'vocabulary' : undefined;
          const q = subj ? getRandomQuestion(grade, subj) : generateMathQuestion(grade);
          setKnowledgeGate({ show: true, question: q, bonus: 10 + wave * 5 });
          sfxLevelUp();
        }
        return curr;
      });
    }, fastForward ? 25 : 50);
    return () => clearInterval(tickRef.current);
  }, [gameOver, gameId, highScore, fastForward, wave, grade]);

  /* ─── Answer handler ────────────────────────── */
  const handleAnswer = (opt: string) => {
    if (feedback || gameOver) return;
    if (opt === question.answer) {
      setFeedback('correct');
      sfxCorrect();

      // Fire projectile
      const w = WEAPONS[selectedWeapon];
      const closestEnemy = enemies.sort((a, b) => Math.abs(50 - a.x) - Math.abs(50 - b.x))[0];
      if (closestEnemy) {
        const dir = closestEnemy.x < 50 ? -1 : 1;
        setProjectiles(prev => [...prev, {
          id: uid++, x: 50, y: 60,
          vx: -dir * w.speed * 0.3,
          vy: 0,
          weapon: selectedWeapon,
          damage: w.damage,
          targetId: closestEnemy.id,
        }]);
        sfxShoot();
      }

      setStreak(s => {
        const ns = s + 1;
        if (ns >= 5) {
          setGold(g => g + 10);
          setFloatingTexts(prev => [...prev, { id: uid++, x: 50, y: 55, text: `${ns}🔥 STREAK +10🪙`, color: '#f59e0b', life: 35 }]);
        }
        return ns;
      });
      setScore(s => s + 10 * wave);

      setTimeout(() => {
        setFeedback(null);
        nextQuestion();
      }, 350);
    } else {
      setFeedback('wrong');
      sfxWrong();
      setStreak(0);
      setLives(l => {
        const nl = l - 1;
        if (nl <= 0) { setGameOver(true); sfxGameOver(); }
        return Math.max(0, nl);
      });
      setShaking(true);
      setTimeout(() => setShaking(false), 200);
      setTimeout(() => setFeedback(null), 450);
    }
  };

  /* ─── Knowledge Gate answer ─────────────────── */
  const handleKnowledgeGateAnswer = (opt: string) => {
    if (!knowledgeGate) return;
    if (opt === knowledgeGate.question.answer) {
      setGold(g => g + knowledgeGate.bonus);
      setFloatingTexts(p => [...p, { id: uid++, x: 50, y: 40, text: `+${knowledgeGate.bonus} 🪙 Bonus!`, color: '#22c55e', life: 40 }]);
      sfxCorrect();
    }
    setKnowledgeGate(null);
    knowledgeGateShownRef.current = false;
    setWave(w => w + 1);
  };

  /* ─── Tower placement ───────────────────────── */
  const placeTower = (slotIdx: number, kind?: WeaponKind) => {
    const towerKind = kind ?? selectedWeapon;
    const cost = WEAPONS[towerKind].cost;
    if (unlockedWeapons.includes(towerKind) && gold >= cost && !placedTowers.find(t => t.slotIdx === slotIdx)) {
      setGold(g => g - cost);
      setPlacedTowers(p => [...p, { id: uid++, slotIdx, kind: towerKind, level: 1, cost, lastShot: 0 }]);
      setTowersBuilt(t => t + 1);
      sfxCoin();
      setDraggingTower(null);
      setGhostTowerSlot(null);
    }
  };

  const sellTower = (towerId: number) => {
    const t = placedTowers.find(x => x.id === towerId);
    if (t) {
      setGold(g => g + Math.floor(t.cost * 0.5));
      setPlacedTowers(p => p.filter(x => x.id !== towerId));
      setSelectedTowerForUpgrade(null);
      sfxCoin();
    }
  };

  const upgradeTower = (towerId: number) => {
    const t = placedTowers.find(x => x.id === towerId);
    if (!t) return;
    const upgradeCost = Math.floor(t.cost * 0.5) + 10;
    if (gold >= upgradeCost) {
      setGold(g => g - upgradeCost);
      setPlacedTowers(p => p.map(x => x.id === towerId ? { ...x, level: x.level + 1, cost: x.cost + upgradeCost, lastShot: x.lastShot } : x));
      setSelectedTowerForUpgrade(null);
      sfxLevelUp();
    }
  };

  const getClientCoords = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    return 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
  };

  const handleSlotPointerDown = (_e: React.MouseEvent | React.TouchEvent, slotIdx: number) => {
    if (gameOver) return;
    const existing = placedTowers.find(t => t.slotIdx === slotIdx);
    if (existing) {
      setSelectedTowerForUpgrade(existing.id);
    } else if (draggingTower) {
      placeTower(slotIdx, draggingTower.kind);
    } else if (!existing) {
      placeTower(slotIdx);
    }
  };

  const handleWeaponDragStart = (e: React.MouseEvent | React.TouchEvent, kind: WeaponKind) => {
    if (!unlockedWeapons.includes(kind) || gold < WEAPONS[kind].cost) return;
    e.preventDefault();
    const { x, y } = getClientCoords(e);
    setDraggingTower({ kind, clientX: x, clientY: y });
  };

  const handleWeaponPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!draggingTower || !battlefieldRef.current) return;
    const { x, y } = 'touches' in e ? { x: (e as React.TouchEvent).touches[0].clientX, y: (e as React.TouchEvent).touches[0].clientY } : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
    setDraggingTower(d => d ? { ...d, clientX: x, clientY: y } : null);
    const rect = battlefieldRef.current.getBoundingClientRect();
    const relX = ((x - rect.left) / rect.width) * 100;
    const relY = ((rect.bottom - y) / rect.height) * 100;
    let bestSlot = -1;
    let bestDist = 999;
    TOWER_SLOTS.forEach((s, i) => {
      if (placedTowers.find(t => t.slotIdx === i)) return;
      const d = Math.hypot(relX - s.x, relY - s.y);
      if (d < bestDist) { bestDist = d; bestSlot = i; }
    });
    setGhostTowerSlot(bestDist < 15 ? bestSlot : null);
  };

  const handleWeaponPointerEnd = () => {
    if (draggingTower && ghostTowerSlot !== null) {
      placeTower(ghostTowerSlot, draggingTower.kind);
    }
    setDraggingTower(null);
    setGhostTowerSlot(null);
  };

  useEffect(() => {
    if (!draggingTower) return;
    const move = (e: MouseEvent | TouchEvent) => handleWeaponPointerMove(e as unknown as React.MouseEvent);
    const end = () => handleWeaponPointerEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [draggingTower, ghostTowerSlot, placedTowers, selectedWeapon, gold, unlockedWeapons]);

  /* ─── Tower auto-fire ───────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setPlacedTowers(towers => {
        towers.forEach(t => {
          const slot = TOWER_SLOTS[t.slotIdx];
          const w = WEAPONS[t.kind];
          const dmg = w.damage * t.level;
          if (now - t.lastShot < 800) return;
          const inRange = enemies.filter(e => Math.abs(e.x - slot.x) < w.range);
          const target = inRange.sort((a, b) => Math.abs(50 - a.x) - Math.abs(50 - b.x))[0];
          if (target) {
            setProjectiles(prev => [...prev, {
              id: uid++,
              x: slot.x, y: 60 - slot.y,
              vx: (target.x - slot.x) * 0.08,
              vy: 0,
              weapon: t.kind,
              damage: dmg,
              targetId: target.id,
            }]);
            setDamageNumbers(dn => [...dn, { id: uid++, x: target.x, y: target.y, amount: dmg, life: 30 }]);
            setAttackBeams(ab => [...ab, { id: uid++, fromX: slot.x, toX: target.x, toY: target.y, life: 8, color: w.color }]);
            t.lastShot = now;
            sfxPop();
          }
        });
        return [...towers];
      });
    }, 200);
    return () => clearInterval(iv);
  }, [gameOver, enemies]);

  /* ─── Tower auto-fire ───────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    const iv = setInterval(() => {
      const now = Date.now();
      const currEnemies = enemiesRef.current;
      setPlacedTowers(towers => {
        const updated = towers.map(t => {
          const lastShot = towerLastShotRef.current[t.id] ?? 0;
          if (now - lastShot < 1000) return t;
          const slot = TOWER_SLOTS[t.slotIdx];
          const w = WEAPONS[t.kind];
          const dmg = w.damage * t.level;
          const inRange = currEnemies.filter(e => Math.abs(e.x - slot.x) < w.range);
          const target = inRange.sort((a, b) => Math.abs(50 - a.x) - Math.abs(50 - b.x))[0];
          if (target) {
            towerLastShotRef.current[t.id] = now;
            const vx = (target.x - slot.x) * 0.06;
            setProjectiles(prev => [...prev, {
              id: uid++, x: slot.x, y: 60 - slot.y,
              vx, vy: 0,
              weapon: t.kind,
              damage: dmg,
              targetId: target.id,
            }]);
            setDamageNumbers(dn => [...dn, { id: uid++, x: target.x, y: target.y, amount: dmg, life: 30 }]);
            setAttackBeams(ab => [...ab, { id: uid++, fromX: slot.x, toX: target.x, toY: target.y, life: 8, color: w.color }]);
            sfxPop();
          }
          return t;
        });
        return updated;
      });
    }, 250);
    return () => clearInterval(iv);
  }, [gameOver]);

  /* ─── Buy weapon ────────────────────────────── */
  const buyWeapon = (kind: WeaponKind) => {
    if (unlockedWeapons.includes(kind)) {
      setSelectedWeapon(kind);
      return;
    }
    const cost = WEAPONS[kind].cost;
    if (gold >= cost) {
      setGold(g => g - cost);
      setUnlockedWeapons(p => [...p, kind]);
      setSelectedWeapon(kind);
      sfxCoin();
      setFloatingTexts(p => [...p, { id: uid++, x: 50, y: 40, text: `${WEAPONS[kind].name} UNLOCKED!`, color: WEAPONS[kind].color, life: 40 }]);
    }
  };

  /* ─── Restart ───────────────────────────────── */
  const restart = () => {
    setScore(0); setGold(20); setLives(10); setWave(1);
    setGameOver(false); setEnemies([]); setProjectiles([]);
    setFeedback(null); setStreak(0); setBossActive(false);
    setSelectedWeapon('pea'); setUnlockedWeapons(['pea']);
    setKillEffects([]); setGoldDrops([]); setFloatingTexts([]);
    setPlacedTowers([]); setDamageNumbers([]); setAttackBeams([]);
    setKnowledgeGate(null); setSelectedTowerForUpgrade(null);
    setZombiesKilled(0); setTowersBuilt(0);
    knowledgeGateShownRef.current = false;
    nextQuestion();
  };

  const livesArr = Array.from({ length: 10 }, (_, i) => i < lives);

  return (
    <div className={`game-card !p-0 overflow-hidden animate-pop-in transition-transform ${shaking ? 'translate-x-1' : ''}`} style={{ border: `1px solid ${t.accent}30` }}>
      {/* ── Header ────────────────────────────────── */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200" style={{ background: `${t.accent}08` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black" style={{ color: t.accent }}>SCORE {score}</span>
          <span className="text-xs font-bold text-gray-500">WAVE {wave}</span>
          <span className="text-xs font-bold text-amber-500">🪙 {gold}</span>
          {streak >= 3 && <span className="text-[10px] font-black text-orange-500 animate-pulse">{streak}🔥</span>}
          {bossActive && <span className="text-[10px] font-black text-red-500 animate-pulse">⚠️ BOSS</span>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-all">✕</button>
      </div>

      {/* ── Lives + Wave progress ───────────────────── */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-0.5 flex-1">
          {livesArr.map((alive, i) => (
            <div key={i} className={`w-5 h-2 rounded-full transition-all ${alive ? 'bg-red-400' : 'bg-gray-200'}`} />
          ))}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500">Wave</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 transition-all duration-300" style={{
              width: `${waveProgress.total ? Math.min(100, (enemies.length / waveProgress.total) * 100) : 0}%`,
            }} />
          </div>
          <span className="text-[10px] font-bold">{enemies.length}/{waveProgress.total}</span>
        </div>
        <button onClick={() => setFastForward(f => !f)} className={`px-2 py-1 rounded text-[10px] font-bold ${fastForward ? 'bg-amber-200' : 'bg-gray-200'}`}>
          {fastForward ? '2x' : '1x'}
        </button>
      </div>

      {/* ── Battlefield ───────────────────────────── */}
      <div ref={battlefieldRef} className="relative overflow-hidden" style={{ height: '240px', background: t.bg }} onMouseMove={handleWeaponPointerMove} onTouchMove={handleWeaponPointerMove}>
        {/* Game Over */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/90 backdrop-blur-md">
            <div className="text-5xl mb-3">{t.enemies.boss[0]}</div>
            <h3 className="text-2xl font-black text-gray-800 mb-1">Overrun!</h3>
            <p className="text-3xl font-black mb-1" style={{ color: t.accent }}>{score} pts</p>
            <div className="text-left bg-gray-50 rounded-xl p-4 mb-4 text-sm space-y-1">
              <p><strong>Wave reached:</strong> {wave}</p>
              <p><strong>Towers built:</strong> {towersBuilt}</p>
              <p><strong>Zombies killed:</strong> {zombiesKilled}</p>
              <p><strong>Best score:</strong> {Math.max(score, highScore)}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={restart} className="btn-elite btn-elite-primary text-sm">Play Again</button>
              <button onClick={onClose} className="btn-elite btn-elite-ghost text-sm">Exit</button>
            </div>
          </div>
        )}

        {/* Wave countdown */}
        {waveCountdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-sm">
            <div className="text-center">
              <p className="text-red-500 font-black text-lg animate-pulse">⚠️ BOSS WAVE INCOMING ⚠️</p>
              <p className="text-white text-4xl font-black mt-2">{waveCountdown}</p>
            </div>
          </div>
        )}

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-14" style={{ background: t.groundColor }} />
        <div className="absolute bottom-14 left-0 right-0 h-px" style={{ background: `${t.accent}30` }} />

        {/* Grass/detail lines */}
        <div className="absolute bottom-14 left-0 right-0 flex justify-around">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-px h-2" style={{ background: `${t.accent}25`, transform: `rotate(${Math.sin(i) * 15}deg)` }} />
          ))}
        </div>

        {/* Player tower */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          <div className="text-3xl" style={{ filter: `drop-shadow(0 0 12px ${t.accent}60)` }}>
            🏰
          </div>
          {/* Tower weapon indicator */}
          <div className="text-xs mt-0.5">{WEAPONS[selectedWeapon].emoji}</div>
        </div>

        {/* Range visualization when weapon selected */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 pointer-events-none" style={{
          width: `${WEAPONS[selectedWeapon].range * 4}%`,
          height: '80px',
          borderRadius: '50%',
          border: `2px dashed ${WEAPONS[selectedWeapon].color}`,
          opacity: 0.3,
          background: `${WEAPONS[selectedWeapon].color}15`,
        }} />

        {/* Tower slots */}
        {TOWER_SLOTS.map((slot, i) => {
          const pt = placedTowers.find(t => t.slotIdx === i);
          return (
            <div
              key={i}
              onMouseDown={e => handleSlotPointerDown(e, i)}
              onTouchStart={e => handleSlotPointerDown(e, i)}
              className="absolute w-10 h-10 flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-all touch-manipulation"
              style={{
                left: `${slot.x}%`,
                bottom: `${14 + slot.y}px`,
                transform: 'translate(-50%, 50%)',
                background: pt ? `${WEAPONS[pt.kind].color}40` : ghostTowerSlot === i ? `${WEAPONS[selectedWeapon].color}30` : 'rgba(255,255,255,0.1)',
                borderColor: pt ? WEAPONS[pt.kind].color : ghostTowerSlot === i ? WEAPONS[selectedWeapon].color : 'rgba(255,255,255,0.3)',
                zIndex: 8,
                minHeight: 48,
                touchAction: 'none',
              }}
            >
              {pt ? (
                <span className="text-xl" title={`${WEAPONS[pt.kind].name} Lv${pt.level}`}>{WEAPONS[pt.kind].emoji}</span>
              ) : (
                <span className="text-gray-400 text-xs">+</span>
              )}
            </div>
          );
        })}

        {/* Placed tower upgrade panel */}
        {selectedTowerForUpgrade !== null && (() => {
          const pt = placedTowers.find(t => t.id === selectedTowerForUpgrade);
          if (!pt) return null;
          const slot = TOWER_SLOTS[pt.slotIdx];
          const w = WEAPONS[pt.kind];
          const upgradeCost = Math.floor(pt.cost * 0.5) + 10;
          return (
            <div
              className="absolute z-25 bg-white rounded-xl shadow-xl border-2 p-3 min-w-[140px]"
              style={{
                left: `${Math.min(Math.max(slot.x, 15), 85)}%`,
                bottom: `${14 + slot.y + 35}px`,
                transform: 'translateX(-50%)',
                borderColor: w.color,
              }}
            >
              <p className="font-bold text-sm mb-1">{w.name} Lv{pt.level}</p>
              <p className="text-xs text-gray-600 mb-2">Dmg: {w.damage * pt.level} | Range: {w.range}</p>
              <div className="flex gap-1">
                <button onClick={() => upgradeTower(pt.id)} disabled={gold < upgradeCost} className="flex-1 py-1 rounded bg-green-100 text-green-800 text-xs font-bold disabled:opacity-50">Upg {upgradeCost}🪙</button>
                <button onClick={() => sellTower(pt.id)} className="flex-1 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">Sell {Math.floor(pt.cost * 0.5)}🪙</button>
              </div>
              <button onClick={() => setSelectedTowerForUpgrade(null)} className="mt-2 w-full py-1 rounded bg-gray-100 text-xs">Close</button>
            </div>
          );
        })()}

        {/* Knowledge Gate popup */}
        {knowledgeGate && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h4 className="text-lg font-black text-amber-600 mb-2">🧠 Knowledge Gate — +{knowledgeGate.bonus}🪙 bonus!</h4>
              <p className="text-center text-xl font-bold mb-4">{knowledgeGate.question.text}</p>
              <div className="grid grid-cols-2 gap-2">
                {knowledgeGate.question.options.map((opt, i) => (
                  <button key={i} onClick={() => handleKnowledgeGateAnswer(opt)} className="py-3 rounded-xl font-bold border border-gray-200 hover:bg-amber-50 active:scale-95">
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Attack beams */}
        {attackBeams.map(b => (
          <div key={b.id} className="absolute pointer-events-none z-18" style={{
            left: `${Math.min(b.fromX, b.toX)}%`,
            bottom: `${20 + b.toY}px`,
            width: `${Math.abs(b.toX - b.fromX)}%`,
            height: 2,
            background: `linear-gradient(90deg, ${b.color}, transparent)`,
            opacity: b.life / 8,
            transform: 'translateY(-50%)',
          }} />
        ))}

        {/* Damage numbers */}
        {damageNumbers.map(d => (
          <div key={d.id} className="absolute z-20 font-black text-red-600 text-sm pointer-events-none animate-bounce" style={{
            left: `${d.x}%`,
            bottom: `${14 + d.y}px`,
            transform: 'translateX(-50%)',
            opacity: d.life / 30,
            textShadow: '0 0 2px white',
          }}>
            -{d.amount}
          </div>
        ))}

        {/* Enemies */}
        {enemies.map(e => (
          <div key={e.id} className="absolute transition-none" style={{
            bottom: `${14 + e.y}px`,
            left: `${e.x}%`,
            transform: `translateX(-50%) scaleX(${e.direction === 'left' ? 1 : -1}) scale(${e.size})`,
            zIndex: e.kind === 'boss' ? 15 : 5,
          }}>
            <div className="relative">
              {/* HP bar - always visible for all zombies */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.max(0, (e.hp / e.maxHp) * 100)}%`,
                  background: e.hp / e.maxHp > 0.5 ? '#22c55e' : e.hp / e.maxHp > 0.25 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
              {/* Frozen indicator */}
              {e.frozen > 0 && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px]">❄️</div>}
              {/* Poisoned indicator */}
              {e.poisoned > 0 && <div className="absolute -top-3 right-0 text-[8px]">🔥</div>}
              <div className="text-2xl" style={{
                animation: e.kind === 'flyer' ? 'float 1.5s ease-in-out infinite' : 'none',
                filter: `drop-shadow(0 0 ${e.kind === 'boss' ? '10' : '4'}px rgba(255,0,0,${e.kind === 'boss' ? 0.6 : 0.3}))`,
                opacity: e.frozen > 0 ? 0.6 : 1,
              }}>
                {e.emoji}
              </div>
            </div>
          </div>
        ))}

        {/* Projectiles */}
        {projectiles.map(p => (
          <div key={p.id} className="absolute" style={{
            left: `${p.x}%`,
            bottom: `${p.y}px`,
            fontSize: '14px',
            zIndex: 12,
            transition: 'none',
          }}>
            {p.weapon === 'pea' ? '🟢' : p.weapon === 'snow' ? '❄️' : p.weapon === 'fire' ? '🔥' : p.weapon === 'lightning' ? '⚡' : p.weapon === 'bomb' ? '💣' : '🔴'}
          </div>
        ))}

        {/* Kill effects */}
        {killEffects.map(k => (
          <div key={k.id} className="absolute z-20 animate-pop-in" style={{
            left: `${k.x}%`, bottom: `${20 + k.y}px`, transform: 'translateX(-50%)',
            opacity: k.life / 15,
          }}>
            <div className={`${k.kind === 'boss' ? 'text-4xl' : 'text-xl'}`}>💥</div>
          </div>
        ))}

        {/* Gold drops */}
        {goldDrops.map(g => (
          <div key={g.id} className="absolute z-20 text-xs font-black text-amber-500" style={{
            left: `${g.x}%`, bottom: `${g.y}%`, transform: 'translateX(-50%)',
            opacity: g.life / 30,
          }}>
            +{g.amount} 🪙
          </div>
        ))}

        {/* Floating texts */}
        {floatingTexts.map(f => (
          <div key={f.id} className="absolute z-20 text-sm font-black" style={{
            left: `${f.x}%`, bottom: `${f.y}%`, transform: 'translateX(-50%)',
            color: f.color, opacity: f.life / 50,
          }}>
            {f.text}
          </div>
        ))}

        {/* Danger border */}
        {enemies.filter(e => Math.abs(50 - e.x) < 18).length > 0 && (
          <div className="absolute inset-0 border-2 border-red-400/30 animate-pulse pointer-events-none rounded" />
        )}
      </div>

      {/* ── Weapon/Tower Shop Bar ─────────────────── */}
      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50 overflow-x-auto">
        {(Object.keys(WEAPONS) as WeaponKind[]).map(kind => {
          const w = WEAPONS[kind];
          const unlocked = unlockedWeapons.includes(kind);
          const active = selectedWeapon === kind;
          const canAfford = gold >= w.cost;
          const canPlace = unlocked && (gold >= w.cost || kind === 'pea');
          return (
            <button
              key={kind}
              onMouseDown={e => { if (canPlace) handleWeaponDragStart(e, kind); }}
              onTouchStart={e => { if (canPlace) handleWeaponDragStart(e, kind); }}
              onClick={() => buyWeapon(kind)}
              className={`flex-shrink-0 flex flex-col items-center min-h-[56px] min-w-[64px] px-3 py-2 rounded-xl text-[10px] font-bold border-2 transition-all touch-manipulation ${
                active ? 'border-gray-500 bg-white shadow-md ring-2 ring-offset-1' :
                unlocked ? 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50' :
                canAfford ? 'border-amber-300 bg-amber-50 hover:bg-amber-100' :
                'border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!unlocked && !canAfford}
              title={`${w.name}: ${w.special} | Range: ${w.range}`}
              style={{ touchAction: 'none' }}
            >
              <span className="text-2xl mb-1">{w.emoji}</span>
              <span className="font-bold truncate max-w-full">{w.name.split(' ')[0]}</span>
              {!unlocked && <span className="text-amber-600 text-[9px]">🪙{w.cost}</span>}
              {active && <span className="text-green-500 text-xs">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Ghost tower while dragging */}
      {draggingTower && (
        <div
          className="fixed pointer-events-none z-50 flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 opacity-80"
          style={{
            left: draggingTower.clientX,
            top: draggingTower.clientY,
            transform: 'translate(-50%, -50%)',
            background: `${WEAPONS[draggingTower.kind].color}90`,
            borderColor: WEAPONS[draggingTower.kind].color,
          }}
        >
          <span className="text-2xl">{WEAPONS[draggingTower.kind].emoji}</span>
        </div>
      )}

      {/* ── Question + Answers ─────────────────────── */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <p className="text-gray-400 text-[10px] font-bold tracking-wider">ANSWER TO FIRE {WEAPONS[selectedWeapon].emoji}</p>
          {streak >= 3 && <p className="text-[10px] font-black text-orange-500">{streak}🔥 streak</p>}
        </div>
        <p className={`text-center text-2xl font-black mb-3 transition-all duration-200 ${
          feedback === 'correct' ? 'text-green-500 scale-105' : feedback === 'wrong' ? 'text-red-500 scale-95' : 'text-gray-800'
        }`}>
          {question.text}
          {feedback === 'correct' && ' ✓'}
          {feedback === 'wrong' && ` ✗ → ${question.answer}`}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt, i) => (
            <button
              key={`${opt}-${i}-${question.text}`}
              onClick={() => handleAnswer(opt)}
              disabled={!!feedback}
              className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 border ${
                feedback && opt === question.answer
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : feedback === 'wrong' && opt !== question.answer
                  ? 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div className="p-2 text-center text-gray-400 text-[10px] border-t border-gray-200">
        Answer correctly to fire! Earn 🪙 to unlock weapons. Boss every 5 waves!
      </div>
    </div>
  );
}
