import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Github, Award, Check, X, Eye, Lock, ChevronLeft,
  Loader2, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  FolderGit2, Code2, RefreshCw, Cpu, Layers, ExternalLink
} from 'lucide-react';
import SkillAPI from './skillAPI';
import PortfolioAPI from '../portfolio/portfolioAPI';
import { useToast, ToastContainer } from '../../shared/components/Toast';

export default function SkillVerifier({ userId, skillName: initialSkillName, skillId: initialSkillId, onVerifyComplete }) {
  const toast = useToast();

  const [method, setMethod] = useState(''); // '' | 'github' | 'batch' | 'leetcode' | 'certificate'
  const [skillName, setSkillName] = useState(initialSkillName || '');
  const [skillId, setSkillId] = useState(initialSkillId || '');
  const [userSkills, setUserSkills] = useState([]);
  const [userRepos, setUserRepos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isStealth, setIsStealth] = useState(false);
  const [forceReverify, setForceReverify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanningStep, setScanningStep] = useState(0); // 0: Init, 1: Validating Repo, 2: Sampling Code, 3: AI Analysis, 4: Saving
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [cooldownData, setCooldownData] = useState(null);

  // Batch auto-discovery state
  const [batchResults, setBatchResults] = useState(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  // LeetCode state
  const [lcStep, setLcStep] = useState(1);
  const [lcScanData, setLcScanData] = useState(null);

  // Load user skills & user repos for quick selection
  const loadUserContext = useCallback(async () => {
    try {
      const [skillsData, reposData] = await Promise.allSettled([
        SkillAPI.getMySkills(),
        PortfolioAPI.getRepos(),
      ]);
      if (skillsData.status === 'fulfilled' && Array.isArray(skillsData.value)) {
        setUserSkills(skillsData.value);
        if (!initialSkillName && skillsData.value.length > 0) {
          const firstUnverified = skillsData.value.find((s) => !s.isVerified);
          if (firstUnverified) {
            setSkillName(firstUnverified.name);
            setSkillId(firstUnverified.id);
          }
        }
      }
      if (reposData.status === 'fulfilled' && Array.isArray(reposData.value)) {
        setUserRepos(reposData.value);
      }
    } catch {
      // Non-critical fallback
    }
  }, [initialSkillName]);

  useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  // Check cooldown when skillName changes
  useEffect(() => {
    if (skillName && method === 'github') {
      SkillAPI.checkCooldown(skillName)
        .then((data) => setCooldownData(data))
        .catch(() => setCooldownData(null));
    }
  }, [skillName, method]);

  const resetState = () => {
    setInputValue('');
    setStatus('idle');
    setErrorMsg('');
    setLoading(false);
    setScanningStep(0);
    setVerificationResult(null);
    setLcStep(1);
    setLcScanData(null);
    setForceReverify(false);
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
    } else if (status === 'success') {
      resetState();
    } else {
      setMethod('');
      resetState();
    }
  };

  // ── GitHub Verification Pipeline ──────────────────────────────────────────
  const handleVerifyGithub = async () => {
    if (!inputValue || !skillName) {
      toast.error('Please specify both skill name and GitHub repository URL.');
      return;
    }

    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');
    setScanningStep(1);

    // Simulated progress transitions for UI clarity
    const timer1 = setTimeout(() => setScanningStep(2), 1200);
    const timer2 = setTimeout(() => setScanningStep(3), 2800);

    try {
      const data = await SkillAPI.verifySkill(
        userId,
        skillName,
        inputValue.trim(),
        !isStealth,
        forceReverify
      );

      clearTimeout(timer1);
      clearTimeout(timer2);
      setScanningStep(4);

      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Verification failed.');
        toast.error(data.message || 'Verification failed.');
      } else if (data.success) {
        setStatus('success');
        setVerificationResult(data);
        toast.success(`Verified ${skillName} (${data.score}/10 — ${data.level})!`, { title: 'Skill Verified' });
        onVerifyComplete?.(data);
      } else {
        setStatus('error');
        setErrorMsg('Verification failed.');
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setStatus('error');
      const msg = err.message || 'An error occurred during verification.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-Discovery Batch Scan ─────────────────────────────────────────────
  const handleRunBatchVerify = async () => {
    setIsBatchRunning(true);
    setStatus('scanning');
    setErrorMsg('');
    try {
      const res = await SkillAPI.batchVerify();
      if (res.success) {
        setBatchResults(res.results || []);
        setStatus('success');
        toast.success('Auto-discovery batch scan completed!', { title: 'Batch Verification' });
        onVerifyComplete?.(res);
      } else {
        setStatus('error');
        setErrorMsg(res.message || 'Batch verification failed.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Batch verification failed.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  // ── LeetCode Scan & Verification ──────────────────────────────────────────
  const handleScanLeetCode = async () => {
    if (!inputValue) return;
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const data = await SkillAPI.scanLeetCode(inputValue.trim());
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Scan failed.');
        toast.error(data.message || 'Scan failed.');
      } else if (data.success) {
        setLcScanData(data);
        setStatus('idle');
        setLcStep(2);
        toast.success('LeetCode profile scanned!', { title: 'Scan Succeeded' });
      } else {
        setStatus('error');
        setErrorMsg('Scan failed.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during scan.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLeetCode = async () => {
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const data = await SkillAPI.verifyLeetCodeSkill(userId, skillName, inputValue.trim(), !isStealth);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Verification failed.');
        toast.error(data.message || 'Verification failed.');
      } else if (data.success) {
        setStatus('success');
        setVerificationResult(data);
        toast.success(`LeetCode verified for ${skillName}!`);
        onVerifyComplete?.(data);
      } else {
        setStatus('error');
        setErrorMsg('Verification failed.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  // ── Manual / Certificate Verification ─────────────────────────────────────
  const handleVerifyCertificate = async () => {
    if (!inputValue) return;
    setLoading(true);
    setStatus('scanning');
    setErrorMsg('');

    try {
      const isCredential =
        inputValue.includes('credly.com') ||
        inputValue.includes('aws.amazon.com') ||
        inputValue.includes('coursera.org');
      const source = isCredential ? 'CREDENTIAL' : 'MANUAL';
      const data = await SkillAPI.verifySkillManual(skillId, inputValue.trim(), source);
      if (data.error) {
        setStatus('error');
        setErrorMsg(data.message || 'Verification failed.');
        toast.error(data.message || 'Verification failed.');
      } else {
        setStatus('success');
        toast.success('Certificate link attached and verified!');
        onVerifyComplete?.(data);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  // ── Level Badge Helper ────────────────────────────────────────────────────
  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'expert':
        return 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30';
      case 'advanced':
        return 'text-secondary-bright bg-secondary-bright/10 border-secondary-bright/30';
      case 'intermediate':
        return 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
      default:
        return 'text-primary bg-primary/10 border-primary/30';
    }
  };

  // ── RENDER: Method Selection Screen ───────────────────────────────────────
  const renderInitialView = () => (
    <div className="space-y-3 font-outfit">
      <button
        onClick={() => handleMethodSelect('github')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-primary/50 rounded-md transition-all flex items-center gap-4 text-left group hover:bg-surface-mid"
      >
        <div className="p-3 bg-primary/10 rounded-md group-hover:bg-primary/20 transition-colors shrink-0">
          <Github className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-text-primary">GitHub Repository Audit</h4>
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[9px] font-syne font-bold uppercase rounded-xs">
              AI Powered
            </span>
          </div>
          <p className="text-xs text-outline mt-0.5">
            Submit a repository URL. Gemini AI evaluates architecture, complexity, and code quality (Score 1–10).
          </p>
        </div>
        <ArrowRight size={16} className="text-outline group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('batch')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-secondary-bright/50 rounded-md transition-all flex items-center gap-4 text-left group hover:bg-surface-mid"
      >
        <div className="p-3 bg-secondary-bright/10 rounded-md group-hover:bg-secondary-bright/20 transition-colors shrink-0">
          <Sparkles className="w-6 h-6 text-secondary-bright" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-text-primary">Auto-Discovery Batch Scan</h4>
            <span className="px-1.5 py-0.5 bg-secondary-bright/10 text-secondary-bright border border-secondary-bright/20 text-[9px] font-syne font-bold uppercase rounded-xs">
              Instant Match
            </span>
          </div>
          <p className="text-xs text-outline mt-0.5">
            Automatically cross-reference all your profile skills against your synced GitHub repositories.
          </p>
        </div>
        <ArrowRight size={16} className="text-outline group-hover:text-secondary-bright group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('leetcode')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-[#ffa116]/50 rounded-md transition-all flex items-center gap-4 text-left group hover:bg-surface-mid"
      >
        <div className="p-3 bg-[#ffa116]/10 rounded-md group-hover:bg-[#ffa116]/20 transition-colors shrink-0">
          <div className="font-bold text-xl text-[#ffa116] leading-none">LC</div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-text-primary">LeetCode Profile Stats</h4>
          <p className="text-xs text-outline mt-0.5">
            Verify DSA and algorithmic problem-solving scores directly from your LeetCode profile.
          </p>
        </div>
        <ArrowRight size={16} className="text-outline group-hover:text-[#ffa116] group-hover:translate-x-1 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('certificate')}
        className="w-full p-4 bg-surface-mid/50 border border-outline-var/30 hover:border-secondary-bright/50 rounded-md transition-all flex items-center gap-4 text-left group hover:bg-surface-mid"
      >
        <div className="p-3 bg-secondary-bright/10 rounded-md group-hover:bg-secondary-bright/20 transition-colors shrink-0">
          <Award className="w-6 h-6 text-secondary-bright" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-text-primary">Certificate / Credential Link</h4>
          <p className="text-xs text-outline mt-0.5">
            Attach verified credentials from Credly, AWS, Coursera, or custom certifications.
          </p>
        </div>
        <ArrowRight size={16} className="text-outline group-hover:text-secondary-bright group-hover:translate-x-1 transition-all shrink-0" />
      </button>
    </div>
  );

  // ── RENDER: GitHub Verification Form ──────────────────────────────────────
  const renderGithub = () => (
    <div className="space-y-5 font-outfit">
      {/* Skill Selector */}
      <div>
        <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
          Target Skill to Verify
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="e.g. React, Node.js, Python, TypeScript"
            className="flex-1 bg-surface-mid border border-outline-var/40 focus:border-primary/60 text-text-primary p-3 rounded-xs text-sm outline-none placeholder-outline-var"
          />
        </div>
        {userSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] text-outline font-syne uppercase self-center mr-1">Your Skills:</span>
            {userSkills.slice(0, 6).map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setSkillName(s.name);
                  setSkillId(s.id);
                }}
                className={`px-2 py-0.5 text-[10px] font-syne font-bold uppercase rounded-xs border transition-colors ${
                  skillName.toLowerCase() === s.name.toLowerCase()
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-mid text-text-muted border-outline-var/30 hover:border-primary/40'
                }`}
              >
                {s.name} {s.isVerified && '✓'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cooldown Alert */}
      {cooldownData?.hasCooldown && (
        <div className="p-3.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="text-xs text-text-muted leading-relaxed">
            <p className="font-bold text-text-primary mb-0.5">Re-verification Cooldown Active</p>
            <p>
              This skill was verified recently (Score: {cooldownData.currentScore}/10). Standard re-verification is available in{' '}
              <strong className="text-[#f59e0b]">{cooldownData.daysRemaining} day(s)</strong>.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-[11px] text-text-primary font-semibold">
              <input
                type="checkbox"
                checked={forceReverify}
                onChange={(e) => setForceReverify(e.target.checked)}
                className="rounded text-primary focus:ring-0"
              />
              Override cooldown for major code changes
            </label>
          </div>
        </div>
      )}

      {/* Repository URL Input */}
      <div>
        <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
          Public GitHub Repository URL
        </label>
        <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-primary/60 transition-colors">
          <Github className="w-4 h-4 text-outline ml-3 shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="https://github.com/username/repository-name"
            className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var"
          />
        </div>
        {/* Quick repository suggestions */}
        {userRepos.length > 0 && (
          <div className="mt-2">
            <span className="text-[10px] text-outline font-syne uppercase block mb-1">Synced Repositories:</span>
            <div className="flex flex-wrap gap-1.5">
              {userRepos.slice(0, 4).map((r) => (
                <button
                  key={r.id || r.repoName}
                  type="button"
                  onClick={() => setInputValue(r.url)}
                  className={`px-2 py-1 text-[10px] font-mono rounded-xs border transition-colors flex items-center gap-1 ${
                    inputValue === r.url
                      ? 'bg-primary/10 text-primary border-primary/40'
                      : 'bg-surface-mid text-text-muted border-outline-var/30 hover:border-outline-var/60'
                  }`}
                >
                  <FolderGit2 size={10} /> {r.repoName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stealth Toggle */}
      <div
        onClick={() => setIsStealth(!isStealth)}
        className="flex items-center justify-between p-3.5 bg-surface-mid/60 rounded-xs cursor-pointer hover:bg-surface-mid border border-outline-var/20 hover:border-outline-var/40 transition-all"
      >
        <div className="flex items-center gap-2.5">
          {isStealth ? <Lock className="w-4 h-4 text-[#bec6e0]" /> : <Eye className="w-4 h-4 text-secondary-bright" />}
          <div>
            <span className="text-xs font-semibold text-text-primary block">
              {isStealth ? 'Private Score (Only checkmark badge shown)' : 'Public Score (Numerical score visible)'}
            </span>
            <span className="text-[10px] text-outline">You can change this visibility setting anytime in profile.</span>
          </div>
        </div>
        <div className={`w-9 h-5 rounded-full relative transition-colors ${isStealth ? 'bg-[#656d84]/30' : 'bg-[#29a195]/30'}`}>
          <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isStealth ? 'left-5 bg-[#bec6e0]' : 'left-1 bg-secondary-bright'}`} />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleVerifyGithub}
        disabled={loading || !inputValue || !skillName || (cooldownData?.hasCooldown && !forceReverify)}
        className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-on-primary hover:bg-secondary-bright shadow-lg shadow-primary/20"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying Repository...
          </>
        ) : (
          <>
            <Shield size={14} /> Start AI Skill Audit
          </>
        )}
      </button>
    </div>
  );

  // ── RENDER: Scanning Progress State ───────────────────────────────────────
  const renderScanningProgress = () => {
    const steps = [
      { num: 1, label: 'Validating repository integrity & commits' },
      { num: 2, label: 'Sampling multi-file architecture & dependencies' },
      { num: 3, label: 'Gemini AI evaluating patterns & complexity' },
      { num: 4, label: 'Finalizing verified score & credentials' },
    ];

    return (
      <div className="py-8 px-4 text-center space-y-6 font-outfit">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping opacity-25" />
          <div className="w-16 h-16 rounded-full border-2 border-primary/40 border-t-primary animate-spin flex items-center justify-center">
            <Cpu className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>

        <div>
          <h4 className="text-base font-extrabold text-text-primary tracking-tight mb-1">
            Analyzing <span className="text-primary">{skillName || 'Repository'}</span>
          </h4>
          <p className="text-xs text-outline">Please keep this window open while AI audits the codebase.</p>
        </div>

        <div className="max-w-xs mx-auto space-y-2.5 text-left">
          {steps.map((st) => {
            const isDone = scanningStep > st.num;
            const isCurrent = scanningStep === st.num;
            return (
              <div
                key={st.num}
                className={`flex items-center gap-3 text-xs p-2 rounded-xs transition-all ${
                  isDone
                    ? 'text-secondary-bright bg-secondary-bright/5'
                    : isCurrent
                    ? 'text-primary font-bold bg-primary/10 border border-primary/20'
                    : 'text-[#656d84]'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 size={14} className="text-secondary-bright shrink-0" />
                ) : isCurrent ? (
                  <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-outline-var/40 shrink-0" />
                )}
                <span>{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── RENDER: Success Result Card ───────────────────────────────────────────
  const renderSuccessResult = () => {
    const res = verificationResult;
    const scoreVal = res?.score || 0;
    const levelText = res?.level || 'Intermediate';

    return (
      <div className="space-y-5 font-outfit py-2">
        <div className="text-center">
          <div className="w-16 h-16 bg-secondary-bright/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-secondary-bright/30">
            <CheckCircle2 className="w-8 h-8 text-secondary-bright" />
          </div>
          <div className="inline-block px-2.5 py-0.5 rounded-xs border text-[10px] font-syne font-bold uppercase tracking-wider mb-1.5 bg-secondary-bright/10 text-secondary-bright border-secondary-bright/30">
            Verification Verified ✓
          </div>
          <h3 className="text-xl font-extrabold text-text-primary tracking-tight">
            {skillName} <span className="text-outline font-normal">Score</span>
          </h3>
        </div>

        {/* Score & Level Banner */}
        <div className="p-5 bg-surface-mid border border-outline-var/30 rounded-md flex items-center justify-between">
          <div>
            <div className="font-syne text-[10px] uppercase font-bold tracking-widest text-outline mb-1">
              Calculated Level
            </div>
            <div className={`px-3 py-1 rounded-xs border font-syne font-bold text-xs uppercase tracking-wider inline-block ${getLevelColor(levelText)}`}>
              {levelText}
            </div>
          </div>
          <div className="text-right">
            <div className="font-syne text-[10px] uppercase font-bold tracking-widest text-outline mb-1">
              AI Score
            </div>
            <div className="text-3xl font-black font-syne text-text-primary tracking-tight">
              {scoreVal}<span className="text-sm font-normal text-outline">/10</span>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {res?.reasoning && (
          <div className="p-4 bg-surface-mid/70 border border-outline-var/20 rounded-xs">
            <h5 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5 flex items-center gap-1.5">
              <Cpu size={12} className="text-primary" /> AI Evaluation Reasoning
            </h5>
            <p className="text-xs text-text-muted leading-relaxed">{res.reasoning}</p>
          </div>
        )}

        {/* Evidence points */}
        {Array.isArray(res?.evidence) && res.evidence.length > 0 && (
          <div className="p-4 bg-surface-mid/70 border border-outline-var/20 rounded-xs">
            <h5 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-2 flex items-center gap-1.5">
              <Code2 size={12} className="text-secondary-bright" /> Code Evidence
            </h5>
            <ul className="space-y-1.5">
              {res.evidence.map((ev, i) => (
                <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                  <Check size={12} className="text-secondary-bright shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto-discovered secondary skills banner */}
        {Array.isArray(res?.verifiedSkills) && res.verifiedSkills.length > 1 && (
          <div className="p-3.5 bg-primary/10 border border-primary/30 rounded-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-primary" />
              <span className="font-syne font-bold text-[10px] uppercase tracking-wider text-primary">
                Multi-Skill Auto-Discovery
              </span>
            </div>
            <p className="text-xs text-text-muted mb-2">
              The following additional skills were detected and verified from the same repository:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {res.verifiedSkills.filter((s) => s.skillName.toLowerCase() !== skillName.toLowerCase()).map((s) => (
                <span
                  key={s.skillName}
                  className="px-2 py-0.5 bg-surface text-secondary-bright border border-secondary-bright/30 rounded-xs text-[10px] font-syne font-bold uppercase flex items-center gap-1"
                >
                  <Check size={9} /> {s.skillName} ({s.score}/10)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={resetState}
            className="flex-1 py-2.5 bg-surface-mid border border-outline-var/40 hover:border-primary/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={12} /> Verify Another Skill
          </button>
        </div>
      </div>
    );
  };

  // ── RENDER: Batch Auto-Discovery View ─────────────────────────────────────
  const renderBatchView = () => (
    <div className="space-y-4 font-outfit">
      <div>
        <h4 className="text-sm font-bold text-text-primary mb-1">Repository Auto-Discovery</h4>
        <p className="text-xs text-text-muted leading-relaxed">
          SkillSphere scans your linked public GitHub repositories and automatically matches and verifies each unverified skill on your profile.
        </p>
      </div>

      {userSkills.filter((s) => !s.isVerified).length > 0 ? (
        <div className="p-3 bg-surface-mid border border-outline-var/30 rounded-xs">
          <div className="font-syne text-[10px] uppercase font-bold tracking-widest text-outline mb-2">
            Unverified Skills Queued for Discovery ({userSkills.filter((s) => !s.isVerified).length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {userSkills.filter((s) => !s.isVerified).map((s) => (
              <span key={s.name} className="px-2 py-0.5 bg-surface border border-outline-var/40 text-text-muted text-[10px] font-syne font-bold uppercase rounded-xs">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-secondary-bright/10 border border-secondary-bright/30 rounded-xs text-center">
          <CheckCircle2 size={24} className="text-secondary-bright mx-auto mb-1" />
          <p className="text-xs font-bold text-text-primary">All Profile Skills Are Verified!</p>
        </div>
      )}

      {batchResults && (
        <div className="space-y-2 mt-4">
          <div className="font-syne text-[10px] uppercase font-bold tracking-widest text-outline">Scan Results:</div>
          {batchResults.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-xs border text-xs flex items-center justify-between ${
                r.success
                  ? 'bg-secondary-bright/5 border-secondary-bright/30 text-secondary-bright'
                  : 'bg-surface-mid border-outline-var/30 text-text-muted'
              }`}
            >
              <div>
                <span className="font-bold text-text-primary block">{r.skillName}</span>
                <span className="text-[10px] text-outline">{r.repoUrl || r.error}</span>
              </div>
              {r.success && (
                <div className="font-syne font-bold text-xs uppercase px-2 py-0.5 bg-secondary-bright/10 rounded-xs border border-secondary-bright/30">
                  {r.score}/10 — {r.level}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleRunBatchVerify}
        disabled={isBatchRunning}
        className="w-full py-3 bg-secondary-bright text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-secondary-bright/20"
      >
        {isBatchRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Running Batch Auto-Discovery...
          </>
        ) : (
          <>
            <Sparkles size={14} /> Run Auto-Discovery Scan
          </>
        )}
      </button>
    </div>
  );

  // ── RENDER: LeetCode Verification View ────────────────────────────────────
  const renderLeetCode = () => {
    if (lcStep === 1) {
      return (
        <div className="space-y-4 font-outfit">
          <div>
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
              LeetCode Username
            </label>
            <div className="flex items-center bg-surface-mid rounded-xs border border-outline-var/40 focus-within:border-[#ffa116]/50 transition-colors">
              <div className="ml-3 font-bold text-[#ffa116]">LC</div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., username"
                className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
              />
            </div>
          </div>
          <button
            onClick={handleScanLeetCode}
            disabled={loading || !inputValue}
            className="w-full py-3 rounded-xs font-syne font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#ffa116] to-[#e69114] text-white hover:opacity-90 shadow-lg shadow-[#ffa116]/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning LeetCode profile...
              </>
            ) : (
              'Scan Profile'
            )}
          </button>
        </div>
      );
    }

    const dsaData = lcScanData?.dsa;
    return (
      <div className="space-y-4 font-outfit">
        <div className="p-4 bg-surface-mid rounded-md border border-outline-var/50">
          <h4 className="text-sm font-bold text-text-primary mb-2">LeetCode Profile Verified</h4>
          {dsaData && (
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
          )}
          <div className="flex justify-between items-center text-sm font-bold text-text-primary">
            <span>Calculated Score:</span>
            <span>{dsaData?.score || 5}/10</span>
          </div>
        </div>

        <button
          onClick={handleVerifyLeetCode}
          disabled={loading}
          className="w-full py-3 bg-[#ffa116] text-white font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:opacity-90 transition"
        >
          {loading ? 'Attaching to Profile...' : 'Confirm LeetCode Verification'}
        </button>
      </div>
    );
  };

  // ── RENDER: Certificate Linking View ──────────────────────────────────────
  const renderCertificate = () => (
    <div className="space-y-4 font-outfit">
      <div>
        <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
          Certificate / Credential URL
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="https://credly.com/badges/..."
          className="w-full bg-surface-mid border border-outline-var/40 focus:border-secondary-bright/60 text-text-primary p-3 rounded-xs text-sm outline-none placeholder-outline-var"
        />
        <p className="text-[10px] text-outline mt-1.5">
          Supported: Credly, AWS Certifications, Coursera, or professional license links.
        </p>
      </div>

      <button
        onClick={handleVerifyCertificate}
        disabled={loading || !inputValue}
        className="w-full py-3 bg-secondary-bright text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? 'Verifying Link...' : 'Attach Certificate Evidence'}
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-surface border border-outline-var/30 rounded-md max-w-lg w-full shadow-2xl relative overflow-hidden font-outfit">
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary-bright to-primary-container" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-var/20">
        <div className="flex items-center gap-3">
          {method && (
            <button
              onClick={handleBack}
              className="p-1.5 text-outline hover:text-text-primary border border-outline-var/30 hover:border-outline-var/60 rounded-xs transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="p-2.5 bg-primary/10 rounded-xs border border-primary/20 text-primary">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-text-primary tracking-tight">
              Skill Verification
            </h3>
            <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-outline">
              {method ? `${method.toUpperCase()} VERIFICATION` : 'SELECT VERIFICATION PROTOCOL'}
            </p>
          </div>
        </div>
      </div>

      {/* Body View */}
      {status === 'scanning' && method === 'github' ? (
        renderScanningProgress()
      ) : status === 'success' && method === 'github' ? (
        renderSuccessResult()
      ) : (
        <>
          {!method && renderInitialView()}
          {method === 'github' && renderGithub()}
          {method === 'batch' && renderBatchView()}
          {method === 'leetcode' && renderLeetCode()}
          {method === 'certificate' && renderCertificate()}
        </>
      )}

      {/* Error display */}
      {status === 'error' && errorMsg && (
        <div className="mt-4 p-3.5 bg-error/10 border border-error/30 rounded-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-xs text-error leading-relaxed">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
