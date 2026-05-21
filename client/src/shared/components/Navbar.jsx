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

      {/* Mobile Menu Overlay - Nexus Portal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 40px) 40px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 40px) 40px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 80 }}
            className="fixed inset-0 bg-[#0b1326] z-[60] md:hidden overflow-hidden flex flex-col"
          >
            {/* Animated Background Aurora */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#adc6ff]/20 blur-[120px] rounded-full animate-pulse" />
              <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-[#6bd8cb]/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col h-full p-8 pt-20">
              
              {/* Close Button - Large & Morphing-style */}
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-3 text-[#dae2fd] hover:text-[#ffb4ab] transition-colors bg-[#171f33]/50 rounded-full border border-[#434655]/30"
              >
                <X size={32} />
              </button>

              {/* Core Identity Node */}
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center text-center mb-12"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full border border-[#adc6ff]/30 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute -inset-1 rounded-full border border-[#6bd8cb]/20 animate-[spin_15s_linear_infinite_reverse]" />
                  <div className="w-24 h-28 rounded-full border-2 border-[#adc6ff]/50 overflow-hidden bg-[#171f33] p-1">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#adc6ff]">
                        <User size={40} />
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="mt-4 text-2xl font-black text-[#dae2fd] tracking-tighter">{user?.name}</h3>
                <span className="text-[10px] font-['Space_Grotesk'] font-bold tracking-[0.2em] uppercase text-[#8d90a0] mt-1">{user?.role}</span>
              </motion.div>

              {/* Floating Grid Navigation */}
              <div className="grid grid-cols-2 gap-4 flex-grow">
                {navLinks.map((link, i) => (
                  <motion.button
                    key={link.path}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => handleNavigate(link.path)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all ${
                      isActive(link.path)
                        ? 'bg-[#adc6ff]/10 border-[#adc6ff]/40 text-[#adc6ff] shadow-[0_0_20px_rgba(173,198,255,0.15)]'
                        : 'bg-[#171f33]/40 border-[#434655]/30 text-[#8d90a0] hover:border-[#adc6ff]/30'
                    }`}
                  >
                    <link.icon size={28} className="mb-3" />
                    <span className="font-['Space_Grotesk'] font-bold text-xs uppercase tracking-widest">{link.name}</span>
                  </motion.button>
                ))}
              </div>

              {/* System Footer */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 pt-6 border-t border-[#434655]/30 flex justify-between items-center"
              >
                <div onClick={() => handleNavigate('/')} className="cursor-pointer">
                  <span className="font-extrabold text-[#dae2fd]">Skill<span className="text-[#adc6ff]">Sphere</span></span>
                </div>
                <button
                  onClick={() => { onLogout(); setIsOpen(false); }}
                  className="flex items-center gap-2 text-red-400 font-bold uppercase text-[10px] tracking-widest"
                >
                  Terminate Session <LogOut size={14} />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DashboardChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </nav>
  );
};

export default Navbar;