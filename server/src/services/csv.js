import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

export const FIELDS = ['transactionId', 'date', 'type', 'productName', 'quantity', 'grossAmount', 'currency', 'fee', 'netAmount', 'status', 'refundAmount'];
const GUESS = {
  transactionId: ['transaction id', 'transaction_id', 'txn id', 'id'],
  date: ['date', 'transaction date', 'created', 'time'],
  type: ['type', 'transaction type', 'event'],
  productName: ['item title', 'item name', 'product name', 'product', 'item', 'title', 'subject', 'description'],
  quantity: ['quantity', 'qty'],
  grossAmount: ['gross', 'gross amount', 'amount'],
  currency: ['currency'],
  fee: ['fee', 'paypal fee'],
  netAmount: ['net', 'net amount'],
  status: ['status', 'transaction status'],
  refundAmount: ['refund amount', 'refund'],
};

export function parseCsv(buffer) {
  const rows = parse(buffer, { columns: true, skip_empty_lines: true, bom: true, trim: true, relax_column_count: true });
  if (!rows.length) { const e = new Error('The CSV has a header but no rows.'); e.status = 400; throw e; }
  return rows;
}
export const hashBuffer = (b) => crypto.createHash('sha256').update(b).digest('hex');

export function suggestMapping(columns) {
  const low = columns.map((c) => c.toLowerCase()), used = new Set(), mapping = {};
  for (const exact of [true, false])
    for (const f of FIELDS) {
      if (mapping[f]) continue;
      for (const g of GUESS[f]) {
        const i = low.findIndex((c, idx) => !used.has(idx) && (exact ? c === g : g.length > 3 && c.includes(g)));
        if (i >= 0) { mapping[f] = columns[i]; used.add(i); break; }
      }
    }
  return mapping;
}

const num = (v) => { if (v == null || v === '') return 0; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return Number.isNaN(n) ? 0 : n; };
const r2 = (n) => Math.round(n * 100) / 100;

/** Returns { tx } or { skip: reason }. */
export function rowToTransaction(row, m) {
  const get = (f) => (m[f] ? row[m[f]] : undefined);
  const id = String(get('transactionId') ?? '').trim();
  const date = new Date(get('date'));
  if (!id) return { skip: 'missing transaction id' };
  if (Number.isNaN(date.getTime())) return { skip: 'invalid date' };
  const typeText = String(get('type') ?? '');
  if (/withdraw|transfer|payout|bank|conversion|hold|reserve/i.test(typeText)) return { skip: 'non-sale transaction' };
  const isRefund = /refund|reversal|chargeback/i.test(typeText);
  const statusText = String(get('status') ?? 'completed');
  const status = /complete|success|^s$|paid|settled/i.test(statusText) ? 'completed' : /pend|hold|progress|^p$/i.test(statusText) ? 'pending' : 'failed';
  const gross = Math.abs(num(get('grossAmount')));
  const fee = Math.abs(num(get('fee')));
  const qty = Math.max(1, Math.round(num(get('quantity')) || 1));
  const refundCol = Math.abs(num(get('refundAmount')));
  const tx = {
    transactionId: id, date, type: isRefund ? 'refund' : 'sale', productName: String(get('productName') || 'Unknown product').slice(0, 120),
    quantity: qty, currency: String(get('currency') || 'USD').toUpperCase().slice(0, 3), status,
    gross: isRefund ? 0 : gross, fee: isRefund ? 0 : fee,
    refundAmount: isRefund ? refundCol || gross : refundCol,
  };
  tx.net = m.netAmount ? num(get('netAmount')) : r2(isRefund ? -tx.refundAmount : tx.gross - tx.fee - tx.refundAmount);
  return { tx };
}
