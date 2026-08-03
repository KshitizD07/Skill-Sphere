import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Plus, CheckCircle,
  X, Shield, Github, Linkedin, Save, Building2,
  Zap, Award
} from 'lucide-react';
import ProfileAPI from './profileAPI';
import API from '../../api';
import { COLLEGES } from '../../data/colleges';
import SkillVerifier from '../skills/SkillVerifier';
import Navbar from '../../shared/components/Navbar';

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
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null); 
  const avatarInputRef = useRef(null);

  useEffect(() => { 
    if (activeUser?.id) { 
      // eslint-disable-next-line
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
    try { await API.post('/auth/logout'); } catch (err) { console.error('Logout error', err); }
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/'); 
  };

  const labelBase = "block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5";
  const inputBase = "w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var";

  if (!activeUser?.id) return (
    <div className="p-10 text-text-primary bg-bg-base h-screen font-outfit flex items-center justify-center">
      <p className="text-outline">Please log in to view your profile.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">

      <Navbar user={activeUser} onLogout={handleLogout} />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-6 md:p-10 w-full max-w-[1400px] mx-auto">
        {initialLoadDone && !formData.github && (
          <div className="mb-8 p-5 bg-[#fbbf24]/5 border-2 border-[#fbbf24]/30 rounded-md flex items-start gap-4 animate-pulse">
            <div className="p-2 bg-[#fbbf24]/10 rounded-sm">
              <Zap size={24} className="text-[#fbbf24]" />
            </div>
            <div>
              <h3 className="text-[#fbbf24] font-syne font-bold uppercase tracking-widest text-sm mb-1">Mandatory Authorization Required</h3>
              <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
                To maintain the quality of our professional network, linking your <strong className="text-text-primary">GitHub Account</strong> is mandatory. 
                <span className="block mt-2 font-bold text-error uppercase tracking-tighter">
                  Warning: Navigating away from this page without a linked GitHub will result in automatic account deletion.
                </span>
              </p>
            </div>
          </div>
        )}

        {initialLoadDone && !formData.college && (
          <div className="mb-8 p-5 bg-primary/5 border-2 border-primary/30 rounded-md flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-sm">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-primary font-syne font-bold uppercase tracking-widest text-sm mb-1">Action Required</h3>
              <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
                Please select your <strong className="text-text-primary">Institutional Affiliation</strong> to complete your profile setup. This helps us tailor your experience and connect you with peers.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Personal Profile</h1>
              <p className="font-syne text-[10px] tracking-[0.12em] uppercase text-outline">Manage your professional identity and skill network</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 font-syne font-bold text-xs uppercase tracking-[0.1em] hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 rounded-xs disabled:opacity-50 active:scale-[0.98]">
            <Save size={14} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="md:col-span-4 space-y-5">
            {/* Avatar block */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/15 transition-colors">
              <div className="absolute top-0 right-0 bg-outline-var/20 text-outline px-2 py-1 text-[9px] font-syne uppercase tracking-widest font-bold">Profile Card</div>
              <div className="w-28 h-28 rounded-full border-2 border-outline-var/40 overflow-hidden mb-4 mt-2 bg-surface-mid flex items-center justify-center group-hover:border-primary/40 transition-colors shadow-lg shadow-bg-base">
                {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-outline-var" />}
              </div>
              <p className="text-primary font-syne tracking-wide text-xs mt-1">{formData.headline || 'NO_HEADLINE_TAG'}</p>
              <div className="mt-3 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-bold tracking-widest text-text-primary">
                {activeUser.role === 'GUEST' 
                  ? `GUEST ${activeUser.guestPersona || 'STUDENT'}` 
                  : `${activeUser.role} CLASS`}
              </div>
              <p className={labelBase + " mt-4"}>Profile Photo</p>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              <button onClick={() => avatarInputRef.current.click()}
                className="w-full flex items-center justify-center gap-2 bg-surface-mid border border-outline-var/40 hover:border-primary/40 text-primary hover:text-secondary-bright p-2 text-xs font-syne font-medium tracking-wide rounded-xs transition-all outline-none">
                <Camera size={13} /> Update Image
              </button>
              {formData.avatar && (
                <button onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                  className="mt-3 text-[10px] uppercase font-bold tracking-widest text-[#656d84] hover:text-error font-syne transition-colors outline-none cursor-pointer">
                  Remove
                </button>
              )}
            </div>

            {/* Skills */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 relative group hover:border-secondary/15 transition-colors">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-secondary">Technical Skills</h3>
                <button onClick={() => setShowSkillSelector(!showSkillSelector)}
                  className="p-1 bg-primary/8 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all rounded-xs focus:outline-none">
                  <Plus size={14} />
                </button>
              </div>
              {showSkillSelector && (
                <div className="absolute top-14 left-0 w-full bg-surface-mid border border-outline-var/40 rounded-xs z-[200] max-h-48 overflow-y-auto shadow-2xl">
                  {allSkills.map(skill => (
                    <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                      className={`p-2.5 text-xs cursor-pointer hover:bg-surface-mid border-b border-outline-var/20 transition-colors ${mySkillNames.includes(skill.name) ? 'text-secondary-bright bg-surface-mid/50' : 'text-text-muted'}`}>
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
                    <span key={skillName} className={`px-2.5 py-1 border text-[10px] font-syne font-bold uppercase tracking-wide flex items-center gap-1 group/skill relative rounded-xs transition-colors ${verified ? 'bg-secondary-bright/8 border-secondary-bright/30 text-secondary-bright' : 'bg-primary/8 border-primary/20 text-primary'}`}>
                      {skillName}
                      {verified && (
                        source === 'GITHUB' ? <Github size={9} className="text-secondary-bright" /> :
                        source === 'CREDENTIAL' ? <Award size={9} className="text-secondary-bright" /> :
                        <CheckCircle size={9} className="text-secondary-bright" />
                      )}
                      <X size={9} className="cursor-pointer hover:text-error opacity-0 group-hover/skill:opacity-100 transition-opacity ml-1" onClick={() => toggleSkill(skillName)} />
                    </span>
                  );
                }) : <span className="text-[#656d84] text-xs italic font-outfit">No modules active.</span>}
              </div>
            </div>

            {/* Skill Verification */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 hover:border-primary/15 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="text-primary" size={15} />
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-primary">Skill Verification</h3>
              </div>
              <p className="text-xs text-outline mb-4 leading-relaxed">Establish credentials via repository analysis or certification.</p>
              {mySkillNames.length === 0 ? (
                <div className="text-center py-4 border border-outline-var/20 rounded-xs bg-surface-mid/50">
                  <p className="text-[#656d84] text-[10px] font-syne uppercase tracking-wide">Add skills to verify</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySkillNames.map(skillName => {
                    const skill = mySkillsRaw.find(s => (s.name || s.skill?.name) === skillName);
                    const verified = skill?.isVerified;

                    return (
                      <div key={skillName} className={`w-full p-2 border text-xs font-syne font-medium flex flex-col gap-2 transition-all rounded-xs ${
                          verified
                            ? 'bg-secondary-bright/5 border-secondary-bright/20 text-secondary-bright'
                            : 'bg-surface-mid border-outline-var/30 text-text-muted'
                        }`}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2">{skillName}{verified && <CheckCircle size={11} className="text-secondary-bright" />}</span>
                          {verified && <span className="text-[8px] uppercase tracking-[0.1em] font-bold text-secondary-bright/70">Verified</span>}
                        </div>

                        {!verified && (
                          <button onClick={() => { setSelectedSkill(skill); setShowVerifier(true); }}
                            className="w-full mt-1 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] uppercase font-bold tracking-wider rounded-xs flex items-center justify-center gap-1.5 font-syne transition-colors">
                            <Shield size={10} /> Verify
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — form */}
          <div className="md:col-span-8 bg-surface border border-outline-var/20 rounded-md p-8 relative">
            <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-6 flex items-center gap-2 border-b border-outline-var/30 pb-4">
              <User size={12} /> Profile Details
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelBase}>Full Name</label>
                  <input value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className={`${inputBase} text-base font-semibold`} placeholder="Your full name" />
                </div>
                <div>
                  <label className={labelBase}>Institutional Affiliation <span className="text-error">*</span></label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-primary transition-colors" size={15} />
                    <select value={formData.college} onChange={e => setFormData({...formData,college:e.target.value})}
                      className={`${inputBase} pl-10 appearance-none cursor-pointer focus:border-primary/60`}>
                      <option value="">No affiliation</option>
                      {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <label className={labelBase}>Professional Headline</label>
                <input value={formData.headline} onChange={e => setFormData({...formData,headline:e.target.value})} className={inputBase} placeholder="e.g. Full-stack developer & ML enthusiast" />
              </div>
              
              <div>
                <label className={labelBase}>Professional Bio</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData,bio:e.target.value})} rows={5}
                  className={`${inputBase} resize-none leading-relaxed`} placeholder="Brief description of your expertise and goals..." />
              </div>

              <div className="pt-4 border-t border-outline-var/20">
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-4">Social Connections</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`${labelBase} flex items-center gap-1.5`}><Github size={12} /> GitHub Profile <span className="text-error">*</span></label>
                    <input value={formData.github} onChange={e => setFormData({...formData,github:e.target.value})}
                      placeholder="github.com/username" className={`${inputBase} ${!formData.github ? 'border-error/40 focus:border-error/80' : ''}`} />
                  </div>
                  <div>
                    <label className={`${labelBase} flex items-center gap-1.5`}><Linkedin size={12} /> LinkedIn Profile</label>
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
        <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <button onClick={() => setShowVerifier(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-error-container hover:bg-error hover:text-on-primary text-white rounded-full transition-all border border-error/30 flex items-center justify-center">
              <X size={16} />
            </button>
            <SkillVerifier userId={activeUser.id} skillName={selectedSkill.name || selectedSkill.skill?.name} skillId={selectedSkill.id}
              onVerifyComplete={() => { setShowVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}
    </div>
  );
}