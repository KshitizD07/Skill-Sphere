import BaseAPI from '../../services/BaseAPI';

const FeedbackAPI = {
  submitFeedback: async (feedbackData) => {
    const res = await BaseAPI.post('/feedback', feedbackData);
    return res.data;
  },
};

export default FeedbackAPI;
