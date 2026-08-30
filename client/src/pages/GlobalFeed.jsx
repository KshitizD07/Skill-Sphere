import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart, User, Building2, Image as ImageIcon, X,
  MessageCircle, Send, CornerDownRight, Trash2, Pencil,
  Share2, Flag, ArrowUp, Loader2, ThumbsUp,
  AlertTriangle, ExternalLink, Users, MoreVertical, Shield
} from 'lucide-react';
import FeedAPI from '../features/feed/feedAPI';
import API from '../api';
import Navbar from '../shared/components/Navbar';
import { useToast, ToastContainer } from '../shared/components/Toast';

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Avatar({ src, name, size = 10 }) {
  const sizeMap = { 6: 'w-6 h-6', 7: 'w-7 h-7', 8: 'w-8 h-8', 10: 'w-10 h-10', 12: 'w-12 h-12' };
  const iconSizeMap = { 6: 12, 7: 14, 8: 16, 10: 20, 12: 24 };

  return (
    <div className={`${sizeMap[size] || 'w-10 h-10'} rounded-full overflow-hidden border border-outline-var/40 bg-surface-mid shrink-0 flex items-center justify-center`}>
      {src ? (
        <img src={src} loading="lazy" className="w-full h-full object-cover" alt={name || 'Avatar'} />
      ) : (
        <User size={iconSizeMap[size] || 20} className="text-outline" />
      )}
    </div>
  );
}

