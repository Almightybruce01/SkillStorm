import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 bg-gray-50">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <Link to="/" className="inline-block mb-3">
              <img src="/images/logo.png" alt="SkillzStorm" className="h-8 w-auto" />
            </Link>
            <p className="text-gray-400 text-xs leading-relaxed mb-4 max-w-[200px]">
              The arcade learning platform where education meets entertainment. Play Hard. Think Harder.
            </p>
            <div className="flex gap-3">
              <SocialIcon href="https://twitter.com/skillzstorm" label="X" icon="𝕏" />
              <SocialIcon href="https://instagram.com/skillzstorm" label="IG" icon="📸" />
              <SocialIcon href="https://tiktok.com/@skillzstorm" label="TT" icon="🎵" />
              <SocialIcon href="https://youtube.com/@skillzstorm" label="YT" icon="▶" />
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-4">PLATFORM</h4>
            <ul className="space-y-2.5">
              <FooterLink to="/games">All Games</FooterLink>
              <FooterLink to="/arcade">Arcade Games</FooterLink>
              <FooterLink to="/games/StormDash">Dash & Runner</FooterLink>
              <FooterLink to="/games/StormPuzzle">Puzzle & Strategy</FooterLink>
              <FooterLink to="/games/StormQuick">Quick Play</FooterLink>
              <FooterLink to="/vr">VR Games</FooterLink>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-4">COMPANY</h4>
            <ul className="space-y-2.5">
              <FooterLink to="/about">About Us</FooterLink>
              <FooterLink to="/schools">For Schools</FooterLink>
              <FooterLink to="/contact">Contact</FooterLink>
              <FooterLink to="/premium">Go Premium</FooterLink>
              <FooterLink to="/store">Storm Store</FooterLink>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-4">SUPPORT</h4>
            <ul className="space-y-2.5">
              <FooterLink to="/contact">Help Center</FooterLink>
              <FooterLink to="/contact">Report a Bug</FooterLink>
              <FooterLink to="/contact">Request a Feature</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/terms">Terms of Service</FooterLink>
              <FooterLink to="/accessibility">Accessibility</FooterLink>
            </ul>
          </div>

          {/* Get the App */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-4">GET THE APP</h4>
            <div className="space-y-2">
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-300 group">
                <span className="text-lg">🍎</span>
                <div>
                  <div className="text-[9px] text-gray-400 leading-tight">Download on the</div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">App Store</div>
                </div>
              </a>
              <a href="#" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-300 group">
                <span className="text-lg">💻</span>
                <div>
                  <div className="text-[9px] text-gray-400 leading-tight">Available on</div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Mac App Store</div>
                </div>
              </a>
              <a href="https://skillzstorm.com" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-300 group">
                <span className="text-lg">🌐</span>
                <div>
                  <div className="text-[9px] text-gray-400 leading-tight">Play free on</div>
                  <div className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">skillzstorm.com</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Bar */}
      <div className="border-t border-gray-200 bg-gray-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              COPPA Compliant
            </span>
            <span>•</span>
            <span>Child-Safe Ads</span>
            <span>•</span>
            <span>No Data Collection</span>
            <span>•</span>
            <span>No Login Required</span>
            <span>•</span>
            <span>SSL Encrypted</span>
            <span>•</span>
            <span>School Approved</span>
            <span>•</span>
            <span>Stripe Secure Payments</span>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-400 text-[11px]">
            &copy; 2026 SkillzStorm by EZTeach. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-gray-400 text-[11px]">
            <Link to="/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link to="/accessibility" className="hover:text-gray-600 transition-colors">Accessibility</Link>
            <a href="mailto:support@skillzstorm.com" className="hover:text-gray-600 transition-colors">support@skillzstorm.com</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-gray-400 text-xs hover:text-blue-600 transition-colors duration-300">
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all duration-300 text-gray-400"
    >
      {icon}
    </a>
  );
}
