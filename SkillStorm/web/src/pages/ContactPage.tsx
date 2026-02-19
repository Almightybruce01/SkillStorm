/* ═══════════════════════════════════════════════════════════
   CONTACT PAGE — Apple Guideline 1.5 Compliant
   
   Guideline 1.5 (Developer Information):
   "People need to know how to reach you with questions
    and support issues. Make sure your app and its Support
    URL include an easy way to contact you."
   
   Contact form submits via mailto: link (works on all devices).
   All email addresses must be real and monitored.
   ═══════════════════════════════════════════════════════════ */
import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;

    const mailtoSubject = encodeURIComponent(`[SkillzStorm] ${form.subject}: ${form.name}`);
    const mailtoBody = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nSubject: ${form.subject}\n\n${form.message}`
    );
    window.location.href = `mailto:hello@skillzstorm.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-20 text-center">
        <div className="game-card p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📧</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">Message Prepared</h1>
          <p className="text-gray-600 mb-2">Your email app should have opened with your message.</p>
          <p className="text-sm text-gray-500 mb-6">
            If it didn't open, you can email us directly at{' '}
            <a href="mailto:hello@skillzstorm.com" className="text-violet-600 underline">hello@skillzstorm.com</a>
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="btn-elite btn-elite-secondary text-sm"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600">Have questions? We'd love to hear from you.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact Form */}
          <div className="game-card p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option>General Inquiry</option>
                  <option>School Licensing</option>
                  <option>Bug Report</option>
                  <option>Feature Request</option>
                  <option>Partnership</option>
                  <option>Privacy / Data Request</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Your message..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                />
              </div>
              <button type="submit" className="btn-elite btn-elite-primary w-full min-h-[44px]">
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {[
              { icon: '📧', title: 'General Support', content: 'hello@skillzstorm.com', href: 'mailto:hello@skillzstorm.com', sub: 'Typically respond within 24 hours' },
              { icon: '🏫', title: 'School Sales', content: 'schools@skillzstorm.com', href: 'mailto:schools@skillzstorm.com', sub: 'Dedicated support for educators' },
              { icon: '🐛', title: 'Bug Reports', content: 'bugs@skillzstorm.com', href: 'mailto:bugs@skillzstorm.com', sub: 'Help us improve by reporting issues' },
              { icon: '🔒', title: 'Privacy & Data', content: 'privacy@skillzstorm.com', href: 'mailto:privacy@skillzstorm.com', sub: 'Data requests & privacy inquiries' },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                className="game-card p-6 flex items-start gap-4 card-entrance block hover:border-violet-300 transition-colors"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="text-3xl">{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-violet-600 text-sm underline">{item.content}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                </div>
              </a>
            ))}

            {/* App Store Support URL notice */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                For App Store-related issues, you can also use Apple's{' '}
                <a href="https://reportaproblem.apple.com" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">
                  Report a Problem
                </a>{' '}
                page. For privacy-related requests, visit our{' '}
                <a href="/settings" className="text-violet-600 underline">Data & Privacy Settings</a> page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
