import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell, User, MessageSquare, Users, Award, Heart, CheckCheck,
  Sparkles, ArrowRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import NotificationAPI from '../../features/notifications/notificationAPI';

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getNotificationIcon(type) {
  switch (type) {
    case 'MESSAGE':
      return <MessageSquare size={13} className="text-primary" />;
    case 'SQUAD_APPLICATION':
    case 'SQUAD_ACCEPTED':
    case 'SQUAD_REJECTED':
    case 'MATCH_RECOMMENDED':
      return <Users size={13} className="text-accent" />;
    case 'SKILL_VERIFIED':
    case 'SKILL_ENDORSED':
      return <Award size={13} className="text-primary" />;
    case 'LIKE':
    case 'COMMENT':
    case 'COMMENT_REPLY':
      return <Heart size={13} className="text-error" />;
    default:
      return <Sparkles size={13} className="text-primary" />;
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ── Load Notifications & Count ──────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationAPI.getUnreadCount();
      setUnreadCount(Number(count) || 0);
    } catch {
      // Ignore
    }
  }, []);

  const fetchDropdownNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await NotificationAPI.getNotifications(null, 15);
      const items = res?.data || (Array.isArray(res) ? res : []);
      setNotifications(items);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket & Polling Lifecycle ────────────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('ss_token'),
      },
    });

    socket.on('NOTIFICATION', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notif.title || 'SkillSphere', {
            body: notif.message,
            icon: '/vite.svg',
          });
        } catch {
          // Ignore
        }
      }
    });

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchDropdownNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async (e) => {
    e?.stopPropagation();
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        NotificationAPI.markAsRead(notif.id).catch(() => {});
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setIsOpen(false);
      if (notif.type === 'FEEDBACK_RESPONSE') {
        setActiveFeedbackModal(notif);
        return;
      }
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div className="relative font-outfit" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="relative p-2 rounded-full border border-outline-var/40 hover:border-primary/40 text-outline hover:text-primary transition-colors focus:outline-none cursor-pointer"
          title="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-syne font-extrabold text-on-primary bg-primary rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-3 md:right-auto md:left-0 md:top-auto md:bottom-full md:mt-0 md:mb-3 w-80 md:w-96 bg-surface border border-outline-var/30 rounded-md shadow-2xl z-50 max-h-[28rem] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3 bg-surface-mid/80 border-b border-outline-var/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-primary" />
                <h3 className="font-syne text-xs font-extrabold tracking-wider text-text-primary uppercase">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-primary/10 text-primary border border-primary/20 text-[9px] font-syne font-bold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-primary hover:underline font-syne font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-outline-var/15">
              {loading ? (
                <div className="p-8 text-center text-outline text-xs animate-pulse">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-1">
                  <Sparkles size={24} className="mx-auto text-primary opacity-40 mb-2" />
                  <p className="text-xs font-bold text-text-primary">You&apos;re all caught up!</p>
                  <p className="text-[11px] text-outline">No new notifications right now.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 p-3.5 cursor-pointer transition-colors relative group ${
                      notif.isRead
                        ? 'bg-surface hover:bg-surface-mid/50 text-text-muted'
                        : 'bg-primary/5 hover:bg-primary/10 text-text-primary border-l-[3px] border-primary'
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
                        {notif.senderAvatar ? (
                          <img src={notif.senderAvatar} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <User size={14} className="text-[#656d84]" />
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface border border-outline-var/40 flex items-center justify-center shadow-xs">
                        {getNotificationIcon(notif.type)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-text-primary truncate">{notif.title}</p>
                        <span className="text-[10px] text-outline font-syne shrink-0">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed break-words mt-0.5 whitespace-pre-wrap">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer View All Link */}
            <div className="p-2.5 bg-surface-mid/80 border-t border-outline-var/20 text-center shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
                className="w-full py-1 text-xs font-syne font-bold text-primary hover:text-secondary-bright uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                View All Notifications <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback Response Full Reader Modal ── */}
      {activeFeedbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-surface border border-outline-var/40 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-var/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-sm text-text-primary uppercase tracking-wider">
                    {activeFeedbackModal.title || 'Official Team Response'}
                  </h3>
                  <span className="text-[10px] font-mono text-outline">
                    {new Date(activeFeedbackModal.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="p-1 rounded-xs hover:bg-surface-mid text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-surface-mid/80 border border-primary/25 rounded-md space-y-2">
              <div className="flex items-center gap-1.5 text-primary text-xs font-syne font-bold uppercase tracking-wider">
                <Sparkles size={13} /> Message from SkillSphere Core Team
              </div>
              <div className="text-xs sm:text-sm text-text-primary font-outfit leading-relaxed whitespace-pre-wrap pt-1">
                {activeFeedbackModal.message}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveFeedbackModal(null)}
                className="px-6 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
