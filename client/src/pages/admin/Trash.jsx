import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconTrash } from '../../components/Icon.jsx';

const GROUPS = [
  { key: 'students', label: 'Students' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'staff', label: 'Staff' },
  { key: 'classes', label: 'Classes' },
  { key: 'subjects', label: 'Subjects' },
  { key: 'assessments', label: 'Assessments' },
  { key: 'fee_structures', label: 'Fee structures' },
];

export default function Trash() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['trash'],
    queryFn: () => api.get('/trash').then((r) => r.data),
  });

  const restore = useMutation({
    mutationFn: ({ type, id }) => api.post('/trash/restore', { type, id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trash'] });
      // Anything restored should reappear in its own list.
      qc.invalidateQueries();
      toast('Restored.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const totalCount = data ? GROUPS.reduce((n, g) => n + (data[g.key]?.length || 0), 0) : 0;

  return (
    <div>
      <SectionHeader
        title="Trash"
        description="Deleted records are kept here and can be restored. Nothing is permanently removed."
      />

      {isLoading ? (
        <div className="card p-6 space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-1/2" />)}
        </div>
      ) : totalCount === 0 ? (
        <div className="card">
          <EmptyState icon={IconTrash} title="Trash is empty" description="Deleted classes, subjects, assessments, fee structures and students will appear here." />
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map((g) => {
            const rows = data[g.key] || [];
            if (!rows.length) return null;
            return (
              <div key={g.key} className="card table-card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-800">{g.label}</h2>
                  <span className="text-xs text-slate-400">{rows.length} deleted</span>
                </div>
                <div className="overflow-x-auto">
                  <table>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td className="font-medium text-slate-800">{r.label || `#${r.id}`}</td>
                          <td className="text-slate-400 text-sm hidden sm:table-cell">
                            {r.deleted_at ? `Deleted ${format(new Date(r.deleted_at), 'd MMM yyyy, HH:mm')}` : ''}
                          </td>
                          <td className="text-right">
                            <button className="text-primary-600 font-medium" disabled={restore.isPending}
                              onClick={() => restore.mutate({ type: g.key, id: r.id })}>
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
