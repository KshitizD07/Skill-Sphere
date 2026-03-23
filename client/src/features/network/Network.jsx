import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import { Users, ArrowLeft, Building2, Shield, Search } from 'lucide-react';

export default function Network() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = useCallback(async (search, role, mode) => {
    setLoading(true);
    try {
      let endpoint = `/users/filter?role=${role}`;
      if (mode === 'MY_COLLEGE' && currentUser.college) {
        endpoint += `&college=${encodeURIComponent(currentUser.college)}`;
      }
      if (search?.trim()) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }
      const res = await API.get(endpoint);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Network fetch error:', err);
    }
    setLoading(false);
  }, [currentUser.college]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchQuery, roleFilter, filterMode);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, filterMode, fetchUsers]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-white font-['Orbitron'] tracking-widest flex items-center gap-3">
                <Users className="text-purple-500" /> UPLINK
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">ESTABLISH_CONNECTIONS // FIND_MENTORS</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilterMode(filterMode === 'ALL' ? 'MY_COLLEGE' : 'ALL')}
              className={`flex items-center gap-2 px-4 py-2 border font-bold font-['Orbitron'] text-sm transition-all ${
                filterMode === 'MY_COLLEGE'
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-black border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-400'
              }`}
            >
              <Building2 size={16} />
              {filterMode === 'MY_COLLEGE' ? 'MY_CAMPUS_ONLY' : 'GLOBAL_SEARCH'}
            </button>
            <div className="flex border border-gray-700 bg-black">
              {['ALL', 'ALUMNI', 'STUDENT'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2 text-xs font-mono font-bold hover:bg-white/10 transition ${
                    roleFilter === r
                      ? r === 'ALUMNI' ? 'bg-purple-900/30 text-purple-400'
                        : r === 'STUDENT' ? 'bg-green-900/30 text-green-400'
                        : 'bg-cyan-900/30 text-cyan-400'
                      : 'text-gray-500'
                  }`}
                >
                  {r === 'STUDENT' ? 'STUDENTS' : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-10 relative group">
          <Search className="absolute left-4 top-4 text-gray-500 group-focus-within:text-cyan-400 transition" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="SEARCH_BY_NAME_COLLEGE_OR_SKILL..."
            className="w-full bg-gray-900/30 border border-gray-700 p-4 pl-12 text-white outline-none focus:border-cyan-500 font-mono transition-all placeholder-gray-600"
          />
        </div>

        {loading ? (
          <div className="text-center py-20 text-cyan-500 font-mono animate-pulse">SCANNING_NETWORK_NODES...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.length > 0 ? users.map(user => (
              <div key={user.id} className="bg-gray-900/40 border border-gray-800 p-6 hover:border-cyan-500/50 transition group relative overflow-hidden">
                <div className={`absolute top-0 right-0 px-2 py-1 text-[10px] font-bold font-['Orbitron'] tracking-wider ${
                  user.role === 'ALUMNI' ? 'bg-purple-500 text-black' : 'bg-cyan-900 text-cyan-400'
                }`}>
                  {user.role}
                </div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full border-2 border-gray-700 overflow-hidden shrink-0 group-hover:border-cyan-400 transition">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full bg-black" />}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-none mb-1 group-hover:text-cyan-400 transition">{user.name}</h3>
                    <p className="text-gray-500 text-xs font-mono line-clamp-1">{user.headline || 'Netrunner'}</p>
                  </div>
                </div>
                {user.college && (
                  <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-900/10 p-2 rounded mb-4 border border-purple-500/20">
                    <Building2 size={12} className="shrink-0" />
                    <span className="line-clamp-1 font-mono">{user.college}</span>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/profile/${user.id}`)}
                  className="w-full py-2 bg-black border border-gray-700 text-gray-300 font-bold font-['Orbitron'] text-xs hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition"
                >
                  INSPECT_PROFILE
                </button>
              </div>
            )) : (
              <div className="col-span-full text-center py-20 border border-dashed border-gray-800">
                <Shield size={48} className="mx-auto text-gray-700 mb-4" />
                <h3 className="text-xl text-gray-500 font-bold font-['Orbitron']">NO_AGENTS_FOUND</h3>
                <p className="text-gray-600 font-mono text-sm mt-2">TRY_ADJUSTING_SEARCH_PARAMETERS</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}