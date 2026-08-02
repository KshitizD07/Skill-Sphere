import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { ArrowLeft, Loader2, Brain, CheckCircle, Circle, Calendar, Target, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function RoadmapPage() {
  const { skill, role } = useParams();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
      setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      const res = await API.post('/ai/generate-roadmap', {
        skill: decodeURIComponent(skill),
        role: decodeURIComponent(role),
      });
      if (res.data.roadmap) {
        setRoadmap(res.data.roadmap);
      } else {
        setError('No roadmap data received.');
      }
    } catch (err) {
      if (err.response?.data?.error === 'SKILL_NOT_VERIFIED') {
        setError('You must verify your GitHub proficiency for this skill before the algorithm can build a custom roadmap.');
        setErrorType('SKILL_NOT_VERIFIED');
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate roadmap. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit p-4 md:p-8">
      <div className="w-full max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-outline-var/25">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Brain size={20} className="text-primary" />
                <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Learning Roadmap</h1>
              </div>
              <p className="font-syne text-[10px] tracking-[0.12em] uppercase text-outline">
                AI-Generated · Personalized Learning Path
              </p>
            </div>
          </div>
        </div>

        {/* Context card */}
        <div className="bg-surface border border-outline-var/20 rounded-md p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-primary/8 rounded-xs border border-primary/15">
              <Target className="text-primary" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1">Target Skill</p>
              <div className="text-2xl font-extrabold text-text-primary tracking-tight">{decodeURIComponent(skill)}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                <span className="text-outline">For role:</span>
                <span className="text-primary font-semibold">{decodeURIComponent(role)}</span>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-5">
            <Loader2 className="animate-spin text-primary" size={48} />
            <div className="text-center">
              <p className="text-lg font-bold text-text-primary mb-1">Generating your roadmap...</p>
              <p className="text-sm text-outline">AI is analyzing the optimal learning path for you.</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-surface border border-error/30 rounded-md p-6 shadow-xl shadow-error-container/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-error" />
            <div className="text-lg font-bold text-error mb-2">{errorType === 'SKILL_NOT_VERIFIED' ? 'Verification Required' : 'Generation Failed'}</div>
            <p className="text-text-muted text-sm mb-5 leading-relaxed">{error}</p>
            
            {errorType === 'SKILL_NOT_VERIFIED' ? (
               <button onClick={() => navigate('/verify-skill')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90 transition-all rounded-xs font-syne font-bold text-xs uppercase tracking-wide">
                <Target size={14} /> Go to Skill Verifier
              </button>
            ) : (
              <button onClick={fetchRoadmap}
                className="inline-flex items-center gap-2 px-4 py-2 bg-error-container/20 border border-error/30 text-error hover:bg-error hover:text-on-primary transition-all rounded-xs font-syne font-bold text-xs uppercase tracking-wide">
                <RefreshCw size={12} /> Try Again
              </button>
            )}
          </div>
        )}

        {roadmap && !loading && (
          <div className="bg-surface border border-outline-var/20 rounded-md p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary-container to-[#29a195]" />
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-outline-var/20">
              <CheckCircle className="text-secondary-bright" size={20} />
              <h2 className="text-xl font-bold text-text-primary tracking-tight">Your Personalized Roadmap</h2>
            </div>

            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-extrabold text-primary font-outfit mb-4 mt-8 first:mt-0 tracking-tight" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-xl font-bold text-secondary-bright font-syne mb-3 mt-6 flex items-center gap-2" {...props}><Calendar size={16} />{props.children}</h2>,
                  h3: ({ ...props }) => <h3 className="text-base font-bold text-[#bec6e0] mb-2 mt-4" {...props} />,
                  p: ({ ...props }) => <p className="text-text-muted leading-relaxed mb-4 text-sm" {...props} />,
                  ul: ({ ...props }) => <ul className="space-y-2 my-4 ml-4" {...props} />,
                  li: ({ ...props }) => <li className="text-text-muted flex items-start gap-2 text-sm" {...props}><Circle className="text-primary/50 mt-1.5 shrink-0" size={6} fill="currentColor" /><span>{props.children}</span></li>,
                  code: ({ inline, ...props }) => inline
                    ? <code className="bg-surface-mid text-secondary-bright px-2 py-0.5 rounded-xs text-sm font-mono border border-outline-var/30" {...props} />
                    : <code className="block bg-surface-mid text-secondary-bright p-4 my-4 overflow-x-auto font-mono text-sm border border-outline-var/20 rounded-xs" {...props} />,
                  strong: ({ ...props }) => <strong className="text-text-primary font-semibold" {...props} />,
                  blockquote: ({ ...props }) => <blockquote className="border-l-2 border-primary/40 pl-4 py-1 my-4 bg-primary/5 text-[#bec6e0] italic text-sm" {...props} />,
                  a: ({ ...props }) => <a className="text-primary hover:text-secondary-bright underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {roadmap}
              </ReactMarkdown>
            </div>

            <div className="mt-8 pt-5 border-t border-outline-var/20 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 bg-primary/8 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all rounded-xs font-syne font-bold text-xs uppercase tracking-[0.1em]">
                Back to Dashboard
              </button>
              <button onClick={fetchRoadmap}
                className="flex-1 py-3 bg-secondary/8 border border-secondary/20 text-secondary hover:bg-[#29a195] hover:text-on-secondary transition-all rounded-xs font-syne font-bold text-xs uppercase tracking-[0.1em]">
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}