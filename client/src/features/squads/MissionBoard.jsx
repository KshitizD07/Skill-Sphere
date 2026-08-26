import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Plus, Search, Filter, Users, Shield,
  Lock, Target, AlertCircle, X, ChevronRight,
  Clock, Sparkles, CheckCircle2, Flame, ExternalLink
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

const EVENT_COLORS = {
  HACKATHON:   { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
  OPEN_SOURCE: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  RESEARCH:    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  STARTUP:     { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  PORTFOLIO:   { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
};

// ─── Create Squad Modal (Multi-step) ─────────────────────────────────────────
function CreateSquadModal({ onClose, onCreated }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event: 'HACKATHON',
    maxMembers: 4,
    visibility: 'PUBLIC',
    expiresInDays: 30,
    slots: [{ roleTitle: 'Frontend Engineer', roleDescription: '', preferredSkills: [], requiredSkill: 'React', minScore: 5, requireVerified: false }],
  });

  useEffect(() => {
    API.get('/skills/list').then((res) => setAllSkills(res.data || [])).catch(() => {});
  }, []);

  const addSlot = () => {
    if (form.slots.length >= 8) return;
    setForm((f) => ({
      ...f,
      slots: [
        ...f.slots,
        { roleTitle: '', roleDescription: '', preferredSkills: [], requiredSkill: '', minScore: 5, requireVerified: false },
      ],
    }));
  };

  const removeSlot = (i) => {
    setForm((f) => ({ ...f, slots: f.slots.filter((_, idx) => idx !== i) }));
  };

  const updateSlot = (i, field, value) => {
    setForm((f) => ({
      ...f,
      slots: f.slots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    }));
  };

  const togglePreferredSkill = (slotIndex, skillName) => {
    const current = form.slots[slotIndex].preferredSkills || [];
    const updated = current.includes(skillName)
      ? current.filter((s) => s !== skillName)
      : [...current, skillName];
    updateSlot(slotIndex, 'preferredSkills', updated);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error('Title and description are required.');
    }
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + form.expiresInDays * 24 * 60 * 60 * 1000);
      await SquadAPI.createSquad({
        title: form.title,
        description: form.description,
        event: form.event,
        maxMembers: form.maxMembers,
        visibility: form.visibility,
        expiresAt,
        slots: form.slots,
      });
      toast.success('Squad created successfully!');
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Failed to create squad.');
    } finally {
      setLoading(false);
    }
  };

  const labelBase = "block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1.5";
  const inputBase = "w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var";

  return (
    <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-outline-var/30 rounded-md max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-outline hover:text-text-primary transition-colors">
          <X size={18} />
        </button>

        <div>
          <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-primary mb-1">Squad Builder</p>
          <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-syne">Create Mission Squad</h2>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-outline-var/30'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className={labelBase}>Squad Mission Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. AI-Powered Medical Diagnosis Tool"
                className={inputBase}
              />
            </div>

            <div>
              <label className={labelBase}>Mission Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="What is your squad building? What are the goals and timeline?"
                className={`${inputBase} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelBase}>Event / Category</label>
                <select
                  value={form.event}
                  onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
                  className={`${inputBase} cursor-pointer`}
                >
                  <option value="HACKATHON">Hackathon</option>
                  <option value="OPEN_SOURCE">Open Source</option>
                  <option value="STARTUP">Startup / Venture</option>
                  <option value="RESEARCH">Research</option>
                  <option value="PORTFOLIO">Portfolio Project</option>
                </select>
              </div>

              <div>
                <label className={labelBase}>Max Squad Size</label>
                <select
                  value={form.maxMembers}
                  onChange={(e) => setForm((f) => ({ ...f, maxMembers: Number(e.target.value) }))}
                  className={`${inputBase} cursor-pointer`}
                >
                  {[2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} members</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>Duration / Expiry</label>
                <select
                  value={form.expiresInDays}
                  onChange={(e) => setForm((f) => ({ ...f, expiresInDays: Number(e.target.value) }))}
                  className={`${inputBase} cursor-pointer`}
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.title.trim() || !form.description.trim()}
              className="w-full py-3 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all rounded-xs disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Next: Define Squad Roles <ChevronRight size={14} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-outline text-xs">
              Define required roles. Gatekeeper will verify that applicants meet your skill and verification criteria.
            </p>

            {form.slots.map((slot, i) => (
              <div key={i} className="bg-surface-mid border border-outline-var/30 rounded-xs p-4 relative group space-y-3">
                {form.slots.length > 1 && (
                  <button
                    onClick={() => removeSlot(i)}
                    className="absolute top-3 right-3 text-outline-var hover:text-error transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <p className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-primary">
                  Slot #{i + 1}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelBase}>Role Title</label>
                    <input
                      value={slot.roleTitle}
                      onChange={(e) => updateSlot(i, 'roleTitle', e.target.value)}
                      placeholder="e.g. Backend Lead"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Gatekeeper Skill</label>
                    <input
                      value={slot.requiredSkill}
                      onChange={(e) => updateSlot(i, 'requiredSkill', e.target.value)}
                      placeholder="e.g. Node.js"
                      className={inputBase}
                    />
                  </div>
                  <div>
                    <label className={labelBase}>Min Skill Score (0–10)</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={slot.minScore}
                      onChange={(e) => updateSlot(i, 'minScore', Number(e.target.value))}
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted">
                    <input
                      type="checkbox"
                      checked={slot.requireVerified}
                      onChange={(e) => updateSlot(i, 'requireVerified', e.target.checked)}
                      className="accent-primary rounded-xs"
                    />
                    <span>Require Verified Skill Certificate / Badge</span>
                  </label>
                </div>
              </div>
            ))}

            {form.slots.length < 8 && (
              <button
                onClick={addSlot}
                className="w-full py-2.5 border border-dashed border-outline-var/40 text-outline hover:border-primary hover:text-primary transition-all font-syne text-xs flex items-center justify-center gap-2 rounded-xs"
              >
                <Plus size={14} /> Add Role Slot
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-outline-var/40 text-text-muted font-syne font-bold text-xs hover:text-text-primary transition-all rounded-xs uppercase tracking-wider"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all rounded-xs disabled:opacity-40"
              >
                {loading ? 'Creating Squad...' : 'Deploy Squad Mission'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Squad Card Component ────────────────────────────────────────────────────
function SquadCard({ squad, currentUser }) {
  const navigate = useNavigate();
  const isLeader = squad.leader?.id === currentUser?.id;
  const isFull = squad.currentMembers >= squad.maxMembers;
  const [renderedAt] = useState(() => Date.now());

  const eventStyle = EVENT_COLORS[squad.event] || EVENT_COLORS.HACKATHON;

  // Expiry calculation
  const daysLeft = useMemo(() => {
    if (!squad.expiresAt) return null;
    const diff = new Date(squad.expiresAt).getTime() - renderedAt;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [renderedAt, squad.expiresAt]);

  return (
    <div className="bg-surface border border-outline-var/20 hover:border-primary/40 rounded-md transition-all group relative overflow-hidden flex flex-col justify-between p-5 hover:shadow-xl">
      <div className="space-y-4">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          {squad.event && (
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase tracking-wider border ${eventStyle.bg} ${eventStyle.border} ${eventStyle.text}`}>
              {squad.event}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase border ${
              isFull
                ? 'bg-outline-var/10 text-outline border-outline-var/20'
                : 'bg-secondary-bright/10 text-secondary-bright border-secondary-bright/20'
            }`}
          >
            {isFull ? 'Full' : 'Open'}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {squad.title}
          </h3>
          <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
            {squad.description}
          </p>
        </div>

        {/* Slots preview */}
        {squad.slots && squad.slots.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-outline-var/15">
            <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
              Roles Needed:
            </span>
            <div className="space-y-1">
              {squad.slots.slice(0, 2).map((slot) => (
                <div key={slot.id} className="flex items-center justify-between text-xs bg-surface-mid/60 px-2 py-1 rounded-xs border border-outline-var/20">
                  <span className="font-medium text-text-primary text-[11px] truncate">{slot.roleTitle}</span>
                  {slot.requiredSkill && (
                    <span className="text-[10px] text-primary font-syne font-bold truncate">
                      {slot.requiredSkill}
                    </span>
                  )}
                </div>
              ))}
              {squad.slots.length > 2 && (
                <span className="text-[10px] text-outline font-syne block pl-1">
                  +{squad.slots.length - 2} more roles
                </span>
              )}
            </div>
          </div>
        )}

        {/* Leader & Member stats */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-var/15 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30">
              {squad.leader?.avatar ? (
                <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-primary/20" />
              )}
            </div>
            <span className="truncate max-w-[120px]">{squad.leader?.name}</span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-text-primary">
            <Users size={12} className="text-primary" />
            <span>{squad.currentMembers}/{squad.maxMembers}</span>
          </div>
        </div>

        {/* Urgent Expiry warning */}
        {daysLeft !== null && daysLeft <= 3 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-syne font-bold">
            <Clock size={11} /> Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="mt-4 pt-3 border-t border-outline-var/15">
        {isLeader ? (
          <button
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5"
          >
            Manage Squad
          </button>
        ) : (
          <button
            onClick={() => navigate(`/squad/${squad.id}`)}
            className="w-full py-2 bg-surface-mid hover:bg-primary text-text-primary hover:text-on-primary border border-outline-var/30 hover:border-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5"
          >
            View Mission Details
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main MissionBoard Page ──────────────────────────────────────────────────
export default function MissionBoard() {
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('');

  const loadSquads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SquadAPI.getFeed({
        event: eventFilter,
        status: statusFilter,
        skill: skillFilter,
        search: searchQuery,
      });
      const list = res?.squads || res?.data || (Array.isArray(res) ? res : []);
      setSquads(list);
    } catch (err) {
      toast.error('Failed to load squads.');
    } finally {
      setLoading(false);
    }
  }, [eventFilter, statusFilter, skillFilter, searchQuery, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSquads();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadSquads]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={() => {}} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-var/20">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-primary" size={22} />
              <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                Mission Board
              </h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Join high-impact teams for hackathons, startups, open source, and research initiatives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/my-squads')}
              className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5"
            >
              <Shield size={14} /> My Applications
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Plus size={14} /> Create Squad
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface border border-outline-var/20 rounded-md p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3.5 top-3 text-outline" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search squads by title, description, or leader..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 pl-10 pr-4 text-xs text-text-primary outline-none focus:border-primary/50 placeholder-outline-var font-outfit"
              />
            </div>

            {/* Skill Filter */}
            <div className="md:col-span-4 relative">
              <input
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Filter by skill requirement..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 px-3 text-xs text-text-primary outline-none focus:border-primary/50 placeholder-outline-var font-outfit"
              />
            </div>
          </div>

          {/* Event Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-var/15">
            <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline mr-1">
              Category:
            </span>
            {[
              { id: 'ALL', label: 'All Missions' },
              { id: 'HACKATHON', label: 'Hackathons' },
              { id: 'OPEN_SOURCE', label: 'Open Source' },
              { id: 'STARTUP', label: 'Startups' },
              { id: 'RESEARCH', label: 'Research' },
              { id: 'PORTFOLIO', label: 'Portfolio' },
            ].map((ev) => (
              <button
                key={ev.id}
                onClick={() => setEventFilter(ev.id)}
                className={`px-3 py-1 rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  eventFilter === ev.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/30'
                }`}
              >
                {ev.label}
              </button>
            ))}
          </div>
        </div>

        {/* Squad Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-syne font-bold uppercase tracking-wider text-text-primary">
              Active Squads {!loading && `(${squads.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-60 bg-surface border border-outline-var/20 rounded-md animate-pulse p-6" />
              ))}
            </div>
          ) : squads.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-dashed border-outline-var/30 rounded-md p-8">
              <Shield size={44} className="mx-auto text-outline-var mb-3 opacity-40" />
              <h3 className="text-base font-extrabold text-text-primary">No Squads Found</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                No active squads match your current filters. Be the pioneer and launch a new squad mission!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
              >
                Create Squad
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {squads.map((squad) => (
                <SquadCard key={squad.id} squad={squad} currentUser={currentUser} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateSquadModal onClose={() => setShowCreateModal(false)} onCreated={loadSquads} />
      )}
    </div>
  );
}
