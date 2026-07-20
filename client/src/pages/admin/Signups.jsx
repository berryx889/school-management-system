import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconInbox } from '../../components/Icon.jsx';

const STATUS_TONE = { new: 'primary', contacted: 'green', declined: 'red' };

export default function Signups() {
  const [statusFilter, setStatusFilter] = useState('');
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['signups', statusFilter],
    queryFn: () => api.get('/signups', { params: statusFilter ? { status: statusFilter } : {} }).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/signups/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signups'] });
      toast('Status updated.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="School signups"
        description="Prospective schools that requested access"
        action={
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="declined">Declined</option>
          </select>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !data.length ? (
          <EmptyState icon={IconInbox} title="No signups yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">School</th>
                  <th className="px-5 py-3 font-medium">Contact</th>
                  <th className="px-5 py-3 font-medium">Requested</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-800">{s.school_name}</span>
                      {s.desired_subdomain && <span className="text-xs text-slate-400 block">{s.desired_subdomain}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {s.contact_name}
                      <span className="text-xs text-slate-400 block">{s.contact_email}{s.contact_phone && ` · ${s.contact_phone}`}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{format(new Date(s.created_at), 'd MMM yyyy')}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                      {s.status !== 'contacted' && (
                        <button className="text-primary-600 font-medium" onClick={() => updateStatus.mutate({ id: s.id, status: 'contacted' })}>
                          Mark contacted
                        </button>
                      )}
                      {s.status !== 'declined' && (
                        <button className="text-slate-500 font-medium" onClick={() => updateStatus.mutate({ id: s.id, status: 'declined' })}>
                          Decline
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
