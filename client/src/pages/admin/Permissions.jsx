import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconShield } from '../../components/Icon.jsx';

const EMPTY_FORM = { user_id: '', permission_type: 'marks_entry', class_id: '', subject_id: '' };

export default function Permissions() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: grants, isLoading } = useQuery({ queryKey: ['permissions'], queryFn: () => api.get('/permissions').then((r) => r.data) });
  const { data: staff } = useQuery({ queryKey: ['staff-picker'], queryFn: () => api.get('/staff', { params: { limit: 200 } }).then((r) => r.data.data) });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects').then((r) => r.data) });

  const grant = useMutation({
    mutationFn: (payload) => api.post('/permissions', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
      toast('Permission granted.', 'success');
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const revoke = useMutation({
    mutationFn: (id) => api.delete(`/permissions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['permissions'] });
      toast('Permission revoked.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Permissions"
        description="Grant specific staff the right to enter marks or remarks for a class, in addition to the assigned teacher"
        action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Grant permission</button>}
      />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : !grants.length ? (
          <EmptyState icon={IconShield} title="No permissions granted yet" description="Grants are additive — the assigned subject/class teacher always keeps their own access." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Grant permission</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Type</th>
                  <th>Class</th>
                  <th className="hidden sm:table-cell">Subject</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id}>
                    <td className="font-medium text-slate-800">{g.user_name} <span className="text-slate-400 font-normal capitalize">· {g.user_role}</span></td>
                    <td><Badge tone="primary">{g.permission_type === 'marks_entry' ? 'Marks entry' : 'Remarks entry'}</Badge></td>
                    <td className="text-slate-500">{g.class_name}</td>
                    <td className="hidden sm:table-cell text-slate-500">{g.subject_name || '—'}</td>
                    <td className="text-right">
                      <button className="text-red-600 font-medium" onClick={() => revoke.mutate(g.id)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Grant permission">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); grant.mutate({ ...form, subject_id: form.subject_id || null }); }}>
          <div>
            <label className="label">Staff member</label>
            <select className="input" required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Choose a staff member…</option>
              {staff?.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Permission type</label>
            <select className="input" value={form.permission_type} onChange={(e) => setForm({ ...form, permission_type: e.target.value, subject_id: '' })}>
              <option value="marks_entry">Marks entry</option>
              <option value="remarks_entry">Remarks entry</option>
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" required value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Choose a class…</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {form.permission_type === 'marks_entry' && (
            <div>
              <label className="label">Subject</label>
              <select className="input" required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                <option value="">Choose a subject…</option>
                {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn-primary w-full" disabled={grant.isPending}>{grant.isPending ? 'Saving…' : 'Grant permission'}</button>
        </form>
      </Modal>
    </div>
  );
}
