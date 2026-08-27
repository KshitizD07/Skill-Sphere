import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const FeedAPI = {
  // --- Feed & Posts ---
  getPosts: async (cursor = null, limit = 10) =>
    BaseAPI.get(`/posts?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  getFollowingPosts: async (cursor = null, limit = 10) =>
    BaseAPI.get(`/posts/following?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  getUserPosts: async (userId, cursor = null, limit = 10) =>
    BaseAPI.get(`/posts/user/${userId}?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  createPost: async (data) => unwrap(await BaseAPI.post('/posts', data)),
  updatePost: async (postId, content) => unwrap(await BaseAPI.put(`/posts/${postId}`, { content })),
  deletePost: async (postId) => BaseAPI.delete(`/posts/${postId}`),

  // --- Likes ---
  likePost: async (postId) => BaseAPI.post(`/posts/${postId}/like`, {}),
  getPostLikes: async (postId, cursor = null, limit = 20) =>
    BaseAPI.get(`/posts/${postId}/likes?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  // --- Comments ---
  getComments: async (postId, cursor = null, limit = 20) =>
    BaseAPI.get(`/posts/${postId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  createComment: async (postId, content, parentId = null) =>
    unwrap(await BaseAPI.post(`/posts/${postId}/comments`, { content, parentId })),

  likeComment: async (postId, commentId) =>
    BaseAPI.post(`/posts/${postId}/comments/${commentId}/like`, {}),

  deleteComment: async (postId, commentId) =>
    BaseAPI.delete(`/posts/${postId}/comments/${commentId}`),

  // --- Report ---
  reportPost: async (postId, reason, detail = '') =>
    BaseAPI.post(`/posts/${postId}/report`, { reason, detail }),
};

export default FeedAPI;
