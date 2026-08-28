import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, BarChart2, Users, Layers, 
  User, LogOut, LayoutDashboard, MessageSquare, Shield, Search,
  HelpCircle, Sparkles
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import DashboardChat from '../../features/chat/DashboardChat';
import SearchAPI from '../../features/search/searchAPI';
import OnboardingGuide from './OnboardingGuide';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timerRef = useRef(null);

  // Load search history safely using a lazy initializer
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ss_search_history') || '[]');
    } catch {
      return [];
    }
  });

  // Handle autocomplete suggestions debouncing in the input handler directly
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!val.trim()) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const list = await SearchAPI.getSuggestions(val);
        setSuggestions(list);
      } catch (err) {
        console.error(err);
      }
    }, 200);
  };

  // Cleanup autocomplete timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Save to history
    const history = [searchQuery.trim(), ...recentSearches.filter(t => t !== searchQuery.trim())].slice(0, 8);
    setRecentSearches(history);
    localStorage.setItem('ss_search_history', JSON.stringify(history));

    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleRecentSearchClick = (term) => {
    setSearchQuery(term);
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const handleSuggestionClick = (item) => {
    setSearchQuery(item.text);
    setShowSuggestions(false);
    if (item.type === 'user') {
      navigate(`/profile/${item.id}`);
    } else {
      navigate(`/squad/${item.id}`);
    }
  };

  const removeRecentSearch = (term) => {
    const history = recentSearches.filter(t => t !== term);
    setRecentSearches(history);
    localStorage.setItem('ss_search_history', JSON.stringify(history));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('ss_search_history');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Insights', path: '/grid', icon: BarChart2 },
    { name: 'Network', path: '/network', icon: Users },
    { name: 'Teams', path: '/nexus', icon: Layers },
    { name: 'Chat', path: 'chat_drawer', icon: MessageSquare },
    { name: 'Profile', path: '/my-profile', icon: User },
    ...(user?.role === 'ADMIN' ? [{ name: 'Admin', path: '/admin', icon: Shield }] : []),
  ];

  const handleNavigate = (path) => {
    if (path === 'chat_drawer') {
      setIsChatOpen(true);
    } else {
      navigate(path);
    }
    setIsOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* ── Mobile Top Header ── */}
      <div className="md:hidden flex justify-between items-center p-4 bg-bg-base border-b border-outline-var/30 fixed top-0 w-full z-40">
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer font-syne font-extrabold text-xl text-text-primary tracking-tight">
          <img src="/logo.jpg" className="w-6 h-6 rounded-sm object-cover" alt="" />
          Skill<span className="text-primary">Sphere</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button onClick={() => setIsOpen(true)} className="text-text-primary">
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <nav className="hidden md:flex flex-col w-64 h-screen fixed inset-y-0 left-0 bg-bg-sidebar border-r border-outline-var/30 z-50 shadow-2xl">
        
        {/* Logo Section */}
        <div 
          onClick={() => navigate('/')} 
          className="cursor-pointer p-6 border-b border-outline-var/20 flex items-center gap-2"
        >
          <img src="/logo.jpg" className="w-8 h-8 rounded-sm object-cover border border-outline-var/20" alt="SkillSphere Logo" />
          <span className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
            Skill<span className="text-primary">Sphere</span>
          </span>
        </div>

        {/* Global Search Bar (Desktop Sidebar) */}
        <div className="px-4 py-3 border-b border-outline-var/20 relative search-container">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-outline" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search matching peers..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-1.5 pl-8 pr-2.5 text-xs text-text-primary outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </form>

          {/* Autocomplete suggestions & Recent search history */}
          {showSuggestions && (searchQuery.trim() || recentSearches.length > 0) && (
            <div className="absolute left-4 right-4 mt-1 bg-surface border border-outline-var/30 rounded-xs shadow-2xl z-[300] max-h-56 overflow-y-auto font-outfit">
              {/* Autocomplete Suggestions */}
              {searchQuery.trim() && suggestions.length > 0 && (
                <div className="p-1 border-b border-outline-var/20">
                  <div className="text-[9px] font-syne font-bold uppercase tracking-wider text-outline px-2 py-1">
                    Suggestions
                  </div>
                  {suggestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSuggestionClick(item)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-xs hover:bg-surface-mid cursor-pointer transition-colors text-xs text-text-primary"
                    >
                      {item.type === 'user' ? (
                        <div className="w-4 h-4 rounded-full bg-primary/25 overflow-hidden flex items-center justify-center shrink-0">
                          {item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : <User size={10} />}
                        </div>
                      ) : (
                        <Layers size={11} className="text-primary shrink-0" />
                      )}
                      <span className="truncate">{item.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-1">
                  <div className="text-[9px] font-syne font-bold uppercase tracking-wider text-outline px-2 py-1 flex items-center justify-between">
                    <span>Recent Searches</span>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[8px] hover:text-error lowercase transition-colors font-semibold"
                    >
                      clear
                    </button>
                  </div>
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => handleRecentSearchClick(term)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-xs hover:bg-surface-mid cursor-pointer transition-colors text-xs text-text-muted hover:text-text-primary"
                    >
                      <span className="truncate">{term}</span>
                      <button
                        type="button"
                        className="text-outline hover:text-error cursor-pointer shrink-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentSearch(term);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-syne font-bold tracking-widest uppercase text-outline mb-4 px-2">Workspace</div>
          
          {navLinks.map((link) => {
            const active = isActive(link.path);
            return (
              <div
                key={link.path}
                onClick={() => handleNavigate(link.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-all duration-200 group ${
                  active 
                    ? 'bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                    : 'hover:bg-surface border border-transparent hover:border-outline-var/30'
                }`}
              >
                <link.icon 
                  size={18} 
                  className={`transition-colors ${active ? 'text-primary' : 'text-outline group-hover:text-primary-dim'}`} 
                />
                <span className={`text-sm font-semibold tracking-wide ${active ? 'text-text-primary' : 'text-text-muted group-hover:text-text-primary'}`}>
                  {link.name}
                </span>
                
                {/* Active Indicator Line */}
                {active && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-primary rounded-r-md" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Section */}
        <div className="p-4 border-t border-outline-var/30 bg-surface-mid/30">
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-surface cursor-pointer transition-colors" onClick={() => navigate('/my-profile')}>
            <div className="w-10 h-10 rounded-full bg-surface border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || "User Avatar"} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-text-primary truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-primary font-syne uppercase tracking-wider truncate">{user?.role || 'Member'}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3 px-2">
            <div className="flex items-center gap-1.5">
              <NotificationBell />
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('open-ss-guide'))}
                className="p-1.5 rounded-md hover:bg-surface text-text-muted hover:text-[#6D28D9] transition-colors flex items-center gap-1 text-[11px] font-syne font-bold uppercase tracking-wider cursor-pointer"
                title="Platform Quick Guide"
                aria-label="Platform Quick Guide"
              >
                <HelpCircle size={16} />
              </button>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-md hover:bg-error-container/20 text-text-muted hover:text-error transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Sidebar Overlay & Backdrop ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden bg-bg-sidebar border-r border-outline-var/30 flex flex-col w-3/4 max-w-xs shadow-2xl"
            >
            <div className="p-4 border-b border-outline-var/20 flex justify-between items-center">
               <span className="font-syne font-extrabold text-xl text-text-primary tracking-tight">
                Skill<span className="text-primary">Sphere</span>
              </span>
              <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navLinks.map((link) => (
                <div
                  key={link.path}
                  onClick={() => handleNavigate(link.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface hover:text-text-primary'
                  }`}
                >
                  <link.icon size={20} />
                  <span className="font-semibold">{link.name}</span>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-outline-var/30 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new Event('open-ss-guide'));
                }}
                className="w-full flex justify-center items-center gap-2 py-2 rounded-xs border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9] font-syne text-xs uppercase tracking-widest font-bold hover:bg-[#EDE9FE] transition-colors"
              >
                <Sparkles size={14} /> Quick Guide
              </button>
              <button onClick={() => { onLogout(); setIsOpen(false); }} className="w-full flex justify-center items-center gap-2 py-2.5 rounded border border-error-container bg-error-container/10 text-error font-syne text-xs uppercase tracking-widest font-bold">
                <LogOut size={14} /> Logout
              </button>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DashboardChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <OnboardingGuide />
    </>
  );
};

export default Navbar;