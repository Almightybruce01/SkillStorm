import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <Link to="/" className="text-gray-400 text-sm hover:text-[#3b82f6] transition-colors duration-300 mb-6 inline-flex items-center gap-1 group">
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Back to Home
      </Link>

      <h1 className="text-3xl font-black text-gray-800 mb-2 animate-slide-up">Terms of Service</h1>
      <p className="text-gray-400 text-sm mb-8 animate-slide-up delay-100">Last updated: February 13, 2026</p>

      <div className="space-y-8 text-gray-600 text-sm leading-relaxed animate-slide-up delay-200">
        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using SkillzStorm (the "Service"), including our website at skillzstorm.com
            and our mobile applications, you agree to be bound by these Terms of Service. If you are under 18,
            your parent or guardian must agree to these terms on your behalf.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            SkillzStorm is a free educational gaming platform for students in grades K-12. The Service includes:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>50+ educational arcade games accessible without an account</li>
            <li>Optional in-app purchases (coins, ad removal, premium features)</li>
            <li>Optional physical product purchases (VR headsets, 3D glasses, accessories)</li>
            <li>Ad-supported free play</li>
          </ul>
        </Section>

        <Section title="3. No Account Required">
          <p>
            SkillzStorm does not require account creation or login to use the Service. All game
            progress is stored locally on the user's device. We do not collect personal information.
          </p>
        </Section>

        <Section title="4. Age Requirements">
          <p>
            SkillzStorm is designed for users of all ages (K-12 and above). For users under 13:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>We comply with COPPA (Children's Online Privacy Protection Act)</li>
            <li>No personal data is collected</li>
            <li>All ads are child-directed (no behavioral targeting)</li>
            <li>In-app purchases require device owner authentication (password/Face ID)</li>
            <li>Parents should supervise physical product purchases</li>
          </ul>
        </Section>

        <Section title="5. Purchases & Payments">
          <p><strong className="text-gray-800">In-App Purchases (iOS):</strong> Processed through Apple's App Store.
            Subject to Apple's terms and refund policies. Apple's parental controls and "Ask to Buy"
            features apply.</p>
          <p className="mt-2"><strong className="text-gray-800">Website Purchases (Stripe):</strong> Physical products
            and web premium features are processed through Stripe. Subject to Stripe's terms.
            Shipping for physical items is 2-3 business days with a 30-day return policy.</p>
          <p className="mt-2"><strong className="text-gray-800">Refunds:</strong> Digital purchases are non-refundable
            except as required by applicable law or platform policies. Physical products may be returned
            within 30 days in original condition.</p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            All content on SkillzStorm, including games, graphics, text, and software, is the property
            of SkillzStorm or its licensors and is protected by copyright and intellectual property laws.
            You may not copy, modify, distribute, or reverse engineer any part of the Service.
          </p>
        </Section>

        <Section title="7. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to bypass any security or access restrictions</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use automated tools to access the Service</li>
            <li>Attempt to reverse engineer the games or software</li>
          </ul>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind,
            express or implied. We do not guarantee that the Service will be uninterrupted,
            error-free, or free of harmful components.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, SkillzStorm shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from
            your use of the Service.
          </p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>
            We reserve the right to modify these Terms at any time. Changes will be posted on
            this page. Continued use of the Service after changes constitutes acceptance of the
            updated Terms.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For questions about these Terms, contact us at:
          </p>
          <p className="mt-2 text-gray-800 font-bold">legal@skillzstorm.com</p>
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
