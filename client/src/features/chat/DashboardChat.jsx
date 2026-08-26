import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, User, MessageSquare, ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../../api';

export default function DashboardChat({ isOpen, onClose }) {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user_data') || '{}'); }
    catch { return {}; }
  }, []);

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const activeChatRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Socket lifecycle — only connect when drawer is open
  useEffect(() => {
    if (!isOpen) return;

    API.get('/chat/conversations')
      .then(res => setConversations(res.data?.data || res.data || []))
      .catch(console.error);

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('ss_token')
      }
    });
    socketRef.current = socket;

    socket.on('RECEIVE_MESSAGE', (message) => {
      const current = activeChatRef.current;
      if (current && (message.senderId === current.id || message.senderId === currentUser.id)) {
        setHistory(h => [...h, {
          sender: message.senderId === currentUser.id ? 'me' : 'them',
          text: message.content
        }]);
      }
      
      // Update sidebar conversations preview in-memory
      setConversations((prevConvs) => {
        const existingIdx = prevConvs.findIndex((c) => c.id === message.conversationId);

        if (existingIdx !== -1) {
          const updated = [...prevConvs];
          const conv = updated[existingIdx];

          const isNotMe = message.senderId !== currentUser.id;
          const isChatOpen = current?.id === conv.otherUser?.id;
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

          return updated.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
          });
        }

        // Fallback to API if it's a completely new conversation
        API.get('/chat/conversations')
          .then(res => setConversations(res.data?.data || res.data || []))
          .catch(() => {});
        return prevConvs;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, currentUser.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const openChat = async (user) => {
    setActiveChat(user);
    try {
      const res = await API.get(`/chat/history/${user.id}`);
      const rawMessages = res.data?.messages || res.data || [];
      const formatted = (Array.isArray(rawMessages) ? rawMessages : []).map(m => ({
        sender: m.senderId === currentUser.id ? 'me' : 'them',
        text: m.content
      }));
      setHistory([{ sender: 'system', text: 'Secure session established.' }, ...formatted]);
    } catch (err) { console.error(err); }
  };

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim() || !activeChat || !socketRef.current) return;
    socketRef.current.emit('SEND_MESSAGE', { receiverId: activeChat.id, content: msg });
    setMsg('');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-bg-base/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-surface border-l border-outline-var/30 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col font-outfit ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-surface-mid border-b border-outline-var/30 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeChat && (
              <button
                onClick={() => { setActiveChat(null); setHistory([]); }}
                className="text-outline hover:text-primary transition-colors p-1"
                title="Back to Comms"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-text-primary font-extrabold tracking-tight flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              {activeChat ? activeChat.name : 'N.E.X.U.S Comms'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-error transition-colors p-1 rounded-full hover:bg-surface"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative bg-surface-mid">
          {!activeChat ? (
            // CONVERSATIONS LIST
            <div className="p-4 space-y-2 h-full overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-outline italic text-sm mt-10">No active comms.</div>
              ) : (
                conversations.map(conv => {
                  const otherUser = conv.participants?.find(p => p.id !== currentUser.id);
                  if (!otherUser) return null;
                  const lastMsg = conv.messages?.[0];

                  return (
                    <div
                      key={conv.id}
                      onClick={() => openChat(otherUser)}
                      className="flex items-center gap-3 p-3 bg-surface-mid hover:bg-surface border border-outline-var/20 hover:border-primary/30 rounded-md cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid shrink-0 flex items-center justify-center">
                        {otherUser.avatar
                          ? <img src={otherUser.avatar} className="w-full h-full object-cover" alt="" />
                          : <User size={16} className="text-[#656d84]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-text-primary truncate">{otherUser.name}</p>
                          {lastMsg && <span className="text-[10px] text-[#656d84] font-syne tracking-widest">{new Date(lastMsg.createdAt).toLocaleDateString()}</span>}
                        </div>
                        {lastMsg && (
                          <p className="text-[11px] text-outline truncate mt-0.5">
                            {lastMsg.senderId === currentUser.id ? 'You: ' : ''}{lastMsg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // ACTIVE CHAT
            <div className="flex flex-col h-full">
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className={`flex ${h.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-md text-[13px] leading-relaxed ${
                      h.sender === 'system'
                        ? 'w-full text-center text-outline-var text-xs italic py-1 px-0'
                        : h.sender === 'me'
                          ? 'bg-primary-container/20 border border-primary/20 text-text-primary'
                          : 'bg-surface border border-outline-var/25 text-text-muted'
                    }`}>
                      {h.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} className="p-3 bg-surface-mid border-t border-outline-var/30 flex gap-2 shrink-0">
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  className="flex-1 bg-bg-base border border-outline-var/40 text-text-primary p-2.5 rounded-sm focus:outline-none focus:border-primary/60 font-outfit text-sm placeholder-outline-var transition-colors"
                  placeholder="Type message..."
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-primary-container hover:bg-primary hover:text-on-primary text-text-primary p-2.5 rounded-sm transition-all flex items-center justify-center font-syne font-bold text-[10px] uppercase tracking-wide active:scale-95"
                  title="Send"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
