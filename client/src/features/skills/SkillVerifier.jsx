import { useState } from 'react';
import { Shield, Github, Check, X, Lock, Eye } from 'lucide-react';
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

    // Use central SkillAPI instead of hardcoded fetch URL
    const data = await SkillAPI.verifySkill(userId, skillName, repoUrl, !isStealth);

    if (data.error) {
      setStatus('error');
      setErrorMsg(data.message || 'Verification Failed');
    } else if (data.success) {
      setStatus('success');
      setScore(data.score);
      onVerifyComplete?.(data);
    } else {
      setStatus('error');
      setErrorMsg('Verification Failed');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl relative overflow-hidden">

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-wide font-['Orbitron']">
            VERIFY: <span className="text-cyan-400">{skillName}</span>
          </h3>
          <p className="text-xs text-gray-400 font-mono">GITHUB NEURAL LINK</p>
        </div>
      </div>

      {/* Input section */}
      {status !== 'success' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1">REPOSITORY URL</label>
            <div className="flex items-center bg-gray-800 rounded-md border border-gray-700 focus-within:border-cyan-500 transition-colors">
              <Github className="w-5 h-5 text-gray-400 ml-3 shrink-0" />
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="w-full bg-transparent p-3 text-sm text-white outline-none placeholder-gray-600 font-mono"
              />
            </div>
          </div>

          {/* Stealth toggle */}
          <div
            onClick={() => setIsStealth(!isStealth)}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 border border-transparent hover:border-gray-600 transition-all"
          >
            <div className="flex items-center gap-2">
              {isStealth
                ? <Lock className="w-4 h-4 text-amber-400" />
                : <Eye className="w-4 h-4 text-emerald-400" />}
              <span className="text-sm font-medium text-gray-300">
                {isStealth ? 'Stealth Mode — Score Hidden' : 'Public — Score Visible'}
              </span>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-amber-500/30' : 'bg-emerald-500/30'}`}>
              <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-6 bg-amber-400' : 'left-1 bg-emerald-400'}`} />
            </div>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !repoUrl}
            className="w-full py-3 rounded-lg font-bold tracking-wider flex items-center justify-center gap-2 transition-all font-['Orbitron'] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
          >
            {loading ? 'SCANNING_CODEBASE...' : 'INITIATE_VERIFICATION'}
          </button>
        </div>
      )}

      {/* Success state */}
      {status === 'success' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h4 className="text-lg font-bold text-white mb-2 font-['Orbitron']">VERIFIED</h4>
          <p className="text-sm text-gray-400 mb-4">
            Badge awarded for <span className="text-white font-bold">{skillName}</span>
          </p>
          <div className="bg-gray-800 p-4 rounded-lg inline-block border border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-mono mb-1">System Score</p>
            <p className="text-3xl font-black text-white font-['Orbitron']">
              {isStealth ? 'HIDDEN' : <>{score}<span className="text-sm text-gray-500">/10</span></>}
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3">
          <X className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 font-mono">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}