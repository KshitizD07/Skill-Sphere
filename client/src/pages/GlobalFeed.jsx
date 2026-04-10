import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  Search, ArrowLeft, Heart, User, Building2,
  Users, Image as ImageIcon, X, MessageCircle,
  Send, CornerDownRight, Trash2, Pencil, Layers
} from 'lucide-react';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function Avatar({ src, size = 10 }) {
  const sizeMap = { 6:'w-6 h-6', 7:'w-7 h-7', 8:'w-8 h-8', 10:'w-10 h-10', 12:'w-12 h-12' };
  const iconSizeMap = { 6:12, 7:14, 8:16, 10:20, 12:24 };
  return (
    <div className={`${sizeMap[size]||'w-10 h-10'} rounded-full overflow-hidden border border-[#434655]/40 bg-[#222a3d] shrink-0 flex items-center justify-center`}>
      {src ? <img src={src} className="w-full h-full object-cover" alt="" /> : <User size={iconSizeMap[size]||20} className="text-[#656d84]" />}
    </div>
  );
}

function CommentItem({ comment, postId, postOwnerId, currentUser, onDelete, onLike, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const isAuthor    = comment.author?.id === currentUser.id;
  const isPostOwner = postOwnerId === currentUser.id;
  const liked       = comment.likes?.some(l => l.userId === currentUser.id);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(postId, replyText, comment.id);
    setReplyText(''); setShowReply(false);
  };

  return (
    <div className="space-y-1.5 relative z-20">
      <div className="flex gap-2 group">
        <Avatar src={comment.author?.avatar} size={7} />
        <div className="flex-1 min-w-0">
          <div className="bg-[#222a3d] rounded-xs px-3 py-2">
            <span className="text-[#adc6ff] font-semibold text-xs mr-2">{comment.author?.name}</span>
            <span className="text-[#c3c6d7] text-xs">{comment.content}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[#8d90a0] text-[10px] font-['Space_Grotesk']">{timeAgo(comment.createdAt)}</span>
            <button onClick={() => onLike(postId, comment.id)}
              className={`flex items-center gap-1 text-[10px] transition ${liked ? 'text-[#ffb4ab]' : 'text-[#8d90a0] hover:text-[#ffb4ab]'}`}>
              <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            <button onClick={() => setShowReply(!showReply)}
              className="text-[10px] text-[#8d90a0] hover:text-[#6bd8cb] transition flex items-center gap-1 font-['Space_Grotesk']">
              <CornerDownRight size={10} /> Reply
            </button>
            {(isAuthor || isPostOwner) && (
              <button onClick={() => onDelete(postId, comment.id)}
                className="text-[10px] text-[#434655] hover:text-[#ffb4ab] transition opacity-0 group-hover:opacity-100">
                <Trash2 size={10} />
              </button>
            )}
          </div>
          {showReply && (
            <div className="flex gap-2 mt-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitReply()}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="flex-1 bg-[#131b2e] border border-[#434655]/40 text-[#c3c6d7] px-3 py-1.5 text-xs focus:border-[#adc6ff]/50 outline-none rounded-xs" />
              <button onClick={submitReply} className="text-[#adc6ff] hover:text-[#89f5e7] px-2 transition-colors"><Send size={14} /></button>
              <button onClick={() => setShowReply(false)} className="text-[#8d90a0] hover:text-[#dae2fd] px-1 transition-colors"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="ml-9 space-y-1.5 border-l border-[#434655]/30 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex gap-2 group">
              <Avatar src={reply.author?.avatar} size={6} />
              <div className="flex-1 min-w-0">
                <div className="bg-[#1a2236] rounded-xs px-3 py-1.5">
                  <span className="text-[#adc6ff] font-semibold text-xs mr-2">{reply.author?.name}</span>
                  <span className="text-[#c3c6d7] text-xs">{reply.content}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 px-1">
                  <span className="text-[#8d90a0] text-[10px] font-['Space_Grotesk']">{timeAgo(reply.createdAt)}</span>
                  <button onClick={() => onLike(postId, reply.id)}
                    className={`flex items-center gap-1 text-[10px] transition ${reply.likes?.some(l => l.userId === currentUser.id) ? 'text-[#ffb4ab]' : 'text-[#8d90a0] hover:text-[#ffb4ab]'}`}>
                    <Heart size={10} fill={reply.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                    {reply.likes?.length > 0 && reply.likes.length}
                  </button>
                  {(reply.author?.id === currentUser.id || isPostOwner) && (
                    <button onClick={() => onDelete(postId, reply.id)}
                      className="text-[10px] text-[#434655] hover:text-[#ffb4ab] opacity-0 group-hover:opacity-100 transition">
                      <Trash2 size={10} />
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

function PostCard({ post, currentUser, onDelete, onEdit, onLike, onComment, onLikeComment, onDeleteComment, onReply, navigate }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [editing, setEditing]           = useState(false);
  const [editContent, setEditContent]   = useState(post.content);
  const isOwner = post.author?.id === currentUser.id;
  const liked   = post.likes?.some(l => l.userId === currentUser.id);

  const submitComment = () => {
    if (!commentText.trim()) return;
    onComment(post.id, commentText);
    setCommentText(''); setShowComments(true);
  };

  return (
    <div className="bg-[#171f33] border border-[#434655]/20 rounded-md hover:border-[#6bd8cb]/15 transition-colors group relative">
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${post.author?.id}`)}>
          <Avatar src={post.author?.avatar} size={10} />
          <div>
            <div className="text-[#dae2fd] font-semibold hover:text-[#adc6ff] transition-colors text-sm">{post.author?.name}</div>
            <div className="flex items-center gap-2 text-[10px] font-['Space_Grotesk'] text-[#8d90a0]">
              {post.author?.college && <span>{post.author.college}</span>}
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEditing(!editing); setEditContent(post.content); }}
              className="p-1.5 text-[#8d90a0] hover:text-[#adc6ff] transition-colors rounded-xs"><Pencil size={14} /></button>
            <button onClick={() => onDelete(post.id)}
              className="p-1.5 text-[#8d90a0] hover:text-[#ffb4ab] transition-colors rounded-xs"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              className="w-full bg-[#131b2e] border border-[#434655]/40 text-[#dae2fd] p-3 text-sm font-['Manrope'] resize-none focus:border-[#adc6ff]/50 outline-none rounded-xs"
              rows={3} maxLength={500} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-[#8d90a0] hover:text-[#dae2fd] transition-colors">Cancel</button>
              <button onClick={() => { onEdit(post.id, editContent); setEditing(false); }}
                className="px-3 py-1 text-xs bg-[#0f69dc] text-[#dae2fd] hover:bg-[#adc6ff] hover:text-[#002e6a] rounded-xs transition-all font-['Space_Grotesk'] font-bold uppercase tracking-wide">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-[#c3c6d7] text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        {post.imageUrl && !editing && (
          <img src={post.imageUrl} alt="" className="w-full rounded-xs border border-[#434655]/20 mt-3 max-h-96 object-cover" />
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#434655]/15">
        <button onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-[#ffb4ab]' : 'text-[#8d90a0] hover:text-[#ffb4ab]'}`}>
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          <span className="font-['Space_Grotesk'] text-[10px]">{post.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-[#8d90a0] hover:text-[#adc6ff] transition-colors">
          <MessageCircle size={15} />
          <span className="font-['Space_Grotesk'] text-[10px]">{post.comments?.length || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4 pt-3 border-t border-[#434655]/15 space-y-3">
          {post.comments?.length === 0 && (
            <p className="text-[#8d90a0] text-xs italic text-center py-1">No comments yet.</p>
          )}
          {post.comments?.map(c => (
            <CommentItem key={c.id} comment={c} postId={post.id} postOwnerId={post.author?.id}
              currentUser={currentUser} onDelete={onDeleteComment} onLike={onLikeComment} onReply={onReply} />
          ))}
          <div className="flex gap-2 pt-1">
            <Avatar src={currentUser.avatar} size={7} />
            <div className="flex-1 flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-[#131b2e] border border-[#434655]/40 text-[#c3c6d7] px-3 py-2 text-xs focus:border-[#adc6ff]/50 outline-none rounded-xs placeholder-[#434655]" />
              <button onClick={submitComment} className="text-[#adc6ff] hover:text-[#89f5e7] px-2 transition-colors"><Send size={15} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GlobalFeed() {
  const navigate = useNavigate();
  const [posts, setPosts]               = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [charCount, setCharCount]       = useState(0);
  const postImageRef = useRef(null);
  const currentUser  = JSON.parse(localStorage.getItem('user_data') || '{}');

  const loadFeed = useCallback(async () => {
    const res = await API.get('/posts/all').catch(() => ({ data: [] }));
    setPosts(res.data || []);
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 1) {
      const res = await API.get(`/users/search?q=${q}`);
      setSearchResults(res.data || []);
    } else setSearchResults([]);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    await API.post('/posts', { userId: currentUser.id, content: newPostContent, imageUrl: newPostImage || null });
    setNewPostContent(''); setNewPostImage(''); setCharCount(0);
    if (postImageRef.current) postImageRef.current.value = '';
    loadFeed();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setNewPostImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLike = async (postId) => {
    const uid = currentUser.id;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const already = p.likes?.some(l => l.userId === uid);
      return { ...p, likes: already ? p.likes.filter(l => l.userId !== uid) : [...(p.likes||[]), { userId: uid }] };
    }));
    await API.post(`/posts/${postId}/like`).catch(() => loadFeed());
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

  const handleComment = async (postId, content, parentId) => {
    await API.post(`/posts/${postId}/comment`, { content, parentId });
    loadFeed();
  };

  const handleDeleteComment = async (postId, commentId) => {
    await API.delete(`/posts/${postId}/comment/${commentId}`);
    loadFeed();
  };

  const handleLikeComment = async (postId, commentId) => {
    await API.post(`/posts/${postId}/comment/${commentId}/like`);
    loadFeed();
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] font-['Manrope'] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Navbar */}
        <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#0b1326]/95 backdrop-blur-md p-4 border-b border-[#434655]/25 z-50 -mx-4 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:text-[#adc6ff] transition-colors text-[#8d90a0]"><ArrowLeft size={18} /></button>
            <h1 className="text-xl font-bold text-[#dae2fd] tracking-tight">Community Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/nexus')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#adc6ff]/8 border border-[#adc6ff]/20 text-[#adc6ff] hover:bg-[#adc6ff] hover:text-[#002e6a] transition-all rounded-xs font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.1em]">
              <Layers size={12} /> Teams
            </button>
            <button onClick={() => navigate('/network')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6bd8cb]/8 border border-[#6bd8cb]/20 text-[#6bd8cb] hover:bg-[#29a195] hover:text-[#003732] transition-all rounded-xs font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-[0.1em]">
              <Users size={12} /> Network
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 text-[#656d84] group-focus-within:text-[#adc6ff] transition-colors" size={16} />
            <input value={searchQuery} onChange={handleSearch}
              placeholder="Search members or institutions..."
              className="w-full bg-[#171f33] border border-[#434655]/30 rounded-xs p-3 pl-11 text-[#dae2fd] outline-none focus:border-[#adc6ff]/50 font-['Manrope'] text-sm transition-colors placeholder-[#434655]" />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-[#171f33] border border-[#434655]/40 rounded-xs z-50 mt-1 shadow-2xl">
              {searchResults.map(u => (
                <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); setSearchResults([]); setSearchQuery(''); }}
                  className="p-3 border-b border-[#434655]/20 hover:bg-[#222a3d] cursor-pointer flex items-center gap-3 transition-colors">
                  <Avatar src={u.avatar} size={8} />
                  <div>
                    <div className="text-[#dae2fd] font-semibold text-sm">{u.name}</div>
                    {u.college && <div className="text-[10px] text-[#6bd8cb] font-['Space_Grotesk'] flex items-center gap-1"><Building2 size={10} /> {u.college}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        {currentUser.id && (
          <div className="bg-[#171f33] border border-[#434655]/20 rounded-md p-4 mb-6">
            <textarea value={newPostContent}
              onChange={e => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
              placeholder="Share an update..."
              maxLength={500}
              className="w-full bg-[#131b2e] border border-[#434655]/30 text-[#dae2fd] p-3 focus:border-[#adc6ff]/50 outline-none resize-none h-24 font-['Manrope'] text-sm rounded-xs placeholder-[#434655] transition-colors" />
            <div className="flex items-center justify-between mt-2 mb-2.5">
              <span className={`font-['Space_Grotesk'] text-[10px] ${charCount > 450 ? 'text-[#ffb4ab]' : 'text-[#434655]'}`}>{charCount}/500</span>
            </div>
            {newPostImage && (
              <div className="relative mb-3 inline-block">
                <img src={newPostImage} alt="" className="max-h-40 rounded-xs border border-[#434655]/30 object-cover" />
                <button onClick={() => { setNewPostImage(''); if (postImageRef.current) postImageRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 p-1 bg-[#93000a] hover:bg-[#ffb4ab] text-white hover:text-[#002e6a] rounded-full transition-colors"><X size={12} /></button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button onClick={() => postImageRef.current.click()}
                className="flex items-center gap-2 px-3 py-2 bg-[#131b2e] border border-[#434655]/30 hover:border-[#adc6ff]/40 text-[#8d90a0] hover:text-[#adc6ff] transition-all text-xs font-['Space_Grotesk'] font-medium rounded-xs uppercase tracking-wide">
                <ImageIcon size={13} /> Attach Image
              </button>
              <div className="flex-1" />
              <button onClick={handleCreatePost} disabled={!newPostContent.trim()}
                className="bg-[#0f69dc] hover:bg-[#adc6ff] hover:text-[#002e6a] text-[#dae2fd] font-['Space_Grotesk'] font-bold px-6 py-2 rounded-xs text-xs uppercase tracking-[0.1em] disabled:opacity-40 transition-all">
                Post
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#434655]/30 rounded-md">
              <p className="text-[#8d90a0] font-['Space_Grotesk'] text-[10px] uppercase tracking-[0.12em]">No posts yet. Be the first to share.</p>
            </div>
          ) : posts.map(post => (
            <PostCard key={post.id} post={post} currentUser={currentUser} navigate={navigate}
              onDelete={handleDeletePost} onEdit={handleEditPost}
              onLike={handleLike} onComment={handleComment}
              onLikeComment={handleLikeComment} onDeleteComment={handleDeleteComment}
              onReply={(postId, content, parentId) => handleComment(postId, content, parentId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}