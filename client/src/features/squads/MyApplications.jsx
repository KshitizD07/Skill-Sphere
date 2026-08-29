import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Shield, CheckCircle, XCircle,
  Clock, Target, ChevronRight, RefreshCw, Trash2,
  Sparkles
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

const STATUS_CONFIG = {
  PENDING:  { label: 'PENDING',  icon: Clock,       bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  ACCEPTED: { label: 'ACCEPTED', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  REJECTED: { label: 'REJECTED', icon: XCircle,     bg: 'bg-error/10', border: 'border-error/20', text: 'text-error' },
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
  const pendingLedCount = (data.led || []).reduce((acc, s) => acc + (s._count?.applications || 0), 0);

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
              className="p-2 border border-outline-var/30 hover:border-primary/40 rounded-xs text-outline hover:text-primary transition-all"
              title="Back to Mission Board"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="text-primary" size={22} />
                <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                  Team Applications & Activity
                </h1>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Track your active team applications, squad recruitments, and project collaborations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/nexus')}
              className="px-4 py-2 bg-primary text-on-primary hover:bg-secondary-bright font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              <Sparkles size={13} /> Mission Feed
            </button>
          </div>
        </div>

        {/* ── Summary Metrics Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div
            onClick={() => setActiveTab('led')}
            className={`p-4 rounded-md border transition-all cursor-pointer ${
              activeTab === 'led'
                ? 'bg-surface-mid border-primary/50 shadow-md'
                : 'bg-surface border-outline-var/20 hover:border-outline-var/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Teams I Lead
              </span>
              <Users size={16} className="text-primary" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold font-syne text-text-primary">
                {data.led?.length || 0}
              </span>
              {pendingLedCount > 0 && (
                <span className="text-[10px] text-primary font-syne font-bold bg-primary/10 px-1.5 py-0.5 rounded-xs border border-primary/25 animate-pulse">
                  {pendingLedCount} Pending Review
                </span>
              )}
            </div>
          </div>

          <div
            onClick={() => setActiveTab('applications')}
            className={`p-4 rounded-md border transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-surface-mid border-primary/50 shadow-md'
                : 'bg-surface border-outline-var/20 hover:border-outline-var/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Applications Submitted
              </span>
              <Target size={16} className="text-accent" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold font-syne text-text-primary">
                {data.applications?.length || 0}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-md border bg-surface border-outline-var/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Accepted Roles
              </span>
              <CheckCircle size={16} className="text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold font-syne text-text-primary">
                {acceptedCount}
              </span>
              <span className="text-[10px] text-text-muted font-syne">
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
              className={`px-4 py-2.5 font-syne font-bold text-xs uppercase tracking-wider transition-all border-b-2 shrink-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5 rounded-t-xs'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-outline-var/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${
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
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-md p-6">
        <Target size={38} className="mx-auto text-outline-var mb-3 opacity-60" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No Active Applications</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
          Explore the Mission Board to find squad openings matching your skills and interests.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-5 px-5 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
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
            className="bg-surface border border-outline-var/25 hover:border-primary/40 p-4 md:p-5 rounded-md cursor-pointer hover:bg-surface-mid transition-all group relative shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                  {app.squad?.title || 'Squad Mission'}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs border flex items-center gap-1 ${cfg.bg} ${cfg.border} ${cfg.text}`}
                >
                  <Icon size={10} />
                  <span>{cfg.label}</span>
                </span>
                {app.squad?.event && (
                  <span className="bg-surface-mid border border-outline-var/30 px-1.5 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider text-text-muted rounded-xs">
                    {app.squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                {app.slot && (
                  <span className="text-primary font-semibold">
                    Target Role: {app.slot.roleTitle}
                  </span>
                )}
                {app.matchScore != null && (
                  <span className="text-accent font-syne font-bold text-[11px]">
                    Compatibility: {app.matchScore * 10}%
                  </span>
                )}
                <span className="text-outline">
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
                  className="px-3 py-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error font-syne font-bold text-[10px] uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Withdraw and delete this application"
                >
                  <Trash2 size={12} />
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
      <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-md p-6">
        <Users size={38} className="mx-auto text-outline-var mb-3 opacity-60" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No Led Squads</h3>
        <p className="text-text-muted text-xs mt-1 max-w-sm mx-auto">
          Take the lead. Assemble a high-performing squad to build impactful projects.
        </p>
        <button
          onClick={() => navigate('/nexus')}
          className="mt-5 px-5 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
        >
          Create a Squad
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {squads.map((squad) => {
        const pendingCount = squad._count?.applications || 0;
        const isDeleting = actionLoading === squad.id;

        return (
          <div
            key={squad.id}
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="bg-surface border border-outline-var/25 hover:border-primary/40 p-4 md:p-5 rounded-md cursor-pointer hover:bg-surface-mid transition-all group relative shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                  {squad.title}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs border ${
                    squad.status === 'OPEN'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : squad.status === 'FULL'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-surface-mid border-outline-var/30 text-text-muted'
                  }`}
                >
                  {squad.status}
                </span>
                {squad.event && (
                  <span className="bg-surface-mid border border-outline-var/30 px-1.5 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider text-text-muted rounded-xs">
                    {squad.event}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                <span className="flex items-center gap-1 font-medium text-text-primary">
                  <Users size={12} className="text-primary" />
                  <span>
                    {squad.currentMembers}/{squad.maxMembers} members
                  </span>
                </span>
                {pendingCount > 0 && (
                  <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-xs border border-primary/25 text-[10px] font-syne uppercase tracking-wider animate-pulse">
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
                className="px-3 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-[10px] uppercase tracking-wider rounded-xs transition-colors"
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
                className="px-3 py-1.5 bg-primary/15 hover:bg-primary text-primary hover:text-on-primary font-syne font-bold text-[10px] uppercase tracking-wider rounded-xs transition-all"
                title="Manage Candidates"
              >
                Manage
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => onDelete(e, squad.id)}
                className="p-1.5 bg-error/10 hover:bg-error/20 border border-error/30 text-error rounded-xs transition-colors disabled:opacity-50"
                title="Close Squad"
              >
                <Trash2 size={13} />
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
