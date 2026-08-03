import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import {
  User, ArrowLeft, Github, Linkedin, Cpu, MessageSquare,
  Shield, Edit3, Building2, Heart, MessageCircle, Send,
  Image as ImageIcon, Eye, EyeOff, CheckCircle, Clock,
  ExternalLink, X, Trash2, Pencil, CornerDownRight, Award
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
    <div className={`${sizeMap[size] || 'w-10 h-10'} rounded-full overflow-hidden border border-outline-var/40 bg-surface shrink-0 flex items-center justify-center`}>
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt={name || ''} />
      ) : (
        <User size={iconSizeMap[size] || 20} className="text-[#656d84]" />
      )}
    </div>
  );
}

// ── Recruiter View ─────────────────────────────────────────────────────────────
function RecruiterView({ user }) {
  const verifiedSkills = user.skills?.filter(s => s.isVerified) || [];
  const allSkills = user.skills || [];
  // eslint-disable-next-line
  const recentActivity = user.activities?.some(a => (Date.now() - new Date(a.createdAt).getTime()) < 30*24*60*60*1000);
  const cleanUrl = (url) => url?.replace(/^https?:\/\//, '');

  return (
    <div className="bg-surface border border-error/30 p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 bg-error/80 text-on-primary px-3 py-1 text-xs font-bold font-syne tracking-wide">RECRUITER_VIEW</div>
      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-error/30 overflow-hidden bg-surface-mid shrink-0">
          {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-[#656d84]" /></div>}
        </div>
        <div>
          <h2 className="text-2xl font-black text-text-primary font-syne tracking-wide uppercase">{user.name}</h2>
          <p className="text-error font-syne tracking-wide text-sm mt-1">{user.headline || 'No headline'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs font-syne tracking-wide text-outline">
            {user.college && <span className="flex items-center gap-1"><Building2 size={12} /> {user.college}</span>}
            <span className="text-outline-var">|</span>
            <span>{user.role === 'GUEST' ? `GUEST ${user.guestPersona || 'STUDENT'}` : user.role}</span>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <h3 className="text-error font-bold font-syne tracking-wide text-sm mb-3 flex items-center gap-2"><CheckCircle size={14} /> TOP_VERIFIED_SKILLS</h3>
        {verifiedSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {verifiedSkills.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1 bg-secondary-bright/10 border border-secondary-bright/30 text-secondary text-xs font-syne tracking-wide font-bold">
                <CheckCircle size={10} className="text-secondary-bright" />
                {s.skill?.name || s.name}
                {s.calculatedScore && <span className="text-green-500/70">{s.calculatedScore}/10</span>}
              </div>
            ))}
          </div>
        ) : <p className="text-[#656d84] text-xs font-syne tracking-wide">No verified skills yet</p>}
      </div>
      {allSkills.length > verifiedSkills.length && (
        <div className="mb-6">
          <h3 className="text-outline font-bold font-syne tracking-wide text-xs mb-2">DECLARED_SKILLS</h3>
          <div className="flex flex-wrap gap-2">
            {allSkills.filter(s => !s.isVerified).map(s => (
              <span key={s.id} className="px-2 py-1 bg-surface-mid border border-outline-var/40 text-text-muted text-xs font-syne tracking-wide">{s.skill?.name || s.name}</span>
            ))}
          </div>
        </div>
      )}
      <div className="mb-6 p-3 bg-surface-mid border border-outline-var/20 flex items-center gap-3">
        <Clock size={14} className={recentActivity ? 'text-secondary-bright' : 'text-[#656d84]'} />
        <span className={`text-xs font-syne tracking-wide font-bold ${recentActivity ? 'text-secondary-bright' : 'text-[#656d84]'}`}>
          {recentActivity ? 'ACTIVE_LAST_30_DAYS' : 'NO_RECENT_ACTIVITY'}
        </span>
      </div>
      <div>
        <h3 className="text-outline font-bold font-syne tracking-wide text-xs mb-3">EVIDENCE_LINKS</h3>
        <div className="flex flex-wrap gap-3">
          {user.github && (
            <a href={`https://${cleanUrl(user.github)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-surface-mid border border-outline-var/40 hover:border-primary text-text-muted hover:text-text-primary text-xs font-syne tracking-wide transition">
              <Github size={12} /> GITHUB <ExternalLink size={10} />
            </a>
          )}
          {user.linkedin && (
            <a href={`https://${cleanUrl(user.linkedin)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-surface-mid border border-outline-var/40 hover:border-blue-400 text-text-muted hover:text-primary-container text-xs font-syne tracking-wide transition">
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
          <div className="bg-surface rounded px-3 py-2">
            <span className="text-primary font-bold text-xs mr-2">{comment.author?.name}</span>
            <span className="text-text-muted text-xs">{comment.content}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[#656d84] text-[10px] font-syne tracking-wide">{timeAgo(comment.createdAt)}</span>
            <button type="button" onClick={() => onLike(postId, comment.id)}
              className={`flex items-center gap-1 text-[10px] font-syne tracking-wide transition ${liked ? 'text-error' : 'text-[#656d84] hover:text-error'}`}>
              <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            <button type="button" onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-[10px] font-syne tracking-wide text-[#656d84] hover:text-primary transition flex items-center gap-1">
              <CornerDownRight size={10} /> Reply
            </button>
            {(isAuthor || isPostOwner) && (
              <button type="button" onClick={() => onDelete(postId, comment.id)}
                className="text-[10px] font-syne tracking-wide text-outline-var hover:text-error transition opacity-0 group-hover:opacity-100 flex items-center gap-1">
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
          {showReplyBox && (
            <div className="flex gap-2 mt-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitReply()}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="flex-1 bg-surface-mid border border-outline-var/20 text-text-muted px-3 py-1.5 text-xs focus:border-primary outline-none rounded" />
              <button type="button" onClick={submitReply} className="text-secondary-bright hover:text-text-primary px-2"><Send size={14} /></button>
              <button type="button" onClick={() => setShowReplyBox(false)} className="text-[#656d84] hover:text-text-primary px-1"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-9 space-y-2 border-l border-outline-var/20 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex gap-2 group">
              <Avatar src={reply.author?.avatar} name={reply.author?.name} size={6} />
              <div className="flex-1 min-w-0">
                <div className="bg-surface rounded px-3 py-1.5">
                  <span className="text-primary font-bold text-xs mr-2">{reply.author?.name}</span>
                  <span className="text-text-muted text-xs">{reply.content}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[#656d84] text-[10px] font-syne tracking-wide">{timeAgo(reply.createdAt)}</span>
                  <button type="button" onClick={() => onLike(postId, reply.id)}
                    className={`flex items-center gap-1 text-[10px] font-syne tracking-wide transition ${reply.likes?.some(l => l.userId === currentUser.id) ? 'text-error' : 'text-[#656d84] hover:text-error'}`}>
                    <Heart size={10} fill={reply.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                    {reply.likes?.length > 0 && reply.likes.length}
                  </button>
                  {(reply.author?.id === currentUser.id || postOwnerId === currentUser.id) && (
                    <button type="button" onClick={() => onDelete(postId, reply.id)}
                      className="text-[10px] font-syne tracking-wide text-outline-var hover:text-error transition opacity-0 group-hover:opacity-100 flex items-center gap-1">
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
function PostCard({ post, currentUser, _isOwner, onDelete, onLike, onComment, onLikeComment, onDeleteComment, onReplyComment, onEdit }) {
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
    <div className="bg-surface-mid border border-outline-var/20 hover:border-outline-var/40 transition relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar src={post.author?.avatar} name={post.author?.name} size={10} />
          <div>
            <div className="text-text-primary font-bold text-sm">{post.author?.name}</div>
            <div className="text-[#656d84] text-[10px] font-syne tracking-wide">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        {isPostOwner && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setEditing(!editing); setEditContent(post.content); }}
              className="p-1.5 text-[#656d84] hover:text-primary transition"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(post.id)}
              className="p-1.5 text-[#656d84] hover:text-error transition"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={editContent}
              onChange={e => { setEditContent(e.target.value); setCharCount(e.target.value.length); }}
              className="w-full bg-surface border border-outline-var/40 text-text-primary p-3 text-sm font-syne tracking-wide resize-none focus:border-primary outline-none"
              rows={3} maxLength={500} />
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-syne tracking-wide ${charCount > 450 ? 'text-error' : 'text-[#656d84]'}`}>{charCount}/500</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(false)} className="px-3 py-1 text-xs font-syne tracking-wide text-outline hover:text-text-primary transition">Cancel</button>
                <button type="button" onClick={handleEditSave} className="px-3 py-1 text-xs font-syne tracking-wide bg-primary-container text-on-primary hover:bg-secondary-bright transition">Save</button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        {post.imageUrl && !editing && (
          <img src={post.imageUrl} alt="" className="w-full rounded border border-outline-var/20 mt-3 max-h-96 object-cover" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-900">
        <button type="button" onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition ${liked ? 'text-error' : 'text-outline hover:text-error'}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="font-syne tracking-wide text-xs">{post.likes?.length || 0}</span>
        </button>
        <button type="button" onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-outline hover:text-primary transition">
          <MessageCircle size={16} />
          <span className="font-syne tracking-wide text-xs">{post.comments?.length || 0}</span>
        </button>
      </div>

      {/* Comments section - CRITICAL: z-20 ensures it renders above everything */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-900 pt-3 relative z-20 bg-surface-mid">
          {post.comments?.length === 0 && (
            <p className="text-[#656d84] text-xs font-syne tracking-wide italic text-center py-2">No comments yet. Be first.</p>
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
                className="flex-1 bg-surface-mid border border-outline-var/20 text-text-muted px-3 py-2 text-xs focus:border-primary outline-none rounded" />
              <button type="button" onClick={submitComment} className="text-secondary-bright hover:text-text-primary transition px-2"><Send size={16} /></button>
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

  if (loading) return <div className="p-10 text-secondary-bright font-syne tracking-wide animate-pulse bg-bg-base min-h-screen">SEARCHING_DATABASE...</div>;
  if (!user)   return <div className="p-10 text-error font-syne tracking-wide bg-bg-base min-h-screen">USER_NOT_FOUND</div>;

  return (
    <div className="min-h-screen bg-bg-base text-text-muted font-outfit p-4 md:p-8 relative selection:bg-primary selection:text-on-primary">
      <div className="w-full max-w-[1400px] mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button type="button" onClick={() => navigate(-1)} className="p-2 border border-outline-var/40 hover:border-primary text-outline hover:text-primary transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setRecruiterMode(!recruiterMode)}
              className={`flex items-center gap-2 px-4 py-2 border font-bold font-syne tracking-wide text-xs transition ${recruiterMode ? 'bg-error/80 border-error/30 text-on-primary' : 'border-error/30 text-error hover:bg-yellow-500/10'}`}>
              {recruiterMode ? <EyeOff size={14} /> : <Eye size={14} />}
              {recruiterMode ? 'STUDENT_VIEW' : 'RECRUITER_VIEW'}
            </button>
            {isOwner && (
              <button type="button" onClick={() => navigate('/my-profile')}
                className="flex items-center gap-2 px-4 py-1 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition font-syne tracking-wide text-xs font-bold">
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {recruiterMode ? <RecruiterView user={user} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar - profile card - z-0 to stay behind posts */}
            <div className="lg:col-span-4 space-y-6 relative z-0">
              <div className="bg-surface border border-primary/20 p-6 flex flex-col items-center text-center relative">
                <div className="w-40 h-40 rounded-full border-4 border-black outline outline-2 outline-cyan-500 overflow-hidden mb-6 bg-surface-mid flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <User size={64} className="text-[#656d84]" />}
                </div>
                <h2 className="text-2xl font-black text-text-primary font-syne tracking-wide uppercase tracking-wider">{user.name}</h2>
                <p className="text-primary font-syne tracking-wide text-sm mt-1">{user.headline || 'NO_HEADLINE_TAG'}</p>
                <div className="mt-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-xs font-bold tracking-widest text-text-primary">
                  {user.role === 'GUEST' 
                    ? `GUEST ${user.guestPersona || 'STUDENT'}` 
                    : `${user.role} CLASS`}
                </div>
                {!isOwner && (
                  <button type="button" onClick={() => navigate(`/chat/${user.id}`)} className="w-full mt-6 py-3 bg-primary text-on-primary font-bold hover:bg-secondary-bright transition flex items-center justify-center gap-2 font-syne tracking-wide">
                    <MessageSquare size={16} /> INITIALIZE_UPLINK
                  </button>
                )}
              </div>

              {user.college && (
                <div className="bg-surface-mid border border-primary-container/30 p-4 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary-container/10 group-hover:bg-primary-container/10 transition" />
                  <div className="p-3 bg-primary-container/10 rounded border border-primary-container/30 text-primary"><Building2 size={24} /></div>
                  <div>
                    <div className="text-[10px] font-syne tracking-wide text-outline uppercase tracking-widest">Affiliated Institution</div>
                    <div className="text-sm font-bold text-text-primary font-syne tracking-wide leading-tight">{user.college}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {user.github && (
                  <a href={`https://${cleanUrl(user.github)}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-surface border border-outline-var/40 hover:border-primary text-text-muted hover:text-text-primary flex items-center justify-center gap-2 transition">
                    <Github size={16} /> GITHUB
                  </a>
                )}
                {user.linkedin && (
                  <a href={`https://${cleanUrl(user.linkedin)}`} target="_blank" rel="noreferrer"
                    className="p-3 bg-surface border border-outline-var/40 hover:border-blue-400 text-text-muted hover:text-primary-container flex items-center justify-center gap-2 transition">
                    <Linkedin size={16} /> NETWORK
                  </a>
                )}
              </div>
            </div>

            {/* Right content - posts feed - z-10 to render above profile */}
            <div className="lg:col-span-8 space-y-6 relative z-10">
              <div className="bg-surface border border-outline-var/20 p-6">
                <h3 className="text-outline font-syne tracking-wide text-xs mb-4 flex items-center gap-2"><Shield size={14} className="text-secondary-bright" /> BIO_DATA_LOG</h3>
                <p className="text-lg text-text-muted leading-relaxed border-l-2 border-primary/20 pl-4">{user.bio || 'No data.'}</p>
              </div>

              <div className="bg-surface border border-outline-var/20 p-6">
                <h3 className="text-outline font-syne tracking-wide text-xs mb-4 flex items-center gap-2"><Cpu size={14} className="text-error" /> MODULES</h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills?.map(record => (
                    <span key={record.id} className={`px-3 py-1 border font-syne tracking-wide text-xs font-bold flex items-center gap-1 ${record.isVerified ? 'bg-secondary-bright/10 border-secondary-bright/30 text-secondary' : 'bg-surface-mid border-primary/20 text-primary'}`}>
                      {record.skill?.name || record.name}
                      {record.isVerified && (
                        record.verificationSource === 'GITHUB' ? <Github size={10} className="text-secondary-bright" /> :
                        record.verificationSource === 'CREDENTIAL' ? <Award size={10} className="text-secondary-bright" /> :
                        <CheckCircle size={10} className="text-secondary-bright" />
                      )}
                    </span>
                  ))}
                </div>              </div>

              <div className="pt-8 border-t border-outline-var/20">
                <h3 className="text-2xl font-black text-text-primary font-syne tracking-wide mb-6 flex items-center gap-2">
                  <div className="w-2 h-8 bg-primary" /> ACTIVITY_STREAM
                </h3>

                {isOwner && (
                  <div className="bg-surface border border-outline-var/40 p-4 mb-6">
                    <textarea value={newPostContent}
                      onChange={e => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
                      placeholder="Update status log..."
                      maxLength={500}
                      className="w-full bg-surface-mid border border-outline-var/20 text-text-primary p-3 focus:border-primary outline-none resize-none h-24 font-syne tracking-wide text-sm" />
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <span className={`text-[10px] font-syne tracking-wide ${charCount > 450 ? 'text-error' : 'text-[#656d84]'}`}>{charCount}/500</span>
                    </div>
                    {newPostImage && (
                      <div className="relative mb-3 inline-block">
                        <img src={newPostImage} alt="" className="max-h-40 rounded border border-outline-var/40 object-cover" />
                        <button type="button" onClick={() => { setNewPostImage(''); if (postImageRef.current) postImageRef.current.value = ''; }}
                          className="absolute -top-2 -right-2 p-1 bg-error-container hover:bg-error-container text-text-primary rounded-full"><X size={12} /></button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      <button type="button" onClick={() => postImageRef.current.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-mid border border-outline-var/40 hover:border-primary text-outline hover:text-primary transition text-xs font-syne tracking-wide">
                        <ImageIcon size={14} /> ATTACH_IMAGE
                      </button>
                      <div className="flex-1" />
                      <button type="button" onClick={handleCreatePost}
                        disabled={!newPostContent.trim()}
                        className="bg-primary-container hover:bg-primary text-on-primary font-bold px-6 py-2 font-syne tracking-wide text-sm disabled:opacity-40">
                        POST
                      </button>
                    </div>
                  </div>
                )}

                {posts.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-outline-var/20">
                    <MessageCircle size={40} className="mx-auto text-outline-var mb-3" />
                    <p className="text-[#656d84] font-syne tracking-wide text-sm">NO_ACTIVITY_YET</p>
                    {isOwner && <p className="text-outline-var font-syne tracking-wide text-xs mt-2">Share something with the network above</p>}
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