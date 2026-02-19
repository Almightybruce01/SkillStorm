import TopBannerAd from '../components/ads/TopBannerAd';
import InArticleAd from '../components/ads/InArticleAd';

export default function AboutPage() {
  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-display font-bold text-gray-900 mb-4">
            About <span className="text-gradient">SkillzStorm</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Making education engaging through the power of gaming.
          </p>
        </div>

        <div className="space-y-12">
          <section className="game-card p-8">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed text-lg">
              At SkillzStorm, we believe learning should be as exciting as playing your favorite game. Our platform combines rigorous educational content with engaging game mechanics to help students master subjects from mathematics to coding. Every game is designed by educators and built by gamers.
            </p>
          </section>

          <InArticleAd />

          <section>
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">What Makes Us Different</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: '🎯', title: 'Curriculum-Aligned', desc: 'Every game maps to real educational standards from K-12, ensuring meaningful learning outcomes.' },
                { icon: '🎮', title: 'Real Game Engines', desc: 'Not just quizzes with graphics — our games use real-time physics, AI enemies, and engaging mechanics.' },
                { icon: '📊', title: 'Progress Tracking', desc: 'Detailed analytics for students, parents, and teachers to monitor learning progress.' },
                { icon: '🌐', title: 'Free & Accessible', desc: 'Core platform is free forever. No downloads needed — play instantly in any browser.' },
              ].map((f, i) => (
                <div key={i} className="game-card p-6 card-entrance" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="game-card p-8 text-center">
            <h2 className="text-2xl font-display font-bold text-gray-900 mb-4">By the Numbers</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: '55+', label: 'Educational Games' },
                { value: '26+', label: 'Arcade Games' },
                { value: '8', label: 'Subject Areas' },
                { value: 'K-12', label: 'Grade Range' },
              ].map((s, i) => (
                <div key={i}>
                  <p className="text-3xl font-display font-bold text-gradient">{s.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
