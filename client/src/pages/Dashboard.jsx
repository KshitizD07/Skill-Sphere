import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  Terminal, Shield, AlertTriangle, CheckCircle,
  Activity, User, Users, X, Brain, LogOut
} from 'lucide-react';

// ─── Real Radar Chart ─────────────────────────────────────────────────────────
// Renders a proper pentagon scaled to the actual score (0-100)
const RadarChart = ({ score }) => {
  const cx = 100, cy = 100, maxR = 80;
  const axes = 5;

  // Build polygon points for a given radius ratio
  const buildPoints = (ratio) =>
    Array.from({ length: axes }, (_, i) => {
      const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
      const r = maxR * ratio;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');

  // Grid lines at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const dataRatio = Math.min(Math.max((score || 0) / 100, 0), 1);

  return (
    <div className="relative w-48 h-48 mx-auto mb-4">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Grid polygons */}
        {gridLevels.map((ratio, i) => (
          <polygon
            key={i}
            points={buildPoints(ratio)}
            fill="none"
            stroke="rgba(34,211,238,0.15)"
            strokeWidth="1"
          />
        ))}

        {/* Axis lines from center */}
        {Array.from({ length: axes }, (_, i) => {
          const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(34,211,238,0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon — driven by actual score */}
        <polygon
          points={buildPoints(dataRatio)}
          fill="rgba(34,211,238,0.15)"
          stroke="#22d3ee"
          strokeWidth="2"
          className="animate-pulse"
        />

        {/* Centre score label */}
        <text
          x={cx} y={cy + 6}
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="bold"
          fontFamily="Orbitron, sans-serif"
        >
          {score}%
        </text>
      </svg>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  // Fallback: if user prop is null (e.g. direct URL visit), read from localStorage
  const currentUser = user || JSON.parse(localStorage.getItem('user_data') || '{}');

  const [roles, setRoles] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [mySkills, setMySkills] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [selectedMissingSkill, setSelectedMissingSkill] = useState(null);
  const [activities, setActivities] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [rolesRes, skillsRes, activityRes] = await Promise.all([
        API.get('/skills/roles'),
        API.get('/skills/list'),
        API.get(`/activity/${currentUser.id}`),
      ]);
      const catalogue = skillsRes.data || [];
      setRoles(rolesRes.data || []);
      setAllSkills(catalogue);
      setActivities(activityRes.data || []);

      // Pre-tick the checklist with skills the user already has on their profile
      const profileRes = await API.get('/users/me');
      if (profileRes.data?.skills) {
        const savedNames = profileRes.data.skills.map(s => s.name);
        // Find matching catalogue IDs for saved skill names
        const matchedIds = catalogue
          .filter(c => savedNames.includes(c.name))
          .map(c => c.id);
        setMySkills(matchedIds);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSkill = (skillId) => {
    setMySkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  };

  const handleAnalyze = async () => {
    if (!selectedRole) return alert('SELECT_TARGET_ROLE_FIRST');
    setAnalyzing(true);
    try {
      // Analysis only — never overwrites saved profile skills
      const res = await API.get(`/skills/analyze?userId=${currentUser.id}&roleId=${selectedRole}`);
      setAnalysis(res.data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const handleFindMentors = async (skill) => {
    setSelectedMissingSkill(skill);
    setLoadingMentors(true);
    try {
      const res = await API.get(`/skills/mentors/${skill.id}`);
      setMentors(res.data || []);
    } catch (err) {
      setMentors([]);
    }
    setLoadingMentors(false);
  };

  const handleGenerateRoadmap = (skillName) => {
    navigate(`/roadmap/${encodeURIComponent(skillName)}/${encodeURIComponent(analysis.role)}`);
  };

  const handleLogout = () => {
    onLogout?.();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 selection:bg-cyan-500 selection:text-black relative">

      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-gray-800 pb-4 relative">
        <div onClick={() => navigate('/')} className="cursor-pointer group flex items-center gap-1 z-20">
          <div className="text-3xl font-black text-white font-['Orbitron'] group-hover:text-cyan-400 transition-colors tracking-tighter">SS</div>
          <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse group-hover:bg-yellow-400" />
        </div>

        <div
          onClick={() => navigate('/grid')}
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-3 cursor-pointer group"
        >
          <Terminal className="text-cyan-400 hidden md:block group-hover:text-white transition" />
          <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-['Orbitron'] tracking-widest whitespace-nowrap group-hover:from-white group-hover:to-gray-400 transition-all">
            COMMAND_CENTER
          </h2>
        </div>

        <div className="text-right z-20 flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <div
              onClick={() => navigate(`/profile/${currentUser.id}`)}
              className="w-10 h-10 rounded-full border-2 border-cyan-500/50 hover:border-cyan-400 cursor-pointer flex items-center justify-center bg-gray-900 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.4)]"
            >
              {currentUser.avatar
                ? <img src={currentUser.avatar} className="w-full h-full object-cover rounded-full" />
                : <User size={20} className="text-cyan-400" />}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 border border-gray-700 hover:border-red-500 text-gray-500 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
          <div className="text-xs font-mono text-gray-500">SYS_ID: {currentUser.id?.split('-')[0]}</div>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Left: Controls */}
        <div className="md:col-span-4 space-y-6">

          {/* Role selector */}
          <div className="bg-gray-900/50 border border-gray-800 p-6 hover:border-cyan-500/50 transition-colors">
            <h3 className="text-xl font-bold mb-4 text-cyan-400 font-['Orbitron'] flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" /> TARGET_DESIGNATION
            </h3>
            <select
              className="w-full p-3 border border-gray-700 bg-black text-gray-200 focus:border-cyan-500 outline-none font-mono text-sm cursor-pointer"
              onChange={(e) => setSelectedRole(e.target.value)}
              value={selectedRole}
            >
              <option value="">[ SELECT MISSION PROFILE ]</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Skill checklist */}
          <div className="bg-gray-900/50 border border-gray-800 p-6 hover:border-green-500/50 transition-colors">
            <h3 className="text-xl font-bold mb-4 text-green-500 font-['Orbitron'] flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> INSTALLED_MODULES
            </h3>
            <div className="h-64 overflow-y-auto pr-2 grid grid-cols-1 gap-1">
              {allSkills.length > 0
                ? allSkills.map(skill => (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={`flex items-center space-x-3 p-2 border border-transparent hover:bg-white/5 cursor-pointer transition-all ${
                      mySkills.includes(skill.id) ? 'border-green-500/30 bg-green-500/10' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                      mySkills.includes(skill.id) ? 'bg-green-500 border-green-500' : 'border-gray-600'
                    }`}>
                      {mySkills.includes(skill.id) && <div className="w-2 h-2 bg-black" />}
                    </div>
                    <span className="text-sm font-mono tracking-wide select-none">{skill.name}</span>
                  </div>
                ))
                : <div className="text-gray-500 text-sm p-4">LOADING_DATABASE...</div>}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-4 bg-yellow-400 text-black font-black font-['Orbitron'] text-xl hover:bg-yellow-300 transition shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            {analyzing ? 'ANALYZING...' : 'RUN_DIAGNOSTIC'}
          </button>
        </div>

        {/* Right: Output + Activity */}
        <div className="md:col-span-8 flex flex-col gap-6">

          {/* Analysis result */}
          <div className="flex-1">
            {analysis ? (
              <div className="bg-black border border-gray-800 p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

                  <div>
                    <h4 className="text-gray-500 font-mono text-sm mb-1">ANALYSIS_RESULT_FOR:</h4>
                    <h2 className="text-3xl font-black text-white font-['Orbitron'] mb-4">
                      {analysis.role?.toUpperCase()}
                    </h2>
                    <h4 className="text-cyan-400 font-bold mb-4 flex items-center gap-2 border-b border-gray-800 pb-2">
                      <AlertTriangle size={18} /> CRITICAL_MISSING_DATA
                    </h4>
                    {analysis.missingSkills?.length > 0 ? (
                      <div className="space-y-2">
                        {analysis.missingSkills.map(s => (
                          <div key={s.id} className="flex items-center justify-between group">
                            <span className="text-red-400 font-mono font-bold text-sm">{s.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleGenerateRoadmap(s.name)}
                                className="text-[10px] bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 px-2 py-1 hover:bg-cyan-500 hover:text-black transition flex items-center gap-1"
                              >
                                <Brain size={10} /> AI_PLAN
                              </button>
                              <button
                                onClick={() => handleFindMentors(s)}
                                className="text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-1 hover:bg-purple-500 hover:text-white transition flex items-center gap-1"
                              >
                                <Users size={10} /> MENTOR
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-green-500 flex items-center gap-2 font-mono">
                        <CheckCircle /> READY_FOR_DEPLOYMENT.
                      </div>
                    )}
                  </div>

                  {/* Real radar chart */}
                  <div className="flex flex-col items-center justify-center border-l border-gray-800 pl-8">
                    <RadarChart score={analysis.score} />
                    <div className="text-xs tracking-widest text-gray-500 font-mono mt-2">SKILL_SYNCHRONIZATION</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-gray-800 bg-gray-900/20 flex flex-col items-center justify-center text-gray-600 space-y-4">
                <Activity size={64} className="opacity-20" />
                <p className="font-mono text-sm tracking-widest">AWAITING_INPUT...</p>
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="border border-gray-800 bg-gray-900/30 p-6">
            <h3 className="text-gray-400 font-['Orbitron'] mb-4 flex items-center gap-2 text-sm tracking-widest">
              <Activity size={16} /> SYSTEM_LOG
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
              {activities.length > 0
                ? activities.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm font-mono border-l-2 border-gray-700 pl-3 py-1">
                    <div className="text-gray-500 min-w-[60px] text-xs pt-1">
                      {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div>
                      <span className={log.action === 'ACQUIRED_SKILL' ? 'text-green-400' : 'text-cyan-400'}>
                        {log.action === 'ACQUIRED_SKILL' ? '[ MODULE_INSTALLED ]' : '[ DIAGNOSTIC_RUN ]'}
                      </span>
                      <div className="text-gray-300">{log.details}</div>
                    </div>
                  </div>
                ))
                : <div className="text-gray-600 text-xs italic">NO_RECENT_ACTIVITY_DETECTED</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mentor Modal ── */}
      {selectedMissingSkill && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500 w-full max-w-lg p-6 relative shadow-[0_0_50px_rgba(34,211,238,0.2)]">
            <button
              onClick={() => setSelectedMissingSkill(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X />
            </button>
            <h3 className="text-2xl font-black font-['Orbitron'] text-white mb-2">
              NETRUNNER_SEARCH:{' '}
              <span className="text-cyan-400">{selectedMissingSkill.name?.toUpperCase()}</span>
            </h3>
            <div className="space-y-3 mt-6">
              {loadingMentors ? (
                <div className="text-center py-8 text-cyan-500 animate-pulse font-mono">ESTABLISHING_UPLINK...</div>
              ) : mentors.length > 0 ? (
                mentors.map(mentor => (
                  <div key={mentor.id} className="border border-gray-700 bg-black p-4 flex items-center justify-between hover:border-cyan-500 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-cyan-400 font-bold">
                        {mentor.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-bold">{mentor.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{mentor.role || 'NETRUNNER'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/profile/${mentor.id}`)}
                      className="px-3 py-1 bg-cyan-900/30 text-cyan-400 text-xs border border-cyan-500/30 hover:bg-cyan-500 hover:text-black transition uppercase font-bold"
                    >
                      VIEW_PROFILE
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-red-500 font-mono border border-red-500/20 bg-red-500/5">
                  NO_AGENTS_FOUND.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}