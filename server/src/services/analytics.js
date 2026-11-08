// Pure analytics functions: no DB access, easy to test.
const DAY = 864e5;
export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
export const sod = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
export const eod = (d) => { const x = new Date(d); x.setUTCHours(23, 59, 59, 999); return x; };
const pct = (c, p) => (p ? r2(((c - p) / Math.abs(p)) * 100) : c ? null : 0); // null = no baseline
const sumBy = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const unit = (costs, name) => { const c = costs[name]; return c ? (c.unitCost || 0) + (c.shippingCost || 0) : 0; };
const isSale = (t) => t.type === 'sale' && t.status === 'completed';
const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Estimated Profit = revenue (gross - refunds) - product costs - PayPal fees - other expenses */
export function aggregate(txs, costs, expenses = 0) {
  let gross = 0, refunds = 0, fees = 0, cogs = 0, units = 0, orders = 0;
  for (const t of txs) {
    if (isSale(t)) {
      gross += t.gross; fees += t.fee || 0; units += t.quantity || 1; orders++;
      cogs += (t.quantity || 1) * unit(costs, t.productName);
    }
    refunds += t.refundAmount || 0;
  }
  const revenue = gross - refunds, net = revenue - fees, profit = net - cogs - expenses;
  return {
    gross: r2(gross), refunds: r2(refunds), revenue: r2(revenue), fees: r2(fees), net: r2(net),
    cogs: r2(cogs), expenses: r2(expenses), profit: r2(profit),
    margin: revenue > 0 ? r2((profit / revenue) * 100) : 0,
    refundRate: gross > 0 ? r2((refunds / gross) * 100) : 0, units, orders,
  };
}

const within = (arr, a, b) => arr.filter((x) => x.date >= a && x.date <= b);

export function buildAnalytics({ txs, costs, expenses, from, to }) {
  const len = Math.round((to - from) / DAY);
  const pFrom = new Date(from.getTime() - len * DAY), pTo = new Date(from.getTime() - 1);
  const cur = within(txs, from, to), prev = within(txs, pFrom, pTo);
  const curE = within(expenses, from, to), prevE = within(expenses, pFrom, pTo);
  const summary = aggregate(cur, costs, sumBy(curE, (e) => e.amount));
  const previous = aggregate(prev, costs, sumBy(prevE, (e) => e.amount));
  const changes = Object.fromEntries(['gross', 'revenue', 'net', 'profit', 'fees', 'refunds', 'units'].map((k) => [k, pct(summary[k], previous[k])]));
  changes.refundRate = r2(summary.refundRate - previous.refundRate); // percentage points

  const names = [...new Set([...cur, ...prev].map((t) => t.productName))];
  const products = names.map((name) => {
    const a = aggregate(cur.filter((t) => t.productName === name), costs);
    const p = aggregate(prev.filter((t) => t.productName === name), costs);
    return {
      product: name, units: a.units, orders: a.orders, gross: a.gross, refunds: a.refunds, revenue: a.revenue,
      cost: a.cogs, fees: a.fees, profit: a.profit, margin: a.margin, refundRate: a.refundRate,
      prevRevenue: p.revenue, prevRefundRate: p.refundRate, trend: pct(a.revenue, p.revenue),
      share: summary.revenue > 0 ? r2((a.revenue / summary.revenue) * 100) : 0,
    };
  }).filter((p) => p.units || p.refunds || p.prevRevenue).sort((a, b) => b.revenue - a.revenue);

  const days = {};
  for (let t = sod(from).getTime(); t <= to.getTime(); t += DAY) days[dayKey(t)] = { date: dayKey(t), gross: 0, refunds: 0, fees: 0, cogs: 0, expenses: 0 };
  for (const t of cur) {
    const d = days[dayKey(t.date)]; if (!d) continue;
    if (isSale(t)) { d.gross += t.gross; d.fees += t.fee || 0; d.cogs += (t.quantity || 1) * unit(costs, t.productName); }
    d.refunds += t.refundAmount || 0;
  }
  for (const e of curE) { const d = days[dayKey(e.date)]; if (d) d.expenses += e.amount; }
  const daily = Object.values(days).map((d) => {
    const revenue = d.gross - d.refunds;
    const row = { ...d, revenue, profit: revenue - d.fees - d.cogs - d.expenses };
    return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, k === 'date' ? v : r2(v)]));
  });

  const cF = sod(new Date(to.getTime() - 6 * DAY)), pF = new Date(cF.getTime() - 7 * DAY), pT = new Date(cF.getTime() - 1);
  const wc = within(txs, cF, to), wp = within(txs, pF, pT);
  const wn = [...new Set([...wc, ...wp].map((t) => t.productName))];
  const weekly = {
    current: aggregate(wc, costs), previous: aggregate(wp, costs),
    rangeCurrent: { from: dayKey(cF), to: dayKey(to) }, rangePrevious: { from: dayKey(pF), to: dayKey(pT) },
    products: wn.map((n) => ({
      product: n,
      current: aggregate(wc.filter((t) => t.productName === n), costs).revenue,
      previous: aggregate(wp.filter((t) => t.productName === n), costs).revenue,
    })),
  };
  return { range: { from, to }, summary, previous, changes, products, daily, weekly };
}

