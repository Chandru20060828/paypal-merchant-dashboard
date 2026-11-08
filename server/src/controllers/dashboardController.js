import { wrap } from '../utils/wrap.js';
import { getBounds, resolveRange, loadAll } from '../services/context.js';
import { buildAnalytics, buildInsights } from '../services/analytics.js';

export const getDashboard = wrap(async (req, res) => {
  const uid = req.user._id, bounds = await getBounds(uid);
  if (!bounds) return res.json({ empty: true });
  const { from, to } = resolveRange(bounds, req.query);
  const a = buildAnalytics({ ...(await loadAll(uid, from, to)), from, to });
  res.json({ empty: false, bounds: { min: bounds.min, max: bounds.max, count: bounds.count }, sources: bounds.sources, ...a, insights: buildInsights(a) });
});
