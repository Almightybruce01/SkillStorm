import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isAdFree } from '../components/ads/AdConfig';

export function PremiumPage() {
  const [userIsAdFree] = useState(isAdFree());
  const [loading, setLoading] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) setLinkCode(code.toUpperCase());

    const saved = localStorage.getItem('skillzstorm_link_code');
    if (saved && !code) setLinkCode(saved);
  }, [searchParams]);

  useEffect(() => {
    if (linkCode) localStorage.setItem('skillzstorm_link_code', linkCode);
  }, [linkCode]);

  const handlePurchase = async (productId: string) => {
    setLoading(productId);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ id: productId, quantity: 1 }],
          linkCode: linkCode || undefined,
        }),
      });
      const data = await res.json();
      if (data.url) {
        // Store which digital product is being purchased; ad-free is granted
        // only after Stripe confirms payment (on the success redirect).
        if (productId === 'ad_free' || productId === 'premium') {
          localStorage.setItem('skillzstorm_pending_digital', productId);
        }
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  };

  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      {/* Hero */}
      <section className="text-center py-12 animate-slide-up">
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl bg-[#f59e0b]/20 rounded-full scale-[2] animate-pulse-slow" />
          <div className="relative text-7xl mb-4 animate-float">👑</div>
        </div>
        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-3 animate-slide-up delay-100">
          <span className="bg-gradient-to-r from-[#f59e0b] via-[#f97316] to-[#ef4444] bg-clip-text text-transparent">GO PREMIUM</span>
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto animate-slide-up delay-200">
          Remove ads, get coins, unlock exclusive content. All purchases sync to the iOS app.
        </p>
      </section>

      {/* Link Code */}
      <div className="game-card !p-5 mb-8 animate-slide-up delay-300" style={{ background: 'linear-gradient(135deg, rgba(0,153,255,0.06), rgba(153,51,255,0.04))' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xl">🔗</span>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">App Link Code</h3>
            <p className="text-gray-400 text-xs">Enter your code from the iOS app to sync purchases</p>
          </div>
        </div>
        <input
          type="text"
          value={linkCode}
          onChange={(e) => setLinkCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
          placeholder="Enter 8-character code from app"
          maxLength={8}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-mono font-bold text-center text-lg tracking-[0.3em] outline-none focus:border-[#3b82f6]/50 transition-colors uppercase"
        />
        {linkCode.length === 8 && (
          <p className="text-[#10b981] text-xs text-center mt-2 font-bold">
            Code linked — purchases will sync to your app
          </p>
        )}
        {!linkCode && (
          <p className="text-gray-300 text-xs text-center mt-2">
            Open SkillzStorm app → Settings → Link to Website → copy your code
          </p>
        )}
      </div>

      {/* Best Value: Premium Bundle */}
      <div className="relative mb-8 animate-slide-up delay-400">
        <div className="absolute -top-3 left-4 z-10 px-4 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#f59e0b] to-[#f97316] text-black shadow-[0_0_15px_rgba(255,230,0,0.3)]">
          BEST VALUE
        </div>
        <div
          className="game-card !p-7"
          style={{ background: 'linear-gradient(135deg, rgba(255,230,0,0.08), rgba(255,128,0,0.05))' }}
        >
          <div className="flex items-center gap-4 mb-5">
            <span className="text-5xl animate-float" style={{ animationDuration: '2.5s' }}>🏆</span>
            <div>
              <h2 className="text-xl font-black text-gray-800">Premium Bundle</h2>
              <p className="text-gray-400 text-sm">Ad-free + 5,000 coins + exclusive content</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-3xl font-black text-[#10b981] neon-glow-green">$4.99</div>
              <div className="text-xs text-gray-400 line-through">$12.99 value</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <Perk icon="⭐" text="Remove all ads" color="#f59e0b" />
            <Perk icon="🪙" text="5,000 coins" color="#f97316" />
            <Perk icon="🎮" text="Exclusive games" color="#3b82f6" />
            <Perk icon="🛡️" text="Premium badge" color="#8b5cf6" />
            <Perk icon="⚡" text="Early access" color="#10b981" />
            <Perk icon="🎨" text="Exclusive skins" color="#ec4899" />
          </div>
          <button
            onClick={() => handlePurchase('premium')}
            disabled={loading === 'premium'}
            className="btn-elite btn-elite-gold w-full text-lg"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>👑</span> Get Premium Bundle — $4.99
            </span>
          </button>
        </div>
      </div>

      {/* Ad-Free */}
      <div className="game-card !p-6 mb-6 animate-slide-up" style={{ animationDelay: '0.45s' }}>
        <div className="flex items-center gap-4">
          <span className="text-3xl">⭐</span>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">Remove Ads Forever</h3>
            <p className="text-gray-400 text-sm">No banners, no interruptions. Syncs to iOS app.</p>
          </div>
          {userIsAdFree ? (
            <span className="px-4 py-2 rounded-xl text-sm font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-[0_0_12px_rgba(0,255,128,0.1)]">ACTIVE</span>
          ) : (
            <button
              onClick={() => handlePurchase('ad_free')}
              disabled={loading === 'ad_free'}
              className="btn-elite btn-elite-primary text-sm"
            >
              <span className="relative z-10">$2.99</span>
            </button>
          )}
        </div>
      </div>

      {/* Coin Packs */}
      <h2 className="text-lg font-black text-gray-800 mb-4 mt-10 flex items-center gap-2 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_6px_rgba(255,230,0,0.8)]" />
        COIN PACKS
      </h2>
      <div className="space-y-3 mb-8">
        <CoinPack icon="🪙" name="500 Coins" desc="Starter pack" price="$0.99" bonus="" onClick={() => handlePurchase('coins_500')} color="#f59e0b" delay="0.55s" />
        <CoinPack icon="💰" name="2,500 Coins" desc="Popular choice" price="$3.99" bonus="+250 BONUS" onClick={() => handlePurchase('coins_2500')} color="#f97316" delay="0.6s" />
        <CoinPack icon="💎" name="10,000 Coins" desc="Best per-coin value" price="$9.99" bonus="+2,000 BONUS" onClick={() => handlePurchase('coins_10000')} color="#8b5cf6" delay="0.65s" />
      </div>

      {/* Season Pass */}
      <h2 className="text-lg font-black text-gray-800 mb-4 mt-10 flex items-center gap-2 animate-slide-up" style={{ animationDelay: '0.7s' }}>
        <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shadow-[0_0_6px_rgba(153,51,255,0.8)]" />
        SEASON PASS
      </h2>
      <div className="game-card !p-6 mb-8 animate-slide-up" style={{ animationDelay: '0.75s', background: 'linear-gradient(135deg, rgba(0,153,255,0.08), rgba(153,51,255,0.05))' }}>
        <div className="flex items-center gap-4">
          <span className="text-3xl">🛡️</span>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">Season Pass</h3>
            <p className="text-gray-400 text-sm">Unlock all premium games for this season</p>
          </div>
          <button
            onClick={() => handlePurchase('season_pass')}
            disabled={loading === 'season_pass'}
            className="px-6 py-2.5 rounded-xl font-bold text-gray-800 bg-[#8b5cf6] hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 btn-shimmer overflow-hidden shadow-[0_4px_15px_rgba(153,51,255,0.2)]"
          >
            <span className="relative z-10">$7.99</span>
          </button>
        </div>
      </div>

      {/* How syncing works */}
      <div className="game-card !p-7 mb-8 animate-slide-up" style={{ animationDelay: '0.8s' }}>
        <h3 className="font-black text-gray-800 text-center mb-6 tracking-wider">HOW IT WORKS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <SyncStep num="1" icon="📱" title="Get Your Code" desc="Open the app → Settings → Link to Website" color="#3b82f6" />
          <SyncStep num="2" icon="💳" title="Buy Here" desc="Enter your code above, then purchase" color="#f59e0b" />
          <SyncStep num="3" icon="🔄" title="Sync" desc="In the app, tap Sync Purchases" color="#10b981" />
        </div>
      </div>

      {/* Security */}
      <div className="text-center animate-fade-in">
        <div className="flex items-center justify-center gap-6 text-gray-300 mb-3">
          <span className="text-sm hover:text-gray-400 transition-colors">🔒 SSL Encrypted</span>
          <span className="text-sm hover:text-gray-400 transition-colors">💳 Stripe Secure</span>
          <span className="text-sm hover:text-gray-400 transition-colors">↩️ Refund Policy</span>
        </div>
        <p className="text-gray-300 text-xs">
          All purchases processed securely by Stripe. Digital purchases sync to your iOS app via link code.
          <br />Physical items have a 30-day return policy.
        </p>
      </div>
    </div>
  );
}

function Perk({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm group cursor-default">
      <span className="transition-transform duration-300 group-hover:scale-125">{icon}</span>
      <span className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300"
        onMouseEnter={(e) => { (e.target as HTMLElement).style.color = color; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.color = ''; }}
      >{text}</span>
    </div>
  );
}

function CoinPack({ icon, name, desc, price, bonus, onClick, color, delay }: {
  icon: string; name: string; desc: string; price: string; bonus: string; onClick: () => void; color: string; delay: string;
}) {
  return (
    <div className="game-card !p-5 flex items-center gap-4 group active:!scale-[0.99] animate-slide-up" style={{ animationDelay: delay }}>
      <span className="text-3xl transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-800">{name}</h3>
          {bonus && (
            <span className="text-[10px] font-black bg-[#10b981]/15 text-[#10b981] px-2 py-0.5 rounded-md border border-[#10b981]/20 shadow-[0_0_8px_rgba(0,255,128,0.1)]">{bonus}</span>
          )}
        </div>
        <p className="text-gray-400 text-xs">{desc}</p>
      </div>
      <button
        onClick={onClick}
        className="px-5 py-2.5 rounded-xl font-bold text-gray-800 text-sm transition-all duration-300 hover:scale-105 active:scale-95 btn-shimmer overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 4px 15px ${color}20` }}
      >
        <span className="relative z-10">{price}</span>
      </button>
    </div>
  );
}

function SyncStep({ num, icon, title, desc, color }: { num: string; icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="group cursor-default">
      <div className="text-3xl mb-2 transition-transform duration-300 group-hover:scale-125">{icon}</div>
      <div className="text-xs font-black mb-1 rounded-full inline-block px-2.5 py-0.5" style={{ color, backgroundColor: `${color}15` }}>STEP {num}</div>
      <div className="text-sm font-bold text-gray-700">{title}</div>
      <div className="text-xs text-gray-400 mt-1">{desc}</div>
    </div>
  );
}
