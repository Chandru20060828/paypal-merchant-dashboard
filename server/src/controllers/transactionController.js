import Transaction from '../models/Transaction.js';
import { wrap } from '../utils/wrap.js';
import { getBounds, resolveRange } from '../services/context.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = ['date', 'productName', 'gross', 'fee', 'net', 'status'];

export const list = wrap(async (req, res) => {
  const { q, status, type, product, days, from, to, page = 1, limit = 15, sort = 'date', dir = 'desc' } = req.query;
  const filter = { user: req.user._id };
  if (q) filter.$or = [{ productName: new RegExp(esc(q), 'i') }, { transactionId: new RegExp(esc(q), 'i') }];
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (product) filter.productName = product;
  if (days || from || to) {
    const b = await getBounds(req.user._id);
    if (b) { const r = resolveRange(b, { days, from, to }); filter.date = { $gte: r.from, $lte: r.to }; }
  }
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 15)), pg = Math.max(1, parseInt(page, 10) || 1);
  const sortKey = SORTS.includes(sort) ? sort : 'date';
  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ [sortKey]: dir === 'asc' ? 1 : -1 }).skip((pg - 1) * lim).limit(lim).lean(),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page: pg, pages: Math.max(1, Math.ceil(total / lim)) });
});
