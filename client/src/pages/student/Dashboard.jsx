import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api } from '../../api/client.js';
import { Avatar, PageLoader } from '../../components/ui.jsx';
import { IconCalendar, IconBarChart, IconMegaphone } from '../../components/Icon.jsx';

const QUICK_LINKS = [
  { to: '/student/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/student/results', icon: IconBarChart, label: 'Results' },
  { to: '/student/timetable', icon: IconCalendar, label: 'Timetable' },
  { to: '/student/notices', icon: IconMegaphone, label: 'Notices' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', user.studentId],
    queryFn: () => api.get(`/students/${user.studentId}`).then((r) => r.data),
    enabled: Boolean(user.studentId),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="card p-5 mb-6 bg-gradient-to-br from-primary-500 to-primary-600 border-none text-white">
        <div className="flex items-center gap-4">
          <Avatar name={student?.full_name} photoUrl={student?.photo_url} size={56} />
          <div>
            <p className="text-white/80 text-sm">{format(new Date(), 'EEEE d MMMM')}</p>
            <p className="text-xl font-bold">{student?.full_name}</p>
            <p className="text-white/80 text-sm">{student?.class_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {QUICK_LINKS.map((q) => (
          <Link key={q.to} to={q.to} className="card p-4 flex flex-col items-center gap-2 hover:border-primary-200">
            <span className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <q.icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-slate-600 text-center">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
