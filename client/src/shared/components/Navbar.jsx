import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, BarChart2, Users, Layers, ShieldCheck, 
  User, LogOut, LayoutDashboard, Bell, MessageSquare
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
    <nav className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-[#434655]/30 pb-5 relative z-50">
      {/* Logo */}
      <div onClick={() => navigate('/')} className="cursor-pointer group flex items-center gap-2">
        <span className="text-xl font-extrabold text-[#dae2fd] group-hover:text-[#adc6ff] transition-colors tracking-tight">
          Skill<span className="text-[#adc6ff] group-hover:text-[#89f5e7]">Sphere</span>
        </span>
      </div>

      {/* Desktop Links - Centralized */}
      <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-8">
        {navLinks.slice(1, 4).map((link) => (
          <div
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <link.icon 
              size={18} 
              className={`transition-colors ${isActive(link.path) ? 'text-[#adc6ff]' : 'text-[#656d84] group-hover:text-[#89f5e7]'}`} 
            />
            <span className={`text-lg font-bold tracking-tight transition-colors ${isActive(link.path) ? 'text-[#dae2fd]' : 'text-[#8d90a0] group-hover:text-[#dae2fd]'}`}>
              {link.name}
            </span>
          </div>
        ))}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        <NotificationBell />
        
        {/* Desktop Logout/Profile */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate('/my-profile')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-[#adc6ff]/20 bg-[#171f33] hover:border-[#adc6ff]/50 transition-all overflow-hidden"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-[#adc6ff]" />
            )}
          </button>
          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2 text-[#dae2fd] hover:bg-[#171f33] rounded-lg transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-[280px] bg-[#0b1326] border-l border-[#434655]/30 z-[70] p-6 shadow-2xl md:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-10">
                  <span className="text-xl font-bold text-[#dae2fd]">Menu</span>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-[#8d90a0]">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-2 flex-grow">
                  {navLinks.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => handleNavigate(link.path)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isActive(link.path) 
                          ? 'bg-[#adc6ff]/10 text-[#adc6ff] border border-[#adc6ff]/20' 
                          : 'text-[#8d90a0] hover:bg-[#171f33] hover:text-[#dae2fd]'
                      }`}
                    >
                      <link.icon size={22} />
                      <span className="text-lg font-semibold">{link.name}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-6 border-t border-[#434655]/30 mt-auto">
                  <div className="flex items-center gap-4 mb-6 p-2">
                    <div className="w-12 h-12 rounded-full border border-[#adc6ff]/20 overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#171f33]">
                          <User size={24} className="text-[#adc6ff]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[#dae2fd] truncate w-32">{user?.name}</span>
                      <span className="text-xs text-[#8d90a0]">{user?.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { onLogout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
                  >
                    <LogOut size={22} />
                    <span className="text-lg font-semibold">Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DashboardChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </nav>
  );
};

export default Navbar;