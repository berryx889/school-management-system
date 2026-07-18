import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Avatar, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

function StudentFormModal({ open, onClose, classes }) {
  const [form, setForm] = useState({ full_name: '', dob: '', gender: 'male', class_id: '', parent_name: '', parent_phone: '' });
  const toast = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/students', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast(`Student added. Temporary password: ${res.data.temp_password}`, 'success');
      onClose();
      setForm({ full_name: '', dob: '', gender: 'male', class_id: '', parent_name: '', parent_phone: '' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Add student">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date of birth</label>
            <input type="date" className="input" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">Unassigned</option>
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Parent / guardian name</label>
          <input className="input" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} />
        </div>
        <div>
          <label className="label">Parent phone number</label>
          <input className="input" required placeholder="0244000000" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} />
          <p className="text-xs text-slate-400 mt-1">A parent account is created automatically if this number is new.</p>
        </div>
        <button className="btn-primary w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Add student'}
        </button>
      </form>
    </Modal>
  );
}

export default function Students() {
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const toast = useToast();

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data, isLoading } = useQuery({
    queryKey: ['students', search, classFilter],
    queryFn: () =>
      api
        .get('/students', { params: { search: search || undefined, class_id: classFilter || undefined, limit: 200 } })
        .then((r) => r.data),
  });

  async function downloadTemplate() {
    const res = await api.get('/students/import/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data: result } = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast(`Imported ${result.created} students${result.errors.length ? `, ${result.errors.length} errors` : ''}.`, result.errors.length ? 'warning' : 'success');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div>
      <SectionHeader
        title="Students"
        description={`${data?.total ?? 0} total`}
        action={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-secondary" onClick={downloadTemplate}>⬇ Template</button>
            <label className="btn-secondary cursor-pointer">
              ⬆ Import Excel
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </label>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add student</button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <input className="input max-w-xs" placeholder="Search by name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input max-w-xs" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : data.data.length === 0 ? (
          <EmptyState icon="🎓" title="No students yet" description="Add your first student to get started." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add student</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Parent</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{s.student_code}</td>
                    <td className="px-5 py-3 text-slate-500">{s.class_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{s.parent_name || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{s.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link to={`/admin/students/${s.id}/qr-card`} className="text-primary-600 font-medium">QR card →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentFormModal open={modalOpen} onClose={() => setModalOpen(false)} classes={classes} />
    </div>
  );
}
