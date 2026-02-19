/* ═══════════════════════════════════════════════════════════
   NAVBAR — Enhanced with Sound, Animations, Level Display
   Features: Sound on click, animated logo, level badge
   ═══════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import soundEngine from '../games/SoundEngine';
import { getStats } from '../engine/gameStats';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/games', label: 'Games', icon: '🎮' },
  { to: '/achievements', label: 'Achievements', icon: '🏆' },
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/store', label: 'Store', icon: '🛒' },
  { to: '/vr', label: 'VR', icon: '🥽' },
  { to: '/schools', label: 'Schools', icon: '🏫' },
  { to: '/about', label: 'About', icon: 'ℹ️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const stats = getStats();
    setLevel(stats.level);
    setCoins(stats.coins);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = () => {
    try { soundEngine.click(); } catch {}
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-md'
        : 'bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={handleNavClick}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-violet-200 group-hover:shadow-violet-300 group-hover:scale-105 transition-all duration-200">
              S
            </div>
            <span className="font-display font-extrabold text-xl text-gray-900">
              Skillz<span className="text-gradient">Storm</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={handleNavClick}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? 'text-violet-700 bg-violet-50 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Arcade Button — Highlighted */}
            <Link
              to="/arcade"
              onClick={handleNavClick}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ml-1 ${
                location.pathname.startsWith('/arcade')
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200'
                  : 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-600 hover:from-pink-500 hover:to-rose-500 hover:text-white hover:shadow-lg hover:shadow-pink-200'
              }`}
            >
              Arcade
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Level Badge */}
            <Link
              to="/dashboard"
              onClick={handleNavClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <span className="w-5 h-5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded text-white text-[10px] font-black flex items-center justify-center">
                {level}
              </span>
              <span className="text-xs">Lv</span>
            </Link>

            {/* Coins */}
            <Link
              to="/store"
              onClick={handleNavClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold">{coins}</span>
            </Link>

            <Link to="/premium" onClick={handleNavClick} className="btn-elite btn-elite-primary text-xs">
              Go Premium
            </Link>
          </div>

          {/* Mobile right side: level + coins + menu */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/dashboard" className="flex items-center gap-1 px-2 py-1 bg-violet-50 rounded-lg text-xs font-bold text-violet-700">
              <span className="w-4 h-4 bg-gradient-to-br from-violet-500 to-indigo-600 rounded text-white text-[9px] font-black flex items-center justify-center">{level}</span>
            </Link>
            <Link to="/store" className="flex items-center gap-0.5 px-2 py-1 bg-amber-50 rounded-lg text-xs font-bold text-amber-700">
              🪙 {coins}
            </Link>
            <button
              onClick={() => { setMobileOpen(!mobileOpen); handleNavClick(); }}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors touch-manipulation active:scale-95"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu — Full-height overlay with smooth transitions */}
      {mobileOpen && (
      <div
        className="md:hidden fixed inset-0 top-16 z-40"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20"
          onClick={() => setMobileOpen(false)}
        />

        {/* Menu Panel */}
        <div className="absolute top-0 right-0 w-full max-w-sm h-full bg-white shadow-2xl overflow-y-auto safe-bottom">
          <div className="px-4 py-4 space-y-1">
            {/* Level & Coins row */}
            <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-100 rounded-lg text-sm font-bold text-violet-700">
                <span className="w-6 h-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-md text-white text-xs font-black flex items-center justify-center">{level}</span>
                <span>Level {level}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-lg text-sm font-bold text-amber-700">
                🪙 {coins}
              </div>
            </div>

            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => { setMobileOpen(false); handleNavClick(); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all touch-manipulation active:scale-[0.98] ${
                  location.pathname === link.to
                    ? 'text-violet-700 bg-violet-50 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-lg w-7 text-center">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            <div className="pt-2 space-y-2">
              <Link
                to="/arcade"
                onClick={() => { setMobileOpen(false); handleNavClick(); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 touch-manipulation active:scale-[0.98]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-lg w-7 text-center">🕹️</span>
                Arcade
              </Link>
              <Link
                to="/premium"
                onClick={() => { setMobileOpen(false); handleNavClick(); }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-bold text-violet-600 bg-violet-50 border border-violet-200 touch-manipulation active:scale-[0.98]"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-lg w-7 text-center">⭐</span>
                Go Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}
    </nav>
  );
}
