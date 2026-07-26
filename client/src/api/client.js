import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Tells the server which tenant a pre-login request is for (login, OTP, public branding).
  // Ignored once authenticated — the JWT carries school_id then. On a real subdomain the
  // server resolves the tenant from the host, so this is mainly for localhost/dev.
  const schoolCode = localStorage.getItem('sms_school_code');
  if (schoolCode) config.headers['X-School-Code'] = schoolCode;
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
