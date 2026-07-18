import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';

export default function Kitchen() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-kitchen'],
    queryFn: () => api.get('/dashboard/kitchen').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <p className="text-slate-500 text-sm mb-1">{format(new Date(), 'EEEE d MMMM yyyy')}</p>
      <div className="card p-10 text-center mb-6 bg-primary-500 border-none">
        <p className="text-white/80 font-medium mb-2">Cook for</p>
        <p className="text-white font-black text-7xl tabular-nums leading-none">{data.total_present}</p>
        <p className="text-white/80 font-medium mt-2">students today</p>
      </div>

      <div className="card p-5 mb-6">
        <h3 className="font-bold text-slate-900 mb-3">By class</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.by_class.map((c) => (
            <div key={c.class_name} className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{c.present_count}</p>
              <p className="text-xs text-slate-500 mt-1">{c.class_name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-3">Last 7 days</h3>
        <table className="w-full text-sm">
          <tbody>
            {data.history.map((h) => (
              <tr key={h.date} className="border-b border-slate-50 last:border-0">
                <td className="py-2 text-slate-500">{format(new Date(h.date), 'EEE d MMM')}</td>
                <td className="py-2 text-right font-semibold text-slate-800">{h.present_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
