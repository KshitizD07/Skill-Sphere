// pages/GlobalFeed.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import { Search, ArrowLeft, MessageSquare, Heart, User, Building2, Users, Zap } from 'lucide-react';

export default function GlobalFeed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  useEffect(() => { loadFeed(); }, []);

  const loadFeed = async () => {
    try {
      const res = await API.get('/posts/all');
      setPosts(res.data || []);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length > 1) {
      const res = await API.get(`/users/search?q=${query}`);
      setSearchResults(res.data || []);
    } else {
      setSearchResults([]);
    }
  };

  const handleLike = async (postId) => {
    try {
      await API.post(`/posts/${postId}/like`, { userId: currentUser.id });
      loadFeed();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#050505]/90 backdrop-blur-md p-4 border-b border-gray-800 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:text-cyan-400 transition"><ArrowLeft /></button>
            <h1 className="text-2xl font-black text-white font-['Orbitron'] tracking-widest">THE_GRID</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/nexus')} className="flex items-center gap-2 px-3 py-1 bg-yellow-900/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black transition font-mono text-xs font-bold">
              <Zap size={14} /> NEXUS
            </button>
            <button onClick={() => navigate('/network')} className="flex items-center gap-2 px-3 py-1 bg-purple-900/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white transition font-mono text-xs font-bold">
              <Users size={14} /> UPLINK
            </button>
          </div>
        </div>

        <div className="mb-10 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-4 text-gray-500 group-focus-within:text-cyan-400" />
            <input
              value={searchQuery}
              onChange={handleSearch}
              placeholder="SEARCH_NETRUNNERS_OR_COLLEGES..."
              className="w-full bg-gray-900/50 border border-gray-700 p-4 pl-12 text-white outline-none focus:border-cyan-500 font-mono transition-all"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-black border border-cyan-500 z-50 mt-2 shadow-2xl">
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => { navigate(`/profile/${user.id}`); setSearchResults([]); setSearchQuery(''); }}
                  className="p-3 border-b border-gray-800 hover:bg-cyan-900/20 cursor-pointer flex items-center gap-3 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden border border-gray-700">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="p-1 w-full h-full" />}
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm">{user.name}</div>
                    {user.college && <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1"><Building2 size={10} /> {user.college}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-black border border-gray-800 p-6 hover:border-cyan-500/30 transition group">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate(`/profile/${post.author?.id}`)}>
                <div className="w-10 h-10 rounded-full border border-gray-600 overflow-hidden">
                  <img src={post.author?.avatar || 'https://via.placeholder.com/40'} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <div className="text-white font-bold hover:text-cyan-400 transition">{post.author?.name}</div>
                  {post.author?.college && <div className="text-[10px] text-gray-500 font-mono">{post.author.college}</div>}
                </div>
              </div>
              <p className="text-gray-300 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>
              {post.imageUrl && <img src={post.imageUrl} className="w-full rounded border border-gray-800 mb-4" alt="" />}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-900 text-sm text-gray-500 font-mono">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-2 hover:text-white transition ${post.likes?.some(l => l.userId === currentUser.id) ? 'text-red-500' : ''}`}
                >
                  <Heart size={16} fill={post.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                  {post.likes?.length || 0}
                </button>
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} /> {post.comments?.length || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}