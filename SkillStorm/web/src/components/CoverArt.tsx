/* ═══════════════════════════════════════════════════════════════════════════════
   COVER ART — Premium Game Cover Art Component v4
   Renders unique SVG-based artwork for each game using coverScene identifiers.
   Each scene has hand-crafted SVG elements that create a distinctive look.
   Falls back to professional text-based design with animated gradients.
   Fully responsive — looks elite on phone, tablet, and desktop.
   NO external image files needed — everything is inline SVG + CSS.
   ═══════════════════════════════════════════════════════════════════════════════ */
import { memo } from 'react';

interface CoverArtProps {
  title: string;
  icon: string;
  gradient: string;
  engine?: string;
  subject?: string;
  coverScene?: string;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

/* ── Category/Subject Theme Config ── */
interface ThemeConfig {
  accent: string;
  accentLight: string;
  symbol: string;
  bgPattern: string;
}

const THEMES: Record<string, ThemeConfig> = {
  action: { accent: '#ef4444', accentLight: 'rgba(239,68,68,0.15)', symbol: '⚡', bgPattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)' },
  puzzle: { accent: '#8b5cf6', accentLight: 'rgba(139,92,246,0.15)', symbol: '🧩', bgPattern: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.04) 0%, transparent 50%)' },
  classic: { accent: '#f59e0b', accentLight: 'rgba(245,158,11,0.15)', symbol: '🎮', bgPattern: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 21px)' },
  speed: { accent: '#06b6d4', accentLight: 'rgba(6,182,212,0.15)', symbol: '💨', bgPattern: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.02) 8px, rgba(255,255,255,0.02) 9px)' },
  strategy: { accent: '#10b981', accentLight: 'rgba(16,185,129,0.15)', symbol: '♟', bgPattern: 'repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px' },
  math: { accent: '#3b82f6', accentLight: 'rgba(59,130,246,0.15)', symbol: '∑', bgPattern: 'repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 31px)' },
  science: { accent: '#22c55e', accentLight: 'rgba(34,197,94,0.15)', symbol: '⚛', bgPattern: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 70%)' },
  reading: { accent: '#ec4899', accentLight: 'rgba(236,72,153,0.15)', symbol: '📖', bgPattern: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.02) 15px, rgba(255,255,255,0.02) 16px)' },
  vocabulary: { accent: '#f97316', accentLight: 'rgba(249,115,22,0.15)', symbol: 'Aa', bgPattern: 'repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(255,255,255,0.015) 12px, rgba(255,255,255,0.015) 13px)' },
  history: { accent: '#a855f7', accentLight: 'rgba(168,85,247,0.15)', symbol: '⏳', bgPattern: 'linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.03) 75%, transparent 75%)' },
  geography: { accent: '#14b8a6', accentLight: 'rgba(20,184,166,0.15)', symbol: '🌍', bgPattern: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.04) 0%, transparent 40%)' },
  coding: { accent: '#6366f1', accentLight: 'rgba(99,102,241,0.15)', symbol: '</>', bgPattern: 'repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 19px)' },
  art: { accent: '#f43f5e', accentLight: 'rgba(244,63,94,0.15)', symbol: '🎨', bgPattern: 'radial-gradient(circle at 20% 80%, rgba(255,100,100,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(100,100,255,0.04) 0%, transparent 40%)' },
};

const DEFAULT_THEME: ThemeConfig = {
  accent: '#6C5CE7', accentLight: 'rgba(108,92,231,0.15)', symbol: '✦',
  bgPattern: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 60%)',
};

function getTheme(category?: string, subject?: string, engine?: string): ThemeConfig {
  if (category && THEMES[category]) return THEMES[category];
  if (subject && THEMES[subject]) return THEMES[subject];
  if (engine) {
    const engineMap: Record<string, string> = {
      SpaceShooter: 'action', DashRunner: 'speed', BalloonPop: 'puzzle',
      ZombieDefense: 'strategy', WordBuilder: 'vocabulary', SpeedQuiz: 'speed',
      TargetRange: 'action', MemoryMatrix: 'puzzle',
    };
    const mapped = engineMap[engine];
    if (mapped && THEMES[mapped]) return THEMES[mapped];
  }
  return DEFAULT_THEME;
}

