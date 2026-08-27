import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const RoadmapAPI = {
  getRoles: async () => {
    const res = await BaseAPI.get('/ai/roles');
    return res?.data || (Array.isArray(res) ? res : []);
  },

  getGapAnalysis: async (roleId) => {
    const res = await BaseAPI.get(`/ai/gap-analysis?roleId=${encodeURIComponent(roleId)}`);
    return unwrap(res);
  },

  generateRoadmap: async ({ targetSkill, targetRole, currentLevel }) => {
    const res = await BaseAPI.post('/ai/roadmap', {
      targetSkill,
      targetRole,
      currentLevel,
    });
    return unwrap(res);
  },

  getSavedRoadmaps: async () => {
    const res = await BaseAPI.get('/ai/roadmaps');
    return res?.data || (Array.isArray(res) ? res : []);
  },

  getRoadmapById: async (id) => {
    const res = await BaseAPI.get(`/ai/roadmaps/${id}`);
    return unwrap(res);
  },

  updateProgress: async (id, completedItems) => {
    const res = await BaseAPI.put(`/ai/roadmaps/${id}/progress`, { completedItems });
    return unwrap(res);
  },

  getShareToken: async (id) => {
    const res = await BaseAPI.get(`/ai/roadmaps/${id}/share`);
    return unwrap(res);
  },

  getSharedRoadmap: async (token) => {
    const res = await BaseAPI.get(`/ai/roadmaps/shared/${token}`);
    return unwrap(res);
  },
};

export default RoadmapAPI;
