import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { format } from 'date-fns';

const AUDIENCES = [
  { id: 'all', label: 'Everyone' },
  { id: 'parents', label: 'All parents' },
  { id: 'class', label: 'One class (parents)' },
  { id: 'teachers', label: 'Teachers' },
];

const STATUS_TONE = { sent: 'green', pending_approval: 'amber', draft: 'slate' };

export default function Announcements() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data, isLoading } = useQuery({ queryKey: ['announcements'], queryFn: () => api.get('/announcements').then((r) => r.data) });

  const [form, setForm] = useState({ title: '', body: '', audience: 'all', class_id: '', send_sms: true });

  const create = useMutation({
    mutationFn: (payload) => api.post('/announcements', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast(res.data.status === 'pending_approval' ? 'Sent for admin approval.' : 'Announcement sent.', 'success');
      setForm({ title: '', body: '', audience: 'all', class_id: '', send_sms: true });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const approve = useMutation({
    mutationFn: (id) => api.post(`/announcements/${id}/send-sms`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast(`Sent to ${res.data.sent}/${res.data.total} recipients.`, 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Announcements" description="Compose and send updates to parents, teachers or the whole school" />

      <div className="card p-5 mb-6">
        <form
          className="space-y-3"
          onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, class_id: form.audience === 'class' ? form.class_id : null }); }}
        >
          <input className="input" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Message" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input max-w-xs" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {AUDIENCES.filter((a) => user.role === 'admin' || a.id !== 'teachers').map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            {form.audience === 'class' && (
              <select className="input max-w-xs" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">Choose class…</option>
                {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.send_sms} onChange={(e) => setForm({ ...form, send_sms: e.target.checked })} />
              Also send SMS
            </label>
            <button className="btn-primary ml-auto" disabled={create.isPending}>{create.isPending ? 'Sending…' : 'Send'}</button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data.length ? (
        <div className="card"><EmptyState icon="📣" title="No announcements yet" /></div>
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{a.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{a.body}</p>
                  <p className="text-xs text-slate-400 mt-2">{a.created_by_name} · {format(new Date(a.created_at), 'd MMM yyyy, h:mm a')}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status.replace('_', ' ')}</Badge>
                  {user.role === 'admin' && a.status === 'pending_approval' && (
                    <button className="btn-secondary text-xs" onClick={() => approve.mutate(a.id)} disabled={approve.isPending}>
                      Approve & send SMS
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
