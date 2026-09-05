import { api } from './client.js';

// Cache the API envelope consistently. Dropdowns use an observer-level selector;
// their array view must never replace the shared directory response in the cache.
export const selectTeacherRows = (directory) => directory.data;

export function teacherDirectoryQuery(user) {
  return {
    queryKey: ['teachers', 'directory', user.school_id, user.id],
    queryFn: async () => {
      const { data } = await api.get('/teachers');
      if (!Array.isArray(data?.data)) throw new Error('The teacher directory could not be loaded. Please try again.');
      return data;
    },
  };
}
