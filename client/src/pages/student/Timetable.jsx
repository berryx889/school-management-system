import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';
import TimetableView from '../shared/TimetableView.jsx';

export default function StudentTimetable() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  if (isLoading) return <PageLoader />;
  return <TimetableView classId={student.class_id} title="My timetable" />;
}
