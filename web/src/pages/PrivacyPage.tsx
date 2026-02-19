import { Link } from 'react-router-dom';

export function PrivacyPage() {
  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <Link to="/" className="text-gray-400 text-sm hover:text-[#3b82f6] transition-colors duration-300 mb-6 inline-flex items-center gap-1 group">
        <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Back to Home
      </Link>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        <span className="text-[#10b981] text-[11px] font-black tracking-wider">COPPA COMPLIANT</span>
      </div>

      <h1 className="text-3xl font-black text-gray-800 mb-2 animate-slide-up">Privacy Policy</h1>
      <p className="text-gray-400 text-sm mb-8 animate-slide-up delay-100">Last updated: February 13, 2026</p>

      <div className="space-y-8 text-gray-600 text-sm leading-relaxed animate-slide-up delay-200">
        <Section title="Overview">
          <p>
            SkillzStorm ("we," "our," or "us") is an educational gaming platform for students in grades K-12.
            We are committed to protecting the privacy of all users, especially children. This Privacy Policy
            explains how we collect, use, and protect information when you use our website (skillzstorm.com)
            and mobile applications.
          </p>
        </Section>

        <Section title="COPPA Compliance (Children Under 13)">
          <p>
            SkillzStorm complies with the Children's Online Privacy Protection Act (COPPA). We do NOT:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Require account creation or login</li>
            <li>Collect personal information from children under 13</li>
            <li>Collect names, email addresses, phone numbers, or physical addresses from users</li>
            <li>Use behavioral tracking or targeted advertising for children</li>
            <li>Share any user data with third parties</li>
          </ul>
          <p className="mt-3">
            Our platform is designed to be used without any personal data collection. No login is required.
            All game progress is stored locally on the user's device.
          </p>
        </Section>

        <Section title="Information We Do NOT Collect">
          <ul className="list-disc list-inside space-y-1">
            <li>Names or usernames</li>
            <li>Email addresses</li>
            <li>Phone numbers</li>
            <li>Physical addresses</li>
            <li>Photos or videos</li>
            <li>Location data</li>
            <li>Social media accounts</li>
            <li>Any personally identifiable information</li>
          </ul>
        </Section>

        <Section title="Information Stored Locally">
          <p>The following data is stored only on the user's device (never sent to our servers):</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Selected grade level</li>
            <li>Game scores and high scores</li>
            <li>Coins and XP earned</li>
            <li>Power-up inventory</li>
            <li>Ad-free purchase status</li>
            <li>Daily challenge completion</li>
          </ul>
          <p className="mt-3">
            This data never leaves the device and cannot be accessed by us or any third party.
            Users can reset all local data at any time through the Settings screen.
          </p>
        </Section>

        <Section title="Advertising">
          <p>
            SkillzStorm displays ads through Google AdMob (mobile app) and Google AdSense (website).
            All ad content is configured as <strong className="text-gray-800">child-directed</strong> in compliance with COPPA:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>No personalized or behaviorally-targeted ads are shown</li>
            <li>No interest-based advertising</li>
            <li>No remarketing or retargeting</li>
            <li>Ads are contextual only (based on app content, not user behavior)</li>
            <li>Google's child-directed treatment tag is enabled</li>
          </ul>
          <p className="mt-3">
            Users can remove all ads permanently by purchasing the "Ad-Free" option ($2.99).
          </p>
        </Section>

        <Section title="In-App Purchases">
          <p>
            Our app offers optional in-app purchases (coins, ad-free, premium bundle, season pass).
            On iOS, purchases go through Apple's App Store which requires the device owner's
            password/Face ID. On the web, purchases go through Stripe.
          </p>
          <p className="mt-2">
            We recommend parents enable "Ask to Buy" or purchase restrictions on their child's device
            to manage in-app purchase access.
          </p>
        </Section>

        <Section title="Physical Product Orders">
          <p>
            When ordering physical products (VR headsets, 3D glasses, accessories) from our website,
            we collect shipping information (name, address, email) through our payment processor Stripe.
            This information is:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Used solely to fulfill the order</li>
            <li>Processed and stored by Stripe (not by us)</li>
            <li>Subject to <a href="https://stripe.com/privacy" className="text-[#3b82f6] underline" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a></li>
            <li>Never used for marketing or shared with third parties</li>
          </ul>
          <p className="mt-2">
            Parents/guardians should complete physical product purchases on behalf of children.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-gray-800">Google AdMob/AdSense</strong> — Advertising (child-directed mode enabled)</li>
            <li><strong className="text-gray-800">Apple StoreKit</strong> — In-app purchases on iOS</li>
            <li><strong className="text-gray-800">Stripe</strong> — Payment processing for website purchases</li>
          </ul>
          <p className="mt-2">
            These services have their own privacy policies. We have configured all services
            to comply with COPPA requirements.
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            Since we do not collect personal data, there is nothing to retain or delete.
            Local device data can be cleared by the user at any time via the "Reset All Progress"
            option in Settings, or by uninstalling the app.
          </p>
        </Section>

        <Section title="Parental Rights">
          <p>
            Under COPPA, parents have the right to:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Review any personal information collected from their child (we collect none)</li>
            <li>Request deletion of their child's data (all data is local and can be reset)</li>
            <li>Refuse further collection of their child's data</li>
          </ul>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated "Last updated" date. Continued use of SkillzStorm after changes constitutes
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions about this Privacy Policy or our practices, please contact us at:
          </p>
          <p className="mt-2 text-gray-800 font-bold">privacy@skillzstorm.com</p>
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
