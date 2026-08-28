import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, User, MessageSquare, Users,
  Award, Heart, Sparkles, Check
} from 'lucide-react';
import NotificationAPI from '../features/notifications/notificationAPI';
import Navbar from '../shared/components/Navbar';
import { useToast, ToastContainer } from '../shared/components/Toast';

function _timeFormat(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getDateGroup(dateStr) {
  if (!dateStr) return 'Older';
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

function getNotificationIcon(type) {
  switch (type) {
    case 'MESSAGE':
      return <MessageSquare size={16} className="text-primary" />;
    case 'SQUAD_APPLICATION':
    case 'SQUAD_ACCEPTED':
    case 'SQUAD_REJECTED':
    case 'MATCH_RECOMMENDED':
      return <Users size={16} className="text-accent" />;
    case 'SKILL_VERIFIED':
    case 'SKILL_ENDORSED':
      return <Award size={16} className="text-primary" />;
    case 'LIKE':
    case 'COMMENT':
    case 'COMMENT_REPLY':
      return <Heart size={16} className="text-error" />;
    default:
      return <Sparkles size={16} className="text-primary" />;
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL | UNREAD | SQUAD | SKILL | MESSAGE | SOCIAL
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const tabs = [
    { id: 'ALL', label: 'All' },
    { id: 'UNREAD', label: 'Unread' },
    { id: 'SQUAD', label: 'Squads' },
    { id: 'SKILL', label: 'Skills' },
    { id: 'MESSAGE', label: 'Messages' },
    { id: 'SOCIAL', label: 'Social' },
  ];

  // ── Fetch Notifications ───────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (tab, cursor = null, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await NotificationAPI.getNotifications(cursor, 20, tab);
      const items = res?.data || (Array.isArray(res) ? res : []);
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setNextCursor(res?.nextCursor || null);
      setHasMore(!!res?.hasMore);
    } catch (err) {
      toast.error(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab, fetchNotifications]);

  // ── Mark Single As Read ───────────────────────────────────────────────────
  const handleMarkAsRead = async (notif, e) => {
    e?.stopPropagation();
    if (notif.isRead) return;
    try {
      await NotificationAPI.markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Ignore
    }
  };

  // ── Mark All Read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await NotificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message || 'Failed to mark all as read.');
    }
  };

  // ── Delete Single Notification ────────────────────────────────────────────
  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    try {
      await NotificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch (err) {
      toast.error(err.message || 'Failed to delete notification.');
    }
  };

  // ── Clear All Notifications ───────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await NotificationAPI.clearAll();
      setNotifications([]);
      toast.success('Notifications cleared');
    } catch (err) {
      toast.error(err.message || 'Failed to clear notifications.');
    }
  };

  // ── Navigate on Notification Click ────────────────────────────────────────
  const handleItemClick = (notif) => {
    if (!notif.isRead) {
      NotificationAPI.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  // ── Group notifications by date ───────────────────────────────────────────
  const groupedNotifications = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    notifications.forEach((n) => {
      const g = getDateGroup(n.createdAt);
      if (groups[g]) groups[g].push(n);
      else groups.Earlier.push(n);
    });
    return groups;
  }, [notifications]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={() => {}} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-var/20">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={22} className="text-primary" />
              <h1 className="text-2xl font-syne font-extrabold text-text-primary tracking-tight">
                Notifications
              </h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Stay updated on your squads, skill verifications, direct messages, and network activities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-surface border border-outline-var/30 hover:border-primary/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCheck size={14} className="text-primary" /> Mark All Read
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-surface border border-outline-var/30 hover:border-error/40 text-outline hover:text-error text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-outline-var/20">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xs font-syne text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  active
                    ? 'bg-primary text-on-primary shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-surface hover:bg-surface-mid text-text-muted hover:text-text-primary border border-outline-var/25'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications Grouped List */}
        {loading ? (
          <div className="py-20 text-center text-outline text-xs animate-pulse">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center bg-surface border border-outline-var/20 rounded-md p-8">
            <Sparkles size={36} className="mx-auto text-primary opacity-40 mb-3" />
            <h3 className="text-base font-extrabold text-text-primary">No Notifications Here</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              You are completely up to date with your notifications for this category.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotifications).map(([groupName, items]) => {
              if (items.length === 0) return null;

              return (
                <div key={groupName} className="space-y-2">
                  <h3 className="text-[11px] font-syne font-bold uppercase tracking-widest text-outline px-1">
                    {groupName}
                  </h3>

                  <div className="bg-surface border border-outline-var/20 rounded-md divide-y divide-outline-var/15 overflow-hidden">
                    {items.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleItemClick(notif)}
                        className={`flex items-start gap-4 p-4 cursor-pointer transition-colors relative group ${
                          notif.isRead
                            ? 'bg-surface hover:bg-surface-mid/50 text-text-muted'
                            : 'bg-primary/5 hover:bg-primary/10 text-text-primary border-l-4 border-primary'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
                            {notif.senderAvatar ? (
                              <img src={notif.senderAvatar} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <User size={18} className="text-outline" />
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border border-outline-var/40 flex items-center justify-center shadow-xs">
                            {getNotificationIcon(notif.type)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-bold text-text-primary">{notif.title}</h4>
                            <span className="text-[10px] text-outline font-syne shrink-0">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-text-muted leading-relaxed mt-1 break-words">
                            {notif.message}
                          </p>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          {!notif.isRead && (
                            <button
                              onClick={(e) => handleMarkAsRead(notif, e)}
                              className="p-1.5 text-outline hover:text-primary hover:bg-surface rounded-xs transition-colors"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(notif.id, e)}
                            className="p-1.5 text-outline hover:text-error hover:bg-surface rounded-xs transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  onClick={() => fetchNotifications(activeTab, nextCursor, true)}
                  disabled={loadingMore}
                  className="px-5 py-2 bg-surface hover:bg-surface-mid border border-outline-var/30 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Loading more...' : 'Load Older Notifications'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
