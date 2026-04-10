import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Plus, CheckCircle,
  X, Shield, Github, Linkedin, Save, Building2
} from 'lucide-react';
import ProfileAPI from './profileAPI';
import { COLLEGES } from '../../data/colleges';
import SkillVerifier from '../skills/SkillVerifier';

export default function MyProfile() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name:'',headline:'',bio:'',avatar:'',github:'',linkedin:'',college:'' });
  const [allSkills, setAllSkills] = useState([]);
  const [mySkillNames, setMySkillNames] = useState([]);
  const [verifiedSkillNames, setVerifiedSkillNames] = useState([]);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);
  const [selectedSkillToVerify, setSelectedSkillToVerify] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => { if (storedUser.id) { loadUserData(); loadAllSkills(); } }, []);

  const loadUserData = async () => {
    const userData = await ProfileAPI.getMyProfile();
    if (userData.error) return;
    setFormData({ name:userData.name||'', headline:userData.headline||'', bio:userData.bio||'', avatar:userData.avatar||'', github:userData.github||'', linkedin:userData.linkedin||'', college:userData.college||'' });
    if (userData.skills) {
      setMySkillNames(userData.skills.map(us => us.name || us.skill?.name).filter(Boolean));
      setVerifiedSkillNames(userData.skills.filter(us => us.isVerified).map(us => us.name || us.skill?.name).filter(Boolean));
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
      localStorage.setItem('user_data', JSON.stringify({ ...storedUser, ...formData }));
      alert('Profile updated successfully.');
    } catch (e) { console.error(e); alert('Failed to save profile.'); }
    setLoading(false);
  };

  const toggleSkill = (skillName) => {
    setMySkillNames(prev => prev.includes(skillName) ? prev.filter(n => n !== skillName) : [...prev, skillName]);
    setShowSkillSelector(false);
  };

  const labelBase = "block font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0] mb-1.5";
  const inputBase = "w-full bg-[#131b2e] border border-[#434655]/40 text-[#dae2fd] p-3 rounded-xs focus:border-[#adc6ff]/60 outline-none font-['Manrope'] text-sm transition-colors placeholder-[#434655]";

  if (!storedUser.id) return (
    <div className="p-10 text-[#dae2fd] bg-[#0b1326] h-screen font-['Manrope'] flex items-center justify-center">
      <p className="text-[#8d90a0]">Please log in to view your profile.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 border border-[#434655]/40 rounded-xs hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-extrabold text-[#dae2fd] tracking-tight">Edit Profile</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="md:col-span-1 space-y-5">
            {/* Avatar */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full border-2 border-[#434655]/40 overflow-hidden mb-4 bg-[#131b2e] flex items-center justify-center hover:border-[#adc6ff]/40 transition-colors">
                {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-[#434655]" />}
              </div>
              <p className={labelBase}>Profile Photo</p>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              <button onClick={() => avatarInputRef.current.click()}
                className="w-full flex items-center justify-center gap-2 bg-[#131b2e] border border-[#434655]/40 hover:border-[#adc6ff]/40 text-[#adc6ff] hover:text-[#89f5e7] p-2 text-xs font-['Space_Grotesk'] font-medium tracking-wide rounded-xs transition-all">
                <Camera size={13} /> Upload Photo
              </button>
              {formData.avatar && (
                <button onClick={() => setFormData(prev => ({ ...prev, avatar: '' }))}
                  className="mt-2 text-xs text-[#656d84] hover:text-[#ffb4ab] font-['Space_Grotesk'] transition-colors">
                  Remove
                </button>
              )}
            </div>

            {/* Skills */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-5 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#6bd8cb]">Skills</h3>
                <button onClick={() => setShowSkillSelector(!showSkillSelector)}
                  className="p-1 bg-[#adc6ff]/8 border border-[#adc6ff]/20 text-[#adc6ff] hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all rounded-xs">
                  <Plus size={14} />
                </button>
              </div>
              {showSkillSelector && (
                <div className="absolute top-14 left-0 w-full bg-[#131b2e] border border-[#434655]/40 rounded-xs z-[200] max-h-48 overflow-y-auto shadow-2xl">
                  {allSkills.map(skill => (
                    <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                      className={`p-2.5 text-xs cursor-pointer hover:bg-[#222a3d] border-b border-[#434655]/20 transition-colors ${mySkillNames.includes(skill.name) ? 'text-[#89f5e7]' : 'text-[#c3c6d7]'}`}>
                      {skill.name} {mySkillNames.includes(skill.name) && '✓'}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {mySkillNames.length > 0 ? mySkillNames.map(skillName => {
                  const verified = verifiedSkillNames.includes(skillName);
                  return (
                    <span key={skillName} className={`px-2.5 py-1 border text-[10px] font-['Space_Grotesk'] font-bold uppercase tracking-wide flex items-center gap-1 group relative rounded-xs ${verified ? 'bg-[#89f5e7]/8 border-[#89f5e7]/25 text-[#89f5e7]' : 'bg-[#adc6ff]/8 border-[#adc6ff]/20 text-[#adc6ff]'}`}>
                      {skillName}
                      {verified && <CheckCircle size={9} className="text-[#89f5e7]" />}
                      <X size={9} className="cursor-pointer hover:text-[#ffb4ab] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toggleSkill(skillName)} />
                    </span>
                  );
                }) : <span className="text-[#656d84] text-xs italic">No skills added.</span>}
              </div>
            </div>

            {/* Skill Verification */}
            <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="text-[#adc6ff]" size={15} />
                <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#adc6ff]">Skill Verification</h3>
              </div>
              <p className="text-xs text-[#8d90a0] mb-3 leading-relaxed">Verify skills with your GitHub repositories.</p>
              {mySkillNames.length === 0 ? (
                <div className="text-center py-4 border border-[#434655]/20 rounded-xs bg-[#131b2e]/50">
                  <p className="text-[#656d84] text-xs">Add skills first to verify them.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySkillNames.map(skillName => {
                    const verified = verifiedSkillNames.includes(skillName);
                    return (
                      <button key={skillName} type="button"
                        onClick={() => !verified && setSelectedSkillToVerify(skillName) & setShowVerifier(true)}
                        disabled={verified}
                        className={`w-full p-2.5 border text-xs font-['Space_Grotesk'] font-medium flex items-center justify-between group transition-all rounded-xs ${
                          verified
                            ? 'bg-[#89f5e7]/5 border-[#89f5e7]/20 text-[#89f5e7] cursor-not-allowed opacity-70'
                            : 'bg-[#131b2e] border-[#434655]/30 text-[#c3c6d7] hover:border-[#adc6ff]/40 hover:text-[#adc6ff] cursor-pointer'
                        }`}>
                        <span className="flex items-center gap-2">{skillName}{verified && <CheckCircle size={11} className="text-[#89f5e7]" />}</span>
                        {verified ? <span className="text-[9px] uppercase tracking-wide font-bold text-[#89f5e7]/70">Verified</span> : <Shield size={11} className="opacity-40 group-hover:opacity-100 text-[#adc6ff]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — form */}
          <div className="md:col-span-2 bg-[#171f33] border border-[#434655]/20 rounded-md p-8">
            <div className="space-y-5">
              <div>
                <label className={labelBase}>Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className={`${inputBase} text-base font-semibold`} placeholder="Your full name" />
              </div>
              <div>
                <label className={labelBase}>Institution</label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={15} />
                  <select value={formData.college} onChange={e => setFormData({...formData,college:e.target.value})}
                    className={`${inputBase} pl-10 appearance-none cursor-pointer`}>
                    <option value="">No affiliation</option>
                    {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelBase}>Headline</label>
                <input value={formData.headline} onChange={e => setFormData({...formData,headline:e.target.value})} className={inputBase} placeholder="e.g. Full-stack developer & ML enthusiast" />
              </div>
              <div>
                <label className={labelBase}>Bio</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData,bio:e.target.value})} rows={4}
                  className={`${inputBase} resize-none`} placeholder="Tell others about yourself..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`${labelBase} flex items-center gap-1`}><Github size={10} /> GitHub</label>
                  <input value={formData.github} onChange={e => setFormData({...formData,github:e.target.value})}
                    placeholder="github.com/username" className={inputBase} />
                </div>
                <div>
                  <label className={`${labelBase} flex items-center gap-1`}><Linkedin size={10} /> LinkedIn</label>
                  <input value={formData.linkedin} onChange={e => setFormData({...formData,linkedin:e.target.value})}
                    placeholder="linkedin.com/in/..." className={inputBase} />
                </div>
              </div>
              <button onClick={handleSave} disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#adc6ff] to-[#0f69dc] text-[#002e6a] font-['Space_Grotesk'] font-bold text-xs uppercase tracking-[0.1em] hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-2 rounded-xs disabled:opacity-50 active:scale-[0.98]">
                <Save size={15} /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showVerifier && (
        <div className="fixed inset-0 bg-[#0b1326]/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative">
            <button onClick={() => setShowVerifier(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 bg-[#93000a] hover:bg-[#ffb4ab] hover:text-[#002e6a] text-white rounded-full transition-all">
              <X size={16} />
            </button>
            <SkillVerifier userId={storedUser.id} skillName={selectedSkillToVerify}
              onVerifyComplete={() => { setShowVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}
    </div>
  );
}