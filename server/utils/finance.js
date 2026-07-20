import { pool } from '../db/pool.js';

// Single source of truth for an invoice's balance — replaces the same calculation that used
// to be duplicated across fees.js, payments.js, and receipts.js. Late fees are computed on
// read, never stored: once `due_date` + `late_fee_grace_days` has passed, `late_fee_percent`%
// of the outstanding (post-discount) balance is added on top.
export async function getInvoiceBalance(invoice, settings) {
  const paidRes = await pool.query(
    "SELECT COALESCE(SUM(amount),0) AS paid FROM payments WHERE invoice_id=$1 AND status='success'",
    [invoice.id]
  );
  const paid = Number(paidRes.rows[0].paid);
  const discount = Number(invoice.discount || 0);
  const netDue = Number(invoice.total_due) - discount;
  const preLateBalance = netDue - paid;

  let lateFee = 0;
  if (invoice.due_date && preLateBalance > 0 && Number(settings.late_fee_percent) > 0) {
    const cutoff = new Date(invoice.due_date);
    cutoff.setDate(cutoff.getDate() + Number(settings.late_fee_grace_days || 0));
    if (new Date() > cutoff) {
      lateFee = Math.round(preLateBalance * (Number(settings.late_fee_percent) / 100) * 100) / 100;
    }
  }

  return { paid, discount, late_fee: lateFee, balance: preLateBalance + lateFee };
}
