import BaseAPI from '../../services/BaseAPI';
import API from '../../api';

// All /users endpoints now return { success, data } — unwrap here so callers are clean.
const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const ProfileAPI = {
  // --- User Profile ---
  getMyProfile: async () => unwrap(await BaseAPI.get('/users/me')),
  getProfile:   async (userId) => unwrap(await BaseAPI.get(`/users/${userId}`)),
  updateProfile: async (data) => unwrap(await BaseAPI.patch('/users/me', data)),
  deleteAccount: async () => BaseAPI.delete('/users/me'),

  // --- Profile Completeness (0-100 score + checklist) ---
  getCompleteness: async () => unwrap(await BaseAPI.get('/users/me/completeness')),

  // --- GitHub stats (repos count, total stars, top languages) ---
  getGitHubStats: async () => unwrap(await BaseAPI.get('/users/me/github-stats')),

  // --- Skills ---
  getAllSkills: () => BaseAPI.get('/skills/list'),
  saveSkills:  (skillIds) => BaseAPI.post('/users/me/skills', { skillIds }),

  // --- Posts ---
  getUserPosts: (userId) => BaseAPI.get(`/posts/user/${userId}`),
  createPost:   (data) => BaseAPI.post('/posts', data),
  likePost:     (postId, userId) => BaseAPI.post(`/posts/${postId}/like`, { userId }),
  commentPost:  (postId, userId, content) => BaseAPI.post(`/posts/${postId}/comment`, { userId, content }),

  // --- Logout ---
  logout: () => API.post('/auth/logout'),
};

export default ProfileAPI;