function getInitials(title: string): string {
  const words = title.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ═══════════════════════════════════════════════════════════
   SVG SCENE RENDERER — Unique artwork for each game
   Each scene ID maps to a hand-crafted inline SVG.
   ═══════════════════════════════════════════════════════════ */
function renderScene(scene: string): JSX.Element {
  const scenes: Record<string, () => JSX.Element> = {
    snake: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#16a34a"/></linearGradient></defs>
        {[{x:60,y:80},{x:80,y:80},{x:100,y:80},{x:100,y:100},{x:100,y:120},{x:120,y:120},{x:140,y:120}].map((p,i)=>(
          <rect key={i} x={p.x} y={p.y} width="18" height="18" rx="4" fill="url(#sg)" opacity={0.5+i*0.07}/>
        ))}
        <circle cx="147" cy="127" r="3" fill="#fff"/>
        <circle cx="42" cy="42" r="6" fill="#fbbf24" opacity="0.9"/><circle cx="42" cy="42" r="3" fill="#fff" opacity="0.6"/>
        <rect x="20" y="20" width="160" height="160" rx="8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="8 4"/>
      </svg>
    ),
    tetris: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[
          {x:40,y:140,c:'#3b82f6'},{x:60,y:140,c:'#3b82f6'},{x:60,y:120,c:'#3b82f6'},{x:80,y:140,c:'#3b82f6'},
          {x:100,y:140,c:'#f97316'},{x:120,y:140,c:'#f97316'},{x:120,y:120,c:'#f97316'},{x:120,y:100,c:'#f97316'},
          {x:40,y:160,c:'#22c55e'},{x:60,y:160,c:'#22c55e'},{x:80,y:160,c:'#22c55e'},{x:100,y:160,c:'#22c55e'},
          {x:80,y:80,c:'#eab308'},{x:100,y:80,c:'#eab308'},{x:80,y:60,c:'#eab308'},{x:100,y:60,c:'#eab308'},
          {x:60,y:40,c:'#ec4899'},{x:80,y:40,c:'#ec4899'},{x:100,y:40,c:'#ec4899'},{x:100,y:20,c:'#ec4899'},
        ].map((b,i)=>(
          <g key={i}><rect x={b.x} y={b.y} width="18" height="18" rx="3" fill={b.c} opacity="0.85"/>
          <rect x={b.x+2} y={b.y+2} width="14" height="4" rx="1" fill="rgba(255,255,255,0.25)"/></g>
        ))}
      </svg>
    ),
    pong: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="8 6"/>
        <rect x="25" y="65" width="8" height="45" rx="4" fill="#fff" opacity="0.9"/>
        <rect x="167" y="85" width="8" height="45" rx="4" fill="#fff" opacity="0.9"/>
        <circle cx="105" cy="95" r="8" fill="#fff" opacity="0.85"/>
        <text x="60" y="40" fill="rgba(255,255,255,0.4)" fontSize="24" fontWeight="bold" fontFamily="monospace">3</text>
        <text x="130" y="40" fill="rgba(255,255,255,0.4)" fontSize="24" fontWeight="bold" fontFamily="monospace">5</text>
      </svg>
    ),
    cards: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor="#f1f5f9"/></linearGradient></defs>
        <g transform="rotate(-15,90,100)"><rect x="50" y="50" width="60" height="85" rx="6" fill="url(#cg)" opacity="0.9"/><text x="58" y="75" fill="#ef4444" fontSize="16" fontWeight="bold">A</text><text x="58" y="125" fill="#ef4444" fontSize="20">♥</text></g>
        <g transform="rotate(5,110,100)"><rect x="75" y="55" width="60" height="85" rx="6" fill="url(#cg)" opacity="0.9"/><text x="83" y="80" fill="#1e293b" fontSize="16" fontWeight="bold">K</text><text x="83" y="130" fill="#1e293b" fontSize="20">♠</text></g>
        <g transform="rotate(20,130,100)"><rect x="100" y="60" width="60" height="85" rx="6" fill="url(#cg)" opacity="0.85"/><text x="108" y="85" fill="#ef4444" fontSize="16" fontWeight="bold">Q</text><text x="108" y="135" fill="#ef4444" fontSize="20">♦</text></g>
      </svg>
    ),
    bricks: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'].map((c,row)=>
          Array.from({length:5}).map((_,col)=>(
            <rect key={`${row}-${col}`} x={22+col*32} y={25+row*18} width="30" height="15" rx="3" fill={c} opacity={row<3&&col===2?0:0.8}/>
          ))
        )}
        <circle cx="100" cy="140" r="6" fill="#fff" opacity="0.9"/>
        <rect x="70" y="170" width="50" height="8" rx="4" fill="#fff" opacity="0.8"/>
      </svg>
    ),
    flappy: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="130" y="0" width="28" height="70" rx="4" fill="#22c55e" opacity="0.7"/>
        <rect x="130" y="110" width="28" height="90" rx="4" fill="#22c55e" opacity="0.7"/>
        <circle cx="80" cy="85" r="14" fill="#fbbf24"/>
        <circle cx="86" cy="81" r="4" fill="#fff"/><circle cx="87" cy="82" r="2" fill="#1e293b"/>
        <path d="M94 85 L104 85 L94 90Z" fill="#ef4444"/>
        <path d="M68 78 Q60 65 72 72" stroke="#fbbf24" strokeWidth="3" fill="none"/>
        <rect x="0" y="180" width="200" height="20" fill="#22c55e" opacity="0.3"/>
      </svg>
    ),
    dino: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="160" x2="200" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
        <g transform="translate(55,105)">
          <rect x="0" y="0" width="30" height="35" rx="4" fill="#fff" opacity="0.85"/>
          <rect x="20" y="-15" width="20" height="20" rx="3" fill="#fff" opacity="0.85"/>
          <circle cx="33" cy="-8" r="3" fill="#1e293b"/>
          <rect x="5" y="35" width="6" height="20" rx="2" fill="#fff" opacity="0.85"/>
          <rect x="20" y="35" width="6" height="20" rx="2" fill="#fff" opacity="0.85"/>
        </g>
        <g transform="translate(140,130)">
          <rect x="0" y="0" width="4" height="30" fill="#22c55e" opacity="0.6"/>
          <circle cx="2" cy="-5" r="8" fill="#22c55e" opacity="0.4"/>
        </g>
        <g transform="translate(170,140)">
          <rect x="0" y="0" width="3" height="20" fill="#22c55e" opacity="0.5"/>
          <circle cx="1.5" cy="-3" r="5" fill="#22c55e" opacity="0.35"/>
        </g>
      </svg>
    ),
    space: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[{x:45,y:30},{x:75,y:30},{x:105,y:30},{x:135,y:30},{x:55,y:55},{x:85,y:55},{x:115,y:55},{x:125,y:55}].map((a,i)=>(
          <g key={i}><rect x={a.x} y={a.y} width="20" height="16" rx="3" fill={i<4?'#a855f7':'#22c55e'} opacity="0.8"/>
          <rect x={a.x+7} y={a.y+4} width="2" height="5" rx="1" fill="rgba(255,255,255,0.5)"/><rect x={a.x+11} y={a.y+4} width="2" height="5" rx="1" fill="rgba(255,255,255,0.5)"/></g>
        ))}
        <polygon points="100,160 90,175 110,175" fill="#0ea5e9" opacity="0.9"/>
        <rect x="97" y="148" width="6" height="4" rx="1" fill="#ef4444"/>
        {[{x:30,y:90},{x:160,y:45},{x:140,y:140},{x:25,y:160}].map((s,i)=>(
          <circle key={i} cx={s.x} cy={s.y} r="1.5" fill="#fff" opacity={0.3+i*0.15}/>
        ))}
      </svg>
    ),
    fruit: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="65" cy="80" rx="25" ry="22" fill="#ef4444" opacity="0.8"/>
        <ellipse cx="65" cy="80" rx="22" ry="19" fill="#dc2626" opacity="0.5"/>
        <path d="M65 58 Q60 45 68 48 Q72 42 70 55" fill="#22c55e" opacity="0.7"/>
        <ellipse cx="130" cy="100" rx="18" ry="18" fill="#f97316" opacity="0.8"/>
        <ellipse cx="85" cy="140" rx="28" ry="20" fill="#22c55e" opacity="0.7"/>
        <path d="M85 120 Q82 110 88 112" fill="#166534" opacity="0.5"/>
        <line x1="30" y1="30" x2="170" y2="170" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="6 4"/>
      </svg>
    ),
    simon: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 100 L100 30 A70 70 0 0 1 170 100 Z" fill="#ef4444" opacity="0.8"/>
        <path d="M100 100 L170 100 A70 70 0 0 1 100 170 Z" fill="#3b82f6" opacity="0.8"/>
        <path d="M100 100 L100 170 A70 70 0 0 1 30 100 Z" fill="#22c55e" opacity="0.8"/>
        <path d="M100 100 L30 100 A70 70 0 0 1 100 30 Z" fill="#eab308" opacity="0.8"/>
        <circle cx="100" cy="100" r="18" fill="rgba(0,0,0,0.3)"/>
        <circle cx="100" cy="100" r="12" fill="rgba(255,255,255,0.1)"/>
      </svg>
    ),
    maze: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[
          'M30,30 L30,80','M30,30 L80,30','M60,30 L60,60','M80,30 L80,80','M30,60 L50,60',
          'M100,30 L100,50','M120,30 L120,80','M140,30 L170,30','M170,30 L170,80',
          'M30,100 L60,100','M80,100 L80,140','M30,120 L30,170','M30,170 L80,170',
          'M100,100 L100,140','M120,100 L170,100','M140,120 L170,120','M170,120 L170,170',
          'M100,170 L140,170','M120,140 L120,170',
        ].map((d,i)=>(
          <path key={i} d={d} stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" strokeLinecap="round"/>
        ))}
        <circle cx="45" cy="45" r="5" fill="#22c55e" opacity="0.9"/>
        <circle cx="155" cy="155" r="5" fill="#ef4444" opacity="0.9"/>
      </svg>
    ),
    tiles2048: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="30" width="140" height="140" rx="8" fill="rgba(0,0,0,0.15)"/>
        {[
          {x:38,y:38,v:'2',c:'#fef3c7'},{x:76,y:38,v:'4',c:'#fde68a'},{x:114,y:38,v:'',c:'rgba(255,255,255,0.05)'},
          {x:38,y:76,v:'8',c:'#fdba74'},{x:76,y:76,v:'16',c:'#fb923c'},{x:114,y:76,v:'32',c:'#f97316'},
          {x:38,y:114,v:'',c:'rgba(255,255,255,0.05)'},{x:76,y:114,v:'256',c:'#dc2626'},{x:114,y:114,v:'2048',c:'#eab308'},
        ].map((t,i)=>(
          <g key={i}><rect x={t.x} y={t.y} width="30" height="30" rx="4" fill={t.c} opacity="0.9"/>
          {t.v && <text x={t.x+15} y={t.y+19} textAnchor="middle" fill={['2','4'].includes(t.v)?'#78716c':'#fff'} fontSize={t.v.length>2?'7':'11'} fontWeight="bold">{t.v}</text>}
          </g>
        ))}
      </svg>
    ),
    mines: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({length:5}).map((_,r)=>Array.from({length:5}).map((_,c)=>{
          const x=30+c*28, y=40+r*28;
          const revealed = (r+c)%3!==0;
          return <rect key={`${r}-${c}`} x={x} y={y} width="26" height="26" rx="3" fill={revealed?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.2)'} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>;
        }))}
        <text x="44" y="60" textAnchor="middle" fill="#3b82f6" fontSize="14" fontWeight="bold">1</text>
        <text x="100" y="88" textAnchor="middle" fill="#22c55e" fontSize="14" fontWeight="bold">2</text>
        <text x="72" y="116" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold">3</text>
        <circle cx="128" cy="51" r="8" fill="#1e293b" opacity="0.8"/><text x="128" y="55" textAnchor="middle" fill="#fff" fontSize="10">💣</text>
        <polygon points="152,102 148,114 156,114" fill="#ef4444" opacity="0.8"/>
        <rect x="151" y="114" width="2" height="8" fill="#6b7280"/>
      </svg>
    ),
    sudoku: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="30" width="140" height="140" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
        {[1,2].map(i=><line key={`v${i}`} x1={30+i*46.7} y1="30" x2={30+i*46.7} y2="170" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>)}
        {[1,2].map(i=><line key={`h${i}`} x1="30" y1={30+i*46.7} x2="170" y2={30+i*46.7} stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>)}
        {[
          {x:50,y:60,v:'5'},{x:97,y:60,v:'3'},{x:144,y:60,v:'7'},
          {x:50,y:107,v:'6'},{x:97,y:107,v:'9'},{x:144,y:107,v:'1'},
          {x:50,y:154,v:'8'},{x:97,y:154,v:'4'},{x:144,y:154,v:'2'},
        ].map((n,i)=>(
          <text key={i} x={n.x} y={n.y} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="20" fontWeight="bold">{n.v}</text>
        ))}
      </svg>
    ),
    crossword: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[
          {x:50,y:60,l:'S'},{x:80,y:60,l:'K'},{x:110,y:60,l:'I'},{x:140,y:60,l:'L'},{x:170,y:60,l:'L'},
          {x:80,y:90,l:'N'},{x:80,y:120,l:'O'},{x:80,y:150,l:'W'},
          {x:110,y:90,l:'D'},{x:110,y:120,l:'E'},{x:110,y:150,l:'A'},
        ].map((c,i)=>(
          <g key={i}>
            <rect x={c.x-13} y={c.y-15} width="26" height="26" rx="2" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <text x={c.x} y={c.y+2} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14" fontWeight="bold">{c.l}</text>
          </g>
        ))}
        {[{x:50,y:90},{x:50,y:120},{x:140,y:90},{x:170,y:90},{x:140,y:120}].map((b,i)=>(
          <rect key={`blk${i}`} x={b.x-13} y={b.y-15} width="26" height="26" rx="2" fill="rgba(0,0,0,0.3)"/>
        ))}
      </svg>
    ),
    bubbles: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[
          {cx:50,cy:40,r:15,c:'#ef4444'},{cx:80,cy:40,r:15,c:'#3b82f6'},{cx:110,cy:40,r:15,c:'#22c55e'},{cx:140,cy:40,r:15,c:'#eab308'},
          {cx:65,cy:68,r:15,c:'#8b5cf6'},{cx:95,cy:68,r:15,c:'#ef4444'},{cx:125,cy:68,r:15,c:'#3b82f6'},
          {cx:50,cy:96,r:15,c:'#22c55e'},{cx:80,cy:96,r:15,c:'#eab308'},{cx:110,cy:96,r:15,c:'#8b5cf6'},{cx:140,cy:96,r:15,c:'#ef4444'},
        ].map((b,i)=>(
          <g key={i}>
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.c} opacity="0.7"/>
            <circle cx={b.cx-4} cy={b.cy-4} r="3" fill="rgba(255,255,255,0.3)"/>
          </g>
        ))}
        <circle cx="100" cy="170" r="12" fill="#ec4899" opacity="0.8"/>
        <line x1="100" y1="158" x2="100" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3"/>
      </svg>
    ),
    hangman: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="170" x2="100" y2="170" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="170" x2="70" y2="40" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="40" x2="120" y2="40" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="120" y1="40" x2="120" y2="55" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
        <circle cx="120" cy="68" r="13" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"/>
        <line x1="120" y1="81" x2="120" y2="115" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"/>
        <line x1="120" y1="90" x2="105" y2="105" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
        <line x1="120" y1="90" x2="135" y2="105" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
        {['_','_','_','_','_'].map((u,i)=>(
          <line key={i} x1={55+i*22} y1="155" x2={67+i*22} y2="155" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
        ))}
      </svg>
    ),
    whack: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[{x:50,y:80},{x:100,y:80},{x:150,y:80},{x:50,y:130},{x:100,y:130},{x:150,y:130}].map((h,i)=>(
          <g key={i}>
            <ellipse cx={h.x} cy={h.y+15} rx="22" ry="8" fill="rgba(0,0,0,0.2)"/>
            <ellipse cx={h.x} cy={h.y} rx="18" ry="12" fill="#92400e" opacity="0.6"/>
          </g>
        ))}
        <ellipse cx="100" cy="105" rx="14" ry="18" fill="#a16207" opacity="0.8"/>
        <circle cx="95" cy="100" r="3" fill="#1e293b"/><circle cx="105" cy="100" r="3" fill="#1e293b"/>
        <ellipse cx="100" cy="110" rx="5" ry="3" fill="#ec4899" opacity="0.5"/>
        <g transform="translate(135,50) rotate(30)">
          <rect x="0" y="0" width="12" height="50" rx="3" fill="#92400e" opacity="0.7"/>
          <rect x="-4" y="-20" width="20" height="22" rx="4" fill="#6b7280" opacity="0.8"/>
        </g>
      </svg>
    ),
    cookie: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="55" fill="#d97706" opacity="0.85"/>
        <circle cx="100" cy="100" r="50" fill="#b45309" opacity="0.3"/>
        {[{x:82,y:75},{x:112,y:80},{x:90,y:105},{x:115,y:115},{x:85,y:130},{x:108,y:90}].map((ch,i)=>(
          <circle key={i} cx={ch.x} cy={ch.y} r="5" fill="#78350f" opacity="0.7"/>
        ))}
        <text x="165" y="40" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold">×99</text>
      </svg>
    ),
    lightning: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <polygon points="110,20 75,100 105,100 90,180 145,80 115,80 130,20" fill="#fbbf24" opacity="0.85"/>
        <polygon points="108,30 82,95 107,95 95,168 138,85 113,85 125,30" fill="#fde68a" opacity="0.4"/>
        {[{x:40,y:50},{x:30,y:120},{x:160,y:70},{x:155,y:145},{x:50,y:165}].map((s,i)=>(
          <circle key={i} cx={s.x} cy={s.y} r="2" fill="#fbbf24" opacity={0.3+i*0.1}/>
        ))}
      </svg>
    ),
    palette: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="105" rx="65" ry="55" fill="rgba(255,255,255,0.1)" transform="rotate(-15,100,105)"/>
        {[{x:60,y:75,c:'#ef4444'},{x:90,y:65,c:'#3b82f6'},{x:120,y:70,c:'#22c55e'},{x:140,y:90,c:'#eab308'},
          {x:135,y:115,c:'#8b5cf6'},{x:70,y:120,c:'#ec4899'}].map((d,i)=>(
          <circle key={i} cx={d.x} cy={d.y} r="10" fill={d.c} opacity="0.75"/>
        ))}
        <text x="100" y="108" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="22" fontWeight="bold">RED</text>
        <text x="100" y="108" textAnchor="middle" fill="#3b82f6" fontSize="22" fontWeight="bold" opacity="0.5">RED</text>
      </svg>
    ),
    keyboard: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {['Q','W','E','R','T','Y','U','I','O','P'].map((k,i)=>(
          <g key={`r1${i}`}><rect x={22+i*16} y={60} width="14" height="16" rx="2" fill="rgba(255,255,255,0.15)"/>
          <text x={29+i*16} y={72} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold">{k}</text></g>
        ))}
        {['A','S','D','F','G','H','J','K','L'].map((k,i)=>(
          <g key={`r2${i}`}><rect x={30+i*16} y={80} width="14" height="16" rx="2" fill="rgba(255,255,255,0.15)"/>
          <text x={37+i*16} y={92} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="bold">{k}</text></g>
        ))}
        <rect x="50" y="100" width="90" height="14" rx="3" fill="rgba(255,255,255,0.12)"/>
        <text x="100" y="140" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="16" fontWeight="bold">85 WPM</text>
      </svg>
    ),
    connect4: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="40" width="150" height="130" rx="8" fill="rgba(255,255,255,0.08)"/>
        {Array.from({length:5}).map((_,r)=>Array.from({length:6}).map((_,c)=>{
          const filled = (r===4&&c<4)||(r===3&&(c===1||c===2))||(r===4&&c===4)||(r===3&&c===3);
          const red = (r===4&&(c===0||c===2))||(r===3&&c===1);
          return <circle key={`${r}-${c}`} cx={45+c*23} cy={60+r*23} r="9" fill={filled?(red?'#ef4444':'#fbbf24'):'rgba(255,255,255,0.06)'} opacity={filled?0.85:1}/>;
        }))}
      </svg>
    ),
    tictactoe: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="80" y1="40" x2="80" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="120" y1="40" x2="120" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="80" x2="160" y2="80" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="40" y1="120" x2="160" y2="120" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="50" y1="50" x2="70" y2="70" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
        <line x1="70" y1="50" x2="50" y2="70" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
        <circle cx="100" cy="60" r="12" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.8"/>
        <line x1="130" y1="90" x2="150" y2="110" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
        <line x1="150" y1="90" x2="130" y2="110" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
        <circle cx="60" cy="100" r="12" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.8"/>
        <circle cx="100" cy="140" r="12" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.8"/>
      </svg>
    ),
    chess: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({length:4}).map((_,r)=>Array.from({length:4}).map((_,c)=>(
          <rect key={`${r}-${c}`} x={40+c*30} y={50+r*30} width="30" height="30" fill={(r+c)%2===0?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.05)'}/>
        )))}
        <text x="55" y="75" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20">♚</text>
        <text x="115" y="105" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="20">♛</text>
        <text x="85" y="135" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="20">♟</text>
        <text x="145" y="75" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="20">♜</text>
      </svg>
    ),
    checkers: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({length:4}).map((_,r)=>Array.from({length:4}).map((_,c)=>(
          <rect key={`${r}-${c}`} x={40+c*30} y={50+r*30} width="30" height="30" fill={(r+c)%2===0?'rgba(255,255,255,0.12)':'rgba(139,92,246,0.15)'}/>
        )))}
        <circle cx="55" cy="65" r="10" fill="#ef4444" opacity="0.8"/><circle cx="55" cy="63" r="8" fill="#dc2626" opacity="0.4"/>
        <circle cx="115" cy="95" r="10" fill="#ef4444" opacity="0.8"/>
        <circle cx="85" cy="125" r="10" fill="#1e293b" opacity="0.8"/><circle cx="85" cy="123" r="8" fill="#374151" opacity="0.4"/>
        <circle cx="145" cy="155" r="10" fill="#1e293b" opacity="0.8"/>
        <circle cx="145" cy="155" r="10" fill="#fbbf24" opacity="0.3"/>
        <text x="145" y="160" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" opacity="0.8">K</text>
      </svg>
    ),
  };

  const SceneFn = scenes[scene];
  if (!SceneFn) return <></>;
  return <SceneFn />;
}

