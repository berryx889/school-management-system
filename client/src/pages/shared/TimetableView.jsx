import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { PageLoader, EmptyState } from '../../components/ui.jsx';
import { IconCalendar } from '../../components/Icon.jsx';

const DAYS = [
  { id: 1, label: 'Monday' }, { id: 2, label: 'Tuesday' }, { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' }, { id: 5, label: 'Friday' },
];

export default function TimetableView({ classId, teacherId, title = 'Timetable' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['timetable-view', classId, teacherId],
    queryFn: () => api.get('/timetable', { params: { class_id: classId, teacher_id: teacherId } }).then((r) => r.data),
    enabled: Boolean(classId || teacherId),
  });

  if (isLoading) return <PageLoader />;
  if (!data?.length) return <div className="card"><EmptyState icon={IconCalendar} title="No timetable yet" /></div>;

  const byDay = Object.fromEntries(DAYS.map((d) => [d.id, data.filter((c) => c.day_of_week === d.id).sort((a, b) => a.period_no - b.period_no)]));

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-4">{title}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS.map((day) => (
          <div key={day.id} className="card p-4">
            <p className="font-semibold text-slate-800 mb-3">{day.label}</p>
            {byDay[day.id].length === 0 ? (
              <p className="text-xs text-slate-400">No periods</p>
            ) : (
              <ul className="space-y-2">
                {byDay[day.id].map((p) => (
                  <li key={p.id} className="rounded-lg bg-slate-50 p-2.5 text-xs">
                    <p className="font-medium text-slate-700">{p.subject_name || 'Free'}</p>
                    <p className="text-slate-400">{p.start_time?.slice(0, 5)}–{p.end_time?.slice(0, 5)}{p.teacher_name ? ` · ${p.teacher_name}` : ''}{p.class_name ? ` · ${p.class_name}` : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
