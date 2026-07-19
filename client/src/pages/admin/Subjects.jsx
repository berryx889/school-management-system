import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconBook } from '../../components/Icon.jsx';

export default function Subjects() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'core' });
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get('/subjects').then((r) => r.data) });

  const create = useMutation({
    mutationFn: (payload) => api.post('/subjects', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast('Subject added.', 'success');
      setModalOpen(false);
      setForm({ name: '', code: '', type: 'core' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader title="Subjects" description={`${data?.length ?? 0} subjects`} action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add subject</button>} />

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : data.length === 0 ? (
          <EmptyState icon={IconBook} title="No subjects yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add subject</button>} />
        ) : (
          <div className="divide-y divide-slate-50">
            {data.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <span className="font-medium text-slate-800">{s.name}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={s.type === 'elective' ? 'amber' : 'slate'}>{s.type}</Badge>
                  <Badge tone="primary">{s.code}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add subject">
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
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add subject'}</button>
        </form>
      </Modal>
    </div>
  );
}