/* ═══ Engine-based scenes for educational games ═══ */
function renderEngineScene(engine: string, subject?: string): JSX.Element {
  const engineScenes: Record<string, () => JSX.Element> = {
    SpaceShooter: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <polygon points="100,155 88,175 112,175" fill="rgba(255,255,255,0.7)"/>
        <rect x="96" y="145" width="8" height="5" rx="1" fill="#ef4444" opacity="0.8"/>
        {[{x:50,y:40,s:16},{x:90,y:30,s:14},{x:130,y:50,s:12},{x:70,y:70,s:10},{x:150,y:35,s:13}].map((e,i)=>(
          <rect key={i} x={e.x} y={e.y} width={e.s} height={e.s*0.7} rx="3" fill={['#a855f7','#22c55e','#ef4444','#3b82f6','#eab308'][i]} opacity="0.6"/>
        ))}
        <line x1="100" y1="143" x2="100" y2="100" stroke="#fbbf24" strokeWidth="2" opacity="0.5"/>
        {[{x:25,y:85},{x:170,y:60},{x:45,y:140},{x:165,y:130}].map((s,i)=>(<circle key={i} cx={s.x} cy={s.y} r="1.5" fill="#fff" opacity={0.2+i*0.1}/>))}
      </svg>
    ),
    BalloonPop: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[{x:50,y:65,c:'#ef4444'},{x:100,y:45,c:'#3b82f6'},{x:150,y:70,c:'#22c55e'},{x:75,y:100,c:'#eab308'},{x:125,y:90,c:'#ec4899'}].map((b,i)=>(
          <g key={i}>
            <ellipse cx={b.x} cy={b.y} rx="20" ry="25" fill={b.c} opacity="0.65"/>
            <ellipse cx={b.x-5} cy={b.y-8} rx="5" ry="8" fill="rgba(255,255,255,0.2)"/>
            <line x1={b.x} y1={b.y+25} x2={b.x+(i%2?5:-5)} y2={b.y+50} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          </g>
        ))}
      </svg>
    ),
    DashRunner: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="150" x2="200" y2="150" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
        <g transform="translate(70,105)">
          <circle cx="10" cy="5" r="10" fill="rgba(255,255,255,0.7)"/>
          <rect x="3" y="15" width="14" height="22" rx="4" fill="rgba(255,255,255,0.7)"/>
          <line x1="17" y1="20" x2="28" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="7" y1="37" x2="0" y2="47" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
          <line x1="13" y1="37" x2="22" y2="47" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
        </g>
        {[40,60,80].map((x,i)=>(<line key={i} x1={x-5} y1={148} x2={x+5} y2={148} stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round"/>))}
        <rect x="130" y="120" width="15" height="30" rx="2" fill="rgba(255,255,255,0.15)"/>
        <rect x="160" y="110" width="15" height="40" rx="2" fill="rgba(255,255,255,0.12)"/>
      </svg>
    ),
    TargetRange: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="90" r="50" fill="none" stroke="#ef4444" strokeWidth="4" opacity="0.5"/>
        <circle cx="100" cy="90" r="35" fill="none" stroke="#fff" strokeWidth="3" opacity="0.3"/>
        <circle cx="100" cy="90" r="20" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.5"/>
        <circle cx="100" cy="90" r="6" fill="#ef4444" opacity="0.7"/>
        <line x1="100" y1="35" x2="100" y2="145" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
        <line x1="45" y1="90" x2="155" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
      </svg>
    ),
    ZombieDefense: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="80" y="50" width="40" height="80" rx="4" fill="rgba(255,255,255,0.12)"/>
        <rect x="85" y="50" width="30" height="10" rx="2" fill="rgba(255,255,255,0.2)"/>
        {[{x:88,y:65},{x:88,y:80},{x:88,y:95},{x:88,y:110}].map((w,i)=>(
          <rect key={i} x={w.x} y={w.y} width="24" height="10" rx="1" fill="rgba(255,255,255,0.08)"/>
        ))}
        <polygon points="100,35 80,50 120,50" fill="rgba(255,255,255,0.2)"/>
        {[30,45,155,170].map((x,i)=>(
          <g key={i}><rect x={x} y={130-i*8} width="4" height={30+i*4} rx="1" fill="rgba(255,255,255,0.15)"/>
          <circle cx={x+2} cy={130-i*8-3} r="4" fill={i<2?'#ef4444':'#22c55e'} opacity="0.5"/></g>
        ))}
        <line x1="0" y1="160" x2="200" y2="160" stroke="rgba(255,255,255,0.15)" strokeWidth="2"/>
      </svg>
    ),
    SpeedQuiz: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="50" width="120" height="30" rx="6" fill="rgba(255,255,255,0.15)"/>
        <circle cx="55" cy="65" r="8" fill="#22c55e" opacity="0.6"/><text x="55" y="69" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">A</text>
        <rect x="40" y="90" width="120" height="30" rx="6" fill="rgba(255,255,255,0.1)"/>
        <circle cx="55" cy="105" r="8" fill="#3b82f6" opacity="0.6"/><text x="55" y="109" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">B</text>
        <rect x="40" y="130" width="120" height="30" rx="6" fill="rgba(255,255,255,0.1)"/>
        <circle cx="55" cy="145" r="8" fill="#f97316" opacity="0.6"/><text x="55" y="149" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">C</text>
        <circle cx="165" cy="35" r="16" fill="rgba(255,255,255,0.1)"/>
        <text x="165" y="40" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="12" fontWeight="bold">10</text>
      </svg>
    ),
    MemoryMatrix: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({length:3}).map((_,r)=>Array.from({length:3}).map((_,c)=>{
          const x=42+c*40, y=42+r*40;
          const flipped = (r===0&&c===1)||(r===1&&c===2)||(r===2&&c===0);
          return (
            <g key={`${r}-${c}`}>
              <rect x={x} y={y} width="36" height="36" rx="6" fill={flipped?['#8b5cf6','#ec4899','#22c55e'][[0,1,2].indexOf(r)]:'rgba(255,255,255,0.12)'} opacity={flipped?0.6:1}/>
              {flipped && <text x={x+18} y={y+24} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="16">?</text>}
            </g>
          );
        }))}
      </svg>
    ),
    WordBuilder: () => (
      <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {['W','O','R','D','S'].map((l,i)=>(
          <g key={i}>
            <rect x={30+i*28} y={75} width="26" height="32" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <text x={43+i*28} y={97} textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="18" fontWeight="bold">{l}</text>
          </g>
        ))}
        {['B','U','I','L','D'].map((l,i)=>(
          <g key={`b${i}`}>
            <rect x={30+i*28} y={115} width="26" height="32" rx="4" fill="rgba(255,255,255,0.08)"/>
            <text x={43+i*28} y={137} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="18" fontWeight="bold">{l}</text>
          </g>
        ))}
      </svg>
    ),
  };

  const EngineFn = engineScenes[engine];
  if (!EngineFn) return <></>;
  return <EngineFn />;
}

