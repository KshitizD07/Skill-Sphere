import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users, Building2, Shield, Search, ArrowRight, MessageSquare,
  CheckCircle2, Star,
  X, User, UserPlus, UserCheck
} from 'lucide-react';
import NetworkAPI from './networkAPI';
import ProfileAPI from '../profile/profileAPI';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

export default function Network({ user: propUser, onLogout }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const fallbackUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const currentUser = propUser || fallbackUser;

  // Filter & Search states (synced from URL)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'ALL');
  const [skillFilter, setSkillFilter] = useState(searchParams.get('skill') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [collegeFilter, setCollegeFilter] = useState(searchParams.get('college') || '');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || 'newest');
  const [isMyCampusOnly, setIsMyCampusOnly] = useState(searchParams.get('campus') === 'true');

  // Directory state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Popular skill suggestion tags
  const popularSkills = ['React', 'Node.js', 'Python', 'TypeScript', 'Docker', 'PostgreSQL', 'Machine Learning', 'Next.js'];

  // ── Sync URL Search Params ────────────────────────────────────────────────
  const _updateUrlParams = useCallback(() => {
    const params = {};
    if (searchQuery.trim()) params.q = searchQuery.trim();
    if (roleFilter !== 'ALL') params.role = roleFilter;
    if (skillFilter.trim()) params.skill = skillFilter.trim();
    if (verifiedOnly) params.verified = 'true';
    if (collegeFilter.trim()) params.college = collegeFilter.trim();
    if (isMyCampusOnly) params.campus = 'true';
    if (sortOption !== 'newest') params.sort = sortOption;

    setSearchParams(params, { replace: true });
  }, [searchQuery, roleFilter, skillFilter, verifiedOnly, collegeFilter, isMyCampusOnly, sortOption, setSearchParams]);

  // ── Fetch Directory Users ─────────────────────────────────────────────────
  const fetchUsers = useCallback(async (append = false, cursor = null) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const collegeParam = isMyCampusOnly && currentUser.college ? currentUser.college : collegeFilter;

      const res = await NetworkAPI.getUsers({
        search: searchQuery,
        role: roleFilter,
        skill: skillFilter,
        college: collegeParam,
        verifiedOnly,
        sort: sortOption,
        cursor,
        limit: 12,
      });

      const list = res?.data || (Array.isArray(res) ? res : []);
      if (append) {
        setUsers((prev) => [...prev, ...list]);
      } else {
        setUsers(list);
      }
      setNextCursor(res?.nextCursor || null);
      setHasMore(!!res?.hasMore);
    } catch (err) {
      toast.error(err.message || 'Failed to load network directory.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, roleFilter, skillFilter, collegeFilter, isMyCampusOnly, verifiedOnly, sortOption, currentUser.college, toast]);

  // Debounced directory fetch on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (skillFilter.trim()) params.skill = skillFilter.trim();
      if (verifiedOnly) params.verified = 'true';
      if (collegeFilter.trim()) params.college = collegeFilter.trim();
      if (isMyCampusOnly) params.campus = 'true';
      if (sortOption !== 'newest') params.sort = sortOption;

      const newParams = new URLSearchParams(params);
      if (searchParams.toString() !== newParams.toString()) {
        setSearchParams(params, { replace: true });
      }

      fetchUsers(false, null);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, roleFilter, skillFilter, collegeFilter, isMyCampusOnly, verifiedOnly, sortOption]);



  // ── Reset Filters ─────────────────────────────────────────────────────────
  const resetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setSkillFilter('');
    setVerifiedOnly(false);
    setCollegeFilter('');
    setIsMyCampusOnly(false);
    setSortOption('newest');
  };

  const hasActiveFilters = searchQuery || roleFilter !== 'ALL' || skillFilter || verifiedOnly || collegeFilter || isMyCampusOnly || sortOption !== 'newest';

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-outline-var/20">
          <div>
            <div className="flex items-center gap-2">
              <Users className="text-primary" size={22} />
              <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                Network Discovery
              </h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Connect with skilled students, alumni, mentors, and engineers across global universities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsMyCampusOnly(!isMyCampusOnly);
                if (!isMyCampusOnly && !currentUser.college) {
                  toast.info('Add your college in profile to filter by campus.');
                }
              }}
              className={`flex items-center gap-2 px-3.5 py-2 border rounded-xs font-syne font-bold text-xs uppercase tracking-wider transition-all ${
                isMyCampusOnly
                  ? 'bg-primary text-on-primary border-primary shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-surface hover:bg-surface-mid border-outline-var/30 text-text-muted hover:text-text-primary'
              }`}
            >
              <Building2 size={14} />
              {isMyCampusOnly ? 'My Campus Active' : 'My Campus'}
            </button>
          </div>
        </div>


        {/* ── SECTION 2: Search & Filter Toolbar ─────────────────────────── */}
        <div className="bg-surface border border-outline-var/20 rounded-md p-4 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3.5 top-3 text-outline" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, headline, skill, or campus..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 pl-10 pr-4 text-xs text-text-primary outline-none focus:border-primary/50 placeholder-outline-var transition-colors font-outfit"
              />
            </div>

            {/* Skill filter input */}
            <div className="md:col-span-3 relative">
              <input
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Filter by skill (e.g. React)..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 px-3 text-xs text-text-primary outline-none focus:border-primary/50 placeholder-outline-var font-outfit"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-3">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-2 px-3 text-xs text-text-primary outline-none focus:border-primary/50 font-outfit cursor-pointer"
              >
                <option value="newest">Sort: Newest Members</option>
                <option value="most_skills">Sort: Most Verified Skills</option>
                <option value="highest_score">Sort: Highest Skill Score</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-var/15">
            {/* Role Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline mr-1">
                Role:
              </span>
              {['ALL', 'STUDENT', 'PROFESSIONAL', 'RECRUITER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    roleFilter === r
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/30'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r === 'STUDENT' ? 'Students' : r === 'PROFESSIONAL' ? 'Pros' : 'Recruiters'}
                </button>
              ))}
            </div>

            {/* Verified Only Toggle */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider border transition-all ${
                verifiedOnly
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-surface-mid border-outline-var/30 text-outline hover:text-text-primary'
              }`}
            >
              <CheckCircle2 size={12} className={verifiedOnly ? 'text-accent' : 'text-outline'} />
              Verified Skills Only
            </button>
          </div>

          {/* Quick Skill Suggestion Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline mr-1">
              Popular:
            </span>
            {popularSkills.map((s) => (
              <button
                key={s}
                onClick={() => setSkillFilter(skillFilter === s ? '' : s)}
                className={`px-2 py-0.5 rounded-xs text-[10px] font-syne transition-colors border ${
                  skillFilter.toLowerCase() === s.toLowerCase()
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'bg-surface-mid/60 hover:bg-surface-mid border-outline-var/20 text-text-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-outline-var/15 flex-wrap">
              <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                Active Filters:
              </span>
              {searchQuery && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-[10px] rounded-xs text-text-primary flex items-center gap-1">
                  Query: {searchQuery}
                  <X size={10} className="cursor-pointer" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {roleFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-[10px] rounded-xs text-text-primary flex items-center gap-1">
                  Role: {roleFilter}
                  <X size={10} className="cursor-pointer" onClick={() => setRoleFilter('ALL')} />
                </span>
              )}
              {skillFilter && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-[10px] rounded-xs text-text-primary flex items-center gap-1">
                  Skill: {skillFilter}
                  <X size={10} className="cursor-pointer" onClick={() => setSkillFilter('')} />
                </span>
              )}
              {isMyCampusOnly && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-[10px] rounded-xs text-text-primary flex items-center gap-1">
                  Campus Only
                  <X size={10} className="cursor-pointer" onClick={() => setIsMyCampusOnly(false)} />
                </span>
              )}
              {verifiedOnly && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/30 text-[10px] rounded-xs text-text-primary flex items-center gap-1">
                  Verified Only
                  <X size={10} className="cursor-pointer" onClick={() => setVerifiedOnly(false)} />
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-[10px] text-primary hover:underline font-syne font-bold uppercase tracking-wider ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Directory Member Cards Grid ─────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-syne font-bold uppercase tracking-wider text-text-primary">
              All Members {!loading && `(${users.length})`}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 bg-surface border border-outline-var/20 rounded-md animate-pulse p-6" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-surface border border-dashed border-outline-var/30 rounded-md p-8">
              <Shield size={44} className="mx-auto text-outline-var mb-3 opacity-40" />
              <h3 className="text-base font-extrabold text-text-primary">No Members Found</h3>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                No users match your current search and filter criteria. Try adjusting or clearing your filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {users.map((user) => {
                const roleBadgeClass =
                  user.role === 'PROFESSIONAL'
                    ? 'bg-accent/10 text-accent border-accent/20'
                    : user.role === 'RECRUITER'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-primary/10 text-primary border-primary/20';

                return (
                  <div
                    key={user.id}
                    className="bg-surface border border-outline-var/20 hover:border-primary/40 rounded-md p-5 flex flex-col justify-between transition-all group relative hover:shadow-xl"
                  >
                    <div className="space-y-4">
                      {/* Top Header */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
                            {user.avatar ? (
                              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <User size={20} className="text-outline" />
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
                              user.isOnline ? 'bg-accent' : 'bg-outline-var'
                            }`}
                            title={user.isOnline ? 'Online' : 'Offline'}
                          />
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-base text-text-primary group-hover:text-primary transition-colors truncate">
                              {user.name}
                            </h3>
                            {user.id === currentUser?.id && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-syne font-black uppercase bg-primary/20 text-primary border border-primary/30 shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                            {user.headline || 'Member'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase border ${roleBadgeClass}`}>
                              {user.role}
                            </span>
                            {user.verifiedSkillCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-syne font-bold uppercase bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                                <CheckCircle2 size={10} /> {user.verifiedSkillCount} Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* College badge */}
                      {user.college && (
                        <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-mid/80 p-2 rounded-xs border border-outline-var/20">
                          <Building2 size={13} className="text-primary shrink-0" />
                          <span className="truncate">{user.college}</span>
                        </div>
                      )}

                      {/* Skill Tags */}
                      {user.topSkills && user.topSkills.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-syne font-bold uppercase tracking-wider text-outline">
                            Top Skills:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {user.topSkills.map((sk) => (
                              <span
                                key={sk.id}
                                className={`px-2 py-0.5 rounded-xs text-[10px] font-syne flex items-center gap-1 border ${
                                  sk.isVerified
                                    ? 'bg-accent/10 border-accent/30 text-accent font-bold'
                                    : 'bg-surface-mid border-outline-var/25 text-text-muted'
                                }`}
                              >
                                {sk.isVerified && <Star size={9} className="fill-accent text-accent" />}
                                {sk.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-outline-var/20">
                      {user.id === currentUser?.id ? (
                        <button
                          onClick={() => navigate('/my-profile')}
                          className="w-full py-2 bg-primary/15 hover:bg-primary text-primary hover:text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <User size={13} /> Your Profile (View / Edit)
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              const isCurrentlyFollowing = user.isFollowing;
                              setUsers((prev) =>
                                prev.map((u) =>
                                  u.id === user.id ? { ...u, isFollowing: !isCurrentlyFollowing } : u
                                )
                              );
                              try {
                                if (isCurrentlyFollowing) await ProfileAPI.unfollowUser(user.id);
                                else await ProfileAPI.followUser(user.id);
                              } catch {
                                setUsers((prev) =>
                                  prev.map((u) =>
                                    u.id === user.id ? { ...u, isFollowing: isCurrentlyFollowing } : u
                                  )
                                );
                              }
                            }}
                            className={`px-3 py-2 border font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                              user.isFollowing
                                ? 'bg-surface-mid border-outline-var/30 text-text-muted hover:border-error hover:text-error'
                                : 'bg-primary/15 border-primary/30 text-primary hover:bg-primary hover:text-on-primary'
                            }`}
                            title={user.isFollowing ? 'Unfollow' : 'Follow'}
                          >
                            {user.isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
                          </button>
                          <button
                            onClick={() => navigate(`/chat/${user.id}`)}
                            className="flex-1 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare size={13} /> Message
                          </button>
                          <button
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="px-3.5 py-2 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-muted hover:text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            Profile <ArrowRight size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchUsers(true, nextCursor)}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all disabled:opacity-50"
              >
                {loadingMore ? 'Loading more members...' : 'Load More Members'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
