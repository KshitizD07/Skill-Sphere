import { useState } from 'react';
import { Shield, Link, Check, X, Award } from 'lucide-react';
import SkillAPI from './skillAPI';

export default function ProofVerifier({ skillId, skillName, onVerifyComplete }) {
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!proofUrl) return;

    setLoading(true);
    setErrorMsg('');

    const source = (proofUrl.includes('credly.com') || proofUrl.includes('aws.amazon.com') || proofUrl.includes('coursera.org')) 
                 ? 'CREDENTIAL' 
                 : 'MANUAL';

    try {
      const data = await SkillAPI.verifySkillManual(skillId, proofUrl, source);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Verification failed.');
      } else {
        setStatus('success');
        onVerifyComplete?.(data);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('Failed to connect to verification server.');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-[#171f33] border border-[#434655]/30 rounded-md max-w-md w-full shadow-2xl relative overflow-hidden font-['Manrope']">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#89f5e7] via-[#adc6ff] to-[#0f69dc]" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-[#89f5e7]/8 rounded-xs border border-[#89f5e7]/15">
          <Award className="w-5 h-5 text-[#89f5e7]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#dae2fd] tracking-tight">
            Proof: <span className="text-[#89f5e7]">{skillName}</span>
          </h3>
          <p className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.12em] uppercase text-[#8d90a0]">Credential & Certificate Linking</p>
        </div>
      </div>

      {status !== 'success' && (
        <div className="space-y-4">
          <div>
            <label className="block font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1.5">Evidence URL</label>
            <div className="flex items-center bg-[#131b2e] rounded-xs border border-[#434655]/40 focus-within:border-[#89f5e7]/50 transition-colors">
              <Link className="w-4 h-4 text-[#656d84] ml-3 shrink-0" />
              <input
                type="text"
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                placeholder="https://credly.com/certs/..."
                className="w-full bg-transparent p-3 text-sm text-[#dae2fd] outline-none placeholder-[#434655] font-['Manrope']"
              />
            </div>
            <p className="mt-2 text-[10px] text-[#656d84] leading-tight">
              Provide a link to your Credly badge, AWS certificate, or portfolio project.
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !proofUrl}
            className="w-full py-3 rounded-xs font-['Space_Grotesk'] font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#89f5e7] to-[#0f69dc] text-[#002e6a] hover:opacity-90 shadow-lg shadow-[#0f69dc]/20"
          >
            {loading ? 'Attaching...' : 'Link Evidence'}
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 bg-[#89f5e7]/8 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#89f5e7]/25">
            <Check className="w-7 h-7 text-[#89f5e7]" />
          </div>
          <h4 className="text-base font-extrabold text-[#dae2fd] mb-1 tracking-tight">Evidence Linked</h4>
          <p className="text-sm text-[#8d90a0] mb-2">
            Professional evidence attached to <span className="text-[#dae2fd] font-semibold">{skillName}</span>
          </p>
          <div className="p-2 bg-[#131b2e] border border-[#434655]/30 rounded-xs">
            <p className="text-[10px] text-[#656d84] truncate">{proofUrl}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-3 bg-[#93000a]/10 border border-[#93000a]/30 rounded-xs flex items-center gap-3">
          <X className="w-4 h-4 text-[#ffb4ab] shrink-0" />
          <p className="text-sm text-[#ffb4ab]">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}