import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, Wallet, PiggyBank, RotateCcw } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { Spinner, ErrorBox, PageHeader, RangeSelect, DataBanner, Trend, money, fmtDate, Empty } from '../components/ui.jsx';
import { TrendChart, ProductBar, WeeklyChart } from '../components/Charts.jsx';
import ProductTable from '../components/ProductTable.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';
import ChatAssistant from '../components/ChatAssistant.jsx';

export function NoData({ onLoaded }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const demo = async () => { setBusy(true); setErr(''); try { await api.post('/import/demo'); await onLoaded(); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); } };
  return (
    <div className="card"><Empty title="No transaction data yet">
      Load the demo dataset to explore the dashboard, or bring in your own data from a PayPal CSV report or the PayPal Sandbox.
      <div className="mt-4 flex flex-wrap justify-center gap-2"><button className="btn-primary" onClick={demo} disabled={busy}>{busy ? 'Loading…' : 'Load demo dataset'}</button><Link to="/settings" className="btn-ghost">Upload CSV or connect PayPal</Link></div>
      {err && <div className="mt-3"><ErrorBox message={err} /></div>}
    </Empty></div>
  );
}

export default function Overview() {
  const { user } = useAuth(), { data, loading, error, reload } = useData(), nav = useNavigate();
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!data) return null;
  if (data.empty) return <><PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Let's get some data in." /><NoData onLoaded={reload} /></>;

  const { summary: s, previous: p, changes: c } = data;
  const cards = [
    { label: 'Gross Sales', v: s.gross, prev: p.gross, ch: c.gross, icon: DollarSign },
    { label: 'Net Revenue', v: s.net, prev: p.net, ch: c.net, icon: Wallet, hint: 'After refunds and PayPal fees' },
    { label: 'Estimated Profit', v: s.profit, prev: p.profit, ch: c.profit, icon: PiggyBank, hint: `${s.margin}% margin` },
    { label: 'Refund Rate', v: s.refundRate, prev: p.refundRate, ch: c.refundRate, icon: RotateCcw, pct: true, invert: true },
  ];
  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle={`${fmtDate(data.range.from)} – ${fmtDate(data.range.to)} · ${user.businessName}`}><div className="sm:hidden"><RangeSelect /></div></PageHeader>
      <DataBanner sources={data.sources} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((k) => (
          <div key={k.label} className="card p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{k.label}</p><span className="rounded-lg bg-ppsky p-2 text-ppblue"><k.icon className="h-4 w-4" /></span></div>
            <p className="mt-2 text-2xl font-extrabold text-ppnavy">{k.pct ? `${k.v}%` : money(k.v)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500"><Trend value={k.ch} unit={k.pct ? 'pts' : '%'} invert={k.invert} /><span>vs previous period ({k.pct ? `${k.prev}%` : money(k.prev, 0)})</span></div>
            {k.hint && <p className="mt-1 text-xs text-slate-400">{k.hint}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2"><h2 className="mb-2 font-bold text-ppnavy">Sales and profit trend</h2><TrendChart data={data.daily} /></div>
        <div className="card p-5"><h2 className="mb-2 font-bold text-ppnavy">Sales by product</h2><ProductBar products={data.products} /></div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2"><h2 className="mb-2 font-bold text-ppnavy">Weekly sales comparison</h2><WeeklyChart weekly={data.weekly} /></div>
        <InsightsPanel insights={data.insights} />
      </div>
      <div className="card mt-4"><div className="px-5 pt-5"><h2 className="font-bold text-ppnavy">Product performance</h2><p className="text-xs text-slate-500">Select a product for its detailed analytics.</p></div>
        <ProductTable rows={data.products} onOpen={(n) => nav(`/products/${encodeURIComponent(n)}`)} /></div>
      <div className="mt-4"><ChatAssistant /></div>
    </>
  );
}