// ── Comment Item Component ───────────────────────────────────────────────────
function CommentItem({ comment, postId, postOwnerId, currentUser, onDelete, onLike, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isAuthor = comment.author?.id === currentUser.id;
  const isPostOwner = postOwnerId === currentUser.id;
  const liked = comment.isLikedByMe || comment.likes?.includes(currentUser.id);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(postId, replyText, comment.id);
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className="space-y-1.5 relative z-20 font-outfit">
      <div className="flex gap-2 group">
        <Avatar src={comment.author?.avatar} name={comment.author?.name} size={7} />
        <div className="flex-1 min-w-0">
          <div className="bg-surface-mid rounded-xs px-3 py-2 border border-outline-var/20">
            <span className="text-primary font-semibold text-xs mr-2">
              {comment.isDeleted ? '[deleted]' : comment.author?.name}
            </span>
            <span className={`text-xs ${comment.isDeleted ? 'text-outline italic' : 'text-text-muted'}`}>
              {comment.content}
            </span>
          </div>
          {!comment.isDeleted && (
            <div className="flex items-center gap-3 mt-1 px-1">
              <span className="text-outline text-[10px] font-syne">{timeAgo(comment.createdAt)}</span>
              <button
                onClick={() => onLike(postId, comment.id)}
                className={`flex items-center gap-1 text-[10px] transition ${liked ? 'text-error font-bold' : 'text-outline hover:text-error'}`}
              >
                <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
                {comment.likeCount > 0 && comment.likeCount}
              </button>
              <button
                onClick={() => setShowReply(!showReply)}
                className="text-[10px] text-outline hover:text-secondary-bright transition flex items-center gap-1 font-syne"
              >
                <CornerDownRight size={10} /> Reply
              </button>
              {(isAuthor || isPostOwner) && (
                <button
                  onClick={() => onDelete(postId, comment.id)}
                  className="text-[10px] text-outline-var hover:text-error transition opacity-0 group-hover:opacity-100"
                  title="Delete comment"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          )}
          {showReply && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReply()}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="flex-1 bg-surface-mid border border-outline-var/40 text-text-muted px-3 py-1.5 text-xs focus:border-primary/50 outline-none rounded-xs placeholder-outline-var font-outfit"
              />
              <button onClick={submitReply} className="text-primary hover:text-secondary-bright px-2 transition-colors">
                <Send size={14} />
              </button>
              <button onClick={() => setShowReply(false)} className="text-outline hover:text-text-primary px-1 transition-colors">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
        <div className="ml-9 space-y-1.5 border-l border-outline-var/30 pl-3">
          {comment.replies.map((reply) => {
            const replyLiked = reply.isLikedByMe || reply.likes?.includes(currentUser.id);
            return (
              <div key={reply.id} className="flex gap-2 group">
                <Avatar src={reply.author?.avatar} name={reply.author?.name} size={6} />
                <div className="flex-1 min-w-0">
                  <div className="bg-surface-mid rounded-xs px-3 py-1.5 border border-outline-var/20">
                    <span className="text-primary font-semibold text-xs mr-2">
                      {reply.isDeleted ? '[deleted]' : reply.author?.name}
                    </span>
                    <span className={`text-xs ${reply.isDeleted ? 'text-outline italic' : 'text-text-muted'}`}>
                      {reply.content}
                    </span>
                  </div>
                  {!reply.isDeleted && (
                    <div className="flex items-center gap-3 mt-0.5 px-1">
                      <span className="text-outline text-[10px] font-syne">{timeAgo(reply.createdAt)}</span>
                      <button
                        onClick={() => onLike(postId, reply.id)}
                        className={`flex items-center gap-1 text-[10px] transition ${replyLiked ? 'text-error font-bold' : 'text-outline hover:text-error'}`}
                      >
                        <Heart size={10} fill={replyLiked ? 'currentColor' : 'none'} />
                        {reply.likeCount > 0 && reply.likeCount}
                      </button>
                      {(reply.author?.id === currentUser.id || isPostOwner) && (
                        <button
                          onClick={() => onDelete(postId, reply.id)}
                          className="text-[10px] text-outline-var hover:text-error opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Post Card Component ───────────────────────────────────────────────────────
function PostCard({
  post,
  currentUser,
  onDelete,
  onEdit,
  onLike,
  onComment,
  onLikeComment,
  onDeleteComment,
  onReply,
  onOpenLikesModal,
  onOpenReportModal,
  onShare,
  navigate,
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isOwner = post.author?.id === currentUser.id;
  const liked = post.isLikedByMe || post.likes?.some((l) => l.userId === currentUser.id);

  const isLongContent = post.content.length > 280;
  const displayContent = isLongContent && !isExpanded ? `${post.content.slice(0, 280)}...` : post.content;

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText('');
    setShowComments(true);
  };

    const isOfficial = post.author?.email === 'official@skillsphere.com' || post.author?.name === 'SkillSphere' || post.author?.role === 'ADMIN';

    return (
      <div className={`bg-surface border rounded-md hover:border-secondary/20 transition-colors group relative font-outfit ${isOfficial ? 'border-primary/40 bg-gradient-to-b from-surface to-surface-mid/40 shadow-sm' : 'border-outline-var/20'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 mr-2" onClick={() => navigate(`/profile/${post.author?.id}`)}>
            <Avatar src={post.author?.avatar} name={post.author?.name} size={10} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-text-primary font-semibold hover:text-primary transition-colors text-sm truncate">
                  {post.author?.name}
                </span>
                {isOfficial ? (
                  <span className="px-2 py-0.5 bg-primary/15 border border-primary/30 text-primary text-[9px] font-syne font-bold uppercase rounded-xs flex items-center gap-1 shadow-xs">
                    <Shield size={10} /> Official
                  </span>
                ) : post.author?.role === 'PROFESSIONAL' ? (
                  <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[9px] font-syne font-bold uppercase rounded-xs">
                    Pro
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-syne text-outline truncate">
                {post.author?.headline && <span className="truncate">{post.author.headline}</span>}
                {post.author?.college && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Building2 size={10} /> {post.author.college}
                  </span>
                )}
              </div>
            </div>
        </div>

        {/* 3-Dot Options Dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-outline hover:text-text-primary transition-colors rounded-xs hover:bg-surface-mid"
            title="More options"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface-mid border border-outline-var/40 rounded-xs shadow-2xl z-50 py-1 font-outfit text-xs">
              <button
                type="button"
                onClick={() => {
                  onShare(post.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-text-primary hover:bg-surface flex items-center gap-2 transition-colors"
              >
                <Share2 size={13} className="text-primary" /> Copy Link
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setEditContent(post.content);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-text-primary hover:bg-surface flex items-center gap-2 transition-colors"
                >
                  <Pencil size={13} className="text-primary" /> Edit Post
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-error hover:bg-surface flex items-center gap-2 transition-colors border-t border-outline-var/20"
                >
                  <Trash2 size={13} /> Delete Post
                </button>
              )}

              {!isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenReportModal(post.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-[#f59e0b] hover:bg-surface flex items-center gap-2 transition-colors border-t border-outline-var/20"
                >
                  <Flag size={13} /> Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-surface-mid border border-outline-var/40 text-text-primary p-3 text-sm font-outfit resize-none focus:border-primary/50 outline-none rounded-xs"
              rows={4}
              maxLength={2000}
            />
            <div className="flex justify-between items-center text-xs">
              <span className="text-outline font-syne">{editContent.length}/2000</span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-outline hover:text-text-primary">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onEdit(post.id, editContent);
                    setEditing(false);
                  }}
                  className="px-3 py-1 text-xs bg-primary text-on-primary font-syne font-bold uppercase rounded-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary text-xs font-syne font-bold hover:underline mt-1 focus:outline-none"
              >
                {isExpanded ? 'See less' : '... See more'}
              </button>
            )}
          </div>
        )}

        {post.imageUrl && (
          <div className="mt-3 cursor-pointer overflow-hidden rounded-xs border border-outline-var/20 group/img">
            <img
              src={post.imageUrl}
              loading="lazy"
              alt="Attachment"
              onClick={() => setShowImageLightbox(true)}
              className="w-full max-h-96 object-cover hover:scale-[1.01] transition-transform duration-300"
            />
          </div>
        )}
      </div>

      {/* Actions & Counts Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-var/15">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-error' : 'text-outline hover:text-error'}`}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            <span
              onClick={(e) => {
                e.stopPropagation();
                if ((post.likeCount || post.likes?.length) > 0) onOpenLikesModal(post.id);
              }}
              className="font-syne text-xs hover:underline cursor-pointer"
            >
              {post.likeCount ?? post.likes?.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-sm text-outline hover:text-primary transition-colors"
          >
            <MessageCircle size={16} />
            <span className="font-syne text-xs">{post.commentCount ?? post.comments?.length ?? 0}</span>
          </button>
        </div>

        {/* Post Timestamp (Positioned on the bottom right) */}
        <div className="text-outline text-[11px] font-syne tracking-wide flex items-center gap-1 select-none">
          {timeAgo(post.createdAt)}
        </div>
      </div>

      {/* Expandable Comment Section */}
      {showComments && (
        <div className="px-4 pb-4 pt-3 border-t border-outline-var/15 space-y-3 bg-surface-mid/30">
          {(!post.comments || post.comments.length === 0) && (
            <p className="text-outline text-xs italic text-center py-1">No comments yet. Be the first to comment!</p>
          )}

          {post.comments?.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              postOwnerId={post.author?.id}
              currentUser={currentUser}
              onDelete={onDeleteComment}
              onLike={onLikeComment}
              onReply={onReply}
            />
          ))}

          {/* New Comment Compose */}
          <div className="flex gap-2 pt-2 border-t border-outline-var/15">
            <Avatar src={currentUser.avatar} name={currentUser.name} size={7} />
            <div className="flex-1 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                maxLength={500}
                className="flex-1 bg-surface-mid border border-outline-var/40 text-text-muted px-3 py-2 text-xs focus:border-primary/50 outline-none rounded-xs placeholder-outline-var"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="text-primary hover:text-secondary-bright disabled:opacity-40 px-2 transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {showImageLightbox && (
        <div 
          className="fixed inset-0 bg-bg-base/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setShowImageLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowImageLightbox(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-error transition-colors"
            >
              <X size={24} />
            </button>
            <img src={post.imageUrl} alt="Expanded Attachment" className="max-h-[85vh] max-w-full rounded-xs shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN GLOBAL FEED COMPONENT ───────────────────────────────────────────────
export default function GlobalFeed() {
  const navigate = useNavigate();
  const [_searchParams] = useSearchParams();
  const toast = useToast();

  const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');

  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'following'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [charCount, setCharCount] = useState(0);
  const postImageRef = useRef(null);

  // Modals state
  const [likesModalPostId, setLikesModalPostId] = useState(null);
  const [likersList, setLikersList] = useState([]);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const [reportModalPostId, setReportModalPostId] = useState(null);
  const [reportReason, setReportReason] = useState('SPAM');
  const [reportDetail, setReportDetail] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const [showScrollTop, setShowScrollTop] = useState(false);

  // ── Load Feed with Cursor Pagination ──────────────────────────────────────
  const loadInitialFeed = useCallback(async (tab = feedTab) => {
    setLoading(true);
    try {
      const fn = tab === 'following' ? FeedAPI.getFollowingPosts : FeedAPI.getPosts;
      const res = await fn(null, 10);
      if (res?.posts) {
        setPosts(res.posts);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } else {
        const raw = await API.get('/posts/all').catch(() => ({ data: [] }));
        setPosts(Array.isArray(raw.data) ? raw.data : []);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, [feedTab]);

  const handleTabSwitch = (tab) => {
    if (tab === feedTab) return;
    setFeedTab(tab);
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    loadInitialFeed(tab);
  };

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const fn = feedTab === 'following' ? FeedAPI.getFollowingPosts : FeedAPI.getPosts;
      const res = await fn(nextCursor, 10);
      if (res?.posts) {
        setPosts((prev) => [...prev, ...res.posts]);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    } catch {
      // Non-critical error
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitialFeed(feedTab);
  }, [loadInitialFeed, feedTab]);

  // Handle scroll to top visibility
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  // ── Create Post ───────────────────────────────────────────────────────────
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error('Post content cannot be empty.');
      return;
    }
    try {
      const newPost = await FeedAPI.createPost({
        content: newPostContent.trim(),
        imageUrl: newPostImage || null,
      });

      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
        setNewPostContent('');
        setNewPostImage('');
        setCharCount(0);
        if (postImageRef.current) postImageRef.current.value = '';
        toast.success('Post published to feed!', { title: 'Post Published' });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create post.');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setNewPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Optimistic Like Toggle ────────────────────────────────────────────────
  const handleLike = async (postId) => {
    const uid = currentUser.id;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const alreadyLiked = p.isLikedByMe || p.likes?.some((l) => l.userId === uid);
        const newCount = Math.max(0, (p.likeCount ?? p.likes?.length ?? 0) + (alreadyLiked ? -1 : 1));
        return {
          ...p,
          isLikedByMe: !alreadyLiked,
          likeCount: newCount,
          likes: alreadyLiked ? p.likes?.filter((l) => l.userId !== uid) : [...(p.likes || []), { userId: uid }],
        };
      })
    );

    try {
      await FeedAPI.likePost(postId);
    } catch {
      // Revert if API fails
      loadInitialFeed();
    }
  };

  // ── Edit & Delete Post ────────────────────────────────────────────────────
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await FeedAPI.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success('Post removed');
    } catch (err) {
      toast.error(err.message || 'Failed to delete post.');
    }
  };

  const handleEditPost = async (postId, content) => {
    try {
      const res = await FeedAPI.updatePost(postId, content);
      if (res) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content } : p)));
        toast.success('Post updated');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update post.');
    }
  };

  // ── Comments ──────────────────────────────────────────────────────────────
  const handleComment = async (postId, content, parentId = null) => {
    const optId = `opt_${Date.now()}`;
    const optimisticComment = {
      id: optId,
      postId,
      parentId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      author: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      likes: [],
      likeCount: 0,
      isLikedByMe: false,
      replies: [],
    };

    // Store backup
    const originalPosts = [...posts];

    // Optimistically update UI
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const commentCount = (p.commentCount ?? p.comments?.length ?? 0) + 1;
        let updatedComments = [...(p.comments || [])];

        if (!parentId) {
          updatedComments.push(optimisticComment);
        } else {
          updatedComments = updatedComments.map((c) => {
            if (c.id === parentId) {
              return { ...c, replies: [...(c.replies || []), optimisticComment] };
            }
            return c;
          });
        }

        return { ...p, commentCount, comments: updatedComments };
      })
    );

    try {
      const res = await FeedAPI.createComment(postId, content, parentId);
      const newComment = res?.data || res;
      if (newComment) {
        // Swap optimistic comment with server comment
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            let updatedComments = [...(p.comments || [])];
            if (!parentId) {
              updatedComments = updatedComments.map((c) => (c.id === optId ? newComment : c));
            } else {
              updatedComments = updatedComments.map((c) => {
                if (c.id === parentId) {
                  return {
                    ...c,
                    replies: (c.replies || []).map((r) => (r.id === optId ? newComment : r)),
                  };
                }
                return c;
              });
            }
            return { ...p, comments: updatedComments };
          })
        );
        toast.success('Comment posted');
      }
    } catch (err) {
      // Revert on error
      setPosts(originalPosts);
      toast.error(err.message || 'Failed to post comment.');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    const originalPosts = [...posts];

    // Optimistically update UI
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        let commentCount = p.commentCount ?? p.comments?.length ?? 0;
        let updatedComments = [...(p.comments || [])];

        // Try to find in top-level comments
        const commentIndex = updatedComments.findIndex((c) => c.id === commentId);
        if (commentIndex !== -1) {
          const comment = updatedComments[commentIndex];
          if (comment.replies && comment.replies.length > 0) {
            // Soft delete
            updatedComments[commentIndex] = { ...comment, content: '[deleted]', isDeleted: true };
          } else {
            // Hard delete
            updatedComments.splice(commentIndex, 1);
            commentCount = Math.max(0, commentCount - 1);
          }
        } else {
          // Look in replies
          updatedComments = updatedComments.map((c) => {
            const replyIndex = (c.replies || []).findIndex((r) => r.id === commentId);
            if (replyIndex !== -1) {
              const updatedReplies = [...c.replies];
              updatedReplies.splice(replyIndex, 1);
              commentCount = Math.max(0, commentCount - 1);
              return { ...c, replies: updatedReplies };
            }
            return c;
          });
        }

        return { ...p, commentCount, comments: updatedComments };
      })
    );

    try {
      await FeedAPI.deleteComment(postId, commentId);
      toast.success('Comment deleted');
    } catch (err) {
      setPosts(originalPosts);
      toast.error(err.message || 'Failed to delete comment.');
    }
  };

  const handleLikeComment = async (postId, commentId) => {
    const originalPosts = [...posts];

    // Optimistically toggle like
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const updatedComments = (p.comments || []).map((c) => {
          // Top-level comment match
          if (c.id === commentId) {
            const alreadyLiked = c.isLikedByMe;
            const likeCount = Math.max(0, (c.likeCount || 0) + (alreadyLiked ? -1 : 1));
            const likes = alreadyLiked ? (c.likes || []).filter((id) => id !== currentUser.id) : [...(c.likes || []), currentUser.id];
            return { ...c, isLikedByMe: !alreadyLiked, likeCount, likes };
          }
          // Reply match
          const replyMatchIndex = (c.replies || []).findIndex((r) => r.id === commentId);
          if (replyMatchIndex !== -1) {
            const updatedReplies = [...c.replies];
            const r = updatedReplies[replyMatchIndex];
            const alreadyLiked = r.isLikedByMe;
            const likeCount = Math.max(0, (r.likeCount || 0) + (alreadyLiked ? -1 : 1));
            const likes = alreadyLiked ? (r.likes || []).filter((id) => id !== currentUser.id) : [...(r.likes || []), currentUser.id];
            updatedReplies[replyMatchIndex] = { ...r, isLikedByMe: !alreadyLiked, likeCount, likes };
            return { ...c, replies: updatedReplies };
          }
          return c;
        });
        return { ...p, comments: updatedComments };
      })
    );

    try {
      await FeedAPI.likeComment(postId, commentId);
    } catch {
      setPosts(originalPosts);
    }
  };

  // ── Likes Modal ───────────────────────────────────────────────────────────
  const openLikesModal = async (postId) => {
    setLikesModalPostId(postId);
    setLoadingLikers(true);
    try {
      const res = await FeedAPI.getPostLikes(postId);
      setLikersList(res.users || []);
    } catch {
      setLikersList([]);
    } finally {
      setLoadingLikers(false);
    }
  };

  // ── Share Post Link ───────────────────────────────────────────────────────
  const handleSharePost = (postId) => {
    const link = `${window.location.origin}/grid?post=${postId}`;
    navigator.clipboard.writeText(link);
    toast.success('Post link copied to clipboard!', { title: 'Link Copied' });
  };

  // ── Report Post ───────────────────────────────────────────────────────────
  const submitReport = async () => {
    if (!reportModalPostId) return;
    setIsReporting(true);
    try {
      const res = await FeedAPI.reportPost(reportModalPostId, reportReason, reportDetail);
      toast.success(res.message || 'Report submitted. Thank you!', { title: 'Report Submitted' });
      setReportModalPostId(null);
      setReportDetail('');
    } catch (err) {
      toast.error(err.message || 'Failed to submit report.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('user_data');
    localStorage.removeItem('ss_token');
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-outfit flex flex-col md:flex-row">
      <Navbar user={currentUser} onLogout={handleLogout} />
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />

      <div className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen overflow-y-auto overflow-x-hidden p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">

        {/* Feed Type Switcher (All vs Following) */}
        <div className="flex items-center gap-2 mb-6 border-b border-outline-var/20 pb-2">
          <button
            onClick={() => handleTabSwitch('all')}
            className={`px-4 py-2 font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all border ${
              feedTab === 'all'
                ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/20'
                : 'bg-surface-mid/60 text-text-muted border-outline-var/30 hover:text-text-primary'
            }`}
          >
            All Updates
          </button>
          <button
            onClick={() => handleTabSwitch('following')}
            className={`px-4 py-2 font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all border flex items-center gap-1.5 ${
              feedTab === 'following'
                ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/20'
                : 'bg-surface-mid/60 text-text-muted border-outline-var/30 hover:text-text-primary'
            }`}
          >
            <Users size={12} /> Following
          </button>
        </div>

        {/* Post Composer Card */}
        {currentUser.id && (
          <div className="bg-surface border border-outline-var/20 rounded-md p-5 mb-6 shadow-sm font-outfit">
            <div className="flex items-start gap-3">
              <Avatar src={currentUser.avatar} name={currentUser.name} size={10} />
              <div className="flex-1 min-w-0">
                <textarea
                  value={newPostContent}
                  onChange={(e) => {
                    setNewPostContent(e.target.value);
                    setCharCount(e.target.value.length);
                  }}
                  placeholder={`What's on your mind, ${currentUser.name?.split(' ')[0] || 'developer'}?`}
                  maxLength={2000}
                  className="w-full bg-surface-mid border border-outline-var/30 text-text-primary p-3 focus:border-primary/50 outline-none resize-none h-24 text-sm rounded-xs placeholder-outline-var transition-colors leading-relaxed"
                />
                <div className="flex items-center justify-between mt-2 mb-2.5">
                  <span className={`font-syne text-[10px] ${charCount > 1800 ? 'text-error font-bold' : 'text-outline'}`}>
                    {charCount}/2000
                  </span>
                </div>

                {newPostImage && (
                  <div className="relative mb-3 inline-block">
                    <img src={newPostImage} alt="Preview" className="max-h-40 rounded-xs border border-outline-var/30 object-cover shadow" />
                    <button
                      onClick={() => {
                        setNewPostImage('');
                        if (postImageRef.current) postImageRef.current.value = '';
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-error text-white rounded-full transition-colors shadow"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 items-center justify-between border-t border-outline-var/20 pt-3">
                  <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <button
                    onClick={() => postImageRef.current.click()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface-mid border border-outline-var/30 hover:border-primary/40 text-outline hover:text-primary transition-all text-xs font-syne font-bold rounded-xs uppercase tracking-wide"
                  >
                    <ImageIcon size={14} /> Attach Image
                  </button>

                  <button
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim()}
                    className="bg-primary text-on-primary font-syne font-bold px-6 py-2 rounded-xs text-xs uppercase tracking-[0.1em] hover:bg-secondary-bright disabled:opacity-40 transition-all shadow-md"
                  >
                    Publish Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface border border-outline-var/20 p-5 rounded-md space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-mid" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-surface-mid rounded w-1/4" />
                    <div className="h-2 bg-surface-mid rounded w-1/6" />
                  </div>
                </div>
                <div className="h-4 bg-surface-mid rounded w-3/4" />
                <div className="h-4 bg-surface-mid rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Feed Posts */}
        {!loading && (
          <div className="space-y-4 font-outfit">
            {posts.length === 0 ? (
              feedTab === 'following' ? (
                <div className="text-center py-16 bg-surface border border-dashed border-outline-var/30 rounded-md p-8 space-y-4">
                  <Users size={40} className="mx-auto text-primary opacity-60" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-text-primary">No updates from followed builders yet</h3>
                    <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                      Follow peer developers, college mates, or squad leaders to see their discussions and launches here.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/network')}
                    className="px-5 py-2.5 bg-primary text-on-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs hover:bg-secondary-bright transition-colors shadow-md"
                  >
                    Discover People to Follow
                  </button>
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-outline-var/30 rounded-md">
                  <MessageCircle size={40} className="mx-auto text-outline mb-2" />
                  <p className="text-outline font-syne text-[10px] uppercase tracking-[0.12em]">
                    No posts yet. Be the first to share an update.
                  </p>
                </div>
              )
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  navigate={navigate}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                  onLike={handleLike}
                  onComment={handleComment}
                  onLikeComment={handleLikeComment}
                  onDeleteComment={handleDeleteComment}
                  onReply={(postId, content, parentId) => handleComment(postId, content, parentId)}
                  onOpenLikesModal={openLikesModal}
                  onOpenReportModal={(id) => setReportModalPostId(id)}
                  onShare={handleSharePost}
                />
              ))
            )}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="text-center pt-4">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-surface-mid border border-outline-var/40 hover:border-primary/50 text-text-primary font-syne font-bold text-xs uppercase tracking-wider rounded-xs transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 size={14} className="animate-spin" /> : 'Load More Posts'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-3 bg-primary text-on-primary rounded-full shadow-2xl hover:bg-secondary-bright transition-all z-[300]"
          title="Back to Top"
        >
          <ArrowUp size={18} />
        </button>
      )}

      {/* Liked By Modal (LinkedIn-style) */}
      {likesModalPostId && (
        <div className="fixed inset-0 bg-bg-base/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface border border-outline-var/30 rounded-md p-6 shadow-2xl font-outfit">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-var/20">
              <h3 className="text-base font-extrabold text-text-primary tracking-tight flex items-center gap-2">
                <ThumbsUp size={16} className="text-error" /> Reactions
              </h3>
              <button onClick={() => setLikesModalPostId(null)} className="text-outline hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            {loadingLikers ? (
              <div className="py-8 text-center text-outline">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-primary" />
                <p className="text-xs font-syne uppercase">Loading reactions...</p>
              </div>
            ) : likersList.length === 0 ? (
              <p className="text-center py-6 text-xs text-outline font-syne uppercase">No reactions yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {likersList.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      navigate(`/profile/${u.id}`);
                      setLikesModalPostId(null);
                    }}
                    className="flex items-center justify-between p-2 rounded-xs hover:bg-surface-mid cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar} name={u.name} size={9} />
                      <div>
                        <div className="text-sm font-semibold text-text-primary">{u.name}</div>
                        <div className="text-[10px] text-outline font-syne truncate max-w-[200px]">
                          {u.headline || u.college || 'SkillSphere Member'}
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-outline hover:text-primary shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportModalPostId && (
        <div className="fixed inset-0 bg-bg-base/85 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-surface border border-outline-var/30 rounded-md p-6 shadow-2xl space-y-4 font-outfit">
            <div className="flex items-center justify-between pb-3 border-b border-outline-var/20">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-[#f59e0b]" />
                <h3 className="text-base font-extrabold text-text-primary tracking-tight">Report Content</h3>
              </div>
              <button onClick={() => setReportModalPostId(null)} className="text-outline hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Help keep SkillSphere safe. Select the reason for reporting this post:
            </p>

            <div className="space-y-2">
              {[
                { id: 'SPAM', label: 'Spam or misleading promotional content' },
                { id: 'INAPPROPRIATE', label: 'Harassment, hate speech, or inappropriate material' },
                { id: 'MISINFORMATION', label: 'False or misleading technical information' },
                { id: 'OTHER', label: 'Other violation' },
              ].map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-3 rounded-xs border cursor-pointer transition-colors ${
                    reportReason === r.id
                      ? 'bg-primary/10 border-primary text-text-primary'
                      : 'bg-surface-mid border-outline-var/30 text-text-muted hover:border-outline-var/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={reportReason === r.id}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mt-0.5 text-primary focus:ring-0"
                  />
                  <span className="text-xs font-medium">{r.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block font-syne text-[10px] font-bold tracking-[0.12em] uppercase text-outline mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="Provide details about the issue..."
                rows={3}
                maxLength={300}
                className="w-full bg-surface-mid border border-outline-var/40 text-text-primary p-2.5 text-xs outline-none rounded-xs placeholder-outline-var"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReportModalPostId(null)}
                className="px-4 py-2 bg-surface-mid text-text-primary text-xs font-syne font-bold uppercase rounded-xs border border-outline-var/30"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={isReporting}
                className="px-5 py-2 bg-[#f59e0b] text-white font-syne font-bold text-xs uppercase rounded-xs hover:bg-[#d97706] transition flex items-center gap-2"
              >
                {isReporting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
