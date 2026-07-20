import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Avatar, Badge } from '../../components/ui.jsx';
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

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : data.data.length === 0 ? (
          <EmptyState icon={IconUser} title="No teachers yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add teacher</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Teacher</th>
                  <th className="px-5 py-3 font-medium">Username</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.full_name} size={32} />
                        <span className="font-medium text-slate-800">{t.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{t.username}</td>
                    <td className="px-5 py-3 text-slate-500">{t.department || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{t.phone || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={t.is_active ? 'green' : 'slate'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
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
