/* ═══════════════════════════════════════════════════════════
   VR PAGE — Apple Guideline 2.3 Compliant
   
   Guideline 2.3.1:
   "Don't include any hidden, dormant, or undocumented features."
   
   This page clearly indicates VR is NOT yet available.
   No feature promises or device compatibility claims.
   Only collects interest via email for future launch.
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function VRPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    // mailto-based waitlist signup
    window.location.href = `mailto:hello@skillzstorm.com?subject=${encodeURIComponent('VR Waitlist Signup')}&body=${encodeURIComponent(`Please add me to the VR waitlist.\n\nEmail: ${email}`)}`;
    setSubscribed(true);
  };

  return (
    <div className="page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-sm font-medium mb-6">
            Not Yet Available — In Development
          </span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-gray-900 mb-6">
            VR Learning <span className="text-gradient">Coming Soon</span>
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            We're exploring virtual reality as a future addition to SkillzStorm. 
            This feature is currently <strong>in early development</strong> and is not yet available.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            No launch date has been announced. Sign up below to be notified when we have updates.
          </p>
        </div>

        {/* Waitlist Signup */}
        <div className="game-card p-8 max-w-lg mx-auto mb-12 text-center">
          <h2 className="text-xl font-display font-bold text-gray-900 mb-3">Get Notified</h2>
          <p className="text-sm text-gray-500 mb-6">
            Join our interest list to receive updates about VR learning when it becomes available.
          </p>
          {subscribed ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700 font-medium">Your email app should have opened. Thanks for your interest!</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button type="submit" className="btn-elite btn-elite-primary min-h-[44px]">
                Notify Me
              </button>
            </form>
          )}
        </div>

        {/* What We're Exploring (NOT promising) */}
        <div className="mb-12">
          <h2 className="text-xl font-display font-bold text-gray-900 text-center mb-6">
            What We're Exploring
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8 max-w-lg mx-auto">
            These are concepts we're researching. None of these features are confirmed or available yet.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🌍', title: 'Immersive Lessons', desc: 'Interactive 3D environments for hands-on learning experiences.' },
              { icon: '🧪', title: 'Virtual Labs', desc: 'Safe simulated environments for science experiments.' },
              { icon: '🤝', title: 'Collaborative Spaces', desc: 'Shared virtual rooms for group learning activities.' },
            ].map((f, i) => (
              <div key={i} className="game-card p-6 text-center card-entrance opacity-60" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm">{f.desc}</p>
                <span className="inline-block mt-3 px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-medium rounded-full">
                  CONCEPT ONLY
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA to existing content */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">In the meantime, explore our existing educational games!</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/games" className="btn-elite btn-elite-primary">
              Play Educational Games
            </Link>
            <Link to="/arcade" className="btn-elite btn-elite-secondary">
              Play Arcade Games
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
