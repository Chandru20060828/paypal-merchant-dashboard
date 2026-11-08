import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';

if (!process.env.JWT_SECRET) { console.error('JWT_SECRET is missing. Copy .env.example to .env first.'); process.exit(1); }
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') { err.status = 413; err.message = 'File is larger than 5 MB.'; }
  if (err.code === 11000) { err.status = 409; err.message = 'That record already exists.'; }
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});
const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
