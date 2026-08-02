import { useState } from 'react';
import { Shield, Github, Check, X, Eye, Lock } from 'lucide-react';
import SkillAPI from './skillAPI';

export default function SkillVerifier({ userId, skillName, onVerifyComplete }) {
  const [method, setMethod] = useState('github'); // 'github' or 'leetcode'
  const [inputValue, setInputValue] = useState('');
  const [isStealth, setIsStealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!inputValue) return;

    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    let data;
    if (method === 'github') {
      data = await SkillAPI.verifySkill(userId, skillName, inputValue, !isStealth);
    } else {
      data = await SkillAPI.verifyLeetCodeSkill(userId, skillName, inputValue, !isStealth);
    }

    if (data.error) {
      setStatus('error');
      setErrorMsg(data.message || 'Verification failed.');
    } else if (data.success) {
      setStatus('success');
      setScore(data.score);
      onVerifyComplete?.(data);
    } else {
      setStatus('error');
      setErrorMsg('Verification failed.');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-surface border border-outline-var/30 rounded-md max-w-md w-full shadow-2xl relative overflow-hidden font-outfit">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary-container via-primary to-[#29a195]" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-primary/8 rounded-xs border border-primary/15">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-text-primary tracking-tight">
            Verify: <span className="text-primary">{skillName}</span>
          </h3>
          <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">Skill Verification</p>
        </div>
      </div>

      {/* Input section */}
      {status !== 'success' && (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setMethod('github'); setInputValue(''); }}
              className={`flex-1 py-1.5 text-xs font-bold font-syne uppercase tracking-wider rounded-xs transition-colors ${method === 'github' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-mid/50 text-outline border border-transparent'}`}
            >
              GitHub
            </button>
            <button
              onClick={() => { setMethod('leetcode'); setInputValue(''); }}
              className={`flex-1 py-1.5 text-xs font-bold font-syne uppercase tracking-wider rounded-xs transition-colors ${method === 'leetcode' ? 'bg-[#ffa116]/20 text-[#ffa116] border border-[#ffa116]/30' : 'bg-surface-mid/50 text-outline border border-transparent'}`}
            >
              LeetCode
            </button>
          </div>

          <div>
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
              {method === 'github' ? 'Repository URL' : 'LeetCode Username'}
            </label>
            <div className={`flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-primary/50 transition-colors`}>
              {method === 'github' ? <Github className="w-4 h-4 text-[#656d84] ml-3 shrink-0" /> : <div className="ml-3 font-bold text-[#ffa116]">LC</div>}
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={method === 'github' ? "https://github.com/username/project" : "e.g., striver_79"}
                className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
              />
            </div>
          </div>

          {/* Stealth toggle */}
          <div
            onClick={() => setIsStealth(!isStealth)}
            className="flex items-center justify-between p-3 bg-surface-mid/60 rounded-xs cursor-pointer hover:bg-surface-mid border border-outline-var/20 hover:border-outline-var/40 transition-all"
          >
            <div className="flex items-center gap-2">
              {isStealth
                ? <Lock className="w-4 h-4 text-[#bec6e0]" />
                : <Eye className="w-4 h-4 text-secondary-bright" />}
              <span className="text-sm font-medium text-text-muted">
                {isStealth ? 'Private — Score hidden' : 'Public — Score visible'}
              </span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-[#656d84]/30' : 'bg-[#29a195]/30'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-5 bg-[#bec6e0]' : 'left-1 bg-secondary-bright'}`} />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !inputValue}
            className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90 shadow-lg shadow-primary-container/20"
          >
            {loading ? 'Scanning...' : 'Verify Skill'}
          </button>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 bg-secondary-bright/8 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary-bright/25">
            <Check className="w-7 h-7 text-secondary-bright" />
          </div>
          <h4 className="text-base font-extrabold text-text-primary mb-1 tracking-tight">Verified</h4>
          <p className="text-sm text-outline mb-5">
            Verification badge awarded for <span className="text-text-primary font-semibold">{skillName}</span>
          </p>
          <div className="bg-surface-mid p-4 rounded-xs inline-block border border-outline-var/30">
            <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline mb-1">Verification Score</p>
            <p className="text-3xl font-extrabold text-text-primary tracking-tight">
              {isStealth ? <span className="text-[#656d84] text-xl">Private</span> : <>{score}<span className="text-base text-[#656d84]">/10</span></>}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="mt-4 p-3 bg-error-container/10 border border-error-container/30 rounded-xs flex items-center gap-3">
          <X className="w-4 h-4 text-error shrink-0" />
          <p className="text-sm text-error">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}