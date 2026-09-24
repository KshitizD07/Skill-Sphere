import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Shield, CheckCircle, XCircle,
  Clock, Target, ChevronRight, RefreshCw, Trash2
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  icon: Clock,       bg: 'bg-primary/10', border: 'border-primary/25', text: 'text-primary' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle, bg: 'bg-accent/10', border: 'border-accent/25', text: 'text-accent' },
  REJECTED: { label: 'Rejected', icon: XCircle,     bg: 'bg-error/10', border: 'border-error/25', text: 'text-error' },
};

export default function MyApplications() {
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [data, setData] = useState({ led: [], applications: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await SquadAPI.getMySquads();
      if (res && !res.error) {
        setData({
          led: res.led || [],
          applications: res.applications || [],
        });
      }
    } catch {
      toast.error('Failed to load squad logs.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = () => {
    API.post('/auth/logout').catch(() => {});
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/');
  };

  const handleWithdrawApplication = async (e, applicationId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to withdraw and remove this application?')) return;
    setActionLoading(applicationId);
    try {
      await SquadAPI.withdrawApplication(applicationId);
      toast.success('Application removed.');
      setData((prev) => ({
        ...prev,
        applications: prev.applications.filter((a) => a.id !== applicationId),
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to withdraw application.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSquad = async (e, squadId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to close and delete this squad? All pending applications will be dismissed.')) return;
    setActionLoading(squadId);
    try {
      await SquadAPI.deleteSquad(squadId);
      toast.success('Squad closed successfully.');
      setData((prev) => ({
        ...prev,
        led: prev.led.filter((s) => s.id !== squadId),
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to close squad.');
    } finally {
      setActionLoading(null);
    }
  };

  const acceptedCount = (data.applications || []).filter((a) => a.status === 'ACCEPTED').length;
  const pendingLedCount = (data.led || []).reduce(
    (acc, s) => acc + (Array.isArray(s.applications) ? s.applications.filter((a) => a.status === 'PENDING').length : 0),
    0
  );

  const tabs = [
    { id: 'applications', label: 'My Applications', count: data.applications?.length || 0 },
    { id: 'led', label: 'Teams I Lead', count: data.led?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={handleLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-grow md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-var/20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/nexus')}
              className="p-2 border border-outline-var/30 hover:border-primary/40 rounded-lg text-outline hover:text-primary transition-all"
              title="Back to Mission Board"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-syne text-text-primary tracking-tight">
                Team Applications & Activity
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                Track your active team applications, squad recruitments, and project collaborations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-outfit font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/nexus')}
              className="px-4 py-2 bg-primary text-on-primary hover:bg-primary-dim font-outfit font-semibold text-xs rounded-lg transition-colors"
            >
              Mission Feed
            </button>
          </div>
        </div>

        {/* ── Summary Metrics Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab('led')}
            className={`p-5 rounded-xl border transition-all cursor-pointer shadow-sm ${
              activeTab === 'led'
                ? 'bg-surface-mid border-primary/50'
                : 'bg-surface border-outline-var/25 hover:border-outline-var/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-outfit font-semibold uppercase tracking-wider text-text-muted">
                Teams I Lead
              </span>
              <Users size={16} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold font-syne text-text-primary">
                {data.led?.length || 0}
              </span>
              {pendingLedCount > 0 && (
                <span className="text-xs font-outfit font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/25">
                  {pendingLedCount} Pending Review
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('applications')}
            className={`p-5 rounded-xl border transition-all cursor-pointer shadow-sm ${
              activeTab === 'applications'
                ? 'bg-surface-mid border-primary/50'
                : 'bg-surface border-outline-var/25 hover:border-outline-var/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-outfit font-semibold uppercase tracking-wider text-text-muted">
                Applications Submitted
              </span>
              <Target size={16} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold font-syne text-text-primary">
                {data.applications?.length || 0}
              </span>
            </div>
          </div>

          <div className="p-5 rounded-xl border bg-surface border-outline-var/25 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-outfit font-semibold uppercase tracking-wider text-text-muted">
                Accepted Roles
              </span>
              <CheckCircle size={16} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold font-syne text-text-primary">
                {acceptedCount}
              </span>
              <span className="text-xs text-text-muted font-outfit">
                active deployments
              </span>
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ───────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-outline-var/20 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-outfit font-semibold text-xs uppercase tracking-wider transition-all border-b-2 shrink-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-outline-var/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                  activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-surface-mid text-text-muted'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-primary mb-3">
              <Shield size={32} />
            </div>
            <p className="text-text-muted font-syne text-xs uppercase tracking-wider">
              Loading mission records...
            </p>
          </div>
        ) : activeTab === 'applications' ? (
          <ApplicationsList
            applications={data.applications || []}
            navigate={navigate}
            onWithdraw={handleWithdrawApplication}
            actionLoading={actionLoading}
          />
        ) : (
          <LedSquadsList
            squads={data.led || []}
            navigate={navigate}
            onDelete={handleDeleteSquad}
            actionLoading={actionLoading}
          />
        )}
      </div>
    </div>
  );
}

function ApplicationsList({ applications, navigate, onWithdraw, actionLoading }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-xl p-6">
        <Target size={38} className="mx-auto text-outline-var mb-3 opacity-60" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No Active Applications</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
          Explore the Mission Board to find squad openings matching your skills and interests.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-5 px-5 py-2.5 bg-primary text-on-primary font-outfit font-semibold text-xs rounded-lg hover:bg-primary-dim transition-colors"
        >
          Browse Mission Board
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {applications.map((app) => {
        const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        const isWithdrawing = actionLoading === app.id;

        return (
          <div
            key={app.id}
            onClick={() => navigate(`/squad/${app.squadId}`)}
            className="bg-surface border border-outline-var/25 hover:border-primary/40 p-5 rounded-xl cursor-pointer hover:bg-surface-mid transition-all group relative shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                  {app.squad?.title || 'Squad Mission'}
                </h3>
                <span
                  className={`px-2.5 py-0.5 text-xs font-outfit font-medium rounded-md border flex items-center gap-1.5 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                >
                  <Icon size={12} />
                  <span>{cfg.label}</span>
                </span>
                {app.squad?.event && (
                  <span className="bg-surface-mid border border-outline-var/25 px-2 py-0.5 text-xs font-outfit font-medium text-text-muted rounded-md">
                    {app.squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                {app.slot && (
                  <span className="text-primary font-medium">
                    Target Role: {app.slot.roleTitle}
                  </span>
                )}
                {app.matchScore != null && (
                  <span className="text-accent font-outfit font-medium text-xs">
                    Compatibility: {app.matchScore * 10}%
                  </span>
                )}
                <span className="text-text-muted">
                  Applied {new Date(app.appliedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {app.status !== 'ACCEPTED' && (
                <button
                  type="button"
                  disabled={isWithdrawing}
                  onClick={(e) => onWithdraw(e, app.id)}
                  className="px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-outfit font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  title="Withdraw and delete this application"
                >
                  <Trash2 size={13} />
                  <span>{isWithdrawing ? 'Removing...' : 'Withdraw'}</span>
                </button>
              )}
              <div className="p-1 text-outline group-hover:text-primary transition-colors">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LedSquadsList({ squads, navigate, onDelete, actionLoading }) {
  if (squads.length === 0) {
    return (
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-xl p-6">
        <Users size={38} className="mx-auto text-outline-var mb-3 opacity-60" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No Led Squads</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
          Take the lead. Assemble a high-performing squad to build impactful projects.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-5 px-5 py-2.5 bg-primary text-on-primary font-outfit font-semibold text-xs rounded-lg hover:bg-primary-dim transition-colors"
        >
          Create a Squad
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {squads.map((squad) => {
        const pendingCount = Array.isArray(squad.applications)
          ? squad.applications.filter((a) => a.status === 'PENDING').length
          : 0;
        const isDeleting = actionLoading === squad.id;

        return (
          <div
            key={squad.id}
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="bg-surface border border-outline-var/25 hover:border-primary/40 p-5 rounded-xl cursor-pointer hover:bg-surface-mid transition-all group relative shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                  {squad.title}
                </h3>
                <span
                  className={`px-2.5 py-0.5 text-xs font-outfit font-medium rounded-md border ${
                    squad.status === 'OPEN'
                      ? 'bg-accent/10 border-accent/25 text-accent'
                      : squad.status === 'FULL'
                      ? 'bg-primary/10 border-primary/25 text-primary'
                      : 'bg-surface-mid border-outline-var/25 text-text-muted'
                  }`}
                >
                  {squad.status}
                </span>
                {squad.event && (
                  <span className="bg-surface-mid border border-outline-var/25 px-2 py-0.5 text-xs font-outfit font-medium text-text-muted rounded-md">
                    {squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                <span className="flex items-center gap-1.5 font-medium text-text-primary">
                  <Users size={14} className="text-primary" />
                  <span>
                    {squad.currentMembers}/{squad.maxMembers} members
                  </span>
                </span>
                {pendingCount > 0 && (
                  <span className="text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-md border border-primary/25 text-xs font-outfit">
                    {pendingCount} Pending Review
                  </span>
                )}
                <span>
                  {(squad.slots || []).length} Defined Roles
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/squad/${squad.id}`);
                }}
                className="px-3 py-1.5 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-outfit font-semibold text-xs rounded-lg transition-colors"
                title="View Squad Briefing"
              >
                Briefing
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/squad/${squad.id}/manage`);
                }}
                className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/25 font-outfit font-semibold text-xs rounded-lg transition-colors"
                title="Manage Candidates"
              >
                Manage
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => onDelete(e, squad.id)}
                className="p-2 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-lg transition-colors disabled:opacity-50"
                title="Close Squad"
              >
                <Trash2 size={14} />
              </button>

              <div className="p-1 text-outline group-hover:text-primary transition-colors">
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
