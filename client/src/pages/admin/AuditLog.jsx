import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Badge } from '../../components/ui.jsx';
import { IconActivity } from '../../components/Icon.jsx';

// Colour the action by what kind of thing happened, so the log scans at a glance.
function toneFor(action) {
  if (action.startsWith('auth.login_failed')) return 'red';
  if (action.startsWith('auth.')) return 'slate';
  if (action.startsWith('marks.')) return 'amber';
  if (action.startsWith('payment.')) return 'green';
  if (action.startsWith('permission.') || action.startsWith('results.')) return 'blue';
  if (action.startsWith('school.')) return 'primary';
  return 'slate';
}

export default function AuditLog() {
  const [action, setAction] = useState('');

  const { data: actions = [] } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => api.get('/audit-logs/actions').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action],
    queryFn: () => api.get('/audit-logs', { params: { ...(action ? { action } : {}), limit: 100 } }).then((r) => r.data),
  });

  return (
    <div>
      <SectionHeader
        title="Audit log"
        description="A record of sensitive actions — who did what, and when."
        action={
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        }
      />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48 ml-auto" />
              </div>
            ))}
          </div>
        ) : !data.data.length ? (
          <EmptyState icon={IconActivity} title="No activity yet" description="Sensitive actions will appear here as they happen." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th className="hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-slate-500 tabular-nums">{format(new Date(e.created_at), 'd MMM, HH:mm')}</td>
                    <td className="text-slate-700">{e.actor_label || <span className="text-slate-400">—</span>}</td>
                    <td><Badge tone={toneFor(e.action)}>{e.action}</Badge></td>
                    <td className="text-slate-600">{e.summary}</td>
                    <td className="hidden lg:table-cell text-slate-400 font-mono text-xs">{e.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {data && data.total > data.data.length && (
        <p className="text-xs text-slate-400 mt-3 text-center">Showing the most recent {data.data.length} of {data.total} entries.</p>
      )}
    </div>
  );
}
