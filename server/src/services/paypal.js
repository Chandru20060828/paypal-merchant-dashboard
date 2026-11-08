// PayPal Sandbox only. Credentials stay on the server.
const BASE = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
const r2 = (n) => Math.round(n * 100) / 100;

export const isConfigured = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export async function getToken() {
  if (!isConfigured()) throw Object.assign(new Error('PayPal Sandbox credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in server/.env.'), { status: 503 });
  if (!BASE.includes('sandbox')) throw Object.assign(new Error('Only the PayPal Sandbox base URL is allowed in this app.'), { status: 400 });
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST', headers: { authorization: `Basic ${basic}`, 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`PayPal rejected the sandbox credentials (${data.error_description || res.status}).`), { status: 401 });
  return data.access_token;
}

const LIMIT_MSG = 'Your sandbox app is not allowed to read transactions. In developer.paypal.com open your app, enable "Transaction Search" under Features, and save. Sandbox data can take up to 3 hours to appear. Meanwhile you can use CSV upload or the demo dataset.';

/** Fetches up to `days` days of transactions in 30-day windows (API max is 31). */
export async function fetchTransactions(token, days = 30) {
  const out = [], end = new Date();
  for (let w = 0; w * 30 < days; w++) {
    const wEnd = new Date(end.getTime() - w * 30 * 864e5), wStart = new Date(Math.max(wEnd.getTime() - 30 * 864e5, end.getTime() - days * 864e5));
    for (let page = 1; page <= 20; page++) {
      const url = `${BASE}/v1/reporting/transactions?start_date=${wStart.toISOString().replace(/\.\d+Z$/, '-0000')}&end_date=${wEnd.toISOString().replace(/\.\d+Z$/, '-0000')}&fields=all&page_size=100&page=${page}`;
      const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 || data.name === 'NOT_AUTHORIZED') throw Object.assign(new Error(LIMIT_MSG), { status: 403 });
      if (!res.ok) throw Object.assign(new Error(`PayPal error: ${data.message || res.status}`), { status: 502 });
      out.push(...(data.transaction_details || []));
      if (page >= (data.total_pages || 1)) break;
    }
  }
  return out;
}

export function mapTransaction(d) {
  const info = d.transaction_info || {}, code = info.transaction_event_code || '';
  const amount = parseFloat(info.transaction_amount?.value || '0'), fee = Math.abs(parseFloat(info.fee_amount?.value || '0'));
  const item = d.cart_info?.item_details?.[0];
  const base = {
    transactionId: info.transaction_id, date: new Date(info.transaction_initiation_date),
    productName: item?.item_name || info.transaction_subject || 'Unknown product', quantity: Math.max(1, parseInt(item?.item_quantity || '1', 10)),
    currency: info.transaction_amount?.currency_code || 'USD',
    status: info.transaction_status === 'S' ? 'completed' : info.transaction_status === 'P' ? 'pending' : 'failed',
  };
  if (!base.transactionId || Number.isNaN(base.date.getTime())) return null;
  if (/^T11(06|07)/.test(code) || (amount < 0 && /^T11/.test(code)))
    return { ...base, type: 'refund', gross: 0, fee: 0, refundAmount: Math.abs(amount), net: -Math.abs(amount) };
  if (amount > 0 && /^T00/.test(code))
    return { ...base, type: 'sale', gross: amount, fee, refundAmount: 0, net: r2(amount - fee) };
  return null; // payouts, transfers, etc.
}
