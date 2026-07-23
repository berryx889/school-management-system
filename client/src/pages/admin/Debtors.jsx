import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiErrorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Skeleton, SectionHeader, EmptyState, Modal, Avatar } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconSmartphone, IconCheckCircle, IconArrowLeft } from '../../components/Icon.jsx';

function QuickPayment({ onOpenPayModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pickedStudent, setPickedStudent] = useState(null);

  const { data: searchResults } = useQuery({
    queryKey: ['student-search', searchTerm],
    queryFn: () => api.get('/students', { params: { search: searchTerm, limit: 5 } }).then((r) => r.data.data),
    enabled: searchTerm.trim().length > 1 && !pickedStudent,
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ['student-invoices', pickedStudent?.id],
    queryFn: () => api.get('/fees/invoices', { params: { student_id: pickedStudent.id } }).then((r) => r.data.invoices),
    enabled: Boolean(pickedStudent),
  });

  function reset() {
    setPickedStudent(null);
    setSearchTerm('');
  }

  return (
    <div className="card p-5 mb-6">
      <h3 className="font-bold text-slate-900 mb-3">Quick payment</h3>

      {!pickedStudent ? (
        <>
          <input
            className="input"
            placeholder="Search student by name or ID…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults?.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-50 border border-slate-100 rounded-xl overflow-hidden">
              {searchResults.map((s) => (
                <li key={s.id}>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => setPickedStudent(s)}
                  >
                    <Avatar name={s.full_name} photoUrl={s.photo_url} size={28} />
                    <span className="font-medium text-slate-800 text-sm">{s.full_name}</span>
                    <span className="text-xs text-slate-400 ml-auto">{s.student_code} · {s.class_name || 'Unassigned'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div>
          <button onClick={reset} className="text-sm text-primary-600 font-medium mb-3 flex items-center gap-1">
            <IconArrowLeft className="h-4 w-4" /> Search another student
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={pickedStudent.full_name} photoUrl={pickedStudent.photo_url} size={36} />
            <div>
              <p className="font-semibold text-slate-800">{pickedStudent.full_name}</p>
              <p className="text-xs text-slate-400">{pickedStudent.student_code} · {pickedStudent.class_name || 'Unassigned'}</p>
            </div>
          </div>

          {loadingInvoices ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : !invoices?.length ? (
            <p className="text-sm text-slate-400">No invoices for this student yet.</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-600">Balance: GHS {inv.balance.toLocaleString()}</span>
                  {inv.balance > 0 ? (
                    <button
                      className="text-primary-600 font-medium"
                      onClick={() => onOpenPayModal({ invoice_id: inv.id, full_name: pickedStudent.full_name, balance: inv.balance })}
                    >
                      Record payment
                    </button>
                  ) : (
                    <span className="text-emerald-600 font-medium">Fully paid</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Debtors() {
  const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data) });
  const { data: terms } = useQuery({ queryKey: ['terms'], queryFn: () => api.get('/terms').then((r) => r.data) });
  const currentTerm = terms?.find((t) => t.is_current);
  const toast = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const [discountModal, setDiscountModal] = useState(null);
  const [discountAmount, setDiscountAmount] = useState('');

  const applyDiscount = useMutation({
    mutationFn: () => api.patch(`/fees/invoices/${discountModal.invoice_id}/discount`, { discount: Number(discountAmount) }),
    onSuccess: () => {
      toast('Discount applied.', 'success');
      qc.invalidateQueries({ queryKey: ['debtors'] });
      setDiscountModal(null);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const recordPayment = useMutation({
    mutationFn: () => api.post('/payments/manual', { invoice_id: payModal.invoice_id, amount: Number(payForm.amount), method: payForm.method }),
    onSuccess: (res) => {
      toast('Payment recorded.', 'success');
      qc.invalidateQueries({ queryKey: ['debtors'] });
      qc.invalidateQueries({ queryKey: ['student-invoices'] });
      setPayModal(null);
      navigate(`/${user.role}/receipts/${res.data.id}`);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  function openPayModal(target) {
    setPayModal(target);
    setPayForm({ amount: target.balance, method: 'cash' });
  }

  function openDiscountModal(target) {
    setDiscountModal(target);
    setDiscountAmount(String(target.discount || 0));
  }

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
              <IconSmartphone className="h-4 w-4" /> SMS reminder ({selected.size})
            </button>
          </div>
        }
      />

      <QuickPayment onOpenPayModal={openPayModal} />

      <div className="card table-card overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : !debtors.length ? (
          <EmptyState icon={IconCheckCircle} title="No outstanding balances" description="Every invoice in this view is fully paid." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Student</th>
                  <th className="hidden sm:table-cell">Class</th>
                  <th className="hidden sm:table-cell">Parent</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.invoice_id}>
                    <td>
                      <input type="checkbox" checked={selected.has(d.invoice_id)} onChange={() => toggle(d.invoice_id)} />
                    </td>
                    <td className="font-medium text-slate-800">{d.full_name}</td>
                    <td className="hidden sm:table-cell text-slate-500">{d.class_name}</td>
                    <td className="hidden sm:table-cell text-slate-500">{d.parent_name} {d.parent_phone && `· ${d.parent_phone}`}</td>
                    <td className="font-semibold text-red-600">
                      GHS {Number(d.balance).toLocaleString()}
                      {d.late_fee > 0 && <span className="text-xs text-amber-600 block font-normal">incl. GHS {Number(d.late_fee).toLocaleString()} late fee</span>}
                      {d.discount > 0 && <span className="text-xs text-slate-400 block font-normal">GHS {Number(d.discount).toLocaleString()} discount applied</span>}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        className="text-slate-500 font-medium mr-3"
                        onClick={() => openDiscountModal({ invoice_id: d.invoice_id, full_name: d.full_name, discount: d.discount })}
                      >
                        Discount
                      </button>
                      <button
                        className="text-primary-600 font-medium"
                        onClick={() => openPayModal({ invoice_id: d.invoice_id, full_name: d.full_name, balance: d.balance })}
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

      <Modal open={Boolean(discountModal)} onClose={() => setDiscountModal(null)} title={`Apply discount — ${discountModal?.full_name}`}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); applyDiscount.mutate(); }}>
          <div>
            <label className="label">Discount (GHS)</label>
            <input type="number" step="0.01" min="0" className="input" required value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={applyDiscount.isPending}>{applyDiscount.isPending ? 'Saving…' : 'Apply discount'}</button>
        </form>
      </Modal>
    </div>
  );
}
