import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, BrainCircuit, User, AlertTriangle, ShieldCheck } from 'lucide-react';
import API from '../../../api';

export default function NexusMatchModal({ isOpen, onClose, squad, slotId, candidates, onMatchAccepted }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null);
  const [error, setError] = useState('');

  const slot = squad?.slots?.find((s) => s.id === slotId);

  const runMatch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/antifragile/match', {
        squadId: squad.id,
        slotId,
        candidateIds: candidates
      });
      if (res.data.success) {
        setMatchResult(res.data.data);
        setStep(2);
      } else {
        setError(res.data.message || 'N.E.X.U.S. match failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'N.E.X.U.S. error.');
    } finally {
      setLoading(false);
    }
  };

  const acceptRecommendation = async () => {
    try {
      // Find the application for this selected user
      const application = squad.applications.find(a => a.userId === matchResult.recommendedUserId && a.slotId === slotId);
      if (application) {
        // Log outcome
        await API.post(`/antifragile/outcomes/${matchResult.decisionId}`, {
          accepted: true,
          leaderRating: 5
        });
        
        // Accept the application
        await API.put(`/squads/${squad.id}/applications/${application.id}`, { status: 'ACCEPTED' });
        
        onMatchAccepted();
        onClose();
      } else {
        setError('Application not found for the recommended user.');
      }
    } catch {
      setError('Failed to accept recommendation.');
    }
  };

  const overrideRecommendation = async () => {
    try {
      await API.post(`/antifragile/outcomes/${matchResult.decisionId}`, {
        accepted: false,
        leaderRating: 2
      });
      onClose();
    } catch {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-surface border border-outline-var/30 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-outline-var/20 flex items-center justify-between bg-surface-mid/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary-bright/20 flex items-center justify-center text-secondary-bright">
                <BrainCircuit size={16} />
              </div>
              <div>
                <h2 className="text-sm font-syne font-bold text-text-primary tracking-wide">N.E.X.U.S. Engine</h2>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Antifragile Matching</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-mid rounded text-outline hover:text-text-primary transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-6 text-center">
                <div className="py-8">
                  <div className="w-20 h-20 mx-auto bg-bg-base rounded-full border border-secondary-bright/30 flex items-center justify-center relative mb-4">
                    <Sparkles className="text-secondary-bright absolute" size={24} />
                    <div className="w-full h-full rounded-full border-2 border-secondary-bright/20 animate-ping absolute" />
                  </div>
                  <h3 className="text-lg font-bold font-syne text-text-primary mb-2">Ready to initiate Match Protocol</h3>
                  <p className="text-sm text-text-muted max-w-md mx-auto">
                    N.E.X.U.S. will evaluate {candidates.length} candidates for the <span className="text-primary">{slot?.roleTitle}</span> role using active strategies to find the optimal match.
                  </p>
                </div>
                
                {error && <div className="text-error text-sm">{error}</div>}

                <button
                  onClick={runMatch}
                  disabled={loading}
                  className="w-full py-3 bg-secondary-bright text-[#000] font-syne font-bold uppercase tracking-wider rounded-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#000]/20 border-t-[#000] rounded-full animate-spin" />
                      Analyzing Candidates...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={16} /> Run Match Engine
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 2 && matchResult && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xs font-syne font-bold text-[10px] uppercase tracking-wider mb-4 ${matchResult.explanation?.method === 'consensus' ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-500'}`}>
                    {matchResult.explanation?.method === 'consensus' ? (
                      <><ShieldCheck size={12} /> CONSENSUS ✓</>
                    ) : (
                      <><AlertTriangle size={12} /> EXPLORATION ⟳</>
                    )}
                  </div>
                  <h3 className="text-xl font-bold font-syne text-text-primary">Match Found</h3>
                  <p className="text-xs text-text-muted mt-1">{matchResult.explanation?.reasoning}</p>
                </div>

                {/* Recommended Candidate Card */}
                <div className="bg-surface-mid border border-secondary-bright/40 rounded-md p-5 flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-bright/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                  
                  {/* Find candidate details from squad.applications */}
                  {(() => {
                    const app = squad.applications.find(a => a.userId === matchResult.recommendedUserId);
                    const user = app?.user;
                    return (
                      <>
                        <div className="w-14 h-14 rounded-full bg-surface border border-outline-var/30 flex items-center justify-center overflow-hidden shrink-0">
                          {user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <User size={24} className="text-[#656d84]" />}
                        </div>
                        <div className="flex-1 min-w-0 z-10">
                          <h4 className="font-bold text-base text-text-primary truncate">{user?.name || 'Unknown Candidate'}</h4>
                          <p className="text-xs text-text-muted truncate">{user?.headline || user?.college}</p>
                          <div className="mt-2 text-[10px] text-secondary-bright font-syne font-bold">
                            Confidence: {(matchResult.explanation?.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Strategy Votes (Simplified for UI) */}
                <div className="text-xs text-text-muted bg-bg-base border border-outline-var/20 rounded-md p-3">
                  <div className="font-syne font-bold uppercase tracking-wider text-outline mb-2">Engine Metrics</div>
                  <div className="flex justify-between items-center py-1 border-b border-outline-var/10">
                    <span>Execution Time</span>
                    <span className="text-text-primary">{matchResult.meta?.executionTimeMs}ms</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Strategies Evaluated</span>
                    <span className="text-text-primary">{matchResult.meta?.strategiesExecuted}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={overrideRecommendation}
                    className="flex-1 py-2.5 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-[11px] uppercase tracking-wider rounded-xs transition-colors"
                  >
                    Override
                  </button>
                  <button
                    onClick={acceptRecommendation}
                    className="flex-[2] py-2.5 bg-primary text-on-primary hover:bg-primary/90 font-syne font-bold text-[11px] uppercase tracking-wider rounded-xs transition-colors"
                  >
                    Accept Recommendation
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
