import { pool } from '../db/pool.js';

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return '233' + digits.slice(1);
  return digits;
}

export async function sendSms(to, message) {
  const recipient = normalizePhone(to);
  const apiKey = process.env.ARKESEL_API_KEY;

  if (!apiKey) {
    console.warn(`[sms] ARKESEL_API_KEY not set — logging without sending: ${recipient}: ${message}`);
    await pool.query(
      'INSERT INTO sms_log (recipient_phone, message, status, provider_ref) VALUES ($1,$2,$3,$4)',
      [recipient, message, 'not_configured', null]
    );
    return { ok: false, reason: 'not_configured' };
  }

  const attempt = async () => {
    const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: process.env.ARKESEL_SENDER_ID || 'SMS',
        message,
        recipients: [recipient],
      }),
    });
    return res.json();
  };

  try {
    let result = await attempt();
    if (result.code !== 'ok') result = await attempt(); // one retry
    const status = result.code === 'ok' ? 'sent' : 'failed';
    await pool.query(
      'INSERT INTO sms_log (recipient_phone, message, status, provider_ref) VALUES ($1,$2,$3,$4)',
      [recipient, message, status, result.data?.id || null]
    );
    return { ok: status === 'sent', result };
  } catch (err) {
    await pool.query(
      'INSERT INTO sms_log (recipient_phone, message, status, provider_ref) VALUES ($1,$2,$3,$4)',
      [recipient, message, 'failed', null]
    );
    return { ok: false, reason: err.message };
  }
}
