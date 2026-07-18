import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sms_token');
      localStorage.removeItem('sms_user');
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function apiErrorMessage(err) {
  return err?.response?.data?.error || 'Something went wrong. Please try again.';
}
