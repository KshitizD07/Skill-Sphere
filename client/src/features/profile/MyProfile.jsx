import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, User, Plus, CheckCircle,
  X, Shield, Github, Linkedin, Save, Building2,
  Zap, Award, AlertTriangle, Trash2, ChevronRight, TrendingUp, Lock,
} from 'lucide-react';
import ProfileAPI from './profileAPI';
import SkillAPI from '../skills/skillAPI';
import BaseAPI from '../../services/BaseAPI';
import CollegeSelector from './CollegeSelector';
import SkillVerifier from '../skills/SkillVerifier';
import Navbar from '../../shared/components/Navbar';
import RepoSelector from '../portfolio/RepoSelector';
import FollowModal from './components/FollowModal';
import ImageCropModal from '../../shared/components/ImageCropModal';
import { useToast, ToastContainer } from '../../shared/components/Toast';
import { API_BASE_URL } from '../../config/constants';

// ── Profile Completeness Bar ─────────────────────────────────────────────────
function CompletenessBar({ score, checks }) {
  const incomplete = (checks || []).filter((c) => !c.done && c.points > 0);
  const color = score >= 80 ? 'bg-accent' : score >= 50 ? 'bg-[#f59e0b]' : 'bg-error';
  return (
    <div className="bg-surface border border-outline-var/20 rounded-md p-5 hover:border-primary/15 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Profile Strength</h3>
        <span className={`font-syne font-black text-sm ${score >= 80 ? 'text-accent' : score >= 50 ? 'text-[#f59e0b]' : 'text-error'}`}>
          {score}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-surface-mid rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
      </div>
      {incomplete.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-syne text-[9px] uppercase tracking-widest text-outline mb-2">Next steps</p>
          {incomplete.slice(0, 3).map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-[11px] text-text-muted font-outfit">
              <ChevronRight size={10} className="text-outline shrink-0" />
              <span>{c.label}</span>
              <span className="ml-auto font-syne font-bold text-[9px] text-outline">+{c.points}pts</span>
            </div>
          ))}
        </div>
      )}
      {score === 100 && (
        <p className="text-accent font-syne font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mt-1">
          <CheckCircle size={12} /> Profile Complete
        </p>
      )}
    </div>
  );
}

