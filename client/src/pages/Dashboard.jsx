import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import RoadmapAPI from '../features/roadmap/roadmapAPI';
import {
  AlertTriangle, CheckCircle,
  Activity, Users, X, Brain, BarChart2, ShieldAlert,
  ArrowRight, Search, ChevronDown, Sparkles, Filter, Check
} from 'lucide-react';
import Navbar from '../shared/components/Navbar';
import SEOHead from '../shared/components/SEOHead';
import ReactMarkdown from 'react-markdown';
import SkillVerifier from '../features/skills/SkillVerifier';

// ─── Radar Chart (Upgraded to Glowing Bronze) ────────────────────────────────
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
    <div className="relative w-56 h-56 mx-auto mb-4">
      {/* Glow effect behind chart */}
      <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-full" />
      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
        {gridLevels.map((ratio, i) => (
          <polygon key={i} points={buildPoints(ratio)} fill="none" stroke="rgba(245, 158, 11, 0.1)" strokeWidth="1" />
        ))}
        {Array.from({ length: axes }, (_, i) => {
          const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(245, 158, 11, 0.15)" strokeWidth="1"
            />
          );
        })}
        {/* Animated fill polygon */}
        <polygon 
          points={buildPoints(dataRatio)} 
          fill="rgba(245, 158, 11, 0.15)" 
          stroke="#f59e0b" 
          strokeWidth="2.5" 
          strokeLinejoin="round"
        />
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#111111" fontSize="22" fontWeight="800" fontFamily="Syne, sans-serif">
          {score}%
        </text>
      </svg>
    </div>
  );
};

