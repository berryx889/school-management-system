import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Tells the server which tenant a pre-login request is for (login, OTP, public branding).
  // Ignored once authenticated — the JWT carries school_id then. On a real subdomain the
  // server resolves the tenant from the host, so this is mainly for localhost/dev.
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
  if (!err?.response) return 'We could not reach the school server. Check your internet connection and try again.';
  const status = err.response.status;
  const serverMessage = err.response?.data?.error;
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return serverMessage || 'You do not have permission to perform this action.';
  if (status === 404) return serverMessage || 'We could not find the requested record.';
  if (status === 409) return serverMessage || 'This conflicts with an existing record. Refresh the page and try again.';
  if (status === 413) return 'That file is too large. Choose a file smaller than 5 MB.';
  if (status === 429) return 'Too many attempts were made. Please wait a moment and try again.';
  if (status >= 500) {
    const reference = err.response?.data?.request_id;
    return `The school server had a temporary problem. Please try again${reference ? ` (reference ${reference})` : ''}.`;
  }
  return serverMessage || 'We could not complete that action. Check the information and try again.';
}
