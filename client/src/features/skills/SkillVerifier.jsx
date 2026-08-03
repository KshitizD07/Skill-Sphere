import { useState } from 'react';
import { Shield, Github, Award, Check, X, Eye, Lock, ChevronLeft, Loader2 } from 'lucide-react';
import SkillAPI from './skillAPI';

export default function SkillVerifier({ userId, skillName, skillId, onVerifyComplete }) {
  const [method, setMethod] = useState(''); // '' | 'github' | 'leetcode' | 'certificate'
  const [inputValue, setInputValue] = useState('');
  const [isStealth, setIsStealth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [score, setScore] = useState(null);
  
  // LeetCode specific state
  const [lcStep, setLcStep] = useState(1); // 1: scan, 2: results
  const [lcScanData, setLcScanData] = useState(null);

  const resetState = () => {
    setInputValue('');
    setStatus('idle');
    setErrorMsg('');
    setLoading(false);
    setScore(null);
    setLcStep(1);
    setLcScanData(null);
  };

  const handleMethodSelect = (m) => {
    setMethod(m);
    resetState();
  };

  const handleBack = () => {
    if (method === 'leetcode' && lcStep === 2 && status !== 'success') {
      setLcStep(1);
      setStatus('idle');
      setErrorMsg('');
    } else {
      setMethod('');
      resetState();
    }
  };

  const handleVerifyGithub = async () => {
    if (!inputValue) return;
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const data = await SkillAPI.verifySkill(userId, skillName, inputValue, !isStealth);
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
    } catch {
      setStatus('error');
      setErrorMsg('An error occurred during verification.');
    }
    setLoading(false);
  };

  const handleScanLeetCode = async () => {
    if (!inputValue) return;
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const data = await SkillAPI.scanLeetCode(inputValue);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Scan failed.');
      } else if (data.success) {
        setLcScanData(data.data);
        setStatus('idle');
        setLcStep(2);
      } else {
        setStatus('error');
        setErrorMsg('Scan failed.');
      }
    } catch {
      setStatus('error');
      setErrorMsg('An error occurred during scan.');
    }
    setLoading(false);
  };

  const handleVerifyLeetCode = async () => {
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const data = await SkillAPI.verifyLeetCodeSkill(userId, skillName, inputValue, !isStealth);
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
    } catch {
      setStatus('error');
      setErrorMsg('An error occurred during verification.');
    }
    setLoading(false);
  };

  const handleVerifyCertificate = async () => {
    if (!inputValue) return;
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const isCredential = inputValue.includes('credly.com') || inputValue.includes('aws.amazon.com') || inputValue.includes('coursera.org');
      const source = isCredential ? 'CREDENTIAL' : 'MANUAL';
      const data = await SkillAPI.verifySkillManual(skillId, inputValue, source);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Verification failed.');
      } else {
        setStatus('success');
        onVerifyComplete?.(data);
      }
    } catch {
      setStatus('error');
      setErrorMsg('An error occurred during verification.');
    }
    setLoading(false);
  };

  const renderInitialView = () => (
    <div className="space-y-3">
      <button
        onClick={() => handleMethodSelect('github')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-primary/50 rounded-md transition-all flex items-center gap-4 text-left group"
      >
        <div className="p-3 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors">
          <Github className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-0.5">GitHub Repository</h4>
          <p className="text-xs text-outline">Analyze a repository</p>
        </div>
      </button>

      <button
        onClick={() => handleMethodSelect('leetcode')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-[#ffa116]/50 rounded-md transition-all flex items-center gap-4 text-left group"
      >
        <div className="p-3 bg-[#ffa116]/10 rounded-md group-hover:bg-[#ffa116]/20 transition-colors">
          <div className="font-bold text-xl text-[#ffa116] leading-none">LC</div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-0.5">LeetCode Profile</h4>
          <p className="text-xs text-outline">Scan your LeetCode stats</p>
        </div>
      </button>

      <button
        onClick={() => handleMethodSelect('certificate')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-secondary-bright/50 rounded-md transition-all flex items-center gap-4 text-left group"
      >
        <div className="p-3 bg-secondary-bright/10 rounded-md group-hover:bg-secondary-bright/20 transition-colors">
          <Award className="w-6 h-6 text-secondary-bright" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-0.5">Certificate/Credential</h4>
          <p className="text-xs text-outline">Link a certificate URL</p>
        </div>
      </button>
    </div>
  );

  const renderGithub = () => (
    <div className="space-y-4">
      <div>
        <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
          Repository URL
        </label>
        <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-primary/50 transition-colors">
          <Github className="w-4 h-4 text-[#656d84] ml-3 shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="https://github.com/username/project"
            className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
          />
        </div>
      </div>

      <div
        onClick={() => setIsStealth(!isStealth)}
        className="flex items-center justify-between p-3 bg-surface-mid/60 rounded-xs cursor-pointer hover:bg-surface-mid border border-outline-var/20 hover:border-outline-var/40 transition-all"
      >
        <div className="flex items-center gap-2">
          {isStealth ? <Lock className="w-4 h-4 text-[#bec6e0]" /> : <Eye className="w-4 h-4 text-secondary-bright" />}
          <span className="text-sm font-medium text-text-muted">
            {isStealth ? 'Private — Score hidden' : 'Public — Score visible'}
          </span>
        </div>
        <div className={`w-9 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-[#656d84]/30' : 'bg-[#29a195]/30'}`}>
          <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-5 bg-[#bec6e0]' : 'left-1 bg-secondary-bright'}`} />
        </div>
      </div>

      <button
        onClick={handleVerifyGithub}
        disabled={loading || !inputValue}
        className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90 shadow-lg shadow-primary-container/20"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify Skill'}
      </button>
    </div>
  );

  const renderLeetCode = () => {
    if (lcStep === 1) {
      return (
        <div className="space-y-4">
          <div>
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
              LeetCode Username
            </label>
            <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-[#ffa116]/50 transition-colors">
              <div className="ml-3 font-bold text-[#ffa116]">LC</div>
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="e.g., striver_79"
                className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
              />
            </div>
          </div>
          <button
            onClick={handleScanLeetCode}
            disabled={loading || !inputValue}
            className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#ffa116] to-[#e69114] text-white hover:opacity-90 shadow-lg shadow-[#ffa116]/20"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning LeetCode profile...</> : 'Scan Profile'}
          </button>
        </div>
      );
    }

    // Step 2: results
    const normalizedSkillName = skillName || '';
    const isDSAMatch = normalizedSkillName && (normalizedSkillName.toLowerCase() === 'data structures and algorithms' || normalizedSkillName.toLowerCase() === 'dsa');
    
    // Attempt to match skillName with languages
    const languages = lcScanData?.languages || [];
    const matchedLanguage = languages.find(l => l.name && l.name.toLowerCase() === normalizedSkillName.toLowerCase());
    
    const dsaData = lcScanData?.dsa;

    let primaryResult = null;
    let matchFound = false;

    if (isDSAMatch && dsaData) {
      matchFound = true;
      primaryResult = (
        <div className="mb-4 p-4 bg-surface-mid rounded-md border border-outline-var/50">
          <h4 className="text-sm font-bold text-text-primary mb-2">DSA Progress Detected</h4>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="p-2 bg-surface rounded-xs">
              <div className="text-[#00b8a3] font-bold">{dsaData.easy}</div>
              <div className="text-[10px] text-outline uppercase tracking-wider">Easy</div>
            </div>
            <div className="p-2 bg-surface rounded-xs">
              <div className="text-[#ffc01e] font-bold">{dsaData.medium}</div>
              <div className="text-[10px] text-outline uppercase tracking-wider">Medium</div>
            </div>
            <div className="p-2 bg-surface rounded-xs">
              <div className="text-[#ff375f] font-bold">{dsaData.hard}</div>
              <div className="text-[10px] text-outline uppercase tracking-wider">Hard</div>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-outline">Score</span>
            <span className="text-text-primary font-bold">{dsaData.score}/10</span>
          </div>
        </div>
      );
    } else if (matchedLanguage) {
      matchFound = true;
      primaryResult = (
        <div className="mb-4 p-4 bg-surface-mid rounded-md border border-[#ffa116]/30 flex items-center gap-3">
          <div className="p-2 bg-[#ffa116]/10 rounded-full">
            <Check className="w-5 h-5 text-[#ffa116]" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-text-primary">✓ {matchedLanguage.name}</div>
            <div className="text-xs text-outline">{matchedLanguage.problemsSolved} problems solved</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-outline uppercase font-syne tracking-wider">Score</div>
            <div className="text-lg font-bold text-text-primary">{matchedLanguage.score}/10</div>
          </div>
        </div>
      );
    } else {
      primaryResult = (
        <div className="mb-4 p-3 bg-error-container/10 border border-error-container/30 rounded-xs flex items-center gap-3">
          <X className="w-4 h-4 text-error shrink-0" />
          <p className="text-sm text-error">No matching data found for {skillName || 'this skill'}.</p>
        </div>
      );
    }

    const otherLanguages = languages.filter(l => l.name && l.name.toLowerCase() !== normalizedSkillName.toLowerCase());

    return (
      <div className="space-y-4">
        {primaryResult}

        {otherLanguages.length > 0 && (
          <div className="mb-4">
            <h5 className="text-[10px] font-syne font-bold tracking-[0.12em] uppercase text-outline mb-2">Other Detected Languages</h5>
            <div className="flex flex-wrap gap-2">
              {otherLanguages.map(l => (
                <div key={l.name} className="px-2 py-1 bg-surface-mid/50 border border-outline-var/20 rounded-xs flex items-center gap-2 text-xs">
                  <span className="text-text-muted">{l.name}</span>
                  <span className="text-text-primary font-bold">{l.score}/10</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          onClick={() => setIsStealth(!isStealth)}
          className="flex items-center justify-between p-3 bg-surface-mid/60 rounded-xs cursor-pointer hover:bg-surface-mid border border-outline-var/20 hover:border-outline-var/40 transition-all"
        >
          <div className="flex items-center gap-2">
            {isStealth ? <Lock className="w-4 h-4 text-[#bec6e0]" /> : <Eye className="w-4 h-4 text-secondary-bright" />}
            <span className="text-sm font-medium text-text-muted">
              {isStealth ? 'Private — Score hidden' : 'Public — Score visible'}
            </span>
          </div>
          <div className={`w-9 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-[#656d84]/30' : 'bg-[#29a195]/30'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-5 bg-[#bec6e0]' : 'left-1 bg-secondary-bright'}`} />
          </div>
        </div>

        <button
          onClick={handleVerifyLeetCode}
          disabled={loading || !matchFound}
          className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#ffa116] to-[#e69114] text-white hover:opacity-90 shadow-lg shadow-[#ffa116]/20"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Save'}
        </button>
      </div>
    );
  };

  const renderCertificate = () => (
    <div className="space-y-4">
      <div>
        <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
          Certificate URL
        </label>
        <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-secondary-bright/50 transition-colors">
          <Award className="w-4 h-4 text-secondary-bright ml-3 shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="https://credly.com/... or other URL"
            className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
          />
        </div>
      </div>

      <button
        onClick={handleVerifyCertificate}
        disabled={loading || !inputValue}
        className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-secondary-bright to-[#208a80] text-white hover:opacity-90 shadow-lg shadow-secondary-bright/20"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Linking...</> : 'Link Evidence'}
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-surface border border-outline-var/30 rounded-md max-w-md w-full shadow-2xl relative overflow-hidden font-outfit">
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary-container via-primary to-[#29a195]" />

      <div className="flex items-center gap-3 mb-6">
        {method && status !== 'success' ? (
          <button onClick={handleBack} className="p-2 hover:bg-surface-mid rounded-xs transition-colors text-outline hover:text-text-primary">
            <ChevronLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="p-2.5 bg-primary/8 rounded-xs border border-primary/15">
            <Shield className="w-5 h-5 text-primary" />
          </div>
        )}
        
        <div>
          <h3 className="text-base font-extrabold text-text-primary tracking-tight">
            Verify: <span className="text-primary">{skillName}</span>
          </h3>
          <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">Skill Verification</p>
        </div>
      </div>

      {status !== 'success' && !method && renderInitialView()}
      {status !== 'success' && method === 'github' && renderGithub()}
      {status !== 'success' && method === 'leetcode' && renderLeetCode()}
      {status !== 'success' && method === 'certificate' && renderCertificate()}

      {status === 'success' && (
        <div className="text-center py-5">
          <div className="w-14 h-14 bg-secondary-bright/8 rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary-bright/25">
            <Check className="w-7 h-7 text-secondary-bright" />
          </div>
          <h4 className="text-base font-extrabold text-text-primary mb-1 tracking-tight">Verified</h4>
          <p className="text-sm text-outline mb-5">
            Verification badge awarded for <span className="text-text-primary font-semibold">{skillName}</span>
          </p>
          {score !== null && (
            <div className="bg-surface-mid p-4 rounded-xs inline-block border border-outline-var/30">
              <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline mb-1">Verification Score</p>
              <p className="text-3xl font-extrabold text-text-primary tracking-tight">
                {isStealth ? <span className="text-[#656d84] text-xl">Private</span> : <>{score}<span className="text-base text-[#656d84]">/10</span></>}
              </p>
            </div>
          )}
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