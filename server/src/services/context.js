import Transaction from '../models/Transaction.js';
import ProductCost from '../models/ProductCost.js';
import BusinessExpense from '../models/BusinessExpense.js';
import { sod, eod } from './analytics.js';
const DAY = 864e5;

export async function getBounds(userId) {
  const [b] = await Transaction.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, min: { $min: '$date' }, max: { $max: '$date' }, count: { $sum: 1 }, sources: { $addToSet: '$source' } } },
  ]);
  return b || null;
}

/** "Today" for a merchant is the latest transaction date, so old CSVs still work. */
export function resolveRange(bounds, q = {}) {
  const end = eod(q.to ? new Date(q.to) : bounds.max);
  let start;
  if (q.from) start = sod(new Date(q.from));
  else if (q.days === 'all') start = sod(bounds.min);
  else start = sod(new Date(end.getTime() - ((parseInt(q.days, 10) || 30) - 1) * DAY));
  return { from: start, to: end };
}

export async function loadAll(userId, from, to, { product } = {}) {
  const len = Math.round((to - from) / DAY);
  const since = new Date(Math.min(from.getTime() - len * DAY, sod(to).getTime() - 13 * DAY));
  const filter = { user: userId, date: { $gte: since, $lte: to } };
  if (product) filter.productName = product;
  const [txs, costList, expenses] = await Promise.all([
    Transaction.find(filter).lean(),
    ProductCost.find({ user: userId }).lean(),
    BusinessExpense.find({ user: userId, date: { $gte: since, $lte: to } }).lean(),
  ]);
  return { txs, costs: Object.fromEntries(costList.map((c) => [c.productName, c])), expenses };
}
