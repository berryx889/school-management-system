import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconBook } from '../../components/Icon.jsx';

export default function Subjects() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', type: 'core' });
  const [toDelete, setToDelete] = useState(null);
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects').then((r) => r.data) });

  const create = useMutation({
    mutationFn: (payload) => editing ? api.put(`/subjects/${editing.id}`, payload) : api.post('/subjects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast(editing ? 'Subject updated.' : 'Subject added.', 'success');
      setModalOpen(false);
      setEditing(null);
      setForm({ name: '', code: '', type: 'core' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/subjects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast('Subject moved to Trash.', 'success');
      setToDelete(null);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Subjects" description={`${data?.length ?? 0} subjects`} action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add subject</button>} />

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState icon={IconBook} title="No subjects yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add subject</button>} />
        ) : (
          <div className="divide-y divide-slate-50">
            {data.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between group">
                <span className="font-medium text-slate-800">{s.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={s.type === 'elective' ? 'amber' : 'slate'}>{s.type}</Badge>
                  <Badge tone="primary">{s.code}</Badge>
                  <button className="text-primary-600 text-xs font-semibold" onClick={() => { setEditing(s); setForm({ name: s.name, code: s.code, type: s.type }); setModalOpen(true); }}>Edit</button>
                  <button
                    className="text-slate-300 hover:text-red-600 text-xs transition-colors"
                    onClick={() => setToDelete(s)}
                    disabled={remove.isPending}
                    title="Delete subject"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? 'Edit subject' : 'Add subject'}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}>
          <div>
            <label className="label">Subject name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input" required placeholder="e.g. MATH" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="core">Core</option>
              <option value="elective">Elective</option>
            </select>
          </div>
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add subject'}</button>
        </form>
      </Modal>

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete subject">
        <p className="text-sm text-slate-600">Move “{toDelete?.name}” to Trash? You can restore it later.</p>
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
