import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import { PageHeader, ErrorBox, Spinner, Empty, Notice } from '../components/ui.jsx';
import { NoData } from './Overview.jsx';

const TABS = [['overall', 'Overall business'], ['products', 'Product-wise'], ['revenue', 'Revenue'], ['profit', 'Estimated profit'], ['refunds', 'Refunds']];

export default function Reports() {
  const { data, reload, loading } = useData();
  const [type, setType] = useState('overall'), [range, setRange] = useState({ from: '', to: '' });
  const [rep, setRep] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false);

  useEffect(() => { if (data && !data.empty && !range.from) setRange({ from: data.range.from.slice(0, 10), to: data.range.to.slice(0, 10) }); }, [data]);
  useEffect(() => {
    if (!range.from || !range.to) return;
    setBusy(true); setErr('');
    api.get(`/reports/${type}`, { params: range }).then((r) => setRep(r.data)).catch((e) => setErr(errMsg(e))).finally(() => setBusy(false));
  }, [type, range]);

  const download = async () => {
    try {
      const r = await api.get(`/reports/${type}`, { params: { ...range, format: 'csv' }, responseType: 'blob' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(r.data); a.download = `${type}-report-${range.from}_to_${range.to}.csv`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { setErr(errMsg(e)); }
  };
  if (loading && !data) return <Spinner />;
  if (!data || data.empty) return <><PageHeader title="Reports" /><NoData onLoaded={reload} /></>;

  return (
    <>
      <PageHeader title="Reports" subtitle="Preview a report, then download it as CSV.">
        <input type="date" className="input !w-auto" value={range.from} min={data.bounds.min.slice(0, 10)} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} aria-label="From date" />
        <span className="text-sm text-slate-400">to</span>
        <input type="date" className="input !w-auto" value={range.to} min={range.from} max={data.bounds.max.slice(0, 10)} onChange={(e) => setRange({ ...range, to: e.target.value })} aria-label="To date" />
        <button className="btn-primary" onClick={download} disabled={!rep?.rows.length}><Download className="h-4 w-4" />Download CSV</button>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={type === k} onClick={() => setType(k)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${type === k ? 'bg-ppblue text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-ppblue'}`}>{l}</button>)}</div>
      {err && <ErrorBox message={err} />}
      <div className="card">
        {busy && !rep ? <Spinner /> : rep && (
          <>
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-ppnavy">{rep.title}</h2><p className="text-xs text-slate-500">{rep.from} to {rep.to} · {rep.rows.length} rows</p></div>
            {rep.rows.length ? <div className="max-h-[520px] overflow-auto"><table className="w-full"><thead className="sticky top-0 bg-slate-50"><tr>{rep.columns.map((c) => <th key={c.key} className="th">{c.label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{rep.rows.map((r, i) => <tr key={i}>{rep.columns.map((c) => <td key={c.key} className="td">{r[c.key]}</td>)}</tr>)}</tbody></table></div>
              : <Empty title="Nothing to report">There are no rows for this report in the selected dates.</Empty>}
            {type === 'profit' || type === 'overall' ? <div className="p-4"><Notice>{rep.note}</Notice></div> : null}
          </>
        )}
      </div>
    </>
  );
}
