import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import { Spinner, ErrorBox, PageHeader, RangeSelect, DataBanner, Trend, money, num, Notice } from '../components/ui.jsx';
import { TrendChart, ProductBar, CostBreakdownChart } from '../components/Charts.jsx';
import ProductTable from '../components/ProductTable.jsx';
import { NoData } from './Overview.jsx';

function Detail({ name }) {
  const { days } = useData();
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    setD(null); setErr('');
    api.get(`/analytics/product/${encodeURIComponent(name)}`, { params: { days } }).then((r) => setD(r.data)).catch((e) => setErr(errMsg(e)));
  }, [name, days]);
  if (err) return <ErrorBox message={err} />;
  if (!d) return <Spinner />;
  const s = d.summary, c = d.changes;
  const kpis = [['Revenue', money(s.revenue), c.revenue], ['Units sold', num(s.units), c.units], ['Product cost', money(s.cogs)], ['PayPal fees', money(s.fees), null], ['Estimated profit', money(s.profit), c.profit], ['Profit margin', `${s.margin}%`]];
  return (
    <>
      <PageHeader title={name} subtitle="Product analytics (shared business expenses are not allocated to single products)"><RangeSelect /></PageHeader>
      <Link to="/products" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ppblue"><ArrowLeft className="h-4 w-4" />All products</Link>
      {!d.hasCost && <div className="mb-4"><Notice tone="warn">No cost is set for this product, so profit ignores product cost. Add it on the <Link className="font-semibold underline" to="/calculator">Profit Calculator</Link> page.</Notice></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map(([l, v, ch]) => <div key={l} className="card p-4"><p className="text-xs font-semibold text-slate-500">{l}</p><p className="mt-1 text-xl font-extrabold text-ppnavy">{v}</p>{ch !== undefined && ch !== null && <Trend value={ch} />}</div>)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2"><h2 className="mb-2 font-bold text-ppnavy">Revenue and profit trend</h2><TrendChart data={d.daily} /></div>
        <div className="card p-5"><h2 className="mb-2 font-bold text-ppnavy">Where the money goes</h2><CostBreakdownChart summary={s} />
          <p className="mt-2 text-xs text-slate-500">Unit cost {money(d.unitCost)} + shipping {money(d.shippingCost)} per unit · refunds {money(s.refunds)} ({s.refundRate}% of gross)</p></div>
      </div>
      <div className="card mt-4 p-5"><h2 className="mb-1 font-bold text-ppnavy">Last 7 days vs the 7 before</h2>
        <p className="text-sm text-slate-600">Revenue {money(d.weekly.current.revenue)} vs {money(d.weekly.previous.revenue)} · units {d.weekly.current.units} vs {d.weekly.previous.units} · refunds {money(d.weekly.current.refunds)} vs {money(d.weekly.previous.refunds)}</p></div>
    </>
  );
}

export default function ProductAnalytics() {
  const { name } = useParams(), nav = useNavigate(), { data, loading, error, reload } = useData();
  if (name) return <Detail name={decodeURIComponent(name)} />;
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  return (
    <>
      <PageHeader title="Product Analytics" subtitle="Compare every product, then open one for details."><RangeSelect /></PageHeader>
      {!data || data.empty ? <NoData onLoaded={reload} /> : (
        <>
          <DataBanner sources={data.sources} />
          <div className="card mb-4 p-5"><h2 className="mb-2 font-bold text-ppnavy">Sales by product</h2><ProductBar products={data.products} /></div>
          <div className="card"><ProductTable rows={data.products} onOpen={(n) => nav(`/products/${encodeURIComponent(n)}`)} /></div>
        </>
      )}
    </>
  );
}
