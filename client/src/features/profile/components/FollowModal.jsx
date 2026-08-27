import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, UserPlus, UserCheck, Building2, Loader2 } from 'lucide-react';
import ProfileAPI from '../profileAPI';

export default function FollowModal({
  userId,
  initialTab = 'followers',
  followerCount = 0,
  followingCount = 0,
  onClose,
  onFollowChange
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchUsers = useCallback(async (isLoadMore = false, cur = null) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const fn = activeTab === 'followers' ? ProfileAPI.getFollowers : ProfileAPI.getFollowing;
      const res = await fn(userId, { cursor: cur, limit: 20 });
      const list = activeTab === 'followers' ? res?.followers : res?.following;

      if (isLoadMore) {
        setUsers((prev) => [...prev, ...(list || [])]);
      } else {
        setUsers(list || []);
      }
      setCursor(res?.nextCursor || null);
      setHasMore(!!res?.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchUsers(false, null);
  }, [fetchUsers]);

  const handleToggleFollow = async (targetUser) => {
    const isCurrentlyFollowing = targetUser.isFollowing;
    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, isFollowing: !isCurrentlyFollowing } : u
      )
    );

    try {
      if (isCurrentlyFollowing) {
        await ProfileAPI.unfollowUser(targetUser.id);
      } else {
        await ProfileAPI.followUser(targetUser.id);
      }
      onFollowChange?.();
    } catch (err) {
      console.error(err);
      // Revert on error
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, isFollowing: isCurrentlyFollowing } : u
        )
      );
    }
  };

  const handleUserClick = (id) => {
    onClose();
    navigate(`/profile/${id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-outline-var/30 p-6 rounded-md max-w-md w-full space-y-4 shadow-2xl font-outfit max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-var/20 pb-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('followers')}
              className={`font-syne font-bold text-xs uppercase tracking-wider transition-colors pb-1 border-b-2 ${
                activeTab === 'followers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Followers ({followerCount})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`font-syne font-bold text-xs uppercase tracking-wider transition-colors pb-1 border-b-2 ${
                activeTab === 'following'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              Following ({followingCount})
            </button>
          </div>
          <button onClick={onClose} className="text-outline hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* User list content */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[220px] pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="text-xs text-text-muted font-syne uppercase tracking-wider">
                Loading list...
              </span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-muted italic">
              {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xs hover:bg-surface-mid/60 border border-transparent hover:border-outline-var/20 transition-all"
              >
                <div
                  onClick={() => handleUserClick(u.id)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  <div className="w-9 h-9 rounded-full bg-surface-mid overflow-hidden border border-outline-var/30 flex items-center justify-center font-bold text-primary font-syne shrink-0">
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} className="text-outline" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-text-primary hover:text-primary transition-colors truncate">
                      {u.name}
                    </h4>
                    <p className="text-[10px] text-text-muted truncate mt-0.5">
                      {u.headline || 'Member'}
                    </p>
                    {u.college && (
                      <div className="flex items-center gap-1 text-[9px] text-outline truncate mt-0.5">
                        <Building2 size={9} />
                        <span>{u.college}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!u.isSelf && (
                  <button
                    type="button"
                    onClick={() => handleToggleFollow(u)}
                    className={`px-3 py-1 text-[10px] font-syne font-bold uppercase tracking-wider rounded-xs border transition-all flex items-center gap-1 shrink-0 ${
                      u.isFollowing
                        ? 'bg-surface-mid border-outline-var/40 text-text-muted hover:border-error hover:text-error'
                        : 'bg-primary text-on-primary border-primary hover:bg-secondary-bright'
                    }`}
                  >
                    {u.isFollowing ? (
                      <>
                        <UserCheck size={11} /> Following
                      </>
                    ) : (
                      <>
                        <UserPlus size={11} /> Follow
                      </>
                    )}
                  </button>
                )}
              </div>
            ))
          )}

          {hasMore && !loading && (
            <button
              onClick={() => fetchUsers(true, cursor)}
              disabled={loadingMore}
              className="w-full py-2 text-xs font-syne font-bold uppercase tracking-wider bg-surface-mid border border-outline-var/30 text-text-muted hover:text-text-primary transition-colors rounded-xs"
            >
              {loadingMore ? 'Loading more...' : 'Load more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
