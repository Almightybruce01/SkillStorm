import { Link } from 'react-router-dom';
import { TopBannerAd, InArticleAd } from '../components/ads/AdBanner';

export function VRPage() {
  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
      <TopBannerAd />

      {/* ═══════ HERO ═══════ */}
      <section className="text-center py-16 animate-slide-up relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-gradient-to-r from-[#06b6d4]/15 via-[#3b82f6]/10 to-[#8b5cf6]/15 blur-[80px] rounded-full color-shift-slow pointer-events-none" />
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 blur-[50px] bg-[#06b6d4]/25 rounded-full scale-[2.5] animate-pulse-slow" />
          <div className="relative text-[100px] sm:text-[120px] animate-float leading-none">🥽</div>
        </div>
        <h1 className="text-5xl sm:text-7xl font-black leading-tight mb-3 animate-slide-up delay-100 relative">
          <span className="bg-gradient-to-r from-[#06b6d4] via-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">STORMVR</span>
        </h1>
        <p className="text-[#06b6d4] font-black tracking-[0.5em] text-xs sm:text-sm mb-5 neon-glow-cyan animate-slide-up delay-200">
          LEARN IN VIRTUAL REALITY
        </p>
        <p className="text-gray-400 max-w-xl mx-auto text-base leading-relaxed animate-slide-up delay-300">
          Step inside your lessons. Experience math, science, history, and more
          in immersive 3D worlds. <span className="text-gray-600 font-semibold">Multiple ways to play.</span>
        </p>
      </section>

      {/* ═══════ 4 WAYS TO PLAY ═══════ */}
      <section className="mb-20">
        <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
          <span className="text-xl">🎯</span> 4 WAYS TO PLAY VR
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Method 1: Phone-in-Headset */}
          <VRMethodCard
            emoji="📱" title="Phone-in-Headset" subtitle="EASIEST — $29.99" color="#3b82f6"
            description="Insert your phone into a StormVR Lite headset and jump into VR instantly."
            steps={[
              'Purchase a StormVR Lite headset from our Store ($29.99)',
              'Download the SkillzStorm app from the App Store or Google Play',
              'Open the app and navigate to any StormVR game',
              'Tap "Enter VR Mode" — the screen splits into stereoscopic view',
              'Slide your phone into the StormVR Lite headset',
              'Adjust the headset straps and lens distance for comfort',
              'Use the included Bluetooth controller or head-tilt to interact',
              'Play immersive 3D learning games in full VR!'
            ]}
            tips={[
              'Works best with iPhone 12+ or any Android phone with a gyroscope',
              'Lock screen rotation to landscape before inserting',
              'Take a break every 20 minutes for eye comfort',
              'Use headphones for spatial audio immersion'
            ]}
            ctaText="Buy StormVR Lite" ctaLink="/store" delay={0}
          />

          {/* Method 2: Web VR */}
          <VRMethodCard
            emoji="🌐" title="Web VR (WebXR)" subtitle="FREE — No Download" color="#10b981"
            description="Play VR games directly in your headset's browser. Zero downloads, zero cost."
            steps={[
              'Put on your VR headset (Meta Quest, Pico, any WebXR headset)',
              'Open the built-in web browser inside VR',
              'Navigate to skillzstorm.com',
              'Browse to any game marked with the 🥽 VR badge',
              'Click the "Enter VR" button that appears on the game page',
              'Grant browser VR permissions when prompted',
              'The game launches in full immersive VR mode',
              'Use your VR controllers or hand tracking to play!'
            ]}
            tips={[
              'Works on Meta Quest 2, Quest 3, Quest Pro, Pico 4, and more',
              'Bookmark skillzstorm.com for quick access',
              'WebXR runs at 72fps+ on most modern headsets',
              'No app installation or account needed — completely free'
            ]}
            ctaText="Play Web VR Now" ctaLink="/games/StormVR" delay={1}
          />

          {/* Method 3: Standalone */}
          <VRMethodCard
            emoji="🎧" title="StormVR Pro Standalone" subtitle="ALL-IN-ONE — $149.99" color="#8b5cf6"
            description="Our premium standalone headset with SkillzStorm pre-installed. No phone needed."
            steps={[
              'Purchase the StormVR Pro from our Store ($149.99)',
              'Unbox and charge the headset (USB-C, ~2 hours to full)',
              'Power on — SkillzStorm is already pre-installed',
              'Complete the quick 30-second setup (IPD adjustment, play area)',
              'Select your grade level (K-2, 3-5, 6-8, or 9-12)',
              'Browse the full VR game library with hand tracking or controllers',
              'Choose any game and start playing immediately',
              'Updates download automatically over Wi-Fi'
            ]}
            tips={[
              '6DOF (6 degrees of freedom) tracking for room-scale VR',
              'Hand tracking — no controllers needed for most games',
              '2K resolution per eye for crisp visuals',
              '~2 hour battery life, play while charging with included cable'
            ]}
            ctaText="Get StormVR Pro" ctaLink="/store" delay={2}
          />

          {/* Method 4: Apple Vision Pro */}
          <VRMethodCard
            emoji="👁️" title="Apple Vision Pro" subtitle="SPATIAL COMPUTING" color="#f97316"
            description="Experience SkillzStorm as spatial apps with hand and eye tracking on visionOS."
            steps={[
              'Open the App Store on your Apple Vision Pro',
              'Search for "SkillzStorm" in the visionOS App Store',
              'Download and install the SkillzStorm app (free)',
              'Launch the app — games appear as spatial windows in your space',
              'Use hand gestures (pinch, tap, swipe) to navigate menus',
              'Select a VR game to enter full immersive mode',
              'Games scale from a window to full room-size immersive',
              'Eye tracking selects targets, hand pinch confirms actions'
            ]}
            tips={[
              'Spatial audio makes learning games feel incredibly real',
              'Pass-through lets you see your real environment while playing',
              'Works in any room — no dedicated play area needed',
              'Premium features available via in-app purchase on visionOS'
            ]}
            ctaText="Learn More" ctaLink="#visionpro" delay={3}
          />
        </div>
      </section>

      <InArticleAd />

      {/* ═══════ VR GAMES ═══════ */}
      <section className="mb-20">
        <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
          <span className="text-xl">🥽</span> VR GAME LIBRARY
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {[
            { emoji: '🧮', name: 'VR Math Arena', desc: 'Solve equations floating in 3D space', color: '#3b82f6' },
            { emoji: '🔬', name: 'VR Science Lab', desc: 'Conduct virtual experiments', color: '#10b981' },
            { emoji: '🌍', name: 'VR Geo Explorer', desc: 'Travel the globe in VR', color: '#8b5cf6' },
            { emoji: '📐', name: 'Geometry Runner 3D', desc: 'Run through geometric worlds', color: '#f97316' },
            { emoji: '⚗️', name: 'VR Chemistry', desc: 'Mix elements in 3D lab', color: '#ec4899' },
            { emoji: '🏺', name: 'VR History Walk', desc: 'Walk through ancient civilizations', color: '#f59e0b' },
            { emoji: '🛡️', name: 'Storm Defenders VR', desc: '3D tower defense with learning', color: '#ef4444' },
            { emoji: '🚀', name: 'More Coming...', desc: 'New VR games monthly', color: '#06b6d4' },
          ].map((game, i) => (
            <div
              key={game.name}
              className="game-card text-center group animate-pop-in"
              style={{ animationDelay: `${i * 0.08}s` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${game.color}25`; e.currentTarget.style.boxShadow = `0 8px 40px ${game.color}12`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div className="text-4xl mb-3 group-hover:scale-[1.3] transition-transform duration-300"
                style={{ filter: `drop-shadow(0 0 8px ${game.color}40)` }}
              >
                {game.emoji}
              </div>
              <h3 className="font-bold text-sm mb-1 text-gray-800 group-hover:transition-colors duration-300"
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = game.color; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'white'; }}
              >{game.name}</h3>
              <p className="text-gray-300 text-xs group-hover:text-white/45 transition-colors">{game.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ COMPARISON TABLE ═══════ */}
      <section className="mb-20">
        <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
          COMPARE OPTIONS
        </h2>
        <div className="game-card overflow-hidden !p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-gray-50">
                <th className="py-4 px-4 text-gray-400 text-xs font-black tracking-wider">FEATURE</th>
                <th className="py-4 px-4 text-[#3b82f6] text-xs font-black tracking-wider">LITE</th>
                <th className="py-4 px-4 text-[#8b5cf6] text-xs font-black tracking-wider">PRO</th>
                <th className="py-4 px-4 text-[#10b981] text-xs font-black tracking-wider">WEB</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <Row label="Price" v1="$29.99" v2="$149.99" v3="Free" highlight={2} />
              <Row label="Requires Phone" v1="Yes" v2="No" v3="No" />
              <Row label="Download Needed" v1="App" v2="Built-in" v3="None" />
              <Row label="Tracking" v1="3DOF" v2="6DOF" v3="3DOF" />
              <Row label="Hand Tracking" v1="No" v2="Yes" v3="Limited" />
              <Row label="Display" v1="Phone" v2="2K per eye" v3="Device" />
              <Row label="Controllers" v1="Included" v2="Included" v3="N/A" />
              <Row label="Best For" v1="Beginners" v2="Power Users" v3="Trying First" highlight={2} />
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════ QUICK START GUIDE ═══════ */}
      <section className="mb-20">
        <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
          <span className="text-xl">⚡</span> QUICK START — TRY VR IN 60 SECONDS
        </h2>
        <div className="game-card !p-8" style={{ background: 'linear-gradient(135deg, rgba(0,255,128,0.04), rgba(0,153,255,0.03))' }}>
          <p className="text-gray-500 text-sm mb-6">Already have a VR headset? Here's the fastest way to try SkillzStorm in VR:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <QuickStep num="1" title="Open Browser in VR" desc="Put on your headset and open the built-in web browser" icon="🌐" />
            <QuickStep num="2" title="Go to skillzstorm.com" desc="Type skillzstorm.com in the address bar" icon="🔗" />
            <QuickStep num="3" title="Click 'Enter VR'" desc="Find any StormVR game and click the VR button" icon="▶" />
          </div>
          <p className="text-center text-gray-300 text-xs mt-6">Works on Meta Quest 2/3/Pro • Pico 4 • HTC Vive Focus • Any WebXR headset</p>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="mb-20">
        <h2 className="section-heading text-lg font-black tracking-[0.15em] text-gray-700">
          FAQ
        </h2>
        <div className="space-y-3">
          {[
            { q: 'Do I need a VR headset to play SkillzStorm?', a: 'No! VR is completely optional. All 50+ games work perfectly on iPhone, iPad, Mac, and web browsers without any VR headset. VR is an extra way to experience immersive 3D games.' },
            { q: 'What age is VR safe for?', a: 'We recommend VR for ages 7+. Our games include comfort settings like teleport movement, adjustable field-of-view, and automatic rest reminders every 20 minutes to ensure a safe, comfortable experience.' },
            { q: 'Can I try VR for free before buying a headset?', a: 'Absolutely! Visit skillzstorm.com on any VR headset\'s built-in browser. Our WebXR games run directly in the browser with no download and no purchase required. It\'s the perfect way to try before you buy.' },
            { q: 'Will SkillzStorm work with Meta Quest?', a: 'Yes! Our Web VR games work on Meta Quest 2, Quest 3, and Quest Pro via the built-in browser. Just go to skillzstorm.com and click "Enter VR" on any StormVR game. Also works with Pico 4, HTC Vive Focus, and any WebXR-compatible headset.' },
            { q: 'How do I get my physical order (headsets/glasses)?', a: 'Physical items ship within 2-3 business days via standard shipping. Free shipping on orders over $50. All payments are processed securely through Stripe.' },
            { q: 'Can schools use VR for classrooms?', a: 'Yes! Schools can use Web VR (free, no setup) on compatible headsets, or contact us for bulk pricing on StormVR Pro units. All VR games align with K-12 curriculum standards and are COPPA compliant.' },
          ].map((faq, i) => (
            <details key={i} className="game-card !p-5 cursor-pointer group animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <summary className="font-bold text-gray-800 list-none flex items-center justify-between">
                <span className="group-hover:text-[#06b6d4] transition-colors duration-300 pr-4">{faq.q}</span>
                <span className="text-gray-300 group-open:rotate-180 transition-transform duration-300 flex-shrink-0 text-lg">▾</span>
              </summary>
              <p className="text-white/45 text-sm mt-4 leading-relaxed border-t border-gray-200 pt-4">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="text-center py-8 animate-slide-up">
        <div className="game-card !p-10 max-w-xl mx-auto" style={{ background: 'linear-gradient(135deg, rgba(0,230,230,0.06), rgba(0,153,255,0.04))' }}>
          <div className="text-6xl mb-4 animate-float">🥽</div>
          <h2 className="text-3xl font-black text-gray-800 mb-3">Ready for VR?</h2>
          <p className="text-gray-400 mb-8">Try Web VR free in 60 seconds, or get a headset for the full experience.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/games/StormVR" className="btn-elite btn-elite-primary flex items-center justify-center gap-2">
              <span>🌐</span> Try Web VR Free
            </Link>
            <Link to="/store" className="btn-elite btn-elite-ghost flex items-center justify-center gap-2">
              <span>🛒</span> Browse VR Headsets
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function VRMethodCard({ emoji, title, subtitle, description, steps, tips, ctaText, ctaLink, color, delay }: {
  emoji: string; title: string; subtitle: string; description: string;
  steps: string[]; tips: string[]; ctaText: string; ctaLink: string; color: string; delay: number;
}) {
  return (
    <div
      className="game-card group animate-slide-up"
      style={{ animationDelay: `${delay * 0.12}s` }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.boxShadow = `0 12px 50px ${color}12`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{emoji}</div>
      <h3 className="font-black text-gray-800 text-xl mb-1">{title}</h3>
      <p className="text-xs font-black mb-3" style={{ color }}>{subtitle}</p>
      <p className="text-gray-400 text-sm mb-6">{description}</p>

      {/* Step-by-step instructions */}
      <div className="mb-5">
        <h4 className="text-xs font-black tracking-[0.1em] mb-3" style={{ color }}>STEP-BY-STEP SETUP</h4>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm group/step">
              <span
                className="font-black text-[10px] mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover/step:scale-110"
                style={{ color: 'white', backgroundColor: `${color}25`, border: `1px solid ${color}30` }}
              >
                {i + 1}
              </span>
              <span className="text-gray-500 group-hover/step:text-gray-600 transition-colors">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mb-6 p-4 rounded-xl border border-white/[0.04]" style={{ backgroundColor: `${color}05` }}>
        <h4 className="text-xs font-black tracking-[0.1em] mb-2 text-gray-400">💡 TIPS</h4>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
              <span style={{ color }}>•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        to={ctaLink}
        className="btn-elite inline-block text-sm text-gray-800"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, boxShadow: `0 4px 20px ${color}25` }}
      >
        {ctaText} →
      </Link>
    </div>
  );
}

function QuickStep({ num, title, desc, icon }: { num: string; title: string; desc: string; icon: string }) {
  return (
    <div className="text-center group">
      <div className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-300">{icon}</div>
      <div className="text-3xl font-black text-[#10b981] mb-1">{num}</div>
      <h4 className="font-black text-gray-800 text-sm mb-1">{title}</h4>
      <p className="text-gray-400 text-xs">{desc}</p>
    </div>
  );
}

function Row({ label, v1, v2, v3, highlight }: { label: string; v1: string; v2: string; v3: string; highlight?: number }) {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors duration-200">
      <td className="py-3 px-4 text-gray-400 font-semibold text-xs">{label}</td>
      <td className={`py-3 px-4 text-xs ${highlight === 0 ? 'text-[#3b82f6] font-bold' : 'text-gray-600'}`}>{v1}</td>
      <td className={`py-3 px-4 text-xs ${highlight === 1 ? 'text-[#8b5cf6] font-bold' : 'text-gray-600'}`}>{v2}</td>
      <td className={`py-3 px-4 text-xs ${highlight === 2 ? 'text-[#10b981] font-bold' : 'text-gray-600'}`}>{v3}</td>
    </tr>
  );
}
