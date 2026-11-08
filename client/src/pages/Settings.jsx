import { useEffect, useState } from 'react';
import { Database, Link2, Trash2, FlaskConical } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { PageHeader, ErrorBox, Notice, Badge, fmtDate } from '../components/ui.jsx';
import CsvImport from '../components/CsvImport.jsx';

const Section = ({ icon: Icon, title, children }) => <div className="card mb-4 p-5"><h2 className="mb-3 flex items-center gap-2 font-bold text-ppnavy"><Icon className="h-4 w-4 text-ppblue" />{title}</h2>{children}</div>;

export default function Settings() {
  const { user } = useAuth(), { reload, data } = useData();
  const [hist, setHist] = useState([]), [err, setErr] = useState(''), [msg, setMsg] = useState('');
  const loadHist = () => api.get('/import/history').then((r) => setHist(r.data)).catch((e) => setErr(errMsg(e)));
  useEffect(() => { loadHist(); }, []);
  const refresh = () => { loadHist(); reload(); };
  const hasDemo = hist.some((h) => h.source === 'demo');

  const demo = async (remove) => {
    setErr(''); setMsg('');
    try { remove ? await api.delete('/import/demo') : await api.post('/import/demo'); setMsg(remove ? 'Demo data removed.' : 'Demo dataset loaded (synthetic data, clearly labelled across the app).'); refresh(); } catch (e) { setErr(errMsg(e)); }
  };
  const del = async (id) => { if (!confirm('Remove this import and all of its transactions?')) return; try { await api.delete(`/import/history/${id}`); refresh(); } catch (e) { setErr(errMsg(e)); } };

  return (
    <>
      <PageHeader title="Settings" subtitle="Connect data sources and manage imports." />
      {err && <div className="mb-4"><ErrorBox message={err} /></div>}{msg && <div className="mb-4"><Notice tone="ok">{msg}</Notice></div>}
      <Section icon={FlaskConical} title="Demo dataset">
        <p className="mb-3 text-sm text-slate-600">Eight weeks of synthetic transactions for Classic Tee, Canvas Tote, Sneakers and Hoodie, with refunds, costs and expenses. It contains no real customer data.</p>
        <div className="flex gap-2"><button className="btn-primary" onClick={() => demo(false)}>{hasDemo ? 'Reload demo dataset' : 'Load demo dataset'}</button>{hasDemo && <button className="btn-ghost" onClick={() => demo(true)}>Remove demo data</button>}</div>
      </Section>
      <Section icon={Database} title="Upload PayPal CSV report"><CsvImport onImported={refresh} /></Section>
      <PayPalCard onChanged={refresh} />
      <Section icon={Database} title="Import history">
        {hist.length ? <div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Date', 'Source', 'Name', 'Rows', 'Imported', 'Skipped', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{hist.map((h) => <tr key={h._id}><td className="td">{fmtDate(h.createdAt)}</td><td className="td"><Badge tone={h.source === 'csv' ? 'blue' : 'amber'}>{h.source === 'paypal-sandbox' ? 'Sandbox' : h.source}</Badge></td><td className="td">{h.fileName}</td><td className="td">{h.rowCount}</td><td className="td">{h.imported}</td><td className="td">{(h.duplicatesSkipped || 0) + (h.rowsSkipped || 0)}</td>
            <td className="td text-right">{h.source !== 'demo' && <button onClick={() => del(h._id)} className="text-slate-400 hover:text-red-600" aria-label="Remove import"><Trash2 className="h-4 w-4" /></button>}</td></tr>)}</tbody></table></div>
          : <p className="text-sm text-slate-500">No imports yet.</p>}
      </Section>
      <Section icon={Link2} title="Account">
        <dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Name</dt><dd className="font-semibold">{user.name}</dd></div><div><dt className="text-xs text-slate-500">Email</dt><dd className="font-semibold">{user.email}</dd></div><div><dt className="text-xs text-slate-500">Business</dt><dd className="font-semibold">{user.businessName}</dd></div></dl>
      </Section>
    </>
  );
}

function PayPalCard({ onChanged }) {
  const [st, setSt] = useState(null), [busy, setBusy] = useState(''), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [purge, setPurge] = useState(true);
  useEffect(() => { api.get('/paypal/status').then((r) => setSt(r.data)).catch((e) => setErr(errMsg(e))); }, []);
  const run = (name, fn) => async () => {
    setBusy(name); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr(errMsg(e)); api.get('/paypal/status').then((r) => setSt(r.data)); } finally { setBusy(''); }
  };
  const connect = run('c', async () => { setSt((await api.post('/paypal/connect')).data); setMsg('Connected to PayPal Sandbox.'); });
  const sync = run('s', async () => { const { data } = await api.post('/paypal/sync', { days: 30 }); setMsg(data.message); setSt((await api.get('/paypal/status')).data); onChanged(); });
  const disconnect = run('d', async () => { const { data } = await api.post('/paypal/disconnect', { purge }); setSt(data); setMsg(`Disconnected.${data.removed ? ` Removed ${data.removed} sandbox transactions.` : ''}`); onChanged(); });
  return (
    <Section icon={Link2} title="PayPal Sandbox">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge tone={st?.connected ? 'green' : 'slate'}>{st?.connected ? 'Connected' : 'Not connected'}</Badge><Badge tone="amber">Sandbox · test data only</Badge>
        {st && !st.configured && <Badge tone="red">Credentials missing in server/.env</Badge>}
        {st?.lastSync && <span className="text-xs text-slate-500">Last sync {fmtDate(st.lastSync)}</span>}
      </div>
      <p className="mb-3 text-sm text-slate-600">Pulls recent transactions through the PayPal Transaction Search API using the sandbox credentials in your server environment. Not every sandbox app has permission to read transactions. If it does not, you will see why, and you can keep using CSV upload or the demo dataset.</p>
      {st?.lastError && <div className="mb-3"><Notice tone="warn">{st.lastError}</Notice></div>}
      {err && <div className="mb-3"><ErrorBox message={err} /></div>}{msg && <div className="mb-3"><Notice tone="ok">{msg}</Notice></div>}
      <div className="flex flex-wrap items-center gap-2">
        {!st?.connected ? <button className="btn-primary" onClick={connect} disabled={!!busy}>{busy === 'c' ? 'Connecting…' : 'Connect Sandbox'}</button> : <>
          <button className="btn-primary" onClick={sync} disabled={!!busy}>{busy === 's' ? 'Syncing…' : 'Sync last 30 days'}</button>
          <button className="btn-ghost" onClick={disconnect} disabled={!!busy}>Disconnect</button>
          <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={purge} onChange={(e) => setPurge(e.target.checked)} />Also remove imported sandbox transactions</label></>}
      </div>
    </Section>
  );
}
