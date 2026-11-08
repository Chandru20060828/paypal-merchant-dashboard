import Product from '../models/Product.js';
import ProductCost from '../models/ProductCost.js';
import BusinessExpense from '../models/BusinessExpense.js';
import Transaction from '../models/Transaction.js';
import { wrap, httpError } from '../utils/wrap.js';
import { parseCsv } from '../services/csv.js';

export const list = wrap(async (req, res) => {
  const uid = req.user._id;
  const [prods, costs, names] = await Promise.all([Product.find({ user: uid }).lean(), ProductCost.find({ user: uid }).lean(), Transaction.distinct('productName', { user: uid })]);
  const all = [...new Set([...names, ...prods.map((p) => p.name), ...costs.map((c) => c.productName)])].sort();
  const byName = Object.fromEntries(costs.map((c) => [c.productName, c]));
  res.json(all.map((name) => ({ name, unitCost: byName[name]?.unitCost ?? 0, shippingCost: byName[name]?.shippingCost ?? 0, hasCost: !!byName[name] })));
});

export const saveCosts = wrap(async (req, res) => {
  const items = Array.isArray(req.body?.costs) ? req.body.costs : [];
  if (!items.length) throw httpError(400, 'No costs supplied.');
  const ops = items.filter((c) => c.productName).map((c) => ({
    updateOne: {
      filter: { user: req.user._id, productName: c.productName },
      update: { $set: { unitCost: Math.max(0, Number(c.unitCost) || 0), shippingCost: Math.max(0, Number(c.shippingCost) || 0), source: 'manual' } },
      upsert: true,
    },
  }));
  await ProductCost.bulkWrite(ops);
  res.json({ saved: ops.length });
});

/** CSV columns: product, unit_cost, shipping_cost (header names are flexible). */
export const importCosts = wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a CSV file.');
  const rows = parseCsv(req.file.buffer), ops = [];
  const pick = (r, keys) => { const k = Object.keys(r).find((c) => keys.some((x) => c.toLowerCase().replace(/[\s_-]/g, '').includes(x))); return k ? r[k] : undefined; };
  for (const r of rows) {
    const name = pick(r, ['product', 'name', 'item']);
    if (!name) continue;
    ops.push({ updateOne: { filter: { user: req.user._id, productName: name }, update: { $set: { unitCost: Math.max(0, parseFloat(pick(r, ['unitcost', 'cost'])) || 0), shippingCost: Math.max(0, parseFloat(pick(r, ['shipping'])) || 0), source: 'csv' } }, upsert: true } });
  }
  if (!ops.length) throw httpError(400, 'No product rows found. Use columns: product, unit_cost, shipping_cost.');
  await ProductCost.bulkWrite(ops);
  res.json({ saved: ops.length });
});

export const listExpenses = wrap(async (req, res) => res.json(await BusinessExpense.find({ user: req.user._id }).sort({ date: -1 }).limit(200).lean()));

export const addExpense = wrap(async (req, res) => {
  const { name, amount, date, category } = req.body || {};
  if (!name || !(Number(amount) >= 0) || !date || Number.isNaN(new Date(date).getTime())) throw httpError(400, 'Name, a valid amount and a date are required.');
  res.status(201).json(await BusinessExpense.create({ user: req.user._id, name, amount: Number(amount), date: new Date(date), category: category || 'Other' }));
});

export const deleteExpense = wrap(async (req, res) => {
  const r = await BusinessExpense.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!r.deletedCount) throw httpError(404, 'Expense not found.');
  res.json({ deleted: true });
});
