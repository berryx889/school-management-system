import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useParentChild } from '../../auth/ParentContext.jsx';
import { Avatar } from '../../components/ui.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

const QUICK_LINKS = [
  { to: '/parent/attendance', icon: '📅', label: 'Attendance' },
  { to: '/parent/results', icon: '📊', label: 'Results' },
  { to: '/parent/fees', icon: '💳', label: 'Fees' },
  { to: '/parent/timetable', icon: '🗓️', label: 'Timetable' },
  { to: '/parent/progress', icon: '📈', label: 'Progress' },
  { to: '/parent/notices', icon: '📣', label: 'Notices' },
  { to: '/parent/chat', icon: '💬', label: 'Chat' },
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
            <span className="text-2xl">{q.icon}</span>
            <span className="text-xs font-medium text-slate-600 text-center">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
