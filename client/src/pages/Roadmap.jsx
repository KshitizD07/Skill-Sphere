import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Loader2, Brain, CheckCircle, Circle,
  Calendar, Target, RefreshCw, Share2, Sparkles,
  CheckSquare, Square, Copy, Check, BookmarkCheck,
  ExternalLink, Layers
} from 'lucide-react';
import RoadmapAPI from '../features/roadmap/roadmapAPI';
import { useToast, ToastContainer } from '../shared/components/Toast';

export default function RoadmapPage() {
  const { skill, role, id, token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const isSharedView = Boolean(token || location.pathname.includes('/roadmap/shared/'));
  const isIdView = Boolean(id && !skill && !token);

  const [roadmapData, setRoadmapData] = useState(null);
  const [content, setContent] = useState('');
  const [targetSkill, setTargetSkill] = useState(skill ? decodeURIComponent(skill) : '');
  const [targetRole, setTargetRole] = useState(role ? decodeURIComponent(role) : '');
  const [completedItems, setCompletedItems] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const loadRoadmap = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isSharedView) {
        const shareToken = token || location.pathname.split('/shared/')[1];
        const res = await RoadmapAPI.getSharedRoadmap(shareToken);
        if (res) {
          setRoadmapData(res);
          setContent(res.content || '');
          setTargetSkill(res.targetSkill || 'Skill');
          setTargetRole(res.targetRole || 'Engineering');
          setCompletedItems(res.completedItems || []);
          setProgress(res.progress || 0);
        } else {
          setError('Shared roadmap could not be found or has expired.');
        }
      } else if (isIdView) {
        const res = await RoadmapAPI.getRoadmapById(id);
        if (res && !res.error) {
          setRoadmapData(res);
          setContent(res.content || '');
          setTargetSkill(res.targetSkill || '');
          setTargetRole(res.targetRole || '');
          setCompletedItems(res.completedItems || []);
          setProgress(res.progress || 0);
        } else {
          setError(res?.message || 'Failed to load saved roadmap.');
        }
      } else if (skill && role) {
        const decodedSkill = decodeURIComponent(skill);
        const decodedRole = decodeURIComponent(role);
        setTargetSkill(decodedSkill);
        setTargetRole(decodedRole);

        const res = await RoadmapAPI.generateRoadmap({
          targetSkill: decodedSkill,
          targetRole: decodedRole,
        });

        if (res && (res.roadmap || res.roadmapMarkdown)) {
          const rm = res.roadmap;
          setRoadmapData(rm);
          setContent(rm?.content || res.roadmapMarkdown || '');
          setCompletedItems(rm?.completedItems || []);
          setProgress(rm?.progress || 0);
        } else {
          setError('Failed to generate roadmap content.');
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Error loading roadmap');
    } finally {
      setLoading(false);
    }
  }, [isSharedView, isIdView, token, id, skill, role, location.pathname]);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  // Extract actionable milestone items from markdown
  const milestones = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const items = [];
    let currentSection = 'General';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
      } else if (/^\s*[-*]\s+/.test(line)) {
        const rawText = line.replace(/^\s*[-*]\s+/, '').trim();
        // Ignore purely resource links or very short lines
        if (rawText.length > 5 && !rawText.startsWith('[')) {
          items.push({
            id: `${currentSection}::${rawText.slice(0, 40)}`,
            text: rawText,
            section: currentSection,
          });
        }
      }
    }
    return items;
  }, [content]);

  // Toggle milestone completion
  const handleToggleMilestone = async (itemId) => {
    if (isSharedView) return; // read-only

    const exists = completedItems.includes(itemId);
    const newItems = exists
      ? completedItems.filter((i) => i !== itemId)
      : [...completedItems, itemId];

    setCompletedItems(newItems);

    const total = Math.max(1, milestones.length);
    const newProgress = Math.min(100, Math.round((newItems.length / total) * 100));
    setProgress(newProgress);

    const roadmapId = roadmapData?.id || id;
    if (roadmapId) {
      setSavingProgress(true);
      try {
        await RoadmapAPI.updateProgress(roadmapId, newItems);
      } catch (err) {
        console.error('Failed to sync progress:', err);
      } finally {
        setSavingProgress(false);
      }
    }
  };

  const handleShare = async () => {
    const roadmapId = roadmapData?.id || id;
    if (!roadmapId) {
      toast.info('Roadmap must be generated and saved before sharing.');
      return;
    }

    try {
      const res = await RoadmapAPI.getShareToken(roadmapId);
      if (res?.shareToken) {
        const fullUrl = `${window.location.origin}/roadmap/shared/${res.shareToken}`;
        setShareUrl(fullUrl);
        setShowShareModal(true);
      }
    } catch (err) {
      toast.error('Failed to create share link.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    toast.success('Share link copied to clipboard!');
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit p-4 md:p-8">
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-outline-var/25">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isSharedView ? '/' : '/dashboard')}
              className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <Brain size={22} className="text-primary" />
                <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                  AI Career GPS
                </h1>
                {roadmapData?.creator && (
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-syne">
                    Shared by {roadmapData.creator.name}
                  </span>
                )}
              </div>
              <p className="font-syne text-[10px] tracking-[0.12em] uppercase text-outline mt-0.5">
                Context-Aware Personalized Learning Roadmap
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {!isSharedView && (
              <>
                <button
                  onClick={loadRoadmap}
                  disabled={loading}
                  className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Regenerate
                </button>

                <button
                  onClick={handleShare}
                  className="px-4 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
                >
                  <Share2 size={13} /> Share Roadmap
                </button>
              </>
            )}

            {isSharedView && (
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                <Sparkles size={14} /> Create Your Own Roadmap
              </button>
            )}
          </div>
        </div>

        {/* Target Meta Card */}
        <div className="bg-surface border border-outline-var/20 rounded-md p-6 relative overflow-hidden shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-text-muted font-syne uppercase tracking-wider">
                <Target size={14} className="text-primary" /> Target Role
              </div>
              <h2 className="text-xl font-bold font-syne text-text-primary">{targetRole || 'Career Track'}</h2>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-outline">Target Skill:</span>
                <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold font-syne rounded-full">
                  {targetSkill}
                </span>
              </div>
            </div>

            {/* Progress Gauge */}
            <div className="bg-surface-mid border border-outline-var/30 rounded-md p-4 min-w-[240px] space-y-2">
              <div className="flex items-center justify-between text-xs font-syne font-bold">
                <span className="uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <BookmarkCheck size={14} className="text-secondary-bright" /> Milestone Progress
                </span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-outline-var/20">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary-bright transition-all duration-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-outline font-mono">
                <span>{completedItems.length} completed</span>
                <span>{savingProgress ? 'Saving...' : `${milestones.length} milestones`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-surface border border-outline-var/20 rounded-md">
            <Loader2 className="animate-spin text-primary" size={44} />
            <div className="text-center space-y-1">
              <h3 className="font-syne font-bold text-lg text-text-primary">Generating AI Learning GPS...</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Synthesizing verified background skills, role requirements, and fast-tracking bypassed foundations.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-surface border border-error/30 rounded-md p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-error font-syne uppercase tracking-wider">
              Roadmap Generation Notice
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">{error}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={loadRoadmap}
                className="px-4 py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Retry Generation
              </button>
              <button
                onClick={() => navigate('/verify-skill')}
                className="px-4 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5"
              >
                <Layers size={12} /> Verify Skills First
              </button>
            </div>
          </div>
        )}

        {/* Interactive Content Grid */}
        {content && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Rendered Markdown Curriculum */}
            <div className="lg:col-span-8 bg-surface border border-outline-var/20 rounded-md p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-outline-var/20">
                <CheckCircle className="text-secondary-bright" size={18} />
                <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-text-primary">
                  Structured Curriculum
                </h3>
              </div>

              <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => (
                      <h1 className="text-xl font-extrabold text-primary font-syne mt-4 mb-2 tracking-tight" {...props} />
                    ),
                    h2: ({ ...props }) => (
                      <h2 className="text-base font-bold text-secondary-bright font-syne mt-6 mb-2 flex items-center gap-2 border-b border-outline-var/15 pb-2" {...props}>
                        <Calendar size={15} className="text-primary" /> {props.children}
                      </h2>
                    ),
                    h3: ({ ...props }) => (
                      <h3 className="text-sm font-bold text-text-primary font-syne mt-4 mb-1" {...props} />
                    ),
                    p: ({ ...props }) => (
                      <p className="text-text-muted leading-relaxed text-xs" {...props} />
                    ),
                    ul: ({ ...props }) => (
                      <ul className="space-y-2 my-2 ml-2" {...props} />
                    ),
                    li: ({ ...props }) => (
                      <li className="text-text-muted flex items-start gap-2 text-xs">
                        <Circle className="text-primary/60 mt-1 shrink-0" size={5} fill="currentColor" />
                        <span>{props.children}</span>
                      </li>
                    ),
                    code: ({ inline, ...props }) =>
                      inline ? (
                        <code className="bg-surface-mid text-primary font-mono text-[11px] px-1.5 py-0.5 rounded-xs border border-outline-var/30" {...props} />
                      ) : (
                        <code className="block bg-surface-mid text-text-primary font-mono text-[11px] p-3 my-2 rounded-xs border border-outline-var/25 overflow-x-auto" {...props} />
                      ),
                    a: ({ ...props }) => (
                      <a className="text-primary hover:text-secondary-bright underline flex-inline items-center gap-1 font-semibold" target="_blank" rel="noopener noreferrer" {...props}>
                        {props.children} <ExternalLink size={10} className="inline ml-0.5" />
                      </a>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Right: Interactive Milestone Checklist */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-4 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-outline-var/20">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-primary" />
                    <h3 className="font-syne font-bold text-xs uppercase tracking-wider text-text-primary">
                      Milestone Checklist
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">
                    {completedItems.length}/{milestones.length} Done
                  </span>
                </div>

                {milestones.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-4 text-center">
                    Checklist items will appear as topics are parsed.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {milestones.map((m) => {
                      const isDone = completedItems.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleToggleMilestone(m.id)}
                          className={`p-3 rounded-xs border transition-all cursor-pointer flex items-start gap-2.5 ${
                            isDone
                              ? 'bg-primary/5 border-primary/30 text-text-muted line-through'
                              : 'bg-surface-mid border-outline-var/20 hover:border-primary/40 text-text-primary'
                          }`}
                        >
                          <button className="mt-0.5 shrink-0 text-primary">
                            {isDone ? <CheckSquare size={14} /> : <Square size={14} className="text-outline" />}
                          </button>
                          <div className="text-xs leading-snug">
                            <span className="text-[9px] font-syne font-bold uppercase tracking-wider text-outline block mb-0.5">
                              {m.section}
                            </span>
                            <span>{m.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-outline-var/30 p-6 rounded-md max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-syne font-bold text-base text-text-primary flex items-center gap-2">
                <Share2 size={16} className="text-primary" /> Share Career Roadmap
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-outline hover:text-text-primary">
                ✕
              </button>
            </div>
            <p className="text-xs text-text-muted">
              Anyone with this link can view your personalized learning roadmap in clean read-only mode:
            </p>
            <div className="flex items-center gap-2 bg-surface-mid border border-outline-var/30 p-2 rounded-xs">
              <input
                readOnly
                value={shareUrl}
                className="bg-transparent text-xs text-text-primary w-full outline-none font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase rounded-xs shrink-0 flex items-center gap-1"
              >
                {copiedShare ? <Check size={12} /> : <Copy size={12} />}
                {copiedShare ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}