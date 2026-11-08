import ProductCost from '../models/ProductCost.js';
import { wrap, httpError } from '../utils/wrap.js';
import { getBounds, resolveRange, loadAll } from '../services/context.js';
import { buildAnalytics } from '../services/analytics.js';

export const product = wrap(async (req, res) => {
  const uid = req.user._id, name = req.params.name, bounds = await getBounds(uid);
  if (!bounds) throw httpError(404, 'No data yet.');
  const { from, to } = resolveRange(bounds, req.query);
  const data = await loadAll(uid, from, to, { product: name });
  const a = buildAnalytics({ ...data, expenses: [], from, to }); // shared expenses are not attributable to one product
  const cost = await ProductCost.findOne({ user: uid, productName: name }).lean();
  res.json({ name, range: a.range, summary: a.summary, previous: a.previous, changes: a.changes, daily: a.daily, weekly: a.weekly, unitCost: cost?.unitCost ?? 0, shippingCost: cost?.shippingCost ?? 0, hasCost: !!cost });
});
