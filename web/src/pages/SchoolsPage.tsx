import { Link } from 'react-router-dom';

export function SchoolsPage() {
  return (
    <div className="pt-20 sm:pt-24 page-enter min-h-[100vh] w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Hero */}
      <section className="text-center py-14 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 mb-6">
          <span className="text-sm">🏫</span>
          <span className="text-[#8b5cf6] text-xs font-black tracking-wider">FOR EDUCATORS</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-black mb-4">
          <span className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">SkillzStorm</span>
          <br />
          <span className="text-gray-800 text-3xl sm:text-4xl">for Schools & Districts</span>
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
          Bring arcade-style learning into your classroom. 50+ educational games, K-12 grade scaling, 
          zero setup, and completely free. Used by teachers, tutors, and afterschool programs nationwide.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:schools@skillzstorm.com" className="gradient-hero px-8 py-3.5 rounded-xl font-bold text-gray-800 hover:opacity-90 transition-all duration-300 hover:scale-105 active:scale-95 btn-shimmer overflow-hidden">
            <span className="relative z-10">Contact for Schools</span>
          </a>
          <Link to="/games" className="bg-gray-50 border border-gray-200 px-8 py-3.5 rounded-xl font-bold text-gray-800 hover:bg-gray-100 transition-all duration-300 hover:scale-105 active:scale-95">
            Try Games Now — Free
          </Link>
        </div>
      </section>

      {/* Why Schools Love It */}
      <section className="mb-16 animate-slide-up delay-200">
        <h2 className="text-xl font-black text-gray-800 text-center mb-8">Why Schools Love SkillzStorm</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature icon="💰" title="100% Free" desc="No subscriptions, no per-student fees, no hidden costs. Every game is free." color="#10b981" />
          <Feature icon="🔐" title="No Login Required" desc="Students open the site and play instantly. No accounts, no passwords, no IT headaches." color="#3b82f6" />
          <Feature icon="🛡️" title="COPPA Compliant" desc="Zero data collection, child-safe ads, no tracking. Safe for students of all ages." color="#8b5cf6" />
          <Feature icon="📱" title="Works Everywhere" desc="Runs on Chromebooks, iPads, laptops, phones — any device with a web browser." color="#f97316" />
          <Feature icon="📏" title="Standards-Aligned" desc="Questions aligned with Common Core, NGSS, and state standards. Covers Math, ELA, Science, and more." color="#f59e0b" />
          <Feature icon="📊" title="Grade Scaling" desc="One game adapts from K to 12th grade automatically. No need to assign different tools by grade." color="#06b6d4" />
        </div>
      </section>

      {/* How to Use */}
      <section className="mb-16 animate-slide-up">
        <h2 className="text-xl font-black text-gray-800 text-center mb-8">How to Use in Your Classroom</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Step num="1" title="Open the Site" desc="Go to skillzstorm.com on any device. No downloads, installs, or accounts." color="#3b82f6" />
          <Step num="2" title="Select a Grade" desc="Choose the grade level. Questions and difficulty scale automatically." color="#8b5cf6" />
          <Step num="3" title="Students Play & Learn" desc="Students play arcade games with built-in Knowledge Gates that reinforce skills." color="#f97316" />
        </div>
      </section>

      {/* Use Cases */}
      <section className="mb-16 animate-slide-up">
        <h2 className="text-xl font-black text-gray-800 text-center mb-8">Perfect For</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: '📚', use: 'Classroom Centers' },
            { icon: '🏠', use: 'Homework Practice' },
            { icon: '🎊', use: 'Reward Time' },
            { icon: '🌙', use: 'Afterschool Programs' },
            { icon: '☀️', use: 'Summer Learning' },
            { icon: '🧑‍🏫', use: 'Tutoring Sessions' },
            { icon: '📖', use: 'Test Prep Review' },
            { icon: '🏥', use: 'Homebound Students' },
            { icon: '🌍', use: 'Remote Learning' },
          ].map(u => (
            <div key={u.use} className="game-card p-4 flex items-center gap-3 group cursor-default">
              <span className="text-xl transition-transform duration-300 group-hover:scale-125">{u.icon}</span>
              <span className="text-sm font-semibold text-gray-600 group-hover:text-white/90 transition-colors">{u.use}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="mb-16 animate-slide-up">
        <h2 className="text-xl font-black text-gray-800 text-center mb-8">Subjects & Skills Covered</h2>
        <div className="game-card p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-6 text-sm">
            {[
              'Addition & Subtraction', 'Multiplication & Division', 'Fractions & Decimals', 'Algebra & Equations',
              'Geometry & Shapes', 'Statistics & Probability', 'Vocabulary & Definitions', 'Grammar & Punctuation',
              'Spelling & Phonics', 'Reading Comprehension', 'Sentence Structure', 'Creative Writing',
              'Science & Biology', 'Chemistry Basics', 'Physics Concepts', 'Earth Science',
              'U.S. History', 'World History', 'Financial Literacy', 'SAT/ACT Prep',
              'Logic & Reasoning', 'Critical Thinking', 'Pattern Recognition', 'Problem Solving',
            ].map(subj => (
              <div key={subj} className="flex items-center gap-2 text-gray-500">
                <span className="text-[#10b981] text-xs">✓</span>
                {subj}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="mb-16 animate-slide-up">
        <h2 className="text-xl font-black text-gray-800 text-center mb-8">What Educators Say</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Testimonial quote="My students beg to play SkillzStorm during centers. They don't even realize they're doing math." author="3rd Grade Teacher" location="Chicago, IL" />
          <Testimonial quote="Finally, a platform I can trust with my students. No logins, no data collection, and it actually works on our old Chromebooks." author="IT Director" location="School District 98" />
          <Testimonial quote="I use SkillzStorm as a reward, but honestly, my students are learning more during reward time than regular instruction." author="5th Grade Teacher" location="Cicero, IL" />
          <Testimonial quote="The grade scaling is brilliant. I have a mixed-grade tutoring group and everyone plays the same game at their level." author="Private Tutor" location="Remote" />
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-12 animate-slide-up">
        <div className="game-card p-10 max-w-2xl mx-auto btn-shimmer overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(0,153,255,0.08), rgba(153,51,255,0.06))' }}>
          <h2 className="text-3xl font-black text-gray-800 mb-3">Ready to Get Started?</h2>
          <p className="text-white/45 mb-6 max-w-lg mx-auto">
            SkillzStorm is free for every student, in every classroom, right now. 
            Just open <strong className="text-gray-800">skillzstorm.com</strong> and play.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            For district-wide rollouts, custom features, or partnership inquiries:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:schools@skillzstorm.com" className="gradient-hero px-8 py-3.5 rounded-xl font-bold text-gray-800 transition-all duration-300 hover:scale-105 active:scale-95">
              Email schools@skillzstorm.com
            </a>
            <Link to="/games" className="bg-gray-100 border border-gray-200 px-8 py-3.5 rounded-xl font-bold text-gray-800 hover:bg-white/15 transition-all duration-300 hover:scale-105 active:scale-95">
              🎮 Try It Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc, color }: { icon: string; title: string; desc: string; color: string }) {
  return (
    <div className="game-card p-6 group cursor-default transition-all duration-300 hover:scale-[1.02]"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${color}30`; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
    >
      <span className="text-2xl inline-block mb-3 transition-transform duration-300 group-hover:scale-125">{icon}</span>
      <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) {
  return (
    <div className="game-card p-7 text-center group cursor-default">
      <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-black text-gray-800 transition-transform duration-300 group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
        {num}
      </div>
      <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Testimonial({ quote, author, location }: { quote: string; author: string; location: string }) {
  return (
    <div className="game-card p-6 group cursor-default hover:border-gray-200 transition-all duration-300">
      <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">"{quote}"</p>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-xs font-black text-gray-800">
          {author[0]}
        </div>
        <div>
          <div className="text-gray-800 text-xs font-bold">{author}</div>
          <div className="text-gray-400 text-[11px]">{location}</div>
        </div>
      </div>
    </div>
  );
}
