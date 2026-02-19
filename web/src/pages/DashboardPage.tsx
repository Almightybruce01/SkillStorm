/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD — Income, Users, Ad Flow, Analytics
   Local analytics tracked via localStorage counters
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { allGames } from '../engine/gameData';
import { arcadeGames } from '../games/arcade/arcadeData';

// ── Analytics tracker (localStorage-based) ──
function getAnalytics() {
  const raw = localStorage.getItem('sz_analytics');
  if (raw) return JSON.parse(raw);
  return {
    totalVisits: 0,
    todayVisits: 0,
    totalGamesPlayed: 0,
    todayGamesPlayed: 0,
    gamesPlayedByDay: {} as Record<string, number>,
    visitsByDay: {} as Record<string, number>,
    popularGames: {} as Record<string, number>,
    lastVisitDate: '',
    firstVisitDate: '',
    sessionCount: 0,
    avgSessionMinutes: 0,
    peakConcurrent: 0,
  };
}

function trackVisit() {
  const a = getAnalytics();
  const today = new Date().toISOString().split('T')[0];
  
  if (!a.firstVisitDate) a.firstVisitDate = today;
  
  if (a.lastVisitDate !== today) {
    a.todayVisits = 1;
    a.todayGamesPlayed = 0;
  } else {
    a.todayVisits++;
  }
  
  a.totalVisits++;
  a.lastVisitDate = today;
  a.visitsByDay[today] = (a.visitsByDay[today] || 0) + 1;
  a.sessionCount++;
  
  localStorage.setItem('sz_analytics', JSON.stringify(a));
  return a;
}

export function trackGamePlay(gameId: string) {
  const a = getAnalytics();
  const today = new Date().toISOString().split('T')[0];
  a.totalGamesPlayed++;
  a.todayGamesPlayed++;
  a.gamesPlayedByDay[today] = (a.gamesPlayedByDay[today] || 0) + 1;
  a.popularGames[gameId] = (a.popularGames[gameId] || 0) + 1;
  localStorage.setItem('sz_analytics', JSON.stringify(a));
}

// ── Revenue estimator ──
function estimateRevenue(pageViews: number, gamesPlayed: number) {
  // Conservative eCPM estimates for child-directed content
  const bannerCPM = 2.5;      // $2.50 per 1000 banner impressions
  const interstitialCPM = 8;  // $8 per 1000 interstitial impressions
  const bannerImpressions = pageViews * 2;  // ~2 banner ads per page view
  const interstitialImpressions = gamesPlayed * 0.3; // 30% of games show interstitial
  
  const bannerRev = (bannerImpressions / 1000) * bannerCPM;
  const interstitialRev = (interstitialImpressions / 1000) * interstitialCPM;
  return { bannerRev, interstitialRev, total: bannerRev + interstitialRev };
}

