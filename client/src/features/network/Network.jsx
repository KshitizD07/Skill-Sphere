import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api';
import { Users, ArrowLeft, Building2, Shield, Search } from 'lucide-react';
import Navbar from '../../shared/components/Navbar';

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
    ALUMNI:  { bg: 'bg-secondary/8',  border: 'border-secondary/20',  text: 'text-secondary' },
    STUDENT: { bg: 'bg-primary/8',  border: 'border-primary/20',  text: 'text-primary' },
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      
      <Navbar user={currentUser} onLogout={() => { API.post('/auth/logout').catch(()=>{}); localStorage.removeItem('user_data'); localStorage.removeItem('ss_token'); window.location.replace('/'); }} />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-6 md:p-10 w-full max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 border-b border-outline-var/25 pb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')}
              className="p-2 border border-outline-var/40 rounded-xs hover:border-primary/40 text-outline hover:text-primary transition-all">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Users className="text-primary" size={20} />
                <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Network</h1>
              </div>
              <p className="font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline">
                Discover and connect with students and alumni
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {/* Campus toggle */}
            <button onClick={() => setFilterMode(filterMode === 'ALL' ? 'MY_COLLEGE' : 'ALL')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xs font-syne font-bold text-[10px] uppercase tracking-[0.1em] transition-all ${
                filterMode === 'MY_COLLEGE'
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-transparent border-outline-var/40 text-outline hover:border-primary/30 hover:text-primary'
              }`}>
              <Building2 size={13} />
              {filterMode === 'MY_COLLEGE' ? 'My Campus' : 'All Members'}
            </button>

            {/* Role tabs */}
            <div className="flex border border-outline-var/30 rounded-xs overflow-hidden">
              {['ALL', 'ALUMNI', 'STUDENT'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className={`px-4 py-2 font-syne text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${
                    roleFilter === r
                      ? r === 'ALUMNI'  ? 'bg-secondary/10 text-secondary'
                        : r === 'STUDENT' ? 'bg-primary/10 text-primary'
                        : 'bg-primary/10 text-primary'
                      : 'text-[#656d84] hover:text-text-muted hover:bg-surface-mid'
                  }`}>
                  {r === 'STUDENT' ? 'Students' : r === 'ALUMNI' ? 'Alumni' : 'All'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-3.5 text-[#656d84] group-focus-within:text-primary transition-colors" size={16} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, institution or skill..."
            className="w-full bg-surface border border-outline-var/30 rounded-xs p-3.5 pl-11 text-text-primary outline-none focus:border-primary/50 font-outfit text-sm transition-colors placeholder-outline-var" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-outline font-syne text-[10px] uppercase tracking-[0.12em] animate-pulse">Loading members...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.length > 0 ? users.map(user => {
              const roleStyle = roleColors[user.role] || roleColors.STUDENT;
              return (
                <div key={user.id}
                  className="bg-surface border border-outline-var/20 rounded-md p-6 hover:border-secondary/15 transition-colors group relative overflow-hidden">
                  {/* Role badge */}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase tracking-wide ${roleStyle.bg} ${roleStyle.border} ${roleStyle.text} border`}>
                    {user.role === 'STUDENT' ? 'Student' : 'Alumni'}
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full border border-outline-var/40 overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                      {user.avatar
                        ? <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full bg-surface-mid flex items-center justify-center text-[#656d84] font-bold text-lg">{user.name?.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <h3 className="text-text-primary font-bold text-base leading-tight mb-1 group-hover:text-primary transition-colors truncate">{user.name}</h3>
                      <p className="text-outline text-xs leading-snug line-clamp-1">{user.headline || 'Member'}</p>
                    </div>
                  </div>

                  {user.college && (
                    <div className="flex items-center gap-2 text-xs text-secondary bg-secondary/5 p-2 rounded-xs mb-4 border border-secondary/10">
                      <Building2 size={11} className="shrink-0" />
                      <span className="line-clamp-1 font-outfit">{user.college}</span>
                    </div>
                  )}

                  <button onClick={() => navigate(`/profile/${user.id}`)}
                    className="w-full py-2.5 bg-surface-mid border border-outline-var/30 text-text-muted font-syne font-bold text-[10px] uppercase tracking-[0.1em] hover:bg-primary hover:text-on-primary hover:border-primary transition-all rounded-xs">
                    View Profile
                  </button>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-20 border border-dashed border-outline-var/30 rounded-md">
                <Shield size={40} className="mx-auto text-outline-var mb-4" />
                <h3 className="text-lg text-outline font-bold tracking-tight">No members found</h3>
                <p className="text-[#656d84] font-syne text-[10px] uppercase tracking-[0.1em] mt-2">Try adjusting your search</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}