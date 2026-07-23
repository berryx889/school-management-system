import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { Skeleton } from '../../components/ui.jsx';
import TimetableView from '../shared/TimetableView.jsx';

export default function StudentTimetable() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="card p-6 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
  return <TimetableView classId={student.class_id} title="My timetable" />;
}
