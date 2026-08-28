import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartHandshake, Star, Send, CheckCircle2, 
  Sparkles, Building2, 
  User, Mail, ArrowRight, RotateCcw
} from 'lucide-react';
import Navbar from '../shared/components/Navbar';
import SEOHead from '../shared/components/SEOHead';
import { useToast, ToastContainer } from '../shared/components/Toast';
import FeedbackAPI from '../features/feedback/feedbackAPI';

const CATEGORIES = [
  { id: 'UI / UX Experience', label: '🎨 UI / UX Experience' },
  { id: 'Speed & Performance', label: '⚡ Speed & Performance' },
  { id: 'Bug Report', label: '🐛 Bug Report' },
  { id: 'Feature Suggestion', label: '💡 Feature Suggestion' },
  { id: 'General Feedback', label: '💬 General Thoughts' },
];

const RATING_LABELS = {
  1: 'Needs Major Work',
  2: 'Could Be Better',
  3: 'Good & Promising',
  4: 'Great Experience',
  5: 'Exceptional & Love It!',
};

export default function FeedbackPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [category, setCategory] = useState('UI / UX Experience');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [mostValuable, setMostValuable] = useState('');
  const [improvement, setImprovement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim() || feedback.trim().length < 5) {
      toast.addToast('Please provide feedback of at least 5 characters.', 'error');
      return;
    }

    try {
      setSubmitting(true);

      await FeedbackAPI.submitFeedback({
        category,
        rating,
        feedback: feedback.trim(),
        mostValuable: mostValuable.trim(),
        improvement: improvement.trim(),
        deviceInfo: `${window.navigator.userAgent} (${window.innerWidth}x${window.innerHeight})`,
      });

      setSubmitted(true);
      toast.addToast('Feedback sent directly to the development team! Thank you.', 'success');
    } catch (err) {
      console.error(err);
      toast.addToast(
        err.response?.data?.message || 'Failed to send feedback. Please try again.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFeedback('');
    setMostValuable('');
    setImprovement('');
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <SEOHead
        title="Platform Feedback · SkillSphere"
        description="Share your direct feedback with the SkillSphere engineering and design team."
      />
      <Navbar user={currentUser} onLogout={() => {}} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <main className="flex-1 md:ml-64 pt-20 md:pt-10 pb-16 px-4 sm:px-6 md:px-10 max-w-4xl mx-auto w-full">
        {/* ── Page Header ── */}
        <div className="mb-8 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xs bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] text-[10px] font-syne font-bold uppercase tracking-wider mb-2.5">
            <HeartHandshake size={13} />
            <span>Developer Direct Line</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-syne font-extrabold text-text-primary tracking-tight">
            Help Us Shape <span className="text-primary">SkillSphere</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-1.5 max-w-xl leading-relaxed">
            Your feedback goes directly to our core developers. Tell us what you love, what feels slow, or what we should build next.
          </p>
        </div>

        {/* ── Main Content Form / Success State ── */}
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-outline-var/40 rounded-xl p-8 sm:p-12 text-center shadow-warm max-w-2xl mx-auto"
            >
              <div className="w-16 h-16 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-[#6D28D9] flex items-center justify-center mx-auto mb-5 shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl sm:text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                Feedback Received!
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-text-primary">{currentUser.name || 'Engineer'}</strong>. Your insights have been dispatched straight to our inbox. We read every submission.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Return to Dashboard <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-6 py-3 bg-surface-mid border border-outline-var/30 hover:border-primary/40 text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={14} /> Send Another Note
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="bg-surface border border-outline-var/30 rounded-xl p-5 sm:p-8 shadow-warm space-y-7"
            >
              {/* ── 1. Verified User Info Badge ── */}
              <div className="p-4 rounded-lg bg-surface-mid border border-outline-var/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-primary/20 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary">{currentUser.name || 'Anonymous'}</span>
                      <span className="px-2 py-0.5 rounded-xs bg-accent/10 border border-accent/20 text-accent text-[9px] font-syne font-bold uppercase">
                        {currentUser.role || 'STUDENT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail size={11} className="text-outline" /> {currentUser.email}
                      </span>
                      {currentUser.college && (
                        <span className="flex items-center gap-1">
                          <Building2 size={11} className="text-outline" /> {currentUser.college}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-outline font-syne uppercase tracking-wider self-start sm:self-center">
                  Verified Account
                </span>
              </div>

              {/* ── 2. Category Selector Pills ── */}
              <div className="space-y-2.5">
                <label className="block text-xs font-syne font-bold uppercase tracking-wider text-text-primary">
                  What is this feedback about? <span className="text-primary">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`px-3.5 py-2 rounded-xs text-xs font-syne font-bold uppercase tracking-wider transition-all cursor-pointer min-h-[38px] flex items-center ${
                          isSelected
                            ? 'bg-[#6D28D9] text-white shadow-sm border border-[#5B21B6]'
                            : 'bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/30 hover:border-outline-var/60'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 3. Star Rating ── */}
              <div className="space-y-2.5">
                <label className="block text-xs font-syne font-bold uppercase tracking-wider text-text-primary">
                  Overall Platform Experience
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-outline hover:scale-110 active:scale-95 transition-all cursor-pointer"
                        aria-label={`${star} Stars`}
                      >
                        <Star
                          size={26}
                          className={`${
                            star <= (hoverRating || rating)
                              ? 'fill-[#F59E0B] text-[#F59E0B]'
                              : 'text-outline-var'
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-syne font-bold text-primary tracking-wide">
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* ── 4. Main Feedback Message ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-syne font-bold uppercase tracking-wider text-text-primary">
                    Your Thoughts & Feedback <span className="text-primary">*</span>
                  </label>
                  <span className={`text-[10px] font-syne ${feedback.length < 5 ? 'text-outline' : 'text-primary'}`}>
                    {feedback.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what's working well, what feels confusing or slow, or any bug you encountered..."
                  className="w-full bg-surface-mid border border-outline-var/30 focus:border-primary/60 rounded-md p-3.5 text-sm text-text-primary outline-none transition-colors placeholder:text-outline-var resize-y font-outfit"
                  required
                />
              </div>

              {/* ── 5. Optional Prompts ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-syne font-bold uppercase tracking-wider text-text-muted">
                    ✨ Most valuable feature so far? <span className="text-outline text-[10px] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={mostValuable}
                    onChange={(e) => setMostValuable(e.target.value)}
                    placeholder="e.g. AI Gap Roadmap, LeetCode sync, Teams"
                    className="w-full bg-surface-mid border border-outline-var/30 focus:border-primary/50 rounded-xs py-2 px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-outline-var font-outfit"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-syne font-bold uppercase tracking-wider text-text-muted">
                    🛠️ What should we build next? <span className="text-outline text-[10px] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={improvement}
                    onChange={(e) => setImprovement(e.target.value)}
                    placeholder="e.g. Mobile app, Hackathon matcher, Code review"
                    className="w-full bg-surface-mid border border-outline-var/30 focus:border-primary/50 rounded-xs py-2 px-3 text-xs text-text-primary outline-none transition-colors placeholder:text-outline-var font-outfit"
                  />
                </div>
              </div>

              {/* ── 6. Submit Button ── */}
              <div className="pt-3 border-t border-outline-var/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-outline flex items-center gap-1">
                  <Sparkles size={12} className="text-primary shrink-0" />
                  Your message will be sent directly to the core development team.
                </p>

                <button
                  type="submit"
                  disabled={submitting || feedback.trim().length < 5}
                  className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={13} /> Send Feedback
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
