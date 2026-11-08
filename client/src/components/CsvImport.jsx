import { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { ErrorBox, Notice, Badge } from './ui.jsx';

const FIELDS = [
  ['transactionId', 'Transaction ID', true], ['date', 'Date', true], ['type', 'Transaction type'], ['productName', 'Product name'], ['quantity', 'Quantity'],
  ['grossAmount', 'Gross amount', true], ['currency', 'Currency'], ['fee', 'PayPal fee'], ['netAmount', 'Net amount'], ['status', 'Transaction status'], ['refundAmount', 'Refund amount'],
];

export default function CsvImport({ onImported }) {
  const [file, setFile] = useState(null), [pv, setPv] = useState(null), [map, setMap] = useState({});
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState(null), [drag, setDrag] = useState(false);
  const input = useRef(null);

  const reset = () => { setFile(null); setPv(null); setMap({}); setErr(''); };
  const pick = async (f) => {
    if (!f) return;
    setErr(''); setOk(null); setPv(null);
    if (!/\.csv$/i.test(f.name)) return setErr('Choose a .csv file exported from PayPal (Reports > Activity download).');
    if (f.size > 5 * 1024 * 1024) return setErr('That file is larger than 5 MB.');
    setFile(f); setBusy(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/import/preview', fd);
      setPv(data); setMap(data.mapping);
    } catch (e) { setErr(errMsg(e)); setFile(null); } finally { setBusy(false); }
  };
  const missing = FIELDS.filter(([k, , req]) => req && !map[k]).map(([, l]) => l);
  const commit = async () => {
    setBusy(true); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('mapping', JSON.stringify(map));
      const { data } = await api.post('/import/commit', fd);
      setOk(data); reset(); onImported?.();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-ppblue bg-ppsky' : 'border-slate-300 bg-slate-50'}`}>
        <UploadCloud className="h-8 w-8 text-ppblue" />
        <p className="text-sm font-semibold">Drag and drop a PayPal CSV report here</p>
        <button className="btn-ghost" onClick={() => input.current.click()} disabled={busy}>Choose file</button>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />
        <p className="text-xs text-slate-500">Max 5 MB. Rows already imported are skipped automatically.</p>
      </div>
      {err && <ErrorBox message={err} />}
      {ok && <Notice tone="ok">Imported <b>{ok.imported}</b> transactions. {ok.duplicatesSkipped > 0 && `${ok.duplicatesSkipped} duplicates skipped. `}{ok.rowsSkipped > 0 && `${ok.rowsSkipped} rows skipped (${Object.entries(ok.skippedReasons).map(([k, v]) => `${v} ${k}`).join(', ')}).`}</Notice>}
      {busy && !pv && <p className="text-sm text-slate-500">Reading file…</p>}
      {pv && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm"><FileSpreadsheet className="h-4 w-4 text-ppblue" /><b>{pv.fileName}</b><Badge tone="blue">{pv.totalRows} rows</Badge><Badge>{pv.columns.length} columns detected</Badge></div>
          {pv.duplicate && <Notice tone="warn">This exact file was already imported on {new Date(pv.duplicateOf).toLocaleDateString()}. Importing again is blocked. Remove the earlier import below if you want to redo it.</Notice>}
          <div>
            <p className="mb-2 text-sm font-semibold text-ppnavy">Map CSV columns to fields</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.map(([k, label, req]) => (
                <div key={k}><label className="label">{label}{req && <span className="text-red-500"> *</span>}</label>
                  <select className="input" value={map[k] || ''} onChange={(e) => setMap({ ...map, [k]: e.target.value || undefined })}>
                    <option value="">{req ? 'Select a column' : 'Not in file'}</option>{pv.columns.map((c) => <option key={c}>{c}</option>)}
                  </select></div>
              ))}
            </div>
          </div>
          <div><p className="mb-2 text-sm font-semibold text-ppnavy">Preview (first {pv.preview.length} rows)</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full"><thead className="bg-slate-50"><tr>{pv.columns.map((c) => <th key={c} className="th">{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{pv.preview.map((r, i) => <tr key={i}>{pv.columns.map((c) => <td key={c} className="td text-xs">{r[c]}</td>)}</tr>)}</tbody></table></div></div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={commit} disabled={busy || pv.duplicate || missing.length > 0}>{busy ? 'Importing…' : `Import ${pv.totalRows} rows`}</button>
            <button className="btn-ghost" onClick={reset} disabled={busy}>Cancel</button>
            {missing.length > 0 && <span className="text-xs text-red-600">Map required fields: {missing.join(', ')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
