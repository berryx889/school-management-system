import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: classSubjects, isLoading } = useQuery({
    queryKey: ['class-subjects', 'mine', user.id],
    queryFn: () => api.get('/class-subjects', { params: { teacher_id: user.id } }).then((r) => r.data),
  });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const myClass = classes?.find((c) => c.class_teacher_id === user.id);

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Welcome, {user.full_name.split(' ')[0]}</h1>
      <p className="text-slate-500 text-sm mb-6">{format(new Date(), 'EEEE d MMMM yyyy')}</p>

      {myClass && (
        <div className="card p-5 mb-6 bg-primary-500 border-none">
          <p className="text-white/80 text-sm">You are the class teacher for</p>
          <p className="text-white text-2xl font-bold">{myClass.name}</p>
          <Link to="/teacher/attendance" className="inline-block mt-3 text-sm font-semibold text-white bg-white/20 rounded-lg px-3 py-1.5">
            Take today's attendance →
          </Link>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">Your subjects</h3>
        {!classSubjects?.length ? (
          <p className="text-sm text-slate-400">No subjects assigned yet. Ask the admin to assign you.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {classSubjects.map((cs) => (
              <li key={cs.id} className="py-2.5 flex justify-between text-sm">
                <span className="text-slate-700">{cs.class_name}</span>
                <span className="font-medium text-slate-800">{cs.subject_name}</span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/teacher/marks" className="btn-secondary mt-4 inline-flex">Enter marks →</Link>
      </div>
    </div>
  );
}
