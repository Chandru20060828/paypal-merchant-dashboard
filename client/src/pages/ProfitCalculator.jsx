import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Download } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import { PageHeader, ErrorBox, Notice, money, fmtDate, Spinner } from '../components/ui.jsx';

const n = (v) => Math.max(0, parseFloat(v) || 0);
const Field = ({ label, value, onChange, hint }) => (
  <div><label className="label">{label}</label><div className="relative"><span className="absolute left-3 top-2 text-sm text-slate-400">$</span>
    <input type="number" min="0" step="0.01" className="input !pl-7" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.00" /></div>{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}</div>
);

export default function ProfitCalculator() {
  const { data, reload } = useData();
  const [v, setV] = useState({ revenue: '', productCosts: '', shipping: '', fees: '', other: '' });
  const set = (k) => (x) => setV({ ...v, [k]: x });
  const revenue = n(v.revenue), costs = n(v.productCosts), ship = n(v.shipping), fees = n(v.fees), other = n(v.other);
  const profit = revenue - costs - ship - fees - other, margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const load = () => {
    if (!data || data.empty) return;
    const s = data.summary;
    setV({ revenue: s.revenue, productCosts: s.cogs, shipping: 0, fees: s.fees, other: s.expenses });
  };
  const rows = [['Sales revenue (after refunds)', revenue, 1], ['Product costs', -costs], ['Shipping costs', -ship], ['PayPal fees', -fees], ['Other expenses', -other]];

  return (
    <>
      <PageHeader title="Profit Calculator" subtitle="Estimated Profit = Sales Revenue − Product Costs − PayPal Fees − Other Expenses" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between"><h2 className="font-bold text-ppnavy">Your numbers</h2>
            <button className="btn-ghost" onClick={load} disabled={!data || data.empty}>Fill from my data</button></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sales revenue" value={v.revenue} onChange={set('revenue')} />
            <Field label="Product costs" value={v.productCosts} onChange={set('productCosts')} hint="Filled data already includes per-unit shipping" />
            <Field label="Shipping costs" value={v.shipping} onChange={set('shipping')} />
            <Field label="PayPal fees" value={v.fees} onChange={set('fees')} />
            <Field label="Other expenses" value={v.other} onChange={set('other')} hint="Ads, software, packaging…" />
          </div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold text-ppnavy">Breakdown</h2>
          <table className="w-full text-sm"><tbody className="divide-y divide-slate-100">
            {rows.map(([l, a]) => <tr key={l}><td className="py-2">{l}</td><td className={`py-2 text-right font-medium ${a < 0 ? 'text-red-600' : ''}`}>{a < 0 ? `− ${money(-a)}` : money(a)}</td></tr>)}
            <tr><td className="pt-3 font-bold text-ppnavy">Estimated Profit</td><td className={`pt-3 text-right text-xl font-extrabold ${profit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{money(profit)}</td></tr>
            <tr><td className="py-1 text-slate-500">Profit margin</td><td className="py-1 text-right font-semibold">{margin.toFixed(1)}%</td></tr>
          </tbody></table>
          <p className="mt-4 text-xs text-slate-500">This is an estimate based on the figures you enter. It is not guaranteed accounting profit and ignores taxes, depreciation and timing differences.</p>
        </div>
      </div>
      <CostsEditor onSaved={reload} />
      <ExpensesEditor onSaved={reload} />
    </>
  );
}

function CostsEditor({ onSaved }) {
  const [rows, setRows] = useState(null), [err, setErr] = useState(''), [msg, setMsg] = useState(''), file = useRef(null);
  const load = () => api.get('/products').then((r) => setRows(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  const edit = (name, k, val) => setRows(rows.map((r) => (r.name === name ? { ...r, [k]: val } : r)));
  const save = async () => {
    setErr(''); setMsg('');
    try { await api.put('/products/costs', { costs: rows.map((r) => ({ productName: r.name, unitCost: n(r.unitCost), shippingCost: n(r.shippingCost) })) }); setMsg('Product costs saved. Dashboard figures are updated.'); onSaved(); } catch (e) { setErr(errMsg(e)); }
  };
  const importCsv = async (f) => {
    if (!f) return; setErr(''); setMsg('');
    try { const fd = new FormData(); fd.append('file', f); const { data } = await api.post('/products/costs/import', fd); setMsg(`Imported costs for ${data.saved} products.`); await load(); onSaved(); } catch (e) { setErr(errMsg(e)); }
  };
  return (
    <div className="card mt-4 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold text-ppnavy">Product costs</h2><p className="text-xs text-slate-500">PayPal reports do not include what your products cost you. Enter them here (per unit).</p></div>
        <div className="flex gap-2"><button className="btn-ghost" onClick={() => file.current.click()}><Upload className="h-4 w-4" />Import CSV</button>
          <input ref={file} type="file" accept=".csv" hidden onChange={(e) => { importCsv(e.target.files[0]); e.target.value = ''; }} />
          <button className="btn-primary" onClick={save} disabled={!rows?.length}>Save costs</button></div></div>
      {err && <ErrorBox message={err} />}{msg && <Notice tone="ok">{msg}</Notice>}
      {!rows ? <Spinner /> : !rows.length ? <p className="text-sm text-slate-500">Load data first and your products will appear here. A costs CSV needs the columns product, unit_cost, shipping_cost.</p> : (
        <div className="mt-3 overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Product</th><th className="th">Unit cost</th><th className="th">Shipping per unit</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r.name}><td className="td font-semibold">{r.name}</td>
            <td className="td"><input type="number" min="0" step="0.01" className="input !w-28" value={r.unitCost} onChange={(e) => edit(r.name, 'unitCost', e.target.value)} aria-label={`${r.name} unit cost`} /></td>
            <td className="td"><input type="number" min="0" step="0.01" className="input !w-28" value={r.shippingCost} onChange={(e) => edit(r.name, 'shippingCost', e.target.value)} aria-label={`${r.name} shipping per unit`} /></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}

function ExpensesEditor({ onSaved }) {
  const [list, setList] = useState(null), [f, setF] = useState({ name: '', amount: '', category: 'Marketing', date: new Date().toISOString().slice(0, 10) }), [err, setErr] = useState('');
  const load = () => api.get('/products/expenses').then((r) => setList(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  const add = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post('/products/expenses', f); setF({ ...f, name: '', amount: '' }); await load(); onSaved(); } catch (x) { setErr(errMsg(x)); }
  };
  const del = async (id) => { try { await api.delete(`/products/expenses/${id}`); await load(); onSaved(); } catch (x) { setErr(errMsg(x)); } };
  return (
    <div className="card mt-4 p-5">
      <h2 className="font-bold text-ppnavy">Other business expenses</h2><p className="mb-3 text-xs text-slate-500">Ads, software, packaging, rent. These reduce estimated profit on the dates you enter.</p>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Expense name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required aria-label="Expense name" />
        <input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required aria-label="Amount" />
        <input className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required aria-label="Date" />
        <button className="btn-primary">Add expense</button>
      </form>
      {err && <div className="mt-3"><ErrorBox message={err} /></div>}
      {list && (list.length ? <div className="mt-3 max-h-64 overflow-auto"><table className="w-full"><tbody className="divide-y divide-slate-100">{list.map((x) => <tr key={x._id}><td className="td">{fmtDate(x.date)}</td><td className="td font-semibold">{x.name}</td><td className="td text-slate-500">{x.category}</td><td className="td">{money(x.amount)}</td>
        <td className="td text-right"><button onClick={() => del(x._id)} className="text-slate-400 hover:text-red-600" aria-label={`Delete ${x.name}`}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">No expenses yet.</p>)}
    </div>
  );
}
