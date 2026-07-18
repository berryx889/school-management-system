import { useParentChild } from '../../auth/ParentContext.jsx';
import AttendanceCalendar from '../shared/AttendanceCalendar.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

export default function ParentAttendance() {
  const { selectedChild } = useParentChild();
  return (
    <div>
      <ChildSwitcher />
      <h1 className="text-xl font-bold text-slate-900 mb-5">Attendance</h1>
      <AttendanceCalendar studentId={selectedChild.id} />
    </div>
  );
}