// ── Dashboard ──
export function DashboardPage() {
  const [analytics, setAnalytics] = useState(trackVisit());
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'games' | 'setup'>('overview');

  useEffect(() => {
    setAnalytics(trackVisit());
  }, []);

  const revenue = estimateRevenue(analytics.totalVisits, analytics.totalGamesPlayed);
  const todayRevenue = estimateRevenue(analytics.todayVisits, analytics.todayGamesPlayed);
  
  const topGames = Object.entries(analytics.popularGames as Record<string, number>)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Get last 7 days data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const totalEducationalGames = allGames.length;
  const totalArcadeGames = arcadeGames.length;
  const totalGames = totalEducationalGames + totalArcadeGames;

  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full">
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-400 text-sm">SkillzStorm Analytics & Revenue</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto scrollbar-none">
          {(['overview', 'revenue', 'games', 'setup'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-all duration-300 border ${
                activeTab === tab
                  ? 'border-[#3b82f6]/40 text-[#3b82f6] bg-[#3b82f6]/10'
                  : 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'revenue' && '💰 '}
              {tab === 'games' && '🎮 '}
              {tab === 'setup' && '⚙️ '}
              {tab}
            </button>
          ))}
        </div>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-slide-up">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Visits" value={analytics.totalVisits.toLocaleString()} icon="👁️" color="#3b82f6" />
              <StatCard label="Today Visits" value={analytics.todayVisits.toLocaleString()} icon="📈" color="#10b981" />
              <StatCard label="Games Played" value={analytics.totalGamesPlayed.toLocaleString()} icon="🎮" color="#8b5cf6" />
              <StatCard label="Total Games" value={String(totalGames)} icon="🕹️" color="#f59e0b" />
            </div>

            {/* 7-Day Chart */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">VISITS — LAST 7 DAYS</h3>
              <div className="flex items-end gap-2 h-32">
                {last7Days.map(day => {
                  const visits = (analytics.visitsByDay as Record<string, number>)[day] || 0;
                  const maxVisits = Math.max(1, ...last7Days.map(d => (analytics.visitsByDay as Record<string, number>)[d] || 0));
                  const height = Math.max(4, (visits / maxVisits) * 100);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400">{visits}</span>
                      <div
                        className="w-full rounded-t-lg transition-all duration-500"
                        style={{ height: `${height}%`, background: 'linear-gradient(180deg, #3b82f6, #3b82f640)' }}
                      />
                      <span className="text-[9px] text-gray-300">{day.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-Day Games Chart */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">GAMES PLAYED — LAST 7 DAYS</h3>
              <div className="flex items-end gap-2 h-32">
                {last7Days.map(day => {
                  const plays = (analytics.gamesPlayedByDay as Record<string, number>)[day] || 0;
                  const maxPlays = Math.max(1, ...last7Days.map(d => (analytics.gamesPlayedByDay as Record<string, number>)[d] || 0));
                  const height = Math.max(4, (plays / maxPlays) * 100);
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-400">{plays}</span>
                      <div
                        className="w-full rounded-t-lg transition-all duration-500"
                        style={{ height: `${height}%`, background: 'linear-gradient(180deg, #8b5cf6, #8b5cf640)' }}
                      />
                      <span className="text-[9px] text-gray-300">{day.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="game-card !p-4 text-center">
                <div className="text-2xl mb-1">📱</div>
                <div className="text-gray-400 text-xs">Educational</div>
                <div className="text-xl font-black text-gray-800">{totalEducationalGames}</div>
              </div>
              <div className="game-card !p-4 text-center">
                <div className="text-2xl mb-1">🕹️</div>
                <div className="text-gray-400 text-xs">Arcade</div>
                <div className="text-xl font-black text-gray-800">{totalArcadeGames}</div>
              </div>
              <div className="game-card !p-4 text-center">
                <div className="text-2xl mb-1">📅</div>
                <div className="text-gray-400 text-xs">Since</div>
                <div className="text-xl font-black text-gray-800">{analytics.firstVisitDate || 'Today'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ REVENUE TAB ═══════ */}
        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-slide-up">
            {/* Revenue Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Est. Total Revenue" value={`$${revenue.total.toFixed(2)}`} icon="💰" color="#10b981" />
              <StatCard label="Est. Today" value={`$${todayRevenue.total.toFixed(2)}`} icon="📈" color="#f59e0b" />
              <StatCard label="Banner Revenue" value={`$${revenue.bannerRev.toFixed(2)}`} icon="🖼️" color="#3b82f6" />
              <StatCard label="Interstitial Rev" value={`$${revenue.interstitialRev.toFixed(2)}`} icon="📺" color="#f97316" />
            </div>

            {/* Revenue Breakdown */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">REVENUE BREAKDOWN</h3>
              <div className="space-y-4">
                <RevenueRow label="Banner Ads (top + bottom)" impressions={analytics.totalVisits * 2} cpm={2.5} />
                <RevenueRow label="In-Article Ads" impressions={analytics.totalVisits} cpm={4.0} />
                <RevenueRow label="Interstitial (between games)" impressions={Math.floor(analytics.totalGamesPlayed * 0.3)} cpm={8.0} />
                <RevenueRow label="Rewarded Video Ads" impressions={Math.floor(analytics.totalGamesPlayed * 0.1)} cpm={15.0} />
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500">Total Estimated</span>
                <span className="text-2xl font-black text-[#10b981]">${revenue.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Revenue projections */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">REVENUE PROJECTIONS</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ProjectionCard users={1000} label="1K Daily Users" />
                <ProjectionCard users={10000} label="10K Daily Users" />
                <ProjectionCard users={100000} label="100K Daily Users" />
              </div>
            </div>

            {/* Where to collect money */}
            <div className="game-card !p-6" style={{ borderColor: 'rgba(0,255,128,0.15)' }}>
              <h3 className="text-sm font-black text-[#10b981] mb-3">💵 WHERE TO COLLECT YOUR MONEY</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong className="text-gray-800">Google AdSense</strong> — Pays you monthly via bank transfer or check when your balance reaches <strong className="text-[#f59e0b]">$100</strong>.</p>
                <p><strong className="text-gray-800">How to set up payment:</strong></p>
                <ol className="list-decimal list-inside space-y-1 text-gray-400 ml-2">
                  <li>Go to <a href="https://adsense.google.com/payments" target="_blank" rel="noopener" className="text-[#3b82f6] underline">adsense.google.com/payments</a></li>
                  <li>Add your payment method (bank account / wire transfer)</li>
                  <li>Verify your identity and address (Google mails a PIN)</li>
                  <li>Once verified, payments are automatic every month</li>
                </ol>
                <p className="mt-3"><strong className="text-gray-800">Apple App Store (In-App Purchases)</strong> — Revenue from IAP goes to your <a href="https://appstoreconnect.apple.com" target="_blank" rel="noopener" className="text-[#3b82f6] underline">App Store Connect</a> account. Apple pays monthly via bank transfer, keeping 30% commission (15% for small business program).</p>
                <p><strong className="text-gray-800">Stripe (Website Store)</strong> — Revenue from physical goods goes to your <a href="https://dashboard.stripe.com" target="_blank" rel="noopener" className="text-[#3b82f6] underline">Stripe Dashboard</a>. Transfers to your bank every 2 business days after a sale. 2.9% + $0.30 per transaction fee.</p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ GAMES TAB ═══════ */}
        {activeTab === 'games' && (
          <div className="space-y-6 animate-slide-up">
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">MOST PLAYED GAMES</h3>
              {topGames.length === 0 ? (
                <p className="text-gray-300 text-sm text-center py-8">No games played yet. Play some games to see stats here!</p>
              ) : (
                <div className="space-y-2">
                  {topGames.map(([gameId, plays], i) => {
                    const game = allGames.find(g => g.id === gameId) || arcadeGames.find(g => g.id === gameId);
                    const maxPlays = topGames[0]?.[1] || 1;
                    return (
                      <div key={gameId} className="flex items-center gap-3">
                        <span className="text-gray-300 text-xs font-bold w-5 text-right">#{i + 1}</span>
                        <span className="text-lg">{game && 'iconEmoji' in game ? game.iconEmoji : game && 'emoji' in game ? (game as { emoji: string }).emoji : '🎮'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-bold text-gray-800">{game?.name || gameId}</span>
                            <span className="text-xs text-gray-400">{plays} plays</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-50 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(plays as number / maxPlays as number) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="game-card !p-5 text-center">
                <div className="text-3xl mb-2">🎓</div>
                <div className="text-2xl font-black text-gray-800 mb-1">{totalEducationalGames}</div>
                <div className="text-gray-400 text-xs">Educational Games</div>
                <div className="text-gray-300 text-[10px] mt-1">8 unique engines</div>
              </div>
              <div className="game-card !p-5 text-center">
                <div className="text-3xl mb-2">🕹️</div>
                <div className="text-2xl font-black text-gray-800 mb-1">{totalArcadeGames}</div>
                <div className="text-gray-400 text-xs">Arcade Games</div>
                <div className="text-gray-300 text-[10px] mt-1">12 classic games</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ SETUP TAB ═══════ */}
        {activeTab === 'setup' && (
          <div className="space-y-6 animate-slide-up">
            {/* Ad Status */}
            <div className="game-card !p-6" style={{ borderColor: 'rgba(255,38,38,0.2)' }}>
              <h3 className="text-sm font-black text-[#ef4444] mb-3">⚠️ ADS NOT RUNNING YET</h3>
              <p className="text-gray-400 text-sm mb-4">Your ads are coded and ready, but you need to plug in your real Google AdSense Publisher ID to start earning money.</p>
              
              <div className="space-y-4">
                <SetupStep num={1} title="Sign up for Google AdSense" done={false}>
                  <p>Go to <a href="https://adsense.google.com" target="_blank" rel="noopener" className="text-[#3b82f6] underline">adsense.google.com</a> and sign up with your Google account (use <strong className="text-gray-800">ezteach0@gmail.com</strong>).</p>
                  <p className="mt-1">Add your website: <strong className="text-gray-800">skillzstorm.com</strong></p>
                </SetupStep>

                <SetupStep num={2} title="Get your Publisher ID" done={false}>
                  <p>After approval, your Publisher ID looks like: <code className="bg-gray-50 px-2 py-0.5 rounded text-[#f59e0b]">ca-pub-1234567890123456</code></p>
                </SetupStep>

                <SetupStep num={3} title="Update the code (2 places)" done={false}>
                  <p>Publisher ID <code className="text-[#22c55e]">ca-pub-9418265198529416</code> is configured in:</p>
                  <ul className="mt-1 space-y-1 text-gray-400">
                    <li>1. <code className="bg-gray-50 px-1 rounded text-gray-500">web/index.html</code> — script tag</li>
                    <li>2. <code className="bg-gray-50 px-1 rounded text-gray-500">web/src/components/ads/AdConfig.ts</code> — publisherId</li>
                  </ul>
                </SetupStep>

                <SetupStep num={4} title="Create ad units in AdSense" done={false}>
                  <p>In AdSense dashboard, create these ad units and replace the slot IDs in <code className="bg-gray-50 px-1 rounded text-gray-500">AdConfig.ts</code>:</p>
                  <ul className="mt-1 space-y-0.5 text-gray-400">
                    <li>• Top Banner (728x90 Leaderboard)</li>
                    <li>• Sidebar Rectangle (300x250)</li>
                    <li>• In-Article Native Ad</li>
                    <li>• Bottom Sticky Banner</li>
                    <li>• Footer Banner</li>
                  </ul>
                </SetupStep>

                <SetupStep num={5} title="Enable child-directed treatment" done={false}>
                  <p>In AdSense → Account → Content → Child-directed settings → <strong className="text-gray-800">Enable</strong></p>
                  <p className="text-gray-300 text-xs mt-1">(Already set in code: data-tag-for-child-directed-treatment="1")</p>
                </SetupStep>

                <SetupStep num={6} title="Set up payment" done={false}>
                  <p>In AdSense → Payments → Add payment method → Enter your bank account details.</p>
                  <p className="mt-1">Google sends a PIN by mail to verify your address. Once verified, you get paid <strong className="text-[#10b981]">every month</strong> when balance ≥ $100.</p>
                </SetupStep>

                <SetupStep num={7} title="Push to deploy" done={false}>
                  <p>After updating the IDs, run: <code className="bg-gray-50 px-2 py-0.5 rounded text-[#10b981]">git add -A && git commit -m "Add real AdSense IDs" && git push origin main</code></p>
                  <p className="mt-1 text-gray-300 text-xs">Vercel auto-deploys from GitHub. Ads start showing within 24-48 hours of AdSense approval.</p>
                </SetupStep>
              </div>
            </div>

            {/* Ad Flow Diagram */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">AD REVENUE FLOW</h3>
              <div className="flex flex-col items-center gap-3 text-center">
                <FlowStep emoji="👤" text="User visits skillzstorm.com" />
                <FlowArrow />
                <FlowStep emoji="📺" text="Google AdSense loads ads (banner, in-article, sticky)" />
                <FlowArrow />
                <FlowStep emoji="👆" text="User sees ads (impressions) or clicks ads" />
                <FlowArrow />
                <FlowStep emoji="💰" text="Google charges advertisers, takes 32% cut" />
                <FlowArrow />
                <FlowStep emoji="🏦" text="68% goes to your AdSense balance" />
                <FlowArrow />
                <FlowStep emoji="💵" text="Monthly payout to your bank when ≥ $100" />
              </div>
            </div>

            {/* Other Revenue Streams */}
            <div className="game-card !p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-4">ALL REVENUE STREAMS</h3>
              <div className="space-y-3">
                <RevenueStream name="Google AdSense (Website)" status="Setup needed" statusColor="#ef4444" how="Ad impressions & clicks on skillzstorm.com" collect="adsense.google.com → Payments" />
                <RevenueStream name="Google AdMob (iOS App)" status="Setup needed" statusColor="#ef4444" how="Banner + interstitial ads in the iOS app" collect="admob.google.com → Payments" />
                <RevenueStream name="Apple IAP (App Store)" status="Setup needed" statusColor="#f97316" how="$2.99 ad-free purchase in the iOS app" collect="appstoreconnect.apple.com → Payments" />
                <RevenueStream name="Stripe (Web Store)" status="Setup needed" statusColor="#f97316" how="Physical goods (VR headsets, 3D glasses)" collect="dashboard.stripe.com → Balance" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ──

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="game-card !p-5 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl sm:text-3xl font-black text-gray-800 mb-1" style={{ color }}>{value}</div>
      <div className="text-gray-400 text-xs font-bold">{label}</div>
    </div>
  );
}

function RevenueRow({ label, impressions, cpm }: { label: string; impressions: number; cpm: number }) {
  const rev = (impressions / 1000) * cpm;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200">
      <div>
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-xs text-gray-300">{impressions.toLocaleString()} impressions × ${cpm} eCPM</div>
      </div>
      <div className="text-sm font-black text-[#10b981]">${rev.toFixed(2)}</div>
    </div>
  );
}

function ProjectionCard({ users, label }: { users: number; label: string }) {
  const dailyPageViews = users * 3;
  const dailyGames = users * 1.5;
  const { total } = estimateRevenue(dailyPageViews, dailyGames);
  const monthly = total * 30;
  return (
    <div className="game-card !p-4 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-black text-[#f59e0b]">${monthly.toFixed(0)}/mo</div>
      <div className="text-[10px] text-gray-300 mt-1">${total.toFixed(2)}/day</div>
    </div>
  );
}

function SetupStep({ num, title, done, children }: { num: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${done ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-gray-50 text-gray-400'}`}>
        {done ? '✓' : num}
      </div>
      <div className="flex-1">
        <div className={`text-sm font-bold mb-1 ${done ? 'text-[#10b981]' : 'text-gray-800'}`}>{title}</div>
        <div className="text-xs text-gray-400">{children}</div>
      </div>
    </div>
  );
}

function FlowStep({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 w-full max-w-md">
      <span className="text-xl">{emoji}</span>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}

function FlowArrow() {
  return <div className="text-white/10 text-lg">↓</div>;
}

function RevenueStream({ name, status, statusColor, how, collect }: { name: string; status: string; statusColor: string; how: string; collect: string }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-800">{name}</span>
        <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ color: statusColor, backgroundColor: `${statusColor}15` }}>{status}</span>
      </div>
      <div className="text-xs text-gray-400 mb-0.5">How: {how}</div>
      <div className="text-xs text-gray-300">Collect: {collect}</div>
    </div>
  );
}
