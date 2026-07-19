import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useParentChild } from '../../auth/ParentContext.jsx';
import { Avatar } from '../../components/ui.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';
import { IconCalendar, IconBarChart, IconCreditCard, IconTrendingUp, IconMegaphone, IconMessageCircle } from '../../components/Icon.jsx';

const QUICK_LINKS = [
  { to: '/parent/attendance', icon: IconCalendar, label: 'Attendance' },
  { to: '/parent/results', icon: IconBarChart, label: 'Results' },
  { to: '/parent/fees', icon: IconCreditCard, label: 'Fees' },
  { to: '/parent/timetable', icon: IconCalendar, label: 'Timetable' },
  { to: '/parent/progress', icon: IconTrendingUp, label: 'Progress' },
  { to: '/parent/notices', icon: IconMegaphone, label: 'Notices' },
  { to: '/parent/chat', icon: IconMessageCircle, label: 'Chat' },
];

export default function ParentDashboard() {
  const { selectedChild } = useParentChild();

  return (
    <div>
      <ChildSwitcher />
      <div className="card p-5 mb-6 bg-gradient-to-br from-primary-500 to-primary-600 border-none text-white">
        <div className="flex items-center gap-4">
          <Avatar name={selectedChild.full_name} photoUrl={selectedChild.photo_url} size={56} />
          <div>
            <p className="text-white/80 text-sm">{format(new Date(), 'EEEE d MMMM')}</p>
            <p className="text-xl font-bold">{selectedChild.full_name}</p>
            <p className="text-white/80 text-sm">{selectedChild.class_name}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
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
