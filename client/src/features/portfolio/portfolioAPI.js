import BaseAPI from '../../services/BaseAPI';

const PortfolioAPI = {
  // Sync GitHub repositories (Trigger fetch from GitHub backend)
  syncRepos: () => BaseAPI.post('/portfolio/sync'),

  // Get all fetched repos for the user (for selection UI)
  getRepos: () => BaseAPI.get('/portfolio/repos'),

  // Save selected repo IDs
  updateSelection: (selectedRepoIds) => 
    BaseAPI.put('/portfolio/selection', { selectedRepoIds }),

  // Get public showcase repos for a user
  getShowcase: (userId) => BaseAPI.get(`/portfolio/showcase/${userId}`),
};

export default PortfolioAPI;
