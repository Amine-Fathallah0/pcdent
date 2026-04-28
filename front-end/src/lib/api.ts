import axios, { type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/',
});

const AUTH_ROUTES = [
  'login/',
  'dentists/register/',
  'patients/register/',
  'token/refresh/',
];

api.interceptors.request.use((config) => {
  const raw = config.url ?? '';
  const path = raw.startsWith('/') ? raw.slice(1) : raw;
  const isAuth = AUTH_ROUTES.some((r) => path.startsWith(r));

  if (!isAuth) {
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Single in-flight refresh promise to prevent cascading retries.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) throw new Error('No refresh token');
  const { data } = await axios.post('http://localhost:8000/token/refresh/', { refresh });
  const newAccess: string = data.access;
  localStorage.setItem('access_token', newAccess);
  localStorage.setItem('token', newAccess);
  return newAccess;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = refreshAccessToken().finally(() => { refreshing = null; });
        }
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        ['access_token', 'refresh_token', 'token', 'user_id', 'full_name', 'user_role', 'pcdent_user']
          .forEach((k) => localStorage.removeItem(k));
        // Avoid bouncing the user from public pages (landing, login, signup) when a
        // background validation request fails. Only redirect from protected areas.
        const path = window.location.pathname;
        const isPublic = path === '/' || path === '/login' || path === '/signup' || path === '/register-dentist';
        if (!isPublic) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
