import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import { Send, ArrowLeft, MessageSquare, User } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ChatInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  const token = localStorage.getItem('token');

  const [mentor, setMentor] = useState(null);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    API.get(`/users/${id}`).then(res => setMentor(res.data));

    API.get(`/chat/history/${id}`).then(res => {
      const formatted = res.data.map(m => ({
        sender: m.senderId === currentUser.id ? 'me' : 'them',
        text: m.content
      }));
      setHistory([{ sender: 'system', text: 'Secure session established.' }, ...formatted]);
    }).catch(err => console.error("Error fetching chat history", err));

    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
      auth: { token }
    });

    socketRef.current.on('RECEIVE_MESSAGE', (message) => {
      // Only process messages for the current chat
      if (message.senderId === id || message.senderId === currentUser.id) {
        setHistory(h => [...h, {
          sender: message.senderId === currentUser.id ? 'me' : 'them',
          text: message.content
        }]);
      }
    });

    return () => socketRef.current.disconnect();
  }, [id, currentUser.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    socketRef.current.emit('SEND_MESSAGE', { receiverId: id, content: msg });
    setMsg('');
  };

  if (!mentor) return <div className="bg-[#0b1326] min-h-screen" />;

  return (
    <div className="h-screen bg-[#0b1326] flex flex-col font-['Manrope'] text-sm">

      {/* Header */}
      <div className="bg-[#131b2e] border-b border-[#434655]/30 p-4 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="text-[#8d90a0] hover:text-[#adc6ff] transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full border border-[#434655]/40 overflow-hidden bg-[#222a3d] flex items-center justify-center">
          {mentor.avatar
            ? <img src={mentor.avatar} className="w-full h-full object-cover" alt="" />
            : <User size={16} className="text-[#656d84]" />}
        </div>
        <div>
          <div className="text-[#dae2fd] font-semibold flex items-center gap-2">
            <MessageSquare size={14} className="text-[#adc6ff]" />
            {mentor.name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#89f5e7] animate-pulse" />
            <span className="font-['Space_Grotesk'] text-[9px] font-bold tracking-[0.1em] uppercase text-[#8d90a0]">Active session</span>
          </div>
        </div>
        <div className="ml-auto">
          <span className="font-['Space_Grotesk'] text-[10px] text-[#656d84] uppercase tracking-wide">{currentUser.name}</span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0f1829]">
        {history.map((h, i) => (
          <div key={i} className={`flex ${h.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-sm text-sm leading-relaxed ${
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
      <form onSubmit={send} className="p-4 bg-[#131b2e] border-t border-[#434655]/30 flex gap-3 shrink-0">
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          className="flex-1 bg-[#0b1326] border border-[#434655]/40 text-[#dae2fd] p-3 rounded-xs focus:outline-none focus:border-[#adc6ff]/60 font-['Manrope'] text-sm placeholder-[#434655] transition-colors"
          placeholder="Type a message..."
          autoFocus
        />
        <button
          type="submit"
          className="bg-[#0f69dc] hover:bg-[#adc6ff] hover:text-[#002e6a] text-[#dae2fd] px-5 rounded-xs transition-all flex items-center gap-2 font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-wide active:scale-95"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}