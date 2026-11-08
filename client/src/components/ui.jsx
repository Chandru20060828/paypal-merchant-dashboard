import { Loader2, AlertTriangle, Inbox, TrendingUp, TrendingDown } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';

export const money = (n, d = 2) => (n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d }).format(n));
export const num = (n) => (n == null ? '—' : new Intl.NumberFormat('en-US').format(n));
export const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function Spinner({ label = 'Loading…' }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-ppblue" />{label}</div>;
}
export function ErrorBox({ message, retry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{message}</div>
      {retry && <button onClick={retry} className="font-semibold underline">Try again</button>}
    </div>
  );
}
export function Notice({ tone = 'info', children }) {
  const c = { info: 'border-blue-200 bg-ppsky text-ppdeep', ok: 'border-emerald-200 bg-emerald-50 text-emerald-800', warn: 'border-amber-200 bg-amber-50 text-amber-800' }[tone];
  return <div className={`rounded-xl border p-3 text-sm ${c}`}>{children}</div>;
}
export function Empty({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      <div className="max-w-md text-sm text-slate-500">{children}</div>
    </div>
  );
}
export function Badge({ tone = 'slate', children }) {
  const c = { slate: 'bg-slate-100 text-slate-600', blue: 'bg-ppsky text-ppdeep', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700' }[tone];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
}
export function Trend({ value, unit = '%', invert = false }) {
  if (value === null || value === undefined) return <span className="text-xs font-semibold text-slate-400">New</span>;
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? TrendingUp : TrendingDown;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good ? 'text-emerald-600' : 'text-red-600'}`}><Icon className="h-3.5 w-3.5" />{value > 0 ? '+' : ''}{value}{unit === 'pts' ? ' pts' : '%'}</span>;
}
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-xl font-extrabold text-ppnavy">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
export function RangeSelect() {
  const { days, setDays } = useData();
  return (
    <select aria-label="Date range" className="input !w-auto !py-1.5" value={days} onChange={(e) => setDays(e.target.value)}>
      <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All data</option>
    </select>
  );
}
export function DataBanner({ sources = [] }) {
  const demo = sources.includes('demo'), sb = sources.includes('paypal-sandbox');
  if (!demo && !sb) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <b>{demo ? 'Demo data' : 'Sandbox test data'}</b>
      {demo && sb ? ' and PayPal Sandbox test transactions are included.' : demo ? ': this dashboard includes synthetic sample transactions, not real sales.' : ': these transactions come from the PayPal Sandbox and are not real money.'}
    </div>
  );
}
