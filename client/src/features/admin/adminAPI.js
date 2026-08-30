import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const AdminAPI = {
  getStats: async () => unwrap(await BaseAPI.get('/admin/stats')),

  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.append('search', params.search.trim());
    if (params.role && params.role !== 'ALL') query.append('role', params.role);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.cursor) query.append('cursor', params.cursor);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    const res = await BaseAPI.get(`/admin/users${qs ? `?${qs}` : ''}`);
    return unwrap(res);
  },

  toggleSuspendUser: async (userId) =>
    unwrap(await BaseAPI.put(`/admin/users/${userId}/suspend`, {})),

  deleteUser: async (userId) =>
    unwrap(await BaseAPI.delete(`/admin/users/${userId}`)),

  getReports: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.cursor) query.append('cursor', params.cursor);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    const res = await BaseAPI.get(`/admin/reports${qs ? `?${qs}` : ''}`);
    return unwrap(res);
  },

  resolveReport: async (reportId, action) =>
    unwrap(await BaseAPI.put(`/admin/reports/${reportId}`, { action })),

  submitReport: async (data) =>
    unwrap(await BaseAPI.post('/admin/reports', data)),

  getSystemHealth: async () =>
    unwrap(await BaseAPI.get('/admin/health')),

  switchToOfficial: async (masterPassword) =>
    unwrap(await BaseAPI.post('/admin/switch-to-official', { masterPassword })),
};

export default AdminAPI;
