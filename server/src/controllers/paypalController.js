import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import DatasetImport from '../models/DatasetImport.js';
import { wrap, httpError } from '../utils/wrap.js';
import * as pp from '../services/paypal.js';

const status = (u) => ({ configured: pp.isConfigured(), environment: 'sandbox', connected: !!u.paypal?.connected, connectedAt: u.paypal?.connectedAt, lastSync: u.paypal?.lastSync, lastError: u.paypal?.lastError });

export const getStatus = wrap(async (req, res) => res.json(status(req.user)));

export const connect = wrap(async (req, res) => {
  try { await pp.getToken(); } catch (e) {
    await User.updateOne({ _id: req.user._id }, { 'paypal.connected': false, 'paypal.lastError': e.message });
    throw e;
  }
  const u = await User.findByIdAndUpdate(req.user._id, { 'paypal.connected': true, 'paypal.connectedAt': new Date(), 'paypal.lastError': null }, { new: true });
  res.json(status(u));
});

export const sync = wrap(async (req, res) => {
  if (!req.user.paypal?.connected) throw httpError(400, 'Connect PayPal Sandbox first.');
  const days = Math.min(90, Math.max(1, parseInt(req.body?.days, 10) || 30));
  let raw;
  try { raw = await pp.fetchTransactions(await pp.getToken(), days); } catch (e) {
    await User.updateOne({ _id: req.user._id }, { 'paypal.lastError': e.message });
    throw e;
  }
  const mapped = raw.map(pp.mapTransaction).filter(Boolean);
  if (!mapped.length) {
    await User.updateOne({ _id: req.user._id }, { 'paypal.lastSync': new Date(), 'paypal.lastError': null });
    return res.json({ imported: 0, message: `PayPal returned ${raw.length} transactions but none were sales or refunds. Create some sandbox payments, wait up to 3 hours, then sync again. You can use the demo dataset meanwhile.` });
  }
  const imp = await DatasetImport.create({ user: req.user._id, source: 'paypal-sandbox', fileName: `PayPal Sandbox (last ${days} days)`, rowCount: raw.length, imported: 0 });
  const r = await Transaction.bulkWrite(mapped.map((t) => ({ updateOne: { filter: { user: req.user._id, transactionId: t.transactionId }, update: { $setOnInsert: { ...t, user: req.user._id, source: 'paypal-sandbox', import: imp._id } }, upsert: true } })), { ordered: false });
  await Product.bulkWrite([...new Set(mapped.map((t) => t.productName))].map((name) => ({ updateOne: { filter: { user: req.user._id, name }, update: { $setOnInsert: { name, user: req.user._id, source: 'paypal-sandbox' } }, upsert: true } })));
  imp.imported = r.upsertedCount; imp.duplicatesSkipped = mapped.length - r.upsertedCount; imp.rowsSkipped = raw.length - mapped.length;
  await imp.save();
  await User.updateOne({ _id: req.user._id }, { 'paypal.lastSync': new Date(), 'paypal.lastError': null });
  res.json({ imported: r.upsertedCount, message: `Imported ${r.upsertedCount} sandbox transactions (${imp.duplicatesSkipped} already present). These are test data.` });
});

export const disconnect = wrap(async (req, res) => {
  const u = await User.findByIdAndUpdate(req.user._id, { 'paypal.connected': false, 'paypal.lastError': null }, { new: true });
  let removed = 0;
  if (req.body?.purge) {
    removed = (await Transaction.deleteMany({ user: req.user._id, source: 'paypal-sandbox' })).deletedCount;
    await DatasetImport.deleteMany({ user: req.user._id, source: 'paypal-sandbox' });
  }
  res.json({ ...status(u), removed });
});
