import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, X, Shield, Brain, Layers, Users, 
  ArrowRight, ArrowLeft, Check, HeartHandshake
} from 'lucide-react';

const GUIDE_STORAGE_KEY = 'ss_onboarding_guide_seen';

const STEPS = [
  {
    id: 'proof',
    icon: Shield,
    title: 'Verifiable Proof Engine',
    badge: 'Step 1 of 5 · Credibility',
    description:
      'SkillSphere replaces unverified resumes with proof. Connect your GitHub and LeetCode to auto-generate tamper-proof algorithmic badges and repository commit data.',
    actionLabel: 'Connect Repos',
    actionPath: '/my-profile',
  },
  {
    id: 'diagnostics',
    icon: Brain,
    title: 'AI Gap Diagnostics & Roadmaps',
    badge: 'Step 2 of 5 · Intelligence',
    description:
      'Benchmark your current stack against live industry role specifications. Our AI maps missing requirements and generates a personalized, step-by-step learning roadmap.',
    actionLabel: 'Run Diagnostics',
    actionPath: '/dashboard',
  },
  {
    id: 'nexus',
    icon: Layers,
    title: 'N.E.X.U.S. Squad Matching',
    badge: 'Step 3 of 5 · Collaboration',
    description:
      'Form or join high-octane engineering squads for hackathons, startups, and open-source. Role slots are skill-gated to ensure high-commitment teams.',
    actionLabel: 'Explore Teams',
    actionPath: '/nexus',
  },
  {
    id: 'network',
    icon: Users,
    title: 'Peer Network & Direct Comms',
    badge: 'Step 4 of 5 · Community',
    description:
      'Discover matching developer peers across institutions, request mentorship sessions, and chat directly in real-time to build projects together.',
    actionLabel: 'Find Peers',
    actionPath: '/network',
  },
  {
    id: 'feedback',
    icon: HeartHandshake,
    title: 'Direct Feedback & Co-Creation',
    badge: 'Step 5 of 5 · Evolution',
    description:
      'Help shape SkillSphere. Send direct thoughts, report bugs, or volunteer to co-build features directly with our student engineering team.',
    actionLabel: 'Give Feedback',
    actionPath: '/feedback',
  },
];

export default function OnboardingGuide() {
  const [showBeacon, setShowBeacon] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already completed/dismissed the guide
    const hasSeen = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (!hasSeen) {
      // Delay beacon appearance by 1.2s for smooth entrance after page load
      const timer = setTimeout(() => setShowBeacon(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for custom trigger to reopen guide from sidebar/help menu
  useEffect(() => {
    const handleReopen = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('open-ss-guide', handleReopen);
    return () => window.removeEventListener('open-ss-guide', handleReopen);
  }, []);

  const handleDismissBeacon = (e) => {
    e.stopPropagation();
    setShowBeacon(false);
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
  };

  const handleOpenGuide = () => {
    setShowBeacon(false);
    setIsOpen(true);
  };

  const handleCompleteGuide = () => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleActionNavigate = (path) => {
    handleCompleteGuide();
    navigate(path);
  };

  const step = STEPS[currentStep];

  return (
    <>
      {/* ── 1. Floating Purple Beacon (First Time Only) ────────────────────── */}
      <AnimatePresence>
        {showBeacon && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <div
              onClick={handleOpenGuide}
              className="group flex items-center gap-2.5 pl-3 pr-2 py-2 bg-[#F7F5FF] hover:bg-[#F0EBFF] border border-[#DDD6FE] hover:border-[#C4B5FD] text-[#6D28D9] rounded-full shadow-[0_4px_20px_rgba(109,40,217,0.12)] cursor-pointer transition-all active:scale-95 font-outfit"
            >
              {/* Pulsing purple discovery beacon */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7C3AED] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6D28D9]" />
              </span>

              <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide">
                <Sparkles size={13} className="text-[#7C3AED]" />
                <span>New to SkillSphere? <span className="font-bold underline decoration-[#C4B5FD] underline-offset-2">30s Guide</span></span>
              </div>

              <button
                type="button"
                onClick={handleDismissBeacon}
                className="p-1 rounded-full text-[#8B5CF6] hover:text-[#5B21B6] hover:bg-[#DDD6FE]/40 transition-colors ml-1"
                title="Dismiss guide"
                aria-label="Dismiss guide"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Interactive Guide Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCompleteGuide}
              className="absolute inset-0 bg-[#111111]/50 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg bg-surface border border-outline-var/40 rounded-xl shadow-2xl overflow-hidden font-outfit z-10"
            >
              {/* Top Accent Strip in Purple */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#C4B5FD]" />

              {/* Modal Header */}
              <div className="p-5 pb-3 flex items-center justify-between border-b border-outline-var/20 bg-surface-mid/40">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-syne font-extrabold text-base tracking-tight text-text-primary">
                      SkillSphere Quick Tour
                    </h3>
                    <p className="text-[11px] text-text-muted">Master the 5 core pillars in 30 seconds</p>
                  </div>
                </div>

                <button
                  onClick={handleCompleteGuide}
                  className="p-1.5 rounded-full text-outline hover:text-text-primary hover:bg-surface-mid transition-colors"
                  aria-label="Close guide"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Step Navigation Indicators */}
              <div className="px-6 pt-4 flex gap-1.5">
                {STEPS.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      idx === currentStep
                        ? 'bg-[#7C3AED]'
                        : idx < currentStep
                        ? 'bg-[#DDD6FE]'
                        : 'bg-outline-var/40'
                    }`}
                    title={s.title}
                  />
                ))}
              </div>

              {/* Step Body */}
              <div className="p-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] text-[10px] font-syne font-bold uppercase tracking-wider mb-3">
                  <span>{step.badge}</span>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <step.icon size={24} />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-syne font-bold text-lg text-text-primary tracking-tight">
                      {step.title}
                    </h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="mt-5 p-3 rounded-md bg-surface-mid border border-outline-var/30 flex items-center justify-between">
                  <span className="text-xs text-text-primary font-medium">Ready to try this feature?</span>
                  <button
                    type="button"
                    onClick={() => handleActionNavigate(step.actionPath)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xs text-xs font-syne font-bold uppercase tracking-wider transition-colors shadow-xs cursor-pointer active:scale-95"
                  >
                    {step.actionLabel} <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-surface-mid/60 border-t border-outline-var/20 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  disabled={currentStep === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-text-muted hover:text-text-primary font-syne font-bold uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} /> Prev
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCompleteGuide}
                    className="px-3 py-1.5 text-xs text-outline hover:text-text-primary font-syne font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Skip Tour
                  </button>

                  {currentStep < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white rounded-xs text-xs font-syne font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      Next <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCompleteGuide}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-dim text-white rounded-xs text-xs font-syne font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Check size={14} /> Finish Tour
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
