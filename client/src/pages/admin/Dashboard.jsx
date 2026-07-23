import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../../api/client.js';
import { StatCard, PageLoader, EmptyState, SkeletonCard } from '../../components/ui.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { format } from 'date-fns';
import {
  IconGraduationCap, IconUser, IconCheckCircle, IconAlertTriangle, IconClock, IconWallet,
  IconReceipt, IconClipboardList, IconTrendingUp, IconCreditCard, IconMegaphone,
  IconUnlock, IconSmartphone, IconBuilding, IconZap,
} from '../../components/Icon.jsx';

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card p-6 ${className}`}>
      <h3 className="text-[15px] font-bold text-slate-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ActivityItem({ icon: Icon, label, value, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm text-slate-600 flex-1">{label}</span>
      <span className="text-sm font-bold text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

const ATTENDANCE_COLORS = ['#059669', '#f59e0b', '#ef4444'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 py-2 text-xs border border-slate-100" style={{ borderRadius: '12px', boxShadow: 'var(--shadow-card)' }}>
      <p className="font-semibold text-slate-700 mb-0.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then((r) => r.data),
  });

  if (isLoading || !data) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-8 w-64 rounded-xl bg-slate-100 animate-shimmer mb-2" />
          <div className="h-5 w-48 rounded-lg bg-slate-100 animate-shimmer" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const attendancePie = [
    { name: 'Present', value: data.present_today, color: ATTENDANCE_COLORS[0] },
    { name: 'Late', value: data.late_today, color: ATTENDANCE_COLORS[1] },
    { name: 'Absent', value: data.absent_today, color: ATTENDANCE_COLORS[2] },
  ];
  const hasAttendanceToday = attendancePie.some((d) => d.value > 0);
  const totalToday = data.present_today + data.late_today + data.absent_today;

  const trendData = data.attendance_trend.map((d) => ({
    date: format(new Date(d.date), 'd MMM'),
    present: Number(d.present),
    total: Number(d.total),
  }));

  return (
    <div>
      {/* ── Welcome ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* ── Key metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total students" value={data.total_students} icon={IconGraduationCap} delay={0} />
        <StatCard label="Total teachers" value={data.total_teachers} icon={IconUser} delay={50} />
        <StatCard label="Present today" value={data.present_today} icon={IconCheckCircle} tone="green" delay={100} subtitle={totalToday > 0 ? `${Math.round((data.present_today / totalToday) * 100)}% attendance` : undefined} />
        <StatCard label="Absent today" value={data.absent_today} icon={IconAlertTriangle} tone="red" delay={150} subtitle={data.late_today > 0 ? `${data.late_today} late` : undefined} />
      </div>

      {/* ── Finance row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Fees collected" value={`GHS ${data.fees_collected.toLocaleString()}`} icon={IconWallet} tone="green" delay={200} subtitle="Current term" />
        <StatCard label="Outstanding" value={`GHS ${data.fees_outstanding.toLocaleString()}`} icon={IconReceipt} tone="amber" delay={250} subtitle={`${data.owing_students} student${data.owing_students !== 1 ? 's' : ''} owing`} />
        <StatCard label="SMS sent" value={data.sms_sent} icon={IconSmartphone} delay={300} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Today's attendance">
          {hasAttendanceToday ? (
            <>
              <div className="h-44">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={attendancePie} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={4} strokeWidth={0}>
                      {attendancePie.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-5 text-xs mt-1">
                {attendancePie.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name} <span className="font-semibold text-slate-700">{d.value}</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={IconClipboardList} title="No attendance yet" description="Nothing recorded for today." />
          )}
        </ChartCard>

        <ChartCard title="30-day attendance trend" className="lg:col-span-2">
          {trendData.length ? (
            <div className="h-44">
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#cbd5e1" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#cbd5e1" axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#059669" strokeWidth={2} fill="url(#gradPresent)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={IconTrendingUp} title="No trend data" description="Trend appears once attendance is recorded." />
          )}
        </ChartCard>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Enrollment by class">
          {data.enrollment_by_class.length ? (
            <ul className="space-y-3.5">
              {data.enrollment_by_class.map((c) => {
                const max = Math.max(...data.enrollment_by_class.map((x) => x.count), 1);
                return (
                  <li key={c.class_name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-600 font-medium">{c.class_name}</span>
                      <span className="font-bold text-slate-800 tabular-nums">{c.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full animate-grow-width"
                        style={{ width: `${(c.count / max) * 100}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={IconBuilding} title="No classes yet" />
          )}
        </ChartCard>

        <ChartCard title="Recent payments">
          {data.recent_payments.length ? (
            <ul className="divide-y divide-slate-50">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <IconCreditCard className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-slate-700 truncate">{p.student_name}</span>
                  </div>
                  <span className="font-bold text-emerald-600 tabular-nums shrink-0 ml-2">GHS {Number(p.amount).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={IconCreditCard} title="No payments yet" />
          )}
        </ChartCard>

        <ChartCard title="Recent announcements">
          {data.recent_announcements.length ? (
            <ul className="divide-y divide-slate-50">
              {data.recent_announcements.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <IconMegaphone className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{a.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{a.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={IconMegaphone} title="No announcements yet" />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
