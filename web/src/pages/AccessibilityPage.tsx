import { Link } from 'react-router-dom';

export function AccessibilityPage() {
  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <Link to="/" className="text-gray-400 text-sm hover:text-[#3b82f6] transition-colors mb-6 inline-flex items-center gap-1 group">
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Back to Home
      </Link>

      <h1 className="text-3xl font-black text-gray-800 mb-2 animate-slide-up">Accessibility Statement</h1>
      <p className="text-gray-400 text-sm mb-8 animate-slide-up delay-100">Last updated: February 13, 2026</p>

      <div className="space-y-8 text-gray-600 text-sm leading-relaxed animate-slide-up delay-200">
        <Section title="Our Commitment">
          <p>
            SkillzStorm is committed to ensuring digital accessibility for people with disabilities. 
            We are continually improving the user experience for everyone and applying the relevant 
            accessibility standards.
          </p>
        </Section>

        <Section title="Standards">
          <p>
            We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. 
            These guidelines explain how to make web content more accessible for people with disabilities 
            and more user-friendly for everyone.
          </p>
        </Section>

        <Section title="Measures Taken">
          <ul className="list-disc list-inside space-y-1.5">
            <li>High contrast color scheme (dark theme with bright, distinguishable colors)</li>
            <li>Scalable text and responsive layouts for all screen sizes</li>
            <li>Keyboard navigable interface</li>
            <li>Semantic HTML structure</li>
            <li>Alt text and ARIA labels where applicable</li>
            <li>Focus indicators on interactive elements</li>
            <li>No flashing content that could trigger seizures</li>
            <li>Touch-friendly tap targets for mobile devices</li>
            <li>Games designed with colorblind-friendly palettes where possible</li>
          </ul>
        </Section>

        <Section title="Known Limitations">
          <p>Some of our games rely on visual and timing-based mechanics that may present challenges for users with certain disabilities. We are working to add:</p>
          <ul className="list-disc list-inside mt-2 space-y-1.5">
            <li>Extended time options for timed challenges</li>
            <li>Audio descriptions for visual content</li>
            <li>Alternative input methods for motor-impaired users</li>
            <li>Screen reader improvements for game interfaces</li>
          </ul>
        </Section>

        <Section title="Feedback">
          <p>
            We welcome your feedback on the accessibility of SkillzStorm. If you encounter any barriers 
            or have suggestions for improvement, please contact us:
          </p>
          <p className="mt-3">
            <strong className="text-gray-800">Email:</strong>{' '}
            <a href="mailto:accessibility@skillzstorm.com" className="text-[#3b82f6] hover:underline">accessibility@skillzstorm.com</a>
          </p>
          <p className="mt-2 text-gray-400">We aim to respond to accessibility feedback within 2 business days.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </section>
  );
}
