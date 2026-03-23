import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Plus, Search, Filter, Users, Shield,
  Lock, Calendar, Target, AlertCircle, X, ChevronDown
} from 'lucide-react';

// ─── Create Squad Modal ────────────────────────────────────────────────────────
function CreateSquadModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [allSkills, setAllSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event: '',
    maxMembers: 4,
    slots: [{ roleTitle: '', requiredSkill: '', minScore: 5 }],
  });

  useEffect(() => {
    API.get('/skills/list').then(res => setAllSkills(res.data || []));
  }, []);

  const addSlot = () => {
    if (form.slots.length >= 6) return;
    setForm(f => ({ ...f, slots: [...f.slots, { roleTitle: '', requiredSkill: '', minScore: 5 }] }));
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

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      return alert('TITLE_AND_DESCRIPTION_REQUIRED');
    }
    const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
    setLoading(true);
    try {
      await SquadAPI.createSquad({ ...form, leaderId: currentUser.id });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('CREATION_FAILED');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-yellow-500 max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-2xl font-black font-['Orbitron'] text-yellow-400 mb-2">CREATE_SQUAD</h2>
        <div className="flex gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 transition-colors ${step >= s ? 'bg-yellow-400' : 'bg-gray-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">MISSION_TITLE *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Build a SaaS MVP"
                className="w-full bg-black border border-gray-700 text-white p-3 focus:border-yellow-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-500 mb-1">DESCRIPTION *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4}
                placeholder="What are you building? What's the mission?"
                className="w-full bg-black border border-gray-700 text-white p-3 focus:border-yellow-500 outline-none font-mono resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">EVENT / HACKATHON (optional)</label>
                <input
                  value={form.event}
                  onChange={e => setForm(f => ({ ...f, event: e.target.value }))}
                  placeholder="e.g. HackIndia 2025"
                  className="w-full bg-black border border-gray-700 text-gray-300 p-3 focus:border-yellow-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-500 mb-1">MAX_MEMBERS</label>
                <select
                  value={form.maxMembers}
                  onChange={e => setForm(f => ({ ...f, maxMembers: Number(e.target.value) }))}
                  className="w-full bg-black border border-gray-700 text-gray-300 p-3 focus:border-yellow-500 outline-none font-mono"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map(n => (
                    <option key={n} value={n}>{n} members</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.title.trim() || !form.description.trim()}
              className="w-full py-3 bg-yellow-400 text-black font-black font-['Orbitron'] hover:bg-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              NEXT: DEFINE_SLOTS
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-400 font-mono text-xs">
              Define the skill slots you need. Each slot gate-keeps applicants by their verified skill score.
            </p>

            {form.slots.map((slot, i) => (
              <div key={i} className="bg-black border border-gray-800 p-4 relative group">
                <button
                  onClick={() => removeSlot(i)}
                  className="absolute top-3 right-3 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
                <div className="text-xs font-mono text-yellow-400 mb-3">SLOT_{i + 1}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1">ROLE_TITLE</label>
                    <input
                      value={slot.roleTitle}
                      onChange={e => updateSlot(i, 'roleTitle', e.target.value)}
                      placeholder="e.g. Backend Dev"
                      className="w-full bg-gray-900 border border-gray-700 text-white p-2 focus:border-yellow-500 outline-none font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1">REQUIRED_SKILL</label>
                    <select
                      value={slot.requiredSkill}
                      onChange={e => updateSlot(i, 'requiredSkill', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-cyan-400 p-2 focus:border-yellow-500 outline-none font-mono text-sm"
                    >
                      <option value="">Select skill</option>
                      {allSkills.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 mb-1">MIN_SCORE (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={slot.minScore}
                      onChange={e => updateSlot(i, 'minScore', Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 text-yellow-400 p-2 focus:border-yellow-500 outline-none font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            {form.slots.length < 6 && (
              <button
                onClick={addSlot}
                className="w-full py-2 border border-dashed border-gray-700 text-gray-500 hover:border-yellow-500 hover:text-yellow-400 transition font-mono text-sm flex items-center justify-center gap-2"
              >
                <Plus size={14} /> ADD_SLOT
              </button>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-700 text-gray-400 font-bold font-['Orbitron'] text-sm hover:border-gray-500 transition"
              >
                BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-yellow-400 text-black font-black font-['Orbitron'] hover:bg-yellow-300 transition disabled:opacity-40"
              >
                {loading ? 'DEPLOYING...' : 'DEPLOY_SQUAD'}
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
      SquadAPI.checkQualification(squad.id, currentUser.id)
        .then(res => !res.error && setQualification(res));
    }
  }, [squad.id, currentUser.id]);

  const isLeader = squad.leader?.id === currentUser.id;
  const isFull = squad.currentMembers >= squad.maxMembers;

  return (
    <div className="bg-black border border-gray-800 hover:border-cyan-500/50 transition group relative overflow-hidden flex flex-col">

      {/* Status badge */}
      <div className="absolute top-0 right-0 z-10">
        <div className={`px-3 py-1 text-xs font-bold font-['Orbitron'] ${isFull ? 'bg-red-500 text-black' : 'bg-green-500 text-black'}`}>
          {isFull ? 'FULL' : 'OPEN'}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition" />

      <div className="relative z-10 p-6 flex flex-col flex-1">
        {squad.event && (
          <div className="inline-block px-2 py-1 bg-purple-900/30 border border-purple-500/50 text-purple-400 text-[10px] font-mono mb-3">
            {squad.event}
          </div>
        )}

        <h3 className="text-xl font-bold text-white font-['Orbitron'] mb-2 line-clamp-2 group-hover:text-cyan-400 transition">
          {squad.title}
        </h3>
        <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1">{squad.description}</p>

        {/* Slots preview */}
        {squad.slots?.length > 0 && (
          <div className="space-y-1 mb-4 pb-4 border-b border-gray-800">
            {squad.slots.slice(0, 2).map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Shield size={12} className="text-yellow-400 shrink-0" />
                <span className="text-gray-500 font-mono">{slot.roleTitle}:</span>
                <span className="text-cyan-400 font-bold">{slot.requiredSkill}</span>
                <span className="text-gray-600">≥{slot.minScore}/10</span>
              </div>
            ))}
            {squad.slots.length > 2 && (
              <div className="text-xs text-gray-600 font-mono pl-5">+{squad.slots.length - 2} more slots</div>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between mb-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gray-800 overflow-hidden">
              {squad.leader?.avatar
                ? <img src={squad.leader.avatar} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-cyan-900" />}
            </div>
            <span className="text-gray-500">{squad.leader?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-white font-bold">
            <Users size={12} className="text-gray-500" />
            {squad.currentMembers}/{squad.maxMembers}
          </div>
        </div>

        {/* Qualification indicator */}
        {qualification && !isLeader && (
          <div className={`text-[10px] font-mono mb-2 flex items-center gap-1 ${
            qualification.qualifies ? 'text-green-400' : 'text-red-400'
          }`}>
            {qualification.qualifies ? '✓ YOU_QUALIFY' : '✗ SCORE_TOO_LOW'}
          </div>
        )}

        {/* CTA */}
        {isLeader ? (
          <button
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="w-full py-2 bg-purple-900/30 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition font-bold font-['Orbitron'] text-sm"
          >
            MANAGE_SQUAD
          </button>
        ) : isFull ? (
          <button disabled className="w-full py-2 bg-gray-900 border border-gray-800 text-gray-600 font-bold font-['Orbitron'] text-sm cursor-not-allowed">
            SQUAD_FULL
          </button>
        ) : (
          <button
            onClick={() => navigate(`/squad/${squad.id}`)}
            className="w-full py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition font-bold font-['Orbitron'] text-sm flex items-center justify-center gap-2"
          >
            VIEW_MISSION
            {squad.slots?.some(s => s.minScore > 0) && <Lock size={14} />}
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
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white font-['Orbitron'] tracking-widest flex items-center gap-3">
                <Users className="text-yellow-400" size={32} /> N.E.X.U.S.
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">NETWORKED ENTITY EXCHANGE // SKILL-GATED MATCHMAKING</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/my-squads')}
              className="px-4 py-2 bg-purple-900/30 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition font-bold font-['Orbitron'] text-sm flex items-center gap-2"
            >
              <Shield size={16} /> MY_APPLICATIONS
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-yellow-400 text-black hover:bg-yellow-300 transition font-bold font-['Orbitron'] text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
            >
              <Plus size={16} /> CREATE_SQUAD
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-2 relative group">
            <Search className="absolute left-4 top-3 text-gray-500 group-focus-within:text-cyan-400" size={20} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="SEARCH_MISSIONS..."
              className="w-full bg-gray-900/50 border border-gray-700 p-3 pl-12 text-white outline-none focus:border-cyan-500 font-mono text-sm transition"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              value={skillFilter}
              onChange={e => setSkillFilter(e.target.value)}
              placeholder="SKILL (e.g. React)"
              className="w-full bg-gray-900/50 border border-gray-700 p-3 pl-10 text-gray-300 outline-none focus:border-cyan-500 font-mono text-sm transition"
            />
          </div>
          <div className="relative">
            <Target className="absolute left-3 top-3 text-gray-500" size={18} />
            <select
              value={minScoreFilter}
              onChange={e => setMinScoreFilter(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 p-3 pl-10 text-gray-300 outline-none focus:border-cyan-500 font-mono text-sm transition appearance-none cursor-pointer"
            >
              <option value="">ALL_LEVELS</option>
              <option value="3">MAX_LVL_3</option>
              <option value="5">MAX_LVL_5</option>
              <option value="7">MAX_LVL_7</option>
              <option value="10">MAX_LVL_10</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-cyan-400 mb-4"><Shield size={48} /></div>
            <p className="text-cyan-500 font-mono animate-pulse">SCANNING_NETWORK...</p>
          </div>
        ) : filteredSquads.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800">
            <AlertCircle size={64} className="mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl text-gray-500 font-bold font-['Orbitron']">NO_MISSIONS_FOUND</h3>
            <p className="text-gray-600 font-mono text-sm mt-2">
              {searchQuery || skillFilter ? 'TRY_ADJUSTING_FILTERS' : 'BE_THE_FIRST_TO_CREATE_ONE'}
            </p>
            {!searchQuery && !skillFilter && (
              <button onClick={() => setShowCreateModal(true)} className="mt-6 px-6 py-3 bg-yellow-400 text-black hover:bg-yellow-300 transition font-bold font-['Orbitron']">
                CREATE_FIRST_SQUAD
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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