const POPULAR_ROLES = [
  'Full Stack Web Developer',
  'Frontend React Developer',
  'Backend Node.js Developer',
  'Data Analyst',
  'AI / ML Engineer',
  'DevOps & Cloud Engineer',
];

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const _location = useLocation();
  const currentUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  })();

  const [roles, setRoles] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedRole, setSelectedRole] = useState(() => {
    return sessionStorage.getItem('dash_selected_role') || '';
  });
  const [mySkills, setMySkills] = useState([]);
  const [userSkillsData, setUserSkillsData] = useState([]);
  const [analysis, setAnalysis] = useState(() => {
    const saved = sessionStorage.getItem('dash_analysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);
  const [selectedMissingSkill, setSelectedMissingSkill] = useState(null);
  const [verifySkillModal, setVerifySkillModal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  // New UI/UX states
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState('role'); // 'role' | 'all'
  const [skillSearch, setSkillSearch] = useState('');
  const [mobileTab, setMobileTab] = useState('config'); // 'config' | 'diagnostics' | 'feed'
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    if (analysis) {
      sessionStorage.setItem('dash_analysis', JSON.stringify(analysis));
    }
  }, [analysis]);

  useEffect(() => {
    sessionStorage.setItem('dash_selected_role', selectedRole);
  }, [selectedRole]);

  // Handle click outside role dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [rolesRes, skillsRes, activityRes, roadmapsRes, profileRes] = await Promise.all([
        API.get('/skills/roles'),
        API.get('/skills/list'),
        API.get(`/activity/${currentUser.id}`),
        RoadmapAPI.getSavedRoadmaps().catch(() => []),
        API.get('/users/me'),
      ]);
      const catalogue = skillsRes.data || [];
      const userSkills = profileRes.data?.data?.skills || [];
      setUserSkillsData(userSkills);

      // Merge catalogue skills and user's profile/verified skills so inventory is never empty
      const skillMap = new Map();
      catalogue.forEach(c => {
        if (c.name) skillMap.set(c.name.toLowerCase(), { id: c.id, name: c.name });
      });
      userSkills.forEach(u => {
        const uName = u.name || u.skill?.name;
        if (uName) {
          const key = uName.toLowerCase();
          if (!skillMap.has(key)) {
            skillMap.set(key, { id: u.id || `user-skill-${key}`, name: uName });
          }
        }
      });

      const combinedSkills = Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setAllSkills(combinedSkills);
      setRoles(rolesRes.data || []);
      setActivities(activityRes.data || []);
      setSavedRoadmaps(Array.isArray(roadmapsRes) ? roadmapsRes : []);

      // Check all skills that the user has on their profile (case-insensitive)
      const userSkillNames = new Set(userSkills.map(s => (s.name || s.skill?.name || '').toLowerCase()));
      const matchedIds = combinedSkills
        .filter(c => userSkillNames.has(c.name.toLowerCase()))
        .map(c => c.id);
      setMySkills(matchedIds);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    }
  }, [currentUser]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSkill = async (skillId) => {
    let newSkills = [];
    setMySkills(prev => {
      newSkills = prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId];
      return newSkills;
    });
    try {
      await API.post('/skills/update', { userId: currentUser.id, skillIds: newSkills });
      fetchData(); // Sync detailed skill verification status
    } catch (e) {
      console.error('Failed to sync skills', e);
    }
  };

  const handleAnalyze = async (forceRegenerate = false) => {
    if (!selectedRole) return alert('Please select a target role first.');
    setAnalyzing(true);
    try {
      const res = await API.get(`/skills/analyze?userId=${currentUser.id}&roleIdOrName=${selectedRole}${forceRegenerate === true ? '&forceRegenerate=true' : ''}`);
      setAnalysis(res.data);
      // Auto-switch mobile view to diagnostics so mobile users see results instantly
      setMobileTab('diagnostics');
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

  // ─── Dynamic Role Skills Filter Helper ────────────────────────────────────
  const getRelevantSkillNames = useCallback(() => {
    if (!selectedRole) return null;
    const normRole = selectedRole.toLowerCase().trim();
    const set = new Set();

    // 1. Check if current analysis matches selected role
    if (analysis && (analysis.role.toLowerCase() === normRole || normRole.includes(analysis.role.toLowerCase()))) {
      if (analysis.userSkills) analysis.userSkills.forEach(s => set.add(s.name.toLowerCase()));
      if (analysis.missingSkills) analysis.missingSkills.forEach(s => set.add(s.name.toLowerCase()));
    }

    // 2. Check predefined roles list from DB
    const matchedRole = roles.find(r => r.title.toLowerCase() === normRole || normRole.includes(r.title.toLowerCase()));
    if (matchedRole && matchedRole.skills) {
      matchedRole.skills.forEach(s => set.add((s.skillName || s.name || '').toLowerCase()));
    }

    // 3. Smart domain heuristic keywords
    if (normRole.includes('front') || normRole.includes('react') || normRole.includes('ui') || normRole.includes('web')) {
      ['react', 'html', 'css', 'javascript', 'typescript', 'tailwind', 'next.js', 'vue', 'angular', 'web development', 'frontend development', 'figma', 'ui/ux', 'git'].forEach(k => set.add(k));
    }
    if (normRole.includes('back') || normRole.includes('node') || normRole.includes('api') || normRole.includes('server')) {
      ['node.js', 'express', 'python', 'java', 'sql', 'postgresql', 'mongodb', 'rest apis', 'graphql', 'database', 'backend development', 'docker', 'git'].forEach(k => set.add(k));
    }
    if (normRole.includes('full') || normRole.includes('stack')) {
      ['react', 'node.js', 'typescript', 'javascript', 'sql', 'postgresql', 'express', 'git', 'rest apis', 'html', 'css', 'tailwind', 'docker', 'mongodb'].forEach(k => set.add(k));
    }
    if (normRole.includes('ai') || normRole.includes('ml') || normRole.includes('machine') || normRole.includes('data')) {
      ['python', 'dsa', 'algorithms', 'data structures', 'c++', 'sql', 'pytorch', 'tensorflow', 'machine learning', 'data science'].forEach(k => set.add(k));
    }
    if (normRole.includes('devops') || normRole.includes('cloud') || normRole.includes('sys')) {
      ['docker', 'kubernetes', 'aws', 'git', 'linux', 'ci/cd', 'cloud', 'bash'].forEach(k => set.add(k));
    }

    return set;
  }, [selectedRole, analysis, roles]);

  const relevantSkillNames = getRelevantSkillNames();

  // Compute displayed skills in inventory
  const displayedSkills = allSkills.filter(skill => {
    const sNameLower = skill.name.toLowerCase();
    const matchesSearch = !skillSearch || sNameLower.includes(skillSearch.toLowerCase());
    if (!matchesSearch) return false;

    // If role filter is active and a role is selected
    if (inventoryFilter === 'role' && selectedRole && relevantSkillNames && relevantSkillNames.size > 0) {
      const isChecked = mySkills.includes(skill.id);
      const isRelevant = Array.from(relevantSkillNames).some(r => sNameLower.includes(r) || r.includes(sNameLower));
      return isRelevant || isChecked;
    }
    return true;
  });

  const roleSkillsCount = allSkills.filter(skill => {
    if (!relevantSkillNames || relevantSkillNames.size === 0) return true;
    const sNameLower = skill.name.toLowerCase();
    return Array.from(relevantSkillNames).some(r => sNameLower.includes(r) || r.includes(sNameLower)) || mySkills.includes(skill.id);
  }).length;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <SEOHead 
        title="Skill Intelligence Dashboard" 
        description="Monitor your skill readiness index, AI role fit analytics, and target skill gaps on your SkillSphere dashboard." 
      />
      
      {/* Fixed Sidebar Layout */}
      <Navbar user={currentUser} onLogout={handleLogout} />

      {/* Main Content Area — Edge-to-Edge Fluid with Sidebar Offset */}
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden">
        
        {/* Top welcome section */}
        <div className="px-6 md:px-10 py-8 border-b border-outline-var/20 bg-surface/30">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Dashboard Overview</h1>
          <p className="text-text-muted text-sm max-w-2xl">
            Evaluate your skill gaps, generate custom roadmaps, and connect with mentors in your target field.
          </p>
        </div>

        {/* ── Mobile Segmented Tab Bar (Visible only on mobile screens < xl) ── */}
        <div className="px-6 pt-6 xl:hidden">
          <div className="flex bg-surface-mid p-1 rounded-xl border border-outline-var/30 gap-1 shadow-inner">
            <button
              onClick={() => setMobileTab('config')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-syne font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'config'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <BarChart2 size={14} /> Target & Skills
            </button>
            <button
              onClick={() => setMobileTab('diagnostics')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-syne font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'diagnostics'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Brain size={14} /> Diagnostics {analysis && <span className="w-2 h-2 rounded-full bg-accent animate-ping" />}
            </button>
            <button
              onClick={() => setMobileTab('feed')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-syne font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'feed'
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Activity size={14} /> Roadmaps
            </button>
          </div>
        </div>

        {/* Fluid Grid Panel Layout */}
        <div className="p-6 md:p-10 w-full max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Left Column: Controls (Role + Skills) */}
          <div className={`xl:col-span-4 space-y-6 ${mobileTab !== 'config' ? 'hidden xl:block' : 'block'}`}>
            
            {/* Custom Searchable Combobox Dropdown Panel */}
            <div className="bg-surface border border-outline-var/30 rounded-xl p-6 shadow-xl hover:border-primary/20 transition-all relative" ref={roleDropdownRef}>
              <h3 className="font-syne text-[10px] font-bold tracking-widest uppercase text-primary mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2"><BarChart2 size={12} /> Target Role</span>
                {selectedRole && (
                  <button 
                    onClick={() => setSelectedRole('')} 
                    className="text-text-muted hover:text-error text-[10px] lowercase flex items-center gap-1 transition-colors"
                  >
                    <X size={10} /> clear
                  </button>
                )}
              </h3>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-9 py-3.5 rounded-lg border border-outline-var/40 bg-surface-mid text-text-primary focus:border-primary/60 outline-none font-outfit text-sm transition-colors shadow-inner"
                    placeholder="Search or type a target role..."
                    value={selectedRole}
                    onFocus={() => setIsRoleDropdownOpen(true)}
                    onChange={(e) => {
                      setSelectedRole(e.target.value);
                      setIsRoleDropdownOpen(true);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen(prev => !prev)}
                    className="absolute right-3 text-text-muted hover:text-primary transition-colors p-1"
                  >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isRoleDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute z-50 left-0 right-0 mt-2 bg-surface-mid border border-outline-var/40 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar"
                    >
                      {/* Popular Role Chips */}
                      <div className="p-3 border-b border-outline-var/20 bg-bg-base/40">
                        <div className="text-[9px] font-syne uppercase tracking-wider text-outline mb-2 flex items-center gap-1 font-bold">
                          <Sparkles size={10} className="text-primary" /> Popular Roles
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {POPULAR_ROLES.map(popRole => (
                            <button
                              key={popRole}
                              type="button"
                              onClick={() => {
                                setSelectedRole(popRole);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                                selectedRole === popRole
                                  ? 'bg-primary text-on-primary border-primary font-bold'
                                  : 'bg-surface/80 border-outline-var/30 text-text-muted hover:border-primary/40 hover:text-text-primary'
                              }`}
                            >
                              {popRole}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* System Roles List */}
                      <div className="py-1">
                        <div className="px-3 py-1 text-[9px] font-syne uppercase tracking-wider text-outline font-bold">
                          All Catalog Roles
                        </div>
                        {roles
                          .filter(r => !selectedRole || r.title.toLowerCase().includes(selectedRole.toLowerCase()))
                          .map(r => (
                            <div
                              key={r.id}
                              onClick={() => {
                                setSelectedRole(r.title);
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`px-4 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                selectedRole === r.title
                                  ? 'bg-primary/15 text-primary font-semibold'
                                  : 'hover:bg-surface text-text-primary'
                              }`}
                            >
                              <span>{r.title}</span>
                              {selectedRole === r.title && <Check size={14} className="text-primary" />}
                            </div>
                          ))}

                        {selectedRole && !roles.some(r => r.title.toLowerCase() === selectedRole.toLowerCase()) && (
                          <div
                            onClick={() => setIsRoleDropdownOpen(false)}
                            className="px-4 py-3 bg-primary/5 text-xs text-primary font-medium flex items-center justify-between border-t border-outline-var/20 cursor-pointer hover:bg-primary/10"
                          >
                            <span>Use custom prompt: <strong>&ldquo;{selectedRole}&rdquo;</strong></span>
                            <Sparkles size={12} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Role-Filtered Skill Checklist Panel */}
            <div className="bg-surface border border-outline-var/30 rounded-xl p-6 shadow-xl hover:border-primary/20 transition-all flex flex-col h-[420px]">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="font-syne text-[10px] font-bold tracking-widest uppercase text-primary flex items-center gap-1.5">
                  <Filter size={12} /> Skills Inventory
                </h3>

                {/* Filter Toggle Pills */}
                {selectedRole ? (
                  <div className="flex bg-surface-mid p-0.5 rounded-lg border border-outline-var/30 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('role')}
                      className={`text-[9px] font-syne font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                        inventoryFilter === 'role'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title="Show only skills relevant to selected role"
                    >
                      🎯 Role Skills ({roleSkillsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('all')}
                      className={`text-[9px] font-syne font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all ${
                        inventoryFilter === 'all'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title="Show all skills in platform catalogue"
                    >
                      🌐 All ({allSkills.length})
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-text-muted font-syne uppercase tracking-wider">
                    Total: {allSkills.length}
                  </span>
                )}
              </div>

              {/* Mini Search Input for Fast Skill Filtering */}
              <div className="relative mb-3">
                <Search size={12} className="absolute left-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter inventory..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-surface-mid border border-outline-var/30 text-text-primary focus:border-primary/50 outline-none"
                />
                {skillSearch && (
                  <button
                    onClick={() => setSkillSearch('')}
                    className="absolute right-2 top-2 text-text-muted hover:text-text-primary text-[10px]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Skill Checklist Container */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-1.5 custom-scrollbar">
                {displayedSkills.length > 0 ? (
                  displayedSkills.map(skill => (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                        mySkills.includes(skill.id)
                          ? 'bg-primary/10 border-primary/30 shadow-[0_2px_10px_rgba(245,158,11,0.05)]'
                          : 'hover:bg-surface-mid border-transparent hover:border-outline-var/30'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        mySkills.includes(skill.id) ? 'bg-primary border-primary' : 'border-outline-var'
                      }`}>
                        {mySkills.includes(skill.id) && <div className="w-1.5 h-1.5 bg-on-primary rounded-sm" />}
                      </div>
                      <span className={`text-sm select-none transition-colors flex-1 ${mySkills.includes(skill.id) ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                        {skill.name}
                      </span>
                      {(() => {
                        const userSk = userSkillsData.find(s => s.name.toLowerCase() === skill.name.toLowerCase());
                        if (userSk && userSk.isVerified) {
                          const scoreText = userSk.calculatedScore != null ? `${userSk.calculatedScore}/10` : 'Verified';
                          return (
                            <span 
                              title={`Verified Score: ${scoreText}`} 
                              className="text-[10px] text-accent font-syne uppercase tracking-wider font-bold bg-accent/10 border border-accent/30 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              🛡️ {scoreText}
                            </span>
                          );
                        }
                        if (userSk) {
                          return (
                            <span 
                              title="Self-Declared" 
                              className="text-[10px] text-error font-syne uppercase tracking-wider font-bold cursor-pointer hover:underline bg-error/10 border border-error/20 px-2 py-0.5 rounded" 
                              onClick={(e) => { e.stopPropagation(); setVerifySkillModal(skill.name); }}
                            >
                              ⚠️ Verify
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="text-outline text-xs p-6 text-center space-y-2">
                    <p>No matching skills found for this role filter.</p>
                    <button
                      onClick={() => { setInventoryFilter('all'); setSkillSearch(''); }}
                      className="text-primary text-[10px] font-syne font-bold uppercase tracking-wider underline hover:text-primary-dim"
                    >
                      Show All Catalog Skills
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostics Action Buttons with Touch Sizing */}
            <div className="flex gap-3">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={analyzing}
                className="flex-1 min-h-[52px] py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dim text-on-primary font-syne font-bold text-xs tracking-widest uppercase hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
              >
                <Brain size={16} />
                {analyzing ? 'Analyzing...' : 'Run Diagnostics'}
              </button>
              <button
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                title="Force regenerate role requirements using AI"
                className="w-14 min-h-[52px] rounded-xl bg-surface-mid border border-outline-var/40 text-primary font-syne font-bold text-xs hover:border-primary/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg group"
              >
                <Sparkles size={18} className="group-hover:animate-spin" />
              </button>
            </div>
          </div>

          {/* Right Column: Output + Activity */}
          <div className={`xl:col-span-8 flex flex-col gap-8 ${mobileTab === 'config' ? 'hidden xl:flex' : 'flex'}`}>

            {/* Analysis result canvas */}
            <div className={`flex-1 ${mobileTab === 'feed' ? 'hidden xl:block' : 'block'}`}>
              {analysis ? (
                <div className="bg-surface border border-outline-var/30 rounded-xl p-6 md:p-8 relative overflow-hidden shadow-2xl h-full flex flex-col justify-center">
                  {/* Subtle background glow */}
                  <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
                    <div>
                      <p className="font-syne text-[10px] font-bold tracking-widest uppercase text-outline mb-1">Diagnostic Results</p>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight mb-6">{analysis.role}</h2>
                      
                      {analysis.diagnosticReport && (
                        <div className="mb-6 p-4 bg-surface-mid/80 border border-outline-var/40 rounded-xl shadow-inner">
                          <h4 className="font-syne text-[10px] font-bold tracking-widest uppercase text-primary mb-2 flex items-center gap-2"><Brain size={12}/> AI Diagnostic Report</h4>
                          <div className="text-sm text-text-primary space-y-2 [&_strong]:text-primary [&_li]:ml-4 [&_ul]:list-disc">
                            <ReactMarkdown>{analysis.diagnosticReport}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-4 bg-error-container/10 border border-error-container/20 px-3 py-1.5 rounded w-max">
                        <AlertTriangle size={14} className="text-error" />
                        <span className="font-syne text-[10px] font-bold tracking-widest uppercase text-error">Missing Core Skills</span>
                      </div>
                      
                      {analysis.missingSkills?.length > 0 ? (
                        <div className="space-y-3">
                          {analysis.missingSkills.map(s => (
                            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between group bg-surface-mid/50 border border-outline-var/20 p-3.5 rounded-xl hover:border-primary/30 transition-colors gap-3">
                              <span className="text-text-primary text-sm font-semibold">{s.name}</span>
                              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handleGenerateRoadmap(s.name)}
                                  className="flex-1 sm:flex-none min-h-[36px] justify-center text-[10px] bg-primary/10 text-primary border border-primary/20 px-3 py-2 rounded-lg hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1.5 font-syne font-bold tracking-widest uppercase active:scale-95"
                                >
                                  <Brain size={12} /> Roadmap
                                </button>
                                <button
                                  onClick={() => setVerifySkillModal(s.name)}
                                  className="flex-1 sm:flex-none min-h-[36px] justify-center text-[10px] bg-accent/10 text-accent border border-accent/20 px-3 py-2 rounded-lg hover:bg-accent hover:text-on-accent transition-all flex items-center gap-1.5 font-syne font-bold tracking-widest uppercase active:scale-95"
                                >
                                  <ShieldAlert size={12} /> Verify
                                </button>
                                <button
                                  onClick={() => handleFindMentors(s)}
                                  className="flex-1 sm:flex-none min-h-[36px] justify-center text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-3 py-2 rounded-lg hover:bg-secondary hover:text-on-secondary transition-all flex items-center gap-1.5 font-syne font-bold tracking-widest uppercase active:scale-95"
                                >
                                  <Users size={12} /> Mentors
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-accent flex items-center gap-2 text-sm font-semibold bg-secondary/10 border border-secondary/20 p-4 rounded-lg">
                          <CheckCircle size={18} /> You meet all technical requirements for this role!
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center lg:border-l border-outline-var/20 lg:pl-10 h-full">
                      <RadarChart score={analysis.score} />
                      <p className="font-syne text-[10px] tracking-widest uppercase text-primary/70 mt-2">Competency Match</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[320px] border border-outline-var/20 rounded-xl bg-surface/50 flex flex-col items-center justify-center text-outline-var space-y-4 shadow-inner p-6 text-center">
                  <Activity size={56} className="opacity-20 text-primary" />
                  <div>
                    <p className="font-syne text-xs tracking-widest uppercase text-outline font-bold mb-1">Awaiting Diagnostic Input</p>
                    <p className="text-text-muted text-xs max-w-sm">Select a target role and check off your skills on the left, then click <strong>Run Diagnostics</strong>.</p>
                  </div>
                </div>
              )}
            </div>

            {/* My Career Roadmaps panel */}
            <div className={`${mobileTab === 'diagnostics' ? 'hidden xl:block' : 'block'} space-y-8`}>
              {savedRoadmaps.length > 0 && (
                <div className="border border-outline-var/30 bg-surface rounded-xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-syne text-[10px] font-bold tracking-widest uppercase text-primary flex items-center gap-2">
                      <Brain size={13} /> Active Learning Roadmaps ({savedRoadmaps.length})
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {savedRoadmaps.map((rm) => (
                      <div
                        key={rm.id}
                        onClick={() => navigate(`/roadmap/${rm.id}`)}
                        className="p-3.5 bg-surface-mid border border-outline-var/25 hover:border-primary/40 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                              {rm.targetSkill}
                            </span>
                            <span className="text-[9px] font-syne uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                              {rm.targetRole}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-text-muted">
                            <div className="w-24 h-1.5 bg-bg-base rounded-full overflow-hidden border border-outline-var/20">
                              <div
                                className="h-full bg-accent rounded-full"
                                style={{ width: `${rm.progress || 0}%` }}
                              />
                            </div>
                            <span>{rm.progress || 0}% complete</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-primary text-xs font-syne font-bold uppercase tracking-wider shrink-0 group-hover:translate-x-0.5 transition-transform">
                          <span>Continue</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity feed panel */}
              <div className="border border-outline-var/30 bg-surface rounded-xl p-6 shadow-xl">
                <h3 className="font-syne text-[10px] font-bold tracking-widest uppercase text-outline mb-5 flex items-center gap-2">
                  <Activity size={12} /> Network Activity Log
                </h3>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {activities.length > 0
                    ? activities.map(log => (
                      <div key={log.id} className="flex gap-4 text-sm border-l-2 border-outline-var/30 pl-4 py-1 hover:border-primary/40 transition-colors">
                        <div className="text-outline min-w-[52px] text-xs pt-0.5 font-syne font-medium">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div>
                          {(() => {
                            const labels = {
                              ACQUIRED_SKILL:  { text: 'Skill Verified',   color: 'text-accent' },
                              DIAGNOSTIC_RUN:  { text: 'Diagnostics Run',  color: 'text-primary' },
                              POST_CREATED:    { text: 'Post Published',   color: 'text-primary' },
                              POST_DELETED:    { text: 'Post Removed',     color: 'text-error' },
                              USER_LOGIN:      { text: 'System Access',    color: 'text-outline' },
                              USER_LOGOUT:     { text: 'Session Ended',    color: 'text-outline' },
                              PROFILE_UPDATED: { text: 'Profile Sync',     color: 'text-secondary' },
                              ACCOUNT_CREATED: { text: 'Node Created',     color: 'text-accent' },
                            };
                            const l = labels[log.action] || { text: log.action, color: 'text-primary' };
                            return <span className={`${l.color} text-xs font-bold font-syne tracking-wide uppercase`}>{l.text}</span>;
                          })()}
                          <div className="text-text-muted text-sm mt-1">{log.details}</div>
                        </div>
                      </div>
                    ))
                    : <div className="text-outline text-sm italic">No recent activity logged in the network.</div>}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Mentor Modal Drawer (Overhauled) ── */}
      <AnimatePresence>
        {selectedMissingSkill && (
          <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-md z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-surface border-l border-outline-var/40 w-full max-w-md h-full flex flex-col shadow-2xl relative"
            >
              <div className="p-6 border-b border-outline-var/20 flex justify-between items-center bg-surface-mid">
                <div>
                  <p className="font-syne text-[10px] font-bold tracking-widest uppercase text-secondary mb-1">Mentorship Network</p>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight">
                    {selectedMissingSkill.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMissingSkill(null)}
                  className="w-8 h-8 rounded-full bg-outline-var/20 flex items-center justify-center text-text-muted hover:bg-outline-var/40 hover:text-text-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingMentors ? (
                  <div className="flex flex-col items-center justify-center h-40 text-primary space-y-3">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="font-syne text-xs uppercase tracking-widest">Scanning Network...</span>
                  </div>
                ) : mentors.length > 0 ? (
                  mentors.map(mentor => (
                    <div key={mentor.id} className="border border-outline-var/30 bg-surface-mid rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-all shadow-md group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-base rounded-full flex items-center justify-center text-primary font-bold text-sm border border-outline-var/40 group-hover:border-primary/50 transition-colors">
                          {mentor.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-text-primary font-bold text-sm">{mentor.name}</div>
                          <div className="text-[10px] text-text-muted font-syne uppercase tracking-wider mt-0.5">{mentor.role || 'Member'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${mentor.id}`)}
                        className="px-3 py-1.5 bg-primary/10 text-primary text-[10px] border border-primary/20 rounded hover:bg-primary hover:text-on-primary transition-all font-syne font-bold uppercase tracking-widest"
                      >
                        View
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 border border-error-container/30 rounded-xl bg-error-container/5">
                    <AlertTriangle size={24} className="text-error mx-auto mb-3 opacity-50" />
                    <div className="text-error text-sm font-medium">No active mentors found for this competency.</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Verify Modal Drawer ── */}
      <AnimatePresence>
        {verifySkillModal && (
          <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md"
            >
               <button
                  onClick={() => setVerifySkillModal(null)}
                  className="absolute -top-10 right-0 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={24} />
               </button>
               <SkillVerifier 
                 userId={currentUser.id} 
                 skillName={verifySkillModal} 
                 onVerifyComplete={() => {
                   fetchData();
                   if (selectedRole) handleAnalyze();
                   setTimeout(() => setVerifySkillModal(null), 2000);
                 }}
               />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
