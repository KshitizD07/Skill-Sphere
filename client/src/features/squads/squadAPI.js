import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const SquadAPI = {
  getFeed: (params = {}) => {
    const query = new URLSearchParams();
    if (params.skill?.trim()) query.append('skill', params.skill.trim());
    if (params.event && params.event !== 'ALL') query.append('event', params.event);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.search?.trim()) query.append('search', params.search.trim());
    if (params.maxScore) query.append('maxScore', params.maxScore);
    if (params.cursor) query.append('cursor', params.cursor);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return BaseAPI.get(`/squads${qs ? `?${qs}` : ''}`);
  },

  getSquad: async (squadId) => unwrap(await BaseAPI.get(`/squads/${squadId}`)),

  createSquad: async (data) => unwrap(await BaseAPI.post('/squads', data)),

  editSquad: async (squadId, data) => unwrap(await BaseAPI.put(`/squads/${squadId}`, data)),

  deleteSquad: async (squadId) => unwrap(await BaseAPI.delete(`/squads/${squadId}`)),

  leaveSquad: async (squadId) => unwrap(await BaseAPI.delete(`/squads/${squadId}/leave`)),

  applyToSquad: async (squadId, message, slotId) =>
    unwrap(await BaseAPI.post(`/squads/${squadId}/apply`, { message, slotId })),

  getMyApplications: async () => {
    const res = await BaseAPI.get('/squads/my-applications');
    return res?.applications || res?.data?.applications || res?.data || [];
  },

  getMySquads: async () => unwrap(await BaseAPI.get('/squads/my-squads')),

  getSquadApplications: async (squadId) => {
    const res = await BaseAPI.get(`/squads/${squadId}/applications`);
    return res?.applications || res?.data?.applications || res?.data || [];
  },

  updateApplicationStatus: async (squadId, applicationId, status) =>
    unwrap(await BaseAPI.patch(`/squads/${squadId}/applications/${applicationId}`, { status })),

  checkQualification: async (squadId, userId) =>
    unwrap(await BaseAPI.get(`/squads/${squadId}/qualify?userId=${userId}`)),

  getSlotRecommendations: async (squadId, slotId) =>
    unwrap(await BaseAPI.get(`/squads/${squadId}/slots/${slotId}/recommendations`)),
};

export default SquadAPI;
