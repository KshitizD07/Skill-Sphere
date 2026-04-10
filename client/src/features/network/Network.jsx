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

  const roleColors = {
    ALUMNI:  { bg: 'bg-[#6bd8cb]/8',  border: 'border-[#6bd8cb]/20',  text: 'text-[#6bd8cb]' },
    STUDENT: { bg: 'bg-[#adc6ff]/8',  border: 'border-[#adc6ff]/20',  text: 'text-[#adc6ff]' },
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 border-b border-[#434655]/25 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 border border-[#434655]/40 rounded-xs hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Users className="text-[#adc6ff]" size={20} />
                <h1 className="text-2xl font-extrabold text-[#dae2fd] tracking-tight">Network</h1>
              </div>
              <p className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.12em] uppercase text-[#8d90a0]">
                Discover and connect with students and alumni
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Campus toggle */}
            <button onClick={() => setFilterMode(filterMode === 'ALL' ? 'MY_COLLEGE' : 'ALL')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xs font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-[0.1em] transition-all ${
                filterMode === 'MY_COLLEGE'
                  ? 'bg-[#adc6ff]/10 border-[#adc6ff]/40 text-[#adc6ff]'
                  : 'bg-transparent border-[#434655]/40 text-[#8d90a0] hover:border-[#adc6ff]/30 hover:text-[#adc6ff]'
              }`}>
              <Building2 size={13} />
              {filterMode === 'MY_COLLEGE' ? 'My Campus' : 'All Members'}
            </button>

            {/* Role tabs */}
            <div className="flex border border-[#434655]/30 rounded-xs overflow-hidden">
              {['ALL', 'ALUMNI', 'STUDENT'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2 font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                    roleFilter === r
                      ? r === 'ALUMNI'  ? 'bg-[#6bd8cb]/10 text-[#6bd8cb]'
                        : r === 'STUDENT' ? 'bg-[#adc6ff]/10 text-[#adc6ff]'
                        : 'bg-[#adc6ff]/10 text-[#adc6ff]'
                      : 'text-[#656d84] hover:text-[#c3c6d7] hover:bg-[#222a3d]'
                  }`}>
                  {r === 'STUDENT' ? 'Students' : r === 'ALUMNI' ? 'Alumni' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, institution or skill..."
            className="w-full bg-[#171f33] border border-[#434655]/30 rounded-xs p-3.5 pl-11 text-[#dae2fd] outline-none focus:border-[#adc6ff]/50 font-['Manrope'] text-sm transition-colors placeholder-[#434655]" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#8d90a0] font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.12em] animate-pulse">Loading members...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.length > 0 ? users.map(user => {
              const roleStyle = roleColors[user.role] || roleColors.STUDENT;
              return (
                <div key={user.id}
                  className="bg-[#171f33] border border-[#434655]/20 rounded-md p-6 hover:border-[#6bd8cb]/15 transition-colors group relative overflow-hidden">
                  {/* Role badge */}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-['Space_Grotesk'] font-bold uppercase tracking-wide ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text} border`}>
                    {user.role === 'STUDENT' ? 'Student' : 'Alumni'}
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full border border-[#434655]/40 overflow-hidden shrink-0 group-hover:border-[#adc6ff]/30 transition-colors">
                      {user.avatar
                        ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-[#222a3d] flex items-center justify-center text-[#656d84] font-bold text-lg">{user.name?.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-[#dae2fd] font-bold text-base leading-tight mb-1 group-hover:text-[#adc6ff] transition-colors truncate">{user.name}</h3>
                      <p className="text-[#8d90a0] text-xs leading-snug line-clamp-1">{user.headline || 'Member'}</p>
                    </div>
                  </div>

                  {user.college && (
                    <div className="flex items-center gap-2 text-xs text-[#6bd8cb] bg-[#6bd8cb]/5 p-2 rounded-xs mb-4 border border-[#6bd8cb]/10">
                      <Building2 size={11} className="shrink-0" />
                      <span className="line-clamp-1 font-['Manrope']">{user.college}</span>
                    </div>
                  )}

                  <button onClick={() => navigate(`/profile/${user.id}`)}
                    className="w-full py-2.5 bg-[#131b2e] border border-[#434655]/30 text-[#c3c6d7] font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-[0.1em] hover:bg-[#adc6ff] hover:text-[#002e6a] hover:border-[#adc6ff] transition-all rounded-xs">
                    View Profile
                  </button>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-20 border border-dashed border-[#434655]/30 rounded-md">
                <Shield size={40} className="mx-auto text-[#434655] mb-4" />
                <h3 className="text-lg text-[#8d90a0] font-bold tracking-tight">No members found</h3>
                <p className="text-[#656d84] font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.1em] mt-2">Try adjusting your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}