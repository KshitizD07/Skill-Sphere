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
        
        {/* Top masthead */}
        <div className="px-6 md:px-10 py-6 border-b-2 border-secondary">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
              Skill Intelligence · Dashboard
            </span>
            <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/40">
              {new Date().toISOString().split('T')[0]}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-syne">{currentUser?.name || 'Dashboard'}</h1>
          <p className="text-text-muted text-sm mt-1 font-outfit max-w-2xl">
            Evaluate your skill gaps, generate custom roadmaps, and connect with mentors.
          </p>
        </div>

        {/* ── Mobile Segmented Tab Bar (Visible only on mobile screens < xl) ── */}
        <div className="px-6 pt-6 xl:hidden">
          <div className="flex bg-surface-mid p-1 rounded-lg border border-outline-var/30 gap-1">
            <button
              onClick={() => setMobileTab('config')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all text-center ${
                mobileTab === 'config'
                  ? 'bg-surface text-text-primary shadow-sm border border-outline-var/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Target & Skills
            </button>
            <button
              onClick={() => setMobileTab('diagnostics')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'diagnostics'
                  ? 'bg-surface text-text-primary shadow-sm border border-outline-var/30'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Diagnostics {analysis && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
            <button
              onClick={() => setMobileTab('feed')}
              className={`flex-1 py-2 rounded-md text-xs font-semibold font-outfit transition-all text-center ${
                mobileTab === 'feed'
                  ? 'bg-surface text-text-primary shadow-sm border border-outline-var/30'
                  : 'text-text-muted hover:text-text-primary'
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
            
            {/* Target Role Selection */}
            <div className="pb-5 border-b border-outline-var/30 relative" ref={roleDropdownRef}>
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/70 mb-3 flex items-center justify-between">
                <span>01 · Target Role</span>
                {selectedRole && (
                  <button 
                    onClick={() => setSelectedRole('')} 
                    className="font-outfit text-xs text-text-muted hover:text-text-primary capitalize transition-colors normal-case tracking-normal"
                  >
                    Clear
                  </button>
                )}
              </h3>

              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={15} className="absolute left-3.5 text-text-muted pointer-events-none" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-9 py-3 rounded-sm border border-outline-var/40 bg-surface-mid text-text-primary focus:border-primary/60 outline-none font-outfit text-sm transition-colors"
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
                      className="absolute z-50 left-0 right-0 mt-1 bg-surface border border-outline-var/40 rounded-sm shadow-lg overflow-hidden max-h-72 overflow-y-auto custom-scrollbar"
                    >
                      {/* Popular Role Chips */}
                      <div className="p-3 border-b border-outline-var/20">
                        <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60 mb-2">
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
                              className={`text-xs px-2.5 py-1 rounded-sm border transition-all font-outfit ${
                                selectedRole === popRole
                                  ? 'bg-primary text-on-primary border-primary font-semibold'
                                  : 'bg-surface border-outline-var/30 text-text-muted hover:border-outline-var/60 hover:text-text-primary'
                              }`}
                            >
                              {popRole}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* System Roles List */}
                      <div className="py-1">
                        <div className="px-3 py-1.5 font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
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
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'hover:bg-surface-mid text-text-primary'
                              }`}
                            >
                              <span>{r.title}</span>
                              {selectedRole === r.title && <Check size={14} className="text-primary" />}
                            </div>
                          ))}

                        {selectedRole && !roles.some(r => r.title.toLowerCase() === selectedRole.toLowerCase()) && (
                          <div
                            onClick={() => setIsRoleDropdownOpen(false)}
                            className="px-4 py-2.5 bg-surface-mid/60 text-xs text-text-primary font-medium flex items-center justify-between border-t border-outline-var/20 cursor-pointer hover:bg-surface-mid font-outfit"
                          >
                            <span>Use custom prompt: <strong>&ldquo;{selectedRole}&rdquo;</strong></span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Skills Inventory */}
            <div className="flex flex-col h-[420px]">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/70">
                  02 · Skills Inventory
                </h3>

                {/* Filter Toggle Pills */}
                {selectedRole ? (
                  <div className="flex bg-surface-mid p-0.5 rounded-lg border border-outline-var/30 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('role')}
                      className={`text-xs font-outfit font-medium px-2.5 py-1 rounded-md transition-all ${
                        inventoryFilter === 'role'
                          ? 'bg-surface text-text-primary shadow-xs border border-outline-var/30'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                      title="Show only skills relevant to selected role"
                    >
                      Role Skills ({roleSkillsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryFilter('all')}
                      className={`text-xs font-outfit font-medium px-2.5 py-1 rounded-md transition-all ${
                        inventoryFilter === 'all'
                          ? 'bg-surface text-text-primary shadow-xs border border-outline-var/30'
                          : 'text-text-muted hover:text-text-primary'
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
                <Search size={12} className="absolute left-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter inventory..."
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-surface-mid border border-outline-var/30 text-text-primary focus:border-primary/50 outline-none font-outfit"
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
                      className={`flex items-center gap-3 py-2.5 px-1 cursor-pointer transition-all border-b border-outline-var/20 hover:bg-primary/[0.03] ${
                        mySkills.includes(skill.id)
                          ? 'bg-primary/[0.04]'
                          : ''
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center transition-colors flex-shrink-0 ${
                        mySkills.includes(skill.id) ? 'bg-primary border-primary' : 'border-outline-var/50 bg-surface'
                      }`}>
                        {mySkills.includes(skill.id) && <Check size={10} className="text-on-primary" />}
                      </div>
                      <span className={`text-sm select-none transition-colors flex-1 font-outfit ${mySkills.includes(skill.id) ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                        {skill.name}
                      </span>
                      {(() => {
                        const userSk = userSkillsData.find(s => s.name.toLowerCase() === skill.name.toLowerCase());
                        if (userSk && userSk.isVerified) {
                          const scoreText = userSk.calculatedScore != null ? `${userSk.calculatedScore}/10` : '';
                          return (
                            <span className="font-mono text-[10px] tracking-[0.05em] uppercase text-accent whitespace-nowrap">
                              Verified{scoreText ? ` · ${scoreText}` : ''}
                            </span>
                          );
                        }
                        if (userSk) {
                          return (
                            <button
                              type="button"
                              title="Self-Declared — click to verify" 
                              className="text-xs text-text-muted hover:text-primary font-outfit font-medium px-2 py-0.5 rounded transition-colors" 
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
                      className="text-primary text-xs font-outfit font-semibold hover:underline"
                    >
                      Show All Catalog Skills
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostics Action Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={analyzing}
                className="flex-1 min-h-[46px] py-3 rounded-lg bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
              >
                {analyzing ? 'Analyzing...' : 'Run Diagnostics'}
              </button>
              <button
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                title="Force regenerate role requirements using AI"
                className="w-12 min-h-[46px] rounded-lg bg-surface border border-outline-var/40 text-text-muted hover:text-text-primary hover:border-outline-var transition-all flex items-center justify-center shadow-xs group"
              >
                <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Output + Activity */}
          <div className={`xl:col-span-8 flex flex-col gap-8 ${mobileTab === 'config' ? 'hidden xl:flex' : 'flex'}`}>

            {/* Analysis result canvas */}
            <div className={`flex-1 ${mobileTab === 'feed' ? 'hidden xl:block' : 'block'}`}>
              {analysis ? (
                <div className="relative overflow-hidden h-full flex flex-col justify-center">
                  {/* Section masthead */}
                  <div className="border-t-2 border-secondary pt-3 pb-4 mb-6">
                    <div className="flex justify-between items-baseline">
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                        03 · Diagnostic Results
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/40">
                        Score: {analysis.score}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
                    <div className="lg:col-span-8">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight font-syne mb-6">{analysis.role}</h2>
                      
                      {analysis.diagnosticReport && (
                        <div className="mb-6 py-4 border-t border-b border-outline-var/25">
                          <h4 className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline/60 mb-3">Assessment Summary</h4>
                          <div className="text-sm text-text-primary space-y-2 [&_strong]:text-primary [&_li]:ml-4 [&_ul]:list-disc font-outfit leading-relaxed">
                            <ReactMarkdown>{analysis.diagnosticReport}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline/60 mb-3">
                        Missing Skills
                      </div>
                      
                      {analysis.missingSkills?.length > 0 ? (
                        <div className="space-y-0">
                          {analysis.missingSkills.map(s => (
                            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-outline-var/20 hover:bg-primary/[0.03] transition-colors gap-2 group">
                              <div className="flex items-center gap-3">
                                <span className="font-outfit text-sm text-text-primary font-medium">{s.name}</span>
                                <span className="flex-1 hidden sm:block border-b border-dotted border-outline-var/30 min-w-[1rem] group-hover:border-primary/30 transition-colors" />
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleGenerateRoadmap(s.name)}
                                  className="px-2.5 py-1 rounded-sm text-xs font-medium font-outfit bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-all"
                                >
                                  Roadmap
                                </button>
                                <button
                                  onClick={() => setVerifySkillModal(s.name)}
                                  className="px-2.5 py-1 rounded-sm text-xs font-medium font-outfit text-text-muted hover:text-text-primary border border-outline-var/20 transition-all"
                                >
                                  Verify
                                </button>
                                <button
                                  onClick={() => handleFindMentors(s)}
                                  className="px-2.5 py-1 rounded-sm text-xs font-medium font-outfit text-text-muted hover:text-text-primary border border-outline-var/20 transition-all"
                                >
                                  Mentors
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-accent flex items-center gap-2 text-sm font-medium py-4 border-b border-outline-var/20 font-outfit">
                          <CheckCircle size={16} /> You meet all technical requirements for this role.
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-l border-outline-var/20 lg:pl-6 h-full">
                      <RadarChart score={analysis.score} />
                      <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/50 mt-2">Competency Match</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[320px] border-t-2 border-outline-var/20 pt-8 flex flex-col items-center justify-center text-outline-var space-y-4 text-center">
                  <Activity size={32} className="opacity-15 text-text-muted" />
                  <div>
                    <p className="font-outfit text-sm font-semibold text-text-primary mb-1">Awaiting Input</p>
                    <p className="text-text-muted text-xs max-w-sm font-outfit">Select a target role and check off your skills, then click <strong>Run Diagnostics</strong>.</p>
                  </div>
                </div>
              )}
            </div>

            {/* My Career Roadmaps panel */}
            <div className={`${mobileTab === 'diagnostics' ? 'hidden xl:block' : 'block'} space-y-8`}>
              {savedRoadmaps.length > 0 && (
                <div className="space-y-3">
                  <div className="border-t-2 border-secondary pt-3 pb-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                        04 · Active Learning Roadmaps
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/40">
                        Total ({savedRoadmaps.length})
                      </span>
                    </div>
                  </div>

                  <div className="divide-y divide-outline-var/20 max-h-60 overflow-y-auto pr-1">
                    {savedRoadmaps.map((rm) => (
                      <div
                        key={rm.id}
                        onClick={() => navigate(`/roadmap/${rm.id}`)}
                        className="py-3 px-1 cursor-pointer transition-colors flex items-center justify-between gap-4 group hover:bg-primary/[0.03]"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate font-outfit">
                              {rm.targetSkill}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-primary border border-primary/25 px-1.5 py-0.2 rounded-xs">
                              {rm.targetRole}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-muted font-outfit">
                            <div className="w-28 h-1 bg-surface-high overflow-hidden rounded-none border border-outline-var/20">
                              <div
                                className="h-full bg-accent"
                                style={{ width: `${rm.progress || 0}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-outline/60 tabular-nums">{rm.progress || 0}% complete</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-primary text-xs font-medium font-outfit shrink-0 group-hover:translate-x-0.5 transition-transform">
                          <span>Continue</span>
                          <ArrowRight size={12} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity feed panel */}
              <div className="space-y-3">
                <div className="border-t-2 border-secondary pt-3 pb-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                      05 · Network Activity Log
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/40">
                      Telemetry
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                  {activities.length > 0
                    ? activities.map(log => (
                      <div key={log.id} className="flex gap-3 text-sm border-l border-outline-var/30 pl-3 py-1.5 hover:border-primary/50 transition-colors font-outfit">
                        <div className="text-text-muted min-w-[70px] font-mono text-[10px] text-outline/60 pt-0.5 tabular-nums">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const labels = {
                              ACQUIRED_SKILL:  { text: 'Skill Verified',   color: 'text-accent' },
                              DIAGNOSTIC_RUN:  { text: 'Diagnostics Run',  color: 'text-primary' },
                              POST_CREATED:    { text: 'Post Published',   color: 'text-primary' },
                              POST_DELETED:    { text: 'Post Removed',     color: 'text-error' },
                              USER_LOGIN:      { text: 'System Access',    color: 'text-text-muted' },
                              USER_LOGOUT:     { text: 'Session Ended',    color: 'text-text-muted' },
                              PROFILE_UPDATED: { text: 'Profile Sync',     color: 'text-secondary' },
                              ACCOUNT_CREATED: { text: 'Node Created',     color: 'text-accent' },
                            };
                            const l = labels[log.action] || { text: log.action, color: 'text-primary' };
                            return <span className={`${l.color} font-mono text-[10px] font-semibold uppercase tracking-wider`}>{l.text}</span>;
                          })()}
                          <div className="text-text-muted text-xs mt-0.5 font-outfit truncate">{log.details}</div>
                        </div>
                      </div>
                    ))
                    : <div className="text-text-muted text-xs italic font-outfit py-2">No recent activity logged in the network.</div>}
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
              className="bg-bg-base border-l border-outline-var/40 w-full max-w-md h-full flex flex-col shadow-2xl relative font-outfit"
            >
              <div className="p-6 border-b-2 border-secondary flex justify-between items-center bg-surface-mid">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/60 mb-1">Mentorship Directory</p>
                  <h3 className="text-xl font-bold text-text-primary tracking-tight font-syne">
                    {selectedMissingSkill.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMissingSkill(null)}
                  className="w-7 h-7 rounded-xs border border-outline-var/40 flex items-center justify-center text-text-muted hover:border-outline-var hover:text-text-primary transition-colors text-xs font-mono"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-1">
                {loadingMentors ? (
                  <div className="flex flex-col items-center justify-center h-40 text-primary space-y-3">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">Scanning Network...</span>
                  </div>
                ) : mentors.length > 0 ? (
                  mentors.map(mentor => (
                    <div key={mentor.id} className="border-b border-outline-var/25 py-3 px-1 flex items-center justify-between hover:bg-primary/[0.03] transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xs bg-surface-mid border border-outline-var/30 flex items-center justify-center text-primary font-mono font-semibold text-xs">
                          {mentor.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="text-text-primary font-medium text-sm font-outfit">{mentor.name}</div>
                          <div className="font-mono text-[10px] text-text-muted uppercase tracking-wider">{mentor.role || 'Member'}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/profile/${mentor.id}`)}
                        className="px-2.5 py-1 text-primary text-xs border border-primary/30 rounded-xs hover:bg-primary hover:text-on-primary transition-all font-mono tracking-wider uppercase text-[10px]"
                      >
                        Profile
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 border border-outline-var/20 rounded-xs bg-surface-mid/40">
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
