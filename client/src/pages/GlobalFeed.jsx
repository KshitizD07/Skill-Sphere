import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import {
  Search, ArrowLeft, Heart, User, Building2,
  Users, Zap, Image as ImageIcon, X, MessageCircle,
  Send, CornerDownRight, Trash2, Pencil
} from 'lucide-react';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// Fixed Avatar with explicit sizes
function Avatar({ src, size = 10 }) {
  const sizeMap = {
    6: 'w-6 h-6',
    7: 'w-7 h-7',
    8: 'w-8 h-8',
    10: 'w-10 h-10',
    12: 'w-12 h-12',
  };
  
  const iconSizeMap = {
    6: 12,
    7: 14,
    8: 16,
    10: 20,
    12: 24,
  };

  return (
    <div className={`${sizeMap[size] || 'w-10 h-10'} rounded-full overflow-hidden border border-gray-700 bg-gray-900 shrink-0 flex items-center justify-center`}>
      {src ? (
        <img src={src} className="w-full h-full object-cover" alt="" />
      ) : (
        <User size={iconSizeMap[size] || 20} className="text-gray-600" />
      )}
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
          <div className="bg-gray-900/60 rounded px-3 py-2">
            <span className="text-cyan-400 font-bold text-xs mr-2">{comment.author?.name}</span>
            <span className="text-gray-300 text-xs">{comment.content}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-gray-600 text-[10px] font-mono">{timeAgo(comment.createdAt)}</span>
            <button onClick={() => onLike(postId, comment.id)}
              className={`flex items-center gap-1 text-[10px] font-mono transition ${liked ? 'text-red-400' : 'text-gray-600 hover:text-red-400'}`}>
              <Heart size={10} fill={liked ? 'currentColor' : 'none'} />
              {comment.likes?.length > 0 && comment.likes.length}
            </button>
            <button onClick={() => setShowReply(!showReply)}
              className="text-[10px] font-mono text-gray-600 hover:text-cyan-400 transition flex items-center gap-1">
              <CornerDownRight size={10} /> Reply
            </button>
            {(isAuthor || isPostOwner) && (
              <button onClick={() => onDelete(postId, comment.id)}
                className="text-[10px] font-mono text-gray-700 hover:text-red-400 transition opacity-0 group-hover:opacity-100">
                <Trash2 size={10} />
              </button>
            )}
          </div>
          {showReply && (
            <div className="flex gap-2 mt-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitReply()}
                placeholder={`Reply to ${comment.author?.name}...`}
                className="flex-1 bg-black border border-gray-800 text-gray-300 px-3 py-1.5 text-xs focus:border-cyan-500 outline-none" />
              <button onClick={submitReply} className="text-cyan-500 hover:text-white px-2"><Send size={14} /></button>
              <button onClick={() => setShowReply(false)} className="text-gray-600 hover:text-white px-1"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="ml-9 space-y-1.5 border-l border-gray-800 pl-3">
          {comment.replies.map(reply => (
            <div key={reply.id} className="flex gap-2 group">
              <Avatar src={reply.author?.avatar} size={6} />
              <div className="flex-1 min-w-0">
                <div className="bg-gray-900/40 rounded px-3 py-1.5">
                  <span className="text-cyan-400 font-bold text-xs mr-2">{reply.author?.name}</span>
                  <span className="text-gray-400 text-xs">{reply.content}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 px-1">
                  <span className="text-gray-600 text-[10px] font-mono">{timeAgo(reply.createdAt)}</span>
                  <button onClick={() => onLike(postId, reply.id)}
                    className={`flex items-center gap-1 text-[10px] transition ${reply.likes?.some(l => l.userId === currentUser.id) ? 'text-red-400' : 'text-gray-600 hover:text-red-400'}`}>
                    <Heart size={10} fill={reply.likes?.some(l => l.userId === currentUser.id) ? 'currentColor' : 'none'} />
                    {reply.likes?.length > 0 && reply.likes.length}
                  </button>
                  {(reply.author?.id === currentUser.id || isPostOwner) && (
                    <button onClick={() => onDelete(postId, reply.id)}
                      className="text-[10px] text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
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
    <div className="bg-black border border-gray-800 hover:border-gray-700 transition group relative z-10">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${post.author?.id}`)}>
          <Avatar src={post.author?.avatar} size={10} />
          <div>
            <div className="text-white font-bold hover:text-cyan-400 transition text-sm">{post.author?.name}</div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
              {post.author?.college && <span>{post.author.college}</span>}
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <button onClick={() => { setEditing(!editing); setEditContent(post.content); }}
              className="p-1.5 text-gray-600 hover:text-cyan-400 transition"><Pencil size={14} /></button>
            <button onClick={() => onDelete(post.id)}
              className="p-1.5 text-gray-600 hover:text-red-400 transition"><Trash2 size={14} /></button>
          </div>
        )}
      </div>

      <div className="px-4 pb-3">
        {editing ? (
          <div className="space-y-2">
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white p-3 text-sm font-mono resize-none focus:border-cyan-500 outline-none"
              rows={3} maxLength={500} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs font-mono text-gray-500 hover:text-white">Cancel</button>
              <button onClick={() => { onEdit(post.id, editContent); setEditing(false); }}
                className="px-3 py-1 text-xs font-mono bg-cyan-600 text-black hover:bg-cyan-400">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
        {post.imageUrl && !editing && (
          <img src={post.imageUrl} alt="" className="w-full rounded border border-gray-800 mt-3 max-h-96 object-cover" />
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-900">
        <button onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm transition ${liked ? 'text-red-400' : 'text-gray-500 hover:text-red-400'}`}>
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span className="font-mono text-xs">{post.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition">
          <MessageCircle size={16} />
          <span className="font-mono text-xs">{post.comments?.length || 0}</span>
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-900 space-y-3 relative z-20 bg-black">
          {post.comments?.length === 0 && (
            <p className="text-gray-600 text-xs font-mono italic text-center py-1">No comments yet.</p>
          )}
          {post.comments?.map(c => (
            <CommentItem key={c.id}
              comment={c} postId={post.id} postOwnerId={post.author?.id}
              currentUser={currentUser}
              onDelete={onDeleteComment} onLike={onLikeComment} onReply={onReply}
            />
          ))}
          <div className="flex gap-2 pt-1">
            <Avatar src={currentUser.avatar} size={7} />
            <div className="flex-1 flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Write a comment..."
                className="flex-1 bg-black border border-gray-800 text-gray-300 px-3 py-2 text-xs focus:border-cyan-500 outline-none" />
              <button onClick={submitComment} className="text-cyan-500 hover:text-white px-2"><Send size={16} /></button>
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

  // Optimistic like
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
    <div className="min-h-screen bg-[#050505] text-gray-300 font-['Rajdhani'] p-4 md:p-8 relative selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Navbar */}
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

        {/* Search */}
        <div className="mb-6 relative">
          <div className="relative group">
            <Search className="absolute left-4 top-4 text-gray-500 group-focus-within:text-cyan-400" />
            <input value={searchQuery} onChange={handleSearch}
              placeholder="SEARCH_NETRUNNERS_OR_COLLEGES..."
              className="w-full bg-gray-900/50 border border-gray-700 p-4 pl-12 text-white outline-none focus:border-cyan-500 font-mono transition-all" />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 w-full bg-black border border-cyan-500 z-50 mt-2 shadow-2xl">
              {searchResults.map(u => (
                <div key={u.id} onClick={() => { navigate(`/profile/${u.id}`); setSearchResults([]); setSearchQuery(''); }}
                  className="p-3 border-b border-gray-800 hover:bg-cyan-900/20 cursor-pointer flex items-center gap-3 transition">
                  <Avatar src={u.avatar} size={8} />
                  <div>
                    <div className="text-white font-bold text-sm">{u.name}</div>
                    {u.college && <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1"><Building2 size={10} /> {u.college}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        {currentUser.id && (
          <div className="bg-gray-900/50 border border-gray-700 p-4 mb-6">
            <textarea value={newPostContent}
              onChange={e => { setNewPostContent(e.target.value); setCharCount(e.target.value.length); }}
              placeholder="Broadcast to the grid..."
              maxLength={500}
              className="w-full bg-black border border-gray-800 text-white p-3 focus:border-cyan-500 outline-none resize-none h-24 font-mono text-sm" />
            <div className="flex items-center justify-between mt-1 mb-2">
              <span className={`text-[10px] font-mono ${charCount > 450 ? 'text-yellow-400' : 'text-gray-600'}`}>{charCount}/500</span>
            </div>
            {newPostImage && (
              <div className="relative mb-3 inline-block">
                <img src={newPostImage} alt="" className="max-h-40 rounded border border-gray-700 object-cover" />
                <button onClick={() => { setNewPostImage(''); if (postImageRef.current) postImageRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-500 text-white rounded-full"><X size={12} /></button>
              </div>
            )}
            <div className="flex gap-2">
              <input ref={postImageRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <button onClick={() => postImageRef.current.click()}
                className="flex items-center gap-2 px-3 py-2 bg-black border border-gray-700 hover:border-cyan-500 text-gray-500 hover:text-cyan-400 transition text-xs font-mono">
                <ImageIcon size={14} /> ATTACH_IMAGE
              </button>
              <div className="flex-1" />
              <button onClick={handleCreatePost} disabled={!newPostContent.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-6 py-2 font-['Orbitron'] text-sm disabled:opacity-40">
                POST
              </button>
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800">
              <p className="text-gray-600 font-mono text-sm">NO_POSTS_YET — BE_FIRST</p>
            </div>
          ) : posts.map(post => (
            <PostCard key={post.id}
              post={post} currentUser={currentUser} navigate={navigate}
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