import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

// Unauthenticated counterpart to useSettings — for the login screen, before anyone is
// signed in. Only hits GET /settings/public (name/logo/color/motto, nothing operational).
export function usePublicBranding() {
  return useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.get('/settings/public').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
