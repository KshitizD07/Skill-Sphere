import { useState } from 'react';
import { Shield, Github, Check, X, Eye, Lock } from 'lucide-react';
import SkillAPI from './skillAPI';

export default function SkillVerifier({ userId, skillName, onVerifyComplete }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isStealth, setIsStealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [score, setScore] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!repoUrl) return;

    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    const data = await SkillAPI.verifySkill(userId, skillName, repoUrl, !isStealth);

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
    <div className="p-6 bg-[#171f33] border border-[#434655]/30 rounded-md max-w-md w-full shadow-2xl relative overflow-hidden font-['Manrope']">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#0f69dc] via-[#adc6ff] to-[#29a195]" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#adc6ff]/8 rounded-xs border border-[#adc6ff]/15">
          <Shield className="w-5 h-5 text-[#adc6ff]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#dae2fd] tracking-tight">
            Verify: <span className="text-[#adc6ff]">{skillName}</span>
          </h3>
          <p className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.12em] uppercase text-[#8d90a0]">GitHub Repository Verification</p>
        </div>
      </div>

      {/* Input section */}
      {status !== 'success' && (
        <div className="space-y-4">
          <div>
            <label className="block font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1.5">Repository URL</label>
            <div className="flex items-center bg-[#131b2e] rounded-xs border border-[#434655]/40 focus-within:border-[#adc6ff]/50 transition-colors">
              <Github className="w-4 h-4 text-[#656d84] ml-3 shrink-0" />
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="w-full bg-transparent p-3 text-sm text-[#dae2fd] outline-none placeholder-[#434655] font-['Manrope']"
              />
            </div>
          </div>

          {/* Stealth toggle */}
          <div
            onClick={() => setIsStealth(!isStealth)}
            className="flex items-center justify-between p-3 bg-[#131b2e]/60 rounded-xs cursor-pointer hover:bg-[#222a3d] border border-[#434655]/20 hover:border-[#434655]/40 transition-all"
          >
            <div className="flex items-center gap-2">
              {isStealth
                ? <Lock className="w-4 h-4 text-[#bec6e0]" />
                : <Eye className="w-4 h-4 text-[#89f5e7]" />}
              <span className="text-sm font-medium text-[#c3c6d7]">
                {isStealth ? 'Private — Score hidden' : 'Public — Score visible'}
              </span>
            </div>
            <div className={`w-9 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-[#656d84]/30' : 'bg-[#29a195]/30'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-5 bg-[#bec6e0]' : 'left-1 bg-[#89f5e7]'}`} />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !repoUrl}
            className="w-full py-3 rounded-xs font-['Space_Grotesk'] font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] hover:opacity-90 shadow-lg shadow-[#0f69dc]/20"
          >
            {loading ? 'Scanning...' : 'Verify Skill'}
          </button>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 bg-[#89f5e7]/8 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#89f5e7]/25">
            <Check className="w-7 h-7 text-[#89f5e7]" />
          </div>
          <h4 className="text-base font-extrabold text-[#dae2fd] mb-1 tracking-tight">Verified</h4>
          <p className="text-sm text-[#8d90a0] mb-5">
            Verification badge awarded for <span className="text-[#dae2fd] font-semibold">{skillName}</span>
          </p>
          <div className="bg-[#131b2e] p-4 rounded-xs inline-block border border-[#434655]/30">
            <p className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1">Verification Score</p>
            <p className="text-3xl font-extrabold text-[#dae2fd] tracking-tight">
              {isStealth ? <span className="text-[#656d84] text-xl">Private</span> : <>{score}<span className="text-base text-[#656d84]">/10</span></>}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="mt-4 p-3 bg-[#93000a]/10 border border-[#93000a]/30 rounded-xs flex items-center gap-3">
          <X className="w-4 h-4 text-[#ffb4ab] shrink-0" />
          <p className="text-sm text-[#ffb4ab]">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}