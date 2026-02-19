import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 shadow-sm">
      {/* Animated gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-rainbow animate-rainbow opacity-80" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/images/logo.png" alt="SkillzStorm" className="h-8 sm:h-9 w-auto object-contain group-hover:brightness-110 transition-all duration-300" />
          </Link>
          
          {/* Desktop Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink to="/" active={location.pathname === '/'} icon="🏠">Home</NavLink>
            <NavLink to="/games" active={location.pathname.startsWith('/games') || location.pathname.startsWith('/game/')} icon="🎮">Games</NavLink>
            <NavLink to="/arcade" active={location.pathname === '/arcade'} icon="🕹️" highlight>Arcade</NavLink>
            <NavLink to="/vr" active={location.pathname === '/vr'} icon="🥽">VR</NavLink>
            <NavLink to="/store" active={location.pathname === '/store'} icon="🛒">Store</NavLink>
            <Link
              to="/premium"
              className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 btn-shimmer overflow-hidden ${
                location.pathname === '/premium'
                  ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-300 shadow-md'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 hover:from-amber-100 hover:to-orange-100 border border-amber-200 hover:border-amber-300 hover:shadow-md'
              }`}
            >
              <span className="relative z-10 flex items-center gap-1">
                👑 Premium
              </span>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button 
            onClick={() => setMobileOpen(!mobileOpen)} 
            className="sm:hidden text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all active:scale-90"
          >
            <div className="space-y-1.5">
              <div className={`w-5 h-0.5 bg-current transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <div className={`w-5 h-0.5 bg-current transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-0' : ''}`} />
              <div className={`w-5 h-0.5 bg-current transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-4 pt-2 space-y-1 bg-white/95 backdrop-blur-2xl border-t border-gray-100">
          <MobileNavLink to="/" active={location.pathname === '/'} icon="🏠" onClick={() => setMobileOpen(false)}>Home</MobileNavLink>
          <MobileNavLink to="/games" active={location.pathname.startsWith('/games')} icon="🎮" onClick={() => setMobileOpen(false)}>Games</MobileNavLink>
          <MobileNavLink to="/arcade" active={location.pathname === '/arcade'} icon="🕹️" onClick={() => setMobileOpen(false)}>Arcade</MobileNavLink>
          <MobileNavLink to="/schools" active={location.pathname === '/schools'} icon="🏫" onClick={() => setMobileOpen(false)}>For Schools</MobileNavLink>
          <MobileNavLink to="/store" active={location.pathname === '/store'} icon="🛒" onClick={() => setMobileOpen(false)}>Store</MobileNavLink>
          <MobileNavLink to="/vr" active={location.pathname === '/vr'} icon="🥽" onClick={() => setMobileOpen(false)}>VR</MobileNavLink>
          <MobileNavLink to="/about" active={location.pathname === '/about'} icon="ℹ️" onClick={() => setMobileOpen(false)}>About</MobileNavLink>
          <MobileNavLink to="/premium" active={location.pathname === '/premium'} icon="👑" onClick={() => setMobileOpen(false)}>Premium</MobileNavLink>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, icon, children, highlight }: { to: string; active: boolean; icon: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 group ${
        active
          ? 'bg-blue-50 text-blue-600 shadow-sm'
          : highlight
            ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-extrabold'
            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
      )}
      <span className="flex items-center gap-1.5">
        <span className={`text-xs transition-transform duration-300 ${active ? '' : 'group-hover:scale-125'}`}>{icon}</span>
        {children}
      </span>
    </Link>
  );
}

function MobileNavLink({ to, active, icon, onClick, children }: { to: string; active: boolean; icon: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200 active:scale-[0.98] ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {children}
    </Link>
  );
}
