import { Link } from 'react-router-dom';

const FOOTER_LINKS = {
  Platform: [
    { to: '/games', label: 'Educational Games' },
    { to: '/arcade', label: 'Arcade' },
    { to: '/store', label: 'Store' },
    { to: '/premium', label: 'Premium' },
    { to: '/vr', label: 'VR Experience' },
  ],
  Resources: [
    { to: '/schools', label: 'For Schools' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
  ],
  Legal: [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/accessibility', label: 'Accessibility' },
    { to: '/settings', label: 'Data & Privacy Settings' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-black text-xs">
                S
              </div>
              <span className="font-display font-bold text-lg text-gray-900">SkillzStorm</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              The ultimate educational gaming platform. Learn math, science, reading, and more through engaging games.
            </p>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-display font-semibold text-gray-900 mb-3 text-sm">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-gray-500 hover:text-brand-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} SkillzStorm. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">Made with passion for education</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
