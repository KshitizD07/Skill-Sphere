import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  Plus, Search, Users, Shield,
  X, ChevronRight, ChevronDown,
  Clock, Sparkles
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

const EVENT_COLORS = {
  HACKATHON:   { bg: 'bg-primary/10', border: 'border-primary/25', text: 'text-primary' },
  OPEN_SOURCE: { bg: 'bg-accent/10', border: 'border-accent/25', text: 'text-accent' },
  RESEARCH:    { bg: 'bg-surface-mid', border: 'border-outline-var/40', text: 'text-text-muted' },
  STARTUP:     { bg: 'bg-primary/15', border: 'border-primary/30', text: 'text-primary-dim' },
  PORTFOLIO:   { bg: 'bg-surface-mid', border: 'border-outline-var/40', text: 'text-text-primary' },
};

// ─── Create Squad Modal (Multi-step) ─────────────────────────────────────────
function CreateSquadModal({ onClose, onCreated }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [_allSkills, setAllSkills] = useState([]);
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

  const _togglePreferredSkill = (slotIndex, skillName) => {
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

  const labelBase = "block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1.5";
  const inputBase = "w-full bg-surface-mid border border-outline-var/40 text-text-primary p-2.5 rounded-xs focus:border-primary/60 outline-none font-outfit text-sm transition-colors placeholder-outline-var";

  return (
    <div className="fixed inset-0 bg-secondary/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-bg-base border border-outline-var/40 rounded-xs max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 font-outfit">
        <button onClick={onClose} className="absolute top-5 right-5 text-text-muted hover:text-text-primary transition-colors font-mono text-xs">
          ✕
        </button>

        <div className="border-b-2 border-secondary pb-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/60 mb-1">Squad Architecture</p>
          <h2 className="text-xl font-bold text-text-primary tracking-tight font-syne">Create Mission Squad</h2>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 border-b border-outline-var/25 pb-2 text-xs">
          <span className={`font-mono text-[11px] uppercase tracking-wider ${step === 1 ? 'text-primary font-bold' : 'text-text-muted'}`}>
            01 · Parameters
          </span>
          <span className="text-outline-var text-[11px] font-mono">/</span>
          <span className={`font-mono text-[11px] uppercase tracking-wider ${step === 2 ? 'text-primary font-bold' : 'text-text-muted'}`}>
            02 · Role Slots
          </span>
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
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n}>{n} Members</option>
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
              className="w-full py-2.5 bg-primary hover:bg-primary-dim text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Next: Define Squad Roles <ChevronRight size={13} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-text-muted text-xs font-outfit">
              Define required roles. Gatekeeper will verify that applicants meet your skill and verification criteria.
            </p>

            {form.slots.map((slot, i) => (
              <div key={i} className="bg-surface-mid/50 border border-outline-var/30 rounded-xs p-4 relative group space-y-3 font-outfit">
                {form.slots.length > 1 && (
                  <button
                    onClick={() => removeSlot(i)}
                    className="absolute top-3 right-3 text-text-muted hover:text-error transition-colors font-mono text-xs"
                  >
                    ✕
                  </button>
                )}
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Slot 0{i + 1}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelBase}>Role Title *</label>
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
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted font-outfit">
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
                className="w-full py-2.5 border border-dashed border-outline-var/40 text-text-muted hover:border-primary hover:text-primary transition-all font-mono text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-xs cursor-pointer"
              >
                <Plus size={13} /> Add Role Slot
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 border border-outline-var/40 text-text-muted font-mono text-[11px] uppercase tracking-wider hover:text-text-primary transition-colors rounded-xs cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dim text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors disabled:opacity-40 cursor-pointer"
              >
                {loading ? 'Creating Squad...' : 'Deploy Squad'}
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
  const [expandedRoles, setExpandedRoles] = useState(false);

  // Expiry calculation
  const daysLeft = useMemo(() => {
    if (!squad.expiresAt) return null;
    const diff = new Date(squad.expiresAt).getTime() - renderedAt;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [renderedAt, squad.expiresAt]);

  const visibleSlots = expandedRoles ? (squad.slots || []) : (squad.slots || []).slice(0, 2);

  return (
    <div className="bg-surface border border-outline-var/30 hover:border-primary/50 rounded-xs transition-colors group flex flex-col justify-between p-5 font-outfit">
      <div className="space-y-3">
        {/* Top Masthead Row */}
        <div className="flex items-center justify-between gap-2 border-b border-outline-var/20 pb-2.5">
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/70">
            {squad.event || 'MISSION'}
          </span>
          <span
            className={`font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.2 rounded-xs border ${
              isFull
                ? 'bg-surface-mid text-text-muted border-outline-var/30'
                : 'bg-accent/10 text-accent border-accent/25'
            }`}
          >
            {isFull ? 'FULL' : 'OPEN'}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors line-clamp-1 font-outfit">
            {squad.title}
          </h3>
          <p className="text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed font-outfit">
            {squad.description}
          </p>
        </div>

        {/* Slots preview */}
        {squad.slots && squad.slots.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-outline-var/20 font-outfit">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-wider uppercase text-outline/60">
                Positions ({squad.slots.length})
              </span>
            </div>
            <div className="space-y-1">
              {visibleSlots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between text-xs py-1.5 px-2 border-b border-outline-var/15 gap-2 font-outfit hover:bg-primary/[0.02]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-text-primary text-xs truncate font-outfit">{slot.roleTitle}</span>
                    {slot.requireVerified && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-accent border border-accent/20 px-1 rounded-xs" title="Requires Verified Skill Proof">
                        Verified
                      </span>
                    )}
                  </div>
                  {slot.requiredSkill && (
                    <span className="font-mono text-[10px] text-text-muted truncate">
                      {slot.requiredSkill}
                    </span>
                  )}
                </div>
              ))}
              {squad.slots.length > 2 && (
                <button
                  type="button"
                  onClick={() => setExpandedRoles(!expandedRoles)}
                  className="font-mono text-[10px] text-primary hover:underline uppercase tracking-wider flex items-center gap-1 pt-1 transition-colors cursor-pointer"
                >
                  {expandedRoles ? 'Show less' : `+${squad.slots.length - 2} more`}
                  <ChevronDown size={11} className={`transition-transform duration-200 ${expandedRoles ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Leader & Member stats */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-var/20 text-xs text-text-muted font-outfit">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-xs bg-surface-mid overflow-hidden border border-outline-var/30 flex items-center justify-center font-mono text-[10px] text-primary">
              {squad.leader?.avatar ? (
                <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
              ) : (
                squad.leader?.name?.charAt(0) || 'L'
              )}
            </div>
            <span className="truncate max-w-[120px] font-outfit text-xs text-text-primary">{squad.leader?.name}</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] text-text-primary tabular-nums">
            <Users size={11} className="text-text-muted" />
            <span>{squad.currentMembers}/{squad.maxMembers}</span>
          </div>
        </div>

        {/* Urgent Expiry warning */}
        {daysLeft !== null && daysLeft <= 3 && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-warning uppercase tracking-wider">
            <Clock size={11} /> Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="mt-4 pt-3 border-t border-outline-var/20">
        {isLeader ? (
          <button
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Manage Squad
          </button>
        ) : (
          <button
            onClick={() => navigate(`/squad/${squad.id}`)}
            className="w-full py-2 bg-surface hover:bg-primary text-text-primary hover:text-on-primary border border-outline-var/40 hover:border-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main MissionBoard Page ──────────────────────────────────────────────────
export default function MissionBoard({ user: propUser, onLogout }) {
  const navigate = useNavigate();
  const toast = useToast();

  const fallbackUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const currentUser = propUser || fallbackUser;

  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [statusFilter, _setStatusFilter] = useState('ALL');
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
    } catch {
      toast.error('Failed to load squads.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, statusFilter, skillFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSquads();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventFilter, statusFilter, skillFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-4 border-b-2 border-secondary">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                Nexus · Mission Directory
              </span>
              <span className="text-outline/40 text-xs">/</span>
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/40">
                Squad Assembly
              </span>
            </div>
            <h1 className="text-2xl font-bold font-syne text-text-primary tracking-tight">
              Mission Board
            </h1>
            <p className="text-xs text-text-muted mt-1 font-outfit">
              Join high-impact teams for hackathons, startups, open source, and research initiatives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus size={13} /> Create Squad
            </button>
          </div>
        </div>

        {/* Unified Segmented Navigation */}
        <div className="flex items-center gap-1 border-b border-outline-var/25 overflow-x-auto">
          <button
            className="px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 border-primary text-primary flex items-center gap-2 shrink-0 font-semibold"
          >
            <span>Mission Feed</span>
          </button>
          <button
            onClick={() => navigate('/my-squads')}
            className="px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 border-transparent text-text-muted hover:text-text-primary hover:border-outline-var/50 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>My Applications</span>
          </button>
        </div>

        {/* Filter Toolbar (Flat Editorial) */}
        <div className="border-t border-b border-outline-var/30 py-3.5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3 top-2.5 text-text-muted" size={14} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search squads by title, description, or leader..."
                className="w-full bg-surface-mid border border-outline-var/40 rounded-xs py-2 pl-9 pr-4 text-xs text-text-primary outline-none focus:border-primary/60 placeholder-outline-var font-outfit transition-colors"
              />
            </div>

            {/* Skill Filter */}
            <div className="md:col-span-4 relative">
              <input
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Filter by skill requirement..."
                className="w-full bg-surface-mid border border-outline-var/40 rounded-xs py-2 px-3 text-xs text-text-primary outline-none focus:border-primary/60 placeholder-outline-var font-outfit transition-colors"
              />
            </div>
          </div>

          {/* Event Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-outline-var/15 font-outfit">
            <span className="font-mono text-[10px] tracking-wider uppercase text-outline/60 mr-1.5">
              Category:
            </span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'HACKATHON', label: 'Hackathons' },
              { id: 'OPEN_SOURCE', label: 'Open Source' },
              { id: 'STARTUP', label: 'Startups' },
              { id: 'RESEARCH', label: 'Research' },
              { id: 'PORTFOLIO', label: 'Portfolio' },
            ].map((ev) => (
              <button
                key={ev.id}
                onClick={() => setEventFilter(ev.id)}
                className={`px-2.5 py-1 rounded-xs font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  eventFilter === ev.id
                    ? 'bg-primary text-on-primary font-semibold'
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
            <h2 className="text-sm font-semibold font-outfit text-text-primary">
              Active Squads {!loading && `(${squads.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-60 bg-surface border border-outline-var/20 rounded-xl animate-pulse p-6" />
              ))}
            </div>
          ) : squads.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-dashed border-outline-var/30 rounded-xl p-8">
              <Shield size={40} className="mx-auto text-outline-var mb-3 opacity-30" />
              <h3 className="text-base font-bold text-text-primary font-syne">No Squads Found</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto font-outfit">
                No active squads match your current filters. Launch a new mission squad!
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-xs rounded-lg transition-all shadow-xs"
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
