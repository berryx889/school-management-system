import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { Skeleton, EmptyState } from '../../components/ui.jsx';

export default function Notices({ classId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['notices', classId],
    queryFn: () => api.get('/announcements', { params: { class_id: classId } }).then((r) => r.data.filter((a) => a.status === 'sent')),
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
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
