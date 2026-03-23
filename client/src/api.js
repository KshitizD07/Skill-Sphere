import axios from 'axios';
import { API_BASE_URL } from './config/constants';

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Global response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user_data');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default API;