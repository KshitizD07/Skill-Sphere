import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Lock, CheckCircle,
  AlertCircle, Target, User, Shield
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';

export default function SquadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualification, setQualification] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');

  useEffect(() => {
    loadSquad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadSquad = async () => {
    setLoading(true);
    const data = await SquadAPI.getSquad(id);
    if (!data.error) {
      setSquad(data);
      // Check if user already applied
      const existingApp = data.applications?.find(a => a.userId === currentUser.id);
      if (existingApp) setApplied(true);
      // Check qualification
      const qual = await SquadAPI.checkQualification(id, currentUser.id);
      if (!qual.error) setQualification(qual);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    const res = await SquadAPI.applyToSquad(id, applyMessage, selectedSlot);
    if (res.error) {
      setApplyError(res.message);
    } else {
      setApplied(true);
      await loadSquad(); // Refresh status
    }
    setApplying(false);
  };

  const handleLogout = () => {
    API.post('/auth/logout').catch(() => {});
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!squad) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center font-syne">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto text-error mb-4" />
        <h3 className="text-xl font-extrabold text-text-primary uppercase tracking-wider">Mission Not Found</h3>
        <p className="text-text-muted mt-2">The squad you are looking for does not exist or has been deleted.</p>
        <button onClick={() => navigate('/nexus')} className="mt-6 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-xs hover:opacity-90 transition-all">
          Back to Nexus
        </button>
      </div>
    </div>
  );

  const isLeader = squad.leader?.id === currentUser.id;
  const isFull = squad.currentMembers >= squad.maxMembers;
  const openSlots = squad.slots?.filter(s => s.status === 'OPEN') || [];
  const canApply = !isLeader && !isFull && !applied && qualification?.qualifies;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={handleLogout} />

      <div className="flex-grow md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto p-6 md:p-10 w-full max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-outline-var/25 pb-6">
          <button onClick={() => navigate('/nexus')} className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/45 text-text-muted hover:text-primary transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="font-syne text-[9px] font-bold tracking-[0.12em] uppercase text-text-muted">N.E.X.U.S. / SQUAD_PROFILE</span>
            <h1 className="text-xl font-extrabold tracking-tight mt-0.5">Squad Details</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-outline-var/30 p-6 md:p-8 rounded-xs space-y-4">
              {squad.event && (
                <div className="inline-block px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs">
                  {squad.event}
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight leading-tight">{squad.title}</h2>
              <p className="text-text-muted text-sm leading-relaxed border-l-2 border-primary/40 pl-4 whitespace-pre-wrap">
                {squad.description}
              </p>
            </div>

            {/* Slots Card */}
            <div className="bg-surface border border-outline-var/30 p-6 rounded-xs">
              <h3 className="text-xs font-bold font-syne text-primary uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
                <Target size={14} /> Open Roles ({openSlots.length} available)
              </h3>
              <div className="space-y-3">
                {squad.slots?.map((slot) => {
                  const isOpen = slot.status === 'OPEN';
                  const isSelected = selectedSlot === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => isOpen && !isLeader && !applied && setSelectedSlot(isSelected ? null : slot.id)}
                      className={`flex items-center justify-between p-4 rounded-xs border transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5' 
                          : isOpen && canApply 
                            ? 'border-outline-var/40 hover:border-primary/40 cursor-pointer bg-surface-mid/30' 
                            : 'border-outline-var/30 bg-surface-mid/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isOpen && canApply && (
                          <div className={`w-4 h-4 border flex items-center justify-center rounded-xs transition-colors shrink-0 ${
                            isSelected ? 'border-primary bg-primary' : 'border-outline-var hover:border-primary'
                          }`}>
                            {isSelected && <CheckCircle size={10} className="text-on-primary" />}
                          </div>
                        )}
                        <div>
                          <div className="text-text-primary font-bold text-sm">{slot.roleTitle}</div>
                          <div className="text-xs text-text-muted mt-1 font-medium">
                            {slot.requiredSkill ? (
                              <>Required Skill: <span className="text-primary font-semibold">{slot.requiredSkill}</span></>
                            ) : (
                              <span>Open Skill Role</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {slot.requiredSkill && (
                          <div className="flex items-center gap-1 text-[10px] font-syne font-bold uppercase tracking-wider text-secondary-bright">
                            <Lock size={10} />
                            Score ≥ {slot.minScore}
                          </div>
                        )}
                        {slot.filledBy ? (
                          <span className="text-[9px] font-syne font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-xs mt-1 inline-block">
                            FILLED
                          </span>
                        ) : (
                          <span className="text-[9px] font-syne font-bold uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-xs mt-1 inline-block">
                            OPEN
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Squad Members */}
            {squad.applications?.filter(a => a.status === 'ACCEPTED').length > 0 && (
              <div className="bg-surface border border-outline-var/30 p-6 rounded-xs">
                <h3 className="text-xs font-bold font-syne text-primary uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
                  <Users size={14} className="text-outline" /> Squad Members ({squad.currentMembers}/{squad.maxMembers})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {squad.applications.filter(a => a.status === 'ACCEPTED').map(app => (
                    <div key={app.id} className="flex items-center gap-3 p-3 bg-surface-mid/30 border border-outline-var/20 rounded-xs">
                      <div className="w-9 h-9 rounded-full bg-surface-mid border border-outline-var/30 overflow-hidden shrink-0 flex items-center justify-center">
                        {app.user?.avatar ? (
                          <img src={app.user.avatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User size={16} className="text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-text-primary text-sm font-bold truncate">{app.user?.name}</div>
                        <div className="text-xs text-text-muted mt-0.5 truncate">{app.slot?.roleTitle || 'Member'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Application Box */}
          <div className="space-y-4">
            <div className="bg-surface border border-outline-var/30 p-6 rounded-xs sticky top-8">
              
              <div className="flex items-center justify-between mb-4 border-b border-outline-var/20 pb-4">
                <div className="text-[10px] font-syne font-bold uppercase tracking-[0.12em] text-text-muted">Squad Status</div>
                <div className={`text-[9px] font-syne font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs border ${
                  isFull 
                    ? 'bg-error/10 text-error border-error/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {isFull ? 'FULL' : 'RECRUITING'}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Users size={15} className="text-text-muted" />
                  <span className="text-text-muted">
                    Capacity: <span className="text-text-primary font-bold">{squad.currentMembers} / {squad.maxMembers}</span>
                  </span>
                </div>
              </div>

              {/* Qualification Feedback */}
              {qualification && !isLeader && (
                <div className={`p-4 mb-4 border text-xs leading-relaxed rounded-xs ${
                  qualification.qualifies
                    ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400'
                    : 'bg-error/5 border-error/25 text-error'
                }`}>
                  {qualification.qualifies ? (
                    <div className="flex items-start gap-2">
                      <CheckCircle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wide block mb-1">Qualifies for Squad</span>
                        Compatible slot found! Estimated match score: <span className="font-semibold text-text-primary">{qualification.matchScore}%</span>.
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase tracking-wide block mb-1">Ineligible</span>
                        {qualification.reason || 'You do not meet the minimum skill score threshold for open roles.'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Application Form */}
              {canApply && !applied && (
                <div className="space-y-3 mb-5">
                  <div>
                    <label className="block text-[10px] font-syne font-bold uppercase tracking-[0.12em] text-text-muted mb-1.5">
                      Pitch Message (Optional)
                    </label>
                    <textarea
                      value={applyMessage}
                      onChange={e => setApplyMessage(e.target.value)}
                      maxLength={200}
                      rows={3}
                      placeholder="Highlight relevant experience, interest, or value you bring to this squad..."
                      className="w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 rounded-xs focus:border-primary/60 outline-none font-outfit text-xs resize-none placeholder-outline-var transition-colors"
                    />
                    <div className="text-right text-[9px] text-text-muted mt-1">{applyMessage.length}/200 characters</div>
                  </div>
                </div>
              )}

              {/* Application Error Banner */}
              {applyError && (
                <div className="p-3 mb-4 bg-error/10 border border-error/20 text-error text-xs rounded-xs font-medium">
                  {applyError}
                </div>
              )}

              {/* Action Button */}
              {isLeader ? (
                <button
                  onClick={() => navigate(`/squad/${id}/manage`)}
                  className="w-full py-3 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-widest rounded-xs hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={14} />
                  Manage Squad
                </button>
              ) : applied ? (
                <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-syne font-bold text-xs uppercase tracking-wider text-center rounded-xs">
                  Application Submitted ✓
                </div>
              ) : isFull ? (
                <button disabled className="w-full py-3 bg-surface-mid border border-outline-var/20 text-text-muted/40 font-syne font-bold text-xs uppercase tracking-widest rounded-xs cursor-not-allowed">
                  Squad Full
                </button>
              ) : !qualification?.qualifies ? (
                <button disabled className="w-full py-3 bg-surface-mid border border-error/25 text-error/45 font-syne font-bold text-xs uppercase tracking-widest rounded-xs cursor-not-allowed flex items-center justify-center gap-2">
                  <Lock size={12} />
                  Skill Gate Locked
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full py-3 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-widest rounded-xs hover:opacity-90 hover:shadow-lg hover:shadow-primary/10 transition-all disabled:opacity-50"
                >
                  {applying ? 'Submitting...' : selectedSlot ? 'Apply For Role' : 'Submit Pitch'}
                </button>
              )}

              {/* Leader Bio Block */}
              <div className="mt-6 pt-5 border-t border-outline-var/30">
                <div className="text-[10px] font-syne font-bold uppercase tracking-[0.12em] text-text-muted mb-2.5">Squad Leader</div>
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-surface-mid/30 p-2 -mx-2 rounded-xs transition-colors"
                  onClick={() => navigate(`/profile/${squad.leader?.id}`)}
                >
                  <div className="w-9 h-9 rounded-full bg-surface-mid border border-outline-var/30 overflow-hidden shrink-0 flex items-center justify-center">
                    {squad.leader?.avatar ? (
                      <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User size={16} className="text-text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-text-primary text-sm font-bold truncate">{squad.leader?.name}</div>
                    <div className="text-xs text-primary font-medium hover:text-primary-dim transition-colors mt-0.5">View Profile →</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}