import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext.jsx';
import { teacherDirectoryQuery, selectTeacherRows } from '../api/teachers.js';

export function useTeacherDirectory(rowsOnly = false) {
  const { user } = useAuth();
  return useQuery({
    ...teacherDirectoryQuery(user),
    ...(rowsOnly ? { select: selectTeacherRows } : {}),
  });
}
