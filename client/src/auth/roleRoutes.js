export function dashboardPath(role) {
  return role === 'super_admin' ? '/super-admin' : role ? `/${role}` : '/';
}

export function receiptPath(role, paymentId) {
  const portal = role === 'super_admin' ? 'admin' : role;
  return `/${portal}/receipts/${encodeURIComponent(paymentId)}`;
}
