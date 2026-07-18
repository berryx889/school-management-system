import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';
import Notices from '../shared/Notices.jsx';

export default function StudentNotices() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  if (isLoading) return <PageLoader />;
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Notices</h1>
      <Notices classId={student.class_id} />
    </div>
  );
}