export function monthCompare(txs, costs, expenses, anchor) {
  const a = new Date(anchor);
  const ms = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1));
  const ps = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1));
  const pe = new Date(ms.getTime() - 1);
  const samePeriodEnd = new Date(Math.min(pe.getTime(), ps.getTime() + (eod(a) - ms)));
  const mk = (f, t) => aggregate(within(txs, f, t), costs, sumBy(within(expenses, f, t), (e) => e.amount));
  return {
    thisMonthToDate: { from: dayKey(ms), to: dayKey(a), ...mk(ms, eod(a)) },
    lastMonthFull: { from: dayKey(ps), to: dayKey(pe), ...mk(ps, pe) },
    lastMonthSameDays: { from: dayKey(ps), to: dayKey(samePeriodEnd), ...mk(ps, samePeriodEnd) },
  };
}

/** Rule-based insights computed from the data (nothing hardcoded). */
export function buildInsights(a) {
  const out = [], { summary: s, previous: p, changes: c, products: ps } = a;
  if (p.revenue > 0 && c.revenue !== null)
    out.push({ type: c.revenue >= 0 ? 'positive' : 'negative', text: `Net sales ${c.revenue >= 0 ? 'increased' : 'decreased'} by ${Math.abs(c.revenue)}% versus the previous period (${money(s.revenue)} vs ${money(p.revenue)}).` });
  else if (s.revenue > 0) out.push({ type: 'info', text: `Revenue for this period is ${money(s.revenue)}. There is no earlier data to compare against.` });
  const sold = ps.filter((x) => x.revenue > 0);
  if (sold.length) {
    const best = [...sold].sort((x, y) => y.margin - x.margin)[0];
    out.push({ type: 'positive', text: `${best.product} has the highest profit margin at ${best.margin}% (estimated profit ${money(best.profit)}).` });
    const worst = [...sold].sort((x, y) => x.margin - y.margin)[0];
    if (worst.product !== best.product && worst.margin < 20) out.push({ type: 'negative', text: `${worst.product} has the thinnest margin (${worst.margin}%). Review its cost or price.` });
    out.push({ type: 'info', text: `${sold[0].product} is your top seller with ${sold[0].share}% of revenue.` });
  }
  const dec = ps.filter((x) => x.trend !== null && x.prevRevenue > 0 && x.trend <= -5).sort((x, y) => x.trend - y.trend)[0];
  if (dec) out.push({ type: 'negative', text: `${dec.product} revenue fell ${Math.abs(dec.trend)}% compared with the previous period (${money(dec.revenue)} vs ${money(dec.prevRevenue)}).` });
  const ref = ps.filter((x) => x.refundRate - x.prevRefundRate >= 2).sort((x, y) => (y.refundRate - y.prevRefundRate) - (x.refundRate - x.prevRefundRate))[0];
  if (ref) out.push({ type: 'negative', text: `Refunds increased for ${ref.product}: ${ref.refundRate}% of its sales, up from ${ref.prevRefundRate}%.` });
  if (s.gross > 0) out.push({ type: 'info', text: `PayPal fees were ${money(s.fees)}, or ${r2((s.fees / s.gross) * 100)}% of gross sales.` });
  if (s.gross > 0 && s.cogs === 0) out.push({ type: 'info', text: 'No product costs have been entered, so estimated profit excludes product costs. Add them in Profit Calculator.' });
  return out;
}
