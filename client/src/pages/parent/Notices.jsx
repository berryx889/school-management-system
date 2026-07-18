import { useParentChild } from '../../auth/ParentContext.jsx';
import Notices from '../shared/Notices.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

export default function ParentNotices() {
  const { selectedChild } = useParentChild();
  return (
    <div>
      <ChildSwitcher />
      <h1 className="text-xl font-bold text-slate-900 mb-5">Notices</h1>
      <Notices classId={selectedChild.class_id} />
    </div>
  );
}
