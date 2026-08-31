import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search, Users, Layers, MessageSquare,
  ArrowRight, Building2,
  Sparkles, AlertCircle, Bookmark, ChevronRight
} from 'lucide-react';
import Navbar from '../shared/components/Navbar';
import SearchAPI from '../features/search/searchAPI';
import { useToast, ToastContainer } from '../shared/components/Toast';

export default function SearchPage({ user: propUser, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';

  const [inputVal, setInputVal] = useState(queryParam);
  const [results, setResults] = useState({ users: [], squads: [], posts: [] });
  const [trending, setTrending] = useState({ skills: [], squads: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentUser = propUser || useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const res = await SearchAPI.getTrending();
      if (res) setTrending(res);
    } catch (err) {
      console.error('Failed to load trending data', err);
    }
  }, []);

  const executeSearch = useCallback(async () => {
    if (!queryParam.trim()) {
      setResults({ users: [], squads: [], posts: [] });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await SearchAPI.search({ q: queryParam, type: typeParam });
      if (res) {
        setResults({
          users: res.users || [],
          squads: res.squads || [],
          posts: res.posts || []
        });
      }
    } catch {
      setError('Search query timed out or failed to parse. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [queryParam, typeParam]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    setInputVal(queryParam);
  }, [queryParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    // Save search query in local storage history
    try {
      const history = JSON.parse(localStorage.getItem('ss_search_history') || '[]');
      const filtered = history.filter(h => h !== inputVal.trim());
      localStorage.setItem('ss_search_history', JSON.stringify([inputVal.trim(), ...filtered].slice(0, 8)));
    } catch (err) {
      console.error(err);
    }

    setSearchParams({ q: inputVal.trim(), type: typeParam });
  };

  const handleTabChange = (tabId) => {
    setSearchParams({ q: queryParam, type: tabId });
  };

  // Text highlighting helper
  const highlightText = useCallback((text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/20 text-primary font-semibold px-0.5 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Search & Results */}
        <div className="lg:col-span-8 space-y-6">
          {/* Search bar inside results page */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-outline" size={16} />
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search matching peers, squad goals, or platform feed posts..."
                className="w-full p-3.5 pl-11 bg-surface border border-outline-var/30 rounded-xs text-xs text-text-primary outline-none focus:border-primary/50 transition-colors shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-colors shadow-md shadow-primary/10"
            >
              Search
            </button>
          </form>

          {/* Results Tab Navigation */}
          {queryParam && (
            <div className="flex items-center gap-2 border-b border-outline-var/20 pb-1.5">
              {[
                { id: 'all', label: 'All Results' },
                { id: 'users', label: 'People' },
                { id: 'squads', label: 'Squads' },
                { id: 'posts', label: 'Posts' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-xs font-syne text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    typeParam === tab.id
                      ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/10'
                      : 'bg-surface-mid/60 border-outline-var/30 text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Search Results Display */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-surface border border-outline-var/20 rounded-md">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="font-syne text-xs uppercase tracking-widest text-text-muted">Filtering matches...</span>
            </div>
          )}

          {!queryParam && !loading && (
            <div className="text-center py-16 bg-surface border border-outline-var/20 rounded-md p-8 space-y-4 shadow-sm">
              <Sparkles size={40} className="mx-auto text-primary opacity-50" />
              <div className="space-y-1">
                <h3 className="font-syne font-extrabold text-sm uppercase text-text-primary">Discover SkillSphere</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Search for top technical competencies, browse hackathon squads, or catch up with peer portfolio launches.
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-surface border border-error/30 rounded-md p-6 flex items-center gap-3">
              <AlertCircle className="text-error" size={24} />
              <p className="text-xs text-text-muted">{error}</p>
            </div>
          )}

          {queryParam && !loading && !error && (
            <div className="space-y-6">
              {/* Users Results */}
              {(typeParam === 'all' || typeParam === 'users') && (
                <div className="space-y-3">
                  {(typeParam !== 'all' || results.users.length > 0) && (
                    <h3 className="font-syne font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Users size={14} /> Matching People ({results.users.length})
                    </h3>
                  )}
                  {results.users.length === 0 && typeParam === 'users' && (
                    <p className="text-xs text-text-muted italic bg-surface p-6 border border-outline-var/20 rounded-md text-center">No people match your query.</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.users.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => navigate(`/profile/${u.id}`)}
                        className="bg-surface border border-outline-var/20 hover:border-primary/40 rounded-md p-4 flex items-center gap-3 cursor-pointer transition-all group hover:shadow-md"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30 flex items-center justify-center font-bold text-primary font-syne shrink-0">
                          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name?.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors truncate">
                            {highlightText(u.name, queryParam)}
                          </h4>
                          <p className="text-[10px] text-text-muted truncate mt-0.5">
                            {u.headline ? highlightText(u.headline, queryParam) : 'Platform Member'}
                          </p>
                          {u.college && (
                            <div className="flex items-center gap-1 text-[9px] text-outline mt-1 truncate">
                              <Building2 size={10} />
                              <span>{u.college}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-outline shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Squads Results */}
              {(typeParam === 'all' || typeParam === 'squads') && (
                <div className="space-y-3">
                  {(typeParam !== 'all' || results.squads.length > 0) && (
                    <h3 className="font-syne font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <Layers size={14} /> Matching Squads ({results.squads.length})
                    </h3>
                  )}
                  {results.squads.length === 0 && typeParam === 'squads' && (
                    <p className="text-xs text-text-muted italic bg-surface p-6 border border-outline-var/20 rounded-md text-center">No squads match your query.</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.squads.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => navigate(`/squad/${s.id}`)}
                        className="bg-surface border border-outline-var/20 hover:border-primary/40 rounded-md p-4 flex flex-col justify-between cursor-pointer transition-all group hover:shadow-md space-y-2.5"
                      >
                        <div>
                          <h4 className="font-bold text-xs text-text-primary group-hover:text-primary transition-colors truncate">
                            {highlightText(s.title, queryParam)}
                          </h4>
                          <p className="text-[10px] text-text-muted line-clamp-2 mt-1 leading-relaxed">
                            {highlightText(s.description, queryParam)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-outline pt-2 border-t border-outline-var/15 font-syne">
                          <span className="uppercase tracking-wider">Status: {s.status}</span>
                          <span className="flex items-center gap-1">
                            <Users size={10} /> {s.currentMembers}/{s.maxMembers} Members
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Results */}
              {(typeParam === 'all' || typeParam === 'posts') && (
                <div className="space-y-3">
                  {(typeParam !== 'all' || results.posts.length > 0) && (
                    <h3 className="font-syne font-bold text-xs uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                      <MessageSquare size={14} /> Matching Feed Posts ({results.posts.length})
                    </h3>
                  )}
                  {results.posts.length === 0 && typeParam === 'posts' && (
                    <p className="text-xs text-text-muted italic bg-surface p-6 border border-outline-var/20 rounded-md text-center">No posts match your query.</p>
                  )}
                  <div className="space-y-3">
                    {results.posts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-surface border border-outline-var/20 rounded-md p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30 flex items-center justify-center font-bold text-primary font-syne">
                            {p.userAvatar ? <img src={p.userAvatar} alt="" className="w-full h-full object-cover" /> : p.userName?.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-text-primary">{p.userName || 'Anonymous'}</div>
                            <div className="text-[9px] text-outline font-mono">{new Date(p.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
                          {highlightText(p.content, queryParam)}
                        </p>
                        {p.imageUrl && (
                          <div className="border border-outline-var/20 rounded-xs overflow-hidden max-h-60 bg-surface-mid">
                            <img src={p.imageUrl} alt="" className="w-full h-full object-contain" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Trending section */}
        <div className="lg:col-span-4 space-y-6">
          {/* Trending Skills */}
          <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-3 shadow-sm">
            <h3 className="font-syne font-bold text-[10px] uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles size={13} /> Trending platform Skills
            </h3>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Based on verification rates and skill updates across active builders this week.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {trending.skills.length === 0 ? (
                <span className="text-[10px] text-outline italic">No trending skills found.</span>
              ) : (
                trending.skills.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => {
                      setInputVal(skill);
                      setSearchParams({ q: skill, type: typeParam });
                    }}
                    className="px-2 py-0.5 bg-surface-mid hover:bg-primary/20 border border-outline-var/20 text-[10px] font-syne rounded-xs text-text-muted hover:text-primary hover:border-primary transition-colors"
                  >
                    {skill}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Hot Squads */}
          <div className="bg-surface border border-outline-var/20 rounded-md p-5 space-y-3 shadow-sm">
            <h3 className="font-syne font-bold text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <Bookmark size={13} className="text-secondary-bright" /> Hot Squad Missions
            </h3>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Squads receiving the highest application density this week.
            </p>
            <div className="space-y-2.5">
              {trending.squads.length === 0 ? (
                <span className="text-[10px] text-outline italic">No active squads trending.</span>
              ) : (
                trending.squads.slice(0, 3).map((sq) => (
                  <div
                    key={sq.id}
                    onClick={() => navigate(`/squad/${sq.id}`)}
                    className="p-3 bg-surface-mid hover:border-primary/30 border border-outline-var/20 rounded-xs cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate block">
                        {sq.title}
                      </span>
                      <span className="text-[9px] text-outline font-syne block mt-0.5">
                        {sq.currentMembers}/{sq.maxMembers} spots filled
                      </span>
                    </div>
                    <ArrowRight size={13} className="text-outline shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
