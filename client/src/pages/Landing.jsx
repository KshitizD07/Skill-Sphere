import { useNavigate } from 'react-router-dom';
import FeatureSphere from '../shared/components/FeatureSphere';
import { Brain, Users, ArrowRight, Shield, Zap } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goAuth = (mode) => navigate('/auth', { state: { mode } });

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope']">

      {/* ── Nav ── */}
      <header className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(67,70,85,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(67,70,85,0.12)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" />
        {/* Top accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[#adc6ff]/40 to-transparent" />

        <nav className="flex justify-between items-center px-6 md:px-12 py-5 z-50 border-b border-[#434655]/30 backdrop-blur-md bg-[#0b1326]/80">
          <div className="font-['Manrope'] font-extrabold text-2xl tracking-tight text-[#dae2fd]">
            Skill<span className="text-[#adc6ff]">Sphere</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => goAuth('login')}
              className="px-4 py-2 text-sm font-['Space_Grotesk'] font-medium text-[#c3c6d7] hover:text-[#dae2fd] transition-colors tracking-wide"
            >
              Sign In
            </button>
            <button
              onClick={() => goAuth('register')}
              className="px-5 py-2 rounded-sm text-sm font-['Space_Grotesk'] font-bold tracking-widest uppercase bg-[#adc6ff] text-[#002e6a] hover:bg-[#89f5e7] hover:text-[#003732] transition-all duration-200 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 relative z-10 gap-12">
          <div className="md:w-1/2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#434655]/40 bg-[#adc6ff]/5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#89f5e7] animate-pulse" />
              <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Platform Online</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-6 text-[#dae2fd]">
              Build your<br />
              <span className="text-[#adc6ff]">verified</span><br />
              skill profile.
            </h1>
            <p className="text-lg text-[#c3c6d7] mb-8 max-w-md mx-auto md:mx-0 leading-relaxed font-normal border-l-2 border-[#adc6ff]/30 pl-4">
              Prove what you know. Identify your gaps. Find the right team — all backed by real data from your GitHub repositories.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <button
                onClick={() => goAuth('register')}
                className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-sm bg-[#adc6ff] text-[#002e6a] font-['Space_Grotesk'] font-bold text-sm tracking-[0.08em] uppercase hover:bg-[#89f5e7] hover:text-[#003732] transition-all duration-200 active:scale-95"
              >
                Get Started <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo('analysis')}
                className="px-7 py-3.5 rounded-sm border border-[#434655]/50 text-[#c3c6d7] font-['Space_Grotesk'] font-medium text-sm tracking-wide hover:border-[#adc6ff]/50 hover:text-[#dae2fd] transition-all duration-200"
              >
                Explore Features
              </button>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center items-center relative">
            <FeatureSphere scrollToSection={scrollTo} />
          </div>
        </div>
      </header>

      {/* ── AI Analysis ── */}
      <section id="analysis" className="py-24 border-t border-[#434655]/20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-[#171f33] p-10 rounded-md border border-[#434655]/20 relative overflow-hidden group hover:border-[#6bd8cb]/20 transition-colors duration-300">
            <div className="absolute top-4 right-4 opacity-[0.06]"><Brain size={100} /></div>
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">AI Intelligence</span>
            </div>
            <h3 className="text-2xl font-bold mb-5 tracking-tight text-[#dae2fd]">Skill Gap Analysis</h3>
            <ul className="space-y-4 text-[#c3c6d7]">
              {[
                'Run a diagnostic on your current skill set.',
                'Identify critical gaps for your target role.',
                'Generate a personalized learning roadmap.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#adc6ff] shrink-0" />
                  <span className="text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Data-Driven Insights</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-5 tracking-tight text-[#dae2fd]">Stop guessing.<br />Start calculating.</h2>
            <p className="text-[#c3c6d7] text-lg leading-relaxed">
              Compare your skills against real job requirements. Our AI maps your profile to hundreds of live role specifications and shows exactly where to focus.
            </p>
          </div>
        </div>
      </section>

      {/* ── Peer Network ── */}
      <section id="swap" className="py-24 border-t border-[#434655]/20 bg-[#0f1829]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Peer Learning</span>
            <h2 className="text-4xl font-extrabold mt-3 mb-5 tracking-tight text-[#dae2fd]">Learn from those<br />who've been there.</h2>
            <p className="text-[#c3c6d7] text-lg leading-relaxed">
              Connect directly with peers and alumni. Request mentoring sessions, share knowledge, and grow your professional network — all within one platform.
            </p>
          </div>
          <div className="order-1 md:order-2 bg-[#171f33] p-10 rounded-md border border-[#434655]/20 relative overflow-hidden group hover:border-[#6bd8cb]/20 transition-colors duration-300">
            <div className="absolute top-4 right-4 opacity-[0.06]"><Users size={100} /></div>
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Network</span>
            </div>
            <h3 className="text-2xl font-bold mb-5 tracking-tight text-[#dae2fd]">Peer Connections</h3>
            <ul className="space-y-4 text-[#c3c6d7]">
              {[
                'Request and offer mentoring sessions.',
                'Connect with alumni from your institution.',
                'Build your professional network on merit.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#89f5e7] shrink-0" />
                  <span className="text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── N.E.X.U.S. ── */}
      <section id="nexus" className="py-24 border-t border-[#434655]/20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Team Matching</span>
          <h2 className="text-4xl font-extrabold mt-3 mb-4 tracking-tight text-[#dae2fd]">N.E.X.U.S.</h2>
          <p className="text-[#c3c6d7] text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Skill-gated team formation for hackathons, startups, and projects. Your verified score determines your eligibility. No unverified claims.
          </p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-sm bg-[#adc6ff] text-[#002e6a] font-['Space_Grotesk'] font-bold text-sm tracking-[0.08em] uppercase hover:bg-[#89f5e7] hover:text-[#003732] transition-all duration-200 active:scale-95"
          >
            <Shield size={16} /> Join the Network
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 bg-[#131b2e] border-t border-[#434655]/20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f69dc]/10 via-transparent to-[#29a195]/5 pointer-events-none" />
        <div className="relative z-10">
          <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Get Started Today</span>
          <h2 className="text-5xl font-extrabold tracking-tight mt-4 mb-4 text-[#dae2fd]">Ready to build your<br />verified profile?</h2>
          <p className="text-[#c3c6d7] text-lg mb-10 max-w-xl mx-auto">Join a platform built for serious professionals and ambitious students.</p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-sm bg-[#0f69dc] text-[#dae2fd] font-['Space_Grotesk'] font-bold text-sm tracking-[0.1em] uppercase hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all duration-200 active:scale-95 shadow-lg shadow-[#0f69dc]/20"
          >
            Create Your Profile <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0b1326] text-[#8d90a0] py-10 text-center border-t border-[#434655]/20">
        <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.12em] uppercase">SkillSphere © 2025 · Professional Skill Intelligence</p>
      </footer>
    </div>
  );
}