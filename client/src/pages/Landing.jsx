import { useNavigate } from 'react-router-dom';
import FeatureSphere from '../shared/components/FeatureSphere';
import SEOHead from '../shared/components/SEOHead';
import { Brain, Users, ArrowRight, Shield } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goAuth = (mode) => navigate('/auth', { state: { mode } });

  return (
    <div className="min-h-screen bg-[#121110] text-[#f5f5f4] font-outfit">
      <SEOHead 
        title="Skill Intelligence & Developer Network" 
        description="Verify developer skills with automated proof, form high-octane engineering squads, and discover data-driven career roadmaps on SkillSphere."
        keywords="developer network, skill verification, engineering squads, leetcode verification, github developer profile"
      />

      {/* ── Nav ── */}
      <header className="relative min-h-[100dvh] flex flex-col overflow-x-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(87,83,78,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(87,83,78,0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)] pointer-events-none" />
        {/* Top accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[600px] h-[1px] bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent" />

        <nav className="w-full flex justify-between items-center px-4 sm:px-6 md:px-12 py-4 md:py-5 z-50 border-b border-[#44403c]/30 backdrop-blur-md bg-[#121110]/80">
          <div className="flex items-center gap-2 font-['Syne',sans-serif] font-extrabold text-xl sm:text-2xl tracking-tight text-[#f5f5f4] cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo.jpg" className="w-8 h-8 rounded-sm object-cover border border-[#44403c]/40" alt="" />
            Skill<span className="text-[#f59e0b]">Sphere</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => goAuth('login')}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-['Syne',sans-serif] font-medium text-[#a8a29e] hover:text-[#f5f5f4] transition-colors tracking-wide"
            >
              Sign In
            </button>
            <button
              onClick={() => goAuth('register')}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-['Syne',sans-serif] font-bold tracking-wider sm:tracking-widest uppercase bg-[#f59e0b] text-[#fffbeb] hover:bg-[#eab308] hover:text-[#fefce8] transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10 gap-8 md:gap-12 pt-6 sm:pt-10 pb-12 sm:pb-20">
          <div className="w-full md:w-1/2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#44403c]/40 bg-[#f59e0b]/5 mb-4 sm:mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] animate-pulse" />
              <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Platform Online</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] md:leading-[1.05] tracking-[-0.03em] mb-4 sm:mb-6 text-[#f5f5f4] font-['Syne',sans-serif]">
              Build your<br className="hidden sm:inline" />{' '}
              <span className="text-[#f59e0b]">verified</span><br className="hidden sm:inline" />{' '}
              skill profile.
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-[#a8a29e] mb-6 sm:mb-8 max-w-lg mx-auto md:mx-0 leading-relaxed font-normal border-l-2 border-[#f59e0b]/30 pl-4 text-left">
              Prove what you know. Identify your gaps. Find the right team — all backed by real data from your GitHub repositories.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
              <button
                onClick={() => goAuth('register')}
                className="group flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded bg-[#f59e0b] text-[#fffbeb] font-['Syne',sans-serif] font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-[#eab308] hover:text-[#fefce8] transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                Get Started <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo('analysis')}
                className="w-full sm:w-auto px-6 sm:px-7 py-3.5 sm:py-4 rounded border border-[#44403c]/50 text-[#a8a29e] font-['Syne',sans-serif] font-medium text-xs sm:text-sm tracking-wide hover:border-[#f59e0b]/50 hover:text-[#f5f5f4] transition-all duration-200 bg-[#1a1918]/30"
              >
                Explore Features
              </button>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex justify-center items-center relative h-[290px] sm:h-[400px] md:h-[600px] overflow-hidden">
            {/* Soft backdrop glow behind the Feature Sphere */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 sm:w-64 h-44 sm:h-64 bg-[#f59e0b]/10 rounded-full blur-[70px] sm:blur-[100px]" />
            </div>
            <FeatureSphere scrollToSection={scrollTo} />
          </div>
        </div>
      </header>

      {/* Brand Banner Preview */}
      <div className="w-full max-w-[1200px] mx-auto px-4 pb-16 sm:pb-24">
        <div className="relative rounded-xl overflow-hidden border border-[#44403c]/40 shadow-2xl bg-[#161513] group">
          <img 
            src="/brand.jpg" 
            className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300 max-h-[500px]" 
            alt="SkillSphere Brand Showcase" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121110] via-transparent to-transparent opacity-85 pointer-events-none" />
        </div>
      </div>

      {/* ── AI Analysis ── */}
      <section id="analysis" className="py-12 sm:py-20 md:py-24 border-t border-[#44403c]/20 bg-[#23211f]/20">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="bg-[#1a1918] p-6 sm:p-8 md:p-10 rounded-xl border border-[#44403c]/20 relative overflow-hidden group hover:border-[#ca8a04]/30 transition-colors duration-300 shadow-xl">
            <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none"><Brain size={80} className="sm:w-[120px] sm:h-[120px]" /></div>
            <div className="inline-flex items-center gap-2 mb-3 sm:mb-5">
              <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">AI Intelligence</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 tracking-tight text-[#f5f5f4] font-['Syne',sans-serif]">Skill Gap Analysis</h3>
            <ul className="space-y-3 sm:space-y-5 text-[#a8a29e]">
              {[
                'Run a diagnostic on your current skill set.',
                'Identify critical gaps for your target role.',
                'Generate a personalized learning roadmap.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-sm bg-[#f59e0b] shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <span className="text-sm sm:text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pr-0 md:pr-12">
            <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Data-Driven Insights</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2 sm:mt-4 mb-4 sm:mb-6 tracking-tight text-[#f5f5f4] font-['Syne',sans-serif]">Stop guessing.<br />Start calculating.</h2>
            <p className="text-[#a8a29e] text-base sm:text-lg leading-relaxed max-w-lg">
              Compare your skills against real job requirements. Our AI maps your profile to hundreds of live role specifications and shows exactly where to focus.
            </p>
          </div>
        </div>
      </section>

      {/* ── Peer Network ── */}
      <section id="swap" className="py-12 sm:py-20 md:py-24 border-t border-[#44403c]/20 bg-[#161513]/50">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="order-2 md:order-1 pl-0 md:pl-12">
            <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Peer Learning</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mt-2 sm:mt-4 mb-4 sm:mb-6 tracking-tight text-[#f5f5f4] font-['Syne',sans-serif]">Learn from those<br />who&apos;ve been there.</h2>
            <p className="text-[#a8a29e] text-base sm:text-lg leading-relaxed max-w-lg">
              Connect directly with peers and alumni. Request mentoring sessions, share knowledge, and grow your professional network — all within one platform.
            </p>
          </div>
          <div className="order-1 md:order-2 bg-[#1a1918] p-6 sm:p-8 md:p-10 rounded-xl border border-[#44403c]/20 relative overflow-hidden group hover:border-[#ca8a04]/30 transition-colors duration-300 shadow-xl">
            <div className="absolute top-4 right-4 opacity-[0.06] pointer-events-none"><Users size={80} className="sm:w-[120px] sm:h-[120px]" /></div>
            <div className="inline-flex items-center gap-2 mb-3 sm:mb-5">
              <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Network</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 tracking-tight text-[#f5f5f4] font-['Syne',sans-serif]">Peer Connections</h3>
            <ul className="space-y-3 sm:space-y-5 text-[#a8a29e]">
              {[
                'Request and offer mentoring sessions.',
                'Connect with alumni from your institution.',
                'Build your professional network on merit.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 w-2 h-2 rounded-sm bg-[#eab308] shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                  <span className="text-sm sm:text-base leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── N.E.X.U.S. ── */}
      <section id="nexus" className="py-16 sm:py-24 md:py-32 border-t border-[#44403c]/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Team Matching</span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mt-2 sm:mt-4 mb-4 sm:mb-6 tracking-tight text-[#f5f5f4] font-['Syne',sans-serif] drop-shadow-md">N.E.X.U.S.</h2>
          <p className="text-[#a8a29e] text-base sm:text-lg max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Skill-gated team formation for hackathons, startups, and projects. Your verified score determines your eligibility. No unverified claims.
          </p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded bg-[#f59e0b] text-[#fffbeb] font-['Syne',sans-serif] font-bold text-xs sm:text-sm tracking-widest uppercase hover:bg-[#eab308] hover:text-[#fefce8] transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          >
            <Shield size={18} /> Join the Network
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-28 md:py-36 bg-[#23211f] border-t border-[#44403c]/20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f59e0b]/10 via-transparent to-[#ca8a04]/5 pointer-events-none" />
        <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6">
          <span className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-[#ca8a04]">Get Started Today</span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mt-3 sm:mt-6 mb-4 sm:mb-6 text-[#f5f5f4] font-['Syne',sans-serif]">Ready to build your<br />verified profile?</h2>
          <p className="text-[#a8a29e] text-base sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto">Join a platform built for serious professionals and ambitious students.</p>
          <button
            onClick={() => goAuth('register')}
            className="inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded bg-[#b45309] text-[#f5f5f4] font-['Syne',sans-serif] font-bold text-xs sm:text-sm tracking-widest uppercase hover:brightness-110 transition-all duration-200 active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
          >
            Create Your Profile <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#161513] text-[#57534e] py-8 sm:py-12 text-center border-t border-[#44403c]/20 flex flex-col items-center justify-center gap-3">
        <img src="/logo.jpg" className="w-8 h-8 rounded-sm opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 border border-[#44403c]/30" alt="SkillSphere logo" />
        <p className="font-['Syne',sans-serif] text-[9px] sm:text-[10px] tracking-widest uppercase">SkillSphere © 2026 · Professional Skill Intelligence</p>
      </footer>
    </div>
  );
}