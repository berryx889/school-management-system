import crypto from 'crypto';

export const paystackConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

export async function initializeTransaction({ email, amountPesewas, reference, metadata }) {
  if (!paystackConfigured()) {
    return { configured: false };
  }
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountPesewas, reference, metadata }),
  });
  const data = await res.json();
  return { configured: true, ...data };
}

export async function verifyTransaction(reference) {
  if (!paystackConfigured()) return { configured: false };
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  return { configured: true, ...data };
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!paystackConfigured()) return false;
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signatureHeader;
}
