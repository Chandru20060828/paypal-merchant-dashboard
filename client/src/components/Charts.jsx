import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Cell } from 'recharts';
import { money } from './ui.jsx';

const C = { blue: '#0070e0', navy: '#001c64', green: '#16a34a', sky: '#9cc7f5', grid: '#e2e8f0' };
const axis = { fontSize: 12, fill: '#64748b' };
const short = (n) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);

export function TrendChart({ data }) {
  return (
    <div className="h-72"><ResponsiveContainer>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} minTickGap={24} />
        <YAxis tick={axis} tickFormatter={short} width={52} />
        <Tooltip formatter={(v, n) => [money(v), n]} labelFormatter={(d) => `Date: ${d}`} />
        <Legend />
        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={C.blue} strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="profit" name="Estimated profit" stroke={C.green} strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer></div>
  );
}

export function ProductBar({ products }) {
  const data = products.map((p) => ({ name: p.product, revenue: p.revenue, share: p.share, label: `${money(p.revenue, 0)} · ${p.share}%` }));
  return (
    <div style={{ height: Math.max(200, data.length * 56) }}><ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 110, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={axis} tickFormatter={short} />
        <YAxis type="category" dataKey="name" tick={axis} width={96} />
        <Tooltip formatter={(v, n, p) => [`${money(v)} (${p.payload.share}% of revenue)`, 'Sales']} />
        <Bar dataKey="revenue" fill={C.blue} radius={[0, 6, 6, 0]}><LabelList dataKey="label" position="right" style={{ fontSize: 12, fill: '#334155' }} /></Bar>
      </BarChart>
    </ResponsiveContainer></div>
  );
}

export function WeeklyChart({ weekly }) {
  return (
    <div>
      <div className="h-64"><ResponsiveContainer>
        <BarChart data={weekly.products} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="product" tick={axis} />
          <YAxis tick={axis} tickFormatter={short} width={52} />
          <Tooltip formatter={(v) => money(v)} />
          <Legend />
          <Bar dataKey="previous" name={`Previous week (${weekly.rangePrevious.from.slice(5)} – ${weekly.rangePrevious.to.slice(5)})`} fill={C.sky} radius={[4, 4, 0, 0]} />
          <Bar dataKey="current" name={`Current week (${weekly.rangeCurrent.from.slice(5)} – ${weekly.rangeCurrent.to.slice(5)})`} fill={C.blue} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer></div>
    </div>
  );
}

/** Renders a chart dataset built by the backend (used by the AI assistant). */
export function DataChart({ chart }) {
  const fmt = chart.format === 'percent' ? (v) => `${v}%` : (v) => money(v);
  const colors = [C.sky, C.blue, C.green];
  const Chart = chart.type === 'line' ? LineChart : BarChart;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-slate-600">{chart.title}</p>
      <div className="h-56"><ResponsiveContainer>
        <Chart data={chart.data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={C.grid} vertical={false} />
          <XAxis dataKey="name" tick={axis} minTickGap={16} />
          <YAxis tick={axis} tickFormatter={chart.format === 'percent' ? (v) => `${v}%` : short} width={52} />
          <Tooltip formatter={(v) => fmt(v)} />
          {chart.series.length > 1 && <Legend />}
          {chart.series.map((s, i) => chart.type === 'line'
            ? <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={i ? C.green : C.blue} strokeWidth={2.5} dot={false} />
            : <Bar key={s.key} dataKey={s.key} name={s.label} fill={chart.series.length === 1 ? C.blue : colors[i % 3]} radius={[4, 4, 0, 0]} />)}
        </Chart>
      </ResponsiveContainer></div>
    </div>
  );
}

export function CostBreakdownChart({ summary }) {
  const data = [
    { name: 'Revenue', value: summary.revenue, fill: C.blue }, { name: 'Product cost', value: summary.cogs, fill: C.navy },
    { name: 'PayPal fees', value: summary.fees, fill: '#f59e0b' }, { name: 'Est. profit', value: summary.profit, fill: C.green },
  ];
  return (
    <div className="h-64"><ResponsiveContainer>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={C.grid} vertical={false} />
        <XAxis dataKey="name" tick={axis} /><YAxis tick={axis} tickFormatter={short} width={52} />
        <Tooltip formatter={(v) => money(v)} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Bar>
      </BarChart>
    </ResponsiveContainer></div>
  );
}
