import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useParentChild } from '../../auth/ParentContext.jsx';
import { Avatar, Skeleton } from '../../components/ui.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';
import { IconCalendar, IconBarChart, IconCreditCard, IconTrendingUp, IconMegaphone, IconMessageCircle } from '../../components/Icon.jsx';

const QUICK_LINKS = [
  { to: '/parent/attendance', icon: IconCalendar, label: 'Attendance', tone: 'bg-primary-50 text-primary-600' },
  { to: '/parent/results', icon: IconBarChart, label: 'Results', tone: 'bg-blue-50 text-blue-600' },
  { to: '/parent/fees', icon: IconCreditCard, label: 'Fees', tone: 'bg-amber-50 text-amber-600' },
  { to: '/parent/timetable', icon: IconCalendar, label: 'Timetable', tone: 'bg-slate-100 text-slate-600' },
  { to: '/parent/progress', icon: IconTrendingUp, label: 'Progress', tone: 'bg-emerald-50 text-emerald-600' },
  { to: '/parent/notices', icon: IconMegaphone, label: 'Notices', tone: 'bg-red-50 text-red-600' },
  { to: '/parent/chat', icon: IconMessageCircle, label: 'Chat', tone: 'bg-purple-50 text-purple-600' },
];

export default function ParentDashboard() {
  const { selectedChild } = useParentChild();

  return (
    <div>
      <ChildSwitcher />
      <div className="card p-6 mb-6 bg-gradient-to-br from-primary-600 to-primary-700 border-none text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="flex items-center gap-4">
          <Avatar name={selectedChild.full_name} photoUrl={selectedChild.photo_url} size={56} />
          <div>
            <p className="text-white/60 text-sm font-medium">{format(new Date(), 'EEEE, d MMM')}</p>
            <p className="text-xl font-bold mt-0.5">{selectedChild.full_name}</p>
            <p className="text-white/70 text-sm mt-0.5">{selectedChild.class_name}</p>
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
