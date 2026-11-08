import { useMemo, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import { money, num, Trend, Empty } from './ui.jsx';

const COLS = [
  ['product', 'Product'], ['units', 'Units sold'], ['revenue', 'Revenue'], ['cost', 'Product cost'], ['fees', 'Payment fees'],
  ['profit', 'Estimated profit'], ['margin', 'Profit margin'], ['trend', 'Trend'],
];
const FILTERS = { all: 'All products', growing: 'Growing', declining: 'Declining', low: 'Margin under 30%', refunds: 'Refund rate over 5%' };

export default function ProductTable({ rows, onOpen }) {
  const [q, setQ] = useState(''), [filter, setFilter] = useState('all'), [sort, setSort] = useState({ key: 'revenue', dir: 'desc' });
  const view = useMemo(() => {
    let r = rows.filter((x) => x.product.toLowerCase().includes(q.toLowerCase()));
    if (filter === 'growing') r = r.filter((x) => x.trend > 0);
    if (filter === 'declining') r = r.filter((x) => x.trend !== null && x.trend < 0);
    if (filter === 'low') r = r.filter((x) => x.margin < 30);
    if (filter === 'refunds') r = r.filter((x) => x.refundRate > 5);
    const k = sort.key, d = sort.dir === 'asc' ? 1 : -1;
    return [...r].sort((a, b) => (typeof a[k] === 'string' ? a[k].localeCompare(b[k]) : ((a[k] ?? -Infinity) - (b[k] ?? -Infinity))) * d);
  }, [rows, q, filter, sort]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input !pl-9" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        </div>
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter products">
          {Object.entries(FILTERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-y border-slate-200 bg-slate-50"><tr>
            {COLS.map(([k, l]) => (
              <th key={k} className="th"><button className="inline-flex items-center gap-1 hover:text-ppblue" onClick={() => setSort((s) => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))}>{l}<ArrowUpDown className="h-3 w-3" /></button></th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {view.map((r) => (
              <tr key={r.product} className="cursor-pointer hover:bg-ppsky/50" onClick={() => onOpen?.(r.product)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen?.(r.product)}>
                <td className="td font-semibold text-ppdeep">{r.product}</td>
                <td className="td">{num(r.units)}</td><td className="td">{money(r.revenue)}</td><td className="td">{money(r.cost)}</td><td className="td">{money(r.fees)}</td>
                <td className={`td font-semibold ${r.profit < 0 ? 'text-red-600' : ''}`}>{money(r.profit)}</td>
                <td className="td">{r.margin}%</td><td className="td"><Trend value={r.trend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!view.length && <Empty title="No products match">Change the search or filter to see more.</Empty>}
      </div>
    </div>
  );
}
