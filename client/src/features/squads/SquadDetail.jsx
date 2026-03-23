import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SquadAPI from './squadAPI';
import {
  ArrowLeft, Users, Shield, Lock, CheckCircle,
  AlertCircle, Calendar, Target, User
} from 'lucide-react';

export default function SquadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qualification, setQualification] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    loadSquad();
  }, [id]);

  const loadSquad = async () => {
    setLoading(true);
    const data = await SquadAPI.getSquad(id);
    if (!data.error) {
      setSquad(data);
      // Check qualification after squad loads
      const qual = await SquadAPI.checkQualification(id, currentUser.id);
      if (!qual.error) setQualification(qual);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    const res = await SquadAPI.applyToSquad(id, currentUser.id);
    if (res.error) {
      setApplyError(res.message);
    } else {
      setApplied(true);
    }
    setApplying(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-cyan-500 font-mono animate-pulse">LOADING_MISSION_DATA...</div>
    </div>
  );

  if (!squad) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-red-500 font-mono">MISSION_NOT_FOUND</div>
    </div>
  );

  const isLeader = squad.leader?.id === currentUser.id;
  const isFull = squad.currentMembers >= squad.maxMembers;
  const canApply = !isLeader && !isFull && !applied && qualification?.qualifies;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/nexus')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="text-xs font-mono text-gray-600">N.E.X.U.S. / MISSION_DETAIL</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {squad.event && (
              <div className="inline-block px-3 py-1 bg-purple-900/30 border border-purple-500/50 text-purple-400 text-xs font-mono">
                {squad.event}
              </div>
            )}
            <h1 className="text-4xl font-black text-white font-['Orbitron']">{squad.title}</h1>
            <p className="text-gray-300 text-lg leading-relaxed border-l-2 border-cyan-500/30 pl-4">
              {squad.description}
            </p>

            {/* Slots */}
            <div className="bg-gray-900/50 border border-gray-800 p-6">
              <h3 className="text-yellow-400 font-bold font-['Orbitron'] text-sm mb-4 flex items-center gap-2">
                <Target size={16} /> OPEN_SLOTS
              </h3>
              <div className="space-y-3">
                {squad.slots?.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black border border-gray-800">
                    <div>
                      <div className="text-white font-bold text-sm">{slot.roleTitle}</div>
                      <div className="text-xs font-mono text-gray-500 mt-1">
                        Requires: <span className="text-cyan-400">{slot.requiredSkill}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-400 font-mono text-sm font-bold">
                        <Lock size={12} />
                        ≥{slot.minScore}/10
                      </div>
                      {slot.filledBy ? (
                        <div className="text-xs text-green-400 font-mono mt-1">FILLED</div>
                      ) : (
                        <div className="text-xs text-gray-600 font-mono mt-1">OPEN</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Members */}
            {squad.members?.length > 0 && (
              <div className="bg-gray-900/50 border border-gray-800 p-6">
                <h3 className="text-cyan-400 font-bold font-['Orbitron'] text-sm mb-4 flex items-center gap-2">
                  <Users size={16} /> CURRENT_MEMBERS ({squad.currentMembers}/{squad.maxMembers})
                </h3>
                <div className="space-y-2">
                  {squad.members.map(member => (
                    <div key={member.id} className="flex items-center gap-3 p-2">
                      <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                        {member.avatar
                          ? <img src={member.avatar} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><User size={14} className="text-gray-500" /></div>}
                      </div>
                      <div>
                        <div className="text-white text-sm font-bold">{member.name}</div>
                        <div className="text-xs font-mono text-gray-500">{member.role}</div>
                      </div>
                      {member.id === squad.leader?.id && (
                        <span className="ml-auto text-[10px] bg-yellow-900/30 border border-yellow-500/50 text-yellow-400 px-2 py-0.5 font-mono">LEADER</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Apply */}
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-mono text-gray-500">SQUAD_STATUS</div>
                <div className={`text-xs font-bold font-['Orbitron'] px-2 py-1 ${isFull ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-green-900/30 text-green-400 border border-green-500/30'}`}>
                  {isFull ? 'FULL' : 'RECRUITING'}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm font-mono">
                <Users size={14} className="text-gray-500" />
                <span className="text-gray-400">{squad.currentMembers}/{squad.maxMembers} members</span>
              </div>

              {/* Qualification result */}
              {qualification && !isLeader && (
                <div className={`p-3 mb-4 border text-xs font-mono ${
                  qualification.qualifies
                    ? 'bg-green-900/20 border-green-500/30 text-green-400'
                    : 'bg-red-900/20 border-red-500/30 text-red-400'
                }`}>
                  {qualification.qualifies ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} /> YOU_QUALIFY — Match score: {qualification.matchScore}/10
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} /> {qualification.reason || 'SCORE_TOO_LOW'}
                    </div>
                  )}
                </div>
              )}

              {/* Apply error */}
              {applyError && (
                <div className="p-3 mb-4 bg-red-900/20 border border-red-500/30 text-red-400 text-xs font-mono">
                  {applyError}
                </div>
              )}

              {/* CTA */}
              {isLeader ? (
                <button
                  onClick={() => navigate(`/squad/${id}/manage`)}
                  className="w-full py-3 bg-purple-900/30 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition font-bold font-['Orbitron'] text-sm"
                >
                  MANAGE_SQUAD
                </button>
              ) : applied ? (
                <div className="w-full py-3 bg-green-900/20 border border-green-500/30 text-green-400 font-bold font-['Orbitron'] text-sm text-center">
                  APPLICATION_SENT ✓
                </div>
              ) : isFull ? (
                <button disabled className="w-full py-3 bg-gray-900 border border-gray-800 text-gray-600 font-bold font-['Orbitron'] text-sm cursor-not-allowed">
                  SQUAD_FULL
                </button>
              ) : !qualification?.qualifies ? (
                <button disabled className="w-full py-3 bg-gray-900 border border-red-500/20 text-red-500/50 font-bold font-['Orbitron'] text-sm cursor-not-allowed flex items-center justify-center gap-2">
                  <Lock size={14} /> SCORE_REQUIRED
                </button>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full py-3 bg-cyan-600 text-black hover:bg-cyan-400 transition font-bold font-['Orbitron'] text-sm disabled:opacity-50"
                >
                  {applying ? 'SUBMITTING...' : 'APPLY_NOW'}
                </button>
              )}

              {/* Leader info */}
              <div className="mt-6 pt-4 border-t border-gray-800">
                <div className="text-xs font-mono text-gray-500 mb-2">SQUAD_LEADER</div>
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -mx-2 transition"
                  onClick={() => navigate(`/profile/${squad.leader?.id}`)}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                    {squad.leader?.avatar
                      ? <img src={squad.leader.avatar} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-cyan-900" />}
                  </div>
                  <div>
                    <div className="text-white text-sm font-bold">{squad.leader?.name}</div>
                    <div className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition">VIEW_PROFILE →</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}