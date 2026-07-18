import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, SectionHeader, EmptyState, Modal } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function Debtors() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  useEffect(() => { if (currentTerm && !termId) setTermId(String(currentTerm.id)); }, [currentTerm, termId]);

  const { data: debtors, isLoading } = useQuery({
    queryKey: ['debtors', classId, termId],
    queryFn: () => api.get('/fees/debtors', { params: { class_id: classId || undefined, term_id: termId || undefined } }).then((r) => r.data),
  });

  const [selected, setSelected] = useState(new Set());
  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const remind = useMutation({
    mutationFn: () => api.post('/fees/debtors/remind', { invoice_ids: [...selected] }),
    onSuccess: (res) => {
      toast(`Reminder sent to ${res.data.sent} of ${res.data.results.length} parent(s).`, 'success');
      setSelected(new Set());
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash' });

  const recordPayment = useMutation({
    mutationFn: () => api.post('/payments/manual', { invoice_id: payModal.invoice_id, amount: Number(payForm.amount), method: payForm.method }),
    onSuccess: (res) => {
      toast('Payment recorded.', 'success');
      qc.invalidateQueries({ queryKey: ['debtors'] });
      setPayModal(null);
      navigate(`/admin/receipts/${res.data.id}`);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <div>
      <SectionHeader
        title="Debtors"
        description="Students with an outstanding balance"
        action={
          <div className="flex gap-2 flex-wrap">
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">All classes</option>
              {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">All terms</option>
              {terms?.map((t) => <option key={t.id} value={t.id}>{t.year} {t.term}</option>)}
            </select>
            <button className="btn-secondary" disabled={!selected.size || remind.isPending} onClick={() => remind.mutate()}>
              📱 SMS reminder ({selected.size})
            </button>
          </div>
        }
      />

      <div className="card overflow-hidden">
        {isLoading ? (
          <PageLoader />
        ) : !debtors.length ? (
          <EmptyState icon="🎉" title="No outstanding balances" description="Every invoice in this view is fully paid." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Parent</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.invoice_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5">
                      <input type="checkbox" checked={selected.has(d.invoice_id)} onChange={() => toggle(d.invoice_id)} />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{d.class_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{d.parent_name} {d.parent_phone && `· ${d.parent_phone}`}</td>
                    <td className="px-4 py-2.5 font-semibold text-red-600">GHS {Number(d.balance).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        className="text-primary-600 font-medium"
                        onClick={() => { setPayModal(d); setPayForm({ amount: d.balance, method: 'cash' }); }}
                      >
                        Record payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={Boolean(payModal)} onClose={() => setPayModal(null)} title={`Record payment — ${payModal?.full_name}`}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); recordPayment.mutate(); }}>
          <div>
            <label className="label">Amount (GHS)</label>
            <input type="number" step="0.01" className="input" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="momo">MoMo</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>
          </div>
          <button className="btn-primary w-full" disabled={recordPayment.isPending}>{recordPayment.isPending ? 'Saving…' : 'Record & print receipt'}</button>
        </form>
      </Modal>
    </div>
  );
}
