import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const SearchAPI = {
  search: async ({ q, type = 'all', limit = 10 }) => {
    const query = new URLSearchParams();
    if (q) query.append('q', q);
    if (type) query.append('type', type);
    if (limit) query.append('limit', limit);

    const qs = query.toString();
    const res = await BaseAPI.get(`/search${qs ? `?${qs}` : ''}`);
    return unwrap(res);
  },

  getSuggestions: async (q) => {
    if (!q?.trim()) return [];
    const res = await BaseAPI.get(`/search/suggestions?q=${encodeURIComponent(q.trim())}`);
    return unwrap(res) || [];
  },

  getTrending: async () => {
    const res = await BaseAPI.get('/search/trending');
    return unwrap(res) || { skills: [], squads: [] };
  },
};

export default SearchAPI;
