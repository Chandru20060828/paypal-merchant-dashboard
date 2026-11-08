import { wrap, httpError } from '../utils/wrap.js';
import * as ai from '../services/ai.js';
import { getBounds, resolveRange, loadAll } from '../services/context.js';

export const chat = wrap(async (req, res) => {
  const { message, history } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 1000) throw httpError(400, 'Ask a question (up to 1000 characters).');
  res.json(await ai.chat(req.user._id, message.trim(), history));
});

export const insights = wrap(async (req, res) => {
  const text = await ai.recommendations(req.user._id);
  if (!text) throw httpError(404, 'No data yet. Load a dataset first.');
  res.json({ recommendations: text });
});
