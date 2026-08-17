import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api, apiErrorMessage } from '../../api/client.js';
import { useSettings } from '../../hooks/useSettings.js';
import { Skeleton, SectionHeader, EmptyState, Modal } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import { IconWallet } from '../../components/Icon.jsx';

const COMMON_CATEGORIES = ['Salaries', 'Electricity', 'Water', 'Fuel', 'Transport', 'Repairs & maintenance', 'Stationery', 'Food & kitchen', 'Rent', 'Internet & phone', 'Other'];

function money(settings, n) {
  const cur = settings?.currency || 'GHS';
  return `${cur} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ExpenseModal({ open, onClose, expense }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ category: '', description: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (expense) setForm({ category: expense.category || '', description: expense.description || '', amount: expense.amount || '', expense_date: expense.expense_date?.slice(0, 10) || format(new Date(), 'yyyy-MM-dd') });
    else if (open) setForm({ category: '', description: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
  }, [expense, open]);

  const save = useMutation({
    mutationFn: () => expense ? api.put(`/expenses/${expense.id}`, { ...form, amount: Number(form.amount) }) : api.post('/expenses', { ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['income-statement'] });
      toast(expense ? 'Expense updated.' : 'Expense recorded.', 'success');
      setForm({ category: '', description: '', amount: '', expense_date: format(new Date(), 'yyyy-MM-dd') });
      onClose();
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Edit expense' : 'Record an expense'}>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div>
          <label className="label" htmlFor="e-cat">Category</label>
          <input id="e-cat" className="input" list="expense-categories" value={form.category} onChange={set('category')} placeholder="e.g. Salaries" required autoFocus />
          <datalist id="expense-categories">{COMMON_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="e-amt">Amount</label>
            <input id="e-amt" type="number" min="0" step="0.01" className="input" value={form.amount} onChange={set('amount')} required />
          </div>
          <div>
            <label className="label" htmlFor="e-date">Date</label>
            <input id="e-date" type="date" className="input" value={form.expense_date} onChange={set('expense_date')} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="e-desc">Description <span className="text-slate-400 font-normal">(optional)</span></label>
          <input id="e-desc" className="input" value={form.description} onChange={set('description')} placeholder="What was this for?" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>{save.isPending ? 'Saving…' : expense ? 'Save changes' : 'Record expense'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Expenses() {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const toast = useToast();
  const qc = useQueryClient();
  const { data: settings } = useSettings();

  const { data: statement } = useQuery({ queryKey: ['income-statement'], queryFn: () => api.get('/expenses/income-statement').then((r) => r.data) });
  const { data: list, isLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/expenses').then((r) => r.data) });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['income-statement'] });
      toast('Expense deleted.', 'success');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const net = statement?.net ?? 0;

  return (
    <div>
      <SectionHeader
        title="Expenses & income statement"
        description="Track money going out, and see it against fee income."
        action={<button className="btn-primary" onClick={() => setAddOpen(true)}>Record expense</button>}
      />

      {/* Income statement */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="card p-6">
          <p className="text-[13px] font-medium text-slate-500">Fee income</p>
          <p className="text-[26px] font-bold text-slate-900 tabular-nums mt-1">{money(settings, statement?.income)}</p>
          <p className="text-xs text-slate-400 mt-1">All successful payments</p>
        </div>
        <div className="card p-6">
          <p className="text-[13px] font-medium text-slate-500">Expenses</p>
          <p className="text-[26px] font-bold text-slate-900 tabular-nums mt-1">{money(settings, statement?.expenses)}</p>
          <p className="text-xs text-slate-400 mt-1">Total money out</p>
        </div>
        <div className="card p-6" style={{ background: net >= 0 ? 'var(--color-primary-50)' : '#fef2f2' }}>
          <p className="text-[13px] font-medium text-slate-500">Net</p>
          <p className={`text-[26px] font-bold tabular-nums mt-1 ${net >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{money(settings, net)}</p>
          <p className="text-xs text-slate-400 mt-1">{net >= 0 ? 'Surplus' : 'Deficit'}</p>
        </div>
      </div>

      {/* By category */}
      {statement?.by_category?.length > 0 && (
        <div className="card p-6 mt-6">
          <h2 className="font-bold text-slate-900 mb-4">Where the money went</h2>
          <div className="space-y-3">
            {statement.by_category.map((c) => {
              const pct = statement.expenses ? Math.round((c.total / statement.expenses) * 100) : 0;
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{c.category}</span>
                    <span className="text-slate-800 font-medium tabular-nums">{money(settings, c.total)} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ledger */}
      <div className="card table-card overflow-hidden mt-6">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Expense ledger</h2>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-2/3" />)}</div>
        ) : !list.data.length ? (
          <EmptyState icon={IconWallet} title="No expenses yet" description="Record your first expense to start tracking outgoings." />
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th className="text-right">Amount</th><th></th></tr>
              </thead>
              <tbody>
                {list.data.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap text-slate-500 tabular-nums">{format(new Date(e.expense_date), 'd MMM yyyy')}</td>
                    <td className="font-medium text-slate-800">{e.category}</td>
                    <td className="text-slate-500">{e.description || '—'}</td>
                    <td className="text-right font-medium text-slate-800 tabular-nums whitespace-nowrap">{money(settings, e.amount)}</td>
                    <td className="text-right whitespace-nowrap space-x-3">
                      <button className="text-primary-600 font-medium" onClick={() => setEditing(e)}>Edit</button>
                      <button className="text-red-600 font-medium" onClick={() => remove.mutate(e.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ExpenseModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ExpenseModal open={Boolean(editing)} expense={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
