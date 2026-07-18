import { useParentChild } from '../../auth/ParentContext.jsx';
import ResultsView from '../shared/ResultsView.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

export default function ParentResults() {
  const { selectedChild } = useParentChild();
  return (
    <div>
      <ChildSwitcher />
      <h1 className="text-xl font-bold text-slate-900 mb-5">Results</h1>
      <ResultsView studentId={selectedChild.id} />
    </div>
  );
}