/* ═══ Main CoverArt Component ═══ */
const CoverArt = memo(function CoverArt({
  title, icon, gradient, engine, subject, coverScene, category, size = 'md', animated = true,
}: CoverArtProps) {
  const theme = getTheme(category, subject, engine);

  const sizeConfig = {
    sm: { titleSize: 'text-[11px]', initialsSize: 'text-2xl', pad: 'p-2', symbolSize: 'text-sm', badgeSize: 'text-[8px] px-1.5 py-0.5' },
    md: { titleSize: 'text-sm', initialsSize: 'text-4xl', pad: 'p-3', symbolSize: 'text-lg', badgeSize: 'text-[9px] px-2 py-0.5' },
    lg: { titleSize: 'text-base', initialsSize: 'text-5xl', pad: 'p-4', symbolSize: 'text-xl', badgeSize: 'text-[10px] px-2 py-1' },
  };
  const s = sizeConfig[size];

  const initials = getInitials(title);

  return (
    <div
      className={`relative w-full h-full overflow-hidden group/cover select-none ${animated ? 'cover-art-animated' : ''}`}
      style={{ aspectRatio: '1', background: gradient }}
    >
      {/* Pattern overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: theme.bgPattern }} />

      {/* Top-right decorative accent */}
      <div className="absolute top-0 right-0 w-2/3 h-2/3 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 100% 0%, ${theme.accentLight} 0%, transparent 70%)` }}
      />

      {/* Bottom shadow */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
      />

      {/* SVG Scene, Engine Scene, or Initials fallback */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: '18%' }}>
        {coverScene ? (
          <div className="w-[75%] h-[75%] opacity-90">
            {renderScene(coverScene)}
          </div>
        ) : engine ? (
          <div className="w-[75%] h-[75%] opacity-85">
            {renderEngineScene(engine, subject)}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl opacity-40"
              style={{ background: theme.accent, transform: 'scale(1.8)' }}
            />
            <span
              className={`relative ${s.initialsSize} font-black tracking-wider text-white`}
              style={{
                textShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 40px ${theme.accent}40`,
                fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
                letterSpacing: '0.05em',
              }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Bottom title bar with glass effect */}
      <div
        className={`absolute bottom-0 left-0 right-0 ${s.pad} pointer-events-none`}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.35) 70%, transparent 100%)' }}
      >
        <h4
          className={`font-bold text-white ${s.titleSize} truncate leading-tight`}
          style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
        >
          {title}
        </h4>
        {(subject || category) && size !== 'sm' && (
          <span className={`inline-block mt-0.5 ${s.badgeSize} font-semibold rounded-full capitalize`}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}>
            {subject || category}
          </span>
        )}
        {engine && size === 'lg' && (
          <p className="text-[10px] text-white/40 mt-0.5 font-medium tracking-wide">
            {engine.replace(/([A-Z])/g, ' $1').trim()}
          </p>
        )}
      </div>

      {/* Accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }}
      />

      {/* Shine sweep on hover */}
      {animated && (
        <div
          className="absolute inset-0 pointer-events-none opacity-0 group-hover/cover:opacity-100 transition-opacity duration-500"
          style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
        />
      )}

      {/* Inner border */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
      />
    </div>
  );
});

export default CoverArt;
