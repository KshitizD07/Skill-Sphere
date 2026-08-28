import BaseAPI from '../../services/BaseAPI';

const NotificationAPI = {
  // Get paginated notifications with optional type filter
  getNotifications: async (cursor = null, limit = 20, type = null) => {
    let url = `/notifications?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;
    if (type && type !== 'ALL') url += `&type=${type}`;
    return BaseAPI.get(url);
  },

  // Get fast unread count for badge
  getUnreadCount: async () => {
    const res = await BaseAPI.get('/notifications/unread-count');
    return res?.count ?? (res?.data?.count ?? 0);
  },

  // Mark single notification as read
  markAsRead: async (id) => BaseAPI.put(`/notifications/${id}/read`, {}),

  // Mark all notifications as read
  markAllAsRead: async () => BaseAPI.put('/notifications/read-all', {}),

  // Delete a single notification
  deleteNotification: async (id) => BaseAPI.delete(`/notifications/${id}`),

  // Clear all notifications
  clearAll: async () => BaseAPI.delete('/notifications/clear-all'),
};

export default NotificationAPI;
