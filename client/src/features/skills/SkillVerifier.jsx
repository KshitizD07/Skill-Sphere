import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Github, Award, Check, Eye, Lock, ChevronLeft,
  Loader2, Sparkles, CheckCircle2, AlertTriangle, ArrowRight,
  FolderGit2, Code2, RefreshCw, Cpu
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
  const [selectedBatchRepos, setSelectedBatchRepos] = useState([]);
  const [customRepoInput, setCustomRepoInput] = useState('');

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
        setSelectedBatchRepos(reposData.value.map((r) => r.url).filter(Boolean));
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
  const handleToggleBatchRepo = (url) => {
    setSelectedBatchRepos((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  const handleAddCustomBatchRepo = () => {
    if (!customRepoInput.trim()) return;
    let url = customRepoInput.trim();
    if (!url.startsWith('http')) url = `https://${url}`;
    if (!url.includes('github.com')) {
      toast.error('Please enter a valid GitHub repository URL');
      return;
    }
    if (!selectedBatchRepos.includes(url)) {
      setSelectedBatchRepos((prev) => [...prev, url]);
      toast.success('Added repository to scan pool');
    }
    setCustomRepoInput('');
  };

  const handleRunBatchVerify = async () => {
    if (selectedBatchRepos.length === 0 && userRepos.length === 0) {
      toast.error('Please select or add at least one GitHub repository to scan.');
      return;
    }

    setIsBatchRunning(true);
    setStatus('scanning');
    setErrorMsg('');
    try {
      const res = await SkillAPI.batchVerify(selectedBatchRepos);
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
        return 'text-[#8B6E4E] bg-[#8B6E4E]/10 border-[#8B6E4E]/30';
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
    <div className="space-y-2.5 font-outfit">
      <button
        onClick={() => handleMethodSelect('github')}
        className="w-full p-4 bg-surface border border-outline-var/30 hover:border-primary/50 rounded-lg transition-all flex items-center gap-3.5 text-left group hover:bg-surface-mid/40 shadow-xs"
      >
        <div className="p-2.5 bg-surface-mid rounded-md group-hover:bg-primary/10 transition-colors shrink-0 text-text-primary group-hover:text-primary">
          <Github className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">GitHub Repository Audit</h4>
          </div>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-outfit">
            Gemini AI evaluates repository architecture, complexity, and code quality (1–10).
          </p>
        </div>
        <ArrowRight size={15} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('batch')}
        className="w-full p-4 bg-surface border border-outline-var/30 hover:border-accent/50 rounded-lg transition-all flex items-center gap-3.5 text-left group hover:bg-surface-mid/40 shadow-xs"
      >
        <div className="p-2.5 bg-surface-mid rounded-md group-hover:bg-accent/10 transition-colors shrink-0 text-text-primary group-hover:text-accent">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-text-primary">Auto-Discovery Batch Scan</h4>
          </div>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-outfit">
            Cross-reference all profile skills against your synced GitHub repositories.
          </p>
        </div>
        <ArrowRight size={15} className="text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('leetcode')}
        className="w-full p-4 bg-surface border border-outline-var/30 hover:border-outline-var/60 rounded-lg transition-all flex items-center gap-3.5 text-left group hover:bg-surface-mid/40 shadow-xs"
      >
        <div className="p-2.5 bg-surface-mid rounded-md transition-colors shrink-0 text-text-primary">
          <div className="font-bold text-base leading-none">LC</div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">LeetCode Profile Stats</h4>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-outfit">
            Verify DSA and algorithmic problem-solving scores directly from your LeetCode profile.
          </p>
        </div>
        <ArrowRight size={15} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>

      <button
        onClick={() => handleMethodSelect('certificate')}
        className="w-full p-4 bg-surface border border-outline-var/30 hover:border-outline-var/60 rounded-lg transition-all flex items-center gap-3.5 text-left group hover:bg-surface-mid/40 shadow-xs"
      >
        <div className="p-2.5 bg-surface-mid rounded-md transition-colors shrink-0 text-text-primary">
          <Award className="w-5 h-5 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-text-primary">Certificate / Credential Link</h4>
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed font-outfit">
            Attach verified credentials from Credly, AWS, Coursera, or custom certifications.
          </p>
        </div>
        <ArrowRight size={15} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </button>
    </div>
  );

  // ── RENDER: GitHub Verification Form ──────────────────────────────────────
  const renderGithub = () => (
    <div className="space-y-4 font-outfit">
      {/* Skill Selector */}
      <div>
        <label className="block font-outfit text-xs font-semibold text-text-muted mb-1.5">
          Target Skill to Verify
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="e.g. React, Node.js, Python, TypeScript"
            className="flex-1 bg-surface-mid border border-outline-var/40 focus:border-primary/60 text-text-primary p-3 rounded-lg text-sm outline-none placeholder-outline-var font-outfit"
          />
        </div>
        {userSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-xs text-text-muted font-outfit mr-1">Your Skills:</span>
            {userSkills.slice(0, 6).map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setSkillName(s.name);
                  setSkillId(s.id);
                }}
                className={`px-2.5 py-1 text-xs font-outfit font-medium rounded-md border transition-colors ${
                  skillName.toLowerCase() === s.name.toLowerCase()
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface text-text-muted border-outline-var/30 hover:border-outline-var/60 hover:text-text-primary'
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
        <div className="p-3 bg-surface-mid border border-outline-var/40 rounded-lg flex items-start gap-2.5">
          <div className="text-xs text-text-muted leading-relaxed font-outfit">
            <p className="font-semibold text-text-primary mb-0.5">Re-verification Cooldown Active</p>
            <p>
              This skill was verified recently (Score: {cooldownData.currentScore}/10). Re-verification opens in{' '}
              <strong>{cooldownData.daysRemaining} day(s)</strong>.
            </p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-text-primary font-medium">
              <input
                type="checkbox"
                checked={forceReverify}
                onChange={(e) => setForceReverify(e.target.checked)}
                className="rounded text-primary focus:ring-0"
              />
              Override cooldown for major repository updates
            </label>
          </div>
        </div>
      )}

      {/* Repository URL Input */}
      <div>
        <label className="block font-outfit text-xs font-semibold text-text-muted mb-1.5">
          Public GitHub Repository URL
        </label>
        <div className="flex items-center bg-surface-mid rounded-lg border border-outline-var/40 focus-within:border-primary/60 transition-colors">
          <Github className="w-4 h-4 text-text-muted ml-3 shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="https://github.com/username/repository-name"
            className="w-full bg-transparent p-3 text-sm text-text-primary outline-none placeholder-outline-var font-outfit"
          />
        </div>
        {/* Quick repository suggestions */}
        {userRepos.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-text-muted font-outfit block mb-1">Synced Repositories:</span>
            <div className="flex flex-wrap gap-1.5">
              {userRepos.slice(0, 4).map((r) => (
                <button
                  key={r.id || r.repoName}
                  type="button"
                  onClick={() => setInputValue(r.url)}
                  className={`px-2.5 py-1 text-xs font-outfit rounded-md border transition-colors flex items-center gap-1.5 ${
                    inputValue === r.url
                      ? 'bg-primary/10 text-primary border-primary/40 font-medium'
                      : 'bg-surface text-text-muted border-outline-var/30 hover:border-outline-var/60 hover:text-text-primary'
                  }`}
                >
                  <FolderGit2 size={11} /> {r.repoName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stealth Toggle */}
      <div
        onClick={() => setIsStealth(!isStealth)}
        className="flex items-center justify-between p-3 bg-surface-mid/40 rounded-lg cursor-pointer hover:bg-surface-mid border border-outline-var/25 hover:border-outline-var/40 transition-all"
      >
        <div className="flex items-center gap-2.5">
          {isStealth ? <Lock className="w-4 h-4 text-text-muted" /> : <Eye className="w-4 h-4 text-primary" />}
          <div>
            <span className="text-xs font-semibold text-text-primary block font-outfit">
              {isStealth ? 'Private Score (Checkmark badge only)' : 'Public Score (Numerical score visible)'}
            </span>
            <span className="text-xs text-text-muted font-outfit">Can be modified anytime in your profile settings.</span>
          </div>
        </div>
        <div className={`w-8 h-4.5 rounded-full relative transition-colors ${isStealth ? 'bg-outline-var/50' : 'bg-primary/40'}`}>
          <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${isStealth ? 'left-4 bg-outline-var' : 'left-0.5 bg-primary'}`} />
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleVerifyGithub}
        disabled={loading || !inputValue || !skillName || (cooldownData?.hasCooldown && !forceReverify)}
        className="w-full py-3 rounded-lg font-outfit font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dim text-on-primary shadow-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Verifying Repository...
          </>
        ) : (
          <>
            Start AI Skill Audit
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
                    : 'text-outline'
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
      <div className="space-y-4 font-outfit py-2">
        {/* Clean Score Display */}
        <div className="p-5 bg-surface border border-outline-var/30 rounded-lg flex items-center justify-between shadow-xs">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1 font-outfit">
              Verified Competency
            </div>
            <h3 className="text-xl font-bold text-text-primary tracking-tight font-syne">
              {skillName}
            </h3>
            <div className="mt-1">
              <span className={`px-2.5 py-0.5 rounded text-xs font-medium font-outfit inline-block ${getLevelColor(levelText)}`}>
                {levelText}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1 font-outfit">
              AI Score
            </div>
            <div className="text-3xl font-extrabold text-text-primary tracking-tight font-outfit">
              {scoreVal}<span className="text-sm font-normal text-text-muted">/10</span>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {res?.reasoning && (
          <div className="p-4 bg-surface-mid/50 border border-outline-var/25 rounded-lg">
            <h5 className="font-outfit text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Evaluation Summary
            </h5>
            <p className="text-xs text-text-muted leading-relaxed font-outfit">{res.reasoning}</p>
          </div>
        )}

        {/* Evidence points */}
        {Array.isArray(res?.evidence) && res.evidence.length > 0 && (
          <div className="p-4 bg-surface-mid/50 border border-outline-var/25 rounded-lg">
            <h5 className="font-outfit text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Code Evidence
            </h5>
            <ul className="space-y-1.5 font-outfit">
              {res.evidence.map((ev, i) => (
                <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                  <Check size={13} className="text-accent shrink-0 mt-0.5" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Auto-discovered secondary skills */}
        {Array.isArray(res?.verifiedSkills) && res.verifiedSkills.length > 1 && (
          <div className="p-4 bg-surface-mid/50 border border-outline-var/25 rounded-lg">
            <div className="font-outfit font-semibold text-xs uppercase tracking-wider text-text-muted mb-1.5">
              Discovered Skills in Repository
            </div>
            <p className="text-xs text-text-muted mb-2 font-outfit">
              The following additional skills were verified from the same code audit:
            </p>
            <div className="flex flex-wrap gap-1.5 font-outfit">
              {res.verifiedSkills.filter((s) => s.skillName.toLowerCase() !== skillName.toLowerCase()).map((s) => (
                <span
                  key={s.skillName}
                  className="px-2.5 py-0.5 bg-surface text-text-primary border border-outline-var/30 rounded text-xs font-medium"
                >
                  {s.skillName} · {s.score}/10
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2">
          <button
            onClick={resetState}
            className="w-full py-2.5 bg-surface border border-outline-var/30 hover:border-outline-var/60 text-text-primary text-xs font-semibold font-outfit rounded-lg transition-all flex items-center justify-center gap-2 shadow-xs"
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
        <h4 className="text-sm font-semibold text-text-primary mb-1">Repository Auto-Discovery</h4>
        <p className="text-xs text-text-muted leading-relaxed font-outfit">
          SkillSphere scans your linked GitHub repositories and automatically matches code patterns against unverified skills on your profile.
        </p>
      </div>

      {userSkills.filter((s) => !s.isVerified).length > 0 ? (
        <div className="p-3 bg-surface-mid/60 border border-outline-var/30 rounded-lg">
          <div className="font-outfit text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Target Unverified Skills ({userSkills.filter((s) => !s.isVerified).length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {userSkills.filter((s) => !s.isVerified).map((s) => (
              <span key={s.name} className="px-2.5 py-0.5 bg-surface border border-outline-var/40 text-text-muted text-xs font-medium rounded-md">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-accent-container/30 border border-accent/20 rounded-lg text-center">
          <CheckCircle2 size={20} className="text-accent mx-auto mb-1" />
          <p className="text-xs font-semibold text-text-primary">All Profile Skills Are Verified!</p>
        </div>
      )}

      {/* Repository Selection Pool */}
      <div className="p-4 bg-surface border border-outline-var/30 rounded-lg space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="font-outfit text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            Repositories To Scan ({selectedBatchRepos.length} selected)
          </label>
        </div>

        {/* List of available/synced repos */}
        {userRepos.length > 0 ? (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {userRepos.map((repo) => {
              const isChecked = selectedBatchRepos.includes(repo.url);
              return (
                <label
                  key={repo.id || repo.url}
                  className={`p-2 border rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-primary/5 border-primary/30 text-text-primary'
                      : 'bg-surface-mid/40 border-outline-var/20 text-text-muted hover:border-outline-var/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleBatchRepo(repo.url)}
                      className="accent-primary rounded cursor-pointer shrink-0"
                    />
                    <span className="font-medium truncate font-outfit">{repo.repoName || repo.name}</span>
                    {repo.primaryLanguage && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-surface border border-outline-var/30 text-text-muted rounded shrink-0 font-outfit">
                        {repo.primaryLanguage}
                      </span>
                    )}
                  </div>
                  {repo.stars > 0 && (
                    <span className="text-[11px] text-text-muted shrink-0 font-outfit">★ {repo.stars}</span>
                  )}
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic font-outfit">
            No synced repositories found in database. You can add specific repository URLs below.
          </p>
        )}

        {/* Add custom repo URL */}
        <div className="pt-2 border-t border-outline-var/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={customRepoInput}
              onChange={(e) => setCustomRepoInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomBatchRepo(); } }}
              placeholder="Add GitHub repo (e.g. github.com/user/project)"
              className="flex-1 bg-surface-mid p-2 text-xs text-text-primary outline-none border border-outline-var/40 rounded-lg placeholder-outline-var font-outfit"
            />
            <button
              type="button"
              onClick={handleAddCustomBatchRepo}
              className="px-3 py-2 bg-surface-mid border border-outline-var/40 hover:border-primary text-text-primary text-xs font-semibold rounded-lg transition-colors shrink-0 font-outfit"
            >
              Add Repo
            </button>
          </div>
        </div>
      </div>

      {batchResults && (
        <div className="space-y-2 mt-4 font-outfit">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted">Scan Results:</div>
          {batchResults.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                r.success
                  ? 'bg-accent-container/20 border-accent/30 text-text-primary'
                  : 'bg-surface-mid border-outline-var/30 text-text-muted'
              }`}
            >
              <div className="min-w-0">
                <span className="font-semibold text-text-primary block font-outfit">{r.skillName}</span>
                <span className="text-xs text-text-muted truncate block font-outfit">{r.repoUrl || r.error}</span>
              </div>
              {r.success && (
                <div className="font-outfit font-semibold text-xs px-2.5 py-0.5 bg-surface rounded border border-accent/30 shrink-0 text-accent">
                  {r.score}/10 — {r.level}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleRunBatchVerify}
        disabled={isBatchRunning || (selectedBatchRepos.length === 0 && userRepos.length === 0)}
        className="w-full py-3 bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-sm rounded-lg transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
      >
        {isBatchRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Running Batch Auto-Discovery...
          </>
        ) : (
          'Run Auto-Discovery Scan'
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
            <label className="block font-outfit text-xs font-semibold text-text-muted mb-1.5">
              LeetCode Username
            </label>
            <div className="flex items-center bg-surface-mid rounded-lg border border-outline-var/40 focus-within:border-primary/60 transition-colors">
              <div className="ml-3 font-bold text-text-muted text-xs">LC</div>
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
            className="w-full py-3 rounded-lg font-outfit font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dim text-on-primary shadow-xs"
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
        <div className="p-4 bg-surface-mid rounded-lg border border-outline-var/30">
          <h4 className="text-sm font-semibold text-text-primary mb-2 font-outfit">LeetCode Profile Verified</h4>
          {dsaData && (
            <div className="grid grid-cols-3 gap-2 mb-3 text-center font-outfit">
              <div className="p-2 bg-surface rounded-md border border-outline-var/20">
                <div className="text-accent font-bold">{dsaData.easy}</div>
                <div className="text-xs text-text-muted">Easy</div>
              </div>
              <div className="p-2 bg-surface rounded-md border border-outline-var/20">
                <div className="text-primary font-bold">{dsaData.medium}</div>
                <div className="text-xs text-text-muted">Medium</div>
              </div>
              <div className="p-2 bg-surface rounded-md border border-outline-var/20">
                <div className="text-error font-bold">{dsaData.hard}</div>
                <div className="text-xs text-text-muted">Hard</div>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-semibold text-text-primary font-outfit">
            <span>Calculated Score:</span>
            <span>{dsaData?.score || 5}/10</span>
          </div>
        </div>

        <button
          onClick={handleVerifyLeetCode}
          disabled={loading}
          className="w-full py-3 bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-sm rounded-lg transition"
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
        <label className="block font-outfit text-xs font-semibold text-text-muted mb-1.5">
          Certificate / Credential URL
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="https://credly.com/badges/..."
          className="w-full bg-surface-mid border border-outline-var/40 focus:border-primary/60 text-text-primary p-3 rounded-lg text-sm outline-none placeholder-outline-var font-outfit"
        />
        <p className="text-xs text-text-muted mt-1.5 font-outfit">
          Supported: Credly, AWS Certifications, Coursera, or professional license links.
        </p>
      </div>

      <button
        onClick={handleVerifyCertificate}
        disabled={loading || !inputValue}
        className="w-full py-3 bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? 'Verifying Link...' : 'Attach Certificate Evidence'}
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-surface border border-outline-var/30 rounded-xl max-w-lg w-full shadow-xl relative overflow-hidden font-outfit">
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-outline-var/20">
        <div className="flex items-center gap-3">
          {method && (
            <button
              onClick={handleBack}
              className="p-1.5 text-text-muted hover:text-text-primary border border-outline-var/30 hover:border-outline-var/60 rounded-md transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="p-2 bg-primary/10 rounded-md text-primary">
            <Shield size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary tracking-tight font-syne">
              Skill Verification
            </h3>
            <p className="font-outfit text-xs font-semibold uppercase tracking-wider text-text-muted">
              {method ? `${method.toUpperCase()} PROTOCOL` : 'SELECT VERIFICATION PROTOCOL'}
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
