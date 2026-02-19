/* ═══════════════════════════════════════════════════════════
   PRIVACY POLICY — Apple App Store Compliant
   
   Apple Guideline 5.1.1(i):
   Must include a privacy policy that clearly and explicitly:
   - Identifies what data is collected and how
   - Confirms third parties provide equal protection
   - Explains data retention/deletion policies
   - Describes how users can revoke consent/request deletion
   
   No ads on this page (legal content should be clean).
   ═══════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="page-enter">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="section-heading text-3xl font-display font-bold">Privacy Policy</h1>
        <p className="text-gray-500 mt-4 mb-10">Last updated: February 15, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains 
              what information we collect, how we use it, and your rights regarding your data. This policy applies to 
              the SkillzStorm application available on the Apple App Store and our website at skillzstorm.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              SkillzStorm is designed to collect the minimum information necessary to provide our educational gaming services:
            </p>
            <h3 className="text-lg font-medium text-gray-800 mb-2">2.1 Data Stored Locally on Your Device</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5 mb-4">
              <li>Game scores, progress, and high scores</li>
              <li>Achievement progress and unlocked achievements</li>
              <li>Recently played games and favorites list</li>
              <li>Sound and display preferences</li>
              <li>Consent and age verification status</li>
              <li>In-app purchase status</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mb-3">
              <strong>This data is stored exclusively on your device using browser localStorage</strong> and is never 
              transmitted to our servers.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">2.2 Data Collected by Third-Party Services</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5">
              <li>
                <strong>Google AdSense</strong> (free tier only): May collect device identifiers, IP address, and browsing 
                data to serve advertisements. This data is subject to{' '}
                <a href="https://policies.google.com/privacy" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">
                  Google's Privacy Policy
                </a>. Personalized ads are only shown with your explicit consent.
              </li>
              <li>
                <strong>Google Fonts</strong>: Font files are loaded from Google's servers. Google may collect your IP address. 
                See{' '}
                <a href="https://developers.google.com/fonts/faq/privacy" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">
                  Google Fonts Privacy FAQ
                </a>.
              </li>
              <li>
                <strong>Apple (iOS App)</strong>: In-app purchases are processed by Apple. See{' '}
                <a href="https://www.apple.com/legal/privacy/" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">
                  Apple's Privacy Policy
                </a>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Information</h2>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5">
              <li>To save and restore your game progress</li>
              <li>To personalize your learning experience</li>
              <li>To display your achievements and statistics</li>
              <li>To serve advertisements to free-tier users (with consent)</li>
              <li>To process in-app purchases through Apple's payment system</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              We do not sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm does not directly set cookies. However, third-party advertising partners (Google AdSense) 
              may use cookies and similar technologies for ad serving and targeting. You can control cookie preferences 
              through your browser or device settings. You may also withdraw ad personalization consent at any time 
              through the <Link to="/settings" className="text-violet-600 underline">Data & Privacy Settings</Link> page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Children's Privacy (COPPA Compliance)</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              SkillzStorm takes children's privacy very seriously. We comply with the Children's Online Privacy 
              Protection Act (COPPA) and applicable international children's privacy laws:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5">
              <li>We verify age upon first use of the application</li>
              <li>For users under 13, we <strong>do not</strong> collect personal information</li>
              <li>For users under 13, we <strong>do not</strong> serve any third-party advertisements</li>
              <li>For users under 13, we <strong>do not</strong> enable any analytics or tracking</li>
              <li>All data for users under 13 remains exclusively on the device</li>
              <li>Parents/guardians must accept the privacy policy and terms on behalf of children under 13</li>
              <li>Schools using our platform must obtain necessary COPPA consent from parents/guardians</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention and Deletion</h2>
            <p className="text-gray-600 leading-relaxed">
              All user data is stored locally on your device and retained until you choose to delete it. 
              You can delete all your data at any time through the{' '}
              <Link to="/settings" className="text-violet-600 underline">Data & Privacy Settings</Link> page. 
              Deleting the app will also remove all locally stored data. We do not maintain server-side copies 
              of your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5">
              <li><strong>Access</strong> — View what data is stored via the Data & Privacy Settings page</li>
              <li><strong>Delete</strong> — Permanently delete all your data at any time</li>
              <li><strong>Withdraw Consent</strong> — Revoke data collection or ad personalization consent at any time</li>
              <li><strong>Port</strong> — Your data is stored locally on your device and is accessible to you</li>
              <li><strong>Opt Out of Ads</strong> — Disable personalized advertising via settings</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-3">
              For California residents (CCPA): You have additional rights including the right to know what personal 
              information is collected, the right to deletion, and the right to opt out of the sale of personal 
              information. We do not sell personal information.
            </p>
            <p className="text-gray-600 leading-relaxed mt-3">
              For EU residents (GDPR): You have additional rights including the right to rectification, the right 
              to restrict processing, and the right to lodge a complaint with a supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              All data is stored locally on your device using standard browser storage mechanisms. In-app 
              purchases are processed securely through Apple's payment infrastructure. We do not operate 
              servers that store personal user data. Communication with third-party services (ad networks, 
              font services) occurs over encrypted HTTPS connections.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              We confirm that all third-party services we integrate provide protection of user data equal 
              to or exceeding the standards described in this privacy policy. Each third-party service is 
              bound by their own privacy policies, which we have reviewed for compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. When we make material changes, we will 
              notify you through the app and request renewed consent. The "Last updated" date at the top 
              of this policy indicates when it was last revised.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              For privacy-related inquiries, data deletion requests, or to exercise your rights:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5 mt-2">
              <li>Email: <a href="mailto:privacy@skillzstorm.com" className="text-violet-600 underline">privacy@skillzstorm.com</a></li>
              <li>In-app: <Link to="/settings" className="text-violet-600 underline">Data & Privacy Settings</Link></li>
              <li>Web: <Link to="/contact" className="text-violet-600 underline">Contact Page</Link></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
