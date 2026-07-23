import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { Skeleton } from '../../components/ui.jsx';
import Notices from '../shared/Notices.jsx';

export default function StudentNotices() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="card p-6 space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Notices</h1>
      <Notices classId={student.class_id} />
    </div>
  );
}
