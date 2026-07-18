import { useQueries, useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { useParentChild } from '../../auth/ParentContext.jsx';
import { api } from '../../api/client.js';
import { PageLoader, EmptyState } from '../../components/ui.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';

const COLORS = ['#5b4fe9', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

export default function ParentProgress() {
  const { selectedChild } = useParentChild();
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const orderedTerms = [...(terms || [])].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const results = useQueries({
    queries: orderedTerms.map((t) => ({
      queryKey: ['result', selectedChild.id, t.id],
      queryFn: () => api.get(`/results/student/${selectedChild.id}`, { params: { term_id: t.id } }).then((r) => r.data),
      enabled: Boolean(terms),
    })),
  });

  const loaded = terms && results.every((r) => r.isSuccess);

  let chartData = [];
  let subjectNames = [];
  if (loaded) {
    const releasedResults = results.map((r, i) => ({ term: orderedTerms[i], data: r.data })).filter((x) => x.data.released);
    subjectNames = [...new Set(releasedResults.flatMap((r) => r.data.subjects.map((s) => s.subject_name)))];
    chartData = releasedResults.map(({ term, data }) => {
      const row = { term: `${term.term}` };
      for (const s of data.subjects) row[s.subject_name] = s.total;
      return row;
    });
  }

  return (
    <div>
      <ChildSwitcher />
      <h1 className="text-xl font-bold text-slate-900 mb-5">Progress</h1>

      {!loaded ? (
        <PageLoader />
      ) : chartData.length < 1 || !subjectNames.length ? (
        <div className="card"><EmptyState icon="📈" title="Not enough data yet" description="Progress appears once results are released for at least one term." /></div>
      ) : (
        <div className="card p-5">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="term" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {subjectNames.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
