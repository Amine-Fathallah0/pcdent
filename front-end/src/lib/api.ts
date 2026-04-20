import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/', // Corrected to match root URL configuration
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
  (config) => {
    const rawUrl = config.url || '';
    const normalizedPath = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
    const isAuthRoute = [
      'login/',
      'dentists/register/',
      'patients/register/',
      'api/token/',
      'api/token/refresh/',
    ].some((route) => normalizedPath.startsWith(route));

    if (isAuthRoute) {
      if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      return config;
    }

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
