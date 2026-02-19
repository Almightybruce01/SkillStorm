import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { allGames, gradeLevels, type GradeLevel } from '../engine/gameData';
import { InArticleAd, TopBannerAd } from '../components/ads/AdBanner';
import { GameLauncher } from '../games/GameLauncher';
import type { Grade } from '../games/questionBank';

const catColorMap: Record<string, string> = {
  StormBattle: '#3b82f6', StormDash: '#10b981', StormPuzzle: '#f59e0b',
  StormQuick: '#ec4899', Storm3D: '#8b5cf6', StormVR: '#06b6d4',
};

export function GameDetailPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = allGames.find(g => g.id === gameId);
  const [playing, setPlaying] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);

  if (!game) {
    return (
      <div className="pt-20 sm:pt-24 min-h-[100vh] w-full flex flex-col items-center justify-center text-center page-enter">
        <div className="text-7xl mb-4 animate-float">🔍</div>
        <h1 className="text-3xl font-black text-gray-800 mb-3">Game Not Found</h1>
        <Link to="/games" className="btn-elite btn-elite-primary text-sm">← Back to Games</Link>
      </div>
    );
  }

  const accent = catColorMap[game.category] || '#3b82f6';
  const gradeColors = game.supportedGrades.map(g => gradeLevels.find(gl => gl.value === g));
  const playGrade = (selectedGrade || game.supportedGrades[0]) as Grade;

  return (
    <div className="pt-20 sm:pt-24 min-h-[100vh] w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 page-enter">
      <TopBannerAd />
      {/* Back link */}
      <Link to="/games" className="text-gray-400 text-sm hover:text-gray-600 transition-all duration-300 mb-8 inline-flex items-center gap-2 group">
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
        <span>Back to Games</span>
      </Link>

      {/* Hero */}
      <div className="text-center mb-10 animate-slide-up">
        {game.coverArt ? (
          <div className="relative w-full max-w-xl mx-auto mb-6 rounded-2xl overflow-hidden shadow-xl animate-slide-up">
            <img src={game.coverArt} alt={game.name} className="w-full h-auto object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative inline-block">
            <div className="absolute inset-0 blur-[60px] rounded-full scale-[2] animate-pulse-slow" style={{ background: `${accent}15` }} />
            <div className="relative text-[100px] sm:text-[120px] mb-4 animate-float leading-none">{game.iconEmoji}</div>
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl font-black text-gray-800 mb-4 animate-slide-up delay-100">{game.name}</h1>
        <div className="flex justify-center gap-2 mb-2 animate-slide-up delay-200 flex-wrap">
          {game.isFeatured && (
            <span className="text-xs font-black bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-1.5 rounded-lg shadow-sm">
              FEATURED
            </span>
          )}
          <span className="text-xs font-bold px-4 py-1.5 rounded-lg" style={{ backgroundColor: `${accent}10`, color: accent, border: `1px solid ${accent}25` }}>
            {game.category}
          </span>
          {game.isPremium && (
            <span className="text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-1.5 rounded-lg">PREMIUM</span>
          )}
        </div>
      </div>

      {/* Grade Selector */}
      {!playing && game.isAvailable && (
        <div className="mb-6 animate-slide-up delay-300">
          <p className="text-gray-400 text-xs font-bold text-center tracking-wider mb-3">SELECT YOUR GRADE</p>
          <div className="flex flex-wrap justify-center gap-2">
            {game.supportedGrades.map(g => {
              const gc = gradeLevels.find(gl => gl.value === g);
              const isActive = (selectedGrade || game.supportedGrades[0]) === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95 border"
                  style={isActive ? {
                    backgroundColor: `${gc?.color}15`,
                    borderColor: `${gc?.color}40`,
                    color: gc?.color,
                    boxShadow: `0 2px 8px ${gc?.color}15`,
                  } : {
                    backgroundColor: 'white',
                    borderColor: '#e2e8f0',
                    color: '#94a3b8',
                  }}
                >
                  {gc?.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Play Button or Game */}
      {!playing ? (
        <button
          onClick={() => game.isAvailable && setPlaying(true)}
          className={`w-full py-5 rounded-2xl font-black text-xl text-white mb-10 transition-all duration-300 active:scale-[0.97] relative overflow-hidden animate-slide-up delay-300 ${
            game.isAvailable ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : 'cursor-not-allowed opacity-60'
          }`}
          style={game.isAvailable ? {
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 6px 25px ${accent}30`,
          } : { background: '#d1d5db' }}
          disabled={!game.isAvailable}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {game.isAvailable ? (
              <><span className="text-2xl">▶</span> PLAY NOW</>
            ) : (
              <><span className="text-2xl">🔒</span> COMING SOON</>
            )}
          </span>
        </button>
      ) : (
        <div className="mb-10">
          <GameLauncher gameId={game.id} grade={playGrade} onClose={() => setPlaying(false)} />
        </div>
      )}

      {/* Description */}
      <div className="game-card !p-6 mb-6 animate-slide-up delay-400">
        <h3 className="text-xs font-black tracking-[0.15em] mb-3 flex items-center gap-2" style={{ color: accent }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
          ABOUT THIS GAME
        </h3>
        <p className="text-gray-600 leading-relaxed">{game.description}</p>
      </div>

      {/* Grade Levels */}
      <div className="game-card !p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.45s' }}>
        <h3 className="text-xs font-black text-purple-600 tracking-[0.15em] mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          GRADE LEVELS
        </h3>
        <div className="flex flex-wrap gap-2">
          {gradeColors.map((gc) => gc && (
            <span
              key={gc.value}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 cursor-default"
              style={{
                backgroundColor: `${gc.color}08`,
                color: gc.color,
                border: `1px solid ${gc.color}20`,
              }}
            >
              {gc.label} — {gc.subtitle}
            </span>
          ))}
        </div>
      </div>

      {/* Knowledge Gates */}
      <div className="game-card !p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h3 className="text-xs font-black text-orange-500 tracking-[0.15em] mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          KNOWLEDGE GATES
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <GateInfo icon="🔒" title="Checkpoint" desc="Answer between levels" color="#3b82f6" />
          <GateInfo icon="🔥" title="Boss Gate" desc="3 rapid-fire questions" color="#ef4444" />
          <GateInfo icon="⚡" title="Speed Gate" desc="5-second timer" color="#f59e0b" />
          <GateInfo icon="⭐" title="Streak Gate" desc="3 in a row" color="#8b5cf6" />
        </div>
      </div>

      {/* Power-ups */}
      <div className="game-card !p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.55s' }}>
        <h3 className="text-xs font-black text-amber-500 tracking-[0.15em] mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          POWER-UPS
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <PowerUp icon="⏱️" name="Slow Time" color="#3b82f6" />
          <PowerUp icon="🛡️" name="Hint Shield" color="#8b5cf6" />
          <PowerUp icon="⭐" name="2x Points" color="#f59e0b" />
          <PowerUp icon="❤️" name="Extra Life" color="#ef4444" />
        </div>
      </div>

      <InArticleAd />

      {/* Download CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-8 text-center animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <h3 className="font-black text-gray-800 mb-2 text-lg">Play on Mobile</h3>
        <p className="text-gray-400 text-sm mb-6">Download SkillzStorm for iPhone, iPad & Mac</p>
        <div className="flex gap-3 justify-center">
          <button className="btn-elite btn-elite-ghost text-sm flex items-center gap-2">
            <span>📱</span> App Store
          </button>
          <button className="btn-elite btn-elite-ghost text-sm flex items-center gap-2">
            <span>💻</span> Mac App
          </button>
        </div>
      </div>
    </div>
  );
}

function GateInfo({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 group cursor-default">
      <span className="text-xl group-hover:scale-125 transition-transform duration-300">{icon}</span>
      <div>
        <div className="text-sm font-bold text-gray-800 group-hover:transition-colors duration-300" style={{ color }}>{title}</div>
        <div className="text-gray-400 text-xs">{desc}</div>
      </div>
    </div>
  );
}

function PowerUp({ icon, name, color }: { icon: string; name: string; color: string }) {
  return (
    <div className="text-center group cursor-default">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-xl mx-auto mb-2 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6"
        style={{ backgroundColor: `${color}08`, border: `1px solid ${color}15` }}
      >
        <span className="group-hover:scale-125 transition-transform duration-300">{icon}</span>
      </div>
      <div className="text-gray-400 text-xs font-semibold group-hover:text-gray-600 transition-colors">{name}</div>
    </div>
  );
}
