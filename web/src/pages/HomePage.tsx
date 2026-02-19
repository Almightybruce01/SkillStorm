import { Link } from 'react-router-dom';
import { categories, getFeaturedGames, allGames } from '../engine/gameData';
import { arcadeGames } from '../games/arcade/arcadeData';
import { InArticleAd, FooterAd, TopBannerAd } from '../components/ads/AdBanner';

export function HomePage() {
  const featured = getFeaturedGames();
  return (
    <div className="pt-20 sm:pt-24 w-full min-h-[100vh] page-enter">
      <TopBannerAd />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* HERO */}
        <section className="text-center pt-8 sm:pt-12 pb-16 sm:pb-24 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-r from-blue-200/30 via-purple-200/20 to-orange-200/30 blur-[100px] rounded-full color-shift-slow pointer-events-none" />

          <div className="animate-slide-up inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-blue-50 border border-blue-200 mb-8">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-gray-500 text-xs font-bold tracking-[0.15em]">LIVE NOW — {allGames.filter(g => g.isAvailable).length} GAMES FREE TO PLAY</span>
          </div>

          <div className="animate-slide-up delay-100 mb-6">
            <img src="/images/logo.png" alt="SkillzStorm — Play Hard. Think Harder." className="h-20 sm:h-32 md:h-40 w-auto mx-auto drop-shadow-lg" />
          </div>

          <p className="text-gray-500 max-w-lg mx-auto mb-12 text-base sm:text-lg leading-relaxed animate-slide-up delay-300">
            The arcade learning platform with <span className="text-gray-800 font-semibold">{allGames.length}+ games</span>,
            K-12 difficulty scaling, and knowledge gates that make you <span className="text-gray-800 font-semibold">smarter while you play</span>.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up delay-400">
            <Link to="/games" className="btn-elite btn-elite-primary text-lg flex items-center justify-center gap-3 btn-shimmer overflow-hidden">
              <span className="text-xl">🎮</span>
              PLAY NOW — Free
            </Link>
            <Link to="/arcade" className="btn-elite btn-elite-fire text-lg flex items-center justify-center gap-3 btn-shimmer overflow-hidden">
              <span className="text-xl">🕹️</span>
              ARCADE
            </Link>
            <Link to="/store" className="btn-elite btn-elite-ghost text-lg flex items-center justify-center gap-3">
              <span className="text-xl">🛒</span>
              Storm Store
            </Link>
          </div>
        </section>

        {/* STATS */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 mb-20 animate-slide-up delay-500">
          <StatItem label="Games" value={`${allGames.length + arcadeGames.length}+`} color="#3b82f6" icon="🎮" />
          <StatItem label="Grades" value="K – 12" color="#10b981" icon="📚" />
          <StatItem label="Categories" value="6" color="#8b5cf6" icon="🎯" />
          <StatItem label="Price" value="$0" color="#f59e0b" icon="🆓" />
        </section>

        {/* FEATURED GAMES */}
        <section className="mb-20">
          <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
            <span className="text-xl">⭐</span> FEATURED GAMES
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {featured.map((game, i) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="game-card group animate-pop-in text-center"
                data-color="blue"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                {game.coverArt ? (
                  <div className="w-full aspect-[16/10] mb-3 rounded-xl overflow-hidden transition-all duration-400 group-hover:scale-105">
                    <img src={game.coverArt} alt={game.name} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/10] mb-3 rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 transition-all duration-400 group-hover:scale-105">
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{game.iconEmoji}</span>
                  </div>
                )}
                <h3 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors duration-300">{game.name}</h3>
                <p className="text-gray-400 text-xs line-clamp-2 group-hover:text-gray-500 transition-colors">{game.description}</p>
                <div className="flex justify-center mt-3 gap-1.5">
                  {game.isFeatured && (
                    <span className="text-[9px] font-black bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-0.5 rounded-md shadow-sm">
                      HOT
                    </span>
                  )}
                  <span className="text-[9px] font-bold bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300">
                    {game.category}
                  </span>
                </div>
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <span className="text-[10px] font-black text-emerald-500 tracking-wider">▶ PLAY</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <InArticleAd />

        {/* ARCADE PREVIEW */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700 mb-0">
              <span className="text-xl">🕹️</span> ARCADE — Just For Fun
            </h2>
            <Link to="/arcade" className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors">
              See All {arcadeGames.length} →
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
            {arcadeGames.slice(0, 8).map((game, i) => (
              <Link
                key={game.id}
                to={`/arcade?play=${game.id}`}
                className="arcade-tile animate-pop-in"
                style={{ backgroundColor: game.color, animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <span className="text-3xl sm:text-4xl mb-1">{game.emoji}</span>
                </div>
                <div className="tile-name">{game.name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* GAME MODES */}
        <section className="mb-20">
          <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
            <span className="text-xl">🎯</span> GAME MODES
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {categories.map((cat, i) => {
              const gameCount = allGames.filter(g => g.category === cat.value).length;
              return (
                <Link
                  key={cat.value}
                  to={`/games/${cat.value}`}
                  className="game-card group text-center animate-slide-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl transition-all duration-400 group-hover:scale-[1.2] group-hover:rotate-6 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${cat.colors[0]}, ${cat.colors[1]})`,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <h3 className="font-black text-gray-800 mb-1 group-hover:text-blue-600 transition-colors duration-300">{cat.label}</h3>
                  <p className="text-gray-400 text-xs mb-3">{cat.subtitle}</p>
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <span className="text-xs font-black" style={{ color: cat.colors[0] }}>{gameCount} games</span>
                    <span className="text-xs text-gray-300">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mb-20">
          <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Step num="01" title="Choose Your Grade" desc="Select K-2, 3-5, 6-8, or 9-12. Difficulty scales automatically across all games." color="#3b82f6" icon="📚" delay="0s" />
            <Step num="02" title="Pick a Game" desc="50+ arcade-style games across 6 categories. Every game is completely free." color="#8b5cf6" icon="🎮" delay="0.15s" />
            <Step num="03" title="Play & Learn" desc="Knowledge Gates test your skills between levels. Fun first — learning is hidden inside." color="#f97316" icon="🧠" delay="0.3s" />
          </div>
        </section>

        {/* KNOWLEDGE GATES */}
        <section className="mb-20">
          <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
            <span className="text-xl">🔒</span> KNOWLEDGE GATES
          </h2>
          <p className="text-gray-400 text-center text-sm mb-8 -mt-4 max-w-lg mx-auto">
            Every game has learning checkpoints. You can't advance without proving you know your stuff.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GateCard icon="🔒" name="Checkpoint" desc="Answer 1 question between levels" color="#3b82f6" />
            <GateCard icon="🔥" name="Boss Gate" desc="3 rapid-fire questions at boss levels" color="#ef4444" />
            <GateCard icon="⚡" name="Speed Gate" desc="Answer correctly in under 5 seconds" color="#f59e0b" />
            <GateCard icon="⭐" name="Streak Gate" desc="Get 3 correct answers in a row" color="#8b5cf6" />
          </div>
        </section>

        {/* SUBJECTS */}
        <section className="mb-20 text-center">
          <h2 className="text-xs font-black tracking-[0.2em] text-gray-300 mb-6">SUBJECTS COVERED</h2>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {[
              { name: 'Math', color: '#3b82f6' }, { name: 'Algebra', color: '#6366f1' }, { name: 'Geometry', color: '#8b5cf6' },
              { name: 'Fractions', color: '#06b6d4' }, { name: 'Vocabulary', color: '#10b981' }, { name: 'Grammar', color: '#f97316' },
              { name: 'Spelling', color: '#ec4899' }, { name: 'Science', color: '#3b82f6' }, { name: 'Chemistry', color: '#f59e0b' },
              { name: 'Physics', color: '#ef4444' }, { name: 'History', color: '#8b5cf6' }, { name: 'Financial Literacy', color: '#10b981' },
              { name: 'SAT Prep', color: '#f97316' }, { name: 'Logic', color: '#06b6d4' }, { name: 'Reading', color: '#ec4899' },
            ].map((subj, i) => (
              <span
                key={subj.name}
                className="px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 cursor-default hover:scale-105 animate-fade-in hover:shadow-md"
                style={{
                  animationDelay: `${i * 0.04}s`,
                  backgroundColor: `${subj.color}08`,
                  borderColor: `${subj.color}25`,
                  color: subj.color,
                }}
              >
                {subj.name}
              </span>
            ))}
          </div>
        </section>

        <FooterAd />

        {/* FOR SCHOOLS */}
        <section className="mb-20 animate-slide-up">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-6xl">🏫</div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-black text-gray-800 mb-2">Schools & Educators</h2>
                <p className="text-gray-500 text-sm max-w-lg">
                  SkillzStorm is free for every classroom. No setup, no accounts, no IT required.
                  Works on any device. Standards-aligned. COPPA compliant.
                </p>
              </div>
              <Link to="/schools" className="btn-elite btn-elite-primary text-sm flex-shrink-0">
                Learn More →
              </Link>
            </div>
          </div>
        </section>

        {/* GET THE APP */}
        <section className="mb-20 animate-slide-up">
          <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">GET THE APP</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
            <AppCard icon="🍎" store="App Store" sub="iPhone & iPad" color="#3b82f6" />
            <AppCard icon="💻" store="Mac App Store" sub="macOS" color="#8b5cf6" />
            <AppCard icon="🌐" store="skillzstorm.com" sub="Play free on web" color="#10b981" href="https://skillzstorm.com" />
          </div>
        </section>

        {/* TRUST BADGES */}
        <section className="mb-12 text-center animate-fade-in">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-3">
            <TrustBadge icon="🛡️" text="COPPA Compliant" />
            <TrustBadge icon="👶" text="Child-Safe Ads" />
            <TrustBadge icon="🚫" text="No Data Collection" />
            <TrustBadge icon="🔓" text="No Login Required" />
            <TrustBadge icon="🏫" text="School Approved" />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatItem({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="text-center group cursor-default">
      <div className="text-2xl mb-2 group-hover:scale-125 transition-transform duration-300">{icon}</div>
      <div className="text-3xl font-black transition-all duration-300 group-hover:scale-110" style={{ color }}>{value}</div>
      <div className="text-gray-400 text-xs mt-1 font-bold tracking-[0.15em] group-hover:text-gray-600 transition-colors">{label}</div>
    </div>
  );
}

function Step({ num, title, desc, color, icon, delay }: { num: string; title: string; desc: string; color: string; icon: string; delay: string }) {
  return (
    <div className="game-card text-center group animate-slide-up" style={{ animationDelay: delay }}>
      <div className="text-4xl mb-3 group-hover:scale-125 transition-transform duration-300">{icon}</div>
      <div className="text-5xl font-black bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300"
        style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${color}80)` }}
      >
        {num}
      </div>
      <h3 className="font-black text-gray-800 mb-2 text-lg">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function GateCard({ icon, name, desc, color }: { icon: string; name: string; desc: string; color: string }) {
  return (
    <div className="game-card text-center group hover:shadow-lg transition-shadow duration-300">
      <div className="text-4xl mb-2 group-hover:scale-[1.3] transition-transform duration-300">{icon}</div>
      <h4 className="font-black text-sm mb-1" style={{ color }}>{name}</h4>
      <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

function AppCard({ icon, store, sub, href }: { icon: string; store: string; sub: string; color: string; href?: string }) {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag
      {...(href ? { href } : {})}
      className="game-card text-center group cursor-pointer hover:shadow-lg transition-shadow duration-300"
    >
      <div className="text-4xl mb-2 group-hover:scale-125 transition-transform duration-300">{icon}</div>
      <div className="text-xs text-gray-400 mb-0.5">{sub}</div>
      <div className="text-sm font-black text-gray-800 group-hover:transition-colors duration-300" style={{ color: undefined }}>{store}</div>
    </Tag>
  );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 hover:text-gray-500 transition-colors duration-300 cursor-default">
      <span>{icon}</span>
      <span>{text}</span>
    </span>
  );
}
