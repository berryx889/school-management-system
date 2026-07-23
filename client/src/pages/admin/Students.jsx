import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Avatar, Badge, Skeleton } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconDownload, IconUpload, IconGraduationCap } from '../../components/Icon.jsx';

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
  const [resetResult, setResetResult] = useState(null);
  const toast = useToast();

  const resetPassword = useMutation({
    mutationFn: (userId) => api.post(`/account/reset-password/${userId}`),
    onSuccess: (res) => setResetResult(res.data),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

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

  async function downloadCsv() {
    const res = await api.get('/students/export', {
      params: { class_id: classFilter || undefined },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students.csv';
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
            <button className="btn-secondary" onClick={downloadCsv}><IconDownload className="h-4 w-4" /> Export CSV</button>
            <button className="btn-secondary" onClick={downloadTemplate}><IconDownload className="h-4 w-4" /> Template</button>
            <label className="btn-secondary cursor-pointer">
              <IconUpload className="h-4 w-4" /> Import Excel
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

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={IconGraduationCap} title="No students yet" description="Add your first student to get started." action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add student</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Class</th>
                  <th className="hidden sm:table-cell">Parent</th>
                  <th className="hidden sm:table-cell">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.full_name} photoUrl={s.photo_url} size={32} />
                        <span className="font-medium text-slate-800">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{s.student_code}</td>
                    <td className="text-slate-500">{s.class_name || '—'}</td>
                    <td className="hidden sm:table-cell text-slate-500">{s.parent_name || '—'}</td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={s.status === 'active' ? 'green' : 'slate'}>{s.status}</Badge>
                    </td>
                    <td className="text-right space-x-3 whitespace-nowrap">
                      <button
                        className="text-slate-500 font-medium"
                        disabled={resetPassword.isPending}
                        onClick={() => resetPassword.mutate(s.user_id)}
                      >
                        Reset password
                      </button>
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
