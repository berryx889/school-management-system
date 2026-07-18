import { useAuth } from '../../auth/AuthContext.jsx';
import TimetableView from '../shared/TimetableView.jsx';

export default function TeacherTimetable() {
  const { user } = useAuth();
  return <TimetableView teacherId={user.id} title="My timetable" />;
}
