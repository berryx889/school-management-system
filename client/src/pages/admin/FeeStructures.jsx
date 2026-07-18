import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function FeeStructures() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const toast = useToast();
  const qc = useQueryClient();

  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);
  useEffect(() => { if (classes?.length && !classId) setClassId(String(classes[0].id)); }, [classes, classId]);

  const { data: structures, isLoading } = useQuery({
    queryKey: ['fee-structures', classId, termId],
    queryFn: () => api.get('/fees/structures', { params: { class_id: classId, term_id: termId } }).then((r) => r.data),
    enabled: Boolean(classId && termId),
  });

  const [form, setForm] = useState({ item_name: '', amount: '' });

  const create = useMutation({
    mutationFn: (payload) => api.post('/fees/structures', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-structures'] });
      setForm({ item_name: '', amount: '' });
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/fees/structures/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-structures'] }),
  });

  const generate = useMutation({
    mutationFn: () => api.post('/fees/invoices/generate', { term_id: termId, class_id: classId }),
    onSuccess: (res) => toast(`Generated ${res.data.created} invoice(s).`, 'success'),
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const total = structures?.reduce((sum, s) => sum + Number(s.amount), 0) || 0;

  return (
    <div>
      <SectionHeader
        title="Fee structures"
        description="Itemized fees per class per term"
        action={
          <div className="flex gap-2">
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
            </select>
          </div>
        }
      />

      <div className="card p-5 mb-5">
        {isLoading ? (
          <PageLoader />
        ) : !structures?.length ? (
          <EmptyState icon="🧾" title="No fee items yet" description="Add items like tuition, feeding, PTA below." />
        ) : (
          <ul className="divide-y divide-slate-50 mb-4">
            {structures.map((s) => (
              <li key={s.id} className="py-2.5 flex justify-between items-center text-sm">
                <span className="text-slate-700">{s.item_name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">GHS {Number(s.amount).toLocaleString()}</span>
                  <button className="text-red-500 text-xs" onClick={() => remove.mutate(s.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {structures?.length > 0 && (
          <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-100">
            <span>Total per student</span>
            <span>GHS {total.toLocaleString()}</span>
          </div>
        )}

        <form
          className="flex gap-2 mt-4"
          onSubmit={(e) => { e.preventDefault(); create.mutate({ term_id: termId, class_id: classId, ...form, amount: Number(form.amount) }); }}
        >
          <input className="input" placeholder="Item name (e.g. Tuition)" required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          <input className="input max-w-[140px]" type="number" placeholder="Amount" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <button className="btn-secondary shrink-0" disabled={create.isPending}>+ Add</button>
        </form>
      </div>

      <button className="btn-primary" onClick={() => generate.mutate()} disabled={!structures?.length || generate.isPending}>
        {generate.isPending ? 'Generating…' : 'Generate invoices for this class'}
      </button>
    </div>
  );
}
