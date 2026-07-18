import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

const DAYS = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const DEFAULT_TIMES = { 1: ['08:00', '08:40'], 2: ['08:40', '09:20'], 3: ['09:20', '10:00'], 4: ['10:20', '11:00'], 5: ['11:00', '11:40'], 6: ['11:40', '12:20'], 7: ['13:00', '13:40'], 8: ['13:40', '14:20'] };

export default function Timetable() {
  const [classId, setClassId] = useState('');
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects').then((r) => r.data) });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers').then((r) => r.data.data) });
  const { data: cells, isLoading } = useQuery({
    queryKey: ['timetable', classId],
    queryFn: () => api.get('/timetable', { params: { class_id: classId } }).then((r) => r.data),
    enabled: Boolean(classId),
  });

  const save = useMutation({
    mutationFn: (payload) => api.put('/timetable/cell', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable', classId] }),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function cellFor(day, period) {
    return cells?.find((c) => c.day_of_week === day && c.period_no === period);
  }

  function updateCell(day, period, field, value) {
    const existing = cellFor(day, period);
    const [defaultStart, defaultEnd] = DEFAULT_TIMES[period];
    save.mutate({
      class_id: classId,
      day_of_week: day,
      period_no: period,
      start_time: existing?.start_time || defaultStart,
      end_time: existing?.end_time || defaultEnd,
      subject_id: existing?.subject_id || null,
      teacher_id: existing?.teacher_id || null,
      [field]: value || null,
    });
  }

  return (
    <div>
      <SectionHeader title="Timetable editor" description="Grid of days × periods per class" />

      <select className="input max-w-xs mb-5" value={classId} onChange={(e) => setClassId(e.target.value)}>
        <option value="">Choose a class…</option>
        {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {!classId ? (
        <div className="card"><EmptyState icon="🗓️" title="Choose a class" description="Select a class above to edit its timetable." /></div>
      ) : isLoading ? (
        <PageLoader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2 border border-slate-100 bg-slate-50 text-slate-500 font-medium">Period</th>
                {DAYS.map((d) => (
                  <th key={d.id} className="p-2 border border-slate-100 bg-slate-50 text-slate-500 font-medium">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <td className="p-2 border border-slate-100 text-center font-medium text-slate-500">
                    P{period}<br /><span className="text-[10px]">{DEFAULT_TIMES[period][0]}</span>
                  </td>
                  {DAYS.map((day) => {
                    const cell = cellFor(day.id, period);
                    return (
                      <td key={day.id} className="p-1.5 border border-slate-100 min-w-[130px]">
                        <select
                          className="w-full text-xs rounded-lg border border-slate-200 px-1.5 py-1 mb-1"
                          value={cell?.subject_id || ''}
                          onChange={(e) => updateCell(day.id, period, 'subject_id', e.target.value)}
                        >
                          <option value="">—</option>
                          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
                        </select>
                        <select
                          className="w-full text-xs rounded-lg border border-slate-200 px-1.5 py-1"
                          value={cell?.teacher_id || ''}
                          onChange={(e) => updateCell(day.id, period, 'teacher_id', e.target.value)}
                        >
                          <option value="">Teacher…</option>
                          {teachers?.map((t) => <option key={t.id} value={t.id}>{t.full_name.split(' ')[0]}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
