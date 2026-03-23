import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import { Send, ArrowLeft, Terminal } from 'lucide-react';

export default function ChatInterface() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [mentor, setMentor] = useState(null);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([
    { sender: 'system', text: 'ENCRYPTED_CHANNEL_ESTABLISHED...' },
    { sender: 'system', text: 'WAITING_FOR_PEER...' },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    API.get(`/users/${id}`).then(res => {
      setMentor(res.data);
      setTimeout(() => {
        setHistory(h => [...h, {
          sender: 'them',
          text: `[${res.data.name}] has joined the session.`
        }]);
      }, 1000);
    });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setHistory(h => [...h, { sender: 'me', text: msg }]);
    setMsg('');
    // Simulated response — replace with real WebSocket/API call when backend is ready
    setTimeout(() => {
      setHistory(h => [...h, {
        sender: 'them',
        text: 'I can definitely help with that. When are you free to sync?'
      }]);
    }, 2000);
  };

  if (!mentor) return <div className="bg-black min-h-screen" />;

  return (
    <div className="h-screen bg-black flex flex-col font-mono text-sm relative">

      {/* Header */}
      <div className="bg-gray-900 border-b border-green-500/30 p-4 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate(-1)} className="text-green-500 hover:text-white transition">
          <ArrowLeft />
        </button>
        <div>
          <div className="text-green-500 font-bold flex items-center gap-2">
            <Terminal size={16} /> UPLINK: {mentor.name.toUpperCase()}
          </div>
          <div className="text-xs text-green-500/50">
            ID: {mentor.id.split('-')[0]} /// SECURE
          </div>
        </div>
        <div className="ml-auto text-xs text-green-500/40 font-mono">
          PEER: {currentUser.name?.toUpperCase()}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a]">
        {history.map((h, i) => (
          <div key={i} className={`flex ${h.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 border text-sm ${
              h.sender === 'system'
                ? 'w-full text-center border-transparent text-gray-600 italic text-xs'
                : h.sender === 'me'
                  ? 'bg-green-900/20 border-green-500/50 text-green-100'
                  : 'bg-gray-900 border-gray-700 text-gray-300'
            }`}>
              {h.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-4 bg-gray-900 border-t border-green-500/30 flex gap-2 shrink-0">
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          className="flex-1 bg-black border border-gray-700 text-green-400 p-3 focus:outline-none focus:border-green-500 font-mono"
          placeholder="ENTER_MESSAGE_SEQUENCE..."
          autoFocus
        />
        <button
          type="submit"
          className="bg-green-600 text-black px-6 hover:bg-green-500 font-bold transition"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}