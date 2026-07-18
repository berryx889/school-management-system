import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../api/client.js';
import { StatCard, PageLoader, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  const attendancePie = [
    { name: 'Present', value: data.present_today, color: '#10b981' },
    { name: 'Late', value: data.late_today, color: '#f59e0b' },
    { name: 'Absent', value: data.absent_today, color: '#ef4444' },
  ];
  const hasAttendanceToday = attendancePie.some((d) => d.value > 0);

  return (
    <div>
      <SectionHeader title="Dashboard" description={`Today, ${format(new Date(), 'EEEE d MMMM yyyy')}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total students" value={data.total_students} icon="🎓" />
        <StatCard label="Total teachers" value={data.total_teachers} icon="🍎" />
        <StatCard label="Present today" value={data.present_today} icon="✅" tone="green" />
        <StatCard label="Absent today" value={data.absent_today} icon="⚠️" tone="red" />
        <StatCard label="Late today" value={data.late_today} icon="⏰" tone="amber" />
        <StatCard label="Fees collected (term)" value={`GHS ${data.fees_collected.toLocaleString()}`} icon="💰" tone="green" />
        <StatCard label="Fees outstanding" value={`GHS ${data.fees_outstanding.toLocaleString()}`} icon="🧾" tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5 lg:col-span-1">
          <h3 className="font-bold text-slate-900 mb-3">Today's attendance</h3>
          {hasAttendanceToday ? (
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={attendancePie} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {attendancePie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs mt-2">
                {attendancePie.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon="📋" title="No attendance yet" description="Nothing recorded for today yet." />
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-3">30-day attendance trend</h3>
          {data.attendance_trend.length ? (
            <div className="h-48">
              <ResponsiveContainer>
                <LineChart data={data.attendance_trend.map((d) => ({ ...d, date: format(new Date(d.date), 'd MMM') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Line type="monotone" dataKey="present" stroke="#5b4fe9" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="📈" title="No trend data yet" description="Trend appears once attendance is recorded." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3">Recent payments</h3>
          {data.recent_payments.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="py-2.5 flex justify-between text-sm">
                  <span className="text-slate-700">{p.student_name}</span>
                  <span className="font-semibold text-emerald-600">GHS {Number(p.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="💳" title="No payments yet" />
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3">Recent announcements</h3>
          {data.recent_announcements.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recent_announcements.map((a) => (
                <li key={a.id} className="py-2.5 text-sm">
                  <p className="font-medium text-slate-800">{a.title}</p>
                  <p className="text-slate-500 truncate">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="📣" title="No announcements yet" />
          )}
        </div>
      </div>
    </div>
  );
}
