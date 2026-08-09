import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, BarChart2, Users, Layers, 
  User, LogOut, LayoutDashboard, MessageSquare
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import DashboardChat from '../../features/chat/DashboardChat';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Insights', path: '/grid', icon: BarChart2 },
    { name: 'Network', path: '/network', icon: Users },
    { name: 'Teams', path: '/nexus', icon: Layers },
    { name: 'Chat', path: 'chat_drawer', icon: MessageSquare },
    { name: 'Profile', path: '/my-profile', icon: User },
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
        <div onClick={() => navigate('/')} className="font-syne font-extrabold text-xl text-text-primary tracking-tight">
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
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Layers size={18} className="text-primary" />
          </div>
          <span className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
            Skill<span className="text-primary">Sphere</span>
          </span>
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
            <NotificationBell />
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

      {/* ── Mobile Sidebar Overlay ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 md:hidden bg-bg-sidebar border-r border-outline-var/30 flex flex-col w-3/4 max-w-xs shadow-2xl"
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
            
            <div className="p-4 border-t border-outline-var/30">
              <button onClick={() => { onLogout(); setIsOpen(false); }} className="w-full flex justify-center items-center gap-2 py-2.5 rounded border border-error-container bg-error-container/10 text-error font-syne text-xs uppercase tracking-widest font-bold">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
};

export default Navbar;