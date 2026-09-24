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
import { HeavyMasthead, ContrastBadge, CrosshairAnchor } from '../../shared/components/EditorialUI';

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

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-6xl mx-auto space-y-6">
        {/* ── Heavy Masthead ──────────────────────────────────────────────── */}
        <HeavyMasthead
          number="02"
          kicker="PEER ROSTER & DIRECTORY // VERIFIED TALENT MATRIX"
          title="Network Directory"
          meta={`${users.length} BUILDERS INDEXED`}
        >
          <button
            onClick={() => {
              setIsMyCampusOnly(!isMyCampusOnly);
              if (!isMyCampusOnly && !currentUser.college) {
                toast.info('Add your college in profile to filter by campus.');
              }
            }}
            className={`font-mono text-xs uppercase tracking-wider px-3.5 py-1.5 border transition-all cursor-pointer ${
              isMyCampusOnly
                ? 'bg-text-primary text-surface border-text-primary font-bold'
                : 'bg-surface text-outline hover:text-text-primary border-outline-var/60'
            }`}
          >
            <Building2 size={13} className="inline mr-1.5" />
            {isMyCampusOnly ? '[ Campus Filter: Active ]' : '[ Filter: My Campus ]'}
          </button>
        </HeavyMasthead>

        {/* ── SECTION 2: Architectural Filter Toolbar ─────────────────────────── */}
        <div className="bg-surface border border-outline-var/60 rounded-none p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-var/40 pb-2.5">
            <span className="font-mono text-[10px] tracking-widest uppercase text-text-primary font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-text-primary inline-block" />
              DIRECTORY QUERY & ROSTER FILTERS
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="font-mono text-[10px] text-accent hover:underline uppercase tracking-wider font-bold cursor-pointer"
              >
                Reset All Filters [×]
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3.5 top-3 text-outline" size={15} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search builder name, headline, skill, or campus..."
                className="w-full bg-surface-mid/40 border border-outline-var/50 rounded-none py-2 pl-10 pr-4 text-xs text-text-primary outline-none focus:border-text-primary placeholder-outline transition-colors font-outfit"
              />
            </div>

            {/* Skill filter input */}
            <div className="md:col-span-3 relative">
              <input
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Filter by skill (e.g. React)..."
                className="w-full bg-surface-mid/40 border border-outline-var/50 rounded-none py-2 px-3 text-xs text-text-primary outline-none focus:border-text-primary placeholder-outline font-outfit"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-3">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full bg-surface-mid/40 border border-outline-var/50 rounded-none py-2 px-3 text-xs text-text-primary outline-none focus:border-text-primary font-mono uppercase tracking-wider cursor-pointer"
              >
                <option value="newest">Sort: Newest Members</option>
                <option value="most_skills">Sort: Most Verified Skills</option>
                <option value="highest_score">Sort: Highest Skill Score</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-var/30">
            {/* Role Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline mr-1 select-none">
                Role:
              </span>
              {['ALL', 'STUDENT', 'PROFESSIONAL', 'RECRUITER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1 rounded-none font-mono text-[10px] uppercase tracking-wider transition-colors border cursor-pointer ${
                    roleFilter === r
                      ? 'bg-text-primary text-surface font-bold border-text-primary'
                      : 'bg-surface-mid/60 text-text-muted hover:text-text-primary border-outline-var/40'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r === 'STUDENT' ? 'Students' : r === 'PROFESSIONAL' ? 'Pros' : 'Recruiters'}
                </button>
              ))}
            </div>

            {/* Verified Only Toggle */}
            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-none font-mono text-[10px] uppercase tracking-wider border transition-all cursor-pointer ${
                verifiedOnly
                  ? 'bg-accent/15 border-accent text-accent font-bold'
                  : 'bg-surface-mid/60 border-outline-var/40 text-outline hover:text-text-primary'
              }`}
            >
              <CheckCircle2 size={12} className={verifiedOnly ? 'text-accent' : 'text-outline'} />
              Verified Skills Only
            </button>
          </div>

          {/* Quick Skill Suggestion Tags */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-outline mr-1 select-none">
              Popular Tags:
            </span>
            {popularSkills.map((s) => (
              <button
                key={s}
                onClick={() => setSkillFilter(skillFilter === s ? '' : s)}
                className={`px-2 py-0.5 rounded-none font-mono text-[10px] uppercase tracking-wider transition-colors border cursor-pointer ${
                  skillFilter.toLowerCase() === s.toLowerCase()
                    ? 'bg-text-primary text-surface border-text-primary font-bold'
                    : 'bg-surface-mid/40 hover:bg-surface-mid border-outline-var/30 text-text-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-outline-var/25 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-wider text-outline select-none">
                Active:
              </span>
              {searchQuery && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/50 font-mono text-[10px] rounded-none text-text-primary flex items-center gap-1">
                  Query: {searchQuery}
                  <X size={10} className="cursor-pointer" onClick={() => setSearchQuery('')} />
                </span>
              )}
              {roleFilter !== 'ALL' && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/50 font-mono text-[10px] rounded-none text-text-primary flex items-center gap-1">
                  Role: {roleFilter}
                  <X size={10} className="cursor-pointer" onClick={() => setRoleFilter('ALL')} />
                </span>
              )}
              {skillFilter && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/50 font-mono text-[10px] rounded-none text-text-primary flex items-center gap-1">
                  Skill: {skillFilter}
                  <X size={10} className="cursor-pointer" onClick={() => setSkillFilter('')} />
                </span>
              )}
              {isMyCampusOnly && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/50 font-mono text-[10px] rounded-none text-text-primary flex items-center gap-1">
                  Campus Only
                  <X size={10} className="cursor-pointer" onClick={() => setIsMyCampusOnly(false)} />
                </span>
              )}
              {verifiedOnly && (
                <span className="px-2 py-0.5 bg-surface-mid border border-outline-var/50 font-mono text-[10px] rounded-none text-text-primary flex items-center gap-1">
                  Verified Only
                  <X size={10} className="cursor-pointer" onClick={() => setVerifiedOnly(false)} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 3: Architectural Roster Directory ───────────────────────── */}
        <div className="space-y-6">
          {loading ? (
            <div className="border-t-2 border-text-primary border-l border-outline-var/60 bg-surface grid grid-cols-1 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-48 border-r border-b border-outline-var/50 animate-pulse p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-mid" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-surface-mid w-1/3" />
                      <div className="h-3 bg-surface-mid w-1/2" />
                    </div>
                  </div>
                  <div className="h-4 bg-surface-mid w-3/4 mt-4" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 bg-surface border border-outline-var/60 rounded-none p-8 space-y-3">
              <Shield size={36} className="mx-auto text-outline" />
              <h3 className="text-base font-bold font-syne uppercase tracking-wider text-text-primary">
                No Builders Matching Query
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto font-outfit">
                No indexed members match your filter parameters. Clear filters to view full network directory.
              </p>
              <button
                onClick={resetFilters}
                className="mt-2 px-5 py-2 bg-text-primary text-surface font-mono font-bold text-xs uppercase tracking-widest rounded-none hover:bg-accent hover:text-text-primary transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="border-t-2 border-text-primary border-l border-outline-var/60 bg-surface grid grid-cols-1 lg:grid-cols-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border-r border-b border-outline-var/60 p-5 sm:p-6 flex flex-col justify-between transition-colors hover:bg-surface-mid/[0.18] group relative rounded-none"
                >
                  <div className="space-y-3">
                    {/* Top Identity Row */}
                    <div className="flex items-start gap-3.5">
                      <div
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="relative shrink-0 cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-none border border-outline-var/60 hover:border-text-primary overflow-hidden bg-surface-mid flex items-center justify-center transition-colors">
                          {user.avatar ? (
                            <img src={user.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User size={20} className="text-outline" />
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-none border border-surface ${
                            user.isOnline ? 'bg-accent' : 'bg-outline-var'
                          }`}
                          title={user.isOnline ? 'Online' : 'Offline'}
                        />
                      </div>

                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            onClick={() => navigate(`/profile/${user.id}`)}
                            className="font-bold text-base text-text-primary group-hover:text-accent transition-colors truncate cursor-pointer font-outfit"
                          >
                            {user.name}
                          </h3>
                          {user.id === currentUser?.id && (
                            <span className="px-2 py-0.5 rounded-none font-mono text-[9px] font-bold uppercase bg-text-primary text-surface shrink-0">
                              YOU
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-text-muted line-clamp-1 mt-0.5 font-outfit">
                          {user.headline || 'Member'}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <ContrastBadge variant={user.role === 'PROFESSIONAL' ? 'ochre' : user.role === 'RECRUITER' ? 'ink' : 'subtle'}>
                            {user.role}
                          </ContrastBadge>
                          {user.verifiedSkillCount > 0 && (
                            <ContrastBadge variant="ink">
                              <CheckCircle2 size={10} /> {user.verifiedSkillCount} VERIFIED
                            </ContrastBadge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* College Badge */}
                    {user.college && (
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-outline bg-surface-mid/50 px-2.5 py-1.5 border border-outline-var/30">
                        <Building2 size={12} className="text-text-primary shrink-0" />
                        <span className="truncate">{user.college}</span>
                      </div>
                    )}

                    {/* Skill Tags Matrix */}
                    {user.topSkills && user.topSkills.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-outline select-none">
                          Attested Competencies:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {user.topSkills.map((sk) => (
                            <span
                              key={sk.id}
                              className={`px-2 py-0.5 rounded-none font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 border ${
                                sk.isVerified
                                  ? 'bg-accent/15 border-accent/40 text-accent font-bold'
                                  : 'bg-surface-mid border-outline-var/30 text-text-muted'
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
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-var/40">
                    {user.id === currentUser?.id ? (
                      <button
                        onClick={() => navigate(`/profile/${user.id}`)}
                        className="w-full py-2 bg-text-primary hover:bg-accent text-surface hover:text-text-primary font-mono font-bold text-xs uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <User size={13} /> View Your Dossier <ArrowRight size={12} />
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
                          className={`px-3 py-2 border font-mono font-bold text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                            user.isFollowing
                              ? 'bg-surface-mid border-outline-var/40 text-text-muted hover:border-[#8B3A3A] hover:text-[#8B3A3A]'
                              : 'bg-surface border-outline-var/60 text-text-primary hover:border-text-primary'
                          }`}
                          title={user.isFollowing ? 'Unfollow' : 'Follow'}
                        >
                          {user.isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
                        </button>
                        <button
                          onClick={() => navigate(`/chat/${user.id}`)}
                          className="flex-1 py-2 bg-surface-mid border border-outline-var/60 hover:border-text-primary text-text-primary font-mono font-bold text-xs uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare size={13} /> Message
                        </button>
                        <button
                          onClick={() => navigate(`/profile/${user.id}`)}
                          className="px-4 py-2 bg-text-primary hover:bg-accent text-surface hover:text-text-primary font-mono font-bold text-xs uppercase tracking-widest rounded-none transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Dossier <ArrowRight size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchUsers(true, nextCursor)}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-surface hover:bg-surface-mid border border-outline-var/60 hover:border-text-primary text-text-primary text-xs font-mono font-bold uppercase tracking-wider rounded-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? 'Loading roster records...' : 'Load More Directory Members [+]'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
