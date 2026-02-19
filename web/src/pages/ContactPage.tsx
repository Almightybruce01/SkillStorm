import { useState } from 'react';

export function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend/email service (Formspree, EmailJS, etc.)
    setSubmitted(true);
  };

  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <section className="text-center py-14 animate-slide-up">
        <h1 className="text-5xl font-black mb-4">
          <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">Get in Touch</span>
        </h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Questions, feedback, partnership inquiries, or just want to say hello? We'd love to hear from you.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Info Cards */}
        <div className="space-y-4 animate-slide-up delay-100">
          <ContactCard icon="📧" title="Email" value="support@skillzstorm.com" href="mailto:support@skillzstorm.com" color="#3b82f6" />
          <ContactCard icon="🏫" title="Schools & Districts" value="schools@skillzstorm.com" href="mailto:schools@skillzstorm.com" color="#8b5cf6" />
          <ContactCard icon="💼" title="Partnerships" value="partners@skillzstorm.com" href="mailto:partners@skillzstorm.com" color="#f97316" />
          <ContactCard icon="📰" title="Press & Media" value="press@skillzstorm.com" href="mailto:press@skillzstorm.com" color="#10b981" />
          <ContactCard icon="🐛" title="Report a Bug" value="bugs@skillzstorm.com" href="mailto:bugs@skillzstorm.com" color="#ef4444" />

          {/* Social */}
          <div className="game-card p-5">
            <h3 className="text-xs font-black text-gray-600 tracking-widest mb-3">FOLLOW US</h3>
            <div className="flex gap-2">
              {[
                { name: 'Twitter / X', icon: '𝕏', href: 'https://twitter.com/skillzstorm' },
                { name: 'Instagram', icon: '📸', href: 'https://instagram.com/skillzstorm' },
                { name: 'TikTok', icon: '🎵', href: 'https://tiktok.com/@skillzstorm' },
                { name: 'YouTube', icon: '▶', href: 'https://youtube.com/@skillzstorm' },
              ].map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" title={s.name}
                  className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-[#3b82f6]/15 hover:border-[#3b82f6]/30 transition-all duration-300 text-gray-400 hover:text-[#3b82f6]">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2 animate-slide-up delay-200">
          {submitted ? (
            <div className="game-card game-card-green p-10 text-center">
              <div className="text-6xl mb-4 animate-bounce-in">✅</div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Message Sent!</h2>
              <p className="text-gray-500">Thank you for reaching out. We'll get back to you within 24-48 hours.</p>
              <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-all text-sm font-bold">
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="game-card p-8">
              <h2 className="text-lg font-black text-gray-800 mb-6">Send us a Message</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 block">NAME</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-[#3b82f6]/40 focus:shadow-[0_0_15px_rgba(0,153,255,0.1)] transition-all duration-300 placeholder-white/20"
                    placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 block">EMAIL</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-[#3b82f6]/40 focus:shadow-[0_0_15px_rgba(0,153,255,0.1)] transition-all duration-300 placeholder-white/20"
                    placeholder="you@email.com" />
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 block">SUBJECT</label>
                <select value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-[#3b82f6]/40 transition-all duration-300 appearance-none cursor-pointer">
                  <option value="general" className="bg-[#f8fafc]">General Inquiry</option>
                  <option value="school" className="bg-[#f8fafc]">School / District Partnership</option>
                  <option value="bug" className="bg-[#f8fafc]">Bug Report</option>
                  <option value="feature" className="bg-[#f8fafc]">Feature Request</option>
                  <option value="press" className="bg-[#f8fafc]">Press / Media</option>
                  <option value="business" className="bg-[#f8fafc]">Business Partnership</option>
                  <option value="other" className="bg-[#f8fafc]">Other</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 block">MESSAGE</label>
                <textarea required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-[#3b82f6]/40 focus:shadow-[0_0_15px_rgba(0,153,255,0.1)] transition-all duration-300 placeholder-white/20 resize-none"
                  placeholder="How can we help?" />
              </div>
              <button type="submit" className="w-full gradient-hero py-3.5 rounded-xl font-bold text-gray-800 hover:opacity-90 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] btn-shimmer overflow-hidden">
                <span className="relative z-10">Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* FAQ Quick Links */}
      <section className="mt-14 animate-slide-up">
        <h2 className="text-sm font-black text-gray-400 tracking-widest text-center mb-6">QUICK ANSWERS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QuickFAQ q="Is SkillzStorm really free?" a="Yes! All 50+ games are free to play. Optional premium features and physical products are available for purchase." />
          <QuickFAQ q="Is it safe for my child?" a="Absolutely. We're COPPA compliant, collect zero personal data, require no login, and serve only child-safe ads." />
          <QuickFAQ q="Can my school use this?" a="Yes! SkillzStorm works on any device with a browser. No IT setup needed. Visit our For Schools page for more info." />
          <QuickFAQ q="How do I remove ads?" a="Purchase the ad-free option for $2.99 (one-time) in the app or on our website." />
        </div>
      </section>
    </div>
  );
}

function ContactCard({ icon, title, value, href, color }: { icon: string; title: string; value: string; href: string; color: string }) {
  return (
    <a href={href} className="game-card p-4 flex items-center gap-3 group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}30`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
    >
      <span className="text-xl transition-transform duration-300 group-hover:scale-125">{icon}</span>
      <div>
        <div className="text-xs text-gray-400 font-bold">{title}</div>
        <div className="text-sm font-bold transition-colors duration-300" style={{ color }}>{value}</div>
      </div>
    </a>
  );
}

function QuickFAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="game-card p-4 group cursor-pointer">
      <summary className="font-bold text-gray-800 text-sm list-none flex items-center justify-between group-hover:text-[#3b82f6] transition-colors">
        {q}
        <span className="text-gray-300 group-open:rotate-180 transition-transform duration-300 ml-2">▾</span>
      </summary>
      <p className="text-gray-500 text-xs mt-2 leading-relaxed">{a}</p>
    </details>
  );
}
