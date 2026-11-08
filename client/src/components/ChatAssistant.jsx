import { useEffect, useRef, useState } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { DataChart } from './Charts.jsx';

const SUGGESTED = ['How much profit did I make this month?', 'Why did my sales decrease last week?', 'Which product has the highest profit margin?', 'Which product should I focus on?', 'How much did I spend on PayPal fees?', 'Compare this month with last month.'];

export default function ChatAssistant({ tall }) {
  const [msgs, setMsgs] = useState([]), [input, setInput] = useState(''), [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [msgs, busy]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: 'user', content: message }]); setInput(''); setBusy(true);
    try {
      const { data } = await api.post('/ai/chat', { message, history });
      setMsgs((m) => [...m, { role: 'assistant', content: data.answer, chart: data.chart }]);
    } catch (e) { setMsgs((m) => [...m, { role: 'assistant', content: errMsg(e), error: true }]); }
    finally { setBusy(false); }
  };

  return (
    <div className="card flex flex-col p-5">
      <h2 className="mb-3 flex items-center gap-2 font-bold text-ppnavy"><Bot className="h-4 w-4 text-ppblue" />Ask Copilot</h2>
      <div className={`space-y-3 overflow-y-auto pr-1 ${tall ? 'h-[460px]' : 'h-72'}`}>
        {!msgs.length && (
          <div>
            <p className="mb-2 text-sm text-slate-500">Ask about your sales, profit, refunds or fees. Answers use your real transaction data.</p>
            <div className="flex flex-wrap gap-2">{SUGGESTED.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-ppblue hover:text-ppblue">{s}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'bg-ppblue text-white' : m.error ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.chart && <DataChart chart={m.chart} />}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Analyzing your data…</div>}
        <div ref={end} />
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="input" placeholder="Ask a question about your business" value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000} aria-label="Question" />
        <button className="btn-primary" disabled={busy || !input.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
