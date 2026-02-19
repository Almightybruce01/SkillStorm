import TopBannerAd from '../components/ads/TopBannerAd';

export default function AccessibilityPage() {
  return (
    <div className="page-enter">
      <TopBannerAd />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="section-heading">Accessibility</h1>
        <p className="text-gray-500 mt-4 mb-10">Our commitment to making education accessible to everyone.</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section className="game-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Our Commitment</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm is committed to ensuring digital accessibility for people of all abilities. We are continually improving the user experience for everyone and applying relevant accessibility standards. We aim to conform to WCAG 2.1 Level AA guidelines.
            </p>
          </section>

          <section className="game-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Accessibility Features</h2>
            <ul className="space-y-2 text-gray-600">
              {[
                'Keyboard navigation support for all interactive elements',
                'Screen reader compatible content and ARIA labels',
                'High contrast mode support',
                'Scalable text (works with browser zoom up to 200%)',
                'Captions and text alternatives for media content',
                'Consistent navigation structure across all pages',
                'Focus indicators for all interactive elements',
                'No content relies solely on color to convey information',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="game-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Game Accessibility</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We recognize that some game mechanics may be challenging for users with certain disabilities. We are working on:
            </p>
            <ul className="space-y-2 text-gray-600">
              {[
                'Adjustable game speed settings',
                'Alternative input methods beyond mouse clicking',
                'Visual cues alongside audio feedback',
                'Pause functionality in all timed games',
                'Clear, high-contrast game elements',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="game-card p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Feedback</h2>
            <p className="text-gray-600 leading-relaxed">
              We welcome your feedback on the accessibility of SkillzStorm. If you encounter any barriers or have suggestions for improvement, please contact us at{' '}
              <a href="mailto:accessibility@skillzstorm.com" className="text-violet-600 hover:underline">
                accessibility@skillzstorm.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
