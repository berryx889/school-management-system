import { useAuth } from '../../auth/AuthContext.jsx';
import AttendanceCalendar from '../shared/AttendanceCalendar.jsx';

export default function StudentAttendance() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Attendance</h1>
      <AttendanceCalendar studentId={user.studentId} />
    </div>
  );
}
