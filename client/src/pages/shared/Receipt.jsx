import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '../../api/client.js';
import { PageLoader } from '../../components/ui.jsx';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function amountInWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero';
  function chunk(n) {
    if (n < 10) return ONES[n];
    if (n < 20) return TEENS[n - 10];
    if (n < 100) return `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
    return `${ONES[Math.floor(n / 100)]} Hundred ${chunk(n % 100)}`.trim();
  }
  const thousands = Math.floor(num / 1000);
  const rest = num % 1000;
  let words = thousands ? `${chunk(thousands)} Thousand ${rest ? chunk(rest) : ''}` : chunk(rest);
  return words.trim() + ' Ghana Cedis';
}

export default function Receipt() {
  const { paymentId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['receipt', paymentId],
    queryFn: () => api.get(`/receipts/${paymentId}`).then((r) => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div>
      <div className="no-print flex justify-end mb-4">
        <button className="btn-primary" onClick={() => window.print()}>🖨 Print</button>
      </div>

      <div className="bg-white p-8 max-w-xl mx-auto border border-slate-100 rounded-card">
        <div className="text-center border-b-2 border-primary-500 pb-3 mb-4">
          <h1 className="text-lg font-bold text-slate-900">{data.school_name}</h1>
          <p className="text-xs text-slate-500">{data.address} · {data.phone}</p>
          <p className="font-semibold text-sm mt-2 tracking-wide">PAYMENT RECEIPT</p>
        </div>

        <div className="flex justify-between text-sm mb-4">
          <span className="text-slate-500">Receipt No.</span>
          <span className="font-mono font-semibold">{data.receipt_no}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Date</span>
          <span>{format(new Date(data.paid_at), 'd MMM yyyy, h:mm a')}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Student</span>
          <span>{data.student_name}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Class</span>
          <span>{data.class_name}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-slate-500">Term</span>
          <span>{data.year} {data.term}</span>
        </div>

        <div className="border-t border-dashed border-slate-200 pt-4 mb-4">
          <div className="flex justify-between text-lg font-bold text-slate-900">
            <span>Amount paid</span>
            <span>GHS {Number(data.amount).toLocaleString()}</span>
          </div>
          <p className="text-xs text-slate-400 italic mt-1">{amountInWords(Number(data.amount))} only</p>
          <p className="text-xs text-slate-500 mt-1 capitalize">via {data.method}</p>
        </div>

        <div className="flex justify-between text-sm font-semibold border-t border-slate-100 pt-3">
          <span>Balance remaining</span>
          <span className={data.balance_remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}>
            GHS {Number(data.balance_remaining).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
