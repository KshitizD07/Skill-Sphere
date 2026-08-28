import { useState } from 'react';
import { Link, Check, X, Award } from 'lucide-react';
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
    } catch {
      setStatus('error');
      setErrorMsg('Failed to connect to verification server.');
    }

    setLoading(false);
  };

  return (
    <div className="p-6 bg-surface border border-outline-var/30 rounded-md max-w-md w-full shadow-2xl relative overflow-hidden font-outfit">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-secondary-bright via-primary to-primary-container" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-secondary-bright/8 rounded-xs border border-secondary-bright/15">
          <Award className="w-5 h-5 text-secondary-bright" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-text-primary tracking-tight">
            Proof: <span className="text-secondary-bright">{skillName}</span>
          </h3>
          <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">Credential & Certificate Linking</p>
        </div>
      </div>

      {status !== 'success' && (
        <div className="space-y-4">
          <div>
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">Evidence URL</label>
            <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-secondary-bright/50 transition-colors">
              <Link className="w-4 h-4 text-outline ml-3 shrink-0" />
              <input
                type="text"
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                placeholder="https://credly.com/certs/..."
                className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
              />
            </div>
            <p className="mt-2 text-[10px] text-outline leading-tight">
              Provide a link to your Credly badge, AWS certificate, or portfolio project.
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !proofUrl}
            className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-secondary-bright to-primary-container text-on-primary hover:opacity-90 shadow-lg shadow-primary-container/20"
          >
            {loading ? 'Attaching...' : 'Link Evidence'}
          </button>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 bg-secondary-bright/8 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary-bright/25">
            <Check className="w-7 h-7 text-secondary-bright" />
          </div>
          <h4 className="text-base font-extrabold text-text-primary mb-1 tracking-tight">Evidence Linked</h4>
          <p className="text-sm text-outline mb-2">
            Professional evidence attached to <span className="text-text-primary font-semibold">{skillName}</span>
          </p>
          <div className="p-2 bg-surface-mid border border-outline-var/30 rounded-xs">
            <p className="text-[10px] text-outline truncate">{proofUrl}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 p-3 bg-error-container/10 border border-error-container/30 rounded-xs flex items-center gap-3">
          <X className="w-4 h-4 text-error shrink-0" />
          <p className="text-sm text-error">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}