// ── Char counter badge ───────────────────────────────────────────────────────
function CharCount({ current, max }) {
  const pct = current / max;
  const cls = pct > 0.9 ? 'text-error' : pct > 0.7 ? 'text-[#f59e0b]' : 'text-outline';
  return <span className={`font-syne text-[9px] tracking-wide ${cls}`}>{current}/{max}</span>;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MyProfile({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const toast = useToast();
  const activeUser = user || (() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  })();

  const [loading, setLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [formData, setFormData] = useState({
    name: '', headline: '', bio: '', avatar: '', github: '', linkedin: '', college: '',
  });
  const [allSkills, setAllSkills] = useState([]);
  const [mySkillNames, setMySkillNames] = useState([]);
  const [mySkillsRaw, setMySkillsRaw] = useState([]);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const [showVerifier, setShowVerifier] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [leetcodeData, setLeetcodeData] = useState(null);
  const [leetcodeInput, setLeetcodeInput] = useState('');
  const [isSyncingLeetcode, setIsSyncingLeetcode] = useState(false);
  const [completeness, setCompleteness] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleBack = () => {
    if (window.history.length > 2 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const avatarInputRef = useRef(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);

  // Social Graph state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [modalTab, setModalTab] = useState('followers');

  // Admin Escalation State
  const [adminStatus, setAdminStatus] = useState({ isWhitelisted: false, isEscalated: false });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [escalating, setEscalating] = useState(false);

  const loadAdminStatus = useCallback(async () => {
    try {
      const res = await BaseAPI.get('/auth/admin-status');
      const data = res?.data || res;
      if (data) setAdminStatus(data);
    } catch (err) {
      console.error('Failed to load admin status', err);
    }
  }, []);

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!adminPasscode.trim()) return;
    setEscalating(true);
    try {
      const res = await BaseAPI.post('/auth/escalate', { adminKey: adminPasscode });
      const data = res?.data || res;
      if (data?.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('ss_token', data.token);
        onUserUpdate?.(data.user);
        toast.success('Admin privileges escalated successfully!');
        setShowAdminModal(false);
        setAdminPasscode('');
        navigate('/admin');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Escalation failed');
    } finally {
      setEscalating(false);
    }
  };

  const handleDemote = async () => {
    try {
      const res = await BaseAPI.post('/auth/demote', {});
      const data = res?.data || res;
      if (data?.user) {
        localStorage.setItem('user_data', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('ss_token', data.token);
        onUserUpdate?.(data.user);
        setAdminStatus((prev) => ({ ...prev, isEscalated: false }));
        toast.info('Session demoted to standard user mode');
        navigate('/dashboard');
      }
    } catch {
      toast.error('Failed to demote session');
    }
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadUserData = useCallback(async () => {
    try {
      const userData = await ProfileAPI.getMyProfile();
      if (!userData || userData.error) return;
      setFormData({
        name: userData.name || '', headline: userData.headline || '', bio: userData.bio || '',
        avatar: userData.avatar || '', github: userData.github || '',
        linkedin: userData.linkedin || '', college: userData.college || '',
      });
      if (userData.skills) {
        setMySkillsRaw(userData.skills);
        setMySkillNames(userData.skills.map((s) => s.name || s.skill?.name).filter(Boolean));
      }
      if (userData.leetcodeUsername) setLeetcodeData(userData);

      if (activeUser?.id) {
        const publicProfile = await ProfileAPI.getProfile(activeUser.id);
        if (publicProfile) {
          setFollowerCount(publicProfile.followerCount || 0);
          setFollowingCount(publicProfile.followingCount || 0);
        }
      }
    } catch (err) { console.error('Failed to load user data:', err); }
  }, [activeUser?.id]);

  const loadAllSkills = useCallback(async () => {
    const skills = await ProfileAPI.getAllSkills();
    if (Array.isArray(skills)) setAllSkills(skills.filter((s) => s?.name?.trim()));
  }, []);

  const loadCompleteness = useCallback(async () => {
    try {
      const data = await ProfileAPI.getCompleteness();
      if (data && !data.error) setCompleteness(data);
    } catch { /* non-critical */ }
  }, []);

  const handleConnectGithub = () => {
    const token = localStorage.getItem('ss_token') || '';
    const target = (formData.github || '').replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/\/$/, '').trim();
    let url = `${API_BASE_URL}/auth/github?action=link&token=${encodeURIComponent(token)}`;
    if (target) {
      url += `&targetUser=${encodeURIComponent(target)}`;
    }
    window.location.href = url;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('linked') === 'github') {
      const linkedUser = urlParams.get('username');
      if (linkedUser) {
        setFormData((prev) => ({ ...prev, github: linkedUser }));
      }
      toast.success(`GitHub account ${linkedUser ? `(@${linkedUser}) ` : ''}linked & synced successfully!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadUserData();
    } else if (urlParams.get('error') === 'GithubAlreadyLinked') {
      const linkedUser = urlParams.get('username') || '';
      toast.error(`GitHub account ${linkedUser ? `(@${linkedUser}) ` : ''}is already linked to another profile.`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('error')) {
      toast.error('GitHub authorization failed. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadUserData, toast]);

  useEffect(() => {
    if (activeUser?.id) {
      Promise.all([loadUserData(), loadAllSkills(), loadCompleteness(), loadAdminStatus()])
        .finally(() => setInitialLoadDone(true));
    } else { setInitialLoadDone(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.id]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageSrc(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow selecting the same file if needed
    e.target.value = '';
  };

  const handleCropComplete = (croppedBase64) => {
    setFormData((prev) => ({ ...prev, avatar: croppedBase64 }));
    setTempImageSrc(null);
    toast.success('Photo adjusted! Click "Save Changes" to apply.');
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.name?.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      const cleanedForm = {
        ...formData,
        github:   formData.github.replace(/^https?:\/\//, '').trim(),
        linkedin: formData.linkedin.replace(/^https?:\/\//, '').trim(),
      };
      const [updatedUser] = await Promise.all([
        ProfileAPI.updateProfile(cleanedForm),
        ProfileAPI.saveSkills(mySkillNames),
      ]);
      if (updatedUser?.error) throw new Error(updatedUser.message || 'Save failed');
      const merged = { ...activeUser, ...cleanedForm };
      localStorage.setItem('user_data', JSON.stringify(merged));
      if (onUserUpdate) onUserUpdate(merged);
      toast.success('Profile saved!', { title: 'Saved' });
      loadCompleteness();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to save profile.');
    } finally { setLoading(false); }
  };

  // ── Skills ────────────────────────────────────────────────────────────────
  const toggleSkill = (skillName) => {
    setMySkillNames((prev) =>
      prev.includes(skillName) ? prev.filter((n) => n !== skillName) : [...prev, skillName]
    );
    setShowSkillSelector(false);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await ProfileAPI.logout(); } catch { /* ignore */ }
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/');
  };

  // ── LeetCode ──────────────────────────────────────────────────────────────
  const handleConnectLeetcode = async (username) => {
    const target = (typeof username === 'string' ? username : leetcodeInput).trim();
    if (!target) return;
    setIsSyncingLeetcode(true);
    try {
      const res = await SkillAPI.syncLeetCodeProfile(target);
      if (res?.success) {
        setLeetcodeData(res.leetcode);
        setLeetcodeInput('');
        toast.success('LeetCode connected!', { title: 'Connected' });
      } else {
        toast.error(res?.message || 'Failed to connect LeetCode');
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to connect LeetCode');
    } finally {
      setIsSyncingLeetcode(false);
    }
  };

  const handleUnlinkLeetcode = async () => {
    if (!window.confirm('Unlink LeetCode profile?')) return;
    try {
      await SkillAPI.unlinkLeetCode();
      setLeetcodeData(null);
      setLeetcodeInput('');
      toast.success('LeetCode unlinked');
    } catch { toast.error('Failed to unlink LeetCode'); }
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      const res = await ProfileAPI.deleteAccount();
      if (res?.error) { toast.error(res.message || 'Failed to delete account.'); setIsDeleting(false); return; }
      localStorage.removeItem('user_data');
      localStorage.removeItem('ss_token');
      window.location.replace('/');
    } catch { toast.error('Failed to delete account. Please try again.'); setIsDeleting(false); }
  };

  // Adaptive UI State (Tabs on Desktop, Drawers on Mobile)
  const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'skills' | 'showcase' | 'settings'
  const [activeDrawer, setActiveDrawer] = useState(null); // 'identity' | 'skills' | 'showcase' | 'settings' | null
  const [initialFormState, setInitialFormState] = useState(null);

  const isDirty = useMemo(() => {
    if (!initialFormState) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormState.formData) ||
      JSON.stringify(mySkillNames) !== JSON.stringify(initialFormState.mySkillNames);
  }, [formData, mySkillNames, initialFormState]);

  // Update initial form snapshot when loaded
  const updateInitialSnapshot = useCallback((data, skills) => {
    setInitialFormState({
      formData: { ...data },
      mySkillNames: [...skills],
    });
  }, []);

  // ── Style tokens ──────────────────────────────────────────────────────────
  const labelBase = 'block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5';
  const inputBase = 'w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var';

  // Wrap loadUserData to store initial snapshot for isDirty check
  useEffect(() => {
    if (formData.name && !initialFormState) {
      updateInitialSnapshot(formData, mySkillNames);
    }
  }, [formData, mySkillNames, initialFormState, updateInitialSnapshot]);

  if (!activeUser?.id) return (
    <div className="p-10 text-text-primary bg-bg-base h-screen font-outfit flex items-center justify-center">
      <p className="text-outline">Please log in to view your profile.</p>
    </div>
  );

  // ── Section Renderers ──────────────────────────────────────────────────────
  const renderIdentitySection = () => (
    <div className="space-y-6">
      <div className="bg-surface border border-outline-var/20 rounded-md p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full border-2 border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0 shadow-lg">
          {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={36} className="text-outline-var" />}
        </div>
        <div className="flex-1 text-center md:text-left space-y-2">
          <p className={`${labelBase} mb-1`}>Profile Photo</p>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
          <div className="flex items-center justify-center md:justify-start gap-3">
            <button onClick={() => avatarInputRef.current.click()}
              className="px-3 py-1.5 bg-surface-mid border border-outline-var/40 hover:border-primary/40 text-primary hover:text-secondary-bright text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5">
              <Camera size={13} /> Update Photo
            </button>
            {formData.avatar && (
              <button onClick={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                className="text-[10px] uppercase font-bold tracking-widest text-outline hover:text-error font-syne transition-colors">
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-var/20 rounded-md p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelBase}>Full Name <span className="text-error">*</span></label>
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`${inputBase} font-semibold`} placeholder="Your full name" maxLength={80} />
          </div>
          <div>
            <CollegeSelector value={formData.college} onChange={(val) => setFormData({ ...formData, college: val })} labelBase={labelBase} inputBase={inputBase} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Professional Headline</label>
            <CharCount current={formData.headline.length} max={120} />
          </div>
          <input value={formData.headline} onChange={(e) => setFormData({ ...formData, headline: e.target.value })} className={inputBase} placeholder="e.g. Full-stack developer and ML enthusiast" maxLength={120} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Professional Bio</label>
            <CharCount current={formData.bio.length} max={500} />
          </div>
          <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={4} className={`${inputBase} resize-none leading-relaxed`} placeholder="Brief description of your expertise and goals..." maxLength={500} />
        </div>
      </div>
    </div>
  );

  const renderSkillsSection = () => (
    <div className="space-y-6">
      {completeness && <CompletenessBar score={completeness.score} checks={completeness.checks} />}

      {/* Skills Selector & Badges */}
      <div className="bg-surface border border-outline-var/20 rounded-md p-6 relative group hover:border-secondary/15 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-secondary">Technical Skills</h3>
            <p className="text-xs text-text-muted mt-0.5">Select modules to display on your verified profile grid.</p>
          </div>
          <button onClick={() => setShowSkillSelector(!showSkillSelector)}
            className="p-1.5 bg-primary/8 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all rounded-xs focus:outline-none flex items-center gap-1 text-[10px] font-syne font-bold uppercase">
            <Plus size={13} /> Add Skill
          </button>
        </div>
        {showSkillSelector && (
          <div className="absolute top-16 left-0 w-full bg-surface-mid border border-outline-var/40 rounded-xs z-[200] max-h-48 overflow-y-auto shadow-2xl">
            {allSkills.map((skill) => {
              const isSelected = mySkillNames.includes(skill.name);
              const userSk = mySkillsRaw.find((s) => (s.name || s.skill?.name)?.toLowerCase() === skill.name?.toLowerCase());
              const isVerified = userSk?.isVerified;
              return (
                <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                  className={`p-2.5 text-xs cursor-pointer hover:bg-surface border-b border-outline-var/20 transition-colors flex items-center justify-between ${isSelected ? 'text-accent bg-surface-mid/50' : 'text-text-muted'}`}>
                  <div className="flex items-center gap-2">
                    <span>{skill.name}</span>
                    {isVerified && (
                      <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/30">
                        🛡️ Verified
                      </span>
                    )}
                  </div>
                  {isSelected && <span className="font-bold text-accent">✓</span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          {mySkillNames.length > 0 ? mySkillNames.map((skillName) => {
            const skill = mySkillsRaw.find((s) => (s.name || s.skill?.name) === skillName);
            const verified = skill?.isVerified;
            const source = skill?.verificationSource;
            return (
              <span key={skillName} className={`px-2.5 py-1 border text-[10px] font-syne font-bold uppercase tracking-wide flex items-center gap-1 group/skill relative rounded-xs transition-colors ${verified ? 'bg-accent/8 border-accent/30 text-accent' : 'bg-primary/8 border-primary/20 text-primary'}`}>
                {skillName}
                {verified && (source === 'GITHUB' ? <Github size={9} className="text-accent" /> : source === 'CREDENTIAL' ? <Award size={9} className="text-accent" /> : <CheckCircle size={9} className="text-accent" />)}
                <X size={9} className="cursor-pointer hover:text-error opacity-0 group-hover/skill:opacity-100 transition-opacity ml-1" onClick={() => toggleSkill(skillName)} />
              </span>
            );
          }) : <span className="text-outline text-xs italic font-outfit">No active skill modules.</span>}
        </div>
      </div>

      {/* Skill Verification */}
      <div className="bg-surface border border-outline-var/20 rounded-md p-6 hover:border-primary/15 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="text-primary" size={15} />
          <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-primary">Skill Verification Benchmarks</h3>
        </div>
        <p className="text-xs text-outline mb-4 leading-relaxed">Establish credentials via repository code analysis or third-party platforms.</p>
        {mySkillNames.length === 0 ? (
          <div className="text-center py-4 border border-outline-var/20 rounded-xs bg-surface-mid/50">
            <Lock size={16} className="mx-auto text-outline mb-2" />
            <p className="text-outline text-[10px] font-syne uppercase tracking-wide">Add skills above to unlock verification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mySkillNames.map((skillName) => {
              const skill = mySkillsRaw.find((s) => (s.name || s.skill?.name) === skillName) || { name: skillName };
              const verified = skill?.isVerified;
              return (
                <div key={skillName} className={`w-full p-2.5 border text-xs font-syne font-medium flex items-center justify-between transition-all rounded-xs ${verified ? 'bg-accent/5 border-accent/20 text-accent' : 'bg-surface-mid border-outline-var/30 text-text-muted'}`}>
                  <span className="flex items-center gap-2 font-bold">{skillName}{verified && <CheckCircle size={12} className="text-accent" />}</span>
                  {verified ? (
                    <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-accent px-2 py-0.5 bg-accent/10 border border-accent/30 rounded">Verified</span>
                  ) : (
                    <button onClick={() => { setSelectedSkill(skill); setShowVerifier(true); }}
                      className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[9px] uppercase font-bold tracking-wider rounded-xs flex items-center gap-1 font-syne transition-colors">
                      <Shield size={10} /> Verify Skill
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LeetCode Integration */}
      <div className="bg-surface border border-outline-var/20 rounded-md p-6">
        <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-4">LeetCode Algorithmic Benchmark</h3>
        {leetcodeData?.leetcodeUsername ? (
          <div className="flex items-center justify-between p-4 border border-[#f59e0b]/30 bg-surface-mid rounded-xs">
            <div className="flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l.257.257c.54.54 1.413.54 1.953 0a1.38 1.38 0 0 0 0-1.955l-.257-.257A4.978 4.978 0 0 0 13.483 0z" fill="#f59e0b" />
              </svg>
              <div>
                <div className="text-text-primary text-sm font-bold leading-tight">{leetcodeData.leetcodeUsername}</div>
                <div className="text-[10px] text-outline font-syne uppercase tracking-wider mt-0.5">DSA Score: {leetcodeData.leetcodeDSAScore}/10</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleConnectLeetcode(leetcodeData.leetcodeUsername)} disabled={isSyncingLeetcode} className="px-3 py-1.5 bg-surface border border-outline-var/40 text-[10px] font-syne font-bold uppercase tracking-wider hover:text-primary transition rounded-xs">
                {isSyncingLeetcode ? 'Syncing...' : 'Re-sync'}
              </button>
              <button onClick={handleUnlinkLeetcode} className="px-3 py-1.5 bg-error/10 text-error border border-error/30 text-[10px] font-syne font-bold uppercase tracking-wider hover:bg-error hover:text-on-primary transition rounded-xs">Unlink</button>
            </div>
          </div>
        ) : (
          <div>
            <label className={labelBase}>Connect LeetCode Profile</label>
            <div className="flex gap-2">
              <input value={leetcodeInput} onChange={(e) => setLeetcodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConnectLeetcode()} placeholder="LeetCode username" className={inputBase} />
              <button onClick={() => handleConnectLeetcode()} disabled={isSyncingLeetcode || !leetcodeInput.trim()} className="px-5 py-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-syne font-bold uppercase tracking-wider hover:bg-[#f59e0b] hover:text-white disabled:opacity-50 transition rounded-xs shrink-0">
                {isSyncingLeetcode ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderShowcaseSection = () => (
    <div className="space-y-6">
      <div className="bg-surface border border-outline-var/20 rounded-md p-6 space-y-5">
        <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-2">Social & External Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`${labelBase} flex items-center gap-1.5`}><Github size={12} /> GitHub Profile <span className="text-error">*</span></label>
              <button
                type="button"
                onClick={handleConnectGithub}
                className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[10px] font-syne font-bold uppercase tracking-wider rounded-xs transition flex items-center gap-1"
              >
                <Github size={10} />
                {formData.github ? 'Re-authorize' : 'Link OAuth'}
              </button>
            </div>
            <input value={formData.github} onChange={(e) => setFormData({ ...formData, github: e.target.value })} placeholder="github.com/username" className={`${inputBase} ${!formData.github ? 'border-error/40 focus:border-error/80' : ''}`} />
            <p className="text-[10px] text-text-muted mt-1">
              Authorizing via OAuth grants access to fetch repositories for your showcase.
            </p>
          </div>
          <div>
            <label className={`${labelBase} flex items-center gap-1.5`}><Linkedin size={12} /> LinkedIn Profile</label>
            <input value={formData.linkedin} onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })} placeholder="linkedin.com/in/username" className={inputBase} />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-outline-var/20 rounded-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={13} className="text-accent" />
          <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Featured GitHub Repositories</h3>
        </div>
        <RepoSelector />
      </div>
    </div>
  );

  const renderSettingsSection = () => (
    <div className="space-y-6">
      {/* Follower Stats Card */}
      <div className="bg-surface border border-outline-var/20 rounded-md p-6 flex items-center justify-around text-center">
        <button
          type="button"
          onClick={() => { setModalTab('followers'); setShowFollowModal(true); }}
          className="flex flex-col items-center group cursor-pointer"
        >
          <span className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{followerCount}</span>
          <span className="text-[10px] font-syne uppercase tracking-wider text-outline">Followers</span>
        </button>
        <div className="w-px h-8 bg-outline-var/20" />
        <button
          type="button"
          onClick={() => { setModalTab('following'); setShowFollowModal(true); }}
          className="flex flex-col items-center group cursor-pointer"
        >
          <span className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{followingCount}</span>
          <span className="text-[10px] font-syne uppercase tracking-wider text-outline">Following</span>
        </button>
      </div>

      {/* Operator Access (Whitelisted Admin) */}
      {adminStatus.isWhitelisted && (
        <div className="bg-surface border border-primary/30 rounded-md p-5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-syne font-bold text-primary uppercase tracking-wider">
              <Lock size={14} className="text-primary" /> Operator Privilege Access
            </div>
            {adminStatus.isEscalated && (
              <span className="px-2 py-0.5 bg-accent/10 text-accent border border-accent/30 text-[9px] font-syne font-bold rounded-full uppercase">
                Active Admin
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {adminStatus.isEscalated
              ? 'Active administrator privileges. Session auto-demotes after 15 minutes of inactivity.'
              : 'Your account is whitelisted for administrative access. Enter security key to elevate privileges.'}
          </p>
          {adminStatus.isEscalated ? (
            <button onClick={handleDemote} className="w-full py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors">
              Demote Admin Privileges
            </button>
          ) : (
            <button onClick={() => setShowAdminModal(true)} className="w-full py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5">
              <Lock size={13} /> Elevate to Admin Mode
            </button>
          )}
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-error/5 border border-error/25 rounded-md p-6 relative group hover:border-error/40 transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-error" size={16} />
          <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-error">Danger Zone</h3>
        </div>
        <p className="text-xs text-text-muted mb-4 leading-relaxed">Permanently purge account, verified skills, and squad affiliations. Cannot be undone.</p>
        <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
          className="w-full py-2 bg-error/10 hover:bg-error text-error hover:text-white border border-error/30 text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-2">
          <Trash2 size={14} /> Delete Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row pb-24 md:pb-10">
      <Navbar user={activeUser} onLogout={handleLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-10 w-full max-w-[1400px] mx-auto space-y-6">

        {/* ── Compact Action Chips for Warnings (Mobile & Desktop) ───────────── */}
        {initialLoadDone && (!formData.github || !formData.college) && (
          <div className="flex flex-wrap items-center gap-2">
            {!formData.github && (
              <button
                onClick={() => { setActiveTab('showcase'); setActiveDrawer('showcase'); }}
                className="px-3 py-1.5 bg-[#fbbf24]/10 border border-[#fbbf24]/40 text-[#fbbf24] text-xs font-syne font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-[#fbbf24]/20 transition animate-pulse"
              >
                <Zap size={13} /> Action Required: Link GitHub Account ➔
              </button>
            )}
            {!formData.college && (
              <button
                onClick={() => { setActiveTab('identity'); setActiveDrawer('identity'); }}
                className="px-3 py-1.5 bg-primary/10 border border-primary/40 text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-full flex items-center gap-2 hover:bg-primary/20 transition"
              >
                <Building2 size={13} /> Select Institutional Affiliation ➔
              </button>
            )}
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-text-primary tracking-tight">Personal Profile</h1>
              <p className="font-syne text-[10px] tracking-[0.12em] uppercase text-outline hidden md:block">Manage your professional identity and skill network</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 font-syne font-bold text-xs uppercase tracking-[0.1em] hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2 rounded-xs disabled:opacity-50 active:scale-[0.98]">
            <Save size={14} /> {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* ── MOBILE READ-ONLY PREVIEW CARD & ACTION CHIPS (< md) ─────────────── */}
        <div className="block md:hidden space-y-4">
          <div className="bg-surface border border-outline-var/20 rounded-md p-5 text-center space-y-3 relative">
            <div className="w-20 h-20 rounded-full border-2 border-outline-var/40 overflow-hidden bg-surface-mid mx-auto flex items-center justify-center shadow-md">
              {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={32} className="text-outline-var" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">{formData.name || 'User Profile'}</h2>
              <p className="text-xs text-primary font-syne mt-0.5">{formData.headline || 'No Headline set'}</p>
              <p className="text-[11px] text-text-muted mt-1">{formData.college || 'No Affiliation selected'}</p>
            </div>
            {completeness && <CompletenessBar score={completeness.score} checks={completeness.checks} />}
          </div>

          {/* Action Chips Grid */}
          <div className="grid grid-cols-2 gap-2 font-syne text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveDrawer('identity')}
              className="p-3 bg-surface border border-outline-var/30 hover:border-primary/50 text-text-primary rounded-xs flex flex-col items-center gap-1.5 transition active:scale-[0.98]"
            >
              <User size={16} className="text-primary" /> Edit Identity
            </button>
            <button
              onClick={() => setActiveDrawer('skills')}
              className="p-3 bg-surface border border-outline-var/30 hover:border-primary/50 text-text-primary rounded-xs flex flex-col items-center gap-1.5 transition active:scale-[0.98]"
            >
              <Shield size={16} className="text-accent" /> Skills & Tests
            </button>
            <button
              onClick={() => setActiveDrawer('showcase')}
              className="p-3 bg-surface border border-outline-var/30 hover:border-primary/50 text-text-primary rounded-xs flex flex-col items-center gap-1.5 transition active:scale-[0.98]"
            >
              <Github size={16} className="text-primary" /> Showcase & Links
            </button>
            <button
              onClick={() => setActiveDrawer('settings')}
              className="p-3 bg-surface border border-outline-var/30 hover:border-primary/50 text-text-primary rounded-xs flex flex-col items-center gap-1.5 transition active:scale-[0.98]"
            >
              <Lock size={16} className="text-error" /> Security & Access
            </button>
          </div>
        </div>

        {/* ── DESKTOP TABS VIEW (>= md) ────────────────────────────────────────── */}
        <div className="hidden md:block space-y-6">
          <div className="flex border-b border-outline-var/30 font-syne text-xs font-bold uppercase tracking-wider gap-1">
            <button
              onClick={() => setActiveTab('identity')}
              className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'identity' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-primary'}`}
            >
              <User size={14} /> Identity & Bio
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'skills' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-primary'}`}
            >
              <Shield size={14} /> Skills & Verifications
            </button>
            <button
              onClick={() => setActiveTab('showcase')}
              className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'showcase' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-primary'}`}
            >
              <Github size={14} /> Portfolio & Links
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-5 py-3 border-b-2 transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-primary'}`}
            >
              <Lock size={14} /> Settings & Access
            </button>
          </div>

          <div>
            {activeTab === 'identity' && renderIdentitySection()}
            {activeTab === 'skills' && renderSkillsSection()}
            {activeTab === 'showcase' && renderShowcaseSection()}
            {activeTab === 'settings' && renderSettingsSection()}
          </div>
        </div>

        {/* ── MOBILE BOTTOM SHEET DRAWER MODAL (< md) ─────────────────────────── */}
        {activeDrawer && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[350] flex flex-col justify-end md:hidden animate-in fade-in duration-200">
            <div className="bg-surface border-t border-outline-var/30 rounded-t-2xl p-5 max-h-[85dvh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-var/20">
                <div className="w-12 h-1 bg-outline-var/40 rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2" />
                <h3 className="font-syne font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2 mt-1">
                  {activeDrawer === 'identity' && <><User size={15} className="text-primary" /> Edit Identity & Bio</>}
                  {activeDrawer === 'skills' && <><Shield size={15} className="text-accent" /> Skills & Verifications</>}
                  {activeDrawer === 'showcase' && <><Github size={15} className="text-primary" /> Showcase & Connections</>}
                  {activeDrawer === 'settings' && <><Lock size={15} className="text-error" /> Security & Access</>}
                </h3>
                <button onClick={() => setActiveDrawer(null)} className="p-1 text-text-muted hover:text-text-primary">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="py-2">
                {activeDrawer === 'identity' && renderIdentitySection()}
                {activeDrawer === 'skills' && renderSkillsSection()}
                {activeDrawer === 'showcase' && renderShowcaseSection()}
                {activeDrawer === 'settings' && renderSettingsSection()}
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-3 border-t border-outline-var/20 flex gap-2">
                <button onClick={() => setActiveDrawer(null)} className="flex-1 py-2.5 bg-surface-mid border border-outline-var/30 text-text-muted text-xs font-syne font-bold uppercase tracking-wider rounded-xs">
                  Done / Close
                </button>
                <button onClick={async () => { await handleSave(); setActiveDrawer(null); }} disabled={loading} className="flex-1 py-2.5 bg-primary text-on-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5">
                  <Save size={13} /> {loading ? 'Saving...' : 'Save Section'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FLOATING DIRTY-STATE SAVE BAR ────────────────────────────────────── */}
        {isDirty && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[300] bg-surface border-2 border-primary/60 text-text-primary px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 font-syne">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" /> Unsaved Changes
            </span>
            <button onClick={handleSave} disabled={loading}
              className="px-4 py-1.5 bg-primary text-on-primary hover:bg-secondary-bright text-xs font-bold uppercase tracking-wider rounded-full transition flex items-center gap-1.5 shadow-md">
              <Save size={12} /> {loading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Skill Verifier modal */}
      {showVerifier && selectedSkill && (
        <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg">
            <button onClick={() => setShowVerifier(false)} className="absolute -top-3 -right-3 z-10 p-1.5 bg-error-container hover:bg-error hover:text-on-primary text-white rounded-full transition-all border border-error/30 flex items-center justify-center">
              <X size={16} />
            </button>
            <SkillVerifier userId={activeUser.id} skillName={selectedSkill.name || selectedSkill.skill?.name} skillId={selectedSkill.id} onVerifyComplete={() => { setShowVerifier(false); loadUserData(); }} />
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-bg-base/90 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface border border-error/40 rounded-md p-6 shadow-2xl space-y-5 font-outfit">
            <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="absolute top-4 right-4 text-outline hover:text-text-primary transition-colors">
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-error/15 rounded-full border border-error/30"><AlertTriangle className="w-6 h-6 text-error" /></div>
              <div>
                <h3 className="text-lg font-extrabold text-text-primary tracking-tight">Delete Account</h3>
                <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-error">Permanent Action</p>
              </div>
            </div>
            <div className="p-3.5 bg-error/10 border border-error/20 rounded-xs text-xs text-text-muted leading-relaxed space-y-2">
              <p className="font-semibold text-text-primary">Warning: This will permanently purge your SkillSphere profile.</p>
              <ul className="list-disc list-inside space-y-1 text-outline">
                <li>All verified skills and test scores will be lost</li>
                <li>Your squad memberships and applications will be deleted</li>
                <li>Your linked repository metadata will be cleared</li>
              </ul>
            </div>
            <div>
              <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5">
                Type <span className="text-error font-extrabold">DELETE</span> to confirm
              </label>
              <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="Type DELETE" disabled={isDeleting} className="w-full bg-surface-mid border border-outline-var/40 focus:border-error text-text-primary p-3 rounded-xs text-sm outline-none font-mono" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="px-4 py-2 bg-surface-mid hover:bg-outline-var/20 border border-outline-var/30 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'} className="px-5 py-2 bg-error text-white font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2 shadow-lg shadow-error/20">
                {isDeleting ? 'Deleting Account...' : 'Confirm Account Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Security Key Passcode Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleEscalate} className="bg-surface border border-outline-var/30 p-6 rounded-md max-w-sm w-full space-y-4 shadow-2xl font-syne">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <Shield size={18} className="text-primary" /> Security Key Required
              </h3>
              <button type="button" onClick={() => setShowAdminModal(false)} className="text-outline hover:text-text-primary">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-text-muted font-outfit">
              Enter your master Admin Security Passphrase to activate platform operator privileges:
            </p>
            <input
              type="password"
              value={adminPasscode}
              onChange={(e) => setAdminPasscode(e.target.value)}
              placeholder="Enter Admin Security Key..."
              className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2.5 text-xs text-text-primary outline-none focus:border-primary/60 font-mono"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2 bg-surface-mid border border-outline-var/30 text-text-muted text-xs font-bold uppercase rounded-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={escalating || !adminPasscode.trim()}
                className="px-4 py-2 bg-primary text-on-primary text-xs font-bold uppercase rounded-xs hover:bg-secondary-bright transition-colors disabled:opacity-50"
              >
                {escalating ? 'Verifying...' : 'Elevate Session'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Followers / Following Modal */}
      {showFollowModal && activeUser?.id && (
        <FollowModal
          userId={activeUser.id}
          initialTab={modalTab}
          followerCount={followerCount}
          followingCount={followingCount}
          onClose={() => setShowFollowModal(false)}
          onFollowChange={loadUserData}
        />
      )}

      {/* Profile Photo Crop Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={tempImageSrc}
        onClose={() => {
          setCropModalOpen(false);
          setTempImageSrc(null);
        }}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
