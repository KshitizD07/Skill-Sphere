import BaseAPI from '../../services/BaseAPI';

const unwrap = (res) => (res?.data !== undefined ? res.data : res);

const ChatAPI = {
  // --- Conversations ---
  getConversations: async () => unwrap(await BaseAPI.get('/chat/conversations')),

  getMessages: async (conversationId, cursor = null, limit = 30) =>
    BaseAPI.get(`/chat/conversations/${conversationId}/messages?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`),

  getHistoryWithUser: async (otherUserId) =>
    BaseAPI.get(`/chat/history/${otherUserId}`),

  startConversation: async (recipientId) =>
    unwrap(await BaseAPI.post('/chat/conversations', { recipientId })),

  markConversationRead: async (conversationId) =>
    BaseAPI.put(`/chat/conversations/${conversationId}/read`, {}),

  deleteMessage: async (messageId) =>
    BaseAPI.delete(`/chat/messages/${messageId}`),
};

export default ChatAPI;
