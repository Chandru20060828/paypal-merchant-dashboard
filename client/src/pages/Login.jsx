import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { ErrorBox } from '../components/ui.jsx';

export default function Login() {
  const { login, register } = useAuth(), nav = useNavigate();
  const [mode, setMode] = useState('login'), [f, setF] = useState({ name: '', email: '', password: '', businessName: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await (mode === 'login' ? login(f) : register(f)); nav('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ppnavy p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ppblue text-xl font-extrabold">M</div><span className="text-lg font-extrabold">Merchant Copilot</span></div>
        <div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">Know what you actually earn from every PayPal sale.</h1>
          <ul className="mt-8 space-y-4 text-blue-100">
            <li className="flex gap-3"><BarChart3 className="h-5 w-5 shrink-0" />Revenue, fees, refunds and estimated profit by product</li>
            <li className="flex gap-3"><Sparkles className="h-5 w-5 shrink-0" />Ask questions in plain language, answered from your own data</li>
            <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0" />Each merchant sees only their own data</li>
          </ul>
        </div>
        <p className="text-xs text-blue-300">PayPal-inspired theme. Not an official PayPal product.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
          <div><h2 className="text-xl font-extrabold text-ppnavy">{mode === 'login' ? 'Log in' : 'Create your account'}</h2><p className="text-sm text-slate-500">{mode === 'login' ? 'Welcome back.' : 'Start with the demo dataset, no PayPal account needed.'}</p></div>
          {err && <ErrorBox message={err} />}
          {mode === 'register' && <><div><label className="label">Your name</label><input className="input" value={f.name} onChange={set('name')} required /></div>
            <div><label className="label">Business name</label><input className="input" value={f.businessName} onChange={set('businessName')} placeholder="Optional" /></div></>}
          <div><label className="label">Email</label><input type="email" className="input" value={f.email} onChange={set('email')} required autoComplete="email" /></div>
          <div><label className="label">Password</label><input type="password" className="input" value={f.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          <p className="text-center text-sm text-slate-500">{mode === 'login' ? 'New here?' : 'Already registered?'}{' '}
            <button type="button" className="font-semibold text-ppblue" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>{mode === 'login' ? 'Create an account' : 'Log in'}</button></p>
        </form>
      </div>
    </div>
  );
}
