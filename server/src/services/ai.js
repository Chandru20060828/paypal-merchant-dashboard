import Transaction from '../models/Transaction.js';
import ProductCost from '../models/ProductCost.js';
import BusinessExpense from '../models/BusinessExpense.js';
import { getBounds } from './context.js';
import { aggregate, buildAnalytics, monthCompare, sod, eod, r2 } from './analytics.js';

const DAY = 864e5;

export async function callLLM(system, messages, maxTokens = 1000) {
  const key = process.env.AI_API_KEY;
  if (!key) throw Object.assign(new Error('AI is not configured. Set AI_API_KEY (and AI_PROVIDER / AI_MODEL) in server/.env, then restart the API.'), { status: 503 });
  const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  const model = process.env.AI_MODEL || 'claude-sonnet-4-6';
  let res, data;
  if (provider === 'anthropic') {
    res = await fetch(process.env.AI_BASE_URL || 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });
    data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'AI request failed'), { status: 502 });
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  }
  res = await fetch(`${process.env.AI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
  });
  data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || 'AI request failed'), { status: 502 });
  return data.choices?.[0]?.message?.content || '';
}

/** Builds the real-data context sent to the model, plus chart datasets built server-side from the same numbers. */
export async function buildContext(userId) {
  const bounds = await getBounds(userId);
  if (!bounds) return null;
  const [txs, costList, expenses] = await Promise.all([
    Transaction.find({ user: userId }).limit(100000).lean(),
    ProductCost.find({ user: userId }).lean(),
    BusinessExpense.find({ user: userId }).lean(),
  ]);
  const costs = Object.fromEntries(costList.map((c) => [c.productName, c]));
  const to = eod(bounds.max), from = sod(new Date(to.getTime() - 29 * DAY));
  const a = buildAnalytics({ txs, costs, expenses, from, to });
  const months = monthCompare(txs, costs, expenses, bounds.max);
  const allTime = aggregate(txs, costs, expenses.reduce((s, e) => s + e.amount, 0));
  const context = {
    note: 'All dates are relative to lastTransactionDate, which is treated as "today". Currency is USD. Profit is an estimate: revenue - product costs - PayPal fees - other expenses.',
    dataset: { firstTransactionDate: bounds.min.toISOString().slice(0, 10), lastTransactionDate: bounds.max.toISOString().slice(0, 10), transactionCount: bounds.count, sources: bounds.sources },
    productCostsEntered: costList.map((c) => ({ product: c.productName, unitCost: c.unitCost, shippingCostPerUnit: c.shippingCost })),
    last30Days: { range: [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)], summary: a.summary, previous30Days: a.previous, changesPercent: a.changes, products: a.products },
    last7DaysVsPrevious7Days: a.weekly,
    calendarMonths: months,
    allTime,
    dailyLast30Days: a.daily.map((d) => ({ date: d.date, revenue: d.revenue, profit: d.profit, refunds: d.refunds })),
  };
  const bar = (title, key, format, label) => ({ type: 'bar', title, format, series: [{ key: 'value', label }], data: a.products.map((p) => ({ name: p.product, value: p[key] })) });
  const m = months;
  const chartSources = {
    products_revenue: bar('Revenue by product (last 30 days)', 'revenue', 'money', 'Revenue'),
    products_profit: bar('Estimated profit by product (last 30 days)', 'profit', 'money', 'Estimated profit'),
    products_margin: bar('Profit margin by product (last 30 days)', 'margin', 'percent', 'Margin %'),
    products_fees: bar('PayPal fees by product (last 30 days)', 'fees', 'money', 'Fees'),
    daily_trend: { type: 'line', title: 'Daily revenue and profit (last 30 days)', format: 'money', series: [{ key: 'revenue', label: 'Revenue' }, { key: 'profit', label: 'Profit' }], data: a.daily.map((d) => ({ name: d.date.slice(5), revenue: d.revenue, profit: d.profit })) },
    weekly_comparison: { type: 'bar', title: 'Revenue: previous 7 days vs last 7 days', format: 'money', series: [{ key: 'previous', label: 'Previous week' }, { key: 'current', label: 'Current week' }], data: a.weekly.products.map((p) => ({ name: p.product, previous: p.previous, current: p.current })) },
    month_comparison: { type: 'bar', title: 'This month so far vs last month (full)', format: 'money', series: [{ key: 'lastMonth', label: 'Last month' }, { key: 'thisMonth', label: 'This month to date' }], data: ['revenue', 'fees', 'profit'].map((k) => ({ name: k[0].toUpperCase() + k.slice(1), lastMonth: m.lastMonthFull[k], thisMonth: m.thisMonthToDate[k] })) },
  };
  return { context, chartSources };
}

const SYSTEM = `You are Merchant Copilot, a business analyst for a small online merchant who sells through PayPal.
You will receive a JSON dataset computed by the backend from the merchant's real transactions. Rules:
- Use ONLY numbers present in the dataset. Never invent or estimate transaction values. You may compute simple differences or percentages from the provided numbers and show them.
- If the dataset does not contain what is needed (e.g. product costs are missing, or the period asked about is outside the data), say exactly what information is missing and how the merchant can add it (CSV upload, Profit Calculator costs, PayPal Sandbox).
- Always call profit "estimated profit". Mention when product costs have not been entered.
- Be concise: lead with the answer, support it with specific numbers, then add 1-3 sentences of explanation or a recommendation. Plain text, no markdown tables.
- Reply with ONLY a JSON object: {"answer": string, "chart": string|null}. "chart" must be one of: products_revenue, products_profit, products_margin, products_fees, daily_trend, weekly_comparison, month_comparison, or null when a chart would not help.`;

export async function chat(userId, message, history = []) {
  const built = await buildContext(userId);
  if (!built) return { answer: 'There is no transaction data yet. Load the demo dataset, upload a PayPal CSV, or sync PayPal Sandbox in Settings, then ask again.', chart: null };
  const prior = history.slice(-6).filter((h) => h && ['user', 'assistant'].includes(h.role) && typeof h.content === 'string').map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }));
  while (prior.length && prior[0].role !== 'user') prior.shift();
  const messages = [...prior, { role: 'user', content: `DATASET:\n${JSON.stringify(built.context)}\n\nQUESTION: ${message}` }];
  const raw = await callLLM(SYSTEM, messages, 1000);
  let answer = raw, key = null;
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    answer = String(parsed.answer ?? raw); key = parsed.chart;
  } catch { /* model replied in plain text */ }
  return { answer, chart: key && built.chartSources[key] ? built.chartSources[key] : null };
}

export async function recommendations(userId) {
  const built = await buildContext(userId);
  if (!built) return null;
  const sys = `You are Merchant Copilot. Using ONLY the numbers in the dataset, write 3-5 prioritized, specific recommendations for this merchant (what to focus on, what to fix, what data to add). Each one: a short bold-free headline, then one or two sentences with supporting numbers. Plain text, one recommendation per paragraph. Never invent numbers. Call profit "estimated profit".`;
  return callLLM(sys, [{ role: 'user', content: JSON.stringify(built.context) }], 900);
}
