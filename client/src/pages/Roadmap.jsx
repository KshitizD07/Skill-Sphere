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
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchRoadmap();
  }, []);

  const fetchRoadmap = async () => {
    setLoading(true);
    setError(null);
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
      setError(err.response?.data?.error || 'Failed to generate roadmap. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-[#434655]/25">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 border border-[#434655]/40 rounded-xs hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <Brain size={20} className="text-[#adc6ff]" />
                <h1 className="text-2xl font-extrabold text-[#dae2fd] tracking-tight">Learning Roadmap</h1>
              </div>
              <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.12em] uppercase text-[#8d90a0]">
                AI-Generated · Personalized Learning Path
              </p>
            </div>
          </div>
        </div>

        {/* Context card */}
        <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-[#adc6ff]/8 rounded-xs border border-[#adc6ff]/15">
              <Target className="text-[#adc6ff]" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1">Target Skill</p>
              <div className="text-2xl font-extrabold text-[#dae2fd] tracking-tight">{decodeURIComponent(skill)}</div>
              <div className="flex items-center gap-2 mt-2 text-sm text-[#c3c6d7]">
                <span className="text-[#8d90a0]">For role:</span>
                <span className="text-[#adc6ff] font-semibold">{decodeURIComponent(role)}</span>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-5">
            <Loader2 className="animate-spin text-[#adc6ff]" size={48} />
            <div className="text-center">
              <p className="text-lg font-bold text-[#dae2fd] mb-1">Generating your roadmap...</p>
              <p className="text-sm text-[#8d90a0]">AI is analyzing the optimal learning path for you.</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-[#93000a]/15 border border-[#93000a]/40 rounded-md p-6">
            <div className="text-lg font-bold text-[#ffb4ab] mb-2">Generation Failed</div>
            <p className="text-[#c3c6d7] text-sm mb-4">{error}</p>
            <button onClick={fetchRoadmap}
              className="flex items-center gap-2 px-4 py-2 bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#ffb4ab] hover:text-[#002e6a] transition-all rounded-xs font-['Space_Grotesk'] font-bold text-xs uppercase tracking-wide">
              <RefreshCw size={12} /> Try Again
            </button>
          </div>
        )}

        {roadmap && !loading && (
          <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#adc6ff] via-[#0f69dc] to-[#29a195]" />
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-[#434655]/20">
              <CheckCircle className="text-[#89f5e7]" size={20} />
              <h2 className="text-xl font-bold text-[#dae2fd] tracking-tight">Your Personalized Roadmap</h2>
            </div>

            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-extrabold text-[#adc6ff] font-['Manrope'] mb-4 mt-8 first:mt-0 tracking-tight" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-xl font-bold text-[#89f5e7] font-['Space_Grotesk'] mb-3 mt-6 flex items-center gap-2" {...props}><Calendar size={16} />{props.children}</h2>,
                  h3: ({ ...props }) => <h3 className="text-base font-bold text-[#bec6e0] mb-2 mt-4" {...props} />,
                  p: ({ ...props }) => <p className="text-[#c3c6d7] leading-relaxed mb-4 text-sm" {...props} />,
                  ul: ({ ...props }) => <ul className="space-y-2 my-4 ml-4" {...props} />,
                  li: ({ ...props }) => <li className="text-[#c3c6d7] flex items-start gap-2 text-sm" {...props}><Circle className="text-[#adc6ff]/50 mt-1.5 shrink-0" size={6} fill="currentColor" /><span>{props.children}</span></li>,
                  code: ({ inline, ...props }) => inline
                    ? <code className="bg-[#131b2e] text-[#89f5e7] px-2 py-0.5 rounded-xs text-sm font-mono border border-[#434655]/30" {...props} />
                    : <code className="block bg-[#131b2e] text-[#89f5e7] p-4 my-4 overflow-x-auto font-mono text-sm border border-[#434655]/20 rounded-xs" {...props} />,
                  strong: ({ ...props }) => <strong className="text-[#dae2fd] font-semibold" {...props} />,
                  blockquote: ({ ...props }) => <blockquote className="border-l-2 border-[#adc6ff]/40 pl-4 py-1 my-4 bg-[#adc6ff]/5 text-[#bec6e0] italic text-sm" {...props} />,
                  a: ({ ...props }) => <a className="text-[#adc6ff] hover:text-[#89f5e7] underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {roadmap}
              </ReactMarkdown>
            </div>

            <div className="mt-8 pt-5 border-t border-[#434655]/20 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 bg-[#adc6ff]/8 border border-[#adc6ff]/20 text-[#adc6ff] hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all rounded-xs font-['Space_Grotesk'] font-bold text-xs uppercase tracking-[0.1em]">
                Back to Dashboard
              </button>
              <button onClick={fetchRoadmap}
                className="flex-1 py-3 bg-[#6bd8cb]/8 border border-[#6bd8cb]/20 text-[#6bd8cb] hover:bg-[#29a195] hover:text-[#003732] transition-all rounded-xs font-['Space_Grotesk'] font-bold text-xs uppercase tracking-[0.1em]">
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}