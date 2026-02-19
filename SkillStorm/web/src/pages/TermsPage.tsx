/* ═══════════════════════════════════════════════════════════
   TERMS OF SERVICE — Apple App Store Compliant
   
   Apple Guidelines Addressed:
   - 3.1.2(a) Auto-renewable subscription terms
   - 3.1.2(c) Subscription information disclosure
   - 5.1.1    Privacy and data usage terms
   
   No ads on this legal page.
   ═══════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="page-enter">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="section-heading text-3xl font-display font-bold">Terms of Service</h1>
        <p className="text-gray-500 mt-4 mb-10">Last updated: February 15, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using SkillzStorm ("the App"), you agree to be bound by these Terms of Service 
              ("Terms"). If you do not agree, do not use the App. For users under 18, a parent or legal 
              guardian must agree to these Terms on their behalf. For users under 13, parental/guardian 
              consent is required in compliance with COPPA.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm provides educational and arcade gaming content accessible via iOS app and web 
              browsers. Games cover various academic subjects for grades K-12. The service includes both 
              free (ad-supported) and premium (paid, ad-free) tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Age Requirements</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm is designed for users of all ages. Users must declare their age bracket upon first 
              use. Users under 13 require parental/guardian consent. We apply age-appropriate content and 
              privacy protections based on the declared age.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscriptions and In-App Purchases</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              SkillzStorm offers the following paid options:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5 mb-4">
              <li><strong>Premium Monthly</strong> — $4.99/month auto-renewable subscription</li>
              <li><strong>Premium Yearly</strong> — $39.99/year auto-renewable subscription</li>
              <li><strong>Coin Packs</strong> — one-time consumable purchases</li>
              <li><strong>Cosmetic Items</strong> — one-time non-consumable purchases</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-800 mb-2">4.1 Auto-Renewable Subscriptions</h3>
            <p className="text-gray-600 leading-relaxed mb-3">
              Premium subscriptions provide ongoing access to ad-free gameplay, exclusive games, detailed 
              analytics, 2x XP multiplier, custom themes, and early access to new content.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>Important Subscription Information (Apple App Store):</strong>
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1.5 mt-2">
                <li>Payment will be charged to your Apple ID account at confirmation of purchase.</li>
                <li>Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period.</li>
                <li>Your account will be charged for renewal within 24 hours prior to the end of the current period at the rate of the selected plan.</li>
                <li>You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.</li>
                <li>Any unused portion of a free trial period, if offered, will be forfeited when you purchase a subscription.</li>
              </ul>
            </div>

            <h3 className="text-lg font-medium text-gray-800 mb-2">4.2 Consumable Purchases</h3>
            <p className="text-gray-600 leading-relaxed">
              Coin packs and power-up packs are consumable purchases. Credits or in-game currencies purchased 
              via in-app purchase do not expire. Consumed items cannot be restored.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">4.3 Restoring Purchases</h3>
            <p className="text-gray-600 leading-relaxed">
              Non-consumable purchases and active subscriptions can be restored through the Store page. 
              Tap "Restore Purchases" to recover previous purchases associated with your Apple ID.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-2">4.4 Refunds</h3>
            <p className="text-gray-600 leading-relaxed">
              For purchases made through the Apple App Store, refund requests must be submitted through 
              Apple. Visit <a href="https://reportaproblem.apple.com" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">reportaproblem.apple.com</a> to request a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. User Conduct</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree not to misuse the App, including but not limited to: attempting to hack or exploit 
              game engines, using automated tools to play games, circumventing advertisements, reverse 
              engineering the application, or using the App for any unlawful purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed">
              All games, content, graphics, sound, and code in SkillzStorm are owned by SkillzStorm or 
              its licensors and protected by copyright and other intellectual property laws. You may not 
              reproduce, distribute, or create derivative works without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Your use of the App is also governed by our{' '}
              <Link to="/privacy" className="text-violet-600 underline">Privacy Policy</Link>, which is 
              incorporated into these Terms by reference. You acknowledge that you have read and understood 
              our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data and Privacy Controls</h2>
            <p className="text-gray-600 leading-relaxed">
              You can manage your data, consent preferences, and exercise your privacy rights through the{' '}
              <Link to="/settings" className="text-violet-600 underline">Data & Privacy Settings</Link> page. 
              This includes the ability to view stored data, toggle consent for analytics and ads, withdraw 
              consent, and permanently delete all your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimers</h2>
            <p className="text-gray-600 leading-relaxed">
              SkillzStorm is provided "as is" and "as available" without warranties of any kind, either 
              express or implied. We do not guarantee that the App will be uninterrupted, error-free, or 
              free of harmful components. Educational content is provided for learning purposes and should 
              supplement, not replace, formal education.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by applicable law, SkillzStorm shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages, or any loss of profits or 
              revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or 
              other intangible losses resulting from your use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated 
              through the App. Your continued use of the App after changes constitutes acceptance of the 
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these Terms, contact us at{' '}
              <a href="mailto:legal@skillzstorm.com" className="text-violet-600 underline">legal@skillzstorm.com</a>{' '}
              or visit our <Link to="/contact" className="text-violet-600 underline">Contact page</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Apple-Specific Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              For users accessing SkillzStorm through the Apple App Store, the following additional terms apply:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1.5">
              <li>These Terms are between you and SkillzStorm, not Apple Inc.</li>
              <li>Apple has no obligation to provide maintenance or support for the App.</li>
              <li>In the event of a failure to conform to any applicable warranty, you may notify Apple for a refund of the purchase price (if applicable). Apple has no other warranty obligation.</li>
              <li>Apple is not responsible for addressing any claims relating to the App or your possession and use of the App.</li>
              <li>In the event of any third-party claim that the App infringes intellectual property rights, Apple is not responsible for the investigation, defense, settlement, or discharge of such claim.</li>
              <li>Apple and its subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance, Apple will have the right to enforce these Terms against you.</li>
              <li>You represent and warrant that you are not located in a country subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and you are not listed on any U.S. Government list of prohibited or restricted parties.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
