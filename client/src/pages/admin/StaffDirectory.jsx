import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { useSettings } from '../../hooks/useSettings.js';
import { generateStaffEmail } from '../../utils/staffEmail.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Avatar, Badge, StatCard } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconUsers, IconCheckCircle, IconAlertTriangle } from '../../components/Icon.jsx';

const STAFF_ROLES = ['admin', 'teacher', 'kitchen', 'accountant'];
const EMPTY_FORM = { role: 'teacher', full_name: '', username: '', password: '', phone: '', email: '', department: '' };

export default function StaffDirectory() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const toast = useToast();
  const qc = useQueryClient();
  const { data: settings } = useSettings();

  const { data: summary } = useQuery({ queryKey: ['staff', 'summary'], queryFn: () => api.get('/staff/summary').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['staff', roleFilter, search],
    queryFn: () => api.get('/staff', { params: { role: roleFilter || undefined, search: search || undefined, limit: 200 } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/staff', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      toast('Staff member added.', 'success');
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.put(`/staff/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });

  return (
    <div>
      <SectionHeader
        title="Staff directory"
        description="All staff across admin, teaching, kitchen and finance roles"
        action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add staff</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard label="Total staff" value={summary?.total ?? '—'} icon={IconUsers} />
        <StatCard label="Active" value={summary?.active ?? '—'} icon={IconCheckCircle} tone="green" />
        <StatCard label="Inactive" value={summary?.inactive ?? '—'} icon={IconAlertTriangle} tone="red" />
        <StatCard label="Departments" value={summary?.by_department?.length ?? '—'} icon={IconUsers} tone="amber" />
      </div>

      <div className="card p-4 mb-5 flex flex-wrap gap-3">
        <input className="input flex-1 min-w-[200px]" placeholder="Search by name or username…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !data.data.length ? (
          <EmptyState icon={IconUsers} title="No staff found" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add staff</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Staff</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} size={32} />
                        <div>
                          <p className="font-medium text-slate-800">{s.full_name}</p>
                          <p className="text-xs text-slate-400">{s.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><Badge tone="primary">{s.role}</Badge></td>
                    <td className="px-5 py-3 text-slate-500">{s.department || '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{s.email || generateStaffEmail(s.full_name, settings?.short_name)}</td>
                    <td className="px-5 py-3"><Badge tone={s.is_active ? 'green' : 'slate'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-primary-600 font-medium" onClick={() => toggleActive.mutate({ id: s.id, is_active: !s.is_active })}>
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add staff member">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Full name</label>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" placeholder="e.g. Teaching, Finance, Kitchen" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
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
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add staff member'}</button>
        </form>
      </Modal>
    </div>
  );
}
