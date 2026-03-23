import { useNavigate } from 'react-router-dom';
import FeatureSphere from '../shared/components/FeatureSphere';
import { Brain, Users, ArrowRight } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const goAuth = (mode) => navigate('/auth', { state: { mode } });

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-['Rajdhani'] selection:bg-cyan-500 selection:text-black">

      {/* ── Hero ── */}
      <header className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <nav className="flex justify-between items-center p-6 md:px-12 z-50 border-b border-gray-800 bg-black/50 backdrop-blur-md">
          <div className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-['Orbitron']">
            SKILL<span className="text-yellow-400">SPHERE</span>
          </div>
          <div className="space-x-4">
            <button
              onClick={() => goAuth('login')}
              className="text-cyan-400 font-mono hover:text-white transition tracking-widest uppercase text-sm"
            >
              [ Login ]
            </button>
            <button
              onClick={() => goAuth('register')}
              className="bg-yellow-400 text-black px-6 py-2 font-bold font-['Orbitron'] hover:bg-yellow-300 transition skew-x-[-10deg] border-2 border-yellow-400 hover:shadow-[0_0_20px_#facc15]"
            >
              INIT_SYSTEM
            </button>
          </div>
        </nav>

        <div className="flex-1 flex flex-col md:flex-row items-center justify-center max-w-7xl mx-auto w-full px-6 relative z-10">

          <div className="md:w-1/2 text-center md:text-left z-10 mb-10 md:mb-0">
            <div className="inline-block px-3 py-1 border border-cyan-500/30 rounded bg-cyan-900/10 text-cyan-400 font-mono text-sm mb-4">
              /// SYSTEM_STATUS: ONLINE
            </div>
            <h1 className="text-6xl md:text-8xl font-black leading-none mb-6 font-['Orbitron']">
              SKILL <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse">
                CLARITY
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-lg mx-auto md:mx-0 font-['Rajdhani'] border-l-2 border-yellow-400 pl-4">
              Don't just learn. <span className="text-white font-bold">Upload skills.</span> Verify your stack.
              Calculate your gap against the global database.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button
                onClick={() => goAuth('login')}
                className="group relative px-8 py-4 bg-cyan-600 text-black font-bold text-lg font-['Orbitron'] hover:bg-cyan-400 transition overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">JACK IN <ArrowRight size={20} /></span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
              <button
                onClick={() => scrollTo('analysis')}
                className="px-8 py-4 bg-transparent text-cyan-400 border border-cyan-500 font-bold text-lg font-['Orbitron'] hover:bg-cyan-950/30 transition"
              >
                SCAN FEATURES
              </button>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center items-center relative">
            <FeatureSphere scrollToSection={scrollTo} />
          </div>
        </div>
      </header>

      {/* ── AI Analysis section ── */}
      <section id="analysis" className="py-24 border-t border-gray-800 relative bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="bg-gray-900/50 p-10 border border-cyan-500/30 relative overflow-hidden group hover:border-cyan-400 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Brain size={120} /></div>
            <h3 className="text-3xl font-bold mb-4 font-['Orbitron'] text-cyan-400">AI_INTELLIGENCE</h3>
            <ul className="space-y-4 text-xl text-gray-300 font-['Rajdhani']">
              <li className="flex gap-3 text-cyan-200">▰ <span className="text-white">Run diagnostic on your skills.</span></li>
              <li className="flex gap-3 text-cyan-200">▰ <span className="text-white">Detect critical data gaps.</span></li>
              <li className="flex gap-3 text-cyan-200">▰ <span className="text-white">Download upgrade roadmap.</span></li>
            </ul>
          </div>
          <div>
            <span className="text-yellow-400 font-bold tracking-widest font-mono uppercase">/// DATA_ANALYSIS</span>
            <h2 className="text-5xl font-bold mt-2 mb-6 font-['Orbitron']">Stop guessing. <br />Start calculating.</h2>
            <p className="text-xl text-gray-400 mb-6">
              The industry is a black box. Our AI rips it open. Match your neural patterns against 1,000+ live job descriptions.
            </p>
          </div>
        </div>
      </section>

      {/* ── Skill Swap section ── */}
      <section id="swap" className="py-24 border-t border-gray-800 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <span className="text-pink-500 font-bold tracking-widest font-mono uppercase">/// P2P_CONNECTION</span>
            <h2 className="text-5xl font-bold mt-2 mb-6 font-['Orbitron']">Direct Neural Link.</h2>
            <p className="text-xl text-gray-400 mb-6">
              Bypass the tutorial hell. Jack directly into a peer's knowledge base. Teach to earn credits. Learn to survive.
            </p>
          </div>
          <div className="order-1 md:order-2 bg-gray-900/50 p-10 border border-pink-500/30 relative group hover:border-pink-500 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Users size={120} /></div>
            <h3 className="text-3xl font-bold mb-4 font-['Orbitron'] text-pink-500">SKILL_SWAP</h3>
            <ul className="space-y-4 text-xl text-gray-300 font-['Rajdhani']">
              <li className="flex gap-3 text-pink-300">▰ <span className="text-white">Request data transfer.</span></li>
              <li className="flex gap-3 text-pink-300">▰ <span className="text-white">Host knowledge nodes.</span></li>
              <li className="flex gap-3 text-pink-300">▰ <span className="text-white">Instant synchronization.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── N.E.X.U.S. section ── */}
      <section id="mentorship" className="py-24 border-t border-gray-800 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="text-yellow-400 font-bold tracking-widest font-mono uppercase">/// SQUAD_PROTOCOL</span>
          <h2 className="text-5xl font-bold mt-2 mb-6 font-['Orbitron']">N.E.X.U.S.</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Skill-gated squad matchmaking. Build teams for hackathons, startups, and projects.
            Your verified score determines if you qualify. No fake claims. No shortcuts.
          </p>
          <button
            onClick={() => goAuth('register')}
            className="px-8 py-4 bg-yellow-400 text-black font-bold font-['Orbitron'] hover:bg-yellow-300 transition"
          >
            JOIN_THE_NETWORK
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 bg-yellow-400 text-black text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }} />
        <h2 className="text-6xl font-black mb-8 font-['Orbitron'] uppercase">Ready to Upgrade?</h2>
        <button
          onClick={() => goAuth('register')}
          className="px-12 py-6 bg-black text-cyan-400 text-2xl font-bold font-['Orbitron'] hover:bg-gray-900 transition shadow-[0_0_30px_rgba(0,0,0,0.5)] border-2 border-black"
        >
          INITIATE SEQUENCE
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black text-gray-600 py-12 text-center border-t border-gray-900 font-mono text-sm">
        <p>SKILLSPHERE_OS v1.0.0 /// SYSTEM SECURE</p>
      </footer>
    </div>
  );
}