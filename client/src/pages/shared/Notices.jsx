import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { PageLoader, EmptyState } from '../../components/ui.jsx';

export default function Notices({ classId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['notices', classId],
    queryFn: () => api.get('/announcements', { params: { class_id: classId } }).then((r) => r.data.filter((a) => a.status === 'sent')),
  });

  if (isLoading) return <PageLoader />;
  if (!data.length) return <div className="card"><EmptyState title="No notices yet" /></div>;

  return (
    <div className="space-y-3">
      {data.map((a) => (
        <div key={a.id} className="card p-4">
          <p className="font-semibold text-slate-800">{a.title}</p>
          <p className="text-sm text-slate-500 mt-1">{a.body}</p>
          <p className="text-xs text-slate-400 mt-2">{format(new Date(a.created_at), 'd MMM yyyy')}</p>
        </div>
      ))}
    </div>
  );
}
