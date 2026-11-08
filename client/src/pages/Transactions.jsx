import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useData } from '../context/DataContext.jsx';
import { Spinner, ErrorBox, PageHeader, RangeSelect, Badge, money, fmtDate, Empty } from '../components/ui.jsx';

const SRC = { demo: ['Demo', 'amber'], csv: ['CSV', 'blue'], 'paypal-sandbox': ['Sandbox test', 'amber'] };

export default function Transactions() {
  const { days, data } = useData(), [sp, setSp] = useSearchParams();
  const [f, setF] = useState({ q: sp.get('q') || '', status: '', type: '', product: '' }), [page, setPage] = useState(1);
  const [res, setRes] = useState(null), [loading, setLoading] = useState(true), [err, setErr] = useState('');

  useEffect(() => { setF((x) => ({ ...x, q: sp.get('q') || '' })); setPage(1); }, [sp]);
  useEffect(() => {
    setLoading(true); setErr('');
    const t = setTimeout(() => api.get('/transactions', { params: { ...f, days, page, limit: 15 } }).then((r) => setRes(r.data)).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [f, days, page]);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); if (k === 'q') setSp(e.target.value ? { q: e.target.value } : {}); };

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every sale and refund in the selected date range."><RangeSelect /></PageHeader>
      <div className="card">
        <div className="grid gap-2 p-4 sm:grid-cols-4">
          <input className="input" placeholder="Search ID or product" value={f.q} onChange={set('q')} aria-label="Search" />
          <select className="input" value={f.product} onChange={set('product')} aria-label="Product"><option value="">All products</option>{data?.products?.map((p) => <option key={p.product}>{p.product}</option>)}</select>
          <select className="input" value={f.type} onChange={set('type')} aria-label="Type"><option value="">Sales and refunds</option><option value="sale">Sales</option><option value="refund">Refunds</option></select>
          <select className="input" value={f.status} onChange={set('status')} aria-label="Status"><option value="">Any status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select>
        </div>
        {err && <div className="p-4"><ErrorBox message={err} /></div>}
        {loading && !res ? <Spinner /> : res && (
          <>
            <div className="overflow-x-auto"><table className="w-full"><thead className="border-y border-slate-200 bg-slate-50"><tr>{['Date', 'Transaction ID', 'Product', 'Type', 'Qty', 'Gross', 'Fee', 'Refund', 'Net', 'Status', 'Source'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{res.items.map((t) => (
                <tr key={t._id}><td className="td">{fmtDate(t.date)}</td><td className="td font-mono text-xs">{t.transactionId}</td><td className="td font-semibold">{t.productName}</td>
                  <td className="td"><Badge tone={t.type === 'refund' ? 'red' : 'green'}>{t.type}</Badge></td><td className="td">{t.quantity}</td><td className="td">{money(t.gross)}</td><td className="td">{money(t.fee)}</td>
                  <td className="td text-red-600">{t.refundAmount ? money(t.refundAmount) : '—'}</td><td className="td">{money(t.net)}</td><td className="td"><Badge tone={t.status === 'completed' ? 'slate' : 'amber'}>{t.status}</Badge></td>
                  <td className="td"><Badge tone={SRC[t.source][1]}>{SRC[t.source][0]}</Badge></td></tr>))}</tbody></table>
              {!res.items.length && <Empty title="No transactions found">Try a different search or a wider date range.</Empty>}</div>
            <div className="flex items-center justify-between p-4 text-sm text-slate-500"><span>{res.total} transactions</span>
              <div className="flex items-center gap-2"><button className="btn-ghost !px-2" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>Page {res.page} of {res.pages}<button className="btn-ghost !px-2" disabled={page >= res.pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div></div>
          </>
        )}
      </div>
    </>
  );
}
