import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { PageLoader, EmptyState, Badge } from '../../components/ui.jsx';
import { IconLock } from '../../components/Icon.jsx';

export default function ResultsView({ studentId }) {
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data, isLoading } = useQuery({
    queryKey: ['result', studentId, termId],
    queryFn: () => api.get(`/results/student/${studentId}`, { params: { term_id: termId } }).then((r) => r.data),
    enabled: Boolean(studentId && termId),
  });

  return (
    <div>
      <select className="input max-w-xs mb-5" value={termId} onChange={(e) => setTermId(e.target.value)}>
        {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
      </select>

      {isLoading ? (
        <PageLoader />
      ) : !data?.released ? (
        <div className="card"><EmptyState icon={IconLock} title="Results not yet released" description="Check back once the school releases results for this term." /></div>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{data.average.toFixed(1)}</p>
              <p className="text-xs text-slate-500 mt-1">Average</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{data.class_position}<span className="text-sm text-slate-400">/{data.class_size}</span></p>
              <p className="text-xs text-slate-500 mt-1">Class position</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{data.attendance.present}/{data.attendance.total}</p>
              <p className="text-xs text-slate-500 mt-1">Days present</p>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2.5 font-medium">Subject</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">Grade</th>
                  <th className="px-4 py-2.5 font-medium">Position</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.class_subject_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5">{s.subject_name}</td>
                    <td className="px-4 py-2.5 font-semibold">{s.total}</td>
                    <td className="px-4 py-2.5"><Badge tone={s.total >= 50 ? 'green' : 'red'}>{s.grade}</Badge></td>
                    <td className="px-4 py-2.5 text-slate-500">{s.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(data.remarks?.class_teacher_remark || data.remarks?.head_teacher_remark) && (
            <div className="card p-4 mt-5 space-y-2 text-sm">
              {data.remarks.class_teacher_remark && <p><span className="text-slate-500">Class teacher:</span> {data.remarks.class_teacher_remark}</p>}
              {data.remarks.head_teacher_remark && <p><span className="text-slate-500">Head teacher:</span> {data.remarks.head_teacher_remark}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
