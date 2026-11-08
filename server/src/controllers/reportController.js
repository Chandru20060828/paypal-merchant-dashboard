import Transaction from '../models/Transaction.js';
import { wrap, httpError } from '../utils/wrap.js';
import { getBounds, resolveRange, loadAll } from '../services/context.js';
import { buildAnalytics } from '../services/analytics.js';

const TYPES = {
  overall: 'Overall business report', products: 'Product-wise performance report', revenue: 'Revenue report', profit: 'Estimated profit report', refunds: 'Refund report',
};
const col = (key, label) => ({ key, label });

export const report = wrap(async (req, res) => {
  const type = req.params.type;
  if (!TYPES[type]) throw httpError(404, 'Unknown report type.');
  const uid = req.user._id, bounds = await getBounds(uid);
  if (!bounds) throw httpError(404, 'No data yet. Load a dataset first.');
  const { from, to } = resolveRange(bounds, req.query);
  const a = buildAnalytics({ ...(await loadAll(uid, from, to)), from, to });
  const s = a.summary, p = a.previous;
  let columns, rows;
  if (type === 'overall') {
    columns = [col('metric', 'Metric'), col('current', 'This period'), col('previous', 'Previous period'), col('change', 'Change %')];
    const m = [['Gross sales', 'gross'], ['Refunds', 'refunds'], ['Net revenue (after refunds)', 'revenue'], ['PayPal fees', 'fees'], ['Product costs', 'cogs'], ['Other expenses', 'expenses'], ['Estimated profit', 'profit'], ['Profit margin %', 'margin'], ['Refund rate %', 'refundRate'], ['Units sold', 'units'], ['Orders', 'orders']];
    rows = m.map(([label, k]) => ({ metric: label, current: s[k], previous: p[k], change: p[k] ? Math.round(((s[k] - p[k]) / Math.abs(p[k])) * 1000) / 10 : '' }));
  } else if (type === 'products') {
    columns = [col('product', 'Product'), col('units', 'Units sold'), col('revenue', 'Revenue'), col('cost', 'Product cost'), col('fees', 'Payment fees'), col('profit', 'Estimated profit'), col('margin', 'Margin %'), col('refundRate', 'Refund rate %'), col('trend', 'Revenue trend %')];
    rows = a.products.map((x) => ({ ...x, trend: x.trend ?? '' }));
  } else if (type === 'revenue') {
    columns = [col('date', 'Date'), col('gross', 'Gross sales'), col('refunds', 'Refunds'), col('revenue', 'Net revenue')];
    rows = a.daily;
  } else if (type === 'profit') {
    columns = [col('date', 'Date'), col('revenue', 'Revenue'), col('cogs', 'Product costs'), col('fees', 'PayPal fees'), col('expenses', 'Other expenses'), col('profit', 'Estimated profit')];
    rows = a.daily;
  } else {
    columns = [col('date', 'Date'), col('transactionId', 'Transaction ID'), col('productName', 'Product'), col('refundAmount', 'Refund amount')];
    const t = await Transaction.find({ user: uid, refundAmount: { $gt: 0 }, date: { $gte: from, $lte: to } }).sort({ date: -1 }).lean();
    rows = t.map((x) => ({ date: x.date.toISOString().slice(0, 10), transactionId: x.transactionId, productName: x.productName, refundAmount: x.refundAmount }));
  }
  const title = TYPES[type], fromS = from.toISOString().slice(0, 10), toS = to.toISOString().slice(0, 10);
  if (req.query.format === 'csv') {
    const esc = (v) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const csv = [columns.map((c) => esc(c.label)).join(','), ...rows.map((r) => columns.map((c) => esc(r[c.key])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${fromS}_to_${toS}.csv"`);
    return res.send(csv);
  }
  res.json({ type, title, from: fromS, to: toS, columns, rows, note: 'Profit figures are estimates, not accounting profit.' });
});
