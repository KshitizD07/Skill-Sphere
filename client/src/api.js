import axios from 'axios';
import { API_BASE_URL } from './config/constants';

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies on every request
});

// Global response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear user data and redirect
      localStorage.removeItem('user_data');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default API;