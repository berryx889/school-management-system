import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Avatar, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconUser } from '../../components/Icon.jsx';

export default function Teachers() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', username: '', password: '', phone: '', email: '', department: '' });
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers').then((r) => r.data) });

  const create = useMutation({
    mutationFn: (payload) => api.post('/teachers', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast('Teacher added.', 'success');
      setModalOpen(false);
      setForm({ full_name: '', username: '', password: '', phone: '', email: '', department: '' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/teachers/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const [resetResult, setResetResult] = useState(null);
  const resetPassword = useMutation({
    mutationFn: (id) => api.post(`/account/reset-password/${id}`),
    onSuccess: (res) => setResetResult(res.data),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Teachers"
        description={`${data?.total ?? 0} total`}
        action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add teacher</button>}
      />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={IconUser} title="No teachers yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add teacher</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Username</th>
                  <th className="hidden sm:table-cell">Department</th>
                  <th className="hidden sm:table-cell">Phone</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={t.full_name} size={32} />
                        <span className="font-medium text-slate-800">{t.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{t.username}</td>
                    <td className="hidden sm:table-cell text-slate-500">{t.department || '—'}</td>
                    <td className="hidden sm:table-cell text-slate-500">{t.phone || '—'}</td>
                    <td>
                      <Badge tone={t.is_active ? 'green' : 'slate'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="text-right space-x-3 whitespace-nowrap">
                      <button
                        className="text-slate-500 font-medium"
                        disabled={resetPassword.isPending}
                        onClick={() => resetPassword.mutate(t.id)}
                      >
                        Reset password
                      </button>
                      <button
                        className="text-primary-600 font-medium"
                        onClick={() => toggleActive.mutate({ id: t.id, is_active: !t.is_active })}
                      >
                        {t.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add teacher">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Username</label>
            <input className="input" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="e.g. Teaching" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add teacher'}</button>
        </form>
      </Modal>

      <Modal open={Boolean(resetResult)} onClose={() => setResetResult(null)} title="Password reset">
        <p className="text-sm text-slate-600 mb-3">
          Share this temporary password with <strong>{resetResult?.full_name}</strong>. They'll be asked to set a new one on next sign-in.
        </p>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-4">
          <code className="font-mono font-semibold text-slate-800">{resetResult?.temp_password}</code>
          <button
            type="button"
            className="text-primary-600 text-sm font-medium"
            onClick={() => { navigator.clipboard.writeText(resetResult.temp_password); toast('Copied.', 'success'); }}
          >
            Copy
          </button>
        </div>
        <button className="btn-primary w-full" onClick={() => setResetResult(null)}>Done</button>
      </Modal>
    </div>
  );
}
