# PayPal Merchant Copilot

An AI-powered analytics dashboard for small online merchants. Upload a PayPal CSV report, sync PayPal Sandbox test data, or load the built-in demo dataset, then see sales, fees, refunds and **estimated profit** per product and ask an AI assistant questions about your numbers.

> PayPal-inspired theme only. This is **not** an official PayPal product. Profit figures are estimates, not accounting profit.

**Stack:** React + Vite + Tailwind + Recharts + Lucide + Axios · Node + Express + MongoDB (Mongoose) + JWT + Multer + csv-parse · AI via backend (Anthropic or any OpenAI-compatible API) · PayPal REST (Sandbox).

## 1. Prerequisites
- Node.js 18.17+ (uses built-in `fetch`)
- MongoDB running locally, or a free MongoDB Atlas cluster

## 2. Install
```bash
npm run install:all          # root + server + client
cp server/.env.example server/.env
```
Edit `server/.env` (see below), then:
```bash
npm run dev                  # API on :5000, web app on :5173
```
Open http://localhost:5173, create an account, then **Overview → Load demo dataset**.

Or run separately: `cd server && npm run dev` and `cd client && npm run dev`.
Production build of the UI: `npm run build` (output in `client/dist`).

## 3. Configure

### MongoDB
- Local: `MONGODB_URI=mongodb://127.0.0.1:27017/merchant-copilot`
- Atlas: create a cluster, add your IP to the allow list, create a database user, and paste the `mongodb+srv://...` connection string.

Set `JWT_SECRET` to a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

### AI assistant
```
AI_PROVIDER=anthropic        # or openai
AI_API_KEY=your-key
AI_MODEL=claude-sonnet-4-6   # any model your provider offers
# AI_BASE_URL=...            # optional: OpenAI-compatible endpoints (e.g. a local gateway)
```
Keys stay on the server. For every question the backend computes the figures from your MongoDB data, sends only that summary to the model, and instructs it to use only those numbers. Charts in answers are built by the backend from the same numbers (the model only picks which chart). Without a key, the dashboard and rule-based insights still work and the assistant explains that AI is not configured.

### PayPal Sandbox
1. Go to https://developer.paypal.com → Apps & Credentials → **Sandbox** → Create App.
2. Copy the Client ID and Secret into `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.
3. Open the app → Features → enable **Transaction Search** and save. (Without this PayPal returns a permissions error; the app shows it and you can keep using CSV or demo data.)
4. Make some test payments with your sandbox accounts. Transaction Search data can take up to ~3 hours to appear.
5. In the app: **Settings → PayPal Sandbox → Connect Sandbox → Sync**.

Only the sandbox base URL is accepted. Sandbox transactions are labelled "Sandbox test" everywhere.

## 4. Using CSV import
Settings → *Upload PayPal CSV report*: drop a file, check the detected column mapping, review the preview, import. A sample file is in `server/sample/paypal-sample.csv`.
- Required mapping: Transaction ID, Date, Gross amount.
- Rows whose type looks like a refund become refunds; withdrawals/transfers are skipped.
- Duplicates are prevented two ways: the same file (SHA-256) can't be imported twice, and a transaction ID can't be stored twice per merchant.
- Product costs are not in PayPal reports: enter them on **Profit Calculator**, or import a CSV with columns `product, unit_cost, shipping_cost`.

## 5. How numbers are calculated
- Gross Sales = completed sales · Revenue = Gross − Refunds · Net Revenue = Revenue − PayPal fees
- **Estimated Profit = Revenue − Product costs (qty × (unit + shipping)) − PayPal fees − Other expenses**
- Refund Rate = Refunds ÷ Gross. "Previous period" = the same number of days immediately before the selected range.
- "Today" is the date of the latest transaction, so older CSV exports still make sense.

## 6. Project layout
```
server/src
  index.js            app bootstrap, error handler
  routes/index.js     /api/auth /dashboard /transactions /products /analytics /ai /reports /paypal /import
  controllers/        request handlers
  models/             User, Transaction, Product, ProductCost, BusinessExpense, DatasetImport
  middleware/auth.js  JWT guard (every query is scoped to req.user._id)
  services/           analytics (pure), demoData, csv, ai, paypal, context
client/src
  pages/              Overview, ProductAnalytics (+detail), Transactions, AIInsights, ProfitCalculator, Reports, Settings, Login
  components/         Layout, Charts, ProductTable, InsightsPanel, ChatAssistant, CsvImport, ui
  context/            AuthContext, DataContext (date range + dashboard data)
```

## 7. Notes
- The AI chat, PayPal Sandbox sync and MongoDB-backed endpoints need your own credentials/database to exercise. The analytics engine, demo generator, CSV parsing and UI build were verified without them.
- Single-currency (USD) display. Multi-currency would need conversion rates.
