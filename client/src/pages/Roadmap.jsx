import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { ArrowLeft, Loader2, Brain, CheckCircle, Circle, Calendar, Target, Zap } from 'lucide-react';
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
        setError('No roadmap data received');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Brain className="text-cyan-400" size={28} />
                <h1 className="text-3xl font-black text-white font-['Orbitron'] tracking-widest">AI_ROADMAP</h1>
              </div>
              <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">Neural Network Protocol // Personalized Learning Path</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 border border-cyan-500/30 p-6 mb-8">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 bg-cyan-900/20 rounded border border-cyan-500/50">
              <Target className="text-cyan-400" size={24} />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-mono uppercase mb-1">Target Skill</div>
              <div className="text-2xl font-black text-white font-['Orbitron']">{decodeURIComponent(skill)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="text-yellow-400" size={16} />
            <span className="text-gray-400">For Role:</span>
            <span className="text-yellow-400 font-bold">{decodeURIComponent(role)}</span>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Loader2 className="animate-spin text-cyan-400" size={64} />
            <div className="text-center">
              <p className="text-xl text-cyan-400 font-bold font-['Orbitron'] mb-2 animate-pulse">NEURAL_LINK_ACTIVE</p>
              <p className="text-sm text-gray-500 font-mono">AI analyzing optimal learning path...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-500/50 p-6">
            <div className="text-xl font-bold text-red-400 font-['Orbitron'] mb-3">SYSTEM_ERROR</div>
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={fetchRoadmap} className="px-4 py-2 bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition font-mono text-sm">
              RETRY_CONNECTION
            </button>
          </div>
        )}

        {roadmap && !loading && (
          <div className="bg-black border border-gray-800 p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
              <CheckCircle className="text-green-500" size={24} />
              <h2 className="text-2xl font-black text-white font-['Orbitron']">LEARNING_PROTOCOL_GENERATED</h2>
            </div>

            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-3xl font-black text-cyan-400 font-['Orbitron'] mb-4 mt-8 first:mt-0" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-2xl font-bold text-yellow-400 font-['Orbitron'] mb-3 mt-6 flex items-center gap-2" {...props}><Calendar size={20} />{props.children}</h2>,
                  h3: ({ ...props }) => <h3 className="text-xl font-bold text-purple-400 mb-2 mt-4" {...props} />,
                  p: ({ ...props }) => <p className="text-gray-300 leading-relaxed mb-4" {...props} />,
                  ul: ({ ...props }) => <ul className="space-y-2 my-4 ml-6" {...props} />,
                  li: ({ ...props }) => <li className="text-gray-300 flex items-start gap-2" {...props}><Circle className="text-cyan-500 mt-1 shrink-0" size={8} fill="currentColor" /><span>{props.children}</span></li>,
                  code: ({ inline, ...props }) => inline
                    ? <code className="bg-gray-900 text-cyan-400 px-2 py-1 rounded text-sm font-mono" {...props} />
                    : <code className="block bg-gray-900 text-green-400 p-4 my-4 overflow-x-auto font-mono text-sm" {...props} />,
                  strong: ({ ...props }) => <strong className="text-white font-bold" {...props} />,
                  blockquote: ({ ...props }) => <blockquote className="border-l-4 border-yellow-500 pl-4 py-2 my-4 bg-yellow-900/10 text-yellow-200 italic" {...props} />,
                  a: ({ ...props }) => <a className="text-cyan-400 hover:text-cyan-300 underline transition" target="_blank" rel="noopener noreferrer" {...props} />,
                }}
              >
                {roadmap}
              </ReactMarkdown>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-800 flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/dashboard')} className="flex-1 py-3 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition font-bold font-['Orbitron'] text-sm">
                RETURN_TO_BASE
              </button>
              <button onClick={fetchRoadmap} className="flex-1 py-3 bg-purple-900/30 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition font-bold font-['Orbitron'] text-sm">
                REGENERATE_PROTOCOL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}