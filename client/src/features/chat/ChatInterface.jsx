import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send, MessageSquare, User, Search, Plus,
  Check, CheckCheck, Trash2, Smile, X, ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { io } from 'socket.io-client';
import ChatAPI from './chatAPI';
import API from '../../api';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';
import { ContrastBadge, CrosshairAnchor } from '../../shared/components/EditorialUI';

function timeFormat(date) {
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

function _dateDivider(date) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatInterface({ user: propUser, onLogout }) {
  const { id: routeRecipientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const fallbackUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const currentUser = propUser || fallbackUser;

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileView, setMobileView] = useState(routeRecipientId ? 'chat' : 'list'); // 'list' | 'chat'
  const [loadingChat, setLoadingChat] = useState(!!routeRecipientId);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activeConversationRef = useRef(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Common quick emojis
  const quickEmojis = ['👍', '🔥', '🚀', '👏', '❤️', '💡', '🎉', '✅'];

  // ── Load Conversations List ───────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await ChatAPI.getConversations();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  // ── Initialize Socket Connection ──────────────────────────────────────────
  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('ss_token'),
      },
    });
    socketRef.current = socket;

    // Presence listeners
    socket.on('ONLINE_USERS_LIST', ({ userIds }) => {
      setOnlineUserIds(new Set(userIds || []));
    });

    socket.on('USER_ONLINE', ({ userId }) => {
      setOnlineUserIds((prev) => new Set([...prev, userId]));
    });

    socket.on('USER_OFFLINE', ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    // Real-time message receiver
    socket.on('RECEIVE_MESSAGE', (message) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // Update sidebar conversations preview in-memory
      setConversations((prevConvs) => {
        const existingIdx = prevConvs.findIndex((c) => c.id === message.conversationId);

        if (existingIdx !== -1) {
          const updated = [...prevConvs];
          const conv = updated[existingIdx];

          const isNotMe = message.senderId !== currentUser.id;
          const isChatOpen = activeConversationRef.current?.id === message.conversationId;
          const unreadCount = (isNotMe && !isChatOpen) ? (conv.unreadCount + 1) : conv.unreadCount;

          updated[existingIdx] = {
            ...conv,
            lastMessage: {
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              isRead: message.isRead,
              senderId: message.senderId,
            },
            unreadCount,
          };

          // Re-sort by last message timestamp (newest first)
          return updated.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        }

        // Fallback to API if it's a completely new conversation
        loadConversations();
        return prevConvs;
      });
    });

    // Typing listeners
    socket.on('TYPING_START', ({ conversationId: _conversationId, userId }) => {
      if (userId !== currentUser.id) {
        setIsTyping(true);
      }
    });

    socket.on('TYPING_STOP', ({ conversationId: _conversationId, userId }) => {
      if (userId !== currentUser.id) {
        setIsTyping(false);
      }
    });

    // Read receipts
    socket.on('MESSAGES_READ', ({ conversationId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.conversationId === conversationId ? { ...m, isRead: true } : m))
      );
    });

    // Message deleted
    socket.on('MESSAGE_DELETED', ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: '[Message deleted]' } : m))
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser.id, loadConversations]);

  // ── Parallelized Fast Load from URL Params ────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    if (routeRecipientId) {
      // Concurrently run startConversation AND getConversations in parallel!
      Promise.all([
        ChatAPI.startConversation(routeRecipientId).catch((err) => {
          console.error('Failed to start conversation:', err);
          return null;
        }),
        ChatAPI.getConversations().catch((err) => {
          console.error('Failed to load conversations:', err);
          return [];
        }),
      ]).then(([startRes, convsRes]) => {
        if (!isMounted) return;
        setLoadingChat(false);

        if (Array.isArray(convsRes)) {
          setConversations(convsRes);
        }

        if (startRes?.conversationId) {
          setActiveConversation(startRes.conversation);
          setActiveRecipient(startRes.conversation?.otherUser);
          setMobileView('chat');

          if (Array.isArray(startRes.messages)) {
            setMessages(startRes.messages);
          } else {
            ChatAPI.getMessages(startRes.conversationId).then((mRes) => {
              if (isMounted) setMessages(mRes?.messages || []);
            });
          }

          // Join socket room
          socketRef.current?.emit('JOIN_CONVERSATION', { conversationId: startRes.conversationId });

          // Mark read
          ChatAPI.markConversationRead(startRes.conversationId);
        }
      });
    } else {
      ChatAPI.getConversations()
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setConversations(data);
          }
        })
        .catch(console.error);
    }

    return () => {
      isMounted = false;
    };
  }, [routeRecipientId]);

  // ── Select a Conversation from Sidebar ────────────────────────────────────
  const selectConversation = async (conv) => {
    setActiveConversation(conv);
    setActiveRecipient(conv.otherUser);
    setMobileView('chat');

    // Join room
    socketRef.current?.emit('JOIN_CONVERSATION', { conversationId: conv.id });

    try {
      const res = await ChatAPI.getMessages(conv.id);
      setMessages(res?.messages || []);
      // Mark read in DB and broadcast via socket
      await ChatAPI.markConversationRead(conv.id);
      socketRef.current?.emit('MARK_READ', { conversationId: conv.id, senderId: conv.otherUser?.id });

      // Update sidebar badge
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err) {
      console.error('Failed to load messages for conversation:', err);
    }
  };

  // ── Auto-Scroll to Bottom on Message Changes ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!msgInput.trim() || !activeRecipient) return;

    const content = msgInput.trim();
    setMsgInput('');
    setShowEmojiPicker(false);

    // Emit stop typing
    socketRef.current?.emit('TYPING_STOP', {
      conversationId: activeConversation?.id,
      recipientId: activeRecipient.id,
    });

    // Send via socket
    socketRef.current?.emit('SEND_MESSAGE', {
      conversationId: activeConversation?.id,
      receiverId: activeRecipient.id,
      content,
    });
  };

  // ── Handle Typing Keystrokes ──────────────────────────────────────────────
  const handleInputChange = (e) => {
    setMsgInput(e.target.value);

    if (activeRecipient && socketRef.current) {
      socketRef.current.emit('TYPING_START', {
        conversationId: activeConversation?.id,
        recipientId: activeRecipient.id,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('TYPING_STOP', {
          conversationId: activeConversation?.id,
          recipientId: activeRecipient.id,
        });
      }, 2000);
    }
  };

  // ── Delete Message ────────────────────────────────────────────────────────
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await ChatAPI.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: '[Message deleted]' } : m))
      );
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete message.');
    }
  };

  // ── Start New Chat Modal Search ───────────────────────────────────────────
  const handleUserSearch = async (e) => {
    const q = e.target.value;
    setUserSearchQuery(q);
    if (q.trim().length > 1) {
      try {
        const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
        const found = (res.data?.data || res.data || []).filter((u) => u.id !== currentUser.id);
        setUserSearchResults(found);
      } catch {
        setUserSearchResults([]);
      }
    } else {
      setUserSearchResults([]);
    }
  };

  const handleStartChatWithUser = async (targetUser) => {
    setShowNewChatModal(false);
    setUserSearchQuery('');
    setUserSearchResults([]);

    try {
      const res = await ChatAPI.startConversation(targetUser.id);
      if (res?.conversationId) {
        navigate(`/chat/${targetUser.id}`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start conversation.');
    }
  };

  // Filtered conversations
  const filteredConversations = conversations.filter((c) =>
    c.otherUser?.name?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row overflow-hidden">
      <Navbar user={currentUser} onLogout={onLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 h-full max-h-full overflow-hidden flex min-h-0">
        {/* ── LEFT PANE: Conversations List ───────────────────────────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-surface border-r border-outline-var/50 flex flex-col h-full min-h-0 shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-outline-var/40 flex items-center justify-between bg-surface">
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-outline block select-none">
                SECURE TELEMETRY
              </span>
              <h2 className="font-syne font-bold text-base tracking-tight text-text-primary">
                Transmissions
              </h2>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="px-2.5 py-1.5 bg-text-primary hover:bg-accent text-surface hover:text-text-primary border border-text-primary rounded-none transition-colors flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              title="New Channel"
            >
              <Plus size={12} /> New Channel
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-outline-var/40 bg-surface">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-outline" />
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search transmission logs..."
                className="w-full bg-surface-mid/40 border border-outline-var/50 rounded-none py-1.5 pl-8 pr-3 text-xs text-text-primary outline-none focus:border-text-primary placeholder-outline font-outfit"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-outline-var/30">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-16 text-outline p-4">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                <p className="font-mono text-xs uppercase tracking-wider">No active channels</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3 text-accent font-mono text-xs uppercase tracking-wider font-bold hover:underline cursor-pointer"
                >
                  [ Open New Channel + ]
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const isOnline = onlineUserIds.has(conv.otherUser?.id) || conv.otherUser?.isOnline;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-surface-mid/90 border-l-4 border-l-text-primary'
                        : 'bg-surface hover:bg-surface-mid/40'
                    }`}
                  >
                    {/* Avatar with live online dot */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-none border border-outline-var/50 overflow-hidden bg-surface-mid flex items-center justify-center">
                        {conv.otherUser?.avatar ? (
                          <img src={conv.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-outline" />
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-none border border-surface ${
                          isOnline ? 'bg-accent' : 'bg-outline-var'
                        }`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-text-primary truncate font-outfit">
                          {conv.otherUser?.name || 'User'}
                        </span>
                        {conv.lastMessage?.createdAt && (
                          <span className="font-mono text-[10px] text-outline uppercase tracking-wider tabular-nums shrink-0 ml-1">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-text-muted truncate font-outfit">
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}${conv.lastMessage.content}`
                            : 'Channel established'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-text-primary text-surface font-mono font-bold text-[9px] rounded-none shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Active Chat Thread ──────────────────────────────── */}
        <div
          className={`flex-1 flex flex-col h-full min-h-0 bg-surface-mid/20 relative ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {loadingChat ? (
            /* ── Instant Loading Skeleton for Rapid Transition ─────────── */
            <div className="flex-1 min-h-0 flex flex-col h-full animate-pulse">
              <div className="p-3.5 bg-surface border-b border-outline-var/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-mid" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 bg-surface-mid" />
                    <div className="w-16 h-2.5 bg-surface-mid/60" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-4 md:p-6 space-y-4 overflow-y-auto">
                <div className="flex justify-start">
                  <div className="w-48 h-10 bg-surface border border-outline-var/30" />
                </div>
                <div className="flex justify-end">
                  <div className="w-56 h-12 bg-surface-mid border border-outline-var/40" />
                </div>
              </div>

              <div className="p-3 bg-surface border-t border-outline-var/40 shrink-0 mt-auto">
                <div className="w-full h-10 bg-surface-mid" />
              </div>
            </div>
          ) : activeRecipient ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 bg-surface border-b border-outline-var/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setMobileView('list');
                      if (routeRecipientId) navigate('/chat');
                    }}
                    className="md:hidden p-2 -ml-2 text-outline hover:text-text-primary active:scale-95 transition-transform"
                    aria-label="Back to transmissions"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-none border border-outline-var/60 overflow-hidden bg-surface-mid flex items-center justify-center">
                      {activeRecipient.avatar ? (
                        <img src={activeRecipient.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-outline" />
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-none border border-surface ${
                        onlineUserIds.has(activeRecipient.id) ? 'bg-accent' : 'bg-outline-var'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-primary tracking-tight font-outfit">
                        {activeRecipient.name}
                      </span>
                      {activeRecipient.role === 'PROFESSIONAL' && (
                        <ContrastBadge variant="ochre">
                          Pro
                        </ContrastBadge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-outline">
                      <span
                        className={`w-1.5 h-1.5 rounded-none ${
                          onlineUserIds.has(activeRecipient.id) ? 'bg-accent animate-pulse' : 'bg-outline-var'
                        }`}
                      />
                      <span>{onlineUserIds.has(activeRecipient.id) ? 'ONLINE TELEMETRY' : 'OFFLINE ARCHIVE'}</span>
                      {activeRecipient.college && <span>// {activeRecipient.college}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/profile/${activeRecipient.id}`)}
                  className="px-3.5 py-1.5 bg-surface-mid border border-outline-var/60 hover:border-text-primary text-text-primary font-mono text-[11px] font-bold uppercase tracking-wider rounded-none transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} /> Dossier
                </button>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 flex flex-col">
                {messages.length === 0 ? (
                  <div className="my-auto text-center py-12 text-outline font-outfit">
                    <MessageSquare size={36} className="mx-auto mb-2 text-outline opacity-40" />
                    <h4 className="font-mono text-xs uppercase tracking-widest text-text-primary font-bold">
                      TRANSMISSION CHANNEL READY
                    </h4>
                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto font-outfit">
                      Dispatch your first message to {activeRecipient.name} to initiate real-time peer dialogue.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.senderId === currentUser.id;
                    const isDeleted = m.content === '[Message deleted]';

                    return (
                      <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`max-w-[85%] md:max-w-[70%] space-y-1`}>
                          <div
                            className={`p-3.5 rounded-none text-sm leading-relaxed relative ${
                              isDeleted
                                ? 'bg-surface-mid/60 border border-outline-var/30 text-outline italic text-xs'
                                : isMe
                                ? 'bg-text-primary text-surface border border-text-primary'
                                : 'bg-surface border border-outline-var/60 text-text-primary'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words font-outfit">{m.content}</p>
                          </div>

                          <div className={`flex items-center gap-1.5 px-1 font-mono text-[10px] text-outline uppercase tracking-wider tabular-nums ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span>{timeFormat(m.createdAt)}</span>
                            {isMe && !isDeleted && (
                              <span title={m.isRead ? 'Read' : 'Delivered'}>
                                {m.isRead ? (
                                  <CheckCheck size={12} className="text-accent inline" />
                                ) : (
                                  <Check size={12} className="text-outline inline" />
                                )}
                              </span>
                            )}
                            {isMe && !isDeleted && (
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="opacity-0 group-hover:opacity-100 text-outline hover:text-[#8B3A3A] transition-opacity ml-1 cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing status */}
                {isTyping && (
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-outline italic py-1">
                    <span className="w-1.5 h-1.5 bg-accent animate-pulse" />
                    <span>{activeRecipient.name} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar */}
              <div className="p-3.5 bg-surface border-t border-outline-var/50 shrink-0 relative mt-auto pb-safe">
                {/* Quick emoji drawer */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-3 mb-2 p-2 bg-surface border border-outline-var/60 rounded-none shadow-2xl flex gap-1.5 z-20">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMsgInput((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 text-outline hover:text-text-primary transition-colors rounded-none border border-outline-var/50 bg-surface-mid cursor-pointer"
                    title="Quick Reactions"
                  >
                    <Smile size={16} />
                  </button>

                  <textarea
                    value={msgInput}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Dispatch transmission to ${activeRecipient.name}...`}
                    rows={1}
                    maxLength={2000}
                    className="flex-1 bg-surface-mid/40 border border-outline-var/50 focus:border-text-primary text-text-primary p-2.5 rounded-none text-sm outline-none resize-none max-h-32 placeholder-outline font-outfit"
                  />

                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="p-2.5 px-4 bg-text-primary text-surface rounded-none hover:bg-accent hover:text-text-primary disabled:opacity-40 transition-all font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                    title="Send Transmission"
                  >
                    <Send size={14} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-outline">
              <MessageSquare size={44} className="text-outline opacity-40 mb-3" />
              <h3 className="font-mono text-sm uppercase tracking-widest text-text-primary font-bold">
                Select a Transmission Channel
              </h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs leading-relaxed font-outfit">
                Choose an active session from the left directory or initiate a new peer dispatch.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-5 py-2.5 bg-text-primary text-surface font-mono font-bold text-xs uppercase tracking-widest rounded-none hover:bg-accent hover:text-text-primary transition-all cursor-pointer"
              >
                Initiate New Channel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── New Chat / User Search Modal ──────────────────────────────────── */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface border-t-2 border-text-primary border-x border-b border-outline-var/60 rounded-none p-6 shadow-2xl space-y-4 font-outfit">
            <div className="flex items-center justify-between pb-3 border-b border-outline-var/40">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-outline block select-none">
                  INITIATE CHANNEL
                </span>
                <h3 className="font-syne text-base font-bold text-text-primary tracking-tight">
                  New Transmission
                </h3>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="text-outline hover:text-text-primary font-mono text-xs uppercase cursor-pointer">
                [ Close × ]
              </button>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-outline" />
              <input
                value={userSearchQuery}
                onChange={handleUserSearch}
                placeholder="Search builder name, college, or role..."
                className="w-full bg-surface-mid/40 border border-outline-var/50 focus:border-text-primary text-text-primary p-2.5 pl-9 rounded-none text-xs outline-none placeholder-outline font-outfit"
                autoFocus
              />
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto divide-y divide-outline-var/30">
              {userSearchResults.length === 0 ? (
                <p className="text-center py-6 font-mono text-xs text-outline uppercase tracking-wider">
                  {userSearchQuery.trim() ? 'No builders matched query' : 'Type to search directory members...'}
                </p>
              ) : (
                userSearchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="flex items-center justify-between p-3 rounded-none bg-surface hover:bg-surface-mid cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-none overflow-hidden bg-surface-mid border border-outline-var/50 flex items-center justify-center">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <User size={15} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary font-outfit">{u.name}</div>
                        <div className="font-mono text-[10px] text-outline uppercase tracking-wider">{u.headline || u.college || u.role}</div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider">Connect →</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
