import { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { ErrorBox } from './ui.jsx';

const ICON = { positive: [CheckCircle2, 'text-emerald-600'], negative: [AlertCircle, 'text-red-600'], info: [Info, 'text-ppblue'] };

export default function InsightsPanel({ insights }) {
  const [rec, setRec] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const generate = async () => {
    setBusy(true); setErr('');
    try { setRec((await api.post('/ai/insights')).data.recommendations); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-ppnavy"><Sparkles className="h-4 w-4 text-ppblue" />AI Business Insights</h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((i, k) => { const [Icon, c] = ICON[i.type]; return <li key={k} className="flex gap-2.5 text-sm"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${c}`} /><span>{i.text}</span></li>; })}
        {!insights.length && <li className="text-sm text-slate-500">Not enough data in this period to generate insights.</li>}
      </ul>
      <p className="mt-3 text-xs text-slate-400">These insights are calculated from your transactions for the selected period.</p>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <button className="btn-primary" onClick={generate} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Get AI recommendations</button>
        {err && <div className="mt-3"><ErrorBox message={err} /></div>}
        {rec && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-ppsky p-4 text-sm leading-relaxed text-slate-700">{rec}</div>}
      </div>
    </div>
  );
}
