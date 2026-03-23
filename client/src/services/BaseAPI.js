import API from '../api';

class BaseAPI {
  static async get(endpoint, params) {
    try {
      const response = await API.get(endpoint, { params });
      return response.data;
    } catch (error) {
      return BaseAPI._handleError(error);
    }
  }

  static async post(endpoint, data) {
    try {
      const response = await API.post(endpoint, data);
      return response.data;
    } catch (error) {
      return BaseAPI._handleError(error);
    }
  }

  static async patch(endpoint, data) {
    try {
      const response = await API.patch(endpoint, data);
      return response.data;
    } catch (error) {
      return BaseAPI._handleError(error);
    }
  }

  static async put(endpoint, data) {
    try {
      const response = await API.put(endpoint, data);
      return response.data;
    } catch (error) {
      return BaseAPI._handleError(error);
    }
  }

  static async delete(endpoint) {
    try {
      const response = await API.delete(endpoint);
      return response.data;
    } catch (error) {
      return BaseAPI._handleError(error);
    }
  }

  static _handleError(error) {
    // Safe check — network errors have no response object
    if (!error.response) {
      console.error('Network error:', error.message);
      return { error: 'Network Error', message: 'Cannot reach the server. Check your connection.' };
    }

    const { status, data } = error.response;
    const message = data?.message || data?.error || error.message;

    switch (status) {
      case 400: return { error: 'Bad Request', message };
      case 401: return { error: 'Unauthorized', message: 'Please login again.' };
      case 403: return { error: 'Forbidden', message: 'You do not have permission.' };
      case 404: return { error: 'Not Found', message: 'Resource does not exist.' };
      case 409: return { error: 'Conflict', message };
      case 500: return { error: 'Server Error', message: 'Something went wrong on the server.' };
      default:  return { error: 'Unknown Error', message };
    }
  }
}

export default BaseAPI;