import { useAuth } from '../../auth/AuthContext.jsx';
import ResultsView from '../shared/ResultsView.jsx';

export default function StudentResults() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-5">Results</h1>
      <ResultsView studentId={user.studentId} />
    </div>
  );
}
