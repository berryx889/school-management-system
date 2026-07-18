import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';

const STATUS_COLOR = { present: '#10b981', late: '#f59e0b', absent: '#ef4444' };

export default function AttendanceCalendar({ studentId }) {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'student', studentId, month],
    queryFn: () => api.get('/attendance', { params: { student_id: studentId, month } }).then((r) => r.data),
    enabled: Boolean(studentId),
  });

  if (isLoading) return <PageLoader />;

  const byDate = Object.fromEntries((data || []).map((a) => [a.date.slice(0, 10), a.status]));
  const monthDate = new Date(`${month}-01T00:00:00`);
  const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) });
  const leadingBlanks = getDay(startOfMonth(monthDate));

  const counts = { present: 0, late: 0, absent: 0 };
  for (const status of Object.values(byDate)) counts[status] = (counts[status] || 0) + 1;
  const totalMarked = counts.present + counts.late + counts.absent;
  const pieData = [
    { name: 'Present', value: counts.present, color: STATUS_COLOR.present },
    { name: 'Late', value: counts.late, color: STATUS_COLOR.late },
    { name: 'Absent', value: counts.absent, color: STATUS_COLOR.absent },
  ];

  return (
    <div>
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <input type="month" className="input max-w-[160px]" value={month} onChange={(e) => setMonth(e.target.value)} />
          {totalMarked > 0 && (
            <p className="text-sm font-semibold text-slate-700">
              {Math.round(((counts.present + counts.late) / totalMarked) * 100)}% attendance
            </p>
          )}
        </div>

        {totalMarked > 0 && (
          <div className="h-40 mb-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3}>
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400 mb-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const status = byDate[key];
            return (
              <div
                key={key}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium
                  ${status ? '' : 'text-slate-300'}`}
                style={status ? { background: `${STATUS_COLOR[status]}22`, color: STATUS_COLOR[status] } : {}}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
