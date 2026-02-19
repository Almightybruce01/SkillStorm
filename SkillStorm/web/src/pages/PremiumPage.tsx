/* ═══════════════════════════════════════════════════════════
   PREMIUM PAGE — Apple App Store Compliant
   
   Apple Guidelines Addressed:
   - 3.1.1    In-App Purchase for digital content
   - 3.1.2(a) Auto-renewable subscription rules
   - 3.1.2(c) Must clearly describe what user gets
   - 2.3      Accurate metadata — no misleading pricing
   ═══════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';
import { mustUseAppleIAP, isIOSDevice } from '../utils/platform';
import { SUBSCRIPTION_DISCLOSURE } from '../utils/iapStore';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '55+ educational games',
      '26+ arcade games',
      'Basic progress tracking',
      'Ad-supported',
      'Community access',
    ],
    missing: ['No ads', 'Premium games', 'Detailed analytics', 'Priority support', 'Custom avatars'],
    cta: 'Current Plan',
    highlight: false,
    gradient: 'from-gray-100 to-gray-200',
    icon: '🆓',
    route: '/games',
  },
  {
    name: 'Premium',
    price: '$4.99',
    period: '/month',
    features: [
      'Everything in Free',
      'Zero ads anywhere',
      'Exclusive premium games',
      'Detailed analytics dashboard',
      'Priority support',
      'Custom avatars & themes',
      'Bonus XP multiplier (2x)',
      'Early access to new games',
    ],
    missing: [],
    cta: 'Subscribe Now',
    highlight: true,
    gradient: 'from-violet-500 to-indigo-600',
    icon: '⭐',
    route: '/checkout',
  },
  {
    name: 'School',
    price: '$99.99',
    period: '/year',
    features: [
      'Everything in Premium',
      'Up to 100 students',
      'Teacher dashboard',
      'Assignment creation',
      'Grade reports & analytics',
      'LMS integration (Google Classroom, Canvas)',
      'Dedicated support team',
      'Custom school branding',
    ],
    missing: [],
    cta: 'Contact Sales',
    highlight: false,
    gradient: 'from-green-500 to-emerald-600',
    icon: '🏫',
    route: '/contact',
  },
];

const benefits = [
  { icon: '🎯', title: 'Focus on Learning', text: 'No ads means no distractions. Students can focus entirely on educational content without interruptions.' },
  { icon: '📈', title: 'Track Progress', text: 'Detailed analytics show exactly where strengths and growth areas are, making learning more effective.' },
  { icon: '🚀', title: 'Level Up Faster', text: '2x XP multiplier helps unlock achievements and new content faster, keeping motivation high.' },
];

const features = [
  { icon: '🚫', title: 'Zero Ads', desc: 'Completely ad-free experience across all games and pages' },
  { icon: '🎮', title: 'Exclusive Games', desc: 'Access premium-only games with advanced mechanics' },
  { icon: '📊', title: 'Deep Analytics', desc: 'Track progress with detailed charts and insights' },
  { icon: '⚡', title: '2x XP Boost', desc: 'Level up twice as fast with premium XP multiplier' },
  { icon: '🎨', title: 'Custom Themes', desc: 'Personalize your experience with avatars and themes' },
  { icon: '🔔', title: 'Early Access', desc: 'Be the first to play new games before anyone else' },
];

export default function PremiumPage() {
  const isIOS = mustUseAppleIAP() || isIOSDevice();

  return (
    <div className="page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-50 text-violet-600 text-sm font-medium mb-6 animate-fade-in">
            <span className="animate-pulse">✨</span>
            Unlock the full SkillzStorm experience
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold text-gray-900 mb-4 animate-slide-up">
            Go <span className="text-shimmer">Premium</span>
          </h1>
          <p className="text-xl text-gray-600 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Remove ads, unlock exclusive content, 2x XP, and supercharge your learning.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-16 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="game-card p-5 sm:p-6 text-center card-entrance group hover:scale-105 transition-transform"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-3xl sm:text-4xl mb-3 block group-hover:scale-110 transition-transform">{f.icon}</span>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{f.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`game-card overflow-hidden card-entrance relative ${
                plan.highlight
                  ? 'border-violet-400 shadow-2xl shadow-violet-100 ring-2 ring-violet-200 scale-105'
                  : ''
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {plan.highlight && (
                <div className="absolute -top-0.5 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500" />
              )}
              {plan.highlight && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full shadow-lg">
                  RECOMMENDED
                </span>
              )}

              <div className={`p-6 bg-gradient-to-br ${plan.gradient} ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{plan.icon}</span>
                  <h3 className="text-2xl font-display font-bold">{plan.name}</h3>
                </div>
                <div>
                  <span className={`text-4xl font-display font-bold ${plan.highlight ? '' : 'text-gradient'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'text-white/70' : 'text-gray-500'}`}>{plan.period}</span>
                </div>
              </div>

              <div className="p-6 sm:p-7">
                <ul className="space-y-3 sm:space-y-3.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm sm:text-base text-gray-700 leading-relaxed">
                      <span className="text-green-500 mt-0.5 font-bold flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm sm:text-base text-gray-400 leading-relaxed">
                      <span className="text-gray-300 mt-0.5 flex-shrink-0">✕</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.highlight && (
                  <p className="text-xs sm:text-sm text-gray-400 mb-5 leading-relaxed">
                    {SUBSCRIPTION_DISCLOSURE.monthly.text}
                  </p>
                )}

                <Link
                  to={plan.route}
                  className={`btn-elite w-full text-center block ${
                    plan.highlight ? 'btn-elite-primary' : 'btn-elite-secondary'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-display font-bold text-gray-900 text-center mb-8 section-heading section-heading-center">
            Why Go Premium?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={b.title} className="game-card p-6 card-entrance" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-3xl block mb-3">{b.icon}</span>
                <h3 className="font-semibold text-gray-900 text-sm mb-2">{b.title}</h3>
                <p className="text-sm text-gray-600">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl font-display font-bold text-gray-900 text-center mb-8 section-heading section-heading-center">
            FAQ
          </h2>
          {[
            {
              q: 'Can I cancel anytime?',
              a: isIOS
                ? 'Yes! You can cancel your subscription at any time through your Apple ID account settings. Your premium access continues until the end of your current billing period.'
                : 'Yes! You can cancel your premium subscription at any time. Your premium access continues until the end of your billing period.',
            },
            {
              q: 'How does billing work?',
              a: isIOS
                ? 'Payment is charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.'
                : 'The free plan gives you full access to all educational and arcade games. Premium removes ads and adds exclusive features.',
            },
            {
              q: 'How does the school plan work?',
              a: 'The school plan includes up to 100 student accounts, a teacher dashboard, assignment creation, grade reports, and LMS integration. Contact us for custom pricing for larger schools.',
            },
            {
              q: 'Can I restore a previous purchase?',
              a: isIOS
                ? 'Yes! Go to the Store page and tap "Restore" to restore previous purchases associated with your Apple ID.'
                : 'Yes! Contact support and we can help restore your premium access.',
            },
          ].map((faq, i) => (
            <div key={i} className="game-card p-5 mb-3 card-entrance" style={{ animationDelay: `${i * 0.05}s` }}>
              <h3 className="font-semibold text-gray-900 text-sm mb-2">{faq.q}</h3>
              <p className="text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Legal Footer — Required by Apple */}
        <div className="text-center space-y-3">
          <div className="flex justify-center gap-4 text-sm">
            <Link to="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-violet-600 hover:underline">Terms of Service</Link>
          </div>
          {isIOS && (
            <p className="text-xs text-gray-400 max-w-xl mx-auto">
              Subscriptions are billed through your Apple ID. Manage or cancel subscriptions in your device Settings &gt; Apple ID &gt; Subscriptions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
