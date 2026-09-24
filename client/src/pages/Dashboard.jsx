import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api';
import RoadmapAPI from '../features/roadmap/roadmapAPI';
import {
  AlertTriangle, CheckCircle,
  Activity, Users, X, Brain, BarChart2, ShieldAlert,
  ArrowRight, Search, ChevronDown, Sparkles, Filter, Check,
  Target, Layers, Compass, Clock
} from 'lucide-react';
import Navbar from '../shared/components/Navbar';
import SEOHead from '../shared/components/SEOHead';
import ReactMarkdown from 'react-markdown';
import SkillVerifier from '../features/skills/SkillVerifier';

// ─── Radar Chart (High-Craft Minimalist Visualization) ────────────────────────
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
    <div className="relative w-52 h-52 mx-auto mb-3">
      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
        {gridLevels.map((ratio, i) => (
          <polygon key={i} points={buildPoints(ratio)} fill="none" stroke="rgba(194, 159, 93, 0.15)" strokeWidth="1" />
        ))}
        {Array.from({ length: axes }, (_, i) => {
          const angle = (2 * Math.PI * i) / axes - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)}
              stroke="rgba(194, 159, 93, 0.2)" strokeWidth="1"
            />
          );
        })}
        {/* Animated fill polygon */}
        <polygon 
          points={buildPoints(dataRatio)} 
          fill="rgba(194, 159, 93, 0.18)" 
          stroke="#C29F5D" 
          strokeWidth="2" 
          strokeLinejoin="round"
        />
        <text x={cx} y={cy + 8} textAnchor="middle" fill="#111111" fontSize="22" fontWeight="700" fontFamily="Outfit, sans-serif">
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
      const skillNameList = newSkills
        .map(id => {
          const found = allSkills.find(s => s.id === id);
          return found ? found.name : id;
        })
        .filter(Boolean);
      await API.post('/skills/update', { userId: currentUser.id, skillIds: skillNameList });
      await fetchData(); // Sync detailed skill verification status
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
      const targetSkillName = skill.name || skill.id;
      const res = await API.get(`/skills/mentors/${encodeURIComponent(targetSkillName)}`);
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
        
        {/* Top Header */}
        <div className="border-b border-outline-var/60 bg-surface px-6 md:px-10 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-outline mb-1">
                <span>Platform</span>
                <span>/</span>
                <span className="text-secondary font-semibold">Skill Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-secondary tracking-tight font-syne">
                Skill Intelligence Dashboard
              </h1>
              <p className="text-text-muted text-sm mt-1 font-outfit max-w-2xl">
                Evaluate role benchmarks, analyze skill gaps with precision diagnostics, and generate targeted roadmaps.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-outline px-3 py-1.5 rounded-md bg-surface-mid border border-outline-var/40">
                {currentUser?.name || 'Engineer'} · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Mobile Segmented Tab Bar (Visible only on mobile screens < xl) ── */}
        <div className="px-6 pt-6 xl:hidden">
          <div className="flex bg-surface p-1 rounded-lg border border-outline-var/60 gap-1 shadow-xs">
            <button
              onClick={() => setMobileTab('config')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all text-center ${
                mobileTab === 'config'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-text-muted hover:text-secondary'
              }`}
            >
              Target & Skills
            </button>
            <button
              onClick={() => setMobileTab('diagnostics')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'diagnostics'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-text-muted hover:text-secondary'
              }`}
            >
              Diagnostics {analysis && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
            <button
              onClick={() => setMobileTab('feed')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all text-center ${
                mobileTab === 'feed'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-text-muted hover:text-secondary'
              }`}
            >
              Roadmaps
            </button>
          </div>
        </div>

        {/* Fluid Grid Panel Layout */}
        <div className="p-6 md:p-10 w-full max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Left Column: Controls (Role + Skills) */}
          <div className={`xl:col-span-4 space-y-6 ${mobileTab !== 'config' ? 'hidden xl:block' : 'block'}`}>
            
            {/* Target Role Selection Card */}
            <div className="bg-surface border border-outline-var/60 rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative" ref={roleDropdownRef}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-secondary" />
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                    Target Role
                  </h2>
                </div>
                {selectedRole && (
                  <button 
                    onClick={() => setSelectedRole('')} 
                    className="font-outfit text-xs text-text-muted hover:text-secondary transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute left-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-9 py-2.5 rounded-md border border-outline-var/50 bg-surface-mid/50 text-secondary placeholder:text-text-muted focus:bg-surface focus:border-secondary outline-none font-outfit text-sm transition-all"
                    placeholder="Search or select a target role..."
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
                    className="absolute right-3 text-text-muted hover:text-secondary transition-colors p-1"
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
                      className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-outline-var/60 rounded-md shadow-xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar"
                    >
                      {/* Popular Role Chips */}
                      <div className="p-3 border-b border-outline-var/40 bg-surface-mid/30">
                        <div className="font-mono text-[10px] tracking-wider uppercase text-outline font-medium mb-2">
                          Popular Roles
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
                              className={`text-xs px-2.5 py-1 rounded-md border transition-all font-outfit ${
                                selectedRole === popRole
                                  ? 'bg-secondary text-white border-secondary font-medium'
                                  : 'bg-surface border-outline-var/50 text-text-secondary hover:border-secondary/60 hover:text-secondary'
                              }`}
                            >
                              {popRole}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* System Roles List */}
                      <div className="py-1">
                        <div className="px-3 py-1.5 font-mono text-[10px] tracking-wider uppercase text-outline font-medium">
                          All Roles
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
                              className={`px-4 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors font-outfit ${
                                selectedRole === r.title
                                  ? 'bg-secondary/10 text-secondary font-semibold'
                                  : 'hover:bg-surface-mid text-text-primary'
                              }`}
                            >
                              <span>{r.title}</span>
                              {selectedRole === r.title && <Check size={14} className="text-secondary" />}
                            </div>
                          ))}

                        {selectedRole && !roles.some(r => r.title.toLowerCase() === selectedRole.toLowerCase()) && (
                          <div
                            onClick={() => setIsRoleDropdownOpen(false)}
                            className="px-4 py-2.5 bg-surface-mid/60 text-xs text-secondary font-medium flex items-center justify-between border-t border-outline-var/40 cursor-pointer hover:bg-surface-mid font-outfit"
                          >
                            <span>Use custom target: <strong>&ldquo;{selectedRole}&rdquo;</strong></span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Skills Inventory Card */}
            <div className="bg-surface border border-outline-var/60 rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col h-[520px]">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-outline-var/40">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-secondary" />
                  <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                    Skills Inventory
                  </h2>
                </div>

                {/* Filter Toggle Pills */}
                {selectedRole ? (
                  <div className="flex bg-surface-mid p-0.5 rounded-md border border-outline-var/40 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('role')}
                      className={`text-xs font-outfit font-medium px-2.5 py-1 rounded transition-all ${
                        inventoryFilter === 'role'
                          ? 'bg-surface text-secondary shadow-xs font-semibold'
                          : 'text-text-muted hover:text-secondary'
                      }`}
                      title="Show only skills relevant to selected role"
                    >
                      Role Skills ({roleSkillsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('all')}
                      className={`text-xs font-outfit font-medium px-2.5 py-1 rounded transition-all ${
                        inventoryFilter === 'all'
                          ? 'bg-surface text-secondary shadow-xs font-semibold'
                          : 'text-text-muted hover:text-secondary'
                      }`}
                      title="Show all skills in platform catalogue"
                    >
                      All ({allSkills.length})
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-text-muted font-outfit">
                    Total: {allSkills.length}
                  </span>
                )}
              </div>

              {/* Mini Search Input for Fast Skill Filtering */}
              <div className="relative mb-3">
                <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter inventory skills..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md bg-surface-mid/60 border border-outline-var/40 text-secondary placeholder:text-text-muted focus:bg-surface focus:border-secondary outline-none font-outfit transition-all"
                />
                {skillSearch && (
                  <button
                    onClick={() => setSkillSearch('')}
                    className="absolute right-2 top-2 text-text-muted hover:text-secondary text-[10px]"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Skill Checklist Container */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                {displayedSkills.length > 0 ? (
                  displayedSkills.map(skill => (
                    <div
                      key={skill.id}
                      onClick={() => toggleSkill(skill.id)}
                      className={`flex items-center gap-3 py-2 px-2.5 rounded-md cursor-pointer transition-all border ${
                        mySkills.includes(skill.id)
                          ? 'bg-surface-mid/50 border-outline-var/60 text-secondary'
                          : 'border-transparent hover:bg-surface-mid/40 text-text-secondary'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors flex-shrink-0 ${
                        mySkills.includes(skill.id) ? 'bg-secondary border-secondary text-white' : 'border-outline-var/60 bg-surface'
                      }`}>
                        {mySkills.includes(skill.id) && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <span className={`text-xs select-none transition-colors flex-1 font-outfit ${mySkills.includes(skill.id) ? 'text-secondary font-medium' : 'text-text-secondary'}`}>
                        {skill.name}
                      </span>
                      {(() => {
                        const userSk = userSkillsData.find(s => s.name.toLowerCase() === skill.name.toLowerCase());
                        if (userSk && userSk.isVerified) {
                          const scoreText = userSk.calculatedScore != null ? `${userSk.calculatedScore}/10` : '';
                          return (
                            <span className="font-mono text-[10px] tracking-wider uppercase text-accent font-semibold px-1.5 py-0.5 rounded bg-accent/10 whitespace-nowrap">
                              Verified{scoreText ? ` · ${scoreText}` : ''}
                            </span>
                          );
                        }
                        if (userSk) {
                          return (
                            <button
                              type="button"
                              title="Self-Declared — click to verify" 
                              className="text-xs text-text-muted hover:text-secondary font-outfit font-medium px-2 py-0.5 rounded hover:bg-surface transition-colors" 
                              onClick={(e) => { e.stopPropagation(); setVerifySkillModal(skill.name); }}
                            >
                              Verify
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="text-text-muted text-xs p-6 text-center space-y-2">
                    <p>No matching skills found for this role filter.</p>
                    <button
                      onClick={() => { setInventoryFilter('all'); setSkillSearch(''); }}
                      className="text-secondary text-xs font-outfit font-semibold hover:underline"
                    >
                      Show All Catalog Skills
                    </button>
                  </div>
                )}
              </div>

              {/* Diagnostics Action Buttons */}
              <div className="flex gap-2.5 pt-3 mt-3 border-t border-outline-var/40">
                <button
                  onClick={() => handleAnalyze(false)}
                  disabled={analyzing}
                  className="flex-1 min-h-[44px] py-2.5 rounded-md bg-secondary hover:bg-secondary-bright text-white font-outfit font-semibold text-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                  {analyzing ? 'Analyzing...' : 'Run Diagnostics'}
                </button>
                <button
                  onClick={() => handleAnalyze(true)}
                  disabled={analyzing}
                  title="Force regenerate role requirements using AI"
                  className="w-12 min-h-[44px] rounded-md bg-surface border border-outline-var/60 text-text-muted hover:text-secondary hover:border-secondary transition-all flex items-center justify-center shadow-xs group"
                >
                  <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Output + Activity */}
          <div className={`xl:col-span-8 flex flex-col gap-6 ${mobileTab === 'config' ? 'hidden xl:flex' : 'flex'}`}>

            {/* Analysis result canvas */}
            <div className={`flex-1 ${mobileTab === 'feed' ? 'hidden xl:block' : 'block'}`}>
              {analysis ? (
                <div className="bg-surface border border-outline-var/60 rounded-lg p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] relative">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-outline-var/40">
                    <div className="flex items-center gap-2">
                      <Compass size={16} className="text-secondary" />
                      <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                        Diagnostic Results
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="font-mono text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-secondary/5 text-secondary border border-secondary/20 font-semibold">
                        Role Match: {analysis.score}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-6">
                      <div>
                        <span className="text-xs font-mono tracking-wider uppercase text-outline">Target Benchmark</span>
                        <h3 className="text-2xl md:text-3xl font-extrabold text-secondary tracking-tight font-syne mt-0.5">{analysis.role}</h3>
                      </div>
                      
                      {analysis.diagnosticReport && (
                        <div className="p-4 rounded-md bg-surface-mid/40 border border-outline-var/40">
                          <h4 className="font-mono text-[10px] uppercase tracking-wider font-semibold text-secondary mb-2">Assessment Summary</h4>
                          <div className="text-sm text-text-primary space-y-2 [&_strong]:text-secondary [&_li]:ml-4 [&_ul]:list-disc font-outfit leading-relaxed">
                            <ReactMarkdown>{analysis.diagnosticReport}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-mono text-[10px] uppercase tracking-wider font-semibold text-secondary">
                            Identified Skill Gaps ({analysis.missingSkills?.length || 0})
                          </h4>
                        </div>
                        
                        {analysis.missingSkills?.length > 0 ? (
                          <div className="divide-y divide-outline-var/30 border border-outline-var/40 rounded-md overflow-hidden bg-surface">
                            {analysis.missingSkills.map(s => (
                              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 px-3.5 hover:bg-surface-mid/30 transition-colors gap-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  <span className="font-outfit text-sm text-secondary font-medium">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleGenerateRoadmap(s.name)}
                                    className="px-3 py-1 rounded-md text-xs font-medium font-outfit bg-secondary text-white hover:bg-secondary-bright transition-all shadow-xs"
                                  >
                                    Roadmap
                                  </button>
                                  <button
                                    onClick={() => setVerifySkillModal(s.name)}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium font-outfit text-text-secondary hover:text-secondary border border-outline-var/60 hover:border-secondary transition-all"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => handleFindMentors(s)}
                                    className="px-2.5 py-1 rounded-md text-xs font-medium font-outfit text-text-secondary hover:text-secondary border border-outline-var/60 hover:border-secondary transition-all"
                                  >
                                    Mentors
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 rounded-md bg-accent/10 border border-accent/20 text-accent flex items-center gap-2.5 text-sm font-medium font-outfit">
                            <CheckCircle size={16} /> You meet all technical requirements evaluated for this role benchmark.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-l border-outline-var/30 lg:pl-6 h-full py-4">
                      <RadarChart score={analysis.score} />
                      <p className="font-mono text-[10px] tracking-wider uppercase text-outline font-medium mt-1">Competency Alignment</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-outline-var/60 rounded-lg p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] min-h-[340px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-surface-mid border border-outline-var/50 flex items-center justify-center text-outline">
                    <Activity size={22} />
                  </div>
                  <div>
                    <h3 className="font-syne text-base font-bold text-secondary mb-1">Awaiting Diagnostic Run</h3>
                    <p className="text-text-muted text-xs max-w-sm font-outfit leading-relaxed">
                      Select your target role and check off your current skills inventory, then click <strong>Run Diagnostics</strong> to generate your benchmark report.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* My Career Roadmaps & Platform Activity Cards */}
            <div className={`${mobileTab === 'diagnostics' ? 'hidden xl:block' : 'block'} space-y-6`}>
              {savedRoadmaps.length > 0 && (
                <div className="bg-surface border border-outline-var/60 rounded-lg p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-var/40">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-secondary" />
                      <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                        Active Learning Roadmaps
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-outline font-medium px-2 py-0.5 rounded bg-surface-mid border border-outline-var/30">
                      {savedRoadmaps.length} Active
                    </span>
                  </div>

                  <div className="divide-y divide-outline-var/30 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {savedRoadmaps.map((rm) => (
                      <div
                        key={rm.id}
                        onClick={() => navigate(`/roadmap/${rm.id}`)}
                        className="py-3 px-2 cursor-pointer transition-colors flex items-center justify-between gap-4 group hover:bg-surface-mid/40 rounded-md"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-secondary group-hover:text-primary transition-colors truncate font-outfit">
                              {rm.targetSkill}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-primary border border-primary/25 px-1.5 py-0.5 rounded">
                              {rm.targetRole}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-muted font-outfit">
                            <div className="w-32 h-1.5 bg-surface-mid overflow-hidden rounded-full border border-outline-var/30">
                              <div
                                className="h-full bg-secondary rounded-full"
                                style={{ width: `${rm.progress || 0}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-outline tabular-nums font-medium">{rm.progress || 0}% completed</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-secondary text-xs font-medium font-outfit shrink-0 group-hover:translate-x-0.5 transition-transform">
                          <span>Continue</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity feed panel */}
              <div className="bg-surface border border-outline-var/60 rounded-lg p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-outline-var/40">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-secondary" />
                    <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-secondary">
                      Recent Activity
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] tracking-wider uppercase text-outline">
                    System Feed
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {activities.length > 0
                    ? activities.map(log => (
                      <div key={log.id} className="flex gap-3 text-sm border-l-2 border-outline-var/40 pl-3 py-1.5 hover:border-secondary transition-colors font-outfit">
                        <div className="text-text-muted min-w-[70px] font-mono text-[10px] text-outline pt-0.5 tabular-nums">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const labels = {
                              ACQUIRED_SKILL:  { text: 'Skill Verified',   color: 'text-accent' },
                              DIAGNOSTIC_RUN:  { text: 'Diagnostics Run',  color: 'text-secondary font-semibold' },
                              POST_CREATED:    { text: 'Post Published',   color: 'text-secondary font-semibold' },
                              POST_DELETED:    { text: 'Post Removed',     color: 'text-error' },
                              USER_LOGIN:      { text: 'System Access',    color: 'text-text-muted' },
                              USER_LOGOUT:     { text: 'Session Ended',    color: 'text-text-muted' },
                              PROFILE_UPDATED: { text: 'Profile Sync',     color: 'text-primary' },
                              ACCOUNT_CREATED: { text: 'Account Created',  color: 'text-accent' },
                            };
                            const l = labels[log.action] || { text: log.action, color: 'text-secondary font-semibold' };
                            return <span className={`${l.color} font-mono text-[10px] font-semibold uppercase tracking-wider`}>{l.text}</span>;
                          })()}
                          <div className="text-text-muted text-xs mt-0.5 font-outfit truncate">{log.details}</div>
                        </div>
                      </div>
                    ))
                    : <div className="text-text-muted text-xs italic font-outfit py-2">No recent activity recorded.</div>}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Mentor Modal Drawer (Overhauled) ── */}
      <AnimatePresence>
        {selectedMissingSkill && (
          <div className="fixed inset-0 bg-secondary/30 backdrop-blur-xs z-[100] flex items-center justify-end">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="bg-surface border-l border-outline-var/60 w-full max-w-md h-full flex flex-col shadow-2xl relative font-outfit"
            >
              <div className="p-6 border-b border-outline-var/60 flex justify-between items-center bg-surface-mid/40">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">Mentor Directory</p>
                  <h3 className="text-xl font-bold text-secondary tracking-tight font-syne">
                    {selectedMissingSkill.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMissingSkill(null)}
                  className="w-7 h-7 rounded-md border border-outline-var/60 flex items-center justify-center text-text-muted hover:border-secondary hover:text-secondary transition-colors text-xs font-mono"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar">
                {loadingMentors ? (
                  <div className="flex flex-col items-center justify-center h-40 text-secondary space-y-3">
                    <div className="w-6 h-6 border-2 border-secondary/20 border-t-secondary rounded-full animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Scanning Peer Network...</span>
                  </div>
                ) : mentors.length > 0 ? (
                  mentors.map(mentor => (
                    <div key={mentor.id} className="border border-outline-var/50 rounded-md p-3.5 flex items-center justify-between hover:bg-surface-mid/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-surface-mid border border-outline-var/40 flex items-center justify-center text-secondary font-mono font-semibold text-xs">
                          {mentor.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-secondary font-medium text-sm font-outfit">{mentor.name}</div>
                          <div className="font-mono text-[10px] text-text-muted uppercase tracking-wider">{mentor.role || 'Member'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${mentor.id}`)}
                        className="px-3 py-1.5 text-white bg-secondary hover:bg-secondary-bright text-xs rounded-md transition-all font-outfit font-medium shadow-xs"
                      >
                        Profile
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 border border-outline-var/40 rounded-md bg-surface-mid/30">
                    <div className="text-text-muted text-xs font-medium font-outfit">No active mentors found for this competency.</div>
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
                 onVerifyComplete={async () => {
                   await fetchData();
                   if (selectedRole) {
                     await handleAnalyze(false);
                   }
                   setTimeout(() => setVerifySkillModal(null), 1800);
                 }}
               />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
