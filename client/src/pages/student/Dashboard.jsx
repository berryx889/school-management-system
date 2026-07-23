import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { Avatar, Skeleton } from '../../components/ui.jsx';
import { IconCalendar, IconBarChart, IconMegaphone, IconArrowRight } from '../../components/Icon.jsx';

const QUICK_LINKS = [
  { to: '/student/attendance', icon: IconCalendar, label: 'Attendance', tone: 'bg-primary-50 text-primary-600' },
  { to: '/student/results', icon: IconBarChart, label: 'Results', tone: 'bg-blue-50 text-blue-600' },
  { to: '/student/timetable', icon: IconCalendar, label: 'Timetable', tone: 'bg-amber-50 text-amber-600' },
  { to: '/student/notices', icon: IconMegaphone, label: 'Notices', tone: 'bg-red-50 text-red-600' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) {
    return (
      <div>
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card p-6 mb-6 bg-gradient-to-br from-primary-600 to-primary-700 border-none text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <p className="text-white/60 text-sm font-medium">{greeting}</p>
        <div className="flex items-center gap-4 mt-2">
          <Avatar name={student?.full_name} photoUrl={student?.photo_url} size={56} />
          <div>
            <p className="text-xl font-bold">{student?.full_name}</p>
            <p className="text-white/70 text-sm mt-0.5">{student?.class_name} · {format(new Date(), 'EEEE, d MMM')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {QUICK_LINKS.map((q) => (
          <Link key={q.to} to={q.to} className="card card-hover p-4 flex flex-col items-center gap-2.5 text-center">
            <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${q.tone}`}>
              <q.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold text-slate-600">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
