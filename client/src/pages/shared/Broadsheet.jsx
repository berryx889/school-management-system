import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { IconPrinter, IconBarChart } from '../../components/Icon.jsx';

export default function Broadsheet() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);

  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data, isLoading } = useQuery({
    queryKey: ['broadsheet', classId, termId],
    queryFn: () => api.get('/results/broadsheet', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classId && termId),
  });

  return (
    <div>
      <SectionHeader
        title="Broadsheet"
        description="Class-wide subject totals and positions"
        action={
          <div className="flex gap-2 no-print">
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Choose class…</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
            </select>
            {Boolean(data?.students?.length) && (
              <button className="btn-primary" onClick={() => window.print()}><IconPrinter className="h-4 w-4" /> Print</button>
            )}
          </div>
        }
      />

      {!classId ? (
        <div className="card"><EmptyState icon={IconBarChart} title="Choose a class" /></div>
      ) : isLoading ? (
        <PageLoader />
      ) : !data.students.length ? (
        <div className="card"><EmptyState icon={IconBarChart} title="No students in this class" /></div>
      ) : (
        <div className="card overflow-x-auto print:shadow-none print:border-none">
          <table className="w-full text-xs border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 border border-slate-100 text-left sticky left-0 bg-slate-50">Student</th>
                {data.subjects.map((s) => (
                  <th key={s.id} className="p-2 border border-slate-100">{s.subject_name}</th>
                ))}
                <th className="p-2 border border-slate-100">Total</th>
                <th className="p-2 border border-slate-100">Average</th>
                <th className="p-2 border border-slate-100">Position</th>
              </tr>
            </thead>
            <tbody>
              {data.students
                .slice()
                .sort((a, b) => a.class_position - b.class_position)
                .map((s) => (
                  <tr key={s.student_id}>
                    <td className="p-2 border border-slate-100 font-medium sticky left-0 bg-white">{s.full_name}</td>
                    {s.subjects.map((sub) => (
                      <td key={sub.class_subject_id} className="p-2 border border-slate-100 text-center">
                        {sub.total} <span className="text-slate-400">({sub.grade})</span>
                      </td>
                    ))}
                    <td className="p-2 border border-slate-100 text-center font-semibold">{s.total.toFixed(1)}</td>
                    <td className="p-2 border border-slate-100 text-center">{s.average.toFixed(1)}</td>
                    <td className="p-2 border border-slate-100 text-center font-bold">{s.class_position}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
