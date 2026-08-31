import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api';
import {
  User, ArrowLeft, Github, Linkedin, Cpu, MessageSquare,
  Shield, Edit3, Building2, Heart, MessageCircle, Send,
  Image as ImageIcon, EyeOff, CheckCircle,
  X, Trash2, Pencil, CornerDownRight, Award,
  UserPlus, UserCheck, Users, Sparkles
} from 'lucide-react';
import LeetCodeCard from './LeetCodeCard';
import GitHubProjectsSummary from '../portfolio/GitHubProjectsSummary';
import FollowModal from './components/FollowModal';
import RecruiterDossier from './components/RecruiterDossier';
import ProfileAPI from './profileAPI';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function getGithubUrl(handleOrUrl) {
  if (!handleOrUrl) return '';
  const clean = handleOrUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^github\.com\//, '')
    .replace(/\/$/, '')
    .trim();
  return clean ? `https://github.com/${clean}` : '';
}

function getLinkedinUrl(handleOrUrl) {
  if (!handleOrUrl) return '';
  const clean = handleOrUrl
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/^linkedin\.com\//, '')
    .replace(/\/$/, '')
    .trim();
  return clean ? `https://linkedin.com/${clean.startsWith('in/') ? clean : `in/${clean}`}` : '';
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
        <img src={src} className="w-full h-full object-cover" alt={name || 'User avatar'} loading="lazy" decoding="async" />
      ) : (
        <User size={iconSizeMap[size] || 20} className="text-outline" />
      )}
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
            <span className="text-outline text-[10px] font-syne tracking-wide">{timeAgo(comment.createdAt)}</span>
            <button type="button" onClick={() => onLike(postId, comment.id)}
              className={`flex items-center gap-1 text-[10px] font-syne tracking-wide transition ${liked ? 'text-error' : 'text-outline hover:text-error'}`}>
              <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            <button type="button" onClick={() => setShowReplyBox(!showReplyBox)}
              className="text-[10px] font-syne tracking-wide text-outline hover:text-primary transition flex items-center gap-1">
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
              <button type="button" onClick={() => setShowReplyBox(false)} className="text-outline hover:text-text-primary px-1"><X size={14} /></button>
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
                  <span className="text-outline text-[10px] font-syne tracking-wide">{timeAgo(reply.createdAt)}</span>
                  <button type="button" onClick={() => onLike(postId, reply.id)}
                    className={`flex items-center gap-1 text-[10px] font-syne tracking-wide transition ${reply.likes?.some(l => l.userId === currentUser.id) ? 'text-error' : 'text-outline hover:text-error'}`}>
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
            <div className="text-outline text-[10px] font-syne tracking-wide">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        {isPostOwner && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setEditing(!editing); setEditContent(post.content); }}
              className="p-1.5 text-outline hover:text-primary transition"><Pencil size={14} /></button>
            <button type="button" onClick={() => onDelete(post.id)}
              className="p-1.5 text-outline hover:text-error transition"><Trash2 size={14} /></button>
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
              <span className={`text-[10px] font-syne tracking-wide ${charCount > 450 ? 'text-error' : 'text-outline'}`}>{charCount}/500</span>
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
            <p className="text-outline text-xs font-syne tracking-wide italic text-center py-2">No comments yet. Be first.</p>
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

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user_data') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isOwner     = currentUser.id === id;

  const handleBack = () => {
    if (window.history.length > 2 && window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate('/network');
    }
  };

  const fetchPosts = useCallback(() => {
    API.get(`/posts/user/${id}`).then(res => {
      // Posts route may or may not have envelope — handle both
      const payload = res.data;
      setPosts(Array.isArray(payload) ? payload : (payload?.data || []));
    });
  }, [id]);

  const [showFollowModal, setShowFollowModal] = useState(false);
  const [modalTab, setModalTab] = useState('followers');
  const [followingActionLoading, setFollowingActionLoading] = useState(false);

  const fetchProfile = useCallback(() => {
    API.get(`/users/${id}`)
      .then(res => {
        const payload = res.data;
        setUser(payload?.data ?? payload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchProfile();
    fetchPosts();
  }, [fetchProfile, fetchPosts]);

  const handleFollowToggle = async () => {
    if (!user || followingActionLoading) return;
    const isFollowing = user.isFollowedByMe;
    const newCount = (user.followerCount || 0) + (isFollowing ? -1 : 1);

    setFollowingActionLoading(true);
    // Optimistic UI update
    setUser(prev => ({
      ...prev,
      isFollowedByMe: !isFollowing,
      followerCount: Math.max(0, newCount),
      isMutual: !isFollowing && !!prev.isFollowingMe
    }));

    try {
      if (isFollowing) {
        await ProfileAPI.unfollowUser(id);
      } else {
        await ProfileAPI.followUser(id);
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      setUser(prev => ({
        ...prev,
        isFollowedByMe: isFollowing,
        followerCount: (prev.followerCount || 0) + (isFollowing ? 1 : -1),
        isMutual: isFollowing && !!prev.isFollowingMe
      }));
    } finally {
      setFollowingActionLoading(false);
    }
  };

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
          <button type="button" onClick={handleBack} className="p-2 border border-outline-var/40 hover:border-primary text-outline hover:text-primary transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRecruiterMode(!recruiterMode)}
              className={`flex items-center gap-2 px-3.5 py-1.5 border font-bold font-syne tracking-wider text-xs rounded-xs transition-all shadow-xs cursor-pointer ${
                recruiterMode
                  ? 'bg-accent text-bg-base border-accent font-black shadow-accent/20'
                  : 'bg-surface-mid border-outline-var/40 text-text-primary hover:border-accent/40 hover:text-accent'
              }`}
            >
              {recruiterMode ? <EyeOff size={14} /> : <Sparkles size={14} className="text-accent" />}
              <span>{recruiterMode ? 'Standard View' : 'Recruiter View'}</span>
            </button>
            {isOwner && (
              <button type="button" onClick={() => navigate('/my-profile')}
                className="flex items-center gap-2 px-4 py-1 border border-primary/20 text-primary hover:bg-primary hover:text-on-primary transition font-syne tracking-wide text-xs font-bold rounded-xs cursor-pointer">
                <Edit3 size={14} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {recruiterMode ? <RecruiterDossier user={user} isOwner={isOwner} /> : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar - profile card - z-0 to stay behind posts */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface border border-primary/20 p-6 flex flex-col items-center text-center relative">
                <div className="w-40 h-40 rounded-full border-4 border-black outline outline-2 outline-cyan-500 overflow-hidden mb-6 bg-surface-mid flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                  {user.avatar ? <img src={user.avatar} alt={user.name || "Profile avatar"} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <User size={64} className="text-outline" />}
                </div>
                <h2 className="text-2xl font-black text-text-primary font-syne tracking-wide uppercase tracking-wider">{user.name}</h2>
                <p className="text-primary font-syne tracking-wide text-sm mt-1">{user.headline || 'No headline'}</p>
                <div className="mt-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded text-xs font-bold tracking-widest text-text-primary">
                  {user.role === 'GUEST' 
                    ? `Guest · ${user.guestPersona || 'Student'}` 
                    : user.role === 'PROFESSIONAL' ? 'Working Professional'
                    : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                </div>
                {/* Social Graph: Followers & Following Stats */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-outline-var/20 w-full font-outfit">
                  <button
                    type="button"
                    onClick={() => { setModalTab('followers'); setShowFollowModal(true); }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <span className="font-bold text-base text-text-primary group-hover:text-primary transition-colors">
                      {user.followerCount || 0}
                    </span>
                    <span className="text-[10px] font-syne uppercase tracking-wider text-outline group-hover:text-text-muted">
                      Followers
                    </span>
                  </button>
                  <div className="w-px h-6 bg-outline-var/20" />
                  <button
                    type="button"
                    onClick={() => { setModalTab('following'); setShowFollowModal(true); }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <span className="font-bold text-base text-text-primary group-hover:text-primary transition-colors">
                      {user.followingCount || 0}
                    </span>
                    <span className="text-[10px] font-syne uppercase tracking-wider text-outline group-hover:text-text-muted">
                      Following
                    </span>
                  </button>
                </div>

                {!isOwner && (
                  <div className="w-full mt-4 space-y-2 font-syne">
                    <button
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={followingActionLoading}
                      className={`w-full py-2.5 font-bold tracking-wide text-xs uppercase rounded-xs transition-all flex items-center justify-center gap-2 border shadow-sm ${
                        user.isMutual
                          ? 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20'
                          : user.isFollowedByMe
                          ? 'bg-surface-mid text-text-muted border-outline-var/40 hover:border-error hover:text-error'
                          : 'bg-primary text-on-primary border-primary hover:bg-secondary-bright'
                      }`}
                    >
                      {user.isMutual ? (
                        <>
                          <Users size={14} className="text-accent" /> Connected ⇄
                        </>
                      ) : user.isFollowedByMe ? (
                        <>
                          <UserCheck size={14} /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Follow
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${user.id}`)}
                      className="w-full py-2.5 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-primary font-bold transition flex items-center justify-center gap-2 tracking-wide text-xs uppercase rounded-xs"
                    >
                      <MessageSquare size={14} /> Send Message
                    </button>
                  </div>
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
                  <a href={getGithubUrl(user.github)} target="_blank" rel="noreferrer"
                    className="p-3 bg-surface border border-outline-var/40 hover:border-primary text-text-muted hover:text-text-primary flex items-center justify-center gap-2 transition">
                    <Github size={16} /> GITHUB
                  </a>
                )}
                {user.linkedin && (
                  <a href={getLinkedinUrl(user.linkedin)} target="_blank" rel="noreferrer"
                    className="p-3 bg-surface border border-outline-var/40 hover:border-blue-400 text-text-muted hover:text-primary-container flex items-center justify-center gap-2 transition">
                    <Linkedin size={16} /> NETWORK
                  </a>
                )}
              </div>

              {/* LeetCode Profile Card */}
              <LeetCodeCard
                leetcode={user}
                isOwner={isOwner}
                onConnect={() => navigate('/my-profile')}
              />

              {/* GitHub Projects Showcase Summary */}
              <GitHubProjectsSummary
                userId={id}
                userName={user?.name}
                isOwner={isOwner}
              />
            </div>

            {/* Right content - posts feed - z-10 to render above profile */}
            <div className="lg:col-span-8 space-y-6 relative z-10">
              <div className="bg-surface border border-outline-var/20 p-6">
                <h3 className="text-outline font-syne tracking-wide text-xs mb-4 flex items-center gap-2"><Shield size={14} className="text-accent" /> About</h3>
                <p className="text-lg text-text-muted leading-relaxed border-l-2 border-primary/20 pl-4">{user.bio || 'No bio added yet.'}</p>
              </div>

              <div className="bg-surface border border-outline-var/20 p-6">
                <h3 className="text-outline font-syne tracking-wide text-xs mb-4 flex items-center gap-2"><Cpu size={14} className="text-error" /> Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {user.skills?.map(record => (
                    <span key={record.id} className={`px-3 py-1 border font-syne tracking-wide text-xs font-bold flex items-center gap-1 ${record.isVerified ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface-mid border-primary/20 text-primary'}`}>
                      {record.skill?.name || record.name}
                      {record.isVerified && (
                        record.verificationSource === 'GITHUB' ? <Github size={10} className="text-accent" /> :
                        record.verificationSource === 'CREDENTIAL' ? <Award size={10} className="text-accent" /> :
                        <CheckCircle size={10} className="text-accent" />
                      )}
                    </span>
                  ))}
                </div>              </div>

              <div className="pt-8 border-t border-outline-var/20">
                  <h3 className="text-2xl font-black text-text-primary font-syne tracking-wide mb-6 flex items-center gap-2">
                    <div className="w-2 h-8 bg-primary" /> Activity
                  </h3>

                {isOwner && (
                  <div className="bg-surface border border-outline-var/40 p-4 mb-6">
                    <textarea value={newPostContent}
                      onChange={e => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
                      placeholder="Share an update with your network..."
                      maxLength={500}
                      className="w-full bg-surface-mid border border-outline-var/20 text-text-primary p-3 focus:border-primary outline-none resize-none h-24 font-syne tracking-wide text-sm" />
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <span className={`text-[10px] font-syne tracking-wide ${charCount > 450 ? 'text-error' : 'text-outline'}`}>{charCount}/500</span>
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
                        <ImageIcon size={14} /> Attach Image
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
                    <p className="text-outline font-syne tracking-wide text-sm">No posts yet.</p>
                    {isOwner && <p className="text-outline-var font-syne tracking-wide text-xs mt-2">Share something with your network above.</p>}
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

      {/* Followers / Following Modal */}
      {showFollowModal && (
        <FollowModal
          userId={id}
          initialTab={modalTab}
          followerCount={user?.followerCount || 0}
          followingCount={user?.followingCount || 0}
          onClose={() => setShowFollowModal(false)}
          onFollowChange={fetchProfile}
        />
      )}
    </div>
  );
}