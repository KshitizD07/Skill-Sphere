import BaseAPI from '../../services/BaseAPI';

const FeedbackAPI = {
  submitFeedback: async (feedbackData) => {
    const res = await BaseAPI.post('/feedback', feedbackData);
    return res.data;
  },

  getFeedbackInbox: async (params = {}) => {
    const res = await BaseAPI.get('/feedback', params);
    return res;
  },

  deleteFeedback: async (id) => {
    const res = await BaseAPI.delete(`/feedback/${id}`);
    return res.data;
  },

  respondToFeedback: async (id, data) => {
    const res = await BaseAPI.patch(`/feedback/${id}/respond`, data);
    return res.data;
  },

  getMyFeedback: async () => {
    const res = await BaseAPI.get('/feedback/my');
    return res.data;
  },
};

export default FeedbackAPI;
