import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Lock, CheckCircle2,
  AlertCircle, Target, User, Shield, Clock,
  Edit, Trash2, LogOut, Send, X, ExternalLink,
  Flame, Sparkles
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

export default function SquadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualification, setQualification] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', event: '' });

  const loadSquad = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SquadAPI.getSquad(id);
      if (data) {
        setSquad(data);
        setEditForm({
          title: data.title || '',
          description: data.description || '',
          event: data.event || 'HACKATHON',
        });
        if (currentUser?.id) {
          const qual = await SquadAPI.checkQualification(id, currentUser.id);
          setQualification(qual);
        }
      }
    } catch (err) {
      toast.error('Failed to load squad details.');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id, toast]);

  useEffect(() => {
    loadSquad();
  }, [loadSquad]);

  const handleApply = async () => {
    if (!selectedSlot) return toast.error('Please select a role slot to apply for.');
    setSubmitting(true);
    try {
      await SquadAPI.applyToSquad(id, applyMessage, selectedSlot);
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
      setApplyMessage('');
      loadSquad();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveSquad = async () => {
    if (!window.confirm('Are you sure you want to leave this squad?')) return;
    try {
      await SquadAPI.leaveSquad(id);
      toast.success('You have left the squad.');
      loadSquad();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to leave squad.');
    }
  };

  const handleCloseSquad = async () => {
    if (!window.confirm('Are you sure you want to close this squad? All pending applications will be dismissed.')) return;
    try {
      await SquadAPI.deleteSquad(id);
      toast.success('Squad closed successfully.');
      navigate('/nexus');
    } catch (err) {
      toast.error('Failed to close squad.');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await SquadAPI.editSquad(id, editForm);
      toast.success('Squad updated successfully.');
      setShowEditModal(false);
      loadSquad();
    } catch (err) {
      toast.error('Failed to update squad.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center font-syne p-4">
        <div className="text-center bg-surface border border-outline-var/30 p-8 rounded-md max-w-md w-full">
          <AlertCircle size={44} className="mx-auto text-error mb-4" />
          <h3 className="text-lg font-bold text-text-primary uppercase tracking-wider">Mission Not Found</h3>
          <p className="text-xs text-text-muted mt-2">The squad you are looking for does not exist or has been closed.</p>
          <button
            onClick={() => navigate('/nexus')}
            className="mt-6 px-5 py-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-wider rounded-xs"
          >
            Back to Mission Board
          </button>
        </div>
      </div>
    );
  }

  const isLeader = squad.leader?.id === currentUser?.id;
  const isFull = squad.currentMembers >= squad.maxMembers;
  const userApps = (squad.applications || []).filter((a) => a.userId === currentUser?.id);
  const userAcceptedApp = userApps.find((a) => a.status === 'ACCEPTED');
  const userPendingApp = userApps.find((a) => a.status === 'PENDING');
  const isMember = isLeader || !!userAcceptedApp;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={() => {}} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-var/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/nexus')}
              className="p-2 border border-outline-var/30 hover:border-primary/40 rounded-xs text-outline hover:text-primary transition-all"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="font-syne text-[10px] font-bold tracking-wider uppercase text-outline">
                Mission Profile
              </span>
              <h1 className="text-xl font-bold font-syne text-text-primary tracking-tight">
                Squad Briefing
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isLeader ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs flex items-center gap-1.5 transition-colors"
                >
                  <Edit size={13} /> Edit
                </button>
                <button
                  onClick={() => navigate(`/squad/${squad.id}/manage`)}
                  className="px-3.5 py-1.5 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5"
                >
                  Manage Applications
                </button>
                <button
                  onClick={handleCloseSquad}
                  className="p-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-xs transition-colors"
                  title="Close Squad"
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : userAcceptedApp ? (
              <button
                onClick={handleLeaveSquad}
                className="px-3.5 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5"
              >
                <LogOut size={13} /> Leave Squad
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Squad Overview Card */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {squad.event && (
                  <span className="px-2.5 py-0.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-syne font-bold uppercase tracking-wider rounded-full">
                    {squad.event}
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-syne font-bold uppercase border ${
                    isFull
                      ? 'bg-outline-var/10 text-outline border-outline-var/20'
                      : 'bg-secondary-bright/10 text-secondary-bright border-secondary-bright/20'
                  }`}
                >
                  {isFull ? 'Squad Full' : 'Recruiting Members'}
                </span>
              </div>

              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight font-syne leading-snug">
                {squad.title}
              </h2>

              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                {squad.description}
              </p>
            </div>

            {/* Slots / Roles List */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={18} className="text-primary" />
                  <h3 className="font-syne font-bold text-sm uppercase tracking-wider text-text-primary">
                    Squad Role Slots ({(squad.slots || []).length})
                  </h3>
                </div>
              </div>

              <div className="space-y-3">
                {(squad.slots || []).map((slot) => {
                  const isFilled = slot.status === 'FILLED';
                  const isApplied = userApps.some((a) => a.slotId === slot.id);

                  return (
                    <div
                      key={slot.id}
                      className={`p-4 rounded-md border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isFilled
                          ? 'bg-surface-mid/30 border-outline-var/20 opacity-70'
                          : 'bg-surface-mid/60 border-outline-var/30 hover:border-primary/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-text-primary">{slot.roleTitle}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase border ${
                              isFilled
                                ? 'bg-outline-var/20 text-outline border-outline-var/30'
                                : 'bg-secondary-bright/10 text-secondary-bright border-secondary-bright/20'
                            }`}
                          >
                            {isFilled ? 'Filled' : 'Open'}
                          </span>
                        </div>

                        {slot.roleDescription && (
                          <p className="text-xs text-text-muted line-clamp-2">{slot.roleDescription}</p>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-xs text-text-muted flex-wrap">
                          {slot.requiredSkill && (
                            <span className="flex items-center gap-1 text-primary font-semibold text-[11px]">
                              <Shield size={12} /> Required: {slot.requiredSkill} (≥ {slot.minScore}/10)
                            </span>
                          )}
                          {slot.requireVerified && (
                            <span className="flex items-center gap-1 text-secondary-bright text-[11px] font-semibold">
                              <CheckCircle2 size={12} /> Verified Skill Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Slot CTA */}
                      <div>
                        {isLeader ? null : isFilled ? (
                          <span className="text-xs text-outline font-syne uppercase tracking-wider font-bold">
                            Slot Filled
                          </span>
                        ) : isApplied ? (
                          <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs">
                            Applied
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedSlot(slot.id);
                              setShowApplyModal(true);
                            }}
                            className="px-4 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all"
                          >
                            Apply for Role
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar / Meta (Right 1 col) */}
          <div className="space-y-6">
            {/* Squad Leader Card */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-4 shadow-sm">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Mission Leader
              </span>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border border-outline-var/30 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0">
                  {squad.leader?.avatar ? (
                    <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User size={20} className="text-[#656d84]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-text-primary truncate">{squad.leader?.name}</h3>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {squad.leader?.headline || squad.leader?.college || 'Squad Leader'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/profile/${squad.leader?.id}`)}
                className="w-full py-2 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1"
              >
                View Leader Profile <ExternalLink size={12} />
              </button>
            </div>

            {/* Squad Stats Card */}
            <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-3 shadow-sm">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Squad Status
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-outline-var/15">
                  <span className="text-text-muted">Members</span>
                  <span className="font-bold text-text-primary">{squad.currentMembers} / {squad.maxMembers}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-outline-var/15">
                  <span className="text-text-muted">Total Slots</span>
                  <span className="font-bold text-text-primary">{(squad.slots || []).length} Roles</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-outline-var/15">
                  <span className="text-text-muted">Applications</span>
                  <span className="font-bold text-text-primary">{(squad.applications || []).length} Received</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Apply Modal ─────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-var/30 rounded-md max-w-md w-full p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 text-outline hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div>
              <p className="font-syne text-[10px] font-bold tracking-wider uppercase text-primary">Gatekeeper Check</p>
              <h3 className="text-lg font-bold font-syne text-text-primary">Apply for Squad Role</h3>
            </div>

            {/* Gatekeeper qualification preview */}
            {qualification && (
              <div
                className={`p-3 rounded-xs text-xs border ${
                  qualification.qualifies
                    ? 'bg-secondary-bright/10 border-secondary-bright/30 text-secondary-bright'
                    : 'bg-error/10 border-error/30 text-error'
                }`}
              >
                {qualification.qualifies ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={14} /> You qualify for this squad!
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle size={14} /> {qualification.reason || 'Qualification check failed'}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                Pitch / Application Note (Optional)
              </label>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={3}
                placeholder="Tell the leader why you're a great fit for this role..."
                className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2.5 text-xs text-text-primary outline-none focus:border-primary/60 resize-none font-outfit"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2 border border-outline-var/30 text-text-muted font-syne font-bold text-xs uppercase tracking-wider rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Send Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Squad Modal (Leader Only) ───────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-var/30 rounded-md max-w-md w-full p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-outline hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div>
              <p className="font-syne text-[10px] font-bold tracking-wider uppercase text-primary">Squad Settings</p>
              <h3 className="text-lg font-bold font-syne text-text-primary">Edit Squad Info</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                  Title
                </label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60"
                />
              </div>

              <div>
                <label className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 resize-none"
                />
              </div>

              <div>
                <label className="block font-syne text-[10px] font-bold uppercase tracking-wider text-outline mb-1">
                  Event Category
                </label>
                <select
                  value={editForm.event}
                  onChange={(e) => setEditForm((f) => ({ ...f, event: e.target.value }))}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="HACKATHON">Hackathon</option>
                  <option value="OPEN_SOURCE">Open Source</option>
                  <option value="STARTUP">Startup</option>
                  <option value="RESEARCH">Research</option>
                  <option value="PORTFOLIO">Portfolio</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 border border-outline-var/30 text-text-muted font-syne font-bold text-xs uppercase tracking-wider rounded-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
