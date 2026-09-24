import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SquadAPI from './squadAPI';
import {
  ArrowLeft,
  User, AlertCircle, RefreshCw,
  ExternalLink, Shield
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';
import NexusMatchModal from './components/NexusMatchModal';

export default function SquadManage({ user: propUser, onLogout }) {
  const { id } = useParams();
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

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState('ALL');
  const [recommendationsMap, setRecommendationsMap] = useState({});
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [nexusModalOpen, setNexusModalOpen] = useState(false);

  const loadSquad = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SquadAPI.getSquad(id);
      if (data && !data.error) {
        setSquad(data);
      } else {
        setSquad(null);
        toast.error(data?.message || 'Failed to load squad details.');
      }
    } catch {
      toast.error('Failed to load squad manage center.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load N.E.X.U.S. smart recommendations for slot
  const loadRecommendations = useCallback(async (slots) => {
    if (!slots || !slots.length) return;
    setLoadingRecs(true);
    const recMap = {};
    try {
      await Promise.all(
        slots.map(async (slot) => {
          try {
            const recs = await SquadAPI.getSlotRecommendations(id, slot.id);
            if (Array.isArray(recs)) {
              for (const r of recs) {
                recMap[r.applicationId] = r;
              }
            }
          } catch {
            // Non-blocking for recommendations
          }
        })
      );
      setRecommendationsMap(recMap);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  }, [id]);

  useEffect(() => {
    loadSquad();
  }, [id, loadSquad]);

  useEffect(() => {
    if (squad?.slots) {
      loadRecommendations(squad.slots);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [squad?.id, loadRecommendations]);

  const handleAction = async (applicationId, status) => {
    setActionLoading(applicationId);
    try {
      await SquadAPI.updateApplicationStatus(id, applicationId, status);
      toast.success(`Application marked as ${status.toLowerCase()}!`);
      loadSquad();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to update application.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!squad || squad.leader?.id !== currentUser?.id) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-outfit p-4">
        <div className="text-center bg-surface border border-outline-var/25 p-8 rounded-xl max-w-md w-full shadow-sm">
          <AlertCircle size={40} className="mx-auto text-error mb-4" />
          <h3 className="text-xl font-bold font-syne text-text-primary tracking-tight">Access Restricted</h3>
          <p className="text-xs text-text-muted mt-2">Only the squad mission leader can manage applications for this team.</p>
          <button
            onClick={() => navigate('/nexus')}
            className="mt-6 px-5 py-2.5 bg-primary text-on-primary font-outfit font-semibold text-xs rounded-lg hover:bg-primary-dim transition-colors"
          >
            Back to Mission Board
          </button>
        </div>
      </div>
    );
  }

  const applications = squad.applications || [];
  const pendingApps = applications.filter((a) => a.status === 'PENDING');
  const acceptedApps = applications.filter((a) => a.status === 'ACCEPTED');
  const _rejectedApps = applications.filter((a) => a.status === 'REJECTED');

  const filteredPending = selectedSlotId === 'ALL'
    ? pendingApps
    : pendingApps.filter((a) => a.slotId === selectedSlotId);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-var/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/squad/${squad.id}`)}
              className="p-2 border border-outline-var/30 hover:border-primary/40 rounded-lg text-outline hover:text-primary transition-all"
              title="Back to Squad Briefing"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="font-outfit text-xs font-semibold text-text-muted">
                Squad Management
              </span>
              <h1 className="text-xl font-bold font-syne text-text-primary tracking-tight">
                Manage Applications — {squad.title}
              </h1>
            </div>
          </div>

          <button
            onClick={loadRecommendations}
            disabled={loadingRecs}
            className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-outfit font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} className={loadingRecs ? 'animate-spin' : ''} />
            Recalculate Matches
          </button>
        </div>

        {/* Slot Tabs Filter */}
        <div className="flex items-center gap-2 flex-wrap pb-2">
          <span className="text-xs font-outfit font-semibold text-text-muted mr-1">
            Filter by Slot:
          </span>
          <button
            onClick={() => setSelectedSlotId('ALL')}
            className={`px-3 py-1.5 rounded-lg font-outfit text-xs font-medium transition-colors ${
              selectedSlotId === 'ALL'
                ? 'bg-primary text-on-primary'
                : 'bg-surface border border-outline-var/25 text-text-muted hover:text-text-primary'
            }`}
          >
            All Roles ({pendingApps.length})
          </button>
          {(squad.slots || []).map((slot) => {
            const count = pendingApps.filter((a) => a.slotId === slot.id).length;
            return (
              <button
                key={slot.id}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`px-3 py-1.5 rounded-lg font-outfit text-xs font-medium transition-colors ${
                  selectedSlotId === slot.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface border border-outline-var/25 text-text-muted hover:text-text-primary'
                }`}
              >
                {slot.roleTitle} ({count})
              </button>
            );
          })}
        </div>

        {/* Pending Applications List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-syne font-bold text-text-primary">
              Pending Candidates ({filteredPending.length})
            </h2>
            {selectedSlotId !== 'ALL' && filteredPending.length > 0 && (
              <button
                onClick={() => setNexusModalOpen(true)}
                className="px-3.5 py-2 bg-accent text-on-primary hover:bg-accent/90 font-outfit font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <span>Automated Match Analysis</span>
              </button>
            )}
          </div>

          {filteredPending.length === 0 ? (
            <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-xl p-6">
              <Shield size={38} className="mx-auto text-outline-var mb-2 opacity-40" />
              <h3 className="text-base font-bold text-text-primary">No Pending Applications</h3>
              <p className="text-xs text-text-muted mt-1">
                New candidate applications will appear here as developers apply.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPending.map((app) => {
                const rec = recommendationsMap[app.id];
                const applicant = app.user;
                const slot = squad.slots?.find((s) => s.id === app.slotId);

                return (
                  <div
                    key={app.id}
                    className="bg-surface border border-outline-var/25 hover:border-primary/40 rounded-xl p-5 flex flex-col justify-between transition-all space-y-4 shadow-sm"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full border border-outline-var/30 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0">
                            {applicant?.avatar ? (
                              <img src={applicant.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <User size={18} className="text-outline" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-text-primary truncate">{applicant?.name}</h3>
                            <p className="text-xs text-text-muted truncate">
                              {applicant?.headline || applicant?.college || 'Applicant'}
                            </p>
                          </div>
                        </div>

                        {/* Applied Role Badge */}
                        <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-md text-xs font-outfit font-medium truncate max-w-[140px]">
                          {slot?.roleTitle || 'Member'}
                        </span>
                      </div>

                      {/* Pitch Message */}
                      {app.message && (
                        <div className="bg-surface-mid/60 border border-outline-var/20 rounded-lg p-3 text-xs text-text-muted italic">
                          &quot;{app.message}&quot;
                        </div>
                      )}

                      {/* Compatibility Match Breakdown */}
                      {rec && (
                        <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-accent font-outfit font-semibold">
                              Compatibility Score: {rec.compatibilityScore}%
                            </span>
                          </div>
                          {rec.matchedSkills && rec.matchedSkills.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap text-xs">
                              <span className="text-text-muted font-outfit">Matched:</span>
                              {rec.matchedSkills.map((sk) => (
                                <span key={sk} className="px-2 py-0.5 bg-accent/10 text-accent rounded-md font-medium text-xs">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-3 border-t border-outline-var/15">
                      <button
                        onClick={() => navigate(`/profile/${applicant?.id}`)}
                        className="px-3 py-1.5 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary text-xs font-outfit font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        Profile <ExternalLink size={12} />
                      </button>

                      <div className="flex-1 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(app.id, 'REJECTED')}
                          disabled={actionLoading === app.id}
                          className="px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error text-xs font-outfit font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(app.id, 'ACCEPTED')}
                          disabled={actionLoading === app.id}
                          className="px-4 py-1.5 bg-primary text-on-primary hover:bg-primary-dim text-xs font-outfit font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {actionLoading === app.id ? 'Processing...' : 'Accept Candidate'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accepted Squad Members Section */}
        {acceptedApps.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-outline-var/20">
            <h2 className="text-base font-syne font-bold text-text-primary">
              Accepted Squad Roster ({acceptedApps.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {acceptedApps.map((app) => (
                <div key={app.id} className="bg-surface border border-outline-var/25 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30 shrink-0 flex items-center justify-center">
                    {app.user?.avatar ? (
                      <img src={app.user.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User size={15} className="text-outline" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-text-primary truncate">{app.user?.name}</h4>
                    <span className="text-xs text-accent font-outfit font-medium">
                      ✓ Active Member
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {nexusModalOpen && (
        <NexusMatchModal 
          isOpen={nexusModalOpen}
          onClose={() => setNexusModalOpen(false)}
          squad={squad}
          slotId={selectedSlotId}
          candidates={filteredPending.map(a => a.user?.id)}
          onMatchAccepted={() => {
            loadSquad();
          }}
        />
      )}
    </div>
  );
}
