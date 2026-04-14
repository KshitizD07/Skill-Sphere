import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, User, MessageSquare, ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../../api';

export default function DashboardChat({ isOpen, onClose }) {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user_data') || '{}'); }
    catch { return {}; }
  }, []);
  const token = useMemo(() => localStorage.getItem('token'), []);

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
    if (!isOpen || !token) return;

    API.get('/chat/conversations')
      .then(res => setConversations(res.data || []))
      .catch(console.error);

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      auth: { token }
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
      // Refresh conversations sidebar to update latest message preview
      API.get('/chat/conversations')
        .then(res => setConversations(res.data || []))
        .catch(() => {});
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen, token, currentUser.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const openChat = async (user) => {
    setActiveChat(user);
    try {
      const res = await API.get(`/chat/history/${user.id}`);
      const formatted = (res.data || []).map(m => ({
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
          className="fixed inset-0 bg-[#0b1326]/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-[#0f1829] border-l border-[#434655]/30 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col font-['Manrope'] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-[#131b2e] border-b border-[#434655]/30 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {activeChat && (
              <button
                onClick={() => { setActiveChat(null); setHistory([]); }}
                className="text-[#8d90a0] hover:text-[#adc6ff] transition-colors p-1"
                title="Back to Comms"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-[#dae2fd] font-extrabold tracking-tight flex items-center gap-2">
              <MessageSquare size={16} className="text-[#adc6ff]" />
              {activeChat ? activeChat.name : 'N.E.X.U.S Comms'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#8d90a0] hover:text-[#ffb4ab] transition-colors p-1 rounded-full hover:bg-[#171f33]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative bg-[#0f1829]">
          {!activeChat ? (
            // CONVERSATIONS LIST
            <div className="p-4 space-y-2 h-full overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-[#8d90a0] italic text-sm mt-10">No active comms.</div>
              ) : (
                conversations.map(conv => {
                  const otherUser = conv.participants?.find(p => p.id !== currentUser.id);
                  if (!otherUser) return null;
                  const lastMsg = conv.messages?.[0];

                  return (
                    <div
                      key={conv.id}
                      onClick={() => openChat(otherUser)}
                      className="flex items-center gap-3 p-3 bg-[#131b2e] hover:bg-[#171f33] border border-[#434655]/20 hover:border-[#adc6ff]/30 rounded-md cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 rounded-full border border-[#434655]/40 overflow-hidden bg-[#222a3d] shrink-0 flex items-center justify-center">
                        {otherUser.avatar
                          ? <img src={otherUser.avatar} className="w-full h-full object-cover" alt="" />
                          : <User size={16} className="text-[#656d84]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#dae2fd] truncate">{otherUser.name}</p>
                          {lastMsg && <span className="text-[10px] text-[#656d84] font-['Space_Grotesk'] tracking-widest">{new Date(lastMsg.createdAt).toLocaleDateString()}</span>}
                        </div>
                        {lastMsg && (
                          <p className="text-[11px] text-[#8d90a0] truncate mt-0.5">
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
                        ? 'w-full text-center text-[#434655] text-xs italic py-1 px-0'
                        : h.sender === 'me'
                          ? 'bg-[#0f69dc]/20 border border-[#adc6ff]/20 text-[#dae2fd]'
                          : 'bg-[#171f33] border border-[#434655]/25 text-[#c3c6d7]'
                    }`}>
                      {h.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} className="p-3 bg-[#131b2e] border-t border-[#434655]/30 flex gap-2 shrink-0">
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  className="flex-1 bg-[#0b1326] border border-[#434655]/40 text-[#dae2fd] p-2.5 rounded-sm focus:outline-none focus:border-[#adc6ff]/60 font-['Manrope'] text-sm placeholder-[#434655] transition-colors"
                  placeholder="Type message..."
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-[#0f69dc] hover:bg-[#adc6ff] hover:text-[#002e6a] text-[#dae2fd] p-2.5 rounded-sm transition-all flex items-center justify-center font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-wide active:scale-95"
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
