import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useSettings } from '../../hooks/useSettings.js';
import { Skeleton, EmptyState, StatCard } from '../../components/ui.jsx';
import { IconBuilding, IconPrinter, IconArrowLeft, IconCalendar, IconBarChart, IconUsers } from '../../components/Icon.jsx';

export default function ClassDetail() {
  const { id } = useParams();
  const { data: settings } = useSettings();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const klass = classes?.find((c) => c.id === Number(id));

  const { data: roster, isLoading } = useQuery({
    queryKey: ['class-roster', id],
    queryFn: () => api.get('/students', { params: { class_id: id, limit: 300 } }).then((r) => r.data.data),
    enabled: Boolean(id),
  });
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['class-insights', id],
    queryFn: () => api.get(`/classes/${id}/insights`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const schoolName = settings?.name || 'OUR WORLD MODEL SCHOOL';

  return (
    <div>
      {/* Screen-only header */}
      <div className="no-print mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/classes" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <IconArrowLeft className="h-4 w-4" /> Back to classes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            {klass?.name || 'Class'}
            {klass?.section && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
                Section {klass.section}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {klass?.level}{klass?.class_teacher_name ? ` · Class teacher: ${klass.class_teacher_name}` : ''} · {roster?.length ?? 0} students
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.print()} disabled={!roster?.length}>
          <IconPrinter className="h-4 w-4" /> Print class list
        </button>
      </div>

      <div className="no-print grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Students" value={roster?.length ?? '—'} icon={IconUsers} loading={isLoading} />
        <StatCard label="Attendance · last 30 days" value={insights?.attendance_rate == null ? 'No records' : `${insights.attendance_rate}%`} icon={IconCalendar} loading={insightsLoading} />
        <StatCard label="Average score" value={insights?.average_score == null ? 'No marks' : `${insights.average_score}%`} icon={IconBarChart} loading={insightsLoading} />
      </div>

      {/* Print-only letterhead */}
      <div className="hidden print:block mb-4 text-center">
        <div className="flex items-center justify-center gap-3">
          {settings?.logo_url && <img src={settings.logo_url} alt={`${settings?.name || 'School'} logo`} className="h-14 w-14 object-contain" />}
          <div>
            <h1 className="text-xl font-bold uppercase">{schoolName}</h1>
            <p className="text-sm">Class List</p>
          </div>
        </div>
        <p className="mt-2 text-sm font-medium">
          {klass?.name}{klass?.section ? ` (Section ${klass.section})` : ''}
          {klass?.class_teacher_name ? ` — Class teacher: ${klass.class_teacher_name}` : ''}
        </p>
        <p className="text-xs text-slate-500">
          {roster?.length ?? 0} students · Printed {new Date().toLocaleDateString()}
        </p>
      </div>

      {isLoading ? (
        <div className="card p-5 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </div>
      ) : !roster?.length ? (
        <div className="card no-print"><EmptyState icon={IconBuilding} title="No students in this class" description="Add students to this class from the Students page." /></div>
      ) : (
        <div className="card table-card overflow-hidden print:shadow-none print:border">
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  <th>Index No</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th className="hidden sm:table-cell print:table-cell">Parent / Guardian</th>
                  <th className="hidden sm:table-cell print:table-cell">Phone</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-slate-400">{i + 1}</td>
                    <td className="text-slate-500">{s.student_code}</td>
                    <td className="font-medium text-slate-800">{s.full_name}</td>
                    <td className="text-slate-500 capitalize">{s.gender || '—'}</td>
                    <td className="hidden sm:table-cell print:table-cell text-slate-500">{s.parent_name || '—'}</td>
                    <td className="hidden sm:table-cell print:table-cell text-slate-500">{s.parent_phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
