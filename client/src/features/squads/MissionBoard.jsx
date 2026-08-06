import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Plus, Search, Filter, Users, Shield,
  Lock, Target, AlertCircle, X, ChevronRight
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';

// ─── Create Team Modal ─────────────────────────────────────────────────────────
function CreateSquadModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event: '',
    maxMembers: 4,
    slots: [{ roleTitle: '', roleDescription: '', preferredSkills: [], requiredSkill: '', minScore: 5 }],
  });

  useEffect(() => {
    API.get('/skills/list').then(res => setAllSkills(res.data || []));
  }, []);

  const addSlot = () => {
    if (form.slots.length >= 6) return;
    setForm(f => ({ ...f, slots: [...f.slots, { roleTitle: '', roleDescription: '', preferredSkills: [], requiredSkill: '', minScore: 5 }] }));
  };

  const removeSlot = (i) => {
    setForm(f => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
  };

  const updateSlot = (i, field, value) => {
    setForm(f => ({
      ...f,
      slots: f.slots.map((s, idx) => idx === i ? { ...s, [field]: value } : s),
    }));
  };

  const togglePreferredSkill = (slotIndex, skillName) => {
    const current = form.slots[slotIndex].preferredSkills || [];
    const updated = current.includes(skillName)
      ? current.filter(s => s !== skillName)
      : [...current, skillName];
    updateSlot(slotIndex, 'preferredSkills', updated);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) return alert('Title and description are required.');
    const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
    setLoading(true);
    try {
      await SquadAPI.createSquad({ ...form, leaderId: currentUser.id });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to create team. Please try again.');
    }
    setLoading(false);
  };

  const labelBase = "block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5";
  const inputBase = "w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var";

  return (
    <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-var/30 rounded-md max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-outline hover:text-text-primary transition-colors"><X size={18} /></button>

        <div className="mb-6">
          <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-secondary mb-1">New Team</p>
          <h2 className="text-xl font-extrabold text-text-primary tracking-tight">Create Team</h2>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-7">
          {[1, 2].map(s => (
            <div key={s} className={`h-0.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-outline-var/40'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelBase}>Team Name *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Build a SaaS MVP" className={inputBase} />
            </div>
            <div>
              <label className={labelBase}>Description *</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="What are you building? What's the goal?"
                className={`${inputBase} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelBase}>Event / Hackathon (optional)</label>
                <input value={form.event} onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                  placeholder="e.g. HackIndia 2025" className={inputBase} />
              </div>
              <div>
                <label className={labelBase}>Max Members</label>
                <select value={form.maxMembers} onChange={e => setForm(f => ({ ...f, maxMembers: Number(e.target.value) }))}
                  className={`${inputBase} cursor-pointer`}>
                  {[2, 3, 4, 5, 6, 8, 10].map(n => (<option key={n} value={n}>{n} members</option>))}
                </select>
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!form.title.trim() || !form.description.trim()}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-syne font-bold text-xs uppercase tracking-[0.1em] hover:opacity-90 transition-all rounded-xs disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]">
              Next: Define Roles <ChevronRight size={14} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-outline text-sm">Define the roles you need and preferred skills for N.E.X.U.S. compatibility matching.</p>

            {form.slots.map((slot, i) => (
              <div key={i} className="bg-surface-mid border border-outline-var/30 rounded-xs p-4 relative group space-y-3">
                <button onClick={() => removeSlot(i)}
                  className="absolute top-3 right-3 text-outline-var hover:text-error opacity-0 group-hover:opacity-100 transition-all">
                  <X size={13} />
                </button>
                <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-secondary">Role {i + 1}</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelBase}>Role Title</label>
                    <input value={slot.roleTitle} onChange={e => updateSlot(i, 'roleTitle', e.target.value)}
                      placeholder="e.g. Backend Engineer" className={inputBase} />
                  </div>
                  <div>
                    <label className={labelBase}>Gatekeeper Skill</label>
                    <select value={slot.requiredSkill} onChange={e => updateSlot(i, 'requiredSkill', e.target.value)}
                      className={`${inputBase} cursor-pointer`}>
                      <option value="">Select skill</option>
                      {allSkills.map(s => (<option key={s.id} value={s.name}>{s.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelBase}>Min Gate Score (1–10)</label>
                    <input type="number" min={1} max={10} value={slot.minScore}
                      onChange={e => updateSlot(i, 'minScore', Number(e.target.value))}
                      className={inputBase} />
                  </div>
                </div>

                <div>
                  <label className={labelBase}>Short Role Description</label>
                  <input value={slot.roleDescription || ''} onChange={e => updateSlot(i, 'roleDescription', e.target.value)}
                    placeholder="Brief explanation of what member will work on..." className={inputBase} />
                </div>

                <div>
                  <label className={labelBase}>Preferred Skills for Matching</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-surface border border-outline-var/30 rounded-xs max-h-28 overflow-y-auto">
                    {allSkills.map(s => {
                      const selected = (slot.preferredSkills || []).includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => togglePreferredSkill(i, s.name)}
                          className={`px-2 py-0.5 text-[10px] font-syne font-bold uppercase rounded-xs transition ${
                            selected 
                              ? 'bg-secondary-bright text-on-primary' 
                              : 'bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/30'
                          }`}
                        >
                          {s.name} {selected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {form.slots.length < 6 && (
              <button onClick={addSlot}
                className="w-full py-2.5 border border-dashed border-outline-var/40 text-outline hover:border-primary/40 hover:text-primary transition-all font-syne text-xs flex items-center justify-center gap-2 rounded-xs">
                <Plus size={13} /> Add Role
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border border-outline-var/40 text-text-muted font-syne font-bold text-xs hover:border-primary/40 hover:text-primary transition-all rounded-xs uppercase tracking-[0.08em]">
                Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary font-syne font-bold text-xs uppercase tracking-[0.1em] hover:opacity-90 transition-all rounded-xs disabled:opacity-40 active:scale-[0.98]">
                {loading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Squad Card ────────────────────────────────────────────────────────────────
function SquadCard({ squad, currentUser }) {
  const navigate = useNavigate();
  const [qualification, setQualification] = useState(null);

  useEffect(() => {
    if (currentUser.id && squad.id) {
      SquadAPI.checkQualification(squad.id, currentUser.id).then(res => !res.error && setQualification(res));
    }
  }, [squad.id, currentUser.id]);

  const isLeader = squad.leader?.id === currentUser.id;
  const isFull = squad.currentMembers >= squad.maxMembers;

  return (
    <div className="bg-surface border border-outline-var/20 rounded-md hover:border-secondary/15 transition-colors group relative overflow-hidden flex flex-col">
      {/* Status badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase tracking-wide ${
          isFull
            ? 'bg-error/10 text-error border border-error/20'
            : 'bg-secondary-bright/10 text-secondary-bright border border-secondary-bright/20'
        }`}>
          {isFull ? 'Full' : 'Open'}
        </div>
      </div>

      <div className="relative z-10 p-6 flex flex-col flex-1">
        {squad.event && (
          <div className="inline-block px-2 py-0.5 bg-primary/8 border border-primary/15 text-primary text-[9px] font-syne font-bold uppercase tracking-wide rounded-full mb-3">
            {squad.event}
          </div>
        )}

        <h3 className="text-base font-bold text-text-primary mb-2 line-clamp-2 group-hover:text-primary transition-colors tracking-tight">
          {squad.title}
        </h3>
        <p className="text-outline text-sm mb-4 line-clamp-3 flex-1 leading-relaxed">{squad.description}</p>

        {/* Slots preview */}
        {squad.slots?.length > 0 && (
          <div className="space-y-1.5 mb-4 pb-4 border-b border-outline-var/20">
            {squad.slots.slice(0, 2).map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Shield size={11} className="text-secondary shrink-0" />
                <span className="text-outline">{slot.roleTitle}:</span>
                <span className="text-primary font-semibold">{slot.requiredSkill}</span>
                <span className="text-[#656d84]">≥{slot.minScore}/10</span>
              </div>
            ))}
            {squad.slots.length > 2 && (
              <div className="text-[10px] text-[#656d84] font-syne pl-4">+{squad.slots.length - 2} more roles</div>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between mb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30">
              {squad.leader?.avatar
                ? <img src={squad.leader.avatar} loading="lazy" className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full bg-primary-container/20" />}
            </div>
            <span className="text-outline">{squad.leader?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-text-muted font-semibold">
            <Users size={11} className="text-[#656d84]" />
            {squad.currentMembers}/{squad.maxMembers}
          </div>
        </div>

        {/* Qualification */}
        {qualification && !isLeader && (
          <div className={`text-[10px] font-syne font-bold mb-2.5 flex items-center gap-1 ${qualification.qualifies ? 'text-secondary-bright' : 'text-error'}`}>
            {qualification.qualifies ? '✓ You qualify' : '✗ Score too low'}
          </div>
        )}

        {/* CTA */}
        {isLeader ? (
          <button onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="w-full py-2.5 bg-primary/8 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em] rounded-xs">
            Manage
          </button>
        ) : isFull ? (
          <button disabled className="w-full py-2.5 bg-surface-mid border border-outline-var/20 text-[#656d84] font-syne font-bold text-[10px] uppercase tracking-[0.1em] rounded-xs cursor-not-allowed">
            Team Full
          </button>
        ) : (
          <button onClick={() => navigate(`/squad/${squad.id}`)}
            className="w-full py-2.5 bg-secondary/8 border border-secondary/20 text-secondary hover:bg-[#29a195] hover:text-on-secondary transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em] rounded-xs flex items-center justify-center gap-1.5">
            View Team {squad.slots?.some(s => s.minScore > 0) && <Lock size={11} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MissionBoard ──────────────────────────────────────────────────────────────
export default function MissionBoard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState('');

  // eslint-disable-next-line
  useEffect(() => { loadSquads(); }, [skillFilter, minScoreFilter]);

  const loadSquads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (skillFilter) params.skill = skillFilter;
      if (minScoreFilter) params.maxScore = minScoreFilter;
      const res = await SquadAPI.getFeed(params);
      setSquads(res.squads || res || []);
    } catch (err) {
      console.error('Failed to load squads:', err);
    }
    setLoading(false);
  };

  const filteredSquads = squads.filter(squad => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      squad.title?.toLowerCase().includes(q) ||
      squad.event?.toLowerCase().includes(q) ||
      squad.slots?.some(s => s.requiredSkill?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      
      <Navbar user={currentUser} onLogout={() => { API.post('/auth/logout').catch(()=>{}); localStorage.removeItem('user_data'); localStorage.removeItem('ss_token'); window.location.replace('/'); }} />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-6 md:p-10 w-full max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 border-b border-outline-var/25 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Users className="text-primary" size={22} />
                <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">N.E.X.U.S.</h1>
              </div>
              <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">
                Skill-Gated Team Matching
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/my-squads')}
              className="px-4 py-2 bg-primary/8 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em] flex items-center gap-2 rounded-xs">
              <Shield size={14} /> My Applications
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="px-5 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90 transition-all font-syne font-bold text-[10px] uppercase tracking-[0.1em] flex items-center gap-2 rounded-xs shadow-lg shadow-primary-container/20 active:scale-[0.98]">
              <Plus size={14} /> Create Team
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-3.5 top-3 text-[#656d84] group-focus-within:text-primary transition-colors" size={16} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full bg-surface border border-outline-var/30 rounded-xs p-3 pl-10 text-text-primary outline-none focus:border-primary/50 font-outfit text-sm transition-colors placeholder-outline-var" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-[#656d84]" size={15} />
            <input value={skillFilter} onChange={e => setSkillFilter(e.target.value)}
              placeholder="Filter by skill..."
              className="w-full bg-surface border border-outline-var/30 rounded-xs p-3 pl-9 text-text-muted outline-none focus:border-primary/50 font-outfit text-sm transition-colors placeholder-outline-var" />
          </div>
          <div className="relative">
            <Target className="absolute left-3 top-3 text-[#656d84]" size={15} />
            <select value={minScoreFilter} onChange={e => setMinScoreFilter(e.target.value)}
              className="w-full bg-surface border border-outline-var/30 rounded-xs p-3 pl-9 text-text-muted outline-none focus:border-primary/50 font-outfit text-sm transition-colors appearance-none cursor-pointer">
              <option value="">All Levels</option>
              <option value="3">Max Level 3</option>
              <option value="5">Max Level 5</option>
              <option value="7">Max Level 7</option>
              <option value="10">Max Level 10</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-primary mb-4"><Shield size={36} /></div>
            <p className="text-outline font-syne text-[10px] uppercase tracking-[0.12em] animate-pulse">Loading teams...</p>
          </div>
        ) : filteredSquads.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-outline-var/30 rounded-md">
            <AlertCircle size={48} className="mx-auto text-outline-var mb-4" />
            <h3 className="text-lg text-outline font-bold tracking-tight">No teams found</h3>
            <p className="text-[#656d84] font-syne text-[10px] uppercase tracking-[0.1em] mt-2">
              {searchQuery || skillFilter ? 'Try adjusting your filters' : 'Be the first to create a team'}
            </p>
            {!searchQuery && !skillFilter && (
              <button onClick={() => setShowCreateModal(true)}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-90 transition-all font-syne font-bold text-xs uppercase tracking-[0.1em] rounded-xs">
                Create First Team
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSquads.map(squad => (
              <SquadCard key={squad.id} squad={squad} currentUser={currentUser} />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateSquadModal onClose={() => setShowCreateModal(false)} onCreated={loadSquads} />
      )}
    </div>
  );
}