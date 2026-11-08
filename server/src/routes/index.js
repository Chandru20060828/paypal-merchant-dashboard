import { Router } from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import * as A from '../controllers/authController.js';
import * as D from '../controllers/dashboardController.js';
import * as T from '../controllers/transactionController.js';
import * as P from '../controllers/productController.js';
import * as AN from '../controllers/analyticsController.js';
import * as AI from '../controllers/aiController.js';
import * as R from '../controllers/reportController.js';
import * as PP from '../controllers/paypalController.js';
import * as I from '../controllers/importController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const r = Router();

r.post('/auth/register', A.register);
r.post('/auth/login', A.login);
r.get('/auth/me', auth, A.me);

r.get('/dashboard', auth, D.getDashboard);
r.get('/transactions', auth, T.list);

r.get('/products', auth, P.list);
r.put('/products/costs', auth, P.saveCosts);
r.post('/products/costs/import', auth, upload.single('file'), P.importCosts);
r.get('/products/expenses', auth, P.listExpenses);
r.post('/products/expenses', auth, P.addExpense);
r.delete('/products/expenses/:id', auth, P.deleteExpense);

r.get('/analytics/product/:name', auth, AN.product);
r.post('/ai/chat', auth, AI.chat);
r.post('/ai/insights', auth, AI.insights);
r.get('/reports/:type', auth, R.report);

r.get('/paypal/status', auth, PP.getStatus);
r.post('/paypal/connect', auth, PP.connect);
r.post('/paypal/sync', auth, PP.sync);
r.post('/paypal/disconnect', auth, PP.disconnect);

r.post('/import/preview', auth, upload.single('file'), I.preview);
r.post('/import/commit', auth, upload.single('file'), I.commit);
r.get('/import/history', auth, I.history);
r.delete('/import/history/:id', auth, I.removeImport);
r.post('/import/demo', auth, I.loadDemo);
r.delete('/import/demo', auth, I.removeDemo);

export default r;
