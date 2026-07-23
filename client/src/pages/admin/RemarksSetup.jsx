import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { Skeleton, SectionHeader, EmptyState, Modal, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconFileText } from '../../components/Icon.jsx';

const EMPTY_FORM = { remark_type: '', remark_text: '', class_id: '' };

export default function RemarksSetup() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const toast = useToast();
  const qc = useQueryClient();

  const { data: templates, isLoading } = useQuery({ queryKey: ['remark-templates'], queryFn: () => api.get('/remark-templates').then((r) => r.data) });
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });

  const create = useMutation({
    mutationFn: (payload) => api.post('/remark-templates', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remark-templates'] });
      toast('Remark template added.', 'success');
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/remark-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['remark-templates'] });
      toast('Template removed.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Remarks setup"
        description="Build a bank of reusable remark phrases teachers can quick-pick while filling the Remark Sheet"
        action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add template</button>}
      />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : !templates.length ? (
          <EmptyState icon={IconFileText} title="No remark templates yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add template</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Text</th>
                  <th>Class</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td><Badge tone="primary">{t.remark_type}</Badge></td>
                    <td className="text-slate-700">{t.remark_text}</td>
                    <td className="text-slate-500">{classes?.find((c) => c.id === t.class_id)?.name || 'Any class'}</td>
                    <td className="text-right">
                      <button className="text-red-600 font-medium" onClick={() => remove.mutate(t.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add remark template">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, class_id: form.class_id || null }); }}>
          <div>
            <label className="label">Remark type</label>
            <input className="input" required placeholder="e.g. Attitude, Conduct, Effort" value={form.remark_type} onChange={(e) => setForm({ ...form, remark_type: e.target.value })} />
          </div>
          <div>
            <label className="label">Remark text</label>
            <textarea className="input" rows={3} required value={form.remark_text} onChange={(e) => setForm({ ...form, remark_text: e.target.value })} />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">Any class</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn-primary w-full" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Add template'}</button>
        </form>
      </Modal>
    </div>
  );
}
