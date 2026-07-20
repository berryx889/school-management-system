import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

// Shared cache key with BrandThemeSync — any authenticated screen can read school
// branding (name, logo, colors) without triggering a duplicate network request.
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
