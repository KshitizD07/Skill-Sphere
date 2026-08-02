import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import { Send, ArrowLeft, MessageSquare, User } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ChatInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user_data') || '{}'); }
    catch { return {}; }
  }, []);

  const [mentor, setMentor] = useState(null);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    API.get(`/users/${id}`).then(res => setMentor(res.data)).catch(console.error);

    API.get(`/chat/history/${id}`).then(res => {
      const formatted = (res.data || []).map(m => ({
        sender: m.senderId === currentUser.id ? 'me' : 'them',
        text: m.content
      }));
      setHistory([{ sender: 'system', text: 'Secure session established.' }, ...formatted]);
    }).catch(err => console.error("Error fetching chat history", err));

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      auth: {
        token: localStorage.getItem('ss_token')
      }
    });
    socketRef.current = socket;

    socket.on('RECEIVE_MESSAGE', (message) => {
      // Only process messages for the current chat
      if (message.senderId === id || message.senderId === currentUser.id) {
        setHistory(h => [...h, {
          sender: message.senderId === currentUser.id ? 'me' : 'them',
          text: message.content
        }]);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, currentUser.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    socketRef.current.emit('SEND_MESSAGE', { receiverId: id, content: msg });
    setMsg('');
  };

  if (!mentor) return <div className="bg-bg-base min-h-screen" />;

  return (
    <div className="h-screen bg-bg-base flex flex-col font-outfit text-sm">

      {/* Header */}
      <div className="bg-surface-mid border-b border-outline-var/30 p-4 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="text-outline hover:text-primary transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full border border-outline-var/40 overflow-hidden bg-surface-mid flex items-center justify-center">
          {mentor.avatar
            ? <img src={mentor.avatar} className="w-full h-full object-cover" alt="" />
            : <User size={16} className="text-[#656d84]" />}
        </div>
        <div>
          <div className="text-text-primary font-semibold flex items-center gap-2">
            <MessageSquare size={14} className="text-primary" />
            {mentor.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-bright animate-pulse" />
            <span className="font-syne text-[9px] font-bold tracking-[0.1em] uppercase text-outline">Active session</span>
          </div>
        </div>
        <div className="ml-auto">
          <span className="font-syne text-[10px] text-[#656d84] uppercase tracking-wide">{currentUser.name}</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0f1829]">
        {history.map((h, i) => (
          <div key={i} className={`flex ${h.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-sm text-sm leading-relaxed ${
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
      <form onSubmit={send} className="p-4 bg-surface-mid border-t border-outline-var/30 flex gap-3 shrink-0">
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          className="flex-1 bg-bg-base border border-outline-var/40 text-text-primary p-3 rounded-xs focus:outline-none focus:border-primary/60 font-outfit text-sm placeholder-outline-var transition-colors"
          placeholder="Type a message..."
          autoFocus
        />
        <button
          type="submit"
          className="bg-primary-container hover:bg-primary hover:text-on-primary text-text-primary px-5 rounded-xs transition-all flex items-center gap-2 font-syne font-bold text-[10px] uppercase tracking-wide active:scale-95"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}