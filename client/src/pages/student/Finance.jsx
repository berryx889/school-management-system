import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext.jsx";
import { api, apiErrorMessage } from "../../api/client.js";
import { PageLoader, EmptyState, SectionHeader } from "../../components/ui.jsx";
const money = (value) =>
  `GHS ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
export default function Finance() {
  const { user } = useAuth();
  const invoices = useQuery({
    queryKey: ["invoices", user.studentId],
    queryFn: () =>
      api
        .get("/fees/invoices", { params: { student_id: user.studentId } })
        .then((r) => r.data),
    enabled: Boolean(user.studentId),
  });
  const payments = useQuery({
    queryKey: ["payments-history", user.studentId],
    queryFn: () =>
      api
        .get("/payments", { params: { student_id: user.studentId } })
        .then((r) => r.data),
    enabled: Boolean(user.studentId),
  });
  if (invoices.isLoading || payments.isLoading) return <PageLoader />;
  if (invoices.isError || payments.isError)
    return (
      <div role="alert">
        <p>{apiErrorMessage(invoices.error || payments.error)}</p>
        <button
          className="btn-secondary"
          onClick={() => {
            invoices.refetch();
            payments.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Finance"
        description="View your invoices, payments, and printable receipts. Your parent or guardian can pay online from their portal, or contact the school accounts office."
      />
      {!invoices.data?.invoices?.length ? (
        <EmptyState title="No invoices yet" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {invoices.data.invoices.map((inv) => (
            <article className="card p-5 space-y-2" key={inv.id}>
              <h2 className="font-bold">Invoice #{inv.id}</h2>
              {inv.due_date && (
                <p className="text-sm text-slate-500">
                  Due {new Date(inv.due_date).toLocaleDateString()}
                </p>
              )}
              <p>Total: {money(inv.total_due)}</p>
              <p>Paid: {money(inv.paid)}</p>
              <p className="font-bold text-primary-700">
                Balance: {money(inv.balance)}
              </p>
            </article>
          ))}
        </div>
      )}
      <h2 className="text-lg font-bold">Payment history</h2>
      {!payments.data?.length ? (
        <EmptyState title="No payments recorded yet" />
      ) : (
        <div className="card divide-y">
          {payments.data.map((p) => (
            <Link
              key={p.id}
              to={`/student/receipts/${p.id}`}
              className="p-4 flex justify-between gap-3"
            >
              <span>
                {money(p.amount)}
                <small className="block text-slate-500">
                  {new Date(p.paid_at).toLocaleDateString()} · {p.method}
                </small>
              </span>
              <span className="text-primary-700">View receipt →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
