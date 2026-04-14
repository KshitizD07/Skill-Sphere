import { useState, useEffect, useRef } from 'react';
import { Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    API.get('/notifications').then(res => setNotifications(res.data)).catch(console.error);

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      auth: { token }
    });

    socket.on('NOTIFICATION', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await API.patch(`/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
      setIsOpen(false);
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-full border border-[#434655]/40 hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-colors"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1 text-[8px] font-bold leading-none text-[#002e6a] transform translate-x-1/4 -translate-y-1/4 bg-[#adc6ff] rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#131b2e] border border-[#434655]/40 rounded-md shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-[#434655]/30">
            <h3 className="font-['Space_Grotesk'] text-[10px] font-bold tracking-[0.1em] text-[#8d90a0] uppercase">Notifications</h3>
          </div>
          <div className="p-2 space-y-1">
            {notifications.length === 0 ? (
              <p className="p-4 text-xs text-[#8d90a0] text-center italic">No new notifications</p>
            ) : (
              notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`flex gap-3 p-3 rounded-xs cursor-pointer transition-colors ${notif.isRead ? 'opacity-60 hover:bg-[#171f33]' : 'bg-[#171f33] border-l-[3px] border-[#adc6ff]'}`}
                >
                  <div className="w-8 h-8 rounded-full border border-[#434655]/40 overflow-hidden bg-[#222a3d] shrink-0 flex items-center justify-center">
                    {notif.senderAvatar ? (
                      <img src={notif.senderAvatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <User size={14} className="text-[#656d84]" />
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#dae2fd] mb-0.5">{notif.title}</p>
                    <p className="text-[10px] text-[#c3c6d7] leading-relaxed break-words">{notif.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
