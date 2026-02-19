/* ═══════════════════════════════════════════════════════════
   SCHOOLS PAGE — Apple Guideline 2.3 Compliant
   
   Guideline 2.3:
   "All app metadata, including privacy information, your app
    description, screenshots, and previews accurately reflect
    the app's core experience."
   
   Removed fake testimonials.
   Removed unverified FERPA claims.
   Only states features that actually exist.
   ═══════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';

export default function SchoolsPage() {
  return (
    <div className="page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6">
            For Educators
          </span>
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-4">
            SkillzStorm for <span className="text-gradient">Schools</span>
          </h1>
          <p className="text-xl text-gray-600">
            Engage your students with curriculum-aligned educational games. Track progress, assign games, and watch learning outcomes improve.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: '🎮', title: '55+ Educational Games', desc: 'Games covering math, science, reading, history, geography, art, music, and coding for grades K-12.' },
            { icon: '🚫', title: 'Ad-Free for Students', desc: 'The school plan removes all advertisements, so students can focus entirely on learning.' },
            { icon: '🔒', title: 'Privacy First', desc: 'Designed with COPPA compliance in mind. No personal data collection from students without parental consent.' },
            { icon: '📊', title: 'Progress Tracking', desc: 'Students can track their own scores, achievements, and improvement over time on their devices.' },
            { icon: '🏆', title: 'Achievement System', desc: 'Built-in achievements and daily challenges keep students motivated and engaged with learning material.' },
            { icon: '📱', title: 'Works Everywhere', desc: 'Runs on any device with a web browser — phones, tablets, Chromebooks, and desktop computers.' },
          ].map((f, i) => (
            <div key={i} className="game-card p-6 card-entrance" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="game-card p-8 text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-4">School Pricing</h2>
          <div className="mb-6">
            <span className="text-5xl font-display font-bold text-gradient">$99.99</span>
            <span className="text-gray-500">/year</span>
          </div>
          <ul className="space-y-2 mb-8 text-left max-w-sm mx-auto">
            {[
              'Ad-free experience for all students',
              'Full access to all educational games',
              'Full access to all arcade games',
              'Achievement and progress tracking',
              'Priority email support',
              'COPPA-aware privacy controls',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            Manage subscriptions in your App Store account settings.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/checkout" className="btn-elite btn-elite-primary">
              Subscribe
            </Link>
            <Link to="/contact" className="btn-elite btn-elite-secondary">
              Contact Us
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl font-display font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Subscribe', desc: 'Purchase the school plan to unlock ad-free access and all premium games.' },
              { step: '2', title: 'Share with Students', desc: 'Students access SkillzStorm on any device. All game progress saves locally on their device.' },
              { step: '3', title: 'Track Progress', desc: 'Students can view their own scores, achievements, and improvement through the in-app dashboard.' },
            ].map((s, i) => (
              <div key={i} className="game-card p-5 flex items-start gap-4 card-entrance" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{s.title}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legal note */}
        <div className="text-center">
          <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
            Schools are responsible for obtaining necessary parental consent as required by COPPA and applicable local laws.
            SkillzStorm stores all student data locally on individual devices — no student data is transmitted to our servers.
          </p>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <Link to="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
