import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader, SkeletonCard } from '../../components/ui.jsx';
import { IconCalendar, IconEdit, IconBook, IconArrowRight } from '../../components/Icon.jsx';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: classSubjects, isLoading } = useQuery({
    queryKey: ['class-subjects', 'mine', user.id],
    queryFn: () => api.get('/class-subjects', { params: { teacher_id: user.id } }).then((r) => r.data),
  });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const myClass = classes?.find((c) => c.class_teacher_id === user.id);

  const firstName = user.full_name?.split(' ')[0] || 'Teacher';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-64 rounded-xl bg-slate-100 animate-shimmer mb-2" />
          <div className="h-5 w-48 rounded-lg bg-slate-100 animate-shimmer" />
        </div>
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {myClass && (
        <div className="card p-6 mb-6 bg-gradient-to-br from-primary-600 to-primary-700 border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <p className="text-white/70 text-sm font-medium">Class teacher for</p>
          <p className="text-white text-2xl font-bold mt-1">{myClass.name}</p>
          <Link
            to="/teacher/attendance"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl"
          >
            <IconCalendar className="h-4 w-4" />
            Take attendance
            <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-slate-800">Your subjects</h3>
          <Link to="/teacher/marks" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1">
            Enter marks <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {!classSubjects?.length ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <IconBook className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">No subjects assigned yet.</p>
            <p className="text-xs text-slate-400 mt-1">Ask the admin to assign you.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {classSubjects.map((cs) => (
              <li key={cs.id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <IconBook className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{cs.subject_name}</p>
                    <p className="text-xs text-slate-400">{cs.class_name}</p>
                  </div>
                </div>
                <Link to="/teacher/marks" className="text-primary-600 hover:text-primary-700 transition-colors">
                  <IconEdit className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
