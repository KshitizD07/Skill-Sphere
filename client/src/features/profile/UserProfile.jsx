import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
          <div className="space-y-6">
            {/* ── 1. COMPACT HERO PROFILE CARD ────────────────────────────────── */}
            <div className="bg-surface border border-outline-var/30 rounded-xl p-5 md:p-7 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-bl from-accent/10 via-primary/5 to-transparent rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                {/* Left: Avatar + Identity */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full border-2 border-accent/40 overflow-hidden bg-surface-mid flex items-center justify-center shadow-lg">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name || "Profile avatar"} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <User size={36} className="text-outline" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border-2 border-surface flex items-center justify-center shadow-xs" title="SkillSphere Verified">
                      <Shield size={12} className="text-accent fill-accent/20" />
                    </div>
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-black text-text-primary font-syne tracking-tight truncate">
                        {user.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-syne font-bold uppercase tracking-wider bg-accent/10 border border-accent/30 text-accent">
                        {user.role === 'GUEST' 
                          ? `Guest · ${user.guestPersona || 'Student'}` 
                          : user.role === 'PROFESSIONAL' ? 'Working Professional'
                          : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-text-muted font-outfit line-clamp-2">
                      {user.headline || 'Software Engineer • SkillSphere Member'}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-outline font-syne pt-1 flex-wrap">
                      {user.college && (
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <Building2 size={13} className="text-primary shrink-0" /> {user.college}
                        </span>
                      )}
                      <div className="flex items-center gap-4 text-xs font-outfit">
                        <button
                          type="button"
                          onClick={() => { setModalTab('followers'); setShowFollowModal(true); }}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          <strong className="text-text-primary font-syne">{user.followerCount || 0}</strong> Followers
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => { setModalTab('following'); setShowFollowModal(true); }}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          <strong className="text-text-primary font-syne">{user.followingCount || 0}</strong> Following
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Actions & Social Link Chips */}
                <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {!isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={followingActionLoading}
                          className={`flex-1 sm:flex-initial px-4 py-2 font-bold tracking-wide text-xs uppercase rounded-xs transition-all flex items-center justify-center gap-1.5 font-syne border shadow-xs cursor-pointer ${
                            user.isMutual
                              ? 'bg-accent/10 text-accent border-accent/30 hover:bg-accent/20'
                              : user.isFollowedByMe
                              ? 'bg-surface-mid text-text-muted border-outline-var/40 hover:border-error hover:text-error'
                              : 'bg-primary text-on-primary border-primary hover:bg-secondary-bright'
                          }`}
                        >
                          {user.isMutual ? (
                            <>
                              <Users size={13} className="text-accent" /> Connected ⇄
                            </>
                          ) : user.isFollowedByMe ? (
                            <>
                              <UserCheck size={13} /> Following
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} /> Follow
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/chat/${user.id}`)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-surface-mid hover:bg-surface border border-outline-var/30 text-text-primary font-syne font-bold transition flex items-center justify-center gap-1.5 tracking-wide text-xs uppercase rounded-xs cursor-pointer"
                        >
                          <MessageSquare size={13} /> Message
                        </button>
                      </>
                    )}
                  </div>

                  {/* Social Profile Links */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.github && (
                      <a
                        href={getGithubUrl(user.github)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/40 hover:border-primary text-text-muted hover:text-text-primary text-xs font-syne font-bold uppercase rounded-xs flex items-center gap-1.5 transition-colors"
                        title="GitHub Profile"
                      >
                        <Github size={13} /> GitHub
                      </a>
                    )}
                    {user.linkedin && (
                      <a
                        href={getLinkedinUrl(user.linkedin)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/40 hover:border-blue-400 text-text-muted hover:text-blue-400 text-xs font-syne font-bold uppercase rounded-xs flex items-center gap-1.5 transition-colors"
                        title="LinkedIn Profile"
                      >
                        <Linkedin size={13} /> LinkedIn
                      </a>
                    )}
                    {user.leetcodeUsername && (
                      <a
                        href={`https://leetcode.com/u/${user.leetcodeUsername}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-surface-mid hover:bg-surface border border-outline-var/40 hover:border-[#f59e0b] text-text-muted hover:text-[#f59e0b] text-xs font-syne font-bold uppercase rounded-xs flex items-center gap-1.5 transition-colors"
                        title="LeetCode Profile"
                      >
                        <Cpu size={13} /> LeetCode
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. CORE CREDENTIALS BENTO GRID (ABOVE THE FOLD) ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Bento Column (About + Skills Matrix - 6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                {/* About Card */}
                <div className="bg-surface border border-outline-var/25 rounded-xl p-5 sm:p-6 shadow-sm space-y-3">
                  <h3 className="text-outline font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-accent" /> About
                  </h3>
                  <p className="text-xs sm:text-sm text-text-muted leading-relaxed whitespace-pre-wrap font-outfit">
                    {user.bio || 'No bio added yet.'}
                  </p>
                </div>

                {/* Verified Skills Matrix Card */}
                <div className="bg-surface border border-outline-var/25 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-outline font-syne font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <Cpu size={14} className="text-primary" /> Skills & Competencies ({user.skills?.length || 0})
                    </h3>
                    <span className="text-[10px] font-syne font-extrabold uppercase tracking-wider text-accent bg-accent/10 border border-accent/30 px-2 py-0.5 rounded-full">
                      {user.skills?.filter(s => s.isVerified).length || 0} Verified
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.skills?.length > 0 ? (
                      user.skills.map((record) => (
                        <span
                          key={record.id}
                          className={`px-3 py-1.5 border font-syne text-xs font-bold flex items-center gap-1.5 rounded-xs transition-colors ${
                            record.isVerified
                              ? 'bg-accent/10 border-accent/30 text-accent'
                              : 'bg-surface-mid border-outline-var/30 text-text-muted'
                          }`}
                        >
                          {record.skill?.name || record.name}
                          {record.isVerified && (
                            record.verificationSource === 'GITHUB' ? <Github size={11} className="text-accent" /> :
                            record.verificationSource === 'CREDENTIAL' ? <Award size={11} className="text-accent" /> :
                            <CheckCircle size={11} className="text-accent" />
                          )}
                          {record.calculatedScore && (
                            <span className="text-[10px] font-mono opacity-80">({record.calculatedScore}/10)</span>
                          )}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-outline italic">No skills listed yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Bento Column (LeetCode Benchmark - 6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <LeetCodeCard
                  leetcode={user}
                  isOwner={isOwner}
                  onConnect={() => navigate('/my-profile')}
                />
              </div>

              {/* Full Width: Featured GitHub Projects Showcase (12 cols) */}
              <div className="lg:col-span-12">
                <GitHubProjectsSummary
                  userId={id}
                  userName={user?.name}
                  isOwner={isOwner}
                />
              </div>
            </div>

            {/* ── 3. SOCIAL ACTIVITY & COMMUNITY POSTS (BELOW THE FOLD) ────────── */}
            <div className="pt-8 border-t border-outline-var/25 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-black text-text-primary font-syne tracking-tight flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-primary rounded-full" /> Activity & Community Posts
                </h3>
                <span className="text-xs font-syne font-bold uppercase tracking-wider text-outline">
                  {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
                </span>
              </div>

              {isOwner && (
                <div className="bg-surface border border-outline-var/30 rounded-xl p-5 shadow-sm space-y-3">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
                    placeholder="Share an update with your network..."
                    maxLength={500}
                    className="w-full bg-surface-mid border border-outline-var/20 rounded-md text-text-primary p-3.5 focus:border-primary/60 outline-none resize-none h-24 font-outfit text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-syne tracking-wide ${charCount > 450 ? 'text-error' : 'text-outline'}`}>
                      {charCount}/500
                    </span>
                  </div>
                  {newPostImage && (
                    <div className="relative mb-2 inline-block">
                      <img src={newPostImage} alt="" className="max-h-40 rounded-md border border-outline-var/40 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setNewPostImage(''); if (postImageRef.current) postImageRef.current.value = ''; }}
                        className="absolute -top-2 -right-2 p-1 bg-error text-white rounded-full cursor-pointer shadow-md"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <button
                      type="button"
                      onClick={() => postImageRef.current.click()}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-mid border border-outline-var/40 hover:border-primary text-outline hover:text-primary transition-colors text-xs font-syne font-bold uppercase rounded-xs cursor-pointer"
                    >
                      <ImageIcon size={14} /> Attach Image
                    </button>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={!newPostContent.trim()}
                      className="bg-primary hover:bg-secondary-bright text-on-primary font-syne font-bold px-6 py-2 text-xs uppercase tracking-wider rounded-xs disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                    >
                      POST
                    </button>
                  </div>
                </div>
              )}

              {posts.length === 0 ? (
                <div className="text-center py-16 bg-surface/30 border border-dashed border-outline-var/30 rounded-xl space-y-2">
                  <MessageCircle size={36} className="mx-auto text-outline" />
                  <p className="text-outline font-syne tracking-wide text-sm">No posts published yet.</p>
                  {isOwner && <p className="text-outline font-outfit text-xs">Share your latest achievements with your network above.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
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