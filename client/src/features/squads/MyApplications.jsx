import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Shield, CheckCircle, XCircle,
  Clock, Target, ChevronRight, RefreshCw
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';

const STATUS_CONFIG = {
  PENDING:  { label: 'PENDING',  icon: Clock,       bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  ACCEPTED: { label: 'ACCEPTED', icon: CheckCircle, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  REJECTED: { label: 'REJECTED', icon: XCircle,     bg: 'bg-error/10', border: 'border-error/20', text: 'text-error' },
};

export default function MyApplications() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [data, setData] = useState({ led: [], applications: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');

  // eslint-disable-next-line
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await SquadAPI.getMySquads();
    if (!res.error) setData(res);
    setLoading(false);
  };

  const handleLogout = () => {
    API.post('/auth/logout').catch(() => {});
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/');
  };

  const tabs = [
    { id: 'applications', label: 'My Applications', count: data.applications?.length || 0 },
    { id: 'led', label: 'Teams I Lead', count: data.led?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={handleLogout} />

      <div className="flex-grow md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto p-6 md:p-10 w-full max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 border-b border-outline-var/25 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/nexus')} className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/45 text-text-muted hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-text-primary tracking-tight leading-tight flex items-center gap-2">
                <Shield className="text-primary" size={24} /> Mission Log
              </h1>
              <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-text-muted mt-1">Your Squads & Applications</p>
            </div>
          </div>
          <button onClick={loadData} className="self-end md:self-auto p-2.5 border border-outline-var/40 rounded-xs hover:border-primary/45 text-text-muted hover:text-primary transition-all flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="font-syne text-[10px] font-bold uppercase tracking-widest">Refresh</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-outline-var/20">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-bold font-syne text-xs uppercase tracking-wider transition-all border-b-2 -mb-[2px] ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-outline-var/50'
              }`}
            >
              <span className="mr-2">{tab.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xs ${activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-surface-mid text-text-muted'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-primary mb-4"><Shield size={36} /></div>
            <p className="text-text-muted font-syne text-[10px] uppercase tracking-[0.12em] animate-pulse">Loading logs...</p>
          </div>
        ) : activeTab === 'applications' ? (
          <ApplicationsList applications={data.applications || []} navigate={navigate} />
        ) : (
          <LedSquadsList squads={data.led || []} navigate={navigate} />
        )}
      </div>
    </div>
  );
}

function ApplicationsList({ applications, navigate }) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-outline-var/30 rounded-md">
        <Target size={40} className="mx-auto text-outline mb-4" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No applications found</h3>
        <p className="text-text-muted text-xs mt-1">Browse the N.E.X.U.S. feed to find squads matching your skills.</p>
        <button onClick={() => navigate('/nexus')} className="mt-6 px-6 py-2.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-[0.1em] rounded-xs hover:opacity-90 transition-all">
          Browse Missions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map(app => {
        const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
          <div
            key={app.id}
            onClick={() => navigate(`/squad/${app.squadId}`)}
            className="bg-surface border border-outline-var/30 p-5 rounded-xs cursor-pointer hover:border-primary/30 hover:bg-surface-mid transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                    {app.squad?.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs border flex items-center gap-1 ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                    <Icon size={10} />
                    <span>{cfg.label}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  {app.slot && (
                    <span className="text-primary-dim font-medium">
                      Role: {app.slot.roleTitle}
                    </span>
                  )}
                  {app.matchScore != null && (
                    <span className="text-secondary font-semibold">Match Score: {app.matchScore}%</span>
                  )}
                  {app.squad?.event && (
                    <span className="bg-surface-mid border border-outline-var/40 px-1.5 py-0.5 text-[10px] font-syne font-bold uppercase tracking-wider text-text-muted rounded-xs">
                      {app.squad.event}
                    </span>
                  )}
                  <span className="text-[#888]">
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LedSquadsList({ squads, navigate }) {
  if (squads.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-outline-var/30 rounded-md">
        <Users size={40} className="mx-auto text-outline mb-4" />
        <h3 className="text-base text-text-primary font-bold tracking-tight">No squads created</h3>
        <p className="text-text-muted text-xs mt-1">Be the catalyst. Create your team and match with optimal candidates.</p>
        <button onClick={() => navigate('/nexus')} className="mt-6 px-6 py-2.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-[0.1em] rounded-xs hover:opacity-90 transition-all">
          Create a Squad
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {squads.map(squad => {
        const pendingCount = squad._count?.applications || 0;
        return (
          <div
            key={squad.id}
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="bg-surface border border-outline-var/30 hover:border-primary/30 p-5 rounded-xs cursor-pointer hover:bg-surface-mid transition-all group"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                    {squad.title}
                  </h3>
                  <span className={`px-2.5 py-0.5 text-[9px] font-syne font-bold uppercase tracking-wider rounded-xs border ${
                    squad.status === 'OPEN' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : squad.status === 'FULL' ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-surface-mid border-outline-var/30 text-text-muted'
                  }`}>
                    {squad.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-outline" />
                    <span>{squad.currentMembers}/{squad.maxMembers} members</span>
                  </span>
                  {pendingCount > 0 && (
                    <span className="text-primary font-bold animate-pulse bg-primary/10 px-1.5 py-0.5 rounded-xs border border-primary/25 text-[10px] font-syne uppercase tracking-wider">
                      {pendingCount} Pending Review
                    </span>
                  )}
                  {squad.event && (
                    <span className="bg-surface-mid border border-outline-var/40 px-1.5 py-0.5 text-[10px] font-syne font-bold uppercase tracking-wider text-text-muted rounded-xs">
                      {squad.event}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-outline group-hover:text-primary transition-colors shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
