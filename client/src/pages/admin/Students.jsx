import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Avatar, Badge, Skeleton } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconDownload, IconUpload, IconGraduationCap, IconEdit } from '../../components/Icon.jsx';

function StudentDetailModal({ student, onClose, classes, houses }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const toast = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!student) return;
    setEditing(false);
    setForm({
      full_name: student.full_name || '', dob: student.dob?.slice(0, 10) || '',
      gender: student.gender || '', class_id: student.class_id || '', status: student.status || 'active',
      parent_name: student.parent_name || '', parent_phone: student.parent_phone || '',
      house_id: student.house_id || '',
    });
  }, [student]);

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/students/${student.id}`, { ...form, dob: form.dob || null });
      return api.post('/houses/assign', { student_id: student.id, house_id: form.house_id ? Number(form.house_id) : null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['houses'] });
      toast('Student information updated.', 'success');
      setEditing(false);
      onClose();
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  if (!student) return null;
  const age = student.dob ? Math.max(0, Math.floor((Date.now() - new Date(student.dob).getTime()) / 31557600000)) : null;
  return (
    <Modal open={Boolean(student)} onClose={onClose} title={editing ? 'Edit student' : 'Student profile'}>
      {!editing ? (
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <Avatar name={student.full_name} photoUrl={student.photo_url} size={64} />
            <div><h3 className="text-lg font-bold text-slate-900">{student.full_name}</h3><p className="text-sm text-slate-500">{student.student_code} · {student.class_name || 'Unassigned'}</p></div>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-4 py-5 text-sm">
            <div><dt className="text-slate-400">Gender</dt><dd className="font-medium capitalize">{student.gender || '—'}</dd></div>
            <div><dt className="text-slate-400">Age / date of birth</dt><dd className="font-medium">{age == null ? '—' : `${age} years`} {student.dob ? `· ${new Date(student.dob).toLocaleDateString()}` : ''}</dd></div>
            <div><dt className="text-slate-400">Parent / guardian</dt><dd className="font-medium">{student.parent_name || '—'}</dd></div>
            <div><dt className="text-slate-400">Parent phone</dt><dd className="font-medium">{student.parent_phone || '—'}</dd></div>
            <div><dt className="text-slate-400">Student phone</dt><dd className="font-medium">{student.phone || '—'}</dd></div>
            <div><dt className="text-slate-400">House</dt><dd className="font-medium" style={{ color: student.house_color || undefined }}>{student.house_name || 'Unassigned'}</dd></div>
            <div><dt className="text-slate-400">Status</dt><dd><Badge tone={student.status === 'active' ? 'green' : 'slate'}>{student.status}</Badge></dd></div>
          </dl>
          <button className="btn-primary w-full" onClick={() => setEditing(true)}><IconEdit className="h-4 w-4" /> Edit information</button>
        </div>
      ) : (
        <form className="space-y-4 animate-fade-in-up" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <div><label className="label">Full name</label><input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date of birth</label><input type="date" className="input" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></div>
            <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
          </div>
          <div><label className="label">Class</label><select className="input" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">Unassigned</option>{classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">House</label><select className="input" value={form.house_id} onChange={(e) => setForm({ ...form, house_id: e.target.value })}><option value="">Unassigned</option>{houses?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></div>
          <div><label className="label">Parent / guardian name</label><input className="input" value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
          <div><label className="label">Parent phone</label><input className="input" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="graduated">Graduated</option></select></div>
          <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => setEditing(false)}>Cancel</button><button className="btn-primary flex-1" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      )}
    </Modal>
  );
}

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
  const [toDelete, setToDelete] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const toast = useToast();
  const qc = useQueryClient();

  const resetPassword = useMutation({
    mutationFn: (userId) => api.post(`/account/reset-password/${userId}`),
    onSuccess: (res) => setResetResult(res.data),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/students/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      toast('Student moved to Trash.', 'success');
      setToDelete(null);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: houses } = useQuery({ queryKey: ['houses'], queryFn: () => api.get('/houses').then((r) => r.data) });
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
                  <tr key={s.id} className="cursor-pointer hover:bg-primary-50/40" onClick={() => setSelectedStudent(s)}>
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
                        onClick={(e) => { e.stopPropagation(); resetPassword.mutate(s.user_id); }}
                      >
                        Reset password
                      </button>
                      <button className="text-primary-600 font-medium" onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); }}>View / Edit</button>
                      <Link onClick={(e) => e.stopPropagation()} to={`/admin/students/${s.id}/qr-card`} className="text-primary-600 font-medium">QR card →</Link>
                      <button className="text-red-500 font-medium" onClick={(e) => { e.stopPropagation(); setToDelete(s); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentFormModal open={modalOpen} onClose={() => setModalOpen(false)} classes={classes} />
      <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} classes={classes} houses={houses} />

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

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete student">
        <p className="text-sm text-slate-600">
          Move <b>{toDelete?.full_name}</b> to Trash? Their records are kept and you can restore
          them later from the Trash page.
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setToDelete(null)}>Cancel</button>
          <button className="btn-danger" disabled={remove.isPending} onClick={() => remove.mutate(toDelete.id)}>
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
