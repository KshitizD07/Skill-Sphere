import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const NetworkAPI = {
  // Discover users with cursor pagination, role, skill, college, and sorting
  getUsers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search?.trim()) query.append('search', params.search.trim());
    if (params.role && params.role !== 'ALL') query.append('role', params.role);
    if (params.skill?.trim()) query.append('skill', params.skill.trim());
    if (params.college?.trim()) query.append('college', params.college.trim());
    if (params.verifiedOnly) query.append('verifiedOnly', 'true');
    if (params.sort) query.append('sort', params.sort);
    if (params.cursor) query.append('cursor', params.cursor);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString();
    return BaseAPI.get(`/users${qs ? `?${qs}` : ''}`);
  },

  // "People You May Know" recommendations
  getSuggestedUsers: async () => unwrap(await BaseAPI.get('/users/suggested')),

  // Unique list of colleges for filter
  getColleges: async () => unwrap(await BaseAPI.get('/users/colleges')),
};

export default NetworkAPI;
