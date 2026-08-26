import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send, ArrowLeft, MessageSquare, User, Search, Plus,
  Check, CheckCheck, Trash2, Smile, X, Circle, ExternalLink,
  ChevronLeft, Loader2
} from 'lucide-react';
import { io } from 'socket.io-client';
import ChatAPI from './chatAPI';
import API from '../../api';
import Navbar from '../../shared/components/Navbar';
import { useToast, ToastContainer } from '../../shared/components/Toast';

function timeFormat(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateDivider(date) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatInterface() {
  const { id: routeRecipientId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);

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
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

      // Update sidebar conversations preview
      loadConversations();
    });

    // Typing listeners
    socket.on('TYPING_START', ({ conversationId, userId }) => {
      if (userId !== currentUser.id) {
        setIsTyping(true);
      }
    });

    socket.on('TYPING_STOP', ({ conversationId, userId }) => {
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

  // ── Load Conversation or Target User from URL Params ──────────────────────
  useEffect(() => {
    loadConversations();

    if (routeRecipientId) {
      // Find or initialize chat with route recipient
      ChatAPI.startConversation(routeRecipientId)
        .then((res) => {
          if (res?.conversationId) {
            setActiveConversation(res.conversation);
            setActiveRecipient(res.conversation?.otherUser);
            setMobileView('chat');
            // Join socket room
            socketRef.current?.emit('JOIN_CONVERSATION', { conversationId: res.conversationId });

            // Fetch message history
            ChatAPI.getMessages(res.conversationId).then((mRes) => {
              setMessages(mRes?.messages || []);
            });
            // Mark read
            ChatAPI.markConversationRead(res.conversationId);
          }
        })
        .catch(console.error);
    }
  }, [routeRecipientId, loadConversations]);

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
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={() => {}} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 h-screen overflow-hidden flex">
        {/* ── LEFT PANE: Conversations List ───────────────────────────────── */}
        <div
          className={`w-full md:w-80 lg:w-96 bg-surface border-r border-outline-var/30 flex flex-col h-full shrink-0 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-outline-var/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              <h2 className="font-syne font-extrabold text-base tracking-tight text-text-primary">Messages</h2>
            </div>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 rounded-xs transition-all flex items-center gap-1 text-xs font-syne font-bold uppercase tracking-wider"
              title="New Message"
            >
              <Plus size={14} /> New Chat
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-outline-var/20">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-outline" />
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-surface-mid border border-outline-var/30 rounded-xs py-1.5 pl-8 pr-3 text-xs text-text-primary outline-none focus:border-primary/50 placeholder-outline-var font-outfit"
              />
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-outline">
                <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-syne uppercase tracking-wider">No active conversations</p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-3 text-primary text-xs font-bold hover:underline"
                >
                  Start a conversation
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
                    className={`flex items-center gap-3 p-3 rounded-xs cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-surface-mid/40 hover:bg-surface-mid border-outline-var/20 hover:border-outline-var/40'
                    }`}
                  >
                    {/* Avatar with live online dot */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
                        {conv.otherUser?.avatar ? (
                          <img src={conv.otherUser.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User size={18} className="text-[#656d84]" />
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface ${
                          isOnline ? 'bg-secondary-bright' : 'bg-outline-var'
                        }`}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-text-primary truncate">
                          {conv.otherUser?.name || 'User'}
                        </span>
                        {conv.lastMessage?.createdAt && (
                          <span className="text-[10px] text-outline font-syne shrink-0 ml-1">
                            {timeAgo(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-text-muted truncate">
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderId === currentUser.id ? 'You: ' : ''}${conv.lastMessage.content}`
                            : 'No messages yet'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 bg-primary text-on-primary font-syne font-bold text-[10px] rounded-full shrink-0">
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
          className={`flex-1 flex flex-col h-full bg-surface-mid/30 relative ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeRecipient ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 bg-surface border-b border-outline-var/20 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1 text-outline hover:text-text-primary"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
                      {activeRecipient.avatar ? (
                        <img src={activeRecipient.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-[#656d84]" />
                      )}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                        onlineUserIds.has(activeRecipient.id) ? 'bg-secondary-bright' : 'bg-outline-var'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-text-primary tracking-tight">
                        {activeRecipient.name}
                      </span>
                      {activeRecipient.role === 'PROFESSIONAL' && (
                        <span className="px-1.5 py-0.5 bg-secondary-bright/10 text-secondary-bright text-[8px] font-syne font-bold uppercase rounded-xs">
                          Pro
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-outline">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          onlineUserIds.has(activeRecipient.id) ? 'bg-secondary-bright animate-pulse' : 'bg-outline-var'
                        }`}
                      />
                      <span>{onlineUserIds.has(activeRecipient.id) ? 'Online' : 'Offline'}</span>
                      {activeRecipient.college && <span>• {activeRecipient.college}</span>}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/profile/${activeRecipient.id}`)}
                  className="px-3 py-1.5 bg-surface-mid border border-outline-var/30 hover:border-primary/40 text-text-primary text-xs font-syne font-bold uppercase tracking-wider rounded-xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink size={12} /> Profile
                </button>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-outline font-outfit">
                    <MessageSquare size={36} className="mx-auto mb-2 text-primary opacity-50" />
                    <h4 className="text-sm font-bold text-text-primary">Encrypted Direct Communication</h4>
                    <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                      Say hello to {activeRecipient.name} to start collaborating on skills and squads.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.senderId === currentUser.id;
                    const isDeleted = m.content === '[Message deleted]';

                    return (
                      <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                        <div className={`max-w-[80%] md:max-w-[70%] space-y-1`}>
                          <div
                            className={`p-3 rounded-md text-sm leading-relaxed relative ${
                              isDeleted
                                ? 'bg-surface-mid/60 border border-outline-var/20 text-outline italic text-xs'
                                : isMe
                                ? 'bg-primary text-on-primary rounded-br-none shadow-sm'
                                : 'bg-surface border border-outline-var/25 text-text-primary rounded-bl-none shadow-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          </div>

                          <div className={`flex items-center gap-1.5 px-1 text-[10px] text-outline font-syne ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span>{timeFormat(m.createdAt)}</span>
                            {isMe && !isDeleted && (
                              <span title={m.isRead ? 'Read' : 'Sent'}>
                                {m.isRead ? (
                                  <CheckCheck size={12} className="text-secondary-bright" />
                                ) : (
                                  <Check size={12} className="text-outline" />
                                )}
                              </span>
                            )}
                            {isMe && !isDeleted && (
                              <button
                                onClick={() => handleDeleteMessage(m.id)}
                                className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-opacity ml-1"
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
                  <div className="flex items-center gap-2 text-xs text-outline italic py-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce delay-300" />
                    </div>
                    <span>{activeRecipient.name} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Compose Bar */}
              <div className="p-3 bg-surface border-t border-outline-var/20 shrink-0 relative">
                {/* Quick emoji drawer */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-3 mb-2 p-2 bg-surface border border-outline-var/30 rounded-md shadow-2xl flex gap-1.5 z-20">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMsgInput((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1"
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
                    className="p-2.5 text-outline hover:text-primary transition-colors rounded-xs border border-outline-var/30 bg-surface-mid"
                    title="Quick Reactions"
                  >
                    <Smile size={18} />
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
                    placeholder={`Message ${activeRecipient.name}... (Enter to send, Shift+Enter for newline)`}
                    rows={1}
                    maxLength={2000}
                    className="flex-1 bg-surface-mid border border-outline-var/30 focus:border-primary/60 text-text-primary p-2.5 rounded-xs text-sm outline-none resize-none max-h-32 placeholder-outline-var font-outfit"
                  />

                  <button
                    type="submit"
                    disabled={!msgInput.trim()}
                    className="p-2.5 bg-primary text-on-primary rounded-xs hover:bg-secondary-bright disabled:opacity-40 transition-all font-syne font-bold text-xs uppercase flex items-center justify-center shrink-0"
                    title="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-outline">
              <MessageSquare size={48} className="text-primary opacity-30 mb-3" />
              <h3 className="text-base font-extrabold text-text-primary tracking-tight">Select a Conversation</h3>
              <p className="text-xs text-text-muted mt-1 max-w-xs leading-relaxed">
                Choose an existing chat from the left panel or start a new conversation with a network member.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-all"
              >
                Start New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── New Chat / User Search Modal ──────────────────────────────────── */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface border border-outline-var/30 rounded-md p-6 shadow-2xl space-y-4 font-outfit">
            <div className="flex items-center justify-between pb-3 border-b border-outline-var/20">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" />
                <h3 className="text-base font-extrabold text-text-primary tracking-tight">New Direct Message</h3>
              </div>
              <button onClick={() => setShowNewChatModal(false)} className="text-outline hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-outline" />
              <input
                value={userSearchQuery}
                onChange={handleUserSearch}
                placeholder="Type member name, college, or headline..."
                className="w-full bg-surface-mid border border-outline-var/40 focus:border-primary/60 text-text-primary p-2.5 pl-9 rounded-xs text-sm outline-none placeholder-outline-var"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {userSearchResults.length === 0 ? (
                <p className="text-center py-6 text-xs text-outline italic">
                  {userSearchQuery.trim() ? 'No members found.' : 'Search for a member to start chatting.'}
                </p>
              ) : (
                userSearchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="flex items-center justify-between p-2.5 rounded-xs bg-surface-mid/60 hover:bg-surface-mid border border-outline-var/20 hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-surface border border-outline-var/40 flex items-center justify-center">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <User size={16} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary">{u.name}</div>
                        <div className="text-[10px] text-outline font-syne">{u.headline || u.college || u.role}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-syne font-bold text-primary uppercase">Chat →</span>
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
