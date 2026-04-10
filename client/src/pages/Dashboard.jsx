import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  AlertTriangle, CheckCircle,
  Activity, User, Users, X, Brain, LogOut, BarChart2
} from 'lucide-react';

// ─── Radar Chart ─────────────────────────────────────────────────────────────
const RadarChart = ({ score }) => {
  const cx = 100, cy = 100, maxR = 80;
  const axes = 5;

  const buildPoints = (ratio) =>
    Array.from({ length: axes }, (_, i) => {
      const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
      const r = maxR * ratio;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataRatio = Math.min(Math.max((score || 0) / 100, 0), 1);

  return (
    <div className="relative w-48 h-48 mx-auto mb-4">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {gridLevels.map((ratio, i) => (
          <polygon key={i} points={buildPoints(ratio)} fill="none" stroke="rgba(173,198,255,0.1)" strokeWidth="1" />
        ))}
        {Array.from({ length: axes }, (_, i) => {
          const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(173,198,255,0.08)" strokeWidth="1"
            />
          );
        })}
        <polygon points={buildPoints(dataRatio)} fill="rgba(173,198,255,0.12)" stroke="#adc6ff" strokeWidth="2" />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#dae2fd" fontSize="18" fontWeight="800" fontFamily="Manrope, sans-serif">
          {score}%
        </text>
      </svg>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
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

      const profileRes = await API.get('/users/me');
      if (profileRes.data?.skills) {
        const savedNames = profileRes.data.skills.map(s => s.name);
        const matchedIds = catalogue.filter(c => savedNames.includes(c.name)).map(c => c.id);
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
    if (!selectedRole) return alert('Please select a target role first.');
    setAnalyzing(true);
    try {
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
    } catch {
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
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">

      {/* ── Header ── */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-[#434655]/30 pb-5">
        <div onClick={() => navigate('/')} className="cursor-pointer group flex items-center gap-2">
          <span className="text-xl font-extrabold text-[#dae2fd] group-hover:text-[#adc6ff] transition-colors tracking-tight">
            Skill<span className="text-[#adc6ff] group-hover:text-[#89f5e7]">Sphere</span>
          </span>
        </div>

        <div
          onClick={() => navigate('/grid')}
          className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 cursor-pointer group hidden md:flex"
        >
          <BarChart2 size={18} className="text-[#adc6ff] group-hover:text-[#89f5e7] transition-colors" />
          <span className="text-lg font-bold text-[#dae2fd] tracking-tight group-hover:text-[#adc6ff] transition-colors">
            Skill Intelligence
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            onClick={() => navigate(`/profile/${currentUser.id}`)}
            className="w-9 h-9 rounded-full border border-[#434655]/50 hover:border-[#adc6ff]/50 cursor-pointer flex items-center justify-center bg-[#171f33] transition-all hover:shadow-[0_0_12px_rgba(173,198,255,0.15)]"
          >
            {currentUser.avatar
              ? <img src={currentUser.avatar} className="w-full h-full object-cover rounded-full" alt="" />
              : <User size={16} className="text-[#adc6ff]" />}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xs border border-[#434655]/40 hover:border-[#ffb4ab]/40 text-[#8d90a0] hover:text-[#ffb4ab] transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Left: Controls */}
        <div className="md:col-span-4 space-y-5">

          {/* Role selector */}
          <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 hover:border-[#6bd8cb]/15 transition-colors">
            <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb] mb-4">Target Role</h3>
            <select
              className="w-full p-3 rounded-xs border border-[#434655]/40 bg-[#131b2e] text-[#dae2fd] focus:border-[#adc6ff]/60 outline-none font-['Manrope'] text-sm cursor-pointer transition-colors"
              onChange={(e) => setSelectedRole(e.target.value)}
              value={selectedRole}
            >
              <option value="">Select a role...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>

          {/* Skill checklist */}
          <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 hover:border-[#6bd8cb]/15 transition-colors">
            <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb] mb-4">My Skills</h3>
            <div className="h-64 overflow-y-auto pr-1 space-y-0.5">
              {allSkills.length > 0
                ? allSkills.map(skill => (
                  <div
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xs cursor-pointer transition-all ${
                      mySkills.includes(skill.id)
                        ? 'bg-[#adc6ff]/8 border border-[#adc6ff]/20'
                        : 'hover:bg-[#222a3d] border border-transparent'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                      mySkills.includes(skill.id) ? 'bg-[#adc6ff] border-[#adc6ff]' : 'border-[#434655]'
                    }`}>
                      {mySkills.includes(skill.id) && <div className="w-1.5 h-1.5 bg-[#002e6a] rounded-xs" />}
                    </div>
                    <span className="text-sm text-[#c3c6d7] select-none">{skill.name}</span>
                  </div>
                ))
                : <div className="text-[#8d90a0] text-sm p-4">Loading skills...</div>}
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-3.5 rounded-xs bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] font-['Space_Grotesk'] font-bold text-xs tracking-[0.1em] uppercase hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#0f69dc]/20"
          >
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {/* Right: Output + Activity */}
        <div className="md:col-span-8 flex flex-col gap-5">

          {/* Analysis result */}
          <div className="flex-1">
            {analysis ? (
              <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-8 relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1">Analysis for</p>
                    <h2 className="text-2xl font-extrabold text-[#dae2fd] tracking-tight mb-5">{analysis.role}</h2>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={14} className="text-[#ffb4ab]" />
                      <span className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#ffb4ab]">Skill Gaps</span>
                    </div>
                    {analysis.missingSkills?.length > 0 ? (
                      <div className="space-y-2.5">
                        {analysis.missingSkills.map(s => (
                          <div key={s.id} className="flex items-center justify-between group">
                            <span className="text-[#ffb4ab] text-sm font-semibold">{s.name}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleGenerateRoadmap(s.name)}
                                className="text-[10px] bg-[#adc6ff]/8 text-[#adc6ff] border border-[#adc6ff]/20 px-2.5 py-1 rounded-xs hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all flex items-center gap-1 font-['Space_Grotesk'] font-bold tracking-wide uppercase"
                              >
                                <Brain size={10} /> AI Roadmap
                              </button>
                              <button
                                onClick={() => handleFindMentors(s)}
                                className="text-[10px] bg-[#6bd8cb]/8 text-[#6bd8cb] border border-[#6bd8cb]/20 px-2.5 py-1 rounded-xs hover:bg-[#29a195] hover:text-[#003732] transition-all flex items-center gap-1 font-['Space_Grotesk'] font-bold tracking-wide uppercase"
                              >
                                <Users size={10} /> Mentors
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#89f5e7] flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle size={16} /> You meet all requirements for this role.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center border-l border-[#434655]/20 pl-8">
                    <RadarChart score={analysis.score} />
                    <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.12em] uppercase text-[#8d90a0] mt-1">Skill Match</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 border border-[#434655]/15 rounded-md bg-[#171f33]/50 flex flex-col items-center justify-center text-[#434655] space-y-3">
                <Activity size={48} className="opacity-30" />
                <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.12em] uppercase text-[#8d90a0]">Select a role and run analysis to see results</p>
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="border border-[#434655]/20 bg-[#171f33] rounded-md p-6">
            <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-4 flex items-center gap-2">
              <Activity size={12} /> Recent Activity
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {activities.length > 0
                ? activities.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm border-l-2 border-[#434655]/40 pl-3 py-0.5">
                    <div className="text-[#8d90a0] min-w-[52px] text-xs pt-0.5 font-['Space_Grotesk']">
                      {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div>
                      <span className={log.action === 'ACQUIRED_SKILL' ? 'text-[#89f5e7] text-xs font-semibold' : 'text-[#adc6ff] text-xs font-semibold'}>
                        {log.action === 'ACQUIRED_SKILL' ? 'Skill Added' : 'Analysis Run'}
                      </span>
                      <div className="text-[#c3c6d7] text-xs mt-0.5">{log.details}</div>
                    </div>
                  </div>
                ))
                : <div className="text-[#8d90a0] text-xs italic">No recent activity.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mentor Modal ── */}
      {selectedMissingSkill && (
        <div className="fixed inset-0 bg-[#0b1326]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171f33] border border-[#434655]/40 rounded-md w-full max-w-lg p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedMissingSkill(null)}
              className="absolute top-4 right-4 text-[#8d90a0] hover:text-[#dae2fd] transition-colors"
            >
              <X size={18} />
            </button>
            <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb] mb-1">Find Mentors</p>
            <h3 className="text-xl font-bold text-[#dae2fd] mb-5 tracking-tight">
              {selectedMissingSkill.name}
            </h3>
            <div className="space-y-3 mt-2">
              {loadingMentors ? (
                <div className="text-center py-8 text-[#adc6ff] text-sm">Searching...</div>
              ) : mentors.length > 0 ? (
                mentors.map(mentor => (
                  <div key={mentor.id} className="border border-[#434655]/30 bg-[#222a3d] rounded-xs p-4 flex items-center justify-between hover:border-[#6bd8cb]/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#131b2e] rounded-full flex items-center justify-center text-[#adc6ff] font-bold text-sm border border-[#434655]/40">
                        {mentor.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[#dae2fd] font-semibold text-sm">{mentor.name}</div>
                        <div className="text-[10px] text-[#8d90a0] font-['Space_Grotesk'] uppercase tracking-wide">{mentor.role || 'Member'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/profile/${mentor.id}`)}
                      className="px-3 py-1.5 bg-[#adc6ff]/8 text-[#adc6ff] text-[10px] border border-[#adc6ff]/20 rounded-xs hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all font-['Space_Grotesk'] font-bold uppercase tracking-wide"
                    >
                      View Profile
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[#ffb4ab] text-sm border border-[#93000a]/30 rounded-xs bg-[#93000a]/10">
                  No mentors found for this skill.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}