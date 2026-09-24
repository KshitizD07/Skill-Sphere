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
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-4 border-b-2 border-secondary">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/nexus')}
              className="p-1.5 border border-outline-var/40 hover:border-primary/50 rounded-xs text-outline hover:text-primary transition-colors cursor-pointer"
              title="Back to Mission Board"
            >
              <ArrowLeft size={14} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-outline/60">
                  Squad Intelligence · Activity Ledger
                </span>
              </div>
              <h1 className="text-2xl font-bold font-syne text-text-primary tracking-tight">
                Team Applications & Activity
              </h1>
              <p className="text-xs text-text-muted mt-0.5 font-outfit">
                Track your active team applications, squad recruitments, and project collaborations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 bg-surface hover:bg-surface-mid border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/nexus')}
              className="px-3.5 py-1.5 bg-primary text-on-primary hover:bg-primary-dim font-mono text-[11px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
            >
              Mission Feed
            </button>
          </div>
        </div>

        {/* ── Summary Metrics Bar (Flush Architectural Ledger) ───────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-y-2 border-secondary divide-y sm:divide-y-0 sm:divide-x divide-outline-var/25 py-3">
          <div
            onClick={() => setActiveTab('led')}
            className={`p-3 cursor-pointer transition-colors hover:bg-primary/[0.02] ${
              activeTab === 'led' ? 'bg-primary/[0.04]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline/60">
                01 · Teams I Lead
              </span>
              <Users size={14} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-bold font-syne text-text-primary tabular-nums">
                {data.led?.length || 0}
              </span>
              {pendingLedCount > 0 && (
                <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded-xs border border-primary/25">
                  {pendingLedCount} Pending Review
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('applications')}
            className={`p-3 cursor-pointer transition-colors hover:bg-primary/[0.02] ${
              activeTab === 'applications' ? 'bg-primary/[0.04]' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline/60">
                02 · Applications Submitted
              </span>
              <Target size={14} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl sm:text-3xl font-bold font-syne text-text-primary tabular-nums">
                {data.applications?.length || 0}
              </span>
            </div>
          </div>

          <div className="p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline/60">
                03 · Accepted Roles
              </span>
              <CheckCircle size={14} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2.5 mt-1.5">
              <span className="text-2xl sm:text-3xl font-bold font-syne text-text-primary tabular-nums">
                {acceptedCount}
              </span>
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">
                Active Deployments
              </span>
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ───────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-outline-var/25 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-outline-var/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs tabular-nums ${
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
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-xs p-6">
        <Target size={32} className="mx-auto text-outline-var mb-3 opacity-40" />
        <h3 className="text-base text-text-primary font-bold tracking-tight font-syne">No Active Applications</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto font-outfit">
          Explore the Mission Board to find squad openings matching your skills and interests.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-4 px-4 py-2 bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs hover:bg-primary-dim transition-colors cursor-pointer"
        >
          Browse Mission Board
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-var/20">
      {applications.map((app) => {
        const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        const isWithdrawing = actionLoading === app.id;

        return (
          <div
            key={app.id}
            onClick={() => navigate(`/squad/${app.squadId}`)}
            className="py-3.5 px-1 cursor-pointer hover:bg-primary/[0.03] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate font-outfit">
                  {app.squad?.title || 'Squad Mission'}
                </h3>
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider rounded-xs border flex items-center gap-1 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                >
                  <Icon size={10} />
                  <span>{cfg.label}</span>
                </span>
                {app.squad?.event && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-outline/60 border border-outline-var/20 px-1 py-0.2 rounded-xs">
                    {app.squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-outfit">
                {app.slot && (
                  <span className="text-primary font-medium text-xs">
                    Target Role: {app.slot.roleTitle}
                  </span>
                )}
                {app.matchScore != null && (
                  <span className="font-mono text-[10px] text-accent uppercase tracking-wider">
                    Fit: {app.matchScore * 10}%
                  </span>
                )}
                <span className="font-mono text-[10px] text-outline/60">
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
                  className="px-2.5 py-1 border border-error/30 text-error hover:bg-error/10 font-mono text-[10px] uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  title="Withdraw and delete this application"
                >
                  <Trash2 size={11} />
                  <span>{isWithdrawing ? 'Removing...' : 'Withdraw'}</span>
                </button>
              )}
              <div className="p-1 text-outline group-hover:text-primary transition-colors">
                <ChevronRight size={15} />
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
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-xs p-6">
        <Users size={32} className="mx-auto text-outline-var mb-3 opacity-40" />
        <h3 className="text-base text-text-primary font-bold tracking-tight font-syne">No Led Squads</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto font-outfit">
          Take the lead. Assemble a high-performing squad to build impactful projects.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-4 px-4 py-2 bg-primary text-on-primary font-mono text-[11px] uppercase tracking-wider rounded-xs hover:bg-primary-dim transition-colors cursor-pointer"
        >
          Create Squad
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-outline-var/20">
      {squads.map((squad) => {
        const pendingCount = Array.isArray(squad.applications)
          ? squad.applications.filter((a) => a.status === 'PENDING').length
          : 0;
        const isDeleting = actionLoading === squad.id;

        return (
          <div
            key={squad.id}
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="py-3.5 px-1 cursor-pointer hover:bg-primary/[0.03] transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-primary transition-colors truncate font-outfit">
                  {squad.title}
                </h3>
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider rounded-xs border ${
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
                  <span className="font-mono text-[9px] uppercase tracking-wider text-outline/60 border border-outline-var/20 px-1 py-0.2 rounded-xs">
                    {squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted font-outfit">
                <span className="flex items-center gap-1 font-mono text-[10px] text-text-primary tabular-nums">
                  <Users size={11} className="text-primary" />
                  <span>
                    {squad.currentMembers}/{squad.maxMembers}
                  </span>
                </span>
                {pendingCount > 0 && (
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded-xs border border-primary/25">
                    {pendingCount} Pending Review
                  </span>
                )}
                <span className="font-mono text-[10px] text-outline/60">
                  {(squad.slots || []).length} Defined Roles
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/squad/${squad.id}`);
                }}
                className="px-2.5 py-1 bg-surface hover:bg-surface-mid border border-outline-var/40 text-text-muted hover:text-text-primary font-mono text-[10px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
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
                className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/25 font-mono text-[10px] uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
                title="Manage Candidates"
              >
                Manage
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => onDelete(e, squad.id)}
                className="p-1 border border-error/30 text-error hover:bg-error/10 rounded-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Close Squad"
              >
                <Trash2 size={12} />
              </button>

              <div className="p-1 text-outline group-hover:text-primary transition-colors">
                <ChevronRight size={15} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
