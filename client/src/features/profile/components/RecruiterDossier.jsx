import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Clock, Building2, ExternalLink, 
  Github, Linkedin, MessageSquare, Mail, 
  Copy, Check, Terminal, Layers, 
  Code2, Star, GitFork, Shield, BookOpen
} from 'lucide-react';
import PortfolioAPI from '../../portfolio/portfolioAPI';
import ProjectShowcaseModal from '../../portfolio/ProjectShowcaseModal';

export default function RecruiterDossier({ user, isOwner }) {
  const navigate = useNavigate();
  const [activeMobileTab, setActiveMobileTab] = useState('overview'); // 'overview' | 'dsa' | 'projects' | 'skills'
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [showcaseModalOpen, setShowcaseModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch GitHub Showcase Repos
  const loadShowcase = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRepos(true);
    try {
      const data = await PortfolioAPI.getShowcase(user.id);
      setRepos(Array.isArray(data) ? data : []);
    } catch {
      setRepos([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadShowcase();
  }, [loadShowcase]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifiedSkills = user?.skills?.filter((s) => s.isVerified) || [];
  const declaredSkills = user?.skills?.filter((s) => !s.isVerified) || [];
  const leetcode = user?.leetcodeUsername ? user : null;
  const recentActivity = user?.activities?.some(
    (a) => Date.now() - new Date(a.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
  );

  // Calculate composite skill score average if verified skills exist
  const avgVerifiedScore = verifiedSkills.length > 0
    ? (verifiedSkills.reduce((acc, s) => acc + (Number(s.calculatedScore) || 7), 0) / verifiedSkills.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6 font-outfit text-text-primary">
      {/* ── 1. EXECUTIVE CANDIDATE HERO ─────────────────────────────────── */}
      <div className="relative bg-surface border border-outline-var/30 rounded-xl p-5 md:p-7 overflow-hidden shadow-2xl">
        {/* Glowing Ambient Gradient Background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-gradient-to-bl from-accent/15 via-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        {/* Recruiter Banner Badge */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-outline-var/20">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="font-syne font-black text-[11px] uppercase tracking-[0.15em] text-accent">
              Candidate Executive Dossier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-surface-mid hover:bg-surface-mid/80 border border-outline-var/30 text-text-muted hover:text-text-primary text-[11px] font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copy Profile Link"
            >
              {copied ? <Check size={12} className="text-accent" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-syne font-extrabold uppercase tracking-wider rounded-xs">
              Recruiter Mode
            </span>
          </div>
        </div>

        {/* Candidate Profile Details */}
        <div className="pt-6 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar with Status Glow */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-accent/40 overflow-hidden bg-surface-mid flex items-center justify-center shadow-lg">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="font-syne font-extrabold text-2xl text-accent">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border-2 border-surface flex items-center justify-center shadow-xs" title="Verified SkillSphere Candidate">
                <Shield size={12} className="text-accent fill-accent/20" />
              </div>
            </div>

            {/* Identity & Headline */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-syne font-black text-xl sm:text-2xl text-text-primary tracking-tight">
                  {user?.name || 'Anonymous Candidate'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-syne font-bold uppercase tracking-wider bg-accent/10 border border-accent/30 text-accent">
                  {user?.role === 'GUEST' ? `Guest ${user?.guestPersona || 'Student'}` : user?.role || 'Student'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-text-muted font-outfit max-w-xl leading-snug">
                {user?.headline || 'Full-Stack Engineer • Problem Solver'}
              </p>

              <div className="flex items-center gap-3 text-xs text-outline font-syne pt-1 flex-wrap">
                {user?.college && (
                  <span className="flex items-center gap-1.5 text-text-muted">
                    <Building2 size={13} className="text-primary" /> {user.college}
                  </span>
                )}
                <span className="text-outline-var">•</span>
                <span className="flex items-center gap-1.5 text-text-muted">
                  <Clock size={13} className={recentActivity ? 'text-accent' : 'text-outline'} />
                  {recentActivity ? 'Active This Month' : 'Recent Contributor'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Dock */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 shrink-0">
            {!isOwner && (
              <button
                type="button"
                onClick={() => navigate(`/chat/${user?.id}`)}
                className="px-5 py-2.5 bg-primary text-on-primary hover:bg-secondary-bright text-xs font-syne font-bold uppercase tracking-wider rounded-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare size={14} /> Direct Message
              </button>
            )}

            <div className="flex items-center gap-2 justify-center">
              {user?.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="p-2.5 bg-surface-mid hover:bg-surface-mid/80 border border-outline-var/40 hover:border-primary/40 text-text-muted hover:text-primary rounded-xs transition-colors cursor-pointer"
                  title={`Email ${user.name}`}
                >
                  <Mail size={15} />
                </a>
              )}
              {user?.github && (
                <a
                  href={`https://github.com/${user.github.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-surface-mid hover:bg-surface-mid/80 border border-outline-var/40 hover:border-primary/40 text-text-muted hover:text-primary rounded-xs transition-colors cursor-pointer"
                  title="GitHub Profile"
                >
                  <Github size={15} />
                </a>
              )}
              {user?.linkedin && (
                <a
                  href={user.linkedin.startsWith('http') ? user.linkedin : `https://linkedin.com/in/${user.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-surface-mid hover:bg-surface-mid/80 border border-outline-var/40 hover:border-blue-400 text-text-muted hover:text-blue-400 rounded-xs transition-colors cursor-pointer"
                  title="LinkedIn Profile"
                >
                  <Linkedin size={15} />
                </a>
              )}
              {leetcode?.leetcodeUsername && (
                <a
                  href={`https://leetcode.com/u/${leetcode.leetcodeUsername}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-surface-mid hover:bg-surface-mid/80 border border-outline-var/40 hover:border-[#f59e0b] text-text-muted hover:text-[#f59e0b] rounded-xs transition-colors cursor-pointer"
                  title="LeetCode Profile"
                >
                  <Code2 size={15} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. QUICK KPI STRIP ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-outline-var/20">
          <div className="p-3 bg-surface-mid/40 border border-outline-var/20 rounded-md">
            <span className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline">Verified Skills</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-syne font-black text-lg text-accent">{verifiedSkills.length}</span>
              <span className="text-[10px] text-text-muted font-mono">/ {user?.skills?.length || 0}</span>
            </div>
          </div>

          <div className="p-3 bg-surface-mid/40 border border-outline-var/20 rounded-md">
            <span className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline">DSA Score</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-syne font-black text-lg text-[#f59e0b]">
                {leetcode?.leetcodeDSAScore ?? 'N/A'}
              </span>
              {leetcode?.leetcodeDSALevel && (
                <span className="text-[10px] text-text-muted uppercase font-syne font-bold truncate">
                  {leetcode.leetcodeDSALevel}
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-surface-mid/40 border border-outline-var/20 rounded-md">
            <span className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline">Showcase Projects</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-syne font-black text-lg text-primary">{repos.length}</span>
              <span className="text-[10px] text-text-muted font-mono">Pinned</span>
            </div>
          </div>

          <div className="p-3 bg-surface-mid/40 border border-outline-var/20 rounded-md">
            <span className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline">Skill Index</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-syne font-black text-lg text-text-primary">
                {avgVerifiedScore ? `${avgVerifiedScore}/10` : 'Evaluated'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MOBILE SEGMENTED TAB SWITCHER (Zero Clutter on Small Screens) ── */}
      <div className="flex md:hidden items-center justify-between gap-1 p-1 bg-surface border border-outline-var/30 rounded-lg overflow-x-auto select-none">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'dsa', label: 'DSA & Code', icon: Code2 },
          { id: 'projects', label: 'Projects', icon: Terminal },
          { id: 'skills', label: 'Verified Skills', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveMobileTab(tab.id)}
              className={`flex-1 min-w-[75px] py-2 px-2 rounded-md font-syne font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-mid'
              }`}
            >
              <Icon size={12} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. BENTO GRID ARCHITECTURE (Desktop: 2-Column High Density | Mobile: Filtered Segment) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* ── LEFT COLUMN (6 cols on Desktop) ── */}
        <div className={`md:col-span-6 space-y-6 ${activeMobileTab !== 'overview' && activeMobileTab !== 'dsa' && activeMobileTab !== 'skills' ? 'hidden md:block' : ''}`}>
          
          {/* Card A: 🧠 Problem Solving & DSA Intelligence (LeetCode) */}
          {(activeMobileTab === 'overview' || activeMobileTab === 'dsa') && (
            <div className="bg-surface border border-[#f59e0b]/30 rounded-xl p-5 md:p-6 space-y-5 shadow-sm hover:border-[#f59e0b]/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xs bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b]">
                    <Code2 size={16} />
                  </div>
                  <div>
                    <h3 className="font-syne font-extrabold text-sm uppercase tracking-wide text-text-primary">
                      DSA & Problem Solving
                    </h3>
                    <p className="font-syne text-[10px] uppercase tracking-wider text-outline">
                      Algorithms Benchmark
                    </p>
                  </div>
                </div>

                {leetcode?.leetcodeUsername && (
                  <a
                    href={`https://leetcode.com/u/${leetcode.leetcodeUsername}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-mono text-xs text-[#f59e0b] hover:underline"
                  >
                    @{leetcode.leetcodeUsername} <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {leetcode ? (
                <div className="space-y-4">
                  {/* Easy / Medium / Hard Split */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 bg-secondary-bright/10 border border-secondary-bright/20 rounded-md text-center">
                      <span className="font-syne font-black text-lg text-secondary-bright">{leetcode.leetcodeEasy ?? 0}</span>
                      <span className="block font-syne text-[9px] uppercase font-bold tracking-wider text-outline mt-0.5">Easy</span>
                    </div>
                    <div className="p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-md text-center">
                      <span className="font-syne font-black text-lg text-[#f59e0b]">{leetcode.leetcodeMedium ?? 0}</span>
                      <span className="block font-syne text-[9px] uppercase font-bold tracking-wider text-outline mt-0.5">Medium</span>
                    </div>
                    <div className="p-3 bg-error/10 border border-error/20 rounded-md text-center">
                      <span className="font-syne font-black text-lg text-error">{leetcode.leetcodeHard ?? 0}</span>
                      <span className="block font-syne text-[9px] uppercase font-bold tracking-wider text-outline mt-0.5">Hard</span>
                    </div>
                  </div>

                  {/* DSA Score Metric */}
                  <div className="p-3.5 bg-surface-mid/60 border border-outline-var/25 rounded-md flex items-center justify-between">
                    <div>
                      <span className="font-syne text-[10px] uppercase font-bold text-outline">Evaluated DSA Rating</span>
                      <div className="font-syne font-black text-lg text-text-primary mt-0.5">
                        {leetcode.leetcodeDSAScore ?? 0} <span className="text-xs text-outline font-normal">/ 10</span>
                      </div>
                    </div>
                    {leetcode.leetcodeDSALevel && (
                      <span className="px-3 py-1 rounded-full text-xs font-syne font-bold uppercase tracking-wider bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                        {leetcode.leetcodeDSALevel}
                      </span>
                    )}
                  </div>

                  {/* Languages Used */}
                  {Array.isArray(leetcode.leetcodeLanguages) && leetcode.leetcodeLanguages.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="font-syne text-[10px] uppercase font-bold text-outline">Active Languages</span>
                      <div className="flex flex-wrap gap-1.5">
                        {leetcode.leetcodeLanguages.slice(0, 5).map((lang) => (
                          <span
                            key={lang.name}
                            className="px-2.5 py-1 bg-surface-mid border border-outline-var/30 text-text-muted text-[11px] font-mono rounded-xs"
                          >
                            {lang.name} <span className="text-primary font-bold">({lang.problemsSolved})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-surface-mid/30 border border-dashed border-outline-var/40 rounded-md text-center space-y-2">
                  <Code2 size={24} className="mx-auto text-outline" />
                  <p className="text-xs text-text-muted">LeetCode profile not linked by candidate yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Card B: 🛡️ Verified Skill Proof Matrix */}
          {(activeMobileTab === 'overview' || activeMobileTab === 'skills') && (
            <div className="bg-surface border border-accent/30 rounded-xl p-5 md:p-6 space-y-4 shadow-sm hover:border-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xs bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h3 className="font-syne font-extrabold text-sm uppercase tracking-wide text-text-primary">
                      Verified Skill Matrix
                    </h3>
                    <p className="font-syne text-[10px] uppercase tracking-wider text-outline">
                      Proven & Evaluated
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-syne font-extrabold uppercase bg-accent/10 text-accent border border-accent/30">
                  {verifiedSkills.length} Verified
                </span>
              </div>

              {verifiedSkills.length > 0 ? (
                <div className="space-y-2.5">
                  {verifiedSkills.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-surface-mid/50 border border-accent/20 rounded-md flex items-center justify-between gap-3 hover:border-accent/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle size={15} className="text-accent shrink-0" />
                        <div className="min-w-0">
                          <span className="font-syne font-bold text-xs text-text-primary block truncate">
                            {s.skill?.name || s.name}
                          </span>
                          {s.verificationSource && (
                            <span className="text-[10px] text-outline font-mono block truncate">
                              Via {s.verificationSource}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {s.calculatedScore && (
                          <span className="px-2 py-0.5 bg-accent/10 border border-accent/30 rounded-xs text-[11px] font-mono font-bold text-accent">
                            {s.calculatedScore}/10
                          </span>
                        )}
                        {s.verificationUrl && (
                          <a
                            href={s.verificationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-outline hover:text-accent transition-colors"
                            title="View Verification Proof"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted font-outfit py-3 text-center">
                  No verified skills benchmarked yet.
                </p>
              )}

              {/* Declared / Self-Reported Skills */}
              {declaredSkills.length > 0 && (
                <div className="pt-3 border-t border-outline-var/20 space-y-2">
                  <span className="font-syne text-[10px] uppercase font-bold text-outline">
                    Additional Declared Skills ({declaredSkills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {declaredSkills.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-1 bg-surface-mid border border-outline-var/30 text-text-muted text-[11px] font-syne rounded-xs"
                      >
                        {s.skill?.name || s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (6 cols on Desktop) ── */}
        <div className={`md:col-span-6 space-y-6 ${activeMobileTab !== 'overview' && activeMobileTab !== 'projects' ? 'hidden md:block' : ''}`}>
          
          {/* Card C: 💻 Engineering & GitHub Project Showcase */}
          <div className="bg-surface border border-outline-var/30 rounded-xl p-5 md:p-6 space-y-5 shadow-sm hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Terminal size={16} />
                </div>
                <div>
                  <h3 className="font-syne font-extrabold text-sm uppercase tracking-wide text-text-primary">
                    Engineering Projects
                  </h3>
                  <p className="font-syne text-[10px] uppercase tracking-wider text-outline">
                    Open Source & Code Showcase
                  </p>
                </div>
              </div>

              {repos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowcaseModalOpen(true)}
                  className="text-[11px] font-syne font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All ({repos.length}) <ExternalLink size={11} />
                </button>
              )}
            </div>

            {loadingRepos ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : repos.length > 0 ? (
              <div className="space-y-3">
                {repos.slice(0, 3).map((repo) => (
                  <div
                    key={repo.id || repo.name}
                    className="p-4 bg-surface-mid/40 border border-outline-var/25 rounded-lg space-y-2.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={repo.repoUrl || `https://github.com/${user?.github}/${repo.name}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-syne font-black text-sm text-text-primary hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                        >
                          <span className="truncate">{repo.name}</span>
                          <ExternalLink size={11} className="opacity-60 shrink-0" />
                        </a>
                      </div>

                      <span className={`px-2 py-0.5 rounded-xs text-[9px] font-syne font-extrabold uppercase shrink-0 ${
                        repo.repoType === 'CONTRIBUTED'
                          ? 'bg-secondary-bright/10 text-secondary-bright border border-secondary-bright/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        {repo.repoType || 'OWNED'}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-text-muted line-clamp-2 leading-snug font-outfit">
                        {repo.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] font-mono text-outline pt-1">
                      {repo.language && (
                        <span className="flex items-center gap-1 text-text-muted">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          {repo.language}
                        </span>
                      )}
                      {(repo.stargazersCount != null && repo.stargazersCount > 0) && (
                        <span className="flex items-center gap-1">
                          <Star size={11} className="text-[#f59e0b]" /> {repo.stargazersCount}
                        </span>
                      )}
                      {(repo.forksCount != null && repo.forksCount > 0) && (
                        <span className="flex items-center gap-1">
                          <GitFork size={11} /> {repo.forksCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-surface-mid/30 border border-dashed border-outline-var/40 rounded-md text-center space-y-2">
                <Terminal size={24} className="mx-auto text-outline" />
                <p className="text-xs text-text-muted">No showcase repositories curated yet.</p>
                {user?.github && (
                  <a
                    href={`https://github.com/${user.github}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-syne font-bold uppercase hover:underline pt-1"
                  >
                    Check GitHub Profile <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Card D: 📝 Candidate Bio & Focus Areas */}
          {user?.bio && (
            <div className="bg-surface border border-outline-var/30 rounded-xl p-5 md:p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-primary" />
                <h3 className="font-syne font-extrabold text-sm uppercase tracking-wide text-text-primary">
                  About Candidate
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed font-outfit whitespace-pre-line">
                {user.bio}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Project Showcase Modal */}
      {showcaseModalOpen && (
        <ProjectShowcaseModal
          repos={repos}
          userName={user?.name || 'Candidate'}
          onClose={() => setShowcaseModalOpen(false)}
        />
      )}
    </div>
  );
}
