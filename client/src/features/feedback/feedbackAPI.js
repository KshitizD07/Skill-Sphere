import BaseAPI from '../../services/BaseAPI';

const FeedbackAPI = {
  submitFeedback: async (feedbackData) => {
    const res = await BaseAPI.post('/feedback', feedbackData);
    return res.data;
  },

  getFeedbackInbox: async (params = {}) => {
    const res = await BaseAPI.get('/feedback', { params });
    return res.data;
  },

  deleteFeedback: async (id) => {
    const res = await BaseAPI.delete(`/feedback/${id}`);
    return res.data;
  },
};

export default FeedbackAPI;
