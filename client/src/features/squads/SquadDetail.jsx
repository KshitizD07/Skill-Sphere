import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, CheckCircle2,
  AlertCircle, Target, User, Shield,
  Edit, Trash2, LogOut, X, ExternalLink,
  Plus, Pencil, ChevronDown, ChevronUp, MessageCircle, UserCheck,
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

export default function SquadDetail({ user: propUser, onLogout }) {
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
  const [qualification, setQualification] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', event: '' });

  // Slot Management State
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotEditMode, setSlotEditMode] = useState(false);
  const [slotForm, setSlotForm] = useState({ id: null, roleTitle: '', roleDescription: '', requiredSkill: '', minScore: 5, requireVerified: false });
  const [slotSubmitting, setSlotSubmitting] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);


  const loadSquad = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SquadAPI.getSquad(id);
      if (data && !data.error) {
        setSquad(data);
        setEditForm({
          title: data.title || '',
          description: data.description || '',
          event: data.event || 'HACKATHON',
        });
        if (currentUser?.id) {
          const qual = await SquadAPI.checkQualification(id, currentUser.id);
          if (qual && !qual.error) {
            setQualification(qual);
          } else {
            setQualification(null);
          }
        }
      } else {
        setSquad(null);
        toast.error(data?.message || 'Failed to load squad details.');
      }
    } catch {
      toast.error('Failed to load squad details.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadSquad();
  }, [id, loadSquad]);

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
    } catch {
      toast.error('Failed to close squad.');
    }
  };

  const handleSaveEdit = async () => {
    try {
      await SquadAPI.editSquad(id, editForm);
      toast.success('Squad updated successfully.');
      setShowEditModal(false);
      loadSquad();
    } catch {
      toast.error('Failed to update squad.');
    }
  };

  const handleOpenAddSlot = () => {
    setSlotEditMode(false);
    setSlotForm({ id: null, roleTitle: '', roleDescription: '', requiredSkill: '', minScore: 5, requireVerified: false });
    setShowSlotModal(true);
  };

  const handleOpenEditSlot = (slot) => {
    setSlotEditMode(true);
    setSlotForm({
      id: slot.id,
      roleTitle: slot.roleTitle || '',
      roleDescription: slot.roleDescription || '',
      requiredSkill: slot.requiredSkill || '',
      minScore: slot.minScore ?? 5,
      requireVerified: !!slot.requireVerified,
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async () => {
    if (!slotForm.roleTitle.trim()) {
      return toast.error('Role Title is required.');
    }
    setSlotSubmitting(true);
    try {
      if (slotEditMode) {
        await SquadAPI.editSlot(id, slotForm.id, slotForm);
        toast.success('Role slot updated successfully!');
      } else {
        await SquadAPI.addSlot(id, slotForm);
        toast.success('Role slot added successfully!');
      }
      setShowSlotModal(false);
      loadSquad();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to save role slot.');
    } finally {
      setSlotSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to remove this role slot? Any pending applications for this slot will be dismissed.')) return;
    try {
      await SquadAPI.deleteSlot(id, slotId);
      toast.success('Role slot deleted.');
      loadSquad();
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to delete role slot.');
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
          <p className="text-xs text-text-muted mt-2">The squad you are looking for could not be loaded or has been closed.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={loadSquad}
              className="px-5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/40 text-text-primary font-bold text-xs uppercase tracking-wider rounded-xs transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/nexus')}
              className="px-5 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-bold text-xs uppercase tracking-wider rounded-xs transition-all"
            >
              Back to Mission Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLeader = squad.leader?.id === currentUser?.id;
  const isFull = squad.currentMembers >= squad.maxMembers;

  // All of the current user's applications for this squad
  const userApps = (squad.applications || []).filter((a) => a.userId === currentUser?.id);
  const userAcceptedApp = userApps.find((a) => a.status === 'ACCEPTED');

  // Per-slot lookup: slotId → application (for this user)
  const userAppBySlot = {};
  for (const app of userApps) {
    if (app.slotId) userAppBySlot[app.slotId] = app;
  }

  // True if user has any PENDING application in this squad (blocks applying to other slots)
  const hasPendingApp = userApps.some((a) => a.status === 'PENDING');

  // Accepted members list — everyone with ACCEPTED status (visible in members dropdown)
  const acceptedMembers = (squad.applications || [])
    .filter((a) => a.status === 'ACCEPTED')
    .map((a) => ({
      user: a.user,
      roleTitle: a.slot?.roleTitle || 'Member',
    }));


  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-start sm:items-center justify-between gap-3 pb-4 border-b border-outline-var/20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/nexus')}
              className="p-2 border border-outline-var/30 hover:border-primary/40 rounded-lg text-outline hover:text-primary transition-all shrink-0"
              title="Back to Mission Board"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <span className="font-outfit text-xs font-semibold text-text-muted">
                Mission Profile
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-syne text-text-primary tracking-tight truncate">
                Squad Briefing
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isLeader ? (
              <>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-primary font-outfit font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Edit Squad"
                >
                  <Edit size={13} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => navigate(`/squad/${squad.id}/manage`)}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-dim text-on-primary font-outfit font-semibold text-xs rounded-lg transition-all"
                >
                  <span className="hidden sm:inline">Manage Applications</span>
                  <span className="sm:hidden">Applications</span>
                </button>
                <button
                  onClick={handleCloseSquad}
                  className="p-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-lg transition-colors"
                  title="Close Squad"
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : userAcceptedApp ? (
              <button
                onClick={handleLeaveSquad}
                className="px-3 py-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-outfit font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5"
              >
                <LogOut size={13} /> <span className="hidden sm:inline">Leave Squad</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Squad Overview */}
            <div className="space-y-4">
              <div className="border-t-2 border-secondary pt-3 pb-2">
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                      01 · Squad Briefing
                    </span>
                    {squad.event && (
                      <>
                        <span className="text-outline-var text-xs font-mono">/</span>
                        <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-primary">
                          {squad.event}
                        </span>
                      </>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] tracking-wider uppercase px-1.5 py-0.2 rounded-xs border ${
                      isFull
                        ? 'bg-surface-mid text-text-muted border-outline-var/30'
                        : 'bg-accent/10 text-accent border-accent/25'
                    }`}
                  >
                    {isFull ? 'FULL' : 'RECRUITING'}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight font-syne leading-snug">
                {squad.title}
              </h2>

              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap font-outfit border-b border-outline-var/20 pb-5">
                {squad.description}
              </p>
            </div>

            {/* Slots / Roles List */}
            <div className="space-y-4">
              <div className="border-t-2 border-secondary pt-3 pb-2 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                    02 · Role Architecture
                  </span>
                  <span className="font-mono text-[10px] text-outline/40">
                    ({(squad.slots || []).length} Slots)
                  </span>
                </div>

                {isLeader && (
                  <button
                    type="button"
                    onClick={handleOpenAddSlot}
                    className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/25 font-mono text-[10px] uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add Role Slot
                  </button>
                )}
              </div>

              <div className="divide-y divide-outline-var/20">
                {(squad.slots || []).length === 0 ? (
                  <p className="text-text-muted text-xs italic py-4 font-outfit">No role slots defined for this squad yet.</p>
                ) : (
                  (squad.slots || []).map((slot) => {
                    const isFilled = slot.status === 'FILLED';
                    const slotApp = userAppBySlot[slot.id];
                    const slotStatus = slotApp?.status || null;

                    // Applicant can apply if: no accepted membership, no pending app in squad, slot open, not already rejected/applied for this specific slot
                    const canApply =
                      !isLeader &&
                      !isFilled &&
                      !userAcceptedApp &&
                      !hasPendingApp &&
                      slotStatus !== 'REJECTED' &&
                      slotStatus !== 'ACCEPTED';

                    return (
                      <div
                        key={slot.id}
                        className={`py-3.5 px-1 transition-colors hover:bg-primary/[0.02] ${
                          isFilled ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h4 className="font-semibold text-sm text-text-primary font-outfit">{slot.roleTitle}</h4>
                              <span
                                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-xs border ${
                                  isFilled
                                    ? 'bg-surface-mid text-text-muted border-outline-var/20'
                                    : 'bg-accent/10 text-accent border-accent/20'
                                }`}
                              >
                                {isFilled ? 'FILLED' : 'OPEN'}
                              </span>
                            </div>

                            {slot.roleDescription && (
                              <p className="text-xs text-text-muted line-clamp-2 font-outfit">{slot.roleDescription}</p>
                            )}

                            <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-0.5">
                              {slot.requiredSkill && (
                                <span className="font-mono text-[10px] text-primary">
                                  Skill Req: {slot.requiredSkill} (≥ {slot.minScore}/10)
                                </span>
                              )}
                              {slot.requireVerified && (
                                <span className="font-mono text-[9px] uppercase tracking-wider text-accent border border-accent/20 px-1 rounded-xs">
                                  Verified Certificate Required
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Per-slot CTA */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isLeader ? (
                              <div className="flex items-center gap-1">
                                {!isFilled && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditSlot(slot)}
                                    className="p-1 border border-outline-var/30 text-text-muted hover:text-primary rounded-xs transition-colors"
                                    title="Edit Role Slot"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                                {!isFilled && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    className="p-1 border border-error/30 text-error hover:bg-error/10 rounded-xs transition-colors"
                                    title="Delete Role Slot"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                                {isFilled && (
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Filled</span>
                                )}
                              </div>
                            ) : isFilled ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Filled</span>
                            ) : slotStatus === 'ACCEPTED' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-accent/10 border border-accent/25 text-accent rounded-xs flex items-center gap-1">
                                <CheckCircle2 size={11} /> Member
                              </span>
                            ) : slotStatus === 'PENDING' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-primary/10 border border-primary/25 text-primary rounded-xs">
                                Applied
                              </span>
                            ) : slotStatus === 'REJECTED' ? (
                              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-error/10 border border-error/25 text-error rounded-xs">
                                Rejected
                              </span>
                            ) : canApply ? (
                              <button
                                onClick={() => {
                                  setSelectedSlot(slot.id);
                                  setShowApplyModal(true);
                                }}
                                className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-dim font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors whitespace-nowrap cursor-pointer"
                              >
                                Apply
                              </button>
                            ) : hasPendingApp && !slotApp ? (
                              <span className="font-mono text-[10px] text-text-muted italic">Pending</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Sidebar (Right 1 col) — stacks below main content on mobile */}
          <div className="space-y-6">
            {/* Squad Leader Section */}
            <div className="space-y-3">
              <div className="border-t-2 border-secondary pt-3 pb-1">
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                  03 · Mission Leader
                </span>
              </div>

              <div className="flex items-center gap-3 py-2 border-b border-outline-var/20">
                <div className="w-9 h-9 rounded-xs border border-outline-var/30 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0 font-mono text-xs font-semibold text-primary">
                  {squad.leader?.avatar ? (
                    <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
                  ) : (
                    squad.leader?.name?.charAt(0) || 'L'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-text-primary truncate font-outfit">{squad.leader?.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted truncate mt-0.5">
                    {squad.leader?.headline || squad.leader?.college || 'Squad Leader'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/profile/${squad.leader?.id}`)}
                className="w-full py-2 bg-surface hover:bg-surface-mid border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                View Profile <ExternalLink size={11} />
              </button>
            </div>

            {/* Squad Stats + Members Dropdown */}
            <div className="space-y-3">
              <div className="border-t-2 border-secondary pt-3 pb-1">
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                  04 · Squad Status
                </span>
              </div>

              <div className="space-y-1 text-xs">
                {/* Members row — expands to show member list */}
                <button
                  type="button"
                  onClick={() => setMembersExpanded((v) => !v)}
                  className="w-full flex items-center justify-between py-2 border-b border-outline-var/20 hover:text-primary transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-text-muted font-mono text-[11px] uppercase tracking-wider">
                    <UserCheck size={13} />
                    <span>Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs tabular-nums text-text-primary font-bold">
                      {squad.currentMembers} / {squad.maxMembers}
                    </span>
                    {membersExpanded
                      ? <ChevronUp size={12} className="text-outline" />
                      : <ChevronDown size={12} className="text-outline" />
                    }
                  </div>
                </button>

                {/* Expanded member list */}
                {membersExpanded && (
                  <div className="pt-2 pb-1 space-y-1.5">
                    {/* Leader row */}
                    <div className="flex items-center justify-between gap-2 py-2 px-2 rounded-xs bg-surface-mid/50 border border-outline-var/15">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-xs border border-outline-var/30 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0 font-mono text-[10px] text-primary">
                          {squad.leader?.avatar
                            ? <img src={squad.leader.avatar} className="w-full h-full object-cover" alt="" />
                            : squad.leader?.name?.charAt(0) || 'L'
                          }
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/profile/${squad.leader?.id}`)}
                            className="text-xs font-medium text-text-primary hover:text-primary truncate block text-left font-outfit"
                            style={{ maxWidth: '110px' }}
                          >
                            {squad.leader?.name}
                          </button>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">Leader</span>
                        </div>
                      </div>
                      {currentUser?.id !== squad.leader?.id && (
                        <button
                          onClick={() => navigate('/chat', { state: { userId: squad.leader?.id } })}
                          className="p-1 text-outline hover:text-primary border border-outline-var/25 rounded-xs transition-colors shrink-0"
                          title="Chat with leader"
                        >
                          <MessageCircle size={12} />
                        </button>
                      )}
                    </div>

                    {/* Accepted members */}
                    {acceptedMembers.length === 0 ? (
                      <p className="text-xs text-text-muted italic px-1 py-1 font-outfit">No members selected yet.</p>
                    ) : (
                      acceptedMembers.map((m) => (
                        <div
                          key={m.user?.id}
                          className="flex items-center justify-between gap-2 py-2 px-2 rounded-xs bg-surface-mid/50 border border-outline-var/15"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-xs border border-outline-var/30 overflow-hidden bg-surface-mid flex items-center justify-center shrink-0 font-mono text-[10px] text-text-muted">
                              {m.user?.avatar
                                ? <img src={m.user.avatar} className="w-full h-full object-cover" alt="" />
                                : m.user?.name?.charAt(0) || 'U'
                              }
                            </div>
                            <div className="min-w-0">
                              <button
                                onClick={() => navigate(`/profile/${m.user?.id}`)}
                                className="text-xs font-medium text-text-primary hover:text-primary truncate block text-left font-outfit"
                                style={{ maxWidth: '110px' }}
                              >
                                {m.user?.name}
                              </button>
                              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted truncate block">{m.roleTitle}</span>
                            </div>
                          </div>
                          {isLeader && currentUser?.id !== m.user?.id && (
                            <button
                              onClick={() => navigate('/chat', { state: { userId: m.user?.id } })}
                              className="p-1.5 text-outline hover:text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                              title={`Chat with ${m.user?.name}`}
                            >
                              <MessageCircle size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-outline-var/15">
                  <span className="text-text-muted">Total Slots</span>
                  <span className="font-semibold text-text-primary">{(squad.slots || []).length} Roles</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-text-muted">Applications</span>
                  <span className="font-semibold text-text-primary">{(squad.applications || []).length} Received</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Apply Modal ─────────────────────────────────────────────────── */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-secondary/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-bg-base border border-outline-var/40 rounded-xs w-full max-w-md p-6 relative shadow-2xl space-y-4 font-outfit">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-text-primary font-mono text-xs"
            >
              ✕
            </button>

            <div className="border-b-2 border-secondary pb-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/60 mb-1">Qualification Gate</p>
              <h3 className="text-xl font-bold font-syne text-text-primary">Apply for Squad Role</h3>
            </div>

            {/* Gatekeeper qualification preview */}
            {qualification && (
              <div
                className={`p-3 rounded-xs text-xs border ${
                  qualification.qualifies
                    ? 'bg-accent/10 border-accent/25 text-accent'
                    : 'bg-error/10 border-error/25 text-error'
                }`}
              >
                {qualification.qualifies ? (
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
                    <CheckCircle2 size={13} /> You qualify for this position
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
                    <AlertCircle size={13} /> {qualification.reason || 'Qualification check failed'}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1.5">
                Application Statement (Optional)
              </label>
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                rows={3}
                placeholder="Detail your relevant experience and contributions for this role..."
                className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2.5 text-xs text-text-primary outline-none focus:border-primary/60 resize-none font-outfit"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2 border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={submitting}
                className="flex-1 py-2 bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs hover:bg-primary-dim transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Squad Modal (Leader Only) ───────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-secondary/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-bg-base border border-outline-var/40 rounded-xs w-full max-w-md p-6 relative shadow-2xl space-y-4 font-outfit">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-text-primary font-mono text-xs"
            >
              ✕
            </button>

            <div className="border-b-2 border-secondary pb-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/60 mb-1">Squad Configuration</p>
              <h3 className="text-xl font-bold font-syne text-text-primary">Edit Squad Parameters</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                  Title
                </label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 font-outfit"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 resize-none font-outfit"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                  Event Category
                </label>
                <select
                  value={editForm.event}
                  onChange={(e) => setEditForm((f) => ({ ...f, event: e.target.value }))}
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 cursor-pointer font-outfit"
                >
                  <option value="HACKATHON">Hackathon</option>
                  <option value="OPEN_SOURCE">Open Source</option>
                  <option value="STARTUP">Startup</option>
                  <option value="RESEARCH">Research</option>
                  <option value="PORTFOLIO">Portfolio</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs hover:bg-primary-dim transition-colors cursor-pointer"
              >
                Save Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Role Slot Modal (Leader Only) ────────────────────── */}
      {showSlotModal && (
        <div className="fixed inset-0 bg-secondary/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-bg-base border border-outline-var/40 rounded-xs w-full max-w-md p-6 relative shadow-2xl space-y-4 font-outfit">
            <button
              onClick={() => setShowSlotModal(false)}
              className="absolute top-5 right-5 text-text-muted hover:text-text-primary font-mono text-xs"
            >
              ✕
            </button>

            <div className="border-b-2 border-secondary pb-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-outline/60 mb-1">Slot Architect</p>
              <h3 className="text-xl font-bold font-syne text-text-primary">
                {slotEditMode ? 'Edit Role Slot' : 'Add New Role Slot'}
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                  Role Title *
                </label>
                <input
                  value={slotForm.roleTitle}
                  onChange={(e) => setSlotForm((f) => ({ ...f, roleTitle: e.target.value }))}
                  placeholder="e.g. Backend Lead, UI/UX Designer"
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 font-outfit"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                  Role Description (Optional)
                </label>
                <textarea
                  value={slotForm.roleDescription}
                  onChange={(e) => setSlotForm((f) => ({ ...f, roleDescription: e.target.value }))}
                  rows={2}
                  placeholder="Key responsibilities and expectations..."
                  className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 resize-none font-outfit"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                    Gatekeeper Skill
                  </label>
                  <input
                    value={slotForm.requiredSkill}
                    onChange={(e) => setSlotForm((f) => ({ ...f, requiredSkill: e.target.value }))}
                    placeholder="e.g. Python, React"
                    className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 font-outfit"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-outline/70 mb-1">
                    Min Score (0–10)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={slotForm.minScore}
                    onChange={(e) => setSlotForm((f) => ({ ...f, minScore: Number(e.target.value) }))}
                    className="w-full bg-surface-mid border border-outline-var/40 rounded-xs p-2 text-xs text-text-primary outline-none focus:border-primary/60 font-outfit"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-text-muted select-none font-outfit">
                  <input
                    type="checkbox"
                    checked={slotForm.requireVerified}
                    onChange={(e) => setSlotForm((f) => ({ ...f, requireVerified: e.target.checked }))}
                    className="accent-primary rounded-xs"
                  />
                  <span>Require verified skill certificate from applicants</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSlotModal(false)}
                className="flex-1 py-2 border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                disabled={slotSubmitting}
                className="flex-1 py-2 bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs hover:bg-primary-dim transition-colors disabled:opacity-50 cursor-pointer"
              >
                {slotSubmitting ? 'Saving...' : slotEditMode ? 'Update Slot' : 'Add Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
