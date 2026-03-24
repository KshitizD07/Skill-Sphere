import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import {
  User, ArrowLeft, Github, Linkedin, Cpu, MessageSquare,
  Shield, Edit3, Building2, Heart, MessageCircle, Send,
  Image as ImageIcon, Briefcase, Eye, EyeOff, CheckCircle,
  Clock, ExternalLink, X
} from 'lucide-react';

// ─── Recruiter View ────────────────────────────────────────────────────────────
function RecruiterView({ user }) {
  const verifiedSkills = user.skills?.filter(s => s.isVerified) || [];
  const allSkills = user.skills || [];

  const recentActivity = user.activities?.some(a => {
    const diff = Date.now() - new Date(a.createdAt).getTime();
    return diff < 30 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="bg-gray-900/80 border border-yellow-500/50 p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 text-xs font-bold font-['Orbitron']">
        RECRUITER_VIEW
      </div>

      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-yellow-400/50 overflow-hidden bg-black shrink-0">
          {user.avatar
            ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-gray-600" /></div>}
        </div>
        <div>
          <h2 className="text-2xl font-black text-white font-['Orbitron'] uppercase">{user.name}</h2>
          <p className="text-yellow-400 font-mono text-sm mt-1">{user.headline || 'No headline'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-500">
            {user.college && (
              <span className="flex items-center gap-1">
                <Building2 size={12} /> {user.college}
              </span>
            )}
            <span className="text-gray-700">|</span>
            <span>{user.role}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-yellow-400 font-bold font-['Orbitron'] text-sm mb-3 flex items-center gap-2">
          <CheckCircle size={14} /> TOP_VERIFIED_SKILLS
        </h3>
        {verifiedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {verifiedSkills.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/50 text-green-300 text-xs font-mono font-bold">
                <CheckCircle size={10} className="text-green-400" />
                {s.skill.name}
                {s.calculatedScore && (
                  <span className="text-green-500/70">{s.calculatedScore}/10</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-xs font-mono">No verified skills yet</p>
        )}
      </div>

      {allSkills.length > verifiedSkills.length && (
        <div className="mb-6">
          <h3 className="text-gray-500 font-bold font-['Orbitron'] text-xs mb-2">DECLARED_SKILLS</h3>
          <div className="flex flex-wrap gap-2">
            {allSkills.filter(s => !s.isVerified).map(s => (
              <span key={s.id} className="px-2 py-1 bg-black border border-gray-700 text-gray-400 text-xs font-mono">
                {s.skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 p-3 bg-black border border-gray-800 flex items-center gap-3">
        <Clock size={14} className={recentActivity ? 'text-green-400' : 'text-gray-600'} />
        <span className={`text-xs font-mono font-bold ${recentActivity ? 'text-green-400' : 'text-gray-600'}`}>
          {recentActivity ? 'ACTIVE_LAST_30_DAYS' : 'NO_RECENT_ACTIVITY'}
        </span>
      </div>

      <div>
        <h3 className="text-gray-500 font-bold font-['Orbitron'] text-xs mb-3">EVIDENCE_LINKS</h3>
        <div className="flex flex-wrap gap-3">
          {user.github && (
            <a
              href={`https://${user.github}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-white text-gray-400 hover:text-white text-xs font-mono transition"
            >
              <Github size={12} /> GITHUB <ExternalLink size={10} />
            </a>
          )}
          {user.linkedin && (
            <a
              href={`https://${user.linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-blue-400 text-gray-400 hover:text-blue-400 text-xs font-mono transition"
            >
              <Linkedin size={12} /> LINKEDIN <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UserProfile ───────────────────────────────────────────────────────────────
export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recruiterMode, setRecruiterMode] = useState(false);

  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');   // will hold base64 string
  const [commentInputs, setCommentInputs] = useState({});

  // ── Task 3: ref for hidden file input in post composer ──
  const postImageInputRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  const isOwner = currentUser.id === id;

  useEffect(() => {
    API.get(`/users/${id}`)
      .then(res => { setUser(res.data); setLoading(false); })
      .catch(() => setLoading(false));
    fetchPosts();
  }, [id]);

  const fetchPosts = () => {
    API.get(`/posts/user/${id}`).then(res => setPosts(res.data || []));
  };

  // ── Task 3: convert selected image file to base64 ──
  const handlePostImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPostImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      await API.post('/posts', {
        userId: currentUser.id,
        content: newPostContent,
        imageUrl: newPostImage || null,
      });
      setNewPostContent('');
      setNewPostImage('');
      // reset file input so same file can be re-selected if needed
      if (postImageInputRef.current) postImageInputRef.current.value = '';
      fetchPosts();
    } catch { alert('POST_FAILED'); }
  };

  const handleLike = async (postId) => {
    try {
      await API.post(`/posts/${postId}/like`, { userId: currentUser.id });
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const handleComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text) return;
    try {
      await API.post(`/posts/${postId}/comment`, { userId: currentUser.id, content: text });
      setCommentInputs({ ...commentInputs, [postId]: '' });
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="p-10 text-cyan-500 font-mono animate-pulse bg-[#050505] min-h-screen">
      SEARCHING_DATABASE...
    </div>
  );
  if (!user) return (
    <div className="p-10 text-red-500 font-mono bg-[#050505] min-h-screen">
      USER_NOT_FOUND
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRecruiterMode(!recruiterMode)}
              className={`flex items-center gap-2 px-4 py-2 border font-bold font-['Orbitron'] text-xs transition ${
                recruiterMode
                  ? 'bg-yellow-400 border-yellow-400 text-black'
                  : 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10'
              }`}
            >
              {recruiterMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {recruiterMode ? 'STUDENT_VIEW' : 'RECRUITER_VIEW'}
            </button>

            {isOwner && (
              <button
                onClick={() => navigate('/my-profile')}
                className="flex items-center gap-2 px-4 py-1 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition font-mono text-xs font-bold"
              >
                <Edit3 size={14} /> EDIT_DOSSIER
              </button>
            )}
          </div>
        </div>

        {recruiterMode ? (
          <RecruiterView user={user} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: Identity */}
            <div className="lg:col-span-4 space-y-6">

              <div className="bg-gray-900/50 border border-cyan-500/30 p-6 flex flex-col items-center text-center relative">
                <div className="w-40 h-40 rounded-full border-4 border-black outline outline-2 outline-cyan-500 overflow-hidden mb-6 bg-black flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {user.avatar
                    ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    : <User size={64} className="text-gray-600" />}
                </div>
                <h2 className="text-2xl font-black text-white font-['Orbitron'] uppercase tracking-wider">{user.name}</h2>
                <p className="text-cyan-400 font-mono text-sm mt-1">{user.headline || 'NO_HEADLINE_TAG'}</p>
                <div className="mt-4 px-3 py-1 bg-cyan-900/20 border border-cyan-500/50 rounded text-xs font-bold tracking-widest text-cyan-200">
                  {user.role} CLASS
                </div>
                {!isOwner && (
                  <button
                    onClick={() => navigate(`/chat/${user.id}`)}
                    className="w-full mt-6 py-3 bg-white text-black font-bold hover:bg-cyan-400 transition flex items-center justify-center gap-2 font-['Orbitron']"
                  >
                    <MessageSquare size={16} /> INITIALIZE_UPLINK
                  </button>
                )}
              </div>

              {user.college && (
                <div className="bg-black border border-purple-500/30 p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition" />
                  <div className="p-3 bg-purple-900/20 rounded border border-purple-500/50 text-purple-400">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Affiliated Institution</div>
                    <div className="text-sm font-bold text-white font-['Orbitron'] leading-tight">{user.college}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {user.github && (
                  <a href={`https://${user.github}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-gray-900 border border-gray-700 hover:border-white text-gray-400 hover:text-white flex items-center justify-center gap-2 transition">
                    <Github size={16} /> GITHUB
                  </a>
                )}
                {user.linkedin && (
                  <a href={`https://${user.linkedin}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-gray-900 border border-gray-700 hover:border-blue-400 text-gray-400 hover:text-blue-400 flex items-center justify-center gap-2 transition">
                    <Linkedin size={16} /> NETWORK
                  </a>
                )}
              </div>
            </div>

            {/* Right: Info + Feed */}
            <div className="lg:col-span-8 space-y-6">

              <div className="bg-gray-900/50 border border-gray-800 p-6">
                <h3 className="text-gray-500 font-mono text-xs mb-4 flex items-center gap-2">
                  <Shield size={14} className="text-cyan-500" /> BIO_DATA_LOG
                </h3>
                <p className="text-lg text-gray-300 leading-relaxed border-l-2 border-cyan-500/20 pl-4">
                  {user.bio || 'No data.'}
                </p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 p-6">
                <h3 className="text-gray-500 font-mono text-xs mb-4 flex items-center gap-2">
                  <Cpu size={14} className="text-yellow-400" /> MODULES
                </h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills?.map(record => (
                    <span key={record.id} className={`px-3 py-1 border font-mono text-xs font-bold flex items-center gap-1 ${
                      record.isVerified
                        ? 'bg-green-900/20 border-green-500/50 text-green-300'
                        : 'bg-black border-cyan-500/30 text-cyan-400'
                    }`}>
                      {record.skill.name}
                      {record.isVerified && <CheckCircle size={10} className="text-green-400" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Activity feed */}
              <div className="pt-8 border-t border-gray-800">
                <h3 className="text-2xl font-black text-white font-['Orbitron'] mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-cyan-500" />
                  ACTIVITY_STREAM
                </h3>

                {isOwner && (
                  <div className="bg-gray-900/50 border border-gray-700 p-4 mb-8">
                    <textarea
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      placeholder="Update status log..."
                      className="w-full bg-black border border-gray-800 text-white p-3 focus:border-cyan-500 outline-none resize-none h-24 font-mono text-sm"
                    />

                    {/* ── Task 3: image preview + remove ── */}
                    {newPostImage && (
                      <div className="relative mt-2 mb-2 inline-block">
                        <img src={newPostImage} alt="Preview" className="max-h-40 rounded border border-gray-700 object-cover" />
                        <button
                          onClick={() => {
                            setNewPostImage('');
                            if (postImageInputRef.current) postImageInputRef.current.value = '';
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full transition"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      {/* ── Task 3: hidden file input + upload button ── */}
                      <input
                        ref={postImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePostImageChange}
                        className="hidden"
                      />
                      <button
                        onClick={() => postImageInputRef.current.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition text-xs font-mono"
                      >
                        <ImageIcon size={14} /> ATTACH_IMAGE
                      </button>
                      <div className="flex-1" />
                      <button onClick={handleCreatePost} className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-2 font-['Orbitron'] text-sm">
                        POST
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {posts.length > 0 ? posts.map(post => (
                    <div key={post.id} className="bg-black border border-gray-800 p-6 hover:border-gray-600 transition">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-600">
                          <img src={post.author?.avatar || 'https://via.placeholder.com/40'} alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">{post.author?.name}</div>
                          <div className="text-gray-600 text-[10px] font-mono">{new Date(post.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <p className="text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>
                      {post.imageUrl && <img src={post.imageUrl} alt="Post" className="w-full rounded border border-gray-800 mb-4" />}

                      <div className="flex items-center gap-6 border-t border-gray-900 pt-4 mb-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-2 text-sm transition ${
                            post.likes?.some(l => l.userId === currentUser.id) ? 'text-red-500' : 'text-gray-500 hover:text-white'
                          }`}
                        >
                          <Heart size={16} fill={post.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                          {post.likes?.length || 0}
                        </button>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MessageCircle size={16} /> {post.comments?.length || 0}
                        </div>
                      </div>

                      <div className="bg-gray-900/30 p-4 space-y-3">
                        {post.comments?.map(comment => (
                          <div key={comment.id} className="text-xs">
                            <span className="text-cyan-400 font-bold mr-2">{comment.author?.name}:</span>
                            <span className="text-gray-400">{comment.content}</span>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <input
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            placeholder="Write a comment..."
                            className="flex-1 bg-black border border-gray-800 text-gray-300 px-3 py-2 text-xs focus:border-cyan-500 outline-none"
                          />
                          <button onClick={() => handleComment(post.id)} className="text-cyan-500 hover:text-white">
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-gray-600 font-mono italic">
                      NO_ACTIVITY_LOGGED_YET...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}