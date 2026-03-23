import BaseAPI from '../../services/BaseAPI';

const ProfileAPI = {
  // --- User Profile ---
  getMyProfile: () => BaseAPI.get('/users/me'),
  getProfile: (userId) => BaseAPI.get(`/users/${userId}`),
  updateProfile: (data) => BaseAPI.patch('/users/me', data),

  // --- Skills ---
  getAllSkills: () => BaseAPI.get('/skills/list'),
  saveSkills: (skillIds) => BaseAPI.post('/users/me/skills', { skillIds }),

  // --- Posts ---
  getUserPosts: (userId) => BaseAPI.get(`/posts/user/${userId}`),
  createPost: (data) => BaseAPI.post('/posts', data),
  likePost: (postId, userId) => BaseAPI.post(`/posts/${postId}/like`, { userId }),
  commentPost: (postId, userId, content) =>
    BaseAPI.post(`/posts/${postId}/comment`, { userId, content }),
};

export default ProfileAPI;