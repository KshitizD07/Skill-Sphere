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
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit">

      {/* ── Nav ── */}
      <header className="relative min-h-screen flex flex-col overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(87,83,78,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(87,83,78,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" />
        {/* Top accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <nav className="w-full flex justify-between items-center px-6 md:px-12 py-5 z-50 border-b border-outline-var/30 backdrop-blur-md bg-bg-base/80">
          <div className="font-syne font-extrabold text-2xl tracking-tight text-text-primary">
            Skill<span className="text-primary">Sphere</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => goAuth('login')}
              className="px-4 py-2 text-sm font-syne font-medium text-text-muted hover:text-text-primary transition-colors tracking-wide"
            >
              Sign In
            </button>
            <button
              onClick={() => goAuth('register')}
              className="px-5 py-2 rounded text-sm font-syne font-bold tracking-widest uppercase bg-primary text-on-primary hover:bg-secondary-bright hover:text-on-secondary transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full max-w-[1600px] mx-auto px-6 relative z-10 gap-12 pt-10 pb-20">
          <div className="md:w-1/2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-outline-var/40 bg-primary/5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary-bright animate-pulse" />
              <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Platform Online</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-[-0.03em] mb-6 text-text-primary">
              Build your<br />
              <span className="text-primary">verified</span><br />
              skill profile.
            </h1>
            <p className="text-lg text-text-muted mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed font-normal border-l-2 border-primary/30 pl-4">
              Prove what you know. Identify your gaps. Find the right team — all backed by real data from your GitHub repositories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => goAuth('register')}
                className="group flex items-center justify-center gap-2 px-7 py-4 rounded bg-primary text-on-primary font-syne font-bold text-sm tracking-widest uppercase hover:bg-secondary-bright hover:text-on-secondary transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Get Started <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo('analysis')}
                className="px-7 py-4 rounded border border-outline-var/50 text-text-muted font-syne font-medium text-sm tracking-wide hover:border-primary/50 hover:text-text-primary transition-all duration-200 bg-surface/30"
              >
                Explore Features
              </button>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center items-center relative h-[400px] md:h-[600px]">
            {/* Soft backdrop glow behind the Feature Sphere */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
            </div>
            <FeatureSphere scrollToSection={scrollTo} />
          </div>
        </div>
      </header>

      {/* ── AI Analysis ── */}
      <section id="analysis" className="py-24 border-t border-outline-var/20 bg-surface-mid/20">
        <div className="w-full max-w-[1400px] mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="bg-surface p-10 rounded-xl border border-outline-var/20 relative overflow-hidden group hover:border-secondary/30 transition-colors duration-300 shadow-xl">
            <div className="absolute top-4 right-4 opacity-[0.06]"><Brain size={120} /></div>
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">AI Intelligence</span>
            </div>
            <h3 className="text-3xl font-bold mb-6 tracking-tight text-text-primary">Skill Gap Analysis</h3>
            <ul className="space-y-5 text-text-muted">
              {[
                'Run a diagnostic on your current skill set.',
                'Identify critical gaps for your target role.',
                'Generate a personalized learning roadmap.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-sm bg-primary shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span className="text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pr-0 md:pr-12">
            <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Data-Driven Insights</span>
            <h2 className="text-5xl font-extrabold mt-4 mb-6 tracking-tight text-text-primary">Stop guessing.<br />Start calculating.</h2>
            <p className="text-text-muted text-lg leading-relaxed max-w-lg">
              Compare your skills against real job requirements. Our AI maps your profile to hundreds of live role specifications and shows exactly where to focus.
            </p>
          </div>
        </div>
      </section>

      {/* ── Peer Network ── */}
      <section id="swap" className="py-24 border-t border-outline-var/20 bg-bg-sidebar/50">
        <div className="w-full max-w-[1400px] mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 pl-0 md:pl-12">
            <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Peer Learning</span>
            <h2 className="text-5xl font-extrabold mt-4 mb-6 tracking-tight text-text-primary">Learn from those<br />who've been there.</h2>
            <p className="text-text-muted text-lg leading-relaxed max-w-lg">
              Connect directly with peers and alumni. Request mentoring sessions, share knowledge, and grow your professional network — all within one platform.
            </p>
          </div>
          <div className="order-1 md:order-2 bg-surface p-10 rounded-xl border border-outline-var/20 relative overflow-hidden group hover:border-secondary/30 transition-colors duration-300 shadow-xl">
            <div className="absolute top-4 right-4 opacity-[0.06]"><Users size={120} /></div>
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Network</span>
            </div>
            <h3 className="text-3xl font-bold mb-6 tracking-tight text-text-primary">Peer Connections</h3>
            <ul className="space-y-5 text-text-muted">
              {[
                'Request and offer mentoring sessions.',
                'Connect with alumni from your institution.',
                'Build your professional network on merit.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-sm bg-secondary-bright shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                  <span className="text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── N.E.X.U.S. ── */}
      <section id="nexus" className="py-32 border-t border-outline-var/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-full max-w-[1000px] mx-auto px-6 text-center relative z-10">
          <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Team Matching</span>
          <h2 className="text-5xl md:text-6xl font-extrabold mt-4 mb-6 tracking-tight text-text-primary drop-shadow-md">N.E.X.U.S.</h2>
          <p className="text-text-muted text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Skill-gated team formation for hackathons, startups, and projects. Your verified score determines your eligibility. No unverified claims.
          </p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded bg-primary text-on-primary font-syne font-bold text-sm tracking-widest uppercase hover:bg-secondary-bright hover:text-on-secondary transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Shield size={18} /> Join the Network
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-36 bg-surface-mid border-t border-outline-var/20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 pointer-events-none" />
        <div className="relative z-10 w-full w-full max-w-[1200px] mx-auto px-6">
          <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary">Get Started Today</span>
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mt-6 mb-6 text-text-primary">Ready to build your<br />verified profile?</h2>
          <p className="text-text-muted text-xl mb-12 max-w-2xl mx-auto">Join a platform built for serious professionals and ambitious students.</p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-3 px-12 py-5 rounded bg-primary-container text-text-primary font-syne font-bold text-sm tracking-widest uppercase hover:brightness-110 transition-all duration-200 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
          >
            Create Your Profile <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-bg-sidebar text-outline py-12 text-center border-t border-outline-var/20">
        <p className="font-syne text-[10px] tracking-widest uppercase">SkillSphere © 2026 · Professional Skill Intelligence</p>
      </footer>
    </div>
  );
}