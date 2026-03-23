import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Cpu, Plus, CheckCircle,
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
      alert('IDENTITY_RECORD_UPDATED');
    } catch (e) { console.error(e); alert('UPDATE_FAILED'); }
    setLoading(false);
  };

  const toggleSkill = (skillName) => {
    setMySkillNames(prev => prev.includes(skillName) ? prev.filter(n => n !== skillName) : [...prev, skillName]);
    setShowSkillSelector(false);
  };

  if (!storedUser.id) return <div className="p-10 text-white bg-black h-screen font-mono">ACCESS_DENIED.</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition"><ArrowLeft size={20} /></button>
          <h1 className="text-3xl font-black text-white font-['Orbitron'] tracking-widest">EDIT_DOSSIER</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 p-6 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-2 border-cyan-500/50 overflow-hidden mb-4 bg-black flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={48} className="text-gray-600" />}
              </div>
              <p className="text-xs text-cyan-500 font-mono mb-2">IMAGE_SOURCE_URL</p>
              <div className="relative w-full">
                <Camera size={14} className="absolute left-3 top-3 text-gray-500" />
                <input value={formData.avatar} onChange={e => setFormData({...formData,avatar:e.target.value})} placeholder="https://..." className="w-full bg-black border border-gray-700 text-cyan-400 pl-8 p-2 text-xs focus:border-cyan-400 outline-none font-mono" />
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 p-4 relative">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-cyan-400 font-bold font-['Orbitron'] text-sm flex items-center gap-2"><Cpu size={14} /> INSTALLED_MODULES</h3>
                <button onClick={() => setShowSkillSelector(!showSkillSelector)} className="p-1 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black transition z-10 relative"><Plus size={14} /></button>
              </div>
              {showSkillSelector && (
                <div className="absolute top-12 left-0 w-full bg-black border border-cyan-500 z-[200] max-h-48 overflow-y-auto shadow-[0_0_20px_rgba(0,0,0,0.8)]">
                  {allSkills.map(skill => (
                    <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                      className={`p-2 text-xs font-mono cursor-pointer hover:bg-cyan-500 hover:text-black border-b border-gray-800 ${mySkillNames.includes(skill.name) ? 'text-green-500' : 'text-gray-400'}`}>
                      {skill.name} {mySkillNames.includes(skill.name) && '✓'}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {mySkillNames.length > 0 ? mySkillNames.map(skillName => {
                  const verified = verifiedSkillNames.includes(skillName);
                  return (
                    <span key={skillName} className={`px-2 py-1 border text-xs font-bold font-mono flex items-center gap-1 group relative ${verified ? 'bg-green-900/20 border-green-500/50' : 'bg-cyan-900/20 border-cyan-500/30'}`}>
                      {skillName}
                      {verified && <CheckCircle size={10} className="text-green-500" />}
                      <X size={10} className="cursor-pointer hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toggleSkill(skillName)} />
                    </span>
                  );
                }) : <span className="text-gray-600 text-xs italic">NO_DATA...</span>}
              </div>
            </div>

            <div className="bg-black border border-purple-500/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="text-purple-400" size={16} />
                <h3 className="text-purple-400 font-bold font-['Orbitron'] text-sm">GITHUB_VERIFICATION</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3 font-mono">Verify skills with code repositories</p>
              {mySkillNames.length === 0 ? (
                <div className="text-center py-4 border border-gray-800 bg-gray-900/30"><p className="text-gray-600 text-xs font-mono">Add skills first</p></div>
              ) : (
                <div className="space-y-2">
                  {mySkillNames.map(skillName => {
                    const verified = verifiedSkillNames.includes(skillName);
                    return (
                      <button key={skillName} type="button" onClick={() => !verified && setSelectedSkillToVerify(skillName) & setShowVerifier(true)} disabled={verified}
                        className={`w-full p-2 border text-xs font-mono flex items-center justify-between group transition ${verified ? 'bg-green-900/20 border-green-500/50 text-green-300 cursor-not-allowed opacity-60' : 'bg-purple-900/20 border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white cursor-pointer'}`}>
                        <span className="flex items-center gap-2">{skillName}{verified && <CheckCircle size={12} className="text-green-500" />}</span>
                        {!verified && <Shield size={12} className="opacity-50 group-hover:opacity-100" />}
                        {verified && <span className="text-[10px] opacity-70">VERIFIED</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-gray-900/50 border border-gray-800 p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">OPERATOR_NAME</label>
                <input value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="w-full bg-black border border-gray-700 text-white p-3 focus:border-cyan-500 outline-none font-bold text-lg" />
              </div>
              <div>
                <label className="block text-xs font-mono text-purple-400 mb-1 flex items-center gap-2"><Building2 size={12} /> AFFILIATED_INSTITUTION</label>
                <select value={formData.college} onChange={e => setFormData({...formData,college:e.target.value})} className="w-full bg-black border border-gray-700 text-purple-300 p-3 focus:border-purple-500 outline-none font-mono text-sm">
                  <option value="">[ NO_AFFILIATION ]</option>
                  {COLLEGES && COLLEGES.map((c,i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-cyan-500 mb-1">HEADLINE_TAG</label>
                <input value={formData.headline} onChange={e => setFormData({...formData,headline:e.target.value})} className="w-full bg-black border border-gray-700 text-gray-300 p-3 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">BIO_DATA</label>
                <textarea value={formData.bio} onChange={e => setFormData({...formData,bio:e.target.value})} rows={4} className="w-full bg-black border border-gray-700 text-gray-300 p-3 focus:border-cyan-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-500 mb-1 flex items-center gap-1"><Github size={12} /> GITHUB_UPLINK</label>
                  <input value={formData.github} onChange={e => setFormData({...formData,github:e.target.value})} placeholder="github.com/..." className="w-full bg-black border border-gray-700 text-cyan-400 p-3 focus:border-cyan-500 outline-none text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-500 mb-1 flex items-center gap-1"><Linkedin size={12} /> LINKEDIN_NODE</label>
                  <input value={formData.linkedin} onChange={e => setFormData({...formData,linkedin:e.target.value})} placeholder="linkedin.com/in/..." className="w-full bg-black border border-gray-700 text-cyan-400 p-3 focus:border-cyan-500 outline-none text-sm font-mono" />
                </div>
              </div>
              <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-cyan-600 text-black font-black font-['Orbitron'] text-xl hover:bg-cyan-400 transition flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
                <Save size={20} /> {loading ? 'UPLOADING...' : 'SAVE_CHANGES'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showVerifier && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative">
            <button onClick={() => setShowVerifier(false)} className="absolute -top-4 -right-4 z-10 p-2 bg-red-600 hover:bg-red-500 text-white rounded-full transition"><X size={20} /></button>
            <SkillVerifier userId={storedUser.id} skillName={selectedSkillToVerify} onVerifyComplete={() => { setShowVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}
    </div>
  );
}