import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

// Unauthenticated counterpart to useSettings — for the login screen, before anyone is
// signed in. Only hits GET /settings/public (name/logo/color/motto, nothing operational).
// `schoolCode` only participates in the cache key so branding refetches when the visitor
// picks a different school — the code itself rides along as the X-School-Code header that
// api/client.js attaches from localStorage.
export function usePublicBranding(schoolCode = '') {
  return useQuery({
    queryKey: ['public-settings', schoolCode],
    queryFn: () => api.get('/settings/public').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
