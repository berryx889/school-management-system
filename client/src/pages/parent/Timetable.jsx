import { useParentChild } from '../../auth/ParentContext.jsx';
import TimetableView from '../shared/TimetableView.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

export default function ParentTimetable() {
  const { selectedChild } = useParentChild();
  return (
    <div>
      <ChildSwitcher />
      <TimetableView classId={selectedChild.class_id} title="Timetable" />
    </div>
  );
}
