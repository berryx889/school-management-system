import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconBuilding } from '../../components/Icon.jsx';

export default function Classes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', level: '', class_teacher_id: '' });
  const toast = useToast();
  const qc = useQueryClient();

  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: teachers } = useQuery({ queryKey: ['teachers'], queryFn: () => api.get('/teachers').then((r) => r.data.data) });

  const create = useMutation({
    mutationFn: (payload) => api.post('/classes', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      toast('Class created.', 'success');
      setModalOpen(false);
      setForm({ name: '', level: '', class_teacher_id: '' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Classes" description={`${classes?.length ?? 0} classes`} action={
        <div className="flex gap-2">
          <Link to="structure-builder" className="btn-secondary">+ Bulk generate</Link>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add class</button>
        </div>
      } />

      {isLoading ? (
        <PageLoader />
      ) : classes.length === 0 ? (
        <div className="card"><EmptyState icon={IconBuilding} title="No classes yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add class</button>} /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="card p-5">
              <p className="font-bold text-slate-900">{c.name}</p>
              <p className="text-sm text-slate-500">{c.level}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 text-sm flex justify-between">
                <span className="text-slate-500">{c.student_count} students</span>
                <span className="text-slate-500">{c.class_teacher_name || 'No class teacher'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add class">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div>
            <label className="label">Class name</label>
            <input className="input" required placeholder="e.g. JHS 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Level</label>
            <input className="input" required placeholder="e.g. JHS" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          </div>
          <div>
            <label className="label">Class teacher</label>
            <select className="input" value={form.class_teacher_id} onChange={(e) => setForm({ ...form, class_teacher_id: e.target.value })}>
              <option value="">None</option>
              {teachers?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add class'}</button>
        </form>
      </Modal>
    </div>
  );
}
