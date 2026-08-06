import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, CheckCircle, X,
  User, AlertCircle, RefreshCw
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';

export default function SquadManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [recommendationsMap, setRecommendationsMap] = useState({});

  // eslint-disable-next-line
  useEffect(() => { loadSquad(); }, [id]);

  const loadSquad = async () => {
    setLoading(true);
    const data = await SquadAPI.getSquad(id);
    if (!data.error) {
      setSquad(data);
      // Fetch recommendations for each slot
      const recMap = {};
      if (data.slots && data.slots.length > 0) {
        await Promise.all(
          data.slots.map(async (slot) => {
            try {
              const recs = await SquadAPI.getSlotRecommendations(id, slot.id);
              if (Array.isArray(recs)) {
                for (const r of recs) {
                  recMap[r.applicationId] = r;
                }
              }
            } catch (err) {
              console.error(`Failed to fetch recommendations for slot ${slot.id}:`, err);
            }
          })
        );
      }
      setRecommendationsMap(recMap);
    }
    setLoading(false);
  };

  const handleAction = async (applicationId, status) => {
    setActionLoading(applicationId);
    try {
      const res = await SquadAPI.updateApplicationStatus(id, applicationId, status);
      if (res.error) {
        alert(res.message || 'Failed to update application status.');
      } else {
        await loadSquad(); // Refresh
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating application status.');
    }
    setActionLoading(null);
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

  if (!squad || squad.leader?.id !== currentUser.id) return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center font-syne">
      <div className="text-center">
        <AlertCircle size={48} className="mx-auto text-error mb-4" />
        <h3 className="text-xl font-extrabold text-text-primary uppercase tracking-wider">Access Denied</h3>
        <p className="text-text-muted mt-2">Only the squad leader can manage this command center.</p>
        <button onClick={() => navigate('/nexus')} className="mt-6 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-xs hover:opacity-90 transition-all">
          Back to Nexus
        </button>
      </div>
    </div>
  );

  const pending = squad.applications?.filter(a => a.status === 'PENDING') || [];
  const accepted = squad.applications?.filter(a => a.status === 'ACCEPTED') || [];
  const rejected = squad.applications?.filter(a => a.status === 'REJECTED') || [];

  // Sort pending applications by compatibility score
  const sortedPending = [...pending].sort((a, b) => {
    const scoreA = recommendationsMap[a.id]?.compatibilityScore ?? 0;
    const scoreB = recommendationsMap[b.id]?.compatibilityScore ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={handleLogout} />

      <div className="flex-grow md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto p-6 md:p-10 w-full max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 border-b border-outline-var/25 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/squad/${id}`)} className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/45 text-text-muted hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight leading-tight">{squad.title}</h1>
              <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-primary mt-1">N.E.X.U.S._COMMAND_CENTER</p>
            </div>
          </div>
          <button onClick={loadSquad} className="self-end md:self-auto p-2.5 border border-outline-var/40 rounded-xs hover:border-primary/45 text-text-muted hover:text-primary transition-all flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="font-syne text-[10px] font-bold uppercase tracking-widest">Refresh</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'PENDING REVIEW', count: pending.length, color: 'text-primary border-primary/25 bg-primary/5' },
            { label: 'ACCEPTED MEMBERS', count: accepted.length, color: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' },
            { label: 'CAPACITY', count: `${squad.currentMembers}/${squad.maxMembers}`, color: 'text-secondary-bright border-secondary-bright/25 bg-secondary-bright/5' },
          ].map(stat => (
            <div key={stat.label} className={`border p-5 rounded-xs flex flex-col justify-between ${stat.color}`}>
              <div className="text-4xl font-extrabold font-syne tracking-tight">
                {stat.count}
              </div>
              <div className="text-[10px] font-syne font-bold uppercase tracking-[0.12em] text-text-muted mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
          
          {/* Pending Applications */}
          <div>
            <h2 className="text-sm font-extrabold font-syne text-primary uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
              <AlertCircle size={15} /> Pending Applications ({pending.length})
            </h2>
            {sortedPending.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-outline-var/30 rounded-xs text-text-muted font-syne text-xs uppercase tracking-wider">
                No pending applications
              </div>
            ) : (
              <div className="space-y-4">
                {sortedPending.map(app => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    recommendation={recommendationsMap[app.id]}
                    onAccept={() => handleAction(app.id, 'ACCEPTED')}
                    onReject={() => handleAction(app.id, 'REJECTED')}
                    loading={actionLoading === app.id}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Accepted Members */}
          {accepted.length > 0 && (
            <div>
              <h2 className="text-sm font-extrabold font-syne text-emerald-400 uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
                <CheckCircle size={15} /> Accepted Members ({accepted.length})
              </h2>
              <div className="space-y-4">
                {accepted.map(app => (
                  <ApplicationCard
                    key={app.id}
                    application={app}
                    recommendation={recommendationsMap[app.id]}
                    accepted
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Rejected Applications */}
          {rejected.length > 0 && (
            <div>
              <h2 className="text-sm font-extrabold font-syne text-text-muted uppercase tracking-[0.12em] mb-4">
                Rejected ({rejected.length})
              </h2>
              <div className="space-y-3 opacity-60">
                {rejected.map(app => (
                  <ApplicationCard key={app.id} application={app} recommendation={recommendationsMap[app.id]} rejected navigate={navigate} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function ApplicationCard({ application, recommendation, onAccept, onReject, loading, accepted, rejected, navigate }) {
  const user = application.user;
  const compatibilityScore = recommendation?.compatibilityScore ?? null;
  const matchedSkills = recommendation?.matchedSkills || [];
  const missingSkills = recommendation?.missingSkills || [];

  return (
    <div className={`bg-surface border p-5 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
      accepted ? 'border-emerald-500/20' : rejected ? 'border-outline-var/20' : 'border-outline-var/40 hover:border-primary/30'
    }`}>
      <div className="flex items-start gap-4 flex-1">
        <div
          className="w-12 h-12 rounded-full bg-surface-mid border border-outline-var/40 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center"
          onClick={() => navigate(`/profile/${user?.id}`)}
        >
          {user?.avatar ? (
            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <User size={20} className="text-text-muted" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="text-text-primary font-bold hover:text-primary transition-colors cursor-pointer text-base tracking-tight"
              onClick={() => navigate(`/profile/${user?.id}`)}
            >
              {user?.name}
            </div>
            {application.slot?.roleTitle && (
              <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-text-muted font-syne text-[10px] font-bold uppercase tracking-wider rounded-xs">
                {application.slot.roleTitle}
              </span>
            )}
          </div>

          <div className="text-xs text-text-muted font-medium mt-0.5">{user?.headline || user?.college || user?.role}</div>

          {application.message && (
            <p className="text-xs text-text-muted mt-2 border-l-2 border-outline/50 pl-2 italic">
              &quot;{application.message}&quot;
            </p>
          )}

          {/* N.E.X.U.S. Compatibility Breakdown */}
          {compatibilityScore != null && (
            <div className="mt-3 space-y-2 pt-2 border-t border-outline-var/15">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                    N.E.X.U.S. Skill Match:
                  </span>
                  <span className={`text-xs font-syne font-extrabold ${
                    compatibilityScore >= 70 ? 'text-secondary-bright' :
                    compatibilityScore >= 40 ? 'text-primary' : 'text-text-muted'
                  }`}>
                    {compatibilityScore}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {matchedSkills.map((s, idx) => (
                  <span key={idx} className="text-[9px] font-syne font-bold uppercase tracking-wider bg-secondary-bright/10 border border-secondary-bright/20 text-secondary-bright px-2 py-0.5 rounded-xs flex items-center gap-1">
                    <CheckCircle size={9} /> {s.name}
                  </span>
                ))}
                {missingSkills.map((s, idx) => (
                  <span key={idx} className="text-[9px] font-syne font-bold uppercase tracking-wider bg-surface-mid/60 border border-outline-var/30 text-outline opacity-60 px-2 py-0.5 rounded-xs">
                    {s} (Missing)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!accepted && !rejected && (
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <button
            onClick={onReject}
            disabled={loading}
            className="p-2.5 border border-error/30 text-error bg-error/5 hover:bg-error hover:text-on-primary transition-all rounded-xs disabled:opacity-50"
            title="Reject Candidate"
          >
            {loading ? <div className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin" /> : <X size={16} />}
          </button>
          <button
            onClick={onAccept}
            disabled={loading}
            className="px-5 py-2.5 bg-primary text-on-primary font-syne font-bold text-[10px] uppercase tracking-[0.1em] hover:opacity-90 transition-all rounded-xs disabled:opacity-50 shadow-md shadow-primary/10 flex items-center gap-1.5"
          >
            {loading ? <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> : <CheckCircle size={12} />}
            <span>Accept Candidate</span>
          </button>
        </div>
      )}

      {accepted && (
        <span className="text-emerald-400 font-syne text-[10px] font-bold uppercase tracking-[0.12em] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xs shrink-0 self-start md:self-auto">
          Accepted
        </span>
      )}
      {rejected && (
        <span className="text-text-muted font-syne text-[10px] font-bold uppercase tracking-[0.12em] bg-surface-mid border border-outline-var/30 px-3 py-1 rounded-xs shrink-0 self-start md:self-auto">
          Rejected
        </span>
      )}
    </div>
  );
}