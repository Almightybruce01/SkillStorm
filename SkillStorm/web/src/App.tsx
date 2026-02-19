import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState, lazy, Suspense, useMemo, Component, type ReactNode } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SiteIntro from './components/SiteIntro';
import ConsentBanner from './components/ConsentBanner';
import BottomStickyAd from './components/ads/BottomStickyAd';
import FooterAd from './components/ads/FooterAd';
import InterstitialAd from './components/ads/InterstitialAd';
import { adsAllowed, interstitialsAllowed, AD_CONFIG } from './components/ads/AdConfig';
import { hasValidConsent, ConsentState } from './utils/consent';

import AchievementToast from './components/AchievementToast';

/* ═══ Eagerly loaded — needed on first paint ═══ */
import HomePage from './pages/HomePage';

/* ═══ Eagerly loaded — IAP/subscription pages must load reliably in iOS wrapper ═══ */
import StorePage from './pages/StorePage';
import CheckoutPage from './pages/CheckoutPage';
import PremiumPage from './pages/PremiumPage';
import ContactPage from './pages/ContactPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

/* ═══ Lazy-loaded pages — code-split for faster initial load ═══ */
const GamesPage = lazy(() => import('./pages/GamesPage'));
const GameDetailPage = lazy(() => import('./pages/GameDetailPage'));
const ArcadePage = lazy(() => import('./pages/ArcadePage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const VRPage = lazy(() => import('./pages/VRPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SchoolsPage = lazy(() => import('./pages/SchoolsPage'));
const AccessibilityPage = lazy(() => import('./pages/AccessibilityPage'));
const DataSettingsPage = lazy(() => import('./pages/DataSettingsPage'));

/* ═══ Pastel Floating Particles — desktop only ═══ */
const PARTICLES = [
  { color: '#f0abfc', size: 80, x: '10%', y: '20%', delay: 0 },
  { color: '#6ee7b7', size: 60, x: '80%', y: '15%', delay: 2 },
  { color: '#c4b5fd', size: 100, x: '60%', y: '70%', delay: 4 },
  { color: '#7dd3fc', size: 50, x: '25%', y: '80%', delay: 1 },
  { color: '#fdba74', size: 70, x: '90%', y: '50%', delay: 3 },
  { color: '#fda4af', size: 40, x: '45%', y: '30%', delay: 5 },
  { color: '#a5b4fc', size: 55, x: '15%', y: '60%', delay: 6 },
  { color: '#86efac', size: 45, x: '75%', y: '85%', delay: 7 },
];

function FloatingParticles() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="floating-particle"
          style={{
            width: p.size,
            height: p.size,
            left: p.x,
            top: p.y,
            background: `radial-gradient(circle, ${p.color}30, transparent)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${8 + i * 1.5}s`,
          }}
        />
      ))}
    </>
  );
}

/* ═══ Error Boundary — catches failed lazy chunk loads ═══ */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm mx-auto px-6">
            <p className="text-3xl mb-4">⚠️</p>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">This page couldn't load. Please check your connection and try again.</p>
            <button onClick={() => window.location.reload()} className="btn-elite btn-elite-primary text-sm px-6 py-3">
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══ Page loading spinner ═══ */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

/* ═══ Detect mobile once (not reactive — just initial check) ═══ */
function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
}

export default function App() {
  const location = useLocation();
  const navCount = useRef(0);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSiteIntro, setShowSiteIntro] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [appReady, setAppReady] = useState(false);

  const isMobile = useMemo(() => getIsMobile(), []);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('skillzstorm_intro_seen');
    if (!hasSeenIntro) {
      setShowSiteIntro(true);
    } else if (!hasValidConsent()) {
      setShowConsent(true);
      setAppReady(true);
    } else {
      setAppReady(true);
    }
  }, []);

  /* ═══ Orientation change + viewport tracking ═══ */
  useEffect(() => {
    const updateVP = () => {
      document.documentElement.style.setProperty('--vw', `${window.innerWidth}px`);
      document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
    };

    const handleOrientationChange = () => {
      // iOS Safari doesn't recalculate viewport immediately after rotation.
      // Force a reflow by briefly toggling a harmless style, then update VP.
      setTimeout(() => {
        updateVP();
        // Force all fixed/absolute elements to recalculate
        window.scrollTo(window.scrollX, window.scrollY);
      }, 100);
      // Second pass — iOS sometimes needs extra time
      setTimeout(updateVP, 500);
    };

    updateVP();
    window.addEventListener('resize', updateVP);
    window.addEventListener('orientationchange', handleOrientationChange);
    // matchMedia is more reliable than orientationchange on modern iOS
    const mql = window.matchMedia('(orientation: portrait)');
    mql.addEventListener('change', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', updateVP);
      window.removeEventListener('orientationchange', handleOrientationChange);
      mql.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  const handleIntroComplete = () => {
    setShowSiteIntro(false);
    sessionStorage.setItem('skillzstorm_intro_seen', 'true');
    if (!hasValidConsent()) {
      setShowConsent(true);
    }
    setAppReady(true);
  };

  const handleConsentComplete = (_state: ConsentState) => {
    setShowConsent(false);
  };

  useEffect(() => {
    if (!appReady) return;

    // Safety net: clear any stuck game styles on navigation
    document.body.classList.remove('game-playing');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';

    navCount.current++;
    if (
      navCount.current > 1 &&
      navCount.current % AD_CONFIG.interstitialFrequency === 0 &&
      interstitialsAllowed()
    ) {
      setShowInterstitial(true);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, appReady]);

  if (showSiteIntro) {
    return <SiteIntro onComplete={handleIntroComplete} />;
  }

  const showAds = adsAllowed();

  return (
    <div className={`${isMobile ? '' : 'bg-aurora-global'} min-h-screen relative ${appReady ? 'app-enter' : ''}`} style={{ background: '#ffffff' }}>
      {!isMobile && <div className="bg-grid-overlay" />}
      {!isMobile && <FloatingParticles />}

      <div className="relative z-10">
        <Navbar />

        <main className="page-enter" key={location.pathname}>
          <ChunkErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/games/:gameId" element={<GameDetailPage />} />
              <Route path="/arcade" element={<ArcadePage />} />
              <Route path="/arcade/:gameId" element={<ArcadePage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/vr" element={<VRPage />} />
              <Route path="/premium" element={<PremiumPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/schools" element={<SchoolsPage />} />
              <Route path="/accessibility" element={<AccessibilityPage />} />
              <Route path="/settings" element={<DataSettingsPage />} />
            </Routes>
          </Suspense>
          </ChunkErrorBoundary>
        </main>

        {showAds && <FooterAd />}
        <Footer />
        {showAds && <BottomStickyAd />}

        {showInterstitial && showAds && (
          <InterstitialAd onClose={() => setShowInterstitial(false)} />
        )}

        <AchievementToast />

        {showConsent && (
          <ConsentBanner onComplete={handleConsentComplete} />
        )}
      </div>
    </div>
  );
}
