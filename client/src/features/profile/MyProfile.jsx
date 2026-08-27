import { useEffect, useState, useRef, useCallback } from 'react';
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
import { useToast, ToastContainer } from '../../shared/components/Toast';
import { API_BASE_URL } from '../../config/constants';

// ── Profile Completeness Bar ─────────────────────────────────────────────────
function CompletenessBar({ score, checks }) {
  const incomplete = (checks || []).filter((c) => !c.done && c.points > 0);
  const color = score >= 80 ? 'bg-secondary-bright' : score >= 50 ? 'bg-[#f59e0b]' : 'bg-error';
  return (
    <div className="bg-surface border border-outline-var/20 rounded-md p-5 hover:border-primary/15 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Profile Strength</h3>
        <span className={`font-syne font-black text-sm ${score >= 80 ? 'text-secondary-bright' : score >= 50 ? 'text-[#f59e0b]' : 'text-error'}`}>
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
        <p className="text-secondary-bright font-syne font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 mt-1">
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
  const activeUser = user || JSON.parse(localStorage.getItem('user_data') || '{}');

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
  const [isDeleting, setIsDeleting] = useState(false);
  const avatarInputRef = useRef(null);

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
        toast.info('Session demoted to standard user mode');
        setAdminStatus((prev) => ({ ...prev, isEscalated: false }));
      }
    } catch (err) {
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
  }, [loadUserData]);

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
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData((prev) => ({ ...prev, avatar: reader.result }));
    reader.readAsDataURL(file);
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

  // ── Style tokens ──────────────────────────────────────────────────────────
  const labelBase = 'block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5';
  const inputBase = 'w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var';

  if (!activeUser?.id) return (
    <div className="p-10 text-text-primary bg-bg-base h-screen font-outfit flex items-center justify-center">
      <p className="text-outline">Please log in to view your profile.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={activeUser} onLogout={handleLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-6 md:p-10 w-full max-w-[1400px] mx-auto">

        {/* GitHub not linked warning */}
        {initialLoadDone && !formData.github && (
          <div className="mb-8 p-5 bg-[#fbbf24]/5 border-2 border-[#fbbf24]/30 rounded-md flex items-start gap-4 animate-pulse">
            <div className="p-2 bg-[#fbbf24]/10 rounded-sm"><Zap size={24} className="text-[#fbbf24]" /></div>
            <div>
              <h3 className="text-[#fbbf24] font-syne font-bold uppercase tracking-widest text-sm mb-1">Mandatory Authorization Required</h3>
              <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
                To maintain the quality of our professional network, linking your{' '}
                <strong className="text-text-primary">GitHub Account</strong> is mandatory.
                <span className="block mt-2 font-bold text-error uppercase tracking-tighter">
                  Warning: Navigating away from this page without a linked GitHub will result in automatic account deletion.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* College not selected warning */}
        {initialLoadDone && !formData.college && (
          <div className="mb-8 p-5 bg-primary/5 border-2 border-primary/30 rounded-md flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-sm"><Building2 size={24} className="text-primary" /></div>
            <div>
              <h3 className="text-primary font-syne font-bold uppercase tracking-widest text-sm mb-1">Action Required</h3>
              <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
                Please select your <strong className="text-text-primary">Institutional Affiliation</strong> to complete your profile setup.
              </p>
            </div>
          </div>
        )}

        {/* Page header */}
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

            {/* Avatar */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 flex flex-col items-center text-center relative overflow-hidden group hover:border-primary/15 transition-colors">
              <div className="absolute top-0 right-0 bg-outline-var/20 text-outline px-2 py-1 text-[9px] font-syne uppercase tracking-widest font-bold">Profile Card</div>
              <div className="w-28 h-28 rounded-full border-2 border-outline-var/40 overflow-hidden mb-4 mt-2 bg-surface-mid flex items-center justify-center group-hover:border-primary/40 transition-colors shadow-lg shadow-bg-base">
                {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-outline-var" />}
              </div>
              <p className="text-primary font-syne tracking-wide text-xs mt-1">{formData.headline || 'NO_HEADLINE_TAG'}</p>
              <div className="mt-3 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-[10px] font-bold tracking-widest text-text-primary">
                {activeUser.role === 'GUEST' ? `GUEST ${activeUser.guestPersona || 'STUDENT'}` : `${activeUser.role} CLASS`}
              </div>

              {/* Social Graph: Followers & Following Stats */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-outline-var/20 w-full font-outfit">
                <button
                  type="button"
                  onClick={() => { setModalTab('followers'); setShowFollowModal(true); }}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span className="font-bold text-base text-text-primary group-hover:text-primary transition-colors">
                    {followerCount}
                  </span>
                  <span className="text-[10px] font-syne uppercase tracking-wider text-outline group-hover:text-text-muted">
                    Followers
                  </span>
                </button>
                <div className="w-px h-6 bg-outline-var/20" />
                <button
                  type="button"
                  onClick={() => { setModalTab('following'); setShowFollowModal(true); }}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <span className="font-bold text-base text-text-primary group-hover:text-primary transition-colors">
                    {followingCount}
                  </span>
                  <span className="text-[10px] font-syne uppercase tracking-wider text-outline group-hover:text-text-muted">
                    Following
                  </span>
                </button>
              </div>
              <p className={`${labelBase} mt-4`}>Profile Photo</p>
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} className="hidden" />
              <button onClick={() => avatarInputRef.current.click()}
                className="w-full flex items-center justify-center gap-2 bg-surface-mid border border-outline-var/40 hover:border-primary/40 text-primary hover:text-secondary-bright p-2 text-xs font-syne font-medium tracking-wide rounded-xs transition-all outline-none">
                <Camera size={13} /> Update Image
              </button>
              {formData.avatar && (
                <button onClick={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                  className="mt-3 text-[10px] uppercase font-bold tracking-widest text-[#656d84] hover:text-error font-syne transition-colors outline-none cursor-pointer">
                  Remove
                </button>
              )}
            </div>

            {/* Completeness */}
            {completeness && <CompletenessBar score={completeness.score} checks={completeness.checks} />}

            {/* Admin Privilege Escalation Panel (Whitelisted Accounts Only) */}
            {adminStatus.isWhitelisted && (
              <div className="bg-surface border border-primary/30 rounded-md p-5 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-syne font-bold text-primary uppercase tracking-wider">
                    <Lock size={14} className="text-primary" /> Operator Access
                  </div>
                  {adminStatus.isEscalated && (
                    <span className="px-2 py-0.5 bg-secondary-bright/10 text-secondary-bright border border-secondary-bright/30 text-[9px] font-syne font-bold rounded-full uppercase">
                      Active Admin
                    </span>
                  )}
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {adminStatus.isEscalated
                    ? 'You currently hold active system administrator privileges. Your session will automatically log out and demote after 15 minutes of complete inactivity.'
                    : 'Your account is whitelisted for administrative access. Enter your security passphrase to elevate privileges.'}
                </p>

                {adminStatus.isEscalated ? (
                  <button
                    onClick={handleDemote}
                    className="w-full py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    Demote Admin Privileges
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
                  >
                    <Lock size={13} /> Elevate to Admin Mode
                  </button>
                )}
              </div>
            )}

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
                  {allSkills.map((skill) => {
                    const isSelected = mySkillNames.includes(skill.name);
                    const userSk = mySkillsRaw.find((s) => (s.name || s.skill?.name)?.toLowerCase() === skill.name?.toLowerCase());
                    const isVerified = userSk?.isVerified;
                    return (
                      <div key={skill.name} onClick={() => toggleSkill(skill.name)}
                        className={`p-2.5 text-xs cursor-pointer hover:bg-surface border-b border-outline-var/20 transition-colors flex items-center justify-between ${isSelected ? 'text-secondary-bright bg-surface-mid/50' : 'text-text-muted'}`}>
                        <div className="flex items-center gap-2">
                          <span>{skill.name}</span>
                          {isVerified && (
                            <span className="text-[9px] font-bold text-secondary-bright bg-secondary-bright/10 px-1.5 py-0.5 rounded border border-secondary-bright/30">
                              🛡️ Verified
                            </span>
                          )}
                        </div>
                        {isSelected && <span className="font-bold text-secondary-bright">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {mySkillNames.length > 0 ? mySkillNames.map((skillName) => {
                  const skill = mySkillsRaw.find((s) => (s.name || s.skill?.name) === skillName);
                  const verified = skill?.isVerified;
                  const source = skill?.verificationSource;
                  return (
                    <span key={skillName} className={`px-2.5 py-1 border text-[10px] font-syne font-bold uppercase tracking-wide flex items-center gap-1 group/skill relative rounded-xs transition-colors ${verified ? 'bg-secondary-bright/8 border-secondary-bright/30 text-secondary-bright' : 'bg-primary/8 border-primary/20 text-primary'}`}>
                      {skillName}
                      {verified && (source === 'GITHUB' ? <Github size={9} className="text-secondary-bright" /> : source === 'CREDENTIAL' ? <Award size={9} className="text-secondary-bright" /> : <CheckCircle size={9} className="text-secondary-bright" />)}
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
                  <Lock size={16} className="mx-auto text-outline mb-2" />
                  <p className="text-[#656d84] text-[10px] font-syne uppercase tracking-wide">Add skills to verify</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {mySkillNames.map((skillName) => {
                    const skill = mySkillsRaw.find((s) => (s.name || s.skill?.name) === skillName) || { name: skillName };
                    const verified = skill?.isVerified;
                    return (
                      <div key={skillName} className={`w-full p-2 border text-xs font-syne font-medium flex flex-col gap-2 transition-all rounded-xs ${verified ? 'bg-secondary-bright/5 border-secondary-bright/20 text-secondary-bright' : 'bg-surface-mid border-outline-var/30 text-text-muted'}`}>
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

            {/* Danger Zone */}
            <div className="bg-error/5 border border-error/25 rounded-md p-6 relative group hover:border-error/40 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-error" size={16} />
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-error">Danger Zone</h3>
              </div>
              <p className="text-xs text-text-muted mb-4 leading-relaxed">Permanently delete your account, skills, and portfolio integrations. This action is immediate and cannot be undone.</p>
              <button onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); }}
                className="w-full py-2 bg-error/10 hover:bg-error text-error hover:text-white border border-error/30 text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-2">
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-8 bg-surface border border-outline-var/20 rounded-md p-8 relative">
            <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-6 flex items-center gap-2 border-b border-outline-var/30 pb-4">
              <User size={12} /> Profile Details
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelBase}>Full Name</label>
                  <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`${inputBase} text-base font-semibold`} placeholder="Your full name" maxLength={80} />
                </div>
                <div>
                  <CollegeSelector value={formData.college} onChange={(val) => setFormData({...formData, college: val})} labelBase={labelBase} inputBase={inputBase} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Professional Headline</label>
                  <CharCount current={formData.headline.length} max={120} />
                </div>
                <input value={formData.headline} onChange={(e) => setFormData({...formData, headline: e.target.value})} className={inputBase} placeholder="e.g. Full-stack developer and ML enthusiast" maxLength={120} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">Professional Bio</label>
                  <CharCount current={formData.bio.length} max={500} />
                </div>
                <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} rows={5} className={`${inputBase} resize-none leading-relaxed`} placeholder="Brief description of your expertise and goals..." maxLength={500} />
              </div>

              <div className="pt-4 border-t border-outline-var/20">
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-4">Social Connections</h3>
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
                        {formData.github ? 'Re-authorize OAuth' : 'Link via OAuth'}
                      </button>
                    </div>
                    <input value={formData.github} onChange={(e) => setFormData({...formData, github: e.target.value})} placeholder="github.com/username" className={`${inputBase} ${!formData.github ? 'border-error/40 focus:border-error/80' : ''}`} />
                    <p className="text-[10px] text-text-muted mt-1">
                      Authorizing via OAuth grants access to fetch your owned and contributed repositories for your showcase.
                    </p>
                  </div>
                  <div>
                    <label className={`${labelBase} flex items-center gap-1.5`}><Linkedin size={12} /> LinkedIn Profile</label>
                    <input value={formData.linkedin} onChange={(e) => setFormData({...formData, linkedin: e.target.value})} placeholder="linkedin.com/in/..." className={inputBase} />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-outline-var/20">
                <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-4">LeetCode Integration</h3>
                {leetcodeData?.leetcodeUsername ? (
                  <div className="flex items-center justify-between p-4 border border-[#f59e0b]/30 bg-surface-mid rounded-xs">
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l.257.257c.54.54 1.413.54 1.953 0a1.38 1.38 0 0 0 0-1.955l-.257-.257A4.978 4.978 0 0 0 13.483 0z" fill="#f59e0b"/>
                        <path d="M15.145 16.318H8.49c-.762 0-1.38.616-1.38 1.378s.618 1.378 1.38 1.378h6.655c.762 0 1.38-.616 1.38-1.378s-.618-1.378-1.38-1.378z" fill="#f59e0b"/>
                        <path d="M22.36 10.636l-3.77-3.77a1.38 1.38 0 0 0-1.952 0 1.38 1.38 0 0 0 0 1.953l3.77 3.77a1.38 1.38 0 0 0 1.952-1.953z" fill="#FFA116"/>
                      </svg>
                      <div>
                        <div className="text-text-primary text-sm font-bold leading-tight">{leetcodeData.leetcodeUsername}</div>
                        <div className="text-[10px] text-outline font-syne uppercase tracking-wider mt-0.5">Score: {leetcodeData.leetcodeDSAScore}/10</div>
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
                    <label className={labelBase}>LeetCode Username</label>
                    <div className="flex gap-2">
                      <input value={leetcodeInput} onChange={(e) => setLeetcodeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConnectLeetcode()} placeholder="username" className={inputBase} />
                      <button onClick={() => handleConnectLeetcode()} disabled={isSyncingLeetcode || !leetcodeInput.trim()} className="px-5 py-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-syne font-bold uppercase tracking-wider hover:bg-[#f59e0b] hover:text-white disabled:opacity-50 transition rounded-xs">
                        {isSyncingLeetcode ? 'Connecting...' : 'Connect'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-outline-var/20">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={13} className="text-secondary-bright" />
                  <h3 className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">GitHub Portfolio</h3>
                </div>
                <RepoSelector />
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}
