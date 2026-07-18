import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useParentChild } from '../../auth/ParentContext.jsx';
import { api, apiErrorMessage } from '../../api/client.js';
import { PageLoader, EmptyState, Badge } from '../../components/ui.jsx';
import { useToast } from '../../components/Toast.jsx';
import ChildSwitcher from './ChildSwitcher.jsx';
import { format } from 'date-fns';

export default function ParentFees() {
  const { selectedChild } = useParentChild();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', selectedChild.id],
    queryFn: () => api.get('/fees/invoices', { params: { student_id: selectedChild.id } }).then((r) => r.data),
  });

  const pay = useMutation({
    mutationFn: (invoice) => api.post('/payments/initiate', { invoice_id: invoice.id, amount: invoice.balance }),
    onSuccess: (res) => {
      window.location.href = res.data.authorization_url;
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <ChildSwitcher />
      <h1 className="text-xl font-bold text-slate-900 mb-5">Fees</h1>

      {!data.invoices.length ? (
        <div className="card"><EmptyState icon="🧾" title="No invoice yet" description="An invoice will appear here once the school generates it." /></div>
      ) : (
        <div className="space-y-4">
          {data.invoices.map((inv) => (
            <div key={inv.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-800">Term invoice</p>
                <Badge tone={inv.balance <= 0 ? 'green' : 'amber'}>{inv.balance <= 0 ? 'Fully paid' : 'Balance due'}</Badge>
              </div>
              <div className="space-y-1.5 text-sm mb-4">
                {data.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-slate-500">
                    <span>{item.item_name}</span>
                    <span>GHS {Number(item.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between text-sm mb-1">
                <span className="text-slate-500">Total due</span>
                <span className="font-medium">GHS {Number(inv.total_due).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium text-emerald-600">GHS {Number(inv.paid).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 mb-4">
                <span>Balance</span>
                <span>GHS {Number(inv.balance).toLocaleString()}</span>
              </div>
              {inv.balance > 0 && (
                <button className="btn-primary w-full" onClick={() => pay.mutate(inv)} disabled={pay.isPending}>
                  {pay.isPending ? 'Redirecting…' : 'Pay now'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="font-bold text-slate-900 mt-8 mb-3">Payment history</h2>
      <PaymentHistory studentId={selectedChild.id} />
    </div>
  );
}

function PaymentHistory({ studentId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payments-history', studentId],
    queryFn: () => api.get('/payments', { params: { student_id: studentId } }).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;
  if (!data.length) return <div className="card"><EmptyState icon="💳" title="No payments yet" /></div>;

  return (
    <div className="card divide-y divide-slate-50">
      {data.map((p) => (
        <Link key={p.id} to={`/parent/receipts/${p.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50/60">
          <div>
            <p className="font-medium text-slate-800">GHS {Number(p.amount).toLocaleString()}</p>
            <p className="text-xs text-slate-400 capitalize">{p.method} · {format(new Date(p.paid_at), 'd MMM yyyy')}</p>
          </div>
          <span className="text-primary-600 text-sm font-medium">Receipt →</span>
        </Link>
      ))}
    </div>
  );
}
