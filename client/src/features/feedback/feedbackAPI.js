import BaseAPI from '../../services/BaseAPI';

const FeedbackAPI = {
  submitFeedback: async (feedbackData) => {
    const res = await BaseAPI.post('/feedback', feedbackData);
    return res.data;
  },

  submitDirectHTTPS: async (payload) => {
    try {
      const formattedData = {
        _subject: `🔥 [SkillSphere Feedback] ${payload.category} from ${payload.userName || 'User'} (${payload.rating}/5 ⭐)`,
        '👤 Full Name': payload.userName || 'Anonymous',
        '📧 Registered Email': payload.userEmail || 'Not provided',
        '🏫 College / Campus': payload.userCollege || 'Not specified',
        '🏷️ Account Role': payload.userRole || 'STUDENT',
        '⭐ Rating': `${payload.rating} / 5 Stars`,
        '🎨 Category': payload.category,
        '💬 Detailed Feedback': payload.feedback,
        '✨ Most Valuable Feature': payload.mostValuable || 'None specified',
        '🛠️ Suggested Improvement': payload.improvement || 'None specified',
        '🚀 Wants to Contribute': payload.wantsToContribute ? 'YES - Volunteer Developer' : 'No',
        '🛠️ Contributor Skills': (payload.contributorAreas || []).join(', ') || 'N/A',
        '📱 Contributor Contact': payload.contributorContact || 'N/A',
        _captcha: 'false',
        _template: 'table',
      };

      const emails = ['kshitizd171@gmail.com', 'kshitizd777@gmail.com'];
      await Promise.allSettled(
        emails.map((email) =>
          fetch(`https://formsubmit.co/ajax/${email}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({ ...formattedData, _replyto: payload.userEmail }),
          })
        )
      );
    } catch (err) {
      console.warn('Direct HTTPS mail dispatch notice:', err);
    }
  },
};

export default FeedbackAPI;
