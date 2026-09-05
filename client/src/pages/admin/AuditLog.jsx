import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { api } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Badge } from '../../components/ui.jsx';
import { IconActivity, IconAlertTriangle } from '../../components/Icon.jsx';

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

  const { data, isLoading, isError, refetch } = useQuery({
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
            {actions.map((a) => <option key={a.value || a} value={a.value || a}>{a.label || a}</option>)}
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
        ) : isError ? (
          <EmptyState
            icon={IconAlertTriangle}
            title="We couldn’t load the activity history"
            description="Check your connection and try again. No audit records were changed."
            action={<button className="btn-secondary" onClick={() => refetch()}>Try again</button>}
          />
        ) : !data?.data?.length ? (
          <EmptyState icon={IconActivity} title="No activity yet" description="Sensitive actions will appear here as they happen." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Done by</th>
                  <th>Event</th>
                  <th>What happened</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap align-top">
                      <p className="text-slate-700 font-medium">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                      <p className="text-xs text-slate-400 tabular-nums mt-0.5">{format(new Date(e.created_at), 'd MMM yyyy, h:mm a')}</p>
                    </td>
                    <td className="text-slate-700 align-top">{e.actor_display}</td>
                    <td className="align-top"><Badge tone={toneFor(e.action)}>{e.action_label}</Badge></td>
                    <td className="text-slate-600 min-w-64">
                      <p>{e.description}</p>
                      <details className="mt-2 text-xs text-slate-400">
                        <summary className="cursor-pointer hover:text-slate-600">View technical details</summary>
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 space-y-1 font-mono break-all">
                          <p>Event code: {e.action}</p>
                          {e.entity_type && <p>Record: {e.entity_type}{e.entity_id ? ` ${e.entity_id}` : ''}</p>}
                          <p>Network address: {e.ip || 'Not available'}</p>
                        </div>
                      </details>
                    </td>
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
