import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, CheckCircle, X, Shield,
  User, AlertCircle, RefreshCw
} from 'lucide-react';

export default function SquadManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { loadSquad(); }, [id]);

  const loadSquad = async () => {
    setLoading(true);
    const data = await SquadAPI.getSquad(id);
    if (!data.error) setSquad(data);
    setLoading(false);
  };

  const handleAction = async (applicationId, status) => {
    setActionLoading(applicationId);
    await SquadAPI.updateApplicationStatus(id, applicationId, status);
    await loadSquad(); // Refresh
    setActionLoading(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-cyan-500 font-mono animate-pulse">LOADING_SQUAD_DATA...</div>
    </div>
  );

  if (!squad || squad.leader?.id !== currentUser.id) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-red-500 font-mono">ACCESS_DENIED</div>
    </div>
  );

  const pending = squad.applications?.filter(a => a.status === 'PENDING') || [];
  const accepted = squad.applications?.filter(a => a.status === 'ACCEPTED') || [];
  const rejected = squad.applications?.filter(a => a.status === 'REJECTED') || [];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-6">
          <button onClick={() => navigate('/nexus')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white font-['Orbitron']">{squad.title}</h1>
            <p className="text-xs font-mono text-gray-500 mt-1">SQUAD_COMMAND_CENTER</p>
          </div>
          <button onClick={loadSquad} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'PENDING', count: pending.length, color: 'yellow' },
            { label: 'ACCEPTED', count: accepted.length, color: 'green' },
            { label: 'CAPACITY', count: `${squad.currentMembers}/${squad.maxMembers}`, color: 'cyan' },
          ].map(stat => (
            <div key={stat.label} className={`bg-black border border-${stat.color}-500/20 p-4 text-center`}>
              <div className={`text-3xl font-black font-['Orbitron'] text-${stat.color}-400`}>
                {stat.count}
              </div>
              <div className="text-xs font-mono text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pending applications */}
        <div className="mb-8">
          <h2 className="text-xl font-black font-['Orbitron'] text-yellow-400 mb-4 flex items-center gap-2">
            <AlertCircle size={20} /> PENDING_REVIEW ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-gray-800 text-gray-600 font-mono text-sm">
              NO_PENDING_APPLICATIONS
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onAccept={() => handleAction(app.id, 'ACCEPTED')}
                  onReject={() => handleAction(app.id, 'REJECTED')}
                  loading={actionLoading === app.id}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Accepted */}
        {accepted.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black font-['Orbitron'] text-green-400 mb-4 flex items-center gap-2">
              <CheckCircle size={20} /> ACCEPTED ({accepted.length})
            </h2>
            <div className="space-y-3">
              {accepted.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  accepted
                  navigate={navigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <div>
            <h2 className="text-xl font-black font-['Orbitron'] text-gray-500 mb-4">
              REJECTED ({rejected.length})
            </h2>
            <div className="space-y-2 opacity-60">
              {rejected.map(app => (
                <ApplicationCard key={app.id} application={app} rejected navigate={navigate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ application, onAccept, onReject, loading, accepted, rejected, navigate }) {
  const user = application.user;
  const verifiedSkills = user?.skills?.filter(s => s.isVerified) || [];

  return (
    <div className={`bg-black border p-4 flex items-center gap-4 ${
      accepted ? 'border-green-500/30' : rejected ? 'border-gray-800' : 'border-gray-700 hover:border-gray-500'
    }`}>
      <div
        className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0 cursor-pointer"
        onClick={() => navigate(`/profile/${user?.id}`)}
      >
        {user?.avatar
          ? <img src={user.avatar} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-gray-500" /></div>}
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="text-white font-bold text-sm cursor-pointer hover:text-cyan-400 transition"
          onClick={() => navigate(`/profile/${user?.id}`)}
        >
          {user?.name}
        </div>
        <div className="text-xs font-mono text-gray-500">{user?.college || user?.role}</div>

        {/* Verified skills + match score */}
        <div className="flex items-center gap-3 mt-1">
          {verifiedSkills.slice(0, 3).map(s => (
            <span key={s.id} className="text-[10px] bg-green-900/20 border border-green-500/30 text-green-400 px-1.5 py-0.5 font-mono flex items-center gap-1">
              <CheckCircle size={8} /> {s.skill.name} {s.calculatedScore && `(${s.calculatedScore})`}
            </span>
          ))}
          {application.matchScore != null && (
            <span className="text-[10px] font-mono text-yellow-400 font-bold">
              MATCH: {application.matchScore}/10
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!accepted && !rejected && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onAccept}
            disabled={loading}
            className="px-3 py-2 bg-green-900/30 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black transition font-bold font-['Orbitron'] text-xs disabled:opacity-50"
          >
            {loading ? '...' : <CheckCircle size={14} />}
          </button>
          <button
            onClick={onReject}
            disabled={loading}
            className="px-3 py-2 bg-red-900/30 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition font-bold font-['Orbitron'] text-xs disabled:opacity-50"
          >
            {loading ? '...' : <X size={14} />}
          </button>
        </div>
      )}
      {accepted && <span className="text-green-400 text-xs font-mono shrink-0">ACCEPTED</span>}
      {rejected && <span className="text-gray-600 text-xs font-mono shrink-0">REJECTED</span>}
    </div>
  );
}