import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import {
  User, ArrowLeft, Github, Linkedin, Cpu, MessageSquare,
  Shield, Edit3, Building2, Heart, MessageCircle, Send,
  Image as ImageIcon, Eye, EyeOff, CheckCircle, Clock,
  ExternalLink, X, Trash2, Pencil, CornerDownRight
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// Fixed Avatar with explicit sizes instead of dynamic Tailwind classes
function Avatar({ src, name, size = 10 }) {
  const sizeMap = {
    6: 'w-6 h-6',
    7: 'w-7 h-7',
    8: 'w-8 h-8',
    10: 'w-10 h-10',
    12: 'w-12 h-12',
    16: 'w-16 h-16',
    20: 'w-20 h-20',
    24: 'w-24 h-24',
    32: 'w-32 h-32',
    40: 'w-40 h-40'
  };
  
  const iconSizeMap = {
    6: 12,
    7: 14,
    8: 16,
    10: 20,
    12: 24,
    16: 32,
    20: 40,
    24: 48,
    32: 64,
    40: 80
  };

  return (
    <div className={`${sizeMap[size] || 'w-10 h-10'} rounded-full overflow-hidden border border-gray-700 bg-gray-900 shrink-0 flex items-center justify-center`}>
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt={name || ''} />
      ) : (
        <User size={iconSizeMap[size] || 20} className="text-gray-600" />
      )}
    </div>
  );
}

// ── Recruiter View ─────────────────────────────────────────────────────────────
function RecruiterView({ user }) {
  const verifiedSkills = user.skills?.filter(s => s.isVerified) || [];
  const allSkills = user.skills || [];
  const recentActivity = user.activities?.some(a => (Date.now() - new Date(a.createdAt).getTime()) < 30*24*60*60*1000);
  const cleanUrl = (url) => url?.replace(/^https?:\/\//, '');

  return (
    <div className="bg-gray-900/80 border border-yellow-500/50 p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-yellow-400 text-black px-3 py-1 text-xs font-bold font-['Orbitron']">RECRUITER_VIEW</div>
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-yellow-400/50 overflow-hidden bg-black shrink-0">
          {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-gray-600" /></div>}
        </div>
        <div>
          <h2 className="text-2xl font-black text-white font-['Orbitron'] uppercase">{user.name}</h2>
          <p className="text-yellow-400 font-mono text-sm mt-1">{user.headline || 'No headline'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs font-mono text-gray-500">
            {user.college && <span className="flex items-center gap-1"><Building2 size={12} /> {user.college}</span>}
            <span className="text-gray-700">|</span>
            <span>{user.role}</span>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <h3 className="text-yellow-400 font-bold font-['Orbitron'] text-sm mb-3 flex items-center gap-2"><CheckCircle size={14} /> TOP_VERIFIED_SKILLS</h3>
        {verifiedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {verifiedSkills.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/50 text-green-300 text-xs font-mono font-bold">
                <CheckCircle size={10} className="text-green-400" />
                {s.skill?.name || s.name}
                {s.calculatedScore && <span className="text-green-500/70">{s.calculatedScore}/10</span>}
              </div>
            ))}
          </div>
        ) : <p className="text-gray-600 text-xs font-mono">No verified skills yet</p>}
      </div>
      {allSkills.length > verifiedSkills.length && (
        <div className="mb-6">
          <h3 className="text-gray-500 font-bold font-['Orbitron'] text-xs mb-2">DECLARED_SKILLS</h3>
          <div className="flex flex-wrap gap-2">
            {allSkills.filter(s => !s.isVerified).map(s => (
              <span key={s.id} className="px-2 py-1 bg-black border border-gray-700 text-gray-400 text-xs font-mono">{s.skill?.name || s.name}</span>
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
            <a href={`https://${cleanUrl(user.github)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-white text-gray-400 hover:text-white text-xs font-mono transition">
              <Github size={12} /> GITHUB <ExternalLink size={10} />
            </a>
          )}
          {user.linkedin && (
            <a href={`https://${cleanUrl(user.linkedin)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-blue-400 text-gray-400 hover:text-blue-400 text-xs font-mono transition">
              <Linkedin size={12} /> LINKEDIN <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Comment component ─────────────────────────────────────────────────────────
function CommentItem({ comment, postId, postOwnerId, currentUser, onDelete, onLike, onReply }) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText]       = useState('');
  const isAuthor    = comment.author?.id === currentUser.id;
  const isPostOwner = postOwnerId === currentUser.id;
  const liked       = comment.likes?.some(l => l.userId === currentUser.id);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(postId, comment.id, replyText);
    setReplyText('');
    setShowReplyBox(false);
  };

  return (
    <div className="space-y-2 relative z-20">
      <div className="flex gap-2 group">
        <Avatar src={comment.author?.avatar} name={comment.author?.name} size={7} />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-900/60 rounded px-3 py-2">
            <span className="text-cyan-400 font-bold text-xs mr-2">{comment.author?.name}</span>
            <span className="text-gray-300 text-xs">{comment.content}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-gray-600 text-[10px] font-mono">{timeAgo(comment.createdAt)}</span>
            <button type="button" onClick={() => onLike(postId, comment.id)}
              className={`flex items-center gap-1 text-[10px] font-mono transition ${liked ? 'text-red-400' : 'text-gray-600 hover:text-red-400'}`}>
              <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            <button type="button" onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition flex items-center gap-1">
              <CornerDownRight size={10} /> Reply
            </button>
            {(isAuthor || isPostOwner) && (
              <button type="button" onClick={() => onDelete(postId, comment.id)}
                className="text-[10px] font-mono text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
          {showReplyBox && (
            <div className="flex gap-2 mt-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="flex-1 bg-black border border-gray-800 text-gray-300 px-3 py-1.5 text-xs focus:border-cyan-500 outline-none rounded" />
              <button type="button" onClick={submitReply} className="text-cyan-500 hover:text-white px-2"><Send size={14} /></button>
              <button type="button" onClick={() => setShowReplyBox(false)} className="text-gray-600 hover:text-white px-1"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-9 space-y-2 border-l border-gray-800 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex gap-2 group">
              <Avatar src={reply.author?.avatar} name={reply.author?.name} size={6} />
              <div className="flex-1 min-w-0">
                <div className="bg-gray-900/40 rounded px-3 py-1.5">
                  <span className="text-cyan-400 font-bold text-xs mr-2">{reply.author?.name}</span>
                  <span className="text-gray-400 text-xs">{reply.content}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-gray-600 text-[10px] font-mono">{timeAgo(reply.createdAt)}</span>
                  <button type="button" onClick={() => onLike(postId, reply.id)}
                    className={`flex items-center gap-1 text-[10px] font-mono transition ${reply.likes?.some(l => l.userId === currentUser.id) ? 'text-red-400' : 'text-gray-600 hover:text-red-400'}`}>
                    <Heart size={10} fill={reply.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                    {reply.likes?.length > 0 && reply.likes.length}
                  </button>
                  {(reply.author?.id === currentUser.id || postOwnerId === currentUser.id) && (
                    <button type="button" onClick={() => onDelete(postId, reply.id)}
                      className="text-[10px] font-mono text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Trash2 size={10} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, isOwner, onDelete, onLike, onComment, onLikeComment, onDeleteComment, onReplyComment, onEdit }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [editing, setEditing]           = useState(false);
  const [editContent, setEditContent]   = useState(post.content);
  const [charCount, setCharCount]       = useState(post.content.length);
  const isPostOwner = post.author?.id === currentUser.id;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
    setShowComments(true);
  };

  const handleEditSave = () => {
    if (!editContent.trim()) return;
    onEdit(post.id, editContent);
    setEditing(false);
  };

  const liked = post.likes?.some(l => l.userId === currentUser.id);

  return (
    <div className="bg-black border border-gray-800 hover:border-gray-700 transition relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={10} />
          <div>
            <div className="text-white font-bold text-sm">{post.author?.name}</div>
            <div className="text-gray-600 text-[10px] font-mono">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        {isPostOwner && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setEditing(!editing); setEditContent(post.content); }}
              className="p-1.5 text-gray-600 hover:text-cyan-400 transition"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(post.id)}
              className="p-1.5 text-gray-600 hover:text-red-400 transition"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={editContent}
              onChange={e => { setEditContent(e.target.value); setCharCount(e.target.value.length); }}
              className="w-full bg-gray-900 border border-gray-700 text-white p-3 text-sm font-mono resize-none focus:border-cyan-500 outline-none"
              rows={3} maxLength={500} />
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono ${charCount > 450 ? 'text-yellow-400' : 'text-gray-600'}`}>{charCount}/500</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-xs font-mono text-gray-500 hover:text-white transition">Cancel</button>
                <button type="button" onClick={handleEditSave} className="px-3 py-1 text-xs font-mono bg-cyan-600 text-black hover:bg-cyan-400 transition">Save</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        {post.imageUrl && !editing && (
          <img src={post.imageUrl} alt="" className="w-full rounded border border-gray-800 mt-3 max-h-96 object-cover" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-900">
        <button type="button" onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="font-mono text-xs">{post.likes?.length || 0}</span>
        </button>
        <button type="button" onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition">
          <MessageCircle size={16} />
          <span className="font-mono text-xs">{post.comments?.length || 0}</span>
        </button>
      </div>

      {/* Comments section - CRITICAL: z-20 ensures it renders above everything */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-900 pt-3 relative z-20 bg-black">
          {post.comments?.length === 0 && (
            <p className="text-gray-600 text-xs font-mono italic text-center py-2">No comments yet. Be first.</p>
          )}
          {post.comments?.map(comment => (
            <CommentItem key={comment.id}
              comment={comment}
              postId={post.id}
              postOwnerId={post.author?.id}
              currentUser={currentUser}
              onDelete={onDeleteComment}
              onLike={onLikeComment}
              onReply={onReplyComment}
            />
          ))}
          {/* New comment input */}
          <div className="flex gap-2 mt-2">
            <Avatar src={currentUser.avatar} name={currentUser.name} size={7} />
            <div className="flex-1 flex gap-2">
              <input value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                maxLength={300}
                className="flex-1 bg-black border border-gray-800 text-gray-300 px-3 py-2 text-xs focus:border-cyan-500 outline-none rounded" />
              <button type="button" onClick={submitComment} className="text-cyan-500 hover:text-white transition px-2"><Send size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main UserProfile ──────────────────────────────────────────────────────────
export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [recruiterMode, setRecruiterMode] = useState(false);
  const [posts, setPosts]                 = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage]   = useState('');
  const [charCount, setCharCount]         = useState(0);
  const postImageRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  const isOwner     = currentUser.id === id;

  const cleanUrl = (url) => url?.replace(/^https?:\/\//, '');

  const fetchPosts = useCallback(() => {
    API.get(`/posts/user/${id}`).then(res => setPosts(res.data || []));
  }, [id]);

  useEffect(() => {
    API.get(`/users/${id}`)
      .then(res => { setUser(res.data); setLoading(false); })
      .catch(() => setLoading(false));
    fetchPosts();
  }, [id, fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    await API.post('/posts', { userId: currentUser.id, content: newPostContent, imageUrl: newPostImage || null });
    setNewPostContent(''); setNewPostImage(''); setCharCount(0);
    if (postImageRef.current) postImageRef.current.value = '';
    fetchPosts();
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post permanently?')) return;
    await API.delete(`/posts/${postId}`);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleEditPost = async (postId, content) => {
    const res = await API.patch(`/posts/${postId}`, { content });
    setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
  };

  const handleLikePost = async (postId) => {
    const uid = currentUser.id;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const alreadyLiked = p.likes?.some(l => l.userId === uid);
      return { ...p, likes: alreadyLiked ? p.likes.filter(l => l.userId !== uid) : [...(p.likes || []), { userId: uid }] };
    }));
    await API.post(`/posts/${postId}/like`, { userId: uid }).catch(() => fetchPosts());
  };

  const handleComment = async (postId, content, parentId) => {
    const res = await API.post(`/posts/${postId}/comment`, { content, parentId });
    if (res.data?.id) fetchPosts();
  };

  const handleDeleteComment = async (postId, commentId) => {
    await API.delete(`/posts/${postId}/comment/${commentId}`);
    fetchPosts();
  };

  const handleLikeComment = async (postId, commentId) => {
    await API.post(`/posts/${postId}/comment/${commentId}/like`);
    fetchPosts();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="p-10 text-cyan-500 font-mono animate-pulse bg-[#050505] min-h-screen">SEARCHING_DATABASE...</div>;
  if (!user)   return <div className="p-10 text-red-500 font-mono bg-[#050505] min-h-screen">USER_NOT_FOUND</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button type="button" onClick={() => navigate('/dashboard')} className="p-2 border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setRecruiterMode(!recruiterMode)}
              className={`flex items-center gap-2 px-4 py-2 border font-bold font-['Orbitron'] text-xs transition ${recruiterMode ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10'}`}>
              {recruiterMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {recruiterMode ? 'STUDENT_VIEW' : 'RECRUITER_VIEW'}
            </button>
            {isOwner && (
              <button type="button" onClick={() => navigate('/my-profile')}
                className="flex items-center gap-2 px-4 py-1 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500 hover:text-black transition font-mono text-xs font-bold">
                <Edit3 size={14} /> EDIT_DOSSIER
              </button>
            )}
          </div>
        </div>

        {recruiterMode ? <RecruiterView user={user} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar - profile card - z-0 to stay behind posts */}
            <div className="lg:col-span-4 space-y-6 relative z-0">
              <div className="bg-gray-900/50 border border-cyan-500/30 p-6 flex flex-col items-center text-center relative">
                <div className="w-40 h-40 rounded-full border-4 border-black outline outline-2 outline-cyan-500 overflow-hidden mb-6 bg-black flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <User size={64} className="text-gray-600" />}
                </div>
                <h2 className="text-2xl font-black text-white font-['Orbitron'] uppercase tracking-wider">{user.name}</h2>
                <p className="text-cyan-400 font-mono text-sm mt-1">{user.headline || 'NO_HEADLINE_TAG'}</p>
                <div className="mt-4 px-3 py-1 bg-cyan-900/20 border border-cyan-500/50 rounded text-xs font-bold tracking-widest text-cyan-200">{user.role} CLASS</div>
                {!isOwner && (
                  <button type="button" onClick={() => navigate(`/chat/${user.id}`)} className="w-full mt-6 py-3 bg-white text-black font-bold hover:bg-cyan-400 transition flex items-center justify-center gap-2 font-['Orbitron']">
                    <MessageSquare size={16} /> INITIALIZE_UPLINK
                  </button>
                )}
              </div>

              {user.college && (
                <div className="bg-black border border-purple-500/30 p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-purple-500/5 group-hover:bg-purple-500/10 transition" />
                  <div className="p-3 bg-purple-900/20 rounded border border-purple-500/50 text-purple-400"><Building2 size={24} /></div>
                  <div>
                    <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Affiliated Institution</div>
                    <div className="text-sm font-bold text-white font-['Orbitron'] leading-tight">{user.college}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {user.github && (
                  <a href={`https://${cleanUrl(user.github)}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-gray-900 border border-gray-700 hover:border-white text-gray-400 hover:text-white flex items-center justify-center gap-2 transition">
                    <Github size={16} /> GITHUB
                  </a>
                )}
                {user.linkedin && (
                  <a href={`https://${cleanUrl(user.linkedin)}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-gray-900 border border-gray-700 hover:border-blue-400 text-gray-400 hover:text-blue-400 flex items-center justify-center gap-2 transition">
                    <Linkedin size={16} /> NETWORK
                  </a>
                )}
              </div>
            </div>

            {/* Right content - posts feed - z-10 to render above profile */}
            <div className="lg:col-span-8 space-y-6 relative z-10">
              <div className="bg-gray-900/50 border border-gray-800 p-6">
                <h3 className="text-gray-500 font-mono text-xs mb-4 flex items-center gap-2"><Shield size={14} className="text-cyan-500" /> BIO_DATA_LOG</h3>
                <p className="text-lg text-gray-300 leading-relaxed border-l-2 border-cyan-500/20 pl-4">{user.bio || 'No data.'}</p>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 p-6">
                <h3 className="text-gray-500 font-mono text-xs mb-4 flex items-center gap-2"><Cpu size={14} className="text-yellow-400" /> MODULES</h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills?.map(record => (
                    <span key={record.id} className={`px-3 py-1 border font-mono text-xs font-bold flex items-center gap-1 ${record.isVerified ? 'bg-green-900/20 border-green-500/50 text-green-300' : 'bg-black border-cyan-500/30 text-cyan-400'}`}>
                      {record.skill?.name || record.name}
                      {record.isVerified && <CheckCircle size={10} className="text-green-400" />}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-gray-800">
                <h3 className="text-2xl font-black text-white font-['Orbitron'] mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-cyan-500" /> ACTIVITY_STREAM
                </h3>

                {isOwner && (
                  <div className="bg-gray-900/50 border border-gray-700 p-4 mb-6">
                    <textarea value={newPostContent}
                      onChange={e => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
                      placeholder="Update status log..."
                      maxLength={500}
                      className="w-full bg-black border border-gray-800 text-white p-3 focus:border-cyan-500 outline-none resize-none h-24 font-mono text-sm" />
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <span className={`text-[10px] font-mono ${charCount > 450 ? 'text-yellow-400' : 'text-gray-600'}`}>{charCount}/500</span>
                    </div>
                    {newPostImage && (
                      <div className="relative mb-3 inline-block">
                        <img src={newPostImage} alt="" className="max-h-40 rounded border border-gray-700 object-cover" />
                        <button type="button" onClick={() => { setNewPostImage(''); if (postImageRef.current) postImageRef.current.value = ''; }}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full"><X size={12} /></button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      <button type="button" onClick={() => postImageRef.current.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition text-xs font-mono">
                        <ImageIcon size={14} /> ATTACH_IMAGE
                      </button>
                      <div className="flex-1" />
                      <button type="button" onClick={handleCreatePost}
                        disabled={!newPostContent.trim()}
                        className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-2 font-['Orbitron'] text-sm disabled:opacity-40">
                        POST
                      </button>
                    </div>
                  </div>
                )}

                {posts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-800">
                    <MessageCircle size={40} className="mx-auto text-gray-700 mb-3" />
                    <p className="text-gray-600 font-mono text-sm">NO_ACTIVITY_YET</p>
                    {isOwner && <p className="text-gray-700 font-mono text-xs mt-2">Share something with the network above</p>}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map(post => (
                      <PostCard key={post.id}
                        post={post}
                        currentUser={currentUser}
                        isOwner={isOwner}
                        onDelete={handleDeletePost}
                        onEdit={handleEditPost}
                        onLike={handleLikePost}
                        onComment={handleComment}
                        onLikeComment={handleLikeComment}
                        onDeleteComment={handleDeleteComment}
                        onReplyComment={handleComment}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}