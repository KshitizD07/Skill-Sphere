import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Plus, CheckCircle,
  X, Shield, Github, Linkedin, Save, Building2,
  LogOut, BarChart2, Zap, Award
} from 'lucide-react';
import ProfileAPI from './profileAPI';
import API from '../../api';
import { COLLEGES } from '../../data/colleges';
import SkillVerifier from '../skills/SkillVerifier';
import ProofVerifier from '../skills/ProofVerifier';
import NotificationBell from '../../shared/components/NotificationBell';

export default function MyProfile({ user, onUserUpdate }) {
  const navigate = useNavigate();
  // Prefer the prop user, fall back to localStorage
  const activeUser = user || JSON.parse(localStorage.getItem('user_data') || '{}');
  
  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [formData, setFormData] = useState({ name:'',headline:'',bio:'',avatar:'',github:'',linkedin:'',college:'' });
  const [allSkills, setAllSkills] = useState([]);
  const [mySkillNames, setMySkillNames] = useState([]);
  const [mySkillsRaw, setMySkillsRaw] = useState([]);
  const [verifiedSkillNames, setVerifiedSkillNames] = useState([]);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);
  const [showProofVerifier, setShowProofVerifier] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null); 
  const avatarInputRef = useRef(null);

  useEffect(() => { 
    if (activeUser?.id) { 
      Promise.all([loadUserData(), loadAllSkills()]).finally(() => setInitialLoadDone(true));
    } else {
      setInitialLoadDone(true);
    }
  }, [activeUser?.id]);

  const loadUserData = async () => {
    try {
      const userData = await ProfileAPI.getMyProfile();
      if (userData.error) return;
      setFormData({ 
        name:     userData.name || '', 
        headline: userData.headline || '', 
        bio:      userData.bio || '', 
        avatar:   userData.avatar || '', 
        github:   userData.github || '', 
        linkedin: userData.linkedin || '', 
        college:  userData.college || '' 
      });
      if (userData.skills) {
        setMySkillsRaw(userData.skills);
        setMySkillNames(userData.skills.map(us => us.name || us.skill?.name).filter(Boolean));
        setVerifiedSkillNames(userData.skills.filter(us => us.isVerified).map(us => us.name || us.skill?.name).filter(Boolean));
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadAllSkills = async () => {
    const skills = await ProfileAPI.getAllSkills();
    if (Array.isArray(skills)) setAllSkills(skills.filter(s => s && s.name?.trim()));
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const cleanedForm = {
        ...formData,
        github:   formData.github.replace(/^https?:\/\//, '').trim(),
        linkedin: formData.linkedin.replace(/^https?:\/\//, '').trim(),
      };
      await ProfileAPI.updateProfile(cleanedForm);
      await ProfileAPI.saveSkills(mySkillNames);
      
      const updatedUser = { ...activeUser, ...cleanedForm };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      if (onUserUpdate) onUserUpdate(updatedUser);
      
      alert('Profile updated successfully.');
    } catch (e) { console.error(e); alert('Failed to save profile.'); }
    setLoading(false);
  };

  const toggleSkill = (skillName) => {
    setMySkillNames(prev => prev.includes(skillName) ? prev.filter(n => n !== skillName) : [...prev, skillName]);
    setShowSkillSelector(false);
  };

  const handleLogout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.removeItem('user_data');
    window.location.href = '/'; 
  };

  const labelBase = "block font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1.5";
  const inputBase = "w-full bg-[#131b2e] border border-[#434655]/40 text-[#dae2fd] p-3 rounded-xs focus:border-[#adc6ff]/60 outline-none font-['Manrope'] text-sm transition-colors placeholder-[#434655]";

  if (!activeUser?.id) return (
    <div className="p-10 text-[#dae2fd] bg-[#0b1326] h-screen font-['Manrope'] flex items-center justify-center">
      <p className="text-[#8d90a0]">Please log in to view your profile.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">
      {/* ── Global App Header ── */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-[#434655]/30 pb-5">
        <div onClick={() => navigate('/')} className="cursor-pointer group flex items-center gap-2">
          <span className="text-xl font-extrabold text-[#dae2fd] group-hover:text-[#adc6ff] transition-colors tracking-tight">
            Skill<span className="text-[#adc6ff] group-hover:text-[#89f5e7]">Sphere</span>
          </span>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-6 hidden md:flex">
          <div
            onClick={() => navigate('/grid')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <BarChart2 size={18} className="text-[#adc6ff] group-hover:text-[#89f5e7] transition-colors" />
            <span className="text-lg font-bold text-[#dae2fd] tracking-tight group-hover:text-[#adc6ff] transition-colors">
              Insights
            </span>
          </div>
          <div
            onClick={() => navigate('/network')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Users size={18} className="text-[#656d84] group-hover:text-[#89f5e7] transition-colors" />
            <span className="text-lg font-bold text-[#8d90a0] tracking-tight group-hover:text-dae2fd transition-colors">
              Network
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div
            onClick={() => navigate(`/profile/${activeUser.id}`)}
            className="w-9 h-9 rounded-full border border-[#434655]/50 hover:border-[#adc6ff]/50 cursor-pointer flex items-center justify-center bg-[#171f33] transition-all hover:shadow-[0_0_12px_rgba(173,198,255,0.15)] overflow-hidden"
          >
            {formData.avatar || activeUser.avatar
              ? <img src={formData.avatar || activeUser.avatar} className="w-full h-full object-cover" alt="" />
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

      <div className="max-w-6xl mx-auto">
        {initialLoadDone && !formData.github && (
          <div className="mb-8 p-5 bg-[#fbbf24]/5 border-2 border-[#fbbf24]/30 rounded-md flex items-start gap-4 animate-pulse">
            <div className="p-2 bg-[#fbbf24]/10 rounded-sm">
              <Zap size={24} className="text-[#fbbf24]" />
            </div>
            <div>
              <h3 className="text-[#fbbf24] font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm mb-1">Mandatory Authorization Required</h3>
              <p className="text-[#c3c6d7] text-xs leading-relaxed max-w-2xl">
                To maintain the quality of our professional network, linking your <strong className="text-[#dae2fd]">GitHub Account</strong> is mandatory. 
                <span className="block mt-2 font-bold text-[#ffb4ab] uppercase tracking-tighter">
                  Warning: Navigating away from this page without a linked GitHub will result in automatic account deletion.
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 border border-[#434655]/40 rounded-xs hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-[#dae2fd] tracking-tight">Configuration Matrix</h1>
              <p className="font-['Space_Grotesk'] text-[10px] tracking-[0.12em] uppercase text-[#8d90a0]">Edit user profile data</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="px-6 py-2.5 bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20 font-['Space_Grotesk'] font-bold text-xs uppercase tracking-[0.1em] hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all flex items-center gap-2 rounded-xs disabled:opacity-50 active:scale-[0.98]">
            <Save size={15} /> {loading ? 'Saving Data...' : 'Commit Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="md:col-span-4 space-y-5">
            {/* Avatar block */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-[#adc6ff]/15 transition-colors">
              <div className="absolute top-0 right-0 bg-[#434655]/20 text-[#8d90a0] px-2 py-1 text-[9px] font-['Space_Grotesk'] uppercase tracking-widest font-bold">Identity</div>
              <div className="w-28 h-28 rounded-full border-2 border-[#434655]/40 overflow-hidden mb-4 mt-2 bg-[#131b2e] flex items-center justify-center group-hover:border-[#adc6ff]/40 transition-colors shadow-lg shadow-[#0b1326]">
                {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-[#434655]" />}
              </div>
              <p className="text-[#adc6ff] font-['Space_Grotesk'] tracking-wide text-xs mt-1">{formData.headline || 'NO_HEADLINE_TAG'}</p>
              <div className="mt-3 px-3 py-1 bg-[#adc6ff]/10 border border-[#adc6ff]/20 rounded text-[10px] font-bold tracking-widest text-[#dae2fd]">
                {activeUser.role === 'GUEST' 
                  ? `GUEST ${activeUser.guestPersona || 'STUDENT'}` 
                  : `${activeUser.role} CLASS`}
              </div>
              <p className={labelBase + " mt-4"}>Profile Photo</p>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              <button onClick={() => avatarInputRef.current.click()}
                className="w-full flex items-center justify-center gap-2 bg-[#131b2e] border border-[#434655]/40 hover:border-[#adc6ff]/40 text-[#adc6ff] hover:text-[#89f5e7] p-2 text-xs font-['Space_Grotesk'] font-medium tracking-wide rounded-xs transition-all outline-none">
                <Camera size={13} /> Update Image
              </button>
              {formData.avatar && (
                <button onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                  className="mt-3 text-[10px] uppercase font-bold tracking-widest text-[#656d84] hover:text-[#ffb4ab] font-['Space_Grotesk'] transition-colors outline-none cursor-pointer">
                  Remove
                </button>
              )}
            </div>

            {/* Skills */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 relative group hover:border-[#6bd8cb]/15 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Technical Modules</h3>
                <button onClick={() => setShowSkillSelector(!showSkillSelector)}
                  className="p-1 bg-[#adc6ff]/8 border border-[#adc6ff]/20 text-[#adc6ff] hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all rounded-xs focus:outline-none">
                  <Plus size={14} />
                </button>
              </div>
              {showSkillSelector && (
                <div className="absolute top-14 left-0 w-full bg-[#131b2e] border border-[#434655]/40 rounded-xs z-[200] max-h-48 overflow-y-auto shadow-2xl">
                  {allSkills.map(skill => (
                    <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                      className={`p-2.5 text-xs cursor-pointer hover:bg-[#222a3d] border-b border-[#434655]/20 transition-colors ${mySkillNames.includes(skill.name) ? 'text-[#89f5e7] bg-[#222a3d]/50' : 'text-[#c3c6d7]'}`}>
                      {skill.name} {mySkillNames.includes(skill.name) && '✓'}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {mySkillNames.length > 0 ? mySkillNames.map(skillName => {
                  const skill = mySkillsRaw.find(s => (s.name || s.skill?.name) === skillName);
                  const verified = skill?.isVerified;
                  const source = skill?.verificationSource;

                  return (
                    <span key={skillName} className={`px-2.5 py-1 border text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-wide flex items-center gap-1 group/skill relative rounded-xs transition-colors ${verified ? 'bg-[#89f5e7]/8 border-[#89f5e7]/30 text-[#89f5e7]' : 'bg-[#adc6ff]/8 border-[#adc6ff]/20 text-[#adc6ff]'}`}>
                      {skillName}
                      {verified && (
                        source === 'GITHUB' ? <Github size={9} className="text-[#89f5e7]" /> :
                        source === 'CREDENTIAL' ? <Award size={9} className="text-[#89f5e7]" /> :
                        <CheckCircle size={9} className="text-[#89f5e7]" />
                      )}
                      <X size={9} className="cursor-pointer hover:text-[#ffb4ab] opacity-0 group-hover/skill:opacity-100 transition-opacity ml-1" onClick={() => toggleSkill(skillName)} />
                    </span>
                  );
                }) : <span className="text-[#656d84] text-xs italic font-['Manrope']">No modules active.</span>}
              </div>
            </div>

            {/* Skill Verification */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 hover:border-[#adc6ff]/15 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-[#adc6ff]" size={15} />
                <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#adc6ff]">Verification Interface</h3>
              </div>
              <p className="text-xs text-[#8d90a0] mb-4 leading-relaxed">Establish credentials via repository analysis or certification.</p>
              {mySkillNames.length === 0 ? (
                <div className="text-center py-4 border border-[#434655]/20 rounded-xs bg-[#131b2e]/50">
                  <p className="text-[#656d84] text-[10px] font-['Space_Grotesk'] uppercase tracking-wide">Awaiting modules</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySkillNames.map(skillName => {
                    const skill = mySkillsRaw.find(s => (s.name || s.skill?.name) === skillName);
                    const verified = skill?.isVerified;

                    return (
                      <div key={skillName} className={`w-full p-2 border text-xs font-['Space_Grotesk'] font-medium flex flex-col gap-2 transition-all rounded-xs ${
                          verified
                            ? 'bg-[#89f5e7]/5 border-[#89f5e7]/20 text-[#89f5e7]'
                            : 'bg-[#131b2e] border-[#434655]/30 text-[#c3c6d7]'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">{skillName}{verified && <CheckCircle size={11} className="text-[#89f5e7]" />}</span>
                          {verified && <span className="text-[8px] uppercase tracking-[0.1em] font-bold text-[#89f5e7]/70">Verified</span>}
                        </div>

                        {!verified && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setSelectedSkill(skill); setShowVerifier(true); }}
                              className="flex-1 py-1.5 bg-[#adc6ff]/10 hover:bg-[#adc6ff]/20 text-[#adc6ff] border border-[#adc6ff]/20 text-[9px] uppercase font-bold tracking-wider rounded-xs flex items-center justify-center gap-1">
                              <Github size={10} /> GitHub
                            </button>
                            <button onClick={() => { setSelectedSkill(skill); setShowProofVerifier(true); }}
                              className="flex-1 py-1.5 bg-[#89f5e7]/10 hover:bg-[#89f5e7]/20 text-[#89f5e7] border border-[#89f5e7]/20 text-[9px] uppercase font-bold tracking-wider rounded-xs flex items-center justify-center gap-1">
                              <Award size={10} /> Certificate
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — form */}
          <div className="md:col-span-8 bg-[#171f33] border border-[#434655]/20 rounded-md p-8 relative">
            <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-6 flex items-center gap-2 border-b border-[#434655]/30 pb-4">
              <User size={12} /> Core Profile Data
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelBase}>Full Designation</label>
                  <input value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className={`${inputBase} text-base font-semibold`} placeholder="Your full name" />
                </div>
                <div>
                  <label className={labelBase}>Affiliated Organization</label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={15} />
                    <select value={formData.college} onChange={e => setFormData({...formData,college:e.target.value})}
                      className={`${inputBase} pl-10 appearance-none cursor-pointer focus:border-[#adc6ff]/60`}>
                      <option value="">No affiliation</option>
                      {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <label className={labelBase}>Headline</label>
                <input value={formData.headline} onChange={e => setFormData({...formData,headline:e.target.value})} className={inputBase} placeholder="e.g. Full-stack developer & ML enthusiast" />
              </div>
              
              <div>
                <label className={labelBase}>Bio Data</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData,bio:e.target.value})} rows={5}
                  className={`${inputBase} resize-none leading-relaxed`} placeholder="Brief description of your expertise and goals..." />
              </div>

              <div className="pt-4 border-t border-[#434655]/20">
                <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-4">External Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`${labelBase} flex items-center gap-1.5`}><Github size={12} /> GitHub Registry</label>
                    <input value={formData.github} onChange={e => setFormData({...formData,github:e.target.value})}
                      placeholder="github.com/username" className={inputBase} />
                  </div>
                  <div>
                    <label className={`${labelBase} flex items-center gap-1.5`}><Linkedin size={12} /> LinkedIn Network</label>
                    <input value={formData.linkedin} onChange={e => setFormData({...formData,linkedin:e.target.value})}
                      placeholder="linkedin.com/in/..." className={inputBase} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {showVerifier && selectedSkill && (
        <div className="fixed inset-0 bg-[#0b1326]/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <button onClick={() => setShowVerifier(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-[#93000a] hover:bg-[#ffb4ab] hover:text-[#002e6a] text-white rounded-full transition-all border border-[#ffb4ab]/30 flex items-center justify-center">
              <X size={16} />
            </button>
            <SkillVerifier userId={activeUser.id} skillName={selectedSkill.name || selectedSkill.skill?.name}
              onVerifyComplete={() => { setShowVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}

      {showProofVerifier && selectedSkill && (
        <div className="fixed inset-0 bg-[#0b1326]/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <button onClick={() => setShowProofVerifier(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-[#93000a] hover:bg-[#ffb4ab] hover:text-[#002e6a] text-white rounded-full transition-all border border-[#ffb4ab]/30 flex items-center justify-center">
              <X size={16} />
            </button>
            <ProofVerifier skillId={selectedSkill.id} skillName={selectedSkill.name || selectedSkill.skill?.name}
              onVerifyComplete={() => { setShowProofVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}
    </div>
  );
}