import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Shield, CheckCircle, XCircle,
  Clock, Target, ChevronRight, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG = {
  PENDING:  { label: 'PENDING',  color: 'yellow', icon: Clock,       bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  ACCEPTED: { label: 'ACCEPTED', color: 'green',  icon: CheckCircle, bg: 'bg-green-900/20',  border: 'border-green-500/30',  text: 'text-green-400'  },
  REJECTED: { label: 'REJECTED', color: 'red',    icon: XCircle,     bg: 'bg-red-900/20',    border: 'border-red-500/30',    text: 'text-red-400'    },
};

export default function MyApplications() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [data, setData] = useState({ led: [], applications: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await SquadAPI.getMySquads();
    if (!res.error) setData(res);
    setLoading(false);
  };

  const tabs = [
    { id: 'applications', label: 'MY_APPLICATIONS', count: data.applications?.length || 0 },
    { id: 'led', label: 'SQUADS_I_LEAD', count: data.led?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/nexus')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white font-['Orbitron'] tracking-widest flex items-center gap-3">
                <Shield className="text-purple-400" size={28} /> MISSION_LOG
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">YOUR SQUADS & APPLICATIONS</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-bold font-['Orbitron'] text-sm transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-cyan-900/30 border border-cyan-500/50 text-cyan-400'
                  : 'bg-gray-900/30 border border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 font-mono ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-800 text-gray-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-cyan-400 mb-4"><Shield size={48} /></div>
            <p className="text-cyan-500 font-mono animate-pulse">LOADING_DATA...</p>
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
      <div className="text-center py-16 border border-dashed border-gray-800">
        <Target size={48} className="mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl text-gray-500 font-bold font-['Orbitron']">NO_APPLICATIONS</h3>
        <p className="text-gray-600 font-mono text-sm mt-2">Browse the N.E.X.U.S. feed to find squads</p>
        <button onClick={() => navigate('/nexus')} className="mt-4 px-6 py-2 bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition font-bold font-['Orbitron'] text-sm">
          BROWSE_MISSIONS
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map(app => {
        const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
          <div
            key={app.id}
            onClick={() => navigate(`/squad/${app.squadId}`)}
            className={`bg-black border ${cfg.border} p-5 cursor-pointer hover:bg-gray-900/50 transition group`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white font-['Orbitron'] group-hover:text-cyan-400 transition truncate">
                    {app.squad?.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold font-['Orbitron'] ${cfg.bg} ${cfg.border} border ${cfg.text}`}>
                    <Icon size={10} className="inline mr-1" />{cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                  {app.slot && (
                    <span className="text-purple-400">
                      <Shield size={10} className="inline mr-1" />{app.slot.roleTitle}
                    </span>
                  )}
                  {app.matchScore != null && (
                    <span className="text-yellow-400 font-bold">MATCH: {app.matchScore}/10</span>
                  )}
                  {app.squad?.event && (
                    <span className="text-gray-600">{app.squad.event}</span>
                  )}
                  <span className="text-gray-600">
                    Applied {new Date(app.appliedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-700 group-hover:text-cyan-400 transition shrink-0" />
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
      <div className="text-center py-16 border border-dashed border-gray-800">
        <Users size={48} className="mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl text-gray-500 font-bold font-['Orbitron']">NO_SQUADS_CREATED</h3>
        <p className="text-gray-600 font-mono text-sm mt-2">Create your first squad on the mission board</p>
        <button onClick={() => navigate('/nexus')} className="mt-4 px-6 py-2 bg-yellow-400 text-black hover:bg-yellow-300 transition font-bold font-['Orbitron'] text-sm">
          CREATE_SQUAD
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {squads.map(squad => {
        const pendingCount = squad._count?.applications || 0;
        return (
          <div
            key={squad.id}
            onClick={() => navigate(`/squad/${squad.id}/manage`)}
            className="bg-black border border-purple-500/20 hover:border-purple-500/50 p-5 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white font-['Orbitron'] group-hover:text-purple-400 transition truncate">
                    {squad.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-[10px] font-bold font-['Orbitron'] ${
                    squad.status === 'OPEN' ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                    : squad.status === 'FULL' ? 'bg-red-900/20 border border-red-500/30 text-red-400'
                    : 'bg-gray-900/20 border border-gray-500/30 text-gray-400'
                  }`}>
                    {squad.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                  <span><Users size={10} className="inline mr-1" />{squad.currentMembers}/{squad.maxMembers} members</span>
                  {pendingCount > 0 && (
                    <span className="text-yellow-400 font-bold animate-pulse">
                      {pendingCount} PENDING
                    </span>
                  )}
                  {squad.event && <span className="text-purple-400">{squad.event}</span>}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-700 group-hover:text-purple-400 transition shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
