import Transaction from '../models/Transaction.js';
import Product from '../models/Product.js';
import ProductCost from '../models/ProductCost.js';
import BusinessExpense from '../models/BusinessExpense.js';
import DatasetImport from '../models/DatasetImport.js';
import { wrap, httpError } from '../utils/wrap.js';
import { parseCsv, hashBuffer, suggestMapping, rowToTransaction } from '../services/csv.js';
import { generateDemo } from '../services/demoData.js';

export const preview = wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a CSV file to upload.');
  if (!/\.csv$/i.test(req.file.originalname) && !/csv|text\/plain|excel/.test(req.file.mimetype)) throw httpError(400, 'Only .csv files are supported.');
  let rows;
  try { rows = parseCsv(req.file.buffer); } catch (e) { throw httpError(e.status || 400, e.status ? e.message : `Could not read this CSV: ${e.message}`); }
  if (rows.length > 50000) throw httpError(400, 'Too many rows (limit 50,000).');
  const columns = Object.keys(rows[0]), hash = hashBuffer(req.file.buffer);
  const dup = await DatasetImport.findOne({ user: req.user._id, fileHash: hash }).lean();
  res.json({ fileName: req.file.originalname, columns, preview: rows.slice(0, 8), totalRows: rows.length, mapping: suggestMapping(columns), duplicate: !!dup, duplicateOf: dup?.createdAt });
});

export const commit = wrap(async (req, res) => {
  if (!req.file) throw httpError(400, 'Choose a CSV file to upload.');
  let mapping;
  try { mapping = JSON.parse(req.body.mapping || '{}'); } catch { throw httpError(400, 'Invalid column mapping.'); }
  for (const f of ['transactionId', 'date', 'grossAmount']) if (!mapping[f]) throw httpError(400, `Map a column to "${f}" before importing.`);
  const rows = parseCsv(req.file.buffer), hash = hashBuffer(req.file.buffer);
  if (await DatasetImport.findOne({ user: req.user._id, fileHash: hash })) throw httpError(409, 'This exact file was already imported. Delete that import first if you want to import it again.');
  const txs = [], skipped = {};
  const seen = new Set();
  for (const row of rows) {
    const r = rowToTransaction(row, mapping);
    if (r.skip) { skipped[r.skip] = (skipped[r.skip] || 0) + 1; continue; }
    if (seen.has(r.tx.transactionId)) { skipped['repeated id in file'] = (skipped['repeated id in file'] || 0) + 1; continue; }
    seen.add(r.tx.transactionId); txs.push(r.tx);
  }
  if (!txs.length) throw httpError(400, `No valid rows to import. Skipped: ${JSON.stringify(skipped)}`);
  const imp = await DatasetImport.create({ user: req.user._id, source: 'csv', fileName: req.file.originalname, fileHash: hash, rowCount: rows.length, imported: 0, mapping });
  let r;
  try {
    r = await Transaction.bulkWrite(txs.map((t) => ({ updateOne: { filter: { user: req.user._id, transactionId: t.transactionId }, update: { $setOnInsert: { ...t, user: req.user._id, source: 'csv', import: imp._id } }, upsert: true } })), { ordered: false });
  } catch (e) { await imp.deleteOne(); throw e; }
  await Product.bulkWrite([...new Set(txs.map((t) => t.productName))].map((name) => ({ updateOne: { filter: { user: req.user._id, name }, update: { $setOnInsert: { name, user: req.user._id, source: 'csv' } }, upsert: true } })));
  const dupes = txs.length - r.upsertedCount, skippedCount = rows.length - txs.length;
  Object.assign(imp, { imported: r.upsertedCount, duplicatesSkipped: dupes, rowsSkipped: skippedCount });
  await imp.save();
  res.status(201).json({ imported: r.upsertedCount, duplicatesSkipped: dupes, rowsSkipped: skippedCount, skippedReasons: skipped });
});

export const history = wrap(async (req, res) => res.json(await DatasetImport.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean()));

export const removeImport = wrap(async (req, res) => {
  const imp = await DatasetImport.findOne({ _id: req.params.id, user: req.user._id });
  if (!imp) throw httpError(404, 'Import not found.');
  const r = await Transaction.deleteMany({ user: req.user._id, import: imp._id });
  await imp.deleteOne();
  res.json({ removed: r.deletedCount });
});

export const loadDemo = wrap(async (req, res) => {
  await clearDemoData(req.user._id);
  const { txs, expenses, costs } = generateDemo();
  const uid = req.user._id;
  const imp = await DatasetImport.create({ user: uid, source: 'demo', fileName: 'Demo dataset (synthetic)', rowCount: txs.length, imported: txs.length });
  await Transaction.insertMany(txs.map((t) => ({ ...t, user: uid, source: 'demo', import: imp._id })), { ordered: false }).catch((e) => { if (e.code !== 11000) throw e; });
  await BusinessExpense.insertMany(expenses.map((e) => ({ ...e, user: uid, source: 'demo' })));
  await Product.bulkWrite(costs.map((c) => ({ updateOne: { filter: { user: uid, name: c.productName }, update: { $setOnInsert: { user: uid, name: c.productName, source: 'demo' } }, upsert: true } })));
  await ProductCost.bulkWrite(costs.map((c) => ({ updateOne: { filter: { user: uid, productName: c.productName }, update: { $setOnInsert: { ...c, user: uid, source: 'demo' } }, upsert: true } })));
  res.status(201).json({ imported: txs.length });
});

async function clearDemoData(uid) {
  await Promise.all([
    Transaction.deleteMany({ user: uid, source: 'demo' }), BusinessExpense.deleteMany({ user: uid, source: 'demo' }),
    ProductCost.deleteMany({ user: uid, source: 'demo' }), Product.deleteMany({ user: uid, source: 'demo' }),
    DatasetImport.deleteMany({ user: uid, source: 'demo' }),
  ]);
}
export const removeDemo = wrap(async (req, res) => { await clearDemoData(req.user._id); res.json({ removed: true }